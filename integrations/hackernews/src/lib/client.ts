import { createAxios } from 'slates';

let firebaseAxios = createAxios({
  baseURL: 'https://hacker-news.firebaseio.com/v0'
});

export type HNItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export interface HNItem {
  id: number;
  type?: HNItemType;
  by?: string;
  time?: number;
  text?: string;
  url?: string;
  score?: number;
  title?: string;
  kids?: number[];
  descendants?: number;
  parent?: number;
  poll?: number;
  parts?: number[];
  deleted?: boolean;
  dead?: boolean;
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export interface HNUpdates {
  items: number[];
  profiles: string[];
}

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
  async getItem(itemId: number): Promise<HNItem | null> {
    let response = await firebaseAxios.get(`/item/${itemId}.json`);
    return response.data;
  }

  async getItems(itemIds: number[]): Promise<HNItem[]> {
    let results = await Promise.all(itemIds.map(id => this.getItem(id)));
    return results.filter((item): item is HNItem => item !== null);
  }

  async getUser(username: string): Promise<HNUser | null> {
    let response = await firebaseAxios.get(`/user/${username}.json`);
    return response.data;
  }

  async getStoryIds(listType: StoryListType): Promise<number[]> {
    let path = storyListPaths[listType];
    let response = await firebaseAxios.get(path);
    return response.data || [];
  }

  async getMaxItemId(): Promise<number> {
    let response = await firebaseAxios.get('/maxitem.json');
    return response.data;
  }

  async getUpdates(): Promise<HNUpdates> {
    let response = await firebaseAxios.get('/updates.json');
    return response.data;
  }
}
