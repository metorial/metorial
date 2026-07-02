import { createAxios } from 'slates';

export interface WebhookClientConfig {
  token: string;
}

export class WebhookClient {
  private http;

  constructor(config: WebhookClientConfig) {
    this.http = createAxios({
      baseURL: 'https://api.servicem8.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
    });
  }

  async subscribeObjectWebhook(params: {
    object: string;
    fields: string;
    callbackUrl: string;
    uniqueId?: string;
  }): Promise<{ success: boolean; message?: string }> {
    let body = new URLSearchParams({
      object: params.object,
      fields: params.fields,
      callback_url: params.callbackUrl
    });
    if (params.uniqueId) {
      body.append('unique_id', params.uniqueId);
    }
    let response = await this.http.post('/webhook_subscriptions/object', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async subscribeEventWebhook(params: {
    event: string;
    callbackUrl: string;
    uniqueId?: string;
  }): Promise<{ success: boolean; message?: string }> {
    let body = new URLSearchParams({
      event: params.event,
      callback_url: params.callbackUrl
    });
    if (params.uniqueId) {
      body.append('unique_id', params.uniqueId);
    }
    let response = await this.http.post('/webhook_subscriptions/event', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async unsubscribeObjectWebhook(params: {
    object: string;
    callbackUrl: string;
    uniqueId?: string;
  }): Promise<void> {
    let body = new URLSearchParams({
      object: params.object,
      callback_url: params.callbackUrl
    });
    if (params.uniqueId) {
      body.append('unique_id', params.uniqueId);
    }
    await this.http.delete('/webhook_subscriptions/object', {
      data: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async unsubscribeEventWebhook(params: {
    event: string;
    callbackUrl: string;
    uniqueId?: string;
  }): Promise<void> {
    let body = new URLSearchParams({
      event: params.event,
      callback_url: params.callbackUrl
    });
    if (params.uniqueId) {
      body.append('unique_id', params.uniqueId);
    }
    await this.http.delete('/webhook_subscriptions/event', {
      data: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }
}
