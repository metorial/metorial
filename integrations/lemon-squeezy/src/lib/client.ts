import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.lemonsqueezy.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
  }

  // ── Users ──

  async getUser() {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  // ── Stores ──

  async getStore(storeId: string) {
    let response = await this.http.get(`/stores/${storeId}`);
    return response.data;
  }

  async listStores(params?: ListParams) {
    let response = await this.http.get('/stores', { params: buildListParams(params) });
    return response.data;
  }

  // ── Products ──

  async getProduct(productId: string) {
    let response = await this.http.get(`/products/${productId}`);
    return response.data;
  }

  async listProducts(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    let response = await this.http.get('/products', { params: queryParams });
    return response.data;
  }

  // ── Variants ──

  async getVariant(variantId: string) {
    let response = await this.http.get(`/variants/${variantId}`);
    return response.data;
  }

  async listVariants(params?: ListParams & { productId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    let response = await this.http.get('/variants', { params: queryParams });
    return response.data;
  }

  // ── Orders ──

  async getOrder(orderId: string) {
    let response = await this.http.get(`/orders/${orderId}`);
    return response.data;
  }

  async listOrders(params?: ListParams & { storeId?: string; userEmail?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.userEmail) queryParams['filter[user_email]'] = params.userEmail;
    let response = await this.http.get('/orders', { params: queryParams });
    return response.data;
  }

  async refundOrder(orderId: string, amount?: number) {
    let response = await this.http.post(
      `/orders/${orderId}/refund`,
      amount
        ? {
            data: {
              type: 'orders',
              id: orderId,
              attributes: { amount }
            }
          }
        : undefined
    );
    return response.data;
  }

  // ── Order Items ──

  async listOrderItems(params?: ListParams & { orderId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.orderId) queryParams['filter[order_id]'] = params.orderId;
    let response = await this.http.get('/order-items', { params: queryParams });
    return response.data;
  }

  // ── Customers ──

  async getCustomer(customerId: string) {
    let response = await this.http.get(`/customers/${customerId}`);
    return response.data;
  }

  async listCustomers(params?: ListParams & { storeId?: string; email?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.email) queryParams['filter[email]'] = params.email;
    let response = await this.http.get('/customers', { params: queryParams });
    return response.data;
  }

  async createCustomer(
    storeId: string,
    attributes: {
      name: string;
      email: string;
      city?: string;
      region?: string;
      country?: string;
    }
  ) {
    let response = await this.http.post('/customers', {
      data: {
        type: 'customers',
        attributes,
        relationships: {
          store: { data: { type: 'stores', id: storeId } }
        }
      }
    });
    return response.data;
  }

  async updateCustomer(customerId: string, attributes: Record<string, unknown>) {
    let response = await this.http.patch(`/customers/${customerId}`, {
      data: {
        type: 'customers',
        id: customerId,
        attributes
      }
    });
    return response.data;
  }

  // ── Subscriptions ──

  async getSubscription(subscriptionId: string) {
    let response = await this.http.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listSubscriptions(
    params?: ListParams & {
      storeId?: string;
      orderId?: string;
      productId?: string;
      variantId?: string;
      status?: string;
    }
  ) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.orderId) queryParams['filter[order_id]'] = params.orderId;
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    if (params?.status) queryParams['filter[status]'] = params.status;
    let response = await this.http.get('/subscriptions', { params: queryParams });
    return response.data;
  }

  async updateSubscription(subscriptionId: string, attributes: Record<string, unknown>) {
    let response = await this.http.patch(`/subscriptions/${subscriptionId}`, {
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes
      }
    });
    return response.data;
  }

  async cancelSubscription(subscriptionId: string) {
    let response = await this.http.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // ── Subscription Invoices ──

  async listSubscriptionInvoices(
    params?: ListParams & { storeId?: string; subscriptionId?: string; status?: string }
  ) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.subscriptionId) queryParams['filter[subscription_id]'] = params.subscriptionId;
    if (params?.status) queryParams['filter[status]'] = params.status;
    let response = await this.http.get('/subscription-invoices', { params: queryParams });
    return response.data;
  }

  async getSubscriptionInvoice(invoiceId: string) {
    let response = await this.http.get(`/subscription-invoices/${invoiceId}`);
    return response.data;
  }

  // ── Discounts ──

  async getDiscount(discountId: string) {
    let response = await this.http.get(`/discounts/${discountId}`);
    return response.data;
  }

  async listDiscounts(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    let response = await this.http.get('/discounts', { params: queryParams });
    return response.data;
  }

  async createDiscount(
    storeId: string,
    attributes: {
      name: string;
      code: string;
      amount: number;
      amountType: 'percent' | 'fixed';
      isLimitedToProducts?: boolean;
      isLimitedRedemptions?: boolean;
      maxRedemptions?: number;
      startsAt?: string;
      expiresAt?: string;
      duration?: 'once' | 'repeating' | 'forever';
      durationInMonths?: number;
      testMode?: boolean;
    },
    variantIds?: string[]
  ) {
    let relationships: Record<string, unknown> = {
      store: { data: { type: 'stores', id: storeId } }
    };

    if (variantIds && variantIds.length > 0) {
      relationships.variants = {
        data: variantIds.map(id => ({ type: 'variants', id }))
      };
    }

    let response = await this.http.post('/discounts', {
      data: {
        type: 'discounts',
        attributes: {
          name: attributes.name,
          code: attributes.code,
          amount: attributes.amount,
          amount_type: attributes.amountType,
          is_limited_to_products: attributes.isLimitedToProducts,
          is_limited_redemptions: attributes.isLimitedRedemptions,
          max_redemptions: attributes.maxRedemptions,
          starts_at: attributes.startsAt,
          expires_at: attributes.expiresAt,
          duration: attributes.duration,
          duration_in_months: attributes.durationInMonths,
          test_mode: attributes.testMode
        },
        relationships
      }
    });
    return response.data;
  }

  async deleteDiscount(discountId: string) {
    await this.http.delete(`/discounts/${discountId}`);
  }

  // ── License Keys ──

  async getLicenseKey(licenseKeyId: string) {
    let response = await this.http.get(`/license-keys/${licenseKeyId}`);
    return response.data;
  }

  async listLicenseKeys(
    params?: ListParams & { storeId?: string; orderId?: string; productId?: string }
  ) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.orderId) queryParams['filter[order_id]'] = params.orderId;
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    let response = await this.http.get('/license-keys', { params: queryParams });
    return response.data;
  }

  async updateLicenseKey(licenseKeyId: string, attributes: Record<string, unknown>) {
    let response = await this.http.patch(`/license-keys/${licenseKeyId}`, {
      data: {
        type: 'license-keys',
        id: licenseKeyId,
        attributes
      }
    });
    return response.data;
  }

  // ── License Key Instances ──

  async listLicenseKeyInstances(params?: ListParams & { licenseKeyId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.licenseKeyId) queryParams['filter[license_key_id]'] = params.licenseKeyId;
    let response = await this.http.get('/license-key-instances', { params: queryParams });
    return response.data;
  }

  // ── Checkouts ──

  async createCheckout(
    storeId: string,
    variantId: string,
    attributes?: {
      customPrice?: number;
      productOptions?: Record<string, unknown>;
      checkoutOptions?: Record<string, unknown>;
      checkoutData?: Record<string, unknown>;
      expiresAt?: string;
      preview?: boolean;
      testMode?: boolean;
    }
  ) {
    let response = await this.http.post('/checkouts', {
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: attributes?.customPrice,
          product_options: attributes?.productOptions,
          checkout_options: attributes?.checkoutOptions,
          checkout_data: attributes?.checkoutData,
          expires_at: attributes?.expiresAt,
          preview: attributes?.preview,
          test_mode: attributes?.testMode
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } }
        }
      }
    });
    return response.data;
  }

  async getCheckout(checkoutId: string) {
    let response = await this.http.get(`/checkouts/${checkoutId}`);
    return response.data;
  }

  async listCheckouts(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    let response = await this.http.get('/checkouts', { params: queryParams });
    return response.data;
  }

  // ── Files ──

  async getFile(fileId: string) {
    let response = await this.http.get(`/files/${fileId}`);
    return response.data;
  }

  async listFiles(params?: ListParams & { variantId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    let response = await this.http.get('/files', { params: queryParams });
    return response.data;
  }

  // ── Webhooks ──

  async createWebhook(
    storeId: string,
    url: string,
    events: string[],
    secret: string,
    testMode?: boolean
  ) {
    let response = await this.http.post('/webhooks', {
      data: {
        type: 'webhooks',
        attributes: {
          url,
          events,
          secret,
          test_mode: testMode
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } }
        }
      }
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    attributes: { url?: string; events?: string[]; secret?: string }
  ) {
    let response = await this.http.patch(`/webhooks/${webhookId}`, {
      data: {
        type: 'webhooks',
        id: webhookId,
        attributes
      }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async listWebhooks(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    let response = await this.http.get('/webhooks', { params: queryParams });
    return response.data;
  }

  // ── Discount Redemptions ──

  async listDiscountRedemptions(params?: ListParams & { discountId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.discountId) queryParams['filter[discount_id]'] = params.discountId;
    let response = await this.http.get('/discount-redemptions', { params: queryParams });
    return response.data;
  }
}

// ── Helpers ──

interface ListParams {
  page?: number;
  perPage?: number;
  include?: string;
}

let buildListParams = (params?: ListParams): Record<string, string | number> => {
  let result: Record<string, string | number> = {};
  if (params?.page) result['page[number]'] = params.page;
  if (params?.perPage) result['page[size]'] = params.perPage;
  if (params?.include) result.include = params.include;
  return result;
};
