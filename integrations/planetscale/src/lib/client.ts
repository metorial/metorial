import { createAxios } from 'slates';
import { planetscaleApiError } from './errors';

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

export interface PlanetScaleStorage {
  minimumStorageBytes?: number;
  maximumStorageBytes?: number;
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

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw planetscaleApiError(error, operation);
    }
  }

  private storageBody(storage?: PlanetScaleStorage): Record<string, number> | undefined {
    let body: Record<string, number> = {};
    if (storage?.minimumStorageBytes !== undefined) {
      body.minimum_storage_bytes = storage.minimumStorageBytes;
    }
    if (storage?.maximumStorageBytes !== undefined) {
      body.maximum_storage_bytes = storage.maximumStorageBytes;
    }

    return Object.keys(body).length > 0 ? body : undefined;
  }

  // ---- Organizations ----

  async listOrganizations(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list organizations', () =>
      api.get('/organizations', {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getOrganization(): Promise<any> {
    return await this.request('get organization', () =>
      api.get(this.orgPath(), { headers: this.headers })
    );
  }

  // ---- Databases ----

  async listDatabases(
    pagination?: PaginationParams,
    query?: string
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (query) params.q = query;
    let data = await this.request<any>('list databases', () =>
      api.get(this.orgPath('/databases'), {
        headers: this.headers,
        params
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getDatabase(database: string): Promise<any> {
    return await this.request('get database', () =>
      api.get(this.dbPath(database), { headers: this.headers })
    );
  }

  async createDatabase(data: {
    name: string;
    clusterSize: string;
    region?: string;
    replicas?: number;
    kind?: string;
    majorVersion?: string;
    storage?: PlanetScaleStorage;
  }): Promise<any> {
    let body: Record<string, any> = { name: data.name, cluster_size: data.clusterSize };
    if (data.region) body.region = data.region;
    if (data.replicas !== undefined) body.replicas = data.replicas;
    if (data.kind) body.kind = data.kind;
    if (data.majorVersion) body.major_version = data.majorVersion;
    let storage = this.storageBody(data.storage);
    if (storage) body.storage = storage;

    return await this.request('create database', () =>
      api.post(this.orgPath('/databases'), body, { headers: this.headers })
    );
  }

  async updateDatabase(
    database: string,
    data: {
      newName?: string;
      automaticMigrations?: boolean;
      migrationFramework?: string;
      migrationTableName?: string;
      requireApprovalForDeploy?: boolean;
      restrictBranchRegion?: boolean;
      allowForeignKeyConstraints?: boolean;
      allowDataBranching?: boolean;
      insightsRawQueries?: boolean;
      productionBranchWebConsole?: boolean;
      defaultBranch?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.newName !== undefined) body.new_name = data.newName;
    if (data.automaticMigrations !== undefined)
      body.automatic_migrations = data.automaticMigrations;
    if (data.migrationFramework !== undefined)
      body.migration_framework = data.migrationFramework;
    if (data.migrationTableName !== undefined)
      body.migration_table_name = data.migrationTableName;
    if (data.requireApprovalForDeploy !== undefined)
      body.require_approval_for_deploy = data.requireApprovalForDeploy;
    if (data.restrictBranchRegion !== undefined)
      body.restrict_branch_region = data.restrictBranchRegion;
    if (data.allowForeignKeyConstraints !== undefined)
      body.allow_foreign_key_constraints = data.allowForeignKeyConstraints;
    if (data.allowDataBranching !== undefined)
      body.allow_data_branching = data.allowDataBranching;
    if (data.insightsRawQueries !== undefined)
      body.insights_raw_queries = data.insightsRawQueries;
    if (data.productionBranchWebConsole !== undefined)
      body.production_branch_web_console = data.productionBranchWebConsole;
    if (data.defaultBranch !== undefined) body.default_branch = data.defaultBranch;

    return await this.request('update database', () =>
      api.patch(this.dbPath(database), body, { headers: this.headers })
    );
  }

  async deleteDatabase(database: string): Promise<void> {
    await this.request('delete database', () =>
      api.delete(this.dbPath(database), { headers: this.headers })
    );
  }

  // ---- Branches ----

  async listBranches(
    database: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list branches', () =>
      api.get(this.dbPath(database, '/branches'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getBranch(database: string, branch: string): Promise<any> {
    return await this.request('get branch', () =>
      api.get(this.branchPath(database, branch), { headers: this.headers })
    );
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
      createDatabaseIfMissing?: boolean;
      kind?: string;
      storage?: PlanetScaleStorage;
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
    if (data.createDatabaseIfMissing !== undefined)
      body.create_database_if_missing = data.createDatabaseIfMissing;
    if (data.kind) body.kind = data.kind;
    let storage = this.storageBody(data.storage);
    if (storage) body.storage = storage;

    return await this.request('create branch', () =>
      api.post(this.dbPath(database, '/branches'), body, {
        headers: this.headers
      })
    );
  }

  async deleteBranch(database: string, branch: string): Promise<void> {
    await this.request('delete branch', () =>
      api.delete(this.branchPath(database, branch), { headers: this.headers })
    );
  }

  async promoteBranch(database: string, branch: string): Promise<any> {
    return await this.request('promote branch', () =>
      api.post(this.branchPath(database, branch, '/promote'), {}, { headers: this.headers })
    );
  }

  async demoteBranch(database: string, branch: string): Promise<any> {
    return await this.request('demote branch', () =>
      api.post(this.branchPath(database, branch, '/demote'), {}, { headers: this.headers })
    );
  }

  async enableSafeMigrations(database: string, branch: string): Promise<any> {
    return await this.request('enable safe migrations', () =>
      api.post(
        this.branchPath(database, branch, '/enable-safe-migrations'),
        {},
        { headers: this.headers }
      )
    );
  }

  async disableSafeMigrations(database: string, branch: string): Promise<any> {
    return await this.request('disable safe migrations', () =>
      api.post(
        this.branchPath(database, branch, '/disable-safe-migrations'),
        {},
        { headers: this.headers }
      )
    );
  }

  async getBranchSchema(database: string, branch: string): Promise<any> {
    return await this.request('get branch schema', () =>
      api.get(this.branchPath(database, branch, '/schema'), {
        headers: this.headers
      })
    );
  }

  async lintBranchSchema(database: string, branch: string): Promise<any> {
    return await this.request('lint branch schema', () =>
      api.post(
        this.branchPath(database, branch, '/schema/lint'),
        {},
        { headers: this.headers }
      )
    );
  }

  // ---- Deploy Requests ----

  async listDeployRequests(
    database: string,
    pagination?: PaginationParams,
    state?: string
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (state) params.state = state;
    let data = await this.request<any>('list deploy requests', () =>
      api.get(this.dbPath(database, '/deploy-requests'), {
        headers: this.headers,
        params
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getDeployRequest(database: string, number: number): Promise<any> {
    return await this.request('get deploy request', () =>
      api.get(this.dbPath(database, `/deploy-requests/${number}`), {
        headers: this.headers
      })
    );
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

    return await this.request('create deploy request', () =>
      api.post(this.dbPath(database, '/deploy-requests'), body, {
        headers: this.headers
      })
    );
  }

  async deployDeployRequest(
    database: string,
    number: number,
    data?: { instantDdl?: boolean }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data?.instantDdl !== undefined) body.instant_ddl = data.instantDdl;

    return await this.request('queue deploy request', () =>
      api.post(this.dbPath(database, `/deploy-requests/${number}/deploy`), body, {
        headers: this.headers
      })
    );
  }

  async cancelDeployRequest(database: string, number: number): Promise<any> {
    return await this.request('cancel deploy request', () =>
      api.post(
        this.dbPath(database, `/deploy-requests/${number}/cancel`),
        {},
        {
          headers: this.headers
        }
      )
    );
  }

  async closeDeployRequest(database: string, number: number): Promise<any> {
    return await this.request('close deploy request', () =>
      api.patch(
        this.dbPath(database, `/deploy-requests/${number}`),
        { state: 'closed' },
        {
          headers: this.headers
        }
      )
    );
  }

  async skipRevertPeriod(database: string, number: number): Promise<any> {
    return await this.request('skip deploy request revert period', () =>
      api.post(
        this.dbPath(database, `/deploy-requests/${number}/skip-revert-period`),
        {},
        {
          headers: this.headers
        }
      )
    );
  }

  async completeRevert(database: string, number: number): Promise<any> {
    return await this.request('complete deploy request revert', () =>
      api.post(
        this.dbPath(database, `/deploy-requests/${number}/complete-revert`),
        {},
        {
          headers: this.headers
        }
      )
    );
  }

  async reviewDeployRequest(
    database: string,
    number: number,
    data: {
      state: string;
      body?: string;
    }
  ): Promise<any> {
    return await this.request('review deploy request', () =>
      api.post(
        this.dbPath(database, `/deploy-requests/${number}/reviews`),
        {
          state: data.state,
          body: data.body
        },
        { headers: this.headers }
      )
    );
  }

  async getDeployment(database: string, number: number): Promise<any> {
    return await this.request('get deployment', () =>
      api.get(this.dbPath(database, `/deploy-requests/${number}/deployment`), {
        headers: this.headers
      })
    );
  }

  async listDeployOperations(
    database: string,
    number: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list deploy operations', () =>
      api.get(this.dbPath(database, `/deploy-requests/${number}/operations`), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async checkDeployRequestStorage(database: string, number: number): Promise<any> {
    return await this.request('check deploy request storage', () =>
      api.get(this.dbPath(database, `/deploy-requests/${number}/storage-check`), {
        headers: this.headers
      })
    );
  }

  // ---- Passwords ----

  async listPasswords(
    database: string,
    branch: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list passwords', () =>
      api.get(this.branchPath(database, branch, '/passwords'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getPassword(database: string, branch: string, passwordId: string): Promise<any> {
    return await this.request('get password', () =>
      api.get(this.branchPath(database, branch, `/passwords/${passwordId}`), {
        headers: this.headers
      })
    );
  }

  async createPassword(
    database: string,
    branch: string,
    data: {
      name?: string;
      replica?: boolean;
      ttl?: number;
      cidrs?: string[];
      directVtgate?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name) body.name = data.name;
    if (data.replica !== undefined) body.replica = data.replica;
    if (data.ttl) body.ttl = data.ttl;
    if (data.cidrs) body.cidrs = data.cidrs;
    if (data.directVtgate !== undefined) body.direct_vtgate = data.directVtgate;

    return await this.request('create password', () =>
      api.post(this.branchPath(database, branch, '/passwords'), body, {
        headers: this.headers
      })
    );
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

    return await this.request('update password', () =>
      api.patch(this.branchPath(database, branch, `/passwords/${passwordId}`), body, {
        headers: this.headers
      })
    );
  }

  async deletePassword(database: string, branch: string, passwordId: string): Promise<void> {
    await this.request('delete password', () =>
      api.delete(this.branchPath(database, branch, `/passwords/${passwordId}`), {
        headers: this.headers
      })
    );
  }

  async renewPassword(database: string, branch: string, passwordId: string): Promise<any> {
    return await this.request('renew password', () =>
      api.post(
        this.branchPath(database, branch, `/passwords/${passwordId}/renew`),
        {},
        {
          headers: this.headers
        }
      )
    );
  }

  // ---- Backups ----

  async listBackups(
    database: string,
    branch: string,
    pagination?: PaginationParams,
    filters?: {
      all?: boolean;
      state?: string;
      policy?: string;
      from?: string;
      to?: string;
      runningAt?: string;
      production?: boolean;
    }
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { ...this.paginationParams(pagination) };
    if (filters?.all !== undefined) params.all = filters.all;
    if (filters?.state) params.state = filters.state;
    if (filters?.policy) params.policy = filters.policy;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.runningAt) params.running_at = filters.runningAt;
    if (filters?.production !== undefined) params.production = filters.production;

    let data = await this.request<any>('list backups', () =>
      api.get(this.branchPath(database, branch, '/backups'), {
        headers: this.headers,
        params
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getBackup(database: string, branch: string, backupId: string): Promise<any> {
    return await this.request('get backup', () =>
      api.get(this.branchPath(database, branch, `/backups/${backupId}`), {
        headers: this.headers
      })
    );
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

    return await this.request('create backup', () =>
      api.post(this.branchPath(database, branch, '/backups'), body, {
        headers: this.headers
      })
    );
  }

  async updateBackup(
    database: string,
    branch: string,
    backupId: string,
    data: {
      protected: boolean;
    }
  ): Promise<any> {
    return await this.request('update backup', () =>
      api.patch(
        this.branchPath(database, branch, `/backups/${backupId}`),
        { protected: data.protected },
        { headers: this.headers }
      )
    );
  }

  async deleteBackup(database: string, branch: string, backupId: string): Promise<void> {
    await this.request('delete backup', () =>
      api.delete(this.branchPath(database, branch, `/backups/${backupId}`), {
        headers: this.headers
      })
    );
  }

  // ---- Webhooks ----

  async listWebhooks(
    database: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list webhooks', () =>
      api.get(this.dbPath(database, '/webhooks'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getWebhook(database: string, webhookId: string): Promise<any> {
    return await this.request('get webhook', () =>
      api.get(this.dbPath(database, `/webhooks/${webhookId}`), {
        headers: this.headers
      })
    );
  }

  async createWebhook(
    database: string,
    data: {
      url: string;
      enabled?: boolean;
      events?: string[];
    }
  ): Promise<any> {
    return await this.request('create webhook', () =>
      api.post(this.dbPath(database, '/webhooks'), data, {
        headers: this.headers
      })
    );
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
    return await this.request('update webhook', () =>
      api.patch(this.dbPath(database, `/webhooks/${webhookId}`), data, {
        headers: this.headers
      })
    );
  }

  async deleteWebhook(database: string, webhookId: string): Promise<void> {
    await this.request('delete webhook', () =>
      api.delete(this.dbPath(database, `/webhooks/${webhookId}`), {
        headers: this.headers
      })
    );
  }

  async testWebhook(database: string, webhookId: string): Promise<any> {
    return await this.request('test webhook', () =>
      api.post(
        this.dbPath(database, `/webhooks/${webhookId}/test`),
        {},
        {
          headers: this.headers
        }
      )
    );
  }

  // ---- Organization Members ----

  async listMembers(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list organization members', () =>
      api.get(this.orgPath('/members'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async getMember(memberId: string): Promise<any> {
    return await this.request('get organization member', () =>
      api.get(this.orgPath(`/members/${memberId}`), {
        headers: this.headers
      })
    );
  }

  async removeMember(memberId: string): Promise<void> {
    await this.request('remove organization member', () =>
      api.delete(this.orgPath(`/members/${memberId}`), { headers: this.headers })
    );
  }

  // ---- Regions ----

  async listRegions(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list organization regions', () =>
      api.get(this.orgPath('/regions'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async listClusterSizes(filters?: {
    engine?: string;
    rates?: boolean;
    region?: string;
  }): Promise<any[]> {
    let params: Record<string, any> = {};
    if (filters?.engine) params.engine = filters.engine;
    if (filters?.rates !== undefined) params.rates = filters.rates;
    if (filters?.region) params.region = filters.region;

    return await this.request('list cluster sizes', () =>
      api.get(this.orgPath('/cluster-size-skus'), {
        headers: this.headers,
        params
      })
    );
  }

  // ---- Service Tokens ----

  async listServiceTokens(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    let data = await this.request<any>('list service tokens', () =>
      api.get(this.orgPath('/service-tokens'), {
        headers: this.headers,
        params: this.paginationParams(pagination)
      })
    );
    return this.mapPaginatedResponse(data);
  }

  async createServiceToken(data?: { name?: string; ttl?: number }): Promise<any> {
    let body: Record<string, any> = {};
    if (data?.name) body.name = data.name;
    if (data?.ttl) body.ttl = data.ttl;

    return await this.request('create service token', () =>
      api.post(this.orgPath('/service-tokens'), body, {
        headers: this.headers
      })
    );
  }

  async getServiceToken(tokenId: string): Promise<any> {
    return await this.request('get service token', () =>
      api.get(this.orgPath(`/service-tokens/${tokenId}`), {
        headers: this.headers
      })
    );
  }

  async deleteServiceToken(tokenId: string): Promise<void> {
    await this.request('delete service token', () =>
      api.delete(this.orgPath(`/service-tokens/${tokenId}`), { headers: this.headers })
    );
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

    let data = await this.request<any>('list audit logs', () =>
      api.get(this.orgPath('/audit-log'), {
        headers: this.headers,
        params
      })
    );
    return this.mapPaginatedResponse(data);
  }
}
