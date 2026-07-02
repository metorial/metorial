import { createAxios, setIfDefined } from 'slates';
import { gumroadApiError, gumroadServiceError } from './errors';

type GumroadData = Record<string, any>;

export type ProductMutationParams = {
  nativeType?: string;
  name?: string;
  description?: string;
  customPermalink?: string;
  priceCents?: number;
  currency?: string;
  subscriptionDuration?: string;
  customizablePrice?: boolean;
  suggestedPriceCents?: number;
  maxPurchaseCount?: number;
  quantityEnabled?: boolean;
  isAdult?: boolean;
  displayProductReviews?: boolean;
  shouldShowSalesCount?: boolean;
  category?: string;
  taxonomyId?: number;
  tags?: string[];
  customReceipt?: string;
  customSummary?: string;
  customHtml?: string;
  coverIds?: string[];
  richContent?: unknown[];
  files?: unknown[];
  hasSameRichContentForAllVariants?: boolean;
};

let buildProductBody = (params: ProductMutationParams) => {
  let body: Record<string, unknown> = {};

  setIfDefined(body, 'native_type', params.nativeType);
  setIfDefined(body, 'name', params.name);
  setIfDefined(body, 'description', params.description);
  setIfDefined(body, 'custom_permalink', params.customPermalink);
  setIfDefined(body, 'price', params.priceCents);
  setIfDefined(body, 'price_currency_type', params.currency);
  setIfDefined(body, 'subscription_duration', params.subscriptionDuration);
  setIfDefined(body, 'customizable_price', params.customizablePrice);
  setIfDefined(body, 'suggested_price_cents', params.suggestedPriceCents);
  setIfDefined(body, 'max_purchase_count', params.maxPurchaseCount);
  setIfDefined(body, 'quantity_enabled', params.quantityEnabled);
  setIfDefined(body, 'is_adult', params.isAdult);
  setIfDefined(body, 'display_product_reviews', params.displayProductReviews);
  setIfDefined(body, 'should_show_sales_count', params.shouldShowSalesCount);
  setIfDefined(body, 'category', params.category);
  setIfDefined(body, 'taxonomy_id', params.taxonomyId);
  setIfDefined(body, 'tags', params.tags);
  setIfDefined(body, 'custom_receipt', params.customReceipt);
  setIfDefined(body, 'custom_summary', params.customSummary);
  setIfDefined(body, 'custom_html', params.customHtml);
  setIfDefined(body, 'cover_ids', params.coverIds);
  setIfDefined(body, 'rich_content', params.richContent);
  setIfDefined(body, 'files', params.files);
  setIfDefined(
    body,
    'has_same_rich_content_for_all_variants',
    params.hasSameRichContentForAllVariants
  );

  return body;
};

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

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw gumroadApiError(error, operation);
    }
  }

  private unwrap<T extends GumroadData>(data: GumroadData | undefined, operation: string): T {
    if (!data || typeof data !== 'object') {
      throw gumroadServiceError(
        `Gumroad API ${operation} failed: Response did not include a JSON object.`
      );
    }

    if (data.success === false) {
      throw gumroadServiceError(
        `Gumroad API ${operation} failed: ${data.message || 'Request was not successful.'}`
      );
    }

    return data as T;
  }

  // -- User --------------------------------------------------

  async getUser(): Promise<any> {
    return this.request('get user', async () => {
      let response = await this.axios.get('/user');
      return this.unwrap(response.data, 'get user').user;
    });
  }

  // -- Products ----------------------------------------------

  async listCategories(): Promise<any[]> {
    return this.request('list categories', async () => {
      let response = await this.axios.get('/categories');
      return this.unwrap(response.data, 'list categories').categories || [];
    });
  }

  async listProducts(params?: {
    pageKey?: string;
  }): Promise<{ products: any[]; nextPageKey?: string; nextPageUrl?: string }> {
    return this.request('list products', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.pageKey) queryParams.page_key = params.pageKey;

      let response = await this.axios.get('/products', { params: queryParams });
      let data = this.unwrap(response.data, 'list products');

      return {
        products: data.products || [],
        nextPageKey: data.next_page_key,
        nextPageUrl: data.next_page_url
      };
    });
  }

  async getProduct(productId: string): Promise<any> {
    return this.request('get product', async () => {
      let response = await this.axios.get(`/products/${productId}`);
      return this.unwrap(response.data, 'get product').product;
    });
  }

  async createProduct(params: ProductMutationParams): Promise<any> {
    return this.request('create product', async () => {
      let response = await this.axios.post('/products', buildProductBody(params));
      return this.unwrap(response.data, 'create product').product;
    });
  }

  async updateProduct(productId: string, params: ProductMutationParams): Promise<any> {
    return this.request('update product', async () => {
      let response = await this.axios.put(`/products/${productId}`, buildProductBody(params));
      return this.unwrap(response.data, 'update product').product;
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.request('delete product', async () => {
      let response = await this.axios.delete(`/products/${productId}`);
      this.unwrap(response.data, 'delete product');
    });
  }

  async enableProduct(productId: string): Promise<any> {
    return this.request('enable product', async () => {
      let response = await this.axios.put(`/products/${productId}/enable`);
      return this.unwrap(response.data, 'enable product').product;
    });
  }

  async disableProduct(productId: string): Promise<any> {
    return this.request('disable product', async () => {
      let response = await this.axios.put(`/products/${productId}/disable`);
      return this.unwrap(response.data, 'disable product').product;
    });
  }

  // -- Offer Codes -------------------------------------------

  async listOfferCodes(productId: string): Promise<any[]> {
    return this.request('list offer codes', async () => {
      let response = await this.axios.get(`/products/${productId}/offer_codes`);
      return this.unwrap(response.data, 'list offer codes').offer_codes || [];
    });
  }

  async getOfferCode(productId: string, offerCodeId: string): Promise<any> {
    return this.request('get offer code', async () => {
      let response = await this.axios.get(`/products/${productId}/offer_codes/${offerCodeId}`);
      return this.unwrap(response.data, 'get offer code').offer_code;
    });
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
    return this.request('create offer code', async () => {
      let response = await this.axios.post(`/products/${productId}/offer_codes`, {
        name: params.name,
        amount_off: params.amountOff,
        offer_type: params.offerType || 'cents',
        max_purchase_count: params.maxPurchaseCount ?? 0,
        universal: params.universal ? 'true' : 'false'
      });
      return this.unwrap(response.data, 'create offer code').offer_code;
    });
  }

  async updateOfferCode(
    productId: string,
    offerCodeId: string,
    params: {
      maxPurchaseCount?: number;
    }
  ): Promise<any> {
    return this.request('update offer code', async () => {
      let response = await this.axios.put(
        `/products/${productId}/offer_codes/${offerCodeId}`,
        {
          max_purchase_count: params.maxPurchaseCount
        }
      );
      return this.unwrap(response.data, 'update offer code').offer_code;
    });
  }

  async deleteOfferCode(productId: string, offerCodeId: string): Promise<void> {
    await this.request('delete offer code', async () => {
      let response = await this.axios.delete(
        `/products/${productId}/offer_codes/${offerCodeId}`
      );
      this.unwrap(response.data, 'delete offer code');
    });
  }

  // -- Variant Categories ------------------------------------

  async listVariantCategories(productId: string): Promise<any[]> {
    return this.request('list variant categories', async () => {
      let response = await this.axios.get(`/products/${productId}/variant_categories`);
      return this.unwrap(response.data, 'list variant categories').variant_categories || [];
    });
  }

  async getVariantCategory(productId: string, variantCategoryId: string): Promise<any> {
    return this.request('get variant category', async () => {
      let response = await this.axios.get(
        `/products/${productId}/variant_categories/${variantCategoryId}`
      );
      return this.unwrap(response.data, 'get variant category').variant_category;
    });
  }

  async createVariantCategory(productId: string, title: string): Promise<any> {
    return this.request('create variant category', async () => {
      let response = await this.axios.post(`/products/${productId}/variant_categories`, {
        title
      });
      return this.unwrap(response.data, 'create variant category').variant_category;
    });
  }

  async updateVariantCategory(
    productId: string,
    variantCategoryId: string,
    title: string
  ): Promise<any> {
    return this.request('update variant category', async () => {
      let response = await this.axios.put(
        `/products/${productId}/variant_categories/${variantCategoryId}`,
        { title }
      );
      return this.unwrap(response.data, 'update variant category').variant_category;
    });
  }

  async deleteVariantCategory(productId: string, variantCategoryId: string): Promise<void> {
    await this.request('delete variant category', async () => {
      let response = await this.axios.delete(
        `/products/${productId}/variant_categories/${variantCategoryId}`
      );
      this.unwrap(response.data, 'delete variant category');
    });
  }

  // -- Variants ----------------------------------------------

  async listVariants(productId: string, variantCategoryId: string): Promise<any[]> {
    return this.request('list variants', async () => {
      let response = await this.axios.get(
        `/products/${productId}/variant_categories/${variantCategoryId}/variants`
      );
      return this.unwrap(response.data, 'list variants').variants || [];
    });
  }

  async getVariant(
    productId: string,
    variantCategoryId: string,
    variantId: string
  ): Promise<any> {
    return this.request('get variant', async () => {
      let response = await this.axios.get(
        `/products/${productId}/variant_categories/${variantCategoryId}/variants/${variantId}`
      );
      return this.unwrap(response.data, 'get variant').variant;
    });
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
    return this.request('create variant', async () => {
      let response = await this.axios.post(
        `/products/${productId}/variant_categories/${variantCategoryId}/variants`,
        {
          name: params.name,
          price_difference_cents: params.priceDifferenceCents ?? 0,
          max_purchase_count: params.maxPurchaseCount ?? 0
        }
      );
      return this.unwrap(response.data, 'create variant').variant;
    });
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
    return this.request('update variant', async () => {
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
      return this.unwrap(response.data, 'update variant').variant;
    });
  }

  async deleteVariant(
    productId: string,
    variantCategoryId: string,
    variantId: string
  ): Promise<void> {
    await this.request('delete variant', async () => {
      let response = await this.axios.delete(
        `/products/${productId}/variant_categories/${variantCategoryId}/variants/${variantId}`
      );
      this.unwrap(response.data, 'delete variant');
    });
  }

  // -- Custom Fields -----------------------------------------

  async listCustomFields(productId: string): Promise<any[]> {
    return this.request('list custom fields', async () => {
      let response = await this.axios.get(`/products/${productId}/custom_fields`);
      return this.unwrap(response.data, 'list custom fields').custom_fields || [];
    });
  }

  async createCustomField(
    productId: string,
    params: {
      name: string;
      required?: boolean;
    }
  ): Promise<any> {
    return this.request('create custom field', async () => {
      let response = await this.axios.post(`/products/${productId}/custom_fields`, {
        name: params.name,
        required: params.required ? 'true' : 'false'
      });
      return this.unwrap(response.data, 'create custom field').custom_field;
    });
  }

  async updateCustomField(
    productId: string,
    customFieldName: string,
    params: {
      required?: boolean;
    }
  ): Promise<any> {
    return this.request('update custom field', async () => {
      let response = await this.axios.put(
        `/products/${productId}/custom_fields/${encodeURIComponent(customFieldName)}`,
        {
          required: params.required ? 'true' : 'false'
        }
      );
      return this.unwrap(response.data, 'update custom field').custom_field;
    });
  }

  async deleteCustomField(productId: string, customFieldName: string): Promise<void> {
    await this.request('delete custom field', async () => {
      let response = await this.axios.delete(
        `/products/${productId}/custom_fields/${encodeURIComponent(customFieldName)}`
      );
      this.unwrap(response.data, 'delete custom field');
    });
  }

  // -- Sales -------------------------------------------------

  async listSales(params?: {
    after?: string;
    before?: string;
    email?: string;
    name?: string;
    licenseKey?: string;
    productId?: string;
    orderId?: string;
    pageKey?: string;
  }): Promise<{ sales: any[]; nextPageKey?: string; nextPageUrl?: string }> {
    return this.request('list sales', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.after) queryParams.after = params.after;
      if (params?.before) queryParams.before = params.before;
      if (params?.email) queryParams.email = params.email;
      if (params?.name) queryParams.name = params.name;
      if (params?.licenseKey) queryParams.license_key = params.licenseKey;
      if (params?.productId) queryParams.product_id = params.productId;
      if (params?.orderId) queryParams.order_id = params.orderId;
      if (params?.pageKey) queryParams.page_key = params.pageKey;

      let response = await this.axios.get('/sales', { params: queryParams });
      let data = this.unwrap(response.data, 'list sales');
      return {
        sales: data.sales || [],
        nextPageKey: data.next_page_key,
        nextPageUrl: data.next_page_url
      };
    });
  }

  async getSale(saleId: string): Promise<any> {
    return this.request('get sale', async () => {
      let response = await this.axios.get(`/sales/${saleId}`);
      return this.unwrap(response.data, 'get sale').sale;
    });
  }

  async markSaleAsShipped(saleId: string, trackingUrl?: string): Promise<any> {
    return this.request('mark sale as shipped', async () => {
      let body: Record<string, string> = {};
      if (trackingUrl) body.tracking_url = trackingUrl;

      let response = await this.axios.put(`/sales/${saleId}/mark_as_shipped`, body);
      return this.unwrap(response.data, 'mark sale as shipped').sale;
    });
  }

  async refundSale(saleId: string, amountCents?: number): Promise<any> {
    return this.request('refund sale', async () => {
      let body: Record<string, any> = {};
      if (amountCents !== undefined) body.amount_cents = amountCents;

      let response = await this.axios.put(`/sales/${saleId}/refund`, body);
      return this.unwrap(response.data, 'refund sale').sale;
    });
  }

  async resendReceipt(saleId: string): Promise<void> {
    await this.request('resend receipt', async () => {
      let response = await this.axios.post(`/sales/${saleId}/resend_receipt`);
      this.unwrap(response.data, 'resend receipt');
    });
  }

  // -- Subscribers -------------------------------------------

  async listSubscribers(
    productId: string,
    params?: {
      email?: string;
      paginated?: boolean;
      pageKey?: string;
    }
  ): Promise<{ subscribers: any[]; nextPageKey?: string; nextPageUrl?: string }> {
    return this.request('list subscribers', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.email) queryParams.email = params.email;
      if (params?.paginated !== undefined) queryParams.paginated = String(params.paginated);
      if (params?.pageKey) queryParams.page_key = params.pageKey;

      let response = await this.axios.get(`/products/${productId}/subscribers`, {
        params: queryParams
      });
      let data = this.unwrap(response.data, 'list subscribers');
      return {
        subscribers: data.subscribers || [],
        nextPageKey: data.next_page_key,
        nextPageUrl: data.next_page_url
      };
    });
  }

  async getSubscriber(subscriberId: string): Promise<any> {
    return this.request('get subscriber', async () => {
      let response = await this.axios.get(`/subscribers/${subscriberId}`);
      let data = this.unwrap(response.data, 'get subscriber');
      return data.subscriber || data.subscribers;
    });
  }

  // -- Licenses ----------------------------------------------

  async verifyLicense(
    productId: string,
    licenseKey: string,
    incrementUsesCount?: boolean
  ): Promise<any> {
    return this.request('verify license', async () => {
      let response = await this.axios.post('/licenses/verify', {
        product_id: productId,
        license_key: licenseKey,
        increment_uses_count: incrementUsesCount !== false ? 'true' : 'false'
      });
      return this.unwrap(response.data, 'verify license');
    });
  }

  async enableLicense(productId: string, licenseKey: string): Promise<any> {
    return this.request('enable license', async () => {
      let response = await this.axios.put('/licenses/enable', {
        product_id: productId,
        license_key: licenseKey
      });
      return this.unwrap(response.data, 'enable license');
    });
  }

  async disableLicense(productId: string, licenseKey: string): Promise<any> {
    return this.request('disable license', async () => {
      let response = await this.axios.put('/licenses/disable', {
        product_id: productId,
        license_key: licenseKey
      });
      return this.unwrap(response.data, 'disable license');
    });
  }

  async decrementLicenseUsesCount(productId: string, licenseKey: string): Promise<any> {
    return this.request('decrement license uses count', async () => {
      let response = await this.axios.put('/licenses/decrement_uses_count', {
        product_id: productId,
        license_key: licenseKey
      });
      return this.unwrap(response.data, 'decrement license uses count');
    });
  }

  async rotateLicense(productId: string, licenseKey: string): Promise<any> {
    return this.request('rotate license', async () => {
      let response = await this.axios.put('/licenses/rotate', {
        product_id: productId,
        license_key: licenseKey
      });
      return this.unwrap(response.data, 'rotate license');
    });
  }

  // -- Payouts -----------------------------------------------

  async listPayouts(params?: {
    after?: string;
    before?: string;
    pageKey?: string;
    includeUpcoming?: boolean;
  }): Promise<{ payouts: any[]; nextPageKey?: string; nextPageUrl?: string }> {
    return this.request('list payouts', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.after) queryParams.after = params.after;
      if (params?.before) queryParams.before = params.before;
      if (params?.pageKey) queryParams.page_key = params.pageKey;
      if (params?.includeUpcoming !== undefined)
        queryParams.include_upcoming = String(params.includeUpcoming);

      let response = await this.axios.get('/payouts', { params: queryParams });
      let data = this.unwrap(response.data, 'list payouts');

      return {
        payouts: data.payouts || [],
        nextPageKey: data.next_page_key,
        nextPageUrl: data.next_page_url
      };
    });
  }

  async getPayout(
    payoutId: string,
    params?: {
      includeSales?: boolean;
      includeTransactions?: boolean;
    }
  ): Promise<any> {
    return this.request('get payout', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.includeSales !== undefined)
        queryParams.include_sales = String(params.includeSales);
      if (params?.includeTransactions !== undefined)
        queryParams.include_transactions = String(params.includeTransactions);

      let response = await this.axios.get(`/payouts/${payoutId}`, {
        params: queryParams
      });
      return this.unwrap(response.data, 'get payout').payout;
    });
  }

  async getUpcomingPayouts(params?: {
    includeSales?: boolean;
    includeTransactions?: boolean;
  }): Promise<any[]> {
    return this.request('get upcoming payouts', async () => {
      let queryParams: Record<string, string> = {};
      if (params?.includeSales !== undefined)
        queryParams.include_sales = String(params.includeSales);
      if (params?.includeTransactions !== undefined)
        queryParams.include_transactions = String(params.includeTransactions);

      let response = await this.axios.get('/payouts/upcoming', {
        params: queryParams
      });
      return this.unwrap(response.data, 'get upcoming payouts').payouts || [];
    });
  }

  async getEarnings(year: number): Promise<any> {
    return this.request('get earnings', async () => {
      let response = await this.axios.get('/earnings', {
        params: { year: String(year) }
      });
      return this.unwrap(response.data, 'get earnings');
    });
  }

  // -- Resource Subscriptions (Webhooks) ---------------------

  async listResourceSubscriptions(resourceName: string): Promise<any[]> {
    return this.request('list resource subscriptions', async () => {
      let response = await this.axios.get('/resource_subscriptions', {
        params: { resource_name: resourceName }
      });
      return (
        this.unwrap(response.data, 'list resource subscriptions').resource_subscriptions || []
      );
    });
  }

  async createResourceSubscription(resourceName: string, postUrl: string): Promise<any> {
    return this.request('create resource subscription', async () => {
      let response = await this.axios.put('/resource_subscriptions', {
        resource_name: resourceName,
        post_url: postUrl
      });
      return this.unwrap(response.data, 'create resource subscription').resource_subscription;
    });
  }

  async deleteResourceSubscription(subscriptionId: string): Promise<void> {
    await this.request('delete resource subscription', async () => {
      let response = await this.axios.delete(`/resource_subscriptions/${subscriptionId}`);
      this.unwrap(response.data, 'delete resource subscription');
    });
  }
}
