import { createAxios } from '@slates/provider';
import { youtubeApiError, youtubeServiceError } from './errors';
import type {
  YouTubeActivity,
  YouTubeCaption,
  YouTubeChannel,
  YouTubeComment,
  YouTubeCommentThread,
  YouTubeListResponse,
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeSearchResult,
  YouTubeSubscription,
  YouTubeVideo
} from './types';

type YouTubeAuthConfig = {
  token?: string;
  apiKey?: string;
  authType?: string;
};

type AxiosResponse<T> = {
  data: T;
};

export class Client {
  private axios;
  private apiKey?: string;

  constructor(config: YouTubeAuthConfig) {
    this.apiKey =
      config.authType === 'apiKey' || config.apiKey
        ? (config.apiKey ?? config.token)
        : undefined;
    let oauthToken = this.apiKey ? undefined : config.token;

    if (!this.apiKey && !oauthToken) {
      throw youtubeServiceError('YouTube credentials are missing');
    }

    this.axios = createAxios({
      baseURL: 'https://www.googleapis.com/youtube/v3',
      headers: oauthToken
        ? {
            Authorization: `Bearer ${oauthToken}`
          }
        : undefined
    });
  }

  static fromAuth(auth: YouTubeAuthConfig) {
    return new Client(auth);
  }

  private withAuthParams(params: Record<string, unknown>) {
    return this.apiKey
      ? {
          ...params,
          key: this.apiKey
        }
      : params;
  }

