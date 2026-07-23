import { ServiceError } from '@lowerdeck/error';
import { createAxios } from 'slates';
import { slackApiError, slackRequestError, slackServiceError } from './errors';
import type {
  SlackAuthIdentity,
  SlackBookmark,
  SlackCanvas,
  SlackCanvasSection,
  SlackConversation,
  SlackDndInfo,
  SlackFile,
  SlackFileDownload,
  SlackList,
  SlackListDownloadJob,
  SlackListItem,
  SlackMessage,
  SlackPin,
  SlackPresence,
  SlackReminder,
  SlackResponse,
  SlackScheduledMessage,
  SlackSearchChannelType,
  SlackSearchContentType,
  SlackSearchContextResult,
  SlackTeamInfo,
  SlackUser,
  SlackUserGroup
} from './types';

const SLACK_SNIPPET_TYPE_ALIASES: Record<string, string> = {
  bash: 'shell',
  js: 'javascript',
  json: 'javascript',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  sh: 'shell',
  ts: 'typescript',
  txt: 'text',
  yml: 'yaml'
};

export const SLACK_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const normalizeSlackSnippetType = (filetype?: string) => {
  let normalized = filetype?.trim().toLowerCase();
  if (!normalized) return undefined;
  return SLACK_SNIPPET_TYPE_ALIASES[normalized] ?? normalized;
};

