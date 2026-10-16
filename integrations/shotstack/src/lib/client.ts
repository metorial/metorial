import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export type Environment = 'production' | 'sandbox';
export type ApiRecord = Record<string, any>;

export let record = (value: unknown, label: string): ApiRecord => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`Shotstack returned an invalid ${label}.`);
  return value;
};

export let text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`Shotstack did not return a valid ${label}.`);
  return value;
};

export let records = (value: unknown, label: string): ApiRecord[] => {
  if (!Array.isArray(value))
    throw createApiServiceError(`Shotstack returned an invalid ${label}.`);
  return value.map(item => record(item, label));
};

let createApiClient = (apiPath: string, token: string, environment: Environment) => {
  if (!token.trim()) throw createApiServiceError('Provide a Shotstack API key.');
  let version = environment === 'production' ? 'v1' : 'stage';
  let http = createAxios({
    baseURL: `https://api.shotstack.io/${apiPath}/${version}`,
    timeout: 30000,
    maxRedirects: 0,
    headers: { 'x-api-key': token, 'Content-Type': 'application/json' }
  });
  http.interceptors.response.use(
    response => {
      if (isApiErrorRecord(response.data) && response.data.success === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Shotstack',
            reason: 'shotstack_api_error',
            nestedKeys: ['errors', 'response']
          }
        );
      }
      return response;
    },
    error =>
      Promise.reject(
        buildApiServiceError(error, {
          providerLabel: 'Shotstack',
          reason: 'shotstack_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          nestedKeys: ['errors', 'response']
        })
      )
  );
  return http;
};

let editResponse = (value: unknown) => {
  let body = record(value, 'Edit response');
  record(body.response, 'Edit response data');
  return body;
};
let resourceResponse = (value: unknown) => {
  let body = record(value, 'resource response');
  record(body.data, 'resource data');
  return body;
};
let pathId = (value: string) => encodeURIComponent(text(value, 'resource ID'));

let validateSize = (size: { width?: number; height?: number } | undefined) => {
  for (let value of [size?.width, size?.height]) {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0 || value % 2 !== 0))
      throw createApiServiceError(
        'Custom width and height must be positive integers divisible by 2.'
      );
  }
};
let validateRenditions = (renditions: ApiRecord[] | undefined) => {
  for (let rendition of renditions ?? []) {
    validateSize(rendition.size);
    if (
      rendition.quality !== undefined &&
      (!Number.isInteger(rendition.quality) ||
        rendition.quality < 1 ||
        rendition.quality > 100)
    )
      throw createApiServiceError('Rendition quality must be an integer between 1 and 100.');
    if (
      rendition.speed?.speed !== undefined &&
      (rendition.speed.speed < 0 || rendition.speed.speed > 10)
    )
      throw createApiServiceError('Rendition speed must be between 0 and 10.');
  }
};

