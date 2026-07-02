import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.hystruct.com'
});

export interface WorkflowDataItem {
  [key: string]: unknown;
}

export interface WebhookSubscription {
  webhookId: string;
  createdAt: string;
  url: string;
  events: string[];
}

export interface ListWebhooksResponse {
  webhooks: WebhookSubscription[];
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'x-api-key': this.token
    };
  }

  async getWorkflowData(workflowId: string): Promise<WorkflowDataItem[]> {
    let response = await api.get(`/v1/workflows/${workflowId}/data`, {
      headers: this.headers
    });
    return response.data;
  }

  async createJob(workflowId: string): Promise<{ message: string }> {
    let response = await api.post(`/v1/workflows/${workflowId}/queue`, null, {
      headers: this.headers
    });
    return response.data;
  }

  async listWebhooks(): Promise<ListWebhooksResponse> {
    let response = await api.get('/v1/integrations/webhooks/list', {
      headers: this.headers
    });
    return response.data;
  }

  async subscribeWebhook(params: {
    workflowId: string;
    webhookUrl: string;
    events: string[];
  }): Promise<{ message: string }> {
    let response = await api.post(
      '/v1/integrations/webhooks/subscribe',
      {
        workflowId: params.workflowId,
        webhookUrl: params.webhookUrl,
        events: params.events
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unsubscribeWebhook(webhookId: string): Promise<{ message: string }> {
    let response = await api.delete(`/v1/integrations/webhooks/unsubscribe/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }
}
