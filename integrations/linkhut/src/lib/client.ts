import { createHash } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { linkhutApiError } from './errors';
import { bookmarkSchema } from './schemas';

export type Bookmark = z.infer<typeof bookmarkSchema>;

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

// Shared across invocation-local clients; expired entries are removed on the next request.
let nextRequestAt = new Map<string, number>();

let invalidResponse = (path: string) =>
  createApiServiceError(`Linkhut returned an invalid response at ${path}.`, {
    reason: 'linkhut_invalid_response'
  });

let readString = (data: Record<string, unknown>, key: string, path = key) => {
  if (typeof data[key] !== 'string') throw invalidResponse(path);
  return data[key];
};

let requireText = (value: string, name: string) => {
  if (!value.trim()) throw createApiServiceError(`${name} must not be empty.`);
};

let requireInteger = (value: number | undefined, name: string, min: number, max: number) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be an integer from ${min} to ${max}.`);
  }
};

let utcDate = (value: string | undefined, name: string, allowDate = false) => {
  if (value === undefined) return undefined;
  let normalized =
    allowDate && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  let parsed = Date.parse(normalized);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(normalized) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().replace('.000Z', 'Z') !== normalized
  ) {
    throw createApiServiceError(
      `${name} must be a valid UTC timestamp in YYYY-MM-DDTHH:mm:ssZ format${allowDate ? ' or a YYYY-MM-DD date' : ''}.`
    );
  }
  return normalized;
};

let mapPost = (value: unknown, index: number): Bookmark => {
  if (!isApiErrorRecord(value)) throw invalidResponse(`posts[${index}]`);
  let mapped = { ...value, tag: value.tags === undefined ? value.tag : value.tags };
  let result = bookmarkSchema.safeParse(mapped);
  if (!result.success)
    throw invalidResponse(
      `posts[${index}].${result.error.issues[0]?.path.join('.') ?? 'bookmark'}`
    );
  return result.data;
};

let readPosts = (value: unknown) => {
  if (!Array.isArray(value)) throw invalidResponse('posts');
  return value.map(mapPost);
};

let readCounts = (value: unknown, path: string): TagCount => {
  if (
    !isApiErrorRecord(value) ||
    Object.values(value).some(count => typeof count !== 'number' || !Number.isFinite(count))
  ) {
    throw invalidResponse(path);
  }
  return value as TagCount;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(config: { token: string }) {
    requireText(config.token, 'Linkhut access token');
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ln.ht/v1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter: error => linkhutApiError(error, [config.token])
    });
    let tokenKey = createHash('sha256').update(config.token).digest('hex');
    this.axios.interceptors.request.use(async request => {
      let now = Date.now();
      for (let [key, next] of nextRequestAt) if (next < now) nextRequestAt.delete(key);
      let scheduled = Math.max(now, nextRequestAt.get(tokenKey) ?? now);
      nextRequestAt.set(tokenKey, scheduled + 1000);
      if (scheduled > now) await new Promise(resolve => setTimeout(resolve, scheduled - now));
      return request;
    });
  }

  private async request(path: string, params?: Record<string, unknown>): Promise<unknown> {
    let response = await this.axios.get(path, { params });
    let data: unknown = response.data;
    let isTagDictionary = path === '/tags/get';
    if (
      isApiErrorRecord(data) &&
      ((data.error !== undefined && (!isTagDictionary || typeof data.error === 'string')) ||
        (data.result_code !== undefined &&
          data.result_code !== 'done' &&
          (!isTagDictionary || typeof data.result_code === 'string')))
    ) {
      throw linkhutApiError({ response: { status: response.status, data } }, [this.token]);
    }
    return data;
  }

  private async mutate(
    path: string,
    params: Record<string, unknown>
  ): Promise<{ resultCode: string }> {
    let data = await this.request(path, params);
    if (!isApiErrorRecord(data)) throw invalidResponse('result_code');
    return { resultCode: readString(data, 'result_code') };
  }

  async getLastUpdate(): Promise<{ updateTime: string }> {
    let data = await this.request('/posts/update');
    if (!isApiErrorRecord(data)) throw invalidResponse('update_time');
    return { updateTime: readString(data, 'update_time') };
  }

  async addBookmark(params: AddBookmarkParams): Promise<{ resultCode: string }> {
    requireText(params.url, 'url');
    requireText(params.description, 'title');
    return this.mutate(
      '/posts/add',
      pickDefined({ ...params, dt: utcDate(params.dt, 'timestamp') })
    );
  }

  async deleteBookmark(url: string): Promise<{ resultCode: string }> {
    requireText(url, 'url');
    return this.mutate('/posts/delete', { url });
  }

  private bookmarkEnvelope(data: unknown) {
    if (!isApiErrorRecord(data)) throw invalidResponse('response');
    if (data.date !== undefined && typeof data.date !== 'string')
      throw invalidResponse('date');
    if (data.user !== undefined && typeof data.user !== 'string')
      throw invalidResponse('user');
    return {
      ...(data.date === undefined ? {} : { date: data.date }),
      ...(data.user === undefined ? {} : { user: data.user }),
      posts: readPosts(data.posts),
      raw: data
    };
  }

  async getBookmarks(params: GetBookmarksParams = {}) {
    let hashes = params.hashes?.replace(/\+/g, ' ').replace(/%20/gi, ' ');
    return this.bookmarkEnvelope(
      await this.request(
        '/posts/get',
        pickDefined({ ...params, hashes, dt: utcDate(params.dt, 'date', true) })
      )
    );
  }

  async getRecentBookmarks(params: RecentBookmarksParams = {}) {
    requireInteger(params.count, 'count', 1, 100);
    return this.bookmarkEnvelope(await this.request('/posts/recent', pickDefined(params)));
  }

  async getAllBookmarks(
    params: AllBookmarksParams = {}
  ): Promise<{ posts: Bookmark[]; raw: unknown }> {
    requireInteger(params.start, 'start', 0, Number.MAX_SAFE_INTEGER);
    requireInteger(params.results, 'results', 1, 100000);
    let fromdt = utcDate(params.fromdt, 'fromDate');
    let todt = utcDate(params.todt, 'toDate');
    if (fromdt && todt && fromdt > todt)
      throw createApiServiceError('fromDate must not be later than toDate.');
    let data = await this.request('/posts/all', pickDefined({ ...params, fromdt, todt }));
    return {
      posts: readPosts(
        Array.isArray(data) ? data : isApiErrorRecord(data) ? data.posts : undefined
      ),
      raw: data
    };
  }

  async getBookmarkHashes(): Promise<{
    hashes: { url: string; meta: string }[];
    raw: unknown;
  }> {
    let data = await this.request('/posts/all', { hashes: '' });
    if (!Array.isArray(data)) throw invalidResponse('hashes');
    let hashes = data.map((value, index) => {
      if (!isApiErrorRecord(value)) throw invalidResponse(`hashes[${index}]`);
      return {
        url: readString(value, 'url', `hashes[${index}].url`),
        meta: readString(value, 'meta', `hashes[${index}].meta`)
      };
    });
    return { hashes, raw: data };
  }

  async getBookmarkDates(tag?: string): Promise<Record<string, number>> {
    let data = await this.request('/posts/dates', pickDefined({ tag }));
    if (!isApiErrorRecord(data)) throw invalidResponse('dates');
    return readCounts(data.dates, 'dates');
  }

  async getSuggestedTags(url: string): Promise<TagSuggestions> {
    requireText(url, 'url');
    let data = await this.request('/posts/suggest', { url });
    let combined: Record<string, unknown> = {};
    if (Array.isArray(data)) {
      for (let item of data) {
        if (!isApiErrorRecord(item)) throw invalidResponse('suggestions');
        Object.assign(combined, item);
      }
    } else if (isApiErrorRecord(data)) combined = data;
    else throw invalidResponse('suggestions');
    let schema = z.object({ popular: z.array(z.string()), recommended: z.array(z.string()) });
    let result = schema.safeParse(combined);
    if (!result.success)
      throw invalidResponse(result.error.issues[0]?.path.join('.') ?? 'suggestions');
    return result.data;
  }

  async getTags(): Promise<TagCount> {
    return readCounts(await this.request('/tags/get'), 'tags');
  }

  async deleteTag(tag: string): Promise<{ resultCode: string }> {
    requireText(tag, 'tag');
    return this.mutate('/tags/delete', { tag });
  }

  async renameTag(oldTag: string, newTag: string): Promise<{ resultCode: string }> {
    requireText(oldTag, 'tag');
    requireText(newTag, 'newTag');
    return this.mutate('/tags/rename', { old: oldTag, new: newTag });
  }
}
