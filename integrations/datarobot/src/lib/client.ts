import { isServiceError, ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

export type DataRobotRecord = Record<string, any>;

export function normalizeEndpoint(value: unknown = 'https://app.datarobot.com') {
  if (typeof value !== 'string') {
    throw createApiServiceError('Enter the HTTPS URL of your DataRobot instance.');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Enter a valid HTTPS DataRobot instance URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/', '/api/v2', '/api/v2/'].includes(url.pathname)
  ) {
    throw createApiServiceError(
      'Use an HTTPS DataRobot instance URL with no credentials, query, or fragment; /api/v2 is optional.'
    );
  }
  return `${url.origin}/api/v2`;
}

export function requireRecord(value: unknown, label: string): DataRobotRecord {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`DataRobot returned invalid ${label}; expected an object.`);
  }
  return value;
}

export function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`DataRobot returned no valid ${label}.`);
  }
  return value;
}

export function responseItems(value: unknown, label: string): DataRobotRecord[] {
  let items = Array.isArray(value) ? value : requireRecord(value, label).data;
  if (!Array.isArray(items)) {
    throw createApiServiceError(`DataRobot returned invalid ${label}; expected a list.`);
  }
  return items.map(item => requireRecord(item, `${label} item`));
}

export function validateInteger(value: number | undefined, label: string, min = 0) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min)) {
    throw createApiServiceError(`${label} must be an integer of at least ${min}.`);
  }
}

function redactPublic<T>(value: T, token: string): T {
  if (typeof value === 'string') {
    let result = value
      .split(token)
      .join('[redacted]')
      .split(encodeURIComponent(token))
      .join('[redacted]');
    result = result.replace(
      /([?&](?:api[_-]?key|key|access[_-]?token|refresh[_-]?token|token|auth|authorization|password|secret(?:[_-]?token)?|signature|x-amz-signature|x-goog-signature|sig)=)[^&#\s]*/gi,
      '$1[redacted]'
    );
    return result as T;
  }
  if (Array.isArray(value)) return value.map(item => redactPublic(item, token)) as T;
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret|secretToken|datarobot[_-]?key|authorization|cookie|credentials|customer[\s_-]*key)$/i.test(
          key
        )
          ? item === null
            ? null
            : '[redacted]'
          : redactPublic(item, token)
      ])
    ) as T;
  }
  return value;
}

