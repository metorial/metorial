import { createAxios } from 'slates';

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
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
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
    if (params.startDate) body.startDate = params.startDate;
    if (params.endDate) body.endDate = params.endDate;

    let response = await this.http.post(`/screener/web-search${queryString}`, body);
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
