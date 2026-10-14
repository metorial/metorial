import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

const BASE_URL = 'https://app.timecamp.com/third_party/api';
type ResourceId = string | number;
type RecordData = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordData =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// TimeCamp returns both arrays and dictionaries keyed by resource ID.
export const timeCampRecords = (value: unknown, identityKey?: string): RecordData[] => {
  if (value == null) return [];
  const records = Array.isArray(value)
    ? value
    : isRecord(value)
      ? identityKey && identityKey in value
        ? [value]
        : Object.values(value)
      : undefined;
  if (!records || records.some(record => !isRecord(record))) {
    throw createApiServiceError('TimeCamp returned an invalid resource collection.');
  }
  return records as RecordData[];
};

// Task creation returns a dictionary, tag creation returns a scalar, and v3
// entry creation wraps the resource in data.
export const timeCampCreatedId = (
  value: unknown,
  keys: string[],
  resource: string
): string => {
  let candidate: unknown = value;
  if (isRecord(value)) {
    const record = isRecord(value.data) ? value.data : value;
    candidate = keys.map(key => record[key]).find(id => id != null && id !== '');
    if (candidate === undefined) {
      const nested = Object.values(record).find(
        item => isRecord(item) && keys.some(key => item[key] != null && item[key] !== '')
      );
      if (isRecord(nested)) {
        candidate = keys.map(key => nested[key]).find(id => id != null && id !== '');
      }
    }
  }
  if (
    (typeof candidate !== 'string' && typeof candidate !== 'number') ||
    String(candidate).trim() === ''
  ) {
    throw createApiServiceError(
      `TimeCamp did not return an ID for the created ${resource}. Check the account before retrying.`
    );
  }
  return String(candidate);
};

const parseIds = (value: string | undefined, field: string): number[] | undefined => {
  if (value === undefined) return undefined;
  const parts = value.split(',').map(part => part.trim());
  if (parts.some(part => !/^\d+$/.test(part) || !Number.isSafeInteger(Number(part)))) {
    throw createApiServiceError(`${field} must contain comma-separated numeric IDs.`);
  }
  return [...new Set(parts.map(Number))];
};