export class DataRobotClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private baseURL: string;
  private token: string;

  constructor(opts: { token: string; endpointUrl?: unknown }) {
    if (!opts.token?.trim())
      throw createApiServiceError('Reconnect DataRobot with an API key.');
    this.token = opts.token;
    this.baseURL = normalizeEndpoint(opts.endpointUrl);
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseURL,
      timeout: 60000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${opts.token}` },
      errorAdapter: error => {
        if (error instanceof ServiceError || isServiceError(error)) return error;
        if (isApiErrorRecord(error) && isServiceError(error.cause)) return error.cause;
        return buildApiServiceError(error, {
          providerLabel: 'DataRobot',
          reason: 'datarobot_request_failed',
          parent: {},
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractMessage: (error, helpers) => {
            let response = helpers.getResponseWithBody(error);
            let details: string[] = [];
            let collect = (value: unknown, path = '') => {
              if (typeof value === 'string') {
                if (value.trim()) details.push(`${path ? `${path}: ` : ''}${value}`);
              } else if (Array.isArray(value)) {
                for (let item of value) collect(item, path);
              } else if (isApiErrorRecord(value)) {
                for (let [key, item] of Object.entries(value)) {
                  collect(item, path ? `${path}.${key}` : key);
                }
              }
            };
            collect(redactPublic(response?.data, this.token));
            let message = details.join('; ') || helpers.extractMessage(error);
            return redactPublic(message, this.token).slice(0, 3000);
          },
          formatMessage: ({ statusLabel, message }) =>
            `DataRobot request failed: ${statusLabel}${message} Check the indicated fields, resource access, and API key permissions.`
        });
      }
    });
  }

  private safeLocation(location: string) {
    let url: URL;
    try {
      url = new URL(location, `${this.baseURL}/`);
    } catch {
      throw createApiServiceError('DataRobot returned an invalid job location.');
    }
    if (
      url.origin !== new URL(this.baseURL).origin ||
      !url.pathname.startsWith('/api/v2/') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw createApiServiceError('DataRobot returned an unexpected job location.');
    }
    return url.toString();
  }

  private async resolveJob(location: string): Promise<unknown> {
    let current = this.safeLocation(location);
    let deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      let res = await this.axios.get(current, {
        validateStatus: status =>
          status === 303 || status === 307 || (status >= 200 && status < 300)
      });
      if (res.status === 303 || res.status === 307) {
        let target = getResponseHeaderValue(res.headers, 'location');
        if (!target)
          throw createApiServiceError('DataRobot returned no completed job location.');
        current = this.safeLocation(target);
        if (res.status === 303) return (await this.axios.get(current)).data;
        continue;
      }
      let data = requireRecord(res.data, 'job status');
      let status = typeof data.status === 'string' ? data.status.toLowerCase() : undefined;
      if (status?.startsWith('error') || status?.startsWith('abort') || status === 'failed') {
        throw createApiServiceError(
          `DataRobot job failed: ${redactPublic(String(data.message ?? data.status), this.token)}`
        );
      }
      if (status === 'completed') return data;
      if (!status) throw createApiServiceError('DataRobot returned no job status.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw createApiServiceError(
      'DataRobot is still processing the job. Check its status before retrying to avoid creating a duplicate resource.'
    );
  }

  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
    params?: DataRobotRecord
  ) {
    if (params) {
      validateInteger(params.offset, 'offset');
      validateInteger(params.limit, 'limit');
    }
    let res = await this.axios.request({ method, url: path, data: body, params });
    return redactPublic(res.data, this.token);
  }

  private entity(value: unknown, key: string, label: string, name?: string) {
    let data = requireRecord(value, label);
    requireString(data[key] ?? data.id, `${label} ID`);
    if (name) requireString(data[name], `${label} ${name}`);
    return data;
  }

  async listProjects(params?: DataRobotRecord) {
    let data = await this.request('get', '/projects/', undefined, params);
    return responseItems(data, 'projects').map(p =>
      this.entity(p, 'id', 'project', 'projectName')
    );
  }
  async getProject(projectId: string) {
    return this.entity(
      await this.request('get', `/projects/${encodeURIComponent(projectId)}/`),
      'id',
      'project',
      'projectName'
    );
  }
  async createProject(body: DataRobotRecord) {
    let res = await this.axios.post('/projects/', body);
    let data = requireRecord(res.data, 'project creation response');
    let id = requireString(data.pid ?? data.id ?? data.projectId, 'created project ID');
    let location = getResponseHeaderValue(res.headers, 'location');
    if (location) await this.resolveJob(location);
    return this.getProject(id);
  }
  async updateProject(projectId: string, body: DataRobotRecord) {
    await this.request('patch', `/projects/${encodeURIComponent(projectId)}/`, body);
    return this.getProject(projectId);
  }
  async deleteProject(projectId: string) {
    await this.request('delete', `/projects/${encodeURIComponent(projectId)}/`);
  }
  async setTarget(projectId: string, body: DataRobotRecord) {
    validateInteger(body.seed, 'seed');
    validateInteger(body.blueprintThreshold, 'blueprintThreshold');
    if (
      body.majorityDownsamplingRate !== undefined &&
      (!Number.isFinite(body.majorityDownsamplingRate) ||
        body.majorityDownsamplingRate < 0 ||
        body.majorityDownsamplingRate > 100 ||
        body.smartDownsampled !== true)
    ) {
      throw createApiServiceError(
        'majorityDownsamplingRate must be between 0 and 100 and requires smartDownsampled=true.'
      );
    }
    let res = await this.axios.patch(`/projects/${encodeURIComponent(projectId)}/aim/`, body);
    let location = getResponseHeaderValue(res.headers, 'location');
    if (location) await this.resolveJob(location);
  }
  async listModels(projectId: string, params?: DataRobotRecord) {
    let { offset, limit, ...filters } = params ?? {};
    validateInteger(offset, 'offset');
    validateInteger(limit, 'limit');
    let data = await this.request(
      'get',
      `/projects/${encodeURIComponent(projectId)}/models/`,
      undefined,
      filters
    );
    let models = responseItems(data, 'models').map(m => this.entity(m, 'id', 'model'));
    return models.slice(offset ?? 0, limit === undefined ? undefined : (offset ?? 0) + limit);
  }
  async getModel(projectId: string, modelId: string) {
    return this.entity(
      await this.request(
        'get',
        `/projects/${encodeURIComponent(projectId)}/models/${encodeURIComponent(modelId)}/`
      ),
      'id',
      'model'
    );
  }
  async getFeatureImpact(projectId: string, modelId: string) {
    return this.request(
      'get',
      `/projects/${encodeURIComponent(projectId)}/models/${encodeURIComponent(modelId)}/featureImpact/`
    );
  }
  async requestFeatureImpact(projectId: string, modelId: string) {
    await this.request(
      'post',
      `/projects/${encodeURIComponent(projectId)}/models/${encodeURIComponent(modelId)}/featureImpact/`
    );
  }
  async listDatasets(params?: DataRobotRecord) {
    let data = requireRecord(
      await this.request('get', '/datasets/', undefined, {
        ...params,
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 100
      }),
      'datasets page'
    );
    responseItems(data, 'datasets').forEach(d => this.entity(d, 'datasetId', 'dataset'));
    return data;
  }
  async getDataset(datasetId: string) {
    return this.entity(
      await this.request('get', `/datasets/${encodeURIComponent(datasetId)}/`),
      'datasetId',
      'dataset'
    );
  }
  async createDatasetFromUrl(body: DataRobotRecord) {
    let res = await this.axios.post('/datasets/fromURL/', body);
    let data = requireRecord(res.data, 'dataset creation response');
    let id = requireString(data.catalogId ?? data.datasetId ?? data.id, 'created dataset ID');
    let location = getResponseHeaderValue(res.headers, 'location');
    if (location) await this.resolveJob(location);
    let dataset = await this.getDataset(id);
    if (body.name !== undefined) dataset = await this.updateDataset(id, { name: body.name });
    return dataset;
  }
  async updateDataset(datasetId: string, body: DataRobotRecord) {
    return this.entity(
      await this.request('patch', `/datasets/${encodeURIComponent(datasetId)}/`, body),
      'datasetId',
      'dataset'
    );
  }
  async deleteDataset(datasetId: string) {
    await this.request('delete', `/datasets/${encodeURIComponent(datasetId)}/`);
  }
  async listDeployments(params?: DataRobotRecord) {
    let data = requireRecord(
      await this.request('get', '/deployments/', undefined, params),
      'deployments page'
    );
    responseItems(data, 'deployments').forEach(d => this.entity(d, 'id', 'deployment'));
    return data;
  }
  async getDeployment(deploymentId: string) {
    return this.entity(
      await this.request('get', `/deployments/${encodeURIComponent(deploymentId)}/`),
      'id',
      'deployment'
    );
  }
  async createDeploymentFromLearningModel(body: DataRobotRecord) {
    let pkg = await this.createModelPackageFromLearningModel({ modelId: body.modelId });
    let { modelId: _modelId, ...settings } = body;
    return this.createDeploymentFromModelPackage({
      ...settings,
      modelPackageId: pkg.id ?? pkg.modelPackageId
    });
  }
  async createDeploymentFromModelPackage(body: DataRobotRecord) {
    let modelPackageId = requireString(body.modelPackageId, 'model package ID');
    let deadline = Date.now() + 180000;
    while (true) {
      let pkg = await this.getModelPackage(modelPackageId);
      if (pkg.buildStatus === 'failed') {
        throw createApiServiceError(
          'The model package build failed. Inspect the package before deploying it.'
        );
      }
      if (pkg.buildStatus !== 'inProgress') break;
      if (Date.now() >= deadline) {
        throw createApiServiceError(
          'The model package is still building. Wait for buildStatus=complete before creating the deployment.'
        );
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    let res = await this.axios.post('/deployments/fromModelPackage/', {
      description: '',
      ...body
    });
    let data = requireRecord(res.data, 'deployment creation response');
    let id = requireString(data.id ?? data.deploymentId, 'created deployment ID');
    let location = getResponseHeaderValue(res.headers, 'location');
    if (location) await this.resolveJob(location);
    return this.getDeployment(id);
  }
  async updateDeployment(deploymentId: string, body: DataRobotRecord) {
    await this.request('patch', `/deployments/${encodeURIComponent(deploymentId)}/`, body);
    return this.getDeployment(deploymentId);
  }
  async deleteDeployment(deploymentId: string) {
    await this.request('delete', `/deployments/${encodeURIComponent(deploymentId)}/`);
  }
  async replaceDeploymentModel(deploymentId: string, body: DataRobotRecord) {
    if (
      ![
        'ACCURACY',
        'DATA_DRIFT',
        'ERRORS',
        'SCHEDULED_REFRESH',
        'SCORING_SPEED',
        'DEPRECATION',
        'OTHER'
      ].includes(body.reason)
    ) {
      throw createApiServiceError(
        'replacementReason must be ACCURACY, DATA_DRIFT, ERRORS, SCHEDULED_REFRESH, SCORING_SPEED, DEPRECATION, or OTHER.'
      );
    }
    let res = await this.axios.patch(
      `/deployments/${encodeURIComponent(deploymentId)}/model/`,
      body
    );
    let location = getResponseHeaderValue(res.headers, 'location');
    if (location) await this.resolveJob(location);
  }
  async getServiceStats(deploymentId: string, params?: DataRobotRecord) {
    return this.request(
      'get',
      `/deployments/${encodeURIComponent(deploymentId)}/serviceStats/`,
      undefined,
      params
    );
  }
  async getAccuracy(deploymentId: string, params?: DataRobotRecord) {
    return this.request(
      'get',
      `/deployments/${encodeURIComponent(deploymentId)}/accuracy/`,
      undefined,
      params
    );
  }
  async getDataDrift(deploymentId: string, params?: DataRobotRecord) {
    return this.request(
      'get',
      `/deployments/${encodeURIComponent(deploymentId)}/featureDrift/`,
      undefined,
      params
    );
  }
  async getTargetDrift(deploymentId: string, params?: DataRobotRecord) {
    return this.request(
      'get',
      `/deployments/${encodeURIComponent(deploymentId)}/targetDrift/`,
      undefined,
      params
    );
  }
  async listModelPackages(params?: DataRobotRecord) {
    let { searchFor, ...rest } = params ?? {};
    let data = requireRecord(
      await this.request('get', '/modelPackages/', undefined, { ...rest, search: searchFor }),
      'model packages page'
    );
    responseItems(data, 'model packages').forEach(p => this.entity(p, 'id', 'model package'));
    return data;
  }
  async getModelPackage(modelPackageId: string) {
    return this.entity(
      await this.request('get', `/modelPackages/${encodeURIComponent(modelPackageId)}/`),
      'id',
      'model package'
    );
  }
  async createModelPackageFromLearningModel(body: DataRobotRecord) {
    let data = await this.request('post', '/modelPackages/fromLeaderboard/', body);
    return this.entity(data, 'id', 'model package');
  }
  async makePredictions(
    deploymentId: string,
    rows: DataRobotRecord[],
    params?: DataRobotRecord
  ) {
    if (!rows.length) throw createApiServiceError('Provide at least one prediction row.');
    validateInteger(params?.maxExplanations, 'maxExplanations');
    return this.request(
      'post',
      `/deployments/${encodeURIComponent(deploymentId)}/predictions`,
      rows,
      params
    );
  }
  async getCurrentUser() {
    return this.entity(await this.request('get', '/account/info/'), 'uid', 'current user');
  }
  async listPredictionServers(params?: DataRobotRecord) {
    return responseItems(
      await this.request('get', '/predictionServers/', undefined, params),
      'prediction servers'
    );
  }
  async listPredictionEnvironments(params?: DataRobotRecord) {
    return requireRecord(
      await this.request('get', '/predictionEnvironments/', undefined, {
        ...params,
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 100
      }),
      'prediction environments page'
    );
  }
  async listBlueprints(projectId: string) {
    return responseItems(
      await this.request('get', `/projects/${encodeURIComponent(projectId)}/blueprints/`),
      'blueprints'
    );
  }
  async listFeatureLists(projectId: string) {
    return responseItems(
      await this.request('get', `/projects/${encodeURIComponent(projectId)}/featurelists/`),
      'feature lists'
    );
  }
  async createBatchPredictionJob(body: DataRobotRecord) {
    return this.entity(
      await this.request('post', '/batchPredictions/', body),
      'id',
      'batch prediction job'
    );
  }
  async getBatchPredictionJob(jobId: string) {
    return this.entity(
      await this.request('get', `/batchPredictions/${encodeURIComponent(jobId)}/`),
      'id',
      'batch prediction job'
    );
  }

  getDownload(path: string) {
    return {
      url: `${this.baseURL}${path}`,
      headers: { Authorization: `Bearer ${this.token}` }
    };
  }
}
