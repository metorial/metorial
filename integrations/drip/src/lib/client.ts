import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type DripRecord = Record<string, any>;
export type PageOptions = {
  page?: number;
  perPage?: number;
  status?: string;
  sortBy?: string;
  sortDirection?: string;
};

export function safeDripFailure(error: unknown) {
  const details = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
  const candidate = getApiErrorStatus(error) ?? details.upstreamStatus;
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Drip',
    reason:
      details.reason === 'invalid_api_response'
        ? 'invalid_api_response'
        : 'api_request_failed',
    parent: {},
    extractMessage: () =>
      'Check authentication, account access, rate limits and request fields. Submitted values and transport details are omitted; a failed write may need independent readback before retrying.'
  });
}

export function pathId(value: string) {
  if (!value?.trim() || value === '.' || value === '..' || /[\r\n]/.test(value))
    throw createApiServiceError('Provide a nonempty resource ID or email address.', {
      reason: 'invalid_input'
    });
  return encodeURIComponent(value);
}

export function pagination(params?: PageOptions, maximum = 1000) {
  if (params?.page !== undefined && (!Number.isInteger(params.page) || params.page < 1))
    throw createApiServiceError('page must be a positive integer.', {
      reason: 'invalid_input'
    });
  if (
    params?.perPage !== undefined &&
    (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > maximum)
  )
    throw createApiServiceError(`perPage must be an integer between 1 and ${maximum}.`, {
      reason: 'invalid_input'
    });
  return pickDefined({
    page: params?.page,
    per_page: params?.perPage,
    status: params?.status,
    sort: params?.sortBy,
    direction: params?.sortDirection
  });
}

export class Client {
  private http;
  private redactor: AuthConfigSecretRedactor;
  private accountId?: string;

