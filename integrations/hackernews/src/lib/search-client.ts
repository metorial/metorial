import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import { parseResponse, validateInteger } from './validation';

let algoliaAxios = createAxios({ baseURL: 'https://hn.algolia.com/api/v1', timeout: 30_000 });

export interface AlgoliaSearchParams {
  query?: string;
  tags?: string;
  numericFilters?: string;
  hitsPerPage?: number;
  page?: number;
}

let hitSchema = z
  .object({
    objectID: z.string(),
    title: z.string().nullish(),
    url: z.string().nullish(),
    author: z.string(),
    points: z.number().nullish(),
    story_text: z.string().nullish(),
    comment_text: z.string().nullish(),
    num_comments: z.number().nullish(),
    story_id: z.number().nullish(),
    story_title: z.string().nullish(),
    story_url: z.string().nullish(),
    parent_id: z.number().nullish(),
    created_at: z.string(),
    _tags: z.array(z.string())
  })
  .passthrough();

let searchSchema = z
  .object({
    hits: z.array(hitSchema),
    nbHits: z.number(),
    page: z.number(),
    nbPages: z.number()
  })
  .passthrough();

export interface AlgoliaItem extends Record<string, unknown> {
  id: number;
  created_at?: string | null;
  created_at_i?: number | null;
  type?: string;
  author?: string | null;
  title?: string | null;
  url?: string | null;
  text?: string | null;
  points?: number | null;
  parent_id?: number | null;
  story_id?: number | null;
  children: AlgoliaItem[];
}

let itemSchema: z.ZodType<AlgoliaItem> = z.lazy(() =>
  z
    .object({
      id: z.number(),
      created_at: z.string().nullish(),
      created_at_i: z.number().nullish(),
      type: z.string().optional(),
      author: z.string().nullish(),
      title: z.string().nullish(),
      url: z.string().nullish(),
      text: z.string().nullish(),
      points: z.number().nullish(),
      parent_id: z.number().nullish(),
      story_id: z.number().nullish(),
      children: z.array(itemSchema)
    })
    .passthrough()
);

// Profile tools use Firebase; keep the existing Algolia user route available to client consumers.
let userSchema = z
  .object({ username: z.string(), about: z.string().nullish(), karma: z.number() })
  .passthrough();

export type AlgoliaHit = z.infer<typeof hitSchema>;
export type AlgoliaSearchResponse = z.infer<typeof searchSchema>;
export type AlgoliaUser = z.infer<typeof userSchema>;

export class SearchClient {
  private async get<T>(path: string, schema: z.ZodType<T>, params?: AlgoliaSearchParams) {
    try {
      let response = await algoliaAxios.get(path, { params });
      return parseResponse(schema, response.data, 'search API');
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Hacker News search',
        reason: 'hackernews_search_failed',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async search(params: AlgoliaSearchParams): Promise<AlgoliaSearchResponse> {
    return this.get('/search', searchSchema, params);
  }

  async searchByDate(params: AlgoliaSearchParams): Promise<AlgoliaSearchResponse> {
    return this.get('/search_by_date', searchSchema, params);
  }

  async getItem(itemId: number): Promise<AlgoliaItem> {
    validateInteger(itemId, 'storyId');
    let item = await this.get(`/items/${itemId}`, itemSchema);
    if (item.id !== itemId) {
      throw createApiServiceError(
        'Hacker News search returned a different item than requested.'
      );
    }
    return item;
  }

  async getUser(username: string): Promise<AlgoliaUser> {
    if (!username.trim()) throw createApiServiceError('Provide a Hacker News username.');
    return this.get(`/users/${encodeURIComponent(username)}`, userSchema);
  }
}
