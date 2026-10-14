import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let apiOptions = {
  errorAdapter: (error: unknown) =>
    buildApiServiceError(error, {
      providerLabel: 'Magnetic',
      reason: 'magnetic_api_error'
    })
};

let coreApi = createAuthenticatedAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/coreAPI',
  ...apiOptions
});

let tasksApi = createAuthenticatedAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/tasksAPI',
  ...apiOptions
});

let clientsApi = createAuthenticatedAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/clientsAPI',
  ...apiOptions
});

export class MagneticClient {
  private token: string;

  constructor(opts: { token: string }) {
    if (typeof opts.token !== 'string' || !opts.token.trim()) {
      throw createApiServiceError('A Magnetic API token is required. Reconnect your account.');
    }
    this.token = opts.token;
  }

  private params(extra: Record<string, string | number | boolean | undefined> = {}) {
    return pickDefined({ token: this.token, ...extra });
  }

  private record(data: unknown, resource: string): Record<string, any> {
    if (
      !isApiErrorRecord(data) ||
      !(
        (typeof data.id === 'string' && data.id.trim().length > 0) ||
        (typeof data.id === 'number' && Number.isFinite(data.id))
      )
    ) {
      throw createApiServiceError(`Magnetic returned an invalid ${resource} response.`, {
        reason: 'magnetic_invalid_response'
      });
    }
    return data;
  }

  private records(data: unknown, resource: string): Record<string, any>[] {
    if (!Array.isArray(data)) {
      throw createApiServiceError(`Magnetic returned an invalid ${resource} list.`, {
        reason: 'magnetic_invalid_response'
      });
    }
    return data.map(record => this.record(record, resource));
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(): Promise<any[]> {
    let response = await coreApi.get('/users', { params: this.params() });
    return this.records(response.data, 'user');
  }

  async getUser(): Promise<any> {
    let response = await coreApi.get('/user', { params: this.params() });
    return this.record(response.data, 'user');
  }

  // ─── Contacts ───────────────────────────────────────────

  async listContacts(): Promise<any[]> {
    let response = await clientsApi.get('/contacts', { params: this.params() });
    return this.records(response.data, 'contact');
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await clientsApi.post('/contact', data, { params: this.params() });
    return this.record(response.data, 'contact');
  }

  // ─── Companies ──────────────────────────────────────────

  async listCompanies(): Promise<any[]> {
    let response = await clientsApi.get('/companies', { params: this.params() });
    return this.records(response.data, 'company');
  }

  // ─── Opportunities / Jobs (Groupings) ───────────────────

  async listGroupings(): Promise<any[]> {
    let response = await tasksApi.get('/groupings', { params: this.params() });
    return this.records(response.data, 'opportunity/job');
  }

  async getGrouping(groupingId: string): Promise<any> {
    let response = await tasksApi.get('/grouping', {
      params: this.params({ id: groupingId })
    });
    return this.record(response.data, 'opportunity/job');
  }

  async createGrouping(data: Record<string, any>): Promise<any> {
    let response = await tasksApi.post('/grouping', data, { params: this.params() });
    return this.record(response.data, 'opportunity/job');
  }

  // ─── Tasks ──────────────────────────────────────────────

  async listTasks(): Promise<any[]> {
    let response = await tasksApi.get('/tasks', { params: this.params() });
    return this.records(response.data, 'task');
  }

  async getTask(taskId: string): Promise<any> {
    let response = await tasksApi.get('/task', { params: this.params({ id: taskId }) });
    return this.record(response.data, 'task');
  }

  async findTasks(searchField: string, searchValue: string): Promise<any[]> {
    let response = await tasksApi.get('/tasks', {
      params: this.params({ searchField, searchValue })
    });
    return this.records(response.data, 'task');
  }

  async createOrUpdateTask(data: Record<string, any>): Promise<any> {
    let response = await tasksApi.post('/task', data, { params: this.params() });
    return this.record(response.data, 'task');
  }

  // ─── Notifications ──────────────────────────────────────

  async getNotifications(newOnly: boolean = false): Promise<any[]> {
    let response = await coreApi.get('/notifications', {
      params: this.params({ newOnly })
    });
    return this.records(response.data, 'notification');
  }

  // ─── Contact Records ───────────────────────────────────

  async createContactRecord(data: Record<string, any>): Promise<any> {
    let response = await clientsApi.post('/contactRecord', data, { params: this.params() });
    return this.record(response.data, 'contact record');
  }
}
