import { Buffer } from 'node:buffer';
import { createAxios, requestAxios, requestAxiosData } from 'slates';
import { replicateApiError } from './errors';

let axios = createAxios({
  baseURL: 'https://api.replicate.com/v1'
});

type PredictionParams = {
  input: Record<string, any>;
  webhook?: string;
  webhookEventsFilter?: string[];
  waitSeconds?: number;
  cancelAfter?: string;
  stream?: boolean;
};

type FileUploadParams = {
  filename: string;
  contentType?: string;
  contentBase64?: string;
  contentText?: string;
  metadata?: Record<string, any>;
};

let encodeSegment = (value: string) => encodeURIComponent(value);

let paginationParams = (params?: { cursor?: string }) =>
  params?.cursor ? { cursor: params.cursor } : undefined;

let appendDefined = (body: Record<string, any>, values: Record<string, any>) => {
  for (let [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      body[key] = value;
    }
  }
};

let toBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value, 'binary');
  return Buffer.from([]);
};

export class Client {
  private headers: Record<string, string>;
  private authHeaders: Record<string, string>;

  constructor(config: { token: string }) {
    this.authHeaders = {
      Authorization: `Bearer ${config.token}`
    };
    this.headers = {
      ...this.authHeaders,
      'Content-Type': 'application/json'
    };
  }

  private async request<T = any>(operation: string, config: Record<string, any>): Promise<T> {
    return await requestAxiosData<T>(
      operation,
      () => axios.request(config),
      replicateApiError
    );
  }

  private async requestRaw(operation: string, config: Record<string, any>): Promise<any> {
    return await requestAxios(operation, () => axios.request(config), replicateApiError);
  }

  private predictionHeaders(params: Pick<PredictionParams, 'waitSeconds' | 'cancelAfter'>) {
    let headers = { ...this.headers };

    if (params.waitSeconds !== undefined) {
      headers.Prefer = `wait=${params.waitSeconds}`;
    }
    if (params.cancelAfter !== undefined) {
      headers['Cancel-After'] = params.cancelAfter;
    }

    return headers;
  }

  private predictionBody(params: PredictionParams & { version?: string }) {
    let body: Record<string, any> = { input: params.input };

    appendDefined(body, {
      version: params.version,
      webhook: params.webhook,
      webhook_events_filter: params.webhookEventsFilter,
      stream: params.stream
    });

    return body;
  }

  // Account

  async getAccount() {
    return await this.request('get account', {
      method: 'get',
      url: '/account',
      headers: this.headers
    });
  }

  // Predictions

  async createPrediction(params: PredictionParams & { version: string }) {
    return await this.request('create prediction', {
      method: 'post',
      url: '/predictions',
      data: this.predictionBody(params),
      headers: this.predictionHeaders(params)
    });
  }

  async createModelPrediction(owner: string, name: string, params: PredictionParams) {
    return await this.request('create model prediction', {
      method: 'post',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/predictions`,
      data: this.predictionBody(params),
      headers: this.predictionHeaders(params)
    });
  }

  async createDeploymentPrediction(owner: string, name: string, params: PredictionParams) {
    return await this.request('create deployment prediction', {
      method: 'post',
      url: `/deployments/${encodeSegment(owner)}/${encodeSegment(name)}/predictions`,
      data: this.predictionBody(params),
      headers: this.predictionHeaders(params)
    });
  }

  async getPrediction(predictionId: string) {
    return await this.request('get prediction', {
      method: 'get',
      url: `/predictions/${encodeSegment(predictionId)}`,
      headers: this.headers
    });
  }

  async listPredictions(params?: {
    cursor?: string;
    createdAfter?: string;
    createdBefore?: string;
    source?: 'api' | 'web';
  }) {
    return await this.request('list predictions', {
      method: 'get',
      url: '/predictions',
      params: {
        cursor: params?.cursor,
        created_after: params?.createdAfter,
        created_before: params?.createdBefore,
        source: params?.source
      },
      headers: this.headers
    });
  }

  async cancelPrediction(predictionId: string) {
    return await this.request('cancel prediction', {
      method: 'post',
      url: `/predictions/${encodeSegment(predictionId)}/cancel`,
      data: {},
      headers: this.headers
    });
  }

  // Models

  async createModel(params: {
    owner: string;
    name: string;
    visibility: 'public' | 'private';
    hardware: string;
    description?: string;
    githubUrl?: string;
    paperUrl?: string;
    licenseUrl?: string;
    coverImageUrl?: string;
  }) {
    let body: Record<string, any> = {
      owner: params.owner,
      name: params.name,
      visibility: params.visibility,
      hardware: params.hardware
    };
    appendDefined(body, {
      description: params.description,
      github_url: params.githubUrl,
      paper_url: params.paperUrl,
      license_url: params.licenseUrl,
      cover_image_url: params.coverImageUrl
    });

    return await this.request('create model', {
      method: 'post',
      url: '/models',
      data: body,
      headers: this.headers
    });
  }

  async getModel(owner: string, name: string) {
    return await this.request('get model', {
      method: 'get',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}`,
      headers: this.headers
    });
  }

