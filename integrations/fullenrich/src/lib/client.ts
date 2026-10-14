import { buildApiServiceError, createAxios, requestAxiosData } from 'slates';
import type { CompanyRecord, PersonRecord } from './profiles';

let v1Client = createAxios({
  baseURL: 'https://app.fullenrich.com/api/v1'
});

let v2Client = createAxios({
  baseURL: 'https://app.fullenrich.com/api/v2'
});

export interface EnrichContact {
  firstname?: string;
  lastname?: string;
  domain?: string;
  company_name?: string;
  linkedin_url?: string;
  enrich_fields?: string[];
  custom?: Record<string, string>;
}

export interface StartEnrichmentRequest {
  name: string;
  webhook_url?: string;
  webhook_events?: {
    contact_finished?: string;
  };
  datas: EnrichContact[];
}

export interface ReverseEmailContact {
  email: string;
  custom?: Record<string, string>;
}

export interface StartReverseEmailRequest {
  name: string;
  webhook_url?: string;
  webhook_events?: {
    contact_finished?: string;
  };
  data: ReverseEmailContact[];
}

export interface PeopleSearchFilter {
  value: string;
  exclude?: boolean;
  exact_match?: boolean;
}

export interface RangeFilter {
  min?: number;
  max?: number;
  exclude?: boolean;
}

export interface PeopleSearchRequest {
  offset?: number;
  limit?: number;
  search_after?: string;
  person_names?: PeopleSearchFilter[];
  person_professional_network_urls?: PeopleSearchFilter[];
  person_locations?: PeopleSearchFilter[];
  person_skills?: PeopleSearchFilter[];
  person_universities?: PeopleSearchFilter[];
  person_ids?: PeopleSearchFilter[];
  current_company_names?: PeopleSearchFilter[];
  current_company_domains?: PeopleSearchFilter[];
  current_company_professional_network_urls?: PeopleSearchFilter[];
  current_company_specialties?: PeopleSearchFilter[];
  current_company_industries?: PeopleSearchFilter[];
  current_company_types?: PeopleSearchFilter[];
  current_company_headquarters?: PeopleSearchFilter[];
  current_company_ids?: PeopleSearchFilter[];
  current_company_headcounts?: RangeFilter[];
  current_company_founded_years?: RangeFilter[];
  current_company_years_at?: RangeFilter[];
  current_company_days_since_last_job_change?: RangeFilter[];
  past_company_names?: PeopleSearchFilter[];
  past_company_domains?: PeopleSearchFilter[];
  current_position_seniority_level?: PeopleSearchFilter[];
  current_position_titles?: PeopleSearchFilter[];
  past_position_titles?: PeopleSearchFilter[];
  current_position_years_in?: RangeFilter[];
}

export interface CompanySearchRequest {
  offset?: number;
  limit?: number;
  search_after?: string;
  names?: PeopleSearchFilter[];
  domains?: PeopleSearchFilter[];
  professional_network_urls?: PeopleSearchFilter[];
  keywords?: PeopleSearchFilter[];
  specialties?: PeopleSearchFilter[];
  industries?: PeopleSearchFilter[];
  types?: PeopleSearchFilter[];
  headquarters_locations?: PeopleSearchFilter[];
  founded_years?: RangeFilter[];
  headcounts?: RangeFilter[];
  company_ids?: PeopleSearchFilter[];
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  private request<T>(operation: string, request: () => ReturnType<typeof v2Client.get<T>>) {
    return requestAxiosData(operation, request, (error, failedOperation) =>
      buildApiServiceError(error, {
        providerLabel: 'FullEnrich',
        reason: 'fullenrich_api_error',
        operation: failedOperation
      })
    );
  }

  async startEnrichment(request: StartEnrichmentRequest): Promise<{ enrichmentId: string }> {
    let data = await this.request('start contact enrichment', () =>
      v1Client.post<{ enrichment_id: string }>('/contact/enrich/bulk', request, {
        headers: this.authHeaders
      })
    );
    return { enrichmentId: data.enrichment_id };
  }

  async getEnrichmentResult(enrichmentId: string, forceResults?: boolean): Promise<any> {
    return this.request('get contact enrichment result', () =>
      v1Client.get(`/contact/enrich/bulk/${encodeURIComponent(enrichmentId)}`, {
        headers: this.authHeaders,
        params: { forceResults }
      })
    );
  }

  async startReverseEmailLookup(request: StartReverseEmailRequest) {
    let data = await this.request('start reverse email lookup', () =>
      v2Client.post<{ enrichment_id: string }>('/contact/reverse/email/bulk', request, {
        headers: this.authHeaders
      })
    );
    return { enrichmentId: data.enrichment_id };
  }

  async getReverseEmailResult(enrichmentId: string): Promise<{
    id: string;
    name?: string;
    status:
      | 'CREATED'
      | 'IN_PROGRESS'
      | 'CANCELED'
      | 'CREDITS_INSUFFICIENT'
      | 'FINISHED'
      | 'RATE_LIMIT'
      | 'UNKNOWN';
    data?: {
      input?: { email?: string };
      custom?: Record<string, string>;
      profile?: PersonRecord | null;
    }[];
    cost?: { credits?: number };
  }> {
    return this.request('get reverse email result', () =>
      v2Client.get(`/contact/reverse/email/bulk/${encodeURIComponent(enrichmentId)}`, {
        headers: this.authHeaders
      })
    );
  }

  async searchPeople(request: PeopleSearchRequest): Promise<PeopleResponse> {
    return this.request('search people', () =>
      v2Client.post('/people/search', request, { headers: this.authHeaders })
    );
  }

  async searchCompanies(request: CompanySearchRequest): Promise<CompanyResponse> {
    return this.request('search companies', () =>
      v2Client.post('/company/search', request, { headers: this.authHeaders })
    );
  }

  async lookupPerson(request: PersonLookupRequest): Promise<PeopleResponse> {
    return this.request('look up person', () =>
      v2Client.post('/people/lookup', request, { headers: this.authHeaders })
    );
  }

  async lookupCompany(request: CompanyLookupRequest): Promise<CompanyResponse> {
    return this.request('look up company', () =>
      v2Client.post('/company/lookup', request, { headers: this.authHeaders })
    );
  }

  async getCreditBalance(): Promise<{ balance: number }> {
    return this.request('get credit balance', () =>
      v2Client.get('/account/credits', { headers: this.authHeaders })
    );
  }

  async verifyApiKey(): Promise<{ workspaceId: string }> {
    let data = await this.request('verify API key', () =>
      v2Client.get<{ workspace_id: string }>('/account/keys/verify', {
        headers: this.authHeaders
      })
    );
    return { workspaceId: data.workspace_id };
  }
}

export interface PersonLookupRequest {
  person_name?: string;
  person_professional_network_url?: string;
  person_professional_network_id?: number;
  company_domain?: string;
  company_professional_network_url?: string;
  company_professional_network_id?: number;
}

export interface CompanyLookupRequest {
  domain?: string;
  professional_network_url?: string;
  professional_network_id?: number;
}

interface SearchMetadata {
  total?: number;
  credits?: number;
  offset?: number;
  search_after?: string;
}

interface PeopleResponse {
  people?: PersonRecord[];
  metadata?: SearchMetadata;
}

interface CompanyResponse {
  companies?: CompanyRecord[];
  metadata?: SearchMetadata;
}
