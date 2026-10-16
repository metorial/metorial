import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type BigMLRegion = 'us' | 'au';
export type BigMLConfig = {
  username: string;
  token: string;
  region: BigMLRegion;
  devMode: boolean;
  organizationId?: string;
  projectId?: string;
};
export type BigMLResourceStatus = {
  code: number;
  message: string;
  elapsed?: number;
  progress?: number;
};
export type BigMLResource = {
  resource: string;
  code?: number;
  name?: string;
  description?: string;
  status: BigMLResourceStatus;
  created: string;
  updated?: string;
  category?: number;
  tags?: string[];
  fields?: Record<string, unknown>;
  prediction?: unknown;
  output?: unknown;
  confidence?: number;
  probability?: number;
  objective_fields?: string[];
  execution?: { outputs?: unknown[]; [key: string]: unknown };
  [key: string]: unknown;
};
export type BigMLListResponse = {
  meta: {
    limit: number;
    offset: number;
    total_count?: number;
    query_total?: number;
    next?: string | null;
    previous?: string | null;
    [key: string]: unknown;
  };
  objects: BigMLResource[];
  [key: string]: unknown;
};
let BASE_URLS: Record<BigMLRegion, string> = {
  us: 'https://bigml.io',
  au: 'https://au.bigml.io'
};

export let validateInteger = (value: unknown, label: string, min: number, max?: number) => {
  if (value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    (max !== undefined && value > max)
  ) {
    throw createApiServiceError(
      `${label} must be an integer ${max === undefined ? `at least ${min}` : `between ${min} and ${max}`}.`
    );
  }
};

export let validateResourceId = (resourceId: string, expectedType?: string) => {
  if (
    !/^[a-z][a-z0-9]*\/[A-Za-z0-9]+$/.test(resourceId) ||
    (expectedType !== undefined && !resourceId.startsWith(`${expectedType}/`))
  ) {
    throw createApiServiceError(
      `Provide a valid ${expectedType ?? 'BigML'} resource ID in the form ${expectedType ?? 'resource-type'}/id. Use list_resources to discover resource IDs.`
    );
  }
};

export let supervisedReference = (resourceId: string, includeTimeSeries = false) => {
  validateResourceId(resourceId);
  let type = resourceId.split('/')[0]!;
  let supported = [
    'model',
    'ensemble',
    'deepnet',
    'logisticregression',
    'linearregression',
    'fusion'
  ];
  if (includeTimeSeries) supported.push('timeseries');
  if (!supported.includes(type))
    throw createApiServiceError(`modelId must reference one of: ${supported.join(', ')}.`);
  return { [type]: resourceId };
};

export class Client {
  private axios;
  private baseUrl: string;

  constructor(private config: BigMLConfig) {
    if (!config.username.trim() || !config.token.trim())
      throw createApiServiceError('Connect with your BigML username and API key.');
    if (config.organizationId !== undefined)
      validateResourceId(config.organizationId, 'organization');
    if (config.projectId !== undefined) validateResourceId(config.projectId, 'project');
    this.baseUrl = BASE_URLS[config.region];
    // BigML retired development mode; retain the saved config field but use production.
    this.axios = createAxios({ baseURL: `${this.baseUrl}/andromeda`, timeout: 30_000 });
  }

