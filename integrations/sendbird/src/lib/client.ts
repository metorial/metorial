import { createAxios } from 'slates';

export class SendbirdChatClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { applicationId: string; token: string }) {
    this.axios = createAxios({
      baseURL: `https://api-${config.applicationId}.sendbird.com/v3`,
      headers: {
        'Api-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──

  async createUser(params: {
    userId: string;
    nickname: string;
    profileUrl?: string;
    profileFile?: string;
    issueAccessToken?: boolean;
    issueSessionToken?: boolean;
    metadata?: Record<string, string>;
  }) {
    let body: Record<string, unknown> = {
      user_id: params.userId,
      nickname: params.nickname,
      profile_url: params.profileUrl ?? ''
    };
    if (params.issueAccessToken !== undefined)
      body.issue_access_token = params.issueAccessToken;
    if (params.issueSessionToken !== undefined)
      body.issue_session_token = params.issueSessionToken;
    if (params.metadata) body.metadata = params.metadata;

    let response = await this.axios.post('/users', body);
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async updateUser(
    userId: string,
    params: {
      nickname?: string;
      profileUrl?: string;
      isActive?: boolean;
      leaveAllWhenDeactivated?: boolean;
      metadata?: Record<string, string>;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.nickname !== undefined) body.nickname = params.nickname;
    if (params.profileUrl !== undefined) body.profile_url = params.profileUrl;
    if (params.isActive !== undefined) body.is_active = params.isActive;
    if (params.leaveAllWhenDeactivated !== undefined)
      body.leave_all_when_deactivated = params.leaveAllWhenDeactivated;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    let response = await this.axios.put(`/users/${encodeURIComponent(userId)}`, body);
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async listUsers(params?: {
    limit?: number;
    token?: string;
    activeMode?: string;
    showBot?: boolean;
    userIds?: string[];
    nickname?: string;
    nicknameStartswith?: string;
    metadatakey?: string;
    metadatavaluesIn?: string;
  }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;
    if (params?.activeMode) queryParams.active_mode = params.activeMode;
    if (params?.showBot !== undefined) queryParams.show_bot = params.showBot;
    if (params?.userIds && params.userIds.length > 0)
      queryParams.user_ids = params.userIds.join(',');
    if (params?.nickname) queryParams.nickname = params.nickname;
    if (params?.nicknameStartswith)
      queryParams.nickname_startswith = params.nicknameStartswith;
    if (params?.metadatakey) queryParams.metadatakey = params.metadatakey;
    if (params?.metadatavaluesIn) queryParams.metadatavalues_in = params.metadatavaluesIn;

    let response = await this.axios.get('/users', { params: queryParams });
    return response.data;
  }

  // ── Group Channels ──

  async createGroupChannel(params: {
    name?: string;
    channelUrl?: string;
    coverUrl?: string;
    customType?: string;
    data?: string;
    userIds?: string[];
    operatorIds?: string[];
    isDistinct?: boolean;
    isPublic?: boolean;
    isSuper?: boolean;
    isEphemeral?: boolean;
    accessCode?: string;
    inviterId?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.channelUrl !== undefined) body.channel_url = params.channelUrl;
    if (params.coverUrl !== undefined) body.cover_url = params.coverUrl;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.userIds !== undefined) body.user_ids = params.userIds;
    if (params.operatorIds !== undefined) body.operator_ids = params.operatorIds;
    if (params.isDistinct !== undefined) body.is_distinct = params.isDistinct;
    if (params.isPublic !== undefined) body.is_public = params.isPublic;
    if (params.isSuper !== undefined) body.is_super = params.isSuper;
    if (params.isEphemeral !== undefined) body.is_ephemeral = params.isEphemeral;
    if (params.accessCode !== undefined) body.access_code = params.accessCode;
    if (params.inviterId !== undefined) body.inviter_id = params.inviterId;

    let response = await this.axios.post('/group_channels', body);
    return response.data;
  }

  async getGroupChannel(channelUrl: string) {
    let response = await this.axios.get(`/group_channels/${encodeURIComponent(channelUrl)}`);
    return response.data;
  }

  async updateGroupChannel(
    channelUrl: string,
    params: {
      name?: string;
      coverUrl?: string;
      customType?: string;
      data?: string;
      isDistinct?: boolean;
      isPublic?: boolean;
      accessCode?: string;
      operatorIds?: string[];
      isFrozen?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.coverUrl !== undefined) body.cover_url = params.coverUrl;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.isDistinct !== undefined) body.is_distinct = params.isDistinct;
    if (params.isPublic !== undefined) body.is_public = params.isPublic;
    if (params.accessCode !== undefined) body.access_code = params.accessCode;
    if (params.operatorIds !== undefined) body.operator_ids = params.operatorIds;
    if (params.isFrozen !== undefined) body.freeze = params.isFrozen;

    let response = await this.axios.put(
      `/group_channels/${encodeURIComponent(channelUrl)}`,
      body
    );
    return response.data;
  }

  async deleteGroupChannel(channelUrl: string) {
    let response = await this.axios.delete(
      `/group_channels/${encodeURIComponent(channelUrl)}`
    );
    return response.data;
  }

  async listGroupChannels(params?: {
    limit?: number;
    token?: string;
    showMember?: boolean;
    showReadReceipt?: boolean;
    showDeliveryReceipt?: boolean;
    showEmpty?: boolean;
    showFrozen?: boolean;
    distinctMode?: string;
    publicMode?: string;
    superMode?: string;
    membersExactlyIn?: string[];
    membersIncludeIn?: string[];
    nameContains?: string;
    nameStartswith?: string;
    customType?: string;
    channelUrls?: string[];
    createdAfter?: number;
    createdBefore?: number;
  }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;
    if (params?.showMember !== undefined) queryParams.show_member = params.showMember;
    if (params?.showReadReceipt !== undefined)
      queryParams.show_read_receipt = params.showReadReceipt;
    if (params?.showDeliveryReceipt !== undefined)
      queryParams.show_delivery_receipt = params.showDeliveryReceipt;
    if (params?.showEmpty !== undefined) queryParams.show_empty = params.showEmpty;
    if (params?.showFrozen !== undefined) queryParams.show_frozen = params.showFrozen;
    if (params?.distinctMode) queryParams.distinct_mode = params.distinctMode;
    if (params?.publicMode) queryParams.public_mode = params.publicMode;
    if (params?.superMode) queryParams.super_mode = params.superMode;
    if (params?.membersExactlyIn)
      queryParams.members_exactly_in = params.membersExactlyIn.join(',');
    if (params?.membersIncludeIn)
      queryParams.members_include_in = params.membersIncludeIn.join(',');
    if (params?.nameContains) queryParams.name_contains = params.nameContains;
    if (params?.nameStartswith) queryParams.name_startswith = params.nameStartswith;
    if (params?.customType) queryParams.custom_type = params.customType;
    if (params?.channelUrls) queryParams.channel_urls = params.channelUrls.join(',');
    if (params?.createdAfter !== undefined) queryParams.created_after = params.createdAfter;
    if (params?.createdBefore !== undefined) queryParams.created_before = params.createdBefore;

    let response = await this.axios.get('/group_channels', { params: queryParams });
    return response.data;
  }

  async inviteToGroupChannel(channelUrl: string, userIds: string[]) {
    let response = await this.axios.post(
      `/group_channels/${encodeURIComponent(channelUrl)}/invite`,
      {
        user_ids: userIds
      }
    );
    return response.data;
  }

  async leaveGroupChannel(channelUrl: string, userIds: string[]) {
    let response = await this.axios.put(
      `/group_channels/${encodeURIComponent(channelUrl)}/leave`,
      {
        user_ids: userIds
      }
    );
    return response.data;
  }

  // ── Open Channels ──

  async createOpenChannel(params: {
    name?: string;
    channelUrl?: string;
    coverUrl?: string;
    customType?: string;
    data?: string;
    operatorIds?: string[];
  }) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.channelUrl !== undefined) body.channel_url = params.channelUrl;
    if (params.coverUrl !== undefined) body.cover_url = params.coverUrl;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.operatorIds !== undefined) body.operator_ids = params.operatorIds;

    let response = await this.axios.post('/open_channels', body);
    return response.data;
  }

