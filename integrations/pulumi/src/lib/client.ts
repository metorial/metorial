import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private options: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: options.baseUrl
    });
  }

  private get headers() {
    return {
      Authorization: `token ${this.options.token}`,
      Accept: 'application/vnd.pulumi+8',
      'Content-Type': 'application/json'
    };
  }

  // ── User ──────────────────────────────────────────────

  async getCurrentUser(): Promise<any> {
    let response = await this.axios.get('/api/user', { headers: this.headers });
    return response.data;
  }

  // ── Stacks ────────────────────────────────────────────

  async listStacks(params?: {
    organization?: string;
    project?: string;
    tagName?: string;
    tagValue?: string;
    continuationToken?: string;
  }): Promise<{ stacks: any[]; continuationToken?: string }> {
    let response = await this.axios.get('/api/user/stacks', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getStack(org: string, project: string, stack: string): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createStack(org: string, project: string, stackName: string): Promise<any> {
    let response = await this.axios.post(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}`,
      { stackName },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteStack(
    org: string,
    project: string,
    stack: string,
    force?: boolean
  ): Promise<void> {
    await this.axios.delete(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}`,
      {
        headers: this.headers,
        params: force ? { force: true } : undefined
      }
    );
  }

  async getStackExport(org: string, project: string, stack: string): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/export`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Stack Tags ────────────────────────────────────────

  async setStackTag(
    org: string,
    project: string,
    stack: string,
    name: string,
    value: string
  ): Promise<void> {
    await this.axios.post(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/tags`,
      { name, value },
      { headers: this.headers }
    );
  }

  async deleteStackTag(
    org: string,
    project: string,
    stack: string,
    tagName: string
  ): Promise<void> {
    await this.axios.delete(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/tags/${encodeURIComponent(tagName)}`,
      { headers: this.headers }
    );
  }

  // ── Stack Updates ─────────────────────────────────────

  async listStackUpdates(
    org: string,
    project: string,
    stack: string,
    params?: {
      page?: number;
      pageSize?: number;
      outputType?: string;
    }
  ): Promise<{ updates: any[] }> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/updates`,
      {
        headers: this.headers,
        params: params
          ? { page: params.page, pageSize: params.pageSize, 'output-type': params.outputType }
          : undefined
      }
    );
    return response.data;
  }

  async getUpdateStatus(
    org: string,
    project: string,
    stack: string,
    updateId: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/update/${encodeURIComponent(updateId)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async listUpdateEvents(
    org: string,
    project: string,
    stack: string,
    updateId: string
  ): Promise<{ events: any[]; continuationToken?: string }> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/update/${encodeURIComponent(updateId)}/events`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Deployments ───────────────────────────────────────

  async createDeployment(
    org: string,
    project: string,
    stack: string,
    body: {
      operation: string;
      inheritSettings?: boolean;
      operationContext?: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async getDeployment(
    org: string,
    project: string,
    stack: string,
    deploymentId: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments/${encodeURIComponent(deploymentId)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async listDeployments(
    org: string,
    project: string,
    stack: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async listOrgDeployments(
    org: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/deployments`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async cancelDeployment(
    org: string,
    project: string,
    stack: string,
    deploymentId: string
  ): Promise<void> {
    await this.axios.post(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments/${encodeURIComponent(deploymentId)}/cancel`,
      {},
      { headers: this.headers }
    );
  }

  async getDeploymentLogs(
    org: string,
    project: string,
    stack: string,
    deploymentId: string,
    params?: {
      continuationToken?: string;
      count?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments/${encodeURIComponent(deploymentId)}/logs`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getDeploymentSettings(org: string, project: string, stack: string): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/deployments/settings`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Environments (ESC) ────────────────────────────────

  async listEnvironments(
    org: string,
    continuationToken?: string
  ): Promise<{ environments: any[]; nextToken?: string }> {
    let response = await this.axios.get(`/api/esc/environments/${encodeURIComponent(org)}`, {
      headers: this.headers,
      params: continuationToken ? { continuationToken } : undefined
    });
    return response.data;
  }

  async createEnvironment(org: string, project: string, environment: string): Promise<void> {
    await this.axios.post(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      {},
      { headers: this.headers }
    );
  }

  async getEnvironment(org: string, project: string, environment: string): Promise<string> {
    let response = await this.axios.get(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async updateEnvironment(
    org: string,
    project: string,
    environment: string,
    yaml: string
  ): Promise<void> {
    await this.axios.patch(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      yaml,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/x-yaml'
        }
      }
    );
  }

  async deleteEnvironment(org: string, project: string, environment: string): Promise<void> {
    await this.axios.delete(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}`,
      { headers: this.headers }
    );
  }

  async openEnvironment(
    org: string,
    project: string,
    environment: string,
    duration?: string
  ): Promise<{ id: string }> {
    let response = await this.axios.post(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}/open`,
      {},
      {
        headers: this.headers,
        params: duration ? { duration } : undefined
      }
    );
    return response.data;
  }

  async readOpenEnvironment(
    org: string,
    project: string,
    environment: string,
    sessionId: string,
    property?: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/api/esc/environments/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(environment)}/open/${encodeURIComponent(sessionId)}`,
      {
        headers: this.headers,
        params: property ? { property } : undefined
      }
    );
    return response.data;
  }

  // ── Resource Search ───────────────────────────────────

  async searchResources(org: string, query: string, properties?: boolean): Promise<any> {
    let response = await this.axios.get(
      `/api/orgs/${encodeURIComponent(org)}/search/resources`,
      {
        headers: {
          ...this.headers,
          Accept: 'application/json'
        },
        params: { query, properties }
      }
    );
    return response.data;
  }

  // ── Audit Logs ────────────────────────────────────────

  async listAuditLogs(
    org: string,
    params: {
      startTime: number;
      userFilter?: string;
      continuationToken?: string;
    }
  ): Promise<{ auditLogEvents: any[]; continuationToken?: string }> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/auditlogs`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ── Organization ──────────────────────────────────────

  async listOrgMembers(org: string, continuationToken?: string): Promise<{ members: any[] }> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/members`, {
      headers: this.headers,
      params: continuationToken ? { continuationToken } : undefined
    });
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────

  async createOrgWebhook(
    org: string,
    body: {
      active: boolean;
      displayName: string;
      payloadUrl: string;
      format?: string;
      filters?: string[];
      secret?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/orgs/${encodeURIComponent(org)}/hooks`,
      { ...body, organizationName: org },
      { headers: this.headers }
    );
    return response.data;
  }

  async createStackWebhook(
    org: string,
    project: string,
    stack: string,
    body: {
      active: boolean;
      displayName: string;
      payloadUrl: string;
      format?: string;
      filters?: string[];
      secret?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/hooks`,
      { ...body, organizationName: org, projectName: project, stackName: stack },
      { headers: this.headers }
    );
    return response.data;
  }

  async listOrgWebhooks(org: string): Promise<any[]> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/hooks`, {
      headers: this.headers
    });
    return response.data;
  }

  async listStackWebhooks(org: string, project: string, stack: string): Promise<any[]> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/hooks`,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteOrgWebhook(org: string, webhookName: string): Promise<void> {
    await this.axios.delete(
      `/api/orgs/${encodeURIComponent(org)}/hooks/${encodeURIComponent(webhookName)}`,
      { headers: this.headers }
    );
  }

  async deleteStackWebhook(
    org: string,
    project: string,
    stack: string,
    webhookName: string
  ): Promise<void> {
    await this.axios.delete(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/hooks/${encodeURIComponent(webhookName)}`,
      { headers: this.headers }
    );
  }

  async getOrgWebhook(org: string, webhookName: string): Promise<any> {
    let response = await this.axios.get(
      `/api/orgs/${encodeURIComponent(org)}/hooks/${encodeURIComponent(webhookName)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Access Tokens ─────────────────────────────────────

  async listPersonalAccessTokens(showExpired?: boolean): Promise<{ tokens: any[] }> {
    let response = await this.axios.get('/api/user/tokens', {
      headers: this.headers,
      params: showExpired ? { show_expired: true } : undefined
    });
    return response.data;
  }

  async createPersonalAccessToken(description: string, expires?: number): Promise<any> {
    let response = await this.axios.post(
      '/api/user/tokens',
      { description, expires: expires || 0 },
      { headers: this.headers }
    );
    return response.data;
  }

  async deletePersonalAccessToken(tokenId: string): Promise<void> {
    await this.axios.delete(`/api/user/tokens/${encodeURIComponent(tokenId)}`, {
      headers: this.headers
    });
  }

  // ── Policy Packs ──────────────────────────────────────

  async listPolicyPacks(org: string): Promise<{ policyPacks: any[] }> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/policypacks`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPolicyPackVersion(org: string, policyPack: string, version: string): Promise<any> {
    let response = await this.axios.get(
      `/api/orgs/${encodeURIComponent(org)}/policypacks/${encodeURIComponent(policyPack)}/versions/${encodeURIComponent(version)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getStackPolicyGroups(org: string, project: string, stack: string): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/policygroups`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Teams ─────────────────────────────────────────────

  async listTeams(org: string): Promise<any> {
    let response = await this.axios.get(`/api/orgs/${encodeURIComponent(org)}/teams`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTeam(org: string, teamName: string): Promise<any> {
    let response = await this.axios.get(
      `/api/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(teamName)}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Stack Resources ───────────────────────────────────

  async getStackResources(org: string, project: string, stack: string): Promise<any> {
    let response = await this.axios.get(
      `/api/stacks/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(stack)}/resources/latest`,
      { headers: this.headers }
    );
    return response.data;
  }
}
