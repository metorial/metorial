import { createAxios } from 'slates';

export class TombaClient {
  private http;

  constructor(credentials: { apiKey: string; apiSecret: string }) {
    this.http = createAxios({
      baseURL: 'https://api.tomba.io/v1',
      headers: {
        'X-Tomba-Key': credentials.apiKey,
        'X-Tomba-Secret': credentials.apiSecret
      }
    });
  }

  // ─── Domain Search ───────────────────────────────────────

  async domainSearch(params: {
    domain?: string;
    company?: string;
    page?: number;
    limit?: number;
    country?: string;
    department?: string;
  }) {
    let response = await this.http.get('/domain-search', { params });
    return response.data;
  }

  // ─── Email Finder ────────────────────────────────────────

  async emailFinder(params: {
    domain?: string;
    company?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
  }) {
    let response = await this.http.get('/email-finder', {
      params: {
        domain: params.domain,
        company: params.company,
        full_name: params.fullName,
        first_name: params.firstName,
        last_name: params.lastName
      }
    });
    return response.data;
  }

  // ─── Email Verifier ──────────────────────────────────────

  async emailVerifier(email: string) {
    let response = await this.http.get(`/email-verifier/${encodeURIComponent(email)}`);
    return response.data;
  }

  // ─── Author Finder ───────────────────────────────────────

  async authorFinder(url: string) {
    let response = await this.http.get('/author-finder', { params: { url } });
    return response.data;
  }

  // ─── LinkedIn Finder ─────────────────────────────────────

  async linkedinFinder(url: string) {
    let response = await this.http.get('/linkedin', { params: { url } });
    return response.data;
  }

  // ─── Enrichment ──────────────────────────────────────────

  async enrich(email: string) {
    let response = await this.http.get('/enrich', { params: { email } });
    return response.data;
  }

  // ─── Phone Finder ────────────────────────────────────────

  async phoneFinder(params: {
    email?: string;
    domain?: string;
    linkedin?: string;
    full?: boolean;
  }) {
    let response = await this.http.get('/phone-finder', { params });
    return response.data;
  }

  // ─── Email Count ─────────────────────────────────────────

  async emailCount(domain: string) {
    let response = await this.http.get('/email-count', { params: { domain } });
    return response.data;
  }

  // ─── Domain Status ───────────────────────────────────────

  async domainStatus(domain: string) {
    let response = await this.http.get('/domain-status', { params: { domain } });
    return response.data;
  }

  // ─── Similar Domains ─────────────────────────────────────

  async similarDomains(domain: string) {
    let response = await this.http.get('/similar', { params: { domain } });
    return response.data;
  }

  // ─── Technology ──────────────────────────────────────────

  async technology(domain: string) {
    let response = await this.http.get('/technology', { params: { domain } });
    return response.data;
  }

  // ─── Email Sources ───────────────────────────────────────

  async emailSources(email: string) {
    let response = await this.http.get('/email-sources', { params: { email } });
    return response.data;
  }

  // ─── Leads ───────────────────────────────────────────────

  async listLeads(params?: { domain?: string; page?: number; limit?: number }) {
    let response = await this.http.get('/leads/', { params });
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.http.get(`/leads/${encodeURIComponent(leadId)}`);
    return response.data;
  }

  async createLead(lead: {
    listId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    company?: string;
    score?: number;
    websiteUrl?: string;
    phoneNumber?: string;
    twitter?: string;
    country?: string;
    linkedin?: string;
    notes?: string;
  }) {
    let response = await this.http.post('/leads/', {
      list_id: lead.listId,
      email: lead.email,
      first_name: lead.firstName,
      last_name: lead.lastName,
      position: lead.position,
      company: lead.company,
      score: lead.score,
      website_url: lead.websiteUrl,
      phone_number: lead.phoneNumber,
      twitter: lead.twitter,
      country: lead.country,
      linkedin: lead.linkedin,
      notes: lead.notes
    });
    return response.data;
  }

  async updateLead(
    leadId: string,
    lead: {
      email?: string;
      firstName?: string;
      lastName?: string;
      position?: string;
      company?: string;
      score?: number;
      websiteUrl?: string;
      phoneNumber?: string;
      twitter?: string;
      country?: string;
      linkedin?: string;
      notes?: string;
    }
  ) {
    let response = await this.http.put(`/leads/${encodeURIComponent(leadId)}`, {
      email: lead.email,
      first_name: lead.firstName,
      last_name: lead.lastName,
      position: lead.position,
      company: lead.company,
      score: lead.score,
      website_url: lead.websiteUrl,
      phone_number: lead.phoneNumber,
      twitter: lead.twitter,
      country: lead.country,
      linkedin: lead.linkedin,
      notes: lead.notes
    });
    return response.data;
  }

  async deleteLead(leadId: string) {
    let response = await this.http.delete(`/leads/${encodeURIComponent(leadId)}`);
    return response.data;
  }

  // ─── Lead Lists ──────────────────────────────────────────

  async listLeadLists() {
    let response = await this.http.get('/leads_lists/');
    return response.data;
  }

  async getLeadList(listId: string) {
    let response = await this.http.get(`/leads_lists/${encodeURIComponent(listId)}`);
    return response.data;
  }

  async createLeadList(name: string) {
    let response = await this.http.post('/leads_lists/', { name });
    return response.data;
  }

  async updateLeadList(listId: string, name: string) {
    let response = await this.http.put(`/leads_lists/${encodeURIComponent(listId)}`, { name });
    return response.data;
  }

  async deleteLeadList(listId: string) {
    let response = await this.http.delete(`/leads_lists/${encodeURIComponent(listId)}`);
    return response.data;
  }

  // ─── Account ─────────────────────────────────────────────

  async getAccount() {
    let response = await this.http.get('/me');
    return response.data;
  }

  // ─── Usage ───────────────────────────────────────────────

  async getUsage() {
    let response = await this.http.get('/usage');
    return response.data;
  }

  // ─── Logs ────────────────────────────────────────────────

  async getLogs() {
    let response = await this.http.get('/logs');
    return response.data;
  }
}
