import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let dotSimpleApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'DotSimple',
    reason: 'dotsimple_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
  });

export let getCollection = (result: unknown): any[] => {
  if (Array.isArray(result)) return result;
  if (isApiErrorRecord(result) && Array.isArray(result.data)) return result.data;
  throw createApiServiceError(
    'DotSimple returned a response without the expected collection.'
  );
};

export let getMediaId = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  let id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) {
    throw createApiServiceError('DotSimple returned an invalid numeric media file ID.');
  }
  return id;
};

let validatePage = (page: number) => {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw createApiServiceError('Page must be a positive whole number.');
  }
};

let pathId = (id: string) => {
  if (!id.trim()) throw createApiServiceError('A nonempty resource identifier is required.');
  return encodeURIComponent(id);
};

export class DotSimpleClient {
  private axios;

  constructor(params: { token: string; workspaceId?: string }) {
    if (!params.workspaceId?.trim()) {
      throw createApiServiceError(
        'Provide workspaceId for this tool or select a default workspace in connection settings. Find the workspace ID in your DotSimple workspace URL.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: `https://app.dotsimple.io/app/api/${pathId(params.workspaceId)}`,
      authHeader: { value: `Bearer ${params.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: dotSimpleApiError
    });
    this.axios.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (
        isApiErrorRecord(body) &&
        (body.success === false ||
          (typeof body.error === 'string' && body.error.trim().length > 0) ||
          isApiErrorRecord(body.error))
      ) {
        throw dotSimpleApiError({ response: { status: response.status, data: body } });
      }
      return response;
    });
  }

  // Posts

  async listPosts(page: number = 1) {
    validatePage(page);
    let response = await this.axios.get('/posts', {
      params: { page }
    });
    return response.data;
  }

  async getPost(postUuid: string) {
    let response = await this.axios.get(`/posts/${pathId(postUuid)}`);
    return response.data;
  }

  async createPost(data: {
    date?: string;
    time?: string;
    timezone?: string;
    schedule?: boolean;
    schedule_now?: boolean;
    queue?: boolean;
    accounts: number[];
    tags?: number[];
    versions: Array<{
      account_id: number;
      is_original: boolean;
      content: Array<{
        body: string;
        url?: string;
        media?: number[];
      }>;
      options?: Record<string, unknown>;
    }>;
  }) {
    let response = await this.axios.post('/posts', data);
    return response.data;
  }

  async updatePost(
    postUuid: string,
    data: {
      date?: string;
      time?: string;
      timezone?: string;
      schedule?: boolean;
      schedule_now?: boolean;
      queue?: boolean;
      accounts?: number[];
      tags?: number[];
      versions?: Array<{
        account_id: number;
        is_original: boolean;
        content: Array<{
          body: string;
          url?: string;
          media?: number[];
        }>;
        options?: Record<string, unknown>;
      }>;
    }
  ) {
    let response = await this.axios.put(`/posts/${pathId(postUuid)}`, data);
    return response.data;
  }

  async schedulePost(postUuid: string, postNow: boolean) {
    let response = await this.axios.post(`/posts/schedule/${pathId(postUuid)}`, { postNow });
    return response.data;
  }

  async addPostToQueue(postUuid: string) {
    let response = await this.axios.post(`/posts/add-to-queue/${pathId(postUuid)}`, {});
    return response.data;
  }

  async deletePost(postUuid: string) {
    let response = await this.axios.delete(`/posts/${pathId(postUuid)}`);
    return response.data;
  }

  async deletePosts(postUuids: string[]) {
    let response = await this.axios.delete('/posts', {
      data: { posts: postUuids }
    });
    return response.data;
  }

  // Accounts

  async listAccounts() {
    let response = await this.axios.get('/accounts');
    return response.data;
  }

  async getAccount(accountUuid: string) {
    let response = await this.axios.get(`/accounts/${pathId(accountUuid)}`);
    return response.data;
  }

  // Media

  async listMedia(page: number = 1) {
    validatePage(page);
    let response = await this.axios.get('/media', {
      params: { page }
    });
    return response.data;
  }

  async getMediaFile(mediaUuid: string) {
    let response = await this.axios.get(`/media/${pathId(mediaUuid)}`);
    return response.data;
  }

  async uploadMedia(file: Uint8Array, filename: string, mimeType: string) {
    let body = new FormData();
    body.append('file', new Blob([file], { type: mimeType }), filename);
    let response = await this.axios.post('/media', body, {
      headers: { 'Content-Type': undefined }
    });
    return response.data;
  }

  async deleteMediaFiles(items: number[]) {
    if (items.some(id => !Number.isSafeInteger(id) || id < 1)) {
      throw createApiServiceError('Media file IDs must be positive whole numbers.');
    }
    let response = await this.axios.delete('/media', {
      data: { items }
    });
    return response.data;
  }

  // Tags

  async listTags() {
    let response = await this.axios.get('/tags');
    return response.data;
  }

  async getTag(tagUuid: string) {
    let response = await this.axios.get(`/tags/${pathId(tagUuid)}`);
    return response.data;
  }

  async createTag(data: { name: string; hex_color: string }) {
    let response = await this.axios.post('/tags', data);
    return response.data;
  }

  async deleteTag(tagUuid: string) {
    let response = await this.axios.delete(`/tags/${pathId(tagUuid)}`);
    return response.data;
  }

  // Reports

  async listReports(page: number = 1) {
    validatePage(page);
    let response = await this.axios.get('/reports', {
      params: { page }
    });
    return response.data;
  }

  // Autoresponders

  async listAutoresponders(page: number = 1) {
    validatePage(page);
    let response = await this.axios.get('/autoresponders', {
      params: { page }
    });
    return response.data;
  }
}
