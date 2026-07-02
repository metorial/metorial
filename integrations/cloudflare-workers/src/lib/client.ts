import { createAxios } from 'slates';

export interface CloudflareAuthConfig {
  token: string;
  email?: string;
  authType: 'api_token' | 'global_api_key';
  accountId: string;
}

export class CloudflareClient {
  private accountId: string;
  private http: ReturnType<typeof createAxios>;

  constructor(config: CloudflareAuthConfig) {
    this.accountId = config.accountId;

    let headers: Record<string, string> = {};
    if (config.authType === 'global_api_key' && config.email) {
      headers['X-Auth-Email'] = config.email;
      headers['X-Auth-Key'] = config.token;
    } else {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.http = createAxios({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers
    });
  }

  private get basePath() {
    return `/accounts/${this.accountId}/workers`;
  }

  // =====================
  // Worker Scripts
  // =====================

  async listScripts() {
    let response = await this.http.get(`${this.basePath}/scripts`);
    return response.data.result;
  }

  async getScript(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}`);
    return response.data.result;
  }

  async getScriptContent(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/content/v2`, {
      headers: { Accept: 'application/javascript' }
    });
    return response.data;
  }

  async deleteScript(scriptName: string, force?: boolean) {
    let params: Record<string, string> = {};
    if (force) {
      params.force = 'true';
    }
    let response = await this.http.delete(`${this.basePath}/scripts/${scriptName}`, {
      params
    });
    return response.data;
  }

  // =====================
  // Versions
  // =====================

  async listVersions(
    scriptName: string,
    options?: { page?: number; perPage?: number; deployable?: boolean }
  ) {
    let params: Record<string, string | number | boolean> = {};
    if (options?.page) params.page = options.page;
    if (options?.perPage) params.per_page = options.perPage;
    if (options?.deployable !== undefined) params.deployable = options.deployable;
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/versions`, {
      params
    });
    return response.data.result;
  }

  async getVersion(scriptName: string, versionId: string) {
    let response = await this.http.get(
      `${this.basePath}/scripts/${scriptName}/versions/${versionId}`
    );
    return response.data.result;
  }

  // =====================
  // Deployments
  // =====================

  async listDeployments(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/deployments`);
    return response.data.result;
  }

  async getDeployment(scriptName: string, deploymentId: string) {
    let response = await this.http.get(
      `${this.basePath}/scripts/${scriptName}/deployments/${deploymentId}`
    );
    return response.data.result;
  }

  async createDeployment(
    scriptName: string,
    versions: Array<{ versionId: string; percentage: number }>,
    force?: boolean
  ) {
    let params: Record<string, string> = {};
    if (force) params.force = 'true';
    let response = await this.http.post(
      `${this.basePath}/scripts/${scriptName}/deployments`,
      {
        strategy: 'percentage',
        versions: versions.map(v => ({ version_id: v.versionId, percentage: v.percentage }))
      },
      { params }
    );
    return response.data.result;
  }

  async deleteDeployment(scriptName: string, deploymentId: string) {
    let response = await this.http.delete(
      `${this.basePath}/scripts/${scriptName}/deployments/${deploymentId}`
    );
    return response.data;
  }

  // =====================
  // Secrets
  // =====================

  async listSecrets(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/secrets`);
    return response.data.result;
  }

  async putSecret(scriptName: string, name: string, value: string) {
    let response = await this.http.put(`${this.basePath}/scripts/${scriptName}/secrets`, {
      name,
      text: value,
      type: 'secret_text'
    });
    return response.data.result;
  }

  async deleteSecret(scriptName: string, secretName: string) {
    let response = await this.http.delete(
      `${this.basePath}/scripts/${scriptName}/secrets/${secretName}`
    );
    return response.data;
  }

  // =====================
  // Settings
  // =====================

  async getSettings(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/settings`);
    return response.data.result;
  }

  async getScriptSettings(scriptName: string) {
    let response = await this.http.get(
      `${this.basePath}/scripts/${scriptName}/script-settings`
    );
    return response.data.result;
  }

  async patchScriptSettings(scriptName: string, settings: Record<string, any>) {
    let response = await this.http.patch(
      `${this.basePath}/scripts/${scriptName}/script-settings`,
      settings
    );
    return response.data.result;
  }

  // =====================
  // Cron Triggers (Schedules)
  // =====================

  async getSchedules(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/schedules`);
    return response.data.result;
  }

  async updateSchedules(scriptName: string, schedules: Array<{ cron: string }>) {
    let response = await this.http.put(
      `${this.basePath}/scripts/${scriptName}/schedules`,
      schedules
    );
    return response.data.result;
  }

  // =====================
  // Custom Domains
  // =====================

  async listDomains() {
    let response = await this.http.get(`${this.basePath}/domains`);
    return response.data.result;
  }

  async getDomain(domainId: string) {
    let response = await this.http.get(`${this.basePath}/domains/${domainId}`);
    return response.data.result;
  }

  async attachDomain(hostname: string, service: string, zoneId: string, environment?: string) {
    let response = await this.http.put(`${this.basePath}/domains`, {
      hostname,
      service,
      zone_id: zoneId,
      environment: environment || 'production'
    });
    return response.data.result;
  }

  async detachDomain(domainId: string) {
    let response = await this.http.delete(`${this.basePath}/domains/${domainId}`);
    return response.data;
  }

  // =====================
  // Routes (Zone-scoped)
  // =====================

  async listRoutes(zoneId: string) {
    let response = await this.http.get(`/zones/${zoneId}/workers/routes`);
    return response.data.result;
  }

  async getRoute(zoneId: string, routeId: string) {
    let response = await this.http.get(`/zones/${zoneId}/workers/routes/${routeId}`);
    return response.data.result;
  }

  async createRoute(zoneId: string, pattern: string, scriptName: string) {
    let response = await this.http.post(`/zones/${zoneId}/workers/routes`, {
      pattern,
      script: scriptName
    });
    return response.data.result;
  }

  async updateRoute(zoneId: string, routeId: string, pattern: string, scriptName: string) {
    let response = await this.http.put(`/zones/${zoneId}/workers/routes/${routeId}`, {
      pattern,
      script: scriptName
    });
    return response.data.result;
  }

  async deleteRoute(zoneId: string, routeId: string) {
    let response = await this.http.delete(`/zones/${zoneId}/workers/routes/${routeId}`);
    return response.data;
  }

  // =====================
  // Subdomain
  // =====================

  async getSubdomain() {
    let response = await this.http.get(`${this.basePath}/subdomain`);
    return response.data.result;
  }

  async updateSubdomain(subdomain: string) {
    let response = await this.http.put(`${this.basePath}/subdomain`, { subdomain });
    return response.data.result;
  }

  async getScriptSubdomain(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/subdomain`);
    return response.data.result;
  }

  async setScriptSubdomain(scriptName: string, enabled: boolean, previewsEnabled?: boolean) {
    let response = await this.http.post(`${this.basePath}/scripts/${scriptName}/subdomain`, {
      enabled,
      previews_enabled: previewsEnabled ?? false
    });
    return response.data.result;
  }

  // =====================
  // Tails
  // =====================

  async listTails(scriptName: string) {
    let response = await this.http.get(`${this.basePath}/scripts/${scriptName}/tails`);
    return response.data.result;
  }

  async createTail(scriptName: string) {
    let response = await this.http.post(`${this.basePath}/scripts/${scriptName}/tails`);
    return response.data.result;
  }

  async deleteTail(scriptName: string, tailId: string) {
    let response = await this.http.delete(
      `${this.basePath}/scripts/${scriptName}/tails/${tailId}`
    );
    return response.data;
  }

  // =====================
  // Observability / Telemetry
  // =====================

  async queryTelemetry(query: Record<string, any>) {
    let response = await this.http.post(
      `${this.basePath}/observability/telemetry/query`,
      query
    );
    return response.data.result;
  }

  async listTelemetryKeys(body?: Record<string, any>) {
    let response = await this.http.post(
      `${this.basePath}/observability/telemetry/keys`,
      body || {}
    );
    return response.data.result;
  }

  // =====================
  // Account Settings
  // =====================

  async getAccountSettings() {
    let response = await this.http.get(`${this.basePath}/account-settings`);
    return response.data.result;
  }

  async updateAccountSettings(settings: {
    defaultUsageModel?: string;
    greenCompute?: boolean;
  }) {
    let body: Record<string, any> = {};
    if (settings.defaultUsageModel !== undefined)
      body.default_usage_model = settings.defaultUsageModel;
    if (settings.greenCompute !== undefined) body.green_compute = settings.greenCompute;
    let response = await this.http.put(`${this.basePath}/account-settings`, body);
    return response.data.result;
  }
}
