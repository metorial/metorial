import { createAxios } from '@slates/provider';
import { instagramApiError } from './errors';

export interface ClientConfig {
  token: string;
  apiVersion?: string;
  apiBaseUrl?: string;
}

type MediaContainerParams = {
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  mediaType?: string;
  isCarouselItem?: boolean;
  locationId?: string;
  altText?: string;
  userTags?: Array<{ username: string; x: number; y: number }>;
  coverUrl?: string;
  shareToFeed?: boolean;
  children?: string[];
};

export class InstagramClient {
  private api: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: ClientConfig) {
    let version = config.apiVersion || 'v21.0';
    let apiBaseUrl = (config.apiBaseUrl || 'https://graph.facebook.com').replace(/\/$/, '');

    this.token = config.token;
    this.api = createAxios({
      baseURL: `${apiBaseUrl}/${version}`
    });
  }

  private async request(operation: string, run: () => Promise<{ data: any }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw instagramApiError(error, operation);
    }
  }

  // Profile

  async getProfile(userId: string, fields?: string) {
    let defaultFields =
      'id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website,ig_id';

    return this.request('get profile', () =>
      this.api.get(`/${userId}`, {
        params: {
          fields: fields || defaultFields,
          access_token: this.token
        }
      })
    );
  }

  // Media

  async listMedia(
    userId: string,
    options?: {
      fields?: string;
      limit?: number;
      after?: string;
      before?: string;
    }
  ) {
    let defaultFields =
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_shared_to_feed,is_comment_enabled,media_product_type,alt_text';

    return this.request('list media', () =>
      this.api.get(`/${userId}/media`, {
        params: {
          fields: options?.fields || defaultFields,
          limit: options?.limit || 25,
          after: options?.after,
          before: options?.before,
          access_token: this.token
        }
      })
    );
  }

  async getMedia(mediaId: string, fields?: string) {
    let defaultFields =
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,username,is_comment_enabled,media_product_type,alt_text,children{id,media_type,media_url,thumbnail_url,alt_text}';

    return this.request('get media', () =>
      this.api.get(`/${mediaId}`, {
        params: {
          fields: fields || defaultFields,
          access_token: this.token
        }
      })
    );
  }

  // Publishing

  async createMediaContainer(userId: string, params: MediaContainerParams) {
    let body: Record<string, any> = {
      access_token: this.token
    };

    if (params.caption && params.mediaType !== 'STORIES' && !params.isCarouselItem) {
      body.caption = params.caption;
    }
    if (params.locationId && params.mediaType !== 'STORIES') {
      body.location_id = params.locationId;
    }

    if (params.mediaType === 'CAROUSEL') {
      body.media_type = 'CAROUSEL';
      if (params.children) body.children = params.children.join(',');
    } else if (params.mediaType === 'STORIES') {
      body.media_type = 'STORIES';
      if (params.imageUrl) body.image_url = params.imageUrl;
      if (params.videoUrl) body.video_url = params.videoUrl;
    } else if (params.mediaType === 'REELS') {
      body.media_type = 'REELS';
      body.video_url = params.videoUrl;
      if (params.coverUrl) body.cover_url = params.coverUrl;
      if (params.shareToFeed !== undefined) body.share_to_feed = params.shareToFeed;
    } else if (params.videoUrl) {
      body.media_type =
        params.mediaType === 'VIDEO' || params.isCarouselItem ? 'VIDEO' : 'REELS';
      body.video_url = params.videoUrl;
    } else {
      body.image_url = params.imageUrl;
    }

    if (params.isCarouselItem) body.is_carousel_item = true;
    if (params.altText && !params.videoUrl && params.mediaType !== 'STORIES') {
      body.alt_text = params.altText;
    }

    if (params.userTags && params.userTags.length > 0) {
      body.user_tags = JSON.stringify(
        params.userTags.map(t => ({
          username: t.username,
          x: t.x,
          y: t.y
        }))
      );
    }

    return this.request('create media container', () =>
      this.api.post(`/${userId}/media`, null, { params: body })
    );
  }

  async getContainerStatus(containerId: string) {
    return this.request('get media container status', () =>
      this.api.get(`/${containerId}`, {
        params: {
          fields: 'status_code,status',
          access_token: this.token
        }
      })
    );
  }

  async getContentPublishingLimit(userId: string, since?: string) {
    return this.request('get content publishing limit', () =>
      this.api.get(`/${userId}/content_publishing_limit`, {
        params: {
          fields: 'config,quota_usage',
          since,
          access_token: this.token
        }
      })
    );
  }

  async publishMedia(userId: string, creationId: string) {
    return this.request('publish media', () =>
      this.api.post(`/${userId}/media_publish`, null, {
        params: {
          creation_id: creationId,
          access_token: this.token
        }
      })
    );
  }

  // Comments

  async getComments(mediaId: string, options?: { limit?: number; after?: string }) {
    return this.request('get comments', () =>
      this.api.get(`/${mediaId}/comments`, {
        params: {
          fields:
            'id,text,timestamp,from,username,hidden,like_count,replies{id,text,timestamp,from,username,hidden,like_count}',
          limit: options?.limit || 50,
          after: options?.after,
          access_token: this.token
        }
      })
    );
  }

  async getCommentReplies(commentId: string, options?: { limit?: number; after?: string }) {
    return this.request('get comment replies', () =>
      this.api.get(`/${commentId}/replies`, {
        params: {
          fields: 'id,text,timestamp,from,username,hidden,like_count',
          limit: options?.limit || 50,
          after: options?.after,
          access_token: this.token
        }
      })
    );
  }

  async createComment(mediaId: string, message: string) {
    return this.request('create comment', () =>
      this.api.post(`/${mediaId}/comments`, null, {
        params: {
          message,
          access_token: this.token
        }
      })
    );
  }

  async replyToComment(commentId: string, message: string) {
    return this.request('reply to comment', () =>
      this.api.post(`/${commentId}/replies`, null, {
        params: {
          message,
          access_token: this.token
        }
      })
    );
  }

  async deleteComment(commentId: string) {
    return this.request('delete comment', () =>
      this.api.delete(`/${commentId}`, {
        params: {
          access_token: this.token
        }
      })
    );
  }

  async hideComment(commentId: string, hide: boolean) {
    return this.request(`${hide ? 'hide' : 'unhide'} comment`, () =>
      this.api.post(`/${commentId}`, null, {
        params: {
          hide,
          access_token: this.token
        }
      })
    );
  }

  async toggleComments(mediaId: string, enabled: boolean) {
    return this.request(`${enabled ? 'enable' : 'disable'} comments`, () =>
      this.api.post(`/${mediaId}`, null, {
        params: {
          comment_enabled: enabled,
          access_token: this.token
        }
      })
    );
  }

  // Insights

  async getAccountInsights(
    userId: string,
    options: {
      metrics: string[];
      period: string;
      since?: string;
      until?: string;
      metricType?: string;
      breakdown?: string;
    }
  ) {
    return this.request('get account insights', () =>
      this.api.get(`/${userId}/insights`, {
        params: {
          metric: options.metrics.join(','),
          period: options.period,
          since: options.since,
          until: options.until,
          metric_type: options.metricType,
          breakdown: options.breakdown,
          access_token: this.token
        }
      })
    );
  }

  async getMediaInsights(mediaId: string, metrics: string[]) {
    return this.request('get media insights', () =>
      this.api.get(`/${mediaId}/insights`, {
        params: {
          metric: metrics.join(','),
          access_token: this.token
        }
      })
    );
  }

  // Hashtag Search

  async searchHashtag(userId: string, hashtag: string) {
    return this.request('search hashtag', () =>
      this.api.get('/ig_hashtag_search', {
        params: {
          q: hashtag,
          user_id: userId,
          access_token: this.token
        }
      })
    );
  }

  async getHashtagRecentMedia(hashtagId: string, userId: string, fields?: string) {
    let defaultFields =
      'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';

    return this.request('get recent hashtag media', () =>
      this.api.get(`/${hashtagId}/recent_media`, {
        params: {
          user_id: userId,
          fields: fields || defaultFields,
          access_token: this.token
        }
      })
    );
  }

  async getHashtagTopMedia(hashtagId: string, userId: string, fields?: string) {
    let defaultFields =
      'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';

    return this.request('get top hashtag media', () =>
      this.api.get(`/${hashtagId}/top_media`, {
        params: {
          user_id: userId,
          fields: fields || defaultFields,
          access_token: this.token
        }
      })
    );
  }

  // Business Discovery

  async businessDiscovery(userId: string, targetUsername: string, fields?: string) {
    let defaultFields =
      'username,name,biography,ig_id,followers_count,follows_count,media_count,profile_picture_url,website,media{id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}';

    let response = await this.request('business discovery', () =>
      this.api.get(`/${userId}`, {
        params: {
          fields: `business_discovery.username(${targetUsername}){${fields || defaultFields}}`,
          access_token: this.token
        }
      })
    );

    return response.business_discovery;
  }

  // Mentions

  async getMentionedMedia(userId: string, options?: { limit?: number; after?: string }) {
    return this.request('get tagged media', () =>
      this.api.get(`/${userId}/tags`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username',
          limit: options?.limit || 25,
          after: options?.after,
          access_token: this.token
        }
      })
    );
  }

  async getMentionedComment(userId: string, commentId: string) {
    return this.request('get mentioned comment', () =>
      this.api.get(`/${userId}/mentioned_comment`, {
        params: {
          comment_id: commentId,
          fields: 'id,text,timestamp',
          access_token: this.token
        }
      })
    );
  }

  async getMentionedMedia2(userId: string, mediaId: string) {
    return this.request('get mentioned media', () =>
      this.api.get(`/${userId}/mentioned_media`, {
        params: {
          media_id: mediaId,
          fields: 'id,caption,media_type,media_url,permalink,timestamp',
          access_token: this.token
        }
      })
    );
  }

  // Messaging

  async sendMessage(
    userId: string,
    recipientId: string,
    message: {
      text?: string;
      imageUrl?: string;
      mediaId?: string;
    }
  ) {
    let messagePayload: Record<string, any> = {};

    if (message.text) {
      messagePayload.text = message.text;
    } else if (message.imageUrl) {
      messagePayload.attachment = {
        type: 'image',
        payload: { url: message.imageUrl }
      };
    } else if (message.mediaId) {
      messagePayload.attachment = {
        type: 'MEDIA_SHARE',
        payload: { id: message.mediaId }
      };
    }

    let body: Record<string, any> = {
      recipient: { id: recipientId },
      message: messagePayload,
      access_token: this.token
    };

    return this.request('send message', () => this.api.post(`/${userId}/messages`, body));
  }

  async sendPrivateReply(userId: string, commentId: string, message: string) {
    return this.request('send private reply', () =>
      this.api.post(`/${userId}/messages`, {
        recipient: { comment_id: commentId },
        message: { text: message },
        access_token: this.token
      })
    );
  }

  // Stories

  async getStories(userId: string) {
    return this.request('get stories', () =>
      this.api.get(`/${userId}/stories`, {
        params: {
          fields: 'id,media_type,media_url,timestamp,permalink',
          access_token: this.token
        }
      })
    );
  }

  // Conversations

  async getConversations(userId: string, options?: { after?: string }) {
    return this.request('get conversations', () =>
      this.api.get(`/${userId}/conversations`, {
        params: {
          platform: 'instagram',
          fields: 'id,updated_time,participants,messages{id,message,from,to,created_time}',
          after: options?.after,
          access_token: this.token
        }
      })
    );
  }
}
