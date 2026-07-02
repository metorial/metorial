import { createAxios } from 'slates';
import { zohoApiError } from './errors';
import type { Datacenter } from './urls';
import { getApiBaseUrl, getDeskBaseUrl, getPeopleBaseUrl, getProjectsBaseUrl } from './urls';

let createZohoAxios = (config: Parameters<typeof createAxios>[0], operation: string) => {
  let http = createAxios(config);
  let interceptors = (http as any).interceptors;

  interceptors?.response?.use(
    (response: unknown) => response,
    (error: unknown) => Promise.reject(zohoApiError(error, operation))
  );

  return http;
};

let toFormData = (data: Record<string, any>) => {
  let form = new URLSearchParams();
  for (let [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  }
  return form;
};

export class ZohoCrmClient {
  private http;

  constructor(opts: { token: string; datacenter: Datacenter }) {
    let baseUrl = getApiBaseUrl(opts.datacenter);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/crm/v7`,
        headers: {
          Authorization: `Zoho-oauthtoken ${opts.token}`
        }
      },
      'CRM request'
    );
  }

  async getRecords(
    module: string,
    params?: {
      fields?: string;
      page?: number;
      perPage?: number;
      sortBy?: string;
      sortOrder?: string;
      cvid?: string;
      ids?: string;
      pageToken?: string;
      converted?: 'true' | 'false' | 'both';
      territoryId?: string;
      includeChild?: boolean;
    }
  ) {
    let response = await this.http.get(`/${module}`, {
      params: {
        fields: params?.fields,
        page: params?.page,
        per_page: params?.perPage,
        page_token: params?.pageToken,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        cvid: params?.cvid,
        ids: params?.ids,
        converted: params?.converted,
        territory_id: params?.territoryId,
        include_child: params?.includeChild
      }
    });
    return response.data;
  }

  async getRecord(module: string, recordId: string, fields?: string) {
    let response = await this.http.get(`/${module}/${recordId}`, {
      params: { fields }
    });
    return response.data;
  }

  async createRecords(module: string, records: Record<string, any>[], trigger?: string[]) {
    let body: Record<string, any> = { data: records };
    if (trigger && trigger.length > 0) body.trigger = trigger;
    let response = await this.http.post(`/${module}`, body);
    return response.data;
  }

  async updateRecord(
    module: string,
    recordId: string,
    data: Record<string, any>,
    trigger?: string[]
  ) {
    let body: Record<string, any> = { data: [{ ...data, id: recordId }] };
    if (trigger && trigger.length > 0) body.trigger = trigger;
    let response = await this.http.put(`/${module}`, body);
    return response.data;
  }

  async deleteRecord(module: string, recordId: string) {
    let response = await this.http.delete(`/${module}`, { params: { ids: recordId } });
    return response.data;
  }

  async searchRecords(
    module: string,
    params: {
      criteria?: string;
      email?: string;
      phone?: string;
      word?: string;
      page?: number;
      perPage?: number;
      fields?: string;
      converted?: 'true' | 'false' | 'both';
      approved?: 'true' | 'false' | 'both';
      userType?: string;
    }
  ) {
    let response = await this.http.get(`/${module}/search`, {
      params: {
        criteria: params.criteria,
        email: params.email,
        phone: params.phone,
        word: params.word,
        page: params.page,
        per_page: params.perPage,
        fields: params.fields,
        converted: params.converted,
        approved: params.approved,
        type: params.userType
      }
    });
    return response.data;
  }

  async getRelatedRecords(
    module: string,
    recordId: string,
    relatedListApiName: string,
    params: {
      fields: string;
      page?: number;
      perPage?: number;
      pageToken?: string;
      ids?: string;
      sortBy?: string;
      sortOrder?: string;
      converted?: 'true' | 'false' | 'both';
    }
  ) {
    let response = await this.http.get(`/${module}/${recordId}/${relatedListApiName}`, {
      params: {
        fields: params.fields,
        page: params.page,
        per_page: params.perPage,
        page_token: params.pageToken,
        ids: params.ids,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        converted: params.converted
      }
    });
    return response.data;
  }

  async executeCoql(query: string) {
    let response = await this.http.post('/coql', { select_query: query });
    return response.data;
  }

  async getModules(params?: { status?: string }) {
    let response = await this.http.get('/settings/modules', {
      params: {
        status: params?.status
      }
    });
    return response.data;
  }

  async getUsers(params?: { type?: string; page?: number; perPage?: number }) {
    let response = await this.http.get('/users', {
      params: {
        type: params?.type,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async enableNotifications(
    watchData: Array<{
      channelId: string;
      events: string[];
      notifyUrl: string;
      token?: string;
      channelExpiry?: string;
      returnAffectedFieldValues?: boolean;
    }>
  ) {
    let response = await this.http.post('/actions/watch', {
      watch: watchData.map(w => ({
        channel_id: w.channelId,
        events: w.events,
        notify_url: w.notifyUrl,
        token: w.token,
        channel_expiry: w.channelExpiry,
        return_affected_field_values: w.returnAffectedFieldValues
      }))
    });
    return response.data;
  }

  async disableNotifications(channelIds: string[]) {
    let response = await this.http.delete('/actions/watch', {
      params: { channel_ids: channelIds.join(',') }
    });
    return response.data;
  }

  async getNotificationDetails() {
    let response = await this.http.get('/actions/watch');
    return response.data;
  }
}

export class ZohoDeskClient {
  private http;

  constructor(opts: { token: string; datacenter: Datacenter; orgId: string }) {
    let baseUrl = getDeskBaseUrl(opts.datacenter);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/api/v1`,
        headers: {
          Authorization: `Zoho-oauthtoken ${opts.token}`,
          orgId: opts.orgId
        }
      },
      'Desk request'
    );
  }

  async listTickets(params?: {
    from?: number;
    limit?: number;
    departmentId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/tickets', {
      params: {
        from: params?.from,
        limit: params?.limit,
        departmentId: params?.departmentId,
        status: params?.status,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder
      }
    });
    return response.data;
  }

  async getTicket(ticketId: string) {
    let response = await this.http.get(`/tickets/${ticketId}`);
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
    let response = await this.http.post('/tickets/moveToTrash', {
      ticketIds: [ticketId]
    });
    return response.data;
  }

  async listContacts(params?: { from?: number; limit?: number; sortBy?: string }) {
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
    let response = await this.http.post('/contacts/moveToTrash', {
      contactIds: [contactId]
    });
    return response.data;
  }

  static async listOrganizations(token: string, datacenter: Datacenter) {
    let baseUrl = getDeskBaseUrl(datacenter);
    let http = createZohoAxios(
      {
        baseURL: `${baseUrl}/api/v1`,
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      },
      'Desk organizations request'
    );
    let response = await http.get('/organizations');
    return response.data;
  }

  async searchTickets(params: {
    from?: number;
    limit?: number;
    departmentId?: string;
    searchStr?: string;
    statusType?: string;
  }) {
    let response = await this.http.get('/tickets/search', {
      params: {
        departmentId: params.departmentId,
        from: params.from,
        limit: params.limit,
        searchStr: params.searchStr,
        statusType: params.statusType
      }
    });
    return response.data;
  }

  async getDepartments() {
    let response = await this.http.get('/departments');
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    isEnabled: boolean;
    subscriptions: Array<{ event: string; departmentIds?: string[] }>;
  }) {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }
}

