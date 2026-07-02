import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.ongoody.com',
  sandbox: 'https://api.sandbox.ongoody.com'
};

export interface GoodyClientConfig {
  token: string;
  environment: string;
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
}

export interface OrderBatchPriceInput {
  recipients: RecipientInput[];
  cart: { items: CartItemInput[] };
  send_method: string;
}

export class GoodyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: GoodyClientConfig) {
    let baseURL = BASE_URLS[config.environment] || BASE_URLS.production;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- User / Account ----

  async getMe(): Promise<any> {
    let response = await this.axios.get('/v1/me');
    return response.data;
  }

  // ---- Products ----

  async listProducts(params?: PaginationParams & { countryCode?: string }): Promise<any> {
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
    let response = await this.axios.get(`/v1/products/${productId}`);
    return response.data;
  }

  // ---- Cards ----

  async listCards(params?: PaginationParams): Promise<any> {
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
    let response = await this.axios.post('/v1/order_batches', input);
    return response.data;
  }

  async listOrderBatches(params?: PaginationParams): Promise<any> {
    let response = await this.axios.get('/v1/order_batches', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getOrderBatch(orderBatchId: string): Promise<any> {
    let response = await this.axios.get(`/v1/order_batches/${orderBatchId}`);
    return response.data;
  }

  async getOrderBatchOrders(orderBatchId: string, params?: PaginationParams): Promise<any> {
    let response = await this.axios.get(`/v1/order_batches/${orderBatchId}/orders`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async calculateOrderBatchPrice(input: OrderBatchPriceInput): Promise<any> {
    let response = await this.axios.post('/v1/order_batches/price', input);
    return response.data;
  }

  // ---- Orders ----

  async listOrders(params?: ListOrdersParams): Promise<any> {
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
    let response = await this.axios.get(`/v1/orders/${orderId}`);
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<any> {
    let response = await this.axios.post(`/v1/orders/${orderId}/cancel`);
    return response.data;
  }

  async updateOrderExpiration(orderId: string, expiresAt: string): Promise<any> {
    let response = await this.axios.post(`/v1/orders/${orderId}/update_expiration`, {
      expires_at: expiresAt
    });
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

  async listOrderActivities(params?: PaginationParams): Promise<any> {
    let response = await this.axios.get('/v1/order_activities', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }
}
