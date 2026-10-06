import { createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import {
  apiFailure,
  exact,
  identifier,
  invalid,
  nativeCategory,
  nativeChannel,
  nativeComment,
  nativeDomain,
  nativeFolder,
  nativeShowcase,
  nativeTag,
  nativeUser,
  nativeVideo,
  pageSchema,
  paging,
  parse,
  type Row,
  row,
  secretFree,
  text,
  uriId
} from './native';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  perPage: number;
  paging?: {
    next?: string | null;
    previous?: string | null;
    first?: string | null;
    last?: string | null;
  };
  data: T[];
}
type VideoEdit = {
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
};
type ShowcaseEdit = {
  name?: string;
  description?: string;
  privacy?: string;
  password?: string;
  sort?: string;
  brandColor?: string;
};
type ChannelEdit = { name: string; description?: string; privacy?: string; link?: string };
export class VimeoClient {
  private readonly http;
  private readonly token: string;
  private currentUser?: Promise<z.infer<typeof nativeUser>>;
  constructor(token: string) {
    this.token = text(token, 'access token', 8192);
    if (
      token.trim() !== token ||
      [...token].some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
    )
      invalid('Provide a valid access token without whitespace or control characters.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.vimeo.com',
      authHeader: { value: `Bearer ${this.token}` },
      headers: { Accept: 'application/vnd.vimeo.*+json;version=3.4' },
      timeout: 30_000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      errorAdapter: apiFailure
    });
  }
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    status: number,
    body?: unknown,
    query?: Row
  ): Promise<T> {
    if (
      !secretFree(path, this.token) ||
      !secretFree(body, this.token) ||
      !secretFree(query, this.token)
    )
      invalid('Request fields must not contain the connection access token.');
    const response = await this.http.request<unknown>({
      method,
      url: path,
      data: body,
      params: query
    });
    if (response.status !== status)
      invalid(
        'Vimeo did not return the documented completion status. A write may have taken effect; inspect the exact resource before retrying.',
        'unconfirmed_write'
      );
    if (!secretFree(response.data, this.token))
      invalid(
        'Vimeo returned sensitive credential data. Inspect native state before retrying a write.',
        'sensitive_response'
      );
    return parse(schema, response.data);
  }
  private async empty(method: 'put' | 'delete', path: string, body?: unknown) {
    await this.request(method, path, z.unknown(), 204, body);
  }
  private async list<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: PaginationParams,
    query?: Row
  ): Promise<PaginatedResponse<T>> {
    const result = await this.request('get', path, pageSchema(schema), 200, undefined, {
      ...paging(params),
      ...pickDefined(query ?? {})
    });
    if (params?.page !== undefined) exact(result.page, params.page, 'page');
    if (params?.perPage !== undefined) exact(result.per_page, params.perPage, 'page size');
    return { ...result, perPage: result.per_page };
  }
  getMe() {
    this.currentUser ??= this.request('get', '/me', nativeUser, 200).then(user => {
      uriId(user.uri, 'users');
      return user;
    });
    return this.currentUser;
  }
  async getUser(id: string) {
    const user = await this.request(
      'get',
      `/users/${identifier(id, 'userId')}`,
      nativeUser,
      200
    );
    exact(uriId(user.uri, 'users'), id, 'user ID');
    return user;
  }
  async getVideo(id: string) {
    const video = await this.request(
      'get',
      `/videos/${identifier(id, 'videoId')}`,
      nativeVideo,
      200
    );
    exact(uriId(video.uri, 'videos'), id, 'video ID');
    return video;
  }
  listMyVideos(
    params?: PaginationParams & {
      query?: string;
      sort?: string;
      direction?: string;
      filter?: string;
    }
  ) {
    return this.list('/me/videos', nativeVideo, params, {
      query: params?.query,
      sort: params?.sort,
      direction: params?.direction,
      filter: params?.filter
    });
  }
  searchVideos(
    query: string,
    params?: PaginationParams & { sort?: string; direction?: string; filter?: string }
  ) {
    text(query, 'search query');
    return this.list('/videos', nativeVideo, params, {
      query,
      sort: params?.sort,
      direction: params?.direction,
      filter: params?.filter
    });
  }
  private async ownCollection<T extends { uri: string }>(
    kind: 'albums' | 'projects',
    id: string,
    schema: z.ZodType<T>
  ) {
    identifier(id, `${kind} ID`);
    const owner = await this.getMe();
    const resource = await this.request('get', `/me/${kind}/${id}`, schema, 200);
    exact(resource.uri, `${owner.uri}/${kind}/${id}`, 'collection owner and ID');
    return resource;
  }
  getShowcase(id: string) {
    return this.ownCollection('albums', id, nativeShowcase);
  }
  getFolder(id: string) {
    return this.ownCollection('projects', id, nativeFolder);
  }
  private async collectionReceipt<T extends { uri: string }>(
    kind: 'albums' | 'projects',
    result: T,
    id?: string
  ) {
    const owner = await this.getMe();
    exact(
      result.uri,
      `${owner.uri}/${kind}/${id ?? uriId(result.uri, kind)}`,
      'collection owner and ID'
    );
    return result;
  }
  private receipt(value: Row, body: Row) {
    for (const [key, wanted] of Object.entries(body)) {
      if (key === 'password') continue;
      const actual =
        key === 'privacy' && typeof wanted === 'string' && row(value.privacy)
          ? value.privacy.view
          : value[key];
      if (row(wanted) && row(actual)) this.receipt(actual, wanted);
      else exact(JSON.stringify(actual), JSON.stringify(wanted), 'submitted fields');
    }
  }
  private domain(value: string) {
    if (
      !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(
        value
      ) ||
      value.length > 253
    )
      invalid(
        'Provide bare valid domain names for embedDomains, without URL paths or credentials.'
      );
    return value.toLowerCase();
  }
  private async inventory<T extends { uri: string }>(
    path: string,
    schema: z.ZodType<T>
  ): Promise<T[]> {
    const all: T[] = [];
    let total: number | undefined;
    for (let page = 1; page <= 100; page++) {
      const current = await this.list(path, schema, { page, perPage: 100 });
      total ??= current.total;
      exact(current.total, total, 'unchanged relationship inventory total');
      for (const item of current.data) {
        if (
          !item.uri.startsWith(`${path}/`) ||
          all.some(existing => existing.uri === item.uri)
        )
          invalid(
            'Vimeo returned a foreign or repeated relationship entry.',
            'incomplete_inventory'
          );
        if (all.some(existing => JSON.stringify(existing) === JSON.stringify(item)))
          invalid(
            'Vimeo repeated a relationship entry; a complete replacement inventory could not be proved.',
            'incomplete_inventory'
          );
        all.push(item);
      }
      if (all.length === total) return all;
      if (!current.data.length || all.length > total) break;
    }
    return invalid(
      'The complete relationship inventory could not be established. Inspect native state before retrying replacement.',
      'incomplete_inventory'
    );
  }
  async editVideo(id: string, input: VideoEdit) {
    identifier(id, 'videoId');
    if (!secretFree(input, this.token))
      invalid('Request fields must not contain the connection access token.');
    if (input.name !== undefined) text(input.name, 'video title', 128);
    if (input.description !== undefined && input.description.length > 5000)
      invalid('Video descriptions must contain at most 5000 characters.');
    if (input.privacy?.view === 'password' && !input.password)
      invalid('Password privacy requires a non-empty password.');
    if (input.password !== undefined) text(input.password, 'video password', 32);
    if (input.description !== undefined)
      text(`x${input.description}`, 'video description', 5001);
    if (input.tags && input.tags.length > 20) invalid('Vimeo permits at most 20 video tags.');
    const tags = input.tags?.map(value => text(value, 'tag', 128));
    const domains = input.embedDomains?.map(value => this.domain(value));
    if (
      (tags && new Set(tags).size !== tags.length) ||
      (domains && new Set(domains).size !== domains.length)
    )
      invalid('Replacement tags and domains must be unique.');
    const body = pickDefined({
      name: input.name,
      description: input.description,
      privacy: input.privacy,
      password: input.password,
      license: input.license
    });
    if (!Object.keys(body).length && tags === undefined && domains === undefined)
      invalid('Provide at least one field to update.');
    if (input.privacy && !Object.keys(input.privacy).length)
      invalid('Provide at least one privacy field.');
    // Prove complete relationship inventories before the first mutation.
    const beforeTags =
      tags === undefined ? undefined : await this.inventory(`/videos/${id}/tags`, nativeTag);
    const beforeDomains =
      domains === undefined
        ? undefined
        : await this.inventory(`/videos/${id}/privacy/domains`, nativeDomain);
    if (Object.keys(body).length) {
      const result = await this.request('patch', `/videos/${id}`, nativeVideo, 200, body);
      exact(uriId(result.uri, 'videos'), id, 'video ID');
      this.receipt(result, body);
    }
    if (tags && beforeTags) {
      for (const tag of beforeTags)
        if (!tags.includes(tag.name))
          await this.empty('delete', `/videos/${id}/tags/${encodeURIComponent(tag.name)}`);
      if (tags.length)
        await this.request(
          'put',
          `/videos/${id}/tags`,
          z.array(nativeTag),
          200,
          tags.map(name => ({ name }))
        );
      const after = await this.inventory(`/videos/${id}/tags`, nativeTag);
      exact(
        JSON.stringify(after.map(item => item.name).sort()),
        JSON.stringify([...tags].sort()),
        'replacement tags'
      );
    }
    if (domains && beforeDomains) {
      for (const entry of beforeDomains)
        if (!domains.includes(entry.domain))
          await this.empty(
            'delete',
            `/videos/${id}/privacy/domains/${encodeURIComponent(entry.domain)}`
          );
      for (const domain of domains)
        if (!beforeDomains.some(entry => entry.domain === domain))
          await this.empty(
            'put',
            `/videos/${id}/privacy/domains/${encodeURIComponent(domain)}`
          );
      const after = await this.inventory(`/videos/${id}/privacy/domains`, nativeDomain);
      exact(
        JSON.stringify(after.map(item => item.domain).sort()),
        JSON.stringify([...domains].sort()),
        'replacement embed domains'
      );
    }
    const final = await this.getVideo(id);
    this.receipt(final, body);
    return final;
  }
  async deleteVideo(id: string) {
    await this.empty('delete', `/videos/${identifier(id, 'videoId')}`);
  }
  getVideoComments(id: string, params?: PaginationParams) {
    return this.list(`/videos/${identifier(id, 'videoId')}/comments`, nativeComment, params);
  }
  async addVideoComment(id: string, value: string) {
    identifier(id, 'videoId');
    text(value, 'comment');
    const author = await this.getMe();
    const result = await this.request(
      'post',
      `/videos/${identifier(id, 'videoId')}/comments`,
      nativeComment,
      201,
      { text: text(value, 'comment') }
    );
    exact(result.text, value, 'comment text');
    exact(result.user.uri, author.uri, 'comment author');
    if (!result.uri.startsWith(`/videos/${id}/comments/`))
      invalid('Vimeo returned a different comment parent.', 'receipt_mismatch');
    uriId(result.uri, 'comments');
    return result;
  }
  getLikedVideos(params?: PaginationParams & { sort?: string }) {
    return this.list('/me/likes', nativeVideo, params, { sort: params?.sort });
  }
  async likeVideo(id: string) {
    await this.empty('put', `/me/likes/${identifier(id, 'videoId')}`);
  }
  async unlikeVideo(id: string) {
    await this.empty('delete', `/me/likes/${identifier(id, 'videoId')}`);
  }
  listShowcases(params?: PaginationParams & { sort?: string }) {
    return this.list('/me/albums', nativeShowcase, params, {
      sort: params?.sort === 'modified_time' ? 'last_modified' : params?.sort
    });
  }
  private showcaseBody(input: ShowcaseEdit, create: boolean) {
    if (create || input.name !== undefined) text(input.name, 'showcase name');
    if (input.privacy === 'password' && !input.password)
      invalid('Password-protected showcases require a non-empty password.');
    if (input.brandColor !== undefined && !/^[A-Fa-f0-9]{6}$/.test(input.brandColor))
      invalid('brandColor must contain six hexadecimal digits without a hash prefix.');
    const body = pickDefined({
      name: input.name,
      description: input.description,
      privacy: input.privacy,
      password: input.password,
      sort: input.sort,
      brand_color: input.brandColor
    });
    if (!Object.keys(body).length) invalid('Provide at least one showcase field to update.');
    return body;
  }
  async createShowcase(input: ShowcaseEdit) {
    const body = this.showcaseBody(input, true);
    await this.getMe();
    const result = await this.request('post', '/me/albums', nativeShowcase, 201, body);
    this.receipt(result, body);
    return this.collectionReceipt('albums', result);
  }
  async editShowcase(id: string, input: ShowcaseEdit) {
    identifier(id, 'showcaseId');
    const body = this.showcaseBody(input, false);
    await this.getMe();
    const result = await this.request('patch', `/me/albums/${id}`, nativeShowcase, 200, body);
    this.receipt(result, body);
    return this.collectionReceipt('albums', result, id);
  }
  async deleteShowcase(id: string) {
    await this.empty('delete', `/me/albums/${identifier(id, 'showcaseId')}`);
  }
  getShowcaseVideos(id: string, params?: PaginationParams & { sort?: string }) {
    return this.list(
      `/me/albums/${identifier(id, 'showcaseId')}/videos`,
      nativeVideo,
      params,
      { sort: params?.sort }
    );
  }
  async addVideoToShowcase(id: string, videoId: string) {
    await this.empty(
      'put',
      `/me/albums/${identifier(id, 'showcaseId')}/videos/${identifier(videoId, 'videoId')}`
    );
  }
  async removeVideoFromShowcase(id: string, videoId: string) {
    await this.empty(
      'delete',
      `/me/albums/${identifier(id, 'showcaseId')}/videos/${identifier(videoId, 'videoId')}`
    );
  }
  listFolders(params?: PaginationParams & { sort?: string }) {
    if (params?.sort === 'last_user_action_event_date')
      invalid(
        'This legacy folder sort is not documented for the current folder endpoint. Use name, date or modified_time.'
      );
    return this.list('/me/projects', nativeFolder, params, {
      sort: params?.sort === 'alphabetical' ? 'name' : params?.sort
    });
  }
  async createFolder(name: string, parentFolderUri?: string) {
    text(name, 'folder name');
    const owner = await this.getMe();
    if (
      parentFolderUri !== undefined &&
      !new RegExp(`^${owner.uri}/projects/\\d+$`).test(parentFolderUri)
    )
      invalid(
        'parentFolderUri must be an exact native /users/{user_id}/projects/{project_id} URI belonging to the authenticated user. Call get_folder or list_folders.'
      );
    const body = pickDefined({ name, parent_folder_uri: parentFolderUri });
    const result = await this.request('post', '/me/projects', nativeFolder, 201, body);
    exact(result.name, name, 'folder name');
    return this.collectionReceipt('projects', result);
  }
  async deleteFolder(id: string) {
    await this.empty('delete', `/me/projects/${identifier(id, 'folderId')}`, {
      should_delete_clips: false
    });
  }
  getFolderVideos(id: string, params?: PaginationParams & { sort?: string }) {
    if (params?.sort === 'modified_time' || params?.sort === 'plays')
      invalid(
        'This legacy folder-video sort is not documented for the current endpoint. Use alphabetical, date, duration or last_user_action_event_date.'
      );
    return this.list(
      `/me/projects/${identifier(id, 'folderId')}/videos`,
      nativeVideo,
      params,
      { sort: params?.sort }
    );
  }
  async addVideoToFolder(id: string, videoUri: string) {
    uriId(videoUri, 'videos');
    await this.empty('put', `/me/projects/${identifier(id, 'folderId')}/videos`, {
      uris: videoUri
    });
  }
  async removeVideoFromFolder(id: string, videoUri: string) {
    uriId(videoUri, 'videos');
    await this.empty('delete', `/me/projects/${identifier(id, 'folderId')}/videos`, {
      uris: videoUri,
      should_delete_clips: false
    });
  }
  listMyChannels(params?: PaginationParams) {
    return this.list('/me/channels', nativeChannel, params);
  }
  async getChannel(id: string) {
    const result = await this.request(
      'get',
      `/channels/${identifier(id, 'channelId', true)}`,
      nativeChannel,
      200
    );
    const canonical = uriId(result.uri, 'channels');
    if (/^\d+$/.test(id)) exact(canonical, id, 'channel ID');
    else {
      let link: URL;
      try {
        link = new URL(result.link);
      } catch {
        return invalid('Vimeo returned an invalid channel link.', 'invalid_response');
      }
      exact(link.origin, 'https://vimeo.com', 'channel link origin');
      exact(link.pathname.replace(/\/$/, ''), `/channels/${id}`, 'channel URL slug');
    }
    return result;
  }
  async createChannel(input: ChannelEdit) {
    text(input.name, 'channel name');
    if (input.privacy === undefined)
      invalid('Channel creation requires explicit privacy: anybody, moderators or user.');
    if (input.link !== undefined) identifier(input.link, 'channel URL slug', true);
    const body = pickDefined(input);
    const result = await this.request('post', '/channels', nativeChannel, 200, body);
    this.receipt(
      result,
      pickDefined({ name: input.name, description: input.description, privacy: input.privacy })
    );
    uriId(result.uri, 'channels');
    if (input.link !== undefined)
      exact(
        result.link.replace(/\/$/, ''),
        `https://vimeo.com/channels/${input.link}`,
        'channel URL slug'
      );
    return result;
  }
  async deleteChannel(id: string) {
    await this.empty('delete', `/channels/${identifier(id, 'channelId', true)}`);
  }
  getChannelVideos(id: string, params?: PaginationParams & { sort?: string }) {
    return this.list(
      `/channels/${identifier(id, 'channelId', true)}/videos`,
      nativeVideo,
      params,
      { sort: params?.sort }
    );
  }
  async addVideoToChannel(id: string, videoId: string) {
    await this.empty(
      'put',
      `/channels/${identifier(id, 'channelId', true)}/videos/${identifier(videoId, 'videoId')}`
    );
  }
  async removeVideoFromChannel(id: string, videoId: string) {
    await this.empty(
      'delete',
      `/channels/${identifier(id, 'channelId', true)}/videos/${identifier(videoId, 'videoId')}`
    );
  }
  listCategories(params?: PaginationParams) {
    return this.list('/categories', nativeCategory, params);
  }
  getCategoryVideos(name: string, params?: PaginationParams & { sort?: string }) {
    return this.list(
      `/categories/${identifier(name, 'categoryName', true)}/videos`,
      nativeVideo,
      params,
      { sort: params?.sort }
    );
  }
  async getDownloadVideo(id: string) {
    const result = await this.request(
      'get',
      `/videos/${identifier(id, 'videoId')}`,
      z
        .object({
          uri: z.string(),
          name: z.string(),
          user: z.object({ uri: z.string() }).passthrough(),
          download: z.array(z.unknown()).optional()
        })
        .passthrough(),
      200,
      undefined,
      { fields: 'uri,name,user,download' }
    );
    exact(uriId(result.uri, 'videos'), id, 'download video ID');
    uriId(result.user.uri, 'users');
    if (!result.download?.length)
      invalid(
        'No downloadable rendition was returned. Vimeo requires an eligible membership and public, private and video_files scopes; check native download entitlement.',
        'download_unavailable'
      );
    return result;
  }
}
