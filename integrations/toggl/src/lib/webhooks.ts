import { createAxios } from 'slates';

export class TogglWebhookClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.track.toggl.com/webhooks/api/v1',
      headers: {
        Authorization: `Basic ${btoa(`${token}:api_token`)}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createSubscription(
    workspaceId: string,
    data: {
      urlCallback: string;
      eventFilters: Array<{ entity: string; action: string }>;
      enabled: boolean;
      description?: string;
      secret: string;
    }
  ) {
    let response = await this.http.post(`/subscriptions/${workspaceId}`, {
      url_callback: data.urlCallback,
      event_filters: data.eventFilters,
      enabled: data.enabled,
      description: data.description,
      secret: data.secret
    });
    return response.data;
  }

  async updateSubscription(
    workspaceId: string,
    subscriptionId: string,
    data: {
      urlCallback?: string;
      eventFilters?: Array<{ entity: string; action: string }>;
      enabled?: boolean;
      secret?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.urlCallback !== undefined) body.url_callback = data.urlCallback;
    if (data.eventFilters !== undefined) body.event_filters = data.eventFilters;
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.secret !== undefined) body.secret = data.secret;

    let response = await this.http.put(
      `/subscriptions/${workspaceId}/${subscriptionId}`,
      body
    );
    return response.data;
  }

  async deleteSubscription(workspaceId: string, subscriptionId: string) {
    await this.http.delete(`/subscriptions/${workspaceId}/${subscriptionId}`);
  }

  async listSubscriptions(workspaceId: string) {
    let response = await this.http.get(`/subscriptions/${workspaceId}`);
    return response.data;
  }
}
