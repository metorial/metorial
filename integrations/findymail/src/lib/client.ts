import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface IntellimatchStatus {
  status: string;
  progress?: number;
  total_jobs?: number;
  processed_jobs?: number;
  pending_jobs?: number;
  failed_jobs?: number;
}

export interface IntellimatchResults {
  data: {
    id?: string | number;
    name?: string | null;
    domain?: string | null;
    description?: string | null;
    employee_count_range?: string | null;
    industries?: string[] | null;
    country?: string | null;
    match_score?: number | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_job_title?: string | null;
    contact_phone?: string | null;
    contact_linkedin_url?: string | null;
  }[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SavedContacts {
  data: {
    id: string | number;
    name?: string | null;
    email?: string | null;
    linkedin_url?: string | null;
    company?: string | null;
    job_title?: string | null;
  }[];
  recordsTotal: number;
  recordsFiltered: number;
}

export class FindymailClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.findymail.com/api',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 60_000,
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Findymail',
          reason: 'findymail_api_error'
        })
    });
    this.http.interceptors.response.use(response => {
      if (typeof response.data?.error === 'string' && response.data.error) {
        throw createApiServiceError(`Findymail API request failed: ${response.data.error}`, {
          reason: 'findymail_api_error',
          upstreamStatus: response.status
        });
      }
      return response;
    });
  }

  async findEmailByName(params: { name: string; domain: string }) {
    let res = await this.http.post('/search/name', {
      name: params.name,
      domain: params.domain
    });
    return res.data;
  }

  async findEmailByLinkedIn(params: { linkedinUrl: string }) {
    let res = await this.http.post('/search/business-profile', {
      linkedin_url: params.linkedinUrl
    });
    return res.data;
  }

  async verifyEmail(params: { email: string }) {
    let res = await this.http.post('/verify', {
      email: params.email
    });
    return res.data;
  }

  async reverseEmailLookup(params: { email: string; withProfile?: boolean }) {
    let res = await this.http.post('/search/reverse-email', {
      email: params.email,
      with_profile: params.withProfile ?? false
    });
    return res.data;
  }

  async findPhone(params: { linkedinUrl: string }) {
    let res = await this.http.post('/search/phone', {
      linkedin_url: params.linkedinUrl
    });
    return res.data;
  }

  async enrichCompany(params: { domain?: string; linkedinUrl?: string; name?: string }) {
    let body: Record<string, string> = {};
    if (params.domain) body.domain = params.domain;
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl;
    if (params.name) body.name = params.name;
    let res = await this.http.post('/search/company', body);
    return res.data;
  }

  async searchEmployees(params: { website: string; jobTitles: string[]; count?: number }) {
    let res = await this.http.post('/search/employees', {
      website: params.website,
      job_titles: params.jobTitles,
      count: params.count
    });
    return res.data;
  }

  async intellimatchSearch(params: {
    query: string;
    limit?: number;
    findContact?: boolean;
    findEmail?: boolean;
  }) {
    let res = await this.http.post('/intellimatch/search', {
      query: params.query,
      limit: params.limit,
      config: {
        find_contact: params.findContact ?? false,
        find_email: params.findEmail ?? false
      }
    });
    return res.data;
  }

  async getIntellimatchStatus(params: { hash: string }) {
    let res = await this.http.get<IntellimatchStatus>('/intellimatch/status', {
      params: { hash: params.hash }
    });
    return res.data;
  }

  async getIntellimatchData(params: { hash: string; page?: number; perPage?: number }) {
    let res = await this.http.get<IntellimatchResults>('/intellimatch/data', {
      params: { hash: params.hash, page: params.page, per_page: params.perPage }
    });
    return res.data;
  }

  async getContactLists() {
    let res = await this.http.get('/lists');
    return res.data;
  }

  async listContacts(params: { listId: string }) {
    let res = await this.http.get<SavedContacts>(
      `/contacts/get/${encodeURIComponent(params.listId)}`
    );
    return res.data;
  }

  async getCredits() {
    let res = await this.http.get('/credits');
    return res.data;
  }
}