  async listModels(params?: {
    cursor?: string;
    sortBy?: 'model_created_at' | 'latest_version_created_at';
    sortDirection?: 'asc' | 'desc';
  }) {
    return await this.request('list models', {
      method: 'get',
      url: '/models',
      params: {
        cursor: params?.cursor,
        sort_by: params?.sortBy,
        sort_direction: params?.sortDirection
      },
      headers: this.headers
    });
  }

  async updateModel(
    owner: string,
    name: string,
    params: {
      description?: string;
      readme?: string;
      githubUrl?: string;
      paperUrl?: string;
      licenseUrl?: string;
      coverImageUrl?: string;
      weightsUrl?: string;
    }
  ) {
    let body: Record<string, any> = {};
    appendDefined(body, {
      description: params.description,
      readme: params.readme,
      github_url: params.githubUrl,
      paper_url: params.paperUrl,
      license_url: params.licenseUrl,
      cover_image_url: params.coverImageUrl,
      weights_url: params.weightsUrl
    });

    return await this.request('update model', {
      method: 'patch',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}`,
      data: body,
      headers: this.headers
    });
  }

  async deleteModel(owner: string, name: string) {
    await this.request('delete model', {
      method: 'delete',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}`,
      headers: this.headers
    });
  }

  async listModelVersions(owner: string, name: string, params?: { cursor?: string }) {
    return await this.request('list model versions', {
      method: 'get',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/versions`,
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async getModelVersion(owner: string, name: string, versionId: string) {
    return await this.request('get model version', {
      method: 'get',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/versions/${encodeSegment(
        versionId
      )}`,
      headers: this.headers
    });
  }

  async deleteModelVersion(owner: string, name: string, versionId: string) {
    await this.request('delete model version', {
      method: 'delete',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/versions/${encodeSegment(
        versionId
      )}`,
      headers: this.headers
    });
  }

  async listModelExamples(owner: string, name: string, params?: { cursor?: string }) {
    return await this.request('list model examples', {
      method: 'get',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/examples`,
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async getModelReadme(owner: string, name: string) {
    return await this.request<string>('get model readme', {
      method: 'get',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/readme`,
      headers: {
        ...this.authHeaders,
        Accept: 'text/plain'
      }
    });
  }

  // Trainings

  async createTraining(
    owner: string,
    name: string,
    versionId: string,
    params: {
      destination: string;
      input: Record<string, any>;
      webhook?: string;
      webhookEventsFilter?: string[];
    }
  ) {
    let body: Record<string, any> = {
      destination: params.destination,
      input: params.input
    };
    appendDefined(body, {
      webhook: params.webhook,
      webhook_events_filter: params.webhookEventsFilter
    });

    return await this.request('create training', {
      method: 'post',
      url: `/models/${encodeSegment(owner)}/${encodeSegment(name)}/versions/${encodeSegment(
        versionId
      )}/trainings`,
      data: body,
      headers: this.headers
    });
  }

  async getTraining(trainingId: string) {
    return await this.request('get training', {
      method: 'get',
      url: `/trainings/${encodeSegment(trainingId)}`,
      headers: this.headers
    });
  }

  async listTrainings(params?: { cursor?: string }) {
    return await this.request('list trainings', {
      method: 'get',
      url: '/trainings',
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async cancelTraining(trainingId: string) {
    return await this.request('cancel training', {
      method: 'post',
      url: `/trainings/${encodeSegment(trainingId)}/cancel`,
      data: {},
      headers: this.headers
    });
  }

  // Deployments

  async createDeployment(params: {
    name: string;
    model: string;
    version: string;
    hardware: string;
    minInstances: number;
    maxInstances: number;
  }) {
    let body = {
      name: params.name,
      model: params.model,
      version: params.version,
      hardware: params.hardware,
      min_instances: params.minInstances,
      max_instances: params.maxInstances
    };

    return await this.request('create deployment', {
      method: 'post',
      url: '/deployments',
      data: body,
      headers: this.headers
    });
  }

  async getDeployment(owner: string, name: string) {
    return await this.request('get deployment', {
      method: 'get',
      url: `/deployments/${encodeSegment(owner)}/${encodeSegment(name)}`,
      headers: this.headers
    });
  }

  async listDeployments(params?: { cursor?: string }) {
    return await this.request('list deployments', {
      method: 'get',
      url: '/deployments',
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async updateDeployment(
    owner: string,
    name: string,
    params: {
      version?: string;
      hardware?: string;
      minInstances?: number;
      maxInstances?: number;
    }
  ) {
    let body: Record<string, any> = {};
    appendDefined(body, {
      version: params.version,
      hardware: params.hardware,
      min_instances: params.minInstances,
      max_instances: params.maxInstances
    });

    return await this.request('update deployment', {
      method: 'patch',
      url: `/deployments/${encodeSegment(owner)}/${encodeSegment(name)}`,
      data: body,
      headers: this.headers
    });
  }

  async deleteDeployment(owner: string, name: string) {
    await this.request('delete deployment', {
      method: 'delete',
      url: `/deployments/${encodeSegment(owner)}/${encodeSegment(name)}`,
      headers: this.headers
    });
  }

  // Collections

  async listCollections(params?: { cursor?: string }) {
    return await this.request('list collections', {
      method: 'get',
      url: '/collections',
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async getCollection(slug: string) {
    return await this.request('get collection', {
      method: 'get',
      url: `/collections/${encodeSegment(slug)}`,
      headers: this.headers
    });
  }

  // Files

  async createFile(params: FileUploadParams) {
    let contentType = params.contentType ?? 'application/octet-stream';
    let form = new FormData();
    let content =
      params.contentBase64 !== undefined
        ? Buffer.from(params.contentBase64, 'base64')
        : (params.contentText ?? '');

    form.append('content', new Blob([content], { type: contentType }), params.filename);
    form.append('filename', params.filename);
    form.append('type', contentType);

    if (params.metadata !== undefined) {
      form.append('metadata', JSON.stringify(params.metadata));
    }

    return await this.request('create file', {
      method: 'post',
      url: '/files',
      data: form,
      headers: this.authHeaders
    });
  }

  async listFiles(params?: { cursor?: string }) {
    return await this.request('list files', {
      method: 'get',
      url: '/files',
      params: paginationParams(params),
      headers: this.headers
    });
  }

  async getFile(fileId: string) {
    return await this.request('get file', {
      method: 'get',
      url: `/files/${encodeSegment(fileId)}`,
      headers: this.headers
    });
  }

  async downloadFile(
    fileId: string,
    params: { owner: string; expiry: string; signature: string }
  ) {
    let response = await this.requestRaw('download file', {
      method: 'get',
      url: `/files/${encodeSegment(fileId)}/download`,
      params,
      headers: this.authHeaders,
      responseType: 'arraybuffer'
    });
    let contentType =
      response.headers?.['content-type'] ??
      response.headers?.get?.('content-type') ??
      'application/octet-stream';
    let buffer = toBuffer(response.data);

    return {
      contentBase64: buffer.toString('base64'),
      contentType,
      size: buffer.byteLength
    };
  }

  async deleteFile(fileId: string) {
    await this.request('delete file', {
      method: 'delete',
      url: `/files/${encodeSegment(fileId)}`,
      headers: this.headers
    });
  }

  // Hardware

  async listHardware() {
    return await this.request('list hardware', {
      method: 'get',
      url: '/hardware',
      headers: this.headers
    });
  }

  // Search

  async search(query: string, limit?: number) {
    return await this.request('search', {
      method: 'get',
      url: '/search',
      params: { query, limit },
      headers: this.headers
    });
  }

  // Webhooks

  async getWebhookSigningSecret() {
    return await this.request('get webhook signing secret', {
      method: 'get',
      url: '/webhooks/default/secret',
      headers: this.headers
    });
  }
}
