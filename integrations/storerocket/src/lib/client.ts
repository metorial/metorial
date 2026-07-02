import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://storerocket.io/api/v2'
});

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/json'
    };
  }

  async getUserInfo(): Promise<Record<string, any>> {
    let response = await http.get('/user', {
      headers: this.headers
    });
    return response.data;
  }

  async getUsers(params?: { limit?: number; offset?: number }): Promise<Record<string, any>> {
    let response = await http.get('/users', {
      headers: this.headers,
      params: {
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        ...(params?.offset !== undefined ? { offset: params.offset } : {})
      }
    });
    return response.data;
  }

  async getLocations(params?: {
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>> {
    let response = await http.get('/locations', {
      headers: this.headers,
      params: {
        ...(params?.query !== undefined ? { query: params.query } : {}),
        ...(params?.lat !== undefined ? { lat: params.lat } : {}),
        ...(params?.lng !== undefined ? { lng: params.lng } : {}),
        ...(params?.radius !== undefined ? { radius: params.radius } : {}),
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        ...(params?.offset !== undefined ? { offset: params.offset } : {})
      }
    });
    return response.data;
  }

  async ping(): Promise<Record<string, any>> {
    let response = await http.get('/ping', {
      headers: this.headers
    });
    return response.data;
  }
}
