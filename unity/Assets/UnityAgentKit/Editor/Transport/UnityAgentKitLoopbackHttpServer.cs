using System;
using System.Net;
using System.Text;
using System.Threading;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitLoopbackHttpServer
    {
        private sealed class ListenerState
        {
            internal ListenerState(HttpListener listener, UnityAgentKitHostRecord record)
            {
                this.listener = listener;
                this.record = record;
            }

            internal readonly HttpListener listener;
            internal readonly UnityAgentKitHostRecord record;
        }

        private static ListenerState _currentState;

        internal static bool IsRunning
        {
            get
            {
                var state = _currentState;
                return state != null && state.listener.IsListening;
            }
        }

        internal static string BuildProbeUrl(int port)
        {
            return "http://127.0.0.1:" + port + "/probe";
        }

        internal static string BuildLoopbackPrefix(int port)
        {
            return "http://127.0.0.1:" + port + "/";
        }

        internal static void Start(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                throw new ArgumentNullException(nameof(record));
            }

            StartListener(record, record.port);
        }

        internal static void StartWithoutRecordForTests(int port)
        {
            StartListener(null, port);
        }

        internal static void Stop(string reasonCode = "host.stopped")
        {
            var state = _currentState;
            _currentState = null;

            if (state != null)
            {
                try
                {
                    state.listener.Stop();
                    state.listener.Close();
                }
                catch (HttpListenerException)
                {
                }
                catch (ObjectDisposedException)
                {
                }
                catch (Exception error)
                {
                    Debug.LogWarning("[UnityAgentKit] Failed to stop loopback HTTP listener: " + error.Message);
                }
            }

            UnityAgentKitMainThread.Stop(reasonCode);
        }

        private static void StartListener(UnityAgentKitHostRecord record, int port)
        {
            Stop("host.restarting");
            var listener = new HttpListener();
            listener.Prefixes.Add(BuildLoopbackPrefix(port));
            listener.Start();
            var state = new ListenerState(listener, record);
            _currentState = state;
            UnityAgentKitMainThread.RegisterDrain();
            var thread = new Thread(() => ListenLoop(state))
            {
                IsBackground = true,
                Name = "UnityAgentKitLoopbackHttpServer"
            };
            thread.Start();
        }

        private static void ListenLoop(ListenerState state)
        {
            while (state.listener.IsListening)
            {
                try
                {
                    HandleContext(state.listener.GetContext(), state.record);
                }
                catch (HttpListenerException)
                {
                    return;
                }
                catch (ObjectDisposedException)
                {
                    return;
                }
                catch (Exception error)
                {
                    Debug.LogWarning("[UnityAgentKit] Loopback HTTP listener error: " + error.Message);
                }
            }
        }

        private static void HandleContext(HttpListenerContext context, UnityAgentKitHostRecord record)
        {
            var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
            if (path == "/probe" && context.Request.HttpMethod == "GET")
            {
                WriteJson(context.Response, 200, JsonUtility.ToJson(CreateProbeResponse(record)));
                return;
            }

            if (path == "/probe")
            {
                WriteJson(context.Response, 405, JsonUtility.ToJson(FailureProbe("http.method_not_allowed", "Method not allowed.")));
                return;
            }

            WriteJson(context.Response, 404, JsonUtility.ToJson(FailureProbe("http.not_found", "Unknown route.")));
        }

        private static UnityAgentKitProbeResponse CreateProbeResponse(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                return FailureProbe("host.not_ready", "Unity Agent Kit host record is not available.");
            }

            return new UnityAgentKitProbeResponse
            {
                hostId = record.hostId,
                hostEpoch = record.hostEpoch,
                projectRoot = record.projectRoot,
                protocolVersion = record.protocolVersion,
                port = record.port,
                status = record.status,
                code = string.Empty,
                message = string.Empty
            };
        }

        private static UnityAgentKitProbeResponse FailureProbe(string code, string message)
        {
            return new UnityAgentKitProbeResponse
            {
                status = "not_ready",
                code = code ?? string.Empty,
                message = message ?? string.Empty
            };
        }

        private static void WriteJson(HttpListenerResponse response, int statusCode, string json)
        {
            var payload = Encoding.UTF8.GetBytes(string.IsNullOrEmpty(json) ? "{}" : json);
            var stream = response.OutputStream;
            Exception writeError = null;
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = payload.Length;

            try
            {
                stream.Write(payload, 0, payload.Length);
            }
            catch (Exception error)
            {
                writeError = error;
                throw;
            }
            finally
            {
                try
                {
                    stream.Close();
                }
                catch (Exception) when (writeError != null)
                {
                }
            }
        }
    }
}
