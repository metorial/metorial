import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface ClientConfig {
  token: string;
  profileKey?: string;
  twitterApiKey?: string;
  twitterApiSecret?: string;
}

export class Client {
  private headers: Record<string, string>;
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
    if (!config.token.trim()) {
      throw createApiServiceError('An Ayrshare API key is required. Reconnect your account.');
    }
    if (Boolean(config.twitterApiKey) !== Boolean(config.twitterApiSecret)) {
      throw createApiServiceError(
        'Provide both the X API key and X API secret in your connection.'
      );
    }
    if (config.profileKey) this.headers['Profile-Key'] = config.profileKey;
    if (config.twitterApiKey && config.twitterApiSecret) {
      this.headers['X-Twitter-OAuth1-Api-Key'] = config.twitterApiKey;
      this.headers['X-Twitter-OAuth1-Api-Secret'] = config.twitterApiSecret;
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ayrshare.com/api',
      headers: this.headers,
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let details: string[] = [];
          collectApiErrorDetails(error.response?.data, details, {
            detailKeys: ['message', 'detail', 'error', 'code', 'platform'],
            nestedKeys: ['errors', 'posts', 'messages', 'details']
          });
          let data = error.response?.data;
          return {
            message: details.length ? details.join(' - ') : inferred.message,
            upstream: {
              ...inferred.upstream,
              code:
                isApiErrorRecord(data) &&
                (typeof data.code === 'string' || typeof data.code === 'number')
                  ? String(data.code)
                  : inferred.upstream?.code
            }
          };
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Ayrshare',
          reason: 'ayrshare_api_error',
          extractUpstreamCode: value => {
            if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return undefined;
            let upstream = value.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
              ? upstream.code
              : undefined;
          }
        })
    });
    this.axios.interceptors.response.use(response => {
      // A history record's status describes publication, including a failed post.
      let isPostHistory =
        response.config.method?.toLowerCase() === 'get' &&
        response.config.url?.startsWith('/history/');
      let data = response.data;
      let postResults =
        isApiErrorRecord(data) && Array.isArray(data.posts) ? data.posts : [data];
      let hasPublishedPost =
        response.config.method?.toLowerCase() === 'post' &&
        response.config.url === '/post' &&
        postResults.some(
          post =>
            isApiErrorRecord(post) &&
            (post.status === 'success' ||
              (Array.isArray(post.postIds) &&
                post.postIds.some(
                  result => isApiErrorRecord(result) && result.status === 'success'
                )))
        );
      if (
        !isPostHistory &&
        !hasPublishedPost &&
        isApiErrorRecord(data) &&
        data.status === 'error'
      ) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Ayrshare',
            reason: 'ayrshare_api_error',
            detailKeys: ['message', 'detail', 'error', 'code', 'platform'],
            nestedKeys: ['errors', 'posts', 'messages', 'details'],
            extractUpstreamCode: (_error, upstream) => {
              let data = upstream?.data;
              return isApiErrorRecord(data) &&
                (typeof data.code === 'number' || typeof data.code === 'string')
                ? String(data.code)
                : undefined;
            }
          }
        );
      }
      return response;
    });
  }

  // --- Post Management ---

  async createPost(params: {
    post: string;
    platforms: string[];
    mediaUrls?: string[];
    scheduleDate?: string;
    shortenLinks?: boolean;
    autoHashtag?: boolean | { max?: number; position?: string };
    requiresApproval?: boolean;
    idempotencyKey?: string;
    isVideo?: boolean;
    firstComment?: { comment: string; mediaUrls?: string[] };
    autoRepost?: { repeat: number; days: number; startDate?: string };
    unsplash?: string;
    title?: string;
    subreddit?: string;
    youTubeOptions?: Record<string, unknown>;
    tikTokOptions?: Record<string, unknown>;
    instagramOptions?: Record<string, unknown>;
    faceBookOptions?: Record<string, unknown>;
    facebookOptions?: Record<string, unknown>;
    linkedInOptions?: Record<string, unknown>;
    pinterestOptions?: Record<string, unknown>;
    redditOptions?: Record<string, unknown>;
    gmbOptions?: Record<string, unknown>;
    twitterOptions?: Record<string, unknown>;
    telegramOptions?: Record<string, unknown>;
    threadsOptions?: Record<string, unknown>;
    blueskyOptions?: Record<string, unknown>;
    snapchatOptions?: Record<string, unknown>;
    snapChatOptions?: Record<string, unknown>;
  }) {
    if (
      params.autoRepost &&
      (!Number.isInteger(params.autoRepost.repeat) ||
        !Number.isInteger(params.autoRepost.days))
    ) {
      throw createApiServiceError('Auto-repost repeat and days must be whole numbers.');
    }
    let response = await this.axios.post('/post', params, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePost(params: {
    postId?: string;
    bulk?: string[];
    deleteAllScheduled?: boolean;
  }) {
    if (!params.postId && !params.bulk?.length && !params.deleteAllScheduled) {
      throw createApiServiceError(
        'Provide a postId, a non-empty bulk list, or deleteAllScheduled: true.'
      );
    }
    let body: Record<string, unknown> = {};
    if (params.postId) body.id = params.postId;
    if (params.bulk) body.bulk = params.bulk;
    if (params.deleteAllScheduled) body.deleteAllScheduled = params.deleteAllScheduled;

    let response = await this.axios.delete('/post', {
      headers: this.headers,
      data: body
    });
    return response.data;
  }

  async updatePost(params: {
    postId: string;
    approved?: boolean;
    scheduleDate?: string;
    scheduledPause?: boolean;
    notes?: string;
  }) {
    if (
      params.approved === undefined &&
      params.scheduleDate === undefined &&
      params.scheduledPause === undefined &&
      params.notes === undefined
    ) {
      throw createApiServiceError(
        'Provide approved, scheduleDate, scheduledPause, or notes to update a post.'
      );
    }
    let response = await this.axios.patch(
      '/post',
      {
        id: params.postId,
        approved: params.approved,
        scheduleDate: params.scheduleDate,
        scheduledPause: params.scheduledPause,
        notes: params.notes
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Post History ---

  async getHistory(params?: {
    limit?: number;
    platforms?: string[];
    startDate?: string;
    endDate?: string;
    lastDays?: number;
    status?: string;
    type?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) {
      if (!Number.isInteger(params.limit))
        throw createApiServiceError('limit must be a whole number.');
      queryParams.limit = String(params.limit);
    }
    if (params?.platforms) queryParams.platforms = JSON.stringify(params.platforms);
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.lastDays !== undefined) {
      if (!Number.isInteger(params.lastDays) || params.lastDays < 0) {
        throw createApiServiceError('lastDays must be a non-negative whole number.');
      }
      queryParams.lastDays = String(params.lastDays);
    }
    if (params?.status) queryParams.status = params.status;
    if (params?.type) queryParams.type = params.type;

    let response = await this.axios.get('/history', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getHistoryById(postId: string) {
    let response = await this.axios.get(`/history/${encodeURIComponent(postId)}`);
    return response.data;
  }

  async retryPost(postId: string) {
    let response = await this.axios.put('/post/retry', { id: postId });
    return response.data;
  }

  // --- Analytics ---

  async getPostAnalytics(params: { postId: string; platforms?: string[] }) {
    let response = await this.axios.post(
      '/analytics/post',
      {
        id: params.postId,
        platforms: params.platforms
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getSocialAnalytics(params: {
    platforms: string[];
    daily?: boolean;
    quarters?: number;
  }) {
    if (params.quarters !== undefined && !Number.isInteger(params.quarters)) {
      throw createApiServiceError('quarters must be a whole number.');
    }
    let response = await this.axios.post(
      '/analytics/social',
      {
        platforms: params.platforms,
        daily: params.daily,
        quarters: params.quarters
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Comments ---

  async getComments(params: {
    postId: string;
    searchPlatformId?: boolean;
    commentId?: boolean;
    platform?: string;
  }) {
    if ((params.searchPlatformId || params.commentId) && !params.platform) {
      throw createApiServiceError(
        'Provide platform when looking up a social post or comment ID.'
      );
    }
    if (params.commentId && !params.searchPlatformId) {
      throw createApiServiceError('Set searchPlatformId: true when commentId is true.');
    }
    let queryParams: Record<string, string> = {};
    if (params.searchPlatformId) queryParams.searchPlatformId = 'true';
    if (params.commentId) queryParams.commentId = 'true';
    if (params.platform) queryParams.platform = params.platform;

    let response = await this.axios.get(`/comments/${encodeURIComponent(params.postId)}`, {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async postComment(params: {
    postId: string;
    comment: string;
    platforms: string[];
    searchPlatformId?: boolean;
    mediaUrls?: string[];
  }) {
    if (params.searchPlatformId && params.platforms.length !== 1) {
      throw createApiServiceError(
        'Provide exactly one platform when commenting with a Social Post ID.'
      );
    }
    if ((params.mediaUrls?.length ?? 0) > 1) {
      throw createApiServiceError('Comments support only one image URL.');
    }
    let response = await this.axios.post(
      '/comments',
      {
        id: params.postId,
        comment: params.comment,
        platforms: params.platforms,
        searchPlatformId: params.searchPlatformId,
        mediaUrls: params.mediaUrls
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteComment(params: {
    commentId: string;
    platforms: string[];
    searchPlatformId?: boolean;
  }) {
    if (params.searchPlatformId && params.platforms.length !== 1) {
      throw createApiServiceError(
        'Provide exactly one platform when deleting with a Social Comment ID.'
      );
    }
    let response = await this.axios.delete(
      `/comments/${encodeURIComponent(params.commentId)}`,
      {
        headers: this.headers,
        data: params.searchPlatformId
          ? { searchPlatformId: true, platform: params.platforms[0] }
          : { platforms: params.platforms }
      }
    );
    return response.data;
  }

  // --- Messages ---

  async sendMessage(params: {
    platform: string;
    recipientId: string;
    message?: string;
    mediaUrls?: string[];
  }) {
    if (!params.message && !params.mediaUrls?.length) {
      throw createApiServiceError('Provide message text or at least one media URL.');
    }
    if (params.platform === 'twitter' && (params.mediaUrls?.length ?? 0) > 1) {
      throw createApiServiceError('X supports only one media URL per message.');
    }
    let response = await this.axios.post(
      `/messages/${encodeURIComponent(params.platform)}`,
      {
        recipientId: params.recipientId,
        message: params.message,
        mediaUrls: params.mediaUrls
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getMessages(params: {
    platform: string;
    status?: string;
    conversationId?: string;
    conversationsOnly?: boolean;
    action?: 'sent' | 'received';
    limit?: number;
    next?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;
    if (params.conversationId) queryParams.conversationId = params.conversationId;
    if (params.conversationsOnly !== undefined)
      queryParams.conversationsOnly = String(params.conversationsOnly);
    if (params.action) queryParams.action = params.action;
    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit))
        throw createApiServiceError('limit must be a whole number.');
      queryParams.limit = String(params.limit);
    }
    if (params.next) queryParams.next = params.next;

    let response = await this.axios.get(`/messages/${encodeURIComponent(params.platform)}`, {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // --- Media ---

  async uploadMedia(params: { file: string; fileName?: string; description?: string }) {
    let response = await this.axios.post(
      '/media/upload',
      {
        file: params.file,
        fileName: params.fileName,
        description: params.description
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Hashtags ---

  async generateHashtags(params: {
    post: string;
    max?: number;
    position?: string;
    language?: string;
  }) {
    if (params.max !== undefined && !Number.isInteger(params.max)) {
      throw createApiServiceError('max must be a whole number.');
    }
    let response = await this.axios.post('/hashtags/auto', params, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Profiles ---

  async createProfile(params: {
    title: string;
    disableSocial?: string[];
    tags?: string[];
    team?: boolean;
    email?: string;
  }) {
    if (params.team && !params.email) {
      throw createApiServiceError('Provide email when creating a team member profile.');
    }
    let response = await this.axios.post('/profiles', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getProfiles(params?: {
    limit?: number;
    cursor?: string;
    title?: string;
    refId?: string;
    hasActiveSocialAccounts?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) {
      if (!Number.isInteger(params.limit))
        throw createApiServiceError('limit must be a whole number.');
      queryParams.limit = String(params.limit);
    }
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.title) queryParams.title = params.title;
    if (params?.refId) queryParams.refId = params.refId;
    if (params?.hasActiveSocialAccounts !== undefined) {
      queryParams.hasActiveSocialAccounts = String(params.hasActiveSocialAccounts);
    }

    let response = await this.axios.get('/profiles', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async deleteProfile(params: { profileKey: string; title?: string }) {
    let deleteHeaders = { ...this.headers, 'Profile-Key': params.profileKey };
    let response = await this.axios.delete('/profiles', {
      headers: deleteHeaders,
      data: params.title ? { title: params.title } : undefined
    });
    return response.data;
  }

  // --- Reviews ---

  async getReviews(params: { platform: string }) {
    let response = await this.axios.get('/reviews', {
      headers: this.headers,
      params: { platform: params.platform }
    });
    return response.data;
  }

  // --- Webhooks ---

  async registerWebhook(params: { action: string; url: string; secret?: string }) {
    let response = await this.axios.post('/hook/webhook', params, {
      headers: this.headers
    });
    return response.data;
  }

  async unregisterWebhook(params: { action: string }) {
    let response = await this.axios.delete('/hook/webhook', {
      headers: this.headers,
      data: { action: params.action }
    });
    return response.data;
  }

  async getWebhooks() {
    let response = await this.axios.get('/hook/webhook', {
      headers: this.headers
    });
    return response.data;
  }

  // --- Validation ---

  async validatePost(params: { post: string; platforms: string[]; mediaUrls?: string[] }) {
    let response = await this.axios.post('/validate/post', params, {
      headers: this.headers
    });
    return response.data;
  }

  // --- RSS Feeds ---

  async addFeed(params: {
    url: string;
    platforms: string[];
    autoHashtag?: boolean;
    shortenLinks?: boolean;
  }) {
    let response = await this.axios.post('/feed', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getFeeds() {
    let response = await this.axios.get('/feed', {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFeed(params: { feedId: string }) {
    let response = await this.axios.delete('/feed', {
      headers: this.headers,
      data: { id: params.feedId }
    });
    return response.data;
  }

  // --- User Info ---

  async getUser() {
    let response = await this.axios.get('/user', {
      headers: this.headers
    });
    return response.data;
  }
}
