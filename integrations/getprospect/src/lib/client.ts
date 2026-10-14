import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

let BASE_URL = 'https://api.getprospect.com/public/v1';
let V2_BASE_URL = 'https://api.getprospect.com/v2';

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  errors?: { name: string; message: string }[];
};

type EmailResult = {
  email?: string | null;
  status?: string;
  confidence?: number;
  domain?: string | null;
  domain_status?: string | null;
  smtp_provider?: string | null;
  free_email?: boolean | null;
};

type CurrentUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  timezone?: string | null;
  created_at?: string | null;
  workspace?: { id: number; name: string; role: string } | null;
  auth?: { channel: string; api_key_id?: string | null };
};

type CreditBalance = {
  available: number;
  allowance: number;
  additional: number;
  permanent: number;
};

type CreditBalances = {
  email_search: CreditBalance;
  email_verification: CreditBalance;
  phone_search: CreditBalance;
  reset_at: string | null;
};

export class Client {
  private axios;
  private v2Axios;

  constructor(private config: { token: string }) {
    this.axios = this.createHttpClient(BASE_URL, 'apiKey');
    this.v2Axios = this.createHttpClient(V2_BASE_URL, 'x-api-key');
  }

  private createHttpClient(baseURL: string, authHeader: string) {
    let client = createAxios({
      baseURL,
      timeout: 100_000,
      validateStatus: () => true,
      headers: {
        [authHeader]: this.config.token,
        'Content-Type': 'application/json'
      }
    });

    client.interceptors.response.use(
      response => {
        if (response.status >= 400) {
          throw buildApiServiceError(
            { response },
            { providerLabel: 'GetProspect', reason: 'getprospect_request_failed' }
          );
        }
        return response;
      },
      error =>
        Promise.reject(
          buildApiServiceError(error, {
            providerLabel: 'GetProspect',
            reason: 'getprospect_request_failed'
          })
        )
    );

    return client;
  }

  private readV2Result<T>(result: ApiEnvelope<T>, permittedError?: string): T {
    if (!result || typeof result !== 'object' || typeof result.success !== 'boolean') {
      throw createApiServiceError('GetProspect returned an invalid response. Please retry.', {
        reason: 'getprospect_invalid_response'
      });
    }
    let expectedOutcome =
      permittedError &&
      result.errors?.length &&
      result.errors.every(error => error.name === permittedError) &&
      result.data !== null;

    if (result.success === false && !expectedOutcome) {
      throw buildApiServiceError(
        { response: { status: 200, data: result } },
        { providerLabel: 'GetProspect', reason: 'getprospect_request_failed' }
      );
    }
    if (result.data === null || result.data === undefined) {
      throw createApiServiceError('GetProspect returned no result data. Please retry.', {
        reason: 'getprospect_invalid_response'
      });
    }
    return result.data;
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
    if (!params.domain.trim() || !params.firstName.trim() || !params.lastName.trim()) {
      throw createApiServiceError(
        'Provide a domain, first name, and last name to find an email.'
      );
    }
    let response = await this.v2Axios.post<ApiEnvelope<EmailResult>>('/email/find', {
      data: {
        domain: params.domain,
        first_name: params.firstName,
        last_name: params.lastName
      }
    });
    return this.readV2Result(response.data, 'NOT_FOUND');
  }

  async verifyEmail(email: string) {
    if (!email.trim()) {
      throw createApiServiceError('Provide an email address to verify.');
    }
    let response = await this.v2Axios.post<ApiEnvelope<EmailResult>>('/email/verify', {
      data: { email }
    });
    return this.readV2Result(response.data);
  }

  async getCurrentUser() {
    let response = await this.v2Axios.get<ApiEnvelope<CurrentUser>>('/me');
    return this.readV2Result(response.data);
  }

  async getCreditBalances() {
    let response = await this.v2Axios.get<ApiEnvelope<CreditBalances>>('/credits');
    return this.readV2Result(response.data);
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
