import { createAxios } from 'slates';

export interface EmailValidationResult {
  id: string;
  email: string;
  username: string;
  domain: string;
  mx_record: string;
  score: number;
  isv_format: boolean;
  isv_domain: boolean;
  isv_mx: boolean;
  isv_noblock: boolean;
  isv_nocatchall: boolean;
  isv_nogeneric: boolean;
  is_free: boolean;
  result: string;
  reason: string;
}

export interface SingleValidationResponse {
  data: EmailValidationResult;
  error: string | null;
}

export interface BatchCreateResponse {
  id: string;
  created_at: string;
  user_id: string;
  size: number;
  finished_at: string | null;
}

export interface BatchStatusResponse {
  id: string;
  created_at: string;
  user_id: string;
  size: number;
  finished_at: string | null;
  emails: EmailValidationResult[];
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.mails.so/v1',
      headers: {
        'x-mails-api-key': config.token
      }
    });
  }

  async validateEmail(email: string): Promise<SingleValidationResponse> {
    let response = await this.http.get('/validate', {
      params: { email }
    });
    return response.data;
  }

  async createBatch(emails: string[]): Promise<BatchCreateResponse> {
    let response = await this.http.post('/batch', { emails });
    return response.data;
  }

  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    let response = await this.http.get(`/batch/${batchId}`);
    return response.data;
  }
}
