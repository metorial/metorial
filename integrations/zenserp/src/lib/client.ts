import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface SearchParams {
  q: string;
  searchEngine?: string;
  location?: string;
  hl?: string;
  gl?: string;
  num?: number;
  start?: number;
  tbm?: string;
  tbs?: string;
  lat?: string;
  lng?: string;
  device?: string;
  sp?: string;
  imagePage?: number;
}

export interface ReverseImageSearchParams {
  imageUrl: string;
  num?: number;
  start?: number;
}

export interface TrendsParams {
  keywords: string[];
  timeframe?: string;
  category?: string;
  type?: string;
  hl?: string;
  gl?: string;
}

export interface TrendingParams {
  category?: string;
  hl?: string;
  country?: string;
}

export interface ShoppingDetailParams {
  productId: string;
  location?: string;
  hl?: string;
  gl?: string;
  productClusterId?: string;
}

type QueryParams = Record<string, string | number | string[] | undefined>;
type ApiResult = Record<string, any>;

let extractZenserpErrorDetails = (data: unknown) => {
  if (!isApiErrorRecord(data) || !Array.isArray(data.errors)) return undefined;

  let details: string[] = [];
  for (let errorDetail of data.errors) {
    if (!isApiErrorRecord(errorDetail)) continue;
    for (let [field, value] of Object.entries(errorDetail)) {
      let messages: string[] = [];
      collectApiErrorDetails(value, messages);
      if (messages.length > 0) details.push(`${field}: ${messages.join('; ')}`);
    }
  }
  return details.length > 0 ? details.join(' - ') : undefined;
};

