import { createAxios } from 'slates';

let BASE_URL = 'https://www.timecamp.com/third_party/api';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: config.token
      }
    });
  }

  // ---- Time Entries ----

  async getTimeEntries(params: {
    from?: string;
    to?: string;
    taskIds?: string;
    userIds?: string;
    withSubtasks?: number;
  }) {
    let response = await this.axios.get('/entries', {
      params: {
        from: params.from,
        to: params.to,
        task_ids: params.taskIds,
        user_ids: params.userIds,
        with_subtasks: params.withSubtasks
      }
    });
    return response.data as TimeEntry[];
  }

  async createTimeEntry(entry: {
    date?: string;
    start?: string;
    end?: string;
    duration?: number;
    note?: string;
    taskId?: number;
    billable?: number;
  }) {
    let response = await this.axios.post('/entries', {
      date: entry.date,
      start: entry.start,
      end: entry.end,
      duration: entry.duration,
      note: entry.note,
      task_id: entry.taskId,
      billable: entry.billable
    });
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
    billable?: number;
  }) {
    let response = await this.axios.put('/entries', {
      id: entry.entryId,
      date: entry.date,
      duration: entry.duration,
      start_time: entry.startTime,
      end_time: entry.endTime,
      note: entry.note,
      task_id: entry.taskId,
      billable: entry.billable
    });
    return response.data;
  }

  async deleteTimeEntry(entryId: number) {
    let response = await this.axios.delete('/entries', {
      params: { id: entryId }
    });
    return response.data;
  }

  // ---- Tasks / Projects ----

  async getTasks(taskId?: number) {
    let response = await this.axios.get('/tasks', {
      params: taskId ? { task_id: taskId } : undefined
    });
    let data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return Object.values(data) as Task[];
    }
    return (data || []) as Task[];
  }

  async createTask(task: {
    name: string;
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
    role?: string;
  }) {
    let response = await this.axios.post('/tasks', {
      name: task.name,
      parent_id: task.parentId,
      tags: task.tags,
      note: task.note,
      billable: task.billable,
      budget_unit: task.budgetUnit,
      archived: task.archived,
      budgeted: task.budgeted,
      external_task_id: task.externalTaskId,
      external_parent_id: task.externalParentId,
      user_ids: task.userIds,
      role: task.role
    });
    return response.data;
  }

  async updateTask(task: {
    taskId: number;
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
    role?: string;
  }) {
    let response = await this.axios.put('/tasks', {
      task_id: task.taskId,
      name: task.name,
      parent_id: task.parentId,
      tags: task.tags,
      note: task.note,
      billable: task.billable,
      budget_unit: task.budgetUnit,
      archived: task.archived,
      budgeted: task.budgeted,
      external_task_id: task.externalTaskId,
      external_parent_id: task.externalParentId,
      user_ids: task.userIds,
      role: task.role
    });
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.axios.delete('/tasks', {
      params: { task_id: taskId }
    });
    return response.data;
  }

  // ---- Timer ----

  async getTimerStatus() {
    let response = await this.axios.get('/timer', {
      params: { action: 'status' }
    });
    return response.data;
  }

  async startTimer(taskId?: number) {
    let response = await this.axios.post('/timer', {
      action: 'start',
      task_id: taskId
    });
    return response.data;
  }

  async stopTimer(timerId?: number) {
    let response = await this.axios.put('/timer', {
      action: 'stop',
      timer_id: timerId
    });
    return response.data;
  }

  // ---- Users ----

  async getUsers() {
    let response = await this.axios.get('/users');
    let data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return Object.values(data) as User[];
    }
    return (data || []) as User[];
  }

  async getCurrentUser() {
    let response = await this.axios.get('/me');
    return response.data as User;
  }

  // ---- Clients ----

  async getClients() {
    let response = await this.axios.get('/clients');
    return response.data as TimeCampClient[];
  }

  async createClient(client: { name: string; address?: string; currencyId?: number }) {
    let response = await this.axios.post('/clients', {
      name: client.name,
      address: client.address,
      currency_id: client.currencyId
    });
    return response.data;
  }

  async updateClient(client: {
    clientId: number;
    name?: string;
    address?: string;
    currencyId?: number;
  }) {
    let response = await this.axios.put('/clients', {
      client_id: client.clientId,
      name: client.name,
      address: client.address,
      currency_id: client.currencyId
    });
    return response.data;
  }

  // ---- Tags ----

  async getTags() {
    let response = await this.axios.get('/tags');
    return response.data;
  }

  async createTag(name: string) {
    let response = await this.axios.post('/tags', {
      name
    });
    return response.data;
  }

  async updateTag(tagId: number, name: string) {
    let response = await this.axios.put('/tags', {
      tag_id: tagId,
      name
    });
    return response.data;
  }

  // ---- Attendance ----

  async getAttendance(params: { date?: string; userId?: number }) {
    let response = await this.axios.get('/attendance', {
      params: {
        date: params.date,
        user_id: params.userId
      }
    });
    return response.data;
  }

  // ---- Away Time ----

  async getAwayTime(params: { date?: string; userId?: number }) {
    let response = await this.axios.get('/away_time', {
      params: {
        date: params.date,
        user_id: params.userId
      }
    });
    return response.data;
  }

  // ---- Invoices ----

  async getInvoices() {
    let response = await this.axios.get('/invoices');
    return response.data;
  }

  async createInvoice(invoice: {
    clientId: number;
    date?: string;
    currencyId?: number;
    note?: string;
  }) {
    let response = await this.axios.post('/invoices', {
      client_id: invoice.clientId,
      date: invoice.date,
      currency_id: invoice.currencyId,
      note: invoice.note
    });
    return response.data;
  }

  // ---- Groups ----

  async getGroups() {
    let response = await this.axios.get('/group');
    return response.data;
  }
}

// ---- Type Definitions ----

export interface TimeEntry {
  id: string;
  duration: string;
  user_id: string;
  user_name: string;
  task_id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  locked: string;
  billable: string;
  invoiceId: string;
  description: string;
  last_modify: string;
}

export interface Task {
  task_id: string;
  parent_id: string;
  name: string;
  level: string;
  archived: string;
  color: string;
  tags: string;
  budgeted: string;
  billable: string;
  note: string;
  budget_unit: string;
  external_task_id: string;
  external_parent_id: string;
  user_ids: string;
  role: string;
}

export interface User {
  user_id: string;
  email: string;
  display_name: string;
  login_count: string;
  synch_online: string;
  role_id: string;
  group_id: string;
}

export interface TimeCampClient {
  client_id: string;
  name: string;
  address: string;
  currency_id: string;
}
