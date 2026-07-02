import { createAxios } from 'slates';

export interface ClientConfig {
  baseUrl: string;
  token: string;
  orgId: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private orgId: string;

  constructor(config: ClientConfig) {
    this.orgId = config.orgId;
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Buckets ───

  async listBuckets(params?: {
    name?: string;
    limit?: number;
    offset?: number;
    after?: string;
  }) {
    let response = await this.axios.get('/api/v2/buckets', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getBucket(bucketId: string) {
    let response = await this.axios.get(`/api/v2/buckets/${bucketId}`);
    return response.data;
  }

  async createBucket(data: { name: string; description?: string; retentionSeconds?: number }) {
    let retentionRules = data.retentionSeconds
      ? [{ type: 'expire' as const, everySeconds: data.retentionSeconds }]
      : [];

    let response = await this.axios.post('/api/v2/buckets', {
      orgID: this.orgId,
      name: data.name,
      description: data.description,
      retentionRules
    });
    return response.data;
  }

  async updateBucket(
    bucketId: string,
    data: {
      name?: string;
      description?: string;
      retentionSeconds?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.retentionSeconds !== undefined) {
      body.retentionRules = [{ type: 'expire', everySeconds: data.retentionSeconds }];
    }

    let response = await this.axios.patch(`/api/v2/buckets/${bucketId}`, body);
    return response.data;
  }

  async deleteBucket(bucketId: string) {
    await this.axios.delete(`/api/v2/buckets/${bucketId}`);
  }

  // ─── Write ───

  async writeData(data: {
    bucket: string;
    precision?: 'ns' | 'us' | 'ms' | 's';
    lineProtocol: string;
  }) {
    await this.axios.post('/api/v2/write', data.lineProtocol, {
      params: {
        org: this.orgId,
        bucket: data.bucket,
        precision: data.precision || 'ns'
      },
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  // ─── Query ───

  async queryData(data: { query: string; type?: 'flux' }) {
    let response = await this.axios.post(
      '/api/v2/query',
      {
        query: data.query,
        type: data.type || 'flux',
        dialect: {
          header: true,
          delimiter: ',',
          annotations: ['datatype', 'group', 'default']
        }
      },
      {
        params: {
          orgID: this.orgId
        },
        headers: {
          Accept: 'application/csv',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // ─── Delete ───

  async deleteData(data: { bucket: string; start: string; stop: string; predicate?: string }) {
    await this.axios.post(
      '/api/v2/delete',
      {
        start: data.start,
        stop: data.stop,
        predicate: data.predicate
      },
      {
        params: {
          org: this.orgId,
          bucket: data.bucket
        }
      }
    );
  }

  // ─── Tasks ───

  async listTasks(params?: {
    name?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    let response = await this.axios.get('/api/v2/tasks', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/api/v2/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: {
    name: string;
    description?: string;
    flux: string;
    status?: 'active' | 'inactive';
    every?: string;
    cron?: string;
    offset?: string;
  }) {
    let response = await this.axios.post('/api/v2/tasks', {
      orgID: this.orgId,
      name: data.name,
      description: data.description,
      flux: data.flux,
      status: data.status || 'active',
      every: data.every,
      cron: data.cron,
      offset: data.offset
    });
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      name?: string;
      description?: string;
      flux?: string;
      status?: 'active' | 'inactive';
      every?: string;
      cron?: string;
      offset?: string;
    }
  ) {
    let response = await this.axios.patch(`/api/v2/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/api/v2/tasks/${taskId}`);
  }

  async getTaskRuns(
    taskId: string,
    params?: { limit?: number; afterTime?: string; beforeTime?: string }
  ) {
    let response = await this.axios.get(`/api/v2/tasks/${taskId}/runs`, { params });
    return response.data;
  }

  async runTask(taskId: string, scheduledFor?: string) {
    let response = await this.axios.post(`/api/v2/tasks/${taskId}/runs`, {
      scheduledFor
    });
    return response.data;
  }

  // ─── Organizations ───

  async listOrganizations(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/orgs', { params });
    return response.data;
  }

  async getOrganization(orgId: string) {
    let response = await this.axios.get(`/api/v2/orgs/${orgId}`);
    return response.data;
  }

  async getOrganizationMembers(orgId: string) {
    let response = await this.axios.get(`/api/v2/orgs/${orgId}/members`);
    return response.data;
  }

  // ─── Authorizations ───

  async listAuthorizations(params?: { userID?: string; orgID?: string }) {
    let response = await this.axios.get('/api/v2/authorizations', {
      params: {
        orgID: params?.orgID || this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getAuthorization(authId: string) {
    let response = await this.axios.get(`/api/v2/authorizations/${authId}`);
    return response.data;
  }

  async createAuthorization(data: {
    description?: string;
    permissions: Array<{
      action: 'read' | 'write';
      resource: {
        type: string;
        id?: string;
        orgID?: string;
      };
    }>;
    status?: 'active' | 'inactive';
  }) {
    let response = await this.axios.post('/api/v2/authorizations', {
      orgID: this.orgId,
      description: data.description,
      permissions: data.permissions,
      status: data.status || 'active'
    });
    return response.data;
  }

  async updateAuthorization(
    authId: string,
    data: {
      description?: string;
      status?: 'active' | 'inactive';
    }
  ) {
    let response = await this.axios.patch(`/api/v2/authorizations/${authId}`, data);
    return response.data;
  }

  async deleteAuthorization(authId: string) {
    await this.axios.delete(`/api/v2/authorizations/${authId}`);
  }

  // ─── Labels ───

  async listLabels() {
    let response = await this.axios.get('/api/v2/labels', {
      params: { orgID: this.orgId }
    });
    return response.data;
  }

  async createLabel(data: { name: string; color?: string; description?: string }) {
    let response = await this.axios.post('/api/v2/labels', {
      orgID: this.orgId,
      name: data.name,
      properties: {
        color: data.color,
        description: data.description
      }
    });
    return response.data;
  }

  async updateLabel(
    labelId: string,
    data: {
      name?: string;
      color?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.patch(`/api/v2/labels/${labelId}`, {
      name: data.name,
      properties: {
        color: data.color,
        description: data.description
      }
    });
    return response.data;
  }

  async deleteLabel(labelId: string) {
    await this.axios.delete(`/api/v2/labels/${labelId}`);
  }

  // ─── Checks ───

  async listChecks(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/checks', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getCheck(checkId: string) {
    let response = await this.axios.get(`/api/v2/checks/${checkId}`);
    return response.data;
  }

  async deleteCheck(checkId: string) {
    await this.axios.delete(`/api/v2/checks/${checkId}`);
  }

  // ─── Notification Endpoints ───

  async listNotificationEndpoints(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/notificationEndpoints', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getNotificationEndpoint(endpointId: string) {
    let response = await this.axios.get(`/api/v2/notificationEndpoints/${endpointId}`);
    return response.data;
  }

  async deleteNotificationEndpoint(endpointId: string) {
    await this.axios.delete(`/api/v2/notificationEndpoints/${endpointId}`);
  }

  // ─── Notification Rules ───

  async listNotificationRules(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/notificationRules', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getNotificationRule(ruleId: string) {
    let response = await this.axios.get(`/api/v2/notificationRules/${ruleId}`);
    return response.data;
  }

  async deleteNotificationRule(ruleId: string) {
    await this.axios.delete(`/api/v2/notificationRules/${ruleId}`);
  }

  // ─── Dashboards ───

  async listDashboards(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/dashboards', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return response.data;
  }

  async getDashboard(dashboardId: string) {
    let response = await this.axios.get(`/api/v2/dashboards/${dashboardId}`);
    return response.data;
  }

  async createDashboard(data: { name: string; description?: string }) {
    let response = await this.axios.post('/api/v2/dashboards', {
      orgID: this.orgId,
      name: data.name,
      description: data.description
    });
    return response.data;
  }

  async updateDashboard(
    dashboardId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.patch(`/api/v2/dashboards/${dashboardId}`, data);
    return response.data;
  }

  async deleteDashboard(dashboardId: string) {
    await this.axios.delete(`/api/v2/dashboards/${dashboardId}`);
  }

  // ─── Secrets ───

  async listSecretKeys() {
    let response = await this.axios.get(`/api/v2/orgs/${this.orgId}/secrets`);
    return response.data;
  }

  async putSecrets(secrets: Record<string, string>) {
    await this.axios.patch(`/api/v2/orgs/${this.orgId}/secrets`, secrets);
  }

  async deleteSecrets(keys: string[]) {
    await this.axios.post(`/api/v2/orgs/${this.orgId}/secrets/delete`, {
      secrets: keys
    });
  }

  // ─── Telegraf Configurations ───

  async listTelegrafs() {
    let response = await this.axios.get('/api/v2/telegrafs', {
      params: { orgID: this.orgId }
    });
    return response.data;
  }

  async getTelegraf(telegrafId: string) {
    let response = await this.axios.get(`/api/v2/telegrafs/${telegrafId}`);
    return response.data;
  }

  async createTelegraf(data: { name: string; description?: string; config: string }) {
    let response = await this.axios.post('/api/v2/telegrafs', {
      orgID: this.orgId,
      name: data.name,
      description: data.description,
      config: data.config
    });
    return response.data;
  }

  async updateTelegraf(
    telegrafId: string,
    data: {
      name?: string;
      description?: string;
      config?: string;
    }
  ) {
    let response = await this.axios.put(`/api/v2/telegrafs/${telegrafId}`, {
      orgID: this.orgId,
      ...data
    });
    return response.data;
  }

  async deleteTelegraf(telegrafId: string) {
    await this.axios.delete(`/api/v2/telegrafs/${telegrafId}`);
  }

  // ─── DBRP Mappings ───

  async listDBRPs() {
    let response = await this.axios.get('/api/v2/dbrps', {
      params: { orgID: this.orgId }
    });
    return response.data;
  }

  async createDBRP(data: {
    bucketId: string;
    database: string;
    retentionPolicy: string;
    isDefault?: boolean;
  }) {
    let response = await this.axios.post('/api/v2/dbrps', {
      orgID: this.orgId,
      bucketID: data.bucketId,
      database: data.database,
      retention_policy: data.retentionPolicy,
      default: data.isDefault ?? false
    });
    return response.data;
  }

  async deleteDBRP(dbrpId: string) {
    await this.axios.delete(`/api/v2/dbrps/${dbrpId}`, {
      params: { orgID: this.orgId }
    });
  }

  // ─── Users ───

  async listUsers() {
    let response = await this.axios.get('/api/v2/users');
    return response.data;
  }

  async getMe() {
    let response = await this.axios.get('/api/v2/me');
    return response.data;
  }
}
