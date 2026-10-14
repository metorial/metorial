import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface BugBugTest {
  id: string;
  name: string;
  created?: string;
  lastModified?: string;
  lastRunStatus?: string | null;
  isFavorite?: boolean;
  latestRun?: { status: string } | null;
}

export interface BugBugStep {
  id: string;
  type: string;
  name?: string | null;
  groupId?: string | null;
  isActive?: boolean;
}

export interface BugBugGroup {
  id: string;
  steps?: BugBugStep[];
}

export interface BugBugTestDetails extends BugBugTest {
  startUrl?: string | null;
  screenSizeType?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  steps?: BugBugStep[];
  groups?: Array<BugBugGroup | string> | string;
}

export interface BugBugSuite {
  id: string;
  name: string | null;
  created?: string;
  lastModified?: string;
  lastRunStatus?: string | null;
  latestRun?: { status: string } | null;
  testsCount: number;
}

export interface BugBugSuiteDetails extends BugBugSuite {
  tests: Array<string | { id: string }>;
}

export interface BugBugProfile {
  id: string;
  name: string;
  isDefault?: boolean;
  variables?: Record<string, string>;
  browser?: string | null;
}

export interface BugBugRunState {
  id: string;
  status: string;
  modified: string;
  webappUrl: string;
}

export interface BugBugTestRun {
  id: string;
  testId: string | null;
  name: string;
  status: string;
  started: string | null;
  ended: string | null;
  duration: string | number | null;
  runMode: string | null;
  profileName: string | null;
  webappUrl: string;
}

export interface BugBugSuiteRun {
  id: string;
  suiteId: string | null;
  name: string;
  status: string;
  started: string | null;
  ended: string | null;
  duration: string | number | null;
  profileName: string | null;
  testRuns: BugBugTestRun[];
  webappUrl: string;
}

export interface BugBugProject {
  id: string;
  name: string | null;
  homepageUrl: string | null;
  organizationId: string | null;
  organizationName: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface RunHistoryParams extends PaginationParams {
  startedAfter?: string;
  startedBefore?: string;
  ordering?: string;
  status?: string;
}

export interface RunTestParams {
  testId: string;
  profileId?: string;
  overrideVariables?: Record<string, string>;
}

export interface RunSuiteParams {
  suiteId: string;
  profileId?: string;
  overrideVariables?: Record<string, string>;
}

export let validateResourceId = (id: string, label: string) => {
  if (!id.trim() || id !== id.trim()) {
    throw createApiServiceError(
      `${label} must be a non-empty identifier without surrounding whitespace.`
    );
  }
  return encodeURIComponent(id);
};

let pagination = (params?: PaginationParams) => {
  for (let [name, value] of Object.entries(params ?? {})) {
    if (
      (name === 'page' || name === 'pageSize') &&
      value !== undefined &&
      (!Number.isSafeInteger(value) || value < 1)
    ) {
      throw createApiServiceError(`${name} must be a positive integer.`);
    }
  }
  return pickDefined({ page: params?.page, page_size: params?.pageSize });
};

let historyParams = (params?: RunHistoryParams) => {
  for (let name of ['startedAfter', 'startedBefore'] as const) {
    let value = params?.[name];
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
    ) {
      throw createApiServiceError(`${name} must be a valid ISO datetime.`);
    }
  }
  if (
    params?.startedAfter &&
    params.startedBefore &&
    Date.parse(params.startedAfter) > Date.parse(params.startedBefore)
  ) {
    throw createApiServiceError('startedAfter must not be later than startedBefore.');
  }
  if (
    params?.ordering !== undefined &&
    !['-created', '-started', 'created', 'started'].includes(params.ordering)
  ) {
    throw createApiServiceError('ordering must be created, -created, started, or -started.');
  }
  return pickDefined({
    ...pagination(params),
    status: params?.status,
    started_after: params?.startedAfter,
    started_before: params?.startedBefore,
    ordering: params?.ordering
  });
};

