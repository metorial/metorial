import { createAxios } from 'slates';

export class GumroadClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.gumroad.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ── User ──────────────────────────────────────────────────

  async getUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data.user;
  }

  // ── Products ──────────────────────────────────────────────

  async listProducts(): Promise<any[]> {
    let response = await this.axios.get('/products');
    return response.data.products || [];
  }

  async getProduct(productId: string): Promise<any> {
    let response = await this.axios.get(`/products/${productId}`);
    return response.data.product;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}`);
  }

  async enableProduct(productId: string): Promise<any> {
    let response = await this.axios.put(`/products/${productId}/enable`);
    return response.data.product;
  }

  async disableProduct(productId: string): Promise<any> {
    let response = await this.axios.put(`/products/${productId}/disable`);
    return response.data.product;
  }

  // ── Offer Codes ───────────────────────────────────────────

  async listOfferCodes(productId: string): Promise<any[]> {
    let response = await this.axios.get(`/products/${productId}/offer_codes`);
    return response.data.offer_codes || [];
  }

  async getOfferCode(productId: string, offerCodeId: string): Promise<any> {
    let response = await this.axios.get(`/products/${productId}/offer_codes/${offerCodeId}`);
    return response.data.offer_code;
  }

  async createOfferCode(
    productId: string,
    params: {
      name: string;
      amountOff: number;
      offerType?: string;
      maxPurchaseCount?: number;
      universal?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/products/${productId}/offer_codes`, {
      name: params.name,
      amount_off: params.amountOff,
      offer_type: params.offerType || 'cents',
      max_purchase_count: params.maxPurchaseCount || 0,
      universal: params.universal ? 'true' : 'false'
    });
    return response.data.offer_code;
  }

  async updateOfferCode(
    productId: string,
    offerCodeId: string,
    params: {
      maxPurchaseCount?: number;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/products/${productId}/offer_codes/${offerCodeId}`, {
      max_purchase_count: params.maxPurchaseCount
    });
    return response.data.offer_code;
  }

  async deleteOfferCode(productId: string, offerCodeId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}/offer_codes/${offerCodeId}`);
  }

  // ── Variant Categories ────────────────────────────────────

  async listVariantCategories(productId: string): Promise<any[]> {
    let response = await this.axios.get(`/products/${productId}/variant_categories`);
    return response.data.variant_categories || [];
  }

  async getVariantCategory(productId: string, variantCategoryId: string): Promise<any> {
    let response = await this.axios.get(
      `/products/${productId}/variant_categories/${variantCategoryId}`
    );
    return response.data.variant_category;
  }

  async createVariantCategory(productId: string, title: string): Promise<any> {
    let response = await this.axios.post(`/products/${productId}/variant_categories`, {
      title
    });
    return response.data.variant_category;
  }

  async updateVariantCategory(
    productId: string,
    variantCategoryId: string,
    title: string
  ): Promise<any> {
    let response = await this.axios.put(
      `/products/${productId}/variant_categories/${variantCategoryId}`,
      { title }
    );
    return response.data.variant_category;
  }

  async deleteVariantCategory(productId: string, variantCategoryId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}/variant_categories/${variantCategoryId}`);
  }

  // ── Variants ──────────────────────────────────────────────

  async listVariants(productId: string, variantCategoryId: string): Promise<any[]> {
    let response = await this.axios.get(
      `/products/${productId}/variant_categories/${variantCategoryId}/variants`
    );
    return response.data.variants || [];
  }

  async getVariant(
    productId: string,
    variantCategoryId: string,
    variantId: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/products/${productId}/variant_categories/${variantCategoryId}/variants/${variantId}`
    );
    return response.data.variant;
  }

  async createVariant(
    productId: string,
    variantCategoryId: string,
    params: {
      name: string;
      priceDifferenceCents?: number;
      maxPurchaseCount?: number;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/products/${productId}/variant_categories/${variantCategoryId}/variants`,
      {
        name: params.name,
        price_difference_cents: params.priceDifferenceCents || 0,
        max_purchase_count: params.maxPurchaseCount || 0
      }
    );
    return response.data.variant;
  }

  async updateVariant(
    productId: string,
    variantCategoryId: string,
    variantId: string,
    params: {
      name?: string;
      priceDifferenceCents?: number;
      maxPurchaseCount?: number;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.priceDifferenceCents !== undefined)
      body.price_difference_cents = params.priceDifferenceCents;
    if (params.maxPurchaseCount !== undefined)
      body.max_purchase_count = params.maxPurchaseCount;

    let response = await this.axios.put(
      `/products/${productId}/variant_categories/${variantCategoryId}/variants/${variantId}`,
      body
    );
    return response.data.variant;
  }

  async deleteVariant(
    productId: string,
    variantCategoryId: string,
    variantId: string
  ): Promise<void> {
    await this.axios.delete(
      `/products/${productId}/variant_categories/${variantCategoryId}/variants/${variantId}`
    );
  }

  // ── Custom Fields ─────────────────────────────────────────

  async listCustomFields(productId: string): Promise<any[]> {
    let response = await this.axios.get(`/products/${productId}/custom_fields`);
    return response.data.custom_fields || [];
  }

  async createCustomField(
    productId: string,
    params: {
      name: string;
      required?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/products/${productId}/custom_fields`, {
      name: params.name,
      required: params.required ? 'true' : 'false'
    });
    return response.data.custom_field;
  }

  async updateCustomField(
    productId: string,
    customFieldName: string,
    params: {
      required?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.put(
      `/products/${productId}/custom_fields/${encodeURIComponent(customFieldName)}`,
      {
        required: params.required ? 'true' : 'false'
      }
    );
    return response.data.custom_field;
  }

  async deleteCustomField(productId: string, customFieldName: string): Promise<void> {
    await this.axios.delete(
      `/products/${productId}/custom_fields/${encodeURIComponent(customFieldName)}`
    );
  }

  // ── Sales ─────────────────────────────────────────────────

  async listSales(params?: {
    after?: string;
    before?: string;
    email?: string;
    productId?: string;
    orderId?: string;
    pageKey?: string;
  }): Promise<{ sales: any[]; nextPageKey?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.email) queryParams.email = params.email;
    if (params?.productId) queryParams.product_id = params.productId;
    if (params?.orderId) queryParams.order_id = params.orderId;
    if (params?.pageKey) queryParams.page_key = params.pageKey;

    let response = await this.axios.get('/sales', { params: queryParams });
    return {
      sales: response.data.sales || [],
      nextPageKey: response.data.next_page_key
    };
  }

  async getSale(saleId: string): Promise<any> {
    let response = await this.axios.get(`/sales/${saleId}`);
    return response.data.sale;
  }

  async markSaleAsShipped(saleId: string, trackingUrl?: string): Promise<any> {
    let body: Record<string, string> = {};
    if (trackingUrl) body.tracking_url = trackingUrl;

    let response = await this.axios.put(`/sales/${saleId}/mark_as_shipped`, body);
    return response.data.sale;
  }

  async refundSale(saleId: string, amountCents?: number): Promise<any> {
    let body: Record<string, any> = {};
    if (amountCents !== undefined) body.amount_cents = amountCents;

    let response = await this.axios.put(`/sales/${saleId}/refund`, body);
    return response.data.sale;
  }

  // ── Subscribers ───────────────────────────────────────────

  async listSubscribers(
    productId: string,
    params?: {
      email?: string;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, string> = { product_id: productId };
    if (params?.email) queryParams.email = params.email;

    let response = await this.axios.get(`/products/${productId}/subscribers`, {
      params: queryParams
    });
    return response.data.subscribers || [];
  }

  async getSubscriber(subscriberId: string): Promise<any> {
    let response = await this.axios.get(`/subscribers/${subscriberId}`);
    return response.data.subscriber;
  }

  // ── Licenses ──────────────────────────────────────────────

  async verifyLicense(
    productPermalink: string,
    licenseKey: string,
    incrementUsesCount?: boolean
  ): Promise<any> {
    let response = await this.axios.post('/licenses/verify', {
      product_permalink: productPermalink,
      license_key: licenseKey,
      increment_uses_count: incrementUsesCount !== false ? 'true' : 'false'
    });
    return response.data;
  }

  async enableLicense(productPermalink: string, licenseKey: string): Promise<any> {
    let response = await this.axios.put('/licenses/enable', {
      product_permalink: productPermalink,
      license_key: licenseKey
    });
    return response.data;
  }

  async disableLicense(productPermalink: string, licenseKey: string): Promise<any> {
    let response = await this.axios.put('/licenses/disable', {
      product_permalink: productPermalink,
      license_key: licenseKey
    });
    return response.data;
  }

  async decrementLicenseUsesCount(productPermalink: string, licenseKey: string): Promise<any> {
    let response = await this.axios.put('/licenses/decrement_uses_count', {
      product_permalink: productPermalink,
      license_key: licenseKey
    });
    return response.data;
  }

  // ── Resource Subscriptions (Webhooks) ─────────────────────

  async listResourceSubscriptions(resourceName: string): Promise<any[]> {
    let response = await this.axios.get('/resource_subscriptions', {
      params: { resource_name: resourceName }
    });
    return response.data.resource_subscriptions || [];
  }

  async createResourceSubscription(resourceName: string, postUrl: string): Promise<any> {
    let response = await this.axios.put('/resource_subscriptions', {
      resource_name: resourceName,
      post_url: postUrl
    });
    return response.data.resource_subscription;
  }

  async deleteResourceSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/resource_subscriptions/${subscriptionId}`);
  }
}
