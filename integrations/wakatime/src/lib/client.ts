import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.wakatime.com/api/v1'
});

export class WakaTimeClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    // Try to detect if token looks like an API key (no dots/dashes typical of OAuth tokens)
    // WakaTime API keys are UUIDs; OAuth tokens are longer strings
    // For API key auth, use Basic auth; for OAuth, use Bearer
    let isApiKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      config.token
    );

    if (isApiKey) {
      let encoded = Buffer.from(config.token).toString('base64');
      this.headers = { Authorization: `Basic ${encoded}` };
    } else {
      this.headers = { Authorization: `Bearer ${config.token}` };
    }
  }

  // ─── User ───────────────────────────────────────────────

  async getCurrentUser() {
    let response = await api.get('/users/current', { headers: this.headers });
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
    let response = await api.get('/users/current/summaries', {
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
    let response = await api.get(`/users/current/stats/${range}`, {
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
    let response = await api.get('/users/current/durations', {
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
    let response = await api.get('/users/current/heartbeats', {
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
    let response = await api.post(
      '/users/current/heartbeats',
      {
        entity: heartbeat.entity,
        type: heartbeat.type,
        time: heartbeat.time,
        project: heartbeat.project,
        branch: heartbeat.branch,
        language: heartbeat.language,
        dependencies: heartbeat.dependencies,
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
      dependencies: h.dependencies,
      lines: h.lines,
      lineno: h.lineNo,
      cursorpos: h.cursorPos,
      is_write: h.isWrite,
      category: h.category
    }));

    let response = await api.post('/users/current/heartbeats.bulk', mapped, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteHeartbeat(heartbeatId: string) {
    let response = await api.delete(`/users/current/heartbeats/${heartbeatId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Projects ───────────────────────────────────────────

  async getProjects(params?: { query?: string }) {
    let response = await api.get('/users/current/projects', {
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
    let response = await api.get(`/users/current/projects/${projectId}/commits`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Goals ──────────────────────────────────────────────

  async getGoals() {
    let response = await api.get('/users/current/goals', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── External Durations ─────────────────────────────────

  async getExternalDurations(params: { date: string; project?: string; timezone?: string }) {
    let response = await api.get('/users/current/external_durations', {
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
  }) {
    let response = await api.post(
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
        category: duration.category
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
      category: d.category
    }));

    let response = await api.post('/users/current/external_durations.bulk', mapped, {
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
    let response = await api.get('/leaders', {
      headers: this.headers,
      params: {
        language: params?.language,
        country_code: params?.country,
        page: params?.page,
        hireable: params?.hireable
      }
    });
    return response.data;
  }

  async getPrivateLeaderboards() {
    let response = await api.get('/users/current/leaderboards', {
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
    let response = await api.get(`/users/current/leaderboards/${leaderboardId}`, {
      headers: this.headers,
      params
    });
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
    let response = await api.get(`/users/current/insights/${insightType}/${range}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Organizations ─────────────────────────────────────

  async getOrganizations() {
    let response = await api.get('/users/current/orgs', {
      headers: this.headers
    });
    return response.data.data;
  }

  async getOrganizationDashboards(orgId: string) {
    let response = await api.get(`/users/current/orgs/${orgId}/dashboards`, {
      headers: this.headers
    });
    return response.data.data;
  }

  async getOrganizationDashboardMembers(orgId: string, dashboardId: string) {
    let response = await api.get(
      `/users/current/orgs/${orgId}/dashboards/${dashboardId}/members`,
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
    let response = await api.get(
      `/users/current/orgs/${orgId}/dashboards/${dashboardId}/summaries`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  // ─── Machines ───────────────────────────────────────────

  async getMachines() {
    let response = await api.get('/users/current/machine_names', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Data Exports ──────────────────────────────────────

  async getDataExports() {
    let response = await api.get('/users/current/data_dumps', {
      headers: this.headers
    });
    return response.data.data;
  }

  async requestDataExport(exportType?: string) {
    let response = await api.post(
      '/users/current/data_dumps',
      {
        type: exportType || 'daily'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── All Time Since Today ──────────────────────────────

  async getAllTimeSinceToday(project?: string) {
    let response = await api.get('/users/current/all_time_since_today', {
      headers: this.headers,
      params: project ? { project } : undefined
    });
    return response.data.data;
  }
}
