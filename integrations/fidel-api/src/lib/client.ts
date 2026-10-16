import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

type RecordData = Record<string, any>;
export type PageOptions = {
  start?: number;
  cursor?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  [key: string]: unknown;
};

let pathId = (value: string) => encodeURIComponent(value);
let isAccountWebhook = (event: string) =>
  ['brand.consent', 'offer-location.linked', 'offer-location.unlinked'].includes(event);

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Fidel API secret key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.fidel.uk/v1',
      timeout: 30_000,
      authHeader: { name: 'Fidel-Key', value: config.token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Fidel API',
          reason: 'fidel_api_error',
          detailKeys: ['message', 'code', 'type', 'name', 'details'],
          nestedKeys: ['error', 'errors'],
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    });
  }

  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    url: string,
    data?: RecordData,
    params?: Record<string, unknown>
  ): Promise<RecordData> {
    let response = await this.axios.request({
      method,
      url,
      data: data && pickDefined(data),
      params
    });
    if (response.status === 204) return {};
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Fidel API returned an unexpected response.');
    }
    return response.data;
  }

  private async item(
    method: 'get' | 'post' | 'patch' | 'put',
    url: string,
    data?: RecordData
  ): Promise<RecordData> {
    let response = await this.request(method, url, data);
    let item = response.items?.[0];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw createApiServiceError('Fidel API returned no resource for this request.');
    }
    return item;
  }

  // Legacy numeric offsets are traversed using Fidel's documented continuation keys.
  async list(url: string, options: PageOptions = {}): Promise<RecordData> {
    let { start = 0, cursor, limit, ...filters } = options;
    if (!Number.isSafeInteger(start) || start < 0) {
      throw createApiServiceError('start must be a non-negative integer offset.');
    }
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw createApiServiceError('limit must be a positive integer.');
    }
    if (cursor !== undefined && start > 0) {
      throw createApiServiceError('Use cursor or a numeric start offset, rather than both.');
    }
    if (cursor !== undefined) {
      let value: unknown;
      try {
        value = JSON.parse(cursor);
      } catch {
        throw createApiServiceError(
          'cursor must be the JSON-serialized last object from the previous response.'
        );
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw createApiServiceError(
          'cursor must be the JSON-serialized last object from the previous response.'
        );
      }
    }
    let continuation = cursor;
    while (start > 0) {
      let page = await this.request(
        'get',
        url,
        undefined,
        pickDefined({ ...filters, limit: Math.min(start, 100), start: continuation })
      );
      if (!Array.isArray(page.items))
        throw createApiServiceError('Fidel API returned an invalid result list.');
      start -= page.items.length;
      if (page.items.length === 0 || page.last == null)
        return { ...page, items: [], count: undefined, last: undefined, rawResponse: page };
      let next = JSON.stringify(page.last);
      if (next === continuation)
        throw createApiServiceError('Fidel API returned a repeated pagination cursor.');
      continuation = next;
    }
    let result = await this.request(
      'get',
      url,
      undefined,
      pickDefined({ ...filters, limit, start: continuation })
    );
    if (!Array.isArray(result.items))
      throw createApiServiceError('Fidel API returned an invalid result list.');
    return result;
  }

  listMissingTransactionRequests(programId: string, options: Omit<PageOptions, 'start'>) {
    let { cursor, ...filters } = options;
    return this.request(
      'get',
      `/programs/${pathId(programId)}/missing-transaction-requests`,
      undefined,
      pickDefined({ ...filters, start: cursor })
    );
  }

  createMissingTransactionRequest(cardId: string, data: RecordData) {
    return this.request('post', `/cards/${pathId(cardId)}/missing-transaction-requests`, data);
  }
  getMissingTransactionRequest(requestId: string) {
    return this.request('get', `/missing-transaction-requests/${pathId(requestId)}`);
  }

  createProgram(data: RecordData) {
    return this.item('post', '/programs', data);
  }
  getProgram(programId: string) {
    return this.item('get', `/programs/${pathId(programId)}`);
  }
  listPrograms(params?: PageOptions) {
    return this.list('/programs', params);
  }
  updateProgram(programId: string, data: RecordData) {
    return this.item('patch', `/programs/${pathId(programId)}`, data);
  }

  createBrand(data: RecordData) {
    return this.item('post', '/brands', data);
  }
  getBrand(brandId: string) {
    return this.item('get', `/brands/${pathId(brandId)}`);
  }
  listBrands(params?: PageOptions) {
    return this.list('/brands', params);
  }
  updateBrand(brandId: string, data: RecordData) {
    return this.item('patch', `/brands/${pathId(brandId)}`, data);
  }
  deleteBrand(brandId: string) {
    return this.request('delete', `/brands/${pathId(brandId)}`);
  }

  createLocation(brandId: string, programId: string, data: RecordData) {
    return this.item('post', `/programs/${pathId(programId)}/locations`, { ...data, brandId });
  }
  getLocation(locationId: string, _programId?: string) {
    return this.item('get', `/locations/${pathId(locationId)}`);
  }
  listLocations(programId: string, params?: PageOptions) {
    let { brandId, ...filters } = params ?? {};
    return this.list(
      brandId
        ? `/brands/${pathId(String(brandId))}/programs/${pathId(programId)}/locations`
        : `/programs/${pathId(programId)}/locations`,
      filters
    );
  }
  updateLocation(locationId: string, data: RecordData) {
    return this.item('patch', `/locations/${pathId(locationId)}`, data);
  }
  deleteLocation(locationId: string, _programId?: string) {
    return this.request('delete', `/locations/${pathId(locationId)}`);
  }

  enrollCard(programId: string, data: RecordData) {
    return this.item('post', `/programs/${pathId(programId)}/cards`, data);
  }
  getCard(cardId: string, _programId?: string) {
    return this.item('get', `/cards/${pathId(cardId)}`);
  }
  listCards(programId: string, params?: PageOptions) {
    return this.list(`/programs/${pathId(programId)}/cards`, params);
  }
  deleteCard(cardId: string, _programId?: string) {
    return this.request('delete', `/cards/${pathId(cardId)}`);
  }
  updateCardMetadata(cardId: string, metadata: RecordData) {
    return this.item('put', `/cards/${pathId(cardId)}/metadata`, metadata);
  }

  getTransaction(transactionId: string, _programId?: string) {
    return this.item('get', `/transactions/${pathId(transactionId)}`);
  }
  listTransactionsByProgram(programId: string, params?: PageOptions) {
    return this.list(`/programs/${pathId(programId)}/transactions`, params);
  }
  listTransactionsByCard(cardId: string, _programId: string, params?: PageOptions) {
    return this.list(`/cards/${pathId(cardId)}/transactions`, params);
  }
  createTestTransaction(_programId: string, data: RecordData) {
    return this.item('post', '/transactions/test', {
      amount: data.amount,
      cardId: data.cardId,
      locationId: data.locationId
    });
  }

  createWebhook(programId: string, data: RecordData) {
    return this.item(
      'post',
      isAccountWebhook(data.event) ? '/hooks' : `/programs/${pathId(programId)}/hooks`,
      data
    );
  }
  getWebhook(webhookId: string, _programId?: string) {
    return this.item('get', `/hooks/${pathId(webhookId)}`);
  }
  async listWebhooks(programId: string, params: PageOptions = {}): Promise<RecordData> {
    let { start = 0, limit = 100, event } = params;
    if (
      !Number.isSafeInteger(start) ||
      start < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1
    ) {
      throw createApiServiceError(
        'Use a non-negative integer start and a positive integer limit.'
      );
    }
    // This endpoint documents a limit and event filter, rather than cursor pagination.
    let response = await this.request(
      'get',
      `/programs/${pathId(programId)}/hooks`,
      undefined,
      pickDefined({ limit: start + limit, event })
    );
    if (!Array.isArray(response.items))
      throw createApiServiceError('Fidel API returned an invalid result list.');
    return {
      ...response,
      items: response.items.slice(start, start + limit),
      rawResponse: response
    };
  }
  deleteWebhook(webhookId: string, _programId?: string) {
    return this.request('delete', `/hooks/${pathId(webhookId)}`);
  }
  async updateWebhook(webhookId: string, programId: string, data: RecordData) {
    let current =
      data.event === undefined || data.url === undefined
        ? await this.getWebhook(webhookId)
        : undefined;
    let event = data.event ?? current?.event;
    return this.item('patch', `/hooks/${pathId(webhookId)}`, {
      ...data,
      event,
      url: data.url ?? current?.url,
      programId: isAccountWebhook(event) ? undefined : programId
    });
  }

  createOffer(_programId: string, data: RecordData) {
    return this.item('post', '/offers', data);
  }
  getOffer(offerId: string) {
    return this.item('get', `/offers/${pathId(offerId)}`);
  }
  listOffers(programId: string, params?: PageOptions) {
    return this.list('/offers', { ...params, programId });
  }
  async updateOffer(offerId: string, data: RecordData) {
    let { maxReward, ...body } = data;
    if (maxReward !== undefined) {
      let current = await this.getOffer(offerId);
      body.type = { ...current.type, ...body.type, maxRewardAmount: maxReward };
    }
    return this.item('patch', `/offers/${pathId(offerId)}`, body);
  }
  deleteOffer(offerId: string) {
    return this.request('delete', `/offers/${pathId(offerId)}`);
  }
  linkOfferToLocation(offerId: string, locationId: string) {
    return this.request(
      'post',
      `/offers/${pathId(offerId)}/locations/${pathId(locationId)}`,
      {}
    );
  }
  unlinkOfferFromLocation(offerId: string, locationId: string) {
    return this.request(
      'delete',
      `/offers/${pathId(offerId)}/locations/${pathId(locationId)}`
    );
  }
  activateOfferOnCard(offerId: string, cardId: string) {
    return this.request('post', `/offers/${pathId(offerId)}/cards/${pathId(cardId)}`, {});
  }
  deactivateOfferOnCard(offerId: string, cardId: string) {
    return this.request('delete', `/offers/${pathId(offerId)}/cards/${pathId(cardId)}`);
  }
  checkOfferCard(offerId: string, cardId: string) {
    return this.request('get', `/offers/${pathId(offerId)}/cards/${pathId(cardId)}`);
  }
  linkAllOfferLocations(offerId: string, programId: string) {
    return this.request(
      'post',
      `/offers/${pathId(offerId)}/programs/${pathId(programId)}/locations`,
      {}
    );
  }
}
