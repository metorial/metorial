import { createAxios } from 'slates';
import type {
  UserflowAccount,
  UserflowContent,
  UserflowContentSession,
  UserflowContentVersion,
  UserflowDeleteResponse,
  UserflowEvent,
  UserflowEventDefinition,
  UserflowGroup,
  UserflowInvite,
  UserflowListResponse,
  UserflowMember,
  UserflowUser,
  UserflowWebhookSubscription
} from './types';

export interface ClientConfig {
  token: string;
  apiVersion?: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.http = createAxios({
      baseURL: 'https://api.userflow.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Userflow-Version': config.apiVersion || '2020-01-03'
      }
    });
  }

  // ── Users ──────────────────────────────────────────────────────────

  async createOrUpdateUser(params: {
    userId: string;
    attributes?: Record<string, unknown>;
    groups?: Array<{ id: string; attributes?: Record<string, unknown> }>;
    memberships?: Array<{
      group: { id: string; attributes?: Record<string, unknown> };
      attributes?: Record<string, unknown>;
    }>;
    pruneMemberships?: boolean;
  }): Promise<UserflowUser> {
    let body: Record<string, unknown> = { id: params.userId };
    if (params.attributes) body.attributes = params.attributes;
    if (params.groups) body.groups = params.groups;
    if (params.memberships) body.memberships = params.memberships;
    if (params.pruneMemberships !== undefined)
      body.prune_memberships = params.pruneMemberships;

    let response = await this.http.post('/users', body);
    return response.data;
  }

  async getUser(userId: string, expand?: string[]): Promise<UserflowUser> {
    let params: Record<string, string> = {};
    if (expand && expand.length > 0) params.expand = expand.join(',');
    let response = await this.http.get(`/users/${userId}`, { params });
    return response.data;
  }

  async listUsers(params?: {
    limit?: number;
    startingAfter?: string;
    orderBy?: string;
    expand?: string[];
  }): Promise<UserflowListResponse<UserflowUser>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    if (params?.orderBy) query.order_by = params.orderBy;
    if (params?.expand && params.expand.length > 0) query.expand = params.expand.join(',');
    let response = await this.http.get('/users', { params: query });
    return response.data;
  }

  async findUser(params: {
    userId?: string;
    email?: string;
    groupId?: string;
  }): Promise<UserflowUser> {
    let query: Record<string, string> = {};
    if (params.userId) query.id = params.userId;
    if (params.email) query.email = params.email;
    if (params.groupId) query.group_id = params.groupId;
    let response = await this.http.get('/users/find', { params: query });
    return response.data;
  }

  async deleteUser(userId: string): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete(`/users/${userId}`);
    return response.data;
  }

  // ── Groups ─────────────────────────────────────────────────────────

  async createOrUpdateGroup(params: {
    groupId: string;
    attributes?: Record<string, unknown>;
  }): Promise<UserflowGroup> {
    let body: Record<string, unknown> = { id: params.groupId };
    if (params.attributes) body.attributes = params.attributes;
    let response = await this.http.post('/groups', body);
    return response.data;
  }

  async getGroup(groupId: string, expand?: string[]): Promise<UserflowGroup> {
    let params: Record<string, string> = {};
    if (expand && expand.length > 0) params.expand = expand.join(',');
    let response = await this.http.get(`/groups/${groupId}`, { params });
    return response.data;
  }

  async listGroups(params?: {
    limit?: number;
    startingAfter?: string;
    orderBy?: string;
    expand?: string[];
  }): Promise<UserflowListResponse<UserflowGroup>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    if (params?.orderBy) query.order_by = params.orderBy;
    if (params?.expand && params.expand.length > 0) query.expand = params.expand.join(',');
    let response = await this.http.get('/groups', { params: query });
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete(`/groups/${groupId}`);
    return response.data;
  }

  async removeGroupMembership(
    userId: string,
    groupId: string
  ): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete('/group_memberships', {
      params: { user_id: userId, group_id: groupId }
    });
    return response.data;
  }

  // ── Events ─────────────────────────────────────────────────────────

  async trackEvent(params: {
    name: string;
    userId?: string;
    groupId?: string;
    attributes?: Record<string, unknown>;
  }): Promise<UserflowEvent> {
    let body: Record<string, unknown> = { name: params.name };
    if (params.userId) body.user_id = params.userId;
    if (params.groupId) body.group_id = params.groupId;
    if (params.attributes) body.attributes = params.attributes;
    let response = await this.http.post('/events', body);
    return response.data;
  }

  // ── Event Definitions ──────────────────────────────────────────────

  async listEventDefinitions(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<UserflowListResponse<UserflowEventDefinition>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let response = await this.http.get('/event_definitions', { params: query });
    return response.data;
  }

  // ── Content ────────────────────────────────────────────────────────

  async getContent(contentId: string, expand?: string[]): Promise<UserflowContent> {
    let params: Record<string, string> = {};
    if (expand && expand.length > 0) params.expand = expand.join(',');
    let response = await this.http.get(`/content/${contentId}`, { params });
    return response.data;
  }

  async listContent(params?: {
    limit?: number;
    startingAfter?: string;
    expand?: string[];
  }): Promise<UserflowListResponse<UserflowContent>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    if (params?.expand && params.expand.length > 0) query.expand = params.expand.join(',');
    let response = await this.http.get('/content', { params: query });
    return response.data;
  }

  async listContentVersions(params?: {
    limit?: number;
    startingAfter?: string;
    contentId?: string;
    expand?: string[];
  }): Promise<UserflowListResponse<UserflowContentVersion>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    if (params?.contentId) query.content_id = params.contentId;
    if (params?.expand && params.expand.length > 0) query.expand = params.expand.join(',');
    let response = await this.http.get('/content_versions', { params: query });
    return response.data;
  }

  async listContentSessions(params?: {
    limit?: number;
    startingAfter?: string;
    contentId?: string;
    userId?: string;
    expand?: string[];
  }): Promise<UserflowListResponse<UserflowContentSession>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    if (params?.contentId) query.content_id = params.contentId;
    if (params?.userId) query.user_id = params.userId;
    if (params?.expand && params.expand.length > 0) query.expand = params.expand.join(',');
    let response = await this.http.get('/content_sessions', { params: query });
    return response.data;
  }

  // ── Webhook Subscriptions ──────────────────────────────────────────

  async createWebhookSubscription(params: {
    url: string;
    topics: string[];
    apiVersion?: string;
  }): Promise<UserflowWebhookSubscription> {
    let body: Record<string, unknown> = {
      url: params.url,
      topics: params.topics
    };
    if (params.apiVersion) body.api_version = params.apiVersion;
    let response = await this.http.post('/webhook_subscriptions', body);
    return response.data;
  }

  async getWebhookSubscription(subscriptionId: string): Promise<UserflowWebhookSubscription> {
    let response = await this.http.get(`/webhook_subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listWebhookSubscriptions(params?: {
    limit?: number;
    startingAfter?: string;
  }): Promise<UserflowListResponse<UserflowWebhookSubscription>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let response = await this.http.get('/webhook_subscriptions', { params: query });
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete(`/webhook_subscriptions/${subscriptionId}`);
    return response.data;
  }

  // ── Accounts API ───────────────────────────────────────────────────

  async listAccounts(): Promise<UserflowListResponse<UserflowAccount>> {
    let response = await this.http.get('/accounts');
    return response.data;
  }

  async getAccount(accountId: string, expand?: string[]): Promise<UserflowAccount> {
    let params: Record<string, string> = {};
    if (expand && expand.length > 0) params.expand = expand.join(',');
    let response = await this.http.get(`/accounts/${accountId}`, { params });
    return response.data;
  }

  async listMembers(
    accountId: string,
    params?: {
      limit?: number;
      startingAfter?: string;
    }
  ): Promise<UserflowListResponse<UserflowMember>> {
    let query: Record<string, unknown> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let response = await this.http.get(`/accounts/${accountId}/members`, { params: query });
    return response.data;
  }

  async deleteMember(accountId: string, memberId: string): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete(`/accounts/${accountId}/members/${memberId}`);
    return response.data;
  }

  async createInvite(
    accountId: string,
    params: {
      email: string;
      permissions?: Array<{ action: string; subject: string; subject_id: string }>;
    }
  ): Promise<UserflowInvite> {
    let response = await this.http.post(`/accounts/${accountId}/invites`, params);
    return response.data;
  }

  async deleteInvite(accountId: string, inviteId: string): Promise<UserflowDeleteResponse> {
    let response = await this.http.delete(`/accounts/${accountId}/invites/${inviteId}`);
    return response.data;
  }
}
