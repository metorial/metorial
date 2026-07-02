import { createAxios } from 'slates';
import type {
  OktaApplication,
  OktaEventHook,
  OktaFactor,
  OktaGroup,
  OktaLogEvent,
  OktaPolicy,
  OktaUser,
  PaginatedResponse
} from './types';

export class OktaClient {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { domain: string; token: string }) {
    let domain = params.domain.replace(/\/+$/, '');

    this.http = createAxios({
      baseURL: `${domain}/api/v1`,
      headers: {
        Authorization: `SSWS ${params.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Pagination helper ---

  private parseNextLink(linkHeader: string | undefined): string | null {
    if (!linkHeader) return null;
    let parts = linkHeader.split(',');
    for (let part of parts) {
      let match = part.match(/<([^>]+)>;\s*rel="next"/);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  // --- Users ---

  async listUsers(params?: {
    query?: string;
    filter?: string;
    search?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<OktaUser>> {
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.q = params.query;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get('/users', { params: queryParams });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  async getUser(userId: string): Promise<OktaUser> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async createUser(params: {
    profile: Record<string, any>;
    credentials?: Record<string, any>;
    groupIds?: string[];
    activate?: boolean;
  }): Promise<OktaUser> {
    let queryParams: Record<string, string> = {};
    if (params.activate !== undefined) queryParams.activate = String(params.activate);

    let body: Record<string, any> = { profile: params.profile };
    if (params.credentials) body.credentials = params.credentials;
    if (params.groupIds) body.groupIds = params.groupIds;

    let response = await this.http.post('/users', body, { params: queryParams });
    return response.data;
  }

  async updateUser(
    userId: string,
    params: {
      profile?: Record<string, any>;
      credentials?: Record<string, any>;
    }
  ): Promise<OktaUser> {
    let body: Record<string, any> = {};
    if (params.profile) body.profile = params.profile;
    if (params.credentials) body.credentials = params.credentials;

    let response = await this.http.post(`/users/${encodeURIComponent(userId)}`, body);
    return response.data;
  }

  async deleteUser(userId: string, sendEmail?: boolean): Promise<void> {
    let params: Record<string, string> = {};
    if (sendEmail !== undefined) params.sendEmail = String(sendEmail);
    await this.http.delete(`/users/${encodeURIComponent(userId)}`, { params });
  }

  async performUserLifecycle(
    userId: string,
    action: string,
    sendEmail?: boolean
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (sendEmail !== undefined) params.sendEmail = String(sendEmail);
    let response = await this.http.post(
      `/users/${encodeURIComponent(userId)}/lifecycle/${action}`,
      null,
      { params }
    );
    return response.data;
  }

  async getUserGroups(userId: string): Promise<OktaGroup[]> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/groups`);
    return response.data;
  }

  async getUserApps(userId: string): Promise<any[]> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/appLinks`);
    return response.data;
  }

  // --- Groups ---

  async listGroups(params?: {
    query?: string;
    filter?: string;
    search?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<OktaGroup>> {
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.q = params.query;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.search) queryParams.search = params.search;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get('/groups', { params: queryParams });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  async getGroup(groupId: string): Promise<OktaGroup> {
    let response = await this.http.get(`/groups/${encodeURIComponent(groupId)}`);
    return response.data;
  }

  async createGroup(params: { name: string; description?: string }): Promise<OktaGroup> {
    let response = await this.http.post('/groups', {
      profile: {
        name: params.name,
        description: params.description
      }
    });
    return response.data;
  }

  async updateGroup(
    groupId: string,
    params: { name?: string; description?: string }
  ): Promise<OktaGroup> {
    let profile: Record<string, any> = {};
    if (params.name !== undefined) profile.name = params.name;
    if (params.description !== undefined) profile.description = params.description;

    let response = await this.http.put(`/groups/${encodeURIComponent(groupId)}`, { profile });
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.http.delete(`/groups/${encodeURIComponent(groupId)}`);
  }

  async listGroupMembers(
    groupId: string,
    params?: {
      limit?: number;
      after?: string;
    }
  ): Promise<PaginatedResponse<OktaUser>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get(`/groups/${encodeURIComponent(groupId)}/users`, {
      params: queryParams
    });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    await this.http.put(
      `/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`
    );
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    await this.http.delete(
      `/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`
    );
  }

  // --- Applications ---

  async listApplications(params?: {
    query?: string;
    filter?: string;
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<OktaApplication>> {
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.q = params.query;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get('/apps', { params: queryParams });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  async getApplication(appId: string): Promise<OktaApplication> {
    let response = await this.http.get(`/apps/${encodeURIComponent(appId)}`);
    return response.data;
  }

  async assignUserToApplication(
    appId: string,
    params: {
      userId: string;
      scope?: string;
      credentials?: Record<string, any>;
      profile?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      id: params.userId,
      scope: params.scope || 'USER'
    };
    if (params.credentials) body.credentials = params.credentials;
    if (params.profile) body.profile = params.profile;

    let response = await this.http.post(`/apps/${encodeURIComponent(appId)}/users`, body);
    return response.data;
  }

  async removeUserFromApplication(appId: string, userId: string): Promise<void> {
    await this.http.delete(
      `/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`
    );
  }

  async assignGroupToApplication(
    appId: string,
    groupId: string,
    profile?: Record<string, any>
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (profile) body.profile = profile;

    let response = await this.http.put(
      `/apps/${encodeURIComponent(appId)}/groups/${encodeURIComponent(groupId)}`,
      body
    );
    return response.data;
  }

  async removeGroupFromApplication(appId: string, groupId: string): Promise<void> {
    await this.http.delete(
      `/apps/${encodeURIComponent(appId)}/groups/${encodeURIComponent(groupId)}`
    );
  }

  async listApplicationUsers(
    appId: string,
    params?: {
      limit?: number;
      after?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get(`/apps/${encodeURIComponent(appId)}/users`, {
      params: queryParams
    });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  async listApplicationGroups(
    appId: string,
    params?: {
      limit?: number;
      after?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get(`/apps/${encodeURIComponent(appId)}/groups`, {
      params: queryParams
    });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  // --- System Log ---

  async getSystemLogs(params?: {
    since?: string;
    until?: string;
    filter?: string;
    query?: string;
    sortOrder?: 'ASCENDING' | 'DESCENDING';
    limit?: number;
    after?: string;
  }): Promise<PaginatedResponse<OktaLogEvent>> {
    let queryParams: Record<string, string> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.until) queryParams.until = params.until;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.query) queryParams.q = params.query;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.after) queryParams.after = params.after;

    let response = await this.http.get('/logs', { params: queryParams });
    let nextUrl = this.parseNextLink(response.headers?.link);
    return { items: response.data, nextUrl };
  }

  // --- Event Hooks ---

  async listEventHooks(): Promise<OktaEventHook[]> {
    let response = await this.http.get('/eventHooks');
    return response.data;
  }

  async getEventHook(eventHookId: string): Promise<OktaEventHook> {
    let response = await this.http.get(`/eventHooks/${encodeURIComponent(eventHookId)}`);
    return response.data;
  }

  async createEventHook(params: {
    name: string;
    url: string;
    eventTypes: string[];
    authorizationHeaderValue?: string;
  }): Promise<OktaEventHook> {
    let channel: Record<string, any> = {
      type: 'HTTP',
      version: '1.0.0',
      config: {
        uri: params.url,
        headers: []
      }
    };

    if (params.authorizationHeaderValue) {
      channel.config.authScheme = {
        type: 'HEADER',
        key: 'Authorization',
        value: params.authorizationHeaderValue
      };
    }

    let response = await this.http.post('/eventHooks', {
      name: params.name,
      events: {
        type: 'EVENT_TYPE',
        items: params.eventTypes
      },
      channel
    });
    return response.data;
  }

  async updateEventHook(
    eventHookId: string,
    params: {
      name?: string;
      url?: string;
      eventTypes?: string[];
      authorizationHeaderValue?: string;
    }
  ): Promise<OktaEventHook> {
    let existing = await this.getEventHook(eventHookId);

    let channel = existing.channel;
    if (params.url) {
      channel.config.uri = params.url;
    }
    if (params.authorizationHeaderValue) {
      channel.config.authScheme = {
        type: 'HEADER',
        key: 'Authorization',
        value: params.authorizationHeaderValue
      };
    }

    let body: Record<string, any> = {
      name: params.name || existing.name,
      events: {
        type: 'EVENT_TYPE',
        items: params.eventTypes || existing.events.items
      },
      channel
    };

    let response = await this.http.put(`/eventHooks/${encodeURIComponent(eventHookId)}`, body);
    return response.data;
  }

  async deleteEventHook(eventHookId: string): Promise<void> {
    await this.http.delete(`/eventHooks/${encodeURIComponent(eventHookId)}`);
  }

  async activateEventHook(eventHookId: string): Promise<OktaEventHook> {
    let response = await this.http.post(
      `/eventHooks/${encodeURIComponent(eventHookId)}/lifecycle/activate`
    );
    return response.data;
  }

  async deactivateEventHook(eventHookId: string): Promise<OktaEventHook> {
    let response = await this.http.post(
      `/eventHooks/${encodeURIComponent(eventHookId)}/lifecycle/deactivate`
    );
    return response.data;
  }

  async verifyEventHook(eventHookId: string): Promise<OktaEventHook> {
    let response = await this.http.post(
      `/eventHooks/${encodeURIComponent(eventHookId)}/lifecycle/verify`
    );
    return response.data;
  }

  // --- Policies ---

  async listPolicies(policyType: string): Promise<OktaPolicy[]> {
    let response = await this.http.get('/policies', { params: { type: policyType } });
    return response.data;
  }

  async getPolicy(policyId: string): Promise<OktaPolicy> {
    let response = await this.http.get(`/policies/${encodeURIComponent(policyId)}`);
    return response.data;
  }

  // --- User Factors ---

  async listFactors(userId: string): Promise<OktaFactor[]> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/factors`);
    return response.data;
  }

  async enrollFactor(
    userId: string,
    params: {
      factorType: string;
      provider: string;
      profile?: Record<string, any>;
    }
  ): Promise<OktaFactor> {
    let response = await this.http.post(
      `/users/${encodeURIComponent(userId)}/factors`,
      params
    );
    return response.data;
  }

  async resetFactors(userId: string): Promise<void> {
    await this.http.post(`/users/${encodeURIComponent(userId)}/lifecycle/reset_factors`);
  }
}
