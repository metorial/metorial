import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface IndividualRevealRequest {
  profileUrl?: string;
  fullName?: string;
  company?: string;
  domain?: string;
  email?: string;
  enrichmentLevel?: 'none' | 'partial' | 'phone' | 'full';
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  callbackUrl?: string;
}

export interface IndividualRevealResponse {
  status: {
    code: number;
    message: string;
  };
  type: string;
  data: {
    id: number;
    status: string;
    is_complete: boolean;
    name?: string | null;
    title?: string | null;
    location?: string | null;
    linkedin_profile_url?: string | null;
    email?: string | null;
    email_type?: string | null;
    email_status?: string | null;
    emails?: Array<{
      email: string;
      email_type: string;
      email_status: string;
    }>;
    mobile_phone?: string | null;
    phone_number?: string | null;
    phone_status?: string | null;
    phones?: Array<{
      number?: string | null;
      type?: string | null;
      pretty_number?: string | null;
      phone_number?: string | null;
      phone_type?: string | null;
    }>;
    company?: string | null;
    company_domain?: string | null;
    company_linkedin?: string | null;
    company_size?: number | null;
    company_size_range?: string | null;
    company_type?: string | null;
    company_location?: string | null;
    company_locality?: string | null;
    company_region?: string | null;
    company_country?: string | null;
    company_street?: string | null;
    company_postal_code?: string | null;
    company_industry?: string | null;
    company_subindustry?: string | null;
    company_description?: string | null;
    company_founded?: number | null;
    company_funding?: string | number | null;
    company_revenue?: string | number | null;
    enrichment_level?: string | null;
    headline?: string | null;
    bio?: string | null;
    work_history?: Record<string, unknown>[];
    skills?: string[];
    languages?: string[];
    certifications?: Record<string, unknown>[];
    education?: Record<string, unknown>[];
    is_premium?: boolean | null;
    is_open_to_work?: boolean | null;
    tenure_at_company?: string | null;
    tenure_at_role?: string | null;
    fail_error?: string | null;
    credits?: {
      email_credits: number;
      phone_credits: number;
      export_credits: number;
      api_credits: {
        total: number;
        email_credits: number;
        phone_credits: number;
        scrape_credits: number;
      };
    };
    [key: string]: unknown;
  };
}

export interface CompanyEnrichmentRequest {
  companyName?: string;
  companyDomain?: string;
  companyLinkedinId?: string;
  companyLinkedinSlug?: string;
}

export interface CompanyEnrichmentResponse {
  status: {
    code: number;
    message: string;
  };
  type: string;
  data: {
    company_name?: string | null;
    company_domain?: string | null;
    company_linkedin?: string | null;
    company_industry?: string | null;
    company_subindustry?: string | null;
    company_size?: number | null;
    company_size_range?: string | null;
    company_type?: string | null;
    company_description?: string | null;
    company_founded?: number | null;
    company_revenue?: string | number | null;
    company_revenue_range?: string | null;
    company_funding?: string | number | null;
    company_last_funding_round?: string | null;
    company_ticker?: string | null;
    company_location?: string | null;
    company_street?: string | null;
    company_locality?: string | null;
    company_region?: string | null;
    company_postal_code?: string | null;
    company_country?: string | null;
    twitter_url?: string | null;
    facebook_url?: string | null;
    linkedin_url?: string | null;
    company_twitter?: string | null;
    company_facebook?: string | null;
    company_linkedin_id?: string | null;
    [key: string]: unknown;
  };
}

