import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.planetscale.com/v1'
});

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  nextPage: number | null;
  nextPageUrl: string | null;
  prevPage: number | null;
  prevPageUrl: string | null;
  data: T[];
}

export class Client {
  private headers: Record<string, string>;
  private organization: string;

  constructor(config: { token: string; authType: string; organization: string }) {
    this.organization = config.organization;
    if (config.authType === 'oauth') {
      this.headers = {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };
    } else {
      this.headers = {
        Authorization: config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };
    }
  }

  private orgPath(path: string = ''): string {
    return `/organizations/${this.organization}${path}`;
  }

  private dbPath(database: string, path: string = ''): string {
    return this.orgPath(`/databases/${database}${path}`);
  }

  private branchPath(database: string, branch: string, path: string = ''): string {
    return this.dbPath(database, `/branches/${branch}${path}`);
  }

  private paginationParams(params?: PaginationParams): Record<string, string | number> {
    let result: Record<string, string | number> = {};
    if (params?.page) result.page = params.page;
    if (params?.perPage) result.per_page = params.perPage;
    return result;
  }

  private mapPaginatedResponse<T>(data: any): PaginatedResponse<T> {
    return {
      currentPage: data.current_page,
      nextPage: data.next_page,
      nextPageUrl: data.next_page_url,
      prevPage: data.prev_page,
      prevPageUrl: data.prev_page_url,
      data: data.data
    };
  }

  // ---- Organizations ----

  async listOrganizations(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/organizations', {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getOrganization(): Promise<any> {
    let response = await api.get(this.orgPath(), { headers: this.headers });
    return response.data;
  }

  // ---- Databases ----

