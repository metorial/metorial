import { buildApiServiceError, createAxios } from 'slates';

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

  private async get<T>(path: string, params: object): Promise<T> {
    try {
      let response = await this.http.get<T & { status?: string }>(path, { params });
      if (response.data.status === 'error') {
        throw buildApiServiceError(
          { response: { status: response.status, data: response.data } },
          {
            providerLabel: 'NewsAPI',
            reason: 'newsapi_request_failed',
            operation: path,
            extractUpstreamCode: (_error, response, helpers) =>
              helpers.isRecord(response?.data) && typeof response.data.code === 'string'
                ? response.data.code
                : undefined
          }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'NewsAPI',
        reason: 'newsapi_request_failed',
        operation: path,
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        extractUpstreamCode: (_error, response, helpers) =>
          helpers.isRecord(response?.data) && typeof response.data.code === 'string'
            ? response.data.code
            : undefined
      });
    }
  }

  async searchArticles(params: ArticleSearchParams): Promise<ArticlesResponse> {
    return this.get('/everything', params);
  }

  async getTopHeadlines(params: TopHeadlinesParams): Promise<ArticlesResponse> {
    return this.get('/top-headlines', params);
  }

  async getSources(params: SourcesParams): Promise<SourcesResponse> {
    return this.get('/top-headlines/sources', params);
  }
}
