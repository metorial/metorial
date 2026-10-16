import crypto from 'crypto';
import { createApiServiceError, createAxios, getResponseHeaderValue } from 'slates';
import { redactCredentials, requireRecord, requireString, smugMugError } from './errors';
import { buildOAuth1Header, type OAuth1Credentials } from './oauth1';

export interface SmugMugClientConfig {
  token: string;
  tokenSecret: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface PaginationParams {
  start?: number;
  count?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pages: {
    total: number;
    start: number;
    count: number;
  };
}

export class Client {
  private credentials: OAuth1Credentials;

  constructor(config: SmugMugClientConfig) {
    this.credentials = {
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      token: config.token,
      tokenSecret: config.tokenSecret
    };
  }

  private get secrets(): string[] {
    return Object.values(this.credentials);
  }

  private getAuthHeader(method: string, fullUrl: string): string {
    return buildOAuth1Header(method, fullUrl, this.credentials);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | undefined>
  ): string {
    if (
      !path.startsWith('/api/v2') ||
      path.includes('\\') ||
      path.includes('#') ||
      path.includes('?')
    ) {
      throw createApiServiceError('Use a SmugMug API resource URI without query parameters.', {
        reason: 'invalid_uri'
      });
    }
    let url = new URL(path, 'https://api.smugmug.com');
    if (url.origin !== 'https://api.smugmug.com' || !url.pathname.startsWith('/api/v2')) {
      throw createApiServiceError('The resource must belong to the SmugMug API.', {
        reason: 'invalid_uri'
      });
    }
    for (let [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) {
        if (
          (key === 'start' || key === 'count') &&
          (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
        ) {
          throw createApiServiceError(`${key} must be a positive integer.`, {
            reason: 'invalid_pagination'
          });
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private folderPath(path: string): string {
    return path
      .split('/')
      .map(segment => {
        if (!segment || segment === '.' || segment === '..' || segment.includes('\\')) {
          throw createApiServiceError(
            'Use folder URL-name segments separated by a single slash.',
            { reason: 'invalid_folder_path' }
          );
        }
        return encodeURIComponent(segment);
      })
      .join('/');
  }

  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, string | number | undefined>
  ): Promise<any> {
    let url = this.buildUrl(path, params);
    try {
      let response = await createAxios({ maxRedirects: 0 }).request({
        method,
        url,
        data,
        headers: {
          Authorization: this.getAuthHeader(method, url),
          Accept: 'application/json',
          ...(data !== undefined ? { 'Content-Type': 'application/json' } : {})
        }
      });
      if (method !== 'GET' && response.status === 202) {
        throw createApiServiceError(
          'SmugMug accepted the operation for background processing; completion is not confirmed. Check the resource before retrying.',
          { reason: 'operation_pending' }
        );
      }
      if (method === 'DELETE' && response.status === 204) return;
      let body = requireRecord(response.data, 'API response');
      if (method !== 'GET' && body.Code === 202) {
        throw createApiServiceError(
          'SmugMug accepted the operation for background processing; completion is not confirmed. Check the resource before retrying.',
          { reason: 'operation_pending' }
        );
      }
      if (typeof body.Code === 'number' && body.Code >= 400) {
        throw smugMugError(
          { response: { status: body.Code, data: body } },
          `${method} request`,
          this.secrets
        );
      }
      return redactCredentials(body, this.secrets);
    } catch (error) {
      throw smugMugError(error, `${method} request`, this.secrets);
    }
  }

  async get(path: string, params?: Record<string, string | number | undefined>): Promise<any> {
    return this.request('GET', path, undefined, params);
  }

  async post(
    path: string,
    data?: any,
    params?: Record<string, string | number | undefined>
  ): Promise<any> {
    return this.request('POST', path, data, params);
  }

  async patch(path: string, data?: any): Promise<any> {
    return this.request('PATCH', path, data);
  }

  async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }

  private object(data: unknown, key: string, required: string[] = []): any {
    let object = requireRecord(
      requireRecord(requireRecord(data, 'API response').Response, 'response data')[key],
      key
    );
    for (let field of required) requireString(object[field], `${key}.${field}`);
    return object;
  }

  private page(data: unknown, key: string, required: string[] = []): PaginatedResponse<any> {
    let response = requireRecord(
      requireRecord(data, 'API response').Response,
      'response data'
    );
    if (!Array.isArray(response[key])) {
      throw createApiServiceError(`SmugMug returned an invalid ${key} collection.`, {
        reason: 'invalid_response'
      });
    }
    let pages = requireRecord(response.Pages, 'pagination data');
    for (let field of ['Total', 'Start', 'Count']) {
      if (
        typeof pages[field] !== 'number' ||
        !Number.isSafeInteger(pages[field]) ||
        pages[field] < 0
      ) {
        throw createApiServiceError(`SmugMug returned invalid pagination ${field}.`, {
          reason: 'invalid_response'
        });
      }
    }
    for (let item of response[key]) {
      requireRecord(item, `${key} item`);
      for (let field of required) requireString(item[field], `${key}.${field}`);
    }
    return {
      items: response[key],
      pages: { total: pages.Total, start: pages.Start, count: pages.Count }
    };
  }

  // ===== User =====

  async getAuthenticatedUser(): Promise<any> {
    let data = await this.get('/api/v2!authuser');
    return this.object(data, 'User', ['NickName', 'Name']);
  }

  async getUser(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}`);
    return this.object(data, 'User', ['NickName', 'Name']);
  }

  async getUserProfile(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!profile`);
    return this.object(data, 'UserProfile', []);
  }

  async updateUserProfile(nickname: string, profileData: Record<string, any>): Promise<any> {
    let data = await this.patch(
      `/api/v2/user/${encodeURIComponent(nickname)}!profile`,
      profileData
    );
    return this.object(data, 'UserProfile', []);
  }

  // ===== Nodes =====

  async getNode(nodeId: string): Promise<any> {
    let data = await this.get(`/api/v2/node/${encodeURIComponent(nodeId)}`);
    return this.object(data, 'Node', ['NodeID', 'Name']);
  }

  async getNodeChildren(
    nodeId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(`/api/v2/node/${encodeURIComponent(nodeId)}!children`, params);
    return this.page(data, 'Node', ['NodeID', 'Name']);
  }

  async createNode(parentNodeId: string, nodeData: Record<string, any>): Promise<any> {
    let data = await this.post(
      `/api/v2/node/${encodeURIComponent(parentNodeId)}!children`,
      nodeData
    );
    return this.object(data, 'Node', ['NodeID', 'Name']);
  }

  async updateNode(nodeId: string, nodeData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/node/${encodeURIComponent(nodeId)}`, nodeData);
    return this.object(data, 'Node', ['NodeID', 'Name']);
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.delete(`/api/v2/node/${encodeURIComponent(nodeId)}`);
  }

  async searchNodes(
    text: string,
    scope?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = { Text: text };
    if (scope) params.Scope = scope;
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get('/api/v2/node!search', params);
    return this.page(data, 'Node', ['NodeID', 'Name']);
  }

  // ===== Albums =====

  async getAlbum(albumKey: string): Promise<any> {
    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}`);
    return this.object(data, 'Album', ['AlbumKey', 'Uri', 'Name']);
  }