  private async request<T>(
    operation: string,
    run: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw youtubeApiError(error, operation);
    }
  }

  // --- Videos ---

  async listVideos(params: {
    part: string[];
    videoId?: string;
    chart?: string;
    myRating?: string;
    maxResults?: number;
    pageToken?: string;
    regionCode?: string;
    videoCategoryId?: string;
  }): Promise<YouTubeListResponse<YouTubeVideo>> {
    return await this.request('list videos', () =>
      this.axios.get('/videos', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.videoId,
          chart: params.chart,
          myRating: params.myRating,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          regionCode: params.regionCode,
          videoCategoryId: params.videoCategoryId
        })
      })
    );
  }

  async updateVideo(params: {
    part: string[];
    videoId: string;
    snippet?: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      defaultLanguage?: string;
    };
    status?: {
      privacyStatus?: string;
      publishAt?: string;
      license?: string;
      embeddable?: boolean;
      publicStatsViewable?: boolean;
      selfDeclaredMadeForKids?: boolean;
    };
  }): Promise<YouTubeVideo> {
    let current = await this.listVideos({
      part: ['snippet', 'status'],
      videoId: params.videoId
    });
    let currentVideo = current.items[0];
    if (!currentVideo) {
      throw youtubeServiceError(`Video ${params.videoId} was not found`);
    }

    let body: Record<string, any> = {
      id: params.videoId
    };
    if (params.snippet) {
      let currentSnippet = currentVideo.snippet;
      let title = params.snippet.title ?? currentSnippet?.title;
      let categoryId = params.snippet.categoryId ?? currentSnippet?.categoryId;

      if (!title) {
        throw youtubeServiceError('Video title is required when updating snippet metadata');
      }

      if (!categoryId) {
        throw youtubeServiceError(
          'Video categoryId is required when updating snippet metadata'
        );
      }

      body.snippet = {
        title,
        categoryId,
        description: params.snippet.description ?? currentSnippet?.description,
        tags: params.snippet.tags ?? currentSnippet?.tags,
        defaultLanguage: params.snippet.defaultLanguage ?? currentSnippet?.defaultLanguage
      };
    }
    if (params.status) {
      let currentStatus = currentVideo.status;
      body.status = {
        privacyStatus: params.status.privacyStatus ?? currentStatus?.privacyStatus,
        publishAt: params.status.publishAt ?? currentStatus?.publishAt,
        license: params.status.license ?? currentStatus?.license,
        embeddable: params.status.embeddable ?? currentStatus?.embeddable,
        publicStatsViewable:
          params.status.publicStatsViewable ?? currentStatus?.publicStatsViewable,
        selfDeclaredMadeForKids:
          params.status.selfDeclaredMadeForKids ?? currentStatus?.selfDeclaredMadeForKids
      };
    }

    return await this.request('update video', () =>
      this.axios.put('/videos', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.request('delete video', () =>
      this.axios.delete('/videos', {
        params: this.withAuthParams({ id: videoId })
      })
    );
  }

  async rateVideo(videoId: string, rating: string): Promise<void> {
    await this.request('rate video', () =>
      this.axios.post('/videos/rate', null, {
        params: this.withAuthParams({
          id: videoId,
          rating
        })
      })
    );
  }

  async getVideoRating(
    videoIds: string[]
  ): Promise<{ items: Array<{ videoId: string; rating: string }> }> {
    return await this.request('get video rating', () =>
      this.axios.get('/videos/getRating', {
        params: this.withAuthParams({
          id: videoIds.join(',')
        })
      })
    );
  }

  // --- Search ---

  async search(params: {
    query?: string;
    part?: string[];
    type?: string[];
    channelId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
    publishedAfter?: string;
    publishedBefore?: string;
    regionCode?: string;
    relevanceLanguage?: string;
    videoDuration?: string;
    videoDefinition?: string;
    videoType?: string;
    videoCaption?: string;
    topicId?: string;
    eventType?: string;
    location?: string;
    locationRadius?: string;
  }): Promise<YouTubeListResponse<YouTubeSearchResult>> {
    return await this.request('search content', () =>
      this.axios.get('/search', {
        params: this.withAuthParams({
          q: params.query,
          part: (params.part || ['snippet']).join(','),
          type: params.type?.join(','),
          channelId: params.channelId,
          maxResults: params.maxResults || 25,
          pageToken: params.pageToken,
          order: params.order,
          publishedAfter: params.publishedAfter,
          publishedBefore: params.publishedBefore,
          regionCode: params.regionCode,
          relevanceLanguage: params.relevanceLanguage,
          videoDuration: params.videoDuration,
          videoDefinition: params.videoDefinition,
          videoType: params.videoType,
          videoCaption: params.videoCaption,
          topicId: params.topicId,
          eventType: params.eventType,
          location: params.location,
          locationRadius: params.locationRadius
        })
      })
    );
  }

  // --- Channels ---

  async listChannels(params: {
    part: string[];
    channelId?: string;
    forUsername?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubeChannel>> {
    return await this.request('list channels', () =>
      this.axios.get('/channels', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.channelId,
          forUsername: params.forUsername,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async updateChannel(params: {
    part: string[];
    channelId: string;
    brandingSettings?: {
      channel?: {
        title?: string;
        description?: string;
        keywords?: string;
        unsubscribedTrailer?: string;
        country?: string;
      };
    };
  }): Promise<YouTubeChannel> {
    let current = await this.listChannels({
      part: ['brandingSettings'],
      channelId: params.channelId
    });
    let currentChannel = current.items[0];
    if (!currentChannel) {
      throw youtubeServiceError(`Channel ${params.channelId} was not found`);
    }

    let currentBrandingSettings = currentChannel.brandingSettings ?? {};
    let currentChannelSettings = currentBrandingSettings.channel ?? {};
    let body: Record<string, any> = {
      id: params.channelId
    };
    if (params.brandingSettings) {
      body.brandingSettings = {
        ...currentBrandingSettings,
        ...params.brandingSettings,
        channel: {
          ...currentChannelSettings,
          ...params.brandingSettings.channel
        }
      };
    }

    return await this.request('update channel', () =>
      this.axios.put('/channels', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  // --- Playlists ---

  async listPlaylists(params: {
    part: string[];
    playlistId?: string;
    channelId?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubePlaylist>> {
    return await this.request('list playlists', () =>
      this.axios.get('/playlists', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.playlistId,
          channelId: params.channelId,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async createPlaylist(params: {
    part: string[];
    title: string;
    description?: string;
    privacyStatus?: string;
    defaultLanguage?: string;
    tags?: string[];
  }): Promise<YouTubePlaylist> {
    let body: Record<string, any> = {
      snippet: {
        title: params.title,
        description: params.description,
        defaultLanguage: params.defaultLanguage,
        tags: params.tags
      }
    };
    if (params.privacyStatus) {
      body.status = { privacyStatus: params.privacyStatus };
    }

    return await this.request('create playlist', () =>
      this.axios.post('/playlists', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updatePlaylist(params: {
    part: string[];
    playlistId: string;
    title?: string;
    description?: string;
    privacyStatus?: string;
    defaultLanguage?: string;
  }): Promise<YouTubePlaylist> {
    let current = await this.listPlaylists({
      part: ['snippet', 'status'],
      playlistId: params.playlistId
    });
    let currentPlaylist = current.items[0];
    if (!currentPlaylist) {
      throw youtubeServiceError(`Playlist ${params.playlistId} was not found`);
    }

    let title = params.title ?? currentPlaylist.snippet?.title;
    if (!title) {
      throw youtubeServiceError('Playlist title is required when updating a playlist');
    }

    let body: Record<string, any> = {
      id: params.playlistId,
      snippet: {
        title,
        description: params.description ?? currentPlaylist.snippet?.description,
        defaultLanguage: params.defaultLanguage ?? currentPlaylist.snippet?.defaultLanguage
      }
    };
    if (params.part.includes('status')) {
      body.status = {
        privacyStatus: params.privacyStatus ?? currentPlaylist.status?.privacyStatus
      };
    }

    return await this.request('update playlist', () =>
      this.axios.put('/playlists', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.request('delete playlist', () =>
      this.axios.delete('/playlists', {
        params: this.withAuthParams({ id: playlistId })
      })
    );
  }

  // --- Playlist Items ---

  async listPlaylistItems(params: {
    part: string[];
    playlistId: string;
    maxResults?: number;
    pageToken?: string;
    videoId?: string;
  }): Promise<YouTubeListResponse<YouTubePlaylistItem>> {
    return await this.request('list playlist items', () =>
      this.axios.get('/playlistItems', {
        params: this.withAuthParams({
          part: params.part.join(','),
          playlistId: params.playlistId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          videoId: params.videoId
        })
      })
    );
  }

  async addPlaylistItem(params: {
    part: string[];
    playlistId: string;
    videoId: string;
    position?: number;
  }): Promise<YouTubePlaylistItem> {
    let body: Record<string, any> = {
      snippet: {
        playlistId: params.playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: params.videoId
        }
      }
    };
    if (params.position !== undefined) {
      body.snippet.position = params.position;
    }

    return await this.request('add playlist item', () =>
      this.axios.post('/playlistItems', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updatePlaylistItem(params: {
    part: string[];
    playlistItemId: string;
    playlistId: string;
    videoId: string;
    position?: number;
  }): Promise<YouTubePlaylistItem> {
    let body: Record<string, any> = {
      id: params.playlistItemId,
      snippet: {
        playlistId: params.playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: params.videoId
        }
      }
    };
    if (params.position !== undefined) {
      body.snippet.position = params.position;
    }

    return await this.request('update playlist item', () =>
      this.axios.put('/playlistItems', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deletePlaylistItem(playlistItemId: string): Promise<void> {
    await this.request('delete playlist item', () =>
      this.axios.delete('/playlistItems', {
        params: this.withAuthParams({ id: playlistItemId })
      })
    );
  }

  // --- Comment Threads ---

  async listCommentThreads(params: {
    part: string[];
    videoId?: string;
    channelId?: string;
    allThreadsRelatedToChannelId?: string;
    commentThreadId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
    searchTerms?: string;
    moderationStatus?: string;
  }): Promise<YouTubeListResponse<YouTubeCommentThread>> {
    return await this.request('list comment threads', () =>
      this.axios.get('/commentThreads', {
        params: this.withAuthParams({
          part: params.part.join(','),
          videoId: params.videoId,
          channelId: params.channelId,
          allThreadsRelatedToChannelId: params.allThreadsRelatedToChannelId,
          id: params.commentThreadId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          order: params.order,
          searchTerms: params.searchTerms,
          moderationStatus: params.moderationStatus
        })
      })
    );
  }

  async createCommentThread(params: {
    part: string[];
    videoId: string;
    channelId: string;
    text: string;
  }): Promise<YouTubeCommentThread> {
    let body = {
      snippet: {
        videoId: params.videoId,
        channelId: params.channelId,
        topLevelComment: {
          snippet: {
            textOriginal: params.text
          }
        }
      }
    };

    return await this.request('create comment thread', () =>
      this.axios.post('/commentThreads', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  // --- Comments ---

  async listComments(params: {
    part: string[];
    parentId: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubeComment>> {
    return await this.request('list comments', () =>
      this.axios.get('/comments', {
        params: this.withAuthParams({
          part: params.part.join(','),
          parentId: params.parentId,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async createComment(params: {
    part: string[];
    parentId: string;
    text: string;
  }): Promise<YouTubeComment> {
    let body = {
      snippet: {
        parentId: params.parentId,
        textOriginal: params.text
      }
    };

    return await this.request('create comment', () =>
      this.axios.post('/comments', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updateComment(params: {
    part: string[];
    commentId: string;
    text: string;
  }): Promise<YouTubeComment> {
    let body = {
      id: params.commentId,
      snippet: {
        textOriginal: params.text
      }
    };

    return await this.request('update comment', () =>
      this.axios.put('/comments', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.request('delete comment', () =>
      this.axios.delete('/comments', {
        params: this.withAuthParams({ id: commentId })
      })
    );
  }

  async setCommentModerationStatus(params: {
    commentIds: string[];
    moderationStatus: string;
    banAuthor?: boolean;
  }): Promise<void> {
    await this.request('set comment moderation status', () =>
      this.axios.post('/comments/setModerationStatus', null, {
        params: this.withAuthParams({
          id: params.commentIds.join(','),
          moderationStatus: params.moderationStatus,
          banAuthor: params.banAuthor
        })
      })
    );
  }

  // --- Subscriptions ---

  async listSubscriptions(params: {
    part: string[];
    mine?: boolean;
    channelId?: string;
    forChannelId?: string;
    subscriptionId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
  }): Promise<YouTubeListResponse<YouTubeSubscription>> {
    return await this.request('list subscriptions', () =>
      this.axios.get('/subscriptions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          mine: params.mine,
          channelId: params.channelId,
          forChannelId: params.forChannelId,
          id: params.subscriptionId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          order: params.order
        })
      })
    );
  }

  async createSubscription(params: {
    part: string[];
    channelId: string;
  }): Promise<YouTubeSubscription> {
    let body = {
      snippet: {
        resourceId: {
          kind: 'youtube#channel',
          channelId: params.channelId
        }
      }
    };

    return await this.request('create subscription', () =>
      this.axios.post('/subscriptions', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.request('delete subscription', () =>
      this.axios.delete('/subscriptions', {
        params: this.withAuthParams({ id: subscriptionId })
      })
    );
  }

  // --- Captions ---

  async listCaptions(params: {
    part: string[];
    videoId: string;
  }): Promise<YouTubeListResponse<YouTubeCaption>> {
    return await this.request('list captions', () =>
      this.axios.get('/captions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          videoId: params.videoId
        })
      })
    );
  }

  async deleteCaption(captionId: string): Promise<void> {
    await this.request('delete caption', () =>
      this.axios.delete('/captions', {
        params: this.withAuthParams({ id: captionId })
      })
    );
  }

  // --- Activities ---

  async listActivities(params: {
    part: string[];
    channelId?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
    publishedAfter?: string;
    publishedBefore?: string;
  }): Promise<YouTubeListResponse<YouTubeActivity>> {
    return await this.request('list activities', () =>
      this.axios.get('/activities', {
        params: this.withAuthParams({
          part: params.part.join(','),
          channelId: params.channelId,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          publishedAfter: params.publishedAfter,
          publishedBefore: params.publishedBefore
        })
      })
    );
  }

  // --- Video Categories ---

  async listVideoCategories(params: {
    part: string[];
    regionCode?: string;
    videoCategoryId?: string;
    hl?: string;
  }): Promise<
    YouTubeListResponse<{
      id: string;
      snippet: { channelId: string; title: string; assignable: boolean };
    }>
  > {
    return await this.request('list video categories', () =>
      this.axios.get('/videoCategories', {
        params: this.withAuthParams({
          part: params.part.join(','),
          regionCode: params.regionCode,
          id: params.videoCategoryId,
          hl: params.hl
        })
      })
    );
  }

  // --- i18n ---

  async listRegions(params: {
    part: string[];
    hl?: string;
  }): Promise<YouTubeListResponse<{ id: string; snippet: { gl: string; name: string } }>> {
    return await this.request('list i18n regions', () =>
      this.axios.get('/i18nRegions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          hl: params.hl
        })
      })
    );
  }

  async listLanguages(params: {
    part: string[];
    hl?: string;
  }): Promise<YouTubeListResponse<{ id: string; snippet: { hl: string; name: string } }>> {
    return await this.request('list i18n languages', () =>
      this.axios.get('/i18nLanguages', {
        params: this.withAuthParams({
          part: params.part.join(','),
          hl: params.hl
        })
      })
    );
  }
}
