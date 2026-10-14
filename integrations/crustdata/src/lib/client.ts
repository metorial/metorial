import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let mapCrustdataError = (error: unknown) => {
  let normalized =
    isApiErrorRecord(error) && error.name === 'SlateError' && isApiErrorRecord(error.data)
      ? error.data
      : undefined;
  let upstream =
    normalized && isApiErrorRecord(normalized.upstream) ? normalized.upstream : undefined;
  let baggage =
    normalized && isApiErrorRecord(normalized.baggage) ? normalized.baggage : undefined;
  let mapped = buildApiServiceError(error, {
    providerLabel: 'Crustdata',
    reason: 'crustdata_api_error',
    nestedKeys: ['error', 'errors'],
    extractResponse: () =>
      normalized
        ? {
            status:
              typeof upstream?.status === 'number'
                ? upstream.status
                : typeof normalized.status === 'number'
                  ? normalized.status
                  : undefined,
            data: baggage?.response
          }
        : undefined,
    extractUpstreamCode: () => (typeof upstream?.code === 'string' ? upstream.code : undefined)
  });
  if (normalized && mapped !== error) {
    mapped.data.normalizedError = normalized;
    mapped.data.retryable = normalized.retryable;
    mapped.data.provider = normalized.provider;
    mapped.data.upstream = normalized.upstream;
  }
  return mapped;
};

export interface CreditBalanceResponse {
  account: {
    credits: number;
    recurring_credits: number;
    recurring_credits_frequency: string | null;
    recurring_credits_refresh_date: string | null;
    wallets?: Record<string, unknown>[];
    credit_topups?: Record<string, unknown>[];
    [key: string]: unknown;
  };
}

export interface EndpointPermissionsResponse {
  api_version: string;
  token_limit_rpm: number | null;
  endpoints: Array<{
    path: string;
    category: string;
    status: string;
    effective_rate_limit_rpm: number | null;
    fields: { enabled: string[]; disabled: string[] };
    [key: string]: unknown;
  }>;
}

let BASE_URL = 'https://api.crustdata.com';

export interface ScreenerFilter {
  op: string;
  conditions: Array<{
    column: string;
    type: string;
    value: string | number | boolean;
    allowNull?: boolean;
  }>;
}

export interface SearchFilter {
  filterType: string;
  type?: string;
  value?: unknown;
  subFilter?: string;
}

export interface SortOption {
  column: string;
  direction: string;
}

