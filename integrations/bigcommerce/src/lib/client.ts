import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  storeHash: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination?: {
      total?: number;
      count?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };
  };
}

export interface SingleResponse<T> {
  data: T;
  meta?: Record<string, any>;
}

export class Client {
  private api: ReturnType<typeof createAxios>;
  private storeHash: string;

  constructor(config: ClientConfig) {
    this.storeHash = config.storeHash;
    this.api = createAxios({
      baseURL: `https://api.bigcommerce.com/stores/${config.storeHash}`,
      headers: {
        'X-Auth-Token': config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Products ───────────────────────────────────────────────────────

  async listProducts(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/catalog/products', { params });
    return response.data;
  }

  async getProduct(
    productId: number,
    params?: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/catalog/products/${productId}`, { params });
    return response.data;
  }

  async createProduct(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/catalog/products', data);
    return response.data;
  }

  async updateProduct(
    productId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/catalog/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: number): Promise<void> {
    await this.api.delete(`/v3/catalog/products/${productId}`);
  }

  // ─── Product Variants ───────────────────────────────────────────────

  async listProductVariants(
    productId: number,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/v3/catalog/products/${productId}/variants`, {
      params
    });
    return response.data;
  }

  async getProductVariant(productId: number, variantId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(
      `/v3/catalog/products/${productId}/variants/${variantId}`
    );
    return response.data;
  }

  async createProductVariant(
    productId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.post(`/v3/catalog/products/${productId}/variants`, data);
    return response.data;
  }

  async updateProductVariant(
    productId: number,
    variantId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(
      `/v3/catalog/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data;
  }

  // ─── Product Images ──────────────────────────────────────────────────

  async listProductImages(productId: number): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/v3/catalog/products/${productId}/images`);
    return response.data;
  }

  async createProductImage(
    productId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.post(`/v3/catalog/products/${productId}/images`, data);
    return response.data;
  }

  // ─── Categories ─────────────────────────────────────────────────────

  async listCategories(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/catalog/trees/categories', { params });
    return response.data;
  }

  async createCategory(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/catalog/trees/categories', [data]);
    return response.data;
  }

  async updateCategory(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.put('/v3/catalog/trees/categories', [data]);
    return response.data;
  }

  async deleteCategory(categoryId: number): Promise<void> {
    await this.api.delete('/v3/catalog/trees/categories', {
      params: { 'category_id:in': categoryId }
    });
  }

  // ─── Brands ─────────────────────────────────────────────────────────

  async listBrands(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/catalog/brands', { params });
    return response.data;
  }

  async createBrand(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/catalog/brands', data);
    return response.data;
  }

  async updateBrand(brandId: number, data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/catalog/brands/${brandId}`, data);
    return response.data;
  }

  async deleteBrand(brandId: number): Promise<void> {
    await this.api.delete(`/v3/catalog/brands/${brandId}`);
  }

  // ─── Orders ─────────────────────────────────────────────────────────

  async listOrders(params?: Record<string, any>): Promise<any[]> {
    let response = await this.api.get('/v2/orders', { params });
    return response.data;
  }

  async getOrder(orderId: number): Promise<any> {
    let response = await this.api.get(`/v2/orders/${orderId}`);
    return response.data;
  }

  async createOrder(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/v2/orders', data);
    return response.data;
  }

  async updateOrder(orderId: number, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/v2/orders/${orderId}`, data);
    return response.data;
  }

  async archiveOrder(orderId: number): Promise<void> {
    await this.api.delete(`/v2/orders/${orderId}`);
  }

  async getOrderProducts(orderId: number): Promise<any[]> {
    let response = await this.api.get(`/v2/orders/${orderId}/products`);
    return response.data;
  }

  // ─── Order Shipments ────────────────────────────────────────────────

  async listOrderShipments(orderId: number): Promise<any[]> {
    let response = await this.api.get(`/v2/orders/${orderId}/shipments`);
    return response.data;
  }

  async createOrderShipment(orderId: number, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/v2/orders/${orderId}/shipments`, data);
    return response.data;
  }

  async updateOrderShipment(
    orderId: number,
    shipmentId: number,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.put(`/v2/orders/${orderId}/shipments/${shipmentId}`, data);
    return response.data;
  }

  // ─── Order Refunds ──────────────────────────────────────────────────

  async getOrderRefunds(orderId: number): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/v3/orders/${orderId}/payment_actions/refunds`);
    return response.data;
  }

  async createOrderRefund(
    orderId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.post(`/v3/orders/${orderId}/payment_actions/refunds`, data);
    return response.data;
  }

  // ─── Order Transactions ─────────────────────────────────────────────

  async getOrderTransactions(orderId: number): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/v3/orders/${orderId}/transactions`);
    return response.data;
  }

  // ─── Customers ──────────────────────────────────────────────────────

  async listCustomers(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/customers', { params });
    return response.data;
  }

  async getCustomer(customerId: number): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/customers', { params: { 'id:in': customerId } });
    return response.data;
  }

  async createCustomers(data: Record<string, any>[]): Promise<PaginatedResponse<any>> {
    let response = await this.api.post('/v3/customers', data);
    return response.data;
  }

  async updateCustomers(data: Record<string, any>[]): Promise<PaginatedResponse<any>> {
    let response = await this.api.put('/v3/customers', data);
    return response.data;
  }

  async deleteCustomers(customerIds: number[]): Promise<void> {
    await this.api.delete('/v3/customers', { params: { 'id:in': customerIds.join(',') } });
  }

  // ─── Customer Addresses ─────────────────────────────────────────────

  async listCustomerAddresses(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/customers/addresses', { params });
    return response.data;
  }

  async createCustomerAddresses(data: Record<string, any>[]): Promise<PaginatedResponse<any>> {
    let response = await this.api.post('/v3/customers/addresses', data);
    return response.data;
  }

  async updateCustomerAddresses(data: Record<string, any>[]): Promise<PaginatedResponse<any>> {
    let response = await this.api.put('/v3/customers/addresses', data);
    return response.data;
  }

  // ─── Carts ──────────────────────────────────────────────────────────

  async createCart(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/carts', data);
    return response.data;
  }

  async getCart(cartId: string, params?: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/carts/${cartId}`, { params });
    return response.data;
  }

  async addCartLineItems(
    cartId: string,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.post(`/v3/carts/${cartId}/items`, data);
    return response.data;
  }

  async updateCartLineItem(
    cartId: string,
    itemId: string,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/carts/${cartId}/items/${itemId}`, data);
    return response.data;
  }

  async deleteCartLineItem(cartId: string, itemId: string): Promise<void> {
    await this.api.delete(`/v3/carts/${cartId}/items/${itemId}`);
  }

  async deleteCart(cartId: string): Promise<void> {
    await this.api.delete(`/v3/carts/${cartId}`);
  }

  // ─── Checkouts ──────────────────────────────────────────────────────

  async getCheckout(checkoutId: string): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/checkouts/${checkoutId}`);
    return response.data;
  }

  async updateCheckoutBillingAddress(
    checkoutId: string,
    addressId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(
      `/v3/checkouts/${checkoutId}/billing-address/${addressId}`,
      data
    );
    return response.data;
  }

  async addCheckoutBillingAddress(
    checkoutId: string,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.post(`/v3/checkouts/${checkoutId}/billing-address`, data);
    return response.data;
  }

  // ─── Channels ───────────────────────────────────────────────────────

  async listChannels(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/channels', { params });
    return response.data;
  }

  async getChannel(channelId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/channels/${channelId}`);
    return response.data;
  }

  async createChannel(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/channels', data);
    return response.data;
  }

  async updateChannel(
    channelId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/channels/${channelId}`, data);
    return response.data;
  }

  // ─── Coupons ────────────────────────────────────────────────────────

  async listCoupons(params?: Record<string, any>): Promise<any[]> {
    let response = await this.api.get('/v2/coupons', { params });
    return response.data;
  }

  async createCoupon(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/v2/coupons', data);
    return response.data;
  }

  async updateCoupon(couponId: number, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/v2/coupons/${couponId}`, data);
    return response.data;
  }

  async deleteCoupon(couponId: number): Promise<void> {
    await this.api.delete(`/v2/coupons/${couponId}`);
  }

  // ─── Pages ──────────────────────────────────────────────────────────

  async listPages(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/content/pages', { params });
    return response.data;
  }

  async getPage(pageId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/content/pages/${pageId}`);
    return response.data;
  }

  async createPage(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/content/pages', data);
    return response.data;
  }

  async updatePage(pageId: number, data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/content/pages/${pageId}`, data);
    return response.data;
  }

  async deletePage(pageId: number): Promise<void> {
    await this.api.delete(`/v3/content/pages/${pageId}`);
  }

  // ─── Blog Posts ─────────────────────────────────────────────────────

  async listBlogPosts(params?: Record<string, any>): Promise<any[]> {
    let response = await this.api.get('/v2/blog/posts', { params });
    return response.data;
  }

  async getBlogPost(postId: number): Promise<any> {
    let response = await this.api.get(`/v2/blog/posts/${postId}`);
    return response.data;
  }

  async createBlogPost(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/v2/blog/posts', data);
    return response.data;
  }

  async updateBlogPost(postId: number, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/v2/blog/posts/${postId}`, data);
    return response.data;
  }

  async deleteBlogPost(postId: number): Promise<void> {
    await this.api.delete(`/v2/blog/posts/${postId}`);
  }

  // ─── Subscribers ────────────────────────────────────────────────────

  async listSubscribers(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/customers/subscribers', { params });
    return response.data;
  }

  async createSubscriber(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/customers/subscribers', data);
    return response.data;
  }

  async updateSubscriber(
    subscriberId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/customers/subscribers/${subscriberId}`, data);
    return response.data;
  }

  async deleteSubscriber(subscriberId: number): Promise<void> {
    await this.api.delete(`/v3/customers/subscribers/${subscriberId}`);
  }

  // ─── Price Lists ────────────────────────────────────────────────────

  async listPriceLists(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/pricelists', { params });
    return response.data;
  }

  async getPriceList(priceListId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/pricelists/${priceListId}`);
    return response.data;
  }

  async createPriceList(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/pricelists', data);
    return response.data;
  }

  async updatePriceList(
    priceListId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/pricelists/${priceListId}`, data);
    return response.data;
  }

  async deletePriceList(priceListId: number): Promise<void> {
    await this.api.delete(`/v3/pricelists/${priceListId}`);
  }

  // ─── Price List Records ─────────────────────────────────────────────

  async listPriceListRecords(
    priceListId: number,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/v3/pricelists/${priceListId}/records`, { params });
    return response.data;
  }

  async setPriceListRecords(priceListId: number, data: Record<string, any>[]): Promise<any> {
    let response = await this.api.put(`/v3/pricelists/${priceListId}/records`, data);
    return response.data;
  }

  // ─── Inventory ──────────────────────────────────────────────────────

  async getInventoryItems(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/inventory/items', { params });
    return response.data;
  }

  async adjustInventory(data: Record<string, any>[]): Promise<any> {
    let response = await this.api.put('/v3/inventory/adjustments/absolute', { items: data });
    return response.data;
  }

  // ─── Locations ──────────────────────────────────────────────────────

  async listLocations(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/inventory/locations', { params });
    return response.data;
  }

  // ─── Wishlists ──────────────────────────────────────────────────────

  async listWishlists(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/wishlists', { params });
    return response.data;
  }

  async getWishlist(wishlistId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/wishlists/${wishlistId}`);
    return response.data;
  }

  // ─── Store Information ──────────────────────────────────────────────

  async getStoreInformation(): Promise<any> {
    let response = await this.api.get('/v2/store');
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────────────────

  async listWebhooks(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/hooks', { params });
    return response.data;
  }

  async createWebhook(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.api.post('/v3/hooks', data);
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<SingleResponse<any>> {
    let response = await this.api.get(`/v3/hooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(
    webhookId: number,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.api.put(`/v3/hooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.api.delete(`/v3/hooks/${webhookId}`);
  }

  // ─── Redirects ──────────────────────────────────────────────────────

  async listRedirects(params?: Record<string, any>): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/v3/storefront/redirects', { params });
    return response.data;
  }

  async createRedirects(data: Record<string, any>[]): Promise<PaginatedResponse<any>> {
    let response = await this.api.put('/v3/storefront/redirects', data);
    return response.data;
  }

  async deleteRedirects(uuids: string[]): Promise<void> {
    await this.api.delete('/v3/storefront/redirects', {
      params: { 'id:in': uuids.join(',') }
    });
  }

  // ─── Shipping Zones ─────────────────────────────────────────────────

  async listShippingZones(): Promise<any[]> {
    let response = await this.api.get('/v2/shipping/zones');
    return response.data;
  }

  // ─── Order Statuses ─────────────────────────────────────────────────

  async listOrderStatuses(): Promise<any[]> {
    let response = await this.api.get('/v2/order_statuses');
    return response.data;
  }

  // ─── Gift Certificates ──────────────────────────────────────────────

  async listGiftCertificates(params?: Record<string, any>): Promise<any[]> {
    let response = await this.api.get('/v2/gift_certificates', { params });
    return response.data;
  }

  async createGiftCertificate(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/v2/gift_certificates', data);
    return response.data;
  }
}