export class ZohoBooksClient {
  private http;

  constructor(opts: { token: string; datacenter: Datacenter; organizationId: string }) {
    let baseUrl = getApiBaseUrl(opts.datacenter);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/books/v3`,
        headers: {
          Authorization: `Zoho-oauthtoken ${opts.token}`
        },
        params: {
          organization_id: opts.organizationId
        }
      },
      'Books request'
    );
  }

  static async listOrganizations(token: string, datacenter: Datacenter) {
    let baseUrl = getApiBaseUrl(datacenter);
    let http = createZohoAxios(
      {
        baseURL: `${baseUrl}/books/v3`,
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      },
      'Books organizations request'
    );
    let response = await http.get('/organizations');
    return response.data;
  }

  async listInvoices(params?: {
    page?: number;
    perPage?: number;
    status?: string;
    customerId?: string;
    sortColumn?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/invoices', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        status: params?.status,
        customer_id: params?.customerId,
        sort_column: params?.sortColumn,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.http.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.http.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.http.put(`/invoices/${invoiceId}`, data);
    return response.data;
  }

  async deleteInvoice(invoiceId: string) {
    let response = await this.http.delete(`/invoices/${invoiceId}`);
    return response.data;
  }

  async markInvoiceStatus(invoiceId: string, status: string) {
    let response = await this.http.post(`/invoices/${invoiceId}/status/${status}`);
    return response.data;
  }

  async listContacts(params?: {
    page?: number;
    perPage?: number;
    contactType?: string;
    sortColumn?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/contacts', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        contact_type: params?.contactType,
        sort_column: params?.sortColumn,
        sort_order: params?.sortOrder
      }
    });
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
    let response = await this.http.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.http.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async listExpenses(params?: {
    page?: number;
    perPage?: number;
    status?: string;
    sortColumn?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/expenses', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        status: params?.status,
        sort_column: params?.sortColumn,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  async getExpense(expenseId: string) {
    let response = await this.http.get(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(data: Record<string, any>) {
    let response = await this.http.post('/expenses', data);
    return response.data;
  }

  async updateExpense(expenseId: string, data: Record<string, any>) {
    let response = await this.http.put(`/expenses/${expenseId}`, data);
    return response.data;
  }

  async deleteExpense(expenseId: string) {
    let response = await this.http.delete(`/expenses/${expenseId}`);
    return response.data;
  }
}

export class ZohoPeopleClient {
  private http;

  constructor(opts: { token: string; datacenter: Datacenter }) {
    let baseUrl = getPeopleBaseUrl(opts.datacenter);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/people/api`,
        headers: {
          Authorization: `Zoho-oauthtoken ${opts.token}`
        }
      },
      'People request'
    );
  }

  async getFormRecords(
    formLinkName: string,
    params?: {
      sIndex?: number;
      limit?: number;
      searchColumn?: string;
      searchValue?: string;
    }
  ) {
    let response = await this.http.get(`/forms/${formLinkName}/getRecords`, {
      params: {
        sIndex: params?.sIndex ?? 1,
        limit: params?.limit ?? 200,
        searchColumn: params?.searchColumn,
        searchValue: params?.searchValue
      }
    });
    return response.data;
  }

  async listForms() {
    let response = await this.http.get('/forms');
    return response.data;
  }

  async getFormRecordById(formLinkName: string, recordId: string) {
    let response = await this.http.get(`/forms/${formLinkName}/getDataByID`, {
      params: { recordId }
    });
    return response.data;
  }

  async insertFormRecord(formLinkName: string, data: Record<string, any>) {
    let response = await this.http.post(`/forms/json/${formLinkName}/insertRecord`, null, {
      params: { inputData: JSON.stringify(data) }
    });
    return response.data;
  }

  async updateFormRecord(formLinkName: string, recordId: string, data: Record<string, any>) {
    let response = await this.http.post(`/forms/json/${formLinkName}/updateRecord`, null, {
      params: { inputData: JSON.stringify(data), recordId }
    });
    return response.data;
  }

  async getLeaveTypes() {
    let response = await this.http.get('/leave/getLeaveTypeDetails');
    return response.data;
  }

  async getAttendanceEntries(params: { sdate: string; edate: string; empId?: string }) {
    let response = await this.http.get('/attendance/getAttendanceEntries', { params });
    return response.data;
  }
}

