import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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

export interface ApiResponse {
  error?: boolean | string;
  success?: boolean;
  reason?: string;
  message?: string;
}

export interface ContactDiagnostics {
  index?: number;
  errors?: Record<string, unknown>;
  warnings?: Record<string, unknown>;
}

export interface EnrichPostResponse extends ApiResponse {
  error: boolean;
  request_id: string;
  success: boolean;
  credits_left: number;
  data?: ContactDiagnostics[];
}

export interface EmailResult {
  email: string;
  qualification: string;
}

export interface EnrichedContact extends ContactDiagnostics {
  civility?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: EmailResult[] | string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  company_linkedin?: string;
  siren?: string;
  num_siren?: string;
  siret?: string;
  siret_address?: string;
  siret_zip?: string;
  siret_city?: string;
  vat?: string;
  nb_employees?: string;
  employee_count?: string;
  industry?: string;
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

export interface EnrichGetResponse extends ApiResponse {
  data?: EnrichedContact[];
  credits_left?: number;
  error: boolean;
  success: boolean;
  reason?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.dropcontact.com/v1',
      authHeader: { name: 'X-Access-Token', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Dropcontact',
          reason: 'dropcontact_api_error',
          detailKeys: ['reason', 'message', 'error']
        })
    });
  }

  async enrichContacts(body: EnrichRequestBody): Promise<EnrichPostResponse> {
    let response = await this.axios.post<EnrichPostResponse>('/enrich/all', body);
    this.assertNoApiError(response.data);
    if (!response.data.success || !response.data.request_id) {
      throw createApiServiceError(
        `Dropcontact did not accept the enrichment request: ${response.data.reason ?? 'No request ID was returned.'}`
      );
    }
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
    if (!requestId.trim()) {
      throw createApiServiceError('requestId is required to retrieve enrichment results.');
    }
    let response = await this.axios.get<EnrichGetResponse>(
      `/enrich/all/${encodeURIComponent(requestId)}`,
      { params }
    );
    this.assertNoApiError(response.data, true);
    return response.data;
  }

  async checkCredits(): Promise<{ credits_left: number }> {
    let response = await this.enrichContacts({ data: [{}] });
    return { credits_left: response.credits_left };
  }

  async setDefaultWebhookUrl(callbackUrl: string): Promise<ApiResponse> {
    let response = await this.axios.put<ApiResponse>('/enrich/webhook', {
      callback_url: callbackUrl
    });
    this.assertNoApiError(response.data);
    return response.data;
  }

  async getDefaultWebhookUrl(): Promise<{ callback_url?: string }> {
    let response = await this.axios.get<ApiResponse & { callback_url?: string }>(
      '/enrich/webhook'
    );
    this.assertNoApiError(response.data);
    return response.data;
  }

  async deleteDefaultWebhookUrl(): Promise<ApiResponse> {
    let response = await this.axios.delete<ApiResponse>('/enrich/webhook');
    this.assertNoApiError(response.data);
    return response.data;
  }

  private assertNoApiError(
    response: ApiResponse | null | undefined,
    allowPending = false
  ): void {
    if (response?.error || (!allowPending && response?.success === false)) {
      throw createApiServiceError(
        `Dropcontact API request failed: ${response.reason ?? response.message ?? (typeof response.error === 'string' ? response.error : 'The operation was unsuccessful.')}`,
        { reason: 'dropcontact_api_error' }
      );
    }
  }
}
