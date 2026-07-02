import { createAxios } from 'slates';

let BASE_URL = 'https://api.scale.com/v1';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  // ─── Projects ───────────────────────────────────────────────

  async createProject(params: {
    name: string;
    type: string;
    rapid?: boolean;
    studio?: boolean;
    params?: Record<string, any>;
    pipeline?: string;
    consensusAttempts?: number;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      type: params.type
    };
    if (params.rapid !== undefined) body.rapid = params.rapid;
    if (params.studio !== undefined) body.studio = params.studio;
    if (params.params !== undefined) body.params = params.params;
    if (params.pipeline !== undefined) body.pipeline = params.pipeline;
    if (params.consensusAttempts !== undefined)
      body.consensus_attempts = params.consensusAttempts;

    let res = await this.axios.post('/projects', body);
    return res.data;
  }

  async getProject(projectName: string) {
    let res = await this.axios.get(`/projects/${encodeURIComponent(projectName)}`);
    return res.data;
  }

  async listProjects(params?: { archived?: boolean }) {
    let query: Record<string, any> = {};
    if (params?.archived !== undefined) query.archived = params.archived;

    let res = await this.axios.get('/projects', { params: query });
    return res.data;
  }

  async updateProjectParams(
    projectName: string,
    params: {
      patch?: boolean;
      instruction?: string;
      [key: string]: any;
    }
  ) {
    let res = await this.axios.post(
      `/projects/${encodeURIComponent(projectName)}/setParams`,
      params
    );
    return res.data;
  }

  async setProjectOntology(
    projectName: string,
    params: {
      name: string;
      ontology: any[];
    }
  ) {
    let res = await this.axios.post(
      `/projects/${encodeURIComponent(projectName)}/setOntology`,
      params
    );
    return res.data;
  }

  // ─── Tasks ──────────────────────────────────────────────────

  async createTask(taskType: string, params: Record<string, any>) {
    let res = await this.axios.post(`/task/${taskType}`, params);
    return res.data;
  }

  async getTask(taskId: string) {
    let res = await this.axios.get(`/task/${encodeURIComponent(taskId)}`);
    return res.data;
  }

  async listTasks(params?: {
    limit?: number;
    nextToken?: string;
    status?: string;
    type?: string;
    project?: string;
    batch?: string;
    uniqueId?: string;
    tags?: string;
    customerReviewStatus?: string;
    completedAfter?: string;
    completedBefore?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    includeAttachmentUrl?: boolean;
    limitedResponse?: boolean;
  }) {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.nextToken) query.next_token = params.nextToken;
    if (params?.status) query.status = params.status;
    if (params?.type) query.type = params.type;
    if (params?.project) query.project = params.project;
    if (params?.batch) query.batch = params.batch;
    if (params?.uniqueId) query.unique_id = params.uniqueId;
    if (params?.tags) query.tags = params.tags;
    if (params?.customerReviewStatus)
      query.customer_review_status = params.customerReviewStatus;
    if (params?.completedAfter) query.completed_after = params.completedAfter;
    if (params?.completedBefore) query.completed_before = params.completedBefore;
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.updatedAfter) query.updated_after = params.updatedAfter;
    if (params?.updatedBefore) query.updated_before = params.updatedBefore;
    if (params?.includeAttachmentUrl !== undefined)
      query.include_attachment_url = params.includeAttachmentUrl;
    if (params?.limitedResponse !== undefined) query.limited_response = params.limitedResponse;

    let res = await this.axios.get('/tasks', { params: query });
    return res.data;
  }

  async cancelTask(taskId: string, clearUniqueId?: boolean) {
    let query: Record<string, any> = {};
    if (clearUniqueId !== undefined) query.clear_unique_id = clearUniqueId;

    let res = await this.axios.post(`/task/${encodeURIComponent(taskId)}/cancel`, null, {
      params: query
    });
    return res.data;
  }

  async setTaskMetadata(taskId: string, metadata: Record<string, any>) {
    let res = await this.axios.post(
      `/task/${encodeURIComponent(taskId)}/setMetadata`,
      metadata
    );
    return res.data;
  }

  async setTaskTags(taskId: string, tags: string[]) {
    let res = await this.axios.put(`/task/${encodeURIComponent(taskId)}/tags`, { tags });
    return res.data;
  }

  async addTaskTags(taskId: string, tags: string[]) {
    let res = await this.axios.post(`/task/${encodeURIComponent(taskId)}/tags`, { tags });
    return res.data;
  }

  async deleteTaskTags(taskId: string, tags: string[]) {
    let res = await this.axios.delete(`/task/${encodeURIComponent(taskId)}/tags`, {
      data: { tags }
    });
    return res.data;
  }

  async resendTaskCallback(taskId: string) {
    let res = await this.axios.post(`/task/${encodeURIComponent(taskId)}/send-callback`);
    return res.data;
  }

  // ─── Batches ────────────────────────────────────────────────

  async createBatch(params: {
    project: string;
    name: string;
    callback?: string;
    calibrationBatch?: boolean;
    selfLabelBatch?: boolean;
  }) {
    let body: Record<string, any> = {
      project: params.project,
      name: params.name
    };
    if (params.callback !== undefined) body.callback = params.callback;
    if (params.calibrationBatch !== undefined)
      body.calibration_batch = params.calibrationBatch;
    if (params.selfLabelBatch !== undefined) body.self_label_batch = params.selfLabelBatch;

    let res = await this.axios.post('/batches', body);
    return res.data;
  }

  async getBatch(batchName: string) {
    let res = await this.axios.get(`/batches/${encodeURIComponent(batchName)}`);
    return res.data;
  }

  async getBatchStatus(batchName: string) {
    let res = await this.axios.get(`/batches/${encodeURIComponent(batchName)}/status`);
    return res.data;
  }

  async listBatches(params?: {
    project?: string;
    status?: string;
    detailed?: boolean;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.project) query.project = params.project;
    if (params?.status) query.status = params.status;
    if (params?.detailed !== undefined) query.detailed = params.detailed;
    if (params?.startTime) query.start_time = params.startTime;
    if (params?.endTime) query.end_time = params.endTime;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;

    let res = await this.axios.get('/batches', { params: query });
    return res.data;
  }

  async finalizeBatch(batchName: string) {
    let res = await this.axios.post(`/batches/${encodeURIComponent(batchName)}/finalize`);
    return res.data;
  }

  async prioritizeBatch(batchName: string, priority: number) {
    let res = await this.axios.post(`/batches/${encodeURIComponent(batchName)}/prioritize`, {
      priority
    });
    return res.data;
  }

  // ─── Teams ──────────────────────────────────────────────────

  async listTeammates() {
    let res = await this.axios.get('/teams');
    return res.data;
  }

  async inviteTeammates(emails: string[], teamRole: string) {
    let res = await this.axios.post('/teams/invite', {
      emails,
      team_role: teamRole
    });
    return res.data;
  }

  async setTeammateRole(emails: string[], teamRole: string) {
    let res = await this.axios.post('/teams/set_role', {
      emails,
      team_role: teamRole
    });
    return res.data;
  }

  // ─── Files ──────────────────────────────────────────────────

  async importFile(params: { fileUrl: string; projectName?: string }) {
    let body: Record<string, any> = {
      file_url: params.fileUrl
    };
    if (params.projectName) body.project_name = params.projectName;

    let res = await this.axios.post('/files/import', body);
    return res.data;
  }

  async listFiles(params: { project: string; metadata?: string; cursor?: string }) {
    let query: Record<string, any> = {
      project: params.project
    };
    if (params.metadata) query.metadata = params.metadata;
    if (params.cursor) query.cursor = params.cursor;

    let res = await this.axios.get('/files', { params: query });
    return res.data;
  }

  // ─── Evaluation Tasks ──────────────────────────────────────

  async createEvaluationTask(taskType: string, params: Record<string, any>) {
    let res = await this.axios.post(`/evaluation_tasks/${taskType}`, params);
    return res.data;
  }
}
