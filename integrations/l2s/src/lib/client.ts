import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface ShortenUrlParams {
  url: string;
  customKey?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  title?: string;
  tags?: string[];
}

export interface UpdateUrlParams {
  url?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  tags?: string[];
}

export interface L2sApiResponse<T = unknown> {
  ok: boolean;
  response: {
    message: string;
    data: T;
  };
}

export class L2sClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.l2s.is',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'L2S',
          reason: 'l2s_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['response', 'errors']
        })
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.ok === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'L2S',
            reason: 'l2s_api_error',
            nestedKeys: ['response', 'errors']
          }
        );
      }
      return response;
    });
  }

  private readUrlResponse(data: unknown): L2sApiResponse {
    if (
      !isApiErrorRecord(data) ||
      typeof data.ok !== 'boolean' ||
      !isApiErrorRecord(data.response) ||
      typeof data.response.message !== 'string' ||
      !Object.hasOwn(data.response, 'data') ||
      data.response.data === undefined
    ) {
      throw createApiServiceError('L2S returned an invalid URL response.', {
        reason: 'l2s_invalid_response'
      });
    }
    return {
      ...data,
      ok: data.ok,
      response: {
        ...data.response,
        message: data.response.message,
        data: data.response.data
      }
    };
  }

  async shortenUrl(params: ShortenUrlParams): Promise<L2sApiResponse> {
    let response = await this.axios.post('/url', params);
    return this.readUrlResponse(response.data);
  }

  async getUrl(urlId: string): Promise<L2sApiResponse> {
    let response = await this.axios.get(`/url/${urlId}`);
    return this.readUrlResponse(response.data);
  }

  async updateUrl(urlId: string, params: UpdateUrlParams): Promise<L2sApiResponse> {
    let response = await this.axios.put(`/url/${urlId}`, params);
    return this.readUrlResponse(response.data);
  }

  async getUserSettings(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/setting');
    let data = response.data as L2sApiResponse<Record<string, unknown>> &
      Record<string, unknown>;
    return data.response?.data ?? data;
  }
}