  private getAuthParams(resourceType: string, project?: string): Record<string, string> {
    let params = { username: this.config.username, api_key: this.config.token };
    if (resourceType === 'project' || resourceType === 'status') {
      return { ...params, ...pickDefined({ organization: this.config.organizationId }) };
    }
    return { ...params, ...pickDefined({ project: project ?? this.config.projectId }) };
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: Record<string, unknown>,
    query: Record<string, string> = {}
  ): Promise<T> {
    let resourceType = path.split('/')[0]!;
    let project = typeof body?.project === 'string' ? body.project : query.project;
    if (project !== undefined) validateResourceId(project, 'project');
    if ('username' in query || 'api_key' in query || 'organization' in query) {
      throw createApiServiceError(
        'Filters cannot override username, api_key, or organization. Use the connection credentials and organization settings.'
      );
    }
    try {
      let response = await this.axios.request<T>({
        method,
        url: `/${path}`,
        data: body,
        params: { ...query, ...this.getAuthParams(resourceType, project) },
        headers: { Accept: 'application/json' }
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'BigML',
        operation: `${method.toUpperCase()} ${resourceType}`,
        reason: 'bigml_api_error',
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
        detailKeys: ['message', 'detail', 'code'],
        nestedKeys: ['status', 'extra', 'errors'],
        extractUpstreamCode: (_failure, response, helpers) => {
          if (!helpers.isRecord(response?.data)) return undefined;
          let status = response.data.status;
          return helpers.isRecord(status) && typeof status.code === 'number'
            ? String(status.code)
            : undefined;
        }
      });
    }
  }

  private validateBody(resourceType: string, body: Record<string, unknown>) {
    for (let key of [
      'source',
      'dataset',
      'origin_dataset',
      'project',
      'script',
      'model',
      'ensemble',
      'deepnet',
      'logisticregression',
      'linearregression',
      'fusion',
      'timeseries',
      'cluster',
      'anomaly'
    ]) {
      let value = body[key];
      if (value !== undefined) {
        if (typeof value !== 'string')
          throw createApiServiceError(`${key} must be a resource ID.`);
        validateResourceId(value, key === 'origin_dataset' ? 'dataset' : key);
      }
    }
    if (Array.isArray(body.origin_datasets)) {
      for (let id of body.origin_datasets) {
        if (typeof id !== 'string')
          throw createApiServiceError('datasetIds must contain dataset IDs.');
        validateResourceId(id, 'dataset');
      }
    }
    if (
      body.sample_rate !== undefined &&
      (typeof body.sample_rate !== 'number' ||
        !Number.isFinite(body.sample_rate) ||
        body.sample_rate < 0 ||
        body.sample_rate > 1)
    ) {
      throw createApiServiceError('sampleRate must be between 0 and 1.');
    }
    if (body.range !== undefined) {
      if (!Array.isArray(body.range) || body.range.length !== 2)
        throw createApiServiceError('range must contain [start, end] row numbers.');
      validateInteger(body.range[0], 'range start', 1);
      validateInteger(body.range[1], 'range end', 1);
      if (body.range[0] > body.range[1])
        throw createApiServiceError('range start must not exceed its end.');
    }
    validateInteger(
      body.category,
      'category',
      -1,
      ['script', 'execution', 'library'].includes(resourceType) ? 20 : 22
    );
    validateInteger(body.number_of_models, 'numberOfModels', 1);
    validateInteger(body.number_of_hidden_layers, 'numberOfHiddenLayers', 1);
    validateInteger(
      body.horizon,
      'horizon',
      1,
      resourceType === 'timeseries' ? 400 : undefined
    );
    validateInteger(body.k, 'k', 1, 300);
    validateInteger(body.top_n, 'topN', 1, 1024);
    validateInteger(body.forest_size, 'forestSize', 2, 1000);
    validateInteger(body.max_training_time, 'maxTrainingTime', 1);
    if (isApiErrorRecord(body.boosting))
      validateInteger(body.boosting.iterations, 'boosting.iterations', 1);
  }

  async createResource(
    resourceType: string,
    body: Record<string, unknown>
  ): Promise<BigMLResource> {
    if (!/^[a-z][a-z0-9]*$/.test(resourceType))
      throw createApiServiceError('Invalid resource type.');
    this.validateBody(resourceType, body);
    let result = await this.request<BigMLResource>('post', resourceType, body);
    if (
      !isApiErrorRecord(result) ||
      typeof result.resource !== 'string' ||
      typeof result.created !== 'string' ||
      !isApiErrorRecord(result.status) ||
      typeof result.status.code !== 'number' ||
      typeof result.status.message !== 'string'
    ) {
      throw createApiServiceError(
        'BigML returned an incomplete resource creation response. Retrieve the resource before continuing.'
      );
    }
    return result;
  }