export class EditClient {
  private http: ReturnType<typeof createAxios>;
  constructor(token: string, environment: Environment) {
    this.http = createApiClient('edit', token, environment);
  }
  async render(edit: ApiRecord): Promise<ApiRecord> {
    if (
      edit.output.size &&
      (edit.output.resolution !== undefined || edit.output.aspectRatio !== undefined)
    )
      throw createApiServiceError('Use a custom size or resolution/aspectRatio, not both.');
    validateSize(edit.output.size);
    let res = await this.http.post('/render', edit);
    return this.queued(res.data);
  }
  private queued(value: unknown) {
    let body = editResponse(value);
    text(body.response.id, 'job or template ID');
    text(body.response.message, 'response message');
    return body;
  }
  async getRender(renderId: string, options?: { data?: boolean; merged?: boolean }) {
    let res = await this.http.get(`/render/${pathId(renderId)}`, {
      params: { data: options?.data, merged: options?.merged }
    });
    let body = editResponse(res.data);
    text(body.response.id, 'render ID');
    text(body.response.status, 'render status');
    return body;
  }
  async createTemplate(name: string, template: ApiRecord) {
    let res = await this.http.post('/templates', { name, template });
    return this.queued(res.data);
  }
  async listTemplates() {
    let res = await this.http.get('/templates');
    let body = editResponse(res.data);
    records(body.response.templates, 'templates');
    return body;
  }
  async getTemplate(templateId: string) {
    let res = await this.http.get(`/templates/${pathId(templateId)}`);
    let body = editResponse(res.data);
    text(body.response.id, 'template ID');
    text(body.response.name, 'template name');
    record(body.response.template, 'template');
    return body;
  }
  async updateTemplate(templateId: string, name: string, template: ApiRecord) {
    let res = await this.http.put(`/templates/${pathId(templateId)}`, { name, template });
    return this.queued(res.data);
  }
  async deleteTemplate(templateId: string): Promise<void> {
    await this.http.delete(`/templates/${pathId(templateId)}`);
  }
  async renderTemplate(templateId: string, merge?: Array<{ find: string; replace: string }>) {
    let res = await this.http.post('/templates/render', { id: templateId, merge });
    return this.queued(res.data);
  }
  async probe(url: string) {
    let res = await this.http.get(`/probe/${encodeURIComponent(url)}`);
    return editResponse(res.data);
  }
  async generate(body: ApiRecord, idempotencyKey?: string) {
    let res = await this.http.post('/generate', body, {
      headers: idempotencyKey === undefined ? undefined : { 'Idempotency-Key': idempotencyKey }
    });
    return generationResponse(res.data);
  }
  async getGeneration(id: string) {
    let res = await this.http.get(`/generate/${pathId(id)}`);
    return generationResponse(res.data);
  }
  async quoteGeneration(body: ApiRecord) {
    let res = await this.http.post('/generate/quote', body);
    let result = record(res.data, 'generation quote');
    if (
      typeof result.credits !== 'number' ||
      !Number.isFinite(result.credits) ||
      typeof result.ceiling !== 'boolean'
    )
      throw createApiServiceError('Shotstack returned an invalid generation quote.');
    return result;
  }
  async listModels(expandOptions?: boolean) {
    let res = await this.http.get('/models', {
      params: { expand: expandOptions ? 'options' : undefined }
    });
    let result = record(res.data, 'generation models');
    records(result.models, 'generation models');
    return result;
  }
  async getModel(id: string) {
    let res = await this.http.get(`/models/${pathId(id)}`);
    return record(res.data, 'generation model');
  }
}

let generationResponse = (value: unknown) => {
  let result = record(value, 'generation response');
  text(result.id, 'generation ID');
  text(result.status, 'generation status');
  return result;
};

export class ServeClient {
  private http: ReturnType<typeof createAxios>;
  constructor(token: string, environment: Environment) {
    this.http = createApiClient('serve', token, environment);
  }
  async getAsset(assetId: string) {
    let res = await this.http.get(`/assets/${pathId(assetId)}`);
    return resourceResponse(res.data);
  }
  async deleteAsset(assetId: string): Promise<void> {
    await this.http.delete(`/assets/${pathId(assetId)}`);
  }
  async getAssetsByRenderId(renderId: string) {
    let res = await this.http.get(`/assets/render/${pathId(renderId)}`);
    let body = record(res.data, 'asset collection');
    records(body.data, 'assets');
    return body;
  }
  async transferAsset(transfer: ApiRecord) {
    let res = await this.http.post('/assets', transfer);
    return resourceResponse(res.data);
  }
}

export class IngestClient {
  private http: ReturnType<typeof createAxios>;
  constructor(token: string, environment: Environment) {
    this.http = createApiClient('ingest', token, environment);
  }
  async fetchSource(source: ApiRecord) {
    validateRenditions(source.outputs?.renditions);
    let res = await this.http.post('/sources', source);
    let body = resourceResponse(res.data);
    text(body.data.id, 'source ID');
    return body;
  }
  async requestUploadUrl(options?: ApiRecord) {
    validateRenditions(options?.outputs?.renditions);
    let res = await this.http.post('/upload', options ?? {});
    return resourceResponse(res.data);
  }
  async listSources() {
    let res = await this.http.get('/sources');
    let body = record(res.data, 'source collection');
    records(body.data, 'sources');
    return body;
  }
  async getSource(sourceId: string) {
    let res = await this.http.get(`/sources/${pathId(sourceId)}`);
    return resourceResponse(res.data);
  }
  async deleteSource(sourceId: string): Promise<void> {
    await this.http.delete(`/sources/${pathId(sourceId)}`);
  }
}

export class CreateClient {
  private http: ReturnType<typeof createAxios>;
  constructor(token: string, environment: Environment) {
    this.http = createApiClient('create', token, environment);
  }
  async generateAsset(provider: string, options: ApiRecord) {
    let res = await this.http.post('/assets', { provider, options });
    return resourceResponse(res.data);
  }
  async getGeneratedAsset(assetId: string) {
    let res = await this.http.get(`/assets/${pathId(assetId)}`);
    return resourceResponse(res.data);
  }
}
