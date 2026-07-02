import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private organizationSlug: string;

  constructor(config: { token: string; organizationSlug: string }) {
    this.organizationSlug = config.organizationSlug;
    this.axios = createAxios({
      baseURL: 'https://api.turso.tech',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private orgPath(path: string) {
    return `/v1/organizations/${this.organizationSlug}${path}`;
  }

  // ---- Databases ----

  async listDatabases() {
    let response = await this.axios.get(this.orgPath('/databases'));
    return response.data as { databases: TursoDatabase[] };
  }

  async createDatabase(params: CreateDatabaseParams) {
    let response = await this.axios.post(this.orgPath('/databases'), params);
    return response.data as { database: TursoDatabase };
  }

  async getDatabase(databaseName: string) {
    let response = await this.axios.get(this.orgPath(`/databases/${databaseName}`));
    return response.data as { database: TursoDatabase };
  }

  async deleteDatabase(databaseName: string) {
    let response = await this.axios.delete(this.orgPath(`/databases/${databaseName}`));
    return response.data as { database: string };
  }

  async getDatabaseConfiguration(databaseName: string) {
    let response = await this.axios.get(
      this.orgPath(`/databases/${databaseName}/configuration`)
    );
    return response.data as DatabaseConfiguration;
  }

  async updateDatabaseConfiguration(
    databaseName: string,
    config: Partial<DatabaseConfiguration>
  ) {
    let response = await this.axios.patch(
      this.orgPath(`/databases/${databaseName}/configuration`),
      config
    );
    return response.data as DatabaseConfiguration;
  }

  async getDatabaseUsage(databaseName: string, from?: string, to?: string) {
    let params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    let response = await this.axios.get(this.orgPath(`/databases/${databaseName}/usage`), {
      params
    });
    return response.data as { database: DatabaseUsage };
  }

  async getDatabaseStats(databaseName: string) {
    let response = await this.axios.get(this.orgPath(`/databases/${databaseName}/stats`));
    return response.data as { top_queries: TopQuery[] };
  }

  async listDatabaseInstances(databaseName: string) {
    let response = await this.axios.get(this.orgPath(`/databases/${databaseName}/instances`));
    return response.data as { instances: DatabaseInstance[] };
  }

  async getDatabaseInstance(databaseName: string, instanceName: string) {
    let response = await this.axios.get(
      this.orgPath(`/databases/${databaseName}/instances/${instanceName}`)
    );
    return response.data as { instance: DatabaseInstance };
  }

  async createDatabaseToken(
    databaseName: string,
    params?: { expiration?: string; authorization?: string }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.expiration) queryParams.expiration = params.expiration;
    if (params?.authorization) queryParams.authorization = params.authorization;
    let response = await this.axios.post(
      this.orgPath(`/databases/${databaseName}/auth/tokens`),
      {},
      { params: queryParams }
    );
    return response.data as { jwt: string };
  }

  async invalidateDatabaseTokens(databaseName: string) {
    let response = await this.axios.post(
      this.orgPath(`/databases/${databaseName}/auth/rotate`)
    );
    return response.data;
  }

  // ---- Groups ----

  async listGroups() {
    let response = await this.axios.get(this.orgPath('/groups'));
    return response.data as { groups: TursoGroup[] };
  }

  async createGroup(params: CreateGroupParams) {
    let response = await this.axios.post(this.orgPath('/groups'), params);
    return response.data as { group: TursoGroup };
  }

  async getGroup(groupName: string) {
    let response = await this.axios.get(this.orgPath(`/groups/${groupName}`));
    return response.data as { group: TursoGroup };
  }

  async deleteGroup(groupName: string) {
    let response = await this.axios.delete(this.orgPath(`/groups/${groupName}`));
    return response.data as { group: TursoGroup };
  }

  async addGroupLocation(groupName: string, location: string) {
    let response = await this.axios.post(
      this.orgPath(`/groups/${groupName}/locations/${location}`)
    );
    return response.data as { group: TursoGroup };
  }

  async removeGroupLocation(groupName: string, location: string) {
    let response = await this.axios.delete(
      this.orgPath(`/groups/${groupName}/locations/${location}`)
    );
    return response.data as { group: TursoGroup };
  }

  async createGroupToken(
    groupName: string,
    params?: { expiration?: string; authorization?: string }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.expiration) queryParams.expiration = params.expiration;
    if (params?.authorization) queryParams.authorization = params.authorization;
    let response = await this.axios.post(
      this.orgPath(`/groups/${groupName}/auth/tokens`),
      {},
      { params: queryParams }
    );
    return response.data as { jwt: string };
  }

  async invalidateGroupTokens(groupName: string) {
    let response = await this.axios.post(this.orgPath(`/groups/${groupName}/auth/rotate`));
    return response.data;
  }

  async transferGroup(groupName: string, targetOrganization: string) {
    let response = await this.axios.post(this.orgPath(`/groups/${groupName}/transfer`), {
      organization: targetOrganization
    });
    return response.data;
  }

  async unarchiveGroup(groupName: string) {
    let response = await this.axios.post(this.orgPath(`/groups/${groupName}/unarchive`));
    return response.data as { group: TursoGroup };
  }

  async getGroupConfiguration(groupName: string) {
    let response = await this.axios.get(this.orgPath(`/groups/${groupName}/configuration`));
    return response.data;
  }

  async updateGroupConfiguration(groupName: string, config: Record<string, unknown>) {
    let response = await this.axios.patch(
      this.orgPath(`/groups/${groupName}/configuration`),
      config
    );
    return response.data;
  }

  // ---- Locations ----

  async listLocations() {
    let response = await this.axios.get('/v1/locations');
    return response.data as { locations: Record<string, string> };
  }

  async getClosestRegion() {
    let response = await this.axios.get('/v1/locations/closest');
    return response.data as { server: string };
  }

  // ---- Organizations ----

  async listOrganizations() {
    let response = await this.axios.get('/v1/organizations');
    return response.data as TursoOrganization[];
  }

  async getOrganization() {
    let response = await this.axios.get(`/v1/organizations/${this.organizationSlug}`);
    return response.data as TursoOrganization;
  }

  async updateOrganization(params: { overages?: boolean }) {
    let response = await this.axios.patch(
      `/v1/organizations/${this.organizationSlug}`,
      params
    );
    return response.data as TursoOrganization;
  }

  async getOrganizationUsage() {
    let response = await this.axios.get(this.orgPath('/usage'));
    return response.data as { organization: OrganizationUsage };
  }

  async getOrganizationSubscription() {
    let response = await this.axios.get(this.orgPath('/subscription'));
    return response.data as { subscription: string };
  }

  async listOrganizationPlans() {
    let response = await this.axios.get(this.orgPath('/plans'));
    return response.data as { plans: Record<string, unknown>[] };
  }

  async listInvoices() {
    let response = await this.axios.get(this.orgPath('/invoices'));
    return response.data as { invoices: Invoice[] };
  }

  // ---- Members ----

  async listMembers() {
    let response = await this.axios.get(this.orgPath('/members'));
    return response.data as { members: OrganizationMember[] };
  }

  async addMember(username: string, role: string) {
    let response = await this.axios.post(this.orgPath('/members'), { member: username, role });
    return response.data as { member: string; role: string };
  }

  async removeMember(username: string) {
    let response = await this.axios.delete(this.orgPath(`/members/${username}`));
    return response.data as { member: string };
  }

  async getMember(username: string) {
    let response = await this.axios.get(this.orgPath(`/members/${username}`));
    return response.data as { member: OrganizationMember };
  }

  // ---- Invites ----

  async listInvites() {
    let response = await this.axios.get(this.orgPath('/invites'));
    return response.data as { invites: Invite[] };
  }

  async createInvite(email: string, role: string) {
    let response = await this.axios.post(this.orgPath('/invites'), { email, role });
    return response.data as { invited: Invite };
  }

  async deleteInvite(email: string) {
    let response = await this.axios.delete(this.orgPath(`/invites/${email}`));
    return response.data;
  }

  // ---- API Tokens ----

  async listApiTokens() {
    let response = await this.axios.get('/v1/auth/api-tokens');
    return response.data as { tokens: ApiToken[] };
  }

  async createApiToken(tokenName: string) {
    let response = await this.axios.post(`/v1/auth/api-tokens/${tokenName}`);
    return response.data as { id: string; name: string; token: string };
  }

  async revokeApiToken(tokenName: string) {
    let response = await this.axios.delete(`/v1/auth/api-tokens/${tokenName}`);
    return response.data as { token: string };
  }

  async validateApiToken() {
    let response = await this.axios.get('/v1/auth/api-tokens/validate');
    return response.data as { exp: number };
  }

  // ---- Audit Logs ----

  async listAuditLogs(params?: { page?: number; pageSize?: number }) {
    let queryParams: Record<string, string | number> = {};
    if (params?.page !== undefined) queryParams.page_size = params.pageSize ?? 20;
    if (params?.page !== undefined) queryParams.page = params.page;
    let response = await this.axios.get(this.orgPath('/audit-logs'), { params: queryParams });
    return response.data as { audit_logs: AuditLog[]; pagination: Pagination };
  }
}