  async getResource(resourceId: string, queryString?: string): Promise<BigMLResource> {
    validateResourceId(resourceId);
    let query = Object.fromEntries(new URLSearchParams(queryString?.replace(/;/g, '&')));
    return this.request<BigMLResource>('get', resourceId, undefined, query);
  }

  async listResources(
    resourceType: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      filters?: Record<string, string>;
      tags?: string;
      name?: string;
      project?: string;
    } = {}
  ): Promise<BigMLListResponse> {
    validateInteger(options.limit, 'limit', 1, 200);
    validateInteger(options.offset, 'offset', 0);
    let query: Record<string, string> = { ...options.filters };
    for (let [key, value] of Object.entries(
      pickDefined({
        limit: options.limit === undefined ? undefined : String(options.limit),
        offset: options.offset === undefined ? undefined : String(options.offset),
        order_by: options.orderBy,
        tags__in: options.tags,
        name: options.name,
        project: options.project
      })
    )) {
      if (typeof value === 'string') query[key] = value;
    }
    if (query.limit !== undefined) validateInteger(Number(query.limit), 'limit', 1, 200);
    if (query.offset !== undefined) validateInteger(Number(query.offset), 'offset', 0);
    let result = await this.request<BigMLListResponse>('get', resourceType, undefined, query);
    if (
      !isApiErrorRecord(result) ||
      !Array.isArray(result.objects) ||
      !isApiErrorRecord(result.meta) ||
      typeof result.meta.limit !== 'number' ||
      typeof result.meta.offset !== 'number' ||
      typeof (result.meta.total_count ?? result.meta.query_total) !== 'number'
    ) {
      throw createApiServiceError(
        'BigML returned an incomplete resource list or pagination metadata.'
      );
    }
    for (let key of ['next', 'previous'] as const) {
      let value = result.meta[key];
      if (typeof value !== 'string') continue;
      try {
        let url = new URL(value, this.baseUrl);
        url.searchParams.delete('username');
        url.searchParams.delete('api_key');
        result.meta[key] = value.startsWith('/')
          ? `${url.pathname}${url.search}${url.hash}`
          : url.toString();
      } catch {
        throw createApiServiceError('BigML returned an invalid pagination link.');
      }
    }
    return result;
  }

  async updateResource(
    resourceId: string,
    body: Record<string, unknown>
  ): Promise<BigMLResource> {
    validateResourceId(resourceId);
    this.validateBody(resourceId.split('/')[0]!, body);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one resource attribute to update.');
    return this.request<BigMLResource>('put', resourceId, body);
  }

  async deleteResource(resourceId: string): Promise<void> {
    validateResourceId(resourceId);
    await this.request('delete', resourceId);
  }

  async getAccountStatus(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('get', 'status');
  }

  getBatchDownload(resourceId: string, projectId?: string) {
    validateResourceId(resourceId, 'batchprediction');
    if (projectId !== undefined) validateResourceId(projectId, 'project');
    return {
      url: `${this.baseUrl}/andromeda/${resourceId}/download`,
      query: this.getAuthParams('batchprediction', projectId)
    };
  }

  async waitForScript(scriptId: string, projectId?: string): Promise<void> {
    validateResourceId(scriptId, 'script');
    let queryString =
      projectId === undefined
        ? undefined
        : new URLSearchParams({ project: projectId }).toString();
    for (let attempt = 0; attempt < 10; attempt++) {
      let script = await this.getResource(scriptId, queryString);
      if (script.status?.code === 5) return;
      if (script.status?.code === -1)
        throw createApiServiceError(
          `Script ${scriptId} failed to compile: ${script.status.message}`
        );
      if (attempt < 9) await new Promise(resolve => setTimeout(resolve, 1_000));
    }
    throw createApiServiceError(
      `Script ${scriptId} is still compiling. Check it with get_resource, then call execute_whizzml with scriptId when finished.`
    );
  }
}
