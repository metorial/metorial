import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type {
  AccountInfoResponse,
  CheckStatusResponse,
  GetResultParams,
  GoogleJobsParams,
  GoogleShortVideosParams,
  GoogleVideosParams,
  LanguageListParams,
  LiveSearchParams,
  LocationSearchParams,
  ScheduleSearchParams,
  ScheduleSearchResponse,
  TrendsScheduleParams,
  TrendsSearchParams
} from './types';

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'SERPHouse',
    reason: 'serphouse_api_error',
    detailKeys: ['msg', 'message', 'error', 'detail', 'code'],
    extractResponse: (value, helpers) => {
      let response = helpers.getResponse(value);
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return response;
      let baggage = value.data.baggage;
      if (!isApiErrorRecord(baggage)) return response;
      return { ...response, data: baggage.response };
    }
  });

export class Client {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('A SERPHouse API key is required. Reconnect your account.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.serphouse.com',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: apiError
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.status === 'error') {
        throw apiError({ response: { status: response.status, data: response.data } });
      }
      return response;
    });
  }

  private validateLocation(params: { domain: string; loc?: string; loc_id?: number }) {
    if (params.loc !== undefined && params.loc_id !== undefined) {
      throw createApiServiceError('Use either loc or locId, not both.');
    }
    if (
      !params.domain.toLowerCase().includes('yahoo') &&
      !params.loc?.trim() &&
      params.loc_id === undefined
    ) {
      throw createApiServiceError(
        'Provide loc or locId. Use search_locations to find a location.'
      );
    }
    if (
      params.loc_id !== undefined &&
      (!Number.isInteger(params.loc_id) || params.loc_id <= 0)
    ) {
      throw createApiServiceError(
        'locId must be a positive whole number from search_locations.'
      );
    }
  }

  // ── SERP Live Search (POST) ──

  async liveSearch(params: LiveSearchParams): Promise<any> {
    this.validateLocation(params);
    if (
      params.num_result !== undefined &&
      (!Number.isInteger(params.num_result) || params.num_result < 1 || params.num_result > 10)
    ) {
      throw createApiServiceError(
        'numResults must be a whole number from 1 to 10 for search_serp.'
      );
    }
    let response = await this.axios.post('/serp/live', {
      data: params
    });
    return response.data;
  }

  // ── SERP Scheduled/Batch Search ──

  async scheduleSearch(tasks: ScheduleSearchParams[]): Promise<ScheduleSearchResponse> {
    for (let task of tasks) this.validateLocation(task);
    let response = await this.axios.post('/serp/schedule', {
      data: tasks
    });
    return response.data;
  }

  async checkSerpStatus(taskId: string): Promise<CheckStatusResponse> {
    let response = await this.axios.get('/serp/check', {
      params: { id: taskId }
    });
    return response.data;
  }

  async getSerpResult(params: GetResultParams): Promise<any> {
    let response = await this.axios.get(
      params.responseType === 'html' ? '/serp/get/html' : '/serp/get',
      {
        params: { id: params.taskId }
      }
    );
    return response.data;
  }

  // ── Google Specialized APIs ──

  async googleJobsSearch(params: GoogleJobsParams): Promise<any> {
    this.validateLocation(params);
    let response = await this.axios.post('/google-jobs-api', { data: params });
    return response.data;
  }

  async googleVideosSearch(params: GoogleVideosParams): Promise<any> {
    this.validateLocation(params);
    let response = await this.axios.post('/google-videos-api', { data: params });
    return response.data;
  }

  async googleShortVideosSearch(params: GoogleShortVideosParams): Promise<any> {
    this.validateLocation(params);
    let response = await this.axios.post('/google-short-videos-api', { data: params });
    return response.data;
  }

  async googleAutocompleteSearch(params: {
    q: string;
    lang?: string;
    loc?: string;
    client?: string;
  }): Promise<any> {
    let response = await this.axios.post('/google-autocomplete-api', { data: params });
    return response.data;
  }

  // ── Google Trends ──

  async trendsSearch(params: TrendsSearchParams): Promise<any> {
    let response = await this.axios.post('/trends/search', params);
    return response.data;
  }

  async trendsSchedule(tasks: TrendsScheduleParams[]): Promise<ScheduleSearchResponse> {
    let response = await this.axios.post('/trends/schedule', {
      data: tasks
    });
    return response.data;
  }

  async checkTrendsStatus(taskId: string): Promise<CheckStatusResponse> {
    let response = await this.axios.get('/trends/check', {
      params: { id: taskId }
    });
    return response.data;
  }

  async getTrendsResult(taskId: string): Promise<any> {
    let response = await this.axios.get('/trends/get', {
      params: { id: taskId }
    });
    return response.data;
  }

  // ── Location & Language Discovery ──

  async searchLocations(params: LocationSearchParams): Promise<any> {
    let response = await this.axios.get('/location/search', {
      params: {
        q: params.query,
        type: params.searchEngine
      }
    });
    return response.data;
  }

  async listLanguages(params: LanguageListParams): Promise<any> {
    let response = await this.axios.get(
      `/language/list/${encodeURIComponent(params.searchEngine)}`
    );
    return response.data;
  }

  async listDomains(): Promise<any> {
    let response = await this.axios.get('/domain/list');
    return response.data;
  }

  // ── Trends Reference Data ──

  async trendsTimezoneList(): Promise<any> {
    let response = await this.axios.get('/trends/timezone-list');
    return response.data;
  }

  async trendsCategoryList(): Promise<any> {
    let response = await this.axios.get('/trends/category-list');
    return response.data;
  }

  async trendsCountryStateList(): Promise<any> {
    let response = await this.axios.get('/trends/country-state-list');
    return response.data;
  }

  async trendsLanguageList(): Promise<any> {
    let response = await this.axios.get('/trends/language-list');
    return response.data;
  }

  // ── Account ──

  async getAccountInfo(): Promise<AccountInfoResponse> {
    let response = await this.axios.get('/account/info');
    return response.data;
  }
}
