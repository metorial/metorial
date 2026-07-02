import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.livesession.io/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sessions ──────────────────────────────────────────────────────

  async listSessions(
    params: {
      page?: number;
      size?: number;
      email?: string;
      visitorId?: string;
      timezone?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ) {
    let response = await this.axios.get('/sessions', {
      params: {
        page: params.page,
        size: params.size,
        email: params.email,
        visitor_id: params.visitorId,
        tz: params.timezone,
        date_from: params.dateFrom,
        date_to: params.dateTo
      }
    });
    return response.data;
  }

  // ── Alerts ────────────────────────────────────────────────────────

  async listAlerts() {
    let response = await this.axios.get('/alerts');
    return response.data;
  }

  async createAlert(data: {
    name: string;
    events: Array<{ kind: number; value?: string }>;
    provider: string;
    slackChannelId?: string;
    webhookId?: string;
  }) {
    let response = await this.axios.post('/alerts', {
      name: data.name,
      events: data.events,
      provider: data.provider,
      slack_channel_id: data.slackChannelId,
      webhook_id: data.webhookId
    });
    return response.data;
  }

  async updateAlert(
    alertId: string,
    data: {
      name?: string;
      events?: Array<{ kind: number; value?: string }>;
      provider?: string;
      slackChannelId?: string;
      webhookId?: string;
    }
  ) {
    let response = await this.axios.put(`/alerts/${alertId}`, {
      name: data.name,
      events: data.events,
      provider: data.provider,
      slack_channel_id: data.slackChannelId,
      webhook_id: data.webhookId
    });
    return response.data;
  }

  async deleteAlert(alertId: string) {
    let response = await this.axios.delete(`/alerts/${alertId}`);
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { url: string; websiteId: string; version?: string }) {
    let response = await this.axios.post('/webhooks', {
      url: data.url,
      website_id: data.websiteId,
      version: data.version || 'v1.0'
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      url?: string;
      enabled?: boolean;
    }
  ) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, data, {
      params: { version: 'v1.0' }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // ── Websites ──────────────────────────────────────────────────────

  async listWebsites() {
    let response = await this.axios.get('/websites');
    return response.data;
  }

  async createWebsite(data: { host: string; description?: string }) {
    let response = await this.axios.post('/websites', data);
    return response.data;
  }

  // ── GraphQL (Funnels) ─────────────────────────────────────────────

  async graphql(query: string, variables: Record<string, unknown> = {}) {
    let response = await this.axios.post('/graphql', {
      query,
      variables
    });
    return response.data;
  }
}
