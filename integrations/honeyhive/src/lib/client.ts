import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; serverUrl: string }) {
    this.axios = createAxios({
      baseURL: config.serverUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Projects ──

  async listProjects(params?: { name?: string }) {
    let res = await this.axios.get('/v1/projects', { params });
    return res.data;
  }

  async createProject(body: { name: string; description?: string }) {
    let res = await this.axios.post('/v1/projects', body);
    return res.data;
  }

  async updateProject(body: { project_id: string; name?: string; description?: string }) {
    let res = await this.axios.put('/v1/projects', body);
    return res.data;
  }

  async deleteProject(name: string) {
    let res = await this.axios.delete('/v1/projects', { params: { name } });
    return res.data;
  }

  // ── Sessions ──

  async startSession(body: {
    project: string;
    session_name: string;
    source: string;
    session_id?: string;
    children_ids?: string[];
    config?: Record<string, any>;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    error?: string;
    duration?: number;
    user_properties?: Record<string, any>;
    metrics?: Record<string, any>;
    feedback?: Record<string, any>;
    metadata?: Record<string, any>;
    start_time?: number;
    end_time?: number;
  }) {
    let res = await this.axios.post('/session/start', body);
    return res.data;
  }

  async getSession(sessionId: string) {
    let res = await this.axios.get(`/session/${sessionId}`);
    return res.data;
  }

  async getSessionTree(sessionId: string) {
    let res = await this.axios.get(`/v1/sessions/${sessionId}`);
    return res.data;
  }

  async deleteSession(sessionId: string) {
    let res = await this.axios.delete(`/v1/sessions/${sessionId}`);
    return res.data;
  }

  // ── Events ──

  async createEvent(body: {
    project: string;
    event_type: string;
    event_name: string;
    source: string;
    config: Record<string, any>;
    inputs: Record<string, any>;
    duration: number;
    event_id?: string;
    session_id?: string;
    parent_id?: string;
    children_ids?: string[];
    outputs?: Record<string, any>;
    error?: string;
    start_time?: number;
    end_time?: number;
    metadata?: Record<string, any>;
    feedback?: Record<string, any>;
    metrics?: Record<string, any>;
    user_properties?: Record<string, any>;
  }) {
    let res = await this.axios.post('/events', body);
    return res.data;
  }

  async updateEvent(body: {
    event_id: string;
    metadata?: Record<string, any>;
    feedback?: Record<string, any>;
    metrics?: Record<string, any>;
    outputs?: Record<string, any>;
    config?: Record<string, any>;
    user_properties?: Record<string, any>;
    duration?: number;
  }) {
    let res = await this.axios.put('/events', body);
    return res.data;
  }

  async createEventBatch(body: {
    events: Record<string, any>[];
    is_single_session?: boolean;
  }) {
    let res = await this.axios.post('/events/batch', body);
    return res.data;
  }

  async queryEvents(params: {
    project?: string;
    dateRange?: string;
    filters?: string;
    projections?: string;
    limit?: number;
    page?: number;
    evaluation_id?: string;
  }) {
    let res = await this.axios.get('/events', { params });
    return res.data;
  }

  async exportEvents(body: {
    project: string;
    filters: Array<{
      field: string;
      value: any;
      operator: string;
      type: string;
    }>;
    dateRange?: { $gte?: string; $lte?: string };
    limit?: number;
    page?: number;
  }) {
    let res = await this.axios.post('/v1/events/export', body);
    return res.data;
  }

  async getEvent(eventId: string) {
    let res = await this.axios.get(`/v1/events/${eventId}`);
    return res.data;
  }

  async deleteEvent(eventId: string) {
    let res = await this.axios.delete(`/v1/events/${eventId}`);
    return res.data;
  }

  // ── Datasets ──

  async listDatasets(params: { project: string; type?: string; dataset_id?: string }) {
    let res = await this.axios.get('/v1/datasets', { params });
    return res.data;
  }

  async createDataset(body: {
    project: string;
    name: string;
    description?: string;
    type?: string;
    datapoints?: string[];
    linked_evals?: string[];
    saved?: boolean;
    pipeline_type?: string;
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/v1/datasets', body);
    return res.data;
  }

  async updateDataset(body: {
    dataset_id: string;
    name?: string;
    description?: string;
    datapoints?: string[];
    linked_evals?: string[];
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.put('/v1/datasets', body);
    return res.data;
  }

  async deleteDataset(datasetId: string) {
    let res = await this.axios.delete('/v1/datasets', { params: { dataset_id: datasetId } });
    return res.data;
  }

  async addDatapoints(
    datasetId: string,
    body: {
      project: string;
      data: Record<string, any>[];
      mapping: {
        inputs: string[];
        ground_truth: string[];
        history: string[];
      };
    }
  ) {
    let res = await this.axios.post(`/v1/datasets/${datasetId}/datapoints`, body);
    return res.data;
  }

  // ── Datapoints ──

  async listDatapoints(params: {
    project: string;
    datapoint_ids?: string;
    dataset_name?: string;
  }) {
    let res = await this.axios.get('/v1/datapoints', { params });
    return res.data;
  }

  async createDatapoint(body: {
    project: string;
    inputs: Record<string, any>;
    history?: Record<string, any>[];
    ground_truth?: Record<string, any>;
    linked_event?: string;
    linked_datasets?: string[];
    metadata?: Record<string, any>;
  }) {
    let res = await this.axios.post('/v1/datapoints', body);
    return res.data;
  }

  async getDatapoint(datapointId: string) {
    let res = await this.axios.get(`/v1/datapoints/${datapointId}`);
    return res.data;
  }

  async updateDatapoint(
    datapointId: string,
    body: {
      inputs?: Record<string, any>;
      history?: Record<string, any>[];
      ground_truth?: Record<string, any>;
      linked_event?: string;
      linked_datasets?: string[];
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.put(`/v1/datapoints/${datapointId}`, body);
    return res.data;
  }

  async deleteDatapoint(datapointId: string) {
    let res = await this.axios.delete(`/v1/datapoints/${datapointId}`);
    return res.data;
  }

  // ── Configurations (Prompts) ──

  async listConfigurations(params: { project: string; env?: string; name?: string }) {
    let res = await this.axios.get('/v1/configurations', { params });
    return res.data;
  }

  async createConfiguration(body: {
    project: string;
    name: string;
    provider: string;
    parameters: Record<string, any>;
    env?: string[];
    type?: string;
    user_properties?: Record<string, any>;
  }) {
    let res = await this.axios.post('/v1/configurations', body);
    return res.data;
  }

  async updateConfiguration(
    configId: string,
    body: {
      project: string;
      name: string;
      provider: string;
      parameters: Record<string, any>;
      env?: string[];
      type?: string;
      user_properties?: Record<string, any>;
    }
  ) {
    let res = await this.axios.put(`/v1/configurations/${configId}`, body);
    return res.data;
  }

  async deleteConfiguration(configId: string) {
    let res = await this.axios.delete(`/v1/configurations/${configId}`);
    return res.data;
  }

  // ── Metrics ──

  async listMetrics(projectName: string) {
    let res = await this.axios.get('/v1/metrics', { params: { project_name: projectName } });
    return res.data;
  }

  async createMetric(body: {
    name: string;
    task: string;
    type: string;
    description: string;
    return_type: string;
    criteria?: string;
    code_snippet?: string;
    prompt?: string;
    enabled_in_prod?: boolean;
    needs_ground_truth?: boolean;
    threshold?: { min?: number; max?: number };
    pass_when?: boolean;
    event_name?: string;
    event_type?: string;
  }) {
    let res = await this.axios.post('/v1/metrics', body);
    return res.data;
  }

  async updateMetric(body: {
    metric_id: string;
    name?: string;
    description?: string;
    type?: string;
    code_snippet?: string;
    prompt?: string;
    criteria?: string;
    return_type?: string;
    threshold?: { min?: number; max?: number };
    pass_when?: boolean;
    enabled_in_prod?: boolean;
    needs_ground_truth?: boolean;
    event_name?: string;
    event_type?: string;
  }) {
    let res = await this.axios.put('/v1/metrics', body);
    return res.data;
  }

  async deleteMetric(metricId: string) {
    let res = await this.axios.delete('/v1/metrics', { params: { metric_id: metricId } });
    return res.data;
  }

  // ── Runs (Evaluations/Experiments) ──

  async listRuns(params: {
    project?: string;
    dataset_id?: string;
    page?: number;
    limit?: number;
    run_ids?: string;
    name?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    let res = await this.axios.get('/v1/runs', { params });
    return res.data;
  }

  async createRun(body: {
    project: string;
    name: string;
    event_ids: string[];
    dataset_id?: string;
    datapoint_ids?: string[];
    configuration?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: string;
  }) {
    let res = await this.axios.post('/v1/runs', body);
    return res.data;
  }

  async getRun(runId: string) {
    let res = await this.axios.get(`/v1/runs/${runId}`);
    return res.data;
  }

  async updateRun(
    runId: string,
    body: {
      event_ids?: string[];
      dataset_id?: string;
      datapoint_ids?: string[];
      configuration?: Record<string, any>;
      metadata?: Record<string, any>;
      name?: string;
      status?: string;
    }
  ) {
    let res = await this.axios.put(`/v1/runs/${runId}`, body);
    return res.data;
  }

  async deleteRun(runId: string) {
    let res = await this.axios.delete(`/v1/runs/${runId}`);
    return res.data;
  }

  async getRunResult(
    runId: string,
    params?: { aggregate_function?: string; filters?: string }
  ) {
    let res = await this.axios.get(`/v1/runs/${runId}/result`, { params });
    return res.data;
  }

  async compareRuns(newRunId: string, oldRunId: string) {
    let res = await this.axios.get(`/v1/runs/${newRunId}/compare-with/${oldRunId}`);
    return res.data;
  }
}
