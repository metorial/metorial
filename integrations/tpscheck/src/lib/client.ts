import { createAxios } from 'slates';

let BASE_URL = 'https://api.tpscheck.uk';

export interface CheckResultV2 {
  input: string;
  e164: string;
  valid: boolean;
  line: {
    type: string;
    original_carrier: string;
    location: string;
    country: string;
    prefix: string;
  };
  reachability: {
    status: string;
    confidence: string;
  };
  tps: boolean;
  ctps: boolean;
  risk?: number;
}

export interface BatchResultV2 {
  total: number;
  results: CheckResultV2[];
}

export interface CreditsResponse {
  requests_used: number;
  requests_remaining: number;
  monthly_limit: number;
  plan: string;
  reset_date: string;
}

export interface StatusResponse {
  status: string;
  version: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async checkNumber(phone: string): Promise<CheckResultV2> {
    let response = await this.axios.post(
      '/check',
      { phone },
      {
        params: { version: 2 }
      }
    );
    return response.data;
  }

  async batchCheck(phones: string[]): Promise<BatchResultV2> {
    let response = await this.axios.post(
      '/batch',
      { phones },
      {
        params: { version: 2 }
      }
    );
    return response.data;
  }

  async getCredits(): Promise<CreditsResponse> {
    let response = await this.axios.get('/credits');
    return response.data;
  }

  async getStatus(): Promise<StatusResponse> {
    let response = await this.axios.get('/status');
    return response.data;
  }
}
