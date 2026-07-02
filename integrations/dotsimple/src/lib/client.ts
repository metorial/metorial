import { createAxios } from 'slates';

export class DotSimpleClient {
  private axios;

  constructor(private params: { token: string; workspaceId: string }) {
    this.axios = createAxios({
      baseURL: `https://app.dotsimple.io/app/api/${params.workspaceId}`
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.params.token}`
    };
  }

  // Posts

  async listPosts(page: number = 1) {
    let response = await this.axios.get('/posts', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async getPost(postUuid: string) {
    let response = await this.axios.get(`/posts/${postUuid}`, {
      headers: this.headers
    });
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
    let response = await this.axios.post('/posts', data, {
      headers: this.headers
    });
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
    let response = await this.axios.put(`/posts/${postUuid}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async schedulePost(postUuid: string, postNow: boolean) {
    let response = await this.axios.post(
      `/posts/schedule/${postUuid}`,
      { postNow },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async addPostToQueue(postUuid: string) {
    let response = await this.axios.post(
      `/posts/add-to-queue/${postUuid}`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deletePost(postUuid: string) {
    let response = await this.axios.delete(`/posts/${postUuid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePosts(postUuids: string[]) {
    let response = await this.axios.delete('/posts', {
      headers: this.headers,
      data: { posts: postUuids }
    });
    return response.data;
  }

  // Accounts

  async listAccounts() {
    let response = await this.axios.get('/accounts', {
      headers: this.headers
    });
    return response.data;
  }

  async getAccount(accountUuid: string) {
    let response = await this.axios.get(`/accounts/${accountUuid}`, {
      headers: this.headers
    });
    return response.data;
  }

  // Media

  async listMedia(page: number = 1) {
    let response = await this.axios.get('/media', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async getMediaFile(mediaUuid: string) {
    let response = await this.axios.get(`/media/${mediaUuid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteMediaFiles(items: number[]) {
    let response = await this.axios.delete('/media', {
      headers: this.headers,
      data: { items }
    });
    return response.data;
  }

  // Tags

  async listTags() {
    let response = await this.axios.get('/tags', {
      headers: this.headers
    });
    return response.data;
  }

  async getTag(tagUuid: string) {
    let response = await this.axios.get(`/tags/${tagUuid}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTag(data: { name: string; hex_color: string }) {
    let response = await this.axios.post('/tags', data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTag(tagUuid: string) {
    let response = await this.axios.delete(`/tags/${tagUuid}`, {
      headers: this.headers
    });
    return response.data;
  }

  // Reports

  async listReports(page: number = 1) {
    let response = await this.axios.get('/reports', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  // Autoresponders

  async listAutoresponders(page: number = 1) {
    let response = await this.axios.get('/autoresponders', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }
}
