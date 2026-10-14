import { createApiServiceError, createAxios, isApiErrorRecord, pickDefined } from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.livesession.io/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let data = error.response?.data;
          if (!isApiErrorRecord(data) || !isApiErrorRecord(data.error)) return;
          return {
            upstream: {
              ...inferred.upstream,
              requestId:
                typeof data.error.request_id === 'string'
                  ? data.error.request_id
                  : inferred.upstream?.requestId
            }
          };
        }
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
    if (
      params.page !== undefined &&
      (!Number.isInteger(params.page) || params.page < 0 || params.page > 10000)
    ) {
      throw createApiServiceError('page must be a whole number between 0 and 10000.');
    }
    if (
      params.size !== undefined &&
      (!Number.isInteger(params.size) || params.size < 1 || params.size > 100)
    ) {
      throw createApiServiceError('size must be a whole number between 1 and 100.');
    }
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
    let response = await this.axios.put(`/alerts/${encodeURIComponent(alertId)}`, {
      name: data.name,
      events: data.events,
      provider: data.provider,
      slack_channel_id: data.slackChannelId,
      webhook_id: data.webhookId
    });
    return response.data;
  }

  async deleteAlert(alertId: string) {
    let response = await this.axios.delete(`/alerts/${encodeURIComponent(alertId)}`);
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
      websiteId?: string;
      version?: string;
    }
  ) {
    let existing: { url?: string; website_id?: string; version?: string } | undefined;
    if (data.url === undefined || data.websiteId === undefined) {
      let result = await this.listWebhooks();
      let webhooks = Array.isArray(result) ? result : result.webhooks;
      existing = webhooks?.find(
        (webhook: { webhook_id?: string; id?: string }) =>
          (webhook.webhook_id ?? webhook.id) === webhookId
      );
      if (!existing) {
        throw createApiServiceError(
          'The webhook could not be found. Call list_webhooks or supply url and websiteId.'
        );
      }
    }
    let version = data.version ?? existing?.version ?? 'v1.0';
    let response = await this.axios.put(
      `/webhooks/${encodeURIComponent(webhookId)}`,
      pickDefined({
        url: data.url ?? existing?.url,
        website_id: data.websiteId ?? existing?.website_id,
        version,
        enabled: data.enabled
      }),
      { params: { version } }
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
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
    let result = response.data;
    if (Array.isArray(result?.errors) && result.errors.length > 0) {
      let messages = result.errors
        .map((error: unknown) =>
          isApiErrorRecord(error) && typeof error.message === 'string'
            ? error.message
            : 'Unknown GraphQL error'
        )
        .join('; ');
      throw createApiServiceError(`LiveSession GraphQL request failed: ${messages}`, {
        reason: JSON.stringify(result.errors)
      });
    }
    if (!isApiErrorRecord(result?.data)) {
      throw createApiServiceError('LiveSession returned no GraphQL response data.');
    }
    return result;
  }

  async computeMetric(data: Record<string, unknown>) {
    let response = await this.axios.post('/compute/metric', data);
    return response.data;
  }
}
