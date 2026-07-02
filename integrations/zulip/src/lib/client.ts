import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { serverUrl: string; email: string; token: string }) {
    this.axios = createAxios({
      baseURL: config.serverUrl,
      auth: {
        username: config.email,
        password: config.token
      }
    });
  }

  // ── Messages ──────────────────────────────────────────────────

  async sendMessage(params: {
    type: 'stream' | 'direct';
    to: string | number | number[];
    topic?: string;
    content: string;
  }) {
    let payload: Record<string, any> = {
      type: params.type,
      content: params.content
    };

    if (params.type === 'stream') {
      payload.to = params.to;
      if (params.topic) payload.topic = params.topic;
    } else {
      payload.to = JSON.stringify(Array.isArray(params.to) ? params.to : [params.to]);
    }

    let response = await this.axios.post('/api/v1/messages', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getMessages(params: {
    anchor?: string | number;
    numBefore: number;
    numAfter: number;
    narrow?: Array<{ operator: string; operand: string | number }>;
    applyMarkdown?: boolean;
  }) {
    let query: Record<string, any> = {
      anchor: params.anchor ?? 'newest',
      num_before: params.numBefore,
      num_after: params.numAfter
    };
    if (params.narrow) query.narrow = JSON.stringify(params.narrow);
    if (params.applyMarkdown !== undefined) query.apply_markdown = params.applyMarkdown;

    let response = await this.axios.get('/api/v1/messages', { params: query });
    return response.data;
  }

  async getMessage(messageId: number) {
    let response = await this.axios.get(`/api/v1/messages/${messageId}`);
    return response.data;
  }

  async updateMessage(
    messageId: number,
    params: {
      topic?: string;
      propagateMode?: string;
      content?: string;
    }
  ) {
    let payload: Record<string, any> = {};
    if (params.topic !== undefined) payload.topic = params.topic;
    if (params.propagateMode) payload.propagate_mode = params.propagateMode;
    if (params.content !== undefined) payload.content = params.content;

    let response = await this.axios.patch(`/api/v1/messages/${messageId}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteMessage(messageId: number) {
    let response = await this.axios.delete(`/api/v1/messages/${messageId}`);
    return response.data;
  }

  async addReaction(messageId: number, emojiName: string) {
    let response = await this.axios.post(
      `/api/v1/messages/${messageId}/reactions`,
      {
        emoji_name: emojiName
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async removeReaction(messageId: number, emojiName: string) {
    let response = await this.axios.delete(`/api/v1/messages/${messageId}/reactions`, {
      params: { emoji_name: emojiName }
    });
    return response.data;
  }

  async updateMessageFlags(params: {
    messages: number[];
    op: 'add' | 'remove';
    flag: string;
  }) {
    let response = await this.axios.post(
      '/api/v1/messages/flags',
      {
        messages: JSON.stringify(params.messages),
        op: params.op,
        flag: params.flag
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ── Channels (Streams) ───────────────────────────────────────

  async getChannels(params?: { includePublic?: boolean; includeSubscribed?: boolean }) {
    let query: Record<string, any> = {};
    if (params?.includePublic !== undefined) query.include_public = params.includePublic;
    if (params?.includeSubscribed !== undefined)
      query.include_subscribed = params.includeSubscribed;

    let response = await this.axios.get('/api/v1/streams', { params: query });
    return response.data;
  }

  async getChannelById(streamId: number) {
    let response = await this.axios.get(`/api/v1/streams/${streamId}`);
    return response.data;
  }

  async createChannel(params: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    historyPublicToSubscribers?: boolean;
  }) {
    let subscriptions = [
      {
        name: params.name,
        description: params.description || ''
      }
    ];

    let payload: Record<string, any> = {
      subscriptions: JSON.stringify(subscriptions)
    };

    if (params.isPrivate !== undefined) payload.invite_only = params.isPrivate;
    if (params.historyPublicToSubscribers !== undefined) {
      payload.history_public_to_subscribers = params.historyPublicToSubscribers;
    }

    let response = await this.axios.post('/api/v1/users/me/subscriptions', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateChannel(
    streamId: number,
    params: {
      name?: string;
      description?: string;
      isPrivate?: boolean;
    }
  ) {
    let payload: Record<string, any> = {};
    if (params.name !== undefined) payload.new_name = JSON.stringify(params.name);
    if (params.description !== undefined)
      payload.description = JSON.stringify(params.description);
    if (params.isPrivate !== undefined) payload.is_private = params.isPrivate;

    let response = await this.axios.patch(`/api/v1/streams/${streamId}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async archiveChannel(streamId: number) {
    let response = await this.axios.delete(`/api/v1/streams/${streamId}`);
    return response.data;
  }

  async getTopicsInChannel(streamId: number) {
    let response = await this.axios.get(`/api/v1/users/me/${streamId}/topics`);
    return response.data;
  }

  // ── Subscriptions ────────────────────────────────────────────

  async getSubscriptions() {
    let response = await this.axios.get('/api/v1/users/me/subscriptions');
    return response.data;
  }

  async subscribe(params: {
    subscriptions: Array<{ name: string; description?: string }>;
    principals?: number[];
  }) {
    let payload: Record<string, any> = {
      subscriptions: JSON.stringify(params.subscriptions)
    };
    if (params.principals) payload.principals = JSON.stringify(params.principals);

    let response = await this.axios.post('/api/v1/users/me/subscriptions', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async unsubscribe(params: { subscriptions: string[]; principals?: number[] }) {
    let payload: Record<string, any> = {
      subscriptions: JSON.stringify(params.subscriptions)
    };
    if (params.principals) payload.principals = JSON.stringify(params.principals);

    let response = await this.axios.delete('/api/v1/users/me/subscriptions', {
      data: payload,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ── Users ────────────────────────────────────────────────────

  async getUsers(params?: { includeCustomProfileFields?: boolean }) {
    let query: Record<string, any> = {};
    if (params?.includeCustomProfileFields) {
      query.include_custom_profile_fields = params.includeCustomProfileFields;
    }

    let response = await this.axios.get('/api/v1/users', { params: query });
    return response.data;
  }

  async getUserById(userId: number, params?: { includeCustomProfileFields?: boolean }) {
    let query: Record<string, any> = {};
    if (params?.includeCustomProfileFields) {
      query.include_custom_profile_fields = params.includeCustomProfileFields;
    }

    let response = await this.axios.get(`/api/v1/users/${userId}`, { params: query });
    return response.data;
  }

  async getUserByEmail(email: string, params?: { includeCustomProfileFields?: boolean }) {
    let query: Record<string, any> = {};
    if (params?.includeCustomProfileFields) {
      query.include_custom_profile_fields = params.includeCustomProfileFields;
    }

    let response = await this.axios.get(`/api/v1/users/${email}`, { params: query });
    return response.data;
  }

  async getOwnUser() {
    let response = await this.axios.get('/api/v1/users/me');
    return response.data;
  }

  async createUser(params: { email: string; password: string; fullName: string }) {
    let response = await this.axios.post(
      '/api/v1/users',
      {
        email: params.email,
        password: params.password,
        full_name: params.fullName
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async updateUser(
    userId: number,
    params: {
      fullName?: string;
      role?: number;
    }
  ) {
    let payload: Record<string, any> = {};
    if (params.fullName !== undefined) payload.full_name = params.fullName;
    if (params.role !== undefined) payload.role = params.role;

    let response = await this.axios.patch(`/api/v1/users/${userId}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deactivateUser(userId: number) {
    let response = await this.axios.delete(`/api/v1/users/${userId}`);
    return response.data;
  }

  async reactivateUser(userId: number) {
    let response = await this.axios.post(`/api/v1/users/${userId}/reactivate`);
    return response.data;
  }

  async getUserPresence(userId: number) {
    let response = await this.axios.get(`/api/v1/users/${userId}/presence`);
    return response.data;
  }

  async getPresenceAllUsers() {
    let response = await this.axios.get('/api/v1/realm/presence');
    return response.data;
  }

  async setUserStatus(params: { statusText?: string; emoji?: string; away?: boolean }) {
    let payload: Record<string, any> = {};
    if (params.statusText !== undefined) payload.status_text = params.statusText;
    if (params.emoji !== undefined) payload.emoji_name = params.emoji;
    if (params.away !== undefined) payload.away = params.away;

    let response = await this.axios.post('/api/v1/users/me/status', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ── User Groups ──────────────────────────────────────────────

  async getUserGroups() {
    let response = await this.axios.get('/api/v1/user_groups');
    return response.data;
  }

  async createUserGroup(params: { name: string; description: string; members: number[] }) {
    let response = await this.axios.post(
      '/api/v1/user_groups/create',
      {
        name: params.name,
        description: params.description,
        members: JSON.stringify(params.members)
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async updateUserGroup(
    userGroupId: number,
    params: {
      name?: string;
      description?: string;
    }
  ) {
    let payload: Record<string, any> = {};
    if (params.name !== undefined) payload.name = params.name;
    if (params.description !== undefined) payload.description = params.description;

    let response = await this.axios.patch(`/api/v1/user_groups/${userGroupId}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateUserGroupMembers(
    userGroupId: number,
    params: {
      add?: number[];
      remove?: number[];
    }
  ) {
    let payload: Record<string, any> = {};
    if (params.add) payload.add = JSON.stringify(params.add);
    if (params.remove) payload.delete = JSON.stringify(params.remove);

    let response = await this.axios.post(
      `/api/v1/user_groups/${userGroupId}/members`,
      payload,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ── Events / Polling ─────────────────────────────────────────

  async registerEventQueue(params: {
    eventTypes?: string[];
    narrow?: string[][];
    allPublicStreams?: boolean;
  }) {
    let payload: Record<string, any> = {};
    if (params.eventTypes) payload.event_types = JSON.stringify(params.eventTypes);
    if (params.narrow) payload.narrow = JSON.stringify(params.narrow);
    if (params.allPublicStreams !== undefined)
      payload.all_public_streams = params.allPublicStreams;

    let response = await this.axios.post('/api/v1/register', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getEvents(params: { queueId: string; lastEventId: number; dontBlock?: boolean }) {
    let query: Record<string, any> = {
      queue_id: params.queueId,
      last_event_id: params.lastEventId
    };
    if (params.dontBlock !== undefined) query.dont_block = params.dontBlock;

    let response = await this.axios.get('/api/v1/events', { params: query });
    return response.data;
  }

  async deleteEventQueue(queueId: string) {
    let response = await this.axios.delete('/api/v1/events', {
      data: { queue_id: queueId },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ── Organization ─────────────────────────────────────────────

  async getServerSettings() {
    let response = await this.axios.get('/api/v1/server_settings');
    return response.data;
  }

  async getCustomEmoji() {
    let response = await this.axios.get('/api/v1/realm/emoji');
    return response.data;
  }

  async getLinkifiers() {
    let response = await this.axios.get('/api/v1/realm/linkifiers');
    return response.data;
  }

  async getCustomProfileFields() {
    let response = await this.axios.get('/api/v1/realm/profile_fields');
    return response.data;
  }

  // ── Invitations ──────────────────────────────────────────────

  async sendInvitations(params: {
    inviteeEmails: string;
    streamIds: number[];
    includeRealmDefaultSubscriptions?: boolean;
    inviteExpiresInMinutes?: number;
  }) {
    let payload: Record<string, any> = {
      invitee_emails: params.inviteeEmails,
      stream_ids: JSON.stringify(params.streamIds)
    };
    if (params.includeRealmDefaultSubscriptions !== undefined) {
      payload.include_realm_default_subscriptions = params.includeRealmDefaultSubscriptions;
    }
    if (params.inviteExpiresInMinutes !== undefined) {
      payload.invite_expires_in_minutes = params.inviteExpiresInMinutes;
    }

    let response = await this.axios.post('/api/v1/invites', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async createReusableInviteLink(params: {
    streamIds: number[];
    includeRealmDefaultSubscriptions?: boolean;
    inviteExpiresInMinutes?: number;
  }) {
    let payload: Record<string, any> = {
      invite_as: 400,
      stream_ids: JSON.stringify(params.streamIds)
    };
    if (params.includeRealmDefaultSubscriptions !== undefined) {
      payload.include_realm_default_subscriptions = params.includeRealmDefaultSubscriptions;
    }
    if (params.inviteExpiresInMinutes !== undefined) {
      payload.invite_expires_in_minutes = params.inviteExpiresInMinutes;
    }

    let response = await this.axios.post('/api/v1/invites/multiuse', payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ── Drafts ───────────────────────────────────────────────────

  async getDrafts() {
    let response = await this.axios.get('/api/v1/drafts');
    return response.data;
  }

  async createDrafts(
    drafts: Array<{
      type: 'stream' | 'private';
      to: number[];
      topic: string;
      content: string;
    }>
  ) {
    let response = await this.axios.post(
      '/api/v1/drafts',
      {
        drafts: JSON.stringify(drafts)
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteDraft(draftId: number) {
    let response = await this.axios.delete(`/api/v1/drafts/${draftId}`);
    return response.data;
  }

  // ── File Upload ──────────────────────────────────────────────

  async uploadFile(fileName: string, fileContent: Uint8Array, contentType: string) {
    let formData = new FormData();
    let blob = new Blob([fileContent], { type: contentType });
    formData.append('file', blob, fileName);

    let response = await this.axios.post('/api/v1/user_uploads', formData);
    return response.data;
  }
}