  async getOpenChannel(channelUrl: string) {
    let response = await this.axios.get(`/open_channels/${encodeURIComponent(channelUrl)}`);
    return response.data;
  }

  async updateOpenChannel(
    channelUrl: string,
    params: {
      name?: string;
      coverUrl?: string;
      customType?: string;
      data?: string;
      operatorIds?: string[];
      isFrozen?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.coverUrl !== undefined) body.cover_url = params.coverUrl;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.operatorIds !== undefined) body.operator_ids = params.operatorIds;
    if (params.isFrozen !== undefined) body.freeze = params.isFrozen;

    let response = await this.axios.put(
      `/open_channels/${encodeURIComponent(channelUrl)}`,
      body
    );
    return response.data;
  }

  async deleteOpenChannel(channelUrl: string) {
    let response = await this.axios.delete(`/open_channels/${encodeURIComponent(channelUrl)}`);
    return response.data;
  }

  async listOpenChannels(params?: {
    limit?: number;
    token?: string;
    nameContains?: string;
    nameStartswith?: string;
    customType?: string;
    showFrozen?: boolean;
  }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;
    if (params?.nameContains) queryParams.name_contains = params.nameContains;
    if (params?.nameStartswith) queryParams.name_startswith = params.nameStartswith;
    if (params?.customType) queryParams.custom_type = params.customType;
    if (params?.showFrozen !== undefined) queryParams.show_frozen = params.showFrozen;

    let response = await this.axios.get('/open_channels', { params: queryParams });
    return response.data;
  }

  // ── Messages ──

  async sendMessage(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params: {
      messageType: 'MESG' | 'FILE' | 'ADMM';
      userId?: string;
      message?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      customType?: string;
      data?: string;
      mentionType?: string;
      mentionedUserIds?: string[];
      sortedMetaarray?: Array<{ key: string; value: string[] }>;
      dedupId?: string;
      apnsBundleId?: string;
      pushMessageTemplate?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      message_type: params.messageType
    };
    if (params.userId !== undefined) body.user_id = params.userId;
    if (params.message !== undefined) body.message = params.message;
    if (params.fileUrl !== undefined) body.file_url = params.fileUrl;
    if (params.fileName !== undefined) body.file_name = params.fileName;
    if (params.fileType !== undefined) body.file_type = params.fileType;
    if (params.fileSize !== undefined) body.file_size = params.fileSize;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.mentionType !== undefined) body.mention_type = params.mentionType;
    if (params.mentionedUserIds !== undefined)
      body.mentioned_user_ids = params.mentionedUserIds;
    if (params.sortedMetaarray !== undefined) body.sorted_metaarray = params.sortedMetaarray;
    if (params.dedupId !== undefined) body.dedup_id = params.dedupId;

    let response = await this.axios.post(
      `/${channelType}/${encodeURIComponent(channelUrl)}/messages`,
      body
    );
    return response.data;
  }

  async listMessages(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params: {
      messageTs?: number;
      messageId?: number;
      prevLimit?: number;
      nextLimit?: number;
      include?: boolean;
      reverse?: boolean;
      senderId?: string;
      senderIds?: string[];
      messageType?: string;
      customType?: string;
      includeReactions?: boolean;
      includeThreadInfo?: boolean;
      includeParentMessageInfo?: boolean;
    }
  ) {
    let queryParams: Record<string, unknown> = {};
    if (params.messageTs !== undefined) queryParams.message_ts = params.messageTs;
    if (params.messageId !== undefined) queryParams.message_id = params.messageId;
    if (params.prevLimit !== undefined) queryParams.prev_limit = params.prevLimit;
    if (params.nextLimit !== undefined) queryParams.next_limit = params.nextLimit;
    if (params.include !== undefined) queryParams.include = params.include;
    if (params.reverse !== undefined) queryParams.reverse = params.reverse;
    if (params.senderId) queryParams.sender_id = params.senderId;
    if (params.senderIds) queryParams.sender_ids = params.senderIds.join(',');
    if (params.messageType) queryParams.message_type = params.messageType;
    if (params.customType) queryParams.custom_type = params.customType;
    if (params.includeReactions !== undefined)
      queryParams.include_reactions = params.includeReactions;
    if (params.includeThreadInfo !== undefined)
      queryParams.include_thread_info = params.includeThreadInfo;
    if (params.includeParentMessageInfo !== undefined)
      queryParams.include_parent_message_info = params.includeParentMessageInfo;

    let response = await this.axios.get(
      `/${channelType}/${encodeURIComponent(channelUrl)}/messages`,
      { params: queryParams }
    );
    return response.data;
  }

  async updateMessage(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    messageId: number,
    params: {
      messageType: 'MESG' | 'FILE' | 'ADMM';
      message?: string;
      customType?: string;
      data?: string;
      mentionType?: string;
      mentionedUserIds?: string[];
    }
  ) {
    let body: Record<string, unknown> = {
      message_type: params.messageType
    };
    if (params.message !== undefined) body.message = params.message;
    if (params.customType !== undefined) body.custom_type = params.customType;
    if (params.data !== undefined) body.data = params.data;
    if (params.mentionType !== undefined) body.mention_type = params.mentionType;
    if (params.mentionedUserIds !== undefined)
      body.mentioned_user_ids = params.mentionedUserIds;

    let response = await this.axios.put(
      `/${channelType}/${encodeURIComponent(channelUrl)}/messages/${messageId}`,
      body
    );
    return response.data;
  }

  async deleteMessage(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    messageId: number
  ) {
    let response = await this.axios.delete(
      `/${channelType}/${encodeURIComponent(channelUrl)}/messages/${messageId}`
    );
    return response.data;
  }

  async searchMessages(params: {
    query: string;
    channelUrl?: string;
    channelCustomType?: string;
    limit?: number;
    beforeTimestamp?: number;
    afterTimestamp?: number;
    token?: string;
    sortField?: string;
    userId?: string;
  }) {
    let queryParams: Record<string, unknown> = {
      query: params.query
    };
    if (params.channelUrl) queryParams.channel_url = params.channelUrl;
    if (params.channelCustomType) queryParams.channel_custom_type = params.channelCustomType;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.beforeTimestamp !== undefined) queryParams.before = params.beforeTimestamp;
    if (params.afterTimestamp !== undefined) queryParams.after = params.afterTimestamp;
    if (params.token) queryParams.token = params.token;
    if (params.sortField) queryParams.sort_field = params.sortField;
    if (params.userId) queryParams.user_id = params.userId;

    let response = await this.axios.get('/search/messages', { params: queryParams });
    return response.data;
  }

  // ── Moderation ──

  async banUserFromChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params: {
      userId: string;
      agentId?: string;
      seconds?: number;
      description?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      user_id: params.userId
    };
    if (params.agentId !== undefined) body.agent_id = params.agentId;
    if (params.seconds !== undefined) body.seconds = params.seconds;
    if (params.description !== undefined) body.description = params.description;

    let response = await this.axios.post(
      `/${channelType}/${encodeURIComponent(channelUrl)}/ban`,
      body
    );
    return response.data;
  }

  async unbanUserFromChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    userId: string
  ) {
    let response = await this.axios.delete(
      `/${channelType}/${encodeURIComponent(channelUrl)}/ban/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async muteUserInChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params: {
      userId: string;
      seconds?: number;
      description?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      user_id: params.userId
    };
    if (params.seconds !== undefined) body.seconds = params.seconds;
    if (params.description !== undefined) body.description = params.description;

    let response = await this.axios.post(
      `/${channelType}/${encodeURIComponent(channelUrl)}/mute`,
      body
    );
    return response.data;
  }

  async unmuteUserInChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    userId: string
  ) {
    let response = await this.axios.delete(
      `/${channelType}/${encodeURIComponent(channelUrl)}/mute/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async blockUser(userId: string, targetUserId: string) {
    let response = await this.axios.post(`/users/${encodeURIComponent(userId)}/block`, {
      target_id: targetUserId
    });
    return response.data;
  }

  async unblockUser(userId: string, targetUserId: string) {
    let response = await this.axios.delete(
      `/users/${encodeURIComponent(userId)}/block/${encodeURIComponent(targetUserId)}`
    );
    return response.data;
  }

  async listBannedUsers(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params?: {
      limit?: number;
      token?: string;
    }
  ) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;

    let response = await this.axios.get(
      `/${channelType}/${encodeURIComponent(channelUrl)}/ban`,
      { params: queryParams }
    );
    return response.data;
  }

  async listMutedUsers(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params?: {
      limit?: number;
      token?: string;
    }
  ) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;

    let response = await this.axios.get(
      `/${channelType}/${encodeURIComponent(channelUrl)}/mute`,
      { params: queryParams }
    );
    return response.data;
  }

  async freezeChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    freeze: boolean
  ) {
    let response = await this.axios.put(
      `/${channelType}/${encodeURIComponent(channelUrl)}/freeze`,
      {
        freeze
      }
    );
    return response.data;
  }

  // ── Channel Members ──

  async listGroupChannelMembers(
    channelUrl: string,
    params?: {
      limit?: number;
      token?: string;
      showReadReceipt?: boolean;
      showDeliveryReceipt?: boolean;
    }
  ) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;
    if (params?.showReadReceipt !== undefined)
      queryParams.show_read_receipt = params.showReadReceipt;
    if (params?.showDeliveryReceipt !== undefined)
      queryParams.show_delivery_receipt = params.showDeliveryReceipt;

    let response = await this.axios.get(
      `/group_channels/${encodeURIComponent(channelUrl)}/members`,
      { params: queryParams }
    );
    return response.data;
  }

  // ── Announcements ──

  async createAnnouncement(params: {
    uniqueId: string;
    announcementGroup: string;
    message: {
      type: 'MESG' | 'ADMM';
      userId: string;
      content: string;
      data?: string;
      customType?: string;
    };
    targetAt: 'all' | 'sender_all_channels' | 'custom' | 'target_channels';
    targetList?: string[];
    targetChannelType?: string;
    enablePush?: boolean;
    scheduledAt?: string;
    ceaseAt?: string;
    resumeAt?: string;
    createChannel?: boolean;
    createChannelOptions?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      unique_id: params.uniqueId,
      announcement_group: params.announcementGroup,
      message: {
        type: params.message.type,
        user_id: params.message.userId,
        content: params.message.content,
        data: params.message.data,
        custom_type: params.message.customType
      },
      target_at: params.targetAt
    };
    if (params.targetList) body.target_list = params.targetList;
    if (params.targetChannelType) body.target_channel_type = params.targetChannelType;
    if (params.enablePush !== undefined) body.enable_push = params.enablePush;
    if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
    if (params.ceaseAt) body.cease_at = params.ceaseAt;
    if (params.resumeAt) body.resume_at = params.resumeAt;
    if (params.createChannel !== undefined) body.create_channel = params.createChannel;
    if (params.createChannelOptions) body.create_channel_options = params.createChannelOptions;

    let response = await this.axios.post('/announcements', body);
    return response.data;
  }

  async listAnnouncements(params?: { limit?: number; token?: string; status?: string[] }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.token) queryParams.token = params.token;
    if (params?.status) queryParams.status = params.status.join(',');

    let response = await this.axios.get('/announcements', { params: queryParams });
    return response.data;
  }

  async getAnnouncement(uniqueId: string) {
    let response = await this.axios.get(`/announcements/${encodeURIComponent(uniqueId)}`);
    return response.data;
  }

  // ── Reports ──

  async reportUser(params: {
    offendingUserId: string;
    reportType: string;
    reportCategory: string;
    reportingUserId?: string;
    reportDescription?: string;
  }) {
    let body: Record<string, unknown> = {
      offending_user_id: params.offendingUserId,
      report_type: params.reportType,
      report_category: params.reportCategory
    };
    if (params.reportingUserId) body.reporting_user_id = params.reportingUserId;
    if (params.reportDescription) body.report_description = params.reportDescription;

    let response = await this.axios.post('/report/users', body);
    return response.data;
  }

  async reportMessage(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    messageId: number,
    params: {
      reportType: string;
      reportCategory: string;
      reportingUserId?: string;
      offendingUserId?: string;
      reportDescription?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      report_type: params.reportType,
      report_category: params.reportCategory
    };
    if (params.reportingUserId) body.reporting_user_id = params.reportingUserId;
    if (params.offendingUserId) body.offending_user_id = params.offendingUserId;
    if (params.reportDescription) body.report_description = params.reportDescription;

    let response = await this.axios.post(
      `/report/${channelType}/${encodeURIComponent(channelUrl)}/messages/${messageId}`,
      body
    );
    return response.data;
  }

  async reportChannel(
    channelType: 'group_channels' | 'open_channels',
    channelUrl: string,
    params: {
      reportType: string;
      reportCategory: string;
      reportingUserId?: string;
      reportDescription?: string;
    }
  ) {
    let body: Record<string, unknown> = {
      report_type: params.reportType,
      report_category: params.reportCategory
    };
    if (params.reportingUserId) body.reporting_user_id = params.reportingUserId;
    if (params.reportDescription) body.report_description = params.reportDescription;

    let response = await this.axios.post(
      `/report/${channelType}/${encodeURIComponent(channelUrl)}`,
      body
    );
    return response.data;
  }
}
