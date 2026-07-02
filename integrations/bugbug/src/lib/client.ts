import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BugBugTest {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  lastRunStatus: string | null;
  isFavorite: boolean;
  groups: string[];
}

export interface BugBugTestDetails {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  lastRunStatus: string | null;
  isFavorite: boolean;
  startUrl: string | null;
  screenSizeType: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  steps: BugBugStep[];
  groups: string[];
}

export interface BugBugStep {
  id: string;
  type: string;
  name: string | null;
  groupId: string | null;
  isActive: boolean;
  notes: string | null;
  sleep: number | null;
  runTimeout: number | null;
}

export interface BugBugSuite {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  lastRunStatus: string | null;
  testsCount: number;
}

export interface BugBugSuiteDetails {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  lastRunStatus: string | null;
  tests: string[];
  testsCount: number;
}

export interface BugBugProfile {
  id: string;
  name: string;
  variables: Record<string, string>;
  browser: string | null;
}

export interface BugBugTestRunStatus {
  status: string;
  testRunId: string;
}

export interface BugBugSuiteRunStatus {
  status: string;
  suiteRunId: string;
}

export interface BugBugTestRun {
  id: string;
  testId: string;
  testName: string;
  status: string;
  started: string | null;
  finished: string | null;
  duration: number | null;
  runMode: string | null;
  runProfileName: string | null;
}

export interface BugBugSuiteRun {
  id: string;
  suiteId: string;
  suiteName: string;
  status: string;
  started: string | null;
  finished: string | null;
  duration: number | null;
  runProfileName: string | null;
  testRunsCount: number;
  passedTestRunsCount: number;
  failedTestRunsCount: number;
}

export interface BugBugStepRun {
  id: string;
  stepId: string;
  status: string;
  started: string | null;
  finished: string | null;
  duration: number | null;
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

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.bugbug.io/api/v2',
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Tests
  async listTests(params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<BugBugTest>> {
    let response = await this.axios.get('/tests/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        query: params?.query,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async getTest(testId: string): Promise<BugBugTestDetails> {
    let response = await this.axios.get(`/tests/${testId}/`);
    return response.data;
  }

  async runTest(params: RunTestParams): Promise<BugBugTestRunStatus> {
    let body: Record<string, unknown> = {
      testId: params.testId
    };
    if (params.profileId) {
      body.profileId = params.profileId;
    }
    if (params.overrideVariables) {
      body.overrideVariables = params.overrideVariables;
    }
    let response = await this.axios.post('/testruns/', body);
    return response.data;
  }

  // Test Runs
  async listTestRuns(params?: {
    page?: number;
    pageSize?: number;
    testId?: string;
    status?: string;
    startedAfter?: string;
    startedBefore?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<BugBugTestRun>> {
    let response = await this.axios.get('/testruns/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        test_id: params?.testId,
        status: params?.status,
        started_after: params?.startedAfter,
        started_before: params?.startedBefore,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async getTestRun(testRunId: string): Promise<BugBugTestRun> {
    let response = await this.axios.get(`/testruns/${testRunId}/`);
    return response.data;
  }

  async getTestRunStatus(testRunId: string): Promise<BugBugTestRunStatus> {
    let response = await this.axios.get(`/testruns/${testRunId}/status/`);
    return response.data;
  }

  async stopTestRun(testRunId: string): Promise<BugBugTestRunStatus> {
    let response = await this.axios.post(`/testruns/${testRunId}/stop/`);
    return response.data;
  }

  // Suites
  async listSuites(params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<BugBugSuite>> {
    let response = await this.axios.get('/suites/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        query: params?.query,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async getSuite(suiteId: string): Promise<BugBugSuiteDetails> {
    let response = await this.axios.get(`/suites/${suiteId}/`);
    return response.data;
  }

  async runSuite(params: RunSuiteParams): Promise<BugBugSuiteRunStatus> {
    let body: Record<string, unknown> = {
      suiteId: params.suiteId
    };
    if (params.profileId) {
      body.profileId = params.profileId;
    }
    if (params.overrideVariables) {
      body.overrideVariables = params.overrideVariables;
    }
    let response = await this.axios.post('/suiteruns/', body);
    return response.data;
  }

  // Suite Runs
  async listSuiteRuns(params?: {
    page?: number;
    pageSize?: number;
    startedAfter?: string;
    startedBefore?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<BugBugSuiteRun>> {
    let response = await this.axios.get('/suiteruns/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        started_after: params?.startedAfter,
        started_before: params?.startedBefore,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async getSuiteRun(suiteRunId: string): Promise<BugBugSuiteRun> {
    let response = await this.axios.get(`/suiteruns/${suiteRunId}/`);
    return response.data;
  }

  async getSuiteRunStatus(suiteRunId: string): Promise<BugBugSuiteRunStatus> {
    let response = await this.axios.get(`/suiteruns/${suiteRunId}/status/`);
    return response.data;
  }

  async stopSuiteRun(suiteRunId: string): Promise<BugBugSuiteRunStatus> {
    let response = await this.axios.post(`/suiteruns/${suiteRunId}/stop/`);
    return response.data;
  }

  // Profiles
  async listProfiles(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<BugBugProfile>> {
    let response = await this.axios.get('/profiles/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize
      }
    });
    return response.data;
  }

  async getProfile(profileId: string): Promise<BugBugProfile> {
    let response = await this.axios.get(`/profiles/${profileId}/`);
    return response.data;
  }

  // Step Runs
  async getStepRun(stepRunId: string): Promise<BugBugStepRun> {
    let response = await this.axios.get(`/stepruns/${stepRunId}/`);
    return response.data;
  }
}
