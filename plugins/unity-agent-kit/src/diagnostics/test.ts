import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const testListOperation = "test.list" as const;
export const testStartOperation = "test.start" as const;
export const testStatusOperation = "test.status.get" as const;
export const testResultOperation = "test.result.get" as const;

export type TestMode = "editmode" | "playmode" | "all";

export interface TestSelector {
  mode: TestMode;
  assembly?: string;
  className?: string;
  methodName?: string;
}

export interface TestCaseRecord {
  id: string;
  name: string;
  fullName: string;
  assembly: string;
  className: string;
  mode: "editmode" | "playmode";
}

export interface TestFailureRecord {
  name: string;
  fullName: string;
  message: string;
  stackTrace: string;
}

export interface TestListSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  selector: TestSelector;
  tests: TestCaseRecord[];
  total: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface TestJobSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  jobId: string;
  state: string;
  selector: TestSelector;
  createdAt: string;
  updatedAt: string;
  reportId: string;
  diagnostics: UnityAgentKitDiagnostic[];
}

export type TestJobState = "accepted" | "running" | "completed" | "failed" | "cancelled" | "timeout" | "lost" | "unknown";

export interface TestReportSummary {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  jobId: string;
  reportId: string;
  uri: string;
  mode: "editmode" | "playmode";
  selector: TestSelector;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  inconclusive: number;
  verifiedTestPass: boolean;
  terminalState: TestJobState;
  failures: TestFailureRecord[];
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface TestReportPayloadSummary {
  schemaVersion: 1;
  reportId: string;
  uri: string;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  inconclusive: number;
}

export function rejectUnsupportedSelectorMode(action: "list" | "start", requestId?: string): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "rejected",
    tool: "unity_test",
    action,
    operation: action === "list" ? testListOperation : testStartOperation,
    requestId,
    summary: "Test selector mode all is not supported for this workflow.",
    code: "unsupported_selector_mode",
    message: "Test selector mode all is not supported for this workflow.",
    diagnostics: [{
      source: "workflow",
      severity: "error",
      code: "unsupported_selector_mode",
      message: "Test selector mode all is not supported for this workflow.",
      attribution: { operation: action === "list" ? testListOperation : testStartOperation, requestId },
    }],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Use editmode or playmode for Unity test list/start workflows.",
    },
  });
}

export function parseTestListData(data: unknown): TestListSnapshot | null {
  const value = parseRecord(data);
  if (value === null || hasKnownLegacyListField(value) || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isTestSelector(value.selector) && Array.isArray(value.tests) && value.tests.every(isTestCaseRecord) &&
    isNonNegativeInteger(value.total) && isDiagnosticArray(value.diagnostics)
  )) return null;
  return { projectRoot: value.projectRoot, unityVersion: value.unityVersion, hostId: value.hostId, hostEpoch: value.hostEpoch, selector: cloneSelector(value.selector), tests: value.tests.map(cloneTestCase), total: value.total, diagnostics: cloneDiagnostics(value.diagnostics) };
}

export function parseTestJobData(data: unknown): TestJobSnapshot | null {
  const value = parseRecord(data);
  if (value === null || hasKnownLegacyJobField(value) || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isNonEmptyString(value.jobId) && isTestJobState(value.state) && isTestSelector(value.selector) &&
    isNonEmptyString(value.createdAt) && isNonEmptyString(value.updatedAt) && typeof value.reportId === "string" &&
    isDiagnosticArray(value.diagnostics)
  )) return null;
  return { projectRoot: value.projectRoot, unityVersion: value.unityVersion, hostId: value.hostId, hostEpoch: value.hostEpoch, jobId: value.jobId, state: value.state, selector: cloneSelector(value.selector), createdAt: value.createdAt, updatedAt: value.updatedAt, reportId: value.reportId, diagnostics: cloneDiagnostics(value.diagnostics) };
}

export function parseTestReportData(data: unknown): TestReportSummary | null {
  const value = parseRecord(data);
  if (value === null || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isNonEmptyString(value.jobId) && isNonEmptyString(value.reportId) &&
    isNonEmptyString(value.uri) && value.uri === `unity://test-reports/${value.reportId}` && isTestCaseMode(value.mode) &&
    isTestSelector(value.selector) && isNonNegativeInteger(value.total) && isNonNegativeInteger(value.passed) &&
    isNonNegativeInteger(value.failed) && isNonNegativeInteger(value.errors) && isNonNegativeInteger(value.skipped) &&
    isNonNegativeInteger(value.inconclusive) && typeof value.verifiedTestPass === "boolean" &&
    isTestJobState(value.terminalState) && Array.isArray(value.failures) && value.failures.every(isFailureRecord) &&
    isDiagnosticArray(value.diagnostics)
  )) return null;
  return { projectRoot: value.projectRoot, unityVersion: value.unityVersion, hostId: value.hostId, hostEpoch: value.hostEpoch, jobId: value.jobId, reportId: value.reportId, uri: value.uri, mode: value.mode, selector: cloneSelector(value.selector), total: value.total, passed: value.passed, failed: value.failed, errors: value.errors, skipped: value.skipped, inconclusive: value.inconclusive, verifiedTestPass: value.verifiedTestPass, terminalState: value.terminalState, failures: value.failures.map(cloneFailure), diagnostics: cloneDiagnostics(value.diagnostics) };
}

