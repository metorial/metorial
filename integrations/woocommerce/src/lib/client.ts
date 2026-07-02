import { createAxios } from 'slates';

export class WooCommerceClient {
  private ax;

  constructor(params: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }) {
    let baseUrl = params.storeUrl.replace(/\/+$/, '');
    let credentials = btoa(`${params.consumerKey}:${params.consumerSecret}`);

    this.ax = createAxios({
      baseURL: `${baseUrl}/wp-json/wc/v3`,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Products ──────────────────────────────────────────────

  async listProducts(params?: Record<string, any>) {
    let response = await this.ax.get('/products', { params });
    return response.data;
  }

  async getProduct(productId: number) {
    let response = await this.ax.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(data: Record<string, any>) {
    let response = await this.ax.post('/products', data);
    return response.data;
  }

  async updateProduct(productId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: number, force: boolean = false) {
    let response = await this.ax.delete(`/products/${productId}`, { params: { force } });
    return response.data;
  }

  // ─── Product Variations ────────────────────────────────────

  async listProductVariations(productId: number, params?: Record<string, any>) {
    let response = await this.ax.get(`/products/${productId}/variations`, { params });
    return response.data;
  }

  async getProductVariation(productId: number, variationId: number) {
    let response = await this.ax.get(`/products/${productId}/variations/${variationId}`);
    return response.data;
  }

  async createProductVariation(productId: number, data: Record<string, any>) {
    let response = await this.ax.post(`/products/${productId}/variations`, data);
    return response.data;
  }

  async updateProductVariation(
    productId: number,
    variationId: number,
    data: Record<string, any>
  ) {
    let response = await this.ax.put(`/products/${productId}/variations/${variationId}`, data);
    return response.data;
  }

  async deleteProductVariation(
    productId: number,
    variationId: number,
    force: boolean = false
  ) {
    let response = await this.ax.delete(`/products/${productId}/variations/${variationId}`, {
      params: { force }
    });
    return response.data;
  }

  // ─── Product Categories ────────────────────────────────────

  async listProductCategories(params?: Record<string, any>) {
    let response = await this.ax.get('/products/categories', { params });
    return response.data;
  }

  async getProductCategory(categoryId: number) {
    let response = await this.ax.get(`/products/categories/${categoryId}`);
    return response.data;
  }

  async createProductCategory(data: Record<string, any>) {
    let response = await this.ax.post('/products/categories', data);
    return response.data;
  }

  async updateProductCategory(categoryId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/products/categories/${categoryId}`, data);
    return response.data;
  }

  async deleteProductCategory(categoryId: number, force: boolean = true) {
    let response = await this.ax.delete(`/products/categories/${categoryId}`, {
      params: { force }
    });
    return response.data;
  }

  // ─── Product Tags ─────────────────────────────────────────

  async listProductTags(params?: Record<string, any>) {
    let response = await this.ax.get('/products/tags', { params });
    return response.data;
  }

  async createProductTag(data: Record<string, any>) {
    let response = await this.ax.post('/products/tags', data);
    return response.data;
  }

  // ─── Product Attributes ────────────────────────────────────

  async listProductAttributes() {
    let response = await this.ax.get('/products/attributes');
    return response.data;
  }

  async createProductAttribute(data: Record<string, any>) {
    let response = await this.ax.post('/products/attributes', data);
    return response.data;
  }

  // ─── Product Reviews ──────────────────────────────────────

  async listProductReviews(params?: Record<string, any>) {
    let response = await this.ax.get('/products/reviews', { params });
    return response.data;
  }

  async getProductReview(reviewId: number) {
    let response = await this.ax.get(`/products/reviews/${reviewId}`);
    return response.data;
  }

  // ─── Orders ────────────────────────────────────────────────

  async listOrders(params?: Record<string, any>) {
    let response = await this.ax.get('/orders', { params });
    return response.data;
  }

  async getOrder(orderId: number) {
    let response = await this.ax.get(`/orders/${orderId}`);
    return response.data;
  }

  async createOrder(data: Record<string, any>) {
    let response = await this.ax.post('/orders', data);
    return response.data;
  }

  async updateOrder(orderId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/orders/${orderId}`, data);
    return response.data;
  }

  async deleteOrder(orderId: number, force: boolean = false) {
    let response = await this.ax.delete(`/orders/${orderId}`, { params: { force } });
    return response.data;
  }

  // ─── Order Notes ───────────────────────────────────────────

  async listOrderNotes(orderId: number) {
    let response = await this.ax.get(`/orders/${orderId}/notes`);
    return response.data;
  }

  async createOrderNote(orderId: number, data: Record<string, any>) {
    let response = await this.ax.post(`/orders/${orderId}/notes`, data);
    return response.data;
  }

  async deleteOrderNote(orderId: number, noteId: number, force: boolean = true) {
    let response = await this.ax.delete(`/orders/${orderId}/notes/${noteId}`, {
      params: { force }
    });
    return response.data;
  }

  // ─── Refunds ───────────────────────────────────────────────

  async listOrderRefunds(orderId: number) {
    let response = await this.ax.get(`/orders/${orderId}/refunds`);
    return response.data;
  }

  async createOrderRefund(orderId: number, data: Record<string, any>) {
    let response = await this.ax.post(`/orders/${orderId}/refunds`, data);
    return response.data;
  }

  // ─── Customers ─────────────────────────────────────────────

  async listCustomers(params?: Record<string, any>) {
    let response = await this.ax.get('/customers', { params });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await this.ax.get(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(data: Record<string, any>) {
    let response = await this.ax.post('/customers', data);
    return response.data;
  }

  async updateCustomer(customerId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/customers/${customerId}`, data);
    return response.data;
  }

  async deleteCustomer(customerId: number, force: boolean = true) {
    let response = await this.ax.delete(`/customers/${customerId}`, { params: { force } });
    return response.data;
  }

  async getCustomerDownloads(customerId: number) {
    let response = await this.ax.get(`/customers/${customerId}/downloads`);
    return response.data;
  }

  // ─── Coupons ───────────────────────────────────────────────

  async listCoupons(params?: Record<string, any>) {
    let response = await this.ax.get('/coupons', { params });
    return response.data;
  }

  async getCoupon(couponId: number) {
    let response = await this.ax.get(`/coupons/${couponId}`);
    return response.data;
  }

  async createCoupon(data: Record<string, any>) {
    let response = await this.ax.post('/coupons', data);
    return response.data;
  }

  async updateCoupon(couponId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/coupons/${couponId}`, data);
    return response.data;
  }

  async deleteCoupon(couponId: number, force: boolean = false) {
    let response = await this.ax.delete(`/coupons/${couponId}`, { params: { force } });
    return response.data;
  }

  // ─── Tax ───────────────────────────────────────────────────

  async listTaxRates(params?: Record<string, any>) {
    let response = await this.ax.get('/taxes', { params });
    return response.data;
  }

  async getTaxRate(taxRateId: number) {
    let response = await this.ax.get(`/taxes/${taxRateId}`);
    return response.data;
  }

  async createTaxRate(data: Record<string, any>) {
    let response = await this.ax.post('/taxes', data);
    return response.data;
  }

  async updateTaxRate(taxRateId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/taxes/${taxRateId}`, data);
    return response.data;
  }

  async deleteTaxRate(taxRateId: number, force: boolean = true) {
    let response = await this.ax.delete(`/taxes/${taxRateId}`, { params: { force } });
    return response.data;
  }

  async listTaxClasses() {
    let response = await this.ax.get('/taxes/classes');
    return response.data;
  }

  async createTaxClass(data: Record<string, any>) {
    let response = await this.ax.post('/taxes/classes', data);
    return response.data;
  }

  async deleteTaxClass(slug: string, force: boolean = true) {
    let response = await this.ax.delete(`/taxes/classes/${slug}`, { params: { force } });
    return response.data;
  }

  // ─── Shipping Zones ────────────────────────────────────────

  async listShippingZones() {
    let response = await this.ax.get('/shipping/zones');
    return response.data;
  }

  async getShippingZone(zoneId: number) {
    let response = await this.ax.get(`/shipping/zones/${zoneId}`);
    return response.data;
  }

  async createShippingZone(data: Record<string, any>) {
    let response = await this.ax.post('/shipping/zones', data);
    return response.data;
  }

  async updateShippingZone(zoneId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/shipping/zones/${zoneId}`, data);
    return response.data;
  }

  async deleteShippingZone(zoneId: number, force: boolean = true) {
    let response = await this.ax.delete(`/shipping/zones/${zoneId}`, { params: { force } });
    return response.data;
  }

  async listShippingZoneMethods(zoneId: number) {
    let response = await this.ax.get(`/shipping/zones/${zoneId}/methods`);
    return response.data;
  }

  async addShippingZoneMethod(zoneId: number, data: Record<string, any>) {
    let response = await this.ax.post(`/shipping/zones/${zoneId}/methods`, data);
    return response.data;
  }

  async listShippingZoneLocations(zoneId: number) {
    let response = await this.ax.get(`/shipping/zones/${zoneId}/locations`);
    return response.data;
  }

  async updateShippingZoneLocations(zoneId: number, data: any[]) {
    let response = await this.ax.put(`/shipping/zones/${zoneId}/locations`, data);
    return response.data;
  }

  // ─── Reports ───────────────────────────────────────────────

  async getSalesReport(params?: Record<string, any>) {
    let response = await this.ax.get('/reports/sales', { params });
    return response.data;
  }

  async getTopSellersReport(params?: Record<string, any>) {
    let response = await this.ax.get('/reports/top_sellers', { params });
    return response.data;
  }

  async getReportsTotals() {
    let response = await this.ax.get('/reports');
    return response.data;
  }

  // ─── Settings ──────────────────────────────────────────────

  async listSettingGroups() {
    let response = await this.ax.get('/settings');
    return response.data;
  }

  async getSettingGroup(groupId: string) {
    let response = await this.ax.get(`/settings/${groupId}`);
    return response.data;
  }

  async updateSetting(groupId: string, settingId: string, value: any) {
    let response = await this.ax.put(`/settings/${groupId}/${settingId}`, { value });
    return response.data;
  }

  // ─── Payment Gateways ─────────────────────────────────────

  async listPaymentGateways() {
    let response = await this.ax.get('/payment_gateways');
    return response.data;
  }

  async getPaymentGateway(gatewayId: string) {
    let response = await this.ax.get(`/payment_gateways/${gatewayId}`);
    return response.data;
  }

  async updatePaymentGateway(gatewayId: string, data: Record<string, any>) {
    let response = await this.ax.put(`/payment_gateways/${gatewayId}`, data);
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async listWebhooks(params?: Record<string, any>) {
    let response = await this.ax.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.ax.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: Record<string, any>) {
    let response = await this.ax.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(webhookId: number, data: Record<string, any>) {
    let response = await this.ax.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: number, force: boolean = true) {
    let response = await this.ax.delete(`/webhooks/${webhookId}`, { params: { force } });
    return response.data;
  }

  // ─── System Status ─────────────────────────────────────────

  async getSystemStatus() {
    let response = await this.ax.get('/system_status');
    return response.data;
  }

  async getSystemStatusTools() {
    let response = await this.ax.get('/system_status/tools');
    return response.data;
  }

  // ─── Shipping Classes ──────────────────────────────────────

  async listShippingClasses(params?: Record<string, any>) {
    let response = await this.ax.get('/products/shipping_classes', { params });
    return response.data;
  }
}
