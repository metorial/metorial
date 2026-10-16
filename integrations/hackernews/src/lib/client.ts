import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import { parseResponse, validateInteger } from './validation';

let firebaseAxios = createAxios({
  baseURL: 'https://hacker-news.firebaseio.com/v0',
  timeout: 30_000
});

let itemSchema = z
  .object({
    id: z.number(),
    type: z.enum(['story', 'comment', 'job', 'poll', 'pollopt']).optional(),
    by: z.string().optional(),
    time: z.number().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
    score: z.number().optional(),
    title: z.string().optional(),
    kids: z.array(z.number()).optional(),
    descendants: z.number().optional(),
    parent: z.number().optional(),
    poll: z.number().optional(),
    parts: z.array(z.number()).optional(),
    deleted: z.boolean().optional(),
    dead: z.boolean().optional()
  })
  .passthrough();

let userSchema = z
  .object({
    id: z.string(),
    created: z.number().optional(),
    karma: z.number(),
    about: z.string().optional(),
    submitted: z.array(z.number()).optional()
  })
  .passthrough();

let updatesSchema = z.object({ items: z.array(z.number()), profiles: z.array(z.string()) });

export type HNItemType = NonNullable<HNItem['type']>;
export type HNItem = z.infer<typeof itemSchema>;
export type HNUser = z.infer<typeof userSchema>;
export type HNUpdates = z.infer<typeof updatesSchema>;
export type StoryListType = 'top' | 'new' | 'best' | 'ask' | 'show' | 'job';

let storyListPaths: Record<StoryListType, string> = {
  top: '/topstories.json',
  new: '/newstories.json',
  best: '/beststories.json',
  ask: '/askstories.json',
  show: '/showstories.json',
  job: '/jobstories.json'
};

export class HNClient {
  private async get<T>(path: string, schema: z.ZodType<T>, operation: string): Promise<T> {
    try {
      let response = await firebaseAxios.get(path);
      return parseResponse(schema, response.data, operation);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Hacker News',
        reason: 'hackernews_request_failed',
        operation,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  async getItem(itemId: number): Promise<HNItem | null> {
    validateInteger(itemId, 'itemId');
    let item = await this.get(`/item/${itemId}.json`, itemSchema.nullable(), 'item lookup');
    if (item && item.id !== itemId) {
      throw createApiServiceError('Hacker News returned a different item than requested.');
    }
    return item;
  }

  async getItems(itemIds: number[]): Promise<HNItem[]> {
    let results = await Promise.all(itemIds.map(id => this.getItem(id)));
    return results.filter((item): item is HNItem => item !== null);
  }

  async getUser(username: string): Promise<HNUser | null> {
    if (!username.trim()) throw createApiServiceError('Provide a Hacker News username.');
    let user = await this.get(
      `/user/${encodeURIComponent(username)}.json`,
      userSchema.nullable(),
      'user lookup'
    );
    if (user && user.id !== username) {
      throw createApiServiceError('Hacker News returned a different user than requested.');
    }
    return user;
  }

  async getStoryIds(listType: StoryListType): Promise<number[]> {
    return this.get(storyListPaths[listType], z.array(z.number()), 'story listing');
  }

  async getMaxItemId(): Promise<number> {
    return this.get('/maxitem.json', z.number().int().positive(), 'maximum item ID');
  }

  async getUpdates(): Promise<HNUpdates> {
    return this.get('/updates.json', updatesSchema, 'updates feed');
  }
}
