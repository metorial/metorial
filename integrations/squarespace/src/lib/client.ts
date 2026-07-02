import { createAxios } from 'slates';

let apiV1 = createAxios({
  baseURL: 'https://api.squarespace.com/1.0'
});

let apiV2 = createAxios({
  baseURL: 'https://api.squarespace.com/2.0'
});

export interface PaginationResponse {
  hasNextPage: boolean;
  nextPageCursor?: string;
  nextPageUrl?: string;
}

export interface ListOrdersParams {
  modifiedAfter?: string;
  modifiedBefore?: string;
  cursor?: string;
  fulfillmentStatus?: 'PENDING' | 'FULFILLED' | 'CANCELED';
  customerId?: string;
}

export interface FulfillOrderParams {
  shouldSendNotification: boolean;
  shipments: Array<{
    shipDate: string;
    carrierName: string;
    service: string;
    trackingNumber: string;
    trackingUrl?: string;
  }>;
}

export interface CreateOrderParams {
  channelName: string;
  externalOrderReference: string;
  createdOn: string;
  grandTotal: {
    currency: string;
    value: string;
  };
  lineItems: Array<{
    lineItemId?: string;
    variantId?: string;
    sku?: string;
    productName?: string;
    quantity: number;
    unitPricePaid: {
      currency: string;
      value: string;
    };
  }>;
  priceTaxInterpretation: 'EXCLUSIVE' | 'INCLUSIVE';
  customerEmail?: string;
  fulfillmentStatus?: 'PENDING' | 'FULFILLED' | 'CANCELED';
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  subtotal?: { currency: string; value: string };
  shippingTotal?: { currency: string; value: string };
  discountTotal?: { currency: string; value: string };
  taxTotal?: { currency: string; value: string };
}

export interface ListProductsParams {
  cursor?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  type?: string;
}

export interface CreateProductParams {
  type: 'PHYSICAL' | 'SERVICE' | 'GIFT_CARD';
  storePageId: string;
  name?: string;
  description?: string;
  urlSlug?: string;
  tags?: string[];
  isVisible?: boolean;
  variants: Array<{
    sku: string;
    pricing: {
      basePrice: {
        currency: string;
        value: string;
      };
    };
    attributes?: Record<string, string>;
    shippingMeasurements?: {
      weight?: { unit: string; value: number };
      dimensions?: { unit: string; length: number; width: number; height: number };
    };
  }>;
}

export interface UpdateProductParams {
  name?: string;
  description?: string;
  urlSlug?: string;
  tags?: string[];
  isVisible?: boolean;
}

export interface InventoryAdjustment {
  incrementOperations?: Array<{ variantId: string; quantity: number }>;
  decrementOperations?: Array<{ variantId: string; quantity: number }>;
  setFiniteOperations?: Array<{ variantId: string; quantity: number }>;
  setUnlimitedOperations?: string[];
}

export interface ListTransactionsParams {
  modifiedAfter?: string;
  modifiedBefore?: string;
  cursor?: string;
}

export interface ListProfilesParams {
  cursor?: string;
  filter?: string;
}

