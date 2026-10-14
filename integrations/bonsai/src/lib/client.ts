import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorResponse,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type {
  BonsaiClient,
  BonsaiDeal,
  BonsaiProject,
  BonsaiTask,
  BonsaiTaskStatus,
  BonsaiTaskTemplate,
  BonsaiTeamMember
} from './types';

type RecordData = Record<string, unknown>;

let asRecord = (value: unknown, resource: string): RecordData => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Bonsai returned an invalid ${resource} response.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

let text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

let identifier = (value: unknown, resource: string): string => {
  if ((typeof value === 'string' && value) || typeof value === 'number') {
    return String(value);
  }
  throw createApiServiceError(`Bonsai returned a ${resource} without an identifier.`, {
    reason: 'invalid_response'
  });
};

let optionalIdentifier = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : identifier(value, 'record');

let numeric = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

let numericId = (value: string): number => {
  let id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw createApiServiceError(
      'The project ID must be a positive numeric ID from list_projects.'
    );
  }
  return id;
};

// The SDK consumes AxiosError before this adapter runs and truncates deeply
// nested response data. The raw Axios hook retains a flat validation message.
let bonsaiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Bonsai',
    reason: 'bonsai_api_error',
    nestedKeys: ['error', 'details', 'errors'],
    extractMessage: value => {
      let data =
        isApiErrorRecord(value) && isApiErrorRecord(value.data) ? value.data : undefined;
      let baggage = isApiErrorRecord(data?.baggage) ? data.baggage : undefined;
      return text(baggage?.bonsaiErrorMessage);
    },
    extractResponse: value => {
      let raw = getApiErrorResponse(value);
      if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) return raw;
      let data = value.data;
      let upstream = isApiErrorRecord(data.upstream) ? data.upstream : undefined;
      let baggage = isApiErrorRecord(data.baggage) ? data.baggage : undefined;
      let status = upstream?.status ?? raw?.status ?? data.status;
      return {
        ...raw,
        status: typeof status === 'number' || typeof status === 'string' ? status : undefined,
        data: baggage?.response ?? raw?.data
      };
    },
    extractUpstreamCode: (value, response) => {
      let body = isApiErrorRecord(response?.data) ? response.data : undefined;
      let detail = isApiErrorRecord(body?.error) ? body.error : body;
      let data =
        isApiErrorRecord(value) && isApiErrorRecord(value.data) ? value.data : undefined;
      let upstream = isApiErrorRecord(data?.upstream) ? data.upstream : undefined;
      return (
        text(detail?.type) ??
        text(detail?.code) ??
        text(upstream?.type) ??
        text(upstream?.code)
      );
    }
  });

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.hellobonsai.com',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let message = extractApiErrorMessage(error, {
            nestedKeys: ['error', 'details', 'errors']
          });
          return {
            message,
            baggage: { ...inferred.baggage, bonsaiErrorMessage: message }
          };
        }
      },
      errorAdapter: bonsaiError
    });
  }

  private record(data: unknown, key: string): RecordData {
    let envelope = asRecord(data, key);
    return asRecord(envelope.data ?? envelope[key] ?? envelope, key);
  }

  private async listRecords(
    path: string,
    keys: string[],
    filters: Record<string, string> = {}
  ): Promise<RecordData[]> {
    let records: RecordData[] = [];
    let page = 1;
    let publicApi = path.startsWith('/public-api/');
    while (true) {
      let response = await this.axios.get(path, {
        params: {
          ...filters,
          ...(publicApi || page > 1 ? { 'page[number]': page, 'page[size]': 100 } : {})
        }
      });
      let envelope = Array.isArray(response.data)
        ? undefined
        : asRecord(response.data, 'list');
      let values =
        envelope?.data ??
        keys.map(key => envelope?.[key]).find(Array.isArray) ??
        response.data;
      if (!Array.isArray(values)) {
        throw createApiServiceError('Bonsai returned an invalid list response.', {
          reason: 'invalid_response'
        });
      }
      records.push(...values.map(value => asRecord(value, 'record')));
      let meta = isApiErrorRecord(envelope?.meta) ? envelope.meta : undefined;
      let pagination = isApiErrorRecord(meta?.pagination) ? meta.pagination : undefined;
      if (pagination?.has_more !== true) return records;
      if (values.length === 0) {
        throw createApiServiceError(
          'Bonsai returned an empty page with more records indicated.',
          {
            reason: 'invalid_response'
          }
        );
      }
      page += 1;
    }
  }

  async createClient(params: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    website?: string;
    phone?: string;
    jobTitle?: string;
    notes?: string;
  }): Promise<BonsaiClient> {
    let body = pickDefined({
      name: params.name,
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      company_name: params.companyName,
      website: params.website,
      phone: params.phone,
      job_title: params.jobTitle,
      notes: params.notes
    });
    let response = await this.axios.post('/api/v1/clients', { client: body });
    return this.mapClient(this.record(response.data, 'client'));
  }

  async listClients(): Promise<BonsaiClient[]> {
    return (await this.listRecords('/api/v1/clients', ['clients'])).map(data =>
      this.mapClient(data)
    );
  }

  private mapClient(c: RecordData): BonsaiClient {
    c = asRecord(c.client ?? c, 'client');
    return {
      id: identifier(c.id ?? c._id, 'client'),
      name: text(c.name),
      firstName: text(c.first_name ?? c.firstName),
      lastName: text(c.last_name ?? c.lastName),
      email: text(c.email),
      companyName: text(c.company_name ?? c.companyName),
      website: text(c.website),
      phone: text(c.phone ?? c.phone_number),
      jobTitle: text(c.job_title ?? c.jobTitle),
      notes: text(c.notes),
      createdAt: text(c.created_at ?? c.createdAt),
      updatedAt: text(c.updated_at ?? c.updatedAt)
    };
  }

  async createProject(params: {
    name: string;
    clientEmail?: string;
    description?: string;
    notes?: string;
    currency?: string;
  }): Promise<BonsaiProject> {
    let response = await this.axios.post('/api/v1/projects', {
      project: pickDefined({
        name: params.name,
        client_email: params.clientEmail,
        description: params.description,
        notes: params.notes,
        currency: params.currency
      })
    });
    return this.mapProject(this.record(response.data, 'project'));
  }

  async listProjects(): Promise<BonsaiProject[]> {
    return (await this.listRecords('/api/v1/projects', ['projects'])).map(data =>
      this.mapProject(data)
    );
  }

  private mapProject(p: RecordData): BonsaiProject {
    p = asRecord(p.project ?? p, 'project');
    return {
      id: identifier(p.id ?? p._id, 'project'),
      name: text(p.name ?? p.title) ?? '',
      clientId: optionalIdentifier(p.client_id ?? p.clientId ?? p.company_id),
      clientEmail: text(p.client_email ?? p.clientEmail),
      description: text(p.description),
      notes: text(p.notes),
      currency: text(p.currency),
      status: text(p.status),
      createdAt: text(p.created_at ?? p.createdAt),
      updatedAt: text(p.updated_at ?? p.updatedAt)
    };
  }

  async createTask(params: {
    title: string;
    projectId?: string;
    description?: string;
    assigneeEmail?: string;
    priority?: string;
    status?: string;
    startDate?: string;
    dueDate?: string;
    timeEstimate?: number;
    billingType?: string;
    tags?: string[];
  }): Promise<BonsaiTask> {
    let rawMinutes = params.timeEstimate === undefined ? undefined : params.timeEstimate * 60;
    let minutes = rawMinutes === undefined ? undefined : Math.round(rawMinutes);
    if (
      minutes !== undefined &&
      (!Number.isSafeInteger(minutes) ||
        minutes <= 0 ||
        Math.abs(minutes - (rawMinutes ?? 0)) > 1e-8)
    ) {
      throw createApiServiceError(
        'timeEstimate must be positive hours that convert to whole minutes.'
      );
    }
    if (
      params.priority !== undefined &&
      !['urgent', 'high', 'medium', 'low'].includes(params.priority)
    ) {
      throw createApiServiceError('priority must be urgent, high, medium, or low.');
    }
    if (
      params.billingType !== undefined &&
      !['billable', 'non_billable'].includes(params.billingType)
    ) {
      throw createApiServiceError('billingType must be billable or non_billable.');
    }
    for (let [field, value] of [
      ['startDate', params.startDate],
      ['dueDate', params.dueDate]
    ]) {
      if (
        value !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      ) {
        throw createApiServiceError(`${field} must be a date in YYYY-MM-DD format.`);
      }
    }
    if (params.startDate && params.dueDate && params.startDate > params.dueDate) {
      throw createApiServiceError('startDate cannot be later than dueDate.');
    }

    let assignee =
      params.assigneeEmail === undefined
        ? undefined
        : (await this.listTeamMembers()).find(
            member => member.email?.toLowerCase() === params.assigneeEmail?.toLowerCase()
          );
    if (params.assigneeEmail !== undefined && !assignee) {
      throw createApiServiceError(
        'No team member matches assigneeEmail. Call list_team_members to find the correct email.'
      );
    }
    let normalizedStatus = params.status?.toLowerCase().replace(/[_\s-]/g, '');
    let statuses = params.status === undefined ? [] : await this.listTaskStatuses();
    let exactStatuses = statuses.filter(
      item => item.name.toLowerCase() === params.status?.toLowerCase()
    );
    let matchedStatuses = exactStatuses.length
      ? exactStatuses
      : statuses.filter(
          item => item.name.toLowerCase().replace(/[_\s-]/g, '') === normalizedStatus
        );
    if (matchedStatuses.length > 1) {
      throw createApiServiceError(
        'The status name matches multiple board columns. Call list_task_statuses and provide an exact column name.'
      );
    }
    let status = matchedStatuses[0];
    if (params.status !== undefined && !status) {
      throw createApiServiceError(
        'No task status matches status. Call list_task_statuses to find a board column name.'
      );
    }

    let tagIds: number[] | undefined;
    if (params.tags?.length === 0) tagIds = [];
    if (params.tags?.length) {
      let tags = await this.listRecords('/public-api/v1/company_tags', [], {
        'filter[tag_type]': 'task'
      });
      tagIds = params.tags.map(name => {
        let matches = tags.filter(tag => text(tag.name)?.toLowerCase() === name.toLowerCase());
        if (matches.length !== 1 || typeof matches[0]?.id !== 'number') {
          throw createApiServiceError(
            `No unique task tag matches "${name}". Use an existing task tag name.`
          );
        }
        return matches[0].id;
      });
    }

    let response = await this.axios.post('/public-api/v1/tasks', {
      task: pickDefined({
        title: params.title,
        project_id: params.projectId === undefined ? undefined : numericId(params.projectId),
        description: params.description,
        assignee_member_id: assignee === undefined ? undefined : Number(assignee.memberId),
        priority: params.priority,
        task_status_id: status?.id,
        start_date: params.startDate,
        due_date: params.dueDate,
        time_estimate_in_minutes: minutes,
        billable:
          params.billingType === undefined ? undefined : params.billingType === 'billable',
        tag_ids: tagIds
      })
    });
    return {
      ...this.mapTask(this.record(response.data, 'task')),
      assigneeEmail: assignee?.email
    };
  }

  async createTasksFromTemplate(params: {
    projectId: string;
    templateId: string;
  }): Promise<BonsaiTask[]> {
    let response = await this.axios.post('/api/v1/tasks/from_template', {
      project_id: params.projectId,
      template_id: params.templateId
    });
    let envelope = Array.isArray(response.data) ? undefined : asRecord(response.data, 'tasks');
    let tasks = envelope?.data ?? envelope?.tasks ?? response.data;
    if (!Array.isArray(tasks)) {
      throw createApiServiceError('Bonsai returned an invalid tasks response.', {
        reason: 'invalid_response'
      });
    }
    return tasks.map(task => this.mapTask(asRecord(task, 'task')));
  }

  async listTasks(projectId?: string): Promise<BonsaiTask[]> {
    return (
      await this.listRecords('/public-api/v1/tasks', [], {
        'filter[scope]': 'all',
        ...(projectId === undefined
          ? {}
          : { 'filter[project_id]': String(numericId(projectId)) })
      })
    ).map(data => this.mapTask(data));
  }

  async getTask(taskId: string): Promise<BonsaiTask> {
    let response = await this.axios.get(`/public-api/v1/tasks/${encodeURIComponent(taskId)}`);
    return this.mapTask(this.record(response.data, 'task'));
  }

  async listTaskTemplates(): Promise<BonsaiTaskTemplate[]> {
    return (
      await this.listRecords('/api/v1/task_templates', ['task_templates', 'templates'])
    ).map(data => ({
      id: identifier(data.id ?? data._id, 'task template'),
      name: text(data.name) ?? ''
    }));
  }

  private mapTask(t: RecordData): BonsaiTask {
    t = asRecord(t.task ?? t, 'task');
    let status = isApiErrorRecord(t.task_status) ? t.task_status : undefined;
    let tags = Array.isArray(t.company_tags) ? t.company_tags : t.tags;
    let minutes = numeric(t.time_estimate_in_minutes);
    return {
      id: identifier(t.id ?? t._id ?? t.uuid, 'task'),
      title: text(t.title) ?? '',
      description: text(t.description ?? t.description_html ?? t.description_plain_text),
      projectId: optionalIdentifier(t.project_id ?? t.projectId),
      assigneeEmail: text(t.assignee_email ?? t.assigneeEmail),
      priority: text(t.priority),
      status: text(t.status ?? status?.status),
      startDate: text(t.start_date ?? t.startDate),
      dueDate: text(t.due_date ?? t.dueDate),
      timeEstimate:
        minutes === undefined ? numeric(t.time_estimate ?? t.timeEstimate) : minutes / 60,
      billingType:
        typeof t.billable === 'boolean'
          ? t.billable
            ? 'billable'
            : 'non_billable'
          : text(t.billing_type ?? t.billingType),
      tags: Array.isArray(tags)
        ? tags
            .map(tag =>
              typeof tag === 'string'
                ? tag
                : text(isApiErrorRecord(tag) ? tag.name : undefined)
            )
            .filter((name): name is string => name !== undefined)
        : undefined,
      recurring: typeof t.recurring === 'boolean' ? t.recurring : undefined,
      createdAt: text(t.created_at ?? t.createdAt),
      updatedAt: text(t.updated_at ?? t.updatedAt),
      url: text(t.url),
      assigneeMemberId: optionalIdentifier(t.assignee_member_id),
      taskStatusId: text(status?.id),
      completedAt: text(t.completed_at),
      archivedAt: text(t.archived_at)
    };
  }

  async createDeal(params: {
    title: string;
    clientEmail?: string;
    pipelineStage?: string;
    value?: number;
    ownerEmail?: string;
  }): Promise<BonsaiDeal> {
    let response = await this.axios.post('/api/v1/deals', {
      deal: pickDefined({
        title: params.title,
        client_email: params.clientEmail,
        pipeline_stage: params.pipelineStage,
        value: params.value,
        owner_email: params.ownerEmail
      })
    });
    return this.mapDeal(this.record(response.data, 'deal'));
  }

  async listDeals(): Promise<BonsaiDeal[]> {
    return (await this.listRecords('/api/v1/deals', ['deals'])).map(data =>
      this.mapDeal(data)
    );
  }

  private mapDeal(d: RecordData): BonsaiDeal {
    d = asRecord(d.deal ?? d, 'deal');
    return {
      id: identifier(d.id ?? d._id, 'deal'),
      title: text(d.title) ?? '',
      clientEmail: text(d.client_email ?? d.clientEmail),
      clientId: optionalIdentifier(d.client_id ?? d.clientId),
      pipelineStage: text(d.pipeline_stage ?? d.pipelineStage ?? d.status),
      value: numeric(d.value ?? d.deal_value),
      ownerEmail: text(d.owner_email ?? d.ownerEmail),
      createdAt: text(d.created_at ?? d.createdAt),
      updatedAt: text(d.updated_at ?? d.updatedAt)
    };
  }

  async listTeamMembers(): Promise<BonsaiTeamMember[]> {
    return (await this.listRecords('/public-api/v1/team_members', [])).map(member => ({
      memberId: identifier(member.company_member_id, 'team member'),
      userId: optionalIdentifier(member.user_id),
      name: text(member.name),
      email: text(member.email),
      role: text(member.role),
      permissionProfile: text(member.permission_profile),
      status: member.deactivated_at
        ? 'deactivated'
        : member.declined_at
          ? 'declined'
          : member.confirmed_at
            ? 'active'
            : 'invited'
    }));
  }

  async listTaskStatuses(): Promise<BonsaiTaskStatus[]> {
    return (await this.listRecords('/public-api/v1/task_statuses', [])).map(status => ({
      id: identifier(status.id, 'task status'),
      name: text(status.status) ?? '',
      state: text(status.state) ?? '',
      color: text(status.color),
      position: numeric(status.position)
    }));
  }
}
