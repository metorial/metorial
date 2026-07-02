import { createAxios } from 'slates';
import type {
  PlayHistoryItem,
  SimplifiedAlbum,
  SimplifiedPlaylist,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyAudioFeatures,
  SpotifyCursorPaginated,
  SpotifyDevice,
  SpotifyPaginated,
  SpotifyPlaybackState,
  SpotifyPlaylist,
  SpotifyQueue,
  SpotifySavedAlbum,
  SpotifySavedTrack,
  SpotifySearchResult,
  SpotifyTrack,
  SpotifyUser
} from './types';

export class SpotifyClient {
  private axios;

  constructor(private config: { token: string; market?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.spotify.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Search ====================

  async search(params: {
    query: string;
    types: string[];
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResult> {
    let searchParams: Record<string, string> = {
      q: params.query,
      type: params.types.join(',')
    };
    if (params.market || this.config.market) {
      searchParams.market = params.market || this.config.market!;
    }
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/search', { params: searchParams });
    return response.data as SpotifySearchResult;
  }

  // ==================== Artists ====================

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    let response = await this.axios.get(`/artists/${artistId}`);
    return response.data as SpotifyArtist;
  }

  async getArtistAlbums(
    artistId: string,
    params?: {
      includeGroups?: string;
      market?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SpotifyPaginated<SimplifiedAlbum>> {
    let searchParams: Record<string, string> = {};
    if (params?.includeGroups) searchParams.include_groups = params.includeGroups;
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get(`/artists/${artistId}/albums`, {
      params: searchParams
    });
    return response.data as SpotifyPaginated<SimplifiedAlbum>;
  }

  async getArtistTopTracks(
    artistId: string,
    market?: string
  ): Promise<{ tracks: SpotifyTrack[] }> {
    let params: Record<string, string> = {};
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get(`/artists/${artistId}/top-tracks`, { params });
    return response.data as { tracks: SpotifyTrack[] };
  }

  async getRelatedArtists(artistId: string): Promise<{ artists: SpotifyArtist[] }> {
    let response = await this.axios.get(`/artists/${artistId}/related-artists`);
    return response.data as { artists: SpotifyArtist[] };
  }

  // ==================== Albums ====================

  async getAlbum(albumId: string, market?: string): Promise<SpotifyAlbum> {
    let params: Record<string, string> = {};
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get(`/albums/${albumId}`, { params });
    return response.data as SpotifyAlbum;
  }

  async getAlbumTracks(
    albumId: string,
    params?: {
      market?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SpotifyPaginated<SpotifyTrack>> {
    let searchParams: Record<string, string> = {};
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get(`/albums/${albumId}/tracks`, { params: searchParams });
    return response.data as SpotifyPaginated<SpotifyTrack>;
  }

  async getNewReleases(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ albums: SpotifyPaginated<SimplifiedAlbum> }> {
    let searchParams: Record<string, string> = {};
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/browse/new-releases', { params: searchParams });
    return response.data as { albums: SpotifyPaginated<SimplifiedAlbum> };
  }

  // ==================== Tracks ====================

  async getTrack(trackId: string, market?: string): Promise<SpotifyTrack> {
    let params: Record<string, string> = {};
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get(`/tracks/${trackId}`, { params });
    return response.data as SpotifyTrack;
  }

  async getSeveralTracks(
    trackIds: string[],
    market?: string
  ): Promise<{ tracks: SpotifyTrack[] }> {
    let params: Record<string, string> = { ids: trackIds.join(',') };
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get('/tracks', { params });
    return response.data as { tracks: SpotifyTrack[] };
  }

  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    let response = await this.axios.get(`/audio-features/${trackId}`);
    return response.data as SpotifyAudioFeatures;
  }

  async getSeveralAudioFeatures(
    trackIds: string[]
  ): Promise<{ audio_features: SpotifyAudioFeatures[] }> {
    let response = await this.axios.get('/audio-features', {
      params: { ids: trackIds.join(',') }
    });
    return response.data as { audio_features: SpotifyAudioFeatures[] };
  }

  // ==================== Playlists ====================

  async getPlaylist(
    playlistId: string,
    params?: {
      market?: string;
      fields?: string;
    }
  ): Promise<SpotifyPlaylist> {
    let searchParams: Record<string, string> = {};
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.fields) searchParams.fields = params.fields;

    let response = await this.axios.get(`/playlists/${playlistId}`, { params: searchParams });
    return response.data as SpotifyPlaylist;
  }

  async getCurrentUserPlaylists(params?: {
    limit?: number;
    offset?: number;
  }): Promise<SpotifyPaginated<SimplifiedPlaylist>> {
    let searchParams: Record<string, string> = {};
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/me/playlists', { params: searchParams });
    return response.data as SpotifyPaginated<SimplifiedPlaylist>;
  }

  async createPlaylist(
    userId: string,
    data: {
      name: string;
      description?: string;
      public?: boolean;
      collaborative?: boolean;
    }
  ): Promise<SpotifyPlaylist> {
    let response = await this.axios.post(`/users/${userId}/playlists`, data);
    return response.data as SpotifyPlaylist;
  }

  async updatePlaylistDetails(
    playlistId: string,
    data: {
      name?: string;
      description?: string;
      public?: boolean;
      collaborative?: boolean;
    }
  ): Promise<void> {
    await this.axios.put(`/playlists/${playlistId}`, data);
  }

  async addItemsToPlaylist(
    playlistId: string,
    uris: string[],
    position?: number
  ): Promise<{ snapshot_id: string }> {
    let body: Record<string, any> = { uris };
    if (position !== undefined) body.position = position;

    let response = await this.axios.post(`/playlists/${playlistId}/tracks`, body);
    return response.data as { snapshot_id: string };
  }

  async removeItemsFromPlaylist(
    playlistId: string,
    uris: string[],
    snapshotId?: string
  ): Promise<{ snapshot_id: string }> {
    let body: Record<string, any> = {
      tracks: uris.map(uri => ({ uri }))
    };
    if (snapshotId) body.snapshot_id = snapshotId;

    let response = await this.axios.delete(`/playlists/${playlistId}/tracks`, { data: body });
    return response.data as { snapshot_id: string };
  }

  async reorderPlaylistItems(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength?: number,
    snapshotId?: string
  ): Promise<{ snapshot_id: string }> {
    let body: Record<string, any> = {
      range_start: rangeStart,
      insert_before: insertBefore
    };
    if (rangeLength !== undefined) body.range_length = rangeLength;
    if (snapshotId) body.snapshot_id = snapshotId;

    let response = await this.axios.put(`/playlists/${playlistId}/tracks`, body);
    return response.data as { snapshot_id: string };
  }

  async replacePlaylistItems(
    playlistId: string,
    uris: string[]
  ): Promise<{ snapshot_id: string }> {
    let response = await this.axios.put(`/playlists/${playlistId}/tracks`, { uris });
    return response.data as { snapshot_id: string };
  }

  async getPlaylistTracks(
    playlistId: string,
    params?: {
      market?: string;
      limit?: number;
      offset?: number;
      fields?: string;
    }
  ): Promise<SpotifyPaginated<any>> {
    let searchParams: Record<string, string> = {};
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);
    if (params?.fields) searchParams.fields = params.fields;

    let response = await this.axios.get(`/playlists/${playlistId}/tracks`, {
      params: searchParams
    });
    return response.data as SpotifyPaginated<any>;
  }

  // ==================== Player / Playback ====================

  async getPlaybackState(market?: string): Promise<SpotifyPlaybackState | null> {
    let params: Record<string, string> = {};
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get('/me/player', { params });
    if (response.status === 204) return null;
    return response.data as SpotifyPlaybackState;
  }

  async getAvailableDevices(): Promise<{ devices: SpotifyDevice[] }> {
    let response = await this.axios.get('/me/player/devices');
    return response.data as { devices: SpotifyDevice[] };
  }

  async getCurrentlyPlaying(market?: string): Promise<SpotifyPlaybackState | null> {
    let params: Record<string, string> = {};
    if (market || this.config.market) params.market = market || this.config.market!;

    let response = await this.axios.get('/me/player/currently-playing', { params });
    if (response.status === 204) return null;
    return response.data as SpotifyPlaybackState;
  }

  async startPlayback(params?: {
    deviceId?: string;
    contextUri?: string;
    uris?: string[];
    offset?: { position?: number; uri?: string };
    positionMs?: number;
  }): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (params?.deviceId) queryParams.device_id = params.deviceId;

    let body: Record<string, any> = {};
    if (params?.contextUri) body.context_uri = params.contextUri;
    if (params?.uris) body.uris = params.uris;
    if (params?.offset) body.offset = params.offset;
    if (params?.positionMs !== undefined) body.position_ms = params.positionMs;

    await this.axios.put('/me/player/play', body, { params: queryParams });
  }

  async pausePlayback(deviceId?: string): Promise<void> {
    let params: Record<string, string> = {};
    if (deviceId) params.device_id = deviceId;

    await this.axios.put('/me/player/pause', {}, { params });
  }

  async skipToNext(deviceId?: string): Promise<void> {
    let params: Record<string, string> = {};
    if (deviceId) params.device_id = deviceId;

    await this.axios.post('/me/player/next', {}, { params });
  }

  async skipToPrevious(deviceId?: string): Promise<void> {
    let params: Record<string, string> = {};
    if (deviceId) params.device_id = deviceId;

    await this.axios.post('/me/player/previous', {}, { params });
  }

  async seekToPosition(positionMs: number, deviceId?: string): Promise<void> {
    let params: Record<string, string> = { position_ms: String(positionMs) };
    if (deviceId) params.device_id = deviceId;

    await this.axios.put('/me/player/seek', {}, { params });
  }

  async setRepeatMode(state: 'track' | 'context' | 'off', deviceId?: string): Promise<void> {
    let params: Record<string, string> = { state };
    if (deviceId) params.device_id = deviceId;

    await this.axios.put('/me/player/repeat', {}, { params });
  }

  async setVolume(volumePercent: number, deviceId?: string): Promise<void> {
    let params: Record<string, string> = { volume_percent: String(volumePercent) };
    if (deviceId) params.device_id = deviceId;

    await this.axios.put('/me/player/volume', {}, { params });
  }

  async toggleShuffle(state: boolean, deviceId?: string): Promise<void> {
    let params: Record<string, string> = { state: String(state) };
    if (deviceId) params.device_id = deviceId;

    await this.axios.put('/me/player/shuffle', {}, { params });
  }

  async transferPlayback(deviceIds: string[], play?: boolean): Promise<void> {
    let body: Record<string, any> = { device_ids: deviceIds };
    if (play !== undefined) body.play = play;

    await this.axios.put('/me/player', body);
  }

  async addToQueue(uri: string, deviceId?: string): Promise<void> {
    let params: Record<string, string> = { uri };
    if (deviceId) params.device_id = deviceId;

    await this.axios.post('/me/player/queue', {}, { params });
  }

  async getQueue(): Promise<SpotifyQueue> {
    let response = await this.axios.get('/me/player/queue');
    return response.data as SpotifyQueue;
  }

  // ==================== User Library ====================

  async getSavedTracks(params?: {
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifyPaginated<SpotifySavedTrack>> {
    let searchParams: Record<string, string> = {};
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/me/tracks', { params: searchParams });
    return response.data as SpotifyPaginated<SpotifySavedTrack>;
  }

  async saveTracks(trackIds: string[]): Promise<void> {
    await this.axios.put('/me/tracks', { ids: trackIds });
  }

  async removeSavedTracks(trackIds: string[]): Promise<void> {
    await this.axios.delete('/me/tracks', { data: { ids: trackIds } });
  }

  async checkSavedTracks(trackIds: string[]): Promise<boolean[]> {
    let response = await this.axios.get('/me/tracks/contains', {
      params: { ids: trackIds.join(',') }
    });
    return response.data as boolean[];
  }

  async getSavedAlbums(params?: {
    market?: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifyPaginated<SpotifySavedAlbum>> {
    let searchParams: Record<string, string> = {};
    if (params?.market || this.config.market)
      searchParams.market = params?.market || this.config.market!;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/me/albums', { params: searchParams });
    return response.data as SpotifyPaginated<SpotifySavedAlbum>;
  }

  async saveAlbums(albumIds: string[]): Promise<void> {
    await this.axios.put('/me/albums', { ids: albumIds });
  }

  async removeSavedAlbums(albumIds: string[]): Promise<void> {
    await this.axios.delete('/me/albums', { data: { ids: albumIds } });
  }

  async checkSavedAlbums(albumIds: string[]): Promise<boolean[]> {
    let response = await this.axios.get('/me/albums/contains', {
      params: { ids: albumIds.join(',') }
    });
    return response.data as boolean[];
  }

  // ==================== User Profile ====================

  async getCurrentUser(): Promise<SpotifyUser> {
    let response = await this.axios.get('/me');
    return response.data as SpotifyUser;
  }

  async getUserProfile(userId: string): Promise<SpotifyUser> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data as SpotifyUser;
  }

  // ==================== Personalization ====================

  async getTopItems(
    type: 'artists' | 'tracks',
    params?: {
      timeRange?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SpotifyPaginated<SpotifyArtist | SpotifyTrack>> {
    let searchParams: Record<string, string> = {};
    if (params?.timeRange) searchParams.time_range = params.timeRange;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get(`/me/top/${type}`, { params: searchParams });
    return response.data as SpotifyPaginated<SpotifyArtist | SpotifyTrack>;
  }

  async getRecentlyPlayed(params?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<SpotifyCursorPaginated<PlayHistoryItem>> {
    let searchParams: Record<string, string> = {};
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.after) searchParams.after = params.after;
    if (params?.before) searchParams.before = params.before;

    let response = await this.axios.get('/me/player/recently-played', {
      params: searchParams
    });
    return response.data as SpotifyCursorPaginated<PlayHistoryItem>;
  }

  // ==================== Follow ====================

  async followArtistsOrUsers(type: 'artist' | 'user', ids: string[]): Promise<void> {
    await this.axios.put(
      '/me/following',
      { ids },
      {
        params: { type }
      }
    );
  }

  async unfollowArtistsOrUsers(type: 'artist' | 'user', ids: string[]): Promise<void> {
    await this.axios.delete('/me/following', {
      params: { type },
      data: { ids }
    });
  }

  async checkFollowing(type: 'artist' | 'user', ids: string[]): Promise<boolean[]> {
    let response = await this.axios.get('/me/following/contains', {
      params: { type, ids: ids.join(',') }
    });
    return response.data as boolean[];
  }

  async getFollowedArtists(params?: {
    limit?: number;
    after?: string;
  }): Promise<{ artists: SpotifyCursorPaginated<SpotifyArtist> }> {
    let searchParams: Record<string, string> = { type: 'artist' };
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.after) searchParams.after = params.after;

    let response = await this.axios.get('/me/following', { params: searchParams });
    return response.data as { artists: SpotifyCursorPaginated<SpotifyArtist> };
  }

  async followPlaylist(playlistId: string, isPublic?: boolean): Promise<void> {
    let body: Record<string, any> = {};
    if (isPublic !== undefined) body.public = isPublic;

    await this.axios.put(`/playlists/${playlistId}/followers`, body);
  }

  async unfollowPlaylist(playlistId: string): Promise<void> {
    await this.axios.delete(`/playlists/${playlistId}/followers`);
  }

  // ==================== Browse ====================

  async getCategories(params?: {
    locale?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ categories: SpotifyPaginated<any> }> {
    let searchParams: Record<string, string> = {};
    if (params?.locale) searchParams.locale = params.locale;
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get('/browse/categories', { params: searchParams });
    return response.data as { categories: SpotifyPaginated<any> };
  }

  async getCategoryPlaylists(
    categoryId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ playlists: SpotifyPaginated<SimplifiedPlaylist> }> {
    let searchParams: Record<string, string> = {};
    if (params?.limit) searchParams.limit = String(params.limit);
    if (params?.offset) searchParams.offset = String(params.offset);

    let response = await this.axios.get(`/browse/categories/${categoryId}/playlists`, {
      params: searchParams
    });
    return response.data as { playlists: SpotifyPaginated<SimplifiedPlaylist> };
  }
}
