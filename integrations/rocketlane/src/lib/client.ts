import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type { FieldOptionColor } from './schemas';

type PageInput = { offset?: number; limit?: number; pageToken?: string };
type UserReference = { emailId?: string; userId?: number; role?: string };
type UserCollection = { members?: UserReference[]; placeholders?: unknown[] };
type TaskResponse = {
  taskId: number;
  taskName: string;
  project?: { projectId?: number } | null;
  phase?: { phaseId?: number } | null;
  parent?: { taskId?: number } | null;
  projectId?: number;
  phaseId?: number;
  parentTaskId?: number | null;
  taskDescription?: string | null;
  description?: string | null;
  effortInMinutes?: number;
  effort?: number;
  assignees?: UserReference[] | UserCollection | null;
  followers?: UserReference[] | UserCollection | null;
};
type TimeEntryResponse = {
  timeEntryId: number;
  project?: { projectId?: number } | null;
  task?: { taskId?: number } | null;
  projectId?: number;
  taskId?: number | null;
  minutes?: number;
  duration?: number;
  notes?: string | null;
  description?: string | null;
  date?: string;
};
type UserResponse = { userId: number; email?: string; emailId?: string };
type FieldResponse = { fieldId: number; fieldOptions?: unknown[]; options?: unknown[] };
type AllocationResponse = {
  allocationId?: number;
  project?: { projectId?: number } | null;
  member?: { userId?: number } | null;
  duration?: { hours?: number } | null;
  projectId?: number;
  userId?: number;
  hours?: number;
};
type InvoiceResponse = { projects?: { projectId: number }[] };

