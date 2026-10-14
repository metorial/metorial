import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateError
} from 'slates';
import {
  buildXml,
  camelizeKeys,
  isXmlObject,
  parseXml,
  parseXmlList,
  parseXmlObject,
  snakeCaseKeys,
  type XmlObject
} from './xml';

export interface ProjectData {
  name?: string;
  description?: string;
}

export interface TaskData {
  name?: string;
  description?: string;
}

export interface TimeEntryFilter {
  userIds: string;
  fromTimestamp: string;
  toTimestamp: string;
  taskIds?: string;
  timeEntryType?: string;
}

export interface UserTimeEntryFilter {
  fromTimestamp: string;
  toTimestamp: string;
  timeEntryType?: string;
}

export interface TimeEntryUpdate {
  taskId?: string;
  userComment?: string;
}

export interface OfflineTimeEntry {
  taskId?: string;
  fromTimestamp: string;
  durationInMinutes: number;
  userComment?: string;
}

export interface UserAssignmentData {
  userId?: number;
  role?: string;
  hourlyRate?: number;
  flagAllowLoggingTime?: number;
  windowForDeletingTime?: number;
  windowForAddingOfflineTime?: number;
}

export interface TaskAssignmentData {
  userId: number;
  taskId: number;
}

export interface ReportFilter {
  name: string;
  fromTimestamp: string;
  toTimestamp: string;
  userIds?: string;
  taskIds?: string;
  timeEntryType?: string;
}

