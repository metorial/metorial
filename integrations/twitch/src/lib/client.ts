import { createAxios } from 'slates';
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

  constructor(token: string, clientId: string) {
    this.axios = createAxios({
      baseURL: 'https://api.twitch.tv/helix',
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': clientId
      }
    });
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
    let response = await this.axios.get(`/users?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchUser>;
    return data.data;
  }

  async getAuthenticatedUser(): Promise<TwitchUser> {
    let response = await this.axios.get('/users');
    let data = response.data as TwitchResponse<TwitchUser>;
    if (!data.data?.[0]) throw new Error('Failed to get authenticated user');
    return data.data[0];
  }

  // ─── Channels ───────────────────────────────────────────────

  async getChannelInfo(broadcasterIds: string[]): Promise<TwitchChannel[]> {
    let query = new URLSearchParams();
    for (let id of broadcasterIds) query.append('broadcaster_id', id);
    let response = await this.axios.get(`/channels?${query.toString()}`);
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
  ): Promise<void> {
    let body: Record<string, any> = {};
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

    await this.axios.patch(`/channels?broadcaster_id=${broadcasterId}`, body);
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/streams?${query.toString()}`);
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/subscriptions?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchSubscription> & { total: number };
    return {
      subscriptions: data.data,
      total: data.total || 0,
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/channels/followers?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchFollower> & { total: number };
    return {
      followers: data.data,
      total: data.total || 0,
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

    let response = await this.axios.post(`/clips?${query.toString()}`);
    let data = response.data as { data: Array<{ id: string; edit_url: string }> };
    let clip = data.data?.[0];
    if (!clip) throw new Error('Failed to create clip');
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
    if (params.after) query.set('after', params.after);
    if (params.startedAt) query.set('started_at', params.startedAt);
    if (params.endedAt) query.set('ended_at', params.endedAt);

    let response = await this.axios.get(`/clips?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchClip>;
    return { clips: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Videos ─────────────────────────────────────────────────

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
    if (params.after) query.set('after', params.after);
    if (params.type) query.set('type', params.type);
    if (params.sort) query.set('sort', params.sort);
    if (params.period) query.set('period', params.period);

    let response = await this.axios.get(`/videos?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchVideo>;
    return { videos: data.data, cursor: data.pagination?.cursor };
  }

  async deleteVideos(videoIds: string[]): Promise<void> {
    let query = new URLSearchParams();
    for (let id of videoIds) query.append('id', id);
    await this.axios.delete(`/videos?${query.toString()}`);
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
    let response = await this.axios.post(
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
    if (!data.data?.[0]) throw new Error('Failed to ban user');
    return data.data[0];
  }

  async unbanUser(broadcasterId: string, moderatorId: string, userId: string): Promise<void> {
    await this.axios.delete(
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/moderation/bans?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchBannedUser>;
    return { users: data.data, cursor: data.pagination?.cursor };
  }

  async deleteChatMessage(
    broadcasterId: string,
    moderatorId: string,
    messageId: string
  ): Promise<void> {
    await this.axios.delete(
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
  ): Promise<{ messageId: string; isSent: boolean }> {
    let body: Record<string, any> = {
      broadcaster_id: broadcasterId,
      sender_id: senderId,
      message
    };
    if (params?.replyParentMessageId)
      body.reply_parent_message_id = params.replyParentMessageId;

    let response = await this.axios.post('/chat/messages', body);
    let data = response.data as { data: Array<{ message_id: string; is_sent: boolean }> };
    let result = data.data?.[0];
    if (!result) throw new Error('Failed to send chat message');
    return { messageId: result.message_id, isSent: result.is_sent };
  }

  async getChatSettings(
    broadcasterId: string,
    moderatorId?: string
  ): Promise<TwitchChatSettings> {
    let query = new URLSearchParams({ broadcaster_id: broadcasterId });
    if (moderatorId) query.set('moderator_id', moderatorId);

    let response = await this.axios.get(`/chat/settings?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchChatSettings>;
    if (!data.data?.[0]) throw new Error('Failed to get chat settings');
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
    let body: Record<string, any> = {};
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

    let response = await this.axios.patch(
      `/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchChatSettings>;
    if (!data.data?.[0]) throw new Error('Failed to update chat settings');
    return data.data[0];
  }

  async sendChatAnnouncement(
    broadcasterId: string,
    moderatorId: string,
    message: string,
    color?: string
  ): Promise<void> {
    await this.axios.post(
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/chat/chatters?${query.toString()}`);
    let data = response.data as TwitchResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }> & { total: number };
    return {
      chatters: data.data,
      total: data.total || 0,
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

    let response = await this.axios.get(`/channel_points/custom_rewards?${query.toString()}`);
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
    let body: Record<string, any> = {
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
    if (params.maxPerStream !== undefined) body.max_per_stream = params.maxPerStream;
    if (params.isMaxPerUserPerStreamEnabled !== undefined)
      body.is_max_per_user_per_stream_enabled = params.isMaxPerUserPerStreamEnabled;
    if (params.maxPerUserPerStream !== undefined)
      body.max_per_user_per_stream = params.maxPerUserPerStream;
    if (params.isGlobalCooldownEnabled !== undefined)
      body.is_global_cooldown_enabled = params.isGlobalCooldownEnabled;
    if (params.globalCooldownSeconds !== undefined)
      body.global_cooldown_seconds = params.globalCooldownSeconds;
    if (params.shouldRedemptionsSkipRequestQueue !== undefined)
      body.should_redemptions_skip_request_queue = params.shouldRedemptionsSkipRequestQueue;

    let response = await this.axios.post(
      `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchCustomReward>;
    if (!data.data?.[0]) throw new Error('Failed to create custom reward');
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
    let body: Record<string, any> = {};
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
    if (params.maxPerStream !== undefined) body.max_per_stream = params.maxPerStream;
    if (params.isMaxPerUserPerStreamEnabled !== undefined)
      body.is_max_per_user_per_stream_enabled = params.isMaxPerUserPerStreamEnabled;
    if (params.maxPerUserPerStream !== undefined)
      body.max_per_user_per_stream = params.maxPerUserPerStream;
    if (params.isGlobalCooldownEnabled !== undefined)
      body.is_global_cooldown_enabled = params.isGlobalCooldownEnabled;
    if (params.globalCooldownSeconds !== undefined)
      body.global_cooldown_seconds = params.globalCooldownSeconds;
    if (params.shouldRedemptionsSkipRequestQueue !== undefined)
      body.should_redemptions_skip_request_queue = params.shouldRedemptionsSkipRequestQueue;

    let response = await this.axios.patch(
      `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`,
      body
    );
    let data = response.data as TwitchResponse<TwitchCustomReward>;
    if (!data.data?.[0]) throw new Error('Failed to update custom reward');
    return data.data[0];
  }

  async deleteCustomReward(broadcasterId: string, rewardId: string): Promise<void> {
    await this.axios.delete(
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
    if (params?.status) query.set('status', params.status);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.first) query.set('first', params.first.toString());
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(
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

    let response = await this.axios.patch(
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
    let body: Record<string, any> = {
      broadcaster_id: broadcasterId,
      title: params.title,
      choices: params.choices.map(c => ({ title: c })),
      duration: params.duration
    };
    if (params.channelPointsVotingEnabled !== undefined)
      body.channel_points_voting_enabled = params.channelPointsVotingEnabled;
    if (params.channelPointsPerVote !== undefined)
      body.channel_points_per_vote = params.channelPointsPerVote;

    let response = await this.axios.post('/polls', body);
    let data = response.data as TwitchResponse<TwitchPoll>;
    if (!data.data?.[0]) throw new Error('Failed to create poll');
    return data.data[0];
  }

  async endPoll(
    broadcasterId: string,
    pollId: string,
    status: 'TERMINATED' | 'ARCHIVED'
  ): Promise<TwitchPoll> {
    let response = await this.axios.patch('/polls', {
      broadcaster_id: broadcasterId,
      id: pollId,
      status
    });
    let data = response.data as TwitchResponse<TwitchPoll>;
    if (!data.data?.[0]) throw new Error('Failed to end poll');
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/polls?${query.toString()}`);
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
    let response = await this.axios.post('/predictions', {
      broadcaster_id: broadcasterId,
      title: params.title,
      outcomes: params.outcomes.map(o => ({ title: o })),
      prediction_window: params.predictionWindow
    });
    let data = response.data as TwitchResponse<TwitchPrediction>;
    if (!data.data?.[0]) throw new Error('Failed to create prediction');
    return data.data[0];
  }

  async endPrediction(
    broadcasterId: string,
    predictionId: string,
    status: 'RESOLVED' | 'CANCELED' | 'LOCKED',
    winningOutcomeId?: string
  ): Promise<TwitchPrediction> {
    let body: Record<string, any> = {
      broadcaster_id: broadcasterId,
      id: predictionId,
      status
    };
    if (winningOutcomeId) body.winning_outcome_id = winningOutcomeId;

    let response = await this.axios.patch('/predictions', body);
    let data = response.data as TwitchResponse<TwitchPrediction>;
    if (!data.data?.[0]) throw new Error('Failed to end prediction');
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/predictions?${query.toString()}`);
    let data = response.data as TwitchResponse<TwitchPrediction>;
    return { predictions: data.data, cursor: data.pagination?.cursor };
  }

  // ─── Raids ──────────────────────────────────────────────────

  async startRaid(
    fromBroadcasterId: string,
    toBroadcasterId: string
  ): Promise<{ createdAt: string; isMature: boolean }> {
    let response = await this.axios.post(
      `/raids?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}`
    );
    let data = response.data as { data: Array<{ created_at: string; is_mature: boolean }> };
    let result = data.data?.[0];
    if (!result) throw new Error('Failed to start raid');
    return { createdAt: result.created_at, isMature: result.is_mature };
  }

  async cancelRaid(broadcasterId: string): Promise<void> {
    await this.axios.delete(`/raids?broadcaster_id=${broadcasterId}`);
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/schedule?${query.toString()}`);
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
    let body: Record<string, any> = {
      start_time: params.startTime,
      timezone: params.timezone,
      duration: params.duration.toString()
    };
    if (params.isRecurring !== undefined) body.is_recurring = params.isRecurring;
    if (params.categoryId) body.category_id = params.categoryId;
    if (params.title) body.title = params.title;

    let response = await this.axios.post(
      `/schedule/segment?broadcaster_id=${broadcasterId}`,
      body
    );
    let data = response.data as { data: { segments: TwitchScheduleSegment[] } };
    if (!data.data?.segments?.[0]) throw new Error('Failed to create schedule segment');
    return data.data.segments[0];
  }

  async deleteScheduleSegment(broadcasterId: string, segmentId: string): Promise<void> {
    await this.axios.delete(
      `/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`
    );
  }

  // ─── Commercial ─────────────────────────────────────────────

  async startCommercial(
    broadcasterId: string,
    length: number
  ): Promise<{ length: number; message: string; retryAfter: number }> {
    let response = await this.axios.post('/channels/commercial', {
      broadcaster_id: broadcasterId,
      length
    });
    let data = response.data as {
      data: Array<{ length: number; message: string; retry_after: number }>;
    };
    let result = data.data?.[0];
    if (!result) throw new Error('Failed to start commercial');
    return { length: result.length, message: result.message, retryAfter: result.retry_after };
  }

  // ─── Shoutouts ──────────────────────────────────────────────

  async sendShoutout(
    fromBroadcasterId: string,
    toBroadcasterId: string,
    moderatorId: string
  ): Promise<void> {
    await this.axios.post(
      `/chat/shoutouts?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}&moderator_id=${moderatorId}`
    );
  }

  // ─── Whispers ───────────────────────────────────────────────

  async sendWhisper(fromUserId: string, toUserId: string, message: string): Promise<void> {
    await this.axios.post(`/whispers?from_user_id=${fromUserId}&to_user_id=${toUserId}`, {
      message
    });
  }

  // ─── Charity ────────────────────────────────────────────────

  async getCharityCampaign(broadcasterId: string): Promise<TwitchCharityCampaign | null> {
    let response = await this.axios.get(`/charity/campaigns?broadcaster_id=${broadcasterId}`);
    let data = response.data as TwitchResponse<TwitchCharityCampaign>;
    return data.data?.[0] || null;
  }

  // ─── Goals ──────────────────────────────────────────────────

  async getGoals(broadcasterId: string): Promise<TwitchGoal[]> {
    let response = await this.axios.get(`/goals?broadcaster_id=${broadcasterId}`);
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
    let response = await this.axios.get(
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
    if (!result) throw new Error('Failed to get shield mode status');
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
    await this.axios.put(
      `/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`,
      { is_active: isActive }
    );
  }

  // ─── VIPs & Moderators ─────────────────────────────────────

  async addModerator(broadcasterId: string, userId: string): Promise<void> {
    await this.axios.post(
      `/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`
    );
  }

  async removeModerator(broadcasterId: string, userId: string): Promise<void> {
    await this.axios.delete(
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/moderation/moderators?${query.toString()}`);
    let data = response.data as TwitchResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }>;
    return { moderators: data.data, cursor: data.pagination?.cursor };
  }

  async addVip(broadcasterId: string, userId: string): Promise<void> {
    await this.axios.post(`/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`);
  }

  async removeVip(broadcasterId: string, userId: string): Promise<void> {
    await this.axios.delete(
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
    if (params?.after) query.set('after', params.after);

    let response = await this.axios.get(`/channels/vips?${query.toString()}`);
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
    if (params?.after) searchParams.set('after', params.after);
    if (params?.liveOnly !== undefined)
      searchParams.set('live_only', params.liveOnly.toString());

    let response = await this.axios.get(`/search/channels?${searchParams.toString()}`);
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
    if (params?.after) searchParams.set('after', params.after);

    let response = await this.axios.get(`/search/categories?${searchParams.toString()}`);
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

    let response = await this.axios.get(`/bits/leaderboard?${query.toString()}`);
    let data = response.data as any;
    return {
      entries: data.data,
      dateRange: data.date_range,
      total: data.total
    };
  }
}
