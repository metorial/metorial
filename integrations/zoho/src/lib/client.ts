import { ZOHO_REGION_METADATA, type ZohoOauthOutput } from '@slates/oauth-zoho';
import { createApiServiceError, createAxios } from 'slates';
import { mapZohoAxiosError, zohoApiError } from './errors';
import {
  getDeskBaseUrl,
  getPeopleBaseUrl,
  getProjectsBaseUrl,
  ZOHO_API_ORIGINS,
  type ZohoSupportedRegion
} from './urls';

export type ZohoClientAuth = Pick<
  ZohoOauthOutput<ZohoSupportedRegion>,
  'token' | 'region' | 'accountsUrl' | 'apiDomain'
>;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let requireZohoAuth = (value: unknown): ZohoClientAuth => {
  if (!isRecord(value)) {
    throw createApiServiceError(
      'Zoho authentication state is missing. Reconnect the account.'
    );
  }
  if (typeof value.token !== 'string' || !value.token) {
    throw createApiServiceError('Zoho authentication state is missing an access token.');
  }
  if (typeof value.region !== 'string' || !(value.region in ZOHO_API_ORIGINS)) {
    throw createApiServiceError('Zoho authentication state has an invalid region.');
  }

  let region = value.region as ZohoSupportedRegion;
  if (value.apiDomain !== ZOHO_API_ORIGINS[region]) {
    throw createApiServiceError(
      'Zoho authentication state has an invalid API domain. Reconnect the account.'
    );
  }
  if (value.accountsUrl !== ZOHO_REGION_METADATA[region].accountsOrigin) {
    throw createApiServiceError(
      'Zoho authentication state has an invalid Accounts URL. Reconnect the account.'
    );
  }

  return value as ZohoClientAuth;
};

export let createZohoAxios = (
  config: Parameters<typeof createAxios>[0],
  operation: string
) => {
  let http = createAxios({
    ...(config ?? {}),
    errorMapping: {
      ...config?.errorMapping,
      mapAxiosError: mapZohoAxiosError
    }
  });
  let interceptors = (http as any).interceptors;

  interceptors?.response?.use(
    (response: unknown) => response,
    (error: unknown) => Promise.reject(zohoApiError(error, operation))
  );

  return http;
};

type ProjectsV3ListModule = 'projects' | 'tasks' | 'phases';

let projectsV3Filter = (module: ProjectsV3ListModule, status?: string) => {
  if (!status) return undefined;

  let normalized = status.trim().toLowerCase();
  if (!normalized || normalized === 'all') return undefined;

  let criterion: Record<string, unknown>;
  if (module === 'projects' && (normalized === 'active' || normalized === 'open')) {
    criterion = { field_name: 'status', criteria_condition: 'all_open' };
  } else if (module === 'projects' && (normalized === 'archived' || normalized === 'closed')) {
    criterion = { field_name: 'status', criteria_condition: 'all_closed' };
  } else if (module === 'projects' && normalized === 'template') {
    throw createApiServiceError(
      'The legacy Projects template filter has no verified V3 mapping. Use a V3 project status ID or omit status.'
    );
  } else if (module === 'tasks' && normalized === 'completed') {
    criterion = {
      field_name: 'is_completed',
      criteria_condition: 'is',
      value: ['true']
    };
  } else if (module === 'tasks' && normalized === 'notcompleted') {
    criterion = {
      field_name: 'is_completed',
      criteria_condition: 'is',
      value: ['false']
    };
  } else if (
    module === 'phases' &&
    (normalized === 'completed' || normalized === 'notcompleted')
  ) {
    throw createApiServiceError(
      'The legacy milestone completed/notcompleted filter has no verified V3 phase mapping. Use a V3 phase status ID or omit status.'
    );
  } else {
    criterion = {
      field_name: 'status',
      criteria_condition: 'is',
      value: [status]
    };
  }

  return JSON.stringify({ criteria: [criterion], pattern: '1' });
};

let projectsV3ListParams = (
  module: ProjectsV3ListModule,
  params?: {
    index?: number;
    range?: number;
    status?: string;
  }
) => {
  let perPage = params?.range;
  let pageSize = perPage && perPage > 0 ? perPage : 100;
  let page =
    params?.index === undefined
      ? undefined
      : Math.floor((Math.max(1, params.index) - 1) / pageSize) + 1;

  return { page, per_page: perPage, filter: projectsV3Filter(module, params?.status) };
};

