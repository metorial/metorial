import { createAxios } from '@slates/provider';
import { vercelApiError } from './errors';

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private teamId?: string;

  constructor(config: { token: string; teamId?: string }) {
    this.teamId = config.teamId;
    this.axios = createAxios({
      baseURL: 'https://api.vercel.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(vercelApiError(error))
    );
  }

  private teamParams(extra?: Record<string, string | undefined>): Record<string, string> {
    let params: Record<string, string> = {};
    if (this.teamId) {
      params.teamId = this.teamId;
    }
    if (extra) {
      for (let [k, v] of Object.entries(extra)) {
        if (v !== undefined) {
          params[k] = v;
        }
      }
    }
    return params;
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(options?: { search?: string; limit?: number; from?: string }) {
    let response = await this.axios.get('/v10/projects', {
      params: this.teamParams({
        search: options?.search,
        limit: options?.limit?.toString(),
        from: options?.from
      })
    });
    return response.data;
  }

  async getProject(idOrName: string) {
    let response = await this.axios.get(`/v9/projects/${encodeURIComponent(idOrName)}`, {
      params: this.teamParams()
    });
    return response.data;
  }

  async createProject(data: {
    name: string;
    framework?: string;
    buildCommand?: string;
    installCommand?: string;
    devCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    publicSource?: boolean;
    serverlessFunctionRegion?: string;
    environmentVariables?: Array<{
      key: string;
      value: string;
      target: string[];
      type?: string;
    }>;
    gitRepository?: { type: string; repo: string };
  }) {
    let response = await this.axios.post('/v11/projects', data, {
      params: this.teamParams()
    });
    return response.data;
  }

  async updateProject(idOrName: string, data: Record<string, any>) {
    let response = await this.axios.patch(
      `/v9/projects/${encodeURIComponent(idOrName)}`,
      data,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async deleteProject(idOrName: string) {
    await this.axios.delete(`/v9/projects/${encodeURIComponent(idOrName)}`, {
      params: this.teamParams()
    });
  }

  // ─── Deployments ───────────────────────────────────────────

  async listDeployments(options?: {
    projectId?: string;
    target?: string;
    state?: string;
    limit?: number;
    since?: number;
    until?: number;
  }) {
    let response = await this.axios.get('/v6/deployments', {
      params: this.teamParams({
        projectId: options?.projectId,
        target: options?.target,
        state: options?.state,
        limit: options?.limit?.toString(),
        since: options?.since?.toString(),
        until: options?.until?.toString()
      })
    });
    return response.data;
  }

  async getDeployment(idOrUrl: string) {
    let response = await this.axios.get(`/v13/deployments/${encodeURIComponent(idOrUrl)}`, {
      params: this.teamParams()
    });
    return response.data;
  }

  async getDeploymentEvents(
    idOrUrl: string,
    options?: {
      direction?: string;
      limit?: number;
      buildId?: string;
      since?: number;
      until?: number;
      statusCode?: string;
      delimiter?: boolean;
      builds?: boolean;
    }
  ) {
    let response = await this.axios.get(
      `/v3/deployments/${encodeURIComponent(idOrUrl)}/events`,
      {
        params: this.teamParams({
          direction: options?.direction,
          limit: options?.limit?.toString(),
          name: options?.buildId,
          since: options?.since?.toString(),
          until: options?.until?.toString(),
          statusCode: options?.statusCode,
          delimiter:
            options?.delimiter === undefined ? undefined : options.delimiter ? '1' : '0',
          builds: options?.builds === undefined ? undefined : options.builds ? '1' : '0'
        })
      }
    );
    return response.data;
  }

  async createDeployment(data: {
    name: string;
    project?: string;
    target?: string;
    gitSource?: { type: string; ref: string; repoId?: string; sha?: string };
    deploymentId?: string;
    files?: Array<{ file: string; data: string; encoding?: string }>;
    projectSettings?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v13/deployments', data, {
      params: this.teamParams()
    });
    return response.data;
  }

  async cancelDeployment(deploymentId: string) {
    let response = await this.axios.patch(
      `/v12/deployments/${encodeURIComponent(deploymentId)}/cancel`,
      {},
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async deleteDeployment(deploymentId: string) {
    await this.axios.delete(`/v13/deployments/${encodeURIComponent(deploymentId)}`, {
      params: this.teamParams()
    });
  }

  // ─── Aliases ──────────────────────────────────────────────

  async listAliases(options?: {
    domain?: string;
    projectId?: string;
    limit?: number;
    since?: number;
    until?: number;
    rollbackDeploymentId?: string;
  }) {
    let response = await this.axios.get('/v4/aliases', {
      params: this.teamParams({
        domain: options?.domain,
        projectId: options?.projectId,
        limit: options?.limit?.toString(),
        since: options?.since?.toString(),
        until: options?.until?.toString(),
        rollbackDeploymentId: options?.rollbackDeploymentId
      })
    });
    return response.data;
  }

  async getAlias(
    idOrAlias: string,
    options?: { projectId?: string; since?: number; until?: number }
  ) {
    let response = await this.axios.get(`/v4/aliases/${encodeURIComponent(idOrAlias)}`, {
      params: this.teamParams({
        projectId: options?.projectId,
        since: options?.since?.toString(),
        until: options?.until?.toString()
      })
    });
    return response.data;
  }

  async listDeploymentAliases(deploymentId: string) {
    let response = await this.axios.get(
      `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async assignAlias(deploymentId: string, data: { alias: string; redirect?: string | null }) {
    let response = await this.axios.post(
      `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`,
      data,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async deleteAlias(aliasIdOrAlias: string) {
    let response = await this.axios.delete(
      `/v2/aliases/${encodeURIComponent(aliasIdOrAlias)}`,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  // ─── Domains ───────────────────────────────────────────────

  async listDomains(options?: { limit?: number; since?: number; until?: number }) {
    let response = await this.axios.get('/v5/domains', {
      params: this.teamParams({
        limit: options?.limit?.toString(),
        since: options?.since?.toString(),
        until: options?.until?.toString()
      })
    });
    return response.data;
  }

  async getDomain(name: string) {
    let response = await this.axios.get(`/v5/domains/${encodeURIComponent(name)}`, {
      params: this.teamParams()
    });
    return response.data;
  }

  async addDomain(name: string) {
    let response = await this.axios.post(
      '/v5/domains',
      { name },
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async removeDomain(name: string) {
    await this.axios.delete(`/v6/domains/${encodeURIComponent(name)}`, {
      params: this.teamParams()
    });
  }

  async getDomainConfig(name: string) {
    let response = await this.axios.get(`/v6/domains/${encodeURIComponent(name)}/config`, {
      params: this.teamParams()
    });
    return response.data;
  }

  // ─── Project Domains ──────────────────────────────────────

  async listProjectDomains(projectId: string) {
    let response = await this.axios.get(
      `/v9/projects/${encodeURIComponent(projectId)}/domains`,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async addProjectDomain(
    projectId: string,
    domain: string,
    options?: { redirect?: string; redirectStatusCode?: number; gitBranch?: string }
  ) {
    let response = await this.axios.post(
      `/v10/projects/${encodeURIComponent(projectId)}/domains`,
      {
        name: domain,
        ...options
      },
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async removeProjectDomain(projectId: string, domain: string) {
    await this.axios.delete(
      `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
      {
        params: this.teamParams()
      }
    );
  }

  async verifyProjectDomain(projectId: string, domain: string) {
    let response = await this.axios.post(
      `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      {},
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  // ─── Environment Variables ─────────────────────────────────

  async listEnvVars(projectId: string) {
    let response = await this.axios.get(`/v9/projects/${encodeURIComponent(projectId)}/env`, {
      params: this.teamParams()
    });
    return response.data;
  }

  async createEnvVar(
    projectId: string,
    envVar: {
      key: string;
      value: string;
      target: string[];
      type?: string;
      gitBranch?: string;
      comment?: string;
    },
    upsert?: boolean
  ) {
    let response = await this.axios.post(
      `/v10/projects/${encodeURIComponent(projectId)}/env`,
      envVar,
      {
        params: this.teamParams({
          upsert: upsert ? 'true' : undefined
        })
      }
    );
    return response.data;
  }

  async updateEnvVar(
    projectId: string,
    envVarId: string,
    data: {
      value?: string;
      target?: string[];
      type?: string;
      gitBranch?: string;
      comment?: string;
    }
  ) {
    let response = await this.axios.patch(
      `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envVarId)}`,
      data,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async deleteEnvVar(projectId: string, envVarId: string) {
    await this.axios.delete(
      `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envVarId)}`,
      {
        params: this.teamParams()
      }
    );
  }

  // ─── DNS Records ──────────────────────────────────────────

  async listDnsRecords(domain: string, options?: { limit?: number }) {
    let response = await this.axios.get(`/v4/domains/${encodeURIComponent(domain)}/records`, {
      params: this.teamParams({
        limit: options?.limit?.toString()
      })
    });
    return response.data;
  }

  async createDnsRecord(
    domain: string,
    record: {
      name: string;
      type: string;
      value: string;
      ttl?: number;
      mxPriority?: number;
      srv?: { priority: number; weight: number; port: number; target: string };
    }
  ) {
    let response = await this.axios.post(
      `/v2/domains/${encodeURIComponent(domain)}/records`,
      record,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async updateDnsRecord(recordId: string, data: Record<string, any>) {
    let response = await this.axios.patch(
      `/v1/domains/records/${encodeURIComponent(recordId)}`,
      data,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async deleteDnsRecord(domain: string, recordId: string) {
    await this.axios.delete(
      `/v2/domains/${encodeURIComponent(domain)}/records/${encodeURIComponent(recordId)}`,
      {
        params: this.teamParams()
      }
    );
  }

  // ─── Teams ─────────────────────────────────────────────────

  async listTeams(options?: { limit?: number; since?: number; until?: number }) {
    let response = await this.axios.get('/v2/teams', {
      params: {
        limit: options?.limit?.toString(),
        since: options?.since?.toString(),
        until: options?.until?.toString()
      }
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.get(`/v2/teams/${encodeURIComponent(teamId)}`);
    return response.data;
  }

  async listTeamMembers(
    teamId: string,
    options?: { limit?: number; since?: number; role?: string; search?: string }
  ) {
    let response = await this.axios.get(`/v2/teams/${encodeURIComponent(teamId)}/members`, {
      params: {
        limit: options?.limit?.toString(),
        since: options?.since?.toString(),
        role: options?.role,
        search: options?.search
      }
    });
    return response.data;
  }

  async inviteTeamMember(teamId: string, email: string, role?: string) {
    let response = await this.axios.post(`/v1/teams/${encodeURIComponent(teamId)}/members`, {
      email,
      role: role || 'MEMBER'
    });
    return response.data;
  }

  async removeTeamMember(teamId: string, userId: string) {
    await this.axios.delete(
      `/v1/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`
    );
  }

  // ─── Edge Config ───────────────────────────────────────────

  async listEdgeConfigs() {
    let response = await this.axios.get('/v1/edge-config', {
      params: this.teamParams()
    });
    return response.data;
  }

  async getEdgeConfig(edgeConfigId: string) {
    let response = await this.axios.get(
      `/v1/edge-config/${encodeURIComponent(edgeConfigId)}`,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async createEdgeConfig(data: { slug: string }) {
    let response = await this.axios.post('/v1/edge-config', data, {
      params: this.teamParams()
    });
    return response.data;
  }

  async deleteEdgeConfig(edgeConfigId: string) {
    await this.axios.delete(`/v1/edge-config/${encodeURIComponent(edgeConfigId)}`, {
      params: this.teamParams()
    });
  }

  async getEdgeConfigItems(edgeConfigId: string) {
    let response = await this.axios.get(
      `/v1/edge-config/${encodeURIComponent(edgeConfigId)}/items`,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async updateEdgeConfigItems(
    edgeConfigId: string,
    items: Array<{ operation: string; key: string; value?: any }>
  ) {
    let response = await this.axios.patch(
      `/v1/edge-config/${encodeURIComponent(edgeConfigId)}/items`,
      { items },
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  // ─── Log Drains ────────────────────────────────────────────

  async listLogDrains(projectId?: string) {
    let path = projectId
      ? `/v1/projects/${encodeURIComponent(projectId)}/log-drains`
      : '/v1/log-drains';
    let response = await this.axios.get(path, {
      params: this.teamParams()
    });
    return response.data;
  }

  async createLogDrain(data: {
    name: string;
    url: string;
    type: string;
    projectIds?: string[];
    deliveryFormat?: string;
    sources?: string[];
    environments?: string[];
  }) {
    let response = await this.axios.post('/v1/log-drains', data, {
      params: this.teamParams()
    });
    return response.data;
  }

  async deleteLogDrain(logDrainId: string) {
    await this.axios.delete(`/v1/log-drains/${encodeURIComponent(logDrainId)}`, {
      params: this.teamParams()
    });
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/v1/webhooks', {
      params: this.teamParams()
    });
    return response.data;
  }

  async createWebhook(data: { url: string; events: string[]; projectIds?: string[] }) {
    let response = await this.axios.post('/v1/webhooks', data, {
      params: this.teamParams()
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/v1/webhooks/${encodeURIComponent(webhookId)}`, {
      params: this.teamParams()
    });
  }

  // ─── Deploy Hooks ─────────────────────────────────────────

  async createDeployHook(projectId: string, data: { name: string; ref: string }) {
    let response = await this.axios.post(
      `/v1/projects/${encodeURIComponent(projectId)}/deploy-hooks`,
      data,
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }

  async listDeployHooks(projectId: string) {
    let project = await this.getProject(projectId);
    return project.link?.deployHooks || [];
  }

  async deleteDeployHook(projectId: string, hookId: string) {
    await this.axios.delete(
      `/v1/projects/${encodeURIComponent(projectId)}/deploy-hooks/${encodeURIComponent(hookId)}`,
      {
        params: this.teamParams()
      }
    );
  }

  // ─── User ─────────────────────────────────────────────────

  async getUser() {
    let response = await this.axios.get('/v2/user');
    return response.data;
  }

  // ─── Promote / Rollback ───────────────────────────────────

  async promoteDeployment(projectId: string, deploymentId: string) {
    let response = await this.axios.post(
      `/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}`,
      {},
      {
        params: this.teamParams()
      }
    );
    return response.data;
  }
}
