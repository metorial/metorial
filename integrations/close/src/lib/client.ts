import { createAxios } from 'slates';

export interface CloseClientConfig {
  token: string;
  authType: 'oauth' | 'api_key';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: CloseClientConfig) {
    let authHeader: string;
    if (config.authType === 'api_key') {
      authHeader = `Basic ${btoa(`${config.token}:`)}`;
    } else {
      authHeader = `Bearer ${config.token}`;
    }

    this.axios = createAxios({
      baseURL: 'https://api.close.com/api/v1',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Leads ----

  async listLeads(params?: {
    limit?: number;
    skip?: number;
    fields?: string[];
    query?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.fields?.length) queryParams._fields = params.fields.join(',');
    if (params?.query) queryParams.query = params.query;

    let response = await this.axios.get('/lead/', { params: queryParams });
    return response.data;
  }

  async getLead(leadId: string, fields?: string[]): Promise<any> {
    let params: Record<string, string> = {};
    if (fields?.length) params._fields = fields.join(',');

    let response = await this.axios.get(`/lead/${leadId}/`, { params });
    return response.data;
  }

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/lead/', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/lead/${leadId}/`, data);
    return response.data;
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.axios.delete(`/lead/${leadId}/`);
  }

  async mergeLeads(sourceLeadId: string, destinationLeadId: string): Promise<any> {
    let response = await this.axios.post('/lead/merge/', {
      source: sourceLeadId,
      destination: destinationLeadId
    });
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: {
    limit?: number;
    skip?: number;
    leadId?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;

    let response = await this.axios.get('/contact/', { params: queryParams });
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/contact/${contactId}/`);
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/contact/', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/contact/${contactId}/`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contact/${contactId}/`);
  }

  // ---- Opportunities ----

  async listOpportunities(params?: {
    limit?: number;
    skip?: number;
    leadId?: string;
    userId?: string;
    statusId?: string;
    statusType?: string;
    query?: string;
    orderBy?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;
    if (params?.userId) queryParams.user_id = params.userId;
    if (params?.statusId) queryParams.status_id = params.statusId;
    if (params?.statusType) queryParams.status_type = params.statusType;
    if (params?.query) queryParams.query = params.query;
    if (params?.orderBy) queryParams._order_by = params.orderBy;

    let response = await this.axios.get('/opportunity/', { params: queryParams });
    return response.data;
  }

  async getOpportunity(opportunityId: string): Promise<any> {
    let response = await this.axios.get(`/opportunity/${opportunityId}/`);
    return response.data;
  }

  async createOpportunity(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/opportunity/', data);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/opportunity/${opportunityId}/`, data);
    return response.data;
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    await this.axios.delete(`/opportunity/${opportunityId}/`);
  }

  // ---- Tasks ----

  async listTasks(params?: {
    limit?: number;
    skip?: number;
    leadId?: string;
    assignedTo?: string;
    isComplete?: boolean;
    type?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;
    if (params?.assignedTo) queryParams._assigned_to = params.assignedTo;
    if (params?.isComplete !== undefined) queryParams.is_complete = String(params.isComplete);
    if (params?.type) queryParams._type = params.type;

    let response = await this.axios.get('/task/', { params: queryParams });
    return response.data;
  }

  async getTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/task/${taskId}/`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/task/', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/task/${taskId}/`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/task/${taskId}/`);
  }

  // ---- Activities ----

  async listActivities(params?: {
    limit?: number;
    skip?: number;
    leadId?: string;
    userId?: string;
    contactId?: string;
    type?: string;
    typeIn?: string[];
    dateCreatedGt?: string;
    dateCreatedLt?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;
    if (params?.userId) queryParams.user_id = params.userId;
    if (params?.contactId) queryParams.contact_id = params.contactId;
    if (params?.type) queryParams._type = params.type;
    if (params?.typeIn?.length) queryParams._type__in = params.typeIn.join(',');
    if (params?.dateCreatedGt) queryParams.date_created__gt = params.dateCreatedGt;
    if (params?.dateCreatedLt) queryParams.date_created__lt = params.dateCreatedLt;

    let response = await this.axios.get('/activity/', { params: queryParams });
    return response.data;
  }

  // ---- Notes ----

  async createNote(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activity/note/', data);
    return response.data;
  }

  async updateNote(noteId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/activity/note/${noteId}/`, data);
    return response.data;
  }

  async getNote(noteId: string): Promise<any> {
    let response = await this.axios.get(`/activity/note/${noteId}/`);
    return response.data;
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.axios.delete(`/activity/note/${noteId}/`);
  }

  // ---- Emails ----

  async sendEmail(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activity/email/', data);
    return response.data;
  }

  async getEmail(emailId: string): Promise<any> {
    let response = await this.axios.get(`/activity/email/${emailId}/`);
    return response.data;
  }

  async listEmailThreads(params?: {
    limit?: number;
    skip?: number;
    leadId?: string;
    userId?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;
    if (params?.userId) queryParams.user_id = params.userId;

    let response = await this.axios.get('/activity/emailthread/', { params: queryParams });
    return response.data;
  }

  // ---- Calls ----

  async createCall(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activity/call/', data);
    return response.data;
  }

  async getCall(callId: string): Promise<any> {
    let response = await this.axios.get(`/activity/call/${callId}/`);
    return response.data;
  }

  // ---- SMS ----

  async listSms(params?: { limit?: number; skip?: number; leadId?: string }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.leadId) queryParams.lead_id = params.leadId;

    let response = await this.axios.get('/activity/sms/', { params: queryParams });
    return response.data;
  }

  // ---- Smart Views ----

  async listSmartViews(params?: { type?: string }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.type) queryParams.type = params.type;

    let response = await this.axios.get('/saved_search/', { params: queryParams });
    return response.data;
  }

  async getSmartView(smartViewId: string): Promise<any> {
    let response = await this.axios.get(`/saved_search/${smartViewId}/`);
    return response.data;
  }

  async createSmartView(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/saved_search/', data);
    return response.data;
  }

  async updateSmartView(smartViewId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/saved_search/${smartViewId}/`, data);
    return response.data;
  }

  async deleteSmartView(smartViewId: string): Promise<void> {
    await this.axios.delete(`/saved_search/${smartViewId}/`);
  }

  // ---- Search / Advanced Filtering ----

  async searchLeads(
    query: Record<string, any>,
    params?: {
      limit?: number;
      skip?: number;
      fields?: string[];
      sort?: any[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      query,
      ...(params?.limit ? { _limit: params.limit } : {}),
      ...(params?.skip ? { _skip: params.skip } : {}),
      ...(params?.fields?.length ? { _fields: params.fields } : {}),
      ...(params?.sort?.length ? { sort: params.sort } : {})
    };

    let response = await this.axios.post('/data/search/', body);
    return response.data;
  }

  // ---- Email Templates ----

  async listEmailTemplates(params?: {
    limit?: number;
    skip?: number;
    isArchived?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.isArchived !== undefined) queryParams.is_archived = String(params.isArchived);

    let response = await this.axios.get('/email_template/', { params: queryParams });
    return response.data;
  }

  async getEmailTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/email_template/${templateId}/`);
    return response.data;
  }

  async createEmailTemplate(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/email_template/', data);
    return response.data;
  }

  async updateEmailTemplate(templateId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/email_template/${templateId}/`, data);
    return response.data;
  }

  async deleteEmailTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/email_template/${templateId}/`);
  }

  // ---- Pipelines and Statuses ----

  async listPipelines(): Promise<any> {
    let response = await this.axios.get('/pipeline/');
    return response.data;
  }

  async listLeadStatuses(): Promise<any> {
    let response = await this.axios.get('/status/lead/');
    return response.data;
  }

  async listOpportunityStatuses(): Promise<any> {
    let response = await this.axios.get('/status/opportunity/');
    return response.data;
  }

  // ---- Users ----

  async getMe(): Promise<any> {
    let response = await this.axios.get('/me/');
    return response.data;
  }

  async listUsers(params?: { limit?: number; skip?: number }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);

    let response = await this.axios.get('/user/', { params: queryParams });
    return response.data;
  }

  // ---- Webhook Subscriptions ----

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhook/');
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    events: Array<{ object_type: string; action: string }>;
    verify_ssl?: boolean;
    status?: string;
  }): Promise<any> {
    let response = await this.axios.post('/webhook/', data);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhook/${webhookId}/`);
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/webhook/${webhookId}/`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhook/${webhookId}/`);
  }

  // ---- Event Log ----

  async listEvents(params?: {
    limit?: number;
    skip?: number;
    objectType?: string;
    action?: string;
    dateUpdatedGt?: string;
    dateUpdatedLt?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.limit) queryParams._limit = String(params.limit);
    if (params?.skip) queryParams._skip = String(params.skip);
    if (params?.objectType) queryParams.object_type = params.objectType;
    if (params?.action) queryParams.action = params.action;
    if (params?.dateUpdatedGt) queryParams.date_updated__gt = params.dateUpdatedGt;
    if (params?.dateUpdatedLt) queryParams.date_updated__lt = params.dateUpdatedLt;

    let response = await this.axios.get('/event/', { params: queryParams });
    return response.data;
  }

  // ---- Custom Fields ----

  async listCustomFields(objectType: string): Promise<any> {
    let response = await this.axios.get(`/custom_field/${objectType}/`);
    return response.data;
  }

  async getCustomField(objectType: string, fieldId: string): Promise<any> {
    let response = await this.axios.get(`/custom_field/${objectType}/${fieldId}/`);
    return response.data;
  }

  async createCustomField(objectType: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/custom_field/${objectType}/`, data);
    return response.data;
  }

  async updateCustomField(
    objectType: string,
    fieldId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/custom_field/${objectType}/${fieldId}/`, data);
    return response.data;
  }

  async deleteCustomField(objectType: string, fieldId: string): Promise<void> {
    await this.axios.delete(`/custom_field/${objectType}/${fieldId}/`);
  }

  // ---- Organization ----

  async getOrganization(orgId: string): Promise<any> {
    let response = await this.axios.get(`/organization/${orgId}/`);
    return response.data;
  }

  // ---- Reporting ----

  async getReport(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/report/', data);
    return response.data;
  }
}
