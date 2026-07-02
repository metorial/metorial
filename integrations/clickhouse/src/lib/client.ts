import { createAxios } from 'slates';
import { clickhouseApiError } from './errors';
import { parseClickHouseResponse } from './query-results';

let serializeParams = (params: Record<string, any>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (let item of value) {
        if (item !== undefined && item !== null) search.append(key, String(item));
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let parseMaybeJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class ClickHouseClient {
  private axios;

  constructor(private params: { token: string; organizationId: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.clickhouse.cloud/v1',
      headers: {
        Authorization: `Basic ${params.token}`,
        'Content-Type': 'application/json'
      },
      paramsSerializer: { serialize: serializeParams }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(clickhouseApiError(error))
    );
  }

  private get orgPath() {
    return `/organizations/${this.params.organizationId}`;
  }

  private servicePath(serviceId: string) {
    return `${this.orgPath}/services/${serviceId}`;
  }

  // ── Organization ──────────────────────────────────────────

  async getOrganization() {
    let res = await this.axios.get(this.orgPath);
    return res.data.result;
  }

  async updateOrganization(body: Record<string, any>) {
    let res = await this.axios.patch(this.orgPath, body);
    return res.data.result;
  }

  async listActivities(params?: { fromDate?: string; toDate?: string }) {
    let res = await this.axios.get(`${this.orgPath}/activities`, {
      params: {
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return res.data.result;
  }

  // ── Members ───────────────────────────────────────────────

  async listMembers() {
    let res = await this.axios.get(`${this.orgPath}/members`);
    return res.data.result;
  }

  async getMember(userId: string) {
    let res = await this.axios.get(`${this.orgPath}/members/${userId}`);
    return res.data.result;
  }

  async updateMember(userId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`${this.orgPath}/members/${userId}`, body);
    return res.data.result;
  }

  async removeMember(userId: string) {
    let res = await this.axios.delete(`${this.orgPath}/members/${userId}`);
    return res.data;
  }

  // ── Invitations ───────────────────────────────────────────

  async listInvitations() {
    let res = await this.axios.get(`${this.orgPath}/invitations`);
    return res.data.result;
  }

  async createInvitation(body: { email: string; role?: string; assignedRoleIds?: string[] }) {
    let res = await this.axios.post(`${this.orgPath}/invitations`, body);
    return res.data.result;
  }

  async deleteInvitation(invitationId: string) {
    let res = await this.axios.delete(`${this.orgPath}/invitations/${invitationId}`);
    return res.data;
  }

  // ── Roles ─────────────────────────────────────────────────

  async listRoles() {
    let res = await this.axios.get(`${this.orgPath}/roles`);
    return res.data.result;
  }

  async getRole(roleId: string) {
    let res = await this.axios.get(`${this.orgPath}/roles/${roleId}`);
    return res.data.result;
  }

  // ── Services ──────────────────────────────────────────────

  async listServices(filter?: string[]) {
    let res = await this.axios.get(`${this.orgPath}/services`, {
      params: filter ? { filter } : undefined
    });
    return res.data.result;
  }

  async getService(serviceId: string) {
    let res = await this.axios.get(this.servicePath(serviceId));
    return res.data.result;
  }

  async createService(body: Record<string, any>) {
    let res = await this.axios.post(`${this.orgPath}/services`, body);
    return res.data.result;
  }

  async updateService(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.patch(this.servicePath(serviceId), body);
    return res.data.result;
  }

  async deleteService(serviceId: string) {
    let res = await this.axios.delete(this.servicePath(serviceId));
    return res.data;
  }

  async updateServiceState(serviceId: string, command: 'start' | 'stop' | 'awake') {
    let res = await this.axios.patch(`${this.servicePath(serviceId)}/state`, { command });
    return res.data.result;
  }

  async updateServiceScaling(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`${this.servicePath(serviceId)}/replicaScaling`, body);
    return res.data.result;
  }

  async resetServicePassword(serviceId: string) {
    let res = await this.axios.patch(`${this.servicePath(serviceId)}/password`);
    return res.data.result;
  }

  // ── Backups ───────────────────────────────────────────────

  async listBackups(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/backups`);
    return res.data.result;
  }

  async getBackup(serviceId: string, backupId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/backups/${backupId}`);
    return res.data.result;
  }

  async getBackupConfiguration(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/backupConfiguration`);
    return res.data.result;
  }

  async updateBackupConfiguration(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.patch(
      `${this.servicePath(serviceId)}/backupConfiguration`,
      body
    );
    return res.data.result;
  }

  // ── API Keys ──────────────────────────────────────────────

  async listApiKeys() {
    let res = await this.axios.get(`${this.orgPath}/keys`);
    return res.data.result;
  }

  async createApiKey(body: Record<string, any>) {
    let res = await this.axios.post(`${this.orgPath}/keys`, body);
    return res.data.result;
  }

  async getApiKey(keyId: string) {
    let res = await this.axios.get(`${this.orgPath}/keys/${keyId}`);
    return res.data.result;
  }

  async updateApiKey(keyId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`${this.orgPath}/keys/${keyId}`, body);
    return res.data.result;
  }

  async deleteApiKey(keyId: string) {
    let res = await this.axios.delete(`${this.orgPath}/keys/${keyId}`);
    return res.data;
  }

  // ── ClickPipes ────────────────────────────────────────────

  async listClickPipes(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickpipes`);
    return res.data.result;
  }

  async getClickPipe(serviceId: string, clickpipeId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickpipes/${clickpipeId}`);
    return res.data.result;
  }

  async createClickPipe(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.post(`${this.servicePath(serviceId)}/clickpipes`, body);
    return res.data.result;
  }

  async updateClickPipe(serviceId: string, clickpipeId: string, body: Record<string, any>) {
    let res = await this.axios.patch(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}`,
      body
    );
    return res.data.result;
  }

  async deleteClickPipe(serviceId: string, clickpipeId: string) {
    let res = await this.axios.delete(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}`
    );
    return res.data;
  }

  async updateClickPipeState(serviceId: string, clickpipeId: string, command: string) {
    let res = await this.axios.patch(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}/state`,
      { command }
    );
    return res.data.result;
  }

  async updateClickPipeScaling(
    serviceId: string,
    clickpipeId: string,
    body: Record<string, any>
  ) {
    let res = await this.axios.patch(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}/scaling`,
      body
    );
    return res.data.result;
  }

  async getClickPipeSettings(serviceId: string, clickpipeId: string) {
    let res = await this.axios.get(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}/settings`
    );
    return res.data.result;
  }

  async updateClickPipeSettings(
    serviceId: string,
    clickpipeId: string,
    body: Record<string, any>
  ) {
    let res = await this.axios.put(
      `${this.servicePath(serviceId)}/clickpipes/${clickpipeId}/settings`,
      body
    );
    return res.data.result;
  }

  async getCdcClickPipesScaling(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickpipesCdcScaling`);
    return res.data.result;
  }

  async updateCdcClickPipesScaling(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.patch(
      `${this.servicePath(serviceId)}/clickpipesCdcScaling`,
      body
    );
    return res.data.result;
  }

  // ── Usage / Metrics ───────────────────────────────────────

  async getUsageCost(fromDate: string, toDate: string, filter?: string[]) {
    let res = await this.axios.get(`${this.orgPath}/usageCost`, {
      params: {
        from_date: fromDate,
        to_date: toDate,
        ...(filter ? { filter } : {})
      }
    });
    return res.data.result;
  }

  async getPrometheusMetrics(serviceId?: string) {
    let path = serviceId
      ? `${this.servicePath(serviceId)}/prometheus`
      : `${this.orgPath}/prometheus`;
    let res = await this.axios.get(path);
    return res.data;
  }

  // ── Private Endpoints ─────────────────────────────────────

  async getPrivateEndpointConfig(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/privateEndpointConfig`);
    return res.data.result;
  }

  async listReversePrivateEndpoints(serviceId: string) {
    let res = await this.axios.get(
      `${this.servicePath(serviceId)}/clickpipesReversePrivateEndpoints`
    );
    return res.data.result;
  }

  async createReversePrivateEndpoint(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.post(
      `${this.servicePath(serviceId)}/clickpipesReversePrivateEndpoints`,
      body
    );
    return res.data.result;
  }

  async deleteReversePrivateEndpoint(serviceId: string, reversePrivateEndpointId: string) {
    let res = await this.axios.delete(
      `${this.servicePath(serviceId)}/clickpipesReversePrivateEndpoints/${reversePrivateEndpointId}`
    );
    return res.data;
  }

  // ── BYOC ──────────────────────────────────────────────────

  async createByocInfrastructure(body: Record<string, any>) {
    let res = await this.axios.post(`${this.orgPath}/byocInfrastructure`, body);
    return res.data.result;
  }

  async updateByocInfrastructure(byocId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`${this.orgPath}/byocInfrastructure/${byocId}`, body);
    return res.data.result;
  }

  async deleteByocInfrastructure(byocId: string) {
    let res = await this.axios.delete(`${this.orgPath}/byocInfrastructure/${byocId}`);
    return res.data;
  }

  // ── ClickStack ────────────────────────────────────────────

  async listDashboards(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickstack/dashboards`);
    return res.data.result;
  }

  async createDashboard(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.post(
      `${this.servicePath(serviceId)}/clickstack/dashboards`,
      body
    );
    return res.data.result;
  }

  async getDashboard(serviceId: string, dashboardId: string) {
    let res = await this.axios.get(
      `${this.servicePath(serviceId)}/clickstack/dashboards/${dashboardId}`
    );
    return res.data.result;
  }

  async updateDashboard(serviceId: string, dashboardId: string, body: Record<string, any>) {
    let res = await this.axios.put(
      `${this.servicePath(serviceId)}/clickstack/dashboards/${dashboardId}`,
      body
    );
    return res.data.result;
  }

  async deleteDashboard(serviceId: string, dashboardId: string) {
    let res = await this.axios.delete(
      `${this.servicePath(serviceId)}/clickstack/dashboards/${dashboardId}`
    );
    return res.data;
  }

  async listAlerts(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickstack/alerts`);
    return res.data.result;
  }

  async createAlert(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.post(`${this.servicePath(serviceId)}/clickstack/alerts`, body);
    return res.data.result;
  }

  async getAlert(serviceId: string, alertId: string) {
    let res = await this.axios.get(
      `${this.servicePath(serviceId)}/clickstack/alerts/${alertId}`
    );
    return res.data.result;
  }

  async updateAlert(serviceId: string, alertId: string, body: Record<string, any>) {
    let res = await this.axios.put(
      `${this.servicePath(serviceId)}/clickstack/alerts/${alertId}`,
      body
    );
    return res.data.result;
  }

  async deleteAlert(serviceId: string, alertId: string) {
    let res = await this.axios.delete(
      `${this.servicePath(serviceId)}/clickstack/alerts/${alertId}`
    );
    return res.data;
  }

  async listClickStackSources(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickstack/sources`);
    return res.data.result;
  }

  async listClickStackWebhooks(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/clickstack/webhooks`);
    return res.data.result;
  }

  // ── Query Endpoints ───────────────────────────────────────

  async getQueryEndpoint(serviceId: string) {
    let res = await this.axios.get(`${this.servicePath(serviceId)}/serviceQueryEndpoint`);
    return res.data.result;
  }

  async upsertQueryEndpoint(serviceId: string, body: Record<string, any>) {
    let res = await this.axios.post(
      `${this.servicePath(serviceId)}/serviceQueryEndpoint`,
      body
    );
    return res.data.result;
  }

  async deleteQueryEndpoint(serviceId: string) {
    let res = await this.axios.delete(`${this.servicePath(serviceId)}/serviceQueryEndpoint`);
    return res.data;
  }

  async runQueryEndpoint(params: {
    endpointId: string;
    format?: string;
    queryVariables?: Record<string, any>;
    endpointVersion?: '1' | '2';
    requestTimeoutMs?: number;
    clickhouseSettings?: Record<string, string | number | boolean>;
  }) {
    let url = new URL(
      `https://console-api.clickhouse.cloud/.api/query-endpoints/${encodeURIComponent(
        params.endpointId
      )}/run`
    );

    if (params.endpointVersion === '2' && params.format) {
      url.searchParams.set('format', params.format);
    }

    if (params.requestTimeoutMs !== undefined) {
      url.searchParams.set('request_timeout', String(params.requestTimeoutMs));
    }

    for (let [key, value] of Object.entries(params.clickhouseSettings || {})) {
      url.searchParams.set(key, String(value));
    }

    let body: Record<string, any> = {};
    if (params.queryVariables) body.queryVariables = params.queryVariables;
    if (params.endpointVersion !== '2' && params.format) body.format = params.format;

    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.params.token}`,
          'Content-Type': 'application/json',
          ...(params.endpointVersion
            ? { 'x-clickhouse-endpoint-version': params.endpointVersion }
            : {})
        },
        body: JSON.stringify(body)
      });
      let raw = await res.text();

      if (!res.ok) {
        throw clickhouseApiError(
          {
            response: {
              status: res.status,
              statusText: res.statusText,
              data: parseMaybeJson(raw)
            }
          },
          'query endpoint run'
        );
      }

      return parseClickHouseResponse(raw, params.format);
    } catch (error) {
      throw clickhouseApiError(error, 'query endpoint run');
    }
  }
}
