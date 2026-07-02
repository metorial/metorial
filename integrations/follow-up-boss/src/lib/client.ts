import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  authMethod: 'oauth' | 'api_key';
  xSystem: string;
  xSystemKey: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ListMetadata {
  collection: string;
  offset: number;
  limit: number;
  total: number;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      'X-System': config.xSystem,
      'X-System-Key': config.xSystemKey,
      'Content-Type': 'application/json'
    };

    if (config.authMethod === 'oauth') {
      headers.Authorization = `Bearer ${config.token}`;
    } else {
      let basicAuth = Buffer.from(`${config.token}:`).toString('base64');
      headers.Authorization = `Basic ${basicAuth}`;
    }

    this.axios = createAxios({
      baseURL: 'https://api.followupboss.com/v1',
      headers
    });
  }

  // ===== People =====

  async listPeople(
    params?: PaginationParams & {
      sort?: string;
      fields?: string;
      includeTrash?: boolean;
      includeUnclaimed?: boolean;
      [key: string]: any;
    }
  ) {
    let response = await this.axios.get('/people', { params });
    return response.data;
  }

  async getPerson(personId: number) {
    let response = await this.axios.get(`/people/${personId}`);
    return response.data;
  }

  async createPerson(data: Record<string, any>) {
    let response = await this.axios.post('/people', data);
    return response.data;
  }

  async updatePerson(personId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/people/${personId}`, data);
    return response.data;
  }

  async deletePerson(personId: number) {
    let response = await this.axios.delete(`/people/${personId}`);
    return response.data;
  }

  async checkDuplicate(params: { emails?: string[]; phones?: string[] }) {
    let queryParams: Record<string, string> = {};
    if (params.emails) queryParams.emails = params.emails.join(',');
    if (params.phones) queryParams.phones = params.phones.join(',');
    let response = await this.axios.get('/people/checkDuplicate', { params: queryParams });
    return response.data;
  }

  async getUnclaimedPeople(params?: PaginationParams) {
    let response = await this.axios.get('/people/unclaimed', { params });
    return response.data;
  }

  async claimPerson(data: { personId: number; userId?: number }) {
    let response = await this.axios.post('/people/claim', data);
    return response.data;
  }

  // ===== Events (Lead Ingestion) =====

  async createEvent(data: Record<string, any>) {
    let response = await this.axios.post('/events', data);
    return response.data;
  }

  async listEvents(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: number) {
    let response = await this.axios.get(`/events/${eventId}`);
    return response.data;
  }

  // ===== Notes =====

  async createNote(data: {
    personId: number;
    body: string;
    subject?: string;
    isHtml?: boolean;
  }) {
    let response = await this.axios.post('/notes', data);
    return response.data;
  }

  async getNote(noteId: number) {
    let response = await this.axios.get(`/notes/${noteId}`);
    return response.data;
  }

  async updateNote(noteId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/notes/${noteId}`, data);
    return response.data;
  }

  async deleteNote(noteId: number) {
    let response = await this.axios.delete(`/notes/${noteId}`);
    return response.data;
  }

  // ===== Calls =====

  async listCalls(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/calls', { params });
    return response.data;
  }

  async createCall(data: Record<string, any>) {
    let response = await this.axios.post('/calls', data);
    return response.data;
  }

  async getCall(callId: number) {
    let response = await this.axios.get(`/calls/${callId}`);
    return response.data;
  }

  async updateCall(callId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/calls/${callId}`, data);
    return response.data;
  }

  // ===== Text Messages =====

  async listTextMessages(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/textMessages', { params });
    return response.data;
  }

  async createTextMessage(data: Record<string, any>) {
    let response = await this.axios.post('/textMessages', data);
    return response.data;
  }

  async getTextMessage(textMessageId: number) {
    let response = await this.axios.get(`/textMessages/${textMessageId}`);
    return response.data;
  }

  // ===== Tasks =====

  async listTasks(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/tasks', { params });
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async getTask(taskId: number) {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async updateTask(taskId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.axios.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // ===== Appointments =====

  async listAppointments(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/appointments', { params });
    return response.data;
  }

  async createAppointment(data: Record<string, any>) {
    let response = await this.axios.post('/appointments', data);
    return response.data;
  }

  async getAppointment(appointmentId: number) {
    let response = await this.axios.get(`/appointments/${appointmentId}`);
    return response.data;
  }

  async updateAppointment(appointmentId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/appointments/${appointmentId}`, data);
    return response.data;
  }

  async deleteAppointment(appointmentId: number) {
    let response = await this.axios.delete(`/appointments/${appointmentId}`);
    return response.data;
  }

  // ===== Deals =====

  async listDeals(params?: PaginationParams & Record<string, any>) {
    let response = await this.axios.get('/deals', { params });
    return response.data;
  }

  async createDeal(data: Record<string, any>) {
    let response = await this.axios.post('/deals', data);
    return response.data;
  }

  async getDeal(dealId: number) {
    let response = await this.axios.get(`/deals/${dealId}`);
    return response.data;
  }

  async updateDeal(dealId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/deals/${dealId}`, data);
    return response.data;
  }

  async deleteDeal(dealId: number) {
    let response = await this.axios.delete(`/deals/${dealId}`);
    return response.data;
  }

  // ===== Pipelines =====

  async listPipelines(params?: PaginationParams) {
    let response = await this.axios.get('/pipelines', { params });
    return response.data;
  }

  async createPipeline(data: Record<string, any>) {
    let response = await this.axios.post('/pipelines', data);
    return response.data;
  }

  async getPipeline(pipelineId: number) {
    let response = await this.axios.get(`/pipelines/${pipelineId}`);
    return response.data;
  }

  async updatePipeline(pipelineId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/pipelines/${pipelineId}`, data);
    return response.data;
  }

  async deletePipeline(pipelineId: number) {
    let response = await this.axios.delete(`/pipelines/${pipelineId}`);
    return response.data;
  }

  // ===== Users =====

  async listUsers(params?: PaginationParams) {
    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async getMe() {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ===== Webhooks =====

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { event: string; url: string }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(webhookId: number, data: { event?: string; url?: string }) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // ===== Stages =====

  async listStages(params?: PaginationParams) {
    let response = await this.axios.get('/stages', { params });
    return response.data;
  }

  async getStage(stageId: number) {
    let response = await this.axios.get(`/stages/${stageId}`);
    return response.data;
  }

  // ===== Custom Fields =====

  async listCustomFields(params?: PaginationParams) {
    let response = await this.axios.get('/customFields', { params });
    return response.data;
  }

  // ===== Action Plans =====

  async listActionPlans(params?: PaginationParams) {
    let response = await this.axios.get('/actionPlans', { params });
    return response.data;
  }

  async enrollInActionPlan(data: { personId: number; actionPlanId: number }) {
    let response = await this.axios.post('/actionPlansPeople', data);
    return response.data;
  }

  async updateActionPlanEnrollment(enrollmentId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/actionPlansPeople/${enrollmentId}`, data);
    return response.data;
  }

  // ===== Smart Lists =====

  async listSmartLists(params?: PaginationParams) {
    let response = await this.axios.get('/smartLists', { params });
    return response.data;
  }

  async getSmartList(smartListId: number) {
    let response = await this.axios.get(`/smartLists/${smartListId}`);
    return response.data;
  }

  // ===== People Relationships =====

  async listPeopleRelationships(params?: PaginationParams & { personId?: number }) {
    let response = await this.axios.get('/peopleRelationships', { params });
    return response.data;
  }

  async createPeopleRelationship(data: Record<string, any>) {
    let response = await this.axios.post('/peopleRelationships', data);
    return response.data;
  }

  async updatePeopleRelationship(relationshipId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/peopleRelationships/${relationshipId}`, data);
    return response.data;
  }

  async deletePeopleRelationship(relationshipId: number) {
    let response = await this.axios.delete(`/peopleRelationships/${relationshipId}`);
    return response.data;
  }

  // ===== Templates =====

  async listTemplates(params?: PaginationParams) {
    let response = await this.axios.get('/templates', { params });
    return response.data;
  }

  async getTemplate(templateId: number) {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async listTextMessageTemplates(params?: PaginationParams) {
    let response = await this.axios.get('/textMessageTemplates', { params });
    return response.data;
  }

  // ===== Teams & Groups =====

  async listTeams(params?: PaginationParams) {
    let response = await this.axios.get('/teams', { params });
    return response.data;
  }

  async listGroups(params?: PaginationParams) {
    let response = await this.axios.get('/groups', { params });
    return response.data;
  }

  // ===== Email Marketing =====

  async createEmEvent(data: Record<string, any>) {
    let response = await this.axios.post('/emEvents', data);
    return response.data;
  }

  async listEmCampaigns(params?: PaginationParams) {
    let response = await this.axios.get('/emCampaigns', { params });
    return response.data;
  }
}
