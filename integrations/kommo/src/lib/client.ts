import { createAxios } from 'slates';

export interface KommoClientConfig {
  token: string;
  subdomain: string;
}

export interface CustomFieldValue {
  fieldId: number;
  values: Array<{ value: string | number | boolean; enumId?: number }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface LeadFilters {
  query?: string;
  ids?: number[];
  pipelineIds?: number[];
  statusId?: number;
  responsibleUserIds?: number[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface ContactFilters {
  query?: string;
  ids?: number[];
  responsibleUserIds?: number[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface CompanyFilters {
  query?: string;
  ids?: number[];
  responsibleUserIds?: number[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface TaskFilters {
  ids?: number[];
  responsibleUserIds?: number[];
  isCompleted?: boolean;
  entityType?: string;
  entityIds?: number[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export class KommoClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: KommoClientConfig) {
    this.http = createAxios({
      baseURL: `https://${config.subdomain}.kommo.com/api/v4`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Leads ──

  async listLeads(filters?: LeadFilters, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;
    if (filters?.query) params.query = filters.query;
    if (filters?.ids) filters.ids.forEach((id, i) => (params[`filter[id][${i}]`] = id));
    if (filters?.pipelineIds)
      filters.pipelineIds.forEach((id, i) => (params[`filter[pipeline_id][${i}]`] = id));
    if (filters?.responsibleUserIds)
      filters.responsibleUserIds.forEach(
        (id, i) => (params[`filter[responsible_user_id][${i}]`] = id)
      );
    if (filters?.orderBy) params[`order[${filters.orderBy}]`] = filters.orderDir || 'desc';
    params.with = 'contacts,loss_reason';

    let response = await this.http.get('/leads', { params });
    return response.data?._embedded?.leads || [];
  }

  async getLead(leadId: number) {
    let response = await this.http.get(`/leads/${leadId}`, {
      params: { with: 'contacts,loss_reason,catalog_elements' }
    });
    return response.data;
  }

  async createLead(lead: Record<string, any>) {
    let response = await this.http.post('/leads', [lead]);
    return response.data?._embedded?.leads?.[0];
  }

  async updateLead(leadId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/leads/${leadId}`, data);
    return response.data?._embedded?.leads?.[0];
  }

  async createComplexLead(data: Record<string, any>) {
    let response = await this.http.post('/leads/complex', [data]);
    return response.data?.[0];
  }

  // ── Contacts ──

  async listContacts(filters?: ContactFilters, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;
    if (filters?.query) params.query = filters.query;
    if (filters?.ids) filters.ids.forEach((id, i) => (params[`filter[id][${i}]`] = id));
    if (filters?.responsibleUserIds)
      filters.responsibleUserIds.forEach(
        (id, i) => (params[`filter[responsible_user_id][${i}]`] = id)
      );
    if (filters?.orderBy) params[`order[${filters.orderBy}]`] = filters.orderDir || 'desc';
    params.with = 'leads';

    let response = await this.http.get('/contacts', { params });
    return response.data?._embedded?.contacts || [];
  }

  async getContact(contactId: number) {
    let response = await this.http.get(`/contacts/${contactId}`, {
      params: { with: 'leads' }
    });
    return response.data;
  }

  async createContact(contact: Record<string, any>) {
    let response = await this.http.post('/contacts', [contact]);
    return response.data?._embedded?.contacts?.[0];
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/contacts/${contactId}`, data);
    return response.data?._embedded?.contacts?.[0];
  }

  // ── Companies ──

  async listCompanies(filters?: CompanyFilters, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;
    if (filters?.query) params.query = filters.query;
    if (filters?.ids) filters.ids.forEach((id, i) => (params[`filter[id][${i}]`] = id));
    if (filters?.responsibleUserIds)
      filters.responsibleUserIds.forEach(
        (id, i) => (params[`filter[responsible_user_id][${i}]`] = id)
      );
    if (filters?.orderBy) params[`order[${filters.orderBy}]`] = filters.orderDir || 'desc';

    let response = await this.http.get('/companies', { params });
    return response.data?._embedded?.companies || [];
  }

  async getCompany(companyId: number) {
    let response = await this.http.get(`/companies/${companyId}`, {
      params: { with: 'contacts,leads' }
    });
    return response.data;
  }

  async createCompany(company: Record<string, any>) {
    let response = await this.http.post('/companies', [company]);
    return response.data?._embedded?.companies?.[0];
  }

  async updateCompany(companyId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/companies/${companyId}`, data);
    return response.data?._embedded?.companies?.[0];
  }

  // ── Tasks ──

  async listTasks(filters?: TaskFilters, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;
    if (filters?.ids) filters.ids.forEach((id, i) => (params[`filter[id][${i}]`] = id));
    if (filters?.responsibleUserIds)
      filters.responsibleUserIds.forEach(
        (id, i) => (params[`filter[responsible_user_id][${i}]`] = id)
      );
    if (filters?.isCompleted !== undefined)
      params['filter[is_completed]'] = filters.isCompleted ? 1 : 0;
    if (filters?.entityType) params['filter[entity_type]'] = filters.entityType;
    if (filters?.entityIds)
      filters.entityIds.forEach((id, i) => (params[`filter[entity_id][${i}]`] = id));
    if (filters?.orderBy) params[`order[${filters.orderBy}]`] = filters.orderDir || 'desc';

    let response = await this.http.get('/tasks', { params });
    return response.data?._embedded?.tasks || [];
  }

  async getTask(taskId: number) {
    let response = await this.http.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(task: Record<string, any>) {
    let response = await this.http.post('/tasks', [task]);
    return response.data?._embedded?.tasks?.[0];
  }

  async updateTask(taskId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/tasks/${taskId}`, data);
    return response.data?._embedded?.tasks?.[0];
  }

  // ── Pipelines & Stages ──

  async listPipelines() {
    let response = await this.http.get('/leads/pipelines');
    return response.data?._embedded?.pipelines || [];
  }

  async getPipeline(pipelineId: number) {
    let response = await this.http.get(`/leads/pipelines/${pipelineId}`);
    return response.data;
  }

  async listStages(pipelineId: number) {
    let response = await this.http.get(`/leads/pipelines/${pipelineId}/statuses`);
    return response.data?._embedded?.statuses || [];
  }

  // ── Notes ──

  async listNotes(entityType: string, entityId: number, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    let response = await this.http.get(`/${entityType}/${entityId}/notes`, { params });
    return response.data?._embedded?.notes || [];
  }

  async createNote(entityType: string, entityId: number, note: Record<string, any>) {
    let response = await this.http.post(`/${entityType}/${entityId}/notes`, [note]);
    return response.data?._embedded?.notes?.[0];
  }

  // ── Tags ──

  async listTags(entityType: string, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    let response = await this.http.get(`/${entityType}/tags`, { params });
    return response.data?._embedded?.tags || [];
  }

  async createTags(entityType: string, tags: Array<{ name: string; color?: string }>) {
    let response = await this.http.post(`/${entityType}/tags`, tags);
    return response.data?._embedded?.tags || [];
  }

  // ── Custom Fields ──

  async listCustomFields(entityType: string, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    let response = await this.http.get(`/${entityType}/custom_fields`, { params });
    return response.data?._embedded?.custom_fields || [];
  }

  async getCustomField(entityType: string, fieldId: number) {
    let response = await this.http.get(`/${entityType}/custom_fields/${fieldId}`);
    return response.data;
  }

  // ── Entity Linking ──

  async listLinks(entityType: string, entityId: number, pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    let response = await this.http.get(`/${entityType}/${entityId}/links`, { params });
    return response.data?._embedded?.links || [];
  }

  async linkEntities(
    entityType: string,
    entityId: number,
    links: Array<{
      to_entity_id: number;
      to_entity_type: string;
      metadata?: Record<string, any>;
    }>
  ) {
    let response = await this.http.post(`/${entityType}/${entityId}/link`, links);
    return response.data?._embedded?.links || [];
  }

  async unlinkEntities(
    entityType: string,
    entityId: number,
    links: Array<{ to_entity_id: number; to_entity_type: string }>
  ) {
    let response = await this.http.post(`/${entityType}/${entityId}/unlink`, links);
    return response.data;
  }

  // ── Users ──

  async listUsers(pagination?: PaginationParams) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;

    let response = await this.http.get('/users', { params });
    return response.data?._embedded?.users || [];
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  // ── Account ──

  async getAccount() {
    let response = await this.http.get('/account', {
      params: { with: 'amojo_id,users_groups,task_types' }
    });
    return response.data;
  }

  // ── Events ──

  async listEvents(
    filters?: {
      entityType?: string;
      entityId?: number;
      types?: string[];
      createdAtFrom?: number;
      createdAtTo?: number;
    },
    pagination?: PaginationParams
  ) {
    let params: Record<string, any> = {};
    if (pagination?.page) params.page = pagination.page;
    if (pagination?.limit) params.limit = pagination.limit;
    if (filters?.entityType) params['filter[entity]'] = filters.entityType;
    if (filters?.entityId) params['filter[entity_id]'] = filters.entityId;
    if (filters?.types) filters.types.forEach((t, i) => (params[`filter[type][${i}]`] = t));
    if (filters?.createdAtFrom) params['filter[created_at][from]'] = filters.createdAtFrom;
    if (filters?.createdAtTo) params['filter[created_at][to]'] = filters.createdAtTo;

    let response = await this.http.get('/events', { params });
    return response.data?._embedded?.events || [];
  }

  // ── Webhooks ──

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data?._embedded?.webhooks || [];
  }

  async createWebhook(destination: string, settings: string[]) {
    let response = await this.http.post('/webhooks', { destination, settings });
    return response.data;
  }

  async deleteWebhook(destination: string) {
    let response = await this.http.delete('/webhooks', {
      data: { destination }
    });
    return response.data;
  }
}
