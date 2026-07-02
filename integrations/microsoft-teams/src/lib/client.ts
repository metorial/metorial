import { createAxios } from 'slates';

let graphAxios = createAxios({
  baseURL: 'https://graph.microsoft.com/v1.0'
});

let getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof (error as { data?: { message?: unknown } })?.data?.message === 'string') {
    return String((error as { data: { message: string } }).data.message);
  }

  if (
    typeof (error as { response?: { data?: { error?: { message?: unknown } } } })?.response
      ?.data?.error?.message === 'string'
  ) {
    return String(
      (error as { response: { data: { error: { message: string } } } }).response.data.error
        .message
    );
  }

  return String(error ?? '');
};

let isOnlineMeetingsFilterRequiredError = (error: unknown) => {
  let message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('filter expression expected') &&
    message.includes('/onlinemeetings?$filter')
  );
};

export interface GraphListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export class GraphClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  // ─── Teams ───────────────────────────────────────────────────────────

  async listJoinedTeams(): Promise<any[]> {
    let response = await graphAxios.get<GraphListResponse<any>>('/me/joinedTeams', {
      headers: this.headers
    });
    return response.data.value;
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
    let response = await graphAxios.get<GraphListResponse<any>>(`/teams/${teamId}/channels`, {
      headers: this.headers
    });
    return response.data.value;
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

  async listChannelMessages(teamId: string, channelId: string, top?: number): Promise<any[]> {
    let params: Record<string, string> = {};
    if (top) params.$top = String(top);
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/channels/${channelId}/messages`,
      { headers: this.headers, params }
    );
    return response.data.value;
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

  async listMessageReplies(
    teamId: string,
    channelId: string,
    messageId: string
  ): Promise<any[]> {
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
      { headers: this.headers }
    );
    return response.data.value;
  }

  // ─── Chats ──────────────────────────────────────────────────────────

  async listChats(top?: number): Promise<any[]> {
    let params: Record<string, string> = {};
    if (top) params.$top = String(top);
    let response = await graphAxios.get<GraphListResponse<any>>('/me/chats', {
      headers: this.headers,
      params
    });
    return response.data.value;
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

  async listChatMessages(chatId: string, top?: number): Promise<any[]> {
    let params: Record<string, string> = {};
    if (top) params.$top = String(top);
    let response = await graphAxios.get<GraphListResponse<any>>(`/chats/${chatId}/messages`, {
      headers: this.headers,
      params
    });
    return response.data.value;
  }

  async sendChatMessage(chatId: string, body: any): Promise<any> {
    let response = await graphAxios.post(`/chats/${chatId}/messages`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Members ────────────────────────────────────────────────────────

  async listTeamMembers(teamId: string): Promise<any[]> {
    let response = await graphAxios.get<GraphListResponse<any>>(`/teams/${teamId}/members`, {
      headers: this.headers
    });
    return response.data.value;
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
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/channels/${channelId}/members`,
      { headers: this.headers }
    );
    return response.data.value;
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

  async listOnlineMeetings(): Promise<any[]> {
    try {
      let response = await graphAxios.get<GraphListResponse<any>>('/me/onlineMeetings', {
        headers: this.headers
      });
      return response.data.value;
    } catch (error) {
      if (isOnlineMeetingsFilterRequiredError(error)) {
        throw new Error(
          'Microsoft Graph does not support listing all online meetings without a filter. Use get with a meetingId or query by joinWebUrl/joinMeetingId instead.'
        );
      }

      throw error;
    }
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
    let response = await graphAxios.get<GraphListResponse<any>>(`/teams/${teamId}/tags`, {
      headers: this.headers
    });
    return response.data.value;
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
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/tags/${tagId}/members`,
      { headers: this.headers }
    );
    return response.data.value;
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
    let response = await graphAxios.get<GraphListResponse<any>>(
      `/teams/${teamId}/schedule/shifts`,
      { headers: this.headers }
    );
    return response.data.value;
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
