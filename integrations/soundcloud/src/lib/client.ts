import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  collection: T[];
  next_href?: string;
}

export interface SoundCloudTrack {
  id: number;
  urn: string;
  title: string;
  description: string | null;
  permalink_url: string;
  uri: string;
  duration: number;
  genre: string | null;
  tag_list: string;
  artwork_url: string | null;
  waveform_url: string | null;
  stream_url: string | null;
  playback_count: number;
  likes_count: number;
  reposts_count: number;
  comment_count: number;
  download_count: number;
  created_at: string;
  last_modified: string;
  sharing: string;
  access: 'playable' | 'preview' | 'blocked';
  state: string;
  streamable: boolean;
  downloadable: boolean;
  license: string;
  purchase_url: string | null;
  purchase_title: string | null;
  label_name: string | null;
  release_date: string | null;
  bpm: number | null;
  key_signature: string | null;
  isrc: string | null;
  user: SoundCloudUser;
  media?: {
    transcodings: SoundCloudTranscoding[];
  };
}

export interface SoundCloudTranscoding {
  url: string;
  preset: string;
  duration: number;
  snipped: boolean;
  format: {
    protocol: string;
    mime_type: string;
  };
  quality: string;
}

export interface SoundCloudUser {
  id: number;
  urn: string;
  username: string;
  full_name: string;
  permalink_url: string;
  uri: string;
  avatar_url: string;
  city: string | null;
  country_code: string | null;
  description: string | null;
  followers_count: number;
  followings_count: number;
  track_count: number;
  playlist_count: number;
  likes_count: number;
  reposts_count: number | null;
  created_at: string;
  last_modified: string;
  verified: boolean;
}

export interface SoundCloudPlaylist {
  id: number;
  urn: string;
  title: string;
  description: string | null;
  permalink_url: string;
  uri: string;
  duration: number;
  artwork_url: string | null;
  genre: string | null;
  tag_list: string;
  track_count: number;
  likes_count: number;
  reposts_count: number;
  created_at: string;
  last_modified: string;
  sharing: string;
  is_album: boolean;
  user: SoundCloudUser;
  tracks: SoundCloudTrack[];
}

export interface SoundCloudComment {
  id: number;
  urn: string;
  body: string;
  timestamp: number | null;
  created_at: string;
  user: SoundCloudUser;
  track_id: number;
}