export class ZohoProjectsClient {
  private http;

  constructor(opts: { token: string; datacenter: Datacenter; portalId: string }) {
    let baseUrl = getProjectsBaseUrl(opts.datacenter);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/restapi/portal/${opts.portalId}`,
        headers: {
          Authorization: `Zoho-oauthtoken ${opts.token}`
        }
      },
      'Projects request'
    );
  }

  static async listPortals(token: string, datacenter: Datacenter) {
    let baseUrl = getProjectsBaseUrl(datacenter);
    let http = createZohoAxios(
      {
        baseURL: `${baseUrl}/restapi`,
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      },
      'Projects portals request'
    );
    let response = await http.get('/portals/');
    return response.data;
  }

  async listProjects(params?: {
    index?: number;
    range?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/projects/', {
      params: {
        index: params?.index,
        range: params?.range,
        status: params?.status,
        sort_column: params?.sortBy,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}/`);
    return response.data;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.http.post('/projects/', toFormData(data));
    return response.data;
  }

  async updateProject(projectId: string, data: Record<string, any>) {
    let response = await this.http.post(`/projects/${projectId}/`, toFormData(data));
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.http.delete(`/projects/${projectId}/`);
    return response.data;
  }

  async listTasks(
    projectId: string,
    params?: {
      index?: number;
      range?: number;
      status?: string;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/tasks/`, {
      params: {
        index: params?.index,
        range: params?.range,
        status: params?.status
      }
    });
    return response.data;
  }

  async getTask(projectId: string, taskId: string) {
    let response = await this.http.get(`/projects/${projectId}/tasks/${taskId}/`);
    return response.data;
  }

  async createTask(projectId: string, data: Record<string, any>) {
    let response = await this.http.post(`/projects/${projectId}/tasks/`, toFormData(data));
    return response.data;
  }

  async updateTask(projectId: string, taskId: string, data: Record<string, any>) {
    let response = await this.http.post(
      `/projects/${projectId}/tasks/${taskId}/`,
      toFormData(data)
    );
    return response.data;
  }

  async deleteTask(projectId: string, taskId: string) {
    let response = await this.http.delete(`/projects/${projectId}/tasks/${taskId}/`);
    return response.data;
  }

  async listMilestones(
    projectId: string,
    params?: {
      index?: number;
      range?: number;
      status?: string;
    }
  ) {
    let response = await this.http.get(`/projects/${projectId}/milestones/`, {
      params: {
        index: params?.index,
        range: params?.range,
        status: params?.status
      }
    });
    return response.data;
  }
}
