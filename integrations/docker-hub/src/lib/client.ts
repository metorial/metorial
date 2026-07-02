import { createAxios } from 'slates';
import { dockerHubApiError, dockerHubServiceError } from './errors';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Repository {
  user?: string;
  namespace: string;
  name: string;
  description: string;
  full_description?: string | null;
  is_private: boolean;
  is_automated?: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  status: number;
  status_description?: string;
  repository_type: string | null;
  content_types: string[];
  media_types?: string[];
  categories?: RepositoryCategory[];
  permissions?: RepositoryPermissions;
  immutable_tags_settings?: ImmutableTagsSettings;
  storage_size?: number | null;
}

export interface RepositoryCategory {
  name: string;
  slug: string;
}

export interface RepositoryPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
}

export interface ImmutableTagsSettings {
  enabled: boolean;
  rules: string[];
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
  expires_at?: string | null;
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
  label?: string;
}

export interface AuditLogActionGroup {
  label?: string;
  actions: AuditLogAction[];
}

export interface AuditLogActionsResponse {
  actions: AuditLogAction[] | Record<string, AuditLogActionGroup>;
}

export interface RepositoryGroup {
  group_id: number;
  group_name: string;
  permission: 'read' | 'write' | 'admin';
}

export interface OrgAccessTokenResource {
  type: 'TYPE_REPO' | 'TYPE_ORG';
  path: string;
  scopes: string[];
}

export interface OrgAccessToken {
  id: string;
  label: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  token?: string;
  resources?: OrgAccessTokenResource[];
}

export interface OrgAccessTokensResponse {
  total: number;
  next: string | null;
  previous: string | null;
  results: OrgAccessToken[];
}

type AuthTokenOptions = {
  identifier: string;
  secret: string;
};

