import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  requestAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

const modelResultSchema = z.record(z.string(), z.any());
const queueSubmissionSchema = z.object({
  request_id: z.string().min(1),
  gateway_request_id: z.string().nullish(),
  response_url: z.string(),
  status_url: z.string(),
  cancel_url: z.string(),
  queue_position: z.number().nullish()
});
const queueStatusSchema = z.object({
  status: z.enum(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED']),
  queue_position: z.number().nullish(),
  logs: z.array(z.object({ message: z.string(), timestamp: z.string() })).nullish(),
  metrics: z.record(z.string(), z.number()).nullish(),
  error: z.string().nullish(),
  error_type: z.string().nullish()
});
const modelsSchema = z.object({
  models: z.array(
    z.object({
      endpoint_id: z.string(),
      metadata: modelResultSchema.nullish(),
      openapi: modelResultSchema.nullish()
    })
  ),
  next_cursor: z.string().nullish(),
  has_more: z.boolean()
});
const pricingSchema = z.object({
  prices: z.array(
    z.object({
      endpoint_id: z.string(),
      unit_price: z.number(),
      unit: z.string(),
      currency: z.string()
    })
  ),
  next_cursor: z.string().nullish(),
  has_more: z.boolean()
});

const apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'fal.ai',
    reason: 'fal_api_error',
    operation,
    nestedKeys: ['error', 'errors', 'detail'],
    detailKeys: ['message', 'detail', 'error', 'status', 'type']
  });

const parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(`fal.ai returned an invalid ${operation} response.`, {
      reason: 'fal_invalid_response'
    });
  }
  return parsed.data;
};

// Queue control operations use the app root, even for inference subpaths.
// https://github.com/fal-ai/fal-js/blob/main/libs/client/src/queue.ts
const modelPath = (modelId: string, queue = false) => {
  const parts = modelId.split('/');
  const rootLength = ['workflows', 'comfy'].includes(parts[0] ?? '') ? 3 : 2;
  if (
    parts.length < rootLength ||
    parts.some(part => !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part))
  ) {
    throw createApiServiceError(
      'Use a model endpoint ID such as fal-ai/flux/schnell, not a URL.'
    );
  }
  return `/${(queue ? parts.slice(0, rootLength) : parts).map(encodeURIComponent).join('/')}`;
};

export class FalClient {
  private runAxios;
  private queueAxios;
  private platformAxios;
  private storageAxios;
  private publicAxios;

