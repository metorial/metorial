import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface WorkflowDataItem {
  [key: string]: unknown;
}

export interface WebhookSubscription {
  webhookId: string;
  id?: string;
  createdAt: string;
  url: string;
  events: string[];
}

export interface ListWebhooksResponse {
  webhooks: WebhookSubscription[];
}

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Hystruct API key is required.', {
        reason: 'missing_api_key'
      });
    }

    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.hystruct.com',
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hystruct',
          reason: 'hystruct_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    });

    this.api.interceptors.response.use(response => {
      if (
        isApiErrorRecord(response.data) &&
        typeof response.data.error === 'string' &&
        response.data.error.trim()
      ) {
        throw buildApiServiceError(
          { response: { status: response.status, data: response.data } },
          {
            providerLabel: 'Hystruct',
            reason: 'hystruct_api_error'
          }
        );
      }
      return response;
    });
  }

  async getWorkflowData(workflowId: string): Promise<WorkflowDataItem[]> {
    let response = await this.api.get<WorkflowDataItem[]>(
      `/v1/workflows/${encodeURIComponent(workflowId)}/data`
    );
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Hystruct returned an invalid workflow data response.', {
        reason: 'invalid_workflow_data_response'
      });
    }
    return response.data;
  }

  async createJob(workflowId: string): Promise<{ message: string }> {
    let response = await this.api.post<{ message: string }>(
      `/v1/workflows/${encodeURIComponent(workflowId)}/queue`,
      null
    );
    return response.data;
  }

  async listWebhooks(): Promise<ListWebhooksResponse> {
    let response = await this.api.get<{
      webhooks: (Omit<WebhookSubscription, 'webhookId'> & { webhookId?: string })[];
    }>('/v1/integrations/webhooks/list');
    if (!isApiErrorRecord(response.data) || !Array.isArray(response.data.webhooks)) {
      throw createApiServiceError('Hystruct returned an invalid webhook list response.', {
        reason: 'invalid_webhook_response'
      });
    }
    let webhooks = response.data.webhooks.map(webhook => {
      let webhookId = isApiErrorRecord(webhook)
        ? (webhook.webhookId ?? webhook.id)
        : undefined;
      if (typeof webhookId !== 'string' || !webhookId) {
        throw createApiServiceError('Hystruct returned a webhook without an identifier.', {
          reason: 'invalid_webhook_response'
        });
      }
      return { ...webhook, webhookId };
    });
    return { ...response.data, webhooks };
  }

  async subscribeWebhook(params: {
    workflowId: string;
    webhookUrl: string;
    events: string[];
  }): Promise<{ message: string }> {
    let response = await this.api.post<{ message: string }>(
      '/v1/integrations/webhooks/subscribe',
      {
        workflowId: params.workflowId,
        webhookUrl: params.webhookUrl,
        events: params.events
      }
    );
    return response.data;
  }

  async unsubscribeWebhook(webhookId: string): Promise<{ message: string }> {
    let response = await this.api.delete<{ message: string }>(
      `/v1/integrations/webhooks/unsubscribe/${encodeURIComponent(webhookId)}`
    );
    return response.data;
  }
}