  constructor(config: { token: string; accountId?: string; tokenType: 'bearer' | 'basic' }) {
    if (
      !config.token?.trim() ||
      /[\r\n]/.test(config.token) ||
      !['bearer', 'basic'].includes(config.tokenType)
    )
      throw createApiServiceError(
        'Reconnect with a valid Drip OAuth access token or personal API token.',
        { reason: 'invalid_credentials' }
      );
    this.accountId = config.accountId;
    const token = config.token.trim();
    const encoded = Buffer.from(`${token}:`, 'utf8').toString('base64');
    const authorization =
      config.tokenType === 'basic' ? `Basic ${encoded}` : `Bearer ${token}`;
    this.redactor = new AuthConfigSecretRedactor({ token, encoded, authorization });
    this.http = createAxios({
      baseURL: 'https://api.getdrip.com',
      timeout: 45000,
      maxRedirects: 0,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Metorial Drip integration',
        Authorization: authorization
      }
    });
  }

  private scope(version: 2 | 3, path: string) {
    if (!this.accountId || !/^[A-Za-z0-9_-]+$/.test(this.accountId))
      throw createApiServiceError(
        'Call list_accounts and pass the selected accountId with this operation.',
        { reason: 'missing_account' }
      );
    return `/v${version}/${encodeURIComponent(this.accountId)}${path}`;
  }

  private clean(value: unknown): any {
    if (typeof value === 'string')
      return this.redactor
        .redactEmbedded(value)
        .replace(/\$\$MT\$secret\$authConfig\$[A-Za-z0-9_.]+(?:\$\$)?/g, '[redacted]');
    if (Array.isArray(value)) return value.map(item => this.clean(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [this.clean(key), this.clean(item)])
      );
    return value;
  }

  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    options: {
      data?: unknown;
      params?: Record<string, unknown>;
      collection?: string;
      singleton?: boolean;
      strings?: boolean;
      noContent?: boolean;
      emptyCreated?: boolean;
      queued?: boolean;
    } = {}
  ): Promise<DripRecord> {
    try {
      const response = await this.http.request({
        method,
        url: path,
        data: options.data,
        params: options.params
      });
      if (options.noContent) {
        if (response.status !== 204)
          throw createApiServiceError('Drip did not confirm the operation.', {
            reason: 'invalid_api_response',
            upstreamStatus: response.status
          });
        return {};
      }
      if (!isApiErrorRecord(response.data))
        throw createApiServiceError('Drip returned no JSON response object.', {
          reason: 'invalid_api_response',
          upstreamStatus: response.status
        });
      if (options.emptyCreated) {
        if (response.status !== 201 || Object.keys(response.data).length !== 0)
          throw createApiServiceError('Drip did not confirm the tag application.', {
            reason: 'invalid_api_response',
            upstreamStatus: response.status
          });
        return {};
      }
      if (options.queued) {
        if (
          response.status !== 202 ||
          !Array.isArray(response.data.request_ids) ||
          response.data.request_ids.length !== 1 ||
          response.data.request_ids.some(id => typeof id !== 'string' || !id)
        )
          throw createApiServiceError(
            'Drip did not return the queued request identifier; processing is unconfirmed.',
            { reason: 'invalid_api_response', upstreamStatus: response.status }
          );
        return {
          request_ids: this.clean(response.data.request_ids),
          errors:
            response.data.errors === undefined
              ? undefined
              : this.clean(
                  Array.isArray(response.data.errors)
                    ? response.data.errors
                    : [response.data.errors]
                )
        };
      }
      if (
        ![200, 201].includes(response.status) ||
        (Array.isArray(response.data.errors)
          ? response.data.errors.length > 0
          : response.data.errors !== undefined)
      )
        throw createApiServiceError('Drip returned an unsuccessful or partial response.', {
          reason: 'invalid_api_response',
          upstreamStatus: response.status
        });
      const result = this.clean(response.data);
      if (options.collection) {
        const values = result[options.collection];
        if (
          !Array.isArray(values) ||
          (options.singleton && values.length !== 1) ||
          values.some(value =>
            options.strings
              ? typeof value !== 'string'
              : !isApiErrorRecord(value) ||
                (options.collection === 'users'
                  ? typeof value.email !== 'string' || !value.email
                  : typeof value.id !== 'string' || !value.id)
          )
        )
          throw createApiServiceError(
            'Drip returned an invalid resource collection; completion is unconfirmed.',
            { reason: 'invalid_api_response' }
          );
        result[options.collection] = options.strings
          ? values
          : values.map(value =>
              Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null))
            );
        if (
          options.collection === 'campaign_subscriptions' &&
          values.some(value => typeof value.campaign_id !== 'string' || !value.campaign_id)
        )
          throw createApiServiceError('Drip returned an invalid campaign membership.', {
            reason: 'invalid_api_response'
          });
        if (
          options.collection === 'subscribers' &&
          values.some(value => typeof value.email !== 'string' || !value.email)
        )
          throw createApiServiceError('Drip returned an invalid subscriber identity.', {
            reason: 'invalid_api_response'
          });
      }
      return result;
    } catch (error) {
      // Never pass transport state, including an existing ServiceError, to the shared builder.
      throw safeDripFailure(error);
    }
  }

  async listSubscribers(
    params?: PageOptions & {
      tags?: string;
      subscribedBefore?: string;
      subscribedAfter?: string;
    }
  ) {
    const query = {
      ...pagination(params),
      ...pickDefined({
        tags: params?.tags,
        subscribed_before: params?.subscribedBefore,
        subscribed_after: params?.subscribedAfter
      })
    };
    for (const date of [params?.subscribedBefore, params?.subscribedAfter])
      if (date !== undefined && !Number.isFinite(Date.parse(date)))
        throw createApiServiceError(
          'Subscription date filters must be valid ISO-8601 timestamps.',
          { reason: 'invalid_input' }
        );
    return this.request('get', this.scope(2, '/subscribers'), {
      params: query,
      collection: 'subscribers'
    });
  }
  async fetchSubscriber(id: string) {
    return this.request('get', this.scope(2, `/subscribers/${pathId(id)}`), {
      collection: 'subscribers',
      singleton: true
    });
  }
  async createOrUpdateSubscriber(subscriber: DripRecord) {
    return this.request('post', this.scope(2, '/subscribers'), {
      data: { subscribers: [subscriber] },
      collection: 'subscribers',
      singleton: true
    });
  }
  async deleteSubscriber(id: string) {
    return this.request('delete', this.scope(2, `/subscribers/${pathId(id)}`), {
      noContent: true
    });
  }
  async unsubscribeFromAllMailings(id: string) {
    return this.request('post', this.scope(2, `/subscribers/${pathId(id)}/unsubscribe_all`), {
      collection: 'subscribers',
      singleton: true
    });
  }
  async removeFromCampaign(id: string, campaignId: string) {
    pathId(campaignId);
    return this.request('post', this.scope(2, `/subscribers/${pathId(id)}/remove`), {
      params: { campaign_id: campaignId },
      collection: 'subscribers',
      singleton: true
    });
  }
  async getSubscriberCampaignSubscriptions(id: string, page?: number) {
    return this.request(
      'get',
      this.scope(2, `/subscribers/${pathId(id)}/campaign_subscriptions`),
      { params: pagination({ page }), collection: 'campaign_subscriptions' }
    );
  }
  async listTags() {
    return this.request('get', this.scope(2, '/tags'), { collection: 'tags', strings: true });
  }
  async applyTagToSubscriber(email: string, tag: string) {
    return this.request('post', this.scope(2, '/tags'), {
      data: { tags: [{ email, tag }] },
      emptyCreated: true
    });
  }
  async removeTagFromSubscriber(email: string, tag: string) {
    return this.request(
      'delete',
      this.scope(2, `/subscribers/${pathId(email)}/tags/${pathId(tag)}`),
      { noContent: true }
    );
  }
  async listCampaigns(params?: PageOptions) {
    if (
      params?.status !== undefined &&
      !['all', 'draft', 'active', 'paused'].includes(params.status)
    )
      throw createApiServiceError(
        'Campaign list status must be all, draft, active or paused.'
      );
    return this.request('get', this.scope(2, '/campaigns'), {
      params: pagination(params),
      collection: 'campaigns'
    });
  }
  async fetchCampaign(id: string) {
    return this.request('get', this.scope(2, `/campaigns/${pathId(id)}`), {
      collection: 'campaigns',
      singleton: true
    });
  }
  async activateCampaign(id: string) {
    return this.request('post', this.scope(2, `/campaigns/${pathId(id)}/activate`), {
      noContent: true
    });
  }
  async pauseCampaign(id: string) {
    return this.request('post', this.scope(2, `/campaigns/${pathId(id)}/pause`), {
      noContent: true
    });
  }
  async listCampaignSubscribers(id: string, params?: PageOptions) {
    if (
      params?.status !== undefined &&
      !['active', 'unsubscribed', 'removed'].includes(params.status)
    )
      throw createApiServiceError(
        'Campaign subscriber status must be active, unsubscribed or removed.'
      );
    return this.request('get', this.scope(2, `/campaigns/${pathId(id)}/subscribers`), {
      params: pagination(params),
      collection: 'subscribers'
    });
  }
  async subscribeToCampaign(id: string, subscriber: DripRecord) {
    return this.request('post', this.scope(2, `/campaigns/${pathId(id)}/subscribers`), {
      data: { subscribers: [subscriber] },
      collection: 'subscribers',
      singleton: true
    });
  }
  async listBroadcasts(params?: PageOptions) {
    return this.request('get', this.scope(2, '/broadcasts'), {
      params: pagination(params, 100),
      collection: 'broadcasts'
    });
  }
  async listWorkflows(params?: PageOptions) {
    return this.request('get', this.scope(2, '/workflows'), {
      params: pagination(params),
      collection: 'workflows'
    });
  }
  async fetchWorkflow(id: string) {
    return this.request('get', this.scope(2, `/workflows/${pathId(id)}`), {
      collection: 'workflows',
      singleton: true
    });
  }
  async activateWorkflow(id: string) {
    return this.request('post', this.scope(2, `/workflows/${pathId(id)}/activate`), {
      noContent: true
    });
  }
  async pauseWorkflow(id: string) {
    return this.request('post', this.scope(2, `/workflows/${pathId(id)}/pause`), {
      noContent: true
    });
  }
  async startOnWorkflow(id: string, subscriber: DripRecord) {
    const result = await this.fetchWorkflow(id);
    if (result.workflows[0].status !== 'active')
      throw createApiServiceError(
        'Activate the selected workflow before starting a subscriber; an inactive workflow will not enroll them.',
        { reason: 'inactive_workflow' }
      );
    return this.request('post', this.scope(2, `/workflows/${pathId(id)}/subscribers`), {
      data: { subscribers: [subscriber] },
      collection: 'subscribers',
      singleton: true
    });
  }
  async removeFromWorkflow(id: string, subscriber: string) {
    return this.request(
      'delete',
      this.scope(2, `/workflows/${pathId(id)}/subscribers/${pathId(subscriber)}`),
      { noContent: true }
    );
  }
  async recordEvent(event: DripRecord) {
    return this.request('post', this.scope(2, '/events'), {
      data: { events: [event] },
      noContent: true
    });
  }
  async listEventActions(params?: PageOptions) {
    return this.request('get', this.scope(2, '/event_actions'), {
      params: pagination(params),
      collection: 'event_actions',
      strings: true
    });
  }
  async createOrUpdateOrder(order: DripRecord) {
    return this.request('post', this.scope(3, '/shopper_activity/order/batch'), {
      data: { orders: [order] },
      queued: true
    });
  }
  async createOrUpdateCart(cart: DripRecord) {
    return this.request('post', this.scope(3, '/shopper_activity/cart/batch'), {
      data: { carts: [cart] },
      queued: true
    });
  }
  async createOrUpdateProduct(product: DripRecord) {
    return this.request('post', this.scope(3, '/shopper_activity/product/batch'), {
      data: { products: [product] },
      queued: true
    });
  }
  async listConversions(params?: PageOptions) {
    return this.request('get', this.scope(2, '/goals'), {
      params: pagination(params),
      collection: 'goals'
    });
  }
  async listCustomFields() {
    return this.request('get', this.scope(2, '/custom_field_identifiers'), {
      collection: 'custom_field_identifiers',
      strings: true
    });
  }
  async listForms() {
    return this.request('get', this.scope(2, '/forms'), { collection: 'forms' });
  }
  async fetchForm(id: string) {
    return this.request('get', this.scope(2, `/forms/${pathId(id)}`), {
      collection: 'forms',
      singleton: true
    });
  }
  async listAccounts() {
    return this.request('get', '/v2/accounts', { collection: 'accounts' });
  }
  async fetchAccount(id: string) {
    return this.request('get', `/v2/accounts/${pathId(id)}`, {
      collection: 'accounts',
      singleton: true
    });
  }
  async fetchUser() {
    return this.request('get', '/v2/user', { collection: 'users', singleton: true });
  }
}
