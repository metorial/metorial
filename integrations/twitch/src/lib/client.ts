import { createApiServiceError, type createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { credential, numericId, requireValue, safeJson, upstream } from './contracts';
import { createTwitchAxios } from './http';
import { validateResponse } from './models';
import type {
  TwitchBannedUser,
  TwitchChannel,
  TwitchCharityCampaign,
  TwitchChatSettings,
  TwitchClip,
  TwitchCustomReward,
  TwitchFollower,
  TwitchGoal,
  TwitchPoll,
  TwitchPrediction,
  TwitchRedemption,
  TwitchResponse,
  TwitchSchedule,
  TwitchScheduleSegment,
  TwitchStream,
  TwitchSubscription,
  TwitchUser,
  TwitchVideo
} from './types';

export class TwitchClient {
  private axios: ReturnType<typeof createAxios>;
  private validation?: {
    client_id: string;
    scopes: string[];
    user_id?: string | null;
    login?: string | null;
    expires_in: number;
  };
  private secrets: string[];
  private readonly clientId: string;

  constructor(
    token: string,
    clientId: string,
    private readonly expectedUserId?: string
  ) {
    credential(token);
    credential(clientId, 'Client ID');
    if (expectedUserId !== undefined) numericId(expectedUserId);
    this.secrets = [token];
    this.clientId = clientId;
    this.axios = createTwitchAxios(
      {
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 4 * 1024 * 1024,
        maxBodyLength: 4 * 1024 * 1024,
        errorMapping: {
          mapAxiosError: () => ({
            message:
              'Twitch request failed. Check token validity, scopes and channel permissions.'
          })
        },
        baseURL: 'https://api.twitch.tv/helix',
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': clientId
        }
      },
      this.secrets
    );
  }

  async validateToken() {
    if (this.validation) return this.validation;
    try {
      const client = createTwitchAxios(
        {
          baseURL: 'https://id.twitch.tv/oauth2',
          timeout: 30000,
          maxRedirects: 0,
          maxContentLength: 65536,
          headers: { Authorization: `OAuth ${this.secrets[0]}` },
          errorMapping: {
            mapAxiosError: () => ({
              message: 'Twitch token validation failed. Reconnect the account.'
            })
          }
        },
        this.secrets
      );
      const response = await client.get('/validate');
      safeJson(response.data, this.secrets);
      const parsed = z
        .object({
          client_id: z.string(),
          scopes: z.array(z.string()),
          user_id: z.string().nullable().optional(),
          login: z.string().nullable().optional(),
          expires_in: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
        })
        .safeParse(response.data);
      requireValue(
        response.status === 200 && parsed.success,
        'Twitch returned invalid token validation data. Reconnect.'
      );
      const value = parsed.data;
      requireValue(
        value.client_id === this.clientId,
        'The Twitch token belongs to another Client ID. Reconnect with its registered application.'
      );
      if (value.user_id != null) numericId(value.user_id);
      if (this.expectedUserId !== undefined)
        requireValue(
          value.user_id === this.expectedUserId,
          'Twitch token user changed. Reconnect to bind the intended account.'
        );
      this.validation = value;
      return value;
    } catch (error) {
      throw upstream(error, 'validate token');
    }
  }
  async requireUser(expected?: string, scopes?: string[]) {
    const native = await this.validateToken();
    requireValue(
      native.user_id,
      'This operation needs a Twitch user access token. Reconnect with OAuth; app tokens have no current user.'
    );
    if (expected !== undefined)
      requireValue(
        native.user_id === expected,
        'The broadcaster/moderator must match the user authorized by this token. Choose their exact user ID.'
      );
    if (scopes)
      requireValue(
        scopes.some(scope => native.scopes.includes(scope)),
        `Reconnect with the required Twitch scope: ${scopes.join(' or ')}.`
      );
    return native.user_id;
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    body?: unknown
  ) {
    const native = await this.validateToken();
    const url = new URL(path, 'https://api.twitch.tv'),
      route = url.pathname;
    const query = url.searchParams;
    const value = body as Record<string, unknown> | undefined;
    const broadcaster =
      query.get('broadcaster_id') ??
      (typeof value?.broadcaster_id === 'string' ? value.broadcaster_id : undefined);
    let ownerScopes: string[] | undefined;
    if (route === '/channels' && method === 'patch')
      ownerScopes = ['channel:manage:broadcast'];
    if (route.startsWith('/channel_points/'))
      ownerScopes =
        method === 'get'
          ? ['channel:read:redemptions', 'channel:manage:redemptions']
          : ['channel:manage:redemptions'];
    if (route === '/polls')
      ownerScopes =
        method === 'get'
          ? ['channel:read:polls', 'channel:manage:polls']
          : ['channel:manage:polls'];
    if (route === '/predictions')
      ownerScopes =
        method === 'get'
          ? ['channel:read:predictions', 'channel:manage:predictions']
          : ['channel:manage:predictions'];
    if (route === '/moderation/moderators')
      ownerScopes =
        method === 'get'
          ? ['moderation:read', 'channel:manage:moderators']
          : ['channel:manage:moderators'];
    if (route === '/channels/vips')
      ownerScopes =
        method === 'get'
          ? ['channel:read:vips', 'channel:manage:vips']
          : ['channel:manage:vips'];
    if (ownerScopes) await this.requireUser(broadcaster, ownerScopes);
    if (route === '/raids')
      await this.requireUser(query.get('from_broadcaster_id') ?? broadcaster, [
        'channel:manage:raids'
      ]);
    const actorScopes: Record<string, string[]> = {
      '/moderation/bans': ['moderator:manage:banned_users'],
      '/moderation/chat': ['moderator:manage:chat_messages'],
      '/moderation/shield_mode': ['moderator:manage:shield_mode'],
      '/chat/announcements': ['moderator:manage:announcements'],
      '/chat/shoutouts': ['moderator:manage:shoutouts'],
      '/chat/messages': ['user:write:chat'],
      '/chat/settings': ['moderator:manage:chat_settings']
    };
    if (method !== 'get' && actorScopes[route])
      await this.requireUser(
        query.get('moderator_id') ??
          (typeof value?.sender_id === 'string' ? value.sender_id : undefined),
        actorScopes[route]
      );
    // App grants are delegated separately; the validate response cannot prove those grants.
    if (native.user_id && (route === '/subscriptions' || route === '/channels/commercial'))
      await this.requireUser(
        broadcaster,
        route === '/subscriptions'
          ? ['channel:read:subscriptions']
          : ['channel:edit:commercial']
      );
    if (route === '/clips' && method === 'post')
      await this.requireUser(undefined, ['clips:edit']);
    try {
      safeJson(path, this.secrets);
      if (body !== undefined)
        safeJson(pickDefined(body as Record<string, unknown>), this.secrets);
      const response = await this.axios.request({ method, url: path, data: body });
      validateResponse(path, method, response.status, response.data, this.secrets);
      const rows = (response.data as { data?: Record<string, unknown>[] } | undefined)?.data;
      if (method === 'get' && query.has('first') && rows)
        requireValue(
          rows.length <= Number(query.get('first')),
          'Twitch returned more rows than the requested page size.'
        );
      for (const row of rows ?? []) {
        if (row.broadcaster_id !== undefined && broadcaster !== undefined)
          requireValue(
            query.getAll('broadcaster_id').length > 1
              ? query.getAll('broadcaster_id').includes(String(row.broadcaster_id))
              : row.broadcaster_id === broadcaster,
            'Twitch returned another broadcaster resource.'
          );
        if (route === '/channels/commercial' && method === 'post')
          requireValue(
            typeof row.length === 'number' &&
              row.length > 0 &&
              typeof value?.length === 'number' &&
              row.length <= value.length,
            'Twitch did not confirm a positive commercial duration.'
          );
        if (route === '/channel_points/custom_rewards' && method !== 'get') {
          for (const field of [
            'title',
            'cost',
            'prompt',
            'is_enabled',
            'background_color',
            'is_user_input_required',
            'is_paused',
            'should_redemptions_skip_request_queue'
          ])
            if (value?.[field] !== undefined)
              requireValue(
                row[field] === value[field],
                'Twitch did not confirm the requested reward fields. Reconcile the native reward before retrying.'
              );
        }
        const selected = query.getAll('id');
        if (route === '/users') {
          const logins = query.getAll('login').map(login => login.toLowerCase());
          if (selected.length || logins.length)
            requireValue(
              selected.includes(String(row.id)) ||
                logins.includes(String(row.login).toLowerCase()),
              'Twitch returned a user outside the requested IDs and login names.'
            );
        } else if (selected.length && row.id !== undefined)
          requireValue(
            selected.includes(String(row.id)),
            'Twitch returned an unrelated resource ID.'
          );
        if (method === 'get' && route === '/streams') {
          const users = query.getAll('user_id'),
            logins = query.getAll('user_login').map(login => login.toLowerCase()),
            games = query.getAll('game_id'),
            language = query.get('language');
          if (users.length || logins.length)
            requireValue(
              users.includes(String(row.user_id)) ||
                logins.includes(String(row.user_login).toLowerCase()),
              'Twitch returned a stream outside the requested users.'
            );
          if (games.length)
            requireValue(
              games.includes(String(row.game_id)),
              'Twitch returned a stream outside the requested categories.'
            );
          if (language)
            requireValue(
              String(row.language).toLowerCase() === language.toLowerCase(),
              'Twitch returned a stream outside the requested language.'
            );
        }
        if (
          method === 'get' &&
          ['/videos', '/channels/followers', '/subscriptions'].includes(route) &&
          query.has('user_id')
        )
          requireValue(
            query.getAll('user_id').includes(String(row.user_id)),
            'Twitch returned a resource for another requested user.'
          );
        if (route.endsWith('/redemptions')) {
          const reward = row.reward as { id?: unknown };
          requireValue(
            reward.id === query.get('reward_id'),
            'Twitch returned another reward redemption.'
          );
          if (method !== 'get')
            requireValue(
              row.status === value?.status,
              'Twitch did not confirm the requested redemption state.'
            );
          else if (!selected.length && query.has('status'))
            requireValue(
              row.status === query.get('status'),
              'Twitch returned a redemption outside the requested status.'
            );
        }
        if (route === '/moderation/bans' && method === 'post')
          requireValue(
            row.user_id === (value?.data as { user_id?: unknown })?.user_id &&
              row.moderator_id === query.get('moderator_id'),
            'Twitch did not confirm the exact moderation target.'
          );
        if (route === '/moderation/shield_mode' && method !== 'get')
          requireValue(
            row.is_active === value?.is_active,
            'Twitch did not confirm the requested Shield Mode state.'
          );
        if ((route === '/polls' || route === '/predictions') && method === 'patch')
          requireValue(
            row.id === value?.id &&
              row.status === value?.status &&
              (value?.winning_outcome_id === undefined ||
                row.winning_outcome_id === value.winning_outcome_id),
            'Twitch returned an unrelated lifecycle receipt.'
          );
      }
      return response;
    } catch (error) {
      throw upstream(error, `${method} Twitch resource`);
    }
  }

  private requiredTotal(value: number | undefined): number {
    requireValue(value !== undefined, 'Twitch omitted its native total.');
    return value;
  }

  // ─── Users ──────────────────────────────────────────────────

  async getUsers(params?: { ids?: string[]; logins?: string[] }): Promise<TwitchUser[]> {
    let query = new URLSearchParams();
    if (params?.ids) {
      for (let id of params.ids) query.append('id', id);
    }
    if (params?.logins) {
      for (let login of params.logins) query.append('login', login);
    }
    let response = await this.request('get', `/users?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchUser>;
    return data.data;
  }

  async getAuthenticatedUser(): Promise<TwitchUser> {
    const userId = await this.requireUser();
    let response = await this.request('get', '/users');
    let data = response.data as TwitchResponse<TwitchUser>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to get authenticated user');
    requireValue(data.data[0].id === userId, 'Twitch returned a different current user.');
    return data.data[0];
  }

  // ─── Channels ───────────────────────────────────────────────

  async getChannelInfo(broadcasterIds: string[]): Promise<TwitchChannel[]> {
    let query = new URLSearchParams();
    for (let id of broadcasterIds) query.append('broadcaster_id', id);
    let response = await this.request('get', `/channels?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchChannel>;
    return data.data;
  }

  async updateChannelInfo(
    broadcasterId: string,
    params: {
      gameId?: string;
      broadcasterLanguage?: string;
      title?: string;
      delay?: number;
      tags?: string[];
      contentClassificationLabels?: Array<{ id: string; is_enabled: boolean }>;
      isBrandedContent?: boolean;
    }
  ): Promise<{ confirmed: boolean }> {
    let body: Record<string, unknown> = {};
    if (params.gameId !== undefined) body.game_id = params.gameId;
    if (params.broadcasterLanguage !== undefined)
      body.broadcaster_language = params.broadcasterLanguage;
    if (params.title !== undefined) body.title = params.title;
    if (params.delay !== undefined) body.delay = params.delay;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.contentClassificationLabels !== undefined)
      body.content_classification_labels = params.contentClassificationLabels;
    if (params.isBrandedContent !== undefined)
      body.is_branded_content = params.isBrandedContent;

    await this.request('patch', `/channels?broadcaster_id=${broadcasterId}`, body);
    try {
      const rows = await this.getChannelInfo([broadcasterId]),
        current = rows[0];
      if (rows.length !== 1 || !current || current.broadcaster_id !== broadcasterId)
        return { confirmed: false };
      const sameTags = (left: readonly string[], right: readonly string[]) => {
        const a = new Set(left.map(tag => tag.toLowerCase())),
          b = new Set(right.map(tag => tag.toLowerCase()));
        return a.size === b.size && [...a].every(tag => b.has(tag));
      };
      return {
        confirmed:
          (params.title === undefined || current.title === params.title) &&
          (params.gameId === undefined ||
            current.game_id === (['0', ''].includes(params.gameId) ? '' : params.gameId)) &&
          (params.broadcasterLanguage === undefined ||
            current.broadcaster_language === params.broadcasterLanguage) &&
          (params.delay === undefined || current.delay === params.delay) &&
          (params.tags === undefined || sameTags(current.tags, params.tags)) &&
          (params.isBrandedContent === undefined ||
            current.is_branded_content === params.isBrandedContent)
      };
    } catch {
      return { confirmed: false };
    }
  }

  // ─── Streams ────────────────────────────────────────────────

  async getStreams(params?: {
    userIds?: string[];
    userLogins?: string[];
    gameIds?: string[];
    language?: string;
    first?: number;
    after?: string;
  }): Promise<{ streams: TwitchStream[]; cursor?: string }> {
    let query = new URLSearchParams();
    if (params?.userIds) {
      for (let id of params.userIds) query.append('user_id', id);
    }
    if (params?.userLogins) {
      for (let login of params.userLogins) query.append('user_login', login);
    }
    if (params?.gameIds) {
      for (let id of params.gameIds) query.append('game_id', id);
    }
    if (params?.language) query.set('language', params.language);
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/streams?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchStream>;
    return { streams: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Subscriptions ──────────────────────────────────────────

  async getSubscriptions(
    broadcasterId: string,
    params?: {
      userIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{ subscriptions: TwitchSubscription[]; total: number; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.userIds) {
      for (let id of params.userIds) query.append('user_id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/subscriptions?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchSubscription> & { total: number };
    return {
      subscriptions: data.data,
      total: this.requiredTotal(data.total),
      cursor: data.pagination?.cursor
    };
  }

  // ─── Followers ──────────────────────────────────────────────

  async getFollowers(
    broadcasterId: string,
    params?: {
      userId?: string;
      first?: number;
      after?: string;
    }
  ): Promise<{ followers: TwitchFollower[]; total: number; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.userId) query.set('user_id', params.userId);
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/channels/followers?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchFollower> & { total: number };
    return {
      followers: data.data,
      total: this.requiredTotal(data.total),
      cursor: data.pagination?.cursor
    };
  }

  // ─── Clips ──────────────────────────────────────────────────

  async createClip(
    broadcasterId: string,
    hasDelay?: boolean
  ): Promise<{ clipId: string; editUrl: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (hasDelay !== undefined) query.set('has_delay', hasDelay.toString());

    let response = await this.request('post', `/clips?${query.toString()}`);
    let data = response.data as { data: Array<{ id: string; edit_url: string }> };
    let clip = data.data?.[0];
    if (!clip) throw createApiServiceError('Failed to create clip');
    return { clipId: clip.id, editUrl: clip.edit_url };
  }

  async getClips(params: {
    broadcasterId?: string;
    gameId?: string;
    clipIds?: string[];
    first?: number;
    after?: string;
    startedAt?: string;
    endedAt?: string;
  }): Promise<{ clips: TwitchClip[]; cursor?: string }> {
    let query = new URLSearchParams();
    if (params.broadcasterId) query.set('broadcaster_id', params.broadcasterId);
    if (params.gameId) query.set('game_id', params.gameId);
    if (params.clipIds) {
      for (let id of params.clipIds) query.append('id', id);
    }
    if (params.first) query.set('first', params.first.toString());
    if (params.after !== undefined) query.set('after', params.after);
    if (params.startedAt) query.set('started_at', params.startedAt);
    if (params.endedAt) query.set('ended_at', params.endedAt);

    let response = await this.request('get', `/clips?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchClip>;
    return { clips: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Videos ─────────────────────────────────────────────────

  async getClipDownload(broadcasterId: string, clipId: string, editorId?: string) {
    const token = await this.validateToken();
    const actor = editorId ?? token.user_id;
    requireValue(
      actor,
      'An app token requires an explicit authorized editorId for clip downloads.'
    );
    numericId(actor);
    if (token.user_id)
      await this.requireUser(actor, ['editor:manage:clips', 'channel:manage:clips']);
    const clips = await this.getClips({ clipIds: [clipId] });
    requireValue(
      clips.clips.length === 1 && clips.clips[0]?.broadcaster_id === broadcasterId,
      'The clip must belong to the exact requested broadcaster.'
    );
    const query = new URLSearchParams({
      broadcaster_id: broadcasterId,
      editor_id: actor,
      clip_id: clipId
    });
    const response = await this.request('get', `/clips/downloads?${query}`);
    const rows = response.data.data as Array<{
      clip_id: string;
      landscape_download_url: string | null;
      portrait_download_url: string | null;
    }>;
    requireValue(
      rows.length === 1 && rows[0]?.clip_id === clipId,
      'Twitch returned a different clip download.'
    );
    return { clip: clips.clips[0], download: rows[0] };
  }

  async getVideos(params: {
    videoIds?: string[];
    userId?: string;
    gameId?: string;
    first?: number;
    after?: string;
    type?: string;
    sort?: string;
    period?: string;
  }): Promise<{ videos: TwitchVideo[]; cursor?: string }> {
    let query = new URLSearchParams();
    if (params.videoIds) {
      for (let id of params.videoIds) query.append('id', id);
    }
    if (params.userId) query.set('user_id', params.userId);
    if (params.gameId) query.set('game_id', params.gameId);
    if (params.first) query.set('first', params.first.toString());
    if (params.after !== undefined) query.set('after', params.after);
    if (params.type) query.set('type', params.type);
    if (params.sort) query.set('sort', params.sort);
    if (params.period) query.set('period', params.period);

    let response = await this.request('get', `/videos?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchVideo>;
    return { videos: data.data, cursor: data.pagination?.cursor };
  }

  async deleteVideos(videoIds: string[]): Promise<void> {
    let query = new URLSearchParams();
    for (let id of videoIds) query.append('id', id);
    await this.request('delete', `/videos?${query.toString()}`);
  }

  // ─── Moderation ─────────────────────────────────────────────

  async banUser(
    broadcasterId: string,
    moderatorId: string,
    params: {
      userId: string;
      duration?: number;
      reason?: string;
    }
  ): Promise<TwitchBannedUser> {
    let response = await this.request(
      'post',
      `/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      {
        data: {
          user_id: params.userId,
          duration: params.duration,
          reason: params.reason
        }
      }
    );
    let data = response.data as TwitchResponse<TwitchBannedUser>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to ban user');
    return data.data[0];
  }

  async unbanUser(broadcasterId: string, moderatorId: string, userId: string): Promise<void> {
    await this.request(
      'delete',
      `/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`
    );
  }

  async getBannedUsers(
    broadcasterId: string,
    params?: {
      userIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{ users: TwitchBannedUser[]; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.userIds) {
      for (let id of params.userIds) query.append('user_id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/moderation/bans?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchBannedUser>;
    return { users: data.data, cursor: data.pagination?.cursor };
  }

  async deleteChatMessage(
    broadcasterId: string,
    moderatorId: string,
    messageId: string
  ): Promise<void> {
    await this.request(
      'delete',
      `/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${messageId}`
    );
  }

  // ─── Chat ───────────────────────────────────────────────────

  async sendChatMessage(
    broadcasterId: string,
    senderId: string,
    message: string,
    params?: {
      replyParentMessageId?: string;
    }
  ): Promise<{
    messageId: string;
    isSent: boolean;
    dropReason?: { code: string; message: string };
  }> {
    let body: Record<string, unknown> = {
      broadcaster_id: broadcasterId,
      sender_id: senderId,
      message
    };
    if (params?.replyParentMessageId)
      body.reply_parent_message_id = params.replyParentMessageId;

    let response = await this.request('post', '/chat/messages', body);
    let data = response.data as {
      data: Array<{
        message_id: string;
        is_sent: boolean;
        drop_reason?: { code: string; message: string } | null;
      }>;
    };
    let result = data.data?.[0];
    if (!result) throw createApiServiceError('Failed to send chat message');
    return {
      messageId: result.message_id,
      isSent: result.is_sent,
      dropReason: result.drop_reason ?? undefined
    };
  }

  async getChatSettings(
    broadcasterId: string,
    moderatorId?: string
  ): Promise<TwitchChatSettings> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (moderatorId) query.set('moderator_id', moderatorId);

    let response = await this.request('get', `/chat/settings?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchChatSettings>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to get chat settings');
    return data.data[0];
  }

  async updateChatSettings(
    broadcasterId: string,
    moderatorId: string,
    params: {
      emoteMode?: boolean;
      followerMode?: boolean;
      followerModeDuration?: number;
      slowMode?: boolean;
      slowModeWaitTime?: number;
      subscriberMode?: boolean;
      uniqueChatMode?: boolean;
      nonModeratorChatDelay?: boolean;
      nonModeratorChatDelayDuration?: number;
    }
  ): Promise<TwitchChatSettings> {
    let body: Record<string, unknown> = {};
    if (params.emoteMode !== undefined) body.emote_mode = params.emoteMode;
    if (params.followerMode !== undefined) body.follower_mode = params.followerMode;
    if (params.followerModeDuration !== undefined)
      body.follower_mode_duration = params.followerModeDuration;
    if (params.slowMode !== undefined) body.slow_mode = params.slowMode;
    if (params.slowModeWaitTime !== undefined)
      body.slow_mode_wait_time = params.slowModeWaitTime;
    if (params.subscriberMode !== undefined) body.subscriber_mode = params.subscriberMode;
    if (params.uniqueChatMode !== undefined) body.unique_chat_mode = params.uniqueChatMode;
    if (params.nonModeratorChatDelay !== undefined)
      body.non_moderator_chat_delay = params.nonModeratorChatDelay;
    if (params.nonModeratorChatDelayDuration !== undefined)
      body.non_moderator_chat_delay_duration = params.nonModeratorChatDelayDuration;

    let response = await this.request(
      'patch',
      `/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchChatSettings>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to update chat settings');
    return data.data[0];
  }

  async sendChatAnnouncement(
    broadcasterId: string,
    moderatorId: string,
    message: string,
    color?: string
  ): Promise<void> {
    await this.request(
      'post',
      `/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      { message, color }
    );
  }

  async getChatters(
    broadcasterId: string,
    moderatorId: string,
    params?: {
      first?: number;
      after?: string;
    }
  ): Promise<{
    chatters: Array<{ user_id: string; user_login: string; user_name: string }>;
    total: number;
    cursor?: string;
  }> {
    let query = new URLSearchParams({
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId
    });
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/chat/chatters?${query.toString()}`);
    let data = response.data as TwitchResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }> & { total: number };
    return {
      chatters: data.data,
      total: this.requiredTotal(data.total),
      cursor: data.pagination?.cursor
    };
  }

  // ─── Channel Points ─────────────────────────────────────────

  async getCustomRewards(
    broadcasterId: string,
    params?: {
      rewardIds?: string[];
      onlyManageableRewards?: boolean;
    }
  ): Promise<TwitchCustomReward[]> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.rewardIds) {
      for (let id of params.rewardIds) query.append('id', id);
    }
    if (params?.onlyManageableRewards !== undefined) {
      query.set('only_manageable_rewards', params.onlyManageableRewards.toString());
    }

    let response = await this.request(
      'get',
      `/channel_points/custom_rewards?${query.toString()}`
    );
    let data = response.data as TwitchResponse<TwitchCustomReward>;
    return data.data;
  }

  async createCustomReward(
    broadcasterId: string,
    params: {
      title: string;
      cost: number;
      prompt?: string;
      isEnabled?: boolean;
      backgroundColor?: string;
      isUserInputRequired?: boolean;
      isMaxPerStreamEnabled?: boolean;
      maxPerStream?: number;
      isMaxPerUserPerStreamEnabled?: boolean;
      maxPerUserPerStream?: number;
      isGlobalCooldownEnabled?: boolean;
      globalCooldownSeconds?: number;
      shouldRedemptionsSkipRequestQueue?: boolean;
    }
  ): Promise<TwitchCustomReward> {
    let body: Record<string, unknown> = {
      title: params.title,
      cost: params.cost
    };
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.isEnabled !== undefined) body.is_enabled = params.isEnabled;
    if (params.backgroundColor !== undefined) body.background_color = params.backgroundColor;
    if (params.isUserInputRequired !== undefined)
      body.is_user_input_required = params.isUserInputRequired;
    if (params.isMaxPerStreamEnabled !== undefined)
      body.is_max_per_stream_enabled = params.isMaxPerStreamEnabled;
    if (params.maxPerStream !== undefined && params.maxPerStream > 0)
      body.max_per_stream = params.maxPerStream;
    if (params.isMaxPerUserPerStreamEnabled !== undefined)
      body.is_max_per_user_per_stream_enabled = params.isMaxPerUserPerStreamEnabled;
    if (params.maxPerUserPerStream !== undefined && params.maxPerUserPerStream > 0)
      body.max_per_user_per_stream = params.maxPerUserPerStream;
    if (params.isGlobalCooldownEnabled !== undefined)
      body.is_global_cooldown_enabled = params.isGlobalCooldownEnabled;
    if (params.globalCooldownSeconds !== undefined && params.globalCooldownSeconds > 0)
      body.global_cooldown_seconds = params.globalCooldownSeconds;
    if (params.shouldRedemptionsSkipRequestQueue !== undefined)
      body.should_redemptions_skip_request_queue = params.shouldRedemptionsSkipRequestQueue;

    let response = await this.request(
      'post',
      `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchCustomReward>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to create custom reward');
    return data.data[0];
  }

  async updateCustomReward(
    broadcasterId: string,
    rewardId: string,
    params: {
      title?: string;
      cost?: number;
      prompt?: string;
      isEnabled?: boolean;
      backgroundColor?: string;
      isUserInputRequired?: boolean;
      isPaused?: boolean;
      isMaxPerStreamEnabled?: boolean;
      maxPerStream?: number;
      isMaxPerUserPerStreamEnabled?: boolean;
      maxPerUserPerStream?: number;
      isGlobalCooldownEnabled?: boolean;
      globalCooldownSeconds?: number;
      shouldRedemptionsSkipRequestQueue?: boolean;
    }
  ): Promise<TwitchCustomReward> {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.cost !== undefined) body.cost = params.cost;
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.isEnabled !== undefined) body.is_enabled = params.isEnabled;
    if (params.backgroundColor !== undefined) body.background_color = params.backgroundColor;
    if (params.isUserInputRequired !== undefined)
      body.is_user_input_required = params.isUserInputRequired;
    if (params.isPaused !== undefined) body.is_paused = params.isPaused;
    if (params.isMaxPerStreamEnabled !== undefined)
      body.is_max_per_stream_enabled = params.isMaxPerStreamEnabled;
    if (params.maxPerStream !== undefined && params.maxPerStream > 0)
      body.max_per_stream = params.maxPerStream;
    if (params.isMaxPerUserPerStreamEnabled !== undefined)
      body.is_max_per_user_per_stream_enabled = params.isMaxPerUserPerStreamEnabled;
    if (params.maxPerUserPerStream !== undefined && params.maxPerUserPerStream > 0)
      body.max_per_user_per_stream = params.maxPerUserPerStream;
    if (params.isGlobalCooldownEnabled !== undefined)
      body.is_global_cooldown_enabled = params.isGlobalCooldownEnabled;
    if (params.globalCooldownSeconds !== undefined && params.globalCooldownSeconds > 0)
      body.global_cooldown_seconds = params.globalCooldownSeconds;
    if (params.shouldRedemptionsSkipRequestQueue !== undefined)
      body.should_redemptions_skip_request_queue = params.shouldRedemptionsSkipRequestQueue;

    let response = await this.request(
      'patch',
      `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchCustomReward>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to update custom reward');
    return data.data[0];
  }

  async deleteCustomReward(broadcasterId: string, rewardId: string): Promise<void> {
    await this.request(
      'delete',
      `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`
    );
  }

  async getRedemptions(
    broadcasterId: string,
    rewardId: string,
    params?: {
      status?: string;
      sort?: string;
      first?: number;
      after?: string;
    }
  ): Promise<{ redemptions: TwitchRedemption[]; cursor?: string }> {
    let query = new URLSearchParams({
      broadcaster_id: broadcasterId,
      reward_id: rewardId
    });
    query.set('status', params?.status ?? 'UNFULFILLED');
    if (params?.sort) query.set('sort', params.sort);
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request(
      'get',
      `/channel_points/custom_rewards/redemptions?${query.toString()}`
    );
    let data = response.data as TwitchResponse<TwitchRedemption>;
    return { redemptions: data.data, cursor: data.pagination?.cursor };
  }

  async updateRedemptionStatus(
    broadcasterId: string,
    rewardId: string,
    redemptionIds: string[],
    status: string
  ): Promise<TwitchRedemption[]> {
    let query = new URLSearchParams({
      broadcaster_id: broadcasterId,
      reward_id: rewardId
    });
    for (let id of redemptionIds) query.append('id', id);

    let response = await this.request(
      'patch',
      `/channel_points/custom_rewards/redemptions?${query.toString()}`,
      { status }
    );
    let data = response.data as TwitchResponse<TwitchRedemption>;
    return data.data;
  }

  // ─── Polls ──────────────────────────────────────────────────

  async createPoll(
    broadcasterId: string,
    params: {
      title: string;
      choices: string[];
      duration: number;
      channelPointsVotingEnabled?: boolean;
      channelPointsPerVote?: number;
    }
  ): Promise<TwitchPoll> {
    let body: Record<string, unknown> = {
      broadcaster_id: broadcasterId,
      title: params.title,
      choices: params.choices.map(c => ({ title: c })),
      duration: params.duration
    };
    if (params.channelPointsVotingEnabled !== undefined)
      body.channel_points_voting_enabled = params.channelPointsVotingEnabled;
    if (params.channelPointsPerVote !== undefined)
      body.channel_points_per_vote = params.channelPointsPerVote;

    let response = await this.request('post', '/polls', body);
    let data = response.data as TwitchResponse<TwitchPoll>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to create poll');
    return data.data[0];
  }

  async endPoll(
    broadcasterId: string,
    pollId: string,
    status: 'TERMINATED' | 'ARCHIVED'
  ): Promise<TwitchPoll> {
    let response = await this.request('patch', '/polls', {
      broadcaster_id: broadcasterId,
      id: pollId,
      status
    });
    let data = response.data as TwitchResponse<TwitchPoll>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to end poll');
    return data.data[0];
  }

  async getPolls(
    broadcasterId: string,
    params?: {
      pollIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{ polls: TwitchPoll[]; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.pollIds) {
      for (let id of params.pollIds) query.append('id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/polls?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchPoll>;
    return { polls: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Predictions ────────────────────────────────────────────

  async createPrediction(
    broadcasterId: string,
    params: {
      title: string;
      outcomes: string[];
      predictionWindow: number;
    }
  ): Promise<TwitchPrediction> {
    let response = await this.request('post', '/predictions', {
      broadcaster_id: broadcasterId,
      title: params.title,
      outcomes: params.outcomes.map(o => ({ title: o })),
      prediction_window: params.predictionWindow
    });
    let data = response.data as TwitchResponse<TwitchPrediction>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to create prediction');
    return data.data[0];
  }

  async endPrediction(
    broadcasterId: string,
    predictionId: string,
    status: 'RESOLVED' | 'CANCELED' | 'LOCKED',
    winningOutcomeId?: string
  ): Promise<TwitchPrediction> {
    if (winningOutcomeId !== undefined) {
      const current = await this.getPredictions(broadcasterId, {
        predictionIds: [predictionId]
      });
      requireValue(
        current.predictions.length === 1 &&
          current.predictions[0]?.outcomes.some(outcome => outcome.id === winningOutcomeId),
        'winningOutcomeId must belong to this exact prediction. Read its outcomes first.'
      );
    }
    let body: Record<string, unknown> = {
      broadcaster_id: broadcasterId,
      id: predictionId,
      status
    };
    if (winningOutcomeId) body.winning_outcome_id = winningOutcomeId;

    let response = await this.request('patch', '/predictions', body);
    let data = response.data as TwitchResponse<TwitchPrediction>;
    if (!data.data?.[0]) throw createApiServiceError('Failed to end prediction');
    return data.data[0];
  }

  async getPredictions(
    broadcasterId: string,
    params?: {
      predictionIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{ predictions: TwitchPrediction[]; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.predictionIds) {
      for (let id of params.predictionIds) query.append('id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/predictions?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchPrediction>;
    return { predictions: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Raids ──────────────────────────────────────────────────

  async startRaid(
    fromBroadcasterId: string,
    toBroadcasterId: string
  ): Promise<{ createdAt: string; isMature: boolean }> {
    let response = await this.request(
      'post',
      `/raids?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}`
    );
    let data = response.data as { data: Array<{ created_at: string; is_mature: boolean }> };
    let result = data.data?.[0];
    if (!result) throw createApiServiceError('Failed to start raid');
    return { createdAt: result.created_at, isMature: result.is_mature };
  }

  async cancelRaid(broadcasterId: string): Promise<void> {
    await this.request('delete', `/raids?broadcaster_id=${broadcasterId}`);
  }

  // ─── Schedule ───────────────────────────────────────────────

  async getSchedule(
    broadcasterId: string,
    params?: {
      segmentIds?: string[];
      startTime?: string;
      first?: number;
      after?: string;
    }
  ): Promise<{ schedule: TwitchSchedule; cursor?: string }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.segmentIds) {
      for (let id of params.segmentIds) query.append('id', id);
    }
    if (params?.startTime) query.set('start_time', params.startTime);
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/schedule?${query.toString()}`);
    let data = response.data as { data: TwitchSchedule; pagination?: { cursor?: string } };
    return { schedule: data.data, cursor: data.pagination?.cursor };
  }

  async createScheduleSegment(
    broadcasterId: string,
    params: {
      startTime: string;
      timezone: string;
      duration: number;
      isRecurring?: boolean;
      categoryId?: string;
      title?: string;
    }
  ): Promise<TwitchScheduleSegment> {
    let body: Record<string, unknown> = {
      start_time: params.startTime,
      timezone: params.timezone,
      duration: params.duration.toString()
    };
    if (params.isRecurring !== undefined) body.is_recurring = params.isRecurring;
    if (params.categoryId) body.category_id = params.categoryId;
    if (params.title) body.title = params.title;

    let response = await this.request(
      'post',
      `/schedule/segment?broadcaster_id=${broadcasterId}`,
      body
    );
    let data = response.data as { data: { segments: TwitchScheduleSegment[] } };
    if (!data.data?.segments?.[0])
      throw createApiServiceError('Failed to create schedule segment');
    return data.data.segments[0];
  }

  async deleteScheduleSegment(broadcasterId: string, segmentId: string): Promise<void> {
    await this.request(
      'delete',
      `/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`
    );
  }

  // ─── Commercial ─────────────────────────────────────────────

  async startCommercial(
    broadcasterId: string,
    length: number
  ): Promise<{ length: number; message: string; retryAfter: number }> {
    let response = await this.request('post', '/channels/commercial', {
      broadcaster_id: broadcasterId,
      length
    });
    let data = response.data as {
      data: Array<{ length: number; message: string; retry_after: number }>;
    };
    let result = data.data?.[0];
    if (!result) throw createApiServiceError('Failed to start commercial');
    return { length: result.length, message: result.message, retryAfter: result.retry_after };
  }

  // ─── Shoutouts ──────────────────────────────────────────────

  async sendShoutout(
    fromBroadcasterId: string,
    toBroadcasterId: string,
    moderatorId: string
  ): Promise<void> {
    await this.request(
      'post',
      `/chat/shoutouts?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}&moderator_id=${moderatorId}`
    );
  }

  // ─── Whispers ───────────────────────────────────────────────

  async sendWhisper(fromUserId: string, toUserId: string, message: string): Promise<void> {
    await this.request('post', `/whispers?from_user_id=${fromUserId}&to_user_id=${toUserId}`, {
      message
    });
  }

  // ─── Charity ────────────────────────────────────────────────

  async getCharityCampaign(broadcasterId: string): Promise<TwitchCharityCampaign | null> {
    let response = await this.request(
      'get',
      `/charity/campaigns?broadcaster_id=${broadcasterId}`
    );
    let data = response.data as TwitchResponse<TwitchCharityCampaign>;
    return data.data?.[0] || null;
  }

  // ─── Goals ──────────────────────────────────────────────────

  async getGoals(broadcasterId: string): Promise<TwitchGoal[]> {
    let response = await this.request('get', `/goals?broadcaster_id=${broadcasterId}`);
    let data = response.data as TwitchResponse<TwitchGoal>;
    return data.data;
  }

  // ─── Shield Mode ────────────────────────────────────────────

  async getShieldModeStatus(
    broadcasterId: string,
    moderatorId: string
  ): Promise<{
    isActive: boolean;
    moderatorId: string;
    moderatorName: string;
    moderatorLogin: string;
    lastActivatedAt: string;
  }> {
    let response = await this.request(
      'get',
      `/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`
    );
    let data = response.data as {
      data: Array<{
        is_active: boolean;
        moderator_id: string;
        moderator_name: string;
        moderator_login: string;
        last_activated_at: string;
      }>;
    };
    let result = data.data?.[0];
    if (!result) throw createApiServiceError('Failed to get shield mode status');
    return {
      isActive: result.is_active,
      moderatorId: result.moderator_id,
      moderatorName: result.moderator_name,
      moderatorLogin: result.moderator_login,
      lastActivatedAt: result.last_activated_at
    };
  }

  async updateShieldMode(
    broadcasterId: string,
    moderatorId: string,
    isActive: boolean
  ): Promise<void> {
    await this.request(
      'put',
      `/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      { is_active: isActive }
    );
  }

  // ─── VIPs & Moderators ─────────────────────────────────────

  async addModerator(broadcasterId: string, userId: string): Promise<void> {
    await this.request(
      'post',
      `/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`
    );
  }

  async removeModerator(broadcasterId: string, userId: string): Promise<void> {
    await this.request(
      'delete',
      `/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`
    );
  }

  async getModerators(
    broadcasterId: string,
    params?: {
      userIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{
    moderators: Array<{ user_id: string; user_login: string; user_name: string }>;
    cursor?: string;
  }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.userIds) {
      for (let id of params.userIds) query.append('user_id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/moderation/moderators?${query.toString()}`);
    let data = response.data as TwitchResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }>;
    return { moderators: data.data, cursor: data.pagination?.cursor };
  }

  async addVip(broadcasterId: string, userId: string): Promise<void> {
    await this.request(
      'post',
      `/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`
    );
  }

  async removeVip(broadcasterId: string, userId: string): Promise<void> {
    await this.request(
      'delete',
      `/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`
    );
  }

  async getVips(
    broadcasterId: string,
    params?: {
      userIds?: string[];
      first?: number;
      after?: string;
    }
  ): Promise<{
    vips: Array<{ user_id: string; user_login: string; user_name: string }>;
    cursor?: string;
  }> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (params?.userIds) {
      for (let id of params.userIds) query.append('user_id', id);
    }
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after !== undefined) query.set('after', params.after);

    let response = await this.request('get', `/channels/vips?${query.toString()}`);
    let data = response.data as TwitchResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }>;
    return { vips: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Search ─────────────────────────────────────────────────

  async searchChannels(
    query: string,
    params?: {
      first?: number;
      after?: string;
      liveOnly?: boolean;
    }
  ): Promise<{
    channels: Array<{
      broadcaster_language: string;
      broadcaster_login: string;
      display_name: string;
      game_id: string;
      game_name: string;
      id: string;
      is_live: boolean;
      tags: string[];
      thumbnail_url: string;
      title: string;
      started_at: string;
    }>;
    cursor?: string;
  }> {
    let searchParams = new URLSearchParams({ query });
    if (params?.first) searchParams.set('first', params.first.toString());
    if (params?.after !== undefined) searchParams.set('after', params.after);
    if (params?.liveOnly !== undefined)
      searchParams.set('live_only', params.liveOnly.toString());

    let response = await this.request('get', `/search/channels?${searchParams.toString()}`);
    let data = response.data as any;
    return { channels: data.data, cursor: data.pagination?.cursor };
  }

  async searchCategories(
    query: string,
    params?: {
      first?: number;
      after?: string;
    }
  ): Promise<{
    categories: Array<{ id: string; name: string; box_art_url: string }>;
    cursor?: string;
  }> {
    let searchParams = new URLSearchParams({ query });
    if (params?.first) searchParams.set('first', params.first.toString());
    if (params?.after !== undefined) searchParams.set('after', params.after);

    let response = await this.request('get', `/search/categories?${searchParams.toString()}`);
    let data = response.data as any;
    return { categories: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Bits ───────────────────────────────────────────────────

  async getBitsLeaderboard(params?: {
    count?: number;
    period?: string;
    startedAt?: string;
    userId?: string;
  }): Promise<{
    entries: Array<{
      user_id: string;
      user_login: string;
      user_name: string;
      rank: number;
      score: number;
    }>;
    dateRange: { started_at: string; ended_at: string };
    total: number;
  }> {
    let query = new URLSearchParams();
    if (params?.count) query.set('count', params.count.toString());
    if (params?.period) query.set('period', params.period);
    if (params?.startedAt) query.set('started_at', params.startedAt);
    if (params?.userId) query.set('user_id', params.userId);

    let response = await this.request('get', `/bits/leaderboard?${query.toString()}`);
    let data = response.data as any;
    return {
      entries: data.data,
      dateRange: data.date_range,
      total: data.total
    };
  }
}
