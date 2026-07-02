import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  subdomain: string;
  authType: 'api_key' | 'oauth';
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface TicketCreateParams {
  subject: string;
  description?: string;
  email?: string;
  requesterId?: number;
  phone?: string;
  status?: number;
  priority?: number;
  source?: number;
  type?: string;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  urgency?: number;
  impact?: number;
  ccEmails?: string[];
  tags?: string[];
  dueBy?: string;
  frDueBy?: string;
  customFields?: Record<string, unknown>;
  workspaceId?: number;
}

export interface TicketUpdateParams {
  subject?: string;
  description?: string;
  status?: number;
  priority?: number;
  source?: number;
  type?: string;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  urgency?: number;
  impact?: number;
  dueBy?: string;
  frDueBy?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface ProblemCreateParams {
  subject: string;
  description?: string;
  requesterId?: number;
  email?: string;
  status?: number;
  priority?: number;
  impact?: number;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  dueBy?: string;
  knownError?: boolean;
  customFields?: Record<string, unknown>;
}

export interface ProblemUpdateParams {
  subject?: string;
  description?: string;
  status?: number;
  priority?: number;
  impact?: number;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  dueBy?: string;
  knownError?: boolean;
  customFields?: Record<string, unknown>;
}

export interface ChangeCreateParams {
  subject: string;
  description?: string;
  requesterId?: number;
  email?: string;
  status?: number;
  priority?: number;
  impact?: number;
  risk?: number;
  changeType?: number;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  customFields?: Record<string, unknown>;
}

export interface ChangeUpdateParams {
  subject?: string;
  description?: string;
  status?: number;
  priority?: number;
  impact?: number;
  risk?: number;
  changeType?: number;
  groupId?: number;
  agentId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  customFields?: Record<string, unknown>;
}

export interface AssetCreateParams {
  name: string;
  assetTypeId: number;
  description?: string;
  assetTag?: string;
  impact?: string;
  usageType?: string;
  agentId?: number;
  departmentId?: number;
  locationId?: number;
  groupId?: number;
  assignedOn?: string;
  typeFields?: Record<string, unknown>;
}

export interface AssetUpdateParams {
  name?: string;
  assetTypeId?: number;
  description?: string;
  assetTag?: string;
  impact?: string;
  usageType?: string;
  agentId?: number;
  departmentId?: number;
  locationId?: number;
  groupId?: number;
  assignedOn?: string;
  typeFields?: Record<string, unknown>;
}

let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let convertKeysToSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    let snakeKey = toSnakeCase(key);
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      result[snakeKey] = convertKeysToSnakeCase(value as Record<string, unknown>);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

export class Client {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(clientConfig: ClientConfig) {
    this.baseUrl = `https://${clientConfig.subdomain}.freshservice.com/api/v2`;
    if (clientConfig.authType === 'api_key') {
      let encoded = Buffer.from(`${clientConfig.token}:X`).toString('base64');
      this.headers = {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      };
    } else {
      this.headers = {
        Authorization: `Bearer ${clientConfig.token}`,
        'Content-Type': 'application/json'
      };
    }
  }

