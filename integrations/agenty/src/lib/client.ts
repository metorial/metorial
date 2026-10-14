import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.agenty.com/v2';
let BROWSER_BASE_URL = 'https://browser.agenty.com/api';

export class Client {
  private http;
  private browserHttp;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An Agenty API key is required. Reconnect with a valid key.'
      );
    }

    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Agenty',
        reason: 'agenty_api_error'
      });
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 65000,
      authHeader: { name: 'X-Agenty-ApiKey', value: config.token },
      errorAdapter
    });
    this.browserHttp = createAuthenticatedAxios({
      baseURL: BROWSER_BASE_URL,
      timeout: 65000,
      authHeader: { name: 'X-Agenty-ApiKey', value: config.token },
      errorAdapter
    });
    for (let http of [this.http, this.browserHttp]) {
      http.interceptors.response.use(response => {
        let data = response.data;
        if (isApiErrorRecord(data)) {
          let status = data.status_code;
          if (
            (typeof status === 'number' && status >= 400) ||
            (typeof status === 'string' && /^(error|failed)$/i.test(status))
          ) {
            throw createApiServiceError(
              typeof data.message === 'string'
                ? `Agenty API failed: ${data.message}`
                : 'Agenty rejected the request.',
              { upstreamStatus: typeof status === 'number' ? status : response.status }
            );
          }
        }
        return response;
      });
    }
  }

  private async browserFile(path: string, params: unknown) {
    let response = await this.browserHttp.post(path, params, { responseType: 'arraybuffer' });
    let content = Buffer.from(response.data);
    let legacyData: unknown = content.toString('utf8');
    // Match the previous JSON/text response value while retaining the original file bytes.
    try {
      legacyData = JSON.parse(content.toString('utf8'));
    } catch {}
    if (isApiErrorRecord(legacyData)) {
      throw createApiServiceError(
        'Agenty returned a JSON response instead of the requested file. Check the URL and browser options.'
      );
    }
    return { content, legacyData };
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
    let response = await this.http.get(`/agents/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  async cloneAgent(agentId: string) {
    let response = await this.http.get(`/agents/${encodeURIComponent(agentId)}/clone`);
    return response.data;
  }

  async deleteAgent(agentId: string) {
    let response = await this.http.delete(`/agents/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  // ─── Jobs ───

  async startJob(agentId: string) {
    let response = await this.http.post('/jobs/start', { agent_id: agentId });
    return response.data;
  }

  async stopJob(jobId: string) {
    let response = await this.http.get(`/jobs/${encodeURIComponent(jobId)}/stop`);
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.http.get(`/jobs/${encodeURIComponent(jobId)}`);
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
    let response = await this.http.get(`/jobs/${encodeURIComponent(jobId)}/result`, {
      params
    });
    return response.data;
  }

  async getJobLogs(
    jobId: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ) {
    let response = await this.http.get(`/jobs/${encodeURIComponent(jobId)}/logs`, { params });
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
    let response = await this.http.get(`/jobs/${encodeURIComponent(jobId)}/export`, {
      params
    });
    return response.data;
  }

  async getExportDownload(
    jobId: string,
    params: { type?: string; collection?: number; modified?: number; filename?: string }
  ) {
    let result = await this.exportJobResult(jobId, params);
    let url = result.download_link || result.downloadlink || result.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw createApiServiceError(
        'Agenty did not return an export download URL. Request the export again after the job completes.'
      );
    }
    return { result, url };
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
    let response = await this.http.post(`/scheduler/${encodeURIComponent(agentId)}`, schedule);
    return response.data;
  }

  async getSchedule(agentId: string) {
    let response = await this.http.get(`/scheduler/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  async deleteSchedule(agentId: string) {
    let response = await this.http.delete(`/scheduler/${encodeURIComponent(agentId)}`);
    return response.data;
  }

  // ─── Inputs ───

  async getInput(agentId: string) {
    let response = await this.http.get(`/inputs/${encodeURIComponent(agentId)}`);
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
    let response = await this.http.put(`/inputs/${encodeURIComponent(agentId)}`, input);
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
    let response = await this.http.get(`/lists/${encodeURIComponent(listId)}`);
    return response.data;
  }

  async updateList(
    listId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.http.put(`/lists/${encodeURIComponent(listId)}`, data);
    return response.data;
  }

  async deleteList(listId: string) {
    let response = await this.http.delete(`/lists/${encodeURIComponent(listId)}`);
    return response.data;
  }

  async addListRows(listId: string, rows: Record<string, string>[]) {
    let response = await this.http.post(`/lists/${encodeURIComponent(listId)}/rows`, rows);
    return response.data;
  }

  async listListRows(
    listId: string,
    params: { offset?: number; limit?: number; sort?: string; order?: string }
  ) {
    let response = await this.http.get(`/lists/${encodeURIComponent(listId)}/rows`, {
      params
    });
    return response.data;
  }

  async getListRow(listId: string, rowId: string) {
    let response = await this.http.get(
      `/lists/${encodeURIComponent(listId)}/rows/${encodeURIComponent(rowId)}`
    );
    return response.data;
  }

  async updateListRow(listId: string, rowId: string, row: Record<string, string>) {
    let response = await this.http.put(
      `/lists/${encodeURIComponent(listId)}/rows/${encodeURIComponent(rowId)}`,
      { ...row, _id: rowId }
    );
    return response.data;
  }

  async deleteListRow(listId: string, rowId: string) {
    let response = await this.http.delete(
      `/lists/${encodeURIComponent(listId)}/rows/${encodeURIComponent(rowId)}`
    );
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
    return this.browserFile('/screenshot', params);
  }

  async generatePdf(params: {
    url?: string;
    html?: string;
    gotoOptions?: { timeout?: number; waitUntil?: string };
    options?: { format?: string };
  }) {
    return this.browserFile('/pdf', params);
  }

  async getContent(params: {
    url: string;
    gotoOptions?: { timeout?: number; waitUntil?: string };
  }) {
    let response = await this.browserHttp.post('/content', params);
    return response.data;
  }

  async extractStructuredData(url: string) {
    let response = await this.browserHttp.get('/extract', { params: { url } });
    return response.data;
  }
}