const normalizeSlackRichTextBlocks = (
  blocks: string | Record<string, unknown> | Record<string, unknown>[]
): Record<string, unknown>[] => {
  if (typeof blocks === 'string') {
    return [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: blocks }]
          }
        ]
      }
    ];
  }
  return Array.isArray(blocks) ? blocks : [blocks];
};

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
    try {
      let response = await this.axios.post(`/${method}`, params || {});
      let data = response.data as T;
      if (!data.ok) {
        throw slackApiError(method, data.error);
      }
      return data;
    } catch (error) {
      throw slackRequestError(method, error);
    }
  }

  private async get<T extends SlackResponse>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      let response = await this.axios.get(`/${method}`, { params });
      let data = response.data as T;
      if (!data.ok) {
        throw slackApiError(method, data.error);
      }
      return data;
    } catch (error) {
      throw slackRequestError(method, error);
    }
  }

  async authTest(): Promise<SlackAuthIdentity> {
    let data = await this.call<SlackResponse & SlackAuthIdentity>('auth.test');
    return {
      url: data.url,
      team: data.team,
      user: data.user,
      team_id: data.team_id,
      user_id: data.user_id,
      bot_id: data.bot_id,
      enterprise_id: data.enterprise_id,
      is_enterprise_install: data.is_enterprise_install
    };
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

  async markConversationRead(channelId: string, timestamp: string): Promise<void> {
    await this.call('conversations.mark', {
      channel: channelId,
      ts: timestamp
    });
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
    firstName?: string;
    lastName?: string;
    displayName?: string;
    title?: string;
    pronouns?: string;
    phone?: string;
  }): Promise<SlackUser['profile']> {
    let body: Record<string, any> = {
      profile: {}
    };
    if (profile.statusText !== undefined) body.profile.status_text = profile.statusText;
    if (profile.statusEmoji !== undefined) body.profile.status_emoji = profile.statusEmoji;
    if (profile.statusExpiration !== undefined) {
      body.profile.status_expiration = profile.statusExpiration;
    }
    if (profile.firstName !== undefined) body.profile.first_name = profile.firstName;
    if (profile.lastName !== undefined) body.profile.last_name = profile.lastName;
    if (profile.displayName !== undefined) body.profile.display_name = profile.displayName;
    if (profile.title !== undefined) body.profile.title = profile.title;
    if (profile.pronouns !== undefined) body.profile.pronouns = profile.pronouns;
    if (profile.phone !== undefined) body.profile.phone = profile.phone;

    let data = await this.call<SlackResponse & { profile: SlackUser['profile'] }>(
      'users.profile.set',
      body
    );
    return data.profile;
  }

  async getDndInfo(userId?: string): Promise<SlackDndInfo> {
    let data = await this.get<SlackResponse & SlackDndInfo>(
      'dnd.info',
      userId ? { user: userId } : undefined
    );
    return data;
  }

  async getDndTeamInfo(userIds: string[]): Promise<SlackDndInfo> {
    let data = await this.get<SlackResponse & SlackDndInfo>('dnd.teamInfo', {
      users: userIds.join(',')
    });
    return data;
  }

  async endDnd(): Promise<void> {
    await this.call('dnd.endDnd');
  }

  async endDndSnooze(): Promise<void> {
    await this.call('dnd.endSnooze');
  }

  async setDndSnooze(minutes: number): Promise<SlackDndInfo> {
    let data = await this.call<SlackResponse & SlackDndInfo>('dnd.setSnooze', {
      num_minutes: minutes
    });
    return data;
  }

  async getPresence(userId?: string): Promise<SlackPresence> {
    let data = await this.get<SlackResponse & SlackPresence>(
      'users.getPresence',
      userId ? { user: userId } : undefined
    );
    return data;
  }

  async setPresence(presence: 'auto' | 'away'): Promise<void> {
    await this.call('users.setPresence', { presence });
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
    return this.uploadFileContent({
      ...params,
      content: Buffer.from(params.content ?? '', 'utf8')
    });
  }

  async uploadBinaryFile(params: {
    content: Buffer | Uint8Array;
    filename: string;
    contentType?: string;
    title?: string;
    channelId?: string;
    initialComment?: string;
    threadTs?: string;
  }): Promise<SlackFile> {
    return this.uploadFileContent({
      content: Buffer.from(params.content),
      filename: params.filename,
      contentType: params.contentType,
      title: params.title,
      channels: params.channelId,
      initialComment: params.initialComment,
      threadTs: params.threadTs
    });
  }

  private async uploadFileContent(params: {
    content: Buffer;
    channels?: string;
    filename?: string;
    filetype?: string;
    contentType?: string;
    initialComment?: string;
    title?: string;
    threadTs?: string;
  }): Promise<SlackFile> {
    let uploadBody = new URLSearchParams({
      filename: params.filename ?? params.title ?? 'upload.txt',
      length: String(params.content.byteLength)
    });
    let snippetType = normalizeSlackSnippetType(params.filetype);
    if (snippetType) uploadBody.set('snippet_type', snippetType);
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

    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(upload.upload_url, {
        method: 'POST',
        headers: {
          'Content-Type': params.contentType ?? 'application/octet-stream'
        },
        body: params.content
      });
    } catch {
      throw slackServiceError('Slack file upload failed before Slack accepted the content');
    }
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

  async downloadFile(
    url: string,
    maxBytes = SLACK_MAX_ATTACHMENT_BYTES
  ): Promise<SlackFileDownload> {
    try {
      let response = await this.axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        maxBodyLength: maxBytes,
        maxContentLength: maxBytes
      });
      let content = Buffer.from(response.data);
      if (content.byteLength > maxBytes) {
        throw slackServiceError(`Slack file exceeds the ${maxBytes}-byte download limit`);
      }
      let contentType = response.headers['content-type'];

      return {
        content,
        contentType: typeof contentType === 'string' ? contentType : undefined,
        contentLength: content.byteLength
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw slackServiceError('Slack file download failed');
    }
  }

  async downloadExternalFile(
    url: string,
    maxBytes = SLACK_MAX_ATTACHMENT_BYTES
  ): Promise<SlackFileDownload> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw slackServiceError('Slack returned an invalid export download URL');
    }
    if (parsedUrl.protocol !== 'https:') {
      throw slackServiceError('Slack export downloads require an HTTPS URL');
    }

    let response: Response;
    try {
      response = await fetch(parsedUrl);
    } catch {
      throw slackServiceError('Slack export download failed');
    }
    if (!response.ok) {
      throw slackServiceError(`Slack export download failed: HTTP ${response.status}`);
    }

    let contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && /^\d+$/.test(contentLengthHeader)) {
      let declaredLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
        throw slackServiceError(`Slack export exceeds the ${maxBytes}-byte download limit`);
      }
    }

    let reader = response.body?.getReader();
    if (!reader) {
      throw slackServiceError('Slack export download did not return a readable body');
    }

    let chunks: Uint8Array[] = [];
    let contentLength = 0;
    try {
      while (true) {
        let { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        contentLength += value.byteLength;
        if (contentLength > maxBytes) {
          await reader.cancel();
          throw slackServiceError(`Slack export exceeds the ${maxBytes}-byte download limit`);
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw slackServiceError('Slack export download failed while reading its content');
    }

    let content = Buffer.concat(
      chunks.map(chunk => Buffer.from(chunk)),
      contentLength
    );
    return {
      content,
      contentType: response.headers.get('content-type') ?? undefined,
      contentLength
    };
  }

  async downloadFileById(
    fileId: string,
    maxBytes = SLACK_MAX_ATTACHMENT_BYTES
  ): Promise<{ file: SlackFile; download: SlackFileDownload }> {
    let file = await this.getFileInfo(fileId);
    if (file.size !== undefined && file.size > maxBytes) {
      throw slackServiceError(`Slack file exceeds the ${maxBytes}-byte download limit`);
    }
    let downloadUrl = file.url_private_download ?? file.url_private;
    if (!downloadUrl) {
      throw slackServiceError('Slack did not provide a downloadable URL for this file');
    }

    return { file, download: await this.downloadFile(downloadUrl, maxBytes) };
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

  // ─── Canvases ─────────────────────────────────────────────────

  async createCanvas(params: {
    title?: string;
    content?: string;
    channelId?: string;
  }): Promise<SlackCanvas> {
    let body: Record<string, any> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.content !== undefined) {
      body.document_content = { type: 'markdown', markdown: params.content };
    }
    if (params.channelId !== undefined) body.channel_id = params.channelId;

    let data = await this.call<SlackResponse & { canvas_id: string }>('canvases.create', body);
    return {
      id: data.canvas_id,
      title: params.title,
      raw: data as unknown as Record<string, unknown>
    };
  }

  async editCanvas(params: {
    canvasId: string;
    operation:
      | 'insert_after'
      | 'insert_before'
      | 'insert_at_start'
      | 'insert_at_end'
      | 'replace'
      | 'delete'
      | 'rename';
    content?: string;
    sectionId?: string;
    title?: string;
  }): Promise<SlackCanvas> {
    let change: Record<string, any> = { operation: params.operation };
    if (params.content !== undefined) {
      change.document_content = { type: 'markdown', markdown: params.content };
    }
    if (params.sectionId !== undefined) change.section_id = params.sectionId;
    if (params.title !== undefined) {
      change.title_content = { type: 'markdown', markdown: params.title };
    }

    let data = await this.call<SlackResponse>('canvases.edit', {
      canvas_id: params.canvasId,
      changes: [change]
    });
    return {
      id: params.canvasId,
      title: params.title,
      raw: data as unknown as Record<string, unknown>
    };
  }

  async lookupCanvasSections(params: {
    canvasId: string;
    sectionTypes?: string[];
    containsText?: string;
  }): Promise<SlackCanvasSection[]> {
    let criteria: Record<string, any> = {};
    if (params.sectionTypes) criteria.section_types = params.sectionTypes;
    if (params.containsText !== undefined) criteria.contains_text = params.containsText;

    let data = await this.call<SlackResponse & { sections: SlackCanvasSection[] }>(
      'canvases.sections.lookup',
      {
        canvas_id: params.canvasId,
        criteria
      }
    );
    return data.sections;
  }

  async setCanvasAccess(params: {
    canvasId: string;
    accessLevel: string;
    userIds?: string[];
    channelIds?: string[];
  }): Promise<void> {
    let body: Record<string, any> = {
      canvas_id: params.canvasId,
      access_level: params.accessLevel
    };
    if (params.userIds) body.user_ids = params.userIds;
    if (params.channelIds) body.channel_ids = params.channelIds;
    await this.call('canvases.access.set', body);
  }

  async deleteCanvasAccess(params: {
    canvasId: string;
    userIds?: string[];
    channelIds?: string[];
  }): Promise<void> {
    let body: Record<string, any> = { canvas_id: params.canvasId };
    if (params.userIds) body.user_ids = params.userIds;
    if (params.channelIds) body.channel_ids = params.channelIds;
    await this.call('canvases.access.delete', body);
  }

  async deleteCanvas(canvasId: string): Promise<void> {
    await this.call('canvases.delete', { canvas_id: canvasId });
  }

  // ─── Slack Lists ──────────────────────────────────────────────

  async createSlackList(params: {
    name: string;
    descriptionBlocks?: string | Record<string, unknown> | Record<string, unknown>[];
    schema?: Record<string, unknown>[];
    todoMode?: boolean;
  }): Promise<SlackList> {
    let body: Record<string, any> = { name: params.name };
    if (params.descriptionBlocks !== undefined) {
      body.description_blocks = normalizeSlackRichTextBlocks(params.descriptionBlocks);
    }
    if (params.schema !== undefined) body.schema = params.schema;
    if (params.todoMode !== undefined) body.todo_mode = params.todoMode;

    let data = await this.call<
      SlackResponse & {
        list_id?: string;
        list?: SlackList;
        list_metadata?: {
          schema?: Record<string, unknown>[];
          description_blocks?: Record<string, unknown>[];
          todo_mode?: boolean;
        };
      }
    >('slackLists.create', body);
    let list = data.list;
    let id = list?.id ?? data.list_id;
    if (!id) {
      throw slackServiceError('Slack did not return an ID for the created List');
    }
    return {
      ...list,
      id,
      name: list?.name ?? params.name,
      description: data.list_metadata?.description_blocks ?? list?.description,
      schema: data.list_metadata?.schema ?? list?.schema,
      todo_mode: data.list_metadata?.todo_mode ?? list?.todo_mode,
      raw: data as unknown as Record<string, unknown>
    };
  }

  async listSlackListItems(params: {
    listId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: SlackListItem[]; nextCursor?: string }> {
    let body: Record<string, any> = { list_id: params.listId };
    if (params.cursor) body.cursor = params.cursor;
    if (params.limit !== undefined) body.limit = params.limit;

    let data = await this.call<SlackResponse & { items: SlackListItem[] }>(
      'slackLists.items.list',
      body
    );
    return {
      items: data.items,
      nextCursor: data.response_metadata?.next_cursor || undefined
    };
  }

  async createSlackListItem(params: {
    listId: string;
    initialFields?: Record<string, unknown>[];
  }): Promise<SlackListItem> {
    let body: Record<string, any> = { list_id: params.listId };
    if (params.initialFields !== undefined) body.initial_fields = params.initialFields;

    let data = await this.call<SlackResponse & { item?: SlackListItem }>(
      'slackLists.items.create',
      body
    );
    return data.item ?? { raw: data as unknown as Record<string, unknown> };
  }

  async updateSlackListItems(params: {
    listId: string;
    cells: Record<string, unknown>[];
  }): Promise<void> {
    await this.call('slackLists.items.update', {
      list_id: params.listId,
      cells: params.cells
    });
  }

  async deleteSlackListItems(listId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 1) {
      await this.call('slackLists.items.delete', {
        list_id: listId,
        id: itemIds[0]
      });
      return;
    }

    await this.call('slackLists.items.deleteMultiple', {
      list_id: listId,
      ids: itemIds
    });
  }

  async setSlackListAccess(params: {
    listId: string;
    accessLevel: string;
    userIds?: string[];
    channelIds?: string[];
  }): Promise<void> {
    let body: Record<string, any> = {
      list_id: params.listId,
      access_level: params.accessLevel
    };
    if (params.userIds) body.user_ids = params.userIds;
    if (params.channelIds) body.channel_ids = params.channelIds;
    await this.call('slackLists.access.set', body);
  }

  async deleteSlackListAccess(params: {
    listId: string;
    userIds?: string[];
    channelIds?: string[];
  }): Promise<void> {
    let body: Record<string, any> = { list_id: params.listId };
    if (params.userIds) body.user_ids = params.userIds;
    if (params.channelIds) body.channel_ids = params.channelIds;
    await this.call('slackLists.access.delete', body);
  }

  async startSlackListDownload(listId: string): Promise<SlackListDownloadJob> {
    let data = await this.call<
      SlackResponse & {
        job_id?: string;
        status?: string;
      }
    >('slackLists.download.start', { list_id: listId });
    return {
      jobId: data.job_id,
      status: data.status,
      raw: data as unknown as Record<string, unknown>
    };
  }

  async getSlackListDownload(listId: string, jobId: string): Promise<SlackListDownloadJob> {
    let data = await this.call<
      SlackResponse & {
        job_id?: string;
        status?: string;
        download_url?: string;
        file_name?: string;
        mimetype?: string;
      }
    >('slackLists.download.get', { list_id: listId, job_id: jobId });
    return {
      jobId: data.job_id ?? jobId,
      status: data.status,
      downloadUrl: data.download_url,
      fileName: data.file_name,
      mimeType: data.mimetype,
      raw: data as unknown as Record<string, unknown>
    };
  }

  // ─── Custom Emoji ─────────────────────────────────────────────

  async listCustomEmojis(includeCategories?: boolean): Promise<{
    emoji: Record<string, string>;
    categories?: { name?: string; emoji_names?: string[] }[];
  }> {
    let data = await this.get<
      SlackResponse & {
        emoji: Record<string, string>;
        categories?: { name?: string; emoji_names?: string[] }[];
      }
    >(
      'emoji.list',
      includeCategories === undefined ? undefined : { include_categories: includeCategories }
    );
    return { emoji: data.emoji, categories: data.categories };
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

  async searchContext(params: {
    query: string;
    channelTypes?: SlackSearchChannelType[];
    contentTypes?: SlackSearchContentType[];
    includeBots?: boolean;
    includeDeletedUsers?: boolean;
    before?: number;
    after?: number;
    includeContextMessages?: boolean;
    contextChannelId?: string;
    cursor?: string;
    limit?: number;
    sort?: 'score' | 'timestamp';
    sortDir?: 'asc' | 'desc';
    includeMessageBlocks?: boolean;
    highlight?: boolean;
    includeArchivedChannels?: boolean;
    disableSemanticSearch?: boolean;
  }): Promise<SlackSearchContextResult> {
    let body: Record<string, any> = { query: params.query };
    if (params.channelTypes) body.channel_types = params.channelTypes;
    if (params.contentTypes) body.content_types = params.contentTypes;
    if (params.includeBots !== undefined) body.include_bots = params.includeBots;
    if (params.includeDeletedUsers !== undefined) {
      body.include_deleted_users = params.includeDeletedUsers;
    }
    if (params.before !== undefined) body.before = params.before;
    if (params.after !== undefined) body.after = params.after;
    if (params.includeContextMessages !== undefined) {
      body.include_context_messages = params.includeContextMessages;
    }
    if (params.contextChannelId) body.context_channel_id = params.contextChannelId;
    if (params.cursor) body.cursor = params.cursor;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.sort) body.sort = params.sort;
    if (params.sortDir) body.sort_dir = params.sortDir;
    if (params.includeMessageBlocks !== undefined) {
      body.include_message_blocks = params.includeMessageBlocks;
    }
    if (params.highlight !== undefined) body.highlight = params.highlight;
    if (params.includeArchivedChannels !== undefined) {
      body.include_archived_channels = params.includeArchivedChannels;
    }
    if (params.disableSemanticSearch !== undefined) {
      body.disable_semantic_search = params.disableSemanticSearch;
    }

    let data = await this.call<
      SlackResponse & {
        results?: {
          messages?: Record<string, unknown>[];
          files?: Record<string, unknown>[];
          channels?: Record<string, unknown>[];
          users?: Record<string, unknown>[];
        };
      }
    >('assistant.search.context', body);

    return {
      messages: data.results?.messages,
      files: data.results?.files,
      channels: data.results?.channels,
      users: data.results?.users,
      nextCursor: data.response_metadata?.next_cursor || undefined,
      raw: data as unknown as Record<string, unknown>
    };
  }

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