const budgetValue = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw createApiServiceError(
      'Budgeted must be a non-negative integer expressed as a string.'
    );
  }
  return Number(value);
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    const token = config.token.trim().replace(/^Bearer\s+/i, '');
    if (!token) throw createApiServiceError('A TimeCamp API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TimeCamp',
          reason: 'timecamp_api_error'
        })
    });
  }

  async getTimeEntries(params: {
    from: string;
    to: string;
    taskIds?: string;
    userIds?: string;
    withSubtasks?: boolean;
  }) {
    let userIds: number[] | undefined;
    if (params.userIds === 'me') {
      const user = await this.getCurrentUser();
      userIds = parseIds(String(user.user_id), 'userIds');
    } else {
      userIds = parseIds(params.userIds, 'userIds');
    }
    const response = await this.axios.post(
      '/v3/time-entries/list',
      pickDefined({
        startDate: params.from,
        endDate: params.to,
        taskIds: parseIds(params.taskIds, 'taskIds'),
        userIds,
        withSubtasks: params.withSubtasks,
        useLegacyDefaultUserScope: true
      })
    );
    return timeCampRecords(response.data, 'id') as unknown as TimeEntry[];
  }

  async createTimeEntry(entry: {
    date?: string;
    start?: string;
    end?: string;
    duration?: number;
    note?: string;
    taskId?: number;
    billable?: boolean;
  }) {
    if (
      (entry.start === undefined) !== (entry.end === undefined) ||
      (entry.duration === undefined && entry.start === undefined) ||
      (entry.duration !== undefined && entry.start !== undefined)
    ) {
      throw createApiServiceError(
        'Provide either duration or both start and end for the time entry.'
      );
    }
    if (
      entry.duration !== undefined &&
      (!Number.isSafeInteger(entry.duration) || entry.duration < 0)
    ) {
      throw createApiServiceError(
        'Duration must be a non-negative integer number of seconds.'
      );
    }
    const start = entry.start?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
    const end = entry.end?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
    if (
      entry.start !== undefined &&
      (!start ||
        !end ||
        start[1] !== end[1] ||
        (entry.date !== undefined && entry.date !== start[1]))
    ) {
      throw createApiServiceError(
        'Start and end must be YYYY-MM-DD HH:MM:SS on the same date, matching date when provided. Split entries that span midnight.'
      );
    }
    const response = await this.axios.post(
      '/v3/time-entries/create',
      pickDefined({
        date: entry.date ?? start?.[1] ?? new Date().toISOString().slice(0, 10),
        startTime: start?.[2],
        endTime: end?.[2],
        duration: entry.duration,
        note: entry.note,
        taskId: entry.taskId,
        billable: entry.billable
      })
    );
    return response.data;
  }

  async updateTimeEntry(entry: {
    entryId: number;
    date?: string;
    duration?: number;
    startTime?: string;
    endTime?: string;
    note?: string;
    taskId?: number;
    billable?: boolean;
  }) {
    const body = pickDefined({
      date: entry.date,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.endTime,
      note: entry.note,
      taskId: entry.taskId,
      billable: entry.billable
    });
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one time entry field to update.');
    const response = await this.axios.put(`/v3/time-entries/${entry.entryId}`, body);
    return response.data;
  }

  async deleteTimeEntry(entryId: number) {
    const response = await this.axios.delete(`/v3/time-entries/${entryId}`);
    return response.status !== 204;
  }

  async getTasks(taskId?: number, status?: 'active' | 'archived' | 'all') {
    const response = await this.axios.get('/tasks', {
      params: pickDefined({ task_id: taskId, status })
    });
    return timeCampRecords(response.data, 'task_id') as unknown as Task[];
  }

  async createTask(task: TaskInput & { name: string }) {
    const response = await this.axios.post('/tasks', this.taskBody(task));
    return response.data;
  }

  async updateTask(task: TaskInput & { taskId: number }) {
    const body = this.taskBody(task);
    if (Object.keys(body).length === 1)
      throw createApiServiceError('Provide at least one task field to update.');
    const response = await this.axios.put('/tasks', body);
    return response.data;
  }

  private taskBody(task: TaskInput & { taskId?: number }) {
    if (task.budgetUnit !== undefined && !['', 'hours', 'fee'].includes(task.budgetUnit)) {
      throw createApiServiceError('Budget unit must be hours, fee, or an empty string.');
    }
    return pickDefined({
      task_id: task.taskId,
      name: task.name,
      parent_id: task.parentId,
      tags: task.tags,
      note: task.note,
      billable: task.billable,
      budget_unit: task.budgetUnit,
      archived: task.archived,
      budgeted: budgetValue(task.budgeted),
      external_task_id: task.externalTaskId,
      external_parent_id: task.externalParentId,
      user_ids: task.userIds,
      role: task.role
    });
  }

  async deleteTask(taskId: number) {
    const response = await this.axios.delete('/tasks', { params: { task_id: taskId } });
    return response.data;
  }

  async getTimerStatus() {
    const response = await this.axios.get<TimerResponse>('/v3/timer/status');
    return response.data;
  }

  async startTimer(taskId?: number) {
    const response = await this.axios.post<TimerResponse>(
      '/v3/timer/start',
      pickDefined({ taskId, entryId: 'create' })
    );
    return response.data;
  }

  async stopTimer(timerId?: number) {
    const response = await this.axios.post<TimerResponse>(
      '/v3/timer/stop',
      pickDefined({ timerId })
    );
    return response.data;
  }

  async getUsers() {
    const response = await this.axios.get('/users');
    return timeCampRecords(response.data, 'user_id') as unknown as User[];
  }

  async getCurrentUser() {
    const response = await this.axios.get<User>('/me');
    if (!isRecord(response.data)) {
      throw createApiServiceError('TimeCamp returned an invalid current user profile.');
    }
    timeCampCreatedId(response.data, ['user_id'], 'user');
    return response.data;
  }

  async getClients() {
    const response = await this.axios.get('/clients');
    return timeCampRecords(response.data, 'client_id') as unknown as TimeCampClient[];
  }

  async createClient(client: { name: string; address?: string; currencyId?: number }) {
    const response = await this.axios.post(
      '/clients',
      pickDefined({
        name: client.name,
        address: client.address,
        currency_id: client.currencyId
      })
    );
    return response.data;
  }

  async updateClient(client: {
    clientId: number;
    name?: string;
    address?: string;
    currencyId?: number;
  }) {
    const response = await this.axios.put(
      '/clients',
      pickDefined({
        client_id: client.clientId,
        name: client.name,
        address: client.address,
        currency_id: client.currencyId
      })
    );
    return response.data;
  }

  async getTagLists() {
    const response = await this.axios.get('/tag_list');
    return timeCampRecords(response.data, 'id');
  }

  async getTags(tagListId?: number) {
    const lists = tagListId === undefined ? await this.getTagLists() : [{ id: tagListId }];
    const results: RecordData[] = [];
    for (const list of lists) {
      const id = timeCampCreatedId(list, ['id'], 'tag list');
      const response = await this.axios.get(`/tag_list/${encodeURIComponent(id)}/tags`);
      results.push(
        ...timeCampRecords(response.data, 'id').map(tag => ({ ...tag, tagListId: id }))
      );
    }
    return results;
  }

  async createTag(name: string, tagListId?: number) {
    if (tagListId === undefined)
      throw createApiServiceError(
        'tagListId is required when creating a tag. Call list_tag_lists to choose a tag list.'
      );
    const response = await this.axios.post('/tag', { list: tagListId, name });
    return response.data;
  }

  async updateTag(tagId: number, name: string) {
    const response = await this.axios.put(`/tag/${tagId}`, { name });
    return response.data;
  }

  async getAttendance(params: { date?: string; userId?: number; from?: string; to?: string }) {
    if (params.date !== undefined && (params.from !== undefined || params.to !== undefined)) {
      throw createApiServiceError('Provide date or a from/to range for attendance, not both.');
    }
    const from = params.from ?? params.date;
    const to = params.to ?? params.date;
    if (!from || !to)
      throw createApiServiceError(
        'Provide date for a single day, or both from and to for attendance.'
      );
    if (from > to) throw createApiServiceError('Attendance from must be on or before to.');
    const response = await this.axios.get('/attendance', {
      params: pickDefined({
        from,
        to,
        users: params.userId === undefined ? undefined : String(params.userId)
      })
    });
    return response.data;
  }

  async getAwayTime(params: { date?: string; userId?: number }) {
    const response = await this.axios.get('/away_time', {
      params: pickDefined({ date: params.date, user_id: params.userId })
    });
    return response.data;
  }

  async getInvoices() {
    const response = await this.axios.get('/invoices');
    return timeCampRecords(response.data, 'invoice_id');
  }

  async createInvoice(invoice: {
    clientId: number;
    date?: string;
    currencyId?: number;
    note?: string;
  }) {
    const response = await this.axios.post(
      '/invoices',
      pickDefined({
        client_id: invoice.clientId,
        date: invoice.date,
        currency_id: invoice.currencyId,
        note: invoice.note
      })
    );
    return response.data;
  }

  async getGroups() {
    const response = await this.axios.get('/group');
    return timeCampRecords(response.data, 'group_id');
  }
}

