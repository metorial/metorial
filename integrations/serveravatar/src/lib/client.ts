import { createAxios } from 'slates';

export class ServerAvatarClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.serveravatar.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'content-type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Organizations ----

  async listOrganizations(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/organizations');
    return response.data.organizations || response.data;
  }

  async getOrganization(organizationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/organizations/${organizationId}`);
    return response.data.organization || response.data;
  }

  // ---- Server Providers ----

  async listServerProviders(
    organizationId: string,
    params?: {
      page?: number;
      provider?: string;
      search?: string;
    }
  ): Promise<{
    providers: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (params?.page) queryParams.page = String(params.page);
    if (params?.provider) queryParams.provider = params.provider;
    if (params?.search) queryParams.search = params.search;

    let response = await this.axios.get(
      `/organizations/${organizationId}/cloud-server-providers`,
      { params: queryParams }
    );
    let data = response.data;
    return {
      providers: data.data || [],
      pagination: {
        currentPage: data.current_page,
        lastPage: data.last_page,
        perPage: data.per_page,
        total: data.total
      }
    };
  }

  async getProviderRegions(
    organizationId: string,
    providerId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/cloud-server-providers/${providerId}/regions`
    );
    return response.data.regions || response.data;
  }

  async getProviderSizes(
    organizationId: string,
    providerId: string,
    region: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/cloud-server-providers/${providerId}/sizes`,
      {
        params: { region }
      }
    );
    return response.data.sizes || response.data;
  }

  // ---- Servers ----

  async listServers(
    organizationId: string,
    params?: {
      page?: number;
    }
  ): Promise<{
    servers: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (params?.page) queryParams.page = String(params.page);

    let response = await this.axios.get(`/organizations/${organizationId}/servers`, {
      params: queryParams
    });
    let data = response.data;
    let serversData = data.servers || data;
    return {
      servers: serversData.data || serversData || [],
      pagination: {
        currentPage: serversData.current_page,
        lastPage: serversData.last_page,
        perPage: serversData.per_page,
        total: serversData.total
      }
    };
  }

  async getServer(organizationId: string, serverId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}`
    );
    return response.data.server || response.data;
  }

  async createServer(
    organizationId: string,
    params: {
      name: string;
      provider: string;
      cloudServerProviderId: number;
      version: string;
      region: string;
      sizeSlug: string;
      webServer: string;
      databaseType: string;
      nodejs: boolean;
      sshKey?: boolean;
      publicKey?: string;
      availabilityZone?: string;
      yarn?: boolean;
      linodeRootPassword?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      provider: params.provider,
      cloud_server_provider_id: params.cloudServerProviderId,
      version: params.version,
      region: params.region,
      sizeSlug: params.sizeSlug,
      web_server: params.webServer,
      database_type: params.databaseType,
      nodejs: params.nodejs,
      ssh_key: params.sshKey ?? false
    };

    if (params.publicKey) body.public_key = params.publicKey;
    if (params.availabilityZone) body.availabilityZone = params.availabilityZone;
    if (params.yarn !== undefined) body.yarn = params.yarn;
    if (params.linodeRootPassword) body.linode_root_password = params.linodeRootPassword;

    let response = await this.axios.post(`/organizations/${organizationId}/servers`, body);
    return response.data.server || response.data;
  }

  async updateServerGeneralSettings(
    organizationId: string,
    serverId: string,
    params: {
      name: string;
      hostname: string;
      phpCliVersion?: number;
      olsAutomaticallyRestart?: boolean;
      timezone: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      hostname: params.hostname,
      timezone: params.timezone,
      ols_automatically_restart: params.olsAutomaticallyRestart ?? false
    };
    if (params.phpCliVersion) body.php_cli_version = params.phpCliVersion;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/settings/general`,
      body
    );
    return response.data;
  }

  async updateServerSecuritySettings(
    organizationId: string,
    serverId: string,
    params: {
      redisPassword: string;
      sshPort: number;
      permitRootLogin: string;
      rootPasswordAuthentication: string;
      redisMaxmemory?: string;
      maxmemoryPolicy?: string;
      isEnabledSecurityUpdates?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      redis_password: params.redisPassword,
      ssh_port: params.sshPort,
      permit_root_login: params.permitRootLogin,
      root_password_authentication: params.rootPasswordAuthentication
    };
    if (params.redisMaxmemory) body.redis_maxmemory = params.redisMaxmemory;
    if (params.maxmemoryPolicy) body.maxmemory_policy = params.maxmemoryPolicy;
    if (params.isEnabledSecurityUpdates !== undefined)
      body.is_enabled_security_updates = params.isEnabledSecurityUpdates;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/settings/security`,
      body
    );
    return response.data;
  }

  async destroyServer(
    organizationId: string,
    serverId: string,
    deleteFromProvider?: boolean
  ): Promise<Record<string, unknown>> {
    let params: Record<string, string> = {};
    if (deleteFromProvider) params.deleteFromProvider = '1';

    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}`,
      { params }
    );
    return response.data;
  }

  async restartServer(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/restart`
    );
    return response.data;
  }

  async getServerResourceUsage(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/usage`
    );
    return response.data;
  }

  async getServerSummary(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/summary`
    );
    return response.data;
  }

  // ---- Server Services ----

  async listServices(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/services`
    );
    return response.data.services || response.data;
  }

  async updateService(
    organizationId: string,
    serverId: string,
    service: string,
    action: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/services`,
      {
        service,
        action
      }
    );
    return response.data;
  }

  // ---- Applications ----

  async listApplications(
    organizationId: string,
    params?: {
      serverId?: string;
      page?: number;
    }
  ): Promise<{
    applications: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (params?.page) queryParams.page = String(params.page);

    let url = params?.serverId
      ? `/organizations/${organizationId}/servers/${params.serverId}/applications`
      : `/organizations/${organizationId}/applications`;

    let response = await this.axios.get(url, { params: queryParams });
    let data = response.data;
    let appsData = data.applications || data;
    return {
      applications: appsData.data || appsData || [],
      pagination: {
        currentPage: appsData.current_page,
        lastPage: appsData.last_page,
        perPage: appsData.per_page,
        total: appsData.total
      }
    };
  }

  async getApplication(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}`
    );
    return response.data;
  }

  async createApplication(
    organizationId: string,
    serverId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/applications`,
      params
    );
    return response.data;
  }

  async destroyApplication(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}`
    );
    return response.data;
  }

  // ---- Application Domains ----

  async listDomains(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/domains`
    );
    return response.data.domains || response.data;
  }

  async addDomain(
    organizationId: string,
    serverId: string,
    applicationId: string,
    domain: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/domains`,
      {
        domain
      }
    );
    return response.data;
  }

  async removeDomain(
    organizationId: string,
    serverId: string,
    applicationId: string,
    domainId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/domains/${domainId}`
    );
    return response.data;
  }

  // ---- SSL ----

  async getSSL(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl`
    );
    return response.data;
  }

  async installSSL(
    organizationId: string,
    serverId: string,
    applicationId: string,
    params: {
      sslType: string;
      forceHttps: boolean;
      sslCertificate?: string;
      privateKey?: string;
      chainFile?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      ssl_type: params.sslType,
      force_https: params.forceHttps
    };
    if (params.sslCertificate) body.ssl_certificate = params.sslCertificate;
    if (params.privateKey) body.private_key = params.privateKey;
    if (params.chainFile) body.chain_file = params.chainFile;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl`,
      body
    );
    return response.data;
  }

  async updateSSL(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl`
    );
    return response.data;
  }

  async uninstallSSL(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl`
    );
    return response.data;
  }

  async forceHttps(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl/force-https`
    );
    return response.data;
  }

  async stopForceHttps(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/ssl/stop-force-http`
    );
    return response.data;
  }

  // ---- Databases ----

  async listDatabases(
    organizationId: string,
    params?: {
      serverId?: string;
      page?: number;
      search?: string;
    }
  ): Promise<{
    databases: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (params?.page) queryParams.page = String(params.page);
    if (params?.search) queryParams.search = params.search;

    let url = params?.serverId
      ? `/organizations/${organizationId}/servers/${params.serverId}/databases`
      : `/organizations/${organizationId}/databases`;

    let response = await this.axios.get(url, { params: queryParams });
    let data = response.data;
    let dbData = data.databases || data;
    return {
      databases: dbData.data || dbData || [],
      pagination: {
        currentPage: dbData.current_page,
        lastPage: dbData.last_page,
        perPage: dbData.per_page,
        total: dbData.total
      }
    };
  }

  async createDatabase(
    organizationId: string,
    serverId: string,
    params: {
      name: string;
      username: string;
      password: string;
      connectionPreference?: string;
      hostname?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      username: params.username,
      password: params.password
    };
    if (params.connectionPreference) body.connection_preference = params.connectionPreference;
    if (params.hostname) body.hostname = params.hostname;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/databases`,
      body
    );
    return response.data;
  }

  async destroyDatabase(
    organizationId: string,
    serverId: string,
    databaseId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/databases/${databaseId}`
    );
    return response.data;
  }

  // ---- Firewall ----

  async toggleFirewall(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/firewall`
    );
    return response.data;
  }

  async listFirewallRules(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/firewall-rules`
    );
    let data = response.data;
    return data.firewallRules?.data || data.firewallRules || data.data || [];
  }

  async createFirewallRule(
    organizationId: string,
    serverId: string,
    params: {
      startPort: number;
      traffic: string;
      protocol: string;
      endPort?: number;
      ip?: string;
      description?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      start_port: params.startPort,
      traffic: params.traffic,
      protocol: params.protocol
    };
    if (params.endPort) body.end_port = String(params.endPort);
    if (params.ip) body.ip = params.ip;
    if (params.description) body.description = params.description;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/firewall-rules`,
      body
    );
    return response.data;
  }

  async destroyFirewallRule(
    organizationId: string,
    serverId: string,
    firewallRuleId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/firewall-rules/${firewallRuleId}`
    );
    return response.data;
  }

  // ---- Cron Jobs ----

  async listCronJobs(
    organizationId: string,
    serverId: string,
    page?: number
  ): Promise<{
    cronJobs: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (page) queryParams.page = String(page);

    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/cronjobs`,
      { params: queryParams }
    );
    let data = response.data;
    let cronData = data.cronjobs || data;
    return {
      cronJobs: cronData.data || cronData || [],
      pagination: {
        currentPage: cronData.current_page,
        lastPage: cronData.last_page,
        perPage: cronData.per_page,
        total: cronData.total
      }
    };
  }

  async createCronJob(
    organizationId: string,
    serverId: string,
    params: {
      name: string;
      command: string;
      systemUser: string;
      schedule?: string;
      customScheduling?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      command: params.command,
      system_user: params.systemUser
    };
    if (params.schedule) body.schedule = params.schedule;
    if (params.customScheduling) body.custom_scheduling = params.customScheduling;

    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/cronjobs`,
      body
    );
    return response.data;
  }

  async destroyCronJob(
    organizationId: string,
    serverId: string,
    cronJobId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/organizations/${organizationId}/servers/${serverId}/cronjobs/${cronJobId}`
    );
    return response.data;
  }

  // ---- Backups ----

  async listBackups(
    organizationId: string,
    page?: number
  ): Promise<{
    backups: Record<string, unknown>[];
    pagination: Record<string, unknown>;
  }> {
    let queryParams: Record<string, string> = { pagination: '1' };
    if (page) queryParams.page = String(page);

    let response = await this.axios.get(`/organizations/${organizationId}/backups`, {
      params: queryParams
    });
    let data = response.data;
    let backupData = data.backups || data;
    return {
      backups: backupData.data || backupData || [],
      pagination: {
        currentPage: backupData.current_page,
        lastPage: backupData.last_page,
        perPage: backupData.per_page,
        total: backupData.total
      }
    };
  }

  // ---- System Users ----

  async listSystemUsers(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/system-users`
    );
    return response.data.systemUsers || response.data.data || response.data || [];
  }

  async createSystemUser(
    organizationId: string,
    serverId: string,
    params: {
      username: string;
      password: string;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/organizations/${organizationId}/servers/${serverId}/system-users`,
      {
        username: params.username,
        password: params.password
      }
    );
    return response.data;
  }

  // ---- Application Logs ----

  async getApplicationLogs(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/logs`
    );
    return response.data;
  }

  // ---- Server Logs ----

  async getServerLogs(
    organizationId: string,
    serverId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/logs`
    );
    return response.data;
  }

  // ---- SFTP Credentials ----

  async getSftpCredentials(
    organizationId: string,
    serverId: string,
    applicationId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/organizations/${organizationId}/servers/${serverId}/applications/${applicationId}/sftp-credentials`
    );
    return response.data;
  }
}
