import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export let dataCenterSchema = z.enum([
  'us-west-1',
  'us-east-4',
  'eu-central-1',
  'asia-south-2'
]);

let DATA_CENTER_URLS: Record<string, string> = {
  'us-west-1': 'https://api.us-west-1.saucelabs.com',
  'us-east-4': 'https://api.us-east-4.saucelabs.com',
  'eu-central-1': 'https://api.eu-central-1.saucelabs.com',
  'asia-south-2': 'https://api.asia-south-2.saucelabs.com'
};

export class SauceLabsClient {
  private http;
  private username: string;

  constructor(opts: { username: string; token: string; dataCenter: string }) {
    this.username = opts.username;
    let baseURL = DATA_CENTER_URLS[opts.dataCenter];
    if (!baseURL) {
      throw createApiServiceError('Select a supported Sauce Labs data center.');
    }

    this.http = createAuthenticatedAxios({
      baseURL,
      auth: {
        username: opts.username,
        password: opts.token
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Sauce Labs',
          reason: 'sauce_labs_api_error'
        })
    });
  }

  // ============ VDC Jobs ============

  async listJobs(params?: { limit?: number; skip?: number; from?: number; to?: number }) {
    let response = await this.http.get(`/rest/v1/${encodeURIComponent(this.username)}/jobs`, {
      params
    });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.http.get(
      `/rest/v1/${encodeURIComponent(this.username)}/jobs/${encodeURIComponent(jobId)}`
    );
    return response.data;
  }

  async updateJob(
    jobId: string,
    data: {
      name?: string;
      tags?: string[];
      passed?: boolean;
      build?: string;
      public?: string;
      customData?: Record<string, any>;
    }
  ) {
    let body = pickDefined({
      name: data.name,
      tags: data.tags,
      passed: data.passed,
      build: data.build,
      public: data.public,
      'custom-data': data.customData
    });

    let response = await this.http.put(
      `/rest/v1/${encodeURIComponent(this.username)}/jobs/${encodeURIComponent(jobId)}`,
      body
    );
    return response.data;
  }

  async stopJob(jobId: string) {
    let response = await this.http.put(
      `/rest/v1/${encodeURIComponent(this.username)}/jobs/${encodeURIComponent(jobId)}/stop`
    );
    return response.data;
  }

  async deleteJob(jobId: string) {
    await this.http.delete(
      `/rest/v1/${encodeURIComponent(this.username)}/jobs/${encodeURIComponent(jobId)}`
    );
  }

  async listJobAssets(jobId: string) {
    let response = await this.http.get(
      `/rest/v1/${encodeURIComponent(this.username)}/jobs/${encodeURIComponent(jobId)}/assets`
    );
    return response.data;
  }

  // ============ RDC Jobs ============

  async listRdcJobs(params?: { limit?: number; offset?: number }) {
    let response = await this.http.get('/v1/rdc/jobs', { params });
    return response.data;
  }

  async getRdcJob(jobId: string) {
    let response = await this.http.get(`/v1/rdc/jobs/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  async updateRdcJob(
    jobId: string,
    data: {
      name?: string;
      passed?: boolean;
      build?: string;
      tags?: string[];
    }
  ) {
    let response = await this.http.put(`/v1/rdc/jobs/${encodeURIComponent(jobId)}`, data);
    return response.data;
  }

  async stopRdcJob(jobId: string) {
    let response = await this.http.put(`/v1/rdc/jobs/${encodeURIComponent(jobId)}/stop`);
    return response.data;
  }

  async deleteRdcJob(jobId: string) {
    await this.http.delete(`/v1/rdc/jobs/${encodeURIComponent(jobId)}`);
  }

  // ============ Builds ============

  async listBuilds(
    source: 'vdc' | 'rdc',
    params?: {
      status?: string[];
      start?: number;
      end?: number;
      limit?: number;
      offset?: number;
      name?: string;
      sort?: 'asc' | 'desc';
    }
  ) {
    let response = await this.http.get(`/v2/builds/${source}/`, { params });
    return response.data;
  }

  async getBuild(source: 'vdc' | 'rdc', buildId: string) {
    let response = await this.http.get(`/v2/builds/${source}/${encodeURIComponent(buildId)}/`);
    return response.data;
  }

  async listBuildJobs(
    source: 'vdc' | 'rdc',
    buildId: string,
    params?: {
      limit?: number;
      offset?: number;
      modified_since?: string;
    }
  ) {
    let response = await this.http.get(
      `/v2/builds/${source}/${encodeURIComponent(buildId)}/jobs/`,
      { params }
    );
    return response.data;
  }

  // ============ Real Devices ============

  async listDevices() {
    let response = await this.http.get('/v1/rdc/devices');
    return response.data;
  }

  async getDevice(deviceId: string) {
    let response = await this.http.get(`/v1/rdc/devices/${encodeURIComponent(deviceId)}`);
    return response.data;
  }

  async listDeviceStatus() {
    let response = await this.http.get('/v1/rdc/devices/status');
    return response.data;
  }

  // ============ Tunnels ============

  async listTunnels(params?: { full?: boolean; all?: boolean }) {
    let response = await this.http.get(
      `/rest/v1/${encodeURIComponent(this.username)}/tunnels`,
      { params }
    );
    return response.data;
  }

  async getTunnel(tunnelId: string, username = this.username) {
    let response = await this.http.get(
      `/rest/v1/${encodeURIComponent(username)}/tunnels/${encodeURIComponent(tunnelId)}`
    );
    return response.data;
  }

  async getTunnelJobCount(tunnelId: string, username = this.username) {
    let response = await this.http.get(
      `/rest/v1/${encodeURIComponent(username)}/tunnels/${encodeURIComponent(tunnelId)}/num_jobs`
    );
    return response.data;
  }

  async stopTunnel(tunnelId: string) {
    let response = await this.http.delete(
      `/rest/v1/${encodeURIComponent(this.username)}/tunnels/${encodeURIComponent(tunnelId)}`
    );
    return response.data;
  }

  // ============ Platform ============

  async getPlatformStatus() {
    let response = await this.http.get('/rest/v1/info/status');
    return response.data;
  }

  async getSupportedPlatforms(automationApi: 'all' | 'webdriver' | 'appium' = 'all') {
    let response = await this.http.get(`/rest/v1/info/platforms/${automationApi}`);
    return response.data;
  }

  // ============ Users ============

  async listUsers(params?: {
    username?: string;
    teams?: string;
    roles?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/team-management/v1/users/', { params });
    return response.data;
  }

  async getCurrentUser(allowUsernameFallback = false) {
    let offset = 0;
    while (true) {
      let result = await this.listUsers({ username: this.username, limit: 100, offset });
      let users = result.results ?? result.users ?? [];
      let user = users.find(
        (candidate: { username?: string }) => candidate.username === this.username
      );
      if (user) return this.getUser(user.id);
      if (
        users.length < 100 ||
        (typeof result.count === 'number' && offset + users.length >= result.count)
      ) {
        if (allowUsernameFallback) return { id: this.username, username: this.username };
        throw createApiServiceError(
          'A user profile was not found for the authenticated account. Service accounts may not have an organization user profile.'
        );
      }
      offset += users.length;
    }
  }

  async getUser(userId: string) {
    let response = await this.http.get(
      `/team-management/v1/users/${encodeURIComponent(userId)}/`
    );
    return response.data;
  }

  async createUser(data: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    role?: number;
    team?: string;
  }) {
    let response = await this.http.post('/team-management/v1/users/', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>) {
    let response = await this.http.patch(
      `/team-management/v1/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
  }

  async deactivateUser(userId: string) {
    let response = await this.http.post(
      `/team-management/v1/users/${encodeURIComponent(userId)}/deactivate/`
    );
    return response.data;
  }

  async activateUser(userId: string) {
    let response = await this.http.post(
      `/team-management/v1/users/${encodeURIComponent(userId)}/activate/`
    );
    return response.data;
  }

  async getUserConcurrency(username: string) {
    let response = await this.http.get(
      `/rest/v1.2/users/${encodeURIComponent(username)}/concurrency`
    );
    return response.data;
  }

  // ============ Teams ============

  async listTeams(params?: { name?: string }) {
    let response = await this.http.get('/team-management/v1/teams/', { params });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.http.get(
      `/team-management/v1/teams/${encodeURIComponent(teamId)}/`
    );
    return response.data;
  }

  async listTeamMembers(teamId: string) {
    let response = await this.http.get(
      `/team-management/v1/teams/${encodeURIComponent(teamId)}/members/`
    );
    return response.data;
  }

  // ============ Storage ============

  async listStorageFiles(params?: {
    q?: string;
    name?: string;
    kind?: string[];
    tag?: string[];
    page?: number;
    per_page?: number;
  }) {
    let response = await this.http.get('/v1/storage/files', { params });
    return response.data;
  }

  async getStorageGroups(params?: { page?: number; per_page?: number }) {
    let response = await this.http.get('/v1/storage/groups', { params });
    return response.data;
  }

  async deleteStorageFile(fileId: string) {
    await this.http.delete(`/v1/storage/files/${encodeURIComponent(fileId)}`);
  }

  // ============ Performance ============

  async getPerformanceMetrics(params?: {
    page_url?: string;
    metric_names?: string[];
    start_date?: string;
    end_date?: string;
  }) {
    let response = await this.http.get('/v2/performance/metrics/', { params });
    return response.data;
  }

  async getPerformanceJobMetrics(jobId: string) {
    let response = await this.http.get(
      `/v2/performance/metrics/${encodeURIComponent(jobId)}/`
    );
    return response.data;
  }

  // ============ Insights ============

  async getTestMetrics(params: {
    start: string;
    end: string;
    org_id?: string;
    user_id?: string;
    build?: string;
    status?: string;
  }) {
    let response = await this.http.get('/v1/analytics/insights/test-metrics', { params });
    return response.data;
  }

  async getInsightsTests(
    source: 'vdc' | 'rdc',
    params: {
      start: string;
      end: string;
      scope?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.http.get(`/v2/insights/${source}/tests`, { params });
    return response.data;
  }
}
