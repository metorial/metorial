import { createApiServiceError, createAxios } from 'slates';

let GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

let graphAxios = createAxios({
  baseURL: GRAPH_BASE_URL
});

// Collections are fully paged, but cap the page count so a runaway nextLink loop ends.
let MAX_COLLECTION_PAGES = 50;

export interface GraphListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface GraphPage<T> {
  items: T[];
  nextPageToken?: string;
}

// Page tokens are Graph @odata.nextLink URLs; only follow them on the Graph v1.0 host
// so the bearer token never leaves Microsoft Graph.
// https://learn.microsoft.com/en-us/graph/paging
let resolvePageToken = (pageToken: string) => {
  let url: URL;
  try {
    url = new URL(pageToken);
  } catch {
    throw createApiServiceError(
      'pageToken is not valid. Pass the nextPageToken value returned by the previous call unchanged.',
      { reason: 'microsoft_teams_page_token_invalid' }
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'graph.microsoft.com' ||
    !url.pathname.startsWith('/v1.0/')
  ) {
    throw createApiServiceError(
      'pageToken is not a Microsoft Graph continuation link. Pass the nextPageToken value returned by the previous call unchanged.',
      { reason: 'microsoft_teams_page_token_invalid' }
    );
  }
  return url.toString();
};

// OData string literals escape a single quote by doubling it.
let odataString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export class GraphClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  // ─── Paging ──────────────────────────────────────────────────────────

  /** One page of a collection; `pageToken` (a previous nextLink) replaces path and params. */
  private async getPage<T = any>(
    path: string,
    params: Record<string, string> = {},
    pageToken?: string
  ): Promise<GraphPage<T>> {
    let response = pageToken
      ? await graphAxios.get<GraphListResponse<T>>(resolvePageToken(pageToken), {
          headers: this.headers
        })
      : await graphAxios.get<GraphListResponse<T>>(path, { headers: this.headers, params });
    let nextLink = response.data['@odata.nextLink'];
    return {
      items: Array.isArray(response.data.value) ? response.data.value : [],
      ...(typeof nextLink === 'string' && nextLink ? { nextPageToken: nextLink } : {})
    };
  }

  /** Every item of a collection, following @odata.nextLink. */
  private async getAll<T = any>(path: string, params: Record<string, string> = {}) {
    let items: T[] = [];
    let page = await this.getPage<T>(path, params);
    items.push(...page.items);
    for (let count = 1; page.nextPageToken && count < MAX_COLLECTION_PAGES; count++) {
      page = await this.getPage<T>(path, {}, page.nextPageToken);
      items.push(...page.items);
    }
    return items;
  }

  // ─── Teams ───────────────────────────────────────────────────────────

  async listJoinedTeams(): Promise<any[]> {
    return this.getAll('/me/joinedTeams');
  }

  async getTeam(teamId: string): Promise<any> {
    let response = await graphAxios.get(`/teams/${teamId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTeam(body: any): Promise<any> {
    let response = await graphAxios.post('/teams', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    // Teams creation returns 202 with a Location header containing the async operation URL
    let locationHeader = response.headers?.location || response.headers?.Location;
    let teamId: string | undefined;
    // Try to extract team ID from Content-Location header
    let contentLocation =
      response.headers?.['content-location'] || response.headers?.['Content-Location'];
    if (contentLocation) {
      let match = contentLocation.match(/teams\('([^']+)'\)/);
      if (match) teamId = match[1];
    }
    return { teamId, operationUrl: locationHeader, status: 'creating' };
  }

  async updateTeam(teamId: string, body: any): Promise<void> {
    let groupBody = Object.fromEntries(
      Object.entries(body).filter(
        ([key, value]) =>
          value !== undefined && ['displayName', 'description', 'visibility'].includes(key)
      )
    );
    if (Object.keys(groupBody).length > 0) {
      await graphAxios.patch(`/groups/${teamId}`, groupBody, {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      });
    }

    let teamBody = Object.fromEntries(
      Object.entries(body).filter(
        ([key, value]) =>
          value !== undefined && !['displayName', 'description', 'visibility'].includes(key)
      )
    );
    if (Object.keys(teamBody).length > 0) {
      await graphAxios.patch(`/teams/${teamId}`, teamBody, {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      });
    }
  }

  async archiveTeam(teamId: string): Promise<void> {
    await graphAxios.post(`/teams/${teamId}/archive`, null, {
      headers: this.headers
    });
  }

  async unarchiveTeam(teamId: string): Promise<void> {
    await graphAxios.post(`/teams/${teamId}/unarchive`, null, {
      headers: this.headers
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    await graphAxios.delete(`/groups/${teamId}`, {
      headers: this.headers
    });
  }

  // ─── Channels ────────────────────────────────────────────────────────

  async listChannels(teamId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/channels`);
  }

  async getChannel(teamId: string, channelId: string): Promise<any> {
    let response = await graphAxios.get(`/teams/${teamId}/channels/${channelId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createChannel(teamId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/teams/${teamId}/channels`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateChannel(teamId: string, channelId: string, body: any): Promise<void> {
    await graphAxios.patch(`/teams/${teamId}/channels/${channelId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  async deleteChannel(teamId: string, channelId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/channels/${channelId}`, {
      headers: this.headers
    });
  }

  // ─── Channel Messages ───────────────────────────────────────────────

  // $top is at most 50: https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
  async listChannelMessages(
    teamId: string,
    channelId: string,
    options: { top?: number; pageToken?: string } = {}
  ): Promise<GraphPage<any>> {
    let params: Record<string, string> = {};
    if (options.top) params.$top = String(options.top);
    return this.getPage(
      `/teams/${teamId}/channels/${channelId}/messages`,
      params,
      options.pageToken
    );
  }

  async getChannelMessage(teamId: string, channelId: string, messageId: string): Promise<any> {
    let response = await graphAxios.get(
      `/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async sendChannelMessage(teamId: string, channelId: string, body: any): Promise<any> {
    let response = await graphAxios.post(
      `/teams/${teamId}/channels/${channelId}/messages`,
      body,
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }

  async replyToChannelMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    body: any
  ): Promise<any> {
    let response = await graphAxios.post(
      `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
      body,
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }

  // https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies?view=graph-rest-1.0
  async listMessageReplies(
    teamId: string,
    channelId: string,
    messageId: string,
    options: { top?: number; pageToken?: string } = {}
  ): Promise<GraphPage<any>> {
    let params: Record<string, string> = {};
    if (options.top) params.$top = String(options.top);
    return this.getPage(
      `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
      params,
      options.pageToken
    );
  }

  // https://learn.microsoft.com/en-us/graph/api/chatmessage-update?view=graph-rest-1.0
  async updateChannelMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    body: any,
    replyId?: string
  ): Promise<void> {
    let path = `/teams/${teamId}/channels/${channelId}/messages/${messageId}`;
    await graphAxios.patch(replyId ? `${path}/replies/${replyId}` : path, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  // https://learn.microsoft.com/en-us/graph/api/chatmessage-softdelete?view=graph-rest-1.0
  async softDeleteChannelMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    replyId?: string
  ): Promise<void> {
    let path = `/teams/${teamId}/channels/${channelId}/messages/${messageId}`;
    await graphAxios.post(
      `${replyId ? `${path}/replies/${replyId}` : path}/softDelete`,
      null,
      {
        headers: this.headers
      }
    );
  }

  // ─── Chats ──────────────────────────────────────────────────────────

  // $top is at most 50: https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0
  async listChats(
    options: { top?: number; pageToken?: string } = {}
  ): Promise<GraphPage<any>> {
    let params: Record<string, string> = {};
    if (options.top) params.$top = String(options.top);
    return this.getPage('/me/chats', params, options.pageToken);
  }

  async getChat(chatId: string): Promise<any> {
    let response = await graphAxios.get(`/chats/${chatId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createChat(body: any): Promise<any> {
    let response = await graphAxios.post('/chats', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // $top is at most 50: https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0
  async listChatMessages(
    chatId: string,
    options: { top?: number; pageToken?: string } = {}
  ): Promise<GraphPage<any>> {
    let params: Record<string, string> = {};
    if (options.top) params.$top = String(options.top);
    return this.getPage(`/chats/${chatId}/messages`, params, options.pageToken);
  }

  // https://learn.microsoft.com/en-us/graph/api/chatmessage-update?view=graph-rest-1.0
  async updateChatMessage(chatId: string, messageId: string, body: any): Promise<void> {
    await graphAxios.patch(`/chats/${chatId}/messages/${messageId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  // Chat soft delete is documented only under /users/{userId}/chats.
  // https://learn.microsoft.com/en-us/graph/api/chatmessage-softdelete?view=graph-rest-1.0
  async softDeleteChatMessage(
    userId: string,
    chatId: string,
    messageId: string
  ): Promise<void> {
    await graphAxios.post(
      `/users/${userId}/chats/${chatId}/messages/${messageId}/softDelete`,
      null,
      { headers: this.headers }
    );
  }

  async sendChatMessage(chatId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/chats/${chatId}/messages`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Members ────────────────────────────────────────────────────────

  async listTeamMembers(teamId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/members`);
  }

  async addTeamMember(teamId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/teams/${teamId}/members`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async removeTeamMember(teamId: string, membershipId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/members/${membershipId}`, {
      headers: this.headers
    });
  }

  async listChannelMembers(teamId: string, channelId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/channels/${channelId}/members`);
  }

  async addChannelMember(teamId: string, channelId: string, body: any): Promise<any> {
    let response = await graphAxios.post(
      `/teams/${teamId}/channels/${channelId}/members`,
      body,
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }

  async removeChannelMember(
    teamId: string,
    channelId: string,
    membershipId: string
  ): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/channels/${channelId}/members/${membershipId}`, {
      headers: this.headers
    });
  }

  // ─── Online Meetings ───────────────────────────────────────────────

  async createOnlineMeeting(body: any): Promise<any> {
    let response = await graphAxios.post('/me/onlineMeetings', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getOnlineMeeting(meetingId: string): Promise<any> {
    let response = await graphAxios.get(`/me/onlineMeetings/${meetingId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // Graph only looks meetings up by join URL or join meeting ID; there is no unfiltered list.
  // https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0
  async findOnlineMeetings(filter: { joinWebUrl?: string; joinMeetingId?: string }) {
    let expression = filter.joinWebUrl
      ? `JoinWebUrl eq ${odataString(filter.joinWebUrl)}`
      : `joinMeetingIdSettings/joinMeetingId eq ${odataString(filter.joinMeetingId ?? '')}`;
    return this.getAll('/me/onlineMeetings', { $filter: expression });
  }

  async deleteOnlineMeeting(meetingId: string): Promise<void> {
    await graphAxios.delete(`/me/onlineMeetings/${meetingId}`, {
      headers: this.headers
    });
  }

  async updateOnlineMeeting(meetingId: string, body: any): Promise<any> {
    let response = await graphAxios.patch(`/me/onlineMeetings/${meetingId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Presence ───────────────────────────────────────────────────────

  async getPresence(userId: string): Promise<any> {
    let response = await graphAxios.get(`/users/${userId}/presence`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPresenceBulk(userIds: string[]): Promise<any[]> {
    let response = await graphAxios.post(
      '/communications/getPresencesByUserId',
      { ids: userIds },
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data.value;
  }

  async getMyPresence(): Promise<any> {
    let response = await graphAxios.get('/me/presence', {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────────────

  async listTags(teamId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/tags`);
  }

  async getTag(teamId: string, tagId: string): Promise<any> {
    let response = await graphAxios.get(`/teams/${teamId}/tags/${tagId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTag(teamId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/teams/${teamId}/tags`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateTag(teamId: string, tagId: string, body: any): Promise<void> {
    await graphAxios.patch(`/teams/${teamId}/tags/${tagId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  async deleteTag(teamId: string, tagId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/tags/${tagId}`, {
      headers: this.headers
    });
  }

  async listTagMembers(teamId: string, tagId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/tags/${tagId}/members`);
  }

  async addTagMember(teamId: string, tagId: string, userId: string): Promise<any> {
    let response = await graphAxios.post(
      `/teams/${teamId}/tags/${tagId}/members`,
      { userId },
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }

  async removeTagMember(teamId: string, tagId: string, tagMemberId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/tags/${tagId}/members/${tagMemberId}`, {
      headers: this.headers
    });
  }

  // ─── Activity Feed Notifications ──────────────────────────────────

  async sendActivityNotification(teamId: string, body: any): Promise<void> {
    await graphAxios.post(`/teams/${teamId}/sendActivityNotification`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  async sendUserActivityNotification(userId: string, body: any): Promise<void> {
    await graphAxios.post(`/users/${userId}/teamwork/sendActivityNotification`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
  }

  // ─── Subscriptions (Webhooks) ─────────────────────────────────────

  async createSubscription(body: any): Promise<any> {
    let response = await graphAxios.post('/subscriptions', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await graphAxios.delete(`/subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
  }

  async renewSubscription(subscriptionId: string, expirationDateTime: string): Promise<any> {
    let response = await graphAxios.patch(
      `/subscriptions/${subscriptionId}`,
      { expirationDateTime },
      { headers: { ...this.headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }

  // ─── Users ────────────────────────────────────────────────────────

  async getMe(): Promise<any> {
    let response = await graphAxios.get('/me', {
      headers: this.headers
    });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await graphAxios.get(`/users/${userId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Tabs ─────────────────────────────────────────────────────────

  async listTabs(teamId: string, channelId: string): Promise<any[]> {
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/channels/${channelId}/tabs`,
      { headers: this.headers }
    );
    return response.data.value;
  }

  async addTab(teamId: string, channelId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/teams/${teamId}/channels/${channelId}/tabs`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async removeTab(teamId: string, channelId: string, tabId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/channels/${channelId}/tabs/${tabId}`, {
      headers: this.headers
    });
  }

  // ─── Installed Apps ──────────────────────────────────────────────

  async listInstalledApps(teamId: string): Promise<any[]> {
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/installedApps?$expand=teamsAppDefinition`,
      { headers: this.headers }
    );
    return response.data.value;
  }

  // ─── Shifts ──────────────────────────────────────────────────────

  async getSchedule(teamId: string): Promise<any> {
    let response = await graphAxios.get(`/teams/${teamId}/schedule`, {
      headers: this.headers
    });
    return response.data;
  }

  async createOrReplaceSchedule(teamId: string, body: any): Promise<any> {
    let response = await graphAxios.put(`/teams/${teamId}/schedule`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async listShifts(teamId: string): Promise<any[]> {
    return this.getAll(`/teams/${teamId}/schedule/shifts`);
  }

  async createShift(teamId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/teams/${teamId}/schedule/shifts`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteShift(teamId: string, shiftId: string): Promise<void> {
    await graphAxios.delete(`/teams/${teamId}/schedule/shifts/${shiftId}`, {
      headers: this.headers
    });
  }
}
