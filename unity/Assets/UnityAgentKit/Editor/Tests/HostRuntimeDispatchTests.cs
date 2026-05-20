using System;
using System.Collections;
using System.Threading;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace UnityAgentKit.Editor.Tests
{
    public sealed partial class HostRuntimeTests
    {
        [Test]
        public void ThreadCheckOperationIsMarkedAsMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" host.threadCheck "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.throw"));
            Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.echo"));
            Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("unknown.operation"));
        }

        [Test]
        public void MainThreadDispatchRunsThreadCheckOnCapturedThread()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-direct"
            }, TestHostRecord(49210), completed => response = completed);

            UnityAgentKitMainThread.DrainForTests();

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-direct", TestHostRecord(49210));
            var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
            Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
            Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
            Assert.IsTrue(data.ranOnMainThread);
        }

        [Test]
        public void CompletionCallbackExceptionDoesNotPreventLaterDispatchesInSameDrain()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            var firstCompletionCount = 0;
            var secondCompletionCount = 0;
            UnityAgentKitOperationResponse secondResponse = null;
            var record = TestHostRecord(49211);

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-first"
            }, record, _ =>
            {
                firstCompletionCount += 1;
                throw new InvalidOperationException("completion failed");
            });

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-thread-second"
            }, record, completed =>
            {
                secondCompletionCount += 1;
                secondResponse = completed;
            });

            Assert.DoesNotThrow(() => UnityAgentKitMainThread.DrainForTests());

            Assert.AreEqual(1, firstCompletionCount);
            Assert.AreEqual(1, secondCompletionCount);
            AssertOperationEnvelopeMinimumFields(secondResponse, "succeeded", "host.threadCheck", "req-thread-second", record);
            var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(secondResponse.data);
            Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
            Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
            Assert.IsTrue(data.ranOnMainThread);
        }

        [Test]
        public void DispatchExceptionReturnsStructuredDiagnostics()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.throw",
                requestId = "req-throw"
            }, TestHostRecord(49212), completed => response = completed);

            UnityAgentKitMainThread.DrainForTests();

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.throw", "req-throw", TestHostRecord(49212));
            Assert.AreEqual("host.dispatch_exception", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("error", response.diagnostics[0].severity);
            Assert.AreEqual("host.dispatch_exception", response.diagnostics[0].code);
            Assert.AreEqual("{\"exceptionType\":\"InvalidOperationException\"}", response.diagnostics[0].details);
        }

        [UnityTest]
        public IEnumerator HostThreadCheckOverOperationsRunsOnCapturedMainThread()
        {
            var registryPath = TemporaryRegistryPath("operations-threadcheck-main-thread");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-thread-http\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitMainThread.DrainForTests();
                yield return WaitForRequestDone(request);

                var requestError = request.GetError();
                if (requestError != null)
                {
                    throw requestError;
                }

                var requestResult = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(requestResult.body);
                Assert.AreEqual(200, requestResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-http", record);
                Assert.AreEqual(string.Empty, response.code);
                Assert.AreEqual(0, response.diagnostics.Length);
                var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
                Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
                Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
                Assert.IsTrue(data.ranOnMainThread);
            }
            finally
            {
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutReturnsHostTimeout()
        {
            var registryPath = TemporaryRegistryPath("operations-pending-timeout");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);

                if (request.GetError() != null)
                {
                    throw request.GetError();
                }

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout", record);
                Assert.AreEqual("host.dispatch_timeout", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.dispatch_timeout", response.diagnostics[0].code);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler()
        {
            var registryPath = TemporaryRegistryPath("operations-timeout-nonblocking");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-nonblocking\"}");

                yield return WaitForPendingDispatch();

                Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
                Assert.IsFalse(request.IsDone);

                UnityAgentKitMainThread.DrainForTests();

                Assert.Greater(UnityAgentKitMainThread.PendingDispatchCountForTests, 0);
                Assert.IsFalse(request.IsDone);

                yield return WaitForRequestDone(request);
                Assert.IsNull(request.GetError());

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                Assert.AreEqual(200, request.GetResult().statusCode);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-nonblocking", record);
                Assert.AreEqual("host.dispatch_timeout", response.code);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator PendingDispatchTimeoutMarksMayStillBeRunning()
        {
            var registryPath = TemporaryRegistryPath("operations-timeout-may-still-run");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout-metadata\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);

                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.GetResult().body);
                AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout-metadata", record);
                Assert.AreEqual("{\"mayStillBeRunning\":true}", response.metadata);
                Assert.AreEqual("{\"mayStillBeRunning\":true}", response.diagnostics[0].details);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator ExpiredDispatchWorkDoesNotExecuteLater()
        {
            var registryPath = TemporaryRegistryPath("operations-expired-not-executed");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-expired\"}");

                yield return WaitForPendingDispatch();
                yield return WaitForRequestDone(request);
                UnityAgentKitMainThread.DrainForTests();
                UnityAgentKitMainThread.DrainForTests();

                Assert.AreEqual(0, UnityAgentKitMainThread.ExpiredDispatchExecutionCountForTests);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [UnityTest]
        public IEnumerator HostStopReturnsStoppedEnvelopeBeforeClosingListener()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-pending");

            try
            {
                var record = UnityAgentKitHost.StartForTests(registryPath);
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
                var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-http-stop\"}");

                yield return WaitForPendingDispatch();
                UnityAgentKitHost.StopForTests("host.stopped");
                yield return WaitForRequestDone(request);

                var requestError = request.GetError();
                if (requestError != null)
                {
                    throw requestError;
                }

                var requestResult = request.GetResult();
                var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(requestResult.body);
                Assert.AreEqual(200, requestResult.statusCode);
                AssertOperationEnvelopeMinimumFields(response, "failed", "host.pendingDispatchTimeout", "req-http-stop", record);
                Assert.AreEqual("host.stopped", response.code);
                Assert.AreEqual(1, response.diagnostics.Length);
                Assert.AreEqual("host.stopped", response.diagnostics[0].code);
                Assert.AreNotEqual("timeout", response.status);
                Assert.AreNotEqual("host.dispatch_timeout", response.code);
                Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
            }
            finally
            {
                UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
                UnityAgentKitHost.ResetForTests();
            }
        }

        [Test]
        public void HandlerAdmissionCountsActiveHandlerBeforeReturning()
        {
            var port = FreeTcpPort();
            var accepted = false;

            try
            {
                UnityAgentKitLoopbackHttpServer.StartWithoutRecordForTests(port);
                var serverType = typeof(UnityAgentKitLoopbackHttpServer);
                var state = serverType.GetField("_currentState", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic).GetValue(null);
                var tryEnterHandler = state.GetType().GetMethod("TryEnterHandler", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);

                accepted = (bool)tryEnterHandler.Invoke(state, null);

                Assert.IsTrue(accepted);
                Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
            }
            finally
            {
                if (accepted)
                {
                    typeof(UnityAgentKitLoopbackHttpServer).GetMethod("DecrementActiveHandlerCount", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic).Invoke(null, null);
                }

                UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
                UnityAgentKitMainThread.ResetForTests();
            }
        }

        [Test]
        public void StopWindowRejectsNewDispatchRequestsWithoutEnqueueing()
        {
            var registryPath = TemporaryRegistryPath("operations-http-stop-window-reject");
            BackgroundHttpRequest stopWindowRequest = null;
            Thread releaseThread = null;
            using (var handlerStarted = new ManualResetEventSlim(false))
            using (var releaseHandler = new ManualResetEventSlim(false))
            using (var stopFlushStarted = new ManualResetEventSlim(false))
            {
                try
                {
                    var record = UnityAgentKitHost.StartForTests(registryPath);
                    UnityAgentKitLoopbackHttpServer.HandlerStartedForTests = () =>
                    {
                        handlerStarted.Set();
                        releaseHandler.Wait(1000);
                    };
                    UnityAgentKitLoopbackHttpServer.BeforeStopFlushHookForTests = () => stopFlushStarted.Set();
                    UnityAgentKitLoopbackHttpServer.BeginStopHookForTests = () =>
                    {
                        stopWindowRequest = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-stop-window\"}");
                        Assert.IsTrue(handlerStarted.Wait(1000), "Expected stop-window request to enter handler during Stop.");
                        releaseThread = new Thread(() =>
                        {
                            stopFlushStarted.Wait(1000);
                            releaseHandler.Set();
                        });
                        releaseThread.IsBackground = true;
                        releaseThread.Start();
                    };

                    UnityAgentKitHost.StopForTests("host.stopped");

                    Assert.NotNull(stopWindowRequest);
                    Assert.IsTrue(stopWindowRequest.thread.Join(1000), "Expected stop-window request to complete before assertion.");
                    Assert.IsTrue(stopWindowRequest.IsDone);
                    Assert.IsNull(stopWindowRequest.GetError());

                    var stopWindowResult = stopWindowRequest.GetResult();
                    var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(stopWindowResult.body);
                    Assert.AreEqual(200, stopWindowResult.statusCode);
                    AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-stop-window", record);
                    Assert.AreEqual("host.stopped", response.code);
                    Assert.AreEqual(1, response.diagnostics.Length);
                    Assert.AreEqual("host.stopped", response.diagnostics[0].code);
                    Assert.AreNotEqual("timeout", response.status);
                    Assert.AreNotEqual("host.dispatch_timeout", response.code);
                    Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
                    Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
                }
                finally
                {
                    stopFlushStarted.Set();
                    releaseHandler.Set();
                    if (releaseThread != null)
                    {
                        releaseThread.Join(1000);
                    }

                    UnityAgentKitLoopbackHttpServer.BeginStopHookForTests = null;
                    UnityAgentKitLoopbackHttpServer.BeforeStopFlushHookForTests = null;
                    UnityAgentKitLoopbackHttpServer.HandlerStartedForTests = null;
                    UnityAgentKitHost.ResetForTests();
                }
            }
        }

        [Test]
        public void StopFailsPendingDispatchWork()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-stop-pending"
            }, TestHostRecord(49240), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-stop-pending", TestHostRecord(49240));
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
        }

        [Test]
        public void EnqueueAfterStopCompletesImmediatelyWithoutPendingDispatch()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitMainThread.Stop("host.stopped");
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-enqueue-after-stop"
            }, TestHostRecord(49244), completed => response = completed);

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-enqueue-after-stop", TestHostRecord(49244));
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
        }

        [Test]
        public void StopFailsPendingWorkWithStoppedDiagnostic()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-stopped-diagnostic"
            }, TestHostRecord(49241), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped");

            Assert.AreEqual("failed", response.status);
            Assert.AreEqual("host.stopped", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("host.stopped", response.diagnostics[0].code);
            Assert.AreEqual("error", response.diagnostics[0].severity);
        }

        [Test]
        public void ReloadStopFailsPendingWorkWithoutTimeoutStatus()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-reload-pending"
            }, TestHostRecord(49242), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.stopped_for_reload");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-reload-pending", TestHostRecord(49242));
            Assert.AreEqual("host.stopped_for_reload", response.code);
            Assert.AreNotEqual("timeout", response.status);
            Assert.AreNotEqual("host.dispatch_timeout", response.code);
        }

        [Test]
        public void QuittingStopFailsPendingWorkWithEditorQuittingDiagnostic()
        {
            UnityAgentKitMainThread.ResetForTests();
            UnityAgentKitMainThread.RegisterDrain();
            UnityAgentKitOperationResponse response = null;

            UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
            {
                operation = "host.threadCheck",
                requestId = "req-quitting-pending"
            }, TestHostRecord(49243), completed => response = completed);

            UnityAgentKitMainThread.Stop("host.editor_quitting");

            AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-quitting-pending", TestHostRecord(49243));
            Assert.AreEqual("host.editor_quitting", response.code);
            Assert.AreEqual("host.editor_quitting", response.diagnostics[0].code);
        }

        private static BackgroundHttpRequest StartPostInBackground(string url, string body)
        {
            var request = new BackgroundHttpRequest();
            request.thread = new Thread(() =>
            {
                try
                {
                    request.SetResult(Post(url, body));
                }
                catch (Exception error)
                {
                    request.SetError(error);
                }
                finally
                {
                    request.MarkDone();
                }
            });
            request.thread.IsBackground = true;
            request.thread.Start();
            return request;
        }

        private static IEnumerator WaitForPendingDispatch()
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
            while (UnityAgentKitMainThread.PendingDispatchCountForTests == 0 && DateTimeOffset.UtcNow < deadline)
            {
                yield return null;
            }

            Assert.Greater(UnityAgentKitMainThread.PendingDispatchCountForTests, 0);
        }

        private static IEnumerator WaitForRequestDone(BackgroundHttpRequest request)
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
            while (!request.IsDone && DateTimeOffset.UtcNow < deadline)
            {
                yield return null;
            }

            Assert.IsTrue(request.IsDone);
            Assert.IsNotNull(request.thread);
            Assert.IsTrue(request.thread.Join(1000));
        }

        private sealed class BackgroundHttpRequest
        {
            private readonly object syncRoot = new object();
            private readonly ManualResetEventSlim doneSignal = new ManualResetEventSlim(false);
            private Exception error;
            private HttpResult result;

            internal Thread thread;

            internal bool IsDone => doneSignal.IsSet;

            internal Exception GetError()
            {
                lock (syncRoot)
                {
                    return error;
                }
            }

            internal HttpResult GetResult()
            {
                lock (syncRoot)
                {
                    return result;
                }
            }

            internal void SetError(Exception value)
            {
                lock (syncRoot)
                {
                    error = value;
                }
            }

            internal void SetResult(HttpResult value)
            {
                lock (syncRoot)
                {
                    result = value;
                }
            }

            internal void MarkDone()
            {
                doneSignal.Set();
            }
        }
    }
}
