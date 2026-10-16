import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  itemResponse,
  pageResponse,
  parseResponse,
  providerId,
  transactionResponse
} from './schemas';

export interface ListItemsParams {
  locationIds?: number[];
  itemIds?: number[];
  limit?: number;
  cursor?: string;
}
export interface ListTransactionsParams {
  type?: string;
  limit?: number;
  cursor?: string;
}
export interface CreateTransactionParams {
  type: 'in' | 'out' | 'adjust' | 'move';
  toLocationId?: number;
  fromLocationId?: number;
  partnerId?: number;
  memo?: string;
  transactionTime?: string;
  items: { itemId: number; quantity: number }[];
}

export let validateId = (id: number, label: string) => {
  if (!providerId.safeParse(id).success)
    throw createApiServiceError(`${label} must be a whole number from 0 to 2147483647.`);
};

let errorCode = (value: unknown): string | undefined => {
  if (!isApiErrorRecord(value)) return undefined;
  if (typeof value.code === 'string') return value.code;
  let nestedCode = errorCode(value.error);
  if (nestedCode !== undefined) return nestedCode;
  if (Array.isArray(value.errors)) {
    for (let detail of value.errors) {
      let code = errorCode(detail);
      if (code !== undefined) return code;
    }
  }
  return typeof value.type === 'string' ? value.type : undefined;
};

let mapError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'BoxHero',
    reason: 'boxhero_api_error',
    detailKeys: [
      'title',
      'message',
      'detail',
      'code',
      'type',
      'id',
      'correlationID',
      'item_id',
      'order_id'
    ],
    nestedKeys: ['errors', 'error'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_error, response) => errorCode(response?.data)
  });

