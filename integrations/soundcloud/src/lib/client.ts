import {
  createAuthenticatedAxios,
  createAxios,
  getBase64ByteLength,
  pickDefined
} from 'slates';
import {
  commentSchema,
  exact,
  fail,
  guard,
  identifier,
  integer,
  limit,
  parse,
  playlistSchema,
  publicUrl,
  required,
  type SoundCloudComment,
  type SoundCloudPlaylist,
  type SoundCloudTrack,
  type SoundCloudUser,
  segment,
  submitted,
  trackSchema,
  upstream,
  userSchema,
  z
} from './native';

export type {
  SoundCloudComment,
  SoundCloudPlaylist,
  SoundCloudTrack,
  SoundCloudUser
} from './native';
export interface PaginatedResponse<T> {
  collection: T[];
  next_href?: string | null;
}
export type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  authMode?: 'authorization_code' | 'client_credentials';
};
type Paging = { limit?: number; offset?: number; nextHref?: string };
const ROOT = 'https://api.soundcloud.com';
const OPTIONS = {
  timeout: 30_000,
  maxRedirects: 0,
  maxContentLength: 8 * 1024 * 1024,
  maxBodyLength: 100 * 1024 * 1024
};
const licenses = [
  'no-rights-reserved',
  'all-rights-reserved',
  'cc-by',
  'cc-by-nc',
  'cc-by-nd',
  'cc-by-sa',
  'cc-by-nc-nd',
  'cc-by-nc-sa'
];
export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private auth: AuthOutput) {
    required(auth.token, 'Access token');
    this.http = createAuthenticatedAxios({
      ...OPTIONS,
      baseURL: ROOT,
      headers: { Accept: 'application/json' },
      contentType: false,
      authHeader: { value: `OAuth ${auth.token}` },
      errorAdapter: upstream
    });
  }
  userAccess(): void {
    if (this.auth.authMode === 'client_credentials')
      throw fail(
        'This operation needs user authorization. Reconnect using OAuth, rather than Client Credentials.'
      );
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    resolveRedirect = false
  ) {
    guard({ path, body, params }, this.auth);
    try {
      const response = await this.http.request({
        method,
        url: path,
        data: body,
        params,
        validateStatus: status =>
          (status >= 200 && status < 300) || (resolveRedirect && status === 302)
      });
      guard({ data: response.data, headers: response.headers }, this.auth);
      const allowed = resolveRedirect
        ? [200, 302]
        : (method === 'post' && ['/tracks', '/playlists'].includes(path)) ||
            (method === 'post' && (path.includes('/comments') || path.startsWith('/reposts/')))
          ? [201]
          : method === 'put' && path.startsWith('/me/followings/')
            ? [200, 201]
            : [200];
      if (!allowed.includes(response.status))
        throw fail(
          'SoundCloud returned an undocumented success status. An accepted effect may remain; read native state before retrying.'
        );
      return response;
    } catch (error) {
      throw upstream(error);
    }
  }
  private pagePath(path: string, nextHref?: string): string {
    if (!nextHref) return path;
    let url: URL;
    try {
      url = new URL(nextHref);
    } catch {
      throw fail('Use the exact nextHref returned by this resource list.');
    }
    let actualPath: string, expectedPath: string;
    try {
      actualPath = decodeURIComponent(url.pathname);
      expectedPath = decodeURIComponent(path);
    } catch {
      throw fail('SoundCloud returned a malformed continuation URL. Restart the list.');
    }
    if (
      url.origin !== ROOT ||
      url.username ||
      url.password ||
      url.hash ||
      actualPath !== expectedPath
    )
      throw fail(
        'nextHref must refer to the same SoundCloud resource list and HTTPS API origin.'
      );
    if (
      [...url.searchParams.keys()].some(key =>
        /token|authorization|secret|client_id/i.test(key)
      )
    )
      throw fail(
        'A continuation URL contains authentication material. Restart the list rather than forwarding credentials in a URL.'
      );
    guard(url.href, this.auth);
    return url.pathname + url.search;
  }
  private async page<T>(
    path: string,
    schema: z.ZodType<T>,
    params: Record<string, unknown>,
    nextHref?: string
  ): Promise<PaginatedResponse<T>> {
    const target = this.pagePath(path, nextHref);
    const response = await this.request(
      'get',
      target,
      undefined,
      nextHref ? undefined : pickDefined(params)
    );
    const data = parse(
      z
        .object({
          collection: z.array(schema).max(1000),
          next_href: z.string().min(1).nullable().optional()
        })
        .passthrough(),
      response.data
    );
    if (data.next_href) this.pagePath(path, data.next_href);
    return data;
  }
  async getTrack(trackId: string, secretToken?: string): Promise<SoundCloudTrack> {
    const track = parse(
      trackSchema,
      (
        await this.request(
          'get',
          `/tracks/${segment(trackId, 'tracks')}`,
          undefined,
          pickDefined({ secret_token: secretToken })
        )
      ).data
    );
    exact(track.urn, trackId, 'tracks');
    return track;
  }
  async getTrackStreams(
    trackId: string,
    secretToken?: string
  ): Promise<Record<string, string>> {
    return parse(
      z.record(z.string(), z.string().url()),
      (
        await this.request(
          'get',
          `/tracks/${segment(trackId, 'tracks')}/streams`,
          undefined,
          pickDefined({ secret_token: secretToken })
        )
      ).data
    );
  }
  private trackFields(data: {
    title?: string;
    description?: string;
    sharing?: string;
    genre?: string;
    tagList?: string;
    license?: string;
  }) {
    if (data.title !== undefined) required(data.title, 'title');
    if (data.license !== undefined && !licenses.includes(data.license))
      throw fail('Use a documented SoundCloud license value.');
    return pickDefined({
      title: data.title,
      description: data.description,
      sharing: data.sharing,
      genre: data.genre,
      tag_list: data.tagList,
      license: data.license
    });
  }
  async uploadTrack(data: {
    title: string;
    description?: string;
    sharing?: 'public' | 'private';
    genre?: string;
    tagList?: string;
    license?: string;
    assetData: string;
    assetFilename: string;
    artworkData?: string;
  }): Promise<SoundCloudTrack> {
    this.userAccess();
    const fields = this.trackFields(data);
    required(data.assetFilename, 'assetFilename', 255);
    if (/[/\\]/.test(data.assetFilename))
      throw fail('assetFilename must be a filename without directory separators.');
    const audio = decodeBase64(data.assetData, 64 * 1024 * 1024, 'Audio data'),
      artwork =
        data.artworkData === undefined
          ? undefined
          : decodeBase64(data.artworkData, 8 * 1024 * 1024, 'Artwork data');
    guard(data, this.auth);
    const form = new FormData();
    for (const [key, value] of Object.entries(fields))
      form.append(`track[${key}]`, String(value));
    form.append('track[asset_data]', new Blob([audio]), data.assetFilename);
    if (artwork) form.append('track[artwork_data]', new Blob([artwork]), 'artwork');
    const track = parse(trackSchema, (await this.request('post', '/tracks', form)).data);
    submitted(track, fields);
    return track;
  }
  async updateTrack(
    trackId: string,
    data: {
      title?: string;
      description?: string;
      sharing?: 'public' | 'private';
      genre?: string;
      tagList?: string;
      license?: string;
    }
  ): Promise<SoundCloudTrack> {
    this.userAccess();
    const fields = this.trackFields(data);
    if (!Object.keys(fields).length)
      throw fail('Supply at least one supported track metadata field to update.');
    const track = parse(
      trackSchema,
      (await this.request('put', `/tracks/${segment(trackId, 'tracks')}`, { track: fields }))
        .data
    );
    exact(track.urn, trackId, 'tracks');
    submitted(track, fields);
    return track;
  }
  async deleteTrack(trackId: string): Promise<void> {
    this.userAccess();
    await this.request('delete', `/tracks/${segment(trackId, 'tracks')}`);
  }
  getTrackComments(trackId: string, p: Paging = {}) {
    return this.page(
      `/tracks/${segment(trackId, 'tracks')}/comments`,
      commentSchema,
      {
        limit: limit(p.limit),
        offset:
          p.offset === undefined
            ? undefined
            : integer(p.offset, 'offset', 0, Number.MAX_SAFE_INTEGER),
        linked_partitioning: true
      },
      p.nextHref
    );
  }
  async createComment(
    trackId: string,
    body: string,
    timestamp?: number
  ): Promise<SoundCloudComment> {
    this.userAccess();
    required(body, 'Comment body');
    if (timestamp !== undefined && (!Number.isFinite(timestamp) || timestamp < 0))
      throw fail('Comment timestamp must be a nonnegative finite number of milliseconds.');
    const comment = parse(
      commentSchema,
      (
        await this.request('post', `/tracks/${segment(trackId, 'tracks')}/comments`, {
          comment: pickDefined({ body, timestamp })
        })
      ).data
    );
    submitted(comment, { body, timestamp });
    if (comment.track_urn) exact(comment.track_urn, trackId, 'tracks');
    return comment;
  }
  private async social(path: string, method: 'post' | 'put' | 'delete', user?: string) {
    this.userAccess();
    const response = await this.request(method, path);
    if (user && response.status === 201) {
      exact(parse(userSchema, response.data).urn, user, 'users');
      return;
    }
    if (response.data !== undefined && response.data !== null && response.data !== '') {
      const data = parse(
        z
          .object({ status: z.string().optional(), message: z.string().optional() })
          .passthrough(),
        response.data
      );
      if (
        ![data.status, data.message].some(
          v =>
            v &&
            /^(?:200\s*-\s*(?:ok|successful)|201\s*-\s*created|status\(200\)\s*-\s*ok|ok|success)$/i.test(
              v
            )
        )
      )
        throw fail(
          'SoundCloud returned an unsupported social receipt; an effect may remain. Read native state before retrying.'
        );
    }
  }
  likeTrack(id: string) {
    return this.social(`/likes/tracks/${segment(id, 'tracks')}`, 'post');
  }
  unlikeTrack(id: string) {
    return this.social(`/likes/tracks/${segment(id, 'tracks')}`, 'delete');
  }
  repostTrack(id: string) {
    return this.social(`/reposts/tracks/${segment(id, 'tracks')}`, 'post');
  }
  unrepostTrack(id: string) {
    return this.social(`/reposts/tracks/${segment(id, 'tracks')}`, 'delete');
  }
  likePlaylist(id: string) {
    return this.social(`/likes/playlists/${segment(id, 'playlists')}`, 'post');
  }
  unlikePlaylist(id: string) {
    return this.social(`/likes/playlists/${segment(id, 'playlists')}`, 'delete');
  }
  repostPlaylist(id: string) {
    return this.social(`/reposts/playlists/${segment(id, 'playlists')}`, 'post');
  }
  unrepostPlaylist(id: string) {
    return this.social(`/reposts/playlists/${segment(id, 'playlists')}`, 'delete');
  }
  followUser(id: string) {
    return this.social(`/me/followings/${segment(id, 'users')}`, 'put', id);
  }
  unfollowUser(id: string) {
    return this.social(`/me/followings/${segment(id, 'users')}`, 'delete');
  }
  async getPlaylist(id: string, secretToken?: string): Promise<SoundCloudPlaylist> {
    const value = parse(
      playlistSchema,
      (
        await this.request(
          'get',
          `/playlists/${segment(id, 'playlists')}`,
          undefined,
          pickDefined({ secret_token: secretToken })
        )
      ).data
    );
    exact(value.urn, id, 'playlists');
    return value;
  }
  getPlaylistTracks(id: string, nextHref?: string, secretToken?: string) {
    return this.page(
      `/playlists/${segment(id, 'playlists')}/tracks`,
      trackSchema,
      pickDefined({ linked_partitioning: true, secret_token: secretToken }),
      nextHref
    );
  }
  private playlistFields(data: {
    title?: string;
    description?: string;
    sharing?: 'public' | 'private';
    trackIds?: string[];
    isAlbum?: boolean;
  }) {
    if (data.title !== undefined) required(data.title, 'title');
    if (data.trackIds && data.trackIds.length > 1000)
      throw fail('The local playlist write bound is 1,000 tracks.');
    return pickDefined({
      title: data.title,
      description: data.description,
      sharing: data.sharing,
      tracks: data.trackIds?.map(id => ({ urn: identifier(id, 'tracks') })),
      set_type: data.isAlbum === undefined ? undefined : data.isAlbum ? 'album' : 'playlist'
    });
  }
  private playlistReceipt(value: SoundCloudPlaylist, fields: Record<string, unknown>) {
    const { tracks, set_type, ...simple } = fields;
    submitted(value, simple);
    if (
      set_type !== undefined &&
      value.set_type !== set_type &&
      value.playlist_type !== set_type &&
      value.type !== set_type &&
      value.is_album !== (set_type === 'album')
    )
      throw fail(
        'SoundCloud did not confirm the requested playlist type. Read the exact playlist before retrying.'
      );
    if (
      tracks !== undefined &&
      (!value.tracks ||
        value.track_count !== value.tracks.length ||
        JSON.stringify(value.tracks.map(v => ({ urn: v.urn }))) !== JSON.stringify(tracks))
    )
      throw fail(
        'SoundCloud did not return complete requested playlist membership. The replacement may remain; read all playlist tracks before retrying.'
      );
  }
  async createPlaylist(data: {
    title: string;
    description?: string;
    sharing?: 'public' | 'private';
    trackIds?: string[];
    isAlbum?: boolean;
  }): Promise<SoundCloudPlaylist> {
    this.userAccess();
    const fields = this.playlistFields(data);
    const value = parse(
      playlistSchema,
      (await this.request('post', '/playlists', { playlist: fields })).data
    );
    this.playlistReceipt(value, fields);
    return value;
  }
  async updatePlaylist(
    id: string,
    data: {
      title?: string;
      description?: string;
      sharing?: 'public' | 'private';
      trackIds?: string[];
      isAlbum?: boolean;
    }
  ): Promise<SoundCloudPlaylist> {
    this.userAccess();
    const fields = this.playlistFields(data);
    if (!Object.keys(fields).length)
      throw fail('Supply at least one supported playlist update field.');
    const value = parse(
      playlistSchema,
      (
        await this.request('put', `/playlists/${segment(id, 'playlists')}`, {
          playlist: fields
        })
      ).data
    );
    exact(value.urn, id, 'playlists');
    this.playlistReceipt(value, fields);
    return value;
  }
  async deletePlaylist(id: string): Promise<void> {
    this.userAccess();
    await this.request('delete', `/playlists/${segment(id, 'playlists')}`);
  }
  async getMe(): Promise<SoundCloudUser> {
    this.userAccess();
    return parse(userSchema, (await this.request('get', '/me')).data);
  }
  async getUser(id: string): Promise<SoundCloudUser> {
    const value = parse(
      userSchema,
      (await this.request('get', `/users/${segment(id, 'users')}`)).data
    );
    exact(value.urn, id, 'users');
    return value;
  }
  getUserTracks(id: string, p: Paging = {}) {
    return this.page(
      `/users/${segment(id, 'users')}/tracks`,
      trackSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getUserPlaylists(id: string, p: Paging = {}) {
    return this.page(
      `/users/${segment(id, 'users')}/playlists`,
      playlistSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getUserFollowers(id: string, p: Paging = {}) {
    return this.page(
      `/users/${segment(id, 'users')}/followers`,
      userSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getUserFollowings(id: string, p: Paging = {}) {
    return this.page(
      `/users/${segment(id, 'users')}/followings`,
      userSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getMyTracks(p: Paging = {}) {
    this.userAccess();
    return this.page(
      '/me/tracks',
      trackSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getMyPlaylists(p: Paging = {}) {
    this.userAccess();
    return this.page(
      '/me/playlists',
      playlistSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  getMyLikedTracks(p: Paging = {}) {
    this.userAccess();
    return this.page(
      '/me/likes/tracks',
      trackSchema,
      { limit: limit(p.limit), linked_partitioning: true },
      p.nextHref
    );
  }
  async socialState(
    kind: 'tracks' | 'playlists' | 'users',
    id: string,
    relation: 'likes' | 'reposts' | 'followings'
  ): Promise<boolean> {
    this.userAccess();
    const wanted = identifier(id, kind),
      path = relation === 'followings' ? '/me/followings' : `/me/${relation}/${kind}`,
      schema =
        kind === 'users' ? userSchema : kind === 'tracks' ? trackSchema : playlistSchema;
    let nextHref: string | undefined;
    const seen = new Set<string>();
    let total = 0;
    do {
      if (nextHref) {
        if (seen.has(nextHref))
          throw fail('SoundCloud repeated a continuation; relationship absence is unproven.');
        seen.add(nextHref);
      }
      const result = await this.page(
        path,
        schema as z.ZodType<{ urn: string }>,
        { limit: 200, linked_partitioning: true },
        nextHref
      );
      total += result.collection.length;
      if (result.collection.some(v => v.urn === wanted)) return true;
      if (total > 1000 || seen.size >= 10)
        throw fail('Relationship inventory exceeds local bounds; absence is unproven.');
      nextHref = result.next_href ?? undefined;
    } while (nextHref);
    return false;
  }
  searchTracks(
    query: string,
    p: Paging & {
      access?: string;
      genres?: string;
      bpmFrom?: number;
      bpmTo?: number;
      durationFrom?: number;
      durationTo?: number;
    } = {}
  ) {
    required(query, 'Search query');
    for (const [label, from, to] of [
      ['BPM', p.bpmFrom, p.bpmTo],
      ['duration', p.durationFrom, p.durationTo]
    ] as const) {
      if (
        (from !== undefined && (!Number.isFinite(from) || from < 0)) ||
        (to !== undefined && (!Number.isFinite(to) || to < 0)) ||
        (from !== undefined && to !== undefined && from > to)
      )
        throw fail(`${label} bounds must be nonnegative finite values in ascending order.`);
    }
    return this.page(
      '/tracks',
      trackSchema,
      {
        q: query,
        limit: limit(p.limit),
        offset: p.offset,
        linked_partitioning: true,
        access: p.access,
        genres: p.genres,
        'bpm[from]': p.bpmFrom,
        'bpm[to]': p.bpmTo,
        'duration[from]': p.durationFrom,
        'duration[to]': p.durationTo
      },
      p.nextHref
    );
  }
  searchPlaylists(query: string, p: Paging = {}) {
    required(query, 'Search query');
    return this.page(
      '/playlists',
      playlistSchema,
      { q: query, limit: limit(p.limit), offset: p.offset, linked_partitioning: true },
      p.nextHref
    );
  }
  searchUsers(query: string, p: Paging = {}) {
    required(query, 'Search query');
    return this.page(
      '/users',
      userSchema,
      { q: query, limit: limit(p.limit), offset: p.offset, linked_partitioning: true },
      p.nextHref
    );
  }
  async resolve(url: string) {
    let response = await this.request(
      'get',
      '/resolve',
      undefined,
      { url: publicUrl(url) },
      true
    );
    if (response.status === 302) {
      const location =
        response.headers.location ??
        (typeof response.data === 'object' && response.data !== null
          ? response.data.location
          : undefined);
      if (typeof location !== 'string')
        throw fail('SoundCloud did not return a native resource Location.');
      let target: URL;
      try {
        target = new URL(location, ROOT);
      } catch {
        throw fail('SoundCloud returned an invalid resource Location.');
      }
      if (
        target.origin !== ROOT ||
        target.username ||
        target.password ||
        target.hash ||
        target.search ||
        !/^\/(?:tracks|users|playlists|system-playlists)\/[^/]+$/.test(target.pathname)
      )
        throw fail(
          'SoundCloud resource Location must stay on the documented HTTPS API resource origin.'
        );
      guard(target.href, this.auth);
      response = await this.request('get', target.pathname);
    }
    return parse(
      z
        .object({
          kind: z.string(),
          urn: z.string(),
          permalink_url: z.string().nullable().optional(),
          title: z.string().optional(),
          username: z.string().optional(),
          user: userSchema.nullable().optional()
        })
        .passthrough(),
      response.data
    );
  }
  async getOEmbed(
    url: string,
    p: {
      maxWidth?: number;
      maxHeight?: number;
      autoPlay?: boolean;
      showComments?: boolean;
      color?: string;
    } = {}
  ) {
    publicUrl(url);
    guard({ url, p }, this.auth);
    if (p.maxWidth !== undefined) integer(p.maxWidth, 'maxWidth', 1, Number.MAX_SAFE_INTEGER);
    if (p.maxHeight !== undefined)
      integer(p.maxHeight, 'maxHeight', 1, Number.MAX_SAFE_INTEGER);
    if (p.color !== undefined && !/^[a-fA-F0-9]{6}$/.test(p.color))
      throw fail('color must be a six-character hexadecimal color without #.');
    const http = createAxios({ ...OPTIONS, baseURL: 'https://soundcloud.com' });
    try {
      const response = await http.get('/oembed', {
        params: pickDefined({
          url,
          format: 'json',
          maxwidth: p.maxWidth,
          maxheight: p.maxHeight,
          auto_play: p.autoPlay,
          show_comments: p.showComments,
          color: p.color
        })
      });
      guard({ data: response.data, headers: response.headers }, this.auth);
      return parse(
        z
          .object({
            html: z.string(),
            title: z.string(),
            description: z.string().optional(),
            author_name: z.string().optional(),
            author_url: z.string().optional(),
            thumbnail_url: z.string().nullable().optional(),
            width: z.union([z.string(), z.number().finite()]),
            height: z.number().finite(),
            provider_name: z.string(),
            provider_url: z.string()
          })
          .passthrough(),
        response.data
      );
    } catch (error) {
      throw upstream(error);
    }
  }
}
export function decodeBase64(
  value: string,
  maximum: number,
  label: string
): Uint8Array<ArrayBuffer> {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > Math.ceil(maximum / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  )
    throw fail(`${label} must be canonical base64 within the local ${maximum}-byte bound.`);
  if (getBase64ByteLength(value) > maximum)
    throw fail(`${label} exceeds the local byte bound.`);
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value || !bytes.length)
    throw fail(`${label} must be nonempty canonical base64.`);
  return new Uint8Array(bytes);
}
