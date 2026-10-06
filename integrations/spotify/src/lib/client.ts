import {
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  albumSchema,
  artistSchema,
  audioSchema,
  cursorSchema,
  deviceSchema,
  fullAlbumSchema,
  fullTrackSchema,
  historySchema,
  pageSchema,
  parse,
  playbackSchema,
  playlistEntrySchema,
  playlistSchema,
  queueSchema,
  savedAlbumSchema,
  savedTrackSchema,
  simplifiedPlaylistSchema,
  trackSchema,
  userSchema,
  validatePageLinks
} from './types';
import {
  API_ROOT,
  identifier,
  ids,
  market,
  protect,
  requireLegacy,
  spotifyError,
  uri,
  whole
} from './validation';

type PageInput = { limit?: number; offset?: number; market?: string };
export class SpotifyClient {
  private axios;
  constructor(
    private config: {
      token: string;
      refreshToken?: string;
      market?: string;
      endpointCompatibility?: 'current' | 'legacy';
      input?: unknown;
    }
  ) {
    if (!config.token)
      throw createApiServiceError('Reconnect Spotify before making a request.');
    market(config.market);
    protect(
      config.input,
      [config.token, config.refreshToken].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
    );
    this.axios = createAuthenticatedAxios({
      baseURL: API_ROOT,
      authHeader: { value: `Bearer ${config.token}` },
      maxRedirects: 0,
      timeout: 30000,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      errorMapping: {
        extractResponseData: response => {
          const data: unknown = response.data;
          const nativeError =
            data && typeof data === 'object' && 'error' in data ? data.error : undefined;
          const quota =
            nativeError &&
            typeof nativeError === 'object' &&
            'reason' in nativeError &&
            nativeError.reason === 'QUOTA_EXCEEDED';
          const header = getResponseHeaderValue(response.headers, 'retry-after');
          return {
            error: {
              status: response.status,
              message: 'Spotify request was rejected.',
              ...(quota ? { code: 'QUOTA_EXCEEDED' } : {})
            },
            ...(header && /^\d{1,7}$/.test(header)
              ? { retryAfterSeconds: Number(header) }
              : {})
          };
        }
      }
    });
    this.axios.interceptors.request.use(request => {
      protect(
        { path: request.url, params: request.params, data: request.data },
        [config.token, config.refreshToken].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      );
      return request;
    });
  }
  get legacy() {
    return this.config.endpointCompatibility === 'legacy';
  }
  requireLegacy(operation: string) {
    requireLegacy(this.legacy, operation);
  }
  private query(params: PageInput = {}) {
    whole(params.limit, 'limit', 1, 50);
    whole(params.offset, 'offset');
    return pickDefined({
      limit: params.limit,
      offset: params.offset,
      market: market(params.market ?? this.config.market)
    });
  }
  private async request<T extends z.ZodType>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    schema: T,
    params?: object,
    data?: object,
    status = 200
  ): Promise<z.output<T>> {
    let dispatched = false;
    try {
      protect(
        { path, params, data },
        [this.config.token, this.config.refreshToken].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      );
      dispatched = method !== 'get';
      const response = await this.axios.request<unknown>({ method, url: path, params, data });
      protect(
        { data: response.data, headers: response.headers },
        [this.config.token, this.config.refreshToken].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      );
      if (response.status !== status)
        throw createApiServiceError(
          'Spotify returned an unexpected response status. Inspect changed state before retrying.'
        );
      return parse(schema, response.data);
    } catch (error) {
      const safe = spotifyError(error, dispatched);
      if (dispatched) safe.data.outcomeUncertain = true;
      throw safe;
    }
  }
  private async empty(
    method: 'post' | 'put' | 'delete',
    path: string,
    params?: object,
    data?: object,
    status = 204
  ) {
    await this.request(
      method,
      path,
      z.union([z.literal(''), z.undefined(), z.null()]),
      params,
      data,
      status
    );
  }
  private async page<T extends z.ZodType>(
    path: string,
    schema: T,
    params: PageInput = {},
    extra?: object
  ) {
    const result = await this.request('get', path, pageSchema(schema), {
      ...this.query(params),
      ...extra
    });
    validatePageLinks(result, path);
    if (
      (params.offset !== undefined && result.offset !== params.offset) ||
      (params.limit !== undefined && result.limit !== params.limit) ||
      result.items.length > result.limit
    )
      throw createApiServiceError(
        'Spotify returned a page inconsistent with the requested offset or limit.'
      );
    return result;
  }
  private async exact<T extends z.ZodType>(
    path: string,
    schema: T,
    id: string,
    params?: object
  ) {
    const result = await this.request('get', path, schema, params);
    const row = result as { id?: string; linked_from?: { id?: string } };
    if (row.id !== id && row.linked_from?.id !== id)
      throw createApiServiceError(
        'Spotify returned a different resource identity. No alternative resource was silently selected.'
      );
    return result;
  }
  async search(params: {
    query: string;
    types: string[];
    market?: string;
    limit?: number;
    offset?: number;
  }) {
    if (!params.query.trim() || !params.types.length)
      throw createApiServiceError(
        'Supply a nonempty search query and at least one content type.'
      );
    whole(params.limit, 'limit', 1, this.legacy ? 50 : 10);
    whole(params.offset, 'offset', 0, 1000);
    const schema = z.object({
      tracks: pageSchema(fullTrackSchema.nullable()).optional(),
      artists: pageSchema(artistSchema.nullable()).optional(),
      albums: pageSchema(albumSchema.nullable()).optional(),
      playlists: pageSchema(simplifiedPlaylistSchema.nullable()).optional()
    });
    const result = await this.request('get', '/search', schema, {
      q: params.query,
      type: [...new Set(params.types)].join(','),
      ...this.query({ ...params, limit: params.limit ?? (this.legacy ? 20 : 5) })
    });
    for (const type of params.types) {
      const key = `${type}s` as keyof typeof result;
      const page = result[key];
      if (!page)
        throw createApiServiceError('Spotify omitted a requested search result collection.');
      validatePageLinks(page, '/search');
      if (
        page.limit !== (params.limit ?? (this.legacy ? 20 : 5)) ||
        page.offset !== (params.offset ?? 0) ||
        page.items.length > page.limit
      )
        throw createApiServiceError('Spotify returned inconsistent search paging metadata.');
    }
    return result;
  }
  getArtist(id: string) {
    return this.exact(`/artists/${identifier(id)}`, artistSchema, id);
  }
  getArtistAlbums(id: string, params: PageInput & { includeGroups?: string } = {}) {
    if (
      params.includeGroups
        ?.split(',')
        .some(v => !['album', 'single', 'appears_on', 'compilation'].includes(v))
    )
      throw createApiServiceError(
        'albumTypes must use documented comma-separated album, single, appears_on or compilation values.'
      );
    return this.page(
      `/artists/${identifier(id)}/albums`,
      albumSchema,
      params,
      pickDefined({ include_groups: params.includeGroups })
    );
  }
  getArtistTopTracks(id: string, country?: string) {
    this.requireLegacy('Artist top tracks');
    return this.request(
      'get',
      `/artists/${identifier(id)}/top-tracks`,
      z.object({ tracks: z.array(fullTrackSchema) }),
      pickDefined({ market: market(country ?? this.config.market) })
    );
  }
  getRelatedArtists(id: string) {
    this.requireLegacy('Related artists');
    return this.request(
      'get',
      `/artists/${identifier(id)}/related-artists`,
      z.object({ artists: z.array(artistSchema) })
    );
  }
  async getAlbum(id: string, country?: string) {
    const result = await this.exact(
      `/albums/${identifier(id)}`,
      fullAlbumSchema,
      id,
      pickDefined({ market: market(country ?? this.config.market) })
    );
    validatePageLinks(result.tracks, `/albums/${identifier(id)}/tracks`);
    return result;
  }
  getAlbumTracks(id: string, params?: PageInput) {
    return this.page(`/albums/${identifier(id)}/tracks`, trackSchema, params);
  }
  async getNewReleases(params?: PageInput) {
    this.requireLegacy('New releases');
    const result = await this.request(
      'get',
      '/browse/new-releases',
      z.object({ albums: pageSchema(albumSchema) }),
      this.query(params)
    );
    validatePageLinks(result.albums, '/browse/new-releases');
    if (
      (params?.limit !== undefined && result.albums.limit !== params.limit) ||
      (params?.offset !== undefined && result.albums.offset !== params.offset) ||
      result.albums.items.length > result.albums.limit
    )
      throw createApiServiceError(
        'Spotify returned inconsistent new-release paging metadata.'
      );
    return result.albums;
  }
  getTrack(id: string, country?: string) {
    return this.exact(
      `/tracks/${identifier(id)}`,
      fullTrackSchema,
      id,
      pickDefined({ market: market(country ?? this.config.market) })
    );
  }
  async getSeveralTracks(values: string[], country?: string) {
    ids(values, 50);
    if (this.legacy) {
      const result = await this.request(
        'get',
        '/tracks',
        z.object({ tracks: z.array(fullTrackSchema.nullable()) }),
        {
          ids: values.join(','),
          ...pickDefined({ market: market(country ?? this.config.market) })
        }
      );
      if (
        result.tracks.length !== values.length ||
        result.tracks.some(
          (v, i) => v && v.id !== values[i] && v.linked_from?.id !== values[i]
        )
      )
        throw createApiServiceError('Spotify returned an inconsistent multi-track receipt.');
      return result;
    }
    const tracks: z.infer<typeof fullTrackSchema>[] = [];
    for (const id of values)
      try {
        tracks.push(await this.getTrack(id, country));
      } catch (error) {
        const safe = spotifyError(error);
        safe.data.completedReadCount = tracks.length;
        safe.data.requestedReadCount = values.length;
        safe.data.noWrites = true;
        throw safe;
      }
    return { tracks };
  }
  getAudioFeatures(id: string) {
    this.requireLegacy('Audio features');
    return this.exact(`/audio-features/${identifier(id)}`, audioSchema, id);
  }
  async getSeveralAudioFeatures(values: string[]) {
    this.requireLegacy('Audio features');
    ids(values, 50);
    const result = await this.request(
      'get',
      '/audio-features',
      z.object({ audio_features: z.array(audioSchema.nullable()) }),
      { ids: values.join(',') }
    );
    if (
      result.audio_features.length !== values.length ||
      result.audio_features.some((v, i) => v && v.id !== values[i])
    )
      throw createApiServiceError('Spotify returned an inconsistent audio-feature receipt.');
    return result;
  }
  async getPlaylist(id: string, params: { market?: string } = {}) {
    const result = await this.exact(
      `/playlists/${identifier(id)}`,
      playlistSchema,
      id,
      pickDefined({ market: market(params.market ?? this.config.market) })
    );
    if (result.items) validatePageLinks(result.items, `/playlists/${identifier(id)}/items`);
    if (result.tracks) validatePageLinks(result.tracks, `/playlists/${identifier(id)}/tracks`);
    return result;
  }
  getCurrentUserPlaylists(params?: PageInput) {
    return this.page('/me/playlists', simplifiedPlaylistSchema, params);
  }
  async createPlaylist(
    userId: string,
    data: { name: string; description?: string; public?: boolean; collaborative?: boolean }
  ) {
    identifier(userId, true);
    if (!data.name.trim()) throw createApiServiceError('Supply a nonempty playlist name.');
    if (data.collaborative && data.public !== false)
      throw createApiServiceError('A collaborative playlist must explicitly be private.');
    const result = await this.request(
      'post',
      this.legacy ? `/users/${identifier(userId, true)}/playlists` : '/me/playlists',
      playlistSchema,
      undefined,
      pickDefined(data),
      201
    );
    const recoverableId = /^[A-Za-z0-9]{1,256}$/.test(result.id);
    if (
      !recoverableId ||
      !result.snapshot_id.trim() ||
      result.owner.id !== userId ||
      result.name !== data.name ||
      (data.public !== undefined && result.public !== data.public) ||
      (data.collaborative !== undefined && result.collaborative !== data.collaborative) ||
      (data.description !== undefined && result.description !== data.description)
    ) {
      const error = createApiServiceError(
        'Spotify returned an incomplete or inconsistent playlist creation receipt. Creation may have succeeded. Retain any reported resource and manually reconcile the intended account before retrying; no automatic retry was performed.'
      );
      error.data.outcomeUncertain = true;
      if (recoverableId) error.data.reportedPlaylistId = result.id;
      throw error;
    }
    return result;
  }
  updatePlaylistDetails(
    id: string,
    data: { name?: string; description?: string; public?: boolean; collaborative?: boolean }
  ) {
    if (!Object.values(data).some(v => v !== undefined))
      throw createApiServiceError('Supply at least one playlist detail to update.');
    if (data.name !== undefined && !data.name.trim())
      throw createApiServiceError('Playlist name must not be empty.');
    if (data.collaborative && data.public !== false)
      throw createApiServiceError(
        'A collaborative playlist update must explicitly set isPublic to false.'
      );
    return this.empty(
      'put',
      `/playlists/${identifier(id)}`,
      undefined,
      pickDefined(data),
      200
    );
  }
  private itemPath(id: string) {
    return `/playlists/${identifier(id)}/${this.legacy ? 'tracks' : 'items'}`;
  }
  private playlistUris(values: string[]) {
    if (!values.length || values.length > 100)
      throw createApiServiceError('Supply from 1 through 100 playlist item URIs.');
    return values.map(v => uri(v, ['track', 'episode']));
  }
  addItemsToPlaylist(id: string, values: string[], position?: number) {
    whole(position, 'position');
    return this.request(
      'post',
      this.itemPath(id),
      z.object({ snapshot_id: z.string().min(1) }),
      undefined,
      pickDefined({ uris: this.playlistUris(values), position }),
      201
    );
  }
  removeItemsFromPlaylist(id: string, values: string[], snapshot?: string) {
    return this.request(
      'delete',
      this.itemPath(id),
      z.object({ snapshot_id: z.string().min(1) }),
      undefined,
      pickDefined({
        [this.legacy ? 'tracks' : 'items']: this.playlistUris(values).map(v => ({ uri: v })),
        snapshot_id: snapshot
      })
    );
  }
  reorderPlaylistItems(
    id: string,
    start: number,
    before: number,
    length?: number,
    snapshot?: string
  ) {
    whole(start, 'rangeStart');
    whole(before, 'insertBefore');
    whole(length, 'rangeLength', 1);
    return this.request(
      'put',
      this.itemPath(id),
      z.object({ snapshot_id: z.string().min(1) }),
      undefined,
      pickDefined({
        range_start: start,
        insert_before: before,
        range_length: length,
        snapshot_id: snapshot
      })
    );
  }
  getPlaylistTracks(id: string, params?: PageInput) {
    return this.page(this.itemPath(id), playlistEntrySchema, params, {
      additional_types: 'track,episode'
    });
  }
  async getPlaybackState(country?: string, current = false) {
    const path = current ? '/me/player/currently-playing' : '/me/player';
    try {
      const response = await this.axios.get<unknown>(path, {
        params: pickDefined({
          market: market(country ?? this.config.market),
          additional_types: 'track,episode'
        })
      });
      protect(
        { data: response.data, headers: response.headers },
        [this.config.token, this.config.refreshToken].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      );
      if (response.status === 204) {
        if (response.data !== '' && response.data !== undefined && response.data !== null)
          throw createApiServiceError(
            'Spotify returned content for an empty playback response.'
          );
        return null;
      }
      if (response.status !== 200)
        throw createApiServiceError('Spotify returned an unexpected playback status.');
      return parse(playbackSchema, response.data);
    } catch (error) {
      throw spotifyError(error);
    }
  }
  getCurrentlyPlaying(country?: string) {
    return this.getPlaybackState(country, true);
  }
  getAvailableDevices() {
    return this.request(
      'get',
      '/me/player/devices',
      z.object({ devices: z.array(deviceSchema) })
    );
  }
  getQueue() {
    return this.request('get', '/me/player/queue', queueSchema);
  }
  startPlayback(
    params: {
      deviceId?: string;
      contextUri?: string;
      uris?: string[];
      offset?: { position?: number; uri?: string };
      positionMs?: number;
    } = {}
  ) {
    if (params.contextUri !== undefined && params.uris !== undefined)
      throw createApiServiceError('Use contextUri or uris, not both.');
    if (params.contextUri !== undefined)
      uri(params.contextUri, ['album', 'artist', 'playlist']);
    if (params.uris !== undefined) {
      if (!params.uris.length || params.uris.length > 100)
        throw createApiServiceError('Supply from 1 through 100 playback track URIs.');
      params.uris.forEach(v => uri(v, ['track']));
    }
    if (params.offset) {
      if (!params.contextUri || !/^spotify:(album|playlist):/.test(params.contextUri))
        throw createApiServiceError(
          'Playback offset requires an album or playlist contextUri.'
        );
      if (params.offset.position !== undefined && params.offset.uri !== undefined)
        throw createApiServiceError('Use one playback offset selector.');
      whole(params.offset.position, 'offsetPosition');
      if (params.offset.uri) uri(params.offset.uri, ['track']);
    }
    whole(params.positionMs, 'positionMs');
    return this.empty(
      'put',
      '/me/player/play',
      pickDefined({ device_id: params.deviceId }),
      pickDefined({
        context_uri: params.contextUri,
        uris: params.uris,
        offset: params.offset,
        position_ms: params.positionMs
      })
    );
  }
  pausePlayback(deviceId?: string) {
    return this.empty('put', '/me/player/pause', pickDefined({ device_id: deviceId }));
  }
  skipToNext(deviceId?: string) {
    return this.empty('post', '/me/player/next', pickDefined({ device_id: deviceId }));
  }
  skipToPrevious(deviceId?: string) {
    return this.empty('post', '/me/player/previous', pickDefined({ device_id: deviceId }));
  }
  seekToPosition(position: number, deviceId?: string) {
    whole(position, 'positionMs');
    return this.empty(
      'put',
      '/me/player/seek',
      pickDefined({ position_ms: position, device_id: deviceId })
    );
  }
  setRepeatMode(state: 'track' | 'context' | 'off', deviceId?: string) {
    return this.empty('put', '/me/player/repeat', pickDefined({ state, device_id: deviceId }));
  }
  setVolume(volume: number, deviceId?: string) {
    whole(volume, 'volumePercent', 0, 100);
    return this.empty(
      'put',
      '/me/player/volume',
      pickDefined({ volume_percent: volume, device_id: deviceId })
    );
  }
  toggleShuffle(state: boolean, deviceId?: string) {
    return this.empty(
      'put',
      '/me/player/shuffle',
      pickDefined({ state, device_id: deviceId })
    );
  }
  transferPlayback(deviceIds: string[], play?: boolean) {
    if (deviceIds.length !== 1 || !deviceIds[0])
      throw createApiServiceError('Transfer playback to exactly one current device ID.');
    return this.empty(
      'put',
      '/me/player',
      undefined,
      pickDefined({ device_ids: deviceIds, play })
    );
  }
  addToQueue(value: string, deviceId?: string) {
    return this.empty(
      'post',
      '/me/player/queue',
      pickDefined({ uri: uri(value, ['track', 'episode']), device_id: deviceId })
    );
  }
  getSavedTracks(params?: PageInput) {
    return this.page('/me/tracks', savedTrackSchema, params);
  }
  getSavedAlbums(params?: PageInput) {
    return this.page('/me/albums', savedAlbumSchema, params);
  }
  private library(method: 'put' | 'delete', type: string, values: string[]) {
    ids(values, this.legacy ? 50 : 40, type === 'user');
    if (!this.legacy)
      return this.empty(
        method,
        '/me/library',
        { uris: values.map(v => `spotify:${type}:${v}`).join(',') },
        undefined,
        200
      );
    if (type === 'artist' || type === 'user')
      return this.empty(method, '/me/following', { type }, { ids: values });
    if (type === 'playlist')
      return this.empty(
        method,
        `/playlists/${identifier(values[0]!)}/followers`,
        undefined,
        method === 'put' ? {} : undefined,
        200
      );
    return this.empty(method, `/me/${type}s`, undefined, { ids: values }, 200);
  }
  private async contains(type: string, values: string[]) {
    ids(values, this.legacy ? 50 : 40, type === 'user');
    const path = !this.legacy
      ? '/me/library/contains'
      : type === 'artist' || type === 'user'
        ? '/me/following/contains'
        : `/me/${type}s/contains`;
    const params = this.legacy
      ? { ids: values.join(','), ...(['artist', 'user'].includes(type) ? { type } : {}) }
      : { uris: values.map(v => `spotify:${type}:${v}`).join(',') };
    const result = await this.request('get', path, z.array(z.boolean()), params);
    if (result.length !== values.length)
      throw createApiServiceError(
        'Spotify returned an incomplete membership receipt; missing entries were not treated as false.'
      );
    return result;
  }
  saveTracks(values: string[]) {
    return this.library('put', 'track', values);
  }
  removeSavedTracks(values: string[]) {
    return this.library('delete', 'track', values);
  }
  checkSavedTracks(values: string[]) {
    return this.contains('track', values);
  }
  saveAlbums(values: string[]) {
    return this.library('put', 'album', values);
  }
  removeSavedAlbums(values: string[]) {
    return this.library('delete', 'album', values);
  }
  checkSavedAlbums(values: string[]) {
    return this.contains('album', values);
  }
  getCurrentUser() {
    return this.request('get', '/me', userSchema);
  }
  getUserProfile(id: string) {
    this.requireLegacy('Other user profiles');
    return this.exact(`/users/${identifier(id, true)}`, userSchema, id);
  }
  getTopItems(type: 'artists' | 'tracks', params: PageInput & { timeRange?: string } = {}) {
    return type === 'artists'
      ? this.page(
          '/me/top/artists',
          artistSchema,
          params,
          pickDefined({ time_range: params.timeRange })
        )
      : this.page(
          '/me/top/tracks',
          fullTrackSchema,
          params,
          pickDefined({ time_range: params.timeRange })
        );
  }
  async getRecentlyPlayed(params: { limit?: number; after?: string; before?: string } = {}) {
    if (params.after !== undefined && params.before !== undefined)
      throw createApiServiceError('Supply after or before, not both.');
    whole(params.limit, 'limit', 1, 50);
    for (const value of [params.after, params.before])
      if (
        value !== undefined &&
        (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
      )
        throw createApiServiceError(
          'Recently played cursors must be nonnegative safe integer millisecond timestamps.'
        );
    const result = await this.request(
      'get',
      '/me/player/recently-played',
      cursorSchema(historySchema),
      pickDefined(params)
    );
    validatePageLinks(result, '/me/player/recently-played');
    if (
      (params.limit !== undefined && result.limit !== params.limit) ||
      result.items.length > result.limit
    )
      throw createApiServiceError(
        'Spotify returned inconsistent recent-history paging metadata.'
      );
    return result;
  }
  followArtistsOrUsers(type: 'artist' | 'user', values: string[]) {
    return this.library('put', type, values);
  }
  unfollowArtistsOrUsers(type: 'artist' | 'user', values: string[]) {
    return this.library('delete', type, values);
  }
  checkFollowing(type: 'artist' | 'user', values: string[]) {
    return this.contains(type, values);
  }
  async getFollowedArtists(params: { limit?: number; after?: string } = {}) {
    whole(params.limit, 'limit', 1, 50);
    if (params.after !== undefined) identifier(params.after);
    const result = await this.request(
      'get',
      '/me/following',
      z.object({ artists: cursorSchema(artistSchema) }),
      pickDefined({ ...params, type: 'artist' })
    );
    validatePageLinks(result.artists, '/me/following');
    if (
      (params.limit !== undefined && result.artists.limit !== params.limit) ||
      result.artists.items.length > result.artists.limit
    )
      throw createApiServiceError(
        'Spotify returned inconsistent followed-artist paging metadata.'
      );
    return result;
  }
  followPlaylist(id: string, isPublic?: boolean) {
    if (!this.legacy && isPublic !== undefined)
      throw createApiServiceError(
        'The current save-playlist endpoint has no follow-visibility option. Omit isPublic or use confirmed legacy endpoint access.'
      );
    if (this.legacy)
      return this.empty(
        'put',
        `/playlists/${identifier(id)}/followers`,
        undefined,
        pickDefined({ public: isPublic }),
        200
      );
    return this.library('put', 'playlist', [id]);
  }
  unfollowPlaylist(id: string) {
    return this.library('delete', 'playlist', [id]);
  }
}