export function parseTestReportPayloadData(data: unknown): TestReportPayloadSummary | null {
  const value = parseRecord(data instanceof Uint8Array ? new TextDecoder().decode(data) : data);
  if (value === null || !(
    value.schemaVersion === 1 && isNonEmptyString(value.reportId) && isNonEmptyString(value.uri) &&
    value.uri === `unity://test-reports/${value.reportId}` && isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.passed) && isNonNegativeInteger(value.failed) && isNonNegativeInteger(value.errors) &&
    isNonNegativeInteger(value.skipped) && isNonNegativeInteger(value.inconclusive)
  )) return null;
  return { schemaVersion: 1, reportId: value.reportId, uri: value.uri, total: value.total, passed: value.passed, failed: value.failed, errors: value.errors, skipped: value.skipped, inconclusive: value.inconclusive };
}

export function testListResultFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  return mapTestResult(hostResult, expectedProjectRoot, testListOperation, "list", parseTestListData, (snapshot, diagnostics) => definePublicResult({
    status: "succeeded", tool: "unity_test", action: "list", operation: testListOperation, requestId: hostResult.requestId,
    hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: "Test list snapshot captured.", data: snapshot,
    diagnostics, evidence: { completion: "state_snapshot", total: snapshot.total, verifiedTestPass: false },
    startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs,
  }));
}

export function testJobResultFromHostResult(hostResult: UnityAgentKitPublicResult, action: "start" | "get_status", expectedProjectRoot: string): UnityAgentKitPublicResult {
  const operation = action === "start" ? testStartOperation : testStatusOperation;
  return mapTestResult(hostResult, expectedProjectRoot, operation, action, parseTestJobData, (job, diagnostics) => definePublicResult({
    status: "succeeded", tool: "unity_test", action, operation, requestId: hostResult.requestId,
    hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: action === "start" ? "Test job accepted." : "Test job status captured.",
    data: job, diagnostics, evidence: { completion: action === "start" ? "request_accepted" : "job_status_snapshot", jobState: job.state, verifiedTestPass: false },
    job: { jobId: job.jobId, tool: "unity_test", action, state: normalizeJobState(job.state), createdAt: job.createdAt, updatedAt: job.updatedAt, hostId: job.hostId, hostEpoch: job.hostEpoch, reportId: job.reportId || undefined, lastKnownContinuity: "current", diagnostics: job.diagnostics },
    startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs,
  }));
}

export function testReportSummaryFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  return mapTestResult(hostResult, expectedProjectRoot, testResultOperation, "get_result", parseTestReportData, (summary, diagnostics) => definePublicResult({
    status: "succeeded", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId: hostResult.requestId,
    hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: "Test report metadata captured.", data: summary,
    diagnostics, evidence: { completion: "artifact_metadata_written", reportId: summary.reportId, verifiedTestPass: summary.verifiedTestPass },
    startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs,
  }));
}

export function reportPayloadMatchesSummary(payload: TestReportPayloadSummary, summary: TestReportSummary): boolean {
  return payload.reportId === summary.reportId && payload.uri === summary.uri && payload.total === summary.total &&
    payload.passed === summary.passed && payload.failed === summary.failed && payload.errors === summary.errors &&
    payload.skipped === summary.skipped && payload.inconclusive === summary.inconclusive;
}

export function isTerminalTestReportState(state: TestJobState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled" || state === "timeout" || state === "lost";
}

export function hasVerifiedTestPassMismatch(summary: TestReportSummary): boolean {
  const countsShowCompletedPass = summary.terminalState === "completed" && summary.failed === 0 && summary.errors === 0 &&
    summary.total === summary.passed + summary.skipped + summary.inconclusive;
  return summary.verifiedTestPass !== countsShowCompletedPass;
}

