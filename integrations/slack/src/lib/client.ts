import { createAxios } from 'slates';
import { slackApiError, slackServiceError } from './errors';
import type {
  SlackBookmark,
  SlackConversation,
  SlackFile,
  SlackMessage,
  SlackPin,
  SlackReminder,
  SlackResponse,
  SlackScheduledMessage,
  SlackTeamInfo,
  SlackUser,
  SlackUserGroup
} from './types';

export class SlackClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://slack.com/api',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  private async call<T extends SlackResponse>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    let response = await this.axios.post(`/${method}`, params || {});
    let data = response.data as T;
    if (!data.ok) {
      throw slackApiError(method, data.error);
    }
    return data;
  }

  private async get<T extends SlackResponse>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    let response = await this.axios.get(`/${method}`, { params });
    let data = response.data as T;
    if (!data.ok) {
      throw slackApiError(method, data.error);
    }
    return data;
  }

  // ─── Messaging ──────────────────────────────────────────────────

  async postMessage(params: {
    channel: string;
    text?: string;
    blocks?: any[];
    threadTs?: string;
    replyBroadcast?: boolean;
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
    mrkdwn?: boolean;
    metadata?: any;
  }): Promise<SlackMessage> {
    let body: Record<string, any> = { channel: params.channel };
    if (params.text !== undefined) body.text = params.text;
    if (params.blocks) body.blocks = params.blocks;
    if (params.threadTs) body.thread_ts = params.threadTs;
    if (params.replyBroadcast) body.reply_broadcast = params.replyBroadcast;
    if (params.unfurlLinks !== undefined) body.unfurl_links = params.unfurlLinks;
    if (params.unfurlMedia !== undefined) body.unfurl_media = params.unfurlMedia;
    if (params.mrkdwn !== undefined) body.mrkdwn = params.mrkdwn;
    if (params.metadata) body.metadata = params.metadata;

    let data = await this.call<
      SlackResponse & { message: SlackMessage; ts: string; channel: string }
    >('chat.postMessage', body);
    return { ...data.message, ts: data.ts, channel: data.channel };
  }

  async postEphemeral(params: {
    channel: string;
    user: string;
    text?: string;
    blocks?: any[];
    threadTs?: string;
  }): Promise<string> {
    let body: Record<string, any> = { channel: params.channel, user: params.user };
    if (params.text !== undefined) body.text = params.text;
    if (params.blocks) body.blocks = params.blocks;
    if (params.threadTs) body.thread_ts = params.threadTs;

    let data = await this.call<SlackResponse & { message_ts: string }>(
      'chat.postEphemeral',
      body
    );
    return data.message_ts;
  }

  async updateMessage(params: {
    channel: string;
    ts: string;
    text?: string;
    blocks?: any[];
  }): Promise<SlackMessage> {
    let body: Record<string, any> = { channel: params.channel, ts: params.ts };
    if (params.text !== undefined) body.text = params.text;
    if (params.blocks) body.blocks = params.blocks;

    let data = await this.call<
      SlackResponse & { message: SlackMessage; ts: string; channel: string }
    >('chat.update', body);
    return { ...data.message, ts: data.ts, channel: data.channel };
  }

  async deleteMessage(params: { channel: string; ts: string }): Promise<void> {
    await this.call('chat.delete', { channel: params.channel, ts: params.ts });
  }

  async scheduleMessage(params: {
    channel: string;
    postAt: number;
    text?: string;
    blocks?: any[];
    threadTs?: string;
  }): Promise<{ scheduledMessageId: string; postAt: number }> {
    let body: Record<string, any> = {
      channel: params.channel,
      post_at: params.postAt
    };
    if (params.text !== undefined) body.text = params.text;
    if (params.blocks) body.blocks = params.blocks;
    if (params.threadTs) body.thread_ts = params.threadTs;

    let data = await this.call<
      SlackResponse & { scheduled_message_id: string; post_at: number }
    >('chat.scheduleMessage', body);
    return { scheduledMessageId: data.scheduled_message_id, postAt: data.post_at };
  }

  async deleteScheduledMessage(params: {
    channel: string;
    scheduledMessageId: string;
  }): Promise<void> {
    await this.call('chat.deleteScheduledMessage', {
      channel: params.channel,
      scheduled_message_id: params.scheduledMessageId
    });
  }

  async listScheduledMessages(params?: {
    channel?: string;
    oldest?: string;
    latest?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ scheduledMessages: SlackScheduledMessage[]; nextCursor?: string }> {
    let query: Record<string, any> = {};
    if (params?.channel) query.channel = params.channel;
    if (params?.oldest) query.oldest = params.oldest;
    if (params?.latest) query.latest = params.latest;
    if (params?.limit) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let data = await this.get<SlackResponse & { scheduled_messages: SlackScheduledMessage[] }>(
      'chat.scheduledMessages.list',
      query
    );
    return {
      scheduledMessages: data.scheduled_messages,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async getPermalink(params: { channel: string; messageTs: string }): Promise<string> {
    let data = await this.get<SlackResponse & { permalink: string }>('chat.getPermalink', {
      channel: params.channel,
      message_ts: params.messageTs
    });
    return data.permalink;
  }

  // ─── Conversations ─────────────────────────────────────────────

  async listConversations(params?: {
    types?: string;
    excludeArchived?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ channels: SlackConversation[]; nextCursor?: string }> {
    let query: Record<string, any> = {};
    if (params?.types) query.types = params.types;
    if (params?.excludeArchived !== undefined) query.exclude_archived = params.excludeArchived;
    if (params?.limit) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let data = await this.get<SlackResponse & { channels: SlackConversation[] }>(
      'conversations.list',
      query
    );
    return {
      channels: data.channels,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async getConversationInfo(channelId: string): Promise<SlackConversation> {
    let data = await this.get<SlackResponse & { channel: SlackConversation }>(
      'conversations.info',
      { channel: channelId }
    );
    return data.channel;
  }

  async createConversation(params: {
    name: string;
    isPrivate?: boolean;
  }): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.create',
      {
        name: params.name,
        is_private: params.isPrivate || false
      }
    );
    return data.channel;
  }

  async archiveConversation(channelId: string): Promise<void> {
    await this.call('conversations.archive', { channel: channelId });
  }

  async unarchiveConversation(channelId: string): Promise<void> {
    await this.call('conversations.unarchive', { channel: channelId });
  }

  async renameConversation(channelId: string, name: string): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.rename',
      {
        channel: channelId,
        name
      }
    );
    return data.channel;
  }

  async setConversationTopic(channelId: string, topic: string): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.setTopic',
      {
        channel: channelId,
        topic
      }
    );
    return data.channel;
  }

  async setConversationPurpose(
    channelId: string,
    purpose: string
  ): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.setPurpose',
      {
        channel: channelId,
        purpose
      }
    );
    return data.channel;
  }

  async inviteToConversation(
    channelId: string,
    userIds: string[]
  ): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.invite',
      {
        channel: channelId,
        users: userIds.join(',')
      }
    );
    return data.channel;
  }

  async kickFromConversation(channelId: string, userId: string): Promise<void> {
    await this.call('conversations.kick', { channel: channelId, user: userId });
  }

  async joinConversation(channelId: string): Promise<SlackConversation> {
    let data = await this.call<SlackResponse & { channel: SlackConversation }>(
      'conversations.join',
      {
        channel: channelId
      }
    );
    return data.channel;
  }

  async leaveConversation(channelId: string): Promise<void> {
    await this.call('conversations.leave', { channel: channelId });
  }

  async getConversationMembers(
    channelId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<{ members: string[]; nextCursor?: string }> {
    let query: Record<string, any> = { channel: channelId };
    if (params?.limit) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let data = await this.get<SlackResponse & { members: string[] }>(
      'conversations.members',
      query
    );
    return {
      members: data.members,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async getConversationHistory(params: {
    channel: string;
    limit?: number;
    cursor?: string;
    oldest?: string;
    latest?: string;
    inclusive?: boolean;
  }): Promise<{ messages: SlackMessage[]; hasMore: boolean; nextCursor?: string }> {
    let query: Record<string, any> = { channel: params.channel };
    if (params.limit) query.limit = params.limit;
    if (params.cursor) query.cursor = params.cursor;
    if (params.oldest) query.oldest = params.oldest;
    if (params.latest) query.latest = params.latest;
    if (params.inclusive !== undefined) query.inclusive = params.inclusive;

    let data = await this.get<SlackResponse & { messages: SlackMessage[]; has_more: boolean }>(
      'conversations.history',
      query
    );
    return {
      messages: data.messages,
      hasMore: data.has_more,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async getConversationReplies(params: {
    channel: string;
    ts: string;
    limit?: number;
    cursor?: string;
    oldest?: string;
    latest?: string;
    inclusive?: boolean;
  }): Promise<{ messages: SlackMessage[]; hasMore: boolean; nextCursor?: string }> {
    let query: Record<string, any> = { channel: params.channel, ts: params.ts };
    if (params.limit) query.limit = params.limit;
    if (params.cursor) query.cursor = params.cursor;
    if (params.oldest) query.oldest = params.oldest;
    if (params.latest) query.latest = params.latest;
    if (params.inclusive !== undefined) query.inclusive = params.inclusive;

    let data = await this.get<SlackResponse & { messages: SlackMessage[]; has_more: boolean }>(
      'conversations.replies',
      query
    );
    return {
      messages: data.messages,
      hasMore: data.has_more,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  // ─── Users ─────────────────────────────────────────────────────

  async listUsers(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ members: SlackUser[]; nextCursor?: string }> {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let data = await this.get<SlackResponse & { members: SlackUser[] }>('users.list', query);
    return {
      members: data.members,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async getUserInfo(userId: string): Promise<SlackUser> {
    let data = await this.get<SlackResponse & { user: SlackUser }>('users.info', {
      user: userId
    });
    return data.user;
  }

  async lookupUserByEmail(email: string): Promise<SlackUser> {
    let data = await this.get<SlackResponse & { user: SlackUser }>('users.lookupByEmail', {
      email
    });
    return data.user;
  }

  async getUserProfile(userId?: string): Promise<SlackUser['profile']> {
    let query: Record<string, any> = {};
    if (userId) query.user = userId;

    let data = await this.get<SlackResponse & { profile: SlackUser['profile'] }>(
      'users.profile.get',
      query
    );
    return data.profile;
  }

  async setUserProfile(profile: {
    statusText?: string;
    statusEmoji?: string;
    statusExpiration?: number;
  }): Promise<SlackUser['profile']> {
    let body: Record<string, any> = {
      profile: {}
    };
    if (profile.statusText !== undefined) body.profile.status_text = profile.statusText;
    if (profile.statusEmoji !== undefined) body.profile.status_emoji = profile.statusEmoji;
    if (profile.statusExpiration !== undefined) {
      body.profile.status_expiration = profile.statusExpiration;
    }

    let data = await this.call<SlackResponse & { profile: SlackUser['profile'] }>(
      'users.profile.set',
      body
    );
    return data.profile;
  }

  // ─── Reactions ─────────────────────────────────────────────────

  async addReaction(params: {
    channel: string;
    timestamp: string;
    name: string;
  }): Promise<void> {
    await this.call('reactions.add', {
      channel: params.channel,
      timestamp: params.timestamp,
      name: params.name
    });
  }

  async removeReaction(params: {
    channel: string;
    timestamp: string;
    name: string;
  }): Promise<void> {
    await this.call('reactions.remove', {
      channel: params.channel,
      timestamp: params.timestamp,
      name: params.name
    });
  }

  async getReactions(params: { channel: string; timestamp: string }): Promise<SlackMessage> {
    let data = await this.get<SlackResponse & { message: SlackMessage }>('reactions.get', {
      channel: params.channel,
      timestamp: params.timestamp,
      full: true
    });
    return data.message;
  }

  // ─── Pins ──────────────────────────────────────────────────────

  async addPin(params: { channel: string; timestamp: string }): Promise<void> {
    await this.call('pins.add', { channel: params.channel, timestamp: params.timestamp });
  }

  async removePin(params: { channel: string; timestamp: string }): Promise<void> {
    await this.call('pins.remove', { channel: params.channel, timestamp: params.timestamp });
  }

  async listPins(channelId: string): Promise<SlackPin[]> {
    let data = await this.get<SlackResponse & { items: SlackPin[] }>('pins.list', {
      channel: channelId
    });
    return data.items;
  }

  // ─── Files ─────────────────────────────────────────────────────

  async uploadFile(params: {
    channels?: string;
    content?: string;
    filename?: string;
    filetype?: string;
    initialComment?: string;
    title?: string;
    threadTs?: string;
  }): Promise<SlackFile> {
    let content = Buffer.from(params.content ?? '', 'utf8');
    let uploadBody = new URLSearchParams({
      filename: params.filename ?? params.title ?? 'upload.txt',
      length: String(content.byteLength)
    });
    if (params.filetype) uploadBody.set('snippet_type', params.filetype);
    let uploadResponseMetadata = await this.axios.post(
      '/files.getUploadURLExternal',
      uploadBody,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    let upload = uploadResponseMetadata.data as SlackResponse & {
      file_id: string;
      upload_url: string;
    };
    if (!upload.ok) {
      throw slackApiError('files.getUploadURLExternal', upload.error);
    }

    let uploadResponse = await fetch(upload.upload_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: content
    });
    if (!uploadResponse.ok) {
      throw slackServiceError(`Slack file upload failed: HTTP ${uploadResponse.status}`);
    }

    let completeBody: Record<string, any> = {
      files: [
        {
          id: upload.file_id,
          title: params.title ?? params.filename
        }
      ]
    };
    let channelIds = params.channels
      ?.split(',')
      .map(channel => channel.trim())
      .filter(Boolean);
    if (channelIds?.length === 1) completeBody.channel_id = channelIds[0];
    if (channelIds && channelIds.length > 1) completeBody.channels = channelIds.join(',');
    if (params.initialComment) completeBody.initial_comment = params.initialComment;
    if (params.threadTs) completeBody.thread_ts = params.threadTs;

    let data = await this.call<SlackResponse & { files: SlackFile[] }>(
      'files.completeUploadExternal',
      completeBody
    );
    return data.files[0]!;
  }

  async listFiles(params?: {
    channel?: string;
    user?: string;
    types?: string;
    count?: number;
    page?: number;
    tsFrom?: string;
    tsTo?: string;
  }): Promise<{ files: SlackFile[]; paging: any }> {
    let query: Record<string, any> = {};
    if (params?.channel) query.channel = params.channel;
    if (params?.user) query.user = params.user;
    if (params?.types) query.types = params.types;
    if (params?.count) query.count = params.count;
    if (params?.page) query.page = params.page;
    if (params?.tsFrom) query.ts_from = params.tsFrom;
    if (params?.tsTo) query.ts_to = params.tsTo;

    let data = await this.get<SlackResponse & { files: SlackFile[]; paging: any }>(
      'files.list',
      query
    );
    return { files: data.files, paging: data.paging };
  }

  async getFileInfo(fileId: string): Promise<SlackFile> {
    let data = await this.get<SlackResponse & { file: SlackFile }>('files.info', {
      file: fileId
    });
    return data.file;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.call('files.delete', { file: fileId });
  }

  // ─── User Groups ──────────────────────────────────────────────

  async listUserGroups(params?: {
    includeUsers?: boolean;
    includeCount?: boolean;
    includeDisabled?: boolean;
  }): Promise<SlackUserGroup[]> {
    let query: Record<string, any> = {};
    if (params?.includeUsers) query.include_users = params.includeUsers;
    if (params?.includeCount) query.include_count = params.includeCount;
    if (params?.includeDisabled) query.include_disabled = params.includeDisabled;

    let data = await this.get<SlackResponse & { usergroups: SlackUserGroup[] }>(
      'usergroups.list',
      query
    );
    return data.usergroups;
  }

  async createUserGroup(params: {
    name: string;
    handle?: string;
    description?: string;
    channels?: string[];
  }): Promise<SlackUserGroup> {
    let body: Record<string, any> = { name: params.name };
    if (params.handle) body.handle = params.handle;
    if (params.description) body.description = params.description;
    if (params.channels) body.channels = params.channels.join(',');

    let data = await this.call<SlackResponse & { usergroup: SlackUserGroup }>(
      'usergroups.create',
      body
    );
    return data.usergroup;
  }

  async updateUserGroup(params: {
    usergroupId: string;
    name?: string;
    handle?: string;
    description?: string;
    channels?: string[];
  }): Promise<SlackUserGroup> {
    let body: Record<string, any> = { usergroup: params.usergroupId };
    if (params.name) body.name = params.name;
    if (params.handle) body.handle = params.handle;
    if (params.description) body.description = params.description;
    if (params.channels) body.channels = params.channels.join(',');

    let data = await this.call<SlackResponse & { usergroup: SlackUserGroup }>(
      'usergroups.update',
      body
    );
    return data.usergroup;
  }

  async disableUserGroup(usergroupId: string): Promise<SlackUserGroup> {
    let data = await this.call<SlackResponse & { usergroup: SlackUserGroup }>(
      'usergroups.disable',
      { usergroup: usergroupId }
    );
    return data.usergroup;
  }

  async enableUserGroup(usergroupId: string): Promise<SlackUserGroup> {
    let data = await this.call<SlackResponse & { usergroup: SlackUserGroup }>(
      'usergroups.enable',
      { usergroup: usergroupId }
    );
    return data.usergroup;
  }

  async updateUserGroupMembers(
    usergroupId: string,
    userIds: string[]
  ): Promise<SlackUserGroup> {
    let data = await this.call<SlackResponse & { usergroup: SlackUserGroup }>(
      'usergroups.users.update',
      {
        usergroup: usergroupId,
        users: userIds.join(',')
      }
    );
    return data.usergroup;
  }

  async listUserGroupMembers(usergroupId: string): Promise<string[]> {
    let data = await this.get<SlackResponse & { users: string[] }>('usergroups.users.list', {
      usergroup: usergroupId
    });
    return data.users;
  }

  // ─── Reminders ─────────────────────────────────────────────────

  async addReminder(params: {
    text: string;
    time: string | number;
    user?: string;
  }): Promise<SlackReminder> {
    let body: Record<string, any> = { text: params.text, time: params.time };
    if (params.user) body.user = params.user;

    let data = await this.call<SlackResponse & { reminder: SlackReminder }>(
      'reminders.add',
      body
    );
    return data.reminder;
  }

  async completeReminder(reminderId: string): Promise<void> {
    await this.call('reminders.complete', { reminder: reminderId });
  }

  async deleteReminder(reminderId: string): Promise<void> {
    await this.call('reminders.delete', { reminder: reminderId });
  }

  async listReminders(): Promise<SlackReminder[]> {
    let data = await this.get<SlackResponse & { reminders: SlackReminder[] }>(
      'reminders.list'
    );
    return data.reminders;
  }

  // ─── Bookmarks ─────────────────────────────────────────────────

  async addBookmark(params: {
    channelId: string;
    title: string;
    type: string;
    link?: string;
    emoji?: string;
  }): Promise<SlackBookmark> {
    let data = await this.call<SlackResponse & { bookmark: SlackBookmark }>('bookmarks.add', {
      channel_id: params.channelId,
      title: params.title,
      type: params.type,
      link: params.link,
      emoji: params.emoji
    });
    return data.bookmark;
  }

  async editBookmark(params: {
    channelId: string;
    bookmarkId: string;
    title?: string;
    link?: string;
    emoji?: string;
  }): Promise<SlackBookmark> {
    let body: Record<string, any> = {
      channel_id: params.channelId,
      bookmark_id: params.bookmarkId
    };
    if (params.title) body.title = params.title;
    if (params.link) body.link = params.link;
    if (params.emoji) body.emoji = params.emoji;

    let data = await this.call<SlackResponse & { bookmark: SlackBookmark }>(
      'bookmarks.edit',
      body
    );
    return data.bookmark;
  }

  async removeBookmark(channelId: string, bookmarkId: string): Promise<void> {
    await this.call('bookmarks.remove', { channel_id: channelId, bookmark_id: bookmarkId });
  }

  async listBookmarks(channelId: string): Promise<SlackBookmark[]> {
    let data = await this.call<SlackResponse & { bookmarks: SlackBookmark[] }>(
      'bookmarks.list',
      { channel_id: channelId }
    );
    return data.bookmarks;
  }

  // ─── Team ──────────────────────────────────────────────────────

  async getTeamInfo(): Promise<SlackTeamInfo> {
    let data = await this.get<SlackResponse & { team: SlackTeamInfo }>('team.info');
    return data.team;
  }

  // ─── Search ───────────────────────────────────────────────────

  async searchMessages(params: {
    query: string;
    sort?: string;
    sortDir?: string;
    count?: number;
    page?: number;
  }): Promise<{ messages: { total: number; matches: any[] }; nextCursor?: string }> {
    let query: Record<string, any> = { query: params.query };
    if (params.sort) query.sort = params.sort;
    if (params.sortDir) query.sort_dir = params.sortDir;
    if (params.count) query.count = params.count;
    if (params.page) query.page = params.page;

    let data = await this.get<SlackResponse & { messages: { total: number; matches: any[] } }>(
      'search.messages',
      query
    );
    return { messages: data.messages };
  }

  async searchFiles(params: {
    query: string;
    sort?: string;
    sortDir?: string;
    count?: number;
    page?: number;
  }): Promise<{ files: { total: number; matches: any[] } }> {
    let query: Record<string, any> = { query: params.query };
    if (params.sort) query.sort = params.sort;
    if (params.sortDir) query.sort_dir = params.sortDir;
    if (params.count) query.count = params.count;
    if (params.page) query.page = params.page;

    let data = await this.get<SlackResponse & { files: { total: number; matches: any[] } }>(
      'search.files',
      query
    );
    return { files: data.files };
  }

  // ─── Open Conversation (DM) ───────────────────────────────────

  async openConversation(params: {
    users?: string;
    channel?: string;
    returnIm?: boolean;
  }): Promise<{
    channel: SlackConversation;
    alreadyOpen?: boolean;
    noOp?: boolean;
  }> {
    let body: Record<string, any> = {};
    if (params.users) body.users = params.users;
    if (params.channel) body.channel = params.channel;
    if (params.returnIm !== undefined) body.return_im = params.returnIm;

    let data = await this.call<
      SlackResponse & {
        channel: SlackConversation;
        already_open?: boolean;
        no_op?: boolean;
      }
    >('conversations.open', body);
    return {
      channel: data.channel,
      alreadyOpen: data.already_open,
      noOp: data.no_op
    };
  }
}