export let createDockerHubBearerToken = async (opts: AuthTokenOptions) => {
  let http = createAxios({
    baseURL: 'https://hub.docker.com',
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    let response = await http.post('/v2/auth/token', {
      identifier: opts.identifier,
      secret: opts.secret
    });
    let token = response.data.access_token;

    if (typeof token !== 'string' || token.length === 0) {
      throw dockerHubServiceError('Docker Hub did not return an access token.');
    }

    return token;
  } catch (error) {
    throw dockerHubApiError(error, 'authentication');
  }
};

let isPlainHeaders = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !('set' in value);

let setAuthorizationHeader = (config: Record<string, any>, token: string) => {
  let headers = config.headers as
    | Record<string, string>
    | { set?: (name: string, value: string) => void }
    | undefined;

  if (headers && typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  config.headers = {
    ...(isPlainHeaders(headers) ? headers : {}),
    Authorization: `Bearer ${token}`
  };
};

export class Client {
  private http;
  private token: string;
  private tokenExpiresAt = 0;
  private identifier?: string;
  private secret?: string;

  constructor(opts: { token: string; identifier?: string; secret?: string }) {
    this.token = opts.token;
    this.identifier = opts.identifier;
    this.secret = opts.secret;
    this.tokenExpiresAt = Date.now() + 9 * 60 * 1000;

    this.http = createAxios({
      baseURL: 'https://hub.docker.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.request.use(async config => {
      setAuthorizationHeader(config, await this.getBearerToken());
      return config;
    });

    this.http.interceptors.response.use(
      response => response,
      async error => {
        let config = error?.config as any;
        let status = error?.response?.status;

        if (
          status === 401 &&
          config &&
          !config._dockerHubRetried &&
          this.identifier &&
          this.secret
        ) {
          config._dockerHubRetried = true;
          this.tokenExpiresAt = 0;
          setAuthorizationHeader(config, await this.getBearerToken());
          return this.http.request(config);
        }

        return Promise.reject(dockerHubApiError(error));
      }
    );
  }

  private async getBearerToken() {
    if (!this.identifier || !this.secret) {
      return this.token;
    }

    if (Date.now() >= this.tokenExpiresAt) {
      this.token = await createDockerHubBearerToken({
        identifier: this.identifier,
        secret: this.secret
      });
      this.tokenExpiresAt = Date.now() + 9 * 60 * 1000;
    }

    return this.token;
  }

  // ── Repositories ─────────────────────────────────────────────

  async listRepositories(
    namespace: string,
    params?: { page?: number; pageSize?: number; name?: string; ordering?: string }
  ): Promise<PaginatedResponse<Repository>> {
    let response = await this.http.get(`/v2/namespaces/${namespace}/repositories`, {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        name: params?.name,
        ordering: params?.ordering
      }
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
      registry?: string;
    }
  ) {
    let response = await this.http.post(`/v2/namespaces/${namespace}/repositories`, {
      ...data,
      namespace,
      registry: data.registry ?? 'docker.io'
    });
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

  async assignRepositoryTeam(
    namespace: string,
    repository: string,
    data: { groupId: number; permission: 'read' | 'write' | 'admin' }
  ): Promise<RepositoryGroup> {
    let response = await this.http.post(`/v2/repositories/${namespace}/${repository}/groups`, {
      group_id: data.groupId,
      permission: data.permission
    });
    return response.data as RepositoryGroup;
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

  async createAccessToken(data: {
    token_label: string;
    scopes: string[];
    expires_at?: string;
  }) {
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

  // ── Organization Access Tokens ──────────────────────────────

  async listOrgAccessTokens(
    orgName: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<OrgAccessTokensResponse> {
    let response = await this.http.get(`/v2/orgs/${orgName}/access-tokens`, {
      params: { page: params?.page, page_size: params?.pageSize }
    });
    return response.data as OrgAccessTokensResponse;
  }

  async getOrgAccessToken(orgName: string, tokenId: string): Promise<OrgAccessToken> {
    let response = await this.http.get(`/v2/orgs/${orgName}/access-tokens/${tokenId}`);
    return response.data as OrgAccessToken;
  }

  async createOrgAccessToken(
    orgName: string,
    data: {
      label: string;
      description?: string;
      resources?: OrgAccessTokenResource[];
      expires_at?: string;
    }
  ): Promise<OrgAccessToken> {
    let response = await this.http.post(`/v2/orgs/${orgName}/access-tokens`, data);
    return response.data as OrgAccessToken;
  }

  async updateOrgAccessToken(
    orgName: string,
    tokenId: string,
    data: {
      label?: string;
      description?: string;
      resources?: OrgAccessTokenResource[];
      is_active?: boolean;
    }
  ): Promise<OrgAccessToken> {
    let response = await this.http.patch(`/v2/orgs/${orgName}/access-tokens/${tokenId}`, data);
    return response.data as OrgAccessToken;
  }

  async deleteOrgAccessToken(orgName: string, tokenId: string) {
    await this.http.delete(`/v2/orgs/${orgName}/access-tokens/${tokenId}`);
  }

  // ── Immutable Tags ──────────────────────────────────────────

  async updateRepositoryImmutableTags(
    namespace: string,
    repository: string,
    data: { immutable_tags: boolean; immutable_tags_rules: string[] }
  ): Promise<Repository> {
    let response = await this.http.patch(
      `/v2/namespaces/${namespace}/repositories/${repository}/immutabletags`,
      data
    );
    return response.data as Repository;
  }

  async verifyRepositoryImmutableTags(
    namespace: string,
    repository: string,
    regex: string
  ): Promise<{ tags: string[] }> {
    let response = await this.http.post(
      `/v2/namespaces/${namespace}/repositories/${repository}/immutabletags/verify`,
      { regex }
    );
    return response.data as { tags: string[] };
  }

  // ── Audit Logs ──────────────────────────────────────────────

  async listAuditLogs(
    account: string,
    params?: {
      action?: string;
      name?: string;
      actor?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse<AuditLogEvent>> {
    let response = await this.http.get(`/v2/auditlogs/${account}`, {
      params: {
        action: params?.action,
        name: params?.name,
        actor: params?.actor,
        from: params?.from,
        to: params?.to,
        page: params?.page,
        page_size: params?.pageSize
      }
    });
    let data = response.data;

    if (Array.isArray(data?.logs)) {
      return {
        count: data.logs.length,
        next: null,
        previous: null,
        results: data.logs
      } as PaginatedResponse<AuditLogEvent>;
    }

    return data as PaginatedResponse<AuditLogEvent>;
  }

  async listAuditLogActions(account: string): Promise<AuditLogActionsResponse> {
    let response = await this.http.get(`/v2/auditlogs/${account}/actions`);
    return response.data as AuditLogActionsResponse;
  }
}