  async listDatabases(
    pagination?: PaginationParams,
    query?: string
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (query) params.q = query;
    let response = await api.get(this.orgPath('/databases'), {
      headers: this.headers,
      params
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getDatabase(database: string): Promise<any> {
    let response = await api.get(this.dbPath(database), { headers: this.headers });
    return response.data;
  }

  async createDatabase(data: {
    name: string;
    clusterSize?: string;
    region?: string;
    replicas?: number;
    kind?: string;
    majorVersion?: string;
  }): Promise<any> {
    let body: Record<string, any> = { name: data.name };
    if (data.clusterSize) body.cluster_size = data.clusterSize;
    if (data.region) body.region = data.region;
    if (data.replicas !== undefined) body.replicas = data.replicas;
    if (data.kind) body.kind = data.kind;
    if (data.majorVersion) body.major_version = data.majorVersion;

    let response = await api.post(this.orgPath('/databases'), body, { headers: this.headers });
    return response.data;
  }

  async updateDatabase(
    database: string,
    data: {
      requireApprovalForDeploy?: boolean;
      foreignKeysEnabled?: boolean;
      allowDataBranching?: boolean;
      insightsEnabled?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.requireApprovalForDeploy !== undefined)
      body.require_approval_for_deploy = data.requireApprovalForDeploy;
    if (data.foreignKeysEnabled !== undefined)
      body.foreign_keys_enabled = data.foreignKeysEnabled;
    if (data.allowDataBranching !== undefined)
      body.allow_data_branching = data.allowDataBranching;
    if (data.insightsEnabled !== undefined) body.insights_enabled = data.insightsEnabled;

    let response = await api.patch(this.dbPath(database), body, { headers: this.headers });
    return response.data;
  }

  async deleteDatabase(database: string): Promise<void> {
    await api.delete(this.dbPath(database), { headers: this.headers });
  }

  // ---- Branches ----

  async listBranches(
    database: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.dbPath(database, '/branches'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getBranch(database: string, branch: string): Promise<any> {
    let response = await api.get(this.branchPath(database, branch), { headers: this.headers });
    return response.data;
  }

  async createBranch(
    database: string,
    data: {
      name: string;
      parentBranch?: string;
      backupId?: string;
      region?: string;
      restorePoint?: string;
      seedData?: string;
      clusterSize?: string;
      majorVersion?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = { name: data.name };
    if (data.parentBranch) body.parent_branch = data.parentBranch;
    if (data.backupId) body.backup_id = data.backupId;
    if (data.region) body.region = data.region;
    if (data.restorePoint) body.restore_point = data.restorePoint;
    if (data.seedData) body.seed_data = data.seedData;
    if (data.clusterSize) body.cluster_size = data.clusterSize;
    if (data.majorVersion) body.major_version = data.majorVersion;

    let response = await api.post(this.dbPath(database, '/branches'), body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteBranch(database: string, branch: string): Promise<void> {
    await api.delete(this.branchPath(database, branch), { headers: this.headers });
  }

  async promoteBranch(database: string, branch: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, '/promote'),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async demoteBranch(database: string, branch: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, '/demote'),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async enableSafeMigrations(database: string, branch: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, '/enable-safe-migrations'),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async disableSafeMigrations(database: string, branch: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, '/disable-safe-migrations'),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getBranchSchema(database: string, branch: string): Promise<any> {
    let response = await api.get(this.branchPath(database, branch, '/schema'), {
      headers: this.headers
    });
    return response.data;
  }

  async lintBranchSchema(database: string, branch: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, '/schema/lint'),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Deploy Requests ----

  async listDeployRequests(
    database: string,
    pagination?: PaginationParams,
    state?: string
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (state) params.state = state;
    let response = await api.get(this.dbPath(database, '/deploy-requests'), {
      headers: this.headers,
      params
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getDeployRequest(database: string, number: number): Promise<any> {
    let response = await api.get(this.dbPath(database, `/deploy-requests/${number}`), {
      headers: this.headers
    });
    return response.data;
  }

  async createDeployRequest(
    database: string,
    data: {
      branch: string;
      intoBranch: string;
      notes?: string;
      autoCutover?: boolean;
      autoDeleteBranch?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      branch: data.branch,
      into_branch: data.intoBranch
    };
    if (data.notes) body.notes = data.notes;
    if (data.autoCutover !== undefined) body.auto_cutover = data.autoCutover;
    if (data.autoDeleteBranch !== undefined) body.auto_delete_branch = data.autoDeleteBranch;

    let response = await api.post(this.dbPath(database, '/deploy-requests'), body, {
      headers: this.headers
    });
    return response.data;
  }

  async deployDeployRequest(database: string, number: number): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/deploy`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async cancelDeployRequest(database: string, number: number): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/cancel`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async closeDeployRequest(database: string, number: number): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/close`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async skipRevertPeriod(database: string, number: number): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/skip-revert-period`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async completeRevert(database: string, number: number): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/complete-revert`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async reviewDeployRequest(
    database: string,
    number: number,
    data: {
      state: string;
      body?: string;
    }
  ): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/deploy-requests/${number}/reviews`),
      {
        state: data.state,
        body: data.body
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getDeployment(database: string, number: number): Promise<any> {
    let response = await api.get(
      this.dbPath(database, `/deploy-requests/${number}/deployment`),
      { headers: this.headers }
    );
    return response.data;
  }

  async listDeployOperations(
    database: string,
    number: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(
      this.dbPath(database, `/deploy-requests/${number}/operations`),
      {
        headers: this.headers,
        params: this.paginationParams(pagination)
      }
    );
    return this.mapPaginatedResponse(response.data);
  }

  // ---- Passwords ----

  async listPasswords(
    database: string,
    branch: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.branchPath(database, branch, '/passwords'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getPassword(database: string, branch: string, passwordId: string): Promise<any> {
    let response = await api.get(
      this.branchPath(database, branch, `/passwords/${passwordId}`),
      { headers: this.headers }
    );
    return response.data;
  }

  async createPassword(
    database: string,
    branch: string,
    data: {
      name?: string;
      role: string;
      replica?: boolean;
      ttl?: number;
      cidrs?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = { role: data.role };
    if (data.name) body.name = data.name;
    if (data.replica !== undefined) body.replica = data.replica;
    if (data.ttl) body.ttl = data.ttl;
    if (data.cidrs) body.cidrs = data.cidrs;

    let response = await api.post(this.branchPath(database, branch, '/passwords'), body, {
      headers: this.headers
    });
    return response.data;
  }

  async updatePassword(
    database: string,
    branch: string,
    passwordId: string,
    data: {
      name?: string;
      cidrs?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.cidrs !== undefined) body.cidrs = data.cidrs;

    let response = await api.patch(
      this.branchPath(database, branch, `/passwords/${passwordId}`),
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async deletePassword(database: string, branch: string, passwordId: string): Promise<void> {
    await api.delete(this.branchPath(database, branch, `/passwords/${passwordId}`), {
      headers: this.headers
    });
  }

  async renewPassword(database: string, branch: string, passwordId: string): Promise<any> {
    let response = await api.post(
      this.branchPath(database, branch, `/passwords/${passwordId}/renew`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Backups ----

  async listBackups(
    database: string,
    branch: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.branchPath(database, branch, '/backups'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getBackup(database: string, branch: string, backupId: string): Promise<any> {
    let response = await api.get(this.branchPath(database, branch, `/backups/${backupId}`), {
      headers: this.headers
    });
    return response.data;
  }

  async createBackup(
    database: string,
    branch: string,
    data?: {
      name?: string;
      retentionUnit?: string;
      retentionValue?: number;
      emergency?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data?.name) body.name = data.name;
    if (data?.retentionUnit) body.retention_unit = data.retentionUnit;
    if (data?.retentionValue) body.retention_value = data.retentionValue;
    if (data?.emergency !== undefined) body.emergency = data.emergency;

    let response = await api.post(this.branchPath(database, branch, '/backups'), body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteBackup(database: string, branch: string, backupId: string): Promise<void> {
    await api.delete(this.branchPath(database, branch, `/backups/${backupId}`), {
      headers: this.headers
    });
  }

  // ---- Webhooks ----

  async listWebhooks(
    database: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.dbPath(database, '/webhooks'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getWebhook(database: string, webhookId: string): Promise<any> {
    let response = await api.get(this.dbPath(database, `/webhooks/${webhookId}`), {
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(
    database: string,
    data: {
      url: string;
      enabled?: boolean;
      events?: string[];
    }
  ): Promise<any> {
    let response = await api.post(this.dbPath(database, '/webhooks'), data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWebhook(
    database: string,
    webhookId: string,
    data: {
      url?: string;
      enabled?: boolean;
      events?: string[];
    }
  ): Promise<any> {
    let response = await api.patch(this.dbPath(database, `/webhooks/${webhookId}`), data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(database: string, webhookId: string): Promise<void> {
    await api.delete(this.dbPath(database, `/webhooks/${webhookId}`), {
      headers: this.headers
    });
  }

  async testWebhook(database: string, webhookId: string): Promise<any> {
    let response = await api.post(
      this.dbPath(database, `/webhooks/${webhookId}/test`),
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Organization Members ----

  async listMembers(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.orgPath('/members'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getMember(memberId: string): Promise<any> {
    let response = await api.get(this.orgPath(`/members/${memberId}`), {
      headers: this.headers
    });
    return response.data;
  }

  async removeMember(memberId: string): Promise<void> {
    await api.delete(this.orgPath(`/members/${memberId}`), { headers: this.headers });
  }

  // ---- Regions ----

  async listRegions(): Promise<any> {
    let response = await api.get(this.orgPath('/regions'), { headers: this.headers });
    return response.data;
  }

  // ---- Service Tokens ----

  async listServiceTokens(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get(this.orgPath('/service-tokens'), {
      headers: this.headers,
      params: this.paginationParams(pagination)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async createServiceToken(data?: { name?: string; ttl?: number }): Promise<any> {
    let body: Record<string, any> = {};
    if (data?.name) body.name = data.name;
    if (data?.ttl) body.ttl = data.ttl;

    let response = await api.post(this.orgPath('/service-tokens'), body, {
      headers: this.headers
    });
    return response.data;
  }

  async getServiceToken(tokenId: string): Promise<any> {
    let response = await api.get(this.orgPath(`/service-tokens/${tokenId}`), {
      headers: this.headers
    });
    return response.data;
  }

  async deleteServiceToken(tokenId: string): Promise<void> {
    await api.delete(this.orgPath(`/service-tokens/${tokenId}`), { headers: this.headers });
  }

  // ---- Audit Logs ----

  async listAuditLogs(
    pagination?: PaginationParams,
    filters?: {
      action?: string;
      actorId?: string;
      since?: string;
      until?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (filters?.action) params.action = filters.action;
    if (filters?.actorId) params.actor_id = filters.actorId;
    if (filters?.since) params.since = filters.since;
    if (filters?.until) params.until = filters.until;

    let response = await api.get(this.orgPath('/audit-log'), {
      headers: this.headers,
      params
    });
    return this.mapPaginatedResponse(response.data);
  }
}