interface TaskInput {
  name?: string;
  parentId?: number;
  tags?: string;
  note?: string;
  billable?: number;
  budgetUnit?: string;
  archived?: number;
  budgeted?: string;
  externalTaskId?: string;
  externalParentId?: string;
  userIds?: string;
  role?: number;
}

export interface TimeEntry {
  id: ResourceId;
  duration: ResourceId;
  user: { id: ResourceId; display_name?: string | null } | null;
  task: { id: ResourceId; name?: string | null } | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  billable: boolean;
  description?: string | null;
  last_modify?: string | null;
}

export interface Task {
  task_id: ResourceId;
  parent_id?: ResourceId | null;
  name?: string | null;
  level?: ResourceId | null;
  archived?: ResourceId | null;
  tags?: string | null;
  budgeted?: ResourceId | null;
  billable?: ResourceId | null;
  note?: string | null;
}

export interface User {
  user_id: ResourceId;
  email?: string | null;
  display_name?: string | null;
  role_id?: ResourceId | null;
  group_id?: ResourceId | null;
  root_group_id?: ResourceId | null;
  permissions?: Record<string, boolean>;
}

export interface TimeCampClient {
  client_id: ResourceId;
  name?: string | null;
  address?: string | null;
  currency_id?: ResourceId | null;
}

export interface TimerResponse {
  timer: {
    id?: number | null;
    isRunning?: boolean;
    isNew?: boolean;
    userId?: number | null;
    startedAt?: string | null;
    elapsed?: number | null;
  };
  entry?: { id?: number | null; note?: string | null } | null;
  task?: { id?: number | null; name?: string | null } | null;
}
