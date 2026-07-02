import { createAxios } from 'slates';

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
  person_linkedin_urls?: PeopleSearchFilter[];
  person_locations?: PeopleSearchFilter[];
  person_skills?: PeopleSearchFilter[];
  person_universities?: PeopleSearchFilter[];
  person_ids?: PeopleSearchFilter[];
  current_company_names?: PeopleSearchFilter[];
  current_company_domains?: PeopleSearchFilter[];
  current_company_linkedin_urls?: PeopleSearchFilter[];
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
  linkedin_urls?: PeopleSearchFilter[];
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

  async startEnrichment(request: StartEnrichmentRequest): Promise<{ enrichmentId: string }> {
    let response = await v1Client.post('/contact/enrich/bulk', request, {
      headers: this.authHeaders
    });
    return { enrichmentId: response.data.enrichment_id };
  }

  async getEnrichmentResult(enrichmentId: string, forceResults?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (forceResults) {
      params.forceResults = true;
    }
    let response = await v1Client.get(`/contact/enrich/bulk/${enrichmentId}`, {
      headers: this.authHeaders,
      params
    });
    return response.data;
  }

  async startReverseEmailLookup(
    request: StartReverseEmailRequest
  ): Promise<{ enrichmentId: string }> {
    let response = await v2Client.post('/contact/reverse/email/bulk', request, {
      headers: this.authHeaders
    });
    return { enrichmentId: response.data.enrichment_id };
  }

  async getReverseEmailResult(enrichmentId: string): Promise<any> {
    let response = await v2Client.get(`/contact/reverse/email/bulk/${enrichmentId}`, {
      headers: this.authHeaders
    });
    return response.data;
  }

  async searchPeople(request: PeopleSearchRequest): Promise<any> {
    let response = await v2Client.post('/people/search', request, {
      headers: this.authHeaders
    });
    return response.data;
  }

  async searchCompanies(request: CompanySearchRequest): Promise<any> {
    let response = await v2Client.post('/company/search', request, {
      headers: this.authHeaders
    });
    return response.data;
  }

  async getCreditBalance(): Promise<{ balance: number }> {
    let response = await v1Client.get('/account/credits', {
      headers: this.authHeaders
    });
    return { balance: response.data.balance };
  }

  async verifyApiKey(): Promise<{ workspaceId: string }> {
    let response = await v1Client.get('/account/keys/verify', {
      headers: this.authHeaders
    });
    return { workspaceId: response.data.workspace_id };
  }
}
