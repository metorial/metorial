import { createAxios } from 'slates';

let algoliaAxios = createAxios({
  baseURL: 'https://hn.algolia.com/api/v1'
});

export interface AlgoliaSearchParams {
  query?: string;
  tags?: string;
  numericFilters?: string;
  hitsPerPage?: number;
  page?: number;
}

export interface AlgoliaHit {
  objectID: string;
  title?: string;
  url?: string;
  author: string;
  points?: number;
  story_text?: string;
  comment_text?: string;
  num_comments?: number;
  story_id?: number;
  story_title?: string;
  story_url?: string;
  parent_id?: number;
  created_at: string;
  created_at_i: number;
  _tags: string[];
  _highlightResult?: Record<string, unknown>;
}

export interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
}

export interface AlgoliaItem {
  id: number;
  created_at: string;
  created_at_i: number;
  type: string;
  author: string;
  title?: string;
  url?: string;
  text?: string;
  points?: number;
  parent_id?: number;
  story_id?: number;
  children: AlgoliaItem[];
}

export interface AlgoliaUser {
  username: string;
  about?: string;
  karma: number;
  created_at: string;
  created_at_i: number;
  avg?: number;
  delay?: number;
  submitted: number;
  updated_at: string;
  submission_count: number;
  comment_count: number;
  objectID: string;
}

export class SearchClient {
  async search(params: AlgoliaSearchParams): Promise<AlgoliaSearchResponse> {
    let queryParams = new URLSearchParams();
    if (params.query) queryParams.set('query', params.query);
    if (params.tags) queryParams.set('tags', params.tags);
    if (params.numericFilters) queryParams.set('numericFilters', params.numericFilters);
    if (params.hitsPerPage !== undefined)
      queryParams.set('hitsPerPage', String(params.hitsPerPage));
    if (params.page !== undefined) queryParams.set('page', String(params.page));

    let response = await algoliaAxios.get(`/search?${queryParams.toString()}`);
    return response.data;
  }

  async searchByDate(params: AlgoliaSearchParams): Promise<AlgoliaSearchResponse> {
    let queryParams = new URLSearchParams();
    if (params.query) queryParams.set('query', params.query);
    if (params.tags) queryParams.set('tags', params.tags);
    if (params.numericFilters) queryParams.set('numericFilters', params.numericFilters);
    if (params.hitsPerPage !== undefined)
      queryParams.set('hitsPerPage', String(params.hitsPerPage));
    if (params.page !== undefined) queryParams.set('page', String(params.page));

    let response = await algoliaAxios.get(`/search_by_date?${queryParams.toString()}`);
    return response.data;
  }

  async getItem(itemId: number): Promise<AlgoliaItem> {
    let response = await algoliaAxios.get(`/items/${itemId}`);
    return response.data;
  }

  async getUser(username: string): Promise<AlgoliaUser> {
    let response = await algoliaAxios.get(`/users/${username}`);
    return response.data;
  }
}
