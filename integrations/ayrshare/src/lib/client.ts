import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.ayrshare.com/api'
});

export interface ClientConfig {
  token: string;
  profileKey?: string;
}

export class Client {
  private headers: Record<string, string>;

  constructor(config: ClientConfig) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
    if (config.profileKey) {
      this.headers['Profile-Key'] = config.profileKey;
    }
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
    facebookOptions?: Record<string, unknown>;
    linkedInOptions?: Record<string, unknown>;
    pinterestOptions?: Record<string, unknown>;
    redditOptions?: Record<string, unknown>;
    gmbOptions?: Record<string, unknown>;
    telegramOptions?: Record<string, unknown>;
    threadsOptions?: Record<string, unknown>;
    blueskyOptions?: Record<string, unknown>;
    snapchatOptions?: Record<string, unknown>;
  }) {
    let response = await axios.post('/post', params, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePost(params: {
    postId?: string;
    bulk?: string[];
    deleteAllScheduled?: boolean;
  }) {
    let body: Record<string, unknown> = {};
    if (params.postId) body.id = params.postId;
    if (params.bulk) body.bulk = params.bulk;
    if (params.deleteAllScheduled) body.deleteAllScheduled = params.deleteAllScheduled;

    let response = await axios.delete('/post', {
      headers: this.headers,
      data: body
    });
    return response.data;
  }

  async updatePost(params: { postId: string; approved?: boolean; scheduleDate?: string }) {
    let response = await axios.patch(
      '/post',
      {
        id: params.postId,
        approved: params.approved,
        scheduleDate: params.scheduleDate
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
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.platforms) queryParams.platforms = JSON.stringify(params.platforms);
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.lastDays !== undefined) queryParams.lastDays = String(params.lastDays);
    if (params?.status) queryParams.status = params.status;
    if (params?.type) queryParams.type = params.type;

    let response = await axios.get('/history', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // --- Analytics ---

  async getPostAnalytics(params: { postId: string; platforms?: string[] }) {
    let response = await axios.post(
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
    let response = await axios.post(
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
    let queryParams: Record<string, string> = {};
    if (params.searchPlatformId) queryParams.searchPlatformId = 'true';
    if (params.commentId) queryParams.commentId = 'true';
    if (params.platform) queryParams.platform = params.platform;

    let response = await axios.get(`/comments/${params.postId}`, {
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
    let response = await axios.post(
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

  async deleteComment(params: { commentId: string; platforms: string[] }) {
    let response = await axios.delete('/comments', {
      headers: this.headers,
      data: {
        id: params.commentId,
        platforms: params.platforms
      }
    });
    return response.data;
  }

  // --- Messages ---

  async sendMessage(params: {
    platform: string;
    recipientId: string;
    message?: string;
    mediaUrls?: string[];
  }) {
    let response = await axios.post(
      `/messages/${params.platform}`,
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
  }) {
    let queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;
    if (params.conversationId) queryParams.conversationId = params.conversationId;
    if (params.conversationsOnly) queryParams.conversationsOnly = 'true';

    let response = await axios.get(`/messages/${params.platform}`, {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // --- Media ---

  async uploadMedia(params: { file: string; fileName?: string; description?: string }) {
    let response = await axios.post(
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
    let response = await axios.post('/hashtags/auto', params, {
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
    let response = await axios.post('/profiles', params, {
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
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.title) queryParams.title = params.title;
    if (params?.refId) queryParams.refId = params.refId;
    if (params?.hasActiveSocialAccounts !== undefined) {
      queryParams.hasActiveSocialAccounts = String(params.hasActiveSocialAccounts);
    }

    let response = await axios.get('/profiles', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async deleteProfile(params: { profileKey: string; title?: string }) {
    let deleteHeaders = { ...this.headers, 'Profile-Key': params.profileKey };
    let response = await axios.delete('/profiles', {
      headers: deleteHeaders,
      data: params.title ? { title: params.title } : undefined
    });
    return response.data;
  }

  // --- Reviews ---

  async getReviews(params: { platform: string }) {
    let response = await axios.get('/reviews', {
      headers: this.headers,
      params: { platform: params.platform }
    });
    return response.data;
  }

  // --- Webhooks ---

  async registerWebhook(params: { action: string; url: string; secret?: string }) {
    let response = await axios.post('/hook/webhook', params, {
      headers: this.headers
    });
    return response.data;
  }

  async unregisterWebhook(params: { action: string }) {
    let response = await axios.delete('/hook/webhook', {
      headers: this.headers,
      data: { action: params.action }
    });
    return response.data;
  }

  async getWebhooks() {
    let response = await axios.get('/hook/webhook', {
      headers: this.headers
    });
    return response.data;
  }

  // --- Validation ---

  async validatePost(params: { post: string; platforms: string[]; mediaUrls?: string[] }) {
    let response = await axios.post('/post/validate', params, {
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
    let response = await axios.post('/feed', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getFeeds() {
    let response = await axios.get('/feed', {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFeed(params: { feedId: string }) {
    let response = await axios.delete('/feed', {
      headers: this.headers,
      data: { id: params.feedId }
    });
    return response.data;
  }

  // --- User Info ---

  async getUser() {
    let response = await axios.get('/user', {
      headers: this.headers
    });
    return response.data;
  }
}
