import { createAxios } from 'slates';

export class FalClient {
  private runAxios;
  private queueAxios;
  private platformAxios;

  constructor(token: string) {
    let headers = {
      Authorization: `Key ${token}`,
      'Content-Type': 'application/json'
    };

    this.runAxios = createAxios({
      baseURL: 'https://fal.run',
      headers
    });

    this.queueAxios = createAxios({
      baseURL: 'https://queue.fal.run',
      headers
    });

    this.platformAxios = createAxios({
      baseURL: 'https://api.fal.ai/v1',
      headers
    });
  }

  // --- Synchronous Model Inference ---

  async runModel(modelId: string, input: Record<string, any>): Promise<any> {
    let response = await this.runAxios.post(`/${modelId}`, input);
    return response.data;
  }

  // --- Queue-Based Model Inference ---

  async submitToQueue(
    modelId: string,
    input: Record<string, any>,
    options?: { webhookUrl?: string }
  ): Promise<{
    requestId: string;
    gatewayRequestId: string;
    responseUrl: string;
    statusUrl: string;
    cancelUrl: string;
    queuePosition: number;
  }> {
    let url = `/${modelId}`;
    if (options?.webhookUrl) {
      url += `?fal_webhook=${encodeURIComponent(options.webhookUrl)}`;
    }
    let response = await this.queueAxios.post(url, input);
    let data = response.data;
    return {
      requestId: data.request_id,
      gatewayRequestId: data.gateway_request_id,
      responseUrl: data.response_url,
      statusUrl: data.status_url,
      cancelUrl: data.cancel_url,
      queuePosition: data.queue_position
    };
  }

  async getQueueStatus(
    modelId: string,
    requestId: string,
    options?: { logs?: boolean }
  ): Promise<{
    status: string;
    queuePosition?: number;
    logs?: Array<{ message: string; timestamp: string }>;
  }> {
    let url = `/${modelId}/requests/${requestId}/status`;
    if (options?.logs) {
      url += '?logs=1';
    }
    let response = await this.queueAxios.get(url);
    let data = response.data;
    return {
      status: data.status,
      queuePosition: data.queue_position,
      logs: data.logs
    };
  }

  async getQueueResult(modelId: string, requestId: string): Promise<any> {
    let response = await this.queueAxios.get(`/${modelId}/requests/${requestId}`);
    return response.data;
  }

  async cancelQueueRequest(modelId: string, requestId: string): Promise<void> {
    await this.queueAxios.put(`/${modelId}/requests/${requestId}/cancel`);
  }

  // --- Platform APIs: Models ---

  async searchModels(params?: {
    query?: string;
    category?: string;
    endpointId?: string | string[];
    limit?: number;
    cursor?: string;
  }): Promise<{
    models: Array<{
      endpointId: string;
      metadata: Record<string, any>;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.query) queryParams.query = params.query;
    if (params?.category) queryParams.category = params.category;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.endpointId) {
      if (Array.isArray(params.endpointId)) {
        queryParams.endpoint_id = params.endpointId.join(',');
      } else {
        queryParams.endpoint_id = params.endpointId;
      }
    }

    let response = await this.platformAxios.get('/models', { params: queryParams });
    let data = response.data;
    return {
      models: (data.models || []).map((m: any) => ({
        endpointId: m.endpoint_id,
        metadata: m.metadata || {}
      })),
      nextCursor: data.next_cursor || null,
      hasMore: data.has_more || false
    };
  }

  async getModelPricing(endpointIds: string[]): Promise<
    Array<{
      endpointId: string;
      pricing: Record<string, any>;
    }>
  > {
    let response = await this.platformAxios.get('/models/pricing', {
      params: { endpoint_id: endpointIds.join(',') }
    });
    return (response.data.pricing || response.data || []).map((p: any) => ({
      endpointId: p.endpoint_id,
      pricing: p
    }));
  }

  // --- Platform APIs: Usage ---

  async getUsage(params?: {
    endpointId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    items: Record<string, any>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.endpointId) queryParams.endpoint_id = params.endpointId;
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.platformAxios.get('/models/usage', { params: queryParams });
    let data = response.data;
    return {
      items: data.items || data.usage || [],
      nextCursor: data.next_cursor || null,
      hasMore: data.has_more || false
    };
  }

  // --- File Storage ---

  async uploadFileFromUrl(targetPath: string, sourceUrl: string): Promise<{ url: string }> {
    let response = await this.platformAxios.post(`/serverless/files/file/url/${targetPath}`, {
      url: sourceUrl
    });
    return { url: response.data.url || response.data.file_url || response.data };
  }

  async listFiles(directory?: string): Promise<Record<string, any>[]> {
    let path = directory ? `/serverless/files/list/${directory}` : '/serverless/files/list';
    let response = await this.platformAxios.get(path);
    return response.data.files || response.data || [];
  }
}
