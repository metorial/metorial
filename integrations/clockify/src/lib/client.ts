import { createAxios } from 'slates';

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
  return `https://${dataRegion}.reports.api.clockify.me/v1`;
};

export class Client {
  private ax;
  private reportsAx;
  private workspaceId: string;

  constructor(config: { token: string; workspaceId: string; dataRegion: string }) {
    this.workspaceId = config.workspaceId;

    this.ax = createAxios({
      baseURL: getBaseUrl(config.dataRegion),
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });

    this.reportsAx = createAxios({
      baseURL: getReportsBaseUrl(config.dataRegion),
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
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
    pageSize?: number;
    projectId?: string;
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
      tags?: string;
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

  getTimeEntry = async (timeEntryId: string) => {
    let response = await this.ax.get(
      `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`
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
    clients?: string;
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
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/projects/${projectId}`,
      data
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
      data
    );
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
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/projects/${projectId}/tasks/${taskId}`,
      data
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

  getInvoices = async (params?: { page?: number; 'page-size'?: number; status?: string }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/invoices`, { params });
    return response.data;
  };

  getInvoice = async (invoiceId: string) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/invoices/${invoiceId}`);
    return response.data;
  };

  createInvoice = async (data: Record<string, any>) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/invoices`, data);
    return response.data;
  };

  updateInvoice = async (invoiceId: string, data: Record<string, any>) => {
    let response = await this.ax.put(
      `/workspaces/${this.workspaceId}/invoices/${invoiceId}`,
      data
    );
    return response.data;
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
    quantity?: number;
    totalAmount?: number;
    billable?: boolean;
    notes?: string;
    fileId?: string;
  }) => {
    let response = await this.ax.post(`/workspaces/${this.workspaceId}/expenses`, data);
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

  getTimeOffRequests = async (params?: {
    page?: number;
    'page-size'?: number;
    status?: string;
    userIds?: string;
    start?: string;
    end?: string;
  }) => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/time-off/requests`, {
      params
    });
    return response.data;
  };

  createTimeOffRequest = async (data: {
    policyId: string;
    start: string;
    end: string;
    note?: string;
    halfDay?: boolean;
  }) => {
    let response = await this.ax.post(
      `/workspaces/${this.workspaceId}/time-off/requests`,
      data
    );
    return response.data;
  };

  updateTimeOffRequestStatus = async (
    requestId: string,
    data: { status: string; note?: string }
  ) => {
    let response = await this.ax.patch(
      `/workspaces/${this.workspaceId}/time-off/requests/${requestId}`,
      data
    );
    return response.data;
  };

  getTimeOffPolicies = async () => {
    let response = await this.ax.get(`/workspaces/${this.workspaceId}/time-off/policies`);
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
