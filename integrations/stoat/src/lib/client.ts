import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(
    private config: {
      token: string;
      authType: 'bot' | 'session';
      baseUrl: string;
    }
  ) {
    this.http = createAxios({
      baseURL: config.baseUrl
    });

    this.http.interceptors.request.use(reqConfig => {
      if (config.authType === 'bot') {
        reqConfig.headers['X-Bot-Token'] = config.token;
      } else {
        reqConfig.headers['X-Session-Token'] = config.token;
      }
      return reqConfig;
    });
  }

  // ─── Messages ────────────────────────────────────────────────

  async sendMessage(
    channelId: string,
    data: {
      content?: string | null;
      attachments?: string[] | null;
      replies?: Array<{ id: string; mention: boolean }> | null;
      embeds?: Array<{
        icon_url?: string | null;
        url?: string | null;
        title?: string | null;
        description?: string | null;
        media?: string | null;
        colour?: string | null;
      }> | null;
      masquerade?: {
        name?: string | null;
        avatar?: string | null;
        colour?: string | null;
      } | null;
      interactions?: {
        reactions?: string[] | null;
        restrict_reactions?: boolean | null;
      } | null;
      flags?: number | null;
    }
  ) {
    let response = await this.http.post(`/channels/${channelId}/messages`, data);
    return response.data;
  }

  async fetchMessages(
    channelId: string,
    params?: {
      limit?: number;
      before?: string;
      after?: string;
      sort?: string;
      nearby?: string;
      include_users?: boolean;
    }
  ) {
    let response = await this.http.get(`/channels/${channelId}/messages`, { params });
    return response.data;
  }

  async fetchMessage(channelId: string, messageId: string) {
    let response = await this.http.get(`/channels/${channelId}/messages/${messageId}`);
    return response.data;
  }

  async editMessage(
    channelId: string,
    messageId: string,
    data: {
      content?: string | null;
      embeds?: Array<{
        icon_url?: string | null;
        url?: string | null;
        title?: string | null;
        description?: string | null;
        media?: string | null;
        colour?: string | null;
      }> | null;
    }
  ) {
    let response = await this.http.patch(`/channels/${channelId}/messages/${messageId}`, data);
    return response.data;
  }

  async deleteMessage(channelId: string, messageId: string) {
    await this.http.delete(`/channels/${channelId}/messages/${messageId}`);
  }

  async bulkDeleteMessages(channelId: string, messageIds: string[]) {
    await this.http.delete(`/channels/${channelId}/messages/bulk`, {
      data: { ids: messageIds }
    });
  }

  async searchMessages(
    channelId: string,
    data: {
      query: string;
      limit?: number;
      before?: string;
      after?: string;
      sort?: string;
      include_users?: boolean;
    }
  ) {
    let response = await this.http.post(`/channels/${channelId}/search`, data);
    return response.data;
  }

  async pinMessage(channelId: string, messageId: string) {
    await this.http.post(`/channels/${channelId}/messages/${messageId}/pin`);
  }

  async unpinMessage(channelId: string, messageId: string) {
    await this.http.delete(`/channels/${channelId}/messages/${messageId}/pin`);
  }

  async addReaction(channelId: string, messageId: string, emoji: string) {
    await this.http.put(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
    );
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    params?: {
      user_id?: string;
      remove_all?: boolean;
    }
  ) {
    await this.http.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      { params }
    );
  }

  async clearAllReactions(channelId: string, messageId: string) {
    await this.http.delete(`/channels/${channelId}/messages/${messageId}/reactions`);
  }

  // ─── Servers ─────────────────────────────────────────────────

  async createServer(data: {
    name: string;
    description?: string | null;
    nsfw?: boolean | null;
  }) {
    let response = await this.http.post('/servers/create', data);
    return response.data;
  }

  async fetchServer(serverId: string, includeChannels?: boolean) {
    let response = await this.http.get(`/servers/${serverId}`, {
      params: includeChannels ? { include_channels: true } : undefined
    });
    return response.data;
  }

  async editServer(
    serverId: string,
    data: {
      name?: string | null;
      description?: string | null;
      icon?: string | null;
      banner?: string | null;
      categories?: Array<{ id: string; title: string; channels: string[] }> | null;
      system_messages?: Record<string, string | null> | null;
      flags?: number | null;
      discoverable?: boolean | null;
      analytics?: boolean | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/servers/${serverId}`, data);
    return response.data;
  }

  async deleteServer(serverId: string, leaveSilently?: boolean) {
    await this.http.delete(`/servers/${serverId}`, {
      params: leaveSilently ? { leave_silently: true } : undefined
    });
  }

  // ─── Channels ────────────────────────────────────────────────

  async createServerChannel(
    serverId: string,
    data: {
      type?: string;
      name: string;
      description?: string | null;
      nsfw?: boolean | null;
    }
  ) {
    let response = await this.http.post(`/servers/${serverId}/channels`, data);
    return response.data;
  }

  async fetchChannel(channelId: string) {
    let response = await this.http.get(`/channels/${channelId}`);
    return response.data;
  }

  async editChannel(
    channelId: string,
    data: {
      name?: string | null;
      description?: string | null;
      owner?: string | null;
      icon?: string | null;
      nsfw?: boolean | null;
      archived?: boolean | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/channels/${channelId}`, data);
    return response.data;
  }

  async deleteChannel(channelId: string, leaveSilently?: boolean) {
    await this.http.delete(`/channels/${channelId}`, {
      params: leaveSilently ? { leave_silently: true } : undefined
    });
  }

  async createGroup(data: {
    name: string;
    description?: string | null;
    users: string[];
    nsfw?: boolean | null;
  }) {
    let response = await this.http.post('/channels/create', data);
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────────────

  async fetchSelf() {
    let response = await this.http.get('/users/@me');
    return response.data;
  }

  async fetchUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async fetchUserProfile(userId: string) {
    let response = await this.http.get(`/users/${userId}/profile`);
    return response.data;
  }

  async editUser(
    userId: string,
    data: {
      display_name?: string | null;
      avatar?: string | null;
      status?: { text?: string | null; presence?: string | null } | null;
      profile?: { content?: string | null; background?: string | null } | null;
      badges?: number | null;
      flags?: number | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/users/${userId}`, data);
    return response.data;
  }

  async fetchDMChannels() {
    let response = await this.http.get('/users/dms');
    return response.data;
  }

  async openDM(userId: string) {
    let response = await this.http.get(`/users/${userId}/dm`);
    return response.data;
  }

  async fetchMutuals(userId: string) {
    let response = await this.http.get(`/users/${userId}/mutual`);
    return response.data;
  }

  // ─── Relationships ───────────────────────────────────────────

  async sendFriendRequest(username: string) {
    let response = await this.http.post('/users/friend', { username });
    return response.data;
  }

  async acceptFriendRequest(userId: string) {
    let response = await this.http.put(`/users/${userId}/friend`);
    return response.data;
  }

  async removeFriend(userId: string) {
    let response = await this.http.delete(`/users/${userId}/friend`);
    return response.data;
  }

  async blockUser(userId: string) {
    let response = await this.http.put(`/users/${userId}/block`);
    return response.data;
  }

  async unblockUser(userId: string) {
    let response = await this.http.delete(`/users/${userId}/block`);
    return response.data;
  }

  // ─── Members ─────────────────────────────────────────────────

  async fetchMembers(serverId: string, excludeOffline?: boolean) {
    let response = await this.http.get(`/servers/${serverId}/members`, {
      params: excludeOffline ? { exclude_offline: true } : undefined
    });
    return response.data;
  }

  async fetchMember(serverId: string, memberId: string) {
    let response = await this.http.get(`/servers/${serverId}/members/${memberId}`);
    return response.data;
  }

  async editMember(
    serverId: string,
    memberId: string,
    data: {
      nickname?: string | null;
      avatar?: string | null;
      roles?: string[] | null;
      timeout?: string | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/servers/${serverId}/members/${memberId}`, data);
    return response.data;
  }

  async kickMember(serverId: string, memberId: string) {
    await this.http.delete(`/servers/${serverId}/members/${memberId}`);
  }

  async banMember(serverId: string, userId: string, reason?: string) {
    let response = await this.http.put(`/servers/${serverId}/bans/${userId}`, {
      reason
    });
    return response.data;
  }

  async unbanMember(serverId: string, userId: string) {
    await this.http.delete(`/servers/${serverId}/bans/${userId}`);
  }

  async fetchBans(serverId: string) {
    let response = await this.http.get(`/servers/${serverId}/bans`);
    return response.data;
  }

  // ─── Roles ───────────────────────────────────────────────────

  async createRole(serverId: string, data: { name: string; rank?: number | null }) {
    let response = await this.http.post(`/servers/${serverId}/roles`, data);
    return response.data;
  }

  async fetchRole(serverId: string, roleId: string) {
    let response = await this.http.get(`/servers/${serverId}/roles/${roleId}`);
    return response.data;
  }

  async editRole(
    serverId: string,
    roleId: string,
    data: {
      name?: string | null;
      colour?: string | null;
      hoist?: boolean | null;
      rank?: number | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/servers/${serverId}/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(serverId: string, roleId: string) {
    await this.http.delete(`/servers/${serverId}/roles/${roleId}`);
  }

  async setRolePermission(
    serverId: string,
    roleId: string,
    permissions: { allow: number; deny: number }
  ) {
    let response = await this.http.put(`/servers/${serverId}/permissions/${roleId}`, {
      permissions
    });
    return response.data;
  }

  async setDefaultPermission(serverId: string, permissions: { allow: number; deny: number }) {
    let response = await this.http.put(`/servers/${serverId}/permissions/default`, {
      permissions
    });
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────────────

  async createWebhook(channelId: string, data: { name: string; avatar?: string | null }) {
    let response = await this.http.post(`/channels/${channelId}/webhooks`, data);
    return response.data;
  }

  async fetchWebhooks(channelId: string) {
    let response = await this.http.get(`/channels/${channelId}/webhooks`);
    return response.data;
  }

  async executeWebhook(
    webhookId: string,
    webhookToken: string,
    data: {
      content?: string | null;
      avatar?: string | null;
      username?: string | null;
      embeds?: Array<{
        icon_url?: string | null;
        url?: string | null;
        title?: string | null;
        description?: string | null;
        media?: string | null;
        colour?: string | null;
      }> | null;
    }
  ) {
    let http = createAxios({ baseURL: this.config.baseUrl });
    let response = await http.post(`/webhooks/${webhookId}/${webhookToken}`, data);
    return response.data;
  }

  // ─── Emoji ───────────────────────────────────────────────────

  async fetchServerEmoji(serverId: string) {
    let response = await this.http.get(`/servers/${serverId}/emojis`);
    return response.data;
  }

  async fetchEmoji(emojiId: string) {
    let response = await this.http.get(`/custom/emoji/${emojiId}`);
    return response.data;
  }

  async createEmoji(data: {
    name: string;
    parent: { type: string; id: string };
    nsfw?: boolean;
  }) {
    let response = await this.http.put(`/custom/emoji/${data.parent.id}`, {
      name: data.name,
      parent: data.parent,
      nsfw: data.nsfw
    });
    return response.data;
  }

  async deleteEmoji(emojiId: string) {
    await this.http.delete(`/custom/emoji/${emojiId}`);
  }

  // ─── Invites ─────────────────────────────────────────────────

  async createInvite(channelId: string) {
    let response = await this.http.post(`/channels/${channelId}/invites`);
    return response.data;
  }

  async fetchInvite(inviteCode: string) {
    let response = await this.http.get(`/invites/${inviteCode}`);
    return response.data;
  }

  async deleteInvite(inviteCode: string) {
    await this.http.delete(`/invites/${inviteCode}`);
  }

  async fetchServerInvites(serverId: string) {
    let response = await this.http.get(`/servers/${serverId}/invites`);
    return response.data;
  }

  // ─── Bots ────────────────────────────────────────────────────

  async createBot(name: string) {
    let response = await this.http.post('/bots/create', { name });
    return response.data;
  }

  async fetchBot(botId: string) {
    let response = await this.http.get(`/bots/${botId}`);
    return response.data;
  }

  async fetchOwnedBots() {
    let response = await this.http.get('/bots/@me');
    return response.data;
  }

  async editBot(
    botId: string,
    data: {
      name?: string | null;
      public?: boolean | null;
      analytics?: boolean | null;
      interactions_url?: string | null;
      remove?: string[] | null;
    }
  ) {
    let response = await this.http.patch(`/bots/${botId}`, data);
    return response.data;
  }

  async deleteBot(botId: string) {
    await this.http.delete(`/bots/${botId}`);
  }

  async inviteBot(botId: string, destination: { server?: string; group?: string }) {
    await this.http.post(`/bots/${botId}/invite`, destination);
  }

  // ─── Permissions ─────────────────────────────────────────────

  async setChannelRolePermission(
    channelId: string,
    roleId: string,
    permissions: { allow: number; deny: number }
  ) {
    let response = await this.http.put(`/channels/${channelId}/permissions/${roleId}`, {
      permissions
    });
    return response.data;
  }

  async setChannelDefaultPermission(
    channelId: string,
    permissions: { allow: number; deny: number }
  ) {
    let response = await this.http.put(`/channels/${channelId}/permissions/default`, {
      permissions
    });
    return response.data;
  }
}
