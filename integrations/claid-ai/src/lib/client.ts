import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';
import {
  acceptedResponseSchema,
  fileSchema,
  jobResponseSchema,
  storageSchema,
  validateWholeNumber
} from './responses';

type EditRequest = {
  input: string;
  operations: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Claid.ai API key is required. Reconnect with a valid key.'
      );
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.claid.ai/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 180_000
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    schema: z.ZodType<T>,
    data?: unknown
  ) {
    let result = await requestAxiosData(
      `${method} ${path}`,
      () => this.api.request<unknown>({ method, url: path, data }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Claid.ai',
          reason: 'claid_api_error',
          operation,
          detailKeys: ['error_message', 'error_code', 'message', 'msg', 'detail', 'error'],
          nestedKeys: ['detail', 'errors', 'error_details'],
          extractResponse: (error, helpers) => {
            let response = helpers.getResponse(error);
            if (!helpers.isRecord(error) || !helpers.isRecord(error.data)) {
              return response;
            }
            let normalized = error.data;
            let baggage = helpers.isRecord(normalized.baggage)
              ? normalized.baggage
              : undefined;
            let upstream = helpers.isRecord(normalized.upstream)
              ? normalized.upstream
              : undefined;
            let status = upstream?.status ?? normalized.status;
            return {
              ...response,
              data: response?.data ?? baggage?.response,
              status:
                typeof status === 'number' || typeof status === 'string'
                  ? status
                  : response?.status
            };
          },
          extractUpstreamCode: (error, response, helpers) => {
            if (helpers.isRecord(error) && helpers.isRecord(error.data)) {
              let upstream = helpers.isRecord(error.data.upstream)
                ? error.data.upstream
                : undefined;
              if (typeof upstream?.code === 'string') return upstream.code;
            }
            return helpers.isRecord(response?.data) &&
              typeof response.data.error_code === 'string'
              ? response.data.error_code
              : undefined;
          }
        })
    );
    let parsed = schema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        `Claid.ai returned an invalid response for ${method} ${path}.`,
        { reason: 'claid_invalid_response' }
      );
    }
    return parsed.data;
  }

  private validateId(value: number, field: string) {
    validateWholeNumber(value, field);
    if (value <= 0)
      throw createApiServiceError(`${field} must be a positive task or storage ID.`);
  }

  editImage(params: EditRequest) {
    return this.request(
      'POST',
      '/image/edit',
      z.object({ data: z.object({ input: fileSchema, output: fileSchema }) }),
      params
    );
  }

  editImageAsync(params: EditRequest) {
    return this.request('POST', '/image/edit/async', acceptedResponseSchema, params);
  }

  getAsyncEditStatus(taskId: number) {
    this.validateId(taskId, 'taskId');
    return this.request('GET', `/image/edit/async/${taskId}`, jobResponseSchema);
  }

  generateImage(params: {
    input: string;
    options?: { number_of_images?: number; guidance_scale?: number };
    output?: string;
  }) {
    return this.request(
      'POST',
      '/image/generate',
      z.object({
        data: z.object({
          input: z.object({ text: z.string() }),
          output: z.union([z.array(fileSchema), fileSchema])
        })
      }),
      params
    );
  }

  createScene(params: {
    object: Record<string, unknown>;
    scene: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    return this.request(
      'POST',
      '/scene/create',
      z.object({
        data: z.object({
          input: fileSchema,
          output: z.union([z.array(fileSchema), fileSchema])
        })
      }),
      params
    );
  }

  generateFashionModel(params: {
    input: { clothing: string[]; model?: string };
    output?: Record<string, unknown>;
    options: Record<string, unknown>;
  }) {
    return this.request('POST', '/image/ai-fashion-models', acceptedResponseSchema, params);
  }

  getFashionModelStatus(taskId: number) {
    this.validateId(taskId, 'taskId');
    return this.request('GET', `/image/ai-fashion-models/${taskId}`, jobResponseSchema);
  }

  generateVideo(params: { input: string; output?: string; options: Record<string, unknown> }) {
    return this.request('POST', '/video/generate', acceptedResponseSchema, params);
  }

  getVideoStatus(taskId: number) {
    this.validateId(taskId, 'taskId');
    return this.request('GET', `/video/generate/${taskId}`, jobResponseSchema);
  }

  aiEditImage(params: {
    input: string;
    options: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    return this.request('POST', '/image/ai-edit', acceptedResponseSchema, params);
  }

  getAiEditStatus(taskId: number) {
    this.validateId(taskId, 'taskId');
    return this.request('GET', `/image/ai-edit/${taskId}`, jobResponseSchema);
  }

  listStorages() {
    return this.request(
      'GET',
      '/storage/storages',
      z.object({ data: z.array(storageSchema) })
    );
  }

  getStorage(storageId: number) {
    this.validateId(storageId, 'storageId');
    return this.request(
      'GET',
      `/storage/storages/${storageId}`,
      z.object({ data: storageSchema })
    );
  }

  createStorage(params: { name: string; type: string; parameters: Record<string, unknown> }) {
    return this.request(
      'POST',
      '/storage/storages',
      z.object({ data: storageSchema }),
      params
    );
  }

  updateStorage(
    storageId: number,
    params: {
      name?: string;
      type?: string;
      parameters?: Record<string, unknown>;
    }
  ) {
    this.validateId(storageId, 'storageId');
    return this.request(
      'PATCH',
      `/storage/storages/${storageId}`,
      z.object({ data: storageSchema }),
      params
    );
  }

  deleteStorage(storageId: number) {
    this.validateId(storageId, 'storageId');
    return this.request(
      'DELETE',
      `/storage/storages/${storageId}`,
      z.object({}).passthrough()
    );
  }

  listStorageTypes() {
    return this.request(
      'GET',
      '/storage/storage-types',
      z.object({ data: z.array(z.string()) })
    );
  }
}
