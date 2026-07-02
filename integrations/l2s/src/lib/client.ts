import { createAxios } from 'slates';

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

export interface L2sApiResponse<T = any> {
  ok: boolean;
  response: {
    message: string;
    data: T;
  };
}

export class L2sClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.l2s.is',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async shortenUrl(params: ShortenUrlParams): Promise<L2sApiResponse> {
    let response = await this.axios.post('/url', params);
    return response.data;
  }

  async getUrl(urlId: string): Promise<L2sApiResponse> {
    let response = await this.axios.get(`/url/${urlId}`);
    return response.data;
  }

  async updateUrl(urlId: string, params: UpdateUrlParams): Promise<L2sApiResponse> {
    let response = await this.axios.put(`/url/${urlId}`, params);
    return response.data;
  }

  async getUserSettings(): Promise<Record<string, any>> {
    let response = await this.axios.get('/user/setting');
    let data = response.data as L2sApiResponse;
    return data.response?.data ?? data;
  }
}
