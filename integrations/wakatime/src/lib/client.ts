import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export type DataExport = {
  id: string;
  type?: string | null;
  status?: string | null;
  percent_complete?: number | null;
  download_url?: string | null;
  created_at?: string | null;
  expires?: string | null;
  is_processing?: boolean;
  is_stuck?: boolean;
  has_failed?: boolean;
};

export type ExternalDuration = {
  id: string;
  external_id: string;
  entity: string;
  type: string;
  provider: string;
  start_time: number;
  end_time: number;
  project?: string | null;
  branch?: string | null;
  language?: string | null;
  category?: string | null;
  meta?: string | null;
};

export class WakaTimeClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private headers: Record<string, string>;
  private isApiKey: boolean;

  constructor(config: { token: string; authType?: 'oauth' | 'api_key' }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A WakaTime credential is required. Reconnect your account.'
      );
    }

    // Connections saved before authType was added retain the previous UUID detection.
    this.isApiKey = config.authType
      ? config.authType === 'api_key'
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.token);
    this.headers = {
      Authorization: this.isApiKey
        ? `Basic ${Buffer.from(config.token).toString('base64')}`
        : `Bearer ${config.token}`
    };
    this.api = createAuthenticatedAxios({
      baseURL: 'https://wakatime.com/api/v1',
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'WakaTime',
          reason: 'wakatime_request_failed'
        })
    });
    this.api.interceptors.request.use(request => {
      if (
        this.isApiKey &&
        request.url !== '/leaders' &&
        !(
          request.method === 'post' &&
          ['/users/current/heartbeats', '/users/current/heartbeats.bulk'].includes(
            request.url ?? ''
          )
        )
      ) {
        throw createApiServiceError(
          'WakaTime API keys can only send heartbeats. Connect with OAuth to use this tool.'
        );
      }
      return request;
    });
  }

  // ─── User ───────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.api.get('/users/current', { headers: this.headers });
    return response.data.data;
  }

  // ─── Summaries ──────────────────────────────────────────

  async getSummaries(params: {
    start: string;
    end: string;
    project?: string;
    branches?: string;
    timezone?: string;
  }) {
    let response = await this.api.get('/users/current/summaries', {
      headers: this.headers,
      params: {
        start: params.start,
        end: params.end,
        project: params.project,
        branches: params.branches,
        timezone: params.timezone
      }
    });
    return response.data;
  }

  // ─── Stats ──────────────────────────────────────────────

  async getStats(
    range: string,
    params?: {
      project?: string;
      timezone?: string;
    }
  ) {
    let response = await this.api.get(`/users/current/stats/${encodeURIComponent(range)}`, {
      headers: this.headers,
      params
    });
    return response.data.data;
  }

  // ─── Durations ──────────────────────────────────────────

  async getDurations(params: {
    date: string;
    project?: string;
    branches?: string;
    timezone?: string;
    sliceBy?: string;
  }) {
    let response = await this.api.get('/users/current/durations', {
      headers: this.headers,
      params: {
        date: params.date,
        project: params.project,
        branches: params.branches,
        timezone: params.timezone,
        slice_by: params.sliceBy
      }
    });
    return response.data;
  }

  // ─── Heartbeats ─────────────────────────────────────────

  async getHeartbeats(date: string) {
    let response = await this.api.get('/users/current/heartbeats', {
      headers: this.headers,
      params: { date }
    });
    return response.data;
  }

  async createHeartbeat(heartbeat: {
    entity: string;
    type: string;
    time: number;
    project?: string;
    branch?: string;
    language?: string;
    dependencies?: string[];
    lines?: number;
    lineNo?: number;
    cursorPos?: number;
    isWrite?: boolean;
    category?: string;
  }) {
    let response = await this.api.post(
      '/users/current/heartbeats',
      {
        entity: heartbeat.entity,
        type: heartbeat.type,
        time: heartbeat.time,
        project: heartbeat.project,
        branch: heartbeat.branch,
        language: heartbeat.language,
        dependencies: heartbeat.dependencies?.join(','),
        lines: heartbeat.lines,
        lineno: heartbeat.lineNo,
        cursorpos: heartbeat.cursorPos,
        is_write: heartbeat.isWrite,
        category: heartbeat.category
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async createHeartbeatsBulk(
    heartbeats: Array<{
      entity: string;
      type: string;
      time: number;
      project?: string;
      branch?: string;
      language?: string;
      dependencies?: string[];
      lines?: number;
      lineNo?: number;
      cursorPos?: number;
      isWrite?: boolean;
      category?: string;
    }>
  ) {
    let mapped = heartbeats.map(h => ({
      entity: h.entity,
      type: h.type,
      time: h.time,
      project: h.project,
      branch: h.branch,
      language: h.language,
      dependencies: h.dependencies?.join(','),
      lines: h.lines,
      lineno: h.lineNo,
      cursorpos: h.cursorPos,
      is_write: h.isWrite,
      category: h.category
    }));

    let response = await this.api.post('/users/current/heartbeats.bulk', mapped, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteHeartbeat(heartbeatId: string, date?: string) {
    if (date) {
      let response = await this.api.delete('/users/current/heartbeats.bulk', {
        headers: this.headers,
        data: { date, ids: [heartbeatId] }
      });
      return response.data;
    }
    let response = await this.api.delete(
      `/users/current/heartbeats/${encodeURIComponent(heartbeatId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Projects ───────────────────────────────────────────

  async getProjects(params?: { query?: string }) {
    let response = await this.api.get('/users/current/projects', {
      headers: this.headers,
      params: params?.query ? { q: params.query } : undefined
    });
    return response.data.data;
  }

  async getCommits(
    projectId: string,
    params?: {
      author?: string;
      branch?: string;
      page?: number;
    }
  ) {
    let response = await this.api.get(
      `/users/current/projects/${encodeURIComponent(projectId)}/commits`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getCommit(projectId: string, commitHash: string, branch?: string) {
    let response = await this.api.get(
      `/users/current/projects/${encodeURIComponent(projectId)}/commits/${encodeURIComponent(commitHash)}`,
      { headers: this.headers, params: { branch } }
    );
    return response.data;
  }

  // ─── Goals ──────────────────────────────────────────────

  async getGoals() {
    let response = await this.api.get('/users/current/goals', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── External Durations ─────────────────────────────────

  async getExternalDurations(params: {
    date: string;
    project?: string;
    branches?: string;
    timezone?: string;
  }) {
    let response = await this.api.get<{
      data: ExternalDuration[];
      start?: string;
      end?: string;
      timezone?: string;
    }>('/users/current/external_durations', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createExternalDuration(duration: {
    externalId: string;
    entity: string;
    type: string;
    startTime: number;
    endTime: number;
    project?: string;
    branch?: string;
    language?: string;
    category?: string;
    meta?: string;
  }) {
    let response = await this.api.post(
      '/users/current/external_durations',
      {
        external_id: duration.externalId,
        entity: duration.entity,
        type: duration.type,
        start_time: duration.startTime,
        end_time: duration.endTime,
        project: duration.project,
        branch: duration.branch,
        language: duration.language,
        category: duration.category,
        meta: duration.meta
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async createExternalDurationsBulk(
    durations: Array<{
      externalId: string;
      entity: string;
      type: string;
      startTime: number;
      endTime: number;
      project?: string;
      branch?: string;
      language?: string;
      category?: string;
      meta?: string;
    }>
  ) {
    let mapped = durations.map(d => ({
      external_id: d.externalId,
      entity: d.entity,
      type: d.type,
      start_time: d.startTime,
      end_time: d.endTime,
      project: d.project,
      branch: d.branch,
      language: d.language,
      category: d.category,
      meta: d.meta
    }));

    let response = await this.api.post('/users/current/external_durations.bulk', mapped, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Leaderboards ──────────────────────────────────────

  async getPublicLeaderboard(params?: {
    language?: string;
    country?: string;
    page?: number;
    hireable?: boolean;
  }) {
    let response = await this.api.get('/leaders', {
      headers: this.isApiKey ? {} : this.headers,
      params: {
        language: params?.language,
        country_code: params?.country,
        page: params?.page,
        is_hireable: params?.hireable
      }
    });
    return response.data;
  }

  async getPrivateLeaderboards() {
    let response = await this.api.get('/users/current/leaderboards', {
      headers: this.headers
    });
    return response.data.data;
  }

  async getPrivateLeaderboard(
    leaderboardId: string,
    params?: {
      language?: string;
      page?: number;
    }
  ) {
    let response = await this.api.get(
      `/users/current/leaderboards/${encodeURIComponent(leaderboardId)}`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  // ─── Insights ───────────────────────────────────────────

  async getInsights(
    insightType: string,
    range: string,
    params?: {
      timezone?: string;
      weekday?: number;
    }
  ) {
    let response = await this.api.get(
      `/users/current/insights/${encodeURIComponent(insightType === 'weekday' ? 'weekdays' : insightType)}/${encodeURIComponent(range)}`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  // ─── Organizations ─────────────────────────────────────

  async getOrganizations() {
    let response = await this.api.get('/users/current/orgs', {
      headers: this.headers
    });
    return response.data.data;
  }

  async getOrganizationDashboards(orgId: string) {
    let response = await this.api.get(
      `/users/current/orgs/${encodeURIComponent(orgId)}/dashboards`,
      {
        headers: this.headers
      }
    );
    return response.data.data;
  }

  async getOrganizationDashboardMembers(orgId: string, dashboardId: string) {
    let response = await this.api.get(
      `/users/current/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/members`,
      {
        headers: this.headers
      }
    );
    return response.data.data;
  }

  async getOrganizationDashboardSummaries(
    orgId: string,
    dashboardId: string,
    params: {
      start: string;
      end: string;
      project?: string;
    }
  ) {
    let response = await this.api.get(
      `/users/current/orgs/${encodeURIComponent(orgId)}/dashboards/${encodeURIComponent(dashboardId)}/summaries`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  // ─── Machines ───────────────────────────────────────────

  async getMachines() {
    let response = await this.api.get('/users/current/machine_names', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Data Exports ──────────────────────────────────────

  async getDataExports() {
    let response = await this.api.get<{ data: DataExport[] }>('/users/current/data_dumps', {
      headers: this.headers
    });
    return response.data.data;
  }

  async requestDataExport(exportType?: string, emailWhenFinished?: boolean) {
    let response = await this.api.post<{ data: DataExport }>(
      '/users/current/data_dumps',
      {
        type: exportType || 'daily',
        email_when_finished: emailWhenFinished
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── All Time Since Today ──────────────────────────────

  async getAllTimeSinceToday(project?: string) {
    let response = await this.api.get('/users/current/all_time_since_today', {
      headers: this.headers,
      params: project ? { project } : undefined
    });
    return response.data.data;
  }
}
