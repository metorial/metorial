import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.vimeo.com'
});

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  perPage: number;
  paging: {
    next: string | null;
    previous: string | null;
    first: string;
    last: string;
  };
  data: T[];
}

export class VimeoClient {
  private headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.vimeo.*+json;version=3.4'
    };
  }

  // ─── Videos ──────────────────────────────────────────────

  async getVideo(videoId: string): Promise<any> {
    let response = await api.get(`/videos/${videoId}`, { headers: this.headers });
    return response.data;
  }

  async listMyVideos(
    params?: PaginationParams & {
      query?: string;
      sort?: string;
      direction?: string;
      filter?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/videos', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        query: params?.query,
        sort: params?.sort,
        direction: params?.direction,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async searchVideos(
    query: string,
    params?: PaginationParams & {
      sort?: string;
      direction?: string;
      filter?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get('/videos', {
      headers: this.headers,
      params: {
        query,
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort,
        direction: params?.direction,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async editVideo(
    videoId: string,
    data: {
      name?: string;
      description?: string;
      privacy?: {
        view?: string;
        embed?: string;
        download?: boolean;
        add?: boolean;
        comments?: string;
      };
      password?: string;
      tags?: string[];
      embedDomains?: string[];
      license?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.privacy) body.privacy = data.privacy;
    if (data.password !== undefined) body.password = data.password;
    if (data.license !== undefined) body.license = data.license;
    if (data.embedDomains !== undefined) body.embed_domains = data.embedDomains;
    if (data.tags) body.tags = data.tags.map(t => ({ tag: t }));

    let response = await api.patch(`/videos/${videoId}`, body, { headers: this.headers });
    return response.data;
  }

  async deleteVideo(videoId: string): Promise<void> {
    await api.delete(`/videos/${videoId}`, { headers: this.headers });
  }

  async getVideoTextTracks(videoId: string): Promise<any> {
    let response = await api.get(`/videos/${videoId}/texttracks`, { headers: this.headers });
    return response.data;
  }

  async addVideoTextTrack(
    videoId: string,
    data: {
      language: string;
      name: string;
      type: string;
      active?: boolean;
    }
  ): Promise<any> {
    let response = await api.post(`/videos/${videoId}/texttracks`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async getVideoComments(
    videoId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(`/videos/${videoId}/comments`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async addVideoComment(videoId: string, text: string): Promise<any> {
    let response = await api.post(
      `/videos/${videoId}/comments`,
      { text },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── User ────────────────────────────────────────────────

  async getMe(): Promise<any> {
    let response = await api.get('/me', { headers: this.headers });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await api.get(`/users/${userId}`, { headers: this.headers });
    return response.data;
  }

  async editMe(data: {
    name?: string;
    bio?: string;
    location?: string;
    link?: string;
  }): Promise<any> {
    let response = await api.patch('/me', data, { headers: this.headers });
    return response.data;
  }

  async getLikedVideos(
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/likes', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async likeVideo(videoId: string): Promise<void> {
    await api.put(`/me/likes/${videoId}`, {}, { headers: this.headers });
  }

  async unlikeVideo(videoId: string): Promise<void> {
    await api.delete(`/me/likes/${videoId}`, { headers: this.headers });
  }

  async getFollowing(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/following', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async followUser(userId: string): Promise<void> {
    await api.put(`/me/following/${userId}`, {}, { headers: this.headers });
  }

  async unfollowUser(userId: string): Promise<void> {
    await api.delete(`/me/following/${userId}`, { headers: this.headers });
  }

  async getFollowers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/followers', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Showcases (Albums) ──────────────────────────────────

  async listShowcases(
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/albums', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async getShowcase(showcaseId: string): Promise<any> {
    let response = await api.get(`/me/albums/${showcaseId}`, { headers: this.headers });
    return response.data;
  }

  async createShowcase(data: {
    name: string;
    description?: string;
    privacy?: string;
    password?: string;
    sort?: string;
    brandColor?: string;
  }): Promise<any> {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.privacy) body.privacy = data.privacy;
    if (data.password) body.password = data.password;
    if (data.sort) body.sort = data.sort;
    if (data.brandColor) body.brand_color = data.brandColor;

    let response = await api.post('/me/albums', body, { headers: this.headers });
    return response.data;
  }

  async editShowcase(
    showcaseId: string,
    data: {
      name?: string;
      description?: string;
      privacy?: string;
      password?: string;
      sort?: string;
      brandColor?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.privacy) body.privacy = data.privacy;
    if (data.password) body.password = data.password;
    if (data.sort) body.sort = data.sort;
    if (data.brandColor) body.brand_color = data.brandColor;

    let response = await api.patch(`/me/albums/${showcaseId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteShowcase(showcaseId: string): Promise<void> {
    await api.delete(`/me/albums/${showcaseId}`, { headers: this.headers });
  }

  async getShowcaseVideos(
    showcaseId: string,
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(`/me/albums/${showcaseId}/videos`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async addVideoToShowcase(showcaseId: string, videoId: string): Promise<void> {
    await api.put(`/me/albums/${showcaseId}/videos/${videoId}`, {}, { headers: this.headers });
  }

  async removeVideoFromShowcase(showcaseId: string, videoId: string): Promise<void> {
    await api.delete(`/me/albums/${showcaseId}/videos/${videoId}`, { headers: this.headers });
  }

  // ─── Folders ─────────────────────────────────────────────

  async listFolders(
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/folders', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async getFolder(folderId: string): Promise<any> {
    let response = await api.get(`/me/folders/${folderId}`, { headers: this.headers });
    return response.data;
  }

  async createFolder(name: string, parentFolderUri?: string): Promise<any> {
    let body: Record<string, any> = { name };
    if (parentFolderUri) body.parent_folder_uri = parentFolderUri;

    let response = await api.post('/me/folders', body, { headers: this.headers });
    return response.data;
  }

  async editFolder(folderId: string, name: string): Promise<any> {
    let response = await api.patch(
      `/me/folders/${folderId}`,
      { name },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/me/folders/${folderId}`, { headers: this.headers });
  }

  async getFolderVideos(
    folderId: string,
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(`/me/folders/${folderId}/videos`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async addVideoToFolder(folderId: string, videoUri: string): Promise<void> {
    await api.put(
      `/me/folders/${folderId}/videos`,
      { uris: [videoUri] },
      { headers: this.headers }
    );
  }

  async removeVideoFromFolder(folderId: string, videoUri: string): Promise<void> {
    await api.delete(`/me/folders/${folderId}/videos`, {
      headers: this.headers,
      data: { uris: [videoUri] }
    });
  }

  // ─── Channels ────────────────────────────────────────────

  async listMyChannels(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/channels', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getChannel(channelId: string): Promise<any> {
    let response = await api.get(`/channels/${channelId}`, { headers: this.headers });
    return response.data;
  }

  async createChannel(data: {
    name: string;
    description?: string;
    privacy?: string;
    link?: string;
  }): Promise<any> {
    let response = await api.post('/channels', data, { headers: this.headers });
    return response.data;
  }

  async editChannel(
    channelId: string,
    data: {
      name?: string;
      description?: string;
      privacy?: string;
      link?: string;
    }
  ): Promise<any> {
    let response = await api.patch(`/channels/${channelId}`, data, { headers: this.headers });
    return response.data;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await api.delete(`/channels/${channelId}`, { headers: this.headers });
  }

  async getChannelVideos(
    channelId: string,
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(`/channels/${channelId}/videos`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async addVideoToChannel(channelId: string, videoId: string): Promise<void> {
    await api.put(`/channels/${channelId}/videos/${videoId}`, {}, { headers: this.headers });
  }

  async removeVideoFromChannel(channelId: string, videoId: string): Promise<void> {
    await api.delete(`/channels/${channelId}/videos/${videoId}`, { headers: this.headers });
  }

  // ─── Categories ──────────────────────────────────────────

  async listCategories(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/categories', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getCategory(categoryName: string): Promise<any> {
    let response = await api.get(`/categories/${categoryName}`, { headers: this.headers });
    return response.data;
  }

  async getCategoryVideos(
    categoryName: string,
    params?: PaginationParams & { sort?: string }
  ): Promise<PaginatedResponse<any>> {
    let response = await api.get(`/categories/${categoryName}/videos`, {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage,
        sort: params?.sort
      }
    });
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────────

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/webhooks', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async createWebhook(callbackUrl: string, events: string[], secret?: string): Promise<any> {
    let body: Record<string, any> = {
      url: callbackUrl,
      events
    };
    if (secret) body.secret = secret;

    let response = await api.post('/me/webhooks', body, { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await api.delete(`/me/webhooks/${webhookId}`, { headers: this.headers });
  }

  // ─── Embed ───────────────────────────────────────────────

  async getVideoEmbedPresets(videoId: string): Promise<any> {
    let response = await api.get(`/videos/${videoId}`, {
      headers: this.headers,
      params: { fields: 'uri,name,embed' }
    });
    return response.data;
  }

  async listEmbedPresets(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/presets', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Live Events ─────────────────────────────────────────

  async listLiveEvents(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await api.get('/me/live_events', {
      headers: this.headers,
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getLiveEvent(liveEventId: string): Promise<any> {
    let response = await api.get(`/me/live_events/${liveEventId}`, { headers: this.headers });
    return response.data;
  }

  async createLiveEvent(data: {
    title: string;
    description?: string;
    privacy?: { view?: string };
    autoPlay?: boolean;
    autoRecord?: boolean;
    scheduledStartTime?: string;
    streamTitle?: string;
    playlistSort?: string;
  }): Promise<any> {
    let body: Record<string, any> = { title: data.title };
    if (data.description !== undefined) body.description = data.description;
    if (data.privacy) body.privacy = data.privacy;
    if (data.autoPlay !== undefined) body.auto_play = data.autoPlay;
    if (data.autoRecord !== undefined) body.auto_record = data.autoRecord;
    if (data.scheduledStartTime) body.scheduled_start_time = data.scheduledStartTime;
    if (data.streamTitle) body.stream_title = data.streamTitle;
    if (data.playlistSort) body.playlist_sort = data.playlistSort;

    let response = await api.post('/me/live_events', body, { headers: this.headers });
    return response.data;
  }

  async editLiveEvent(
    liveEventId: string,
    data: {
      title?: string;
      description?: string;
      privacy?: { view?: string };
      autoPlay?: boolean;
      autoRecord?: boolean;
      scheduledStartTime?: string;
      streamTitle?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.privacy) body.privacy = data.privacy;
    if (data.autoPlay !== undefined) body.auto_play = data.autoPlay;
    if (data.autoRecord !== undefined) body.auto_record = data.autoRecord;
    if (data.scheduledStartTime) body.scheduled_start_time = data.scheduledStartTime;
    if (data.streamTitle) body.stream_title = data.streamTitle;

    let response = await api.patch(`/me/live_events/${liveEventId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteLiveEvent(liveEventId: string): Promise<void> {
    await api.delete(`/me/live_events/${liveEventId}`, { headers: this.headers });
  }
}