export interface CreditsResponse {
  credits: {
    email_credits: number | string;
    phone_credits: number | string;
    export_credits: number | string;
    api_credits: number | string;
  };
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Wiza API key to connect your account.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://wiza.co/api',
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      },
      errorMapping: {
        extractResponseData: response =>
          isApiErrorRecord(response.data) && isApiErrorRecord(response.data.status)
            ? response.data.status
            : response.data
      }
    });
  }

  private async request<T>(
    operation: string,
    method: 'get' | 'post',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    resultField: 'data' | 'credits' = 'data'
  ): Promise<T> {
    let result = await requestAxiosData<T>(
      operation,
      () => this.axios.request<T>({ method, url, data, params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Wiza',
          reason: 'wiza_api_error',
          operation
        })
    );
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError('Wiza returned an invalid response.');
    }
    let status = isApiErrorRecord(result.status) ? result.status.code : result.status;
    if (typeof status === 'number' && status >= 400) {
      let message = isApiErrorRecord(result.status) ? result.status.message : undefined;
      throw createApiServiceError(
        `Wiza API ${operation} failed: ${typeof message === 'string' ? message : `status ${status}`}`,
        { reason: 'wiza_api_error', upstreamStatus: status }
      );
    }
    if (result[resultField] === undefined || result[resultField] === null) {
      throw createApiServiceError(`Wiza returned no ${resultField} for ${operation}.`);
    }
    return result;
  }

  async startIndividualReveal(
    request: IndividualRevealRequest
  ): Promise<IndividualRevealResponse> {
    if (
      !request.profileUrl?.trim() &&
      !request.email?.trim() &&
      !(request.fullName?.trim() && (request.company?.trim() || request.domain?.trim()))
    ) {
      throw createApiServiceError(
        'Provide a profileUrl, an email, or a fullName with companyName or companyDomain.'
      );
    }
    let individualReveal: Record<string, unknown> = {};

    if (request.profileUrl?.trim()) {
      individualReveal.profile_url = request.profileUrl;
    } else if (request.email?.trim()) {
      individualReveal.email = request.email;
    } else if (request.fullName?.trim()) {
      individualReveal.full_name = request.fullName;
      if (request.domain) {
        individualReveal.domain = request.domain;
      }
      if (request.company) {
        individualReveal.company = request.company;
      }
    }

    let body: Record<string, unknown> = {
      individual_reveal: individualReveal
    };

    if (request.enrichmentLevel) {
      body.enrichment_level = request.enrichmentLevel;
    }

    let emailOptions: Record<string, boolean> = {};
    if (request.acceptWork !== undefined) {
      emailOptions.accept_work = request.acceptWork;
    }
    if (request.acceptPersonal !== undefined) {
      emailOptions.accept_personal = request.acceptPersonal;
    }
    if (Object.keys(emailOptions).length > 0) {
      body.email_options = emailOptions;
    }

    if (request.callbackUrl) {
      body.callback_url = request.callbackUrl;
    }

    return this.request('start contact enrichment', 'post', '/individual_reveals', body);
  }

  async getIndividualReveal(revealId: number): Promise<IndividualRevealResponse> {
    if (!Number.isSafeInteger(revealId) || revealId <= 0) {
      throw createApiServiceError(
        'Provide the positive integer revealId from Enrich Contact.'
      );
    }
    return this.request('get contact enrichment', 'get', `/individual_reveals/${revealId}`);
  }

  async enrichCompany(request: CompanyEnrichmentRequest): Promise<CompanyEnrichmentResponse> {
    if (!Object.values(request).some(value => value?.trim())) {
      throw createApiServiceError(
        'Provide companyName, companyDomain, companyLinkedinId, or companyLinkedinSlug.'
      );
    }
    let body = pickDefined({
      company_name: request.companyName,
      company_domain: request.companyDomain,
      company_linkedin_id: request.companyLinkedinId,
      company_linkedin_slug: request.companyLinkedinSlug
    });

    return this.request('enrich company', 'post', '/company_enrichments', body);
  }

  async getCredits(): Promise<CreditsResponse> {
    return this.request(
      'check credits',
      'get',
      '/meta/credits',
      undefined,
      undefined,
      'credits'
    );
  }

  async searchProspects(request: { filters: Record<string, unknown>; size: number }) {
    return this.request<{
      data: {
        total: number;
        profiles?: Array<{
          full_name?: string | null;
          linkedin_url?: string | null;
          industry?: string | null;
          job_title?: string | null;
          job_title_role?: string | null;
          job_title_sub_role?: string | null;
          job_company_name?: string | null;
          job_company_website?: string | null;
          location_name?: string | null;
        }>;
        credits?: Record<string, unknown>;
      };
    }>('search prospects', 'post', '/prospects/search', request);
  }

  async searchLocations(query: string) {
    return this.request<{
      data: Array<{ key: string; bucket: string; count: number }>;
    }>('search locations', 'get', '/meta/location_autocomplete', undefined, { query });
  }

  async searchTechnologies(query: string) {
    return this.request<{
      data: Array<{ slug: string; name: string }>;
    }>('search technologies', 'get', '/meta/technology_autocomplete', undefined, { query });
  }
}
