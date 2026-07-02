import { createAxios } from 'slates';

let coreApi = createAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/coreAPI'
});

let tasksApi = createAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/tasksAPI'
});

let clientsApi = createAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/clientsAPI'
});

export class MagneticClient {
  private token: string;

  constructor(opts: { token: string }) {
    this.token = opts.token;
  }

  private params(extra: Record<string, string | number | boolean | undefined> = {}) {
    let result: Record<string, string | number | boolean> = { token: this.token };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(): Promise<any[]> {
    let response = await coreApi.get('/users', { params: this.params() });
    return response.data;
  }

  async getUser(): Promise<any> {
    let response = await coreApi.get('/user', { params: this.params() });
    return response.data;
  }

  // ─── Contacts ───────────────────────────────────────────

  async listContacts(): Promise<any[]> {
    let response = await clientsApi.get('/contacts', { params: this.params() });
    return response.data;
  }

  async createContact(data: Record<string, any>): Promise<any> {
    let response = await clientsApi.post('/contact', data, { params: this.params() });
    return response.data;
  }

  // ─── Companies ──────────────────────────────────────────

  async listCompanies(): Promise<any[]> {
    let response = await clientsApi.get('/companies', { params: this.params() });
    return response.data;
  }

  // ─── Opportunities / Jobs (Groupings) ───────────────────

  async listGroupings(): Promise<any[]> {
    let response = await tasksApi.get('/groupings', { params: this.params() });
    return response.data;
  }

  async getGrouping(groupingId: string): Promise<any> {
    let response = await tasksApi.get('/grouping', {
      params: this.params({ id: groupingId })
    });
    return response.data;
  }

  async createGrouping(data: Record<string, any>): Promise<any> {
    let response = await tasksApi.post('/grouping', data, { params: this.params() });
    return response.data;
  }

  // ─── Tasks ──────────────────────────────────────────────

  async listTasks(): Promise<any[]> {
    let response = await tasksApi.get('/tasks', { params: this.params() });
    return response.data;
  }

  async getTask(taskId: string): Promise<any> {
    let response = await tasksApi.get('/task', { params: this.params({ id: taskId }) });
    return response.data;
  }

  async findTasks(searchField: string, searchValue: string): Promise<any[]> {
    let response = await tasksApi.get('/tasks', {
      params: this.params({ searchField, searchValue })
    });
    return response.data;
  }

  async createOrUpdateTask(data: Record<string, any>): Promise<any> {
    let response = await tasksApi.post('/task', data, { params: this.params() });
    return response.data;
  }

  // ─── Notifications ──────────────────────────────────────

  async getNotifications(newOnly: boolean = false): Promise<any[]> {
    let response = await coreApi.get('/notifications', {
      params: this.params({ newOnly })
    });
    return response.data;
  }

  // ─── Contact Records ───────────────────────────────────

  async createContactRecord(data: Record<string, any>): Promise<any> {
    let response = await clientsApi.post('/contactRecord', data, { params: this.params() });
    return response.data;
  }
}
