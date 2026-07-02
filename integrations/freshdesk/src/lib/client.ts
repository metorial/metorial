import { createAxios } from 'slates';
import { freshdeskApiError } from './errors';

export interface FreshdeskClientConfig {
  subdomain: string;
  token: string;
}

export class FreshdeskClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: FreshdeskClientConfig) {
    let encodedAuth = Buffer.from(`${config.token}:X`).toString('base64');
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.freshdesk.com/api/v2`,
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(freshdeskApiError(error))
    );
  }

  // ============ TICKETS ============

  async listTickets(params?: {
    filter?: string;
    orderBy?: string;
    orderType?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
    include?: string;
    updatedSince?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.orderType) queryParams.order_type = params.orderType;
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;
    if (params?.include) queryParams.include = params.include;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    let response = await this.axios.get('/tickets', { params: queryParams });
    return response.data;
  }

  async getTicket(ticketId: number, include?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/tickets/${ticketId}`, { params });
    return response.data;
  }

  async createTicket(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/tickets', data);
    return response.data;
  }

  async updateTicket(ticketId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: number): Promise<void> {
    await this.axios.delete(`/tickets/${ticketId}`);
  }

  async filterTickets(
    query: string,
    page?: number
  ): Promise<{ results: any[]; total: number }> {
    let params: Record<string, any> = { query: `"${query}"` };
    if (page) params.page = page;
    let response = await this.axios.get('/search/tickets', { params });
    return response.data;
  }

  // ============ CONVERSATIONS ============

  async listConversations(ticketId: number, page?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    let response = await this.axios.get(`/tickets/${ticketId}/conversations`, { params });
    return response.data;
  }

  async addReply(ticketId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/tickets/${ticketId}/reply`, data);
    return response.data;
  }

  async addNote(ticketId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/tickets/${ticketId}/notes`, data);
    return response.data;
  }

  // ============ CONTACTS ============

  async listContacts(params?: {
    email?: string;
    phone?: string;
    mobile?: string;
    companyId?: number;
    state?: string;
    updatedSince?: string;
    page?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.email) queryParams.email = params.email;
    if (params?.phone) queryParams.phone = params.phone;
    if (params?.mobile) queryParams.mobile = params.mobile;
    if (params?.companyId) queryParams.company_id = params.companyId;
    if (params?.state) queryParams.state = params.state;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.page) queryParams.page = params.page;
    let response = await this.axios.get('/contacts', { params: queryParams });
    return response.data;
  }

  async getContact(contactId: number): Promise<any> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async searchContacts(
    query: string,
    page?: number
  ): Promise<{ results: any[]; total: number }> {
    let params: Record<string, any> = { query: `"${query}"` };
    if (page) params.page = page;
    let response = await this.axios.get('/search/contacts', { params });
    return response.data;
  }

  // ============ COMPANIES ============

  async listCompanies(page?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    let response = await this.axios.get('/companies', { params });
    return response.data;
  }

  async getCompany(companyId: number): Promise<any> {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async createCompany(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async updateCompany(companyId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/companies/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: number): Promise<void> {
    await this.axios.delete(`/companies/${companyId}`);
  }

  async searchCompanies(
    query: string,
    page?: number
  ): Promise<{ results: any[]; total: number }> {
    let params: Record<string, any> = { query: `"${query}"` };
    if (page) params.page = page;
    let response = await this.axios.get('/search/companies', { params });
    return response.data;
  }

  // ============ AGENTS ============

  async listAgents(params?: {
    email?: string;
    state?: string;
    page?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.email) queryParams.email = params.email;
    if (params?.state) queryParams.state = params.state;
    if (params?.page) queryParams.page = params.page;
    let response = await this.axios.get('/agents', { params: queryParams });
    return response.data;
  }

  async getAgent(agentId: number): Promise<any> {
    let response = await this.axios.get(`/agents/${agentId}`);
    return response.data;
  }

  async getCurrentAgent(): Promise<any> {
    let response = await this.axios.get('/agents/me');
    return response.data;
  }

  async listTicketFields(): Promise<any[]> {
    let response = await this.axios.get('/ticket_fields');
    return response.data;
  }

  async listContactFields(): Promise<any[]> {
    let response = await this.axios.get('/contact_fields');
    return response.data;
  }

  async listCompanyFields(): Promise<any[]> {
    let response = await this.axios.get('/company_fields');
    return response.data;
  }

  // ============ GROUPS ============

  async listGroups(page?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    let response = await this.axios.get('/groups', { params });
    return response.data;
  }

  async getGroup(groupId: number): Promise<any> {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  // ============ KNOWLEDGE BASE (SOLUTIONS) ============

  async listSolutionCategories(): Promise<any[]> {
    let response = await this.axios.get('/solutions/categories');
    return response.data;
  }

  async listSolutionFolders(categoryId: number): Promise<any[]> {
    let response = await this.axios.get(`/solutions/categories/${categoryId}/folders`);
    return response.data;
  }

  async listSolutionArticles(folderId: number): Promise<any[]> {
    let response = await this.axios.get(`/solutions/folders/${folderId}/articles`);
    return response.data;
  }

  async getSolutionArticle(articleId: number): Promise<any> {
    let response = await this.axios.get(`/solutions/articles/${articleId}`);
    return response.data;
  }

  async createSolutionArticle(folderId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/solutions/folders/${folderId}/articles`, data);
    return response.data;
  }

  async updateSolutionArticle(articleId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/solutions/articles/${articleId}`, data);
    return response.data;
  }

  async createSolutionFolder(categoryId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/solutions/categories/${categoryId}/folders`, data);
    return response.data;
  }

  async createSolutionCategory(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/solutions/categories', data);
    return response.data;
  }

  // ============ TIME ENTRIES ============

  async listTimeEntries(ticketId: number): Promise<any[]> {
    let response = await this.axios.get(`/tickets/${ticketId}/time_entries`);
    return response.data;
  }

  async createTimeEntry(ticketId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/tickets/${ticketId}/time_entries`, data);
    return response.data;
  }

  async updateTimeEntry(entryId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/time_entries/${entryId}`, data);
    return response.data;
  }

  async deleteTimeEntry(entryId: number): Promise<void> {
    await this.axios.delete(`/time_entries/${entryId}`);
  }

  // ============ SATISFACTION RATINGS ============

  async listSatisfactionRatings(params?: {
    createdSince?: string;
    createdUntil?: string;
    page?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.createdSince) queryParams.created_since = params.createdSince;
    if (params?.createdUntil) queryParams.created_until = params.createdUntil;
    if (params?.page) queryParams.page = params.page;
    let response = await this.axios.get('/surveys/satisfaction_ratings', {
      params: queryParams
    });
    return response.data;
  }

  // ============ CANNED RESPONSES ============

  async listCannedResponseFolders(): Promise<any[]> {
    let response = await this.axios.get('/canned_response_folders');
    return response.data;
  }

  async listCannedResponses(folderId: number): Promise<any[]> {
    let response = await this.axios.get(
      `/canned_response_folders/${folderId}/canned_responses`
    );
    return response.data;
  }

  // ============ ACCOUNT ============

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  async getHelpdeskSettings(): Promise<any> {
    let response = await this.axios.get('/settings/helpdesk');
    return response.data;
  }

  async listProducts(): Promise<any[]> {
    let response = await this.axios.get('/products');
    return response.data;
  }

  async listBusinessHours(): Promise<any[]> {
    let response = await this.axios.get('/business_hours');
    return response.data;
  }

  async listSlaPolicies(): Promise<any[]> {
    let response = await this.axios.get('/sla_policies');
    return response.data;
  }
}
