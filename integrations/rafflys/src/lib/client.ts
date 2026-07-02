import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app-sorteos.com/api/v2'
});

export interface RafflysUser {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
}

export interface RafflysPromotion {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface RafflysLead {
  id: string;
  created: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  [key: string]: unknown;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'X-API-KEY': this.token
    };
  }

  async getUser(): Promise<RafflysUser> {
    let response = await http.get('/users/me', {
      headers: this.headers
    });
    return response.data;
  }

  async listPromotions(): Promise<RafflysPromotion[]> {
    let response = await http.get('/promotions', {
      headers: this.headers
    });
    return response.data.data ?? response.data;
  }

  async getPromotionLeads(promotionId: string): Promise<RafflysLead[]> {
    let response = await http.get(`/promotions/${promotionId}/leads`, {
      headers: this.headers
    });
    return response.data.data ?? response.data;
  }
}
