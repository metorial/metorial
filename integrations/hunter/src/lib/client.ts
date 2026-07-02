import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(private config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.hunter.io/v2'
    });
  }

  private get headers() {
    return {
      'X-API-KEY': this.config.token,
      'Content-Type': 'application/json'
    };
  }

  // ── Account ──────────────────────────────────────────────

  async getAccount() {
    let response = await this.http.get('/account', { headers: this.headers });
    return response.data.data;
  }

  // ── Domain Search ────────────────────────────────────────

  async domainSearch(params: {
    domain?: string;
    company?: string;
    limit?: number;
    offset?: number;
    type?: string;
    seniority?: string;
    department?: string;
    requiredField?: string;
    verificationStatus?: string;
    location?: string;
    jobTitles?: string[];
  }) {
    let query: Record<string, any> = {};
    if (params.domain) query.domain = params.domain;
    if (params.company) query.company = params.company;
    if (params.limit) query.limit = params.limit;
    if (params.offset) query.offset = params.offset;
    if (params.type) query.type = params.type;
    if (params.seniority) query.seniority = params.seniority;
    if (params.department) query.department = params.department;
    if (params.requiredField) query.required_field = params.requiredField;
    if (params.verificationStatus) query.verification_status = params.verificationStatus;
    if (params.location) query.location = params.location;
    if (params.jobTitles && params.jobTitles.length > 0) query.job_titles = params.jobTitles;

    let response = await this.http.get('/domain-search', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  // ── Email Finder ─────────────────────────────────────────

  async findEmail(params: {
    domain?: string;
    company?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    linkedinHandle?: string;
    maxDuration?: number;
  }) {
    let query: Record<string, any> = {};
    if (params.domain) query.domain = params.domain;
    if (params.company) query.company = params.company;
    if (params.firstName) query.first_name = params.firstName;
    if (params.lastName) query.last_name = params.lastName;
    if (params.fullName) query.full_name = params.fullName;
    if (params.linkedinHandle) query.linkedin_handle = params.linkedinHandle;
    if (params.maxDuration) query.max_duration = params.maxDuration;

    let response = await this.http.get('/email-finder', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  // ── Email Verifier ───────────────────────────────────────

  async verifyEmail(email: string) {
    let response = await this.http.get('/email-verifier', {
      headers: this.headers,
      params: { email }
    });
    return response.data;
  }

  // ── Email Count ──────────────────────────────────────────

  async getEmailCount(params: { domain?: string; company?: string; type?: string }) {
    let query: Record<string, any> = {};
    if (params.domain) query.domain = params.domain;
    if (params.company) query.company = params.company;
    if (params.type) query.type = params.type;

    let response = await this.http.get('/email-count', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  // ── Enrichment ───────────────────────────────────────────

  async enrichPerson(params: { email?: string; linkedinHandle?: string }) {
    let query: Record<string, any> = {};
    if (params.email) query.email = params.email;
    if (params.linkedinHandle) query.linkedin_handle = params.linkedinHandle;

    let response = await this.http.get('/people/find', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async enrichCompany(domain: string) {
    let response = await this.http.get('/companies/find', {
      headers: this.headers,
      params: { domain }
    });
    return response.data;
  }

  async enrichCombined(email: string) {
    let response = await this.http.get('/combined/find', {
      headers: this.headers,
      params: { email }
    });
    return response.data;
  }

  // ── Discover ─────────────────────────────────────────────

  async discoverCompanies(params: {
    query?: string;
    organization?: Record<string, any>;
    headquartersLocation?: Record<string, any>;
    industry?: string[];
    headcount?: Record<string, any>;
    companyType?: string[];
    limit?: number;
    offset?: number;
  }) {
    let body: Record<string, any> = {};
    if (params.query) body.query = params.query;
    if (params.organization) body.organization = params.organization;
    if (params.headquartersLocation) body.headquarters_location = params.headquartersLocation;
    if (params.industry) body.industry = params.industry;
    if (params.headcount) body.headcount = params.headcount;
    if (params.companyType) body.company_type = params.companyType;
    if (params.limit) body.limit = params.limit;
    if (params.offset) body.offset = params.offset;

    let response = await this.http.post('/discover', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Leads ────────────────────────────────────────────────

  async listLeads(params: {
    limit?: number;
    offset?: number;
    leadListId?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    industry?: string;
    verificationStatus?: string;
    sendingStatus?: string;
  }) {
    let query: Record<string, any> = {};
    if (params.limit) query.limit = params.limit;
    if (params.offset) query.offset = params.offset;
    if (params.leadListId) query.lead_list_id = params.leadListId;
    if (params.email) query.email = params.email;
    if (params.firstName) query.first_name = params.firstName;
    if (params.lastName) query.last_name = params.lastName;
    if (params.company) query.company = params.company;
    if (params.industry) query.industry = params.industry;
    if (params.verificationStatus) query.verification_status = params.verificationStatus;
    if (params.sendingStatus) query.sending_status = params.sendingStatus;

    let response = await this.http.get('/leads', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getLead(leadId: number) {
    let response = await this.http.get(`/leads/${leadId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createLead(data: Record<string, any>) {
    let response = await this.http.post('/leads', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateLead(leadId: number, data: Record<string, any>) {
    let response = await this.http.put(`/leads/${leadId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async upsertLead(data: Record<string, any>) {
    let response = await this.http.put('/leads', data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteLead(leadId: number) {
    let response = await this.http.delete(`/leads/${leadId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Leads Lists ──────────────────────────────────────────

  async listLeadsLists(params?: { limit?: number; offset?: number }) {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.http.get('/leads_lists', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getLeadsList(listId: number) {
    let response = await this.http.get(`/leads_lists/${listId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createLeadsList(name: string) {
    let response = await this.http.post(
      '/leads_lists',
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateLeadsList(listId: number, name: string) {
    let response = await this.http.put(
      `/leads_lists/${listId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteLeadsList(listId: number) {
    let response = await this.http.delete(`/leads_lists/${listId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Sequences (Campaigns) ────────────────────────────────

  async listSequences(params?: { limit?: number; offset?: number }) {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.http.get('/campaigns', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async listSequenceRecipients(
    sequenceId: number,
    params?: { limit?: number; offset?: number }
  ) {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.http.get(`/campaigns/${sequenceId}/recipients`, {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async addSequenceRecipients(
    sequenceId: number,
    data: { emails?: string[]; leadIds?: number[] }
  ) {
    let body: Record<string, any> = {};
    if (data.emails) body.emails = data.emails;
    if (data.leadIds) body.lead_ids = data.leadIds;

    let response = await this.http.post(`/campaigns/${sequenceId}/recipients`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelSequenceRecipient(sequenceId: number, recipientEmail: string) {
    let response = await this.http.delete(`/campaigns/${sequenceId}/recipients`, {
      headers: this.headers,
      data: { email: recipientEmail }
    });
    return response.data;
  }

  async startSequence(sequenceId: number) {
    let response = await this.http.post(
      `/campaigns/${sequenceId}/start`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
