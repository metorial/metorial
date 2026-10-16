import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface SearchParams {
  [key: string]: string | number | boolean | undefined;
}

export let resultArray = (value: unknown, field: string, allowStrings = false): any[] => {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some(item => !isApiErrorRecord(item) && !(allowStrings && typeof item === 'string'))
  ) {
    throw createApiServiceError(`SearchApi returned an invalid ${field} collection.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let resultNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    typeof value === 'string' &&
    /^-?\d+(\.\d+)?$/.test(value) &&
    Number.isFinite(Number(value))
  )
    return Number(value);
  throw createApiServiceError(`SearchApi returned an invalid numeric ${field}.`, {
    reason: 'invalid_response'
  });
};

export let resultText = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))
    return String(value);
  throw createApiServiceError(`SearchApi returned invalid text for ${field}.`, {
    reason: 'invalid_response'
  });
};

export class SearchApiClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A SearchApi API key is required.', {
        reason: 'missing_api_key'
      });
    }
    this.axios = createAxios({
      baseURL: 'https://www.searchapi.io/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async search(params: SearchParams): Promise<any> {
    if (typeof params.q !== 'string' || !params.q.trim()) {
      if (params.engine !== 'google_scholar' || (!params.cites && !params.cluster)) {
        throw createApiServiceError('Provide a non-empty search query.', {
          reason: 'invalid_query'
        });
      }
    }
    for (let key of ['page', 'num', 'cat', 'as_ylo', 'as_yhi', 'cp', 'tz']) {
      let value = params[key];
      if (value !== undefined && (typeof value !== 'number' || !Number.isSafeInteger(value))) {
        throw createApiServiceError(`${key} must be an integer.`, {
          reason: 'invalid_search_parameter'
        });
      }
    }
    if (
      (typeof params.page === 'number' && params.page < 1) ||
      (typeof params.num === 'number' && params.num < 1) ||
      (typeof params.cat === 'number' && params.cat < 0)
    ) {
      throw createApiServiceError(
        'Page and result count must be positive, and category cannot be negative.',
        { reason: 'invalid_search_parameter' }
      );
    }
    return this.request('/search', params);
  }

  async getLocations(query: string, limit?: number): Promise<any> {
    if (
      !query.trim() ||
      (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100))
    ) {
      throw createApiServiceError('Provide a location query and a limit from 1 to 100.', {
        reason: 'invalid_locations_parameter'
      });
    }
    let data = await this.request('/locations', { q: query, limit }, true);
    if (!Array.isArray(data) && !Array.isArray(data.locations)) {
      throw createApiServiceError('SearchApi returned an invalid locations collection.', {
        reason: 'invalid_response'
      });
    }
    return data;
  }

  async getAccount(): Promise<any> {
    let data = await this.request('/me');
    if (!isApiErrorRecord(data.account)) {
      throw createApiServiceError('SearchApi returned invalid account usage data.', {
        reason: 'invalid_response'
      });
    }
    for (let key of ['current_month_usage', 'monthly_allowance', 'remaining_credits']) {
      if (typeof data.account[key] !== 'number' || !Number.isFinite(data.account[key])) {
        throw createApiServiceError(`SearchApi account data is missing a numeric ${key}.`, {
          reason: 'invalid_response'
        });
      }
    }
    return data;
  }

  async getSearchHistory(params: SearchParams): Promise<any> {
    if (
      params.limit !== undefined &&
      (typeof params.limit !== 'number' ||
        !Number.isSafeInteger(params.limit) ||
        params.limit < 1 ||
        params.limit > 100)
    ) {
      throw createApiServiceError('History limit must be an integer from 1 to 100.', {
        reason: 'invalid_history_limit'
      });
    }
    let data = await this.request('/search_history', params);
    if (!Array.isArray(data.searches)) {
      throw createApiServiceError('SearchApi returned invalid search history data.', {
        reason: 'invalid_response'
      });
    }
    for (let search of data.searches) {
      if (
        !isApiErrorRecord(search) ||
        !isApiErrorRecord(search.params) ||
        ['id', 'engine', 'status', 'created_at'].some(key => typeof search[key] !== 'string')
      ) {
        throw createApiServiceError('SearchApi returned a malformed saved search.', {
          reason: 'invalid_response'
        });
      }
    }
    return data;
  }

  private async request(
    path: string,
    params: SearchParams = {},
    allowArray = false
  ): Promise<any> {
    try {
      let response = await this.axios.get(path, { params: pickDefined(params) });
      let data: unknown = response.data;
      if (
        isApiErrorRecord(data) &&
        (data.error ||
          data.errors ||
          (isApiErrorRecord(data.search_metadata) && data.search_metadata.status === 'Error'))
      ) {
        throw buildApiServiceError(
          { response: { status: response.status, data } },
          {
            providerLabel: 'SearchApi',
            reason: 'search_api_error',
            operation: path
          }
        );
      }
      if (
        (!isApiErrorRecord(data) && !(allowArray && Array.isArray(data))) ||
        (isApiErrorRecord(data) && Object.keys(data).length === 0)
      ) {
        throw createApiServiceError('SearchApi returned an invalid response body.', {
          reason: 'invalid_response'
        });
      }
      return data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'SearchApi',
        reason: 'search_api_error',
        operation: path,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }
}
