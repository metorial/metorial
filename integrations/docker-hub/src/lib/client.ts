import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Repository {
  namespace: string;
  name: string;
  description: string;
  full_description: string;
  is_private: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  status: number;
  repository_type: string;
  content_types: string[];
}

export interface Tag {
  name: string;
  full_size: number;
  last_updated: string;
  last_updater_username: string;
  digest: string;
  tag_status: string;
  images: TagImage[];
}

export interface TagImage {
  architecture: string;
  os: string;
  size: number;
  digest: string;
  last_pulled: string | null;
  last_pushed: string | null;
  status: string;
}

export interface OrgMember {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  date_joined: string;
  groups: string[];
}

export interface Team {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

export interface Webhook {
  id: number;
  name: string;
  active: boolean;
  expect_final_callback: boolean;
  webhooks: WebhookHook[];
  creator: string;
  last_updated: string;
  created: string;
}

export interface WebhookHook {
  id: number;
  hook_url: string;
  last_updated: string;
  created: string;
}

export interface PersonalAccessToken {
  uuid: string;
  client_id: string;
  creator_ip: string;
  creator_ua: string;
  created_at: string;
  last_used: string | null;
  generated_by: string;
  is_active: boolean;
  token: string;
  token_label: string;
  scopes: string[];
}

export interface SearchRepository {
  repo_name: string;
  short_description: string;
  star_count: number;
  pull_count: number;
  is_official: boolean;
  is_automated: boolean;
}

export interface AuditLogEvent {
  account: string;
  action: string;
  name: string;
  actor: string;
  data: Record<string, unknown>;
  timestamp: string;
  action_description: string;
}

export interface AuditLogAction {
  name: string;
  description: string;
}

export class Client {
  private http;

