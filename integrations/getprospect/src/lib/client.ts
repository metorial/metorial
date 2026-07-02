import { createAxios } from 'slates';

let BASE_URL = 'https://api.getprospect.com/public/v1';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        apiKey: this.config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Leads ----

  async getLead(leadId: string) {
    let response = await this.axios.get(`/lead/${leadId}`);
    return response.data;
  }

  async getLeads(
    params: {
      page?: number;
      perPage?: number;
      companyId?: string;
      filter?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    } = {}
  ) {
    let response = await this.axios.get('/lead', {
      params: {
        page: params.page,
        per_page: params.perPage,
        company_id: params.companyId,
        filter: params.filter,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        search: params.search
      }
    });
    return response.data;
  }

  async createLead(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyUrl?: string;
    title?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
    notes?: string;
  }) {
    let response = await this.axios.post('/lead', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      company_url: data.companyUrl,
      title: data.title,
      phone: data.phone,
      linkedin: data.linkedin,
      twitter: data.twitter,
      notes: data.notes
    });
    return response.data;
  }

  async updateLead(
    leadId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      companyUrl?: string;
      title?: string;
      phone?: string;
      linkedin?: string;
      twitter?: string;
      notes?: string;
    }
  ) {
    let response = await this.axios.put(`/lead/${leadId}`, {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      company_url: data.companyUrl,
      title: data.title,
      phone: data.phone,
      linkedin: data.linkedin,
      twitter: data.twitter,
      notes: data.notes
    });
    return response.data;
  }

  async deleteLead(leadId: string) {
    let response = await this.axios.delete(`/lead/${leadId}`);
    return response.data;
  }

  // ---- Companies ----

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/company/${companyId}`);
    return response.data;
  }

  async getCompanies(
    params: {
      page?: number;
      perPage?: number;
      filter?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    } = {}
  ) {
    let response = await this.axios.get('/company', {
      params: {
        page: params.page,
        per_page: params.perPage,
        filter: params.filter,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        search: params.search
      }
    });
    return response.data;
  }

  async createCompany(data: {
    name?: string;
    url?: string;
    industry?: string;
    description?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
    country?: string;
    city?: string;
  }) {
    let response = await this.axios.post('/company', data);
    return response.data;
  }

  async updateCompany(
    companyId: string,
    data: {
      name?: string;
      url?: string;
      industry?: string;
      description?: string;
      phone?: string;
      linkedin?: string;
      twitter?: string;
      country?: string;
      city?: string;
    }
  ) {
    let response = await this.axios.put(`/company/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.axios.delete(`/company/${companyId}`);
    return response.data;
  }

  // ---- Email ----

  async findEmail(params: { domain: string; firstName: string; lastName: string }) {
    let response = await this.axios.get('/email/find', {
      params: {
        domain: params.domain,
        firstName: params.firstName,
        lastName: params.lastName
      }
    });
    return response.data;
  }

  async verifyEmail(email: string) {
    let response = await this.axios.get('/email/verify', {
      params: { email }
    });
    return response.data;
  }

  // ---- Sequences ----

  async getSequence(sequenceId: string) {
    let response = await this.axios.get(`/sequence/${sequenceId}`);
    return response.data;
  }

  async getSequences(
    params: {
      page?: number;
      perPage?: number;
      filter?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    } = {}
  ) {
    let response = await this.axios.get('/sequence', {
      params: {
        page: params.page,
        per_page: params.perPage,
        filter: params.filter,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        search: params.search
      }
    });
    return response.data;
  }

  async createSequence(data: { name: string; description?: string }) {
    let response = await this.axios.post('/sequence', data);
    return response.data;
  }

  async updateSequence(
    sequenceId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.put(`/sequence/${sequenceId}`, data);
    return response.data;
  }

  async deleteSequence(sequenceId: string) {
    let response = await this.axios.delete(`/sequence/${sequenceId}`);
    return response.data;
  }

  // ---- Steps ----

  async getStep(stepId: string) {
    let response = await this.axios.get(`/step/${stepId}`);
    return response.data;
  }

  async createStep(data: {
    sequenceId: string;
    subject?: string;
    body?: string;
    delayDays?: number;
  }) {
    let response = await this.axios.post('/step', {
      sequence_id: data.sequenceId,
      subject: data.subject,
      body: data.body,
      delay_days: data.delayDays
    });
    return response.data;
  }

  async updateStep(
    stepId: string,
    data: {
      subject?: string;
      body?: string;
      delayDays?: number;
    }
  ) {
    let response = await this.axios.put(`/step/${stepId}`, {
      subject: data.subject,
      body: data.body,
      delay_days: data.delayDays
    });
    return response.data;
  }

  async deleteStep(stepId: string) {
    let response = await this.axios.delete(`/step/${stepId}`);
    return response.data;
  }

  // ---- Tags ----

  async getTags() {
    let response = await this.axios.get('/tag');
    return response.data;
  }

  async createTag(data: { name: string }) {
    let response = await this.axios.post('/tag', data);
    return response.data;
  }

  async updateTag(tagId: string, data: { name?: string }) {
    let response = await this.axios.put(`/tag/${tagId}`, data);
    return response.data;
  }

  async deleteTag(tagId: string) {
    let response = await this.axios.delete(`/tag/${tagId}`);
    return response.data;
  }

  // ---- Notes ----

  async getNote(noteId: string) {
    let response = await this.axios.get(`/note/${noteId}`);
    return response.data;
  }

  async getNotes(params: { page?: number; perPage?: number } = {}) {
    let response = await this.axios.get('/note', {
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async createNote(data: { leadId?: string; content: string }) {
    let response = await this.axios.post('/note', {
      lead_id: data.leadId,
      content: data.content
    });
    return response.data;
  }

  async updateNote(
    noteId: string,
    data: {
      content?: string;
    }
  ) {
    let response = await this.axios.put(`/note/${noteId}`, data);
    return response.data;
  }

  async deleteNote(noteId: string) {
    let response = await this.axios.delete(`/note/${noteId}`);
    return response.data;
  }

  // ---- Domains ----

  async getDomain(domainId: string) {
    let response = await this.axios.get(`/domain/${domainId}`);
    return response.data;
  }

  async getDomains(params: { page?: number; perPage?: number } = {}) {
    let response = await this.axios.get('/domain', {
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async createDomain(data: { name: string }) {
    let response = await this.axios.post('/domain', data);
    return response.data;
  }

  async updateDomain(domainId: string, data: { name?: string }) {
    let response = await this.axios.put(`/domain/${domainId}`, data);
    return response.data;
  }

  async deleteDomain(domainId: string) {
    let response = await this.axios.delete(`/domain/${domainId}`);
    return response.data;
  }

  // ---- Webhooks ----

  async createWebhook(data: {
    webhookUrl: string;
    description?: string;
    requestHeaders?: Record<string, string>;
    events: string[];
  }) {
    let response = await this.axios.post('/webhook', {
      webhook_url: data.webhookUrl,
      description: data.description,
      request_headers: data.requestHeaders,
      events: data.events
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhook/${webhookId}`);
    return response.data;
  }
}