export interface WebhookSubscriptionParams {
  endpointUrl: string;
  topics: string[];
}

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'Slates-Squarespace-Integration/1.0',
      'Content-Type': 'application/json'
    };
  }

  // ---- Site Info ----

  async getSiteInfo(): Promise<any> {
    let response = await apiV1.get('/authorization/website', {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Orders ----

  async listOrders(
    params: ListOrdersParams = {}
  ): Promise<{ result: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
    if (params.fulfillmentStatus) queryParams.fulfillmentStatus = params.fulfillmentStatus;
    if (params.customerId) queryParams.customerId = params.customerId;

    let response = await apiV1.get('/commerce/orders', {
      headers: this.headers,
      params: queryParams
    });

    return {
      result: response.data.result || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await apiV1.get(`/commerce/orders/${orderId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createOrder(order: CreateOrderParams, idempotencyKey: string): Promise<any> {
    let response = await apiV1.post('/commerce/orders', order, {
      headers: {
        ...this.headers,
        'Idempotency-Key': idempotencyKey
      }
    });
    return response.data;
  }

  async fulfillOrder(orderId: string, fulfillment: FulfillOrderParams): Promise<void> {
    await apiV1.post(`/commerce/orders/${orderId}/fulfillments`, fulfillment, {
      headers: this.headers
    });
  }

  // ---- Products ----

  async listProducts(
    params: ListProductsParams = {}
  ): Promise<{ products: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
    if (params.type) queryParams.type = params.type;

    let response = await apiV2.get('/commerce/products', {
      headers: this.headers,
      params: queryParams
    });

    return {
      products: response.data.products || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getProducts(productIds: string[]): Promise<any[]> {
    let ids = productIds.join(',');
    let response = await apiV2.get(`/commerce/products/${ids}`, {
      headers: this.headers
    });
    return response.data.products || [response.data];
  }

  async createProduct(product: CreateProductParams): Promise<any> {
    let response = await apiV2.post('/commerce/products', product, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProduct(productId: string, updates: UpdateProductParams): Promise<any> {
    let response = await apiV2.post(`/commerce/products/${productId}`, updates, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}`, {
      headers: this.headers
    });
  }

  // ---- Product Variants ----

  async createVariant(productId: string, variant: Record<string, any>): Promise<any> {
    let response = await apiV2.post(`/commerce/products/${productId}/variants`, variant, {
      headers: this.headers
    });
    return response.data;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    updates: Record<string, any>
  ): Promise<any> {
    let response = await apiV2.post(
      `/commerce/products/${productId}/variants/${variantId}`,
      updates,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}/variants/${variantId}`, {
      headers: this.headers
    });
  }

  // ---- Product Images ----

  async uploadProductImage(
    productId: string,
    imageUrl: string,
    fileName: string
  ): Promise<any> {
    let response = await apiV2.post(
      `/commerce/products/${productId}/images`,
      {
        url: imageUrl,
        fileName
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}/images/${imageId}`, {
      headers: this.headers
    });
  }

  // ---- Store Pages ----

  async listStorePages(): Promise<any[]> {
    let response = await apiV2.get('/commerce/store_pages', {
      headers: this.headers
    });
    return response.data.storePages || [];
  }

  // ---- Inventory ----

  async listInventory(
    cursor?: string
  ): Promise<{ inventory: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (cursor) queryParams.cursor = cursor;

    let response = await apiV1.get('/commerce/inventory', {
      headers: this.headers,
      params: queryParams
    });

    return {
      inventory: response.data.inventory || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getInventory(variantIds: string[]): Promise<any[]> {
    let ids = variantIds.join(',');
    let response = await apiV1.get(`/commerce/inventory/${ids}`, {
      headers: this.headers
    });
    return response.data.inventory || [response.data];
  }

  async adjustInventory(
    adjustments: InventoryAdjustment,
    idempotencyKey: string
  ): Promise<void> {
    await apiV1.post('/commerce/inventory/adjustments', adjustments, {
      headers: {
        ...this.headers,
        'Idempotency-Key': idempotencyKey
      }
    });
  }

  // ---- Profiles ----

  async listProfiles(
    params: ListProfilesParams = {}
  ): Promise<{ profiles: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.filter) queryParams.filter = params.filter;

    let response = await apiV1.get('/profiles', {
      headers: this.headers,
      params: queryParams
    });

    return {
      profiles: response.data.profiles || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getProfile(profileId: string): Promise<any> {
    let response = await apiV1.get(`/profiles/${profileId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Transactions ----

  async listTransactions(
    params: ListTransactionsParams = {}
  ): Promise<{ documents: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;

    let response = await apiV1.get('/commerce/transactions', {
      headers: this.headers,
      params: queryParams
    });

    return {
      documents: response.data.documents || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  // ---- Webhooks ----

  async createWebhookSubscription(params: WebhookSubscriptionParams): Promise<any> {
    let response = await apiV1.post('/webhook_subscriptions', params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await apiV1.delete(`/webhook_subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
  }

  async listWebhookSubscriptions(): Promise<any[]> {
    let response = await apiV1.get('/webhook_subscriptions', {
      headers: this.headers
    });
    return response.data.webhookSubscriptions || [];
  }
}
