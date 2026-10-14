import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export interface SerplyClientConfig {
  token: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface SearchParams {
  query: string;
  num?: number;
  start?: number;
  lr?: string;
  hl?: string;
  proxyLocation?: string;
  deviceType?: string;
  ceid?: string;
  resolveLinks?: boolean;
}

export interface SerpRankingParams {
  query: string;
  domain: string;
  num?: number;
  proxyLocation?: string;
  deviceType?: string;
}

export interface JobSearchParams {
  query: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface ProductSearchParams {
  query: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface MapsSearchParams {
  query: string;
  num?: number;
  hl?: string;
  gl?: string;
}

export class Client {
  private token: string;
  private defaultProxyLocation?: string;
  private defaultDeviceType?: string;

  constructor(config: SerplyClientConfig) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Serply API key is required. Reconnect with your API key.',
        {
          reason: 'missing_api_key'
        }
      );
    }
    this.token = config.token;
    this.defaultProxyLocation = config.proxyLocation;
    this.defaultDeviceType = config.deviceType;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.serply.io',
      timeout: 60000,
      errorMapping: {
        extractResponseData: response =>
          isApiErrorRecord(response.data)
            ? { ...response.data, message: response.data.detail ?? response.data.message }
            : response.data
      }
    });
  }

  private validateSearch(params: { query: string; num?: number; start?: number }) {
    if (!params.query.trim()) {
      throw createApiServiceError('Enter a non-empty search query.', {
        reason: 'invalid_search_query'
      });
    }
    for (let [key, value, minimum] of [
      ['num', params.num, 1],
      ['start', params.start, 0]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum)) {
        throw createApiServiceError(`${key} must be a whole number of at least ${minimum}.`, {
          reason: 'invalid_search_pagination'
        });
      }
    }
  }

  private async get(
    path: string,
    params: { proxyLocation?: string; deviceType?: string } = {},
    queryParams?: Record<string, string | number | boolean>,
    headers?: Record<string, string>
  ) {
    let data = await requestAxiosData<unknown>(
      'search',
      () =>
        this.getAxios().get(path, {
          headers: headers ?? this.buildHeaders(params.proxyLocation, params.deviceType),
          params: queryParams
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Serply',
          reason: 'serply_api_error',
          operation
        })
    );
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('Serply returned an invalid search response. Try again.', {
        reason: 'invalid_serply_response'
      });
    }
    return data;
  }

  private buildHeaders(proxyLocation?: string, deviceType?: string): Record<string, string> {
    let headers: Record<string, string> = {
      'X-Api-Key': this.token
    };

    let location = proxyLocation || this.defaultProxyLocation;
    if (location) {
      headers['X-Proxy-Location'] = location;
    }

    let device = deviceType || this.defaultDeviceType;
    if (device) {
      headers['X-User-Agent'] = device;
    }

    return headers;
  }

  private buildQueryString(params: SearchParams): string {
    this.validateSearch(params);
    let parts: string[] = [`q=${encodeURIComponent(params.query)}`];

    if (params.num !== undefined) {
      parts.push(`num=${params.num}`);
    }
    if (params.start !== undefined) {
      parts.push(`start=${params.start}`);
    }
    if (params.lr) {
      parts.push(`lr=${encodeURIComponent(params.lr)}`);
    }
    if (params.hl) {
      parts.push(`hl=${encodeURIComponent(params.hl)}`);
    }
    return parts.join('&');
  }

  async webSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    return this.get(`/v1/search/${queryString}`, params);
  }

  async bingSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    return this.get(`/v1/b/search/${queryString}`, params);
  }

  async newsSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    let queryParams: Record<string, string | boolean> = {};
    if (params.ceid !== undefined) queryParams.ceid = params.ceid;
    if (params.resolveLinks !== undefined) queryParams.resolve_links = params.resolveLinks;
    return this.get(`/v1/news/${queryString}`, params, queryParams);
  }

  async imageSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    return this.get(`/v1/image/${queryString}`, params);
  }

  async videoSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    return this.get(`/v1/video/${queryString}`, params);
  }

  async productSearch(params: ProductSearchParams): Promise<any> {
    this.validateSearch(params);
    let queryString = `q=${encodeURIComponent(params.query)}`;
    return this.get(`/v1/product/search/${queryString}`, params);
  }

  async jobSearch(params: JobSearchParams): Promise<any> {
    this.validateSearch(params);
    let location = params.proxyLocation || this.defaultProxyLocation;
    if (location && location !== 'US' && location !== 'CA') {
      throw createApiServiceError(
        'Job search supports US and CA locations. Set proxyLocation to US or CA.',
        {
          reason: 'unsupported_job_location'
        }
      );
    }
    let queryString = `q=${encodeURIComponent(params.query)}`;
    return this.get(`/v1/job/search/${queryString}`, params);
  }

  async scholarSearch(params: SearchParams): Promise<any> {
    let queryString = this.buildQueryString(params);
    return this.get(`/v1/scholar/${queryString}`, params);
  }

  async serpRanking(params: SerpRankingParams): Promise<any> {
    this.validateSearch(params);
    if (!params.domain.trim()) {
      throw createApiServiceError('Enter the domain to check.', {
        reason: 'invalid_ranking_domain'
      });
    }
    let parts: string[] = [
      `q=${encodeURIComponent(params.query)}`,
      `domain=${encodeURIComponent(params.domain)}`
    ];
    if (params.num !== undefined) {
      parts.push(`num=${params.num}`);
    }
    let queryString = parts.join('&');
    return this.get(`/v1/serp/${queryString}`, params);
  }

  async mapsSearch(params: MapsSearchParams): Promise<{
    places: unknown[];
    result_count?: unknown;
    parsed_at?: unknown;
  }> {
    this.validateSearch(params);
    if (params.num !== undefined && params.num > 200) {
      throw createApiServiceError('Maps search num must be between 1 and 200.', {
        reason: 'invalid_maps_pagination'
      });
    }
    let queryParams: Record<string, string | number> = {};
    if (params.num !== undefined) queryParams.num = params.num;
    if (params.hl !== undefined) queryParams.hl = params.hl;
    if (params.gl !== undefined) queryParams.gl = params.gl;
    let data = await this.get(
      `/v1/maps/search/${encodeURIComponent(params.query)}`,
      {},
      queryParams,
      { 'X-Api-Key': this.token }
    );
    if (!Array.isArray(data.places)) {
      throw createApiServiceError('Serply returned an invalid Maps response. Try again.', {
        reason: 'invalid_serply_response'
      });
    }
    return { places: data.places, result_count: data.result_count, parsed_at: data.parsed_at };
  }
}
