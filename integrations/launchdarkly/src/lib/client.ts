import { createAxios } from 'slates';

export class LaunchDarklyClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://app.launchdarkly.com/api/v2',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Feature Flags ──────────────────────────────────────────────

  async listFeatureFlags(
    projectKey: string,
    params: {
      env?: string;
      tag?: string;
      limit?: number;
      offset?: number;
      filter?: string;
      sort?: string;
      summary?: boolean;
    } = {}
  ) {
    let response = await this.http.get(`/flags/${projectKey}`, { params });
    return response.data;
  }

  async getFeatureFlag(
    projectKey: string,
    flagKey: string,
    params: {
      env?: string;
    } = {}
  ) {
    let response = await this.http.get(`/flags/${projectKey}/${flagKey}`, { params });
    return response.data;
  }

  async createFeatureFlag(
    projectKey: string,
    data: {
      key: string;
      name: string;
      description?: string;
      tags?: string[];
      variations?: Array<{ value: any; name?: string; description?: string }>;
      temporary?: boolean;
      clientSideAvailability?: {
        usingMobileKey?: boolean;
        usingEnvironmentId?: boolean;
      };
      defaults?: {
        onVariation: number;
        offVariation: number;
      };
    }
  ) {
    let response = await this.http.post(`/flags/${projectKey}`, data);
    return response.data;
  }

  async updateFeatureFlag(
    projectKey: string,
    flagKey: string,
    instructions: Record<string, any>[]
  ) {
    let response = await this.http.patch(
      `/flags/${projectKey}/${flagKey}`,
      {
        instructions
      },
      {
        headers: {
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch'
        }
      }
    );
    return response.data;
  }

  async deleteFeatureFlag(projectKey: string, flagKey: string) {
    await this.http.delete(`/flags/${projectKey}/${flagKey}`);
  }

  // ─── Projects ───────────────────────────────────────────────────

  async listProjects(
    params: { limit?: number; offset?: number; filter?: string; sort?: string } = {}
  ) {
    let response = await this.http.get('/projects', { params });
    return response.data;
  }

  async getProject(projectKey: string) {
    let response = await this.http.get(`/projects/${projectKey}`);
    return response.data;
  }

  async createProject(data: {
    key: string;
    name: string;
    tags?: string[];
    environments?: Array<{
      key: string;
      name: string;
      color: string;
    }>;
  }) {
    let response = await this.http.post('/projects', data);
    return response.data;
  }

  async updateProject(
    projectKey: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.http.patch(`/projects/${projectKey}`, patches, {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    });
    return response.data;
  }

  async deleteProject(projectKey: string) {
    await this.http.delete(`/projects/${projectKey}`);
  }

  // ─── Environments ──────────────────────────────────────────────

  async listEnvironments(
    projectKey: string,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let response = await this.http.get(`/projects/${projectKey}/environments`, { params });
    return response.data;
  }

  async getEnvironment(projectKey: string, environmentKey: string) {
    let response = await this.http.get(
      `/projects/${projectKey}/environments/${environmentKey}`
    );
    return response.data;
  }

  async createEnvironment(
    projectKey: string,
    data: {
      key: string;
      name: string;
      color: string;
      tags?: string[];
      defaultTtl?: number;
      secureMode?: boolean;
      defaultTrackEvents?: boolean;
      requireComments?: boolean;
      confirmChanges?: boolean;
    }
  ) {
    let response = await this.http.post(`/projects/${projectKey}/environments`, data);
    return response.data;
  }

  async updateEnvironment(
    projectKey: string,
    environmentKey: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.http.patch(
      `/projects/${projectKey}/environments/${environmentKey}`,
      patches,
      {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      }
    );
    return response.data;
  }

  async deleteEnvironment(projectKey: string, environmentKey: string) {
    await this.http.delete(`/projects/${projectKey}/environments/${environmentKey}`);
  }

  // ─── Segments ──────────────────────────────────────────────────

  async listSegments(
    projectKey: string,
    environmentKey: string,
    params: {
      limit?: number;
      offset?: number;
      filter?: string;
      sort?: string;
    } = {}
  ) {
    let response = await this.http.get(`/segments/${projectKey}/${environmentKey}`, {
      params
    });
    return response.data;
  }

  async getSegment(projectKey: string, environmentKey: string, segmentKey: string) {
    let response = await this.http.get(
      `/segments/${projectKey}/${environmentKey}/${segmentKey}`
    );
    return response.data;
  }

  async createSegment(
    projectKey: string,
    environmentKey: string,
    data: {
      key: string;
      name: string;
      description?: string;
      tags?: string[];
      unbounded?: boolean;
      unboundedContextKind?: string;
    }
  ) {
    let response = await this.http.post(`/segments/${projectKey}/${environmentKey}`, data);
    return response.data;
  }

  async updateSegment(
    projectKey: string,
    environmentKey: string,
    segmentKey: string,
    instructions: Record<string, any>[]
  ) {
    let response = await this.http.patch(
      `/segments/${projectKey}/${environmentKey}/${segmentKey}`,
      {
        instructions
      },
      {
        headers: {
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch'
        }
      }
    );
    return response.data;
  }

  async deleteSegment(projectKey: string, environmentKey: string, segmentKey: string) {
    await this.http.delete(`/segments/${projectKey}/${environmentKey}/${segmentKey}`);
  }

  // ─── Audit Log ─────────────────────────────────────────────────

  async getAuditLogEntries(
    params: { before?: number; after?: number; q?: string; limit?: number; spec?: string } = {}
  ) {
    let response = await this.http.get('/auditlog', { params });
    return response.data;
  }

  async getAuditLogEntry(auditLogEntryId: string) {
    let response = await this.http.get(`/auditlog/${auditLogEntryId}`);
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    name?: string;
    sign: boolean;
    on: boolean;
    secret?: string;
    tags?: string[];
    statements?: Array<{
      effect: string;
      resources?: string[];
      notResources?: string[];
      actions?: string[];
      notActions?: string[];
    }>;
  }) {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.http.patch(`/webhooks/${webhookId}`, patches, {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  // ─── Account Members ──────────────────────────────────────────

  async listMembers(
    params: { limit?: number; offset?: number; filter?: string; sort?: string } = {}
  ) {
    let response = await this.http.get('/members', { params });
    return response.data;
  }

  async getMember(memberId: string) {
    let response = await this.http.get(`/members/${memberId}`);
    return response.data;
  }

  async inviteMembers(
    members: Array<{
      email: string;
      role?: string;
      customRoles?: string[];
    }>
  ) {
    let response = await this.http.post('/members', members);
    return response.data;
  }

  // ─── Metrics ───────────────────────────────────────────────────

  async listMetrics(
    projectKey: string,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let response = await this.http.get(`/metrics/${projectKey}`, { params });
    return response.data;
  }

  async getMetric(projectKey: string, metricKey: string) {
    let response = await this.http.get(`/metrics/${projectKey}/${metricKey}`);
    return response.data;
  }

  async createMetric(
    projectKey: string,
    data: {
      key: string;
      name?: string;
      description?: string;
      kind: string;
      selector?: string;
      urls?: Array<{ kind: string; url?: string; substring?: string; pattern?: string }>;
      eventKey?: string;
      tags?: string[];
      isActive?: boolean;
      isNumeric?: boolean;
      unit?: string;
      successCriteria?: string;
    }
  ) {
    let response = await this.http.post(`/metrics/${projectKey}`, data);
    return response.data;
  }

  async deleteMetric(projectKey: string, metricKey: string) {
    await this.http.delete(`/metrics/${projectKey}/${metricKey}`);
  }

  // ─── Experiments ───────────────────────────────────────────────

  async listExperiments(
    projectKey: string,
    environmentKey: string,
    params: {
      limit?: number;
      offset?: number;
      filter?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/projects/${projectKey}/environments/${environmentKey}/experiments`,
      { params }
    );
    return response.data;
  }

  async getExperiment(projectKey: string, environmentKey: string, experimentKey: string) {
    let response = await this.http.get(
      `/projects/${projectKey}/environments/${environmentKey}/experiments/${experimentKey}`
    );
    return response.data;
  }

  async createExperiment(
    projectKey: string,
    environmentKey: string,
    data: {
      name: string;
      key: string;
      description?: string;
      maintainerId?: string;
      iteration: {
        hypothesis: string;
        canReshuffleTraffic: boolean;
        metrics: Array<{
          key: string;
          isGroup?: boolean;
        }>;
        primarySingleMetricKey?: string;
        primaryFunnelKey?: string;
        treatments: Array<{
          name: string;
          baseline: boolean;
          allocationPercent: string;
          parameters: Array<{
            flagKey: string;
            variationId: string;
          }>;
        }>;
        flags: Record<
          string,
          {
            ruleId: string;
            flagConfigVersion: number;
          }
        >;
        randomizationUnit?: string;
      };
    }
  ) {
    let response = await this.http.post(
      `/projects/${projectKey}/environments/${environmentKey}/experiments`,
      data
    );
    return response.data;
  }

  // ─── Contexts ──────────────────────────────────────────────────

  async searchContexts(
    projectKey: string,
    environmentKey: string,
    data: {
      filter?: string;
      sort?: string;
      limit?: number;
      continuationToken?: string;
    }
  ) {
    let response = await this.http.post(
      `/projects/${projectKey}/environments/${environmentKey}/contexts/search`,
      data
    );
    return response.data;
  }

  async getContextInstances(
    projectKey: string,
    environmentKey: string,
    contextId: string,
    params: {
      limit?: number;
      continuationToken?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/projects/${projectKey}/environments/${environmentKey}/contexts/${contextId}`,
      { params }
    );
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────────

  async listTeams(params: { limit?: number; offset?: number; filter?: string } = {}) {
    let response = await this.http.get('/teams', { params });
    return response.data;
  }

  async getTeam(teamKey: string) {
    let response = await this.http.get(`/teams/${teamKey}`);
    return response.data;
  }

  // ─── Caller Identity ──────────────────────────────────────────

  async getCaller() {
    let response = await this.http.get('/caller');
    return response.data;
  }
}
