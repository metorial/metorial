import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export const influxError = (message: string) =>
  createApiServiceError(message, {
    reason: 'invalid_influxdb_response'
  });

export function requireRecord(value: unknown): Record<string, any> {
  if (!isApiErrorRecord(value))
    throw influxError('InfluxDB returned an invalid response object.');
  return value;
}

export function requireArray(value: unknown, key: string): any[] {
  const record = requireRecord(value);
  if (!Array.isArray(record[key]))
    throw influxError(`InfluxDB returned no valid ${key} collection.`);
  return record[key];
}

export function resource(value: unknown, required: string[]): Record<string, any> {
  const record = requireRecord(value);
  for (const key of required) {
    if (typeof record[key] !== 'string')
      throw influxError(`InfluxDB returned no valid ${key} value.`);
  }
  return record;
}

export function requireNoContent(response: { status: number }) {
  if (response.status !== 204)
    throw influxError(
      'InfluxDB did not return the documented mutation acknowledgement (HTTP 204).'
    );
}

// Inspect complete CSV records so quoted multiline data cannot look like an error table.
export function hasQueryError(csv: string): boolean {
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index <= csv.length; index++) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (
      !quoted &&
      (character === ',' || character === '\n' || character === undefined)
    ) {
      cells.push(cell.replace(/\r$/, ''));
      cell = '';
      if (character !== ',') {
        if (
          cells.length === 3 &&
          cells[0] === '' &&
          cells[1] === 'error' &&
          cells[2] === 'reference'
        )
          return true;
        cells = [];
      }
    } else if (character !== undefined) cell += character;
  }
  if (quoted) throw influxError('InfluxDB returned incomplete CSV query data.');
  return false;
}

export const optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

export const requiredOrg = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError('Provide orgId from list_organizations for this operation.', {
      reason: 'missing_organization'
    });
  }
  return value;
};

export interface ClientConfig {
  baseUrl: string;
  token: string;
  orgId?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private orgId?: string;

