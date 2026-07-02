import { createAxios } from 'slates';

export interface ContactInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  company?: string;
  website?: string;
  num_siren?: string;
  siret?: string;
  linkedin?: string;
  company_linkedin?: string;
  country?: string;
  job?: string;
  custom_fields?: Record<string, string>;
}

export interface EnrichRequestBody {
  data: ContactInput[];
  siren?: boolean;
  language?: string;
  custom_callback_url?: string;
}

export interface EnrichPostResponse {
  error: boolean;
  request_id: string;
  success: boolean;
  credits_left: number;
}

export interface EmailResult {
  email: string;
  qualification: string;
}

export interface EnrichedContact {
  civility?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: EmailResult[];
  phone?: string;
  mobile_phone?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  company_linkedin?: string;
  siren?: string;
  siret?: string;
  siret_address?: string;
  siret_zip?: string;
  siret_city?: string;
  vat?: string;
  nb_employees?: string;
  naf5_code?: string;
  naf5_des?: string;
  country?: string;
  company_turnover?: string;
  company_results?: string;
  job?: string;
  job_level?: string;
  job_function?: string;
  custom_fields?: Record<string, string>;
}

export interface EnrichGetResponse {
  data: EnrichedContact[];
  error: boolean;
  success: boolean;
  reason?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.dropcontact.com/v1',
      headers: {
        'X-Access-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async enrichContacts(body: EnrichRequestBody): Promise<EnrichPostResponse> {
    let response = await this.axios.post('/enrich/all', body);
    return response.data;
  }

  async getEnrichmentResults(
    requestId: string,
    forceResults?: boolean
  ): Promise<EnrichGetResponse> {
    let params: Record<string, string> = {};
    if (forceResults) {
      params.forceResults = 'true';
    }
    let response = await this.axios.get(`/enrich/all/${requestId}`, { params });
    return response.data;
  }

  async checkCredits(): Promise<{ credits_left: number }> {
    let response = await this.axios.post('/enrich/all', { data: [] });
    return { credits_left: response.data.credits_left };
  }

  async setDefaultWebhookUrl(callbackUrl: string): Promise<any> {
    let response = await this.axios.put('/enrich/webhook', { callback_url: callbackUrl });
    return response.data;
  }

  async getDefaultWebhookUrl(): Promise<{ callback_url?: string }> {
    let response = await this.axios.get('/enrich/webhook');
    return response.data;
  }

  async deleteDefaultWebhookUrl(): Promise<any> {
    let response = await this.axios.delete('/enrich/webhook');
    return response.data;
  }
}
