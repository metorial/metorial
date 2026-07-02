import { createAxios } from 'slates';

let axiosInstance = createAxios({
  baseURL: 'https://api.currentsapi.services/v1'
});

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  published: string;
  language: string;
  category: string[];
  author: string;
  country: string[];
}

export interface NewsResponse {
  status: string;
  news: NewsArticle[];
  page: number;
}

export interface SourceInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string[];
  language: string[];
}

export interface SourcesResponse {
  status: string;
  sources: SourceInfo[];
}

export interface AvailableLanguagesResponse {
  status: string;
  languages: Record<string, string>;
}

export interface AvailableRegionsResponse {
  status: string;
  regions: Record<string, string>;
}

export interface AvailableCategoriesResponse {
  status: string;
  categories: string[];
}

export interface LatestNewsParams {
  language?: string;
  category?: string;
  country?: string;
  keywords?: string;
}

export interface SearchParams {
  keywords?: string;
  language?: string;
  country?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  type?: number;
  domain?: string;
  domainNot?: string;
  pageNumber?: number;
  pageSize?: number;
  limit?: number;
}

export interface SourceNewsParams {
  source: string;
  page?: number;
}

export interface SourcesParams {
  language?: string;
  category?: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getHeaders() {
    return {
      Authorization: this.token
    };
  }

  async getLatestNews(params: LatestNewsParams = {}): Promise<NewsResponse> {
    let queryParams: Record<string, string> = {};

    if (params.language) queryParams.language = params.language;
    if (params.category) queryParams.category = params.category;
    if (params.country) queryParams.country = params.country;
    if (params.keywords) queryParams.keywords = params.keywords;

    let response = await axiosInstance.get('/latest-news', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return response.data;
  }

  async searchNews(params: SearchParams = {}): Promise<NewsResponse> {
    let queryParams: Record<string, string | number> = {};

    if (params.keywords) queryParams.keywords = params.keywords;
    if (params.language) queryParams.language = params.language;
    if (params.country) queryParams.country = params.country;
    if (params.category) queryParams.category = params.category;
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.type) queryParams.type = params.type;
    if (params.domain) queryParams.domain = params.domain;
    if (params.domainNot) queryParams.domain_not = params.domainNot;
    if (params.pageNumber) queryParams.page_number = params.pageNumber;
    if (params.pageSize) queryParams.page_size = params.pageSize;
    if (params.limit) queryParams.limit = params.limit;

    let response = await axiosInstance.get('/search', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return response.data;
  }

  async getSourceNews(params: SourceNewsParams): Promise<NewsResponse> {
    let queryParams: Record<string, string | number> = {
      source: params.source
    };

    if (params.page) queryParams.page = params.page;

    let response = await axiosInstance.get('/source', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return response.data;
  }

  async getSources(params: SourcesParams = {}): Promise<SourcesResponse> {
    let queryParams: Record<string, string> = {};

    if (params.language) queryParams.language = params.language;
    if (params.category) queryParams.category = params.category;

    let response = await axiosInstance.get('/sources', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return response.data;
  }

  async getAvailableLanguages(): Promise<AvailableLanguagesResponse> {
    let response = await axiosInstance.get('/available/languages', {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getAvailableRegions(): Promise<AvailableRegionsResponse> {
    let response = await axiosInstance.get('/available/regions', {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getAvailableCategories(): Promise<AvailableCategoriesResponse> {
    let response = await axiosInstance.get('/available/categories', {
      headers: this.getHeaders()
    });

    return response.data;
  }
}