export interface SummaryReportFilter {
  name: string;
  fromDate: string;
  toDate: string;
  timezoneOffset?: string;
  projectIds?: string;
  userIds?: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.worksnaps.com/api',
      auth: {
        username: token,
        password: 'ignored'
      },
      responseType: 'text',
      contentType: 'application/xml',
      headers: { Accept: 'application/xml' },
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let reply = getErrorReply(error.response?.data);
          if (!reply) return undefined;
          return {
            message:
              typeof reply.error_string === 'string' && reply.error_string.trim()
                ? reply.error_string
                : inferred.message,
            upstream: {
              ...inferred.upstream,
              code:
                reply.error_code === undefined
                  ? inferred.upstream?.code
                  : String(reply.error_code)
            }
          };
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Worksnaps',
          reason: 'worksnaps_api_error',
          extractUpstreamCode: (error, response) => {
            if (SlateError.is(error)) return error.data.upstream?.code;
            let code = getErrorReply(response?.data)?.error_code;
            return code === undefined ? undefined : String(code);
          }
        })
    });
    this.http.interceptors.response.use(response => {
      if (typeof response.data === 'string' && response.data.trim()) {
        let parsed = parseXml(response.data);
        let reply = isXmlObject(parsed.reply) ? parsed.reply : undefined;
        if (reply?.status === '0') {
          throw createApiServiceError(
            typeof reply.error_string === 'string'
              ? reply.error_string
              : 'Worksnaps rejected the request.',
            {
              upstreamStatus: response.status,
              upstreamCode:
                reply.error_code === undefined ? undefined : String(reply.error_code)
            }
          );
        }
      }
      return response;
    });
  }

  // =====================
  // Projects
  // =====================

  async listProjects(includeUserAssignment?: boolean): Promise<Record<string, unknown>[]> {
    let params: Record<string, string> = {};
    if (includeUserAssignment) params.include_user_assignment = '1';
    let response = await this.http.get('/projects.xml', { params });
    let items = parseXmlList(response.data as string, 'project');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getProject(
    projectId: string,
    includeUserAssignment?: boolean
  ): Promise<Record<string, unknown>> {
    let params: Record<string, string> = {};
    if (includeUserAssignment) params.include_user_assignment = '1';
    let response = await this.http.get(`/projects/${projectId}.xml`, { params });
    let project = parseXmlObject(response.data as string, 'project');
    return camelizeKeys(project) as Record<string, unknown>;
  }

  async createProject(data: ProjectData): Promise<Record<string, unknown>> {
    let body = buildXml('project', snakeCaseKeys(data) as XmlObject);
    let response = await this.http.post('/projects.xml', body);
    let project = parseXmlObject(response.data as string, 'project');
    return camelizeKeys(project) as Record<string, unknown>;
  }

  async updateProject(projectId: string, data: ProjectData): Promise<Record<string, unknown>> {
    requireUpdate(data);
    let body = buildXml('project', snakeCaseKeys(data) as XmlObject);
    let response = await this.http.put(`/projects/${projectId}.xml`, body);
    let project = parseXmlObject(response.data as string, 'project');
    return camelizeKeys(project) as Record<string, unknown>;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.http.delete(`/projects/${projectId}.xml`);
  }

  // =====================
  // Tasks
  // =====================

  async listTasks(
    projectId: string,
    includeTaskAssignment?: boolean
  ): Promise<Record<string, unknown>[]> {
    let params: Record<string, string> = {};
    if (includeTaskAssignment) params.include_task_assignment = '1';
    let response = await this.http.get(`/projects/${projectId}/tasks.xml`, { params });
    let items = parseXmlList(response.data as string, 'task');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getTask(
    projectId: string,
    taskId: string,
    includeTaskAssignment?: boolean
  ): Promise<Record<string, unknown>> {
    let params: Record<string, string> = {};
    if (includeTaskAssignment) params.include_task_assignment = '1';
    let response = await this.http.get(`/projects/${projectId}/tasks/${taskId}.xml`, {
      params
    });
    let task = parseXmlObject(response.data as string, 'task');
    return camelizeKeys(task) as Record<string, unknown>;
  }

  async createTask(projectId: string, data: TaskData): Promise<Record<string, unknown>> {
    let body = buildXml('task', snakeCaseKeys(data) as XmlObject);
    let response = await this.http.post(`/projects/${projectId}/tasks.xml`, body);
    let task = parseXmlObject(response.data as string, 'task');
    return camelizeKeys(task) as Record<string, unknown>;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: TaskData
  ): Promise<Record<string, unknown>> {
    requireUpdate(data);
    let body = buildXml('task', snakeCaseKeys(data) as XmlObject);
    let response = await this.http.put(`/projects/${projectId}/tasks/${taskId}.xml`, body);
    let task = parseXmlObject(response.data as string, 'task');
    return camelizeKeys(task) as Record<string, unknown>;
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.http.delete(`/projects/${projectId}/tasks/${taskId}.xml`);
  }

  // =====================
  // Time Entries
  // =====================

  async listTimeEntries(
    projectId: string,
    filter: TimeEntryFilter
  ): Promise<Record<string, unknown>[]> {
    validateTimestampRange(filter.fromTimestamp, filter.toTimestamp);
    let params: Record<string, string> = {
      user_ids: filter.userIds,
      from_timestamp: filter.fromTimestamp,
      to_timestamp: filter.toTimestamp
    };
    if (filter.taskIds) params.task_ids = filter.taskIds;
    if (filter.timeEntryType) params.time_entry_type = filter.timeEntryType;
    let response = await this.http.get(`/projects/${projectId}/time_entries.xml`, { params });
    let items = parseXmlList(response.data as string, 'time_entry');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async listUserTimeEntries(
    projectId: string,
    userId: string,
    filter: UserTimeEntryFilter
  ): Promise<Record<string, unknown>[]> {
    validateTimestampRange(filter.fromTimestamp, filter.toTimestamp);
    let params: Record<string, string> = {
      from_timestamp: filter.fromTimestamp,
      to_timestamp: filter.toTimestamp
    };
    if (filter.timeEntryType) params.time_entry_type = filter.timeEntryType;
    let response = await this.http.get(
      `/projects/${projectId}/users/${userId}/time_entries.xml`,
      { params }
    );
    let items = parseXmlList(response.data as string, 'time_entry');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getTimeEntry(
    projectId: string,
    timeEntryId: string,
    fullResolutionUrl?: boolean
  ): Promise<Record<string, unknown>> {
    let params: Record<string, string> = {};
    if (fullResolutionUrl) params.full_resolution_url = '1';
    let response = await this.http.get(
      `/projects/${projectId}/time_entries/${timeEntryId}.xml`,
      { params }
    );
    let entry = parseXmlObject(response.data as string, 'time_entry');
    return camelizeKeys(entry) as Record<string, unknown>;
  }

  async updateTimeEntry(
    projectId: string,
    timeEntryId: string,
    data: TimeEntryUpdate
  ): Promise<void> {
    requireUpdate(data);
    let xmlData: XmlObject = {};
    if (data.taskId !== undefined) xmlData.task_id = data.taskId;
    if (data.userComment !== undefined) xmlData.user_comment = data.userComment;
    let body = buildXml('time_entry', xmlData);
    await this.http.put(`/projects/${projectId}/time_entries/${timeEntryId}.xml`, body);
  }

  async deleteTimeEntry(projectId: string, timeEntryId: string): Promise<void> {
    await this.http.delete(`/projects/${projectId}/time_entries/${timeEntryId}.xml`);
  }

  async createOfflineTimeEntry(
    projectId: string,
    userId: string | undefined,
    data: OfflineTimeEntry
  ): Promise<Record<string, unknown>> {
    validateTimestamp(data.fromTimestamp, 'fromTimestamp');
    if (!Number.isSafeInteger(data.durationInMinutes) || data.durationInMinutes <= 0) {
      throw createApiServiceError('durationInMinutes must be a positive whole number.');
    }
    let xmlData: XmlObject = {
      from_timestamp: data.fromTimestamp,
      duration_in_minutes: data.durationInMinutes
    };
    if (data.taskId !== undefined) xmlData.task_id = data.taskId;
    if (data.userComment !== undefined) xmlData.user_comment = data.userComment;

    let body = buildXml('time_entry', xmlData);
    let url = userId
      ? `/projects/${projectId}/users/${userId}/time_entries.xml`
      : `/projects/${projectId}/time_entries.xml`;
    let response = await this.http.post(url, body);
    let parsed = response.data ? parseXml(response.data as string) : {};
    return camelizeKeys(isXmlObject(parsed.reply) ? parsed.reply : parsed) as Record<
      string,
      unknown
    >;
  }

  // =====================
  // User Assignments
  // =====================

  async listUserAssignments(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.http.get(`/projects/${projectId}/user_assignments.xml`);
    let items = parseXmlList(response.data as string, 'user_assignment');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getUserAssignment(
    projectId: string,
    userAssignmentId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.http.get(
      `/projects/${projectId}/user_assignments/${userAssignmentId}.xml`
    );
    let assignment = parseXmlObject(response.data as string, 'user_assignment');
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async createUserAssignment(
    projectId: string,
    data: UserAssignmentData
  ): Promise<Record<string, unknown>> {
    validateAssignmentSettings(data);
    let xmlData: XmlObject = {};
    if (data.userId !== undefined) xmlData.user_id = data.userId;
    if (data.role !== undefined) xmlData.role = data.role;
    if (data.hourlyRate !== undefined) xmlData.hourly_rate = data.hourlyRate;
    if (data.flagAllowLoggingTime !== undefined)
      xmlData.flag_allow_logging_time = data.flagAllowLoggingTime;
    if (data.windowForDeletingTime !== undefined)
      xmlData.window_for_deleting_time = data.windowForDeletingTime;
    if (data.windowForAddingOfflineTime !== undefined)
      xmlData.window_for_adding_offline_time = data.windowForAddingOfflineTime;
    let body = buildXml('user_assignment', xmlData);
    let response = await this.http.post(`/projects/${projectId}/user_assignments.xml`, body);
    let assignment = parseXmlObject(response.data as string, 'user_assignment');
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async updateUserAssignment(
    projectId: string,
    userAssignmentId: string,
    data: UserAssignmentData
  ): Promise<Record<string, unknown>> {
    validateAssignmentSettings(data);
    let xmlData: XmlObject = {};
    if (data.hourlyRate !== undefined) xmlData.hourly_rate = data.hourlyRate;
    if (data.flagAllowLoggingTime !== undefined)
      xmlData.flag_allow_logging_time = data.flagAllowLoggingTime;
    if (data.windowForDeletingTime !== undefined)
      xmlData.window_for_deleting_time = data.windowForDeletingTime;
    if (data.windowForAddingOfflineTime !== undefined)
      xmlData.window_for_adding_offline_time = data.windowForAddingOfflineTime;
    let body = buildXml('user_assignment', xmlData);
    let response = await this.http.put(
      `/projects/${projectId}/user_assignments/${userAssignmentId}.xml`,
      body
    );
    let assignment = parseXmlObject(response.data as string, 'user_assignment');
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async deleteUserAssignment(projectId: string, userAssignmentId: string): Promise<void> {
    await this.http.delete(`/projects/${projectId}/user_assignments/${userAssignmentId}.xml`);
  }

  // =====================
  // Task Assignments
  // =====================

  async listTaskAssignments(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.http.get(`/projects/${projectId}/task_assignments.xml`);
    let items = parseXmlList(response.data as string, 'task_assignment');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getTaskAssignment(
    projectId: string,
    taskAssignmentId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.http.get(
      `/projects/${projectId}/task_assignments/${taskAssignmentId}.xml`
    );
    let assignment = parseXmlObject(response.data as string, 'task_assignment');
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async createTaskAssignment(
    projectId: string,
    data: TaskAssignmentData
  ): Promise<Record<string, unknown>> {
    let xmlData: XmlObject = {
      user_id: data.userId,
      task_id: data.taskId
    };
    let body = buildXml('task_assignment', xmlData);
    let response = await this.http.post(`/projects/${projectId}/task_assignments.xml`, body);
    let assignment = parseXmlObject(response.data as string, 'task_assignment');
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async deleteTaskAssignment(projectId: string, taskAssignmentId: string): Promise<void> {
    await this.http.delete(`/projects/${projectId}/task_assignments/${taskAssignmentId}.xml`);
  }

  async deleteTaskAssignmentByUserAndTask(
    projectId: string,
    userId: string,
    taskId: string
  ): Promise<void> {
    await this.http.delete(`/projects/${projectId}/task_assignments.xml`, {
      params: { user_id: userId, task_id: taskId }
    });
  }

  // =====================
  // Users
  // =====================

  async getCurrentUser(): Promise<Record<string, unknown>> {
    let response = await this.http.get('/me.xml');
    let user = parseXmlObject(response.data as string, 'user');
    return sanitizeUser(camelizeKeys(user) as Record<string, unknown>);
  }

  async listUsers(): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/users.xml');
    let items = parseXmlList(response.data as string, 'user');
    return items.map(item => sanitizeUser(camelizeKeys(item) as Record<string, unknown>));
  }

  async getUser(userId: string): Promise<Record<string, unknown>> {
    let response = await this.http.get(`/users/${userId}.xml`);
    let user = parseXmlObject(response.data as string, 'user');
    return sanitizeUser(camelizeKeys(user) as Record<string, unknown>);
  }

  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    requireUpdate(data);
    let body = buildXml('user', snakeCaseKeys(data) as XmlObject);
    let response = await this.http.put(`/users/${userId}.xml`, body);
    let user = parseXmlObject(response.data as string, 'user');
    return sanitizeUser(camelizeKeys(user) as Record<string, unknown>);
  }

  // =====================
  // Reports
  // =====================

  async getProjectReport(
    projectId: string,
    filter: ReportFilter
  ): Promise<Record<string, unknown>> {
    validateTimestampRange(filter.fromTimestamp, filter.toTimestamp, 30);
    if (filter.name === 'time_entries' && !filter.userIds?.trim()) {
      throw createApiServiceError('userIds is required for a time_entries report.');
    }
    let params: Record<string, string> = {
      name: filter.name,
      from_timestamp: filter.fromTimestamp,
      to_timestamp: filter.toTimestamp
    };
    if (filter.userIds) params.user_ids = filter.userIds;
    if (filter.taskIds) params.task_ids = filter.taskIds;
    if (filter.timeEntryType) params.time_entry_type = filter.timeEntryType;
    let response = await this.http.get(`/projects/${projectId}/reports`, { params });
    let parsed = parseXml(response.data as string);
    return camelizeKeys(parsed) as Record<string, unknown>;
  }

  async getSummaryReport(filter: SummaryReportFilter): Promise<Record<string, unknown>> {
    let from = validateDate(filter.fromDate, 'fromDate');
    let to = validateDate(filter.toDate, 'toDate');
    if (to < from || to - from > 30 * 24 * 60 * 60 * 1000) {
      throw createApiServiceError(
        'The summary report date range must be ordered and no longer than 30 days.'
      );
    }
    let params: Record<string, string> = {
      name: filter.name,
      from_date: filter.fromDate,
      to_date: filter.toDate
    };
    if (filter.timezoneOffset) params.timezone_offset = filter.timezoneOffset;
    if (filter.projectIds) params.project_ids = filter.projectIds;
    if (filter.userIds) params.user_ids = filter.userIds;
    let response = await this.http.get('/summary_reports', { params });
    let parsed = parseXml(response.data as string);
    return camelizeKeys(parsed) as Record<string, unknown>;
  }
}

let getErrorReply = (data: unknown): XmlObject | undefined => {
  if (typeof data !== 'string') return undefined;
  try {
    let parsed = parseXml(data);
    return isXmlObject(parsed.reply) ? parsed.reply : undefined;
  } catch {
    return undefined;
  }
};

let sanitizeUser = (user: Record<string, unknown>): Record<string, unknown> => {
  let { apiToken: _apiToken, password: _password, ...profile } = user;
  return profile;
};

let requireUpdate = (data: object) => {
  if (!Object.values(data).some(value => value !== undefined)) {
    throw createApiServiceError('Provide at least one field to update.');
  }
};

let validateTimestamp = (value: string, name: string): number => {
  let timestamp = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(timestamp) || timestamp % 600 !== 0) {
    throw createApiServiceError(
      `${name} must be Unix epoch seconds aligned to a 10-minute boundary.`
    );
  }
  return timestamp;
};

let validateTimestampRange = (
  fromTimestamp: string,
  toTimestamp: string,
  maxDays?: number
) => {
  let from = validateTimestamp(fromTimestamp, 'fromTimestamp');
  let to = validateTimestamp(toTimestamp, 'toTimestamp');
  if (to < from || (maxDays !== undefined && to - from > maxDays * 24 * 60 * 60)) {
    throw createApiServiceError(
      maxDays === undefined
        ? 'toTimestamp must be at or after fromTimestamp.'
        : `The report timestamp range must be ordered and no longer than ${maxDays} days.`
    );
  }
};

let validateDate = (value: string, name: string): number => {
  let timestamp = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw createApiServiceError(`${name} must be a valid date in YYYY-MM-DD format.`);
  }
  return timestamp;
};

let validateAssignmentSettings = (data: UserAssignmentData) => {
  let allowedWindows = [-1, 0, 1, 2, 3, 5, 7, 10, 14, 30];
  for (let [name, value] of [
    ['windowForDeletingTime', data.windowForDeletingTime],
    ['windowForAddingOfflineTime', data.windowForAddingOfflineTime]
  ] as const) {
    if (value !== undefined && !allowedWindows.includes(value)) {
      throw createApiServiceError(`${name} must be one of ${allowedWindows.join(', ')}.`);
    }
  }
};
