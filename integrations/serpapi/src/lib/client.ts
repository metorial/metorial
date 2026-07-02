import { createAxios } from 'slates';

export class SerpApiClient {
  private apiKey: string;

  constructor(opts: { apiKey: string }) {
    this.apiKey = opts.apiKey;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://serpapi.com'
    });
  }

  async search(params: Record<string, any>): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get('/search.json', {
      params: {
        ...params,
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async getAccount(): Promise<any> {
    let axios = this.getAxios();
    let response = await axios.get('/account.json', {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async getLocations(query?: string, limit?: number): Promise<any> {
    let axios = this.getAxios();
    let params: Record<string, any> = {};
    if (query) params.q = query;
    if (limit) params.limit = limit;
    let response = await axios.get('/locations.json', { params });
    return response.data;
  }
}