let projectsV3Sort = (sortBy?: string, sortOrder?: string) => {
  if (!sortBy) return undefined;
  let direction = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return `${direction}(${sortBy})`;
};

export class ZohoCrmClient {
  private http;

  constructor(opts: ZohoClientAuth) {
    let auth = requireZohoAuth(opts);
    this.http = createZohoAxios(
      {
        baseURL: `${auth.apiDomain}/crm/v7`,
        headers: {
          Authorization: `Zoho-oauthtoken ${auth.token}`
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

  constructor(opts: ZohoClientAuth & { orgId: string }) {
    let auth = requireZohoAuth(opts);
    let baseUrl = getDeskBaseUrl(auth.region);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/api/v1`,
        headers: {
          Authorization: `Zoho-oauthtoken ${auth.token}`,
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

  static async listOrganizations(opts: ZohoClientAuth) {
    let auth = requireZohoAuth(opts);
    let baseUrl = getDeskBaseUrl(auth.region);
    let http = createZohoAxios(
      {
        baseURL: `${baseUrl}/api/v1`,
        headers: { Authorization: `Zoho-oauthtoken ${auth.token}` }
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

  constructor(opts: ZohoClientAuth & { organizationId: string }) {
    let auth = requireZohoAuth(opts);
    this.http = createZohoAxios(
      {
        baseURL: `${auth.apiDomain}/books/v3`,
        headers: {
          Authorization: `Zoho-oauthtoken ${auth.token}`
        },
        params: {
          organization_id: opts.organizationId
        }
      },
      'Books request'
    );
  }

  static async listOrganizations(opts: ZohoClientAuth) {
    let auth = requireZohoAuth(opts);
    let http = createZohoAxios(
      {
        baseURL: `${auth.apiDomain}/books/v3`,
        headers: { Authorization: `Zoho-oauthtoken ${auth.token}` }
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

  constructor(opts: ZohoClientAuth) {
    let auth = requireZohoAuth(opts);
    let baseUrl = getPeopleBaseUrl(auth.region);
    this.http = createZohoAxios(
      {
        baseURL: `${baseUrl}/people/api`,
        headers: {
          Authorization: `Zoho-oauthtoken ${auth.token}`
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

  constructor(opts: ZohoClientAuth & { portalId: string }) {
    let auth = requireZohoAuth(opts);
    this.http = createZohoAxios(
      {
        baseURL: `${getProjectsBaseUrl(auth.region)}/api/v3/portal/${encodeURIComponent(opts.portalId)}`,
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      },
      'Projects request'
    );
  }

  static async listPortals(opts: ZohoClientAuth) {
    let auth = requireZohoAuth(opts);
    let http = createZohoAxios(
      {
        baseURL: `${getProjectsBaseUrl(auth.region)}/api/v3`,
        headers: { Authorization: `Bearer ${auth.token}` }
      },
      'Projects portals request'
    );
    let response = await http.get('/portals');
    return response.data;
  }

  async listProjects(params?: {
    index?: number;
    range?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.http.get('/projects', {
      params: {
        ...projectsV3ListParams('projects', params),
        sort_by: projectsV3Sort(params?.sortBy, params?.sortOrder)
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${encodeURIComponent(projectId)}`);
    return response.data;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.http.post('/projects', data);
    return response.data;
  }

  async updateProject(projectId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/projects/${encodeURIComponent(projectId)}`, data);
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.http.delete(`/projects/${encodeURIComponent(projectId)}`);
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
    let response = await this.http.get(`/projects/${encodeURIComponent(projectId)}/tasks`, {
      params: projectsV3ListParams('tasks', params)
    });
    return response.data;
  }

  async getTask(projectId: string, taskId: string) {
    let response = await this.http.get(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`
    );
    return response.data;
  }

  async createTask(projectId: string, data: Record<string, any>) {
    let response = await this.http.post(
      `/projects/${encodeURIComponent(projectId)}/tasks`,
      data
    );
    return response.data;
  }

  async updateTask(projectId: string, taskId: string, data: Record<string, any>) {
    let response = await this.http.patch(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      data
    );
    return response.data;
  }

  async deleteTask(projectId: string, taskId: string) {
    let response = await this.http.delete(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`
    );
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
    let response = await this.http.get(`/projects/${encodeURIComponent(projectId)}/phases`, {
      params: projectsV3ListParams('phases', params)
    });
    return response.data;
  }
}
