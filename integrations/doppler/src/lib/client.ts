import { createAxios } from 'slates';

export class DopplerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.doppler.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Projects ----

  async listProjects(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ projects: any[]; page: number }> {
    let response = await this.axios.get('/v3/projects', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getProject(project: string): Promise<any> {
    let response = await this.axios.get('/v3/projects/project', {
      params: { project }
    });
    return response.data.project;
  }

  async createProject(name: string, description?: string): Promise<any> {
    let response = await this.axios.post('/v3/projects', { name, description });
    return response.data.project;
  }

  async updateProject(project: string, name: string, description?: string): Promise<any> {
    let response = await this.axios.post('/v3/projects/project', {
      project,
      name,
      description
    });
    return response.data.project;
  }

  async deleteProject(project: string): Promise<void> {
    await this.axios.delete('/v3/projects/project', { data: { project } });
  }

  // ---- Environments ----

  async listEnvironments(project: string): Promise<any[]> {
    let response = await this.axios.get('/v3/environments', {
      params: { project }
    });
    return response.data.environments;
  }

  async getEnvironment(project: string, environment: string): Promise<any> {
    let response = await this.axios.get('/v3/environments/environment', {
      params: { project, environment }
    });
    return response.data.environment;
  }

  async createEnvironment(project: string, name: string, slug: string): Promise<any> {
    let response = await this.axios.post(
      '/v3/environments',
      { name, slug },
      {
        params: { project }
      }
    );
    return response.data.environment;
  }

  async renameEnvironment(
    project: string,
    environment: string,
    name?: string,
    slug?: string
  ): Promise<any> {
    let response = await this.axios.put(
      '/v3/environments/environment',
      { name, slug },
      {
        params: { project, environment }
      }
    );
    return response.data.environment;
  }

  async deleteEnvironment(project: string, environment: string): Promise<void> {
    await this.axios.delete('/v3/environments/environment', {
      params: { project, environment }
    });
  }

  // ---- Configs ----

  async listConfigs(
    project: string,
    params?: { environment?: string; page?: number; perPage?: number }
  ): Promise<{ configs: any[]; page: number }> {
    let response = await this.axios.get('/v3/configs', {
      params: {
        project,
        environment: params?.environment,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getConfig(project: string, config: string): Promise<any> {
    let response = await this.axios.get('/v3/configs/config', {
      params: { project, config }
    });
    return response.data.config;
  }

  async createConfig(project: string, environment: string, name: string): Promise<any> {
    let response = await this.axios.post('/v3/configs', { project, environment, name });
    return response.data.config;
  }

  async updateConfig(project: string, config: string, name: string): Promise<any> {
    let response = await this.axios.post('/v3/configs/config', { project, config, name });
    return response.data.config;
  }

  async deleteConfig(project: string, config: string): Promise<void> {
    await this.axios.delete('/v3/configs/config', { data: { project, config } });
  }

  async cloneConfig(project: string, config: string, name: string): Promise<any> {
    let response = await this.axios.post('/v3/configs/config/clone', {
      project,
      config,
      name
    });
    return response.data.config;
  }

  async lockConfig(project: string, config: string): Promise<any> {
    let response = await this.axios.post('/v3/configs/config/lock', { project, config });
    return response.data.config;
  }

  async unlockConfig(project: string, config: string): Promise<any> {
    let response = await this.axios.post('/v3/configs/config/unlock', { project, config });
    return response.data.config;
  }

  // ---- Secrets ----

  async listSecrets(
    project: string,
    config: string,
    params?: {
      includeDynamicSecrets?: boolean;
      dynamicSecretsTtlSec?: number;
      secrets?: string[];
      includeManagedSecrets?: boolean;
    }
  ): Promise<Record<string, any>> {
    let response = await this.axios.get('/v3/configs/config/secrets', {
      params: {
        project,
        config,
        include_dynamic_secrets: params?.includeDynamicSecrets,
        dynamic_secrets_ttl_sec: params?.dynamicSecretsTtlSec,
        secrets: params?.secrets?.join(','),
        include_managed_secrets: params?.includeManagedSecrets
      }
    });
    return response.data.secrets;
  }

  async getSecret(project: string, config: string, name: string): Promise<any> {
    let response = await this.axios.get('/v3/configs/config/secret', {
      params: { project, config, name }
    });
    return response.data;
  }

  async setSecrets(
    project: string,
    config: string,
    secrets: Record<string, string>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/v3/configs/config/secrets', {
      project,
      config,
      secrets
    });
    return response.data.secrets;
  }

  async deleteSecret(project: string, config: string, name: string): Promise<void> {
    await this.axios.delete('/v3/configs/config/secret', {
      params: { project, config, name }
    });
  }

  async downloadSecrets(
    project: string,
    config: string,
    format?: string,
    params?: {
      includeDynamicSecrets?: boolean;
      dynamicSecretsTtlSec?: number;
      secrets?: string[];
    }
  ): Promise<any> {
    let headers: Record<string, string> = {};
    if (format === 'env') {
      headers.Accept = 'text/plain';
    }

    let response = await this.axios.get('/v3/configs/config/secrets/download', {
      params: {
        project,
        config,
        format: format === 'env' ? undefined : format,
        include_dynamic_secrets: params?.includeDynamicSecrets,
        dynamic_secrets_ttl_sec: params?.dynamicSecretsTtlSec,
        secrets: params?.secrets?.join(',')
      },
      headers
    });
    return response.data;
  }

  // ---- Config Logs ----

  async listConfigLogs(
    project: string,
    config: string,
    params?: { page?: number; perPage?: number }
  ): Promise<{ logs: any[]; page: number }> {
    let response = await this.axios.get('/v3/configs/config/logs', {
      params: { project, config, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getConfigLog(project: string, config: string, logId: string): Promise<any> {
    let response = await this.axios.get('/v3/configs/config/logs/log', {
      params: { project, config, log: logId }
    });
    return response.data.log;
  }

  async rollbackConfigLog(project: string, config: string, logId: string): Promise<any> {
    let response = await this.axios.post(
      '/v3/configs/config/logs/log/rollback',
      {},
      {
        params: { project, config, log: logId }
      }
    );
    return response.data.log;
  }

  // ---- Activity Logs ----

  async listActivityLogs(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ logs: any[]; page: number }> {
    let response = await this.axios.get('/v3/logs', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getActivityLog(logId: string): Promise<any> {
    let response = await this.axios.get('/v3/logs/log', {
      params: { log: logId }
    });
    return response.data.log;
  }

  // ---- Webhooks ----

  async listWebhooks(project: string): Promise<any[]> {
    let response = await this.axios.get('/v3/webhooks', {
      params: { project }
    });
    return response.data.webhooks || [];
  }

  async getWebhook(project: string, slug: string): Promise<any> {
    let response = await this.axios.get(`/v3/webhooks/webhook/${slug}`, {
      params: { project }
    });
    return response.data.webhook;
  }

  async createWebhook(
    project: string,
    params: {
      url: string;
      secret?: string;
      enabled?: boolean;
      enabledConfigs?: string[];
      payload?: string;
      authentication?: {
        type?: string;
        token?: string;
        username?: string;
        password?: string;
      };
    }
  ): Promise<any> {
    let response = await this.axios.post('/v3/webhooks', {
      project,
      url: params.url,
      secret: params.secret,
      enabled: params.enabled,
      enabledConfigs: params.enabledConfigs,
      payload: params.payload,
      authentication: params.authentication
    });
    return response.data.webhook;
  }

  async updateWebhook(
    project: string,
    slug: string,
    params: {
      url?: string;
      secret?: string;
      enabledConfigs?: string[];
      payload?: string;
      authentication?: {
        type?: string;
        token?: string;
        username?: string;
        password?: string;
      };
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/v3/webhooks/webhook/${slug}`, {
      project,
      ...params
    });
    return response.data.webhook;
  }

  async enableWebhook(project: string, slug: string): Promise<any> {
    let response = await this.axios.post(`/v3/webhooks/webhook/${slug}/enable`, {
      project
    });
    return response.data.webhook;
  }

  async disableWebhook(project: string, slug: string): Promise<any> {
    let response = await this.axios.post(`/v3/webhooks/webhook/${slug}/disable`, {
      project
    });
    return response.data.webhook;
  }

  async deleteWebhook(project: string, slug: string): Promise<void> {
    await this.axios.delete(`/v3/webhooks/webhook/${slug}`, {
      params: { project }
    });
  }

  // ---- Trusted IPs ----

  async listTrustedIps(project: string, config: string): Promise<any[]> {
    let response = await this.axios.get('/v3/configs/config/trusted_ips', {
      params: { project, config }
    });
    return response.data.ips || [];
  }

  async addTrustedIp(project: string, config: string, ip: string): Promise<void> {
    await this.axios.post(
      '/v3/configs/config/trusted_ips',
      { ip },
      {
        params: { project, config }
      }
    );
  }

  async deleteTrustedIp(project: string, config: string, ip: string): Promise<void> {
    await this.axios.delete('/v3/configs/config/trusted_ips', {
      data: { ip },
      params: { project, config }
    });
  }

  // ---- Secret Sharing ----

  async shareSecretPlainText(
    secret: string,
    params?: {
      expireViews?: number;
      expireDays?: number;
    }
  ): Promise<any> {
    let response = await this.axios.post('/v1/share/secrets/plain', {
      secret,
      expire_views: params?.expireViews,
      expire_days: params?.expireDays
    });
    return response.data;
  }

  // ---- Workplace ----

  async getWorkplace(): Promise<any> {
    let response = await this.axios.get('/v3/workplace');
    return response.data.workplace;
  }

  async updateWorkplace(params: {
    name?: string;
    billingEmail?: string;
    securityEmail?: string;
  }): Promise<any> {
    let response = await this.axios.post('/v3/workplace', {
      name: params.name,
      billing_email: params.billingEmail,
      security_email: params.securityEmail
    });
    return response.data.workplace;
  }

  // ---- Dynamic Secrets ----

  async revokeDynamicSecretLease(
    project: string,
    config: string,
    dynamicSecret: string,
    slug: string
  ): Promise<void> {
    await this.axios.delete(`/v3/configs/config/dynamic_secrets/dynamic_secret/leases/lease`, {
      params: { project, config, dynamic_secret: dynamicSecret, slug }
    });
  }
}
