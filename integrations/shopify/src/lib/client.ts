import { createAxios } from '@slates/provider';
import { shopifyApiError, shopifyServiceError } from './errors';

export class ShopifyClient {
  private http: ReturnType<typeof createAxios>;
  private shopDomain: string;
  private apiVersion: string;

  constructor(config: { token: string; shopDomain: string; apiVersion: string }) {
    this.shopDomain = config.shopDomain.replace('.myshopify.com', '').trim();
    if (!this.shopDomain) {
      throw shopifyServiceError('shopDomain is required.');
    }

    this.apiVersion = config.apiVersion;
    this.http = createAxios({
      baseURL: `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': config.token,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(shopifyApiError(error))
    );
  }

  private metafieldsPath(resource: string, resourceId?: string, metafieldId?: string) {
    if (resource === 'shop') {
      return metafieldId ? `/metafields/${metafieldId}.json` : '/metafields.json';
    }

    if (!resourceId) {
      throw shopifyServiceError('resourceId is required for resource metafields.');
    }

    let basePath = `/${resource}/${resourceId}/metafields`;
    return metafieldId ? `${basePath}/${metafieldId}.json` : `${basePath}.json`;
  }

  // ---- Products ----

  async listProducts(params?: {
    limit?: number;
    sinceId?: string;
    title?: string;
    vendor?: string;
    handle?: string;
    productType?: string;
    collectionId?: string;
    status?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
    pageInfo?: string;
    fields?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.title) queryParams.title = params.title;
    if (params?.vendor) queryParams.vendor = params.vendor;
    if (params?.handle) queryParams.handle = params.handle;
    if (params?.productType) queryParams.product_type = params.productType;
    if (params?.collectionId) queryParams.collection_id = params.collectionId;
    if (params?.status) queryParams.status = params.status;
    if (params?.createdAtMin) queryParams.created_at_min = params.createdAtMin;
    if (params?.createdAtMax) queryParams.created_at_max = params.createdAtMax;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.updatedAtMax) queryParams.updated_at_max = params.updatedAtMax;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    if (params?.fields) queryParams.fields = params.fields;

    let response = await this.http.get('/products.json', { params: queryParams });
    return response.data.products;
  }

  async getProduct(productId: string) {
    let response = await this.http.get(`/products/${productId}.json`);
    return response.data.product;
  }

  async createProduct(product: Record<string, any>) {
    let response = await this.http.post('/products.json', { product });
    return response.data.product;
  }

  async updateProduct(productId: string, product: Record<string, any>) {
    let response = await this.http.put(`/products/${productId}.json`, { product });
    return response.data.product;
  }

  async deleteProduct(productId: string) {
    await this.http.delete(`/products/${productId}.json`);
  }

  async getProductCount(params?: {
    vendor?: string;
    productType?: string;
    collectionId?: string;
    status?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.vendor) queryParams.vendor = params.vendor;
    if (params?.productType) queryParams.product_type = params.productType;
    if (params?.collectionId) queryParams.collection_id = params.collectionId;
    if (params?.status) queryParams.status = params.status;
    let response = await this.http.get('/products/count.json', { params: queryParams });
    return response.data.count;
  }

  // ---- Product Variants ----

  async listVariants(productId: string, params?: { limit?: number; sinceId?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    let response = await this.http.get(`/products/${productId}/variants.json`, {
      params: queryParams
    });
    return response.data.variants;
  }

  async createVariant(productId: string, variant: Record<string, any>) {
    let response = await this.http.post(`/products/${productId}/variants.json`, { variant });
    return response.data.variant;
  }

  async updateVariant(variantId: string, variant: Record<string, any>) {
    let response = await this.http.put(`/variants/${variantId}.json`, { variant });
    return response.data.variant;
  }

  async deleteVariant(productId: string, variantId: string) {
    await this.http.delete(`/products/${productId}/variants/${variantId}.json`);
  }

  // ---- Orders ----

  async listOrders(params?: {
    limit?: number;
    sinceId?: string;
    status?: string;
    financialStatus?: string;
    fulfillmentStatus?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
    fields?: string;
    pageInfo?: string;
    ids?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.status) queryParams.status = params.status;
    if (params?.financialStatus) queryParams.financial_status = params.financialStatus;
    if (params?.fulfillmentStatus) queryParams.fulfillment_status = params.fulfillmentStatus;
    if (params?.createdAtMin) queryParams.created_at_min = params.createdAtMin;
    if (params?.createdAtMax) queryParams.created_at_max = params.createdAtMax;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.updatedAtMax) queryParams.updated_at_max = params.updatedAtMax;
    if (params?.fields) queryParams.fields = params.fields;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    if (params?.ids) queryParams.ids = params.ids;

    let response = await this.http.get('/orders.json', { params: queryParams });
    return response.data.orders;
  }

  async getOrder(orderId: string) {
    let response = await this.http.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  async getOrderCount(params?: {
    status?: string;
    financialStatus?: string;
    fulfillmentStatus?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.financialStatus) queryParams.financial_status = params.financialStatus;
    if (params?.fulfillmentStatus) queryParams.fulfillment_status = params.fulfillmentStatus;
    let response = await this.http.get('/orders/count.json', { params: queryParams });
    return response.data.count;
  }

  async closeOrder(orderId: string) {
    let response = await this.http.post(`/orders/${orderId}/close.json`);
    return response.data.order;
  }

  async openOrder(orderId: string) {
    let response = await this.http.post(`/orders/${orderId}/open.json`);
    return response.data.order;
  }

  async cancelOrder(
    orderId: string,
    params?: { reason?: string; email?: boolean; restock?: boolean }
  ) {
    let response = await this.http.post(`/orders/${orderId}/cancel.json`, params || {});
    return response.data.order;
  }

  async createOrder(order: Record<string, any>) {
    let response = await this.http.post('/orders.json', { order });
    return response.data.order;
  }

  async updateOrder(orderId: string, order: Record<string, any>) {
    let response = await this.http.put(`/orders/${orderId}.json`, { order });
    return response.data.order;
  }

  // ---- Customers ----

  async listCustomers(params?: {
    limit?: number;
    sinceId?: string;
    createdAtMin?: string;
    createdAtMax?: string;
    updatedAtMin?: string;
    updatedAtMax?: string;
    fields?: string;
    pageInfo?: string;
    ids?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.createdAtMin) queryParams.created_at_min = params.createdAtMin;
    if (params?.createdAtMax) queryParams.created_at_max = params.createdAtMax;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.updatedAtMax) queryParams.updated_at_max = params.updatedAtMax;
    if (params?.fields) queryParams.fields = params.fields;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    if (params?.ids) queryParams.ids = params.ids;

    let response = await this.http.get('/customers.json', { params: queryParams });
    return response.data.customers;
  }

  async getCustomer(customerId: string) {
    let customers = await this.listCustomers({ ids: customerId, limit: 1 });
    let customer = customers[0];
    if (!customer) {
      throw shopifyServiceError(`Customer ${customerId} was not found.`);
    }
    return customer;
  }

  async createCustomer(customer: Record<string, any>) {
    let response = await this.http.post('/customers.json', { customer });
    return response.data.customer;
  }

  async updateCustomer(customerId: string, customer: Record<string, any>) {
    let response = await this.http.put(`/customers/${customerId}.json`, { customer });
    return response.data.customer;
  }

  async deleteCustomer(customerId: string) {
    await this.http.delete(`/customers/${customerId}.json`);
  }

  async searchCustomers(query: string, params?: { limit?: number; fields?: string }) {
    let queryParams: Record<string, any> = { query };
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.fields) queryParams.fields = params.fields;
    let response = await this.http.get('/customers/search.json', { params: queryParams });
    return response.data.customers;
  }

  async getCustomerCount() {
    let response = await this.http.get('/customers/count.json');
    return response.data.count;
  }

  async getCustomerOrders(customerId: string, params?: { status?: string; limit?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.limit) queryParams.limit = params.limit;
    let response = await this.http.get(`/customers/${customerId}/orders.json`, {
      params: queryParams
    });
    return response.data.orders;
  }

  // ---- Inventory ----

  async listInventoryLevels(params: {
    inventoryItemIds?: string;
    locationIds?: string;
    limit?: number;
    pageInfo?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params.inventoryItemIds) queryParams.inventory_item_ids = params.inventoryItemIds;
    if (params.locationIds) queryParams.location_ids = params.locationIds;
    if (params.limit) queryParams.limit = params.limit;
    if (params.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/inventory_levels.json', { params: queryParams });
    return response.data.inventory_levels;
  }

  async setInventoryLevel(params: {
    inventoryItemId: string;
    locationId: string;
    available: number;
  }) {
    let response = await this.http.post('/inventory_levels/set.json', {
      inventory_item_id: params.inventoryItemId,
      location_id: params.locationId,
      available: params.available
    });
    return response.data.inventory_level;
  }

  async adjustInventoryLevel(params: {
    inventoryItemId: string;
    locationId: string;
    availableAdjustment: number;
  }) {
    let response = await this.http.post('/inventory_levels/adjust.json', {
      inventory_item_id: params.inventoryItemId,
      location_id: params.locationId,
      available_adjustment: params.availableAdjustment
    });
    return response.data.inventory_level;
  }

  async getInventoryItem(inventoryItemId: string) {
    let response = await this.http.get(`/inventory_items/${inventoryItemId}.json`);
    return response.data.inventory_item;
  }

  async updateInventoryItem(inventoryItemId: string, inventoryItem: Record<string, any>) {
    let response = await this.http.put(`/inventory_items/${inventoryItemId}.json`, {
      inventory_item: inventoryItem
    });
    return response.data.inventory_item;
  }

  // ---- Locations ----

  async listLocations() {
    let response = await this.http.get('/locations.json');
    return response.data.locations;
  }

  async getLocation(locationId: string) {
    let response = await this.http.get(`/locations/${locationId}.json`);
    return response.data.location;
  }

  async getLocationInventoryLevels(
    locationId: string,
    params?: { limit?: number; pageInfo?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get(`/locations/${locationId}/inventory_levels.json`, {
      params: queryParams
    });
    return response.data.inventory_levels;
  }

  // ---- Fulfillments ----

  async listFulfillments(
    orderId: string,
    params?: { limit?: number; sinceId?: string; pageInfo?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get(`/orders/${orderId}/fulfillments.json`, {
      params: queryParams
    });
    return response.data.fulfillments;
  }

  async createFulfillment(fulfillment: Record<string, any>) {
    let response = await this.http.post('/fulfillments.json', { fulfillment });
    return response.data.fulfillment;
  }

  async updateFulfillmentTracking(fulfillmentId: string, tracking: Record<string, any>) {
    let response = await this.http.post(
      `/fulfillments/${fulfillmentId}/update_tracking.json`,
      {
        fulfillment: tracking
      }
    );
    return response.data.fulfillment;
  }

  async cancelFulfillment(fulfillmentId: string) {
    let response = await this.http.post(`/fulfillments/${fulfillmentId}/cancel.json`);
    return response.data.fulfillment;
  }

  // ---- Fulfillment Orders ----

  async listFulfillmentOrders(orderId: string) {
    let response = await this.http.get(`/orders/${orderId}/fulfillment_orders.json`);
    return response.data.fulfillment_orders;
  }

  // ---- Collections ----

  async listCustomCollections(params?: {
    limit?: number;
    sinceId?: string;
    title?: string;
    productId?: string;
    handle?: string;
    updatedAtMin?: string;
    pageInfo?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.title) queryParams.title = params.title;
    if (params?.productId) queryParams.product_id = params.productId;
    if (params?.handle) queryParams.handle = params.handle;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/custom_collections.json', { params: queryParams });
    return response.data.custom_collections;
  }

  async getCustomCollection(collectionId: string) {
    let response = await this.http.get(`/custom_collections/${collectionId}.json`);
    return response.data.custom_collection;
  }

  async createCustomCollection(collection: Record<string, any>) {
    let response = await this.http.post('/custom_collections.json', {
      custom_collection: collection
    });
    return response.data.custom_collection;
  }

  async updateCustomCollection(collectionId: string, collection: Record<string, any>) {
    let response = await this.http.put(`/custom_collections/${collectionId}.json`, {
      custom_collection: collection
    });
    return response.data.custom_collection;
  }

  async deleteCustomCollection(collectionId: string) {
    await this.http.delete(`/custom_collections/${collectionId}.json`);
  }

  async listSmartCollections(params?: {
    limit?: number;
    sinceId?: string;
    title?: string;
    productId?: string;
    handle?: string;
    updatedAtMin?: string;
    pageInfo?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.title) queryParams.title = params.title;
    if (params?.productId) queryParams.product_id = params.productId;
    if (params?.handle) queryParams.handle = params.handle;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/smart_collections.json', { params: queryParams });
    return response.data.smart_collections;
  }

  async getSmartCollection(collectionId: string) {
    let response = await this.http.get(`/smart_collections/${collectionId}.json`);
    return response.data.smart_collection;
  }

  async createSmartCollection(collection: Record<string, any>) {
    let response = await this.http.post('/smart_collections.json', {
      smart_collection: collection
    });
    return response.data.smart_collection;
  }

  async updateSmartCollection(collectionId: string, collection: Record<string, any>) {
    let response = await this.http.put(`/smart_collections/${collectionId}.json`, {
      smart_collection: collection
    });
    return response.data.smart_collection;
  }

  async deleteSmartCollection(collectionId: string) {
    await this.http.delete(`/smart_collections/${collectionId}.json`);
  }

  async listCollects(params?: {
    productId?: string;
    collectionId?: string;
    limit?: number;
    pageInfo?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.productId) queryParams.product_id = params.productId;
    if (params?.collectionId) queryParams.collection_id = params.collectionId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/collects.json', { params: queryParams });
    return response.data.collects;
  }

  async addProductToCollection(productId: string, collectionId: string) {
    let response = await this.http.post('/collects.json', {
      collect: { product_id: productId, collection_id: collectionId }
    });
    return response.data.collect;
  }

  async removeProductFromCollection(collectId: string) {
    await this.http.delete(`/collects/${collectId}.json`);
  }

  // ---- Draft Orders ----

  async listDraftOrders(params?: {
    limit?: number;
    sinceId?: string;
    status?: string;
    updatedAtMin?: string;
    pageInfo?: string;
    fields?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.status) queryParams.status = params.status;
    if (params?.updatedAtMin) queryParams.updated_at_min = params.updatedAtMin;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    if (params?.fields) queryParams.fields = params.fields;
    let response = await this.http.get('/draft_orders.json', { params: queryParams });
    return response.data.draft_orders;
  }

  async getDraftOrder(draftOrderId: string) {
    let response = await this.http.get(`/draft_orders/${draftOrderId}.json`);
    return response.data.draft_order;
  }

  async createDraftOrder(draftOrder: Record<string, any>) {
    let response = await this.http.post('/draft_orders.json', { draft_order: draftOrder });
    return response.data.draft_order;
  }

  async updateDraftOrder(draftOrderId: string, draftOrder: Record<string, any>) {
    let response = await this.http.put(`/draft_orders/${draftOrderId}.json`, {
      draft_order: draftOrder
    });
    return response.data.draft_order;
  }

  async deleteDraftOrder(draftOrderId: string) {
    await this.http.delete(`/draft_orders/${draftOrderId}.json`);
  }

  async completeDraftOrder(draftOrderId: string, paymentPending?: boolean) {
    let params: Record<string, any> = {};
    if (paymentPending !== undefined) params.payment_pending = paymentPending;
    let response = await this.http.put(`/draft_orders/${draftOrderId}/complete.json`, params);
    return response.data.draft_order;
  }

  async sendDraftOrderInvoice(draftOrderId: string, invoice?: Record<string, any>) {
    let response = await this.http.post(`/draft_orders/${draftOrderId}/send_invoice.json`, {
      draft_order_invoice: invoice || {}
    });
    return response.data.draft_order_invoice;
  }

  // ---- Discounts (Price Rules & Discount Codes) ----

  async listPriceRules(params?: { limit?: number; sinceId?: string; pageInfo?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/price_rules.json', { params: queryParams });
    return response.data.price_rules;
  }

  async getPriceRule(priceRuleId: string) {
    let response = await this.http.get(`/price_rules/${priceRuleId}.json`);
    return response.data.price_rule;
  }

  async createPriceRule(priceRule: Record<string, any>) {
    let response = await this.http.post('/price_rules.json', { price_rule: priceRule });
    return response.data.price_rule;
  }

  async updatePriceRule(priceRuleId: string, priceRule: Record<string, any>) {
    let response = await this.http.put(`/price_rules/${priceRuleId}.json`, {
      price_rule: priceRule
    });
    return response.data.price_rule;
  }

  async deletePriceRule(priceRuleId: string) {
    await this.http.delete(`/price_rules/${priceRuleId}.json`);
  }

  async listDiscountCodes(
    priceRuleId: string,
    params?: { limit?: number; pageInfo?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get(`/price_rules/${priceRuleId}/discount_codes.json`, {
      params: queryParams
    });
    return response.data.discount_codes;
  }

  async createDiscountCode(priceRuleId: string, discountCode: Record<string, any>) {
    let response = await this.http.post(`/price_rules/${priceRuleId}/discount_codes.json`, {
      discount_code: discountCode
    });
    return response.data.discount_code;
  }

  async updateDiscountCode(
    priceRuleId: string,
    discountCodeId: string,
    discountCode: Record<string, any>
  ) {
    let response = await this.http.put(
      `/price_rules/${priceRuleId}/discount_codes/${discountCodeId}.json`,
      { discount_code: discountCode }
    );
    return response.data.discount_code;
  }

  async deleteDiscountCode(priceRuleId: string, discountCodeId: string) {
    await this.http.delete(
      `/price_rules/${priceRuleId}/discount_codes/${discountCodeId}.json`
    );
  }

  async lookupDiscountCode(code: string) {
    let response = await this.http.get('/discount_codes/lookup.json', { params: { code } });
    return response.data.discount_code;
  }

  // ---- Webhooks ----

  async listWebhooks(params?: { topic?: string; limit?: number; pageInfo?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.topic) queryParams.topic = params.topic;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/webhooks.json', { params: queryParams });
    return response.data.webhooks;
  }

  async createWebhook(webhook: { topic: string; address: string; format?: string }) {
    let response = await this.http.post('/webhooks.json', {
      webhook: {
        topic: webhook.topic,
        address: webhook.address,
        format: webhook.format || 'json'
      }
    });
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}.json`);
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhooks/${webhookId}.json`);
    return response.data.webhook;
  }

  // ---- Shop ----

  async getShop() {
    let response = await this.http.get('/shop.json');
    return response.data.shop;
  }

  // ---- Transactions ----

  async listTransactions(orderId: string) {
    let response = await this.http.get(`/orders/${orderId}/transactions.json`);
    return response.data.transactions;
  }

  // ---- Refunds ----

  async listRefunds(orderId: string) {
    let response = await this.http.get(`/orders/${orderId}/refunds.json`);
    return response.data.refunds;
  }

  async createRefund(orderId: string, refund: Record<string, any>) {
    let response = await this.http.post(`/orders/${orderId}/refunds.json`, { refund });
    return response.data.refund;
  }

  async calculateRefund(orderId: string, refund: Record<string, any>) {
    let response = await this.http.post(`/orders/${orderId}/refunds/calculate.json`, {
      refund
    });
    return response.data.refund;
  }

  // ---- Product Images ----

  async listProductImages(productId: string) {
    let response = await this.http.get(`/products/${productId}/images.json`);
    return response.data.images;
  }

  async createProductImage(productId: string, image: Record<string, any>) {
    let response = await this.http.post(`/products/${productId}/images.json`, { image });
    return response.data.image;
  }

  async deleteProductImage(productId: string, imageId: string) {
    await this.http.delete(`/products/${productId}/images/${imageId}.json`);
  }

  // ---- Metafields ----

  async listMetafields(
    resource: string,
    resourceId?: string,
    params?: { limit?: number; namespace?: string }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.namespace) queryParams.namespace = params.namespace;
    let response = await this.http.get(this.metafieldsPath(resource, resourceId), {
      params: queryParams
    });
    return response.data.metafields;
  }

  async getMetafield(resource: string, resourceId: string | undefined, metafieldId: string) {
    let response = await this.http.get(this.metafieldsPath(resource, resourceId, metafieldId));
    return response.data.metafield;
  }

  async createMetafield(
    resource: string,
    resourceId: string | undefined,
    metafield: Record<string, any>
  ) {
    let response = await this.http.post(this.metafieldsPath(resource, resourceId), {
      metafield
    });
    return response.data.metafield;
  }

  async updateMetafield(
    resource: string,
    resourceId: string | undefined,
    metafieldId: string,
    metafield: Record<string, any>
  ) {
    let response = await this.http.put(
      this.metafieldsPath(resource, resourceId, metafieldId),
      {
        metafield: { id: metafieldId, ...metafield }
      }
    );
    return response.data.metafield;
  }

  async deleteMetafield(
    resource: string,
    resourceId: string | undefined,
    metafieldId: string
  ) {
    await this.http.delete(this.metafieldsPath(resource, resourceId, metafieldId));
  }

  // ---- Pages ----

  async listPages(params?: {
    limit?: number;
    sinceId?: string;
    title?: string;
    pageInfo?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sinceId) queryParams.since_id = params.sinceId;
    if (params?.title) queryParams.title = params.title;
    if (params?.pageInfo) queryParams.page_info = params.pageInfo;
    let response = await this.http.get('/pages.json', { params: queryParams });
    return response.data.pages;
  }

  async getPage(pageId: string) {
    let response = await this.http.get(`/pages/${pageId}.json`);
    return response.data.page;
  }

  async createPage(page: Record<string, any>) {
    let response = await this.http.post('/pages.json', { page });
    return response.data.page;
  }

  async updatePage(pageId: string, page: Record<string, any>) {
    let response = await this.http.put(`/pages/${pageId}.json`, { page });
    return response.data.page;
  }

  async deletePage(pageId: string) {
    await this.http.delete(`/pages/${pageId}.json`);
  }
}