  constructor(config: ClientConfig) {
    this.orgId = config.orgId;
    if (!config.token.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError('Provide a nonempty InfluxDB API token.', {
        reason: 'invalid_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      timeout: 120000,
      authHeader: { value: `Token ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'InfluxDB Cloud',
          reason: 'influxdb_api_error',
          extractResponse: (input, helpers) => {
            const response = helpers.getResponseWithBody(input);
            if (typeof response?.data === 'string') {
              try {
                return { ...response, data: JSON.parse(response.data) };
              } catch {
                return response;
              }
            }
            return response;
          },
          detailKeys: ['message', 'code', 'err', 'op'],
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        })
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
    return requireRecord(response.data);
  }

  async getBucket(bucketId: string) {
    let response = await this.axios.get(`/api/v2/buckets/${encodeURIComponent(bucketId)}`);
    return requireRecord(response.data);
  }

  async createBucket(data: { name: string; description?: string; retentionSeconds?: number }) {
    if (
      data.retentionSeconds !== undefined &&
      (!Number.isSafeInteger(data.retentionSeconds) || data.retentionSeconds < 0)
    ) {
      throw createApiServiceError(
        'retentionSeconds must be a nonnegative integer number of seconds.',
        {
          reason: 'invalid_retention'
        }
      );
    }
    let retentionRules = [
      { type: 'expire' as const, everySeconds: data.retentionSeconds ?? 2592000 }
    ];

    let response = await this.axios.post('/api/v2/buckets', {
      orgID: requiredOrg(this.orgId),
      name: data.name,
      description: data.description,
      retentionRules
    });
    return requireRecord(response.data);
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
      if (!Number.isSafeInteger(data.retentionSeconds) || data.retentionSeconds < 0) {
        throw createApiServiceError(
          'retentionSeconds must be a nonnegative integer number of seconds.',
          {
            reason: 'invalid_retention'
          }
        );
      }
      body.retentionRules = [{ type: 'expire', everySeconds: data.retentionSeconds }];
    }

    let response = await this.axios.patch(
      `/api/v2/buckets/${encodeURIComponent(bucketId)}`,
      body
    );
    return requireRecord(response.data);
  }

  async deleteBucket(bucketId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/buckets/${encodeURIComponent(bucketId)}`)
    );
  }

  // ─── Write ───

  async writeData(data: {
    bucket: string;
    precision?: 'ns' | 'us' | 'ms' | 's';
    lineProtocol: string;
  }) {
    requireNoContent(
      await this.axios.post('/api/v2/write', data.lineProtocol, {
        params: {
          org: this.orgId,
          bucket: data.bucket,
          precision: data.precision || 'ns'
        },
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    );
  }

  // ─── Query ───

  async queryData(data: {
    query: string;
    type?: 'flux';
    params?: Record<string, string | number | boolean>;
    now?: string;
  }) {
    let response = await this.axios.post(
      '/api/v2/query',
      {
        query: data.query,
        type: data.type || 'flux',
        params: data.params,
        now: data.now,
        dialect: {
          header: true,
          delimiter: ',',
          annotations: ['datatype', 'group', 'default']
        }
      },
      {
        responseType: 'text',
        transformResponse: [data => data],
        params: {
          orgID: this.orgId
        },
        headers: {
          Accept: 'application/csv',
          'Content-Type': 'application/json'
        }
      }
    );
    if (typeof response.data !== 'string')
      throw influxError('InfluxDB returned non-CSV query data.');
    if (hasQueryError(response.data)) {
      throw influxError(`InfluxDB reported a query error: ${response.data.slice(0, 2000)}`);
    }
    const contentType = String(response.headers['content-type'] ?? '')
      .toLowerCase()
      .split(';')[0]
      ?.trim();
    if (contentType !== 'application/csv' && contentType !== 'text/csv') {
      throw influxError(
        'InfluxDB returned an unexpected content type instead of CSV query results.'
      );
    }
    return response.data;
  }

  // ─── Delete ───

  async deleteData(data: { bucket: string; start: string; stop: string; predicate?: string }) {
    requireNoContent(
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
      )
    );
  }

  // ─── Tasks ───

  async listTasks(params?: {
    name?: string;
    after?: string;
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
    return requireRecord(response.data);
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/api/v2/tasks/${encodeURIComponent(taskId)}`);
    return requireRecord(response.data);
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
    if (data.every !== undefined && data.cron !== undefined) {
      throw createApiServiceError('Provide either every or cron, not both.', {
        reason: 'invalid_task_schedule'
      });
    }
    let response = await this.axios.post('/api/v2/tasks', {
      orgID: requiredOrg(this.orgId),
      name: data.name,
      description: data.description,
      flux: data.flux,
      status: data.status || 'active',
      every: data.every,
      cron: data.cron,
      offset: data.offset
    });
    return requireRecord(response.data);
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
    if (data.every !== undefined && data.cron !== undefined) {
      throw createApiServiceError('Provide either every or cron, not both.', {
        reason: 'invalid_task_schedule'
      });
    }
    let response = await this.axios.patch(`/api/v2/tasks/${encodeURIComponent(taskId)}`, data);
    return requireRecord(response.data);
  }

  async deleteTask(taskId: string) {
    requireNoContent(await this.axios.delete(`/api/v2/tasks/${encodeURIComponent(taskId)}`));
  }

  async getTaskRuns(
    taskId: string,
    params?: { limit?: number; afterTime?: string; beforeTime?: string }
  ) {
    let response = await this.axios.get(`/api/v2/tasks/${encodeURIComponent(taskId)}/runs`, {
      params
    });
    return requireRecord(response.data);
  }

  async runTask(taskId: string, scheduledFor?: string) {
    let response = await this.axios.post(`/api/v2/tasks/${encodeURIComponent(taskId)}/runs`, {
      scheduledFor
    });
    return requireRecord(response.data);
  }

  async getTaskRunLogs(taskId: string, runId: string) {
    let response = await this.axios.get(
      `/api/v2/tasks/${encodeURIComponent(taskId)}/runs/${encodeURIComponent(runId)}/logs`
    );
    return requireRecord(response.data);
  }

  // ─── Organizations ───

  async listOrganizations(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/orgs', { params });
    return requireRecord(response.data);
  }

  async getOrganization(orgId: string) {
    let response = await this.axios.get(`/api/v2/orgs/${encodeURIComponent(orgId)}`);
    return requireRecord(response.data);
  }

  async getOrganizationMembers(orgId: string) {
    let response = await this.axios.get(`/api/v2/orgs/${encodeURIComponent(orgId)}/members`);
    return requireRecord(response.data);
  }

  // ─── Authorizations ───

  async listAuthorizations(params?: { userID?: string; orgID?: string }) {
    let response = await this.axios.get('/api/v2/authorizations', {
      params: {
        orgID: params?.orgID || this.orgId,
        ...params
      }
    });
    return requireRecord(response.data);
  }

  async getAuthorization(authId: string) {
    let response = await this.axios.get(
      `/api/v2/authorizations/${encodeURIComponent(authId)}`
    );
    return requireRecord(response.data);
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
      orgID: requiredOrg(this.orgId),
      description: data.description,
      permissions: data.permissions,
      status: data.status || 'active'
    });
    return requireRecord(response.data);
  }

  async updateAuthorization(
    authId: string,
    data: {
      description?: string;
      status?: 'active' | 'inactive';
    }
  ) {
    let response = await this.axios.patch(
      `/api/v2/authorizations/${encodeURIComponent(authId)}`,
      data
    );
    return requireRecord(response.data);
  }

  async deleteAuthorization(authId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/authorizations/${encodeURIComponent(authId)}`)
    );
  }

  // ─── Labels ───

  async listLabels() {
    let response = await this.axios.get('/api/v2/labels', {
      params: { orgID: this.orgId }
    });
    return requireRecord(response.data);
  }

  async createLabel(data: { name: string; color?: string; description?: string }) {
    let response = await this.axios.post('/api/v2/labels', {
      orgID: requiredOrg(this.orgId),
      name: data.name,
      properties: {
        color: data.color,
        description: data.description
      }
    });
    return requireRecord(response.data);
  }

  async updateLabel(
    labelId: string,
    data: {
      name?: string;
      color?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.patch(`/api/v2/labels/${encodeURIComponent(labelId)}`, {
      name: data.name,
      properties: {
        color: data.color,
        description: data.description
      }
    });
    return requireRecord(response.data);
  }

  async deleteLabel(labelId: string) {
    requireNoContent(await this.axios.delete(`/api/v2/labels/${encodeURIComponent(labelId)}`));
  }

  // ─── Checks ───

  async listChecks(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/checks', {
      params: {
        orgID: requiredOrg(this.orgId),
        ...params
      }
    });
    return requireRecord(response.data);
  }

  async getCheck(checkId: string) {
    let response = await this.axios.get(`/api/v2/checks/${encodeURIComponent(checkId)}`);
    return requireRecord(response.data);
  }

  async deleteCheck(checkId: string) {
    requireNoContent(await this.axios.delete(`/api/v2/checks/${encodeURIComponent(checkId)}`));
  }

  // ─── Notification Endpoints ───

  async listNotificationEndpoints(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/notificationEndpoints', {
      params: {
        orgID: requiredOrg(this.orgId),
        ...params
      }
    });
    return requireRecord(response.data);
  }

  async getNotificationEndpoint(endpointId: string) {
    let response = await this.axios.get(
      `/api/v2/notificationEndpoints/${encodeURIComponent(endpointId)}`
    );
    return requireRecord(response.data);
  }

  async deleteNotificationEndpoint(endpointId: string) {
    requireNoContent(
      await this.axios.delete(
        `/api/v2/notificationEndpoints/${encodeURIComponent(endpointId)}`
      )
    );
  }

  // ─── Notification Rules ───

  async listNotificationRules(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/notificationRules', {
      params: {
        orgID: requiredOrg(this.orgId),
        ...params
      }
    });
    return requireRecord(response.data);
  }

  async getNotificationRule(ruleId: string) {
    let response = await this.axios.get(
      `/api/v2/notificationRules/${encodeURIComponent(ruleId)}`
    );
    return requireRecord(response.data);
  }

  async deleteNotificationRule(ruleId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/notificationRules/${encodeURIComponent(ruleId)}`)
    );
  }

  // ─── Dashboards ───

  async listDashboards(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/api/v2/dashboards', {
      params: {
        orgID: this.orgId,
        ...params
      }
    });
    return requireRecord(response.data);
  }

  async getDashboard(dashboardId: string) {
    let response = await this.axios.get(
      `/api/v2/dashboards/${encodeURIComponent(dashboardId)}`
    );
    return requireRecord(response.data);
  }

  async createDashboard(data: { name: string; description?: string }) {
    let response = await this.axios.post('/api/v2/dashboards', {
      orgID: requiredOrg(this.orgId),
      name: data.name,
      description: data.description
    });
    return requireRecord(response.data);
  }

  async updateDashboard(
    dashboardId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.patch(
      `/api/v2/dashboards/${encodeURIComponent(dashboardId)}`,
      data
    );
    return requireRecord(response.data);
  }

  async deleteDashboard(dashboardId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/dashboards/${encodeURIComponent(dashboardId)}`)
    );
  }

  // ─── Secrets ───

  async listSecretKeys() {
    let response = await this.axios.get(
      `/api/v2/orgs/${encodeURIComponent(requiredOrg(this.orgId))}/secrets`
    );
    return requireRecord(response.data);
  }

  async putSecrets(secrets: Record<string, string>) {
    requireNoContent(
      await this.axios.patch(
        `/api/v2/orgs/${encodeURIComponent(requiredOrg(this.orgId))}/secrets`,
        secrets
      )
    );
  }

  async deleteSecrets(keys: string[]) {
    requireNoContent(
      await this.axios.post(
        `/api/v2/orgs/${encodeURIComponent(requiredOrg(this.orgId))}/secrets/delete`,
        {
          secrets: keys
        }
      )
    );
  }

  // ─── Telegraf Configurations ───

  async listTelegrafs() {
    let response = await this.axios.get('/api/v2/telegrafs', {
      params: { orgID: this.orgId }
    });
    return requireRecord(response.data);
  }

  async getTelegraf(telegrafId: string) {
    let response = await this.axios.get(
      `/api/v2/telegrafs/${encodeURIComponent(telegrafId)}`,
      {
        headers: { Accept: 'application/json' }
      }
    );
    return requireRecord(response.data);
  }

  async createTelegraf(data: { name: string; description?: string; config: string }) {
    let response = await this.axios.post('/api/v2/telegrafs', {
      orgID: requiredOrg(this.orgId),
      name: data.name,
      description: data.description,
      config: data.config
    });
    return requireRecord(response.data);
  }

  async updateTelegraf(
    telegrafId: string,
    data: {
      name?: string;
      description?: string;
      config?: string;
    }
  ) {
    let response = await this.axios.put(
      `/api/v2/telegrafs/${encodeURIComponent(telegrafId)}`,
      {
        orgID: requiredOrg(this.orgId),
        ...data
      }
    );
    return requireRecord(response.data);
  }

  async deleteTelegraf(telegrafId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/telegrafs/${encodeURIComponent(telegrafId)}`)
    );
  }

  // ─── DBRP Mappings ───

  async listDBRPs() {
    let response = await this.axios.get('/api/v2/dbrps', {
      params: { orgID: this.orgId }
    });
    return requireRecord(response.data);
  }

  async createDBRP(data: {
    bucketId: string;
    database: string;
    retentionPolicy: string;
    isDefault?: boolean;
  }) {
    let response = await this.axios.post('/api/v2/dbrps', {
      orgID: requiredOrg(this.orgId),
      bucketID: data.bucketId,
      database: data.database,
      retention_policy: data.retentionPolicy,
      default: data.isDefault ?? false
    });
    return requireRecord(response.data);
  }

  async deleteDBRP(dbrpId: string) {
    requireNoContent(
      await this.axios.delete(`/api/v2/dbrps/${encodeURIComponent(dbrpId)}`, {
        params: { orgID: this.orgId }
      })
    );
  }

  // ─── Users ───

  async getMe() {
    let response = await this.axios.get('/api/v2/me');
    return requireRecord(response.data);
  }
}
