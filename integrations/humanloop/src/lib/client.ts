import { createAxios } from 'slates';

let BASE_URL = 'https://api.humanloop.com/v5';

export interface PaginatedResponse<T> {
  records: T[];
  page: number;
  size: number;
  total: number;
}

export interface ListParams {
  page?: number;
  size?: number;
  name?: string;
  userFilter?: string;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  order?: 'asc' | 'desc';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private buildListParams(params?: ListParams): Record<string, string | number> {
    let query: Record<string, string | number> = {};
    if (params?.page) query.page = params.page;
    if (params?.size) query.size = params.size;
    if (params?.name) query.name = params.name;
    if (params?.userFilter) query.user_filter = params.userFilter;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.order) query.order = params.order;
    return query;
  }

  // ─── Prompts ───

  async listPrompts(params?: ListParams) {
    let response = await this.axios.get('/prompts', { params: this.buildListParams(params) });
    return response.data as PaginatedResponse<any>;
  }

  async getPrompt(promptId: string, options?: { versionId?: string; environment?: string }) {
    let params: Record<string, string> = {};
    if (options?.versionId) params.version_id = options.versionId;
    if (options?.environment) params.environment = options.environment;
    let response = await this.axios.get(`/prompts/${promptId}`, { params });
    return response.data;
  }

  async upsertPrompt(body: Record<string, any>) {
    let response = await this.axios.post('/prompts', body);
    return response.data;
  }

  async updatePrompt(promptId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/prompts/${promptId}`, body);
    return response.data;
  }

  async deletePrompt(promptId: string) {
    await this.axios.delete(`/prompts/${promptId}`);
  }

  async listPromptVersions(promptId: string) {
    let response = await this.axios.get(`/prompts/${promptId}/versions`);
    return response.data;
  }

  async deployPromptVersion(promptId: string, environmentId: string, versionId: string) {
    let response = await this.axios.post(
      `/prompts/${promptId}/environments/${environmentId}`,
      null,
      { params: { version_id: versionId } }
    );
    return response.data;
  }

  async removePromptDeployment(promptId: string, environmentId: string) {
    await this.axios.delete(`/prompts/${promptId}/environments/${environmentId}`);
  }

  async callPrompt(body: Record<string, any>) {
    let response = await this.axios.post('/prompts/call', body);
    return response.data;
  }

  async logPrompt(body: Record<string, any>) {
    let response = await this.axios.post('/prompts/log', body);
    return response.data;
  }

  // ─── Evaluators ───

  async listEvaluators(params?: ListParams) {
    let response = await this.axios.get('/evaluators', {
      params: this.buildListParams(params)
    });
    return response.data as PaginatedResponse<any>;
  }

  async getEvaluator(evaluatorId: string, options?: { versionId?: string }) {
    let params: Record<string, string> = {};
    if (options?.versionId) params.version_id = options.versionId;
    let response = await this.axios.get(`/evaluators/${evaluatorId}`, { params });
    return response.data;
  }

  async upsertEvaluator(body: Record<string, any>) {
    let response = await this.axios.post('/evaluators', body);
    return response.data;
  }

  async updateEvaluator(evaluatorId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/evaluators/${evaluatorId}`, body);
    return response.data;
  }

  async deleteEvaluator(evaluatorId: string) {
    await this.axios.delete(`/evaluators/${evaluatorId}`);
  }

  // ─── Datasets ───

  async listDatasets(params?: ListParams) {
    let response = await this.axios.get('/datasets', { params: this.buildListParams(params) });
    return response.data as PaginatedResponse<any>;
  }

  async getDataset(datasetId: string, options?: { includeDatapoints?: boolean }) {
    let params: Record<string, string> = {};
    if (options?.includeDatapoints) params.include_datapoints = 'true';
    let response = await this.axios.get(`/datasets/${datasetId}`, { params });
    return response.data;
  }

  async upsertDataset(body: Record<string, any>) {
    let response = await this.axios.post('/datasets', body);
    return response.data;
  }

  async updateDataset(datasetId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/datasets/${datasetId}`, body);
    return response.data;
  }

  async deleteDataset(datasetId: string) {
    await this.axios.delete(`/datasets/${datasetId}`);
  }

  async listDatapoints(datasetId: string, params?: { page?: number; size?: number }) {
    let query: Record<string, number> = {};
    if (params?.page) query.page = params.page;
    if (params?.size) query.size = params.size;
    let response = await this.axios.get(`/datasets/${datasetId}/datapoints`, {
      params: query
    });
    return response.data as PaginatedResponse<any>;
  }

  // ─── Flows ───

  async listFlows(params?: ListParams) {
    let response = await this.axios.get('/flows', { params: this.buildListParams(params) });
    return response.data as PaginatedResponse<any>;
  }

  async getFlow(flowId: string, options?: { versionId?: string }) {
    let params: Record<string, string> = {};
    if (options?.versionId) params.version_id = options.versionId;
    let response = await this.axios.get(`/flows/${flowId}`, { params });
    return response.data;
  }

  async upsertFlow(body: Record<string, any>) {
    let response = await this.axios.post('/flows', body);
    return response.data;
  }

  async updateFlow(flowId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/flows/${flowId}`, body);
    return response.data;
  }

  async deleteFlow(flowId: string) {
    await this.axios.delete(`/flows/${flowId}`);
  }

  // ─── Tools (Humanloop Tools, not Slate tools) ───

  async listTools(params?: ListParams) {
    let response = await this.axios.get('/tools', { params: this.buildListParams(params) });
    return response.data as PaginatedResponse<any>;
  }

  async getTool(toolId: string, options?: { versionId?: string }) {
    let params: Record<string, string> = {};
    if (options?.versionId) params.version_id = options.versionId;
    let response = await this.axios.get(`/tools/${toolId}`, { params });
    return response.data;
  }

  async upsertTool(body: Record<string, any>) {
    let response = await this.axios.post('/tools', body);
    return response.data;
  }

  async updateTool(toolId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/tools/${toolId}`, body);
    return response.data;
  }

  async deleteTool(toolId: string) {
    await this.axios.delete(`/tools/${toolId}`);
  }

  // ─── Agents ───

  async listAgents(params?: ListParams) {
    let response = await this.axios.get('/agents', { params: this.buildListParams(params) });
    return response.data as PaginatedResponse<any>;
  }

  async getAgent(agentId: string, options?: { versionId?: string }) {
    let params: Record<string, string> = {};
    if (options?.versionId) params.version_id = options.versionId;
    let response = await this.axios.get(`/agents/${agentId}`, { params });
    return response.data;
  }

  async upsertAgent(body: Record<string, any>) {
    let response = await this.axios.post('/agents', body);
    return response.data;
  }

  // ─── Logs ───

  async listLogs(
    fileId: string,
    params?: {
      page?: number;
      size?: number;
      versionId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let query: Record<string, string | number> = { file_id: fileId };
    if (params?.page) query.page = params.page;
    if (params?.size) query.size = params.size;
    if (params?.versionId) query.version_id = params.versionId;
    if (params?.search) query.search = params.search;
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    let response = await this.axios.get('/logs', { params: query });
    return response.data as PaginatedResponse<any>;
  }

  async getLog(logId: string) {
    let response = await this.axios.get(`/logs/${logId}`);
    return response.data;
  }

  async deleteLogs(logIds: string[]) {
    await this.axios.delete('/logs', { params: { id: logIds } });
  }

  // ─── Evaluations ───

  async listEvaluations(fileId: string, params?: { page?: number; size?: number }) {
    let query: Record<string, string | number> = { file_id: fileId };
    if (params?.page) query.page = params.page;
    if (params?.size) query.size = params.size;
    let response = await this.axios.get('/evaluations', { params: query });
    return response.data as PaginatedResponse<any>;
  }

  async getEvaluation(evaluationId: string) {
    let response = await this.axios.get(`/evaluations/${evaluationId}`);
    return response.data;
  }

  async createEvaluation(body: Record<string, any>) {
    let response = await this.axios.post('/evaluations', body);
    return response.data;
  }

  // ─── Directories ───

  async listDirectories() {
    let response = await this.axios.get('/directories');
    return response.data;
  }

  async getDirectory(directoryId: string) {
    let response = await this.axios.get(`/directories/${directoryId}`);
    return response.data;
  }

  async createDirectory(body: { path: string; parent_id?: string }) {
    let response = await this.axios.post('/directories', body);
    return response.data;
  }

  async updateDirectory(directoryId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/directories/${directoryId}`, body);
    return response.data;
  }

  async deleteDirectory(directoryId: string) {
    await this.axios.delete(`/directories/${directoryId}`);
  }
}
