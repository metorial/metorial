import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { actionStatusId, issueStatusId, priorityId, userCollaborators } from './task-values';

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A SafetyCulture API token is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.safetyculture.io',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 70000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SafetyCulture',
          reason: 'safetyculture_api_error'
        })
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
    queryStr += '&field=modified_at&field=template_id';

    let response = await this.http.get(`/audits/search?${queryStr}`);
    return {
      inspections: response.data.audits || [],
      total: response.data.total
    };
  }

  async getInspection(inspectionId: string): Promise<any> {
    let response = await this.http.get(
      `/inspections/v1/inspections/${encodeURIComponent(inspectionId)}`
    );
    return response.data.inspection ?? response.data;
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

    let response = await this.http.post('/audits', body);
    if (options.siteId) {
      let inspectionId = response.data.audit_id || response.data.id;
      if (!inspectionId)
        throw createApiServiceError(
          'SafetyCulture did not return an inspection ID. The inspection may have been created; search inspections before retrying.'
        );
      try {
        await this.setInspectionSite(inspectionId, options.siteId);
      } catch (error) {
        let failure = buildApiServiceError(error, {
          providerLabel: 'SafetyCulture',
          reason: 'safetyculture_api_error'
        });
        failure.message =
          failure.data.message = `Inspection ${inspectionId} was created, but its site could not be assigned. Use manage_inspection with set_site on this ID; do not start another inspection. ${failure.message}`;
        throw failure;
      }
    }
    return response.data;
  }

  async completeInspection(inspectionId: string): Promise<any> {
    let response = await this.http.post(
      `/inspections/integration/v1/inspections/${encodeURIComponent(inspectionId)}/complete`,
      {}
    );
    return response.data;
  }

  async archiveInspection(inspectionId: string): Promise<any> {
    let response = await this.http.post(
      `/inspections/v1/inspections/${encodeURIComponent(inspectionId)}/archive`,
      {}
    );
    return response.data;
  }

  async deleteInspection(inspectionId: string): Promise<any> {
    let response = await this.http.delete(
      `/inspections/v1/inspections/${encodeURIComponent(inspectionId)}`
    );
    return response.data;
  }

  async getInspectionAnswers(inspectionId: string): Promise<any> {
    let response = await this.http.get(
      `/inspections/v1/answers/${encodeURIComponent(inspectionId)}`,
      { responseType: 'text' }
    );
    let text = String(response.data).trim();
    if (!text) return [];
    let entries: any[];
    try {
      try {
        entries = [JSON.parse(text)];
      } catch {
        entries = text
          .split(/\r?\n/)
          .filter(Boolean)
          .map(line => JSON.parse(line));
      }
    } catch (error) {
      throw createApiServiceError(
        'SafetyCulture returned an invalid inspection answer stream.',
        { parent: error }
      );
    }
    return entries.map(entry => {
      if (entry.error?.code)
        throw createApiServiceError(
          entry.error.message || 'SafetyCulture could not retrieve inspection answers.'
        );
      return entry.result ?? entry;
    });
  }

  async exportInspection(inspectionId: string, format: 'pdf' | 'word' = 'pdf'): Promise<any> {
    let response = await this.http.post('/inspection/v1/export', {
      export_data: [{ inspection_id: inspectionId }],
      type: format === 'word' ? 'DOCUMENT_TYPE_WORD' : 'DOCUMENT_TYPE_PDF'
    });
    return response.data;
  }

  async setInspectionOwner(inspectionId: string, ownerId: string): Promise<any> {
    let response = await this.http.put(
      `/inspections/v1/inspections/${encodeURIComponent(inspectionId)}/owner`,
      {
        owner_id: ownerId
      }
    );
    return response.data;
  }

  async setInspectionSite(inspectionId: string, siteId: string): Promise<any> {
    let response = await this.http.put(
      `/inspections/v1/inspections/${encodeURIComponent(inspectionId)}/site`,
      {
        site_id: siteId
      }
    );
    return response.data;
  }

  // ─── Templates ───

  async searchTemplates(params: { modifiedAfter?: string } = {}): Promise<any[]> {
    let queryStr = 'field=template_id&field=name&field=modified_at&field=created_at';
    if (params.modifiedAfter)
      queryStr += `&modified_after=${encodeURIComponent(params.modifiedAfter)}`;

    let response = await this.http.get(`/templates/search?${queryStr}`);
    return response.data.templates || response.data.template_list || [];
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.http.get(
      `/templates/v1/templates/${encodeURIComponent(templateId)}`
    );
    return response.data.template ?? response.data;
  }

  async getTemplateByInspection(inspectionId: string): Promise<any> {
    let response = await this.http.get(
      `/templates/v1/templates/inspections/${encodeURIComponent(inspectionId)}`
    );
    return response.data.template ?? response.data;
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
    let taskFilters: Record<string, unknown>[] = [];
    if (params.status?.length)
      taskFilters.push({
        status_id: { operator: 'FILTER_OPERATOR_IN', value: params.status.map(actionStatusId) }
      });
    if (params.priority?.length)
      taskFilters.push({
        priority_id: { operator: 'FILTER_OPERATOR_IN', value: params.priority.map(priorityId) }
      });
    if (params.assigneeIds?.length)
      taskFilters.push({
        collaborators: {
          operator: 'FILTER_OPERATOR_IN',
          value: userCollaborators(params.assigneeIds)
        }
      });
    if (params.searchValue !== undefined)
      taskFilters.push({ title: { term: params.searchValue } });
    let body = pickDefined({
      page_size: params.pageSize,
      page_token: params.pageToken,
      task_filters: taskFilters.length ? taskFilters : undefined
    });

    let response = await this.http.post('/tasks/v1/actions/list', body);
    return {
      actions: response.data.actions || [],
      nextPageToken: response.data.next_page_token || undefined
    };
  }

  async getAction(actionId: string): Promise<any> {
    let response = await this.http.get(`/tasks/v1/actions/${encodeURIComponent(actionId)}`);
    return response.data.action ?? response.data;
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
    if (data.assigneeIds) body.collaborators = userCollaborators(data.assigneeIds);
    if (data.dueAt) body.due_at = data.dueAt;
    if (data.priority) body.priority_id = priorityId(data.priority);
    if (data.siteId) body.site_id = data.siteId;
    if (data.inspectionId) body.inspection_id = data.inspectionId;
    if (data.inspectionItemId) body.inspection_item_id = data.inspectionItemId;
    if (data.labels) body.label_ids = data.labels;

    let response = await this.http.post('/tasks/v1/actions', body);
    return response.data;
  }

  async updateActionTitle(actionId: string, title: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/title`,
      { title }
    );
    return response.data;
  }

  async updateActionDescription(actionId: string, description: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/description`,
      {
        description
      }
    );
    return response.data;
  }

  async updateActionStatus(actionId: string, status: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/status`,
      {
        status_id: actionStatusId(status)
      }
    );
    return response.data;
  }

  async updateActionPriority(actionId: string, priority: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/priority`,
      {
        priority_id: priorityId(priority)
      }
    );
    return response.data;
  }

  async updateActionDueDate(actionId: string, dueAt: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/due_at`,
      {
        due_at: dueAt
      }
    );
    return response.data;
  }

  async updateActionAssignees(actionId: string, assigneeIds: string[]): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/assignees`,
      {
        assignees: userCollaborators(assigneeIds)
      }
    );
    return response.data;
  }

  async updateActionSite(actionId: string, siteId: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/actions/${encodeURIComponent(actionId)}/site`,
      {
        site_id: siteId
      }
    );
    return response.data;
  }

  async deleteActions(actionIds: string[]): Promise<any> {
    let response = await this.http.post('/tasks/v1/actions/delete', { ids: actionIds });
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
    let filters: Record<string, unknown>[] = [];
    if (params.status?.length)
      filters.push({ status_id: { operator: 'IN', value: params.status.map(issueStatusId) } });
    if (params.priority?.length)
      filters.push({
        priority_id: { operator: 'IN', value: params.priority.map(priorityId) }
      });
    if (params.categoryIds?.length)
      filters.push({ category_id: { operator: 'IN', value: params.categoryIds } });
    if (params.siteIds?.length)
      filters.push({ site_id: { operator: 'IN', value: params.siteIds } });
    let body = pickDefined({
      page_size: params.pageSize,
      page_token: params.pageToken,
      filters: filters.length ? filters : undefined
    });

    let response = await this.http.post('/tasks/v1/incidents/list', body);
    return {
      issues: response.data.incidents || response.data.issues || [],
      nextPageToken: response.data.next_page_token || undefined
    };
  }

  async getIssue(issueId: string): Promise<any> {
    let response = await this.http.get(`/tasks/v1/incident/${encodeURIComponent(issueId)}`);
    return response.data.incident ?? response.data;
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
    if (data.siteId) body.site_id = data.siteId;
    if (data.assetId) body.asset_id = data.assetId;
    if (data.occurredAt) body.occurred_at = data.occurredAt;

    let response = await this.http.post('/tasks/v1/incidents/submit', body);
    let issueId = response.data.incident_id || response.data.id;
    if (
      (data.priority !== undefined ||
        data.assigneeIds !== undefined ||
        data.dueAt !== undefined) &&
      !issueId
    ) {
      throw createApiServiceError(
        'SafetyCulture did not return an issue ID. The issue may have been created; list issues before retrying.'
      );
    }
    try {
      if (data.priority !== undefined) await this.updateIssuePriority(issueId, data.priority);
      if (data.assigneeIds?.length)
        await this.addIssueCollaborators(issueId, data.assigneeIds);
      if (data.dueAt !== undefined) await this.updateIssueDueDate(issueId, data.dueAt);
    } catch (error) {
      let failure = buildApiServiceError(error, {
        providerLabel: 'SafetyCulture',
        reason: 'safetyculture_api_error'
      });
      failure.message =
        failure.data.message = `Issue ${issueId} was created, but a follow-up update failed. Use update_issue on this ID to finish its configuration; do not create another issue. ${failure.message}`;
      throw failure;
    }
    return response.data;
  }

  async updateIssueTitle(issueId: string, title: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/title`,
      { title }
    );
    return response.data;
  }

  async updateIssueDescription(issueId: string, description: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/description`,
      {
        description
      }
    );
    return response.data;
  }

  async updateIssueStatus(issueId: string, status: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/status`,
      { status_id: issueStatusId(status) }
    );
    return response.data;
  }

  async updateIssuePriority(issueId: string, priority: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/priority`,
      {
        priority_id: priorityId(priority)
      }
    );
    return response.data;
  }

  async updateIssueDueDate(issueId: string, dueAt: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/due_at`,
      {
        due_at: dueAt
      }
    );
    return response.data;
  }

  async updateIssueCategory(issueId: string, categoryId: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/category`,
      {
        category_id: categoryId
      }
    );
    return response.data;
  }

  async updateIssueSite(issueId: string, siteId: string): Promise<any> {
    let response = await this.http.put(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/site`,
      {
        site_id: siteId
      }
    );
    return response.data;
  }

  async addIssueCollaborators(issueId: string, userIds: string[]): Promise<any> {
    let response = await this.http.post(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/collaborators/add`,
      {
        collaborators: userCollaborators(userIds)
      }
    );
    return response.data;
  }

  async removeIssueCollaborators(issueId: string, userIds: string[]): Promise<any> {
    let response = await this.http.post(
      `/tasks/v1/incidents/${encodeURIComponent(issueId)}/collaborators/remove`,
      { collaborators: userCollaborators(userIds) }
    );
    return response.data;
  }

  async deleteIssues(issueIds: string[]): Promise<any> {
    let response = await this.http.post('/tasks/v1/incidents/delete', {
      ids: issueIds
    });
    return response.data;
  }

  async getIssueTimeline(issueId: string): Promise<any> {
    let response = await this.http.post('/tasks/v1/timeline', { task_id: issueId });
    return response.data;
  }

  async addIssueComment(issueId: string, comment: string): Promise<any> {
    let response = await this.http.post('/tasks/v1/timeline/comments', {
      task_id: issueId,
      comment
    });
    return response.data;
  }

  // ─── Users ───

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async listGroupUsers(
    groupId: string,
    params: { limit?: number; offset?: number; status?: string[] } = {}
  ): Promise<{ users: any[]; total?: number; limit?: number; offset?: number }> {
    let query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    for (let status of params.status ?? []) query.append('status', status);
    let response = await this.http.get(
      `/groups/${encodeURIComponent(groupId)}/users?${query}`
    );
    return {
      users: response.data.users || [],
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset
    };
  }

  async listGroups(): Promise<any[]> {
    let response = await this.http.get('/groups');
    return response.data.groups || [];
  }

  async addUserToGroup(groupId: string, userId: string): Promise<any> {
    let response = await this.http.post(`/groups/${encodeURIComponent(groupId)}/users/v2`, {
      user_id: userId
    });
    return response.data;
  }

  async getConnections(): Promise<any[]> {
    let response = await this.http.get('/share/connections');
    return response.data.groups || [];
  }

  async listAssetTypes(
    params: { pageSize?: number; pageToken?: string; search?: string } = {}
  ): Promise<{ types: any[]; nextPageToken?: string }> {
    let response = await this.http.post(
      '/assets/v1/types/list',
      pickDefined({
        page_size: params.pageSize,
        page_token: params.pageToken,
        search: params.search
      })
    );
    return {
      types: response.data.type_list || response.data.types || [],
      nextPageToken: response.data.next_page_token || undefined
    };
  }

  async listAssetFields(): Promise<any[]> {
    let response = await this.http.post('/assets/v1/fields/list', {});
    return response.data.result || [];
  }

  // ─── Schedules ───

  async listSchedules(
    params: { pageSize?: number; pageToken?: string; templateId?: string } = {}
  ): Promise<{ schedules: any[]; nextPageToken?: string }> {
    let queryParams: string[] = [];
    if (params.pageSize) queryParams.push(`page_size=${params.pageSize}`);
    if (params.pageToken)
      queryParams.push(`page_token=${encodeURIComponent(params.pageToken)}`);

    let queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    let response = await this.http.get(`/schedules/v1/schedule_items${queryStr}`);
    return {
      schedules: (response.data.items || response.data.schedule_items || []).filter(
        (item: any) => !params.templateId || item.document?.id === params.templateId
      ),
      nextPageToken: response.data.next_page_token || undefined
    };
  }

  async createSchedule(data: {
    templateId: string;
    assigneeIds: string[];
    frequency: string;
    description?: string;
    mustComplete?: 'ONE' | 'ALL';
    canLateSubmit?: boolean;
    startTime?: string;
    startHour?: number;
    startMinute?: number;
    duration?: string;
    toDate?: string;
    siteId?: string;
  }): Promise<any> {
    if (!data.templateId.trim())
      throw createApiServiceError('templateId is required for create.');
    if (data.assigneeIds.length === 0 || data.assigneeIds.some(id => !id.trim()))
      throw createApiServiceError('assigneeIds must contain at least one nonempty user ID.');
    if (data.description !== undefined && !data.description.trim())
      throw createApiServiceError('description must not be empty when provided.');
    if (!data.startTime?.trim())
      throw createApiServiceError('startTime is required for create.');
    if (!data.duration?.trim())
      throw createApiServiceError('duration is required for create.');
    let frequency = data.frequency.trim();
    let recurrence = frequency.includes('=') ? frequency : `FREQ=${frequency.toUpperCase()}`;
    if (
      !/^(?:RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY|HOURLY|MINUTELY|SECONDLY)(?:;|$)/.test(
        recurrence
      )
    ) {
      throw createApiServiceError(
        'frequency must be an RRULE string such as FREQ=WEEKLY;BYDAY=MO;INTERVAL=1, or a frequency such as daily.'
      );
    }
    if (!z.iso.datetime({ offset: true }).safeParse(data.startTime).success)
      throw createApiServiceError('startTime must be a valid ISO 8601 date and time.');
    if (!z.iso.duration().safeParse(data.duration).success)
      throw createApiServiceError('duration must be an ISO 8601 duration, for example PT1H.');
    let start = new Date(data.startTime);
    if (data.toDate !== undefined) {
      if (!z.iso.datetime({ offset: true }).safeParse(data.toDate).success)
        throw createApiServiceError('toDate must be a valid ISO 8601 date and time.');
      if (new Date(data.toDate).getTime() <= start.getTime())
        throw createApiServiceError('toDate must be later than startTime.');
    }
    if (data.startHour === undefined || data.startMinute === undefined) {
      throw createApiServiceError(
        'startHour and startMinute are required for create, in the token owner profile timezone.'
      );
    }
    if (
      !Number.isInteger(data.startHour) ||
      data.startHour < 0 ||
      data.startHour > 23 ||
      !Number.isInteger(data.startMinute) ||
      data.startMinute < 0 ||
      data.startMinute > 59
    )
      throw createApiServiceError('startHour must be 0–23 and startMinute must be 0–59.');
    let body = pickDefined({
      document: { id: data.templateId, type: 'TEMPLATE' },
      assignees: data.assigneeIds.map(id => ({ id, type: 'USER' })),
      description: data.description ?? 'Scheduled inspection',
      must_complete: data.mustComplete ?? 'ONE',
      can_late_submit: data.canLateSubmit ?? false,
      recurrence,
      location_id: data.siteId,
      from_date: start.toISOString(),
      start_time: { hour: data.startHour, minute: data.startMinute },
      duration: data.duration,
      to_date: data.toDate
    });

    let response = await this.http.post('/schedules/v1/schedule_items', body);
    return response.data;
  }

  async deleteSchedule(scheduleId: string): Promise<any> {
    let response = await this.http.delete(
      `/schedules/v1/schedule_items/${encodeURIComponent(scheduleId)}`
    );
    return response.data;
  }

  // ─── Assets ───

  async listAssets(
    params: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ assets: any[]; nextPageToken?: string }> {
    let response = await this.http.post(
      '/assets/v1/assets/list',
      pickDefined({
        page_size: params.pageSize,
        page_token: params.pageToken
      })
    );
    return {
      assets: response.data.assets || [],
      nextPageToken: response.data.next_page_token || undefined
    };
  }

  async getAsset(assetId: string): Promise<any> {
    let response = await this.http.get(`/assets/v1/assets/${encodeURIComponent(assetId)}`);
    return response.data.asset ?? response.data;
  }

  async createAsset(data: {
    typeId: string;
    code?: string;
    fields?: Record<string, any>;
    siteId?: string;
  }): Promise<any> {
    if (!data.typeId.trim()) throw createApiServiceError('typeId is required for create.');
    if (!data.code?.trim())
      throw createApiServiceError(
        'code is required for create and must be unique within the organization.'
      );
    let body: Record<string, any> = {
      type_id: data.typeId,
      code: data.code
    };
    if (data.fields)
      body.fields = Object.entries(data.fields).map(([field_id, value]) => {
        if (typeof value === 'string') return { field_id, string_value: value };
        if (value && typeof value === 'object' && !Array.isArray(value))
          return { ...value, field_id };
        throw createApiServiceError(
          `Asset field ${field_id} must be a string or an object containing string_value, timestamp_value, or money_value. Call list_asset_types with includeFields to discover fields.`
        );
      });
    if (data.siteId) body.site = data.siteId;

    let response = await this.http.post('/assets/v1/assets', body);
    return response.data;
  }

  async archiveAsset(assetId: string): Promise<any> {
    let response = await this.http.patch(
      `/assets/v1/assets/${encodeURIComponent(assetId)}/archive`,
      {}
    );
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
    let response = await this.http.get(`/feed/${encodeURIComponent(feedType)}${queryStr}`);
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
    let response = await this.http.get(
      `/webhooks/v1/webhooks/${encodeURIComponent(webhookId)}`
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(
      `/webhooks/v1/webhooks/${encodeURIComponent(webhookId)}`
    );
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
    let queryParams: string[] = ['domain=site', 'only_leaf_nodes=true'];
    queryParams.push(`page_size=${params.pageSize ?? 100}`);
    if (params.pageToken)
      queryParams.push(`page_token=${encodeURIComponent(params.pageToken)}`);

    let queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    let response = await this.http.get(`/directory/v1/folders${queryStr}`);
    return {
      sites: response.data.folders || [],
      nextPageToken: response.data.next_page_token || undefined
    };
  }
}
