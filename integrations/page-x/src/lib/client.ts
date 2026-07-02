import { createAxios } from 'slates';

export interface CreateLeadParams {
  apiKey: string;
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  platform?: string;
  country?: string;
}

export type CreateLeadResponse = Record<string, unknown>;

export class Client {
  private rapidApiToken: string;
  private pageXApiKey: string;

  constructor(config: { token: string; rapidApiToken: string }) {
    this.pageXApiKey = config.token;
    this.rapidApiToken = config.rapidApiToken;
  }

  async createLead(params: Omit<CreateLeadParams, 'apiKey'>): Promise<CreateLeadResponse> {
    let axiosInstance = createAxios({
      baseURL: 'https://pagexcrm.p.rapidapi.com',
      headers: {
        'x-rapidapi-key': this.rapidApiToken,
        'x-rapidapi-host': 'pagexcrm.p.rapidapi.com',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let formData = new URLSearchParams();
    formData.append('api_key', this.pageXApiKey);
    formData.append('customer_id', params.customerId);
    formData.append('name', params.name);
    formData.append('email', params.email);

    if (params.phone) {
      formData.append('phone', params.phone);
    }
    if (params.platform) {
      formData.append('platform', params.platform);
    }
    if (params.country) {
      formData.append('country', params.country);
    }

    let response = await axiosInstance.post('/api/v1/lead', formData.toString());

    return response.data as CreateLeadResponse;
  }
}
