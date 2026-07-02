import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.cloudconvert.com/v2',
  sandbox: 'https://api.sandbox.cloudconvert.com/v2'
};

let SYNC_BASE_URLS: Record<string, string> = {
  production: 'https://sync.api.cloudconvert.com/v2',
  sandbox: 'https://sync.api.sandbox.cloudconvert.com/v2'
};

export class Client {
  private token: string;
  private baseUrl: string;
  private syncBaseUrl: string;

  constructor(config: { token: string; environment?: string }) {
    this.token = config.token;
    let env = config.environment ?? 'production';
    this.baseUrl = BASE_URLS[env] ?? BASE_URLS.production!;
    this.syncBaseUrl = SYNC_BASE_URLS[env] ?? SYNC_BASE_URLS.production!;
  }

  private getAxios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private getSyncAxios() {
    return createAxios({
      baseURL: this.syncBaseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Jobs ──────────────────────────────────────────────

  async createJob(
    tasks: Record<string, any>,
    tag?: string,
    webhookUrl?: string,
    webhookEvents?: string[]
  ) {
    let axios = this.getAxios();
    let body: Record<string, any> = { tasks };
    if (tag) body.tag = tag;
    if (webhookUrl) {
      body.webhook_url = webhookUrl;
      if (webhookEvents) body.webhook_events = webhookEvents;
    }
    let response = await axios.post('/jobs', body);
    return response.data.data;
  }

  async getJob(jobId: string) {
    let axios = this.getAxios();
    let response = await axios.get(`/jobs/${jobId}`);
    return response.data.data;
  }

  async listJobs(params?: { status?: string; tag?: string; perPage?: number; page?: number }) {
    let axios = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.tag) query['filter[tag]'] = params.tag;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.page) query.page = String(params.page);
    let response = await axios.get('/jobs', { params: query });
    return response.data;
  }

  async deleteJob(jobId: string) {
    let axios = this.getAxios();
    await axios.delete(`/jobs/${jobId}`);
  }

  async waitForJob(jobId: string) {
    let axios = this.getSyncAxios();
    let response = await axios.get(`/jobs/${jobId}`);
    return response.data.data;
  }

  // ── Tasks ─────────────────────────────────────────────

  async createTask(operation: string, body: Record<string, any>) {
    let axios = this.getAxios();
    let response = await axios.post(`/${operation}`, body);
    return response.data.data;
  }

  async getTask(taskId: string) {
    let axios = this.getAxios();
    let response = await axios.get(`/tasks/${taskId}`);
    return response.data.data;
  }

  async listTasks(params?: {
    operation?: string;
    status?: string;
    jobId?: string;
    perPage?: number;
    page?: number;
  }) {
    let axios = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.operation) query['filter[operation]'] = params.operation;
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.jobId) query['filter[job_id]'] = params.jobId;
    if (params?.perPage) query.per_page = String(params.perPage);
    if (params?.page) query.page = String(params.page);
    let response = await axios.get('/tasks', { params: query });
    return response.data;
  }

  async deleteTask(taskId: string) {
    let axios = this.getAxios();
    await axios.delete(`/tasks/${taskId}`);
  }

  async waitForTask(taskId: string) {
    let axios = this.getSyncAxios();
    let response = await axios.get(`/tasks/${taskId}`);
    return response.data.data;
  }

  async cancelTask(taskId: string) {
    let axios = this.getAxios();
    let response = await axios.post(`/tasks/${taskId}/cancel`);
    return response.data.data;
  }

  async retryTask(taskId: string) {
    let axios = this.getAxios();
    let response = await axios.post(`/tasks/${taskId}/retry`);
    return response.data.data;
  }

  // ── Webhooks ──────────────────────────────────────────

  async createWebhook(url: string, events: string[]) {
    let axios = this.getAxios();
    let response = await axios.post('/webhooks', { url, events });
    return response.data.data;
  }

  async getWebhook(webhookId: string) {
    let axios = this.getAxios();
    let response = await axios.get(`/webhooks/${webhookId}`);
    return response.data.data;
  }

  async listWebhooks() {
    let axios = this.getAxios();
    let response = await axios.get('/webhooks');
    return response.data.data;
  }

  async deleteWebhook(webhookId: string) {
    let axios = this.getAxios();
    await axios.delete(`/webhooks/${webhookId}`);
  }

  // ── User ──────────────────────────────────────────────

  async getUser() {
    let axios = this.getAxios();
    let response = await axios.get('/users/me');
    return response.data.data;
  }

  // ── Conversion Formats ────────────────────────────────

  async listConversionFormats(params?: {
    inputFormat?: string;
    outputFormat?: string;
    engine?: string;
    engineVersion?: string;
  }) {
    let axios = this.getAxios();
    let query: Record<string, string> = {};
    if (params?.inputFormat) query['filter[input_format]'] = params.inputFormat;
    if (params?.outputFormat) query['filter[output_format]'] = params.outputFormat;
    if (params?.engine) query['filter[engine]'] = params.engine;
    if (params?.engineVersion) query['filter[engine_version]'] = params.engineVersion;
    let response = await axios.get('/convert/formats', { params: query });
    return response.data.data;
  }
}