let idResponse = z.object({ id: providerId }).passthrough();

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private lastRequestAt = 0;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A BoxHero API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://rest.boxhero-app.com/v1',
      timeout: 30_000,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      paramsSerializer: { indexes: null },
      errorAdapter: mapError
    });
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    options: { params?: Record<string, unknown>; data?: Record<string, unknown> } = {}
  ) {
    // Detail hydration must share the provider's five-requests-per-second allowance.
    let wait = 210 - (Date.now() - this.lastRequestAt);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();
    let response = await this.axios.request<unknown>({ method, url, ...options });
    if (
      isApiErrorRecord(response.data) &&
      typeof response.data.type === 'string' &&
      response.data.type.startsWith('/errors/')
    ) {
      throw mapError({ response: { status: response.status, data: response.data } });
    }
    return response.data;
  }

  private pagination(params?: { cursor?: string; limit?: number }) {
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 100.');
    }
    if (params?.cursor !== undefined && !/^\d+$/.test(params.cursor)) {
      throw createApiServiceError(
        'cursor must be the numeric cursor returned by a previous page.'
      );
    }
    if (params?.cursor !== undefined) validateId(Number(params.cursor), 'cursor');
    return pickDefined({ limit: params?.limit, cursor: params?.cursor });
  }

  async getTeam() {
    return parseResponse(
      z.object({ id: providerId, name: z.string(), mode: z.number() }).passthrough(),
      await this.request('get', '/teams/linked'),
      'team'
    );
  }

  async listItems(params?: ListItemsParams) {
    params?.locationIds?.forEach(id => validateId(id, 'locationIds entry'));
    params?.itemIds?.forEach(id => validateId(id, 'itemIds entry'));
    return parseResponse(
      pageResponse(itemResponse),
      await this.request('get', '/items', {
        params: pickDefined({
          ...this.pagination(params),
          location_ids: params?.locationIds,
          item_ids: params?.itemIds
        })
      }),
      'item page'
    );
  }

  async getItem(itemId: number, locationIds?: number[]) {
    validateId(itemId, 'itemId');
    locationIds?.forEach(id => validateId(id, 'locationIds entry'));
    let response = parseResponse(
      z.object({ item: itemResponse }),
      await this.request('get', `/items/${itemId}`, {
        params: pickDefined({ location_ids: locationIds })
      }),
      'item'
    );
    return response.item;
  }

  async createItem(body: Record<string, unknown>, locationId?: number) {
    if (locationId !== undefined) validateId(locationId, 'locationId');
    return parseResponse(
      idResponse,
      await this.request('post', '/items', {
        params: pickDefined({ location_id: locationId }),
        data: body
      }),
      'created item'
    );
  }

  async updateItem(itemId: number, body: Record<string, unknown>) {
    validateId(itemId, 'itemId');
    return parseResponse(
      idResponse,
      await this.request('put', `/items/${itemId}`, { data: body }),
      'updated item'
    );
  }

  async deleteItem(itemId: number) {
    validateId(itemId, 'itemId');
    return await this.request('delete', `/items/${itemId}`);
  }

  async listTransactions(params?: ListTransactionsParams) {
    let page = parseResponse(
      pageResponse(idResponse),
      await this.request('get', '/transactions', {
        params: pickDefined({ ...this.pagination(params), type: params?.type })
      }),
      'transaction page'
    );
    let items: z.output<typeof transactionResponse>[] = [];
    for (let transaction of page.items) items.push(await this.getTransaction(transaction.id));
    return { ...page, items, raw: page };
  }

  async getTransaction(transactionId: number, revision?: number) {
    validateId(transactionId, 'transactionId');
    let response = parseResponse(
      z.object({ item: transactionResponse }),
      await this.request('get', `/transactions/${transactionId}`, {
        params: pickDefined({ revision })
      }),
      'transaction'
    );
    return response.item;
  }

  async createTransaction(params: CreateTransactionParams) {
    for (let item of params.items) validateId(item.itemId, 'itemId');
    for (let [label, id] of Object.entries({
      fromLocationId: params.fromLocationId,
      toLocationId: params.toLocationId,
      partnerId: params.partnerId
    })) {
      if (id !== undefined) validateId(id, label);
    }
    if (new Set(params.items.map(item => item.itemId)).size !== params.items.length)
      throw createApiServiceError('Each item may appear only once per transaction.');
    if (params.type === 'move') {
      if (params.fromLocationId === undefined || params.toLocationId === undefined)
        throw createApiServiceError(
          'Move Stock requires fromLocationId and toLocationId. Call list_locations to discover them.'
        );
      if (params.fromLocationId === params.toLocationId)
        throw createApiServiceError('Move Stock requires two different locations.');
    } else if (params.type !== 'out' && params.fromLocationId !== undefined) {
      throw createApiServiceError(
        'fromLocationId is supported only for Move Stock or as the Stock Out location.'
      );
    }
    if (
      params.type === 'out' &&
      params.fromLocationId !== undefined &&
      params.toLocationId !== undefined &&
      params.fromLocationId !== params.toLocationId
    )
      throw createApiServiceError(
        'Stock Out uses one location; fromLocationId and toLocationId must agree.'
      );
    if ((params.type === 'move' || params.type === 'adjust') && params.partnerId !== undefined)
      throw createApiServiceError('partnerId is supported only for Stock In and Stock Out.');
    if (params.type === 'adjust' && params.transactionTime !== undefined)
      throw createApiServiceError('transactionTime is not supported for Adjust Stock.');
    if (
      params.transactionTime !== undefined &&
      (!z.iso.datetime({ offset: true }).safeParse(params.transactionTime).success ||
        Date.parse(params.transactionTime) > Date.now())
    )
      throw createApiServiceError(
        'transactionTime must be an ISO 8601 datetime that is not in the future.'
      );
    if (params.memo !== undefined && params.memo.length > 2000)
      throw createApiServiceError('memo cannot exceed 2000 characters.');
    for (let item of params.items) {
      if (
        !Number.isFinite(item.quantity) ||
        ((params.type === 'in' || params.type === 'move') && item.quantity <= 0) ||
        (params.type === 'out' && item.quantity >= 0)
      )
        throw createApiServiceError(
          'Quantities must be finite: positive for Stock In/Move Stock, negative for Stock Out, and signed for Adjust Stock.'
        );
    }
    let created = parseResponse(
      idResponse,
      await this.request('post', '/transactions', {
        data: pickDefined({
          type: params.type,
          items: params.items.map(item => ({ item_id: item.itemId, quantity: item.quantity })),
          from_location_id: params.type === 'move' ? params.fromLocationId : undefined,
          to_location_id:
            params.toLocationId ?? (params.type === 'out' ? params.fromLocationId : undefined),
          partner_id: params.partnerId,
          memo: params.memo,
          tx_time: params.transactionTime
        })
      }),
      'created transaction'
    );
    try {
      return await this.getTransaction(created.id);
    } catch (error) {
      let data =
        isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
      throw createApiServiceError(
        `Transaction ${created.id} was created, but its details could not be read. Do not repeat creation; use get_transaction with this ID. ${error instanceof Error ? error.message : ''}`,
        {
          reason: 'boxhero_created_transaction_read_failed',
          upstreamStatus:
            typeof data?.upstreamStatus === 'number' ||
            typeof data?.upstreamStatus === 'string'
              ? data.upstreamStatus
              : undefined,
          upstreamCode: typeof data?.upstreamCode === 'string' ? data.upstreamCode : undefined,
          parent: error
        }
      );
    }
  }

  async updateTransaction(transactionId: number, body: Record<string, unknown>) {
    validateId(transactionId, 'transactionId');
    return parseResponse(
      idResponse,
      await this.request('put', `/transactions/${transactionId}`, { data: body }),
      'updated transaction'
    );
  }

  async deleteTransaction(transactionId: number, body: Record<string, unknown>) {
    validateId(transactionId, 'transactionId');
    return await this.request('delete', `/transactions/${transactionId}`, { data: body });
  }

  async listLocations() {
    return parseResponse(
      z
        .object({
          items: z.array(
            z
              .object({
                id: providerId,
                name: z.string(),
                quantity: z.number().optional(),
                memo: z.string().optional()
              })
              .passthrough()
          )
        })
        .passthrough(),
      await this.request('get', '/locations'),
      'locations'
    );
  }

  async listPartners(params?: { cursor?: string; limit?: number; type?: number }) {
    if (params?.type !== undefined && params.type !== 0 && params.type !== 1)
      throw createApiServiceError('Partner type must be 0 (supplier) or 1 (customer).');
    return parseResponse(
      pageResponse(
        z
          .object({
            id: providerId,
            name: z.string(),
            type: z.number().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            memo: z.string().optional()
          })
          .passthrough()
      ),
      await this.request('get', '/partners', {
        params: pickDefined({ ...this.pagination(params), type: params?.type })
      }),
      'partners'
    );
  }

  async listAttributes() {
    return parseResponse(
      z
        .object({
          items: z.array(
            z
              .object({
                id: providerId,
                attr_name: z.string(),
                attr_type: z.string(),
                rank: z.number().optional()
              })
              .passthrough()
          )
        })
        .passthrough(),
      await this.request('get', '/item-attrs'),
      'attributes'
    );
  }
}
