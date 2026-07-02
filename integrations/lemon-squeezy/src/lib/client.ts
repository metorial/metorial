import { createAxios } from 'slates';
import { lemonSqueezyApiError } from './errors';

type JsonApiResponse<T = any> = {
  data: T;
};

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

  private async request<T>(
    operation: string,
    run: () => Promise<JsonApiResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw lemonSqueezyApiError(error, operation);
    }
  }

  private async requestVoid(operation: string, run: () => Promise<unknown>) {
    try {
      await run();
    } catch (error) {
      throw lemonSqueezyApiError(error, operation);
    }
  }

  // Users

  async getUser() {
    return await this.request('retrieve user', () => this.http.get('/users/me'));
  }

  // Stores

  async getStore(storeId: string) {
    return await this.request('retrieve store', () => this.http.get(`/stores/${storeId}`));
  }

  async listStores(params?: ListParams) {
    return await this.request('list stores', () =>
      this.http.get('/stores', { params: buildListParams(params) })
    );
  }

  // Products

  async getProduct(productId: string) {
    return await this.request('retrieve product', () =>
      this.http.get(`/products/${productId}`)
    );
  }

  async listProducts(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    return await this.request('list products', () =>
      this.http.get('/products', { params: queryParams })
    );
  }

  // Variants

  async getVariant(variantId: string) {
    return await this.request('retrieve variant', () =>
      this.http.get(`/variants/${variantId}`)
    );
  }

  async listVariants(params?: ListParams & { productId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    return await this.request('list variants', () =>
      this.http.get('/variants', { params: queryParams })
    );
  }

  // Prices

  async getPrice(priceId: string) {
    return await this.request('retrieve price', () => this.http.get(`/prices/${priceId}`));
  }

  async listPrices(params?: ListParams & { variantId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    return await this.request('list prices', () =>
      this.http.get('/prices', { params: queryParams })
    );
  }

  // Orders

  async getOrder(orderId: string) {
    return await this.request('retrieve order', () => this.http.get(`/orders/${orderId}`));
  }

  async listOrders(params?: ListParams & { storeId?: string; userEmail?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.userEmail) queryParams['filter[user_email]'] = params.userEmail;
    return await this.request('list orders', () =>
      this.http.get('/orders', { params: queryParams })
    );
  }

  async refundOrder(orderId: string, amount?: number) {
    return await this.request('refund order', () =>
      this.http.post(
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
      )
    );
  }

  // Order Items

  async listOrderItems(
    params?: ListParams & { orderId?: string; productId?: string; variantId?: string }
  ) {
    let queryParams = buildListParams(params);
    if (params?.orderId) queryParams['filter[order_id]'] = params.orderId;
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    return await this.request('list order items', () =>
      this.http.get('/order-items', { params: queryParams })
    );
  }

  // Customers

  async getCustomer(customerId: string) {
    return await this.request('retrieve customer', () =>
      this.http.get(`/customers/${customerId}`)
    );
  }

  async listCustomers(params?: ListParams & { storeId?: string; email?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.email) queryParams['filter[email]'] = params.email;
    return await this.request('list customers', () =>
      this.http.get('/customers', { params: queryParams })
    );
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
    return await this.request('create customer', () =>
      this.http.post('/customers', {
        data: {
          type: 'customers',
          attributes,
          relationships: {
            store: { data: { type: 'stores', id: storeId } }
          }
        }
      })
    );
  }

  async updateCustomer(customerId: string, attributes: Record<string, unknown>) {
    return await this.request('update customer', () =>
      this.http.patch(`/customers/${customerId}`, {
        data: {
          type: 'customers',
          id: customerId,
          attributes
        }
      })
    );
  }

  // Subscriptions

  async getSubscription(subscriptionId: string) {
    return await this.request('retrieve subscription', () =>
      this.http.get(`/subscriptions/${subscriptionId}`)
    );
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
    return await this.request('list subscriptions', () =>
      this.http.get('/subscriptions', { params: queryParams })
    );
  }

  async updateSubscription(subscriptionId: string, attributes: Record<string, unknown>) {
    return await this.request('update subscription', () =>
      this.http.patch(`/subscriptions/${subscriptionId}`, {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes
        }
      })
    );
  }

  async cancelSubscription(subscriptionId: string) {
    return await this.request('cancel subscription', () =>
      this.http.delete(`/subscriptions/${subscriptionId}`)
    );
  }

  // Subscription Invoices

  async listSubscriptionInvoices(
    params?: ListParams & {
      storeId?: string;
      subscriptionId?: string;
      status?: string;
      refunded?: boolean;
    }
  ) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.subscriptionId) queryParams['filter[subscription_id]'] = params.subscriptionId;
    if (params?.status) queryParams['filter[status]'] = params.status;
    if (params?.refunded !== undefined)
      queryParams['filter[refunded]'] = String(params.refunded);
    return await this.request('list subscription invoices', () =>
      this.http.get('/subscription-invoices', { params: queryParams })
    );
  }

  async getSubscriptionInvoice(invoiceId: string) {
    return await this.request('retrieve subscription invoice', () =>
      this.http.get(`/subscription-invoices/${invoiceId}`)
    );
  }

  // Subscription Items

  async listSubscriptionItems(
    params?: ListParams & { subscriptionId?: string; priceId?: string }
  ) {
    let queryParams = buildListParams(params);
    if (params?.subscriptionId) queryParams['filter[subscription_id]'] = params.subscriptionId;
    if (params?.priceId) queryParams['filter[price_id]'] = params.priceId;
    return await this.request('list subscription items', () =>
      this.http.get('/subscription-items', { params: queryParams })
    );
  }

  // Discounts

  async getDiscount(discountId: string) {
    return await this.request('retrieve discount', () =>
      this.http.get(`/discounts/${discountId}`)
    );
  }

  async listDiscounts(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    return await this.request('list discounts', () =>
      this.http.get('/discounts', { params: queryParams })
    );
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

    return await this.request('create discount', () =>
      this.http.post('/discounts', {
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
      })
    );
  }

  async deleteDiscount(discountId: string) {
    await this.requestVoid('delete discount', () =>
      this.http.delete(`/discounts/${discountId}`)
    );
  }

  // Discount Redemptions

  async listDiscountRedemptions(params?: ListParams & { discountId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.discountId) queryParams['filter[discount_id]'] = params.discountId;
    return await this.request('list discount redemptions', () =>
      this.http.get('/discount-redemptions', { params: queryParams })
    );
  }

  // License Keys

  async getLicenseKey(licenseKeyId: string) {
    return await this.request('retrieve license key', () =>
      this.http.get(`/license-keys/${licenseKeyId}`)
    );
  }

  async listLicenseKeys(
    params?: ListParams & { storeId?: string; orderId?: string; productId?: string }
  ) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.orderId) queryParams['filter[order_id]'] = params.orderId;
    if (params?.productId) queryParams['filter[product_id]'] = params.productId;
    return await this.request('list license keys', () =>
      this.http.get('/license-keys', { params: queryParams })
    );
  }

  async updateLicenseKey(licenseKeyId: string, attributes: Record<string, unknown>) {
    return await this.request('update license key', () =>
      this.http.patch(`/license-keys/${licenseKeyId}`, {
        data: {
          type: 'license-keys',
          id: licenseKeyId,
          attributes
        }
      })
    );
  }

  // License Key Instances

  async listLicenseKeyInstances(params?: ListParams & { licenseKeyId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.licenseKeyId) queryParams['filter[license_key_id]'] = params.licenseKeyId;
    return await this.request('list license key instances', () =>
      this.http.get('/license-key-instances', { params: queryParams })
    );
  }

  // Checkouts

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
    return await this.request('create checkout', () =>
      this.http.post('/checkouts', {
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
      })
    );
  }

  async getCheckout(checkoutId: string) {
    return await this.request('retrieve checkout', () =>
      this.http.get(`/checkouts/${checkoutId}`)
    );
  }

  async listCheckouts(params?: ListParams & { storeId?: string; variantId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    return await this.request('list checkouts', () =>
      this.http.get('/checkouts', { params: queryParams })
    );
  }

  // Files

  async getFile(fileId: string) {
    return await this.request('retrieve file', () => this.http.get(`/files/${fileId}`));
  }

  async listFiles(params?: ListParams & { variantId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.variantId) queryParams['filter[variant_id]'] = params.variantId;
    return await this.request('list files', () =>
      this.http.get('/files', { params: queryParams })
    );
  }

  // Webhooks

  async getWebhook(webhookId: string) {
    return await this.request('retrieve webhook', () =>
      this.http.get(`/webhooks/${webhookId}`)
    );
  }

  async createWebhook(
    storeId: string,
    url: string,
    events: string[],
    secret: string,
    testMode?: boolean
  ) {
    return await this.request('create webhook', () =>
      this.http.post('/webhooks', {
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
      })
    );
  }

  async updateWebhook(
    webhookId: string,
    attributes: { url?: string; events?: string[]; secret?: string }
  ) {
    return await this.request('update webhook', () =>
      this.http.patch(`/webhooks/${webhookId}`, {
        data: {
          type: 'webhooks',
          id: webhookId,
          attributes
        }
      })
    );
  }

  async deleteWebhook(webhookId: string) {
    await this.requestVoid('delete webhook', () => this.http.delete(`/webhooks/${webhookId}`));
  }

  async listWebhooks(params?: ListParams & { storeId?: string }) {
    let queryParams = buildListParams(params);
    if (params?.storeId) queryParams['filter[store_id]'] = params.storeId;
    return await this.request('list webhooks', () =>
      this.http.get('/webhooks', { params: queryParams })
    );
  }
}

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
