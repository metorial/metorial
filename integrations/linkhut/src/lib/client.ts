import { createAxios } from 'slates';

export interface Bookmark {
  href: string;
  description: string;
  extended: string;
  hash: string;
  tag: string;
  time: string;
  shared: string;
  toread: string;
  meta?: string;
}

export interface AddBookmarkParams {
  url: string;
  description: string;
  extended?: string;
  tags?: string;
  dt?: string;
  replace?: string;
  shared?: string;
  toread?: string;
}

export interface GetBookmarksParams {
  tag?: string;
  dt?: string;
  url?: string;
  hashes?: string;
  meta?: string;
}

export interface RecentBookmarksParams {
  tag?: string;
  count?: number;
}

export interface AllBookmarksParams {
  tag?: string;
  start?: number;
  results?: number;
  fromdt?: string;
  todt?: string;
  meta?: string;
}

export interface TagCount {
  [tag: string]: number;
}

export interface TagSuggestions {
  popular: string[];
  recommended: string[];
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.ln.ht/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  async getLastUpdate(): Promise<{ updateTime: string }> {
    let response = await this.axios.get('/posts/update');
    return { updateTime: response.data.update_time };
  }

  async addBookmark(params: AddBookmarkParams): Promise<{ resultCode: string }> {
    let queryParams: Record<string, string> = {
      url: params.url,
      description: params.description
    };
    if (params.extended) queryParams.extended = params.extended;
    if (params.tags) queryParams.tags = params.tags;
    if (params.dt) queryParams.dt = params.dt;
    if (params.replace) queryParams.replace = params.replace;
    if (params.shared) queryParams.shared = params.shared;
    if (params.toread) queryParams.toread = params.toread;

    let response = await this.axios.get('/posts/add', { params: queryParams });
    return { resultCode: response.data.result_code };
  }

  async deleteBookmark(url: string): Promise<{ resultCode: string }> {
    let response = await this.axios.get('/posts/delete', { params: { url } });
    return { resultCode: response.data.result_code };
  }

  async getBookmarks(
    params: GetBookmarksParams = {}
  ): Promise<{ date: string; user: string; posts: Bookmark[] }> {
    let queryParams: Record<string, string> = {};
    if (params.tag) queryParams.tag = params.tag;
    if (params.dt) queryParams.dt = params.dt;
    if (params.url) queryParams.url = params.url;
    if (params.hashes) queryParams.hashes = params.hashes;
    if (params.meta) queryParams.meta = params.meta;

    let response = await this.axios.get('/posts/get', { params: queryParams });
    return {
      date: response.data.date,
      user: response.data.user,
      posts: (response.data.posts || []).map(mapPost)
    };
  }

  async getRecentBookmarks(
    params: RecentBookmarksParams = {}
  ): Promise<{ date: string; user: string; posts: Bookmark[] }> {
    let queryParams: Record<string, string | number> = {};
    if (params.tag) queryParams.tag = params.tag;
    if (params.count !== undefined) queryParams.count = params.count;

    let response = await this.axios.get('/posts/recent', { params: queryParams });
    return {
      date: response.data.date,
      user: response.data.user,
      posts: (response.data.posts || []).map(mapPost)
    };
  }

  async getAllBookmarks(params: AllBookmarksParams = {}): Promise<Bookmark[]> {
    let queryParams: Record<string, string | number> = {};
    if (params.tag) queryParams.tag = params.tag;
    if (params.start !== undefined) queryParams.start = params.start;
    if (params.results !== undefined) queryParams.results = params.results;
    if (params.fromdt) queryParams.fromdt = params.fromdt;
    if (params.todt) queryParams.todt = params.todt;
    if (params.meta) queryParams.meta = params.meta;

    let response = await this.axios.get('/posts/all', { params: queryParams });
    let posts = Array.isArray(response.data) ? response.data : response.data.posts || [];
    return posts.map(mapPost);
  }

  async getBookmarkDates(tag?: string): Promise<Record<string, number>> {
    let queryParams: Record<string, string> = {};
    if (tag) queryParams.tag = tag;

    let response = await this.axios.get('/posts/dates', { params: queryParams });
    return response.data.dates || response.data;
  }

  async getSuggestedTags(url: string): Promise<TagSuggestions> {
    let response = await this.axios.get('/posts/suggest', { params: { url } });
    let data = response.data;

    let popular: string[] = [];
    let recommended: string[] = [];

    if (Array.isArray(data)) {
      for (let item of data) {
        if (item.popular) popular = Array.isArray(item.popular) ? item.popular : [];
        if (item.recommended)
          recommended = Array.isArray(item.recommended) ? item.recommended : [];
      }
    } else {
      popular = data.popular || [];
      recommended = data.recommended || [];
    }

    return { popular, recommended };
  }

  async getTags(): Promise<TagCount> {
    let response = await this.axios.get('/tags/get');
    return response.data;
  }

  async deleteTag(tag: string): Promise<{ resultCode: string }> {
    let response = await this.axios.get('/tags/delete', { params: { tag } });
    return { resultCode: response.data.result_code || response.data.result };
  }

  async renameTag(oldTag: string, newTag: string): Promise<{ resultCode: string }> {
    let response = await this.axios.get('/tags/rename', {
      params: { old: oldTag, new: newTag }
    });
    return { resultCode: response.data.result_code || response.data.result };
  }
}

let mapPost = (post: any): Bookmark => ({
  href: post.href || '',
  description: post.description || '',
  extended: post.extended || '',
  hash: post.hash || '',
  tag: post.tag || post.tags || '',
  time: post.time || '',
  shared: post.shared || 'yes',
  toread: post.toread || 'no',
  meta: post.meta
});
