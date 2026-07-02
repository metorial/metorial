import { createAxios } from 'slates';
import { encodeFormBody } from './client';

export class EventsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://events.twilio.com/v1',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  // Sinks
  async listSinks(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Sinks', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getSink(sinkSid: string): Promise<any> {
    let response = await this.axios.get(`/Sinks/${sinkSid}`);
    return response.data;
  }

  async createSink(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/Sinks', encodeFormBody(params));
    return response.data;
  }

  async deleteSink(sinkSid: string): Promise<void> {
    await this.axios.delete(`/Sinks/${sinkSid}`);
  }

  // Subscriptions
  async listSubscriptions(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Subscriptions', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getSubscription(subscriptionSid: string): Promise<any> {
    let response = await this.axios.get(`/Subscriptions/${subscriptionSid}`);
    return response.data;
  }

  async createSubscription(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/Subscriptions', encodeFormBody(params));
    return response.data;
  }

  async deleteSubscription(subscriptionSid: string): Promise<void> {
    await this.axios.delete(`/Subscriptions/${subscriptionSid}`);
  }

  // Event Types
  async listEventTypes(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Types', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }
}
