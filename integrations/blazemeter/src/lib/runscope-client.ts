import { createAxios } from 'slates';

export class RunscopeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.runscope.com',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Account ─────────────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data?.data;
  }

  // ─── Buckets ─────────────────────────────────────────────────

  async listBuckets(): Promise<any[]> {
    let response = await this.axios.get('/buckets');
    return response.data?.data || [];
  }

  async getBucket(bucketKey: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${bucketKey}`);
    return response.data?.data;
  }

  async createBucket(params: { name: string; teamUuid?: string }): Promise<any> {
    let response = await this.axios.post('/buckets', params);
    return response.data?.data;
  }

  async deleteBucket(bucketKey: string): Promise<void> {
    await this.axios.delete(`/buckets/${bucketKey}`);
  }

  // ─── Tests ───────────────────────────────────────────────────

  async listTests(bucketKey: string): Promise<any[]> {
    let response = await this.axios.get(`/buckets/${bucketKey}/tests`);
    return response.data?.data || [];
  }

  async getTest(bucketKey: string, testId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${bucketKey}/tests/${testId}`);
    return response.data?.data;
  }

  async createTest(
    bucketKey: string,
    params: {
      name: string;
      description?: string;
      steps?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.post(`/buckets/${bucketKey}/tests`, params);
    return response.data?.data;
  }

  async updateTest(
    bucketKey: string,
    testId: string,
    params: {
      name?: string;
      description?: string;
      steps?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.put(`/buckets/${bucketKey}/tests/${testId}`, params);
    return response.data?.data;
  }

  async deleteTest(bucketKey: string, testId: string): Promise<void> {
    await this.axios.delete(`/buckets/${bucketKey}/tests/${testId}`);
  }

  // ─── Test Runs ───────────────────────────────────────────────

  async runTest(bucketKey: string, testId: string, environmentId?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (environmentId) body.environment_id = environmentId;
    let response = await this.axios.post(
      `/buckets/${bucketKey}/tests/${testId}/trigger`,
      body
    );
    return response.data?.data;
  }

  async listTestRuns(
    bucketKey: string,
    testId: string,
    count?: number,
    offset?: number
  ): Promise<any[]> {
    let params: Record<string, any> = {};
    if (count) params.count = count;
    if (offset) params.offset = offset;
    let response = await this.axios.get(`/buckets/${bucketKey}/tests/${testId}/results`, {
      params
    });
    return response.data?.data || [];
  }

  async getTestRun(bucketKey: string, testId: string, testRunId: string): Promise<any> {
    let response = await this.axios.get(
      `/buckets/${bucketKey}/tests/${testId}/results/${testRunId}`
    );
    return response.data?.data;
  }

  // ─── Environments ────────────────────────────────────────────

  async listEnvironments(bucketKey: string, testId: string): Promise<any[]> {
    let response = await this.axios.get(`/buckets/${bucketKey}/tests/${testId}/environments`);
    return response.data?.data || [];
  }

  async createEnvironment(
    bucketKey: string,
    testId: string,
    params: {
      name: string;
      initialVariables?: Record<string, string>;
      regions?: string[];
      webhooks?: string[];
      remoteAgents?: any[];
    }
  ): Promise<any> {
    let body: Record<string, any> = { name: params.name };
    if (params.initialVariables) body.initial_variables = params.initialVariables;
    if (params.regions) body.regions = params.regions;
    if (params.webhooks) body.webhooks = params.webhooks;
    if (params.remoteAgents) body.remote_agents = params.remoteAgents;
    let response = await this.axios.post(
      `/buckets/${bucketKey}/tests/${testId}/environments`,
      body
    );
    return response.data?.data;
  }

  async updateEnvironment(
    bucketKey: string,
    testId: string,
    environmentId: string,
    params: {
      name?: string;
      initialVariables?: Record<string, string>;
      regions?: string[];
      webhooks?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name) body.name = params.name;
    if (params.initialVariables) body.initial_variables = params.initialVariables;
    if (params.regions) body.regions = params.regions;
    if (params.webhooks) body.webhooks = params.webhooks;
    let response = await this.axios.put(
      `/buckets/${bucketKey}/tests/${testId}/environments/${environmentId}`,
      body
    );
    return response.data?.data;
  }

  // ─── Shared Environments ────────────────────────────────────

  async listSharedEnvironments(bucketKey: string): Promise<any[]> {
    let response = await this.axios.get(`/buckets/${bucketKey}/environments`);
    return response.data?.data || [];
  }

  // ─── Schedules ───────────────────────────────────────────────

  async listSchedules(bucketKey: string, testId: string): Promise<any[]> {
    let response = await this.axios.get(`/buckets/${bucketKey}/tests/${testId}/schedules`);
    return response.data?.data || [];
  }

  async createSchedule(
    bucketKey: string,
    testId: string,
    params: {
      environmentId: string;
      interval: string;
      note?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      environment_id: params.environmentId,
      interval: params.interval
    };
    if (params.note) body.note = params.note;
    let response = await this.axios.post(
      `/buckets/${bucketKey}/tests/${testId}/schedules`,
      body
    );
    return response.data?.data;
  }

  async deleteSchedule(bucketKey: string, testId: string, scheduleId: string): Promise<void> {
    await this.axios.delete(`/buckets/${bucketKey}/tests/${testId}/schedules/${scheduleId}`);
  }
}
