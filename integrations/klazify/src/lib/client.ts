import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let emailSchema = z.email();

export interface KlazifyCompany {
  name?: string | null;
  city?: string | null;
  stateCode?: string | null;
  countryCode?: string | null;
  employeesRange?: string | null;
  revenue?: string | number | null;
  raised?: string | null;
  tags?: string[] | null;
  tech?: string[] | null;
}

export interface KlazifyRegistration {
  domain_age_date?: string | null;
  domain_age_days_ago?: string | number | null;
  domain_expiration_date?: string | null;
  domain_expiration_days_left?: string | number | null;
}

export interface KlazifyDomainResponse {
  domain?: {
    domain_url?: string | null;
    updated_at?: string | null;
    categories?: { confidence: number; name: string; [key: string]: unknown }[] | null;
    logo_url?: string | null;
    social_media?: Record<string, string | null> | null;
    similar_domains?: string[] | null;
    parked?: boolean | null;
  } | null;
  objects?: { company?: KlazifyCompany | null } | null;
  domain_registration_data?: KlazifyRegistration | null;
  similar_domains?: string[] | null;
  similar?: string[] | null;
}

export interface KlazifyDiscoveryInput {
  top_n?: number;
  filters?: {
    category?: string;
    country?: string;
    tech?: string;
    employees?: string;
    has_company?: boolean;
    tld?: string;
  };
  q?: string;
  sort?:
    | 'global_rank'
    | 'domain'
    | 'company_name'
    | 'monthly_visits_latest'
    | 'popularity_score';
  sort_dir?: 'asc' | 'desc';
  page?: number;
}

export interface KlazifyDiscoveryResponse {
  total: number;
  page: number;
  total_pages: number;
  total_is_lower_bound?: boolean;
  results: {
    domain: string;
    company_name?: string | null;
    company_country?: string | null;
    company_employees?: string | null;
    company_revenue?: string | number | null;
    primary_category?: string | null;
    primary_iab_name?: string | null;
    tech_stack?: string[] | null;
    global_rank?: number | null;
    monthly_visits?: number | null;
    logo_url?: string | null;
  }[];
}

export class KlazifyClient {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Klazify API key is required. Reconnect with a valid API key.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://www.klazify.com/api',
      timeout: 120000,
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private async request<T>(path: string, payload?: object) {
    let result = await requestAxiosData<T>(
      path,
      () =>
        payload === undefined ? this.axios.get<T>(path) : this.axios.post<T>(path, payload),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Klazify',
          operation,
          reason: 'klazify_request_failed'
        })
    );

    if (!isApiErrorRecord(result)) {
      throw createApiServiceError(
        'Klazify returned an invalid response. Try the request again.',
        {
          reason: 'klazify_invalid_response'
        }
      );
    }
    if (result.success === false) {
      throw createApiServiceError(
        `Klazify request failed: ${extractApiErrorMessage({ response: { data: result } })}`,
        {
          reason: 'klazify_request_failed',
          upstreamCode: typeof result.code === 'string' ? result.code : undefined
        }
      );
    }
    return result;
  }

  private domainRequest(path: string, url: string, refresh?: boolean) {
    if (!url.trim()) {
      throw createApiServiceError('Provide a URL, domain, or email address to look up.');
    }
    let isEmail =
      (path === '/categorize' || path === '/domain_company') &&
      emailSchema.safeParse(url.trim()).success;
    return this.request<KlazifyDomainResponse>(path, {
      ...(isEmail ? { email: url.trim() } : { url }),
      ...(refresh === undefined ? {} : { refresh })
    });
  }

  async categorize(url: string) {
    return this.domainRequest('/categorize', url);
  }

  async realTimeCategorization(url: string, refresh?: boolean) {
    return this.domainRequest('/real_time_categorization', url, refresh);
  }

  async iabCategories(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_iab_categories', url, refresh);
  }

  async companyData(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_company', url, refresh);
  }

  async techStack(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_tech', url, refresh);
  }

  async logo(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_logo', url, refresh);
  }

  async socialMedia(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_social_media', url, refresh);
  }

  async domainExpiration(url: string, refresh?: boolean) {
    return this.domainRequest('/domain_expiration', url, refresh);
  }

  async similarDomains(url: string, refresh?: boolean) {
    return this.domainRequest('/similar_domain', url, refresh);
  }

  async parkedDomain(url: string) {
    return this.domainRequest('/domain_parked', url);
  }

  async listCategories(version: 'v1' | 'v2') {
    let result = await this.request<{ version: string; count: number; categories: string[] }>(
      `/list-category/${version}`
    );
    if (!Array.isArray(result.categories)) {
      throw createApiServiceError(
        'Klazify did not return a category list. Try the request again.'
      );
    }
    return result;
  }

  async discover(input: KlazifyDiscoveryInput) {
    let result = await this.request<KlazifyDiscoveryResponse>('/discovery', input);
    if (!Array.isArray(result.results)) {
      throw createApiServiceError(
        'Klazify did not return discovery results. Try the request again.'
      );
    }
    return result;
  }
}
