import { createAxios } from 'slates';

export interface TimelinkUser {
  id: number;
  name: string;
  email: string;
  [key: string]: any;
}

export interface TimelinkClient {
  id: number;
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  externalId?: string;
  [key: string]: any;
}

export interface TimelinkProject {
  id: number;
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  clientId?: number;
  externalId?: string;
  [key: string]: any;
}

export interface TimelinkService {
  id: number;
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  externalId?: string;
  [key: string]: any;
}

export interface TimelinkTimeEntry {
  id: number;
  start: string;
  end: string;
  clientId?: number;
  projectId?: number;
  serviceId?: number;
  userId?: number;
  description?: string;
  paid?: boolean;
  billable?: boolean;
  externalId?: string;
  [key: string]: any;
}

export interface CreateClientInput {
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  externalId?: string;
}

export interface UpdateClientInput {
  name?: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  externalId?: string;
}

export interface CreateProjectInput {
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  clientId?: number;
  externalId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  billable?: boolean;
  clientId?: number;
  externalId?: string;
}

export interface CreateServiceInput {
  name: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  externalId?: string;
}

export interface UpdateServiceInput {
  name?: string;
  info?: string;
  color?: string;
  acronym?: string;
  active?: boolean;
  externalId?: string;
}

export interface CreateTimeEntryInput {
  start: string;
  end: string;
  clientId?: number;
  projectId?: number;
  serviceId?: number;
  userId?: number;
  description?: string;
  paid?: boolean;
  billable?: boolean;
  externalId?: string;
}

export interface UpdateTimeEntryInput {
  start?: string;
  end?: string;
  clientId?: number;
  projectId?: number;
  serviceId?: number;
  userId?: number;
  description?: string;
  paid?: boolean;
  billable?: boolean;
  externalId?: string;
}

export interface SearchTimeEntriesInput {
  after?: string;
  before?: string;
  clientId?: number;
  projectId?: number;
  serviceId?: number;
  externalId?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.timelink.io/api/v1/',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // Users
  async listUsers(): Promise<TimelinkUser[]> {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getMe(): Promise<TimelinkUser> {
    let response = await this.axios.get('/users/me');
    return response.data;
  }

  // Clients
  async listClients(): Promise<TimelinkClient[]> {
    let response = await this.axios.get('/clients');
    return response.data;
  }

  async getClient(clientId: number): Promise<TimelinkClient> {
    let response = await this.axios.get(`/clients/${clientId}`);
    return response.data;
  }

  async createClient(input: CreateClientInput): Promise<TimelinkClient> {
    let response = await this.axios.post('/clients', this.toSnakeCase(input));
    return response.data;
  }

  async updateClient(clientId: number, input: UpdateClientInput): Promise<TimelinkClient> {
    let response = await this.axios.put(`/clients/${clientId}`, this.toSnakeCase(input));
    return response.data;
  }

  // Projects
  async listProjects(): Promise<TimelinkProject[]> {
    let response = await this.axios.get('/projects');
    return response.data;
  }

  async getProject(projectId: number): Promise<TimelinkProject> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(input: CreateProjectInput): Promise<TimelinkProject> {
    let response = await this.axios.post('/projects', this.toSnakeCase(input));
    return response.data;
  }

  async updateProject(projectId: number, input: UpdateProjectInput): Promise<TimelinkProject> {
    let response = await this.axios.put(`/projects/${projectId}`, this.toSnakeCase(input));
    return response.data;
  }

  // Services
  async listServices(): Promise<TimelinkService[]> {
    let response = await this.axios.get('/services');
    return response.data;
  }

  async getService(serviceId: number): Promise<TimelinkService> {
    let response = await this.axios.get(`/services/${serviceId}`);
    return response.data;
  }

  async createService(input: CreateServiceInput): Promise<TimelinkService> {
    let response = await this.axios.post('/services', this.toSnakeCase(input));
    return response.data;
  }

  async updateService(serviceId: number, input: UpdateServiceInput): Promise<TimelinkService> {
    let response = await this.axios.put(`/services/${serviceId}`, this.toSnakeCase(input));
    return response.data;
  }

  // Time Entries
  async listTimeEntries(params?: SearchTimeEntriesInput): Promise<TimelinkTimeEntry[]> {
    let query = params ? this.toSnakeCase(params) : {};
    let response = await this.axios.get('/time-entries', { params: query });
    return response.data;
  }

  async getTimeEntry(timeEntryId: number): Promise<TimelinkTimeEntry> {
    let response = await this.axios.get(`/time-entries/${timeEntryId}`);
    return response.data;
  }

  async createTimeEntry(input: CreateTimeEntryInput): Promise<TimelinkTimeEntry> {
    let response = await this.axios.post('/time-entries', this.toSnakeCase(input));
    return response.data;
  }

  async updateTimeEntry(
    timeEntryId: number,
    input: UpdateTimeEntryInput
  ): Promise<TimelinkTimeEntry> {
    let response = await this.axios.put(
      `/time-entries/${timeEntryId}`,
      this.toSnakeCase(input)
    );
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: number): Promise<void> {
    await this.axios.delete(`/time-entries/${timeEntryId}`);
  }

  // Webhooks
  async registerWebhook(
    url: string,
    events: string[]
  ): Promise<{ id: string; [key: string]: any }> {
    let response = await this.axios.post('/webhooks', {
      url,
      events
    });
    return response.data;
  }

  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  private toSnakeCase(obj: Record<string, any>): Record<string, any> {
    let result: Record<string, any> = {};
    for (let [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }
}
