import { createAxios } from '@slates/provider';
import { discordApiError } from './errors';

export class DiscordClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string; tokenType?: string }) {
    let authPrefix = config.tokenType === 'Bearer' ? 'Bearer' : 'Bot';

    this.api = createAxios({
      baseURL: 'https://discord.com/api/v10',
      headers: {
        Authorization: `${authPrefix} ${config.token}`
      }
    });

    this.api.interceptors.response.use(
      response => response,
      error => Promise.reject(discordApiError(error))
    );
  }

  // ── Guilds ──

  async getGuild(guildId: string, withCounts?: boolean): Promise<any> {
    let params: Record<string, string> = {};
    if (withCounts) params.with_counts = 'true';
    let response = await this.api.get(`/guilds/${guildId}`, { params });
    return response.data;
  }

  async listCurrentUserGuilds(
    limit?: number,
    before?: string,
    after?: string
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    if (before) params.before = before;
    if (after) params.after = after;
    let response = await this.api.get('/users/@me/guilds', { params });
    return response.data;
  }

  async modifyGuild(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/guilds/${guildId}`, data);
    return response.data;
  }

  // ── Channels ──

  async getChannel(channelId: string): Promise<any> {
    let response = await this.api.get(`/channels/${channelId}`);
    return response.data;
  }

  async getGuildChannels(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/channels`);
    return response.data;
  }

  async createGuildChannel(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/guilds/${guildId}/channels`, data);
    return response.data;
  }

  async modifyChannel(channelId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/channels/${channelId}`, data);
    return response.data;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await this.api.delete(`/channels/${channelId}`);
  }

  // ── Messages ──

  async getMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
      around?: string;
    }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.around) params.around = options.around;
    let response = await this.api.get(`/channels/${channelId}/messages`, { params });
    return response.data;
  }

  async getMessage(channelId: string, messageId: string): Promise<any> {
    let response = await this.api.get(`/channels/${channelId}/messages/${messageId}`);
    return response.data;
  }

  async createMessage(channelId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/channels/${channelId}/messages`, data);
    return response.data;
  }

  async editMessage(
    channelId: string,
    messageId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(`/channels/${channelId}/messages/${messageId}`, data);
    return response.data;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.api.delete(`/channels/${channelId}/messages/${messageId}`);
  }

  async bulkDeleteMessages(channelId: string, messageIds: string[]): Promise<void> {
    await this.api.post(`/channels/${channelId}/messages/bulk-delete`, {
      messages: messageIds
    });
  }

  async pinMessage(channelId: string, messageId: string): Promise<void> {
    await this.api.put(`/channels/${channelId}/pins/${messageId}`);
  }

  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    await this.api.delete(`/channels/${channelId}/pins/${messageId}`);
  }

  async getPinnedMessages(channelId: string): Promise<any[]> {
    let response = await this.api.get(`/channels/${channelId}/pins`);
    return response.data;
  }

  async crosspostMessage(channelId: string, messageId: string): Promise<any> {
    let response = await this.api.post(
      `/channels/${channelId}/messages/${messageId}/crosspost`
    );
    return response.data;
  }

  // ── Reactions ──

  async createReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    let encodedEmoji = encodeURIComponent(emoji);
    await this.api.put(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`
    );
  }

  async deleteOwnReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    let encodedEmoji = encodeURIComponent(emoji);
    await this.api.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`
    );
  }

  async deleteAllReactions(channelId: string, messageId: string): Promise<void> {
    await this.api.delete(`/channels/${channelId}/messages/${messageId}/reactions`);
  }

  // ── Members ──

  async getGuildMember(guildId: string, userId: string): Promise<any> {
    let response = await this.api.get(`/guilds/${guildId}/members/${userId}`);
    return response.data;
  }

  async listGuildMembers(
    guildId: string,
    options?: {
      limit?: number;
      after?: string;
    }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.after) params.after = options.after;
    let response = await this.api.get(`/guilds/${guildId}/members`, { params });
    return response.data;
  }

  async searchGuildMembers(guildId: string, query: string, limit?: number): Promise<any[]> {
    let params: Record<string, string> = { query };
    if (limit) params.limit = String(limit);
    let response = await this.api.get(`/guilds/${guildId}/members/search`, { params });
    return response.data;
  }

  async modifyGuildMember(
    guildId: string,
    userId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(`/guilds/${guildId}/members/${userId}`, data);
    return response.data;
  }

  async addGuildMemberRole(guildId: string, userId: string, roleId: string): Promise<void> {
    await this.api.put(`/guilds/${guildId}/members/${userId}/roles/${roleId}`);
  }

  async removeGuildMemberRole(guildId: string, userId: string, roleId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/members/${userId}/roles/${roleId}`);
  }

  async removeGuildMember(guildId: string, userId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/members/${userId}`);
  }

  // ── Bans ──

  async getGuildBans(
    guildId: string,
    options?: { limit?: number; before?: string; after?: string }
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    let response = await this.api.get(`/guilds/${guildId}/bans`, { params });
    return response.data;
  }

  async createGuildBan(
    guildId: string,
    userId: string,
    deleteMessageSeconds?: number
  ): Promise<void> {
    let data: Record<string, any> = {};
    if (deleteMessageSeconds !== undefined) data.delete_message_seconds = deleteMessageSeconds;
    await this.api.put(`/guilds/${guildId}/bans/${userId}`, data);
  }

  async removeGuildBan(guildId: string, userId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/bans/${userId}`);
  }

  // ── Roles ──

  async getGuildRoles(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/roles`);
    return response.data;
  }

  async createGuildRole(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/guilds/${guildId}/roles`, data);
    return response.data;
  }

  async modifyGuildRole(
    guildId: string,
    roleId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(`/guilds/${guildId}/roles/${roleId}`, data);
    return response.data;
  }

  async deleteGuildRole(guildId: string, roleId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/roles/${roleId}`);
  }

  // ── Threads ──

  async startThreadFromMessage(
    channelId: string,
    messageId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(
      `/channels/${channelId}/messages/${messageId}/threads`,
      data
    );
    return response.data;
  }

  async startThreadWithoutMessage(channelId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/channels/${channelId}/threads`, data);
    return response.data;
  }

  async listActiveThreads(guildId: string): Promise<any> {
    let response = await this.api.get(`/guilds/${guildId}/threads/active`);
    return response.data;
  }

  // ── Webhooks ──

  async createWebhook(
    channelId: string,
    data: { name: string; avatar?: string }
  ): Promise<any> {
    let response = await this.api.post(`/channels/${channelId}/webhooks`, data);
    return response.data;
  }

  async getChannelWebhooks(channelId: string): Promise<any[]> {
    let response = await this.api.get(`/channels/${channelId}/webhooks`);
    return response.data;
  }

  async getGuildWebhooks(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/webhooks`);
    return response.data;
  }

  async modifyWebhook(webhookId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.api.delete(`/webhooks/${webhookId}`);
  }

  async executeWebhook(
    webhookId: string,
    webhookToken: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(
      `/webhooks/${webhookId}/${webhookToken}?wait=true`,
      data
    );
    return response.data;
  }

  // ── Invites ──

  async createChannelInvite(channelId: string, data?: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/channels/${channelId}/invites`, data || {});
    return response.data;
  }

  async getChannelInvites(channelId: string): Promise<any[]> {
    let response = await this.api.get(`/channels/${channelId}/invites`);
    return response.data;
  }

  async getGuildInvites(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/invites`);
    return response.data;
  }

  async deleteInvite(inviteCode: string): Promise<any> {
    let response = await this.api.delete(`/invites/${inviteCode}`);
    return response.data;
  }

  // ── Emojis ──

  async listGuildEmojis(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/emojis`);
    return response.data;
  }

  async getGuildEmoji(guildId: string, emojiId: string): Promise<any> {
    let response = await this.api.get(`/guilds/${guildId}/emojis/${emojiId}`);
    return response.data;
  }

  async createGuildEmoji(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/guilds/${guildId}/emojis`, data);
    return response.data;
  }

  async modifyGuildEmoji(
    guildId: string,
    emojiId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(`/guilds/${guildId}/emojis/${emojiId}`, data);
    return response.data;
  }

  async deleteGuildEmoji(guildId: string, emojiId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/emojis/${emojiId}`);
  }

  // ── Scheduled Events ──

  async listGuildScheduledEvents(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/scheduled-events`);
    return response.data;
  }

  async createGuildScheduledEvent(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/guilds/${guildId}/scheduled-events`, data);
    return response.data;
  }

  async modifyGuildScheduledEvent(
    guildId: string,
    eventId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(
      `/guilds/${guildId}/scheduled-events/${eventId}`,
      data
    );
    return response.data;
  }

  async deleteGuildScheduledEvent(guildId: string, eventId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/scheduled-events/${eventId}`);
  }

  // ── Auto Moderation ──

  async listAutoModerationRules(guildId: string): Promise<any[]> {
    let response = await this.api.get(`/guilds/${guildId}/auto-moderation/rules`);
    return response.data;
  }

  async getAutoModerationRule(guildId: string, ruleId: string): Promise<any> {
    let response = await this.api.get(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`);
    return response.data;
  }

  async createAutoModerationRule(guildId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/guilds/${guildId}/auto-moderation/rules`, data);
    return response.data;
  }

  async modifyAutoModerationRule(
    guildId: string,
    ruleId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(
      `/guilds/${guildId}/auto-moderation/rules/${ruleId}`,
      data
    );
    return response.data;
  }

  async deleteAutoModerationRule(guildId: string, ruleId: string): Promise<void> {
    await this.api.delete(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`);
  }

  // ── Audit Log ──

  async getGuildAuditLog(
    guildId: string,
    options?: {
      userId?: string;
      actionType?: number;
      before?: string;
      after?: string;
      limit?: number;
    }
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (options?.userId) params.user_id = options.userId;
    if (options?.actionType !== undefined) params.action_type = String(options.actionType);
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.limit) params.limit = String(options.limit);
    let response = await this.api.get(`/guilds/${guildId}/audit-logs`, { params });
    return response.data;
  }

  // ── Users ──

  async getCurrentUser(): Promise<any> {
    let response = await this.api.get('/users/@me');
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  // ── Application Commands ──

  async getGlobalApplicationCommands(
    applicationId: string,
    withLocalizations?: boolean
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (withLocalizations !== undefined) {
      params.with_localizations = String(withLocalizations);
    }
    let response = await this.api.get(`/applications/${applicationId}/commands`, { params });
    return response.data;
  }

  async getGlobalApplicationCommand(applicationId: string, commandId: string): Promise<any> {
    let response = await this.api.get(`/applications/${applicationId}/commands/${commandId}`);
    return response.data;
  }

  async createGlobalApplicationCommand(
    applicationId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(`/applications/${applicationId}/commands`, data);
    return response.data;
  }

  async editGlobalApplicationCommand(
    applicationId: string,
    commandId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(
      `/applications/${applicationId}/commands/${commandId}`,
      data
    );
    return response.data;
  }

  async deleteGlobalApplicationCommand(
    applicationId: string,
    commandId: string
  ): Promise<void> {
    await this.api.delete(`/applications/${applicationId}/commands/${commandId}`);
  }

  async getGuildApplicationCommands(
    applicationId: string,
    guildId: string,
    withLocalizations?: boolean
  ): Promise<any[]> {
    let params: Record<string, string> = {};
    if (withLocalizations !== undefined) {
      params.with_localizations = String(withLocalizations);
    }
    let response = await this.api.get(
      `/applications/${applicationId}/guilds/${guildId}/commands`,
      { params }
    );
    return response.data;
  }

  async getGuildApplicationCommand(
    applicationId: string,
    guildId: string,
    commandId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`
    );
    return response.data;
  }

  async createGuildApplicationCommand(
    applicationId: string,
    guildId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(
      `/applications/${applicationId}/guilds/${guildId}/commands`,
      data
    );
    return response.data;
  }

  async editGuildApplicationCommand(
    applicationId: string,
    guildId: string,
    commandId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.patch(
      `/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`,
      data
    );
    return response.data;
  }

  async deleteGuildApplicationCommand(
    applicationId: string,
    guildId: string,
    commandId: string
  ): Promise<void> {
    await this.api.delete(
      `/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`
    );
  }
}
