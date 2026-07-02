import { createAxios } from 'slates';
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

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.serphouse.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── SERP Live Search (POST) ──

  async liveSearch(params: LiveSearchParams): Promise<any> {
    let response = await this.axios.post('/serp/live', {
      data: params
    });
    return response.data;
  }

  // ── SERP Scheduled/Batch Search ──

  async scheduleSearch(tasks: ScheduleSearchParams[]): Promise<ScheduleSearchResponse> {
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
    let response = await this.axios.get('/serp/get', {
      params: {
        id: params.taskId,
        ...(params.responseType ? { responseType: params.responseType } : {})
      }
    });
    return response.data;
  }

  // ── Google Specialized APIs ──

  async googleJobsSearch(params: GoogleJobsParams): Promise<any> {
    let response = await this.axios.post('/google-jobs-api', params);
    return response.data;
  }

  async googleVideosSearch(params: GoogleVideosParams): Promise<any> {
    let response = await this.axios.post('/google-videos-api', params);
    return response.data;
  }

  async googleShortVideosSearch(params: GoogleShortVideosParams): Promise<any> {
    let response = await this.axios.post('/google-short-videos-api', params);
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
    let response = await this.axios.get('/language/list', {
      params: {
        type: params.searchEngine
      }
    });
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
