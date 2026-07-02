import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.kickbox.com/v2'
});

export interface VerifyEmailOptions {
  email: string;
  timeout?: number;
}

export interface VerifyEmailResponse {
  result: string;
  reason: string;
  role: boolean;
  free: boolean;
  disposable: boolean;
  accept_all: boolean;
  did_you_mean: string | null;
  sendex: number;
  email: string;
  user: string;
  domain: string;
  success: boolean;
  message: string | null;
}

export interface BatchCreateResponse {
  id: number;
  success: boolean;
  message: string | null;
}

export interface BatchStatusResponse {
  id: number;
  name: string;
  created_at: string;
  status: string;
  total: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
  sendex: number;
  addresses: number;
  duration: number;
  success: boolean;
  message: string | null;
  download_url?: string;
  progress?: {
    deliverable: number;
    undeliverable: number;
    risky: number;
    unknown: number;
    completed: number;
  };
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async verifyEmail(options: VerifyEmailOptions): Promise<VerifyEmailResponse> {
    let params: Record<string, string | number> = {
      email: options.email,
      apikey: this.token
    };

    if (options.timeout !== undefined) {
      params.timeout = options.timeout;
    }

    let response = await api.get('/verify', { params });
    return response.data as VerifyEmailResponse;
  }

  async createBatchVerification(
    emails: string[],
    filename?: string
  ): Promise<BatchCreateResponse> {
    let csvBody = emails.join('\n');

    let headers: Record<string, string> = {
      'Content-Type': 'text/csv'
    };

    if (filename) {
      headers['X-Kickbox-Filename'] = filename;
    }

    let response = await api.put('/verify-batch', csvBody, {
      params: { apikey: this.token },
      headers
    });

    return response.data as BatchCreateResponse;
  }

  async getBatchStatus(batchId: number): Promise<BatchStatusResponse> {
    let response = await api.get(`/verify-batch/${batchId}`, {
      params: { apikey: this.token }
    });
    return response.data as BatchStatusResponse;
  }
}
