import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Bouncer API key.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.usebouncer.com',
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bouncer',
          reason: 'bouncer_api_error'
        })
    });
  }

  private encodeId(id: string, label: string): string {
    if (!id.trim()) {
      throw createApiServiceError(`Provide a ${label}.`);
    }
    return encodeURIComponent(id);
  }

  private validateEmails(emails: string[], maximum?: number): void {
    if (emails.length === 0 || (maximum !== undefined && emails.length > maximum)) {
      throw createApiServiceError(
        maximum === undefined
          ? 'Provide at least one email address.'
          : `Provide between 1 and ${maximum.toLocaleString('en-US')} email addresses.`
      );
    }
    if (emails.some(email => !email.trim())) {
      throw createApiServiceError('Email addresses must not be empty.');
    }
  }

  getBatchDownloadUrl(batchId: string): string {
    return `https://api.usebouncer.com/v1.1/email/verify/batch/${this.encodeId(batchId, 'batch ID')}/download`;
  }

  getToxicityDownloadUrl(jobId: string): string {
    return `https://api.usebouncer.com/v1/toxicity/list/${this.encodeId(jobId, 'toxicity job ID')}/data`;
  }

  async verifyEmail(email: string, timeout?: number): Promise<EmailRecord> {
    if (!email.trim()) {
      throw createApiServiceError('Provide an email address to verify.');
    }
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1 || timeout > 30)) {
      throw createApiServiceError(
        'Verification timeout must be a whole number from 1 to 30 seconds.'
      );
    }
    let params: Record<string, string | number> = { email };
    if (timeout !== undefined) {
      params.timeout = timeout;
    }
    let response = await this.http.get<EmailRecord>('/v1.1/email/verify', { params });
    return response.data;
  }

  async batchVerifySync(emails: string[]): Promise<EmailRecord[]> {
    this.validateEmails(emails, 10_000);
    let response = await this.http.post<EmailRecord[]>(
      '/v1.1/email/verify/batch/sync',
      emails,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async createBatch(
    emails: Array<{ email: string }>,
    callback?: string
  ): Promise<BatchCreateResponse> {
    this.validateEmails(
      emails.map(item => item.email),
      100_000
    );
    let params: Record<string, string> = {};
    if (callback !== undefined) {
      let url: URL;
      try {
        url = new URL(callback);
      } catch {
        throw createApiServiceError('Provide a valid HTTP or HTTPS callback URL.');
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw createApiServiceError('Provide an HTTP or HTTPS callback URL.');
      }
      params.callback = callback;
    }
    let response = await this.http.post<BatchCreateResponse>(
      '/v1.1/email/verify/batch',
      emails,
      {
        params,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getBatchStatus(batchId: string, withStats?: boolean): Promise<BatchStatusResponse> {
    let params: Record<string, string> = {};
    if (withStats) {
      params['with-stats'] = 'true';
    }
    let response = await this.http.get<BatchStatusResponse>(
      `/v1.1/email/verify/batch/${this.encodeId(batchId, 'batch ID')}`,
      { params }
    );
    return response.data;
  }

  async getBatchResults(batchId: string, statusFilter?: string): Promise<EmailRecord[]> {
    let params: Record<string, string> = {};
    if (statusFilter) {
      params.download = statusFilter;
    }
    let response = await this.http.get<EmailRecord[]>(this.getBatchDownloadUrl(batchId), {
      params
    });
    return response.data;
  }

  async finishBatch(batchId: string): Promise<void> {
    await this.http.post(
      `/v1.1/email/verify/batch/${this.encodeId(batchId, 'batch ID')}/finish`
    );
  }

  async deleteBatch(batchId: string): Promise<void> {
    await this.http.delete(`/v1.1/email/verify/batch/${this.encodeId(batchId, 'batch ID')}`);
  }

  async verifyDomain(domain: string): Promise<DomainVerificationResponse> {
    if (!domain.trim()) {
      throw createApiServiceError('Provide a domain to verify.');
    }
    let response = await this.http.get<DomainVerificationResponse>('/v1.1/domain', {
      params: { domain }
    });
    return response.data;
  }

  async createToxicityJob(emails: string[]): Promise<ToxicityJobResponse> {
    this.validateEmails(emails);
    let response = await this.http.post<ToxicityJobResponse>('/v1/toxicity/list', emails, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getToxicityJobStatus(jobId: string): Promise<ToxicityJobResponse> {
    let response = await this.http.get<ToxicityJobResponse>(
      `/v1/toxicity/list/${this.encodeId(jobId, 'toxicity job ID')}`
    );
    return response.data;
  }

  async getToxicityResults(jobId: string): Promise<ToxicityResultItem[]> {
    let response = await this.http.get<ToxicityResultItem[]>(
      this.getToxicityDownloadUrl(jobId)
    );
    return response.data;
  }

  async deleteToxicityJob(jobId: string): Promise<void> {
    await this.http.delete(`/v1/toxicity/list/${this.encodeId(jobId, 'toxicity job ID')}`);
  }

  async getCredits(): Promise<CreditsResponse> {
    let response = await this.http.get<CreditsResponse>('/v1.1/credits');
    return response.data;
  }
}
