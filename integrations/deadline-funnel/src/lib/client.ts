import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface Campaign {
  campaignId: string;
  name: string;
  campaignType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

let requireValue = (value: string, label: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`${label} must not be blank.`, {
      reason: 'deadline_funnel_invalid_input'
    });
  }
};

let requireEmail = (email: string) => {
  requireValue(email, 'Email address');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createApiServiceError('Provide a valid subscriber email address.', {
      reason: 'deadline_funnel_invalid_input'
    });
  }
};

let scrub = (value: unknown, secrets: string[], depth = 0): unknown => {
  if (depth > 8) return '[truncated]';
  if (typeof value === 'string') {
    let result = value;
    for (let secret of secrets.filter(Boolean)) {
      result = result.split(secret).join('[redacted]');
      result = result.split(encodeURIComponent(secret)).join('[redacted]');
    }
    return result.replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]').slice(0, 2000);
  }
  if (Array.isArray(value)) return value.map(item => scrub(item, secrets, depth + 1));
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /authorization|api[_-]?key|token|secret|password/i.test(key)
          ? '[redacted]'
          : scrub(item, secrets, depth + 1)
      ])
    );
  }
  return value;
};

let apiError = (error: unknown, operation: string, secrets: string[]) =>
  buildApiServiceError(error, {
    providerLabel: 'Deadline Funnel',
    reason: 'deadline_funnel_api_error',
    operation,
    fallbackMessage: 'The provider reported an unsuccessful request.',
    extractResponse: (value, helpers) => {
      let response = helpers.getResponseWithBody(value);
      return response ? { ...response, data: scrub(response.data, secrets) } : undefined;
    },
    extractMessage: (value, helpers) => {
      let response = helpers.getResponseWithBody(value);
      let details: string[] = [];
      helpers.collectDetails(response?.data, details);
      return String(
        scrub(
          details.length > 0
            ? details.join(' - ')
            : helpers.extractMessage(value, {
                fallbackMessage: 'The provider reported an unsuccessful request.'
              }),
          secrets
        )
      );
    },
    // Do not retain an upstream exception containing credentials in request metadata.
    parent: {}
  });

let hasError = (value: unknown): boolean => {
  if (value === undefined || value === null || value === false || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isApiErrorRecord(value)) return Object.keys(value).length > 0;
  return true;
};

let assertSuccess = (data: unknown, operation: string, secrets: string[]) => {
  if (
    data === false ||
    (isApiErrorRecord(data) &&
      (data.success === false ||
        data.success === 'false' ||
        data.status === 'error' ||
        data.status === 'failed' ||
        hasError(data.error) ||
        hasError(data.errors)))
  ) {
    throw apiError({ response: { data } }, operation, secrets);
  }
};

let invalidResponse = (detail: string) =>
  createApiServiceError(`Deadline Funnel returned an invalid response: ${detail}.`, {
    reason: 'deadline_funnel_invalid_response'
  });

