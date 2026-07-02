import { createAxios } from 'slates';

let BASE_URL = 'https://api.agenty.com/v2';
let BROWSER_BASE_URL = 'https://browser.agenty.com/api';

export class Client {
  private http;
  private browserHttp;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;

    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Agenty-ApiKey': config.token
      }
    });

    this.browserHttp = createAxios({
      baseURL: BROWSER_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Agents ───

  async listAgents(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    order?: string;
    search?: string;
  }) {
    let response = await this.http.get('/agents', { params });
    return response.data;
  }

  async getAgent(agentId: string) {
    let response = await this.http.get(`/agents/${agentId}`);
    return response.data;
  }

  async cloneAgent(agentId: string) {
    let response = await this.http.get(`/agents/${agentId}/clone`);
    return response.data;
  }

  async deleteAgent(agentId: string) {
    let response = await this.http.delete(`/agents/${agentId}`);
    return response.data;
  }

  // ─── Jobs ───

  async startJob(agentId: string) {
    let response = await this.http.post('/jobs/start', { agent_id: agentId });
    return response.data;
  }

  async stopJob(jobId: string) {
    let response = await this.http.get(`/jobs/${jobId}/stop`);
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.http.get(`/jobs/${jobId}`);
    return response.data;
  }

  async getJobResult(
    jobId: string,
    params?: {
      offset?: number;
      limit?: number;
      collection?: number;
      modified?: number;
    }
  ) {
    let response = await this.http.get(`/jobs/${jobId}/result`, { params });
    return response.data;
  }

  async getJobLogs(
    jobId: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ) {
    let response = await this.http.get(`/jobs/${jobId}/logs`, { params });
    return response.data;
  }

  async exportJobResult(
    jobId: string,
    params?: {
      type?: string;
      collection?: number;
      modified?: number;
      filename?: string;
    }
  ) {
    let response = await this.http.get(`/jobs/${jobId}/export`, { params });
    return response.data;
  }

  async listJobs(params?: { agent_id?: string; offset?: number; limit?: number }) {
    let response = await this.http.get('/jobs', { params });
    return response.data;
  }

  // ─── Scheduler ───

  async createSchedule(
    agentId: string,
    schedule: {
      type: string;
      expression: string;
      is_enabled: boolean;
    }
  ) {
    let response = await this.http.post(`/scheduler/${agentId}`, schedule);
    return response.data;
  }

  async getSchedule(agentId: string) {
    let response = await this.http.get(`/scheduler/${agentId}`);
    return response.data;
  }

  async deleteSchedule(agentId: string) {
    let response = await this.http.delete(`/scheduler/${agentId}`);
    return response.data;
  }

  // ─── Inputs ───

  async getInput(agentId: string) {
    let response = await this.http.get(`/inputs/${agentId}`);
    return response.data;
  }

  async updateInput(
    agentId: string,
    input: {
      type: string;
      collection?: number;
      data?: string[];
      id?: string;
      field?: string;
    }
  ) {
    let response = await this.http.put(`/inputs/${agentId}`, input);
    return response.data;
  }

  // ─── Lists ───

  async listLists(params?: { offset?: number; limit?: number }) {
    let response = await this.http.get('/lists', { params });
    return response.data;
  }

  async createList(data: {
    name: string;
    description?: string;
    columns?: Array<{ name: string; type?: string }>;
  }) {
    let response = await this.http.post('/lists', data);
    return response.data;
  }

  async getList(listId: string) {
    let response = await this.http.get(`/lists/${listId}`);
    return response.data;
  }

  async updateList(
    listId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.http.put(`/lists/${listId}`, data);
    return response.data;
  }

  async deleteList(listId: string) {
    let response = await this.http.delete(`/lists/${listId}`);
    return response.data;
  }

  async addListRows(listId: string, rows: Record<string, string>[]) {
    let response = await this.http.post(`/lists/${listId}/rows`, rows);
    return response.data;
  }

  // ─── Browser Automation ───

  async captureScreenshot(params: {
    url?: string;
    html?: string;
    gotoOptions?: { timeout?: number; waitUntil?: string };
    options?: {
      fullPage?: boolean;
      type?: string;
      quality?: number;
      omitBackground?: boolean;
    };
  }) {
    let response = await this.browserHttp.post(`/screenshot?apiKey=${this.token}`, params);
    return response.data;
  }

  async generatePdf(params: {
    url?: string;
    html?: string;
    gotoOptions?: { timeout?: number; waitUntil?: string };
    options?: { format?: string };
  }) {
    let response = await this.browserHttp.post(`/pdf?apiKey=${this.token}`, params);
    return response.data;
  }

  async getContent(params: {
    url: string;
    gotoOptions?: { timeout?: number; waitUntil?: string };
  }) {
    let response = await this.browserHttp.post(`/content?apiKey=${this.token}`, params);
    return response.data;
  }

  async extractStructuredData(url: string) {
    let response = await this.browserHttp.get(
      `/extract?apiKey=${this.token}&url=${encodeURIComponent(url)}`
    );
    return response.data;
  }
}