export interface SoundCloudOEmbed {
  version: string;
  type: string;
  provider_name: string;
  provider_url: string;
  height: number;
  width: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  html: string;
  author_name: string;
  author_url: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.soundcloud.com',
      headers: {
        Authorization: `OAuth ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  // ---- Tracks ----

  async getTrack(trackId: string): Promise<SoundCloudTrack> {
    let response = await this.http.get(`/tracks/${trackId}`);
    return response.data;
  }

  async getTrackStreams(trackId: string): Promise<{
    http_mp3_128_url?: string;
    hls_mp3_128_url?: string;
    hls_aac_160_url?: string;
    [key: string]: string | undefined;
  }> {
    let response = await this.http.get(`/tracks/${trackId}/streams`);
    return response.data;
  }

  async uploadTrack(trackData: {
    title: string;
    description?: string;
    sharing?: 'public' | 'private';
    genre?: string;
    tagList?: string;
    license?: string;
    assetData: string; // base64 encoded audio data
    assetFilename: string;
    artworkData?: string; // base64 encoded image data
  }): Promise<SoundCloudTrack> {
    let formData = new FormData();
    formData.append('track[title]', trackData.title);
    if (trackData.description) formData.append('track[description]', trackData.description);
    if (trackData.sharing) formData.append('track[sharing]', trackData.sharing);
    if (trackData.genre) formData.append('track[genre]', trackData.genre);
    if (trackData.tagList) formData.append('track[tag_list]', trackData.tagList);
    if (trackData.license) formData.append('track[license]', trackData.license);

    // Convert base64 to Blob for the audio file
    let binaryStr = atob(trackData.assetData);
    let bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    let audioBlob = new Blob([bytes]);
    formData.append('track[asset_data]', audioBlob, trackData.assetFilename);

    if (trackData.artworkData) {
      let artBinaryStr = atob(trackData.artworkData);
      let artBytes = new Uint8Array(artBinaryStr.length);
      for (let i = 0; i < artBinaryStr.length; i++) {
        artBytes[i] = artBinaryStr.charCodeAt(i);
      }
      let artBlob = new Blob([artBytes]);
      formData.append('track[artwork_data]', artBlob, 'artwork.jpg');
    }

    let response = await this.http.post('/tracks', formData);
    return response.data;
  }

  async updateTrack(
    trackId: string,
    updates: {
      title?: string;
      description?: string;
      sharing?: 'public' | 'private';
      genre?: string;
      tagList?: string;
      license?: string;
      permalinkUrl?: string;
    }
  ): Promise<SoundCloudTrack> {
    let body: Record<string, any> = {};
    if (updates.title !== undefined) body['track[title]'] = updates.title;
    if (updates.description !== undefined) body['track[description]'] = updates.description;
    if (updates.sharing !== undefined) body['track[sharing]'] = updates.sharing;
    if (updates.genre !== undefined) body['track[genre]'] = updates.genre;
    if (updates.tagList !== undefined) body['track[tag_list]'] = updates.tagList;
    if (updates.license !== undefined) body['track[license]'] = updates.license;

    let response = await this.http.put(
      `/tracks/${trackId}`,
      new URLSearchParams(body).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteTrack(trackId: string): Promise<void> {
    await this.http.delete(`/tracks/${trackId}`);
  }

  // ---- Track Comments ----

  async getTrackComments(
    trackId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<PaginatedResponse<SoundCloudComment>> {
    let response = await this.http.get(`/tracks/${trackId}/comments`, {
      params: { limit: params?.limit || 50, offset: params?.offset, linked_partitioning: true }
    });
    return response.data;
  }

  async createComment(
    trackId: string,
    body: string,
    timestamp?: number
  ): Promise<SoundCloudComment> {
    let payload: Record<string, any> = { 'comment[body]': body };
    if (timestamp !== undefined) payload['comment[timestamp]'] = timestamp;

    let response = await this.http.post(
      `/tracks/${trackId}/comments`,
      new URLSearchParams(payload).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ---- Track Social ----

  async likeTrack(trackId: string): Promise<void> {
    await this.http.post(`/me/favorites/${trackId}`);
  }

  async unlikeTrack(trackId: string): Promise<void> {
    await this.http.delete(`/me/favorites/${trackId}`);
  }

  async repostTrack(trackId: string): Promise<void> {
    await this.http.post(`/me/track_reposts/${trackId}`);
  }

  async unrepostTrack(trackId: string): Promise<void> {
    await this.http.delete(`/me/track_reposts/${trackId}`);
  }

  // ---- Playlists ----

  async getPlaylist(playlistId: string): Promise<SoundCloudPlaylist> {
    let response = await this.http.get(`/playlists/${playlistId}`);
    return response.data;
  }

  async createPlaylist(data: {
    title: string;
    description?: string;
    sharing?: 'public' | 'private';
    trackIds?: string[];
    isAlbum?: boolean;
  }): Promise<SoundCloudPlaylist> {
    let body: Record<string, any> = {
      playlist: {
        title: data.title,
        sharing: data.sharing || 'public'
      }
    };
    if (data.description) body.playlist.description = data.description;
    if (data.isAlbum !== undefined) body.playlist.is_album = data.isAlbum;
    if (data.trackIds && data.trackIds.length > 0) {
      body.playlist.tracks = data.trackIds.map(id => ({ id }));
    }

    let response = await this.http.post('/playlists', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updatePlaylist(
    playlistId: string,
    updates: {
      title?: string;
      description?: string;
      sharing?: 'public' | 'private';
      trackIds?: string[];
      isAlbum?: boolean;
    }
  ): Promise<SoundCloudPlaylist> {
    let body: Record<string, any> = { playlist: {} };
    if (updates.title !== undefined) body.playlist.title = updates.title;
    if (updates.description !== undefined) body.playlist.description = updates.description;
    if (updates.sharing !== undefined) body.playlist.sharing = updates.sharing;
    if (updates.isAlbum !== undefined) body.playlist.is_album = updates.isAlbum;
    if (updates.trackIds !== undefined) {
      body.playlist.tracks = updates.trackIds.map(id => ({ id }));
    }

    let response = await this.http.put(`/playlists/${playlistId}`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.http.delete(`/playlists/${playlistId}`);
  }

  // ---- Playlist Social ----

  async likePlaylist(playlistId: string): Promise<void> {
    await this.http.post(`/me/playlist_likes/${playlistId}`);
  }

  async unlikePlaylist(playlistId: string): Promise<void> {
    await this.http.delete(`/me/playlist_likes/${playlistId}`);
  }

  async repostPlaylist(playlistId: string): Promise<void> {
    await this.http.post(`/me/playlist_reposts/${playlistId}`);
  }

  async unrepostPlaylist(playlistId: string): Promise<void> {
    await this.http.delete(`/me/playlist_reposts/${playlistId}`);
  }

  // ---- Users ----

  async getMe(): Promise<SoundCloudUser> {
    let response = await this.http.get('/me');
    return response.data;
  }

  async getUser(userId: string): Promise<SoundCloudUser> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async getUserTracks(
    userId: string,
    params?: { limit?: number; linked_partitioning?: boolean }
  ): Promise<PaginatedResponse<SoundCloudTrack>> {
    let response = await this.http.get(`/users/${userId}/tracks`, {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getUserPlaylists(
    userId: string,
    params?: { limit?: number }
  ): Promise<PaginatedResponse<SoundCloudPlaylist>> {
    let response = await this.http.get(`/users/${userId}/playlists`, {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getUserFollowers(
    userId: string,
    params?: { limit?: number }
  ): Promise<PaginatedResponse<SoundCloudUser>> {
    let response = await this.http.get(`/users/${userId}/followers`, {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getUserFollowings(
    userId: string,
    params?: { limit?: number }
  ): Promise<PaginatedResponse<SoundCloudUser>> {
    let response = await this.http.get(`/users/${userId}/followings`, {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getMyTracks(params?: { limit?: number }): Promise<PaginatedResponse<SoundCloudTrack>> {
    let response = await this.http.get('/me/tracks', {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getMyPlaylists(params?: {
    limit?: number;
  }): Promise<PaginatedResponse<SoundCloudPlaylist>> {
    let response = await this.http.get('/me/playlists', {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  async getMyLikedTracks(params?: {
    limit?: number;
  }): Promise<PaginatedResponse<SoundCloudTrack>> {
    let response = await this.http.get('/me/favorites', {
      params: { limit: params?.limit || 50, linked_partitioning: true }
    });
    return response.data;
  }

  // ---- Following ----

  async followUser(userId: string): Promise<void> {
    await this.http.post(`/me/followings/${userId}`);
  }

  async unfollowUser(userId: string): Promise<void> {
    await this.http.delete(`/me/followings/${userId}`);
  }

  // ---- Search ----

  async searchTracks(
    query: string,
    params?: {
      limit?: number;
      offset?: number;
      access?: string;
      genres?: string;
      bpmFrom?: number;
      bpmTo?: number;
      durationFrom?: number;
      durationTo?: number;
      createdAtFrom?: string;
      createdAtTo?: string;
    }
  ): Promise<PaginatedResponse<SoundCloudTrack>> {
    let queryParams: Record<string, any> = {
      q: query,
      limit: params?.limit || 50,
      linked_partitioning: true
    };
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.access) queryParams.access = params.access;
    if (params?.genres) queryParams.genres = params.genres;
    if (params?.bpmFrom) queryParams['bpm[from]'] = params.bpmFrom;
    if (params?.bpmTo) queryParams['bpm[to]'] = params.bpmTo;
    if (params?.durationFrom) queryParams['duration[from]'] = params.durationFrom;
    if (params?.durationTo) queryParams['duration[to]'] = params.durationTo;
    if (params?.createdAtFrom) queryParams['created_at[from]'] = params.createdAtFrom;
    if (params?.createdAtTo) queryParams['created_at[to]'] = params.createdAtTo;

    let response = await this.http.get('/tracks', { params: queryParams });
    return response.data;
  }

  async searchPlaylists(
    query: string,
    params?: { limit?: number; offset?: number }
  ): Promise<PaginatedResponse<SoundCloudPlaylist>> {
    let response = await this.http.get('/playlists', {
      params: {
        q: query,
        limit: params?.limit || 50,
        offset: params?.offset,
        linked_partitioning: true
      }
    });
    return response.data;
  }

  async searchUsers(
    query: string,
    params?: { limit?: number; offset?: number }
  ): Promise<PaginatedResponse<SoundCloudUser>> {
    let response = await this.http.get('/users', {
      params: {
        q: query,
        limit: params?.limit || 50,
        offset: params?.offset,
        linked_partitioning: true
      }
    });
    return response.data;
  }

  // ---- Resolve ----

  async resolve(url: string): Promise<any> {
    let response = await this.http.get('/resolve', { params: { url } });
    return response.data;
  }

  // ---- oEmbed ----

  async getOEmbed(
    url: string,
    params?: {
      maxWidth?: number;
      maxHeight?: number;
      autoPlay?: boolean;
      showComments?: boolean;
      color?: string;
    }
  ): Promise<SoundCloudOEmbed> {
    let oembedClient = createAxios({
      baseURL: 'https://soundcloud.com'
    });

    let queryParams: Record<string, any> = {
      url,
      format: 'json'
    };
    if (params?.maxWidth) queryParams.maxwidth = params.maxWidth;
    if (params?.maxHeight) queryParams.maxheight = params.maxHeight;
    if (params?.autoPlay !== undefined) queryParams.auto_play = params.autoPlay;
    if (params?.showComments !== undefined) queryParams.show_comments = params.showComments;
    if (params?.color) queryParams.color = params.color;

    let response = await oembedClient.get('/oembed', { params: queryParams });
    return response.data;
  }
}
