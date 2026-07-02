import { createAxios } from 'slates';
import { hotjarApiError } from './errors';
import { requestHotjarAccessToken } from './oauth';

export interface HotjarSurvey {
  id: string;
  name: string;
  type: string;
  url: string;
  responses_url: string;
  is_enabled: boolean;
  created_time: string;
  updated_time?: string;
  sentiment_analysis_enabled: boolean;
  questions?: HotjarQuestion[];
}

export interface HotjarQuestion {
  id: string;
  type: string;
  text: string;
  is_required: boolean;
  choices?: string[];
  image_url?: string | null;
  labels?: Record<string, string> | null;
}

export interface HotjarSurveyResponseAnswer {
  question_id: string;
  answer: string | null;
  comment: string | null;
  tags: { name: string }[];
  sentiment: string | null;
}

export interface HotjarSurveyResponse {
  id: string;
  browser: string;
  country: string;
  created_time: string;
  device: string;
  hotjar_user_id: string;
  is_complete: boolean;
  os: string;
  recording_url: string | null;
  response_origin_url: string;
  user_attributes: { name: string; value: string }[];
  answers: HotjarSurveyResponseAnswer[];
}

export interface PaginatedResponse<T> {
  results: T[];
  next_cursor: string | null;
}

export interface UserLookupRequest {
  data_subject_email?: string;
  data_subject_site_id_to_user_id_map?: Record<string, string>;
  delete_all_hits: boolean;
}

export class Client {
  private token: string;
  private clientId?: string;
  private clientSecret?: string;
  private expiresAt?: string;

  constructor(config: {
    token: string;
    clientId?: string;
    clientSecret?: string;
    expiresAt?: string;
  }) {
    this.token = config.token;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.expiresAt = config.expiresAt;
  }

  private isTokenExpired() {
    if (!this.expiresAt) {
      return false;
    }

    let expiresAt = Date.parse(this.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    return expiresAt <= Date.now() + 60_000;
  }

  private async getToken() {
    if (this.clientId && this.clientSecret && this.isTokenExpired()) {
      let refreshed = await requestHotjarAccessToken(this.clientId, this.clientSecret);
      this.token = refreshed.accessToken;
      this.expiresAt = refreshed.expiresAt;
    }

    return this.token;
  }

  private async createHttp() {
    let token = await this.getToken();

    return createAxios({
      baseURL: 'https://api.hotjar.io',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  async listSurveys(
    siteId: string,
    options?: {
      withQuestions?: boolean;
      limit?: number;
      cursor?: string;
    }
  ): Promise<PaginatedResponse<HotjarSurvey>> {
    try {
      let http = await this.createHttp();
      let params: Record<string, string> = {};

      if (options?.withQuestions) {
        params.with_questions = 'true';
      }
      if (options?.limit) {
        params.limit = String(options.limit);
      }
      if (options?.cursor) {
        params.cursor = options.cursor;
      }

      let response = await http.get(`/v1/sites/${siteId}/surveys`, { params });
      return response.data;
    } catch (error) {
      throw hotjarApiError(error, 'list surveys');
    }
  }

  async getSurvey(siteId: string, surveyId: string): Promise<HotjarSurvey> {
    try {
      let http = await this.createHttp();
      let response = await http.get(`/v1/sites/${siteId}/surveys/${surveyId}`);
      return response.data;
    } catch (error) {
      throw hotjarApiError(error, 'get survey');
    }
  }

  async listSurveyResponses(
    siteId: string,
    surveyId: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<PaginatedResponse<HotjarSurveyResponse>> {
    try {
      let http = await this.createHttp();
      let params: Record<string, string> = {};

      if (options?.limit) {
        params.limit = String(options.limit);
      }
      if (options?.cursor) {
        params.cursor = options.cursor;
      }

      let response = await http.get(`/v1/sites/${siteId}/surveys/${surveyId}/responses`, {
        params
      });
      return response.data;
    } catch (error) {
      throw hotjarApiError(error, 'list survey responses');
    }
  }

  async userLookup(organizationId: string, request: UserLookupRequest): Promise<any> {
    try {
      let http = await this.createHttp();
      let response = await http.post(
        `/v1/organizations/${organizationId}/user-lookup`,
        request
      );
      return response.data;
    } catch (error) {
      throw hotjarApiError(error, 'user lookup');
    }
  }
}
