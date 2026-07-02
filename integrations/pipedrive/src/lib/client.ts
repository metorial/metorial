import { createAxios } from '@slates/provider';
import { pipedriveApiError } from './errors';

export interface PipedriveClientConfig {
  token: string;
  companyDomain: string;
  isApiToken?: boolean;
}

export class PipedriveClient {
  private token: string;
  private companyDomain: string;
  private isApiToken: boolean;

  constructor(config: PipedriveClientConfig) {
    this.token = config.token;
    this.companyDomain = config.companyDomain;
    this.isApiToken = config.isApiToken ?? false;
  }

  private createHttp(apiVersion: 'v1' | 'v2') {
    let headers: Record<string, string> = {};
    if (this.isApiToken) {
      headers['x-api-token'] = this.token;
    } else {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let http = createAxios({
      baseURL: `https://${this.companyDomain}.pipedrive.com/api/${apiVersion}`,
      headers
    });

    http.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(pipedriveApiError(error))
    );

    return http;
  }

  private get http() {
    return this.createHttp('v1');
  }

  private get httpV2() {
    return this.createHttp('v2');
  }

  // ── Deals ──

  async getDeals(params?: {
    start?: number;
    limit?: number;
    status?: string;
    stageId?: number;
    pipelineId?: number;
    userId?: number;
    filterId?: number;
    sort?: string;
  }) {
    let response = await this.http.get('/deals', { params });
    return response.data;
  }

  async getDeal(dealId: number) {
    let response = await this.http.get(`/deals/${dealId}`);
    return response.data;
  }

  async createDeal(data: Record<string, any>) {
    let response = await this.http.post('/deals', data);
    return response.data;
  }

  async updateDeal(dealId: number, data: Record<string, any>) {
    let response = await this.http.put(`/deals/${dealId}`, data);
    return response.data;
  }

  async deleteDeal(dealId: number) {
    let response = await this.http.delete(`/deals/${dealId}`);
    return response.data;
  }