  private get axios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: this.headers
    });
  }

  // ===== Tickets =====

  async createTicket(params: TicketCreateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/tickets', body);
    return response.data.ticket;
  }

  async getTicket(ticketId: number, include?: string) {
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/tickets/${ticketId}`, { params });
    return response.data.ticket;
  }

  async listTickets(
    pagination?: PaginationParams,
    filter?: string,
    orderBy?: string,
    orderType?: string,
    include?: string,
    updatedSince?: string
  ) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (filter) params.filter = filter;
    if (orderBy) params.order_by = orderBy;
    if (orderType) params.order_type = orderType;
    if (include) params.include = include;
    if (updatedSince) params.updated_since = updatedSince;
    let response = await this.axios.get('/tickets', { params });
    return {
      tickets: response.data.tickets || [],
      total: response.headers?.['x-total-count']
    };
  }

  async updateTicket(ticketId: number, params: TicketUpdateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/tickets/${ticketId}`, body);
    return response.data.ticket;
  }

  async deleteTicket(ticketId: number) {
    await this.axios.delete(`/tickets/${ticketId}`);
  }

  async restoreTicket(ticketId: number) {
    let response = await this.axios.put(`/tickets/${ticketId}/restore`);
    return response.data;
  }

  async searchTickets(query: string, page?: number) {
    let params: Record<string, string | number> = { query };
    if (page) params.page = page;
    let response = await this.axios.get('/search/tickets', { params });
    return { tickets: response.data.tickets || [], total: response.data.total };
  }

  async createTicketNote(ticketId: number, body: string, isPrivate?: boolean) {
    let response = await this.axios.post(`/tickets/${ticketId}/notes`, {
      body,
      private: isPrivate ?? true
    });
    return response.data.conversation;
  }

  async createTicketReply(
    ticketId: number,
    body: string,
    ccEmails?: string[],
    bccEmails?: string[]
  ) {
    let payload: Record<string, unknown> = { body };
    if (ccEmails) payload.cc_emails = ccEmails;
    if (bccEmails) payload.bcc_emails = bccEmails;
    let response = await this.axios.post(`/tickets/${ticketId}/reply`, payload);
    return response.data.conversation;
  }

  async listTicketConversations(ticketId: number, pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get(`/tickets/${ticketId}/conversations`, { params });
    return response.data.conversations || [];
  }

  // ===== Problems =====

  async createProblem(params: ProblemCreateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/problems', body);
    return response.data.problem;
  }

  async getProblem(problemId: number) {
    let response = await this.axios.get(`/problems/${problemId}`);
    return response.data.problem;
  }

  async listProblems(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/problems', { params });
    return { problems: response.data.problems || [] };
  }

  async updateProblem(problemId: number, params: ProblemUpdateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/problems/${problemId}`, body);
    return response.data.problem;
  }

  async deleteProblem(problemId: number) {
    await this.axios.delete(`/problems/${problemId}`);
  }

  // ===== Changes =====

  async createChange(params: ChangeCreateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/changes', body);
    return response.data.change;
  }

  async getChange(changeId: number) {
    let response = await this.axios.get(`/changes/${changeId}`);
    return response.data.change;
  }

  async listChanges(pagination?: PaginationParams, filter?: string) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (filter) params.filter = filter;
    let response = await this.axios.get('/changes', { params });
    return { changes: response.data.changes || [] };
  }

  async updateChange(changeId: number, params: ChangeUpdateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/changes/${changeId}`, body);
    return response.data.change;
  }

  async deleteChange(changeId: number) {
    await this.axios.delete(`/changes/${changeId}`);
  }

  // ===== Assets =====

  async createAsset(params: AssetCreateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/assets', body);
    return response.data.asset;
  }

  async getAsset(assetId: number) {
    let response = await this.axios.get(`/assets/${assetId}`);
    return response.data.asset;
  }

  async listAssets(pagination?: PaginationParams, include?: string) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (include) params.include = include;
    let response = await this.axios.get('/assets', { params });
    return { assets: response.data.assets || [] };
  }

  async updateAsset(assetId: number, params: AssetUpdateParams) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/assets/${assetId}`, body);
    return response.data.asset;
  }

  async deleteAsset(assetId: number) {
    await this.axios.delete(`/assets/${assetId}`);
  }

  async searchAssets(query: string, page?: number) {
    let params: Record<string, string | number> = {};
    if (query) params.query = query;
    if (page) params.page = page;
    let response = await this.axios.get('/assets', { params });
    return { assets: response.data.assets || [] };
  }

  // ===== Agents =====

  async getAgent(agentId: number) {
    let response = await this.axios.get(`/agents/${agentId}`);
    return response.data.agent;
  }

  async listAgents(pagination?: PaginationParams, query?: string) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (query) params.query = query;
    let response = await this.axios.get('/agents', { params });
    return { agents: response.data.agents || [] };
  }

  async getCurrentAgent() {
    let response = await this.axios.get('/agents/me');
    return response.data.agent;
  }

  // ===== Requesters =====

  async createRequester(params: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    departmentIds?: number[];
    customFields?: Record<string, unknown>;
  }) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/requesters', body);
    return response.data.requester;
  }

  async getRequester(requesterId: number) {
    let response = await this.axios.get(`/requesters/${requesterId}`);
    return response.data.requester;
  }

  async listRequesters(pagination?: PaginationParams, query?: string) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (query) params.query = query;
    let response = await this.axios.get('/requesters', { params });
    return { requesters: response.data.requesters || [] };
  }

  async updateRequester(
    requesterId: number,
    params: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      departmentIds?: number[];
      customFields?: Record<string, unknown>;
    }
  ) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/requesters/${requesterId}`, body);
    return response.data.requester;
  }

  async deleteRequester(requesterId: number) {
    await this.axios.delete(`/requesters/${requesterId}`);
  }

  // ===== Departments =====

  async getDepartment(departmentId: number) {
    let response = await this.axios.get(`/departments/${departmentId}`);
    return response.data.department;
  }

  async listDepartments(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/departments', { params });
    return { departments: response.data.departments || [] };
  }

  // ===== Knowledge Base (Solutions) =====

  async listSolutionCategories(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/solutions/categories', { params });
    return { categories: response.data.categories || [] };
  }

  async listSolutionFolders(categoryId: number, pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get(`/solutions/categories/${categoryId}/folders`, {
      params
    });
    return { folders: response.data.folders || [] };
  }

  async listSolutionArticles(folderId: number, pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get(`/solutions/folders/${folderId}/articles`, { params });
    return { articles: response.data.articles || [] };
  }

  async getSolutionArticle(articleId: number) {
    let response = await this.axios.get(`/solutions/articles/${articleId}`);
    return response.data.article;
  }

  async createSolutionArticle(
    folderId: number,
    params: {
      title: string;
      description?: string;
      status?: number;
      articleType?: number;
      tags?: string[];
    }
  ) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post(`/solutions/folders/${folderId}/articles`, body);
    return response.data.article;
  }

  async updateSolutionArticle(
    articleId: number,
    params: { title?: string; description?: string; status?: number; tags?: string[] }
  ) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.put(`/solutions/articles/${articleId}`, body);
    return response.data.article;
  }

  // ===== Service Catalog =====

  async listServiceCategories(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/service_catalog/categories', { params });
    return { categories: response.data.service_categories || [] };
  }

  async listServiceItems(categoryId?: number, pagination?: PaginationParams) {
    let params: Record<string, string | number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    if (categoryId) params.category_id = categoryId;
    let response = await this.axios.get('/service_catalog/items', { params });
    return { items: response.data.service_items || [] };
  }

  async getServiceItem(itemId: number) {
    let response = await this.axios.get(`/service_catalog/items/${itemId}`);
    return response.data.service_item;
  }

  async placeServiceRequest(
    itemId: number,
    params: {
      email?: string;
      requesterId?: number;
      quantity?: number;
      customFields?: Record<string, unknown>;
    }
  ) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post(
      `/service_catalog/items/${itemId}/place_request`,
      body
    );
    return response.data.service_request;
  }

  // ===== Groups =====

  async listAgentGroups(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/groups', { params });
    return { groups: response.data.groups || [] };
  }

  async getAgentGroup(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data.group;
  }

  // ===== Locations =====

  async listLocations(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/locations', { params });
    return { locations: response.data.locations || [] };
  }

  // ===== Vendors =====

  async listVendors(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/vendors', { params });
    return { vendors: response.data.vendors || [] };
  }

  // ===== Releases =====

  async createRelease(params: {
    subject: string;
    description?: string;
    releaseType?: number;
    status?: number;
    priority?: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    groupId?: number;
    agentId?: number;
    customFields?: Record<string, unknown>;
  }) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post('/releases', body);
    return response.data.release;
  }

  async getRelease(releaseId: number) {
    let response = await this.axios.get(`/releases/${releaseId}`);
    return response.data.release;
  }

  async listReleases(pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get('/releases', { params });
    return { releases: response.data.releases || [] };
  }

  async updateRelease(releaseId: number, params: Record<string, unknown>) {
    let body = convertKeysToSnakeCase(params);
    let response = await this.axios.put(`/releases/${releaseId}`, body);
    return response.data.release;
  }

  async deleteRelease(releaseId: number) {
    await this.axios.delete(`/releases/${releaseId}`);
  }

  // ===== Ticket Fields =====

  async listTicketFields() {
    let response = await this.axios.get('/ticket_fields');
    return response.data.ticket_fields || [];
  }

  // ===== Time Entries =====

  async listTicketTimeEntries(ticketId: number, pagination?: PaginationParams) {
    let params: Record<string, number> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.perPage) params.per_page = pagination.perPage;
    let response = await this.axios.get(`/tickets/${ticketId}/time_entries`, { params });
    return response.data.time_entries || [];
  }

  async createTicketTimeEntry(
    ticketId: number,
    params: {
      agentId?: number;
      note?: string;
      timeSpent?: string;
      executedAt?: string;
      billable?: boolean;
      taskId?: number;
    }
  ) {
    let body = convertKeysToSnakeCase(params as unknown as Record<string, unknown>);
    let response = await this.axios.post(`/tickets/${ticketId}/time_entries`, body);
    return response.data.time_entry;
  }
}
