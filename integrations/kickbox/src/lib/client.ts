import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

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
  remainingCredits?: number;
  responseTimeMs?: number;
}

export interface BatchCreateResponse {
  id: number;
  success: boolean;
  message: string | null;
}

export interface BatchStatusResponse {
  [key: string]: unknown;
  id: number;
  name?: string;
  created_at?: string;
  status: string;
  total?: number;
  deliverable?: number;
  undeliverable?: number;
  risky?: number;
  unknown?: number;
  sendex?: number;
  addresses?: number;
  duration?: number;
  success: boolean;
  message: string | null;
  download_url?: string;
  progress?: {
    deliverable: number;
    undeliverable: number;
    risky: number;
    unknown: number;
    completed?: number;
    total?: number;
    unprocessed?: number;
  };
}

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; sandbox?: boolean }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Provide a Kickbox API key.');
    }
    if (config.sandbox && !token.startsWith('test_')) {
      throw createApiServiceError(
        'Sandbox mode requires a Kickbox Sandbox API key beginning with test_. Reconnect with a Sandbox key or disable sandbox mode.'
      );
    }

    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.kickbox.com/v2',
      params: { apikey: token },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Kickbox',
          reason: 'kickbox_api_error'
        })
    });
  }

  private requireSuccess<T extends { success: boolean; message: string | null }>(
    result: T,
    operation: string
  ): T {
    if (!isApiErrorRecord(result) || result.success !== true) {
      throw createApiServiceError(
        `Kickbox ${operation} failed: ${result?.message || 'The API returned an unsuccessful response.'}`,
        { reason: 'kickbox_api_error' }
      );
    }
    return result;
  }

  private getNumericHeader(headers: unknown, name: string): number | undefined {
    let value = getResponseHeaderValue(headers, name);
    if (value === undefined || !value.trim()) return undefined;
    let numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
  }

  async verifyEmail(options: VerifyEmailOptions): Promise<VerifyEmailResponse> {
    if (!options.email.trim()) {
      throw createApiServiceError('Provide an email address to verify.');
    }
    if (
      options.timeout !== undefined &&
      (!Number.isInteger(options.timeout) || options.timeout <= 0)
    ) {
      throw createApiServiceError(
        'Verification timeout must be a positive integer in milliseconds.'
      );
    }

    let params: Record<string, string | number> = {
      email: options.email
    };

    if (options.timeout !== undefined) {
      params.timeout = options.timeout;
    }

    let response = await this.api.get<VerifyEmailResponse>('/verify', { params });
    let result = this.requireSuccess(response.data, 'email verification');
    return {
      ...result,
      remainingCredits: this.getNumericHeader(response.headers, 'X-Kickbox-Balance'),
      responseTimeMs: this.getNumericHeader(response.headers, 'X-Kickbox-Response-Time')
    };
  }

  async createBatchVerification(
    emails: string[],
    filename?: string
  ): Promise<BatchCreateResponse> {
    if (emails.length === 0 || emails.length > 1_000_000) {
      throw createApiServiceError(
        'Provide between 1 and 1,000,000 email addresses per batch.'
      );
    }
    if (emails.some(email => !email.trim())) {
      throw createApiServiceError('Batch email addresses must not be empty.');
    }
    if (filename !== undefined && /[\r\n]/.test(filename)) {
      throw createApiServiceError('The batch filename must not contain line breaks.');
    }
    let csvBody = emails
      .map(email => (/[,"\r\n]/.test(email) ? `"${email.replaceAll('"', '""')}"` : email))
      .join('\n');

    let headers: Record<string, string> = {
      'Content-Type': 'text/csv'
    };

    if (filename) {
      headers['X-Kickbox-Filename'] = filename;
    }

    let response = await this.api.put<BatchCreateResponse>('/verify-batch', csvBody, {
      headers
    });

    return this.requireSuccess(response.data, 'batch creation');
  }

  async getBatchStatus(batchId: number): Promise<BatchStatusResponse> {
    if (!Number.isSafeInteger(batchId) || batchId <= 0) {
      throw createApiServiceError('Provide a positive integer batch verification job ID.');
    }
    let response = await this.api.get<BatchStatusResponse>(`/verify-batch/${batchId}`);
    return this.requireSuccess(response.data, 'batch status retrieval');
  }

  async getCreditBalance(): Promise<{
    details: Record<string, unknown>;
    remainingCredits?: number;
  }> {
    let response = await this.api.get<unknown>('/balance');
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('Kickbox returned an invalid credit balance response.');
    }
    if (response.data.success === false) {
      throw createApiServiceError(
        typeof response.data.message === 'string'
          ? response.data.message
          : 'Kickbox credit balance retrieval failed.'
      );
    }
    return {
      details: response.data,
      remainingCredits: this.getNumericHeader(response.headers, 'X-Kickbox-Balance')
    };
  }
}
