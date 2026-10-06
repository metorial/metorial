import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; serverUrl: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL:
        config.serverUrl.replace(/\/$/, '') === 'https://api.honeyhive.ai'
          ? 'https://api.dp1.us.honeyhive.ai'
          : config.serverUrl,
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'HoneyHive',
          reason: 'honeyhive_api_error'
        })
    });
  }

  // ── Sessions ──

  async startSession(body: {
    project?: string;
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
    if (body.error !== undefined || body.metrics !== undefined || body.feedback !== undefined)
      throw createApiServiceError(
        'The current session creation API does not accept an error field. Record errors on child events with log_event.',
        { reason: 'honeyhive_unsupported_field' }
      );
    let {
      project: _project,
      error: _error,
      metrics: _metrics,
      feedback: _feedback,
      ...session
    } = body;
    let res = await this.axios.post('/v1/sessions', session);
    if (!res.data?.session_id || !res.data?.event_id)
      throw createApiServiceError(
        'HoneyHive did not return the created session identifiers.',
        { reason: 'honeyhive_invalid_response' }
      );
    return res.data;
  }

  async getSession(sessionId: string) {
    // Session correlation IDs differ from session event row IDs in the current API.
    let data = await this.exportEvents({
      filters: [
        { field: 'session_id', value: sessionId, operator: 'is', type: 'string' },
        { field: 'event_type', value: 'session', operator: 'is', type: 'string' }
      ],
      limit: 1,
      page: 1
    });
    let event = data.events?.find(
      (item: Record<string, unknown>) =>
        item.session_id === sessionId && item.event_type === 'session'
    );
    if (!event)
      throw createApiServiceError('The session was not found in the connected project.', {
        reason: 'honeyhive_session_not_found'
      });
    return event;
  }

  // ── Events ──

  async createEvent(body: {
    project?: string;
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
    let { project: _project, ...event } = body;
    let res = await this.axios.post('/v1/events', event);
    if (res.data?.success !== true || !res.data?.event_id)
      throw createApiServiceError('HoneyHive did not confirm event creation.', {
        reason: 'honeyhive_invalid_response'
      });
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
    let { event_id, ...update } = body;
    if (Object.values(update).every(value => value === undefined))
      throw createApiServiceError('Provide at least one event field to update.');
    let res = await this.axios.put(`/v1/events/${encodeURIComponent(event_id)}`, update);
    return res.data;
  }

  async createEventBatch(body: {
    events: Record<string, any>[];
    is_single_session?: boolean;
  }) {
    let res = await this.axios.post('/v1/events/batch', {
      events: body.events.map(({ project: _project, ...event }) => event),
      single_session: body.is_single_session
    });
    if (
      res.data?.success !== true ||
      !Array.isArray(res.data?.event_ids) ||
      res.data.event_ids.length !== body.events.length
    )
      throw createApiServiceError('HoneyHive did not confirm creation of every batch event.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async exportEvents(body: {
    project?: string;
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
    if (body.dateRange && (!body.dateRange.$gte || !body.dateRange.$lte))
      throw createApiServiceError('Provide both from and to for a date range.');
    let filters = body.filters.map(filter => ({
      ...filter,
      type: filter.type === 'id' ? 'string' : filter.type
    }));
    for (let filter of filters) {
      if (
        ![
          'exists',
          'not exists',
          'is',
          'is not',
          'contains',
          'not contains',
          'greater than',
          'less than',
          'after',
          'before'
        ].includes(filter.operator) ||
        !['string', 'number', 'boolean', 'datetime'].includes(filter.type) ||
        (filter.value !== null &&
          !['string', 'number', 'boolean'].includes(typeof filter.value))
      )
        throw createApiServiceError(
          'Event filters require a documented operator, scalar value, and string, number, boolean, or datetime type.'
        );
    }
    let { project: _project, ...query } = body;
    // Documented compatibility route preserves the existing 7,500-result contract.
    let res = await this.axios.post('/v1/events/export', { ...query, filters });
    if (!Array.isArray(res.data?.events))
      throw createApiServiceError('HoneyHive returned an invalid event query response.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async getEvent(eventId: string, _project?: string) {
    let res = await this.axios.get(`/v1/events/${encodeURIComponent(eventId)}`);
    if (res.data?.event?.event_id !== eventId)
      throw createApiServiceError('HoneyHive did not return the requested event.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data.event;
  }

  // ── Datasets ──

  async listDatasets(params: { project?: string; type?: string; dataset_id?: string }) {
    if (params.type !== undefined)
      throw createApiServiceError(
        'The current dataset API does not support filtering by dataset type.',
        { reason: 'honeyhive_unsupported_field' }
      );
    let res = await this.axios.get('/v1/datasets', {
      params: { dataset_id: params.dataset_id }
    });
    return res.data;
  }

  async createDataset(body: {
    project?: string;
    name: string;
    description?: string;
    type?: string;
    datapoints?: string[];
    linked_evals?: string[];
    saved?: boolean;
    pipeline_type?: string;
    metadata?: Record<string, any>;
  }) {
    if (
      body.metadata !== undefined ||
      body.linked_evals !== undefined ||
      body.saved !== undefined ||
      (body.type && body.type !== 'evaluation') ||
      (body.pipeline_type && body.pipeline_type !== 'event')
    )
      throw createApiServiceError(
        'The current dataset API accepts name, description, and datapoint IDs; metadata, fine-tuning datasets, and session pipeline settings are unavailable.',
        { reason: 'honeyhive_unsupported_field' }
      );
    let res = await this.axios.post('/v1/datasets', {
      name: body.name,
      description: body.description,
      datapoints: body.datapoints
    });
    if (res.data?.inserted !== true || !res.data?.result?.insertedId)
      throw createApiServiceError('HoneyHive did not confirm dataset creation.', {
        reason: 'honeyhive_invalid_response'
      });
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
    if (body.metadata !== undefined || body.linked_evals !== undefined)
      throw createApiServiceError(
        'The current dataset API does not support dataset metadata or linked evaluations.',
        { reason: 'honeyhive_unsupported_field' }
      );
    let { dataset_id, metadata: _metadata, linked_evals: _linkedEvals, ...update } = body;
    if (Object.values(update).every(value => value === undefined))
      throw createApiServiceError(
        'Provide a dataset name, description, or datapoint list to update.'
      );
    let res = await this.axios.put(`/v1/datasets/${encodeURIComponent(dataset_id)}`, update);
    if (!res.data?.result?.id)
      throw createApiServiceError('HoneyHive did not confirm dataset update.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async deleteDataset(datasetId: string) {
    let res = await this.axios.delete(`/v1/datasets/${encodeURIComponent(datasetId)}`);
    if (res.data?.result?.id !== datasetId)
      throw createApiServiceError('HoneyHive did not confirm dataset deletion.', {
        reason: 'honeyhive_delete_failed'
      });
    return res.data;
  }

  async addDatapoints(
    datasetId: string,
    body: {
      project?: string;
      data: Record<string, any>[];
      mapping: {
        inputs: string[];
        ground_truth: string[];
        history: string[];
      };
    }
  ) {
    let { project: _project, ...importData } = body;
    let res = await this.axios.post(
      `/v1/datasets/${encodeURIComponent(datasetId)}/datapoints`,
      importData
    );
    if (
      res.data?.inserted !== true ||
      !Array.isArray(res.data?.datapoint_ids) ||
      res.data.datapoint_ids.length !== body.data.length
    )
      throw createApiServiceError('HoneyHive did not confirm every imported datapoint.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  // ── Datapoints ──

  async listDatapoints(params: {
    project?: string;
    datapoint_ids?: string[];
    dataset_name?: string;
  }) {
    let { project: _project, ...query } = params;
    let res = await this.axios.get('/v1/datapoints', {
      params: query,
      paramsSerializer: { indexes: null }
    });
    return res.data;
  }

  async createDatapoint(body: {
    project?: string;
    inputs: Record<string, any>;
    history?: Record<string, any>[];
    ground_truth?: Record<string, any>;
    linked_event?: string;
    linked_datasets?: string[];
    metadata?: Record<string, any>;
  }) {
    let { project: _project, ...datapoint } = body;
    let res = await this.axios.post('/v1/datapoints', datapoint);
    if (res.data?.inserted !== true || !res.data?.result?.insertedId)
      throw createApiServiceError('HoneyHive did not confirm datapoint creation.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async getDatapoint(datapointId: string) {
    let res = await this.axios.get(`/v1/datapoints/${encodeURIComponent(datapointId)}`);
    return res.data;
  }

  async updateDatapoint(
    datapointId: string,
    body: {
      inputs?: Record<string, any>;
      history?: Record<string, any>[];
      ground_truth?: Record<string, any>;
      linked_evals?: string[];
      linked_datasets?: string[];
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.put(`/v1/datapoints/${encodeURIComponent(datapointId)}`, body);
    if (res.data?.updated !== true)
      throw createApiServiceError('HoneyHive did not confirm datapoint update.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async deleteDatapoint(datapointId: string) {
    let res = await this.axios.delete(`/v1/datapoints/${encodeURIComponent(datapointId)}`);
    return res.data;
  }

  // ── Configurations (Prompts) ──

  async listConfigurations(params: { project?: string; env?: string; name?: string }) {
    let { project: _project, ...query } = params;
    let res = await this.axios.get('/v1/configurations', { params: query });
    return res.data;
  }

  async createConfiguration(body: {
    project?: string;
    name: string;
    provider: string;
    parameters: Record<string, any>;
    env?: string[];
    type?: string;
    user_properties?: Record<string, any>;
  }) {
    let { project: _project, ...configuration } = body;
    let res = await this.axios.post('/v1/configurations', configuration);
    if (res.data?.acknowledged !== true || !res.data?.insertedId)
      throw createApiServiceError('HoneyHive did not confirm configuration creation.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async updateConfiguration(
    configId: string,
    body: {
      project?: string;
      name: string;
      provider: string;
      parameters: Record<string, any>;
      env?: string[];
      type?: string;
      user_properties?: Record<string, any>;
    }
  ) {
    let { project: _project, ...configuration } = body;
    let res = await this.axios.put(
      `/v1/configurations/${encodeURIComponent(configId)}`,
      configuration
    );
    if (res.data?.acknowledged !== true || res.data?.matchedCount !== 1)
      throw createApiServiceError('HoneyHive did not confirm configuration update.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async deleteConfiguration(configId: string) {
    let res = await this.axios.delete(`/v1/configurations/${encodeURIComponent(configId)}`);
    if (res.data?.acknowledged !== true || res.data?.deletedCount !== 1)
      throw createApiServiceError('HoneyHive did not confirm configuration deletion.', {
        reason: 'honeyhive_delete_failed'
      });
    return res.data;
  }

  // ── Metrics ──

  private metricPayload(body: {
    name?: string;
    type?: string;
    description?: string;
    return_type?: string;
    criteria?: string;
    code_snippet?: string;
    prompt?: string;
    model_provider?: string;
    model_name?: string;
    enabled_in_prod?: boolean;
    needs_ground_truth?: boolean;
    threshold?: { min?: number; max?: number };
    pass_when?: boolean;
    event_name?: string;
    event_type?: string;
  }) {
    if (body.code_snippet !== undefined && body.prompt !== undefined)
      throw createApiServiceError('Provide codeSnippet or prompt, not both.');
    if (
      (body.type === 'human' &&
        (body.code_snippet !== undefined || body.prompt !== undefined)) ||
      (body.type === 'custom' && body.prompt !== undefined) ||
      (body.type === 'model' && body.code_snippet !== undefined)
    )
      throw createApiServiceError(
        'Use codeSnippet for custom metrics, prompt for model metrics, and criteria for human metrics.'
      );
    let type =
      body.type === 'custom'
        ? 'PYTHON'
        : body.type === 'model'
          ? 'LLM'
          : body.type === 'human'
            ? 'HUMAN'
            : undefined;
    let criteria = body.code_snippet ?? body.prompt ?? body.criteria;
    if (criteria !== undefined && !criteria.trim())
      throw createApiServiceError('Evaluator criteria must be nonempty.');
    let filters: Array<{ field: string; value: string; operator: string; type: string }> = [];
    if (body.event_name !== undefined)
      filters.push({
        field: 'event_name',
        value: body.event_name,
        operator: 'is',
        type: 'string'
      });
    if (body.event_type !== undefined)
      filters.push({
        field: 'event_type',
        value: body.event_type,
        operator: 'is',
        type: 'string'
      });
    return {
      name: body.name,
      type,
      description: body.description,
      return_type: body.return_type,
      criteria,
      model_provider: body.model_provider,
      model_name: body.model_name,
      enabled_in_prod: body.enabled_in_prod,
      needs_ground_truth: body.needs_ground_truth,
      threshold:
        body.threshold !== undefined || body.pass_when !== undefined
          ? {
              ...body.threshold,
              ...(body.pass_when !== undefined ? { pass_when: body.pass_when } : {})
            }
          : undefined,
      filters: filters.length ? { filterArray: filters } : undefined
    };
  }

  async listMetrics(_projectName?: string) {
    let res = await this.axios.get('/v1/metrics');
    return res.data;
  }

  async createMetric(body: {
    name: string;
    task?: string;
    type: string;
    description: string;
    return_type: string;
    criteria?: string;
    code_snippet?: string;
    prompt?: string;
    model_provider?: string;
    model_name?: string;
    enabled_in_prod?: boolean;
    needs_ground_truth?: boolean;
    threshold?: { min?: number; max?: number };
    pass_when?: boolean;
    event_name?: string;
    event_type?: string;
  }) {
    let payload = this.metricPayload(body);
    if (!payload.criteria?.trim())
      throw createApiServiceError(
        'Provide nonempty criteria, codeSnippet for custom metrics, or prompt for model metrics.'
      );
    if (body.type === 'model' && (!body.model_provider?.trim() || !body.model_name?.trim()))
      throw createApiServiceError('Model metrics require modelProvider and modelName.');
    let res = await this.axios.post('/v1/metrics', payload);
    if (res.data?.inserted !== true || !res.data?.metric_id)
      throw createApiServiceError('HoneyHive did not confirm metric creation.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async updateMetric(body: {
    metric_id: string;
    name?: string;
    description?: string;
    type?: string;
    code_snippet?: string;
    prompt?: string;
    model_provider?: string;
    model_name?: string;
    criteria?: string;
    return_type?: string;
    threshold?: { min?: number; max?: number };
    pass_when?: boolean;
    enabled_in_prod?: boolean;
    needs_ground_truth?: boolean;
    event_name?: string;
    event_type?: string;
  }) {
    let payload = this.metricPayload(body);
    if (
      body.threshold !== undefined ||
      body.pass_when !== undefined ||
      body.event_name !== undefined ||
      body.event_type !== undefined ||
      body.code_snippet !== undefined ||
      body.prompt !== undefined
    ) {
      let listed = await this.axios.get('/v1/metrics', { params: { id: body.metric_id } });
      let current = listed.data?.metrics?.find(
        (metric: Record<string, unknown>) => metric.id === body.metric_id
      );
      if (!current)
        throw createApiServiceError('The metric was not found in the connected project.', {
          reason: 'honeyhive_metric_not_found'
        });
      if (
        !body.type &&
        ((body.code_snippet !== undefined && current.type !== 'PYTHON') ||
          (body.prompt !== undefined && current.type !== 'LLM'))
      )
        throw createApiServiceError(
          'codeSnippet updates require a custom metric and prompt updates require a model metric.'
        );
      if (payload.threshold !== undefined)
        payload.threshold = { ...current.threshold, ...payload.threshold };
      if (payload.filters !== undefined)
        payload.filters.filterArray = [
          ...(current.filters?.filterArray || []).filter(
            (filter: Record<string, unknown>) =>
              !(body.event_name !== undefined && filter.field === 'event_name') &&
              !(body.event_type !== undefined && filter.field === 'event_type')
          ),
          ...payload.filters.filterArray
        ];
    }
    if (Object.values(payload).every(value => value === undefined))
      throw createApiServiceError('Provide at least one metric field to update.');
    let res = await this.axios.put(
      `/v1/metrics/${encodeURIComponent(body.metric_id)}`,
      payload
    );
    if (res.data?.updated !== true)
      throw createApiServiceError('HoneyHive did not confirm metric update.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async deleteMetric(metricId: string) {
    let res = await this.axios.delete(`/v1/metrics/${encodeURIComponent(metricId)}`);
    if (res.data?.deleted !== true)
      throw createApiServiceError('HoneyHive did not confirm metric deletion.', {
        reason: 'honeyhive_delete_failed'
      });
    return res.data;
  }

  // ── Runs (Evaluations/Experiments) ──

  async listRuns(params: {
    project?: string;
    dataset_id?: string;
    page?: number;
    limit?: number;
    run_ids?: string[];
    name?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    let { project: _project, ...query } = params;
    if (
      query.sort_by &&
      !['created_at', 'updated_at', 'name', 'status', 'run_id'].includes(query.sort_by)
    )
      throw createApiServiceError(
        'sortBy must be created_at, updated_at, name, status, or run_id.'
      );
    let limit = query.limit ?? 20;
    let page = query.page ?? 1;
    if (limit <= 100 && query.sort_by !== 'run_id') {
      let res = await this.axios.get('/v1/runs', {
        params: query,
        paramsSerializer: { indexes: null }
      });
      if (
        !Array.isArray(res.data?.evaluations) ||
        typeof res.data?.pagination?.total !== 'number'
      )
        throw createApiServiceError('HoneyHive returned an invalid run list.', {
          reason: 'honeyhive_invalid_response'
        });
      return res.data;
    }
    let offset = (page - 1) * limit;
    let apiPage = query.sort_by === 'run_id' ? 1 : Math.floor(offset / 100) + 1;
    let records: Record<string, unknown>[] = [];
    let pagination: { total: number; total_pages: number } | undefined;
    do {
      let res = await this.axios.get('/v1/runs', {
        params: {
          ...query,
          limit: 100,
          page: apiPage,
          sort_by: query.sort_by === 'run_id' ? 'created_at' : query.sort_by
        },
        paramsSerializer: { indexes: null }
      });
      if (
        !Array.isArray(res.data?.evaluations) ||
        typeof res.data?.pagination?.total !== 'number'
      )
        throw createApiServiceError('HoneyHive returned an invalid run list.', {
          reason: 'honeyhive_invalid_response'
        });
      pagination = res.data.pagination;
      records.push(...res.data.evaluations);
      apiPage++;
    } while (
      apiPage <= (pagination?.total_pages ?? 0) &&
      (query.sort_by === 'run_id' || records.length < (offset % 100) + limit)
    );
    if (query.sort_by === 'run_id')
      records.sort(
        (a, b) =>
          String(a.run_id).localeCompare(String(b.run_id)) *
          (query.sort_order === 'asc' ? 1 : -1)
      );
    let sliceOffset = query.sort_by === 'run_id' ? offset : offset % 100;
    return {
      evaluations: records.slice(sliceOffset, sliceOffset + limit),
      pagination: {
        total: pagination?.total,
        total_pages: Math.ceil((pagination?.total ?? 0) / limit)
      }
    };
  }

  async createRun(body: {
    project?: string;
    name: string;
    event_ids: string[];
    dataset_id?: string;
    datapoint_ids?: string[];
    configuration?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: string;
  }) {
    let { project: _project, ...run } = body;
    let res = await this.axios.post('/v1/runs', run);
    if (!res.data?.run_id)
      throw createApiServiceError('HoneyHive did not return the created run ID.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async getRun(runId: string) {
    let res = await this.axios.get(`/v1/runs/${encodeURIComponent(runId)}`);
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
    if (body.dataset_id !== undefined)
      throw createApiServiceError(
        'The current run update API does not accept datasetId. Set the dataset when creating the run.',
        { reason: 'honeyhive_unsupported_field' }
      );
    let { dataset_id: _datasetId, ...update } = body;
    let res = await this.axios.put(`/v1/runs/${encodeURIComponent(runId)}`, update);
    if (res.data?.evaluation?.run_id !== runId)
      throw createApiServiceError('HoneyHive did not confirm run update.', {
        reason: 'honeyhive_invalid_response'
      });
    return res.data;
  }

  async deleteRun(runId: string) {
    let res = await this.axios.delete(`/v1/runs/${encodeURIComponent(runId)}`);
    if (res.data?.deleted !== true)
      throw createApiServiceError('HoneyHive did not confirm run deletion.', {
        reason: 'honeyhive_delete_failed'
      });
    return res.data;
  }

  async getRunResult(runId: string, params: { aggregate_function?: string }) {
    let res = await this.axios.get(`/v1/runs/${encodeURIComponent(runId)}/result`, { params });
    return res.data;
  }

  async compareRuns(
    newRunId: string,
    oldRunId: string,
    params: { aggregate_function?: string }
  ) {
    let res = await this.axios.get(
      `/v1/runs/${encodeURIComponent(newRunId)}/compare-with/${encodeURIComponent(oldRunId)}`,
      { params }
    );
    return res.data;
  }
}
