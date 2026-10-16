import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { recordResponse } from './responses';

type GenerationParams = Record<string, unknown>;
type ListParams = { limit?: number; offset?: number; startAfterId?: string };

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('Provide a Cloudlayer API key.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.cloudlayer.io/v2',
      authHeader: { name: 'X-API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Cloudlayer',
          reason: 'cloudlayer_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['message', 'error', 'errors']
        })
    });
  }

  private async generate(path: string, params: GenerationParams) {
    let body = { ...params };
    if (params.waitForSelector !== undefined) {
      let { timeout, ...wait } = recordResponse(params.waitForSelector);
      let options = wait.options === undefined ? {} : recordResponse(wait.options);
      body.waitForSelector = {
        ...wait,
        options: pickDefined({ ...options, timeout: options.timeout ?? timeout })
      };
    }
    if (params.generatePreview !== undefined) {
      let { imageType, ...preview } = recordResponse(params.generatePreview);
      body.generatePreview = pickDefined({ ...preview, type: preview.type ?? imageType });
    }
    let response = await this.axios.post(path, body);
    let result = recordResponse(response.data);
    if (
      result.status === 'error' &&
      !result.id &&
      !result.jobId &&
      typeof result.message === 'string'
    ) {
      throw createApiServiceError(
        `Cloudlayer could not generate the document: ${result.message}`
      );
    }
    return result;
  }

  async generatePdfFromHtml(params: GenerationParams) {
    return this.generate('/html/pdf', params);
  }
  async generatePdfFromUrl(params: GenerationParams) {
    let { batch, ...rest } = params;
    // Retain the public array input while sending the documented batch object.
    return this.generate('/url/pdf', {
      ...rest,
      ...(batch === undefined ? {} : { batch: { urls: batch } })
    });
  }
  async generatePdfFromTemplate(params: GenerationParams) {
    return this.generate('/template/pdf', params);
  }
  async generateImageFromHtml(params: GenerationParams) {
    return this.generate('/html/image', params);
  }
  async generateImageFromUrl(params: GenerationParams) {
    return this.generate('/url/image', params);
  }
  async generateImageFromTemplate(params: GenerationParams) {
    return this.generate('/template/image', params);
  }

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${encodeURIComponent(jobId)}`);
    return recordResponse(response.data);
  }
  async listJobs(params?: ListParams): Promise<unknown> {
    let response = await this.axios.get('/jobs', { params });
    return response.data;
  }
  async getAsset(assetId: string) {
    let response = await this.axios.get(`/assets/${encodeURIComponent(assetId)}`);
    return recordResponse(response.data);
  }
  async listAssets(params?: ListParams): Promise<unknown> {
    let response = await this.axios.get('/assets', { params });
    return response.data;
  }
  async getStatus() {
    // Existing connections retain the legacy status endpoint.
    let response = await this.axios.get('/getStatus');
    return recordResponse(response.data);
  }
  async getAccount() {
    let response = await this.axios.get('/account');
    return recordResponse(response.data);
  }
}
