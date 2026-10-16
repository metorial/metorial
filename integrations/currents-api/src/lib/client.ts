import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let toServiceError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Currents',
    reason: 'currents_api_request_failed',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['msg', 'message', 'error', 'code'],
    nestedKeys: ['details', 'errors'],
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.code === 'string'
        ? response.data.code
        : undefined
  });

let axiosInstance = createAuthenticatedAxios({
  baseURL: 'https://api.currentsapi.services/v1',
  contentType: false,
  errorAdapter: toServiceError
});

axiosInstance.interceptors.response.use(response => {
  let data: unknown = response.data;
  if (isApiErrorRecord(data) && (data.status === 'error' || Number(data.status) >= 400)) {
    throw toServiceError({ response });
  }
  return response;
});

export type RawResponse = Record<string, unknown>;
export type ApiVersion = 'v1' | 'v2';

export interface CurrentNewsResponse extends RawResponse {
  news: RawResponse[];
  page: number;
  next_cursor?: string | null;
}

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

export interface NewsResponse extends RawResponse {
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
  query?: string;
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
  author?: string;
  hasImage?: boolean;
  hasDescription?: boolean;
}

export interface CurrentSearchParams extends SearchParams {
  cursor?: string;
}

export interface CurrentLatestParams extends Omit<LatestNewsParams, 'keywords'> {
  domain?: string;
  domainNot?: string;
  author?: string;
  type?: number;
  pageNumber?: number;
  pageSize?: number;
}

export let validatePagination = (params: {
  pageNumber?: number;
  pageSize?: number;
  limit?: number;
  type?: number;
}) => {
  for (let [name, value, maximum] of [
    ['pageNumber', params.pageNumber, 180],
    ['pageSize', params.pageSize, 300],
    ['limit', params.limit, 300]
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > maximum)) {
      throw createApiServiceError(`${name} must be an integer from 1 to ${maximum}.`);
    }
  }
  if (params.type !== undefined && ![1, 2, 3].includes(params.type)) {
    throw createApiServiceError(
      'contentType must be 1 (news), 2 (articles), or 3 (discussion).'
    );
  }
};

let readCurrentNewsResponse = (result: CurrentNewsResponse) => {
  if (
    !isApiErrorRecord(result) ||
    !Array.isArray(result.news) ||
    typeof result.page !== 'number'
  ) {
    throw createApiServiceError(
      'Currents returned an unexpected news response without articles or a page number.'
    );
  }
  return result;
};

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
    validatePagination({ limit: params.limit });
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
    if (params.query) queryParams.query = params.query;
    if (params.author) queryParams.author = params.author;
    // These are presence filters: even a false value would enable the provider filter.
    if (params.hasImage === true) queryParams.has_image = 'true';
    if (params.hasDescription === true) queryParams.has_description = 'true';

    let response = await axiosInstance.get('/search', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return response.data;
  }

  async getCurrentLatestNews(params: CurrentLatestParams): Promise<CurrentNewsResponse> {
    validatePagination(params);
    let response = await axiosInstance.get<CurrentNewsResponse>('/latest-news', {
      headers: this.getHeaders(),
      params: {
        language: params.language,
        category: params.category,
        country: params.country,
        domain: params.domain,
        domain_not: params.domainNot,
        author: params.author,
        type: params.type,
        page_number: params.pageNumber,
        page_size: params.pageSize
      }
    });
    return readCurrentNewsResponse(response.data);
  }

  async searchNewsV2(params: CurrentSearchParams): Promise<CurrentNewsResponse> {
    validatePagination(params);
    let response = await axiosInstance.get<CurrentNewsResponse>('/v2/search', {
      baseURL: 'https://api.currentsapi.services',
      headers: this.getHeaders(),
      params: {
        keywords: params.keywords,
        query: params.query,
        language: params.language,
        country: params.country,
        category: params.category,
        start_date: params.startDate,
        end_date: params.endDate,
        type: params.type,
        domain: params.domain,
        domain_not: params.domainNot,
        author: params.author,
        page_number: params.pageNumber,
        page_size: params.pageSize,
        limit: params.limit,
        cursor: params.cursor,
        has_image: params.hasImage === true ? 'true' : undefined,
        has_description: params.hasDescription === true ? 'true' : undefined
      }
    });
    return readCurrentNewsResponse(response.data);
  }

  async checkApiKey(): Promise<RawResponse> {
    let response = await axiosInstance.get<RawResponse>('/auth', {
      headers: this.getHeaders()
    });
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('Currents returned an unexpected API key check response.');
    }
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

  async getAvailableLanguages(
    apiVersion: ApiVersion = 'v1'
  ): Promise<AvailableLanguagesResponse> {
    let response = await axiosInstance.get(`/${apiVersion}/available/languages`, {
      baseURL: 'https://api.currentsapi.services',
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getAvailableRegions(apiVersion: ApiVersion = 'v1'): Promise<AvailableRegionsResponse> {
    let response = await axiosInstance.get(`/${apiVersion}/available/regions`, {
      baseURL: 'https://api.currentsapi.services',
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getAvailableCategories(
    apiVersion: ApiVersion = 'v1'
  ): Promise<AvailableCategoriesResponse> {
    let response = await axiosInstance.get(`/${apiVersion}/available/categories`, {
      baseURL: 'https://api.currentsapi.services',
      headers: this.getHeaders()
    });

    return response.data;
  }
}
