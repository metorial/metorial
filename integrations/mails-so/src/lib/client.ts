import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface EmailValidationResult {
  id: string;
  email: string;
  username: string | null;
  domain: string | null;
  mx_record: string | null;
  score: number;
  isv_format: boolean;
  isv_domain: boolean;
  isv_mx: boolean | null;
  isv_noblock: boolean;
  isv_nocatchall: boolean;
  isv_nogeneric: boolean;
  is_free: boolean;
  result: string;
  reason: string;
}

export interface SingleValidationResponse {
  data: EmailValidationResult | null;
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
  emails?: EmailValidationResult[] | null;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.mails.so/v1',
      authHeader: { name: 'x-mails-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Mails.so',
          reason: 'mailsso_api_error'
        })
    });
  }

  async validateEmail(email: string): Promise<EmailValidationResult> {
    let response = await this.http.get<SingleValidationResponse>('/validate', {
      params: { email }
    });
    if (response.data?.error || !response.data?.data) {
      throw createApiServiceError(
        response.data?.error || 'Mails.so returned no email validation result.'
      );
    }
    return response.data.data;
  }

  async createBatch(emails: string[]): Promise<BatchCreateResponse> {
    if (emails.length === 0) {
      throw createApiServiceError('Provide at least one email address for bulk validation.');
    }
    let response = await this.http.post<BatchCreateResponse & { error?: string | null }>(
      '/batch',
      { emails }
    );
    if (response.data?.error || !response.data?.id) {
      throw createApiServiceError(
        response.data?.error || 'Mails.so returned no bulk validation job.'
      );
    }
    return response.data;
  }

  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    if (!batchId.trim()) {
      throw createApiServiceError(
        'Provide the batch ID returned by the Bulk Validate Emails tool.'
      );
    }
    let response = await this.http.get<BatchStatusResponse & { error?: string | null }>(
      `/batch/${encodeURIComponent(batchId)}`
    );
    if (response.data?.error || !response.data?.id) {
      throw createApiServiceError(
        response.data?.error || 'Mails.so returned no bulk validation job.'
      );
    }
    if (response.data.finished_at && !Array.isArray(response.data.emails)) {
      throw createApiServiceError(
        'Mails.so returned a completed batch without email results.'
      );
    }
    return response.data;
  }
}
