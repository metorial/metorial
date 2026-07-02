import { createAxios } from 'slates';
import {
  buildXml,
  camelizeKeys,
  hyphenateKeys,
  parseXml,
  parseXmlList,
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
  userId?: string;
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
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.worksnaps.com/api',
      auth: {
        username: token,
        password: 'ignored'
      },
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml'
      }
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
    let parsed = parseXml(response.data as string);
    let project = parsed.project || parsed;
    return camelizeKeys(project) as Record<string, unknown>;
  }

  async createProject(data: ProjectData): Promise<Record<string, unknown>> {
    let body = buildXml('project', hyphenateKeys(data) as XmlObject);
    let response = await this.http.post('/projects.xml', body);
    let parsed = parseXml(response.data as string);
    let project = parsed.project || parsed;
    return camelizeKeys(project) as Record<string, unknown>;
  }

  async updateProject(projectId: string, data: ProjectData): Promise<Record<string, unknown>> {
    let body = buildXml('project', hyphenateKeys(data) as XmlObject);
    let response = await this.http.put(`/projects/${projectId}.xml`, body);
    let parsed = parseXml(response.data as string);
    let project = parsed.project || parsed;
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
    let parsed = parseXml(response.data as string);
    let task = parsed.task || parsed;
    return camelizeKeys(task) as Record<string, unknown>;
  }

  async createTask(projectId: string, data: TaskData): Promise<Record<string, unknown>> {
    let body = buildXml('task', hyphenateKeys(data) as XmlObject);
    let response = await this.http.post(`/projects/${projectId}/tasks.xml`, body);
    let parsed = parseXml(response.data as string);
    let task = parsed.task || parsed;
    return camelizeKeys(task) as Record<string, unknown>;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: TaskData
  ): Promise<Record<string, unknown>> {
    let body = buildXml('task', hyphenateKeys(data) as XmlObject);
    let response = await this.http.put(`/projects/${projectId}/tasks/${taskId}.xml`, body);
    let parsed = parseXml(response.data as string);
    let task = parsed.task || parsed;
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
    let params: Record<string, string> = {
      user_ids: filter.userIds,
      from_timestamp: filter.fromTimestamp,
      to_timestamp: filter.toTimestamp
    };
    if (filter.taskIds) params.task_ids = filter.taskIds;
    if (filter.timeEntryType) params.time_entry_type = filter.timeEntryType;
    let response = await this.http.get(`/projects/${projectId}/time_entries.xml`, { params });
    let items = parseXmlList(response.data as string, 'time-entry');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async listUserTimeEntries(
    projectId: string,
    userId: string,
    filter: UserTimeEntryFilter
  ): Promise<Record<string, unknown>[]> {
    let params: Record<string, string> = {
      from_timestamp: filter.fromTimestamp,
      to_timestamp: filter.toTimestamp
    };
    if (filter.timeEntryType) params.time_entry_type = filter.timeEntryType;
    let response = await this.http.get(
      `/projects/${projectId}/users/${userId}/time_entries.xml`,
      { params }
    );
    let items = parseXmlList(response.data as string, 'time-entry');
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
    let parsed = parseXml(response.data as string);
    let entry = parsed['time-entry'] || parsed;
    return camelizeKeys(entry) as Record<string, unknown>;
  }

  async updateTimeEntry(
    projectId: string,
    timeEntryId: string,
    data: TimeEntryUpdate
  ): Promise<void> {
    let xmlData: XmlObject = {};
    if (data.taskId !== undefined) xmlData['task-id'] = data.taskId;
    if (data.userComment !== undefined) xmlData['user-comment'] = data.userComment;
    let body = buildXml('time-entry', xmlData);
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
    let xmlData: XmlObject = {
      'from-timestamp': data.fromTimestamp,
      'duration-in-minutes': data.durationInMinutes
    };
    if (data.taskId) xmlData['task-id'] = data.taskId;
    if (data.userComment) xmlData['user-comment'] = data.userComment;

    let body = buildXml('time-entry', xmlData);
    let url = userId
      ? `/projects/${projectId}/users/${userId}/time_entries.xml`
      : `/projects/${projectId}/time_entries.xml`;
    let response = await this.http.post(url, body);
    let parsed = parseXml(response.data as string);
    let entry = parsed['time-entry'] || parsed;
    return camelizeKeys(entry) as Record<string, unknown>;
  }

  // =====================
  // User Assignments
  // =====================

  async listUserAssignments(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.http.get(`/projects/${projectId}/user_assignments.xml`);
    let items = parseXmlList(response.data as string, 'user-assignment');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getUserAssignment(
    projectId: string,
    userAssignmentId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.http.get(
      `/projects/${projectId}/user_assignments/${userAssignmentId}.xml`
    );
    let parsed = parseXml(response.data as string);
    let assignment = parsed['user-assignment'] || parsed;
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async createUserAssignment(
    projectId: string,
    data: UserAssignmentData
  ): Promise<Record<string, unknown>> {
    let xmlData: XmlObject = {};
    if (data.userId !== undefined) xmlData['user-id'] = data.userId;
    if (data.role !== undefined) xmlData.role = data.role;
    if (data.hourlyRate !== undefined) xmlData['hourly-rate'] = data.hourlyRate;
    if (data.flagAllowLoggingTime !== undefined)
      xmlData['flag-allow-logging-time'] = data.flagAllowLoggingTime;
    if (data.windowForDeletingTime !== undefined)
      xmlData['window-for-deleting-time'] = data.windowForDeletingTime;
    if (data.windowForAddingOfflineTime !== undefined)
      xmlData['window-for-adding-offline-time'] = data.windowForAddingOfflineTime;
    let body = buildXml('user-assignment', xmlData);
    let response = await this.http.post(`/projects/${projectId}/user_assignments.xml`, body);
    let parsed = parseXml(response.data as string);
    let assignment = parsed['user-assignment'] || parsed;
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async updateUserAssignment(
    projectId: string,
    userAssignmentId: string,
    data: UserAssignmentData
  ): Promise<Record<string, unknown>> {
    let xmlData: XmlObject = {};
    if (data.hourlyRate !== undefined) xmlData['hourly-rate'] = data.hourlyRate;
    if (data.flagAllowLoggingTime !== undefined)
      xmlData['flag-allow-logging-time'] = data.flagAllowLoggingTime;
    if (data.windowForDeletingTime !== undefined)
      xmlData['window-for-deleting-time'] = data.windowForDeletingTime;
    if (data.windowForAddingOfflineTime !== undefined)
      xmlData['window-for-adding-offline-time'] = data.windowForAddingOfflineTime;
    let body = buildXml('user-assignment', xmlData);
    let response = await this.http.put(
      `/projects/${projectId}/user_assignments/${userAssignmentId}.xml`,
      body
    );
    let parsed = parseXml(response.data as string);
    let assignment = parsed['user-assignment'] || parsed;
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
    let items = parseXmlList(response.data as string, 'task-assignment');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getTaskAssignment(
    projectId: string,
    taskAssignmentId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.http.get(
      `/projects/${projectId}/task_assignments/${taskAssignmentId}.xml`
    );
    let parsed = parseXml(response.data as string);
    let assignment = parsed['task-assignment'] || parsed;
    return camelizeKeys(assignment) as Record<string, unknown>;
  }

  async createTaskAssignment(
    projectId: string,
    data: TaskAssignmentData
  ): Promise<Record<string, unknown>> {
    let xmlData: XmlObject = {
      'user-id': data.userId,
      'task-id': data.taskId
    };
    let body = buildXml('task-assignment', xmlData);
    let response = await this.http.post(`/projects/${projectId}/task_assignments.xml`, body);
    let parsed = parseXml(response.data as string);
    let assignment = parsed['task-assignment'] || parsed;
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
    let parsed = parseXml(response.data as string);
    let user = parsed.user || parsed;
    return camelizeKeys(user) as Record<string, unknown>;
  }

  async listUsers(): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/users.xml');
    let items = parseXmlList(response.data as string, 'user');
    return items.map(item => camelizeKeys(item) as Record<string, unknown>);
  }

  async getUser(userId: string): Promise<Record<string, unknown>> {
    let response = await this.http.get(`/users/${userId}.xml`);
    let parsed = parseXml(response.data as string);
    let user = parsed.user || parsed;
    return camelizeKeys(user) as Record<string, unknown>;
  }

  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let body = buildXml('user', hyphenateKeys(data) as XmlObject);
    let response = await this.http.put(`/users/${userId}.xml`, body);
    let parsed = parseXml(response.data as string);
    let user = parsed.user || parsed;
    return camelizeKeys(user) as Record<string, unknown>;
  }

  // =====================
  // Reports
  // =====================

  async getProjectReport(
    projectId: string,
    filter: ReportFilter
  ): Promise<Record<string, unknown>> {
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