  constructor(token: string) {
    if (!token.trim())
      throw createApiServiceError('Connect a fal.ai API key before calling this tool.');
    const options = { authHeader: { value: `Key ${token}` }, timeout: 180_000 };
    this.runAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://fal.run',
      timeout: 600_000
    });
    this.queueAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://queue.fal.run'
    });
    this.platformAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.fal.ai/v1'
    });
    this.storageAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://rest.fal.ai'
    });
    this.publicAxios = createAxios({ timeout: 120_000 });
  }

  async runModel(
    modelId: string,
    input: Record<string, unknown>,
    options?: { fileRetentionSeconds?: number }
  ) {
    const data = await requestAxiosData(
      'run inference',
      () =>
        this.runAxios.post(modelPath(modelId), input, {
          headers:
            options?.fileRetentionSeconds === undefined
              ? undefined
              : {
                  'X-Fal-Object-Lifecycle-Preference': JSON.stringify({
                    expiration_duration_seconds: options.fileRetentionSeconds
                  })
                }
        }),
      apiError
    );
    return parseResponse(modelResultSchema, data, 'inference');
  }

  async submitToQueue(
    modelId: string,
    input: Record<string, unknown>,
    options?: { webhookUrl?: string; fileRetentionSeconds?: number }
  ) {
    const data = await requestAxiosData(
      'submit a queue request',
      () =>
        this.queueAxios.post(modelPath(modelId), input, {
          params: options?.webhookUrl ? { fal_webhook: options.webhookUrl } : undefined,
          headers:
            options?.fileRetentionSeconds === undefined
              ? undefined
              : {
                  'X-Fal-Object-Lifecycle-Preference': JSON.stringify({
                    expiration_duration_seconds: options.fileRetentionSeconds
                  })
                }
        }),
      apiError
    );
    const result = parseResponse(queueSubmissionSchema, data, 'queue submission');
    return {
      requestId: result.request_id,
      gatewayRequestId: result.gateway_request_id ?? undefined,
      responseUrl: result.response_url,
      statusUrl: result.status_url,
      cancelUrl: result.cancel_url,
      queuePosition: result.queue_position ?? undefined
    };
  }

  async getQueueStatus(modelId: string, requestId: string, options?: { logs?: boolean }) {
    const data = await requestAxiosData(
      'check a queue request',
      () =>
        this.queueAxios.get(
          `${modelPath(modelId, true)}/requests/${encodeURIComponent(requestId)}/status`,
          { params: { logs: options?.logs ? 1 : 0 } }
        ),
      apiError
    );
    const result = parseResponse(queueStatusSchema, data, 'queue status');
    return {
      status: result.status,
      queuePosition: result.queue_position ?? undefined,
      logs: result.logs ?? undefined,
      metrics: result.metrics ?? undefined,
      error: result.error ?? undefined,
      errorType: result.error_type ?? undefined
    };
  }

  async getQueueResult(modelId: string, requestId: string) {
    const data = await requestAxiosData(
      'retrieve a queue result',
      () =>
        this.queueAxios.get(
          `${modelPath(modelId, true)}/requests/${encodeURIComponent(requestId)}`
        ),
      apiError
    );
    return parseResponse(modelResultSchema, data, 'queue result');
  }

  async cancelQueueRequest(modelId: string, requestId: string) {
    const data = await requestAxiosData(
      'request cancellation',
      () =>
        this.queueAxios.put(
          `${modelPath(modelId, true)}/requests/${encodeURIComponent(requestId)}/cancel`
        ),
      apiError
    );
    return parseResponse(
      z.object({ status: z.literal('CANCELLATION_REQUESTED') }),
      data,
      'cancellation'
    );
  }

  async searchModels(params?: {
    query?: string;
    category?: string;
    endpointId?: string | string[];
    limit?: number;
    cursor?: string;
    status?: 'active' | 'deprecated';
    includeSchema?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.query) query.set('q', params.query);
    if (params?.category) query.set('category', params.category);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);
    if (params?.includeSchema) query.set('expand', 'openapi-3.0');
    for (const id of typeof params?.endpointId === 'string'
      ? [params.endpointId]
      : (params?.endpointId ?? []))
      query.append('endpoint_id', id);
    const data = await requestAxiosData(
      'search models',
      () => this.platformAxios.get(`/models?${query}`),
      apiError
    );
    const result = parseResponse(modelsSchema, data, 'model search');
    return {
      models: result.models.map(model => ({
        endpointId: model.endpoint_id,
        metadata: model.metadata ?? {},
        openapi: model.openapi ?? undefined
      })),
      nextCursor: result.next_cursor ?? null,
      hasMore: result.has_more
    };
  }

  async getModelPricing(endpointIds: string[]) {
    const query = new URLSearchParams();
    for (const id of endpointIds) query.append('endpoint_id', id);
    const data = await requestAxiosData(
      'get model pricing',
      () => this.platformAxios.get(`/models/pricing?${query}`),
      apiError
    );
    const result = parseResponse(pricingSchema, data, 'model pricing');
    return {
      prices: result.prices.map(price => ({
        endpointId: price.endpoint_id,
        unitPrice: price.unit_price,
        unit: price.unit,
        currency: price.currency
      })),
      nextCursor: result.next_cursor ?? null,
      hasMore: result.has_more
    };
  }

  async getAccount() {
    const data = await requestAxiosData(
      'get account billing (requires an ADMIN key)',
      () => this.platformAxios.get('/account/billing', { params: { expand: 'credits' } }),
      apiError
    );
    const result = parseResponse(
      z.object({
        username: z.string(),
        credits: z.object({ current_balance: z.number(), currency: z.string() }).optional()
      }),
      data,
      'account billing'
    );
    return {
      username: result.username,
      creditBalance: result.credits?.current_balance,
      currency: result.credits?.currency
    };
  }

  async uploadFileFromUrl(
    targetPath: string,
    sourceUrl: string,
    expiresInSeconds = 3600
  ): Promise<{ url: string }> {
    // Serverless import writes a mounted file and returns a boolean. CDN uploads
    // produce the public URLs documented for model inference inputs.
    const source = await requestAxios(
      'download the source file',
      () =>
        this.publicAxios.get<ArrayBuffer>(sourceUrl, {
          responseType: 'arraybuffer',
          maxContentLength: 90 * 1024 * 1024
        }),
      apiError
    );
    const filename = targetPath.split('/').filter(Boolean).at(-1);
    if (!filename) throw createApiServiceError('Provide a target path with a filename.');
    const contentType =
      String(source.headers['content-type'] ?? 'application/octet-stream').split(';')[0] ??
      'application/octet-stream';
    const initiated = await requestAxiosData(
      'prepare a CDN upload',
      () =>
        this.storageAxios.post(
          '/storage/upload/initiate',
          {
            file_name: filename,
            content_type: contentType
          },
          {
            params: { storage_type: 'fal-cdn-v3' },
            headers: {
              'X-Fal-Object-Lifecycle': JSON.stringify({
                expiration_duration_seconds: expiresInSeconds
              })
            }
          }
        ),
      apiError
    );
    const upload = parseResponse(
      z.object({
        upload_url: z.url().startsWith('https://'),
        file_url: z.url().startsWith('https://')
      }),
      initiated,
      'CDN upload'
    );
    await requestAxiosData(
      'upload file bytes',
      () =>
        this.publicAxios.put(upload.upload_url, source.data, {
          headers: { 'Content-Type': contentType },
          maxBodyLength: 90 * 1024 * 1024
        }),
      apiError
    );
    return { url: upload.file_url };
  }
}
