import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

let BASE_URLS: Record<string, string> = {
  default: 'https://api.zerobounce.net/v2',
  us: 'https://api-us.zerobounce.net/v2',
  eu: 'https://api-eu.zerobounce.net/v2'
};

export interface ValidationResult {
  address: string;
  status: string;
  sub_status?: string;
  free_email?: boolean;
  catchall_domain?: boolean | null;
  did_you_mean?: string | null;
  account?: string | null;
  domain?: string | null;
  domain_age_days?: string | null;
  active_in_days?: string | null;
  active_first_seen?: string | null;
  smtp_provider?: string | null;
  mx_record?: string | null;
  mx_found?: string | boolean;
  firstname?: string | null;
  lastname?: string | null;
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  zipcode?: string | null;
  processed_at?: string;
}

export interface BatchValidationResult {
  email_batch: ValidationResult[];
  errors?: Array<{ email_address?: string; error?: string }>;
}

interface ScoringResult {
  email?: string;
  score?: number | string | null;
  address?: string;
  zerobounce_score?: number | string | null;
  status?: string;
  sub_status?: string;
  account?: string | null;
  domain?: string | null;
  processed_at?: string;
}

export interface EmailSearchResult {
  email?: string;
  email_confidence?: string;
  domain?: string;
  company_name?: string;
  format?: string;
  confidence?: string;
  did_you_mean?: string;
  failure_reason?: string;
  other_domain_formats?: Array<{ format: string; confidence: string }>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;

  constructor(config: { token: string; region: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A ZeroBounce API key is required. Reconnect with your API key.'
      );
    }
    this.apiKey = config.token;
    let baseURL = BASE_URLS[config.region] || BASE_URLS.default;
    this.axios = createAxios({ baseURL });
  }

  private async request<T>(
    operation: string,
    request: Parameters<typeof requestAxiosData<T>>[1]
  ) {
    let result = await requestAxiosData<T>(operation, request, (error, operation) =>
      buildApiServiceError(error, {
        providerLabel: 'ZeroBounce',
        operation,
        reason: 'zerobounce_api_error',
        detailKeys: ['error', 'Message', 'message'],
        fallbackMessage: 'The request could not be completed.'
      })
    );
    if (isApiErrorRecord(result)) {
      let message = result.error || result.Message;
      if (typeof message === 'string' && message.trim()) {
        throw createApiServiceError(`ZeroBounce API ${operation} failed: ${message}`, {
          reason: 'zerobounce_api_error'
        });
      }
    }
    return result;
  }

  async validateEmail(params: {
    email: string;
    ipAddress?: string;
    timeout?: number;
    activityData?: boolean;
    verifyPlus?: boolean;
  }) {
    return this.request('validate email', () =>
      this.axios.get<ValidationResult>('/validate', {
        params: {
          api_key: this.apiKey,
          email: params.email,
          ip_address: params.ipAddress,
          timeout: params.timeout,
          activity_data: params.activityData,
          verify_plus: params.verifyPlus
        }
      })
    );
  }

  async validateBatch(params: {
    emails: Array<{ emailAddress: string; ipAddress?: string }>;
    timeout?: number;
    activityData?: boolean;
    verifyPlus?: boolean;
  }) {
    let result = await this.request('validate batch', () =>
      this.axios.post<BatchValidationResult>('/validatebatch', {
        api_key: this.apiKey,
        email_batch: params.emails.map(e => ({
          email_address: e.emailAddress,
          ip_address: e.ipAddress || null
        })),
        timeout: params.timeout,
        activity_data: params.activityData,
        verify_plus: params.verifyPlus
      })
    );
    let globalError = result.errors?.find(error => error.email_address === 'all');
    if (globalError) {
      throw createApiServiceError(
        `ZeroBounce batch validation failed: ${globalError.error || 'Check your API key and available credits.'}`,
        { reason: 'zerobounce_api_error' }
      );
    }
    return result;
  }

  async scoreEmail(email: string) {
    return this.request('score email', () =>
      this.axios.get<ScoringResult>('/scoring', {
        params: { api_key: this.apiKey, email }
      })
    );
  }

  async findEmail(params: {
    domain?: string;
    companyName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  }) {
    if (!params.domain?.trim() && !params.companyName?.trim()) {
      throw createApiServiceError('Provide a domain or companyName to search.');
    }
    return this.request('search email formats', () =>
      this.axios.get<EmailSearchResult>('/guessformat', {
        params: {
          api_key: this.apiKey,
          domain: params.domain,
          company_name: params.companyName,
          first_name: params.firstName,
          middle_name: params.middleName,
          last_name: params.lastName
        }
      })
    );
  }

  async getActivityData(email: string) {
    return this.request('get activity data', () =>
      this.axios.get<{
        found: boolean;
        active_in_days?: string | null;
        active_first_seen?: string | null;
      }>('/activity', { params: { api_key: this.apiKey, email } })
    );
  }

  async getCredits() {
    let result = await this.request('get credits', () =>
      this.axios.get<{ Credits: string | number }>('/getcredits', {
        params: { api_key: this.apiKey }
      })
    );
    let credits = Number(result.Credits);
    if (!Number.isFinite(credits) || credits < 0) {
      throw createApiServiceError(
        'ZeroBounce could not retrieve credits. Check your API key.',
        {
          reason: 'zerobounce_api_error'
        }
      );
    }
    return result;
  }

  async getApiUsage(startDate: string, endDate: string) {
    return this.request('get API usage', () =>
      this.axios.get<Record<string, string | number>>('/getapiusage', {
        params: {
          api_key: this.apiKey,
          start_date: startDate,
          end_date: endDate
        }
      })
    );
  }
}
