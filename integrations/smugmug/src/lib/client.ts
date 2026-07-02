import crypto from 'crypto';
import { createAxios } from 'slates';
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

let headerValueToString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return undefined;
};

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

  private getAuthHeader(method: string, fullUrl: string): string {
    return buildOAuth1Header(method, fullUrl, this.credentials);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | undefined>
  ): string {
    let url = `https://api.smugmug.com${path}`;
    let searchParams = new URLSearchParams();
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
    }
    let queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  async get(path: string, params?: Record<string, string | number | undefined>): Promise<any> {
    let fullUrl = this.buildUrl(path, params);
    let authHeader = this.getAuthHeader('GET', fullUrl);
    let httpClient = createAxios({ baseURL: 'https://api.smugmug.com' });

    let response = await httpClient.get(path, {
      params,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    return response.data;
  }

  async post(
    path: string,
    data?: any,
    params?: Record<string, string | number | undefined>
  ): Promise<any> {
    let fullUrl = this.buildUrl(path, params);
    let authHeader = this.getAuthHeader('POST', fullUrl);
    let httpClient = createAxios({ baseURL: 'https://api.smugmug.com' });

    let response = await httpClient.post(path, data, {
      params,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async patch(path: string, data?: any): Promise<any> {
    let fullUrl = this.buildUrl(path);
    let authHeader = this.getAuthHeader('PATCH', fullUrl);
    let httpClient = createAxios({ baseURL: 'https://api.smugmug.com' });

    let response = await httpClient.patch(path, data, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async delete(path: string): Promise<any> {
    let fullUrl = this.buildUrl(path);
    let authHeader = this.getAuthHeader('DELETE', fullUrl);
    let httpClient = createAxios({ baseURL: 'https://api.smugmug.com' });

    let response = await httpClient.delete(path, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    return response.data;
  }

  // ===== User =====

  async getAuthenticatedUser(): Promise<any> {
    let data = await this.get('/api/v2!authuser');
    return data?.Response?.User;
  }

  async getUser(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}`);
    return data?.Response?.User;
  }

  async getUserProfile(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!profile`);
    return data?.Response?.UserProfile;
  }

  async updateUserProfile(nickname: string, profileData: Record<string, any>): Promise<any> {
    let data = await this.patch(
      `/api/v2/user/${encodeURIComponent(nickname)}!profile`,
      profileData
    );
    return data?.Response?.UserProfile;
  }

  // ===== Nodes =====

  async getNode(nodeId: string): Promise<any> {
    let data = await this.get(`/api/v2/node/${encodeURIComponent(nodeId)}`);
    return data?.Response?.Node;
  }

  async getNodeChildren(
    nodeId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(`/api/v2/node/${encodeURIComponent(nodeId)}!children`, params);
    return {
      items: data?.Response?.Node || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async createNode(parentNodeId: string, nodeData: Record<string, any>): Promise<any> {
    let data = await this.post(
      `/api/v2/node/${encodeURIComponent(parentNodeId)}!children`,
      nodeData
    );
    return data?.Response?.Node;
  }

  async updateNode(nodeId: string, nodeData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/node/${encodeURIComponent(nodeId)}`, nodeData);
    return data?.Response?.Node;
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
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get('/api/v2/node!search', params);
    return {
      items: data?.Response?.Node || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  // ===== Albums =====

  async getAlbum(albumKey: string): Promise<any> {
    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}`);
    return data?.Response?.Album;
  }

  async createAlbum(
    folderPath: string,
    nickname: string,
    albumData: Record<string, any>
  ): Promise<any> {
    let path = folderPath
      ? `/api/v2/folder/user/${encodeURIComponent(nickname)}/${folderPath}!albums`
      : `/api/v2/folder/user/${encodeURIComponent(nickname)}!albums`;
    let data = await this.post(path, albumData);
    return data?.Response?.Album;
  }

  async updateAlbum(albumKey: string, albumData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/album/${encodeURIComponent(albumKey)}`, albumData);
    return data?.Response?.Album;
  }

  async deleteAlbum(albumKey: string): Promise<void> {
    await this.delete(`/api/v2/album/${encodeURIComponent(albumKey)}`);
  }

  async getAlbumImages(
    albumKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}!images`, params);
    return {
      items: data?.Response?.AlbumImage || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async searchAlbums(
    text: string,
    scope?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = { Text: text };
    if (scope) params.Scope = scope;
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get('/api/v2/album!search', params);
    return {
      items: data?.Response?.Album || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async getAlbumShareUris(albumKey: string): Promise<any> {
    let data = await this.get(`/api/v2/album/${encodeURIComponent(albumKey)}!shareuris`);
    return data?.Response?.ShareUris;
  }

  // ===== Images =====

  async getImage(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0`);
    return data?.Response?.Image;
  }

  async updateImage(imageKey: string, imageData: Record<string, any>): Promise<any> {
    let data = await this.patch(`/api/v2/image/${encodeURIComponent(imageKey)}-0`, imageData);
    return data?.Response?.Image;
  }

  async deleteImage(imageKey: string): Promise<void> {
    await this.delete(`/api/v2/image/${encodeURIComponent(imageKey)}-0`);
  }

  async getImageMetadata(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0!metadata`);
    return data?.Response?.ImageMetadata;
  }

  async getImageSizes(imageKey: string): Promise<any> {
    let data = await this.get(`/api/v2/image/${encodeURIComponent(imageKey)}-0!sizedetails`);
    return data?.Response?.ImageSizeDetails;
  }

  async searchImages(
    text: string,
    scope?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = { Text: text };
    if (scope) params.Scope = scope;
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get('/api/v2/image!search', params);
    return {
      items: data?.Response?.Image || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
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
    let authHeader = this.getAuthHeader('POST', uploadUrl);

    let headers: Record<string, string> = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'X-Smug-AlbumUri': albumUri,
      'X-Smug-ResponseType': 'JSON',
      'X-Smug-Version': 'v2'
    };

    if (options?.fileName) headers['X-Smug-FileName'] = options.fileName;
    if (options?.title) headers['X-Smug-Title'] = options.title;
    if (options?.caption) headers['X-Smug-Caption'] = options.caption;
    if (options?.keywords) headers['X-Smug-Keywords'] = options.keywords;
    if (options?.hidden !== undefined) headers['X-Smug-Hidden'] = String(options.hidden);
    if (options?.replaceImageUri) headers['X-Smug-ImageUri'] = options.replaceImageUri;

    let httpClient = createAxios();

    // First download the image from the URL
    let imageResponse = await httpClient.get(sourceUrl, { responseType: 'arraybuffer' });

    let imageBuffer = Buffer.from(imageResponse.data);

    let md5 = await this.computeMd5(imageBuffer);
    headers['Content-Length'] = String(imageBuffer.length);
    headers['Content-MD5'] = md5;
    headers['Content-Type'] =
      headerValueToString(imageResponse.headers['content-type']) || 'application/octet-stream';

    // Re-generate auth header for the actual upload with proper content type
    headers.Authorization = this.getAuthHeader('POST', uploadUrl);

    let response = await httpClient.post(uploadUrl, imageBuffer, { headers });
    return response.data;
  }

  private async computeMd5(buffer: Uint8Array): Promise<string> {
    return crypto.createHash('md5').update(buffer).digest('base64');
  }

  // ===== Folders =====

  async getRootFolder(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/folder/user/${encodeURIComponent(nickname)}`);
    return data?.Response?.Folder;
  }

  async getFolder(nickname: string, folderPath: string): Promise<any> {
    let data = await this.get(
      `/api/v2/folder/user/${encodeURIComponent(nickname)}/${folderPath}`
    );
    return data?.Response?.Folder;
  }

  // ===== Comments =====

  async getAlbumComments(
    albumKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/album/${encodeURIComponent(albumKey)}!comments`,
      params
    );
    return {
      items: data?.Response?.Comment || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async getImageComments(
    imageKey: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/image/${encodeURIComponent(imageKey)}-0!comments`,
      params
    );
    return {
      items: data?.Response?.Comment || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  // ===== Watermarks =====

  async getUserWatermarks(nickname: string): Promise<any[]> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!watermarks`);
    return data?.Response?.Watermark || [];
  }

  // ===== Featured Albums & Popular Media =====

  async getFeaturedAlbums(nickname: string): Promise<any[]> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!features`);
    return data?.Response?.Feature || [];
  }

  async getRecentImages(
    nickname: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/user/${encodeURIComponent(nickname)}!recentimages`,
      params
    );
    return {
      items: data?.Response?.Image || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async getPopularMedia(
    nickname: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, string | number | undefined> = {};
    if (pagination?.start) params.start = pagination.start;
    if (pagination?.count) params.count = pagination.count;

    let data = await this.get(
      `/api/v2/user/${encodeURIComponent(nickname)}!popularmedia`,
      params
    );
    return {
      items: data?.Response?.Image || [],
      pages: data?.Response?.Pages || { total: 0, start: 1, count: 0 }
    };
  }

  async getTopKeywords(nickname: string): Promise<any> {
    let data = await this.get(`/api/v2/user/${encodeURIComponent(nickname)}!topkeywords`);
    return data?.Response?.TopKeywords;
  }
}
