import { createAxios } from 'slates';

let regionToDeskDomain: Record<string, string> = {
  us: 'desk.zoho.com',
  eu: 'desk.zoho.eu',
  in: 'desk.zoho.in',
  au: 'desk.zoho.com.au',
  cn: 'desk.zoho.com.cn'
};

export interface ClientConfig {
  token: string;
  orgId: string;
  region: string;
  deskDomain?: string;
}

export interface PaginationParams {
  from?: number;
  limit?: number;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let domain = config.deskDomain || regionToDeskDomain[config.region] || 'desk.zoho.com';

    this.http = createAxios({
      baseURL: `https://${domain}/api/v1`,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.token}`,
        orgId: config.orgId
      }
    });
  }

  // ---- Tickets ----

  async listTickets(
    params?: PaginationParams & {
      departmentId?: string;
      assignee?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
      include?: string;
    }
  ) {
    let response = await this.http.get('/tickets', { params });
    return response.data;
  }

  async getTicket(ticketId: string, params?: { include?: string }) {
    let response = await this.http.get(`/tickets/${ticketId}`, { params });
    return response.data;
  }

  async createTicket(data: Record<string, any>) {
    let response = await this.http.post('/tickets', data);
    return response.data;
  }

  async updateTicket(ticketId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: string) {
    await this.http.delete(`/tickets/${ticketId}`);
  }

  async moveTicket(ticketId: string, departmentId: string) {
    let response = await this.http.post(`/tickets/${ticketId}/move`, { departmentId });
    return response.data;
  }

  async mergeTickets(ticketId: string, mergeTicketIds: string[]) {
    let response = await this.http.post(`/tickets/${ticketId}/merge`, {
      ids: mergeTicketIds
    });
    return response.data;
  }

  // ---- Ticket Threads ----

  async listTicketThreads(ticketId: string, params?: PaginationParams) {
    let response = await this.http.get(`/tickets/${ticketId}/threads`, { params });
    return response.data;
  }

  async getTicketThread(ticketId: string, threadId: string) {
    let response = await this.http.get(`/tickets/${ticketId}/threads/${threadId}`);
    return response.data;
  }

  async addTicketThread(ticketId: string, data: Record<string, any>) {
    let response = await this.http.post(`/tickets/${ticketId}/threads`, data);
    return response.data;
  }

  // ---- Ticket Comments ----

  async listTicketComments(ticketId: string, params?: PaginationParams) {
    let response = await this.http.get(`/tickets/${ticketId}/comments`, { params });
    return response.data;
  }

  async addTicketComment(ticketId: string, data: Record<string, any>) {
    let response = await this.http.post(`/tickets/${ticketId}/comments`, data);
    return response.data;
  }

  // ---- Ticket Tags ----

  async addTicketTags(ticketId: string, tags: string[]) {
    let response = await this.http.post(`/tickets/${ticketId}/tags`, { tags });
    return response.data;
  }

  async removeTicketTag(ticketId: string, tag: string) {
    await this.http.delete(`/tickets/${ticketId}/tags`, { params: { tag } });
  }

  // ---- Contacts ----

  async listContacts(params?: PaginationParams & { sortBy?: string; sortOrder?: string }) {
    let response = await this.http.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.http.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    await this.http.delete(`/contacts/${contactId}`);
  }

  // ---- Accounts ----

  async listAccounts(params?: PaginationParams & { sortBy?: string; sortOrder?: string }) {
    let response = await this.http.get('/accounts', { params });
    return response.data;
  }

  async getAccount(accountId: string) {
    let response = await this.http.get(`/accounts/${accountId}`);
    return response.data;
  }

  async createAccount(data: Record<string, any>) {
    let response = await this.http.post('/accounts', data);
    return response.data;
  }

  async updateAccount(accountId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/accounts/${accountId}`, data);
    return response.data;
  }

  async deleteAccount(accountId: string) {
    await this.http.delete(`/accounts/${accountId}`);
  }

  // ---- Agents ----

  async listAgents(params?: PaginationParams & { departmentId?: string; status?: string }) {
    let response = await this.http.get('/agents', { params });
    return response.data;
  }

  async getAgent(agentId: string) {
    let response = await this.http.get(`/agents/${agentId}`);
    return response.data;
  }

  // ---- Departments ----

  async listDepartments(params?: PaginationParams) {
    let response = await this.http.get('/departments', { params });
    return response.data;
  }

  async getDepartment(departmentId: string) {
    let response = await this.http.get(`/departments/${departmentId}`);
    return response.data;
  }

  async createDepartment(data: Record<string, any>) {
    let response = await this.http.post('/departments', data);
    return response.data;
  }

  async updateDepartment(departmentId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/departments/${departmentId}`, data);
    return response.data;
  }

  // ---- Tasks ----

  async listTasks(params?: PaginationParams & { departmentId?: string; status?: string }) {
    let response = await this.http.get('/tasks', { params });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.http.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.http.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.http.delete(`/tasks/${taskId}`);
  }

  // ---- Time Entries ----

  async listTimeEntries(ticketId: string, params?: PaginationParams) {
    let response = await this.http.get(`/tickets/${ticketId}/timeEntry`, { params });
    return response.data;
  }

  async getTimeEntry(timeEntryId: string) {
    let response = await this.http.get(`/timeEntry/${timeEntryId}`);
    return response.data;
  }

  async createTimeEntry(ticketId: string, data: Record<string, any>) {
    let response = await this.http.post(`/tickets/${ticketId}/timeEntry`, data);
    return response.data;
  }

  async updateTimeEntry(timeEntryId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/timeEntry/${timeEntryId}`, data);
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: string) {
    await this.http.delete(`/timeEntry/${timeEntryId}`);
  }

  // ---- Knowledge Base Articles ----

  async listArticles(categoryId: string, params?: PaginationParams & { status?: string }) {
    let response = await this.http.get(`/kbCategories/${categoryId}/articles`, { params });
    return response.data;
  }

  async getArticle(articleId: string) {
    let response = await this.http.get(`/articles/${articleId}`);
    return response.data;
  }

  async createArticle(categoryId: string, data: Record<string, any>) {
    let response = await this.http.post(`/kbCategories/${categoryId}/articles`, data);
    return response.data;
  }

  async updateArticle(articleId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/articles/${articleId}`, data);
    return response.data;
  }

  async deleteArticle(articleId: string) {
    await this.http.delete(`/articles/${articleId}`);
  }

  // ---- KB Categories ----

  async listKBCategories(params?: PaginationParams) {
    let response = await this.http.get('/kbCategories', { params });
    return response.data;
  }

  async getKBCategory(categoryId: string) {
    let response = await this.http.get(`/kbCategories/${categoryId}`);
    return response.data;
  }

  // ---- Search ----

  async searchTickets(params: {
    searchStr?: string;
    status?: string;
    assignee?: string;
    departmentId?: string;
    channel?: string;
    priority?: string;
    from?: number;
    limit?: number;
    sortBy?: string;
  }) {
    let response = await this.http.get('/tickets/search', { params });
    return response.data;
  }

  async searchContacts(params: {
    searchStr?: string;
    from?: number;
    limit?: number;
    sortBy?: string;
  }) {
    let response = await this.http.get('/contacts/search', { params });
    return response.data;
  }

  async searchAccounts(params: {
    searchStr?: string;
    from?: number;
    limit?: number;
    sortBy?: string;
  }) {
    let response = await this.http.get('/accounts/search', { params });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(params?: PaginationParams) {
    let response = await this.http.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: Record<string, any>) {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  // ---- Calls ----

  async listCalls(params?: PaginationParams & { departmentId?: string }) {
    let response = await this.http.get('/calls', { params });
    return response.data;
  }

  async getCall(callId: string) {
    let response = await this.http.get(`/calls/${callId}`);
    return response.data;
  }

  async createCall(data: Record<string, any>) {
    let response = await this.http.post('/calls', data);
    return response.data;
  }

  async updateCall(callId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/calls/${callId}`, data);
    return response.data;
  }

  async deleteCall(callId: string) {
    await this.http.delete(`/calls/${callId}`);
  }

  // ---- Products ----

  async listProducts(params?: PaginationParams) {
    let response = await this.http.get('/products', { params });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.http.get(`/products/${productId}`);
    return response.data;
  }
}
