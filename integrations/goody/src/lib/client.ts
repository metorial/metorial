import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.ongoody.com',
  sandbox: 'https://api.sandbox.ongoody.com'
};

export interface GoodyClientConfig {
  token: string;
  environment?: string;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface ListOrdersParams extends PaginationParams {
  createdAtAfter?: string;
  createdAtBefore?: string;
}

export interface CartItemInput {
  product_id?: string;
  product_url?: string;
  quantity: number;
  variable_price?: number;
  variants?: string[];
}

export interface RecipientInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mailing_address?: {
    first_name?: string;
    last_name?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface CreateOrderBatchInput {
  from_name: string;
  send_method: string;
  recipients: RecipientInput[];
  cart: { items: CartItemInput[] };
  message?: string;
  card_id?: string;
  payment_method_id?: string;
  workspace_id?: string;
  scheduled_send_on?: string;
  expires_at?: string;
  swap?: string;
  international_shipping_tier?: string;
  international_gift_cards_enabled?: boolean;
  notifications_enabled?: boolean;
  commerce_end_user_id?: string;
  customer_reference_id?: string;
}

export interface OrderBatchPriceInput {
  recipients: RecipientInput[];
  cart: { items: CartItemInput[] };
  send_method: string;
}

export class GoodyClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: GoodyClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Goody API key is required. Reconnect with a valid API key.'
      );
    }
    let environment = config.environment ?? 'production';
    if (!BASE_URLS[environment]) {
      throw createApiServiceError('Choose the production or sandbox Goody environment.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URLS[environment],
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Goody',
          reason: 'goody_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
        })
    });
  }

  // ---- User / Account ----

  async getMe(): Promise<any> {
    let response = await this.axios.get('/v1/me');
    return response.data;
  }

  // ---- Products ----

  async listProducts(params?: PaginationParams & { countryCode?: string }): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/products', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        country_code: params?.countryCode
      }
    });
    return response.data;
  }

  async getProduct(productId: string): Promise<any> {
    let response = await this.axios.get(`/v1/products/${this.pathId(productId)}`);
    return response.data;
  }

  // ---- Cards ----

  async listCards(params?: PaginationParams): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/cards', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ---- Order Batches ----

  async createOrderBatch(input: CreateOrderBatchInput): Promise<any> {
    this.validateBatch(input);
    if (!input.from_name.trim()) {
      throw createApiServiceError('Provide a sender name.');
    }
    if (input.message && !input.card_id) {
      throw createApiServiceError(
        'Select a cardId with list_cards when supplying a gift message.'
      );
    }
    let response = await this.axios.post('/v1/order_batches', input);
    return response.data;
  }

  async listOrderBatches(params?: PaginationParams): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/order_batches', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getOrderBatch(orderBatchId: string): Promise<any> {
    let response = await this.axios.get(`/v1/order_batches/${this.pathId(orderBatchId)}`);
    return response.data;
  }

  async getOrderBatchOrders(orderBatchId: string, params?: PaginationParams): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get(
      `/v1/order_batches/${this.pathId(orderBatchId)}/orders`,
      {
        params: {
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
    return response.data;
  }

  async calculateOrderBatchPrice(input: OrderBatchPriceInput): Promise<any> {
    this.validateBatch(input);
    let response = await this.axios.post('/v1/order_batches/price', input);
    return response.data;
  }

  // ---- Orders ----

  async listOrders(params?: ListOrdersParams): Promise<any> {
    this.validatePagination(params);
    let queryParams: Record<string, any> = {
      page: params?.page,
      per_page: params?.perPage
    };
    if (params?.createdAtAfter) {
      queryParams['created_at[after]'] = params.createdAtAfter;
    }
    if (params?.createdAtBefore) {
      queryParams['created_at[before]'] = params.createdAtBefore;
    }
    let response = await this.axios.get('/v1/orders', { params: queryParams });
    return response.data;
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await this.axios.get(`/v1/orders/${this.pathId(orderId)}`);
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<any> {
    let response = await this.axios.post(`/v1/orders/${this.pathId(orderId)}/cancel`);
    return response.data;
  }

  async updateOrderExpiration(orderId: string, expiresAt: string): Promise<any> {
    let response = await this.axios.post(
      `/v1/orders/${this.pathId(orderId)}/update_expiration`,
      {
        expiration: expiresAt
      }
    );
    return response.data;
  }

  // ---- Payment Methods ----

  async listPaymentMethods(): Promise<any> {
    let response = await this.axios.get('/v1/payment_methods');
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(): Promise<any> {
    let response = await this.axios.get('/v1/workspaces');
    return response.data;
  }

  // ---- Order Activities ----

  async listOrderActivities(
    params?: PaginationParams & {
      after?: string;
      before?: string;
      statuses?: string[];
    }
  ): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/order_activities', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        after: params?.after,
        before: params?.before,
        statuses: params?.statuses?.join(',')
      }
    });
    return response.data;
  }

  async getOrderBatchRecipients(
    orderBatchId: string,
    params?: PaginationParams
  ): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get(
      `/v1/order_batches/${this.pathId(orderBatchId)}/recipients`,
      {
        params: { page: params?.page, per_page: params?.perPage }
      }
    );
    return response.data;
  }

  async listBrands(params?: PaginationParams & { countryCode?: string }): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/brands', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        country_code: params?.countryCode
      }
    });
    return response.data;
  }

  async listCollections(params?: PaginationParams & { published?: boolean }): Promise<any> {
    this.validatePagination(params);
    let response = await this.axios.get('/v1/collections', {
      params: { page: params?.page, per_page: params?.perPage, published: params?.published }
    });
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(`/v1/collections/${this.pathId(collectionId)}`);
    return response.data;
  }

  private pathId(id: string): string {
    if (!id.trim()) throw createApiServiceError('Provide a non-empty resource ID.');
    return encodeURIComponent(id);
  }

  private validatePagination(params?: PaginationParams): void {
    if (params?.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      throw createApiServiceError('page must be an integer starting at 1.');
    }
    if (
      params?.perPage !== undefined &&
      (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 100)
    ) {
      throw createApiServiceError('perPage must be an integer between 1 and 100.');
    }
  }

  private validateBatch(input: OrderBatchPriceInput): void {
    for (let [index, item] of input.cart.items.entries()) {
      if (!item.product_id?.trim() && !item.product_url?.trim()) {
        throw createApiServiceError(
          `Cart item ${index + 1} needs productId or productUrl. Call list_products to discover products.`
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw createApiServiceError(
          `Cart item ${index + 1} quantity must be a positive integer.`
        );
      }
      if (
        item.variable_price !== undefined &&
        (!Number.isInteger(item.variable_price) || item.variable_price < 1)
      ) {
        throw createApiServiceError(
          `Cart item ${index + 1} variablePrice must be a positive integer in cents.`
        );
      }
    }
    for (let [index, recipient] of input.recipients.entries()) {
      if (!recipient.first_name.trim()) {
        throw createApiServiceError(`Recipient ${index + 1} needs a firstName.`);
      }
      if (input.send_method === 'direct_send' && !recipient.mailing_address) {
        throw createApiServiceError(
          `Recipient ${index + 1} needs a mailingAddress for direct_send pricing.`
        );
      }
    }
  }
}

export let resolveGoodyEnvironment = (auth: { environment?: string }, config?: unknown) => {
  let legacy =
    config && typeof config === 'object' && 'environment' in config
      ? config.environment
      : undefined;
  let environment =
    auth.environment ?? (typeof legacy === 'string' ? legacy : undefined) ?? 'production';
  if (environment !== 'production' && environment !== 'sandbox') {
    throw createApiServiceError('Choose the production or sandbox Goody environment.');
  }
  return environment;
};

export let createGoodyClient = (ctx: { auth: GoodyClientConfig; config?: unknown }) =>
  new GoodyClient({
    token: ctx.auth.token,
    environment: resolveGoodyEnvironment(ctx.auth, ctx.config)
  });