export class CrustdataClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private currentHttp: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Crustdata API token is required. Reconnect with a valid token.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Token ${token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: mapCrustdataError
    });
    this.currentHttp = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json', 'x-api-version': '2025-11-01' },
      errorAdapter: mapCrustdataError
    });
  }

  // ─── Company Enrichment ────────────────────────────────────────────

  async enrichCompany(params: {
    companyDomain?: string;
    companyName?: string;
    companyId?: string;
    fields?: string[];
    enrichRealtime?: boolean;
  }) {
    if (
      ![params.companyDomain, params.companyName, params.companyId].some(value =>
        value?.trim()
      )
    ) {
      throw createApiServiceError(
        'Provide a company domain, company name, or Crustdata company ID.'
      );
    }
    let queryParams = new URLSearchParams();
    if (params.companyDomain) queryParams.set('company_domain', params.companyDomain);
    if (params.companyName) queryParams.set('company_name', params.companyName);
    if (params.companyId) queryParams.set('company_id', params.companyId);
    if (params.fields && params.fields.length > 0)
      queryParams.set('fields', params.fields.join(','));
    if (params.enrichRealtime) queryParams.set('enrich_realtime', 'True');

    let response = await this.http.get(`/screener/company?${queryParams.toString()}`);
    return response.data;
  }

  // ─── Company Screening ────────────────────────────────────────────

  async screenCompanies(params: {
    filters: ScreenerFilter;
    offset?: number;
    count?: number;
    sorts?: SortOption[];
  }) {
    let body = {
      filters: {
        op: params.filters.op,
        conditions: params.filters.conditions.map(c => ({
          column: c.column,
          type: c.type,
          value: c.value,
          allow_null: c.allowNull ?? false
        }))
      },
      offset: params.offset ?? 0,
      count: params.count ?? 100,
      sorts: params.sorts ?? []
    };

    let response = await this.http.post('/screener/screen/', body);
    return response.data;
  }

  // ─── Company Search (via filters) ─────────────────────────────────

  async searchCompanies(params: { filters: SearchFilter[]; page?: number }) {
    let body = {
      filters: params.filters.map(f => ({
        filter_type: f.filterType,
        ...(f.type !== undefined ? { type: f.type } : {}),
        ...(f.value !== undefined ? { value: f.value } : {}),
        ...(f.subFilter !== undefined ? { sub_filter: f.subFilter } : {})
      })),
      page: params.page ?? 1
    };

    let response = await this.http.post('/screener/company/search', body);
    return response.data;
  }

  // ─── People Enrichment ────────────────────────────────────────────

  async enrichPerson(params: {
    linkedinProfileUrl?: string;
    email?: string;
    name?: string;
    companyName?: string;
    fields?: string[];
    enrichRealtime?: boolean;
  }) {
    if (![params.linkedinProfileUrl, params.email, params.name].some(value => value?.trim())) {
      throw createApiServiceError('Provide a LinkedIn profile URL, email, or person name.');
    }
    let queryParams = new URLSearchParams();
    if (params.linkedinProfileUrl)
      queryParams.set('linkedin_profile_url', params.linkedinProfileUrl);
    if (params.email) queryParams.set('email', params.email);
    if (params.name) queryParams.set('name', params.name);
    if (params.companyName) queryParams.set('company_name', params.companyName);
    if (params.fields && params.fields.length > 0)
      queryParams.set('fields', params.fields.join(','));
    if (params.enrichRealtime) queryParams.set('enrich_realtime', 'True');

    let response = await this.http.get(`/screener/person/enrich?${queryParams.toString()}`);
    return response.data;
  }

  // ─── People Search (via filters) ──────────────────────────────────

  async searchPeople(params: { filters: SearchFilter[]; page?: number }) {
    let body = {
      filters: params.filters.map(f => ({
        filter_type: f.filterType,
        ...(f.type !== undefined ? { type: f.type } : {}),
        ...(f.value !== undefined ? { value: f.value } : {})
      })),
      page: params.page ?? 1
    };

    let response = await this.http.post('/screener/person/search', body);
    return response.data;
  }

  // ─── Job Listings ──────────────────────────────────────────────────

  async searchJobListings(params: {
    tickers: string[];
    filters?: ScreenerFilter;
    offset?: number;
    count?: number;
    sorts?: SortOption[];
  }) {
    let body: Record<string, unknown> = {
      tickers: params.tickers,
      offset: params.offset ?? 0,
      count: params.count ?? 100,
      sorts: params.sorts ?? []
    };

    if (params.filters) {
      body.filters = {
        op: params.filters.op,
        conditions: params.filters.conditions.map(c => ({
          column: c.column,
          type: c.type,
          value: c.value,
          allow_null: c.allowNull ?? false
        }))
      };
    }

    let response = await this.http.post('/screener/job_listings/table', body);
    return response.data;
  }

  // ─── Social Posts (by person) ──────────────────────────────────────

  async getSocialPostsByPerson(params: { personLinkedinUrl: string; page?: number }) {
    let queryParams = new URLSearchParams();
    queryParams.set('person_linkedin_url', params.personLinkedinUrl);
    if (params.page) queryParams.set('page', String(params.page));

    let response = await this.http.get(`/screener/social_posts?${queryParams.toString()}`);
    return response.data;
  }

  // ─── LinkedIn Posts (by company) ───────────────────────────────────

  async getLinkedinPostsByCompany(params: { companyLinkedinUrl: string; page?: number }) {
    let queryParams = new URLSearchParams();
    queryParams.set('company_linkedin_url', params.companyLinkedinUrl);
    if (params.page) queryParams.set('page', String(params.page));

    let response = await this.http.get(
      `/screener/linkedin_posts/company?${queryParams.toString()}`
    );
    return response.data;
  }

  // ─── LinkedIn Posts Keyword Search ─────────────────────────────────

  async searchLinkedinPostsByKeyword(params: {
    keyword: string;
    page?: number;
    sortBy?: string;
    datePosted?: string;
  }) {
    let queryParams = new URLSearchParams();
    queryParams.set('keyword', params.keyword);
    if (params.page) queryParams.set('page', String(params.page));
    if (params.sortBy) queryParams.set('sort_by', params.sortBy);
    if (params.datePosted) queryParams.set('date_posted', params.datePosted);

    let response = await this.http.get(
      `/screener/linkedin_posts/search?${queryParams.toString()}`
    );
    return response.data;
  }

  // ─── Web Search ────────────────────────────────────────────────────

  async webSearch(params: {
    query: string;
    geolocation?: string;
    sources?: string[];
    site?: string;
    startDate?: number;
    endDate?: number;
    fetchContent?: boolean;
  }) {
    let queryString = params.fetchContent ? '?fetch_content=true' : '';

    let body: Record<string, unknown> = {
      query: params.query
    };
    if (params.geolocation) body.geolocation = params.geolocation;
    if (params.sources) body.sources = params.sources;
    if (params.site) body.site = params.site;
    if (params.startDate !== undefined) body.startDate = params.startDate;
    if (params.endDate !== undefined) body.endDate = params.endDate;

    let response = await this.http.post(`/screener/web-search${queryString}`, body);
    return response.data;
  }

  async getCreditBalance() {
    let response = await this.currentHttp.get<CreditBalanceResponse>('/account/credits');
    return response.data;
  }

  async listEndpointPermissions(params: {
    path?: string;
    category?: string;
    status?: string;
  }) {
    let response = await this.currentHttp.get<EndpointPermissionsResponse>(
      '/account/endpoints',
      {
        params
      }
    );
    return response.data;
  }

  // ─── Investor Portfolio ────────────────────────────────────────────

  async getInvestorPortfolio(params: { investorName: string }) {
    let queryParams = new URLSearchParams();
    queryParams.set('investor_name', params.investorName);

    let response = await this.http.get(
      `/screener/investor_portfolio?${queryParams.toString()}`
    );
    return response.data;
  }

  // ─── Decision Makers ───────────────────────────────────────────────

  async getDecisionMakers(params: {
    decisionMakerTitles: string[];
    filters?: ScreenerFilter;
    offset?: number;
    count?: number;
    sorts?: SortOption[];
  }) {
    let body: Record<string, unknown> = {
      decision_maker_titles: params.decisionMakerTitles,
      offset: params.offset ?? 0,
      count: params.count ?? 100,
      sorts: params.sorts ?? []
    };

    if (params.filters) {
      body.filters = {
        op: params.filters.op,
        conditions: params.filters.conditions.map(c => ({
          column: c.column,
          type: c.type,
          value: c.value,
          allow_null: c.allowNull ?? false
        }))
      };
    }

    let response = await this.http.post('/screener/decision_makers/table', body);
    return response.data;
  }
}
