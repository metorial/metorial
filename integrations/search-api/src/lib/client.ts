import { createAxios } from 'slates';

export interface SearchParams {
  [key: string]: string | number | boolean | undefined;
}

export class SearchApiClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.searchapi.io/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async search(params: SearchParams): Promise<any> {
    let cleanParams = this.cleanParams(params);
    let response = await this.axios.get('/search', { params: cleanParams });
    return response.data;
  }

  async getLocations(query: string): Promise<any> {
    let response = await this.axios.get('/locations', {
      params: { q: query }
    });
    return response.data;
  }

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  private cleanParams(params: SearchParams): Record<string, string | number | boolean> {
    let cleaned: Record<string, string | number | boolean> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