let mapZenserpApiError = (error: unknown, operation?: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Zenserp',
    reason: 'zenserp_api_error',
    operation,
    extractMessage: (upstreamError, helpers) =>
      extractZenserpErrorDetails(helpers.getResponse(upstreamError)?.data)
  });

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Zenserp API key is required. Reconnect with a valid key.'
      );
    }

    this.api = createAuthenticatedAxios({
      baseURL: 'https://app.zenserp.com/api',
      authHeader: { name: 'apikey', value: config.token },
      contentType: false,
      errorMapping: {
        mapAxiosError: error => {
          let message = extractZenserpErrorDetails(error.response?.data);
          return message ? { message } : undefined;
        }
      },
      errorAdapter: mapZenserpApiError
    });
  }

  private validatePagination(num?: number, start?: number, maxResults = 100) {
    if (num !== undefined && (!Number.isSafeInteger(num) || num < 1 || num > maxResults)) {
      throw createApiServiceError(
        `numResults must be a whole number from 1 to ${maxResults}.`
      );
    }
    if (start !== undefined && (!Number.isSafeInteger(start) || start < 0)) {
      throw createApiServiceError('start must be a non-negative whole number.');
    }
  }

  private validateUnsupportedOffset(start: number | undefined, searchType: string) {
    if (start !== undefined && start !== 0) {
      throw createApiServiceError(
        `Zenserp does not support start pagination for ${searchType}. Omit start or use 0.`
      );
    }
  }

  private async get(path: string, params: QueryParams = {}): Promise<ApiResult> {
    let query = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (let item of value) query.append(key, item);
      } else {
        query.set(key, String(value));
      }
    }

    let response = await this.api.get(path, { params: query });
    let result = response.data;
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError(
        'Zenserp returned an unexpected response. Retry the request.',
        {
          reason: 'zenserp_invalid_response',
          upstreamStatus: response.status
        }
      );
    }
    if (
      result.error ||
      (Array.isArray(result.errors) && result.errors.length > 0) ||
      result.success === false
    ) {
      throw mapZenserpApiError({ response: { status: response.status, data: result } }, path);
    }
    return result;
  }

  async search(params: SearchParams): Promise<ApiResult> {
    if (!params.q.trim()) {
      throw createApiServiceError('query must contain a search term.');
    }
    let engine = params.searchEngine ?? 'google';
    this.validatePagination(params.num, params.start, engine === 'bing' ? 50 : 100);

    if (['isch', 'lcl', 'map', 'shop'].includes(params.tbm ?? '')) {
      this.validateUnsupportedOffset(params.start, 'image, maps, and shopping searches');
    }
    if (
      params.imagePage !== undefined &&
      (!Number.isSafeInteger(params.imagePage) || params.imagePage < 1)
    ) {
      throw createApiServiceError('page must be a positive whole number.');
    }

    let hasLatitude = params.lat !== undefined;
    let hasLongitude = params.lng !== undefined;
    if (hasLatitude !== hasLongitude) {
      throw createApiServiceError('Provide both latitude and longitude, or omit both.');
    }
    if (hasLatitude) {
      let latitude = Number(params.lat);
      let longitude = Number(params.lng);
      if (
        !params.lat?.trim() ||
        !params.lng?.trim() ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw createApiServiceError(
          'Provide valid latitude (-90 to 90) and longitude (-180 to 180).'
        );
      }
      if (params.location !== undefined) {
        throw createApiServiceError('Provide a location name or coordinates, not both.');
      }
      if (engine !== 'bing' && !['lcl', 'map'].includes(params.tbm ?? '')) {
        throw createApiServiceError(
          'Coordinates are supported by Bing and Maps searches. For other web searches, provide location instead.'
        );
      }
    }

    let queryParams: QueryParams = {
      q: params.q,
      search_engine: `${engine}.com`,
      location: params.location,
      hl: params.hl,
      gl: params.gl,
      num: params.num,
      start: params.start,
      tbm: params.tbm,
      tbs: params.tbs,
      device: params.device,
      sp: params.sp,
      ijn: params.imagePage
    };

    if (engine === 'bing') {
      queryParams.cc = params.gl;
      queryParams.count = params.num;
      queryParams.first = params.start;
      queryParams.lat = params.lat;
      queryParams.lon = params.lng;
      queryParams.gl = undefined;
      queryParams.num = undefined;
      queryParams.start = undefined;
    } else if (engine === 'yandex') {
      if (params.start !== undefined && params.start !== 0) {
        throw createApiServiceError(
          'Yandex uses page numbers rather than result offsets. Omit start or use Google or Bing for offset pagination.'
        );
      }
      queryParams.numdoc = params.num;
      queryParams.lang = params.hl;
      queryParams.num = undefined;
      queryParams.start = undefined;
      queryParams.hl = undefined;
    } else if (hasLatitude) {
      queryParams.tbm = 'map';
      queryParams.ll = `@${params.lat},${params.lng},15z`;
    }

    return this.get('/v2/search', queryParams);
  }

  async reverseImageSearch(params: ReverseImageSearchParams): Promise<ApiResult> {
    this.validatePagination(params.num, params.start);
    this.validateUnsupportedOffset(params.start, 'reverse image search');
    let imageUrl: URL;
    try {
      imageUrl = new URL(params.imageUrl);
    } catch {
      throw createApiServiceError('imageUrl must be a publicly accessible HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(imageUrl.protocol)) {
      throw createApiServiceError('imageUrl must be a publicly accessible HTTP or HTTPS URL.');
    }
    return this.get('/v2/search', {
      image_url: params.imageUrl,
      num: params.num,
      start: params.start
    });
  }

  async getTrends(params: TrendsParams): Promise<ApiResult> {
    if (params.keywords.some(keyword => !keyword.trim())) {
      throw createApiServiceError('Every keyword must contain a search term.');
    }
    if (params.type !== undefined) {
      throw createApiServiceError(
        'The current Zenserp Trends endpoint does not provide the legacy interest-over-time, region-interest, related-query, or related-topic reports selected by trendsType. Omit trendsType to search current trends, or use trending_searches.'
      );
    }
    if (
      params.timeframe !== undefined &&
      !/^(now (1|4)-h|now (1|7)-d)$/i.test(params.timeframe)
    ) {
      throw createApiServiceError(
        'Zenserp trends only covers the past seven days. Use now 1-H, now 4-H, now 1-d, or now 7-d, or omit timeframe.'
      );
    }
    return this.get('/v1/trends', {
      'keyword[]': params.keywords,
      timeframe: params.timeframe,
      cat: params.category,
      hl: params.hl,
      geo: params.gl
    });
  }

  async getTrendingSearches(params: TrendingParams): Promise<ApiResult> {
    return this.get('/v1/trends/trending', {
      cat: params.category,
      hl: params.hl,
      geo: params.country
    });
  }

  async getShoppingDetails(params: ShoppingDetailParams): Promise<ApiResult> {
    if (!params.productId.trim()) {
      throw createApiServiceError('productId is required. Obtain it from shopping_search.');
    }
    if (params.productClusterId !== undefined && !params.productClusterId.trim()) {
      throw createApiServiceError(
        'productClusterId must contain the cluster ID from the same shopping search result.'
      );
    }
    return this.get('/v1/shopping', {
      product_id: params.productId,
      gpc_id: params.productClusterId,
      location: params.location,
      hl: params.hl,
      gl: params.gl
    });
  }

  async getStatus(): Promise<ApiResult> {
    return this.get('/v2/status');
  }
}