// Keep the existing numeric millisecond output while API v2 serializes durations as strings.
export let durationMilliseconds = (run: {
  duration: string | number | null;
  started: string | null;
  ended: string | null;
}) => {
  if (typeof run.duration === 'number' && Number.isFinite(run.duration)) return run.duration;
  if (typeof run.duration === 'string') {
    let match = /^(?:(\d+)\s+)?(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(run.duration);
    if (match)
      return (
        (Number(match[1] ?? 0) * 86400 +
          Number(match[2]) * 3600 +
          Number(match[3]) * 60 +
          Number(match[4])) *
        1000
      );
  }
  if (run.started && run.ended) {
    let elapsed = Date.parse(run.ended) - Date.parse(run.started);
    if (Number.isFinite(elapsed) && elapsed >= 0) return elapsed;
  }
  return null;
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A BugBug project API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.bugbug.io/api/v2',
      timeout: 30000,
      authHeader: { value: `Token ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'BugBug', reason: 'bugbug_api_error' })
    });
  }

  async listTests(
    params?: PaginationParams & { query?: string; ordering?: string }
  ): Promise<PaginatedResponse<BugBugTest>> {
    let response = await this.axios.get('/tests/', {
      params: pickDefined({
        ...pagination(params),
        query: params?.query,
        ordering: params?.ordering,
        latestRun: true
      })
    });
    return response.data;
  }

  async getTest(testId: string): Promise<BugBugTestDetails> {
    let response = await this.axios.get(`/tests/${validateResourceId(testId, 'testId')}/`);
    return response.data;
  }

  async runTest(params: RunTestParams): Promise<BugBugRunState> {
    validateResourceId(params.testId, 'testId');
    if (params.profileId !== undefined) validateResourceId(params.profileId, 'profileId');
    let response = await this.axios.post(
      '/testruns/',
      pickDefined({
        testId: params.testId,
        runProfileId: params.profileId,
        variables:
          params.overrideVariables === undefined
            ? undefined
            : Object.entries(params.overrideVariables).map(([key, value]) => ({ key, value }))
      })
    );
    return response.data;
  }

  async listTestRuns(
    params?: RunHistoryParams & { testId?: string }
  ): Promise<PaginatedResponse<BugBugTestRun>> {
    if (params?.testId !== undefined) validateResourceId(params.testId, 'testId');
    let response = await this.axios.get('/testruns/', {
      params: pickDefined({ ...historyParams(params), testId: params?.testId })
    });
    return response.data;
  }

  async getTestRun(testRunId: string): Promise<BugBugTestRun> {
    let response = await this.axios.get(
      `/testruns/${validateResourceId(testRunId, 'testRunId')}/`
    );
    return response.data;
  }

  async stopTestRun(testRunId: string): Promise<BugBugRunState> {
    let response = await this.axios.post(
      `/testruns/${validateResourceId(testRunId, 'testRunId')}/stop/`
    );
    return response.data;
  }

  async listSuites(
    params?: PaginationParams & { query?: string; ordering?: string }
  ): Promise<PaginatedResponse<BugBugSuite>> {
    let response = await this.axios.get('/suites/', {
      params: pickDefined({
        ...pagination(params),
        query: params?.query,
        ordering: params?.ordering,
        latestRun: true
      })
    });
    return response.data;
  }

  async getSuite(suiteId: string): Promise<BugBugSuiteDetails> {
    let response = await this.axios.get(`/suites/${validateResourceId(suiteId, 'suiteId')}/`);
    return response.data;
  }

  async runSuite(params: RunSuiteParams): Promise<BugBugRunState> {
    validateResourceId(params.suiteId, 'suiteId');
    if (params.profileId !== undefined) validateResourceId(params.profileId, 'profileId');
    let response = await this.axios.post(
      '/suiteruns/',
      pickDefined({
        suiteId: params.suiteId,
        runProfileId: params.profileId,
        variables:
          params.overrideVariables === undefined
            ? undefined
            : Object.entries(params.overrideVariables).map(([key, value]) => ({ key, value }))
      })
    );
    return response.data;
  }

  async listSuiteRuns(
    params?: RunHistoryParams & { suiteId?: string }
  ): Promise<PaginatedResponse<BugBugSuiteRun>> {
    if (params?.suiteId !== undefined) validateResourceId(params.suiteId, 'suiteId');
    let response = await this.axios.get('/suiteruns/', {
      params: pickDefined({ ...historyParams(params), suiteId: params?.suiteId })
    });
    return response.data;
  }

  async getSuiteRun(suiteRunId: string): Promise<BugBugSuiteRun> {
    let response = await this.axios.get(
      `/suiteruns/${validateResourceId(suiteRunId, 'suiteRunId')}/`
    );
    return response.data;
  }

  async stopSuiteRun(suiteRunId: string): Promise<BugBugRunState> {
    let response = await this.axios.post(
      `/suiteruns/${validateResourceId(suiteRunId, 'suiteRunId')}/stop/`
    );
    return response.data;
  }

  async listProfiles(params?: PaginationParams): Promise<PaginatedResponse<BugBugProfile>> {
    let response = await this.axios.get('/profiles/', { params: pagination(params) });
    return response.data;
  }

  async getProfile(profileId: string): Promise<BugBugProfile> {
    let response = await this.axios.get(
      `/profiles/${validateResourceId(profileId, 'profileId')}/`
    );
    return response.data;
  }

  async listProjects(
    params?: PaginationParams & { query?: string; ordering?: string }
  ): Promise<PaginatedResponse<BugBugProject>> {
    let response = await this.axios.get('/projects/', {
      params: pickDefined({
        ...pagination(params),
        query: params?.query,
        ordering: params?.ordering
      })
    });
    return response.data;
  }
}
