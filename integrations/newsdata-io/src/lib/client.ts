import { createAxios } from 'slates';

let BASE_URL = 'https://newsapi.org/v2';

export interface ArticleSearchParams {
  q?: string;
  searchIn?: string;
  sources?: string;
  domains?: string;
  excludeDomains?: string;
  from?: string;
  to?: string;
  language?: string;
  sortBy?: string;
  pageSize?: number;
  page?: number;
}

export interface TopHeadlinesParams {
  q?: string;
  country?: string;
  category?: string;
  sources?: string;
  pageSize?: number;
  page?: number;
}

export interface SourcesParams {
  category?: string;
  language?: string;
  country?: string;
}

export interface Article {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface Source {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  language: string;
  country: string;
}

export interface ArticlesResponse {
  status: string;
  totalResults: number;
  articles: Article[];
}

export interface SourcesResponse {
  status: string;
  sources: Source[];
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-Api-Key': config.token
      }
    });
  }

  async searchArticles(params: ArticleSearchParams): Promise<ArticlesResponse> {
    let response = await this.http.get('/everything', { params });
    return response.data;
  }

  async getTopHeadlines(params: TopHeadlinesParams): Promise<ArticlesResponse> {
    let response = await this.http.get('/top-headlines', { params });
    return response.data;
  }

  async getSources(params: SourcesParams): Promise<SourcesResponse> {
    let response = await this.http.get('/top-headlines/sources', { params });
    return response.data;
  }
}