  async getDealActivities(dealId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/deals/${dealId}/activities`, { params });
    return response.data;
  }

  async getDealParticipants(dealId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/deals/${dealId}/participants`, { params });
    return response.data;
  }

  async addDealParticipant(dealId: number, personId: number) {
    let response = await this.http.post(`/deals/${dealId}/participants`, {
      person_id: personId
    });
    return response.data;
  }

  async removeDealParticipant(dealId: number, participantId: number) {
    let response = await this.http.delete(`/deals/${dealId}/participants/${participantId}`);
    return response.data;
  }

  async getDealProducts(dealId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/deals/${dealId}/products`, { params });
    return response.data;
  }

  async addDealProduct(dealId: number, data: Record<string, any>) {
    let response = await this.http.post(`/deals/${dealId}/products`, data);
    return response.data;
  }

  async updateDealProduct(dealId: number, dealProductId: number, data: Record<string, any>) {
    let response = await this.http.put(`/deals/${dealId}/products/${dealProductId}`, data);
    return response.data;
  }

  async deleteDealProduct(dealId: number, dealProductId: number) {
    let response = await this.http.delete(`/deals/${dealId}/products/${dealProductId}`);
    return response.data;
  }

  // ── Leads ──

  async getLeads(params?: {
    start?: number;
    limit?: number;
    sort?: string;
    archivedStatus?: string;
  }) {
    let response = await this.http.get('/leads', {
      params: { ...params, archived_status: params?.archivedStatus }
    });
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.http.get(`/leads/${leadId}`);
    return response.data;
  }

  async createLead(data: Record<string, any>) {
    let response = await this.http.post('/leads', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/leads/${leadId}`, data);
    return response.data;
  }

  async deleteLead(leadId: string) {
    let response = await this.http.delete(`/leads/${leadId}`);
    return response.data;
  }

  async convertLeadToDeal(leadId: string, data: Record<string, any>) {
    let response = await this.httpV2.post(`/leads/${leadId}/convert/deal`, data);
    return response.data;
  }

  async getLeadConversionStatus(leadId: string, conversionId: string) {
    let response = await this.httpV2.get(`/leads/${leadId}/convert/status/${conversionId}`);
    return response.data;
  }

  // ── Persons ──

  async getPersons(params?: {
    start?: number;
    limit?: number;
    filterId?: number;
    sort?: string;
  }) {
    let response = await this.http.get('/persons', {
      params: { ...params, filter_id: params?.filterId }
    });
    return response.data;
  }

  async getPerson(personId: number) {
    let response = await this.http.get(`/persons/${personId}`);
    return response.data;
  }

  async createPerson(data: Record<string, any>) {
    let response = await this.http.post('/persons', data);
    return response.data;
  }

  async updatePerson(personId: number, data: Record<string, any>) {
    let response = await this.http.put(`/persons/${personId}`, data);
    return response.data;
  }

  async deletePerson(personId: number) {
    let response = await this.http.delete(`/persons/${personId}`);
    return response.data;
  }

  async getPersonDeals(personId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/persons/${personId}/deals`, { params });
    return response.data;
  }

  async getPersonActivities(personId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/persons/${personId}/activities`, { params });
    return response.data;
  }

  // ── Organizations ──

  async getOrganizations(params?: {
    start?: number;
    limit?: number;
    filterId?: number;
    sort?: string;
  }) {
    let response = await this.http.get('/organizations', {
      params: { ...params, filter_id: params?.filterId }
    });
    return response.data;
  }

  async getOrganization(orgId: number) {
    let response = await this.http.get(`/organizations/${orgId}`);
    return response.data;
  }

  async createOrganization(data: Record<string, any>) {
    let response = await this.http.post('/organizations', data);
    return response.data;
  }

  async updateOrganization(orgId: number, data: Record<string, any>) {
    let response = await this.http.put(`/organizations/${orgId}`, data);
    return response.data;
  }

  async deleteOrganization(orgId: number) {
    let response = await this.http.delete(`/organizations/${orgId}`);
    return response.data;
  }

  async getOrganizationDeals(orgId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/organizations/${orgId}/deals`, { params });
    return response.data;
  }

  async getOrganizationPersons(orgId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/organizations/${orgId}/persons`, { params });
    return response.data;
  }

  // ── Activities ──

  async getActivities(params?: {
    start?: number;
    limit?: number;
    userId?: number;
    filterId?: number;
    type?: string;
    done?: number;
  }) {
    let response = await this.http.get('/activities', {
      params: { ...params, user_id: params?.userId, filter_id: params?.filterId }
    });
    return response.data;
  }

  async getActivity(activityId: number) {
    let response = await this.http.get(`/activities/${activityId}`);
    return response.data;
  }

  async createActivity(data: Record<string, any>) {
    let response = await this.http.post('/activities', data);
    return response.data;
  }

  async updateActivity(activityId: number, data: Record<string, any>) {
    let response = await this.http.put(`/activities/${activityId}`, data);
    return response.data;
  }

  async deleteActivity(activityId: number) {
    let response = await this.http.delete(`/activities/${activityId}`);
    return response.data;
  }

  // ── Products ──

  async getProducts(params?: { start?: number; limit?: number }) {
    let response = await this.http.get('/products', { params });
    return response.data;
  }

  async getProduct(productId: number) {
    let response = await this.http.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(data: Record<string, any>) {
    let response = await this.http.post('/products', data);
    return response.data;
  }

  async updateProduct(productId: number, data: Record<string, any>) {
    let response = await this.http.put(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: number) {
    let response = await this.http.delete(`/products/${productId}`);
    return response.data;
  }

  // ── Pipelines ──

  async getPipelines() {
    let response = await this.http.get('/pipelines');
    return response.data;
  }

  async getPipeline(pipelineId: number) {
    let response = await this.http.get(`/pipelines/${pipelineId}`);
    return response.data;
  }

  async createPipeline(data: Record<string, any>) {
    let response = await this.http.post('/pipelines', data);
    return response.data;
  }

  async updatePipeline(pipelineId: number, data: Record<string, any>) {
    let response = await this.http.put(`/pipelines/${pipelineId}`, data);
    return response.data;
  }

  async deletePipeline(pipelineId: number) {
    let response = await this.http.delete(`/pipelines/${pipelineId}`);
    return response.data;
  }

  // ── Stages ──

  async getStages(pipelineId?: number) {
    let response = await this.http.get('/stages', {
      params: pipelineId ? { pipeline_id: pipelineId } : undefined
    });
    return response.data;
  }

  async getStage(stageId: number) {
    let response = await this.http.get(`/stages/${stageId}`);
    return response.data;
  }

  async createStage(data: Record<string, any>) {
    let response = await this.http.post('/stages', data);
    return response.data;
  }

  async updateStage(stageId: number, data: Record<string, any>) {
    let response = await this.http.put(`/stages/${stageId}`, data);
    return response.data;
  }

  async deleteStage(stageId: number) {
    let response = await this.http.delete(`/stages/${stageId}`);
    return response.data;
  }

  async getStageDeals(stageId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/stages/${stageId}/deals`, { params });
    return response.data;
  }

  // ── Notes ──

  async getNotes(params?: {
    start?: number;
    limit?: number;
    userId?: number;
    dealId?: number;
    personId?: number;
    orgId?: number;
    leadId?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
    updatedSince?: string;
    pinnedToDealFlag?: number;
    pinnedToPersonFlag?: number;
    pinnedToOrganizationFlag?: number;
    pinnedToLeadFlag?: number;
  }) {
    let response = await this.http.get('/notes', {
      params: {
        start: params?.start,
        limit: params?.limit,
        sort: params?.sort,
        user_id: params?.userId,
        deal_id: params?.dealId,
        person_id: params?.personId,
        org_id: params?.orgId,
        lead_id: params?.leadId,
        start_date: params?.startDate,
        end_date: params?.endDate,
        updated_since: params?.updatedSince,
        pinned_to_deal_flag: params?.pinnedToDealFlag,
        pinned_to_person_flag: params?.pinnedToPersonFlag,
        pinned_to_organization_flag: params?.pinnedToOrganizationFlag,
        pinned_to_lead_flag: params?.pinnedToLeadFlag
      }
    });
    return response.data;
  }

  async getNote(noteId: number) {
    let response = await this.http.get(`/notes/${noteId}`);
    return response.data;
  }

  async createNote(data: Record<string, any>) {
    let response = await this.http.post('/notes', data);
    return response.data;
  }

  async updateNote(noteId: number, data: Record<string, any>) {
    let response = await this.http.put(`/notes/${noteId}`, data);
    return response.data;
  }

  async deleteNote(noteId: number) {
    let response = await this.http.delete(`/notes/${noteId}`);
    return response.data;
  }

  // ── Search ──

  async search(params: {
    term: string;
    item_types?: string;
    fields?: string;
    exact_match?: boolean;
    start?: number;
    limit?: number;
  }) {
    let response = await this.http.get('/itemSearch', { params });
    return response.data;
  }

  // ── Goals ──

  async getGoals(params?: {
    is_active?: boolean;
    type_name?: string;
    period_start?: string;
    period_end?: string;
  }) {
    let response = await this.http.get('/goals/find', {
      params: { ...params, is_active: params?.is_active ? 1 : 0 }
    });
    return response.data;
  }

  async createGoal(data: Record<string, any>) {
    let response = await this.http.post('/goals', data);
    return response.data;
  }

  async updateGoal(goalId: string, data: Record<string, any>) {
    let response = await this.http.put(`/goals/${goalId}`, data);
    return response.data;
  }

  async deleteGoal(goalId: string) {
    let response = await this.http.delete(`/goals/${goalId}`);
    return response.data;
  }

  // ── Projects ──

  async getProjects(params?: { start?: number; limit?: number; status?: string }) {
    let response = await this.http.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.http.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.http.post('/projects', data);
    return response.data;
  }

  async updateProject(projectId: number, data: Record<string, any>) {
    let response = await this.http.put(`/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: number) {
    let response = await this.http.delete(`/projects/${projectId}`);
    return response.data;
  }

  async getProjectTasks(projectId: number, params?: { start?: number; limit?: number }) {
    let response = await this.http.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  }

  // ── Tasks ──

  async getTasks(params?: { start?: number; limit?: number }) {
    let response = await this.http.get('/tasks', { params });
    return response.data;
  }

  async getTask(taskId: number) {
    let response = await this.http.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.http.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: number, data: Record<string, any>) {
    let response = await this.http.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.http.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // ── Users ──

  async getUsers() {
    let response = await this.http.get('/users');
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  // ── Webhooks ──

  async getWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: {
    subscription_url: string;
    event_action: string;
    event_object: string;
  }) {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // ── Filters ──

  async getFilters(params?: { type?: string }) {
    let response = await this.http.get('/filters', { params });
    return response.data;
  }

  // ── Recents ──

  async getRecents(params: {
    since_timestamp: string;
    items?: string;
    start?: number;
    limit?: number;
  }) {
    let response = await this.http.get('/recents', { params });
    return response.data;
  }

  // ── Activity Types ──

  async getActivityTypes() {
    let response = await this.http.get('/activityTypes');
    return response.data;
  }

  // ── Deal Fields ──

  async getDealFields(params?: { cursor?: string; limit?: number; includeFields?: string }) {
    let response = await this.httpV2.get('/dealFields', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        include_fields: params?.includeFields
      }
    });
    return response.data;
  }

  // ── Person Fields ──

  async getPersonFields(params?: { cursor?: string; limit?: number; includeFields?: string }) {
    let response = await this.httpV2.get('/personFields', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        include_fields: params?.includeFields
      }
    });
    return response.data;
  }

  // ── Organization Fields ──

  async getOrganizationFields(params?: {
    cursor?: string;
    limit?: number;
    includeFields?: string;
  }) {
    let response = await this.httpV2.get('/organizationFields', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        include_fields: params?.includeFields
      }
    });
    return response.data;
  }

  // ── Product Fields ──

  async getProductFields(params?: {
    cursor?: string;
    limit?: number;
    includeFields?: string;
  }) {
    let response = await this.httpV2.get('/productFields', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        include_fields: params?.includeFields
      }
    });
    return response.data;
  }
}
