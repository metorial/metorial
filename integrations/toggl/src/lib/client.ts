import { createAxios } from 'slates';

export class TogglClient {
  private http: ReturnType<typeof createAxios>;
  private authHeader: string;

  constructor(token: string) {
    this.authHeader = `Basic ${btoa(`${token}:api_token`)}`;
    this.http = createAxios({
      baseURL: 'https://api.track.toggl.com/api/v9',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  private createReportsHttp() {
    return createAxios({
      baseURL: 'https://api.track.toggl.com/reports/api/v3',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Me ──────────────────────────────────────────────────────────

  async getMe(withRelatedData?: boolean) {
    let response = await this.http.get('/me', {
      params: withRelatedData ? { with_related_data: 'true' } : undefined
    });
    return response.data;
  }

  async getMyTimeEntries(
    params: { startDate?: string; endDate?: string; meta?: boolean } = {}
  ) {
    let response = await this.http.get('/me/time_entries', {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        meta: params.meta
      }
    });
    return response.data;
  }

  // ─── Time Entries ────────────────────────────────────────────────

  async getTimeEntry(workspaceId: string, timeEntryId: string) {
    let response = await this.http.get(
      `/workspaces/${workspaceId}/time_entries/${timeEntryId}`
    );
    return response.data;
  }

  async createTimeEntry(
    workspaceId: string,
    data: {
      description?: string;
      start: string;
      duration: number;
      projectId?: number;
      taskId?: number;
      tagIds?: number[];
      tags?: string[];
      billable?: boolean;
      createdWith: string;
      stop?: string;
      userId?: number;
    }
  ) {
    let body: Record<string, any> = {
      description: data.description,
      start: data.start,
      duration: data.duration,
      created_with: data.createdWith,
      workspace_id: Number.parseInt(workspaceId, 10)
    };
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.taskId !== undefined) body.task_id = data.taskId;
    if (data.tagIds !== undefined) body.tag_ids = data.tagIds;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.billable !== undefined) body.billable = data.billable;
    if (data.stop !== undefined) body.stop = data.stop;
    if (data.userId !== undefined) body.user_id = data.userId;

    let response = await this.http.post(`/workspaces/${workspaceId}/time_entries`, body);
    return response.data;
  }

  async updateTimeEntry(
    workspaceId: string,
    timeEntryId: string,
    data: {
      description?: string;
      start?: string;
      stop?: string;
      duration?: number;
      projectId?: number | null;
      taskId?: number | null;
      tagIds?: number[];
      tags?: string[];
      billable?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.start !== undefined) body.start = data.start;
    if (data.stop !== undefined) body.stop = data.stop;
    if (data.duration !== undefined) body.duration = data.duration;
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.taskId !== undefined) body.task_id = data.taskId;
    if (data.tagIds !== undefined) body.tag_ids = data.tagIds;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.billable !== undefined) body.billable = data.billable;

    let response = await this.http.put(
      `/workspaces/${workspaceId}/time_entries/${timeEntryId}`,
      body
    );
    return response.data;
  }

  async deleteTimeEntry(workspaceId: string, timeEntryId: string) {
    await this.http.delete(`/workspaces/${workspaceId}/time_entries/${timeEntryId}`);
  }

  async stopTimeEntry(workspaceId: string, timeEntryId: string) {
    let response = await this.http.patch(
      `/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`
    );
    return response.data;
  }

  async getCurrentTimeEntry() {
    let response = await this.http.get('/me/time_entries/current');
    return response.data;
  }

  // ─── Projects ────────────────────────────────────────────────────

  async listProjects(
    workspaceId: string,
    params: {
      active?: boolean;
      since?: number;
      name?: string;
      page?: number;
      perPage?: number;
      sortField?: string;
      sortOrder?: string;
    } = {}
  ) {
    let response = await this.http.get(`/workspaces/${workspaceId}/projects`, {
      params: {
        active: params.active,
        since: params.since,
        name: params.name,
        page: params.page,
        per_page: params.perPage,
        sort_field: params.sortField,
        sort_order: params.sortOrder
      }
    });
    return response.data;
  }

  async getProject(workspaceId: string, projectId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}/projects/${projectId}`);
    return response.data;
  }

  async createProject(
    workspaceId: string,
    data: {
      name: string;
      clientId?: number;
      isPrivate?: boolean;
      active?: boolean;
      color?: string;
      billable?: boolean;
      autoEstimates?: boolean;
      estimatedHours?: number;
      rate?: number;
      currency?: string;
    }
  ) {
    let body: Record<string, any> = {
      name: data.name,
      active: data.active ?? true
    };
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.isPrivate !== undefined) body.is_private = data.isPrivate;
    if (data.color !== undefined) body.color = data.color;
    if (data.billable !== undefined) body.billable = data.billable;
    if (data.autoEstimates !== undefined) body.auto_estimates = data.autoEstimates;
    if (data.estimatedHours !== undefined) body.estimated_hours = data.estimatedHours;
    if (data.rate !== undefined) body.rate = data.rate;
    if (data.currency !== undefined) body.currency = data.currency;

    let response = await this.http.post(`/workspaces/${workspaceId}/projects`, body);
    return response.data;
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    data: {
      name?: string;
      clientId?: number | null;
      isPrivate?: boolean;
      active?: boolean;
      color?: string;
      billable?: boolean;
      autoEstimates?: boolean;
      estimatedHours?: number;
      rate?: number;
      currency?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.isPrivate !== undefined) body.is_private = data.isPrivate;
    if (data.active !== undefined) body.active = data.active;
    if (data.color !== undefined) body.color = data.color;
    if (data.billable !== undefined) body.billable = data.billable;
    if (data.autoEstimates !== undefined) body.auto_estimates = data.autoEstimates;
    if (data.estimatedHours !== undefined) body.estimated_hours = data.estimatedHours;
    if (data.rate !== undefined) body.rate = data.rate;
    if (data.currency !== undefined) body.currency = data.currency;

    let response = await this.http.put(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      body
    );
    return response.data;
  }

  async deleteProject(workspaceId: string, projectId: string) {
    await this.http.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  // ─── Clients ─────────────────────────────────────────────────────

  async listClients(
    workspaceId: string,
    params: {
      status?: string;
      name?: string;
    } = {}
  ) {
    let response = await this.http.get(`/workspaces/${workspaceId}/clients`, {
      params
    });
    return response.data;
  }

  async getClient(workspaceId: string, clientId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}/clients/${clientId}`);
    return response.data;
  }

  async createClient(
    workspaceId: string,
    data: {
      name: string;
      notes?: string;
    }
  ) {
    let response = await this.http.post(`/workspaces/${workspaceId}/clients`, data);
    return response.data;
  }

  async updateClient(
    workspaceId: string,
    clientId: string,
    data: {
      name?: string;
      notes?: string;
    }
  ) {
    let response = await this.http.put(`/workspaces/${workspaceId}/clients/${clientId}`, data);
    return response.data;
  }

  async deleteClient(workspaceId: string, clientId: string) {
    await this.http.delete(`/workspaces/${workspaceId}/clients/${clientId}`);
  }

  // ─── Tags ────────────────────────────────────────────────────────

  async listTags(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}/tags`);
    return response.data;
  }

  async createTag(workspaceId: string, data: { name: string }) {
    let response = await this.http.post(`/workspaces/${workspaceId}/tags`, data);
    return response.data;
  }

  async updateTag(workspaceId: string, tagId: string, data: { name: string }) {
    let response = await this.http.put(`/workspaces/${workspaceId}/tags/${tagId}`, data);
    return response.data;
  }

  async deleteTag(workspaceId: string, tagId: string) {
    await this.http.delete(`/workspaces/${workspaceId}/tags/${tagId}`);
  }

  // ─── Tasks ───────────────────────────────────────────────────────

  async listTasks(workspaceId: string, projectId: string) {
    let response = await this.http.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`
    );
    return response.data;
  }

  async getTask(workspaceId: string, projectId: string, taskId: string) {
    let response = await this.http.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`
    );
    return response.data;
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    data: {
      name: string;
      active?: boolean;
      estimatedSeconds?: number;
      userId?: number;
    }
  ) {
    let body: Record<string, any> = {
      name: data.name
    };
    if (data.active !== undefined) body.active = data.active;
    if (data.estimatedSeconds !== undefined) body.estimated_seconds = data.estimatedSeconds;
    if (data.userId !== undefined) body.user_id = data.userId;

    let response = await this.http.post(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      body
    );
    return response.data;
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    data: {
      name?: string;
      active?: boolean;
      estimatedSeconds?: number;
      userId?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.active !== undefined) body.active = data.active;
    if (data.estimatedSeconds !== undefined) body.estimated_seconds = data.estimatedSeconds;
    if (data.userId !== undefined) body.user_id = data.userId;

    let response = await this.http.put(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      body
    );
    return response.data;
  }

  async deleteTask(workspaceId: string, projectId: string, taskId: string) {
    await this.http.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
  }

  // ─── Workspaces ──────────────────────────────────────────────────

  async listWorkspaces() {
    let response = await this.http.get('/workspaces');
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    data: {
      name?: string;
      defaultCurrency?: string;
      defaultHourlyRate?: number;
      rounding?: number;
      roundingMinutes?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.defaultCurrency !== undefined) body.default_currency = data.defaultCurrency;
    if (data.defaultHourlyRate !== undefined)
      body.default_hourly_rate = data.defaultHourlyRate;
    if (data.rounding !== undefined) body.rounding = data.rounding;
    if (data.roundingMinutes !== undefined) body.rounding_minutes = data.roundingMinutes;

    let response = await this.http.put(`/workspaces/${workspaceId}`, body);
    return response.data;
  }

  // ─── Workspace Users ─────────────────────────────────────────────

  async listWorkspaceUsers(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}/workspace_users`);
    return response.data;
  }

  // ─── Organizations ───────────────────────────────────────────────

  async listOrganizations() {
    let response = await this.http.get('/me/organizations');
    return response.data;
  }

  async getOrganization(organizationId: string) {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  // ─── Reports ─────────────────────────────────────────────────────

  async getSummaryReport(
    workspaceId: string,
    data: {
      startDate: string;
      endDate: string;
      grouping?: string;
      subGrouping?: string;
      projectIds?: number[];
      clientIds?: number[];
      tagIds?: number[];
      userIds?: number[];
      billable?: boolean;
    }
  ) {
    let reportsHttp = this.createReportsHttp();

    let body: Record<string, any> = {
      start_date: data.startDate,
      end_date: data.endDate
    };
    if (data.grouping) body.grouping = data.grouping;
    if (data.subGrouping) body.sub_grouping = data.subGrouping;
    if (data.projectIds) body.project_ids = data.projectIds;
    if (data.clientIds) body.client_ids = data.clientIds;
    if (data.tagIds) body.tag_ids = data.tagIds;
    if (data.userIds) body.user_ids = data.userIds;
    if (data.billable !== undefined) body.billable = data.billable;

    let response = await reportsHttp.post(
      `/workspace/${workspaceId}/summary/time_entries`,
      body
    );
    return response.data;
  }

  async getDetailedReport(
    workspaceId: string,
    data: {
      startDate: string;
      endDate: string;
      projectIds?: number[];
      clientIds?: number[];
      tagIds?: number[];
      userIds?: number[];
      billable?: boolean;
      firstRowNumber?: number;
      pageSize?: number;
    }
  ) {
    let reportsHttp = this.createReportsHttp();

    let body: Record<string, any> = {
      start_date: data.startDate,
      end_date: data.endDate
    };
    if (data.projectIds) body.project_ids = data.projectIds;
    if (data.clientIds) body.client_ids = data.clientIds;
    if (data.tagIds) body.tag_ids = data.tagIds;
    if (data.userIds) body.user_ids = data.userIds;
    if (data.billable !== undefined) body.billable = data.billable;
    if (data.firstRowNumber !== undefined) body.first_row_number = data.firstRowNumber;
    if (data.pageSize !== undefined) body.page_size = data.pageSize;

    let response = await reportsHttp.post(
      `/workspace/${workspaceId}/search/time_entries`,
      body
    );
    return response.data;
  }
}