  async createAlbum(
    folderPath: string,
    nickname: string,
    albumData: Record<string, any>
  ): Promise<any> {
    let path = folderPath
      ? `/api/v2/folder/user/${encodeURIComponent(nickname)}/${this.folderPath(folderPath)}!albums`
      : `/api/v2/folder/user/${encodeURIComponent(nickname)}!albums`;
    let data = await this.post(path, albumData);
    return this.object(data, 'Album', ['AlbumKey', 'Uri', 'Name']);
  }

  async updateAlbum(albumKey: string, albumData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/album/${encodeURIComponent(albumKey)}`, albumData);
    return this.object(data, 'Album', ['AlbumKey', 'Uri', 'Name']);
  }

  async deleteAlbum(albumKey: string): Promise<void> {
    await this.delete(`/api/v2/album/${encodeURIComponent(albumKey)}`);
  }

  async getAlbumImages(
    albumKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}!images`, params);
    return this.page(data, 'AlbumImage', ['ImageKey']);
  }

  async searchAlbums(
    text: string,
    scope?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = { Text: text };
    if (scope) params.Scope = scope;
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get('/api/v2/album!search', params);
    return this.page(data, 'Album', ['AlbumKey']);
  }

  async getAlbumShareUris(albumKey: string): Promise<any> {
    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}!shareuris`);
    return this.object(data, 'ShareUris', []);
  }

  // ===== Images =====

  async getImage(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0`);
    return this.object(data, 'Image', ['ImageKey']);
  }

  async updateImage(imageKey: string, imageData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/image/${encodeURIComponent(imageKey)}-0`, imageData);
    return this.object(data, 'Image', ['ImageKey']);
  }

  async deleteImage(imageKey: string): Promise<void> {
    await this.delete(`/api/v2/image/${encodeURIComponent(imageKey)}-0`);
  }

  async getImageMetadata(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0!metadata`);
    return this.object(data, 'ImageMetadata', []);
  }

  async getImageSizes(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0!sizedetails`);
    return this.object(data, 'ImageSizeDetails', []);
  }

  async searchImages(
    text: string,
    scope?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = { Text: text };
    if (scope) params.Scope = scope;
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get('/api/v2/image!search', params);
    return this.page(data, 'Image', ['ImageKey']);
  }

  async collectImage(targetAlbumKey: string, imageUri: string): Promise<any> {
    let data = await this.post(
      `/api/v2/album/${encodeURIComponent(targetAlbumKey)}!collectimages`,
      {
        ImageUris: imageUri
      }
    );
    return data;
  }

  async moveImages(targetAlbumUri: string, imageUris: string[]): Promise<any> {
    let data = await this.post(`${targetAlbumUri}!moveimages`, {
      MoveUris: imageUris.join(',')
    });
    return data;
  }

  // ===== Upload =====

  async uploadImageFromUrl(
    albumUri: string,
    sourceUrl: string,
    options?: {
      fileName?: string;
      title?: string;
      caption?: string;
      keywords?: string;
      hidden?: boolean;
      replaceImageUri?: string;
    }
  ): Promise<any> {
    let uploadUrl = 'https://upload.smugmug.com/';
    if (!/^\/api\/v2\/album\/[A-Za-z0-9]+$/.test(albumUri)) {
      throw createApiServiceError('Use an album API URI such as /api/v2/album/ABC123.', {
        reason: 'invalid_album_uri'
      });
    }
    if (
      options?.replaceImageUri &&
      !/^\/api\/v2\/(?:album\/[A-Za-z0-9]+\/)?image\/[A-Za-z0-9]+(?:-\d+)?$/.test(
        options.replaceImageUri
      )
    ) {
      throw createApiServiceError('Use a SmugMug image API URI for the replacement image.', {
        reason: 'invalid_image_uri'
      });
    }
    let source: URL;
    try {
      source = new URL(sourceUrl);
    } catch {
      throw createApiServiceError('Use a publicly accessible HTTP or HTTPS source URL.', {
        reason: 'invalid_source_url'
      });
    }
    if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) {
      throw createApiServiceError(
        'Use a publicly accessible HTTP or HTTPS source URL without embedded credentials.',
        { reason: 'invalid_source_url' }
      );
    }
    try {
      let httpClient = createAxios({ maxRedirects: 0 });
      let imageResponse = await httpClient.get(source.toString(), {
        responseType: 'arraybuffer'
      });
      let imageBuffer = Buffer.from(imageResponse.data);
      if (!imageBuffer.length) {
        throw createApiServiceError('The source URL returned an empty file.', {
          reason: 'invalid_source_file'
        });
      }
      let headers: Record<string, string> = {
        Authorization: this.getAuthHeader('POST', uploadUrl),
        'Content-Type':
          getResponseHeaderValue(imageResponse.headers, 'content-type') ||
          'application/octet-stream',
        'Content-Length': String(imageBuffer.length),
        'Content-MD5': crypto.createHash('md5').update(imageBuffer).digest('base64'),
        'X-Smug-AlbumUri': albumUri,
        'X-Smug-ResponseType': 'JSON',
        'X-Smug-Version': 'v2'
      };
      for (let [key, value] of Object.entries(options ?? {})) {
        let names: Record<string, string> = {
          fileName: 'FileName',
          title: 'Title',
          caption: 'Caption',
          keywords: 'Keywords',
          hidden: 'Hidden',
          replaceImageUri: 'ImageUri'
        };
        if (value !== undefined) headers[`X-Smug-${names[key]}`] = String(value);
      }
      let response = await httpClient.post(uploadUrl, imageBuffer, { headers });
      let result = requireRecord(response.data, 'upload response');
      if (result.stat !== 'ok') {
        throw smugMugError(
          { response: { status: response.status, data: result } },
          'upload',
          this.secrets
        );
      }
      requireRecord(result.Image, 'uploaded image');
      return redactCredentials(result, this.secrets);
    } catch (error) {
      throw smugMugError(error, 'image upload', this.secrets);
    }
  }

  // ===== Folders =====

  async getRootFolder(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/folder/user/${encodeURIComponent(nickname)}`);
    return this.object(data, 'Folder', []);
  }

  async getFolder(nickname: string, folderPath: string): Promise<any> {
    let data = await this.get(
      `/api/v2/folder/user/${encodeURIComponent(nickname)}/${this.folderPath(folderPath)}`
    );
    return this.object(data, 'Folder', []);
  }

  // ===== Comments =====

  async getAlbumComments(
    albumKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/album/${encodeURIComponent(albumKey)}!comments`,
      params
    );
    return this.page(data, 'Comment', ['Text']);
  }

  async getImageComments(
    imageKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/image/${encodeURIComponent(imageKey)}-0!comments`,
      params
    );
    return this.page(data, 'Comment', ['Text']);
  }

  // ===== Watermarks =====

  async getUserWatermarks(nickname: string): Promise<any[]> {
    let items: any[] = [];
    let start = 1;
    while (true) {
      let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!watermarks`, {
        start
      });
      let page = this.page(data, 'Watermark');
      items.push(...page.items);
      let next = page.pages.start + page.pages.count;
      if (next > page.pages.total) return items;
      if (next <= start || page.items.length === 0) {
        throw createApiServiceError(
          'SmugMug returned a watermark page that cannot be advanced.',
          { reason: 'invalid_pagination' }
        );
      }
      start = next;
    }
  }

  // ===== Featured Albums & Popular Media =====

  async getFeaturedAlbums(nickname: string): Promise<any[]> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!features`);
    return this.page(data, 'Feature').items;
  }

  async getRecentImages(
    nickname: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/user/${encodeURIComponent(nickname)}!recentimages`,
      params
    );
    return this.page(data, 'Image', ['ImageKey']);
  }

  async getPopularMedia(
    nickname: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start !== undefined) params.start = pagination.start;
    if (pagination?.count !== undefined) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/user/${encodeURIComponent(nickname)}!popularmedia`,
      params
    );
    return this.page(data, 'Image', ['ImageKey']);
  }

  async getTopKeywords(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!topkeywords`);
    return this.object(data, 'TopKeywords', []);
  }
}
