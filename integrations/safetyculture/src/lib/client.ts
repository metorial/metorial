import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.safetyculture.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Inspections ───

  async searchInspections(
    params: {
      modifiedAfter?: string;
      templateId?: string[];
      archived?: string;
      completed?: string;
      limit?: number;
    } = {}
  ): Promise<{ inspections: any[]; total?: number }> {
    let queryParams: Record<string, string> = {};
    if (params.modifiedAfter) queryParams.modified_after = params.modifiedAfter;
    if (params.archived) queryParams.archived = params.archived;
    if (params.completed) queryParams.completed = params.completed;
    if (params.limit) queryParams.limit = String(params.limit);

    queryParams.field = 'audit_id';

    let queryStr = new URLSearchParams(queryParams).toString();
    if (params.templateId && params.templateId.length > 0) {
      for (let tid of params.templateId) {
        queryStr += `&template=${encodeURIComponent(tid)}`;
      }
    }
    // Add additional fields
    queryStr += '&field=modified_at&field=template_id&field=created_at&field=audit_title';

    let response = await this.http.get(`/audits/search?${queryStr}`);
    return {
      inspections: response.data.audits || [],
      total: response.data.total
    };
  }

  async getInspection(inspectionId: string): Promise<any> {
    let response = await this.http.get(`/inspections/v1/inspections/${inspectionId}`);
    return response.data;
  }

  async startInspection(
    templateId: string,
    options: {
      headerItems?: any[];
      siteId?: string;
    } = {}
  ): Promise<any> {
    let body: Record<string, any> = {
      template_id: templateId
    };
    if (options.headerItems) body.header_items = options.headerItems;
    if (options.siteId) body.site_id = options.siteId;

    let response = await this.http.post('/audits', body);
    return response.data;
  }

  async completeInspection(inspectionId: string): Promise<any> {
    let response = await this.http.post(
      `/inspections/v1/inspections/${inspectionId}/complete`
    );
    return response.data;
  }

  async archiveInspection(inspectionId: string): Promise<any> {
    let response = await this.http.post(`/inspections/v1/inspections/${inspectionId}/archive`);
    return response.data;
  }

  async deleteInspection(inspectionId: string): Promise<any> {
    let response = await this.http.delete(`/inspections/v1/inspections/${inspectionId}`);
    return response.data;
  }

  async getInspectionAnswers(inspectionId: string): Promise<any> {
    let response = await this.http.get(`/inspections/v1/inspections/${inspectionId}/answers`);
    return response.data;
  }

  async exportInspection(inspectionId: string, format: 'pdf' | 'word' = 'pdf'): Promise<any> {
    let response = await this.http.post(`/inspections/v1/inspections/${inspectionId}/export`, {
      format
    });
    return response.data;
  }

  async setInspectionOwner(inspectionId: string, ownerId: string): Promise<any> {
    let response = await this.http.put(`/inspections/v1/inspections/${inspectionId}/owner`, {
      owner_id: ownerId
    });
    return response.data;
  }

  async setInspectionSite(inspectionId: string, siteId: string): Promise<any> {
    let response = await this.http.put(`/inspections/v1/inspections/${inspectionId}/site`, {
      site_id: siteId
    });
    return response.data;
  }

  // ─── Templates ───

  async searchTemplates(params: { modifiedAfter?: string } = {}): Promise<any[]> {
    let queryStr = 'field=template_id&field=name&field=modified_at&field=description';
    if (params.modifiedAfter)
      queryStr += `&modified_after=${encodeURIComponent(params.modifiedAfter)}`;

    let response = await this.http.get(`/templates/search?${queryStr}`);
    return response.data.templates || response.data.template_list || [];
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.http.get(`/templates/v1/templates/${templateId}`);
    return response.data;
  }

  async getTemplateByInspection(inspectionId: string): Promise<any> {
    let response = await this.http.get(`/templates/v1/templates/inspections/${inspectionId}`);
    return response.data;
  }

  // ─── Actions ───

  async listActions(
    params: {
      pageSize?: number;
      pageToken?: string;
      status?: string[];
      priority?: string[];
      assigneeIds?: string[];
      searchValue?: string;
    } = {}
  ): Promise<{ actions: any[]; nextPageToken?: string }> {
    let body: Record<string, any> = {};
    if (params.pageSize) body.page_size = params.pageSize;
    if (params.pageToken) body.page_token = params.pageToken;
    if (params.searchValue) body.search_value = params.searchValue;

    let taskFilters: Record<string, any> = {};
    if (params.status) taskFilters.status = params.status;
    if (params.priority) taskFilters.priority = params.priority;
    if (params.assigneeIds) taskFilters.user_ids = params.assigneeIds;
    if (Object.keys(taskFilters).length > 0) body.task_filters = taskFilters;

    let response = await this.http.post('/tasks/v1/actions/list', body);
    return {
      actions: response.data.actions || [],
      nextPageToken: response.data.next_page_token
    };
  }

  async getAction(actionId: string): Promise<any> {
    let response = await this.http.get(`/tasks/v1/actions/${actionId}`);
    return response.data;
  }

  async createAction(data: {
    title: string;
    description?: string;
    assigneeIds?: string[];
    dueAt?: string;
    priority?: string;
    siteId?: string;
    inspectionId?: string;
    inspectionItemId?: string;
    labels?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {
      title: data.title
    };
    if (data.description) body.description = data.description;
    if (data.assigneeIds) body.assignee_ids = data.assigneeIds;
    if (data.dueAt) body.due_at = data.dueAt;
    if (data.priority) body.priority = data.priority;
    if (data.siteId) body.site_id = data.siteId;
    if (data.inspectionId) body.inspection_id = data.inspectionId;
    if (data.inspectionItemId) body.inspection_item_id = data.inspectionItemId;
    if (data.labels) body.label_ids = data.labels;

    let response = await this.http.post('/tasks/v1/actions', body);
    return response.data;
  }

  async updateActionTitle(actionId: string, title: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/title`, { title });
    return response.data;
  }

  async updateActionDescription(actionId: string, description: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/description`, {
      description
    });
    return response.data;
  }

  async updateActionStatus(actionId: string, status: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/status`, {
      status_id: status
    });
    return response.data;
  }

  async updateActionPriority(actionId: string, priority: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/priority`, {
      priority_id: priority
    });
    return response.data;
  }

  async updateActionDueDate(actionId: string, dueAt: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/due_at`, {
      due_at: dueAt
    });
    return response.data;
  }

  async updateActionAssignees(actionId: string, assigneeIds: string[]): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/assignees`, {
      assignee_ids: assigneeIds
    });
    return response.data;
  }

  async updateActionSite(actionId: string, siteId: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/actions/${actionId}/site`, {
      site_id: siteId
    });
    return response.data;
  }

  async deleteActions(actionIds: string[]): Promise<any> {
    let response = await this.http.post('/tasks/v1/actions/delete', { action_ids: actionIds });
    return response.data;
  }

  // ─── Issues ───

  async listIssues(
    params: {
      pageSize?: number;
      pageToken?: string;
      status?: string[];
      priority?: string[];
      categoryIds?: string[];
      siteIds?: string[];
    } = {}
  ): Promise<{ issues: any[]; nextPageToken?: string }> {
    let body: Record<string, any> = {};
    if (params.pageSize) body.page_size = params.pageSize;
    if (params.pageToken) body.page_token = params.pageToken;

    let filters: Record<string, any> = {};
    if (params.status) filters.status = params.status;
    if (params.priority) filters.priority = params.priority;
    if (params.categoryIds) filters.category_ids = params.categoryIds;
    if (params.siteIds) filters.site_ids = params.siteIds;
    if (Object.keys(filters).length > 0) body.filters = filters;

    let response = await this.http.post('/tasks/v1/incidents/list', body);
    return {
      issues: response.data.incidents || response.data.issues || [],
      nextPageToken: response.data.next_page_token
    };
  }

  async getIssue(issueId: string): Promise<any> {
    let response = await this.http.get(`/tasks/v1/incidents/${issueId}`);
    return response.data;
  }

  async createIssue(data: {
    title: string;
    description?: string;
    categoryId?: string;
    priority?: string;
    assigneeIds?: string[];
    dueAt?: string;
    siteId?: string;
    assetId?: string;
    occurredAt?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      title: data.title
    };
    if (data.description) body.description = data.description;
    if (data.categoryId) body.category_id = data.categoryId;
    if (data.priority) body.priority = data.priority;
    if (data.assigneeIds) body.collaborator_ids = data.assigneeIds;
    if (data.dueAt) body.due_at = data.dueAt;
    if (data.siteId) body.site_id = data.siteId;
    if (data.assetId) body.asset_id = data.assetId;
    if (data.occurredAt) body.occurred_at = data.occurredAt;

    let response = await this.http.post('/tasks/v1/incidents/submit', body);
    return response.data;
  }

  async updateIssueTitle(issueId: string, title: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/title`, { title });
    return response.data;
  }

  async updateIssueDescription(issueId: string, description: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/description`, {
      description
    });
    return response.data;
  }

  async updateIssueStatus(issueId: string, status: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/status`, { status });
    return response.data;
  }

  async updateIssuePriority(issueId: string, priority: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/priority`, {
      priority
    });
    return response.data;
  }

  async updateIssueDueDate(issueId: string, dueAt: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/due_at`, {
      due_at: dueAt
    });
    return response.data;
  }

  async updateIssueCategory(issueId: string, categoryId: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/category`, {
      category_id: categoryId
    });
    return response.data;
  }

  async updateIssueSite(issueId: string, siteId: string): Promise<any> {
    let response = await this.http.put(`/tasks/v1/incidents/${issueId}/site`, {
      site_id: siteId
    });
    return response.data;
  }

  async addIssueCollaborators(issueId: string, userIds: string[]): Promise<any> {
    let response = await this.http.post(`/tasks/v1/incidents/${issueId}/collaborators/add`, {
      user_ids: userIds
    });
    return response.data;
  }

  async removeIssueCollaborators(issueId: string, userIds: string[]): Promise<any> {
    let response = await this.http.post(
      `/tasks/v1/incidents/${issueId}/collaborators/remove`,
      { user_ids: userIds }
    );
    return response.data;
  }

  async deleteIssues(issueIds: string[]): Promise<any> {
    let response = await this.http.post('/tasks/v1/incidents/delete', {
      incident_ids: issueIds
    });
    return response.data;
  }

  async getIssueTimeline(issueId: string): Promise<any> {
    let response = await this.http.post(`/tasks/v1/incidents/${issueId}/timeline`, {});
    return response.data;
  }

  async addIssueComment(issueId: string, comment: string): Promise<any> {
    let response = await this.http.post(`/tasks/v1/incidents/${issueId}/timeline/comment`, {
      comment
    });
    return response.data;
  }

  // ─── Users ───

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    let response = await this.http.get('/users/v1/users/me');
    return response.data;
  }

  async listGroupUsers(groupId: string): Promise<any[]> {
    let response = await this.http.get(`/groups/${groupId}/users`);
    return response.data.users || [];
  }

  async listGroups(): Promise<any[]> {
    let response = await this.http.get('/groups');
    return response.data.groups || [];
  }

  async addUserToGroup(groupId: string, userId: string): Promise<any> {
    let response = await this.http.post(`/groups/${groupId}/users/v2`, { user_id: userId });
    return response.data;
  }

  // ─── Schedules ───

  async listSchedules(
    params: { pageSize?: number; pageToken?: string; templateId?: string } = {}
  ): Promise<{ schedules: any[]; nextPageToken?: string }> {
    let queryParams: string[] = [];
    if (params.pageSize) queryParams.push(`page_size=${params.pageSize}`);
    if (params.pageToken)
      queryParams.push(`page_token=${encodeURIComponent(params.pageToken)}`);
    if (params.templateId)
      queryParams.push(`template_id=${encodeURIComponent(params.templateId)}`);

    let queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    let response = await this.http.get(`/schedules/v1/schedule-items${queryStr}`);
    return {
      schedules: response.data.schedule_items || [],
      nextPageToken: response.data.next_page_token
    };
  }

  async createSchedule(data: {
    templateId: string;
    assigneeIds: string[];
    frequency: string;
    startTime?: string;
    siteId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      template_id: data.templateId,
      assignee_ids: data.assigneeIds,
      frequency: data.frequency
    };
    if (data.startTime) body.start_time = data.startTime;
    if (data.siteId) body.site_id = data.siteId;

    let response = await this.http.post('/schedules/v1/schedule-items', body);
    return response.data;
  }

  async deleteSchedule(scheduleId: string): Promise<any> {
    let response = await this.http.delete(`/schedules/v1/schedule-items/${scheduleId}`);
    return response.data;
  }

  // ─── Assets ───

  async listAssets(
    params: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ assets: any[]; nextPageToken?: string }> {
    let queryParams: string[] = [];
    if (params.pageSize) queryParams.push(`page_size=${params.pageSize}`);
    if (params.pageToken)
      queryParams.push(`page_token=${encodeURIComponent(params.pageToken)}`);

    let queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    let response = await this.http.get(`/assets/v1/assets${queryStr}`);
    return {
      assets: response.data.assets || [],
      nextPageToken: response.data.next_page_token
    };
  }

  async getAsset(assetId: string): Promise<any> {
    let response = await this.http.get(`/assets/v1/assets/${assetId}`);
    return response.data;
  }

  async createAsset(data: {
    typeId: string;
    code?: string;
    fields?: Record<string, any>;
    siteId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      type_id: data.typeId
    };
    if (data.code) body.code = data.code;
    if (data.fields) body.fields = data.fields;
    if (data.siteId) body.site_id = data.siteId;

    let response = await this.http.post('/assets/v1/assets', body);
    return response.data;
  }

  async archiveAsset(assetId: string): Promise<any> {
    let response = await this.http.post(`/assets/v1/assets/${assetId}/archive`);
    return response.data;
  }

  // ─── Data Feeds ───

  async getDataFeed(
    feedType: string,
    params: {
      afterToken?: string;
    } = {}
  ): Promise<{ data: any[]; nextToken?: string }> {
    let queryStr = params.afterToken ? `?after=${encodeURIComponent(params.afterToken)}` : '';
    let response = await this.http.get(`/feed/${feedType}${queryStr}`);
    return {
      data: response.data.data || [],
      nextToken: response.data.metadata?.next_page
    };
  }

  // ─── Webhooks ───

  async createWebhook(data: { url: string; triggerEvents: string[] }): Promise<any> {
    let response = await this.http.post('/webhooks/v1/webhooks', {
      url: data.url,
      trigger_events: data.triggerEvents
    });
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/webhooks/v1/webhooks/${webhookId}`);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/webhooks/v1/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhooks(): Promise<any[]> {
    let response = await this.http.get('/webhooks/v1/webhooks');
    return response.data.webhooks || [];
  }

  // ─── Issue Categories ───

  async getIssueCategories(): Promise<any[]> {
    let response = await this.http.get('/tasks/v1/configuration/categories');
    return response.data.categories || [];
  }

  // ─── Sites / Directory ───

  async listSites(
    params: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ sites: any[]; nextPageToken?: string }> {
    let queryParams: string[] = [];
    if (params.pageSize) queryParams.push(`page_size=${params.pageSize}`);
    if (params.pageToken)
      queryParams.push(`page_token=${encodeURIComponent(params.pageToken)}`);

    let queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    let response = await this.http.get(`/directory/v1/folders${queryStr}`);
    return {
      sites: response.data.folders || [],
      nextPageToken: response.data.next_page_token
    };
  }
}