  constructor(opts: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://hub.docker.com',
      headers: {
        Authorization: `JWT ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Repositories ─────────────────────────────────────────────

  async listRepositories(
    namespace: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Repository>> {
    let response = await this.http.get(`/v2/namespaces/${namespace}/repositories`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<Repository>;
  }

  async getRepository(namespace: string, repository: string) {
    let response = await this.http.get(
      `/v2/namespaces/${namespace}/repositories/${repository}`
    );
    return response.data;
  }

  async createRepository(
    namespace: string,
    data: {
      name: string;
      description?: string;
      full_description?: string;
      is_private?: boolean;
    }
  ) {
    let response = await this.http.post(`/v2/namespaces/${namespace}/repositories`, data);
    return response.data;
  }

  async updateRepository(
    namespace: string,
    repository: string,
    data: {
      description?: string;
      full_description?: string;
      is_private?: boolean;
    }
  ) {
    let response = await this.http.patch(
      `/v2/namespaces/${namespace}/repositories/${repository}`,
      data
    );
    return response.data;
  }

  async deleteRepository(namespace: string, repository: string) {
    await this.http.delete(`/v2/namespaces/${namespace}/repositories/${repository}`);
  }

  // ── Tags ─────────────────────────────────────────────────────

  async listTags(
    namespace: string,
    repository: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Tag>> {
    let response = await this.http.get(
      `/v2/namespaces/${namespace}/repositories/${repository}/tags`,
      { params: { page: params?.page, page_size: params?.pageSize } }
    );
    return response.data as PaginatedResponse<Tag>;
  }

  async getTag(namespace: string, repository: string, tag: string) {
    let response = await this.http.get(
      `/v2/namespaces/${namespace}/repositories/${repository}/tags/${tag}`
    );
    return response.data;
  }

  async deleteTag(namespace: string, repository: string, tag: string) {
    await this.http.delete(`/v2/repositories/${namespace}/${repository}/tags/${tag}`);
  }

  // ── Search ───────────────────────────────────────────────────

  async searchRepositories(
    query: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<SearchRepository>> {
    let response = await this.http.get(`/v2/search/repositories/`, {
      params: { query, page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<SearchRepository>;
  }

  // ── Organizations ────────────────────────────────────────────

  async listOrgMembers(
    orgName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<OrgMember>> {
    let response = await this.http.get(`/v2/orgs/${orgName}/members`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<OrgMember>;
  }

  async removeOrgMember(orgName: string, username: string) {
    await this.http.delete(`/v2/orgs/${orgName}/members/${username}`);
  }

  async updateOrgMemberRole(orgName: string, username: string, role: string) {
    let response = await this.http.put(`/v2/orgs/${orgName}/members/${username}`, { role });
    return response.data;
  }

  // ── Teams ────────────────────────────────────────────────────

  async listTeams(
    orgName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Team>> {
    let response = await this.http.get(`/v2/orgs/${orgName}/groups`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<Team>;
  }

  async getTeam(orgName: string, teamName: string) {
    let response = await this.http.get(`/v2/orgs/${orgName}/groups/${teamName}`);
    return response.data;
  }

  async createTeam(orgName: string, data: { name: string; description?: string }) {
    let response = await this.http.post(`/v2/orgs/${orgName}/groups`, data);
    return response.data;
  }

  async updateTeam(
    orgName: string,
    teamName: string,
    data: { name?: string; description?: string }
  ) {
    let response = await this.http.patch(`/v2/orgs/${orgName}/groups/${teamName}`, data);
    return response.data;
  }

  async deleteTeam(orgName: string, teamName: string) {
    await this.http.delete(`/v2/orgs/${orgName}/groups/${teamName}`);
  }

  async listTeamMembers(
    orgName: string,
    teamName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<OrgMember>> {
    let response = await this.http.get(`/v2/orgs/${orgName}/groups/${teamName}/members`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<OrgMember>;
  }

  async addTeamMember(orgName: string, teamName: string, username: string) {
    let response = await this.http.post(`/v2/orgs/${orgName}/groups/${teamName}/members`, {
      member: username
    });
    return response.data;
  }

  async removeTeamMember(orgName: string, teamName: string, username: string) {
    await this.http.delete(`/v2/orgs/${orgName}/groups/${teamName}/members/${username}`);
  }

  // ── Webhooks ─────────────────────────────────────────────────

  async listWebhooks(
    namespace: string,
    repository: string
  ): Promise<PaginatedResponse<Webhook>> {
    let response = await this.http.get(
      `/v2/repositories/${namespace}/${repository}/webhooks/`
    );
    return response.data as PaginatedResponse<Webhook>;
  }

  async createWebhook(
    namespace: string,
    repository: string,
    data: { name: string; webhookUrl: string; expectFinalCallback?: boolean }
  ): Promise<Webhook> {
    // First create the webhook
    let webhookResp = await this.http.post(
      `/v2/repositories/${namespace}/${repository}/webhooks/`,
      { name: data.name, expect_final_callback: data.expectFinalCallback ?? false }
    );

    // Then add the hook URL
    let hookResp = await this.http.post(
      `/v2/repositories/${namespace}/${repository}/webhooks/${webhookResp.data.id}/hooks/`,
      { hook_url: data.webhookUrl }
    );

    return { ...webhookResp.data, webhooks: [hookResp.data] } as Webhook;
  }

  async deleteWebhook(namespace: string, repository: string, webhookId: number) {
    await this.http.delete(
      `/v2/repositories/${namespace}/${repository}/webhooks/${webhookId}/`
    );
  }

  // ── Personal Access Tokens ──────────────────────────────────

  async listAccessTokens(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<PersonalAccessToken>> {
    let response = await this.http.get(`/v2/access-tokens`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as PaginatedResponse<PersonalAccessToken>;
  }

  async createAccessToken(data: { token_label: string; scopes: string[] }) {
    let response = await this.http.post(`/v2/access-tokens`, data);
    return response.data;
  }

  async getAccessToken(uuid: string) {
    let response = await this.http.get(`/v2/access-tokens/${uuid}`);
    return response.data;
  }

  async updateAccessToken(uuid: string, data: { token_label?: string; is_active?: boolean }) {
    let response = await this.http.patch(`/v2/access-tokens/${uuid}`, data);
    return response.data;
  }

  async deleteAccessToken(uuid: string) {
    await this.http.delete(`/v2/access-tokens/${uuid}`);
  }

  // ── Audit Logs ──────────────────────────────────────────────

  async listAuditLogs(
    account: string,
    params?: {
      action?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse<AuditLogEvent>> {
    let response = await this.http.get(`/v2/auditlogs/${account}`, {
      params: {
        action: params?.action,
        from: params?.from,
        to: params?.to,
        page: params?.page,
        page_size: params?.pageSize
      }
    });
    return response.data as PaginatedResponse<AuditLogEvent>;
  }

  async listAuditLogActions(account: string): Promise<{ actions: AuditLogAction[] }> {
    let response = await this.http.get(`/v2/auditlogs/${account}/actions`);
    return response.data as { actions: AuditLogAction[] };
  }
}