let campaignString = (
  campaign: Record<string, unknown>,
  aliases: string[],
  field: string,
  allowNumber = false
) => {
  let value = aliases.map(alias => campaign[alias]).find(value => value !== undefined);
  if (typeof value === 'string' && value.trim()) return value;
  if (allowNumber && typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw invalidResponse(`campaign ${field} is missing or malformed`);
};

export class DeadlineFunnelClient {
  private http;
  private token: string;

  constructor(config: { token: string }) {
    requireValue(config.token, 'Deadline Funnel API key');
    this.token = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.deadlinefunnel.com/api/v1',
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${config.token}` }
    });
  }

  private async request(
    operation: string,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ) {
    let data = await requestAxiosData<unknown>(
      operation,
      () => this.http.request({ method, url: path, data: body }),
      (error, action) => apiError(error, action, [this.token])
    );
    assertSuccess(data, operation, [this.token]);
    if (
      data !== undefined &&
      data !== null &&
      data !== '' &&
      !isApiErrorRecord(data) &&
      !Array.isArray(data)
    ) {
      throw invalidResponse('expected a JSON object or array');
    }
    return data;
  }

  async listCampaigns(): Promise<Campaign[]> {
    let data = await this.request('list campaigns', 'GET', '/campaigns');
    let campaigns = Array.isArray(data)
      ? data
      : isApiErrorRecord(data)
        ? (data.campaigns ?? data.data)
        : undefined;
    if (!Array.isArray(campaigns)) throw invalidResponse('expected a campaigns array');
    return campaigns.map(campaign => {
      if (!isApiErrorRecord(campaign)) throw invalidResponse('campaign is not an object');
      return {
        campaignId: campaignString(campaign, ['id', 'campaign_id'], 'ID', true),
        name: campaignString(campaign, ['name', 'title'], 'name'),
        campaignType: campaignString(campaign, ['campaign_type', 'type'], 'type'),
        status: campaignString(campaign, ['status'], 'status'),
        createdAt: campaignString(campaign, ['created_at', 'createdAt'], 'creation timestamp'),
        updatedAt: campaignString(campaign, ['updated_at', 'updatedAt'], 'update timestamp')
      };
    });
  }

  async startDeadline(params: { campaignId: string; email: string; firstName?: string }) {
    requireValue(params.campaignId, 'Campaign ID');
    requireEmail(params.email);
    await this.request(
      'start deadline',
      'POST',
      `/campaigns/${encodeURIComponent(params.campaignId)}/deadlines`,
      pickDefined({ email: params.email, first_name: params.firstName })
    );
    return { success: true, email: params.email, campaignId: params.campaignId };
  }

  async trackPurchase(params: {
    campaignId: string;
    email: string;
    amount: number;
    currency: string;
    firstName?: string;
  }) {
    requireValue(params.campaignId, 'Campaign ID');
    requireEmail(params.email);
    if (!Number.isFinite(params.amount) || params.amount < 0) {
      throw createApiServiceError('Purchase amount must be a finite, non-negative number.', {
        reason: 'deadline_funnel_invalid_input'
      });
    }
    if (!/^[A-Za-z]{3}$/.test(params.currency)) {
      throw createApiServiceError('Provide a three-letter ISO 4217 currency code.', {
        reason: 'deadline_funnel_invalid_input'
      });
    }
    await this.request(
      'track purchase',
      'POST',
      `/campaigns/${encodeURIComponent(params.campaignId)}/sales`,
      pickDefined({
        email: params.email,
        amount: params.amount,
        currency: params.currency,
        first_name: params.firstName
      })
    );
    return {
      success: true,
      email: params.email,
      campaignId: params.campaignId,
      amount: params.amount,
      currency: params.currency
    };
  }

  async createCustomEvent(params: { eventName: string; email: string; name?: string }) {
    requireValue(params.eventName, 'Event name');
    requireEmail(params.email);
    await this.request(
      'create custom event',
      'POST',
      '/custom-events',
      pickDefined({ event_name: params.eventName, email: params.email, name: params.name })
    );
    return { success: true, eventName: params.eventName, email: params.email };
  }
}

export let startDeadlineWebhook = async (params: { webhookUrl: string; email: string }) => {
  requireEmail(params.email);
  let url: URL;
  try {
    url = new URL(params.webhookUrl);
  } catch {
    throw createApiServiceError(
      'Provide the custom webhook URL from your campaign Emails tab.',
      {
        reason: 'deadline_funnel_invalid_input'
      }
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'code.deadlinefunnel.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/listener\/\d+\/custom\/[A-Za-z0-9_-]+$/.test(url.pathname)
  ) {
    throw createApiServiceError(
      'Use the HTTPS custom webhook URL from Emails → Custom API in your Deadline Funnel campaign.',
      { reason: 'deadline_funnel_invalid_input' }
    );
  }
  let secret = url.pathname.split('/').at(-1)!;
  let http = createAxios({
    timeout: 30000,
    maxRedirects: 0,
    headers: { 'Content-Type': 'text/plain' }
  });
  let data = await requestAxiosData<unknown>(
    'submit deadline webhook',
    () => http.post(url.toString(), new URLSearchParams({ email: params.email }).toString()),
    (error, action) => apiError(error, action, [params.webhookUrl, secret])
  );
  assertSuccess(data, 'submit deadline webhook', [params.webhookUrl, secret]);
  return { accepted: true, email: params.email };
};
