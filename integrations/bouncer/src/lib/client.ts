import { createAxios } from 'slates';

export type EmailStatus = 'deliverable' | 'risky' | 'undeliverable' | 'unknown';

export interface EmailRecord {
  email: string;
  status: EmailStatus;
  reason: string;
  domain: {
    name: string;
    acceptAll: string;
    disposable: string;
    free: string;
  };
  account: {
    role: string;
    disabled: string;
    fullMailbox: string;
  };
  dns: {
    type: string;
    record: string;
  };
  provider: string;
  score: number;
  toxic: string;
  toxicity: number;
  retryAfter?: string;
  didYouMean?: string;
}

export interface BatchCreateResponse {
  batchId: string;
  created: string;
  status: string;
  quantity: number;
  duplicates: number;
}

export interface BatchStatusResponse {
  batchId: string;
  created: string;
  started?: string;
  completed?: string;
  status: string;
  quantity: number;
  duplicates: number;
  credits?: number;
  processed?: number;
  stats?: {
    deliverable: number;
    risky: number;
    undeliverable: number;
    unknown: number;
  };
}

export interface DomainVerificationResponse {
  domain: {
    name: string;
    acceptAll: string;
    disposable: string;
    free: string;
  };
  dns: {
    type: string;
    record: string;
  };
  provider: string;
  toxic: string;
}

export interface ToxicityJobResponse {
  id: string;
  createdAt: string;
  status: string;
}

export interface ToxicityResultItem {
  email: string;
  toxicity: number;
}

export interface CreditsResponse {
  credits: number;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.usebouncer.com',
      headers: {
        'x-api-key': config.token
      }
    });
  }

  async verifyEmail(email: string, timeout?: number): Promise<EmailRecord> {
    let params: Record<string, string | number> = { email };
    if (timeout !== undefined) {
      params.timeout = timeout;
    }
    let response = await this.http.get('/v1.1/email/verify', { params });
    return response.data;
  }

  async batchVerifySync(emails: string[]): Promise<EmailRecord[]> {
    let response = await this.http.post('/v1.1/email/verify/batch/sync', emails, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async createBatch(
    emails: Array<{ email: string }>,
    callback?: string
  ): Promise<BatchCreateResponse> {
    let params: Record<string, string> = {};
    if (callback) {
      params.callback = callback;
    }
    let response = await this.http.post('/v1.1/email/verify/batch', emails, {
      params,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getBatchStatus(batchId: string, withStats?: boolean): Promise<BatchStatusResponse> {
    let params: Record<string, string> = {};
    if (withStats) {
      params['with-stats'] = 'true';
    }
    let response = await this.http.get(`/v1.1/email/verify/batch/${batchId}`, { params });
    return response.data;
  }

  async getBatchResults(batchId: string, statusFilter?: string): Promise<EmailRecord[]> {
    let params: Record<string, string> = {};
    if (statusFilter) {
      params.download = statusFilter;
    }
    let response = await this.http.get(`/v1.1/email/verify/batch/${batchId}/download`, {
      params
    });
    return response.data;
  }

  async finishBatch(batchId: string): Promise<void> {
    await this.http.post(`/v1.1/email/verify/batch/${batchId}/finish`);
  }

  async deleteBatch(batchId: string): Promise<void> {
    await this.http.delete(`/v1.1/email/verify/batch/${batchId}`);
  }

  async verifyDomain(domain: string): Promise<DomainVerificationResponse> {
    let response = await this.http.get('/v1.1/domain', {
      params: { domain }
    });
    return response.data;
  }

  async createToxicityJob(emails: string[]): Promise<ToxicityJobResponse> {
    let response = await this.http.post('/v1/toxicity/list', emails, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getToxicityJobStatus(jobId: string): Promise<ToxicityJobResponse> {
    let response = await this.http.get(`/v1/toxicity/list/${jobId}`);
    return response.data;
  }

  async getToxicityResults(jobId: string): Promise<ToxicityResultItem[]> {
    let response = await this.http.get(`/v1/toxicity/list/${jobId}/data`);
    return response.data;
  }

  async deleteToxicityJob(jobId: string): Promise<void> {
    await this.http.delete(`/v1/toxicity/list/${jobId}`);
  }

  async getCredits(): Promise<CreditsResponse> {
    let response = await this.http.get('/v1.1/credits');
    return response.data;
  }
}