// ---- Types ----

export interface TursoDatabase {
  Name: string;
  DbId: string;
  Hostname: string;
  block_reads: boolean;
  block_writes: boolean;
  allow_attach: boolean;
  regions: string[];
  primaryRegion: string;
  type: string;
  version: string;
  group: string;
  is_schema: boolean;
  schema?: string;
  sleeping: boolean;
}

export interface CreateDatabaseParams {
  name: string;
  group: string;
  seed?: {
    type?: 'database' | 'dump';
    name?: string;
    url?: string;
    timestamp?: string;
  };
  size_limit?: string;
  is_schema?: boolean;
  schema?: string;
}

export interface DatabaseConfiguration {
  size_limit?: string;
  allow_attach?: boolean;
  block_reads?: boolean;
  block_writes?: boolean;
}

export interface DatabaseUsage {
  uuid: string;
  instances: {
    uuid: string;
    usage: {
      rows_read: number;
      rows_written: number;
      storage_bytes: number;
    };
  }[];
}

export interface TopQuery {
  query: string;
  rows_read: number;
  rows_written: number;
}

export interface DatabaseInstance {
  uuid: string;
  name: string;
  type: string;
  region: string;
  hostname: string;
}

export interface TursoGroup {
  name: string;
  uuid: string;
  locations: string[];
  primary: string;
  archived: boolean;
  version: string;
}

export interface CreateGroupParams {
  name: string;
  location: string;
  extensions?: string;
}

export interface TursoOrganization {
  name: string;
  slug: string;
  type: string;
  overages: boolean;
  blocked_reads: boolean;
  blocked_writes: boolean;
}

export interface OrganizationUsage {
  uuid: string;
  usage: {
    rows_read: number;
    rows_written: number;
    storage_bytes: number;
    databases: number;
    locations: number;
    groups: number;
  };
}

export interface OrganizationMember {
  username: string;
  role: string;
  email?: string;
}

export interface Invite {
  email: string;
  role: string;
  accepted: boolean;
  created_at?: string;
}

export interface Invoice {
  invoice_number: string;
  amount_due: string;
  due_date: string;
  paid_at: string;
  payment_failed_at: string;
  invoice_pdf: string;
}

export interface ApiToken {
  id: string;
  name: string;
  token?: string;
}

export interface AuditLog {
  code: string;
  message: string;
  origin: string;
  author: string;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_rows: number;
}
