import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { dataRegionSchema } from './schemas';

let getBaseUrl = (dataRegion: string): string => {
  if (dataRegion === 'global') {
    return 'https://api.clockify.me/api/v1';
  }
  return `https://${dataRegion}.clockify.me/api/v1`;
};

let getReportsBaseUrl = (dataRegion: string): string => {
  if (dataRegion === 'global') {
    return 'https://reports.api.clockify.me/v1';
  }
  return `https://${dataRegion}.clockify.me/report/v1`;
};

export class Client {
  private ax;
  private reportsAx;
  private configuredWorkspaceId?: string;

  private get workspaceId(): string {
    if (!this.configuredWorkspaceId) {
      throw createApiServiceError(
        'A workspace ID is required. Call get_workspaces and pass the chosen workspaceId to this tool.'
      );
    }
    return encodeURIComponent(this.configuredWorkspaceId);
  }

  constructor(config: { token: string; workspaceId?: string; dataRegion: string }) {
    this.configuredWorkspaceId = config.workspaceId;

    this.ax = createAuthenticatedAxios({
      baseURL: getBaseUrl(config.dataRegion),
      authHeader: { name: 'X-Api-Key', value: config.token },
      timeout: 30_000,
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Clockify',
          reason: 'clockify_api_error'
        })
    });

    this.reportsAx = createAuthenticatedAxios({
      baseURL: getReportsBaseUrl(config.dataRegion),
      authHeader: { name: 'X-Api-Key', value: config.token },
      timeout: 30_000,
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Clockify',
          reason: 'clockify_api_error'
        })
    });
  }

  // ── User ──

  getCurrentUser = async () => {
    let response = await this.ax.get('/user');
    return response.data;
  };

  getWorkspaceUsers = async (params?: {
    email?: string;
    name?: string;
    status?: string;
    page?: number;
    'page-size'?: number;
    'project-id'?: string;
    memberships?: string;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/users`, { params });
    return response.data;
  };

  updateUser = async (userId: string, data: Record<string, any>) => {
    let response = await this.ax.put(`/workspaces/${this.workspaceId}/users/${userId}`, data);
    return response.data;
  };

  // ── Time Entries ──

  getTimeEntries = async (
    userId: string,
    params?: {
      start?: string;
      end?: string;
      project?: string;
      task?: string;
      tags?: string[];
      description?: string;
      'page-size'?: number;
      page?: number;
      'in-progress'?: boolean;
      hydrated?: boolean;
    }
  ) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/user/${userId}/time-entries`,
      { params }
    );
    return response.data;
  };

  createTimeEntry = async (data: {
    start: string;
    end?: string;
    description?: string;
    projectId?: string;
    taskId?: string;
    tagIds?: string[];
    billable?: boolean;
    customFields?: Array<{ customFieldId: string; value: any }>;
    type?: string;
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/time-entries`, data);
    return response.data;
  };

  updateTimeEntry = async (
    timeEntryId: string,
    data: {
      start: string;
      end?: string;
      description?: string;
      projectId?: string;
      taskId?: string;
      tagIds?: string[];
      billable?: boolean;
      customFields?: Array<{ customFieldId: string; value: any }>;
    }
  ) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`,
      data
    );
    return response.data;
  };

  deleteTimeEntry = async (timeEntryId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`);
  };

  stopTimer = async (userId: string, data: { end: string }) => {
    let response = await this.ax.patch(
      `/workspaces/${this.workspaceId}/user/${userId}/time-entries`,
      data
    );
    return response.data;
  };

  getTimeEntry = async (timeEntryId: string, hydrated?: boolean) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`,
      { params: { hydrated } }
    );
    return response.data;
  };

  // ── Projects ──

  getProjects = async (params?: {
    name?: string;
    archived?: boolean;
    'page-size'?: number;
    page?: number;
    hydrated?: boolean;
    clients?: string[];
    billable?: boolean;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/projects`, { params });
    return response.data;
  };

  getProject = async (projectId: string) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/projects/${projectId}`);
    return response.data;
  };

  createProject = async (data: {
    name: string;
    clientId?: string;
    isPublic?: boolean;
    color?: string;
    billable?: boolean;
    note?: string;
    memberships?: Array<{
      userId: string;
      hourlyRate?: { amount: number; currency: string };
      costRate?: { amount: number; currency: string };
    }>;
    estimate?: { estimate: string; type: string };
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/projects`, data);
    return response.data;
  };

  updateProject = async (
    projectId: string,
    data: {
      name?: string;
      clientId?: string;
      isPublic?: boolean;
      color?: string;
      billable?: boolean;
      archived?: boolean;
      note?: string;
      estimate?: { estimate: string; type: string };
    }
  ) => {
    let current = await this.getProject(projectId);
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/projects/${projectId}`,
      pickDefined({
        name: data.name ?? current.name,
        clientId: data.clientId ?? current.clientId,
        isPublic: data.isPublic ?? current.public,
        color: data.color ?? current.color,
        billable: data.billable ?? current.billable,
        archived: data.archived ?? current.archived,
        note: data.note ?? current.note
      })
    );
    return response.data;
  };

  deleteProject = async (projectId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/projects/${projectId}`);
  };

  // ── Tasks ──

  getTasks = async (
    projectId: string,
    params?: {
      name?: string;
      'is-active'?: boolean;
      'page-size'?: number;
      page?: number;
    }
  ) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks`,
      { params }
    );
    return response.data;
  };

  getTask = async (projectId: string, taskId: string) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks/${taskId}`
    );
    return response.data;
  };

  createTask = async (
    projectId: string,
    data: {
      name: string;
      assigneeIds?: string[];
      billable?: boolean;
      estimate?: string;
      status?: string;
      hourlyRate?: { amount: number; currency: string };
      costRate?: { amount: number; currency: string };
    }
  ) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks`,
      pickDefined({
        name: data.name,
        assigneeIds: data.assigneeIds,
        estimate: data.estimate,
        status: data.status
      })
    );
    if (data.billable !== undefined) {
      return this.updateTask(projectId, response.data.id, { billable: data.billable });
    }
    return response.data;
  };

  updateTask = async (
    projectId: string,
    taskId: string,
    data: {
      name?: string;
      assigneeIds?: string[];
      billable?: boolean;
      estimate?: string;
      status?: string;
      hourlyRate?: { amount: number; currency: string };
      costRate?: { amount: number; currency: string };
    }
  ) => {
    let current = await this.getTask(projectId, taskId);
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks/${taskId}`,
      pickDefined({
        name: data.name ?? current.name,
        assigneeIds: data.assigneeIds ?? current.assigneeIds,
        billable: data.billable ?? current.billable,
        estimate: data.estimate ?? current.estimate,
        status: data.status ?? current.status
      })
    );
    return response.data;
  };

  deleteTask = async (projectId: string, taskId: string) => {
    await this.ax.delete(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks/${taskId}`
    );
  };

  // ── Clients ──

  getClients = async (params?: {
    name?: string;
    archived?: boolean;
    page?: number;
    'page-size'?: number;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/clients`, { params });
    return response.data;
  };

  getClient = async (clientId: string) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/clients/${clientId}`);
    return response.data;
  };

  createClient = async (data: {
    name: string;
    email?: string;
    address?: string;
    note?: string;
    currency?: string;
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/clients`, data);
    return response.data;
  };

  updateClient = async (
    clientId: string,
    data: {
      name?: string;
      email?: string;
      address?: string;
      note?: string;
      currency?: string;
      archived?: boolean;
    }
  ) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/clients/${clientId}`,
      data
    );
    return response.data;
  };

  deleteClient = async (clientId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/clients/${clientId}`);
  };

  // ── Tags ──

  getTags = async (params?: {
    name?: string;
    archived?: boolean;
    page?: number;
    'page-size'?: number;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/tags`, { params });
    return response.data;
  };

  createTag = async (data: { name: string }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/tags`, data);
    return response.data;
  };

  updateTag = async (tagId: string, data: { name?: string; archived?: boolean }) => {
    let response = await this.ax.put(`/workspaces/${this.workspaceId}/tags/${tagId}`, data);
    return response.data;
  };

  deleteTag = async (tagId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/tags/${tagId}`);
  };

  // ── User Groups ──

  getUserGroups = async (params?: { name?: string; page?: number; 'page-size'?: number }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/user-groups`, {
      params
    });
    return response.data;
  };

  createUserGroup = async (data: { name: string }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/user-groups`, data);
    return response.data;
  };

  updateUserGroup = async (groupId: string, data: { name?: string }) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/user-groups/${groupId}`,
      data
    );
    return response.data;
  };

  deleteUserGroup = async (groupId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/user-groups/${groupId}`);
  };

  addUserToGroup = async (groupId: string, userId: string) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/user-groups/${groupId}/users/${userId}`
    );
    return response.data;
  };

  removeUserFromGroup = async (groupId: string, userId: string) => {
    await this.ax.delete(
      `/workspaces/${this.workspaceId}/user-groups/${groupId}/users/${userId}`
    );
  };

  // ── Workspace ──

  getWorkspace = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}`);
    return response.data;
  };

  getWorkspaces = async () => {
    let response = await this.ax.get('/workspaces');
    return response.data;
  };

  // ── Invoices ──

  getInvoices = async (params?: {
    page?: number;
    'page-size'?: number;
    statuses?: string;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/invoices`, { params });
    return response.data;
  };

  getInvoice = async (invoiceId: string) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/invoices/${invoiceId}`);
    return response.data;
  };

  createInvoice = async (data: {
    clientId: string;
    number?: string;
    issuedDate?: string;
    dueDate?: string;
    currency?: string;
    note?: string;
    items?: Array<{ description?: string; quantity?: number; unitPrice?: number }>;
  }) => {
    for (let field of ['number', 'issuedDate', 'dueDate', 'currency'] as const) {
      if (!data[field]) {
        throw createApiServiceError(
          `Provide ${field}; Clockify requires it to create an invoice.`
        );
      }
    }
    this.validateInvoiceItems(data.items);
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/invoices`, {
      clientId: data.clientId,
      number: data.number,
      issuedDate: data.issuedDate,
      dueDate: data.dueDate,
      currency: data.currency
    });
    let invoice = response.data;
    if (data.note !== undefined || data.items?.length) {
      invoice = await this.updateInvoice(invoice.id, {
        note: data.note,
        items: data.items
      });
    }
    return invoice;
  };

  private validateInvoiceItems(
    items?: Array<{ description?: string; quantity?: number; unitPrice?: number }>
  ) {
    for (let item of items ?? []) {
      if (
        item.description === undefined ||
        !Number.isSafeInteger(item.quantity) ||
        !Number.isSafeInteger(item.unitPrice)
      ) {
        throw createApiServiceError(
          'Each invoice item requires description, integer quantity, and integer unitPrice in Clockify API units.'
        );
      }
    }
  }

  updateInvoice = async (
    invoiceId: string,
    data: {
      status?: string;
      dueDate?: string;
      note?: string;
      items?: Array<{ description?: string; quantity?: number; unitPrice?: number }>;
    }
  ) => {
    this.validateInvoiceItems(data.items);
    let invoice = await this.getInvoice(invoiceId);
    if (data.dueDate !== undefined || data.note !== undefined) {
      let response = await this.ax.put(
        `/workspaces/${this.workspaceId}/invoices/${encodeURIComponent(invoiceId)}`,
        pickDefined({
          clientId: invoice.clientId,
          companyId: invoice.companyId,
          currency: invoice.currency,
          discountPercent: invoice.discount ?? 0,
          dueDate: data.dueDate ?? invoice.dueDate,
          issuedDate: invoice.issuedDate,
          note: data.note ?? invoice.note,
          number: invoice.number,
          subject: invoice.subject,
          tax2Percent: invoice.tax2 ?? 0,
          taxPercent: invoice.tax ?? 0,
          taxType: invoice.taxType
        })
      );
      invoice = response.data;
    }
    if (data.items !== undefined) {
      let existingItems: Array<{ order: number }> = invoice.items ?? [];
      for (let item of [...existingItems].sort((left, right) => right.order - left.order)) {
        await this.ax.delete(
          `/workspaces/${this.workspaceId}/invoices/${encodeURIComponent(invoiceId)}/items/${item.order}`
        );
      }
      for (let item of data.items) {
        await this.ax.post(
          `/workspaces/${this.workspaceId}/invoices/${encodeURIComponent(invoiceId)}/items`,
          {
            applyTaxes: 'NONE',
            itemType: 'Service',
            ...item
          }
        );
      }
    }
    if (data.status !== undefined) {
      await this.ax.patch(
        `/workspaces/${this.workspaceId}/invoices/${encodeURIComponent(invoiceId)}/status`,
        {
          invoiceStatus: data.status
        }
      );
    }
    return this.getInvoice(invoiceId);
  };

  deleteInvoice = async (invoiceId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/invoices/${invoiceId}`);
  };

  // ── Expenses ──

  getExpenses = async (params?: { page?: number; 'page-size'?: number; project?: string }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/expenses`, { params });
    return response.data;
  };

  createExpense = async (data: {
    date: string;
    projectId?: string;
    categoryId?: string;
    userId?: string;
    quantity?: number;
    totalAmount?: number;
    billable?: boolean;
    notes?: string;
    receipt?: { fileName: string; contentBase64: string; mimeType?: string };
  }) => {
    if (!data.projectId || !data.categoryId || !data.receipt) {
      throw createApiServiceError(
        'Provide projectId, categoryId, and receipt; Clockify requires these fields to create an expense.'
      );
    }
    if ((data.quantity === undefined) === (data.totalAmount === undefined)) {
      throw createApiServiceError(
        'Provide exactly one of quantity (unit-based category) or totalAmount (amount-based category).'
      );
    }
    let form = new FormData();
    form.set('date', data.date);
    form.set('projectId', data.projectId);
    form.set('categoryId', data.categoryId);
    form.set('userId', data.userId ?? (await this.getCurrentUser()).id);
    form.set('amount', String(data.quantity ?? data.totalAmount));
    if (data.billable !== undefined) form.set('billable', String(data.billable));
    if (data.notes !== undefined) form.set('notes', data.notes);
    form.set(
      'file',
      new Blob([Uint8Array.from(Buffer.from(data.receipt.contentBase64, 'base64'))], {
        type: data.receipt.mimeType ?? 'application/octet-stream'
      }),
      data.receipt.fileName
    );
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/expenses`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  };

  updateExpense = async (expenseId: string, data: Record<string, any>) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/expenses/${expenseId}`,
      data
    );
    return response.data;
  };

  deleteExpense = async (expenseId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/expenses/${expenseId}`);
  };

  // ── Expense Categories ──

  getExpenseCategories = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/expenses/categories`);
    return response.data;
  };

  // ── Webhooks ──

  getWebhooks = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/webhooks`);
    return response.data;
  };

  createWebhook = async (data: {
    name: string;
    url: string;
    triggerEvent: string;
    triggerSourceType?: string;
    triggerSourceId?: string;
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/webhooks`, data);
    return response.data;
  };

  deleteWebhook = async (webhookId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/webhooks/${webhookId}`);
  };

  // ── Reports ──

  getDetailedReport = async (data: {
    dateRangeStart: string;
    dateRangeEnd: string;
    detailedFilter?: Record<string, any>;
    sortOrder?: string;
    description?: string;
    rounding?: boolean;
    withoutDescription?: boolean;
    amountShown?: string;
    exportType?: string;
    users?: { ids?: string[]; contains?: string; status?: string };
    clients?: { ids?: string[]; contains?: string; status?: string };
    projects?: { ids?: string[]; contains?: string; status?: string };
    tasks?: { ids?: string[]; contains?: string; status?: string };
    tags?: { ids?: string[]; containedInTimeentry?: string; status?: string };
    billable?: boolean;
    invoicingState?: string;
    approvalState?: string;
  }) => {
    let response = await this.reportsAx.post(
      `/workspaces/${this.workspaceId}/reports/detailed`,
      data
    );
    return response.data;
  };

  getSummaryReport = async (data: {
    dateRangeStart: string;
    dateRangeEnd: string;
    summaryFilter?: { groups?: string[] };
    sortOrder?: string;
    users?: { ids?: string[]; contains?: string; status?: string };
    clients?: { ids?: string[]; contains?: string; status?: string };
    projects?: { ids?: string[]; contains?: string; status?: string };
    tasks?: { ids?: string[]; contains?: string; status?: string };
    tags?: { ids?: string[]; containedInTimeentry?: string; status?: string };
    billable?: boolean;
  }) => {
    let response = await this.reportsAx.post(
      `/workspaces/${this.workspaceId}/reports/summary`,
      data
    );
    return response.data;
  };

  // ── Custom Fields ──

  getCustomFields = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/custom-fields`);
    return response.data;
  };

  // ── Time Off ──

  getTimeOffRequests = async (data?: {
    page?: number;
    pageSize?: number;
    statuses?: string[];
    users?: string[];
    start?: string;
    end?: string;
  }) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/time-off/requests`,
      pickDefined(data ?? {})
    );
    return response.data;
  };

  createTimeOffRequest = async (data: {
    policyId: string;
    start: string;
    end: string;
    note?: string;
    halfDay?: boolean;
    halfDayPeriod?: string;
  }) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/time-off/policies/${encodeURIComponent(data.policyId)}/requests`,
      {
        note: data.note,
        timeOffPeriod: {
          period: { start: data.start, end: data.end },
          isHalfDay: data.halfDay ?? false,
          halfDayPeriod: data.halfDayPeriod ?? 'NOT_DEFINED'
        }
      }
    );
    return response.data;
  };

  updateTimeOffRequestStatus = async (
    policyId: string,
    requestId: string,
    data: { status: string; note?: string }
  ) => {
    let response = await this.ax.patch(
      `/workspaces/${this.workspaceId}/time-off/policies/${encodeURIComponent(policyId)}/requests/${encodeURIComponent(requestId)}`,
      data
    );
    return response.data;
  };

  getTimeOffPolicies = async (params?: { page?: number; 'page-size'?: number }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/time-off/policies`, {
      params
    });
    return response.data;
  };

  // ── Scheduling ──

  getScheduledAssignments = async (params?: {
    page?: number;
    'page-size'?: number;
    start?: string;
    end?: string;
  }) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/scheduling/assignments`,
      { params }
    );
    return response.data;
  };

  createScheduledAssignment = async (data: Record<string, any>) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/scheduling/assignments`,
      data
    );
    return response.data;
  };

  deleteScheduledAssignment = async (assignmentId: string) => {
    await this.ax.delete(
      `/workspaces/${this.workspaceId}/scheduling/assignments/${assignmentId}`
    );
  };

  // ── Approvals ──

  getApprovalRequests = async (params?: {
    page?: number;
    'page-size'?: number;
    status?: string;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/approval-requests`, {
      params
    });
    return response.data;
  };

  // ── Holidays ──

  getHolidays = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/holidays`);
    return response.data;
  };

  createHoliday = async (data: {
    name: string;
    date: string;
    recurring?: boolean;
    userIds?: string[];
    userGroupIds?: string[];
    autoCreateTimeEntries?: boolean;
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/holidays`, data);
    return response.data;
  };

  updateHoliday = async (holidayId: string, data: Record<string, any>) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/holidays/${holidayId}`,
      data
    );
    return response.data;
  };

  deleteHoliday = async (holidayId: string) => {
    await this.ax.delete(`/workspaces/${this.workspaceId}/holidays/${holidayId}`);
  };
}

let legacyConfigSchema = z.object({
  workspaceId: z.string().optional(),
  dataRegion: dataRegionSchema.optional()
});

export let createApiClient = (ctx: {
  auth: { token: string; dataRegion?: z.infer<typeof dataRegionSchema> };
  config: unknown;
  input: { workspaceId?: string };
}) => {
  let stored = legacyConfigSchema.safeParse(ctx.config);
  let legacy = stored.success ? stored.data : {};
  return new Client({
    token: ctx.auth.token,
    workspaceId: ctx.input.workspaceId ?? legacy.workspaceId,
    dataRegion: ctx.auth.dataRegion ?? legacy.dataRegion ?? 'global'
  });
};