let BASE_URL = 'https://api.rocketlane.com/api/1.0';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Reconnect Rocketlane with a non-empty API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      headers: {
        'api-key': config.token.trim(),
        accept: 'application/json',
        'content-type': 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Rocketlane',
          reason: 'Rocketlane API request failed'
        })
    });
  }

  private normalizeTask(task: TaskResponse) {
    return {
      ...task,
      projectId: task.project?.projectId ?? task.projectId,
      phaseId: task.phase?.phaseId ?? task.phaseId,
      parentTaskId: task.parent?.taskId ?? task.parentTaskId,
      description: task.taskDescription ?? task.description,
      effort: task.effortInMinutes ?? task.effort,
      assignees: Array.isArray(task.assignees)
        ? task.assignees
        : [...(task.assignees?.members ?? []), ...(task.assignees?.placeholders ?? [])],
      followers: Array.isArray(task.followers)
        ? task.followers
        : [...(task.followers?.members ?? []), ...(task.followers?.placeholders ?? [])]
    };
  }

  private normalizeTimeEntry(entry: TimeEntryResponse) {
    return {
      ...entry,
      projectId: entry.project?.projectId ?? entry.projectId,
      taskId: entry.task?.taskId ?? entry.taskId,
      duration: entry.minutes ?? entry.duration,
      description: entry.notes ?? entry.description
    };
  }

  private async listPage(
    path: string,
    input: PageInput = {},
    filters: Record<string, unknown> = {}
  ) {
    let offset = input.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw createApiServiceError('Pagination offset must be a non-negative integer.');
    }
    if (input.limit !== undefined && (!Number.isSafeInteger(input.limit) || input.limit < 1)) {
      throw createApiServiceError('Pagination limit must be a positive integer.');
    }
    if (input.pageToken && offset) {
      throw createApiServiceError('Use either pageToken or a non-zero offset, not both.');
    }
    let pageToken = input.pageToken;
    let seenTokens = new Set<string>();
    for (let page = 0; page < 100; page++) {
      let result = (
        await this.axios.get(path, {
          params: pickDefined({
            ...filters,
            pageSize: offset ? Math.min(offset, 100) : input.limit,
            pageToken
          })
        })
      ).data;
      if (!Array.isArray(result.data)) {
        throw createApiServiceError(
          `Rocketlane returned an invalid paginated response for ${path}.`
        );
      }
      if (!offset) return result;
      offset -= result.data.length;
      if (!result.pagination?.hasMore) return { ...result, data: [] };
      let nextToken = result.pagination.nextPageToken;
      if (!nextToken || seenTokens.has(nextToken)) {
        throw createApiServiceError(
          'Rocketlane returned a missing or repeated pagination token.'
        );
      }
      seenTokens.add(nextToken);
      pageToken = nextToken;
    }
    throw createApiServiceError(
      'Pagination offset exceeds 100 API pages. Use the returned pageToken to continue.'
    );
  }

  private statusValue(status?: string) {
    if (status === undefined) return undefined;
    if (!/^\d+$/.test(status) || !Number.isSafeInteger(Number(status))) {
      throw createApiServiceError(
        'Task status must be a numeric option ID string. Call list_custom_fields for task status options.'
      );
    }
    return { value: Number(status) };
  }

  private validateUsers(users?: UserReference[]) {
    for (let user of users ?? []) {
      if (!user.emailId && user.userId === undefined) {
        throw createApiServiceError(
          'Each user reference must include emailId or userId. Call list_users to discover users.'
        );
      }
    }
  }

  // ─── Projects ────────────────────────────────────────────

  async listProjects(params?: PageInput) {
    return this.listPage('/projects', params, { includeAllFields: true });
  }

  async getProject(projectId: number) {
    let res = await this.axios.get(`/projects/${projectId}`, {
      params: { includeAllFields: true }
    });
    return res.data;
  }

  async createProject(data: {
    projectName: string;
    customer?: { companyName?: string; companyId?: number };
    owner?: { emailId?: string; userId?: number };
    startDate?: string;
    dueDate?: string;
    projectDescription?: string;
    templateId?: number;
    visibility?: string;
    fields?: Array<{ fieldId: number; fieldValue: unknown }>;
    members?: Array<{ emailId?: string; userId?: number; role?: string }>;
  }) {
    if (
      !data.customer ||
      (!data.customer.companyName && data.customer.companyId === undefined)
    ) {
      throw createApiServiceError(
        'Provide customerCompanyId or customerCompanyName. Call list_companies to discover customers.'
      );
    }
    if (!data.owner || (!data.owner.emailId && data.owner.userId === undefined)) {
      throw createApiServiceError(
        'Provide ownerId or ownerEmail. Call list_users to discover project owners.'
      );
    }
    if (data.templateId !== undefined && !data.startDate) {
      throw createApiServiceError('Provide startDate when applying a project template.');
    }
    this.validateUsers(data.members);
    let { templateId, members, ...project } = data;
    let res = await this.axios.post(
      '/projects',
      pickDefined({
        ...project,
        sources:
          templateId === undefined ? undefined : [{ templateId, startDate: data.startDate }],
        teamMembers:
          members === undefined
            ? undefined
            : { members: members.map(({ role: _role, ...user }) => user) }
      }),
      { params: { includeAllFields: true } }
    );
    return res.data;
  }

  async updateProject(
    projectId: number,
    data: {
      projectName?: string;
      startDate?: string;
      dueDate?: string;
      projectDescription?: string;
      visibility?: string;
      owner?: { emailId?: string; userId?: number };
      fields?: Array<{ fieldId: number; fieldValue: unknown }>;
    }
  ) {
    let res = await this.axios.put(`/projects/${projectId}`, data);
    return res.data;
  }

  async deleteProject(projectId: number) {
    let res = await this.axios.delete(`/projects/${projectId}`);
    return res.data;
  }

  async archiveProject(projectId: number) {
    let res = await this.axios.post(`/projects/${projectId}/archive`);
    return res.data;
  }

  async addProjectMembers(projectId: number, members: UserReference[]) {
    this.validateUsers(members);
    let res = await this.axios.post(`/projects/${projectId}/add-members`, {
      members: members.map(({ role: _role, ...user }) => user)
    });
    return res.data;
  }

  async removeProjectMember(projectId: number, userId: number) {
    let res = await this.axios.post(`/projects/${projectId}/remove-members`, {
      members: [{ userId }]
    });
    return res.data;
  }

  // ─── Tasks ───────────────────────────────────────────────

  async listTasks(params: PageInput & { projectId?: number; phaseId?: number } = {}) {
    let result = await this.listPage('/tasks', params, {
      'projectId.eq': params.projectId,
      'phaseId.eq': params.phaseId,
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((task: TaskResponse) => this.normalizeTask(task))
    };
  }

  async getTask(taskId: number) {
    let res = await this.axios.get(`/tasks/${taskId}`, { params: { includeAllFields: true } });
    return this.normalizeTask(res.data);
  }

  async createTask(data: {
    taskName: string;
    projectId: number;
    phaseId?: number;
    parentTaskId?: number;
    assignees?: Array<{ emailId?: string; userId?: number }>;
    followers?: Array<{ emailId?: string; userId?: number }>;
    startDate?: string;
    dueDate?: string;
    effort?: number;
    progress?: number;
    description?: string;
    status?: string;
    priority?: string;
    fields?: Array<{ fieldId: number; fieldValue: unknown }>;
  }) {
    this.validateUsers(data.assignees);
    this.validateUsers(data.followers);
    let {
      projectId,
      phaseId,
      parentTaskId,
      effort,
      description,
      status,
      assignees,
      followers,
      ...task
    } = data;
    let res = await this.axios.post(
      '/tasks',
      pickDefined({
        ...task,
        project: { projectId },
        phase: phaseId === undefined ? undefined : { phaseId },
        parent: parentTaskId === undefined ? undefined : { taskId: parentTaskId },
        effortInMinutes: effort,
        taskDescription: description,
        status: this.statusValue(status),
        assignees: assignees === undefined ? undefined : { members: assignees },
        followers: followers === undefined ? undefined : { members: followers }
      }),
      { params: { includeAllFields: true } }
    );
    return this.normalizeTask(res.data);
  }

  async updateTask(
    taskId: number,
    data: {
      taskName?: string;
      assignees?: Array<{ emailId?: string; userId?: number }>;
      followers?: Array<{ emailId?: string; userId?: number }>;
      startDate?: string;
      dueDate?: string;
      effort?: number;
      progress?: number;
      description?: string;
      status?: string;
      priority?: string;
      atRisk?: boolean;
      fields?: Array<{ fieldId: number; fieldValue: unknown }>;
    }
  ) {
    this.validateUsers(data.assignees);
    this.validateUsers(data.followers);
    let { effort, description, status, assignees, followers, ...task } = data;
    let current =
      assignees !== undefined || followers !== undefined
        ? (await this.axios.get(`/tasks/${taskId}`, { params: { includeAllFields: true } }))
            .data
        : undefined;
    await this.axios.put(
      `/tasks/${taskId}`,
      pickDefined({
        ...task,
        effortInMinutes: effort,
        taskDescription: description,
        status: this.statusValue(status)
      })
    );
    for (let [kind, desired] of [
      ['assignees', assignees],
      ['followers', followers]
    ] as const) {
      if (desired === undefined) continue;
      let existing: UserReference[] = current?.[kind]?.members ?? [];
      let matches = (left: UserReference, right: UserReference) =>
        (left.userId !== undefined && left.userId === right.userId) ||
        (left.emailId !== undefined && left.emailId === right.emailId);
      let remove = existing.filter(user => !desired.some(other => matches(user, other)));
      let add = desired.filter(user => !existing.some(other => matches(user, other)));
      if (remove.length)
        await this.axios.post(`/tasks/${taskId}/remove-${kind}`, { members: remove });
      if (add.length) await this.axios.post(`/tasks/${taskId}/add-${kind}`, { members: add });
    }
    return this.getTask(taskId);
  }

  async deleteTask(taskId: number) {
    let res = await this.axios.delete(`/tasks/${taskId}`);
    return res.data;
  }

  async moveTask(taskId: number, data: { phaseId: number; position?: number }) {
    let res = await this.axios.post(
      `/tasks/${taskId}/move-phase`,
      pickDefined({ phase: { phaseId: data.phaseId }, position: data.position })
    );
    return this.normalizeTask(res.data);
  }

  // ─── Phases ──────────────────────────────────────────────

  async listPhases(params: PageInput & { projectId?: number } = {}) {
    if (params.projectId === undefined) {
      throw createApiServiceError(
        'Provide projectId. Call list_projects to discover projects.'
      );
    }
    return this.listPage('/phases', params, {
      projectId: params.projectId,
      includeAllFields: true
    });
  }

  async getPhase(phaseId: number) {
    let res = await this.axios.get(`/phases/${phaseId}`, {
      params: { includeAllFields: true }
    });
    return res.data;
  }

  async createPhase(data: {
    phaseName: string;
    projectId: number;
    startDate: string;
    dueDate: string;
    private?: boolean;
  }) {
    let { projectId, ...phase } = data;
    let res = await this.axios.post('/phases', { ...phase, project: { projectId } });
    return res.data;
  }

  async updatePhase(
    phaseId: number,
    data: {
      phaseName?: string;
      startDate?: string;
      dueDate?: string;
      private?: boolean;
    }
  ) {
    let res = await this.axios.put(`/phases/${phaseId}`, data);
    return res.data;
  }

  async deletePhase(phaseId: number) {
    let res = await this.axios.delete(`/phases/${phaseId}`);
    return res.data;
  }

  // ─── Companies ───────────────────────────────────────────

  async listCompanies(params?: PageInput) {
    return this.listPage('/companies', params, { includeAllFields: true });
  }

  async getCompany(companyId: number) {
    let res = await this.axios.get(`/companies/${companyId}`, {
      params: { includeAllFields: true }
    });
    return res.data;
  }

  async createCompany(data: {
    companyName: string;
    companyUrl?: string;
    fields?: Array<{ fieldId: number; fieldValue: unknown }>;
  }) {
    let res = await this.axios.post('/companies', data);
    return res.data;
  }

  async updateCompany(
    companyId: number,
    data: {
      companyName?: string;
      companyUrl?: string;
      fields?: Array<{ fieldId: number; fieldValue: unknown }>;
    }
  ) {
    let res = await this.axios.put(`/companies/${companyId}`, data);
    return res.data;
  }

  // ─── Users ───────────────────────────────────────────────

  async listUsers(params: PageInput & { userType?: string; emailId?: string } = {}) {
    let result = await this.listPage('/users', params, {
      'type.eq': params.userType,
      'email.eq': params.emailId,
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((user: UserResponse) => ({
        ...user,
        emailId: user.email ?? user.emailId
      }))
    };
  }

  async getUser(userId: number) {
    let res = await this.axios.get(`/users/${userId}`, { params: { includeAllFields: true } });
    return { ...res.data, emailId: res.data.email ?? res.data.emailId };
  }

  async getUserByEmail(emailId: string, params?: PageInput) {
    return this.listUsers({ ...params, emailId });
  }

  async listCustomerUsers(params?: PageInput) {
    return this.listUsers({ ...params, userType: 'CUSTOMER' });
  }

  async listVendorUsers(params?: PageInput) {
    return this.listUsers({ ...params, userType: 'TEAM_MEMBER' });
  }

  // ─── Time Entries ────────────────────────────────────────

  async listTimeEntries(params: PageInput & { projectId?: number; userId?: number } = {}) {
    let result = await this.listPage('/time-entries', params, {
      'projectId.eq': params.projectId,
      'user.eq': params.userId,
      includeFields: 'notes'
    });
    return {
      ...result,
      data: result.data.map((entry: TimeEntryResponse) => this.normalizeTimeEntry(entry))
    };
  }

  async getTimeEntry(timeEntryId: number) {
    let res = await this.axios.get(`/time-entries/${timeEntryId}`);
    return res.data;
  }

  async createTimeEntry(data: {
    projectId: number;
    taskId?: number;
    userId?: number;
    duration: number;
    date: string;
    description?: string;
    categoryId?: number;
  }) {
    let { projectId, taskId, userId, duration, description, categoryId, ...entry } = data;
    let res = await this.axios.post(
      '/time-entries',
      pickDefined({
        ...entry,
        project: taskId === undefined ? { projectId } : undefined,
        task: taskId === undefined ? undefined : { taskId },
        user: userId === undefined ? undefined : { userId },
        minutes: duration,
        notes: description,
        category: categoryId === undefined ? undefined : { categoryId }
      }),
      { params: { includeAllFields: true } }
    );
    return this.normalizeTimeEntry(res.data);
  }

  async updateTimeEntry(
    timeEntryId: number,
    data: {
      duration?: number;
      date?: string;
      description?: string;
      categoryId?: number;
    }
  ) {
    let { duration, description, categoryId, ...entry } = data;
    let current =
      data.date === undefined || duration === undefined
        ? await this.getTimeEntry(timeEntryId)
        : undefined;
    let res = await this.axios.put(
      `/time-entries/${timeEntryId}`,
      pickDefined({
        ...entry,
        date: entry.date ?? current?.date,
        minutes: duration ?? current?.minutes,
        notes: description,
        category: categoryId === undefined ? undefined : { categoryId }
      }),
      { params: { includeAllFields: true } }
    );
    return this.normalizeTimeEntry(res.data);
  }

  async deleteTimeEntry(timeEntryId: number) {
    let res = await this.axios.delete(`/time-entries/${timeEntryId}`);
    return res.data;
  }

  async listTimeEntryCategories(params?: PageInput) {
    return this.listPage('/time-entries/categories', params);
  }

  // ─── Spaces & Documents ──────────────────────────────────

  async listSpaces(params: PageInput & { projectId?: number } = {}) {
    if (params.projectId === undefined) {
      throw createApiServiceError(
        'Provide projectId. Call list_projects to discover projects.'
      );
    }
    return this.listPage('/spaces', params, { projectId: params.projectId });
  }

  async getSpace(spaceId: number) {
    let res = await this.axios.get(`/spaces/${spaceId}`);
    return res.data;
  }

  async createSpace(data: { spaceName: string; projectId: number; description?: string }) {
    let { projectId, ...space } = data;
    let res = await this.axios.post('/spaces', { ...space, project: { projectId } });
    return res.data;
  }

  async updateSpace(
    spaceId: number,
    data: {
      spaceName?: string;
      description?: string;
    }
  ) {
    let res = await this.axios.put(`/spaces/${spaceId}`, data);
    return res.data;
  }

  async deleteSpace(spaceId: number) {
    let res = await this.axios.delete(`/spaces/${spaceId}`);
    return res.data;
  }

  async listSpaceDocuments(spaceId: number, projectId?: number) {
    let project = projectId ?? (await this.getSpace(spaceId)).project?.projectId;
    if (project === undefined)
      throw createApiServiceError(
        'Rocketlane did not return the project ID for this space. Provide projectId.'
      );
    return this.listPage(
      '/space-documents',
      {},
      { projectId: project, 'spaceId.eq': spaceId }
    );
  }

  // ─── Conversations & Comments ────────────────────────────

  async listConversations(params?: { projectId?: number; offset?: number; limit?: number }) {
    let res = await this.axios.get('/conversations', { params });
    return res.data;
  }

  async createConversation(data: {
    projectId: number;
    title: string;
    body?: string;
    members?: Array<{ emailId?: string; userId?: number }>;
  }) {
    let res = await this.axios.post('/conversations', data);
    return res.data;
  }

  async getConversation(conversationId: number) {
    let res = await this.axios.get(`/conversations/${conversationId}`);
    return res.data;
  }

  async createComment(data: { conversationId?: number; taskId?: number; body: string }) {
    let res = await this.axios.post('/comments', data);
    return res.data;
  }

  async getComments(params: { conversationId?: number; taskId?: number }) {
    let res = await this.axios.get('/comments', { params });
    return res.data;
  }

  async deleteComment(commentId: number) {
    let res = await this.axios.delete(`/comments/${commentId}`);
    return res.data;
  }

  // ─── Custom Fields ───────────────────────────────────────

  async listProjectFields(params?: PageInput) {
    let result = await this.listPage('/fields', params, {
      'objectType.eq': 'PROJECT',
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((field: FieldResponse) => ({
        ...field,
        options: field.fieldOptions ?? field.options
      }))
    };
  }

  async listTaskFields(params?: PageInput) {
    let result = await this.listPage('/fields', params, {
      'objectType.eq': 'TASK',
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((field: FieldResponse) => ({
        ...field,
        options: field.fieldOptions ?? field.options
      }))
    };
  }

  async listCompanyFields(params?: PageInput) {
    let result = await this.listPage('/fields', params, {
      'objectType.eq': 'COMPANY',
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((field: FieldResponse) => ({
        ...field,
        options: field.fieldOptions ?? field.options
      }))
    };
  }

  async createField(data: {
    fieldLabel: string;
    fieldType: string;
    ratingScale?: 'THREE' | 'FIVE' | 'SEVEN' | 'TEN';
    entityType: string;
    options?: Array<{ label: string; value: string; color?: FieldOptionColor }>;
  }) {
    let { entityType, options, fieldType, ...field } = data;
    if (fieldType.toUpperCase() === 'RATING' && !data.ratingScale) {
      throw createApiServiceError('Provide ratingScale when creating a RATING field.');
    }
    let aliases: Record<string, string> = {
      TEXT: 'TEXT',
      DROPDOWN: 'SINGLE_CHOICE',
      CHECKBOX: 'YES_OR_NO'
    };
    let res = await this.axios.post(
      '/fields',
      pickDefined({
        ...field,
        fieldType: aliases[fieldType.toUpperCase()] ?? fieldType.toUpperCase(),
        objectType: entityType.toUpperCase(),
        fieldOptions: options?.map(option => ({
          optionLabel: option.label,
          optionColor: option.color ?? 'GRAY'
        }))
      })
    );
    return { ...res.data, entityType: res.data.objectType };
  }

  async updateField(
    fieldId: number,
    data: {
      fieldLabel?: string;
      options?: Array<{ label: string; value: string }>;
    }
  ) {
    let res = await this.axios.put(`/fields/${fieldId}`, data);
    return res.data;
  }

  async deleteField(fieldId: number) {
    let res = await this.axios.delete(`/fields/${fieldId}`);
    return res.data;
  }

  // ─── Templates ───────────────────────────────────────────

  async listTemplates(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/templates', { params });
    return res.data;
  }

  async getTemplate(templateId: number) {
    let res = await this.axios.get(`/templates/${templateId}`);
    return res.data;
  }

  // ─── Resource Allocations ────────────────────────────────

  async listResourceAllocations(
    params: PageInput & {
      projectId?: number;
      userId?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    if (!params.startDate || !params.endDate) {
      throw createApiServiceError(
        'Provide startDate and endDate in YYYY-MM-DD format for resource allocations.'
      );
    }
    let result = await this.listPage('/resource-allocations', params, {
      startDate: params.startDate,
      endDate: params.endDate,
      'projectId.eq': params.projectId,
      'memberId.eq': params.userId,
      includeAllFields: true
    });
    return {
      ...result,
      data: result.data.map((allocation: AllocationResponse) => ({
        ...allocation,
        projectId: allocation.project?.projectId ?? allocation.projectId,
        userId: allocation.member?.userId ?? allocation.userId,
        hours: allocation.duration?.hours ?? allocation.hours
      }))
    };
  }

  // ─── Financials ──────────────────────────────────────────

  async searchInvoices(params: PageInput & { projectId?: number; status?: string } = {}) {
    let result = await this.listPage('/invoices', params, {
      'status.eq': params.status,
      includeAllFields: true
    });
    if (params.projectId === undefined) return result;
    return {
      ...result,
      data: result.data.filter((invoice: InvoiceResponse) =>
        invoice.projects?.some(
          (project: { projectId: number }) => project.projectId === params.projectId
        )
      ),
      pagination: { ...result.pagination, totalRecordCount: undefined }
    };
  }

  async listCurrencies() {
    let res = await this.axios.get('/currencies');
    return res.data;
  }
}