function mapTestResult<T>(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string, operation: string, action: string, parse: (data: unknown) => T | null, success: (parsed: T, diagnostics: UnityAgentKitDiagnostic[]) => UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") return definePublicResult({ ...hostResult, tool: "unity_test", action, summary: hostResult.summary || `Test ${action} could not be completed.` });
  const parsed = parse(hostResult.data);
  if (parsed === null) return invalidTestResult(hostResult, operation, action, `test.${action}_invalid_shape`, `Test ${action} operation returned an invalid data shape.`);
  const record = parsed as Record<string, unknown>;
  if (typeof record.projectRoot !== "string" || normalizeProjectRoot(record.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidTestResult(hostResult, operation, action, "test.project_root_mismatch", `Test ${action} projectRoot does not match the expected Unity project root.`, { expectedProjectRoot, actualProjectRoot: record.projectRoot });
  }
  if (record.hostId !== hostResult.hostId || record.hostEpoch !== hostResult.hostEpoch) {
    return continuityLostResult(hostResult, operation, action, { expectedHostId: hostResult.hostId, expectedHostEpoch: hostResult.hostEpoch, actualHostId: record.hostId, actualHostEpoch: record.hostEpoch });
  }
  return success(parsed, [...hostResult.diagnostics, ...(Array.isArray(record.diagnostics) ? cloneDiagnostics(record.diagnostics) : [])]);
}

function invalidTestResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, code: string, message: string, details?: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "workflow", severity: "error", code, message, ...(details ? { details } : {}), attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({ status: "failed", tool: "unity_test", action, operation, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: message, code, message, diagnostics: [...hostResult.diagnostics, diagnostic], startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs, nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics before retrying the test workflow." } });
}

function continuityLostResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, details: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "host", severity: "error", code: "host.continuity_lost", message: "Test host continuity changed before the result could be trusted.", details, attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({ status: "lost", tool: "unity_test", action, operation, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: diagnostic.message, code: diagnostic.code, message: diagnostic.message, diagnostics: [...hostResult.diagnostics, diagnostic], startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs, nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics because test proof crossed a host continuity boundary." } });
}

function parseRecord(data: unknown): Record<string, unknown> | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isTestMode(value: unknown): value is TestMode {
  return value === "editmode" || value === "playmode" || value === "all";
}

function isTestCaseMode(value: unknown): value is "editmode" | "playmode" {
  return value === "editmode" || value === "playmode";
}

function isTestJobState(value: unknown): value is TestJobState {
  return value === "accepted" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "timeout" ||
    value === "lost" ||
    value === "unknown";
}

function isTestSelector(value: unknown): value is TestSelector {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const selector = value as Record<string, unknown>;
  return !hasKnownLegacySelectorField(selector) &&
    isTestMode(selector.mode) &&
    (selector.assembly === undefined || isNonEmptyString(selector.assembly)) &&
    (selector.className === undefined || isNonEmptyString(selector.className)) &&
    (selector.methodName === undefined || isNonEmptyString(selector.methodName));
}

function isTestCaseRecord(value: unknown): value is TestCaseRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const test = value as Record<string, unknown>;
  return !hasKnownLegacyTestCaseField(test) &&
    isNonEmptyString(test.id) &&
    isNonEmptyString(test.name) &&
    isNonEmptyString(test.fullName) &&
    isNonEmptyString(test.assembly) &&
    isNonEmptyString(test.className) &&
    isTestCaseMode(test.mode);
}

function hasKnownLegacyListField(value: Record<string, unknown>): boolean {
  return value.filterMode !== undefined || hasKnownLegacySelectorField(value);
}

function hasKnownLegacyJobField(value: Record<string, unknown>): boolean {
  return value.requestedMode !== undefined || hasKnownLegacySelectorField(value);
}

function hasKnownLegacySelectorField(value: Record<string, unknown>): boolean {
  return value.filterMode !== undefined || value.requestedMode !== undefined;
}

function hasKnownLegacyTestCaseField(value: Record<string, unknown>): boolean {
  return value.assemblyName !== undefined;
}

function isFailureRecord(value: unknown): value is TestFailureRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const failure = value as Record<string, unknown>;
  return isNonEmptyString(failure.name) &&
    isNonEmptyString(failure.fullName) &&
    typeof failure.message === "string" &&
    typeof failure.stackTrace === "string";
}

function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] {
  return Array.isArray(value) && value.every(isDiagnostic);
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  return isNonEmptyString(diagnostic.source) &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    isNonEmptyString(diagnostic.message) &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string");
}

function cloneSelector(selector: TestSelector): TestSelector {
  return {
    mode: selector.mode,
    ...(selector.assembly === undefined ? {} : { assembly: selector.assembly }),
    ...(selector.className === undefined ? {} : { className: selector.className }),
    ...(selector.methodName === undefined ? {} : { methodName: selector.methodName }),
  };
}

function cloneTestCase(test: TestCaseRecord): TestCaseRecord {
  return {
    id: test.id,
    name: test.name,
    fullName: test.fullName,
    assembly: test.assembly,
    className: test.className,
    mode: test.mode,
  };
}

function cloneFailure(failure: TestFailureRecord): TestFailureRecord {
  return {
    name: failure.name,
    fullName: failure.fullName,
    message: failure.message,
    stackTrace: failure.stackTrace,
  };
}

function cloneDiagnostics(diagnostics: UnityAgentKitDiagnostic[]): UnityAgentKitDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}

function normalizeJobState(state: string): TestJobState {
  return isTestJobState(state) ? state : "unknown";
}
