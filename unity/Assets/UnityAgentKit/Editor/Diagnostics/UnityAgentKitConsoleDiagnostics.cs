using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitConsoleDiagnostics
    {
        private const int ErrorMask = 0x804100;
        private const int WarningMask = 0x804200;
        private const int LogMask = 0x804400;
        private static int consoleGeneration;

        internal static UnityAgentKitConsoleCountResult Count(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson)
        {
            var input = ReadCountInput(inputJson);
            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var totalCount = reader.GetCount();
            var maxSeverityScan = Bound(input.maxSeverityScan, 1, 1000, 500);
            var startIndex = Math.Max(0, totalCount - maxSeverityScan);
            var boundedEntries = reader.ReadEntries(startIndex, totalCount, includeStackTrace: false);
            return CountFromBoundedEntries(record, capturedMainThreadId, totalCount, startIndex, maxSeverityScan, boundedEntries);
        }

        internal static UnityAgentKitConsoleSnapshotResult Snapshot(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, string artifactRoot)
        {
            var input = ReadSnapshotInput(inputJson);
            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var totalCount = reader.GetCount();
            var limit = Bound(input.limit, 1, 500, 200);
            var cursor = NormalizeCursor(input.cursor);
            var requestedStartIndex = cursor != null ? cursor.startIndex : 0;
            if (cursor != null && !CursorMatches(record, cursor, totalCount))
            {
                throw new ConsoleCursorInvalidException();
            }

            var startIndex = Math.Max(0, Math.Min(requestedStartIndex, totalCount));
            var endIndexExclusive = totalCount;
            var rawRangeCount = Math.Max(0, endIndexExclusive - startIndex);
            var truncated = rawRangeCount > limit;
            if (truncated)
            {
                startIndex = endIndexExclusive - limit;
            }

            var boundedEntries = reader.ReadEntries(startIndex, endIndexExclusive, input.includeStackTrace);
            return SnapshotFromBoundedEntries(record, capturedMainThreadId, input.includeStackTrace, limit, totalCount, startIndex, endIndexExclusive, truncated, boundedEntries, artifactRoot);
        }

        internal static UnityAgentKitConsoleClearResult Clear(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson)
        {
            var input = ReadClearInput(inputJson);
            if (!input.confirmClear)
            {
                throw new ConsoleClearNotExplicitException();
            }

            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var before = reader.GetCount();
            var generationBefore = consoleGeneration;
            reader.Clear();
            var after = reader.GetCount();
            var cleared = after == 0;
            if (cleared)
            {
                consoleGeneration += 1;
            }

            return CreateClearResult(record, capturedMainThreadId, explicitClear: true, cleared, before, after, generationBefore, consoleGeneration);
        }

        internal static void ResetForTests()
        {
            consoleGeneration = 0;
        }

        internal static UnityAgentKitConsoleEntryRecord CreateEntryForTests(int index, string message, string stackTrace, string severity)
        {
            return new UnityAgentKitConsoleEntryRecord
            {
                index = index,
                entryId = index,
                severity = (severity ?? string.Empty).ToLowerInvariant(),
                message = message ?? string.Empty,
                stackTrace = stackTrace ?? string.Empty,
                mode = severity ?? string.Empty,
                attribution = "unattributed"
            };
        }

        internal static UnityAgentKitConsoleCountResult CountForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, int maxSeverityScan, UnityAgentKitConsoleEntryRecord[] entries)
        {
            var allEntries = entries ?? Array.Empty<UnityAgentKitConsoleEntryRecord>();
            var limit = Bound(maxSeverityScan, 1, 1000, 500);
            var startIndex = Math.Max(0, allEntries.Length - limit);
            return CountFromBoundedEntries(record, capturedMainThreadId, allEntries.Length, startIndex, limit, SliceEntries(allEntries, startIndex, allEntries.Length, includeStackTrace: false));
        }

        internal static UnityAgentKitConsoleSnapshotResult SnapshotForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, UnityAgentKitConsoleEntryRecord[] entries, string artifactRoot)
        {
            var input = ReadSnapshotInput(inputJson);
            var allEntries = entries ?? Array.Empty<UnityAgentKitConsoleEntryRecord>();
            var limit = Bound(input.limit, 1, 500, 200);
            var totalCount = allEntries.Length;
            var cursor = NormalizeCursor(input.cursor);
            var requestedStartIndex = cursor != null ? cursor.startIndex : 0;
            if (cursor != null && !CursorMatches(record, cursor, totalCount))
            {
                throw new ConsoleCursorInvalidException();
            }

            var startIndex = Math.Max(0, Math.Min(requestedStartIndex, totalCount));
            var endIndexExclusive = totalCount;
            var rawRangeCount = Math.Max(0, endIndexExclusive - startIndex);
            var truncated = rawRangeCount > limit;
            if (truncated)
            {
                startIndex = endIndexExclusive - limit;
            }

            return SnapshotFromBoundedEntries(record, capturedMainThreadId, input.includeStackTrace, limit, totalCount, startIndex, endIndexExclusive, truncated, SliceEntries(allEntries, startIndex, endIndexExclusive, input.includeStackTrace), artifactRoot);
        }

        internal static UnityAgentKitConsoleClearResult ClearForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, int countBeforeClear, int countAfterClear, Action clearConsole)
        {
            var input = ReadClearInput(inputJson);
            if (!input.confirmClear)
            {
                throw new ConsoleClearNotExplicitException();
            }

            var beforeGeneration = consoleGeneration;
            clearConsole();
            var cleared = countAfterClear == 0;
            if (cleared)
            {
                consoleGeneration += 1;
            }

            return CreateClearResult(record, capturedMainThreadId, true, cleared, countBeforeClear, countAfterClear, beforeGeneration, consoleGeneration);
        }

        private static UnityAgentKitConsoleCountResult CountFromBoundedEntries(UnityAgentKitHostRecord record, int capturedMainThreadId, int totalCount, int startIndex, int maxSeverityScan, UnityAgentKitConsoleEntryRecord[] boundedEntries)
        {
            var counts = CountRange(boundedEntries, 0, boundedEntries.Length);
            var complete = startIndex == 0;
            return new UnityAgentKitConsoleCountResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                totalCount = totalCount,
                counts = counts,
                severityScan = new UnityAgentKitConsoleSeverityScan
                {
                    scannedCount = boundedEntries.Length,
                    startIndex = startIndex,
                    endIndexExclusive = totalCount,
                    limit = maxSeverityScan,
                    severityBreakdownComplete = complete
                },
                cursor = CreateCursor(record, totalCount),
                consoleGeneration = consoleGeneration,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = complete ? Array.Empty<UnityAgentKitDiagnostic>() : new[] { Diagnostic("warning", "console.severity_breakdown_partial", "Severity breakdown scanned the bounded tail window only.") }
            };
        }

        private static UnityAgentKitConsoleSnapshotResult SnapshotFromBoundedEntries(UnityAgentKitHostRecord record, int capturedMainThreadId, bool includeStackTrace, int limit, int totalCount, int startIndex, int endIndexExclusive, bool truncated, UnityAgentKitConsoleEntryRecord[] selected, string artifactRoot)
        {
            var artifactId = "console-" + DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff") + "-" + Guid.NewGuid().ToString("N");
            var createdAt = DateTimeOffset.UtcNow.ToString("O");
            var cursor = CreateCursor(record, totalCount);
            var counts = CountRange(selected, 0, selected.Length);
            var range = new UnityAgentKitConsoleSnapshotRange
            {
                startIndex = startIndex,
                endIndexExclusive = endIndexExclusive,
                totalCountAtCapture = totalCount,
                limit = limit,
                truncated = truncated
            };
            var payload = new UnityAgentKitConsoleSnapshotPayload
            {
                schemaVersion = 1,
                artifactId = artifactId,
                createdAt = createdAt,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                cursor = cursor,
                range = range,
                counts = counts,
                entries = selected,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            UnityAgentKitArtifactContracts.WriteConsoleSnapshotArtifact(artifactRoot, artifactId, JsonUtility.ToJson(payload, true) + Environment.NewLine, record);

            return new UnityAgentKitConsoleSnapshotResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                artifactId = artifactId,
                uri = "unity://console-snapshots/" + artifactId,
                counts = counts,
                cursor = cursor,
                range = range,
                entryCount = selected.Length,
                includeStackTrace = includeStackTrace,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static UnityAgentKitConsoleClearResult CreateClearResult(UnityAgentKitHostRecord record, int capturedMainThreadId, bool explicitClear, bool cleared, int before, int after, int generationBefore, int generationAfter)
        {
            return new UnityAgentKitConsoleClearResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                explicitClear = explicitClear,
                cleared = cleared,
                countBeforeClear = before,
                countAfterClear = after,
                consoleGenerationBeforeClear = generationBefore,
                consoleGenerationAfterClear = generationAfter,
                cursor = CreateCursor(record, after),
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = cleared ? Array.Empty<UnityAgentKitDiagnostic>() : new[] { Diagnostic("error", "console.clear_verification_failed", "Console clear did not produce zero-count evidence.") }
            };
        }

        private static UnityAgentKitConsoleEntryRecord[] SliceEntries(UnityAgentKitConsoleEntryRecord[] entries, int startIndex, int endIndexExclusive, bool includeStackTrace)
        {
            var list = new List<UnityAgentKitConsoleEntryRecord>();
            for (var index = startIndex; index < endIndexExclusive && index < entries.Length; index++)
            {
                var entry = entries[index];
                list.Add(new UnityAgentKitConsoleEntryRecord
                {
                    index = index,
                    entryId = entry.entryId,
                    severity = entry.severity,
                    message = entry.message,
                    stackTrace = includeStackTrace ? entry.stackTrace : string.Empty,
                    mode = entry.mode,
                    attribution = "unattributed"
                });
            }

            return list.ToArray();
        }

        private static UnityAgentKitConsoleCounts CountRange(UnityAgentKitConsoleEntryRecord[] entries, int startIndex, int endIndexExclusive)
        {
            var counts = new UnityAgentKitConsoleCounts();
            for (var index = startIndex; index < endIndexExclusive && index < entries.Length; index++)
            {
                var severity = (entries[index].severity ?? string.Empty).ToLowerInvariant();
                if (severity == "error")
                {
                    counts.error += 1;
                }
                else if (severity == "warning")
                {
                    counts.warning += 1;
                }
                else
                {
                    counts.log += 1;
                }
            }

            return counts;
        }

        private static UnityAgentKitConsoleCursor CreateCursor(UnityAgentKitHostRecord record, int startIndex)
        {
            return new UnityAgentKitConsoleCursor
            {
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                consoleGeneration = consoleGeneration,
                startIndex = Math.Max(0, startIndex),
                createdAt = DateTimeOffset.UtcNow.ToString("O")
            };
        }

        private static UnityAgentKitConsoleCursor NormalizeCursor(UnityAgentKitConsoleCursor cursor)
        {
            if (cursor == null)
            {
                return null;
            }

            return string.IsNullOrEmpty(cursor.hostId) &&
                cursor.hostEpoch == 0 &&
                cursor.consoleGeneration == 0 &&
                cursor.startIndex == 0 &&
                string.IsNullOrEmpty(cursor.createdAt)
                ? null
                : cursor;
        }

        private static bool CursorMatches(UnityAgentKitHostRecord record, UnityAgentKitConsoleCursor cursor, int totalCount)
        {
            return cursor.hostId == (record != null ? record.hostId : string.Empty) &&
                cursor.hostEpoch == (record != null ? record.hostEpoch : 0) &&
                cursor.consoleGeneration == consoleGeneration &&
                cursor.startIndex <= totalCount;
        }

        private static UnityAgentKitConsoleCountInput ReadCountInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleCountInput();
            }

            try
            {
                return JsonUtility.FromJson<UnityAgentKitConsoleCountInput>(inputJson) ?? new UnityAgentKitConsoleCountInput();
            }
            catch (ArgumentException)
            {
                return new UnityAgentKitConsoleCountInput();
            }
        }

        private static UnityAgentKitConsoleSnapshotInput ReadSnapshotInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleSnapshotInput();
            }

            try
            {
                return JsonUtility.FromJson<UnityAgentKitConsoleSnapshotInput>(inputJson) ?? new UnityAgentKitConsoleSnapshotInput();
            }
            catch (ArgumentException)
            {
                return new UnityAgentKitConsoleSnapshotInput();
            }
        }

        private static UnityAgentKitConsoleClearInput ReadClearInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleClearInput();
            }

            try
            {
                return JsonUtility.FromJson<UnityAgentKitConsoleClearInput>(inputJson) ?? new UnityAgentKitConsoleClearInput();
            }
            catch (ArgumentException)
            {
                return new UnityAgentKitConsoleClearInput();
            }
        }

        private static int Bound(int value, int min, int max, int fallback)
        {
            if (value <= 0)
            {
                value = fallback;
            }

            return Math.Min(max, Math.Max(min, value));
        }

        private static UnityAgentKitDiagnostic Diagnostic(string severity, string code, string message)
        {
            return new UnityAgentKitDiagnostic
            {
                source = "console",
                severity = severity,
                code = code,
                message = message
            };
        }

        private sealed class UnityConsoleReader
        {
            internal readonly bool available;
            internal readonly string errorMessage;
            private readonly Type logEntryType;
            private readonly MethodInfo getCountMethod;
            private readonly MethodInfo getEntryMethod;
            private readonly MethodInfo clearMethod;
            private readonly FieldInfo messageField;
            private readonly FieldInfo conditionField;
            private readonly FieldInfo modeField;
            private readonly FieldInfo instanceIdField;
            private readonly FieldInfo stackTraceField;

            private UnityConsoleReader(string errorMessage)
            {
                available = false;
                this.errorMessage = errorMessage;
            }

            private UnityConsoleReader(Type logEntryType, MethodInfo getCountMethod, MethodInfo getEntryMethod, MethodInfo clearMethod)
            {
                available = true;
                errorMessage = string.Empty;
                this.logEntryType = logEntryType;
                this.getCountMethod = getCountMethod;
                this.getEntryMethod = getEntryMethod;
                this.clearMethod = clearMethod;
                const BindingFlags fieldFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance;
                messageField = logEntryType.GetField("message", fieldFlags);
                conditionField = logEntryType.GetField("condition", fieldFlags);
                modeField = logEntryType.GetField("mode", fieldFlags);
                instanceIdField = logEntryType.GetField("instanceID", fieldFlags);
                stackTraceField = logEntryType.GetField("stackTrace", fieldFlags);
            }

            internal static UnityConsoleReader Create()
            {
                var logEntriesType = Type.GetType("UnityEditor.LogEntries,UnityEditor.dll");
                var logEntryType = Type.GetType("UnityEditor.LogEntry,UnityEditor.dll");
                if (logEntriesType == null || logEntryType == null)
                {
                    return new UnityConsoleReader("Console reflection types are unavailable for this Unity version.");
                }

                const BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
                var getCountMethod = logEntriesType.GetMethod("GetCount", flags);
                var getEntryMethod = ResolveGetEntryInternalMethod(logEntriesType, logEntryType);
                var clearMethod = logEntriesType.GetMethod("Clear", flags) ?? logEntriesType.GetMethod("Clear", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance);
                if (getCountMethod == null || getEntryMethod == null || clearMethod == null)
                {
                    return new UnityConsoleReader("Console reflection methods are unavailable for this Unity version.");
                }

                return new UnityConsoleReader(logEntryType, getCountMethod, getEntryMethod, clearMethod);
            }

            internal int GetCount()
            {
                return (int)(getCountMethod.Invoke(null, null) ?? 0);
            }

            internal UnityAgentKitConsoleEntryRecord[] ReadEntries(int startIndex, int endIndexExclusive, bool includeStackTrace)
            {
                var safeStartIndex = Math.Max(0, startIndex);
                var safeEndIndexExclusive = Math.Max(safeStartIndex, endIndexExclusive);
                var entries = new List<UnityAgentKitConsoleEntryRecord>(safeEndIndexExclusive - safeStartIndex);
                var entry = Activator.CreateInstance(logEntryType);
                var secondParameterIsByRef = getEntryMethod.GetParameters()[1].ParameterType.IsByRef;
                for (var index = safeStartIndex; index < safeEndIndexExclusive; index++)
                {
                    var args = new[] { (object)index, entry };
                    getEntryMethod.Invoke(null, args);
                    if (secondParameterIsByRef && args[1] != null)
                    {
                        entry = args[1];
                    }

                    var message = (string)(messageField?.GetValue(entry) ?? conditionField?.GetValue(entry) ?? string.Empty);
                    var rawMode = (int)(modeField?.GetValue(entry) ?? 0);
                    var severity = NormalizeSeverity(rawMode, message);
                    entries.Add(new UnityAgentKitConsoleEntryRecord
                    {
                        index = index,
                        entryId = (int)(instanceIdField?.GetValue(entry) ?? index),
                        severity = severity.ToLowerInvariant(),
                        message = message,
                        stackTrace = includeStackTrace ? (string)(stackTraceField?.GetValue(entry) ?? string.Empty) : string.Empty,
                        mode = severity,
                        attribution = "unattributed"
                    });
                }

                return entries.ToArray();
            }

            internal void Clear()
            {
                clearMethod.Invoke(null, null);
            }
        }

        private static MethodInfo ResolveGetEntryInternalMethod(Type logEntriesType, Type logEntryType)
        {
            const BindingFlags methodFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
            foreach (var method in logEntriesType.GetMethods(methodFlags))
            {
                if (!string.Equals(method.Name, "GetEntryInternal", StringComparison.Ordinal))
                {
                    continue;
                }

                var parameters = method.GetParameters();
                if (parameters.Length != 2 || parameters[0].ParameterType != typeof(int))
                {
                    continue;
                }

                var secondType = parameters[1].ParameterType;
                if (secondType.IsByRef)
                {
                    secondType = secondType.GetElementType();
                }

                if (secondType == typeof(object) || secondType.IsAssignableFrom(logEntryType) || logEntryType.IsAssignableFrom(secondType))
                {
                    return method;
                }
            }

            return null;
        }

        private static string NormalizeSeverity(int rawModeValue, string message)
        {
            if ((rawModeValue & ErrorMask) == ErrorMask)
            {
                return "Error";
            }

            if ((rawModeValue & WarningMask) == WarningMask)
            {
                return "Warning";
            }

            if ((rawModeValue & LogMask) == LogMask)
            {
                return "Log";
            }

            if (!string.IsNullOrEmpty(message) && message.IndexOf("error", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Error";
            }

            if (!string.IsNullOrEmpty(message) && message.IndexOf("warning", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Warning";
            }

            return "Log";
        }
    }

    internal sealed class ConsoleReflectionUnavailableException : Exception
    {
        internal ConsoleReflectionUnavailableException(string message) : base(message)
        {
        }
    }

    internal sealed class ConsoleCursorInvalidException : Exception
    {
        internal ConsoleCursorInvalidException() : base("Console cursor is not valid for the active host generation.")
        {
        }
    }

    internal sealed class ConsoleClearNotExplicitException : Exception
    {
        internal ConsoleClearNotExplicitException() : base("Console clear requires explicit confirmation.")
        {
        }
    }
}
