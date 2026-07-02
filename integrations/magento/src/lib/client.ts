import { createAxios } from 'slates';
import type {
  MagentoCart,
  MagentoCartItem,
  MagentoCategory,
  MagentoCmsBlock,
  MagentoCmsPage,
  MagentoCustomer,
  MagentoInventorySourceItem,
  MagentoInvoice,
  MagentoOrder,
  MagentoProduct,
  MagentoSearchResult,
  MagentoShipment,
  MagentoShippingMethod,
  MagentoStoreConfig
} from './types';

export class MagentoClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { storeUrl: string; storeCode: string; token: string }) {
    let baseURL = params.storeUrl.replace(/\/+$/, '');
    let storeCode = params.storeCode || 'default';

    this.axios = createAxios({
      baseURL: `${baseURL}/rest/${storeCode}/V1`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Search Criteria Helpers ──────────────────────────────────

  buildSearchParams(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    sortField?: string;
    sortDirection?: string;
    pageSize?: number;
    currentPage?: number;
  }): Record<string, string> {
    let params: Record<string, string> = {};

    if (options?.filters) {
      options.filters.forEach((filter, index) => {
        params[`searchCriteria[filterGroups][${index}][filters][0][field]`] = filter.field;
        params[`searchCriteria[filterGroups][${index}][filters][0][value]`] = filter.value;
        params[`searchCriteria[filterGroups][${index}][filters][0][conditionType]`] =
          filter.conditionType || 'eq';
      });
    }

    if (options?.sortField) {
      params['searchCriteria[sortOrders][0][field]'] = options.sortField;
      params['searchCriteria[sortOrders][0][direction]'] = options.sortDirection || 'DESC';
    }

    if (options?.pageSize !== undefined) {
      params['searchCriteria[pageSize]'] = String(options.pageSize);
    }

    if (options?.currentPage !== undefined) {
      params['searchCriteria[currentPage]'] = String(options.currentPage);
    }

    if (!options?.filters && !options?.pageSize && !options?.currentPage) {
      params.searchCriteria = '';
    }

    return params;
  }

  // ─── Products ─────────────────────────────────────────────────

  async getProduct(sku: string): Promise<MagentoProduct> {
    let response = await this.axios.get(`/products/${encodeURIComponent(sku)}`);
    return response.data as MagentoProduct;
  }

  async searchProducts(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    sortField?: string;
    sortDirection?: string;
    pageSize?: number;
    currentPage?: number;
  }): Promise<MagentoSearchResult<MagentoProduct>> {
    let params = this.buildSearchParams(options);
    let response = await this.axios.get('/products', { params });
    return response.data as MagentoSearchResult<MagentoProduct>;
  }

  async createProduct(product: Partial<MagentoProduct>): Promise<MagentoProduct> {
    let response = await this.axios.post('/products', { product });
    return response.data as MagentoProduct;
  }

  async updateProduct(sku: string, product: Partial<MagentoProduct>): Promise<MagentoProduct> {
    let response = await this.axios.put(`/products/${encodeURIComponent(sku)}`, { product });
    return response.data as MagentoProduct;
  }

  async deleteProduct(sku: string): Promise<boolean> {
    let response = await this.axios.delete(`/products/${encodeURIComponent(sku)}`);
    return response.data as boolean;
  }

  // ─── Orders ───────────────────────────────────────────────────

  async getOrder(orderId: number): Promise<MagentoOrder> {
    let response = await this.axios.get(`/orders/${orderId}`);
    return response.data as MagentoOrder;
  }

  async searchOrders(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    sortField?: string;
    sortDirection?: string;
    pageSize?: number;
    currentPage?: number;
  }): Promise<MagentoSearchResult<MagentoOrder>> {
    let params = this.buildSearchParams(options);
    let response = await this.axios.get('/orders', { params });
    return response.data as MagentoSearchResult<MagentoOrder>;
  }

  async addOrderComment(
    orderId: number,
    comment: string,
    status?: string,
    isVisibleOnFront?: boolean
  ): Promise<boolean> {
    let statusHistory: Record<string, any> = {
      comment,
      is_customer_notified: 0,
      is_visible_on_front: isVisibleOnFront ? 1 : 0
    };
    if (status) {
      statusHistory.status = status;
    }
    let response = await this.axios.post(`/orders/${orderId}/comments`, { statusHistory });
    return response.data as boolean;
  }

  async cancelOrder(orderId: number): Promise<boolean> {
    let response = await this.axios.post(`/orders/${orderId}/cancel`);
    return response.data as boolean;
  }

  async holdOrder(orderId: number): Promise<boolean> {
    let response = await this.axios.post(`/orders/${orderId}/hold`);
    return response.data as boolean;
  }

  async unholdOrder(orderId: number): Promise<boolean> {
    let response = await this.axios.post(`/orders/${orderId}/unhold`);
    return response.data as boolean;
  }

  // ─── Invoices ─────────────────────────────────────────────────

  async createInvoice(
    orderId: number,
    params?: {
      items?: Array<{ order_item_id: number; qty: number }>;
      capture?: boolean;
      notify?: boolean;
      comment?: string;
    }
  ): Promise<number> {
    let body: Record<string, any> = {};
    if (params?.items) {
      body.items = params.items;
    }
    if (params?.capture !== undefined) {
      body.capture = params.capture;
    }
    if (params?.notify !== undefined) {
      body.notify = params.notify;
    }
    if (params?.comment) {
      body.comment = { comment: params.comment, is_visible_on_front: 0 };
    }
    let response = await this.axios.post(`/order/${orderId}/invoice`, body);
    return response.data as number;
  }

  async getInvoice(invoiceId: number): Promise<MagentoInvoice> {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data as MagentoInvoice;
  }

  // ─── Shipments ────────────────────────────────────────────────

  async createShipment(
    orderId: number,
    params?: {
      items?: Array<{ order_item_id: number; qty: number }>;
      tracks?: Array<{ track_number: string; title: string; carrier_code: string }>;
      notify?: boolean;
      comment?: string;
    }
  ): Promise<number> {
    let body: Record<string, any> = {};
    if (params?.items) {
      body.items = params.items;
    }
    if (params?.tracks) {
      body.tracks = params.tracks;
    }
    if (params?.notify !== undefined) {
      body.notify = params.notify;
    }
    if (params?.comment) {
      body.comment = { comment: params.comment, is_visible_on_front: 0 };
    }
    let response = await this.axios.post(`/order/${orderId}/ship`, body);
    return response.data as number;
  }

  async getShipment(shipmentId: number): Promise<MagentoShipment> {
    let response = await this.axios.get(`/shipment/${shipmentId}`);
    return response.data as MagentoShipment;
  }

  // ─── Credit Memos (Refunds) ───────────────────────────────────

  async createCreditMemo(
    orderId: number,
    params?: {
      items?: Array<{ order_item_id: number; qty: number }>;
      notify?: boolean;
      comment?: string;
      adjustmentPositive?: number;
      adjustmentNegative?: number;
      shippingAmount?: number;
    }
  ): Promise<number> {
    let body: Record<string, any> = {};
    if (params?.items) {
      body.items = params.items;
    }
    if (params?.notify !== undefined) {
      body.notify = params.notify;
    }
    if (params?.comment) {
      body.comment = { comment: params.comment, is_visible_on_front: 0 };
    }
    if (params?.adjustmentPositive !== undefined) {
      body.adjustment_positive = params.adjustmentPositive;
    }
    if (params?.adjustmentNegative !== undefined) {
      body.adjustment_negative = params.adjustmentNegative;
    }
    if (params?.shippingAmount !== undefined) {
      body.shipping_amount = params.shippingAmount;
    }
    let response = await this.axios.post(`/order/${orderId}/refund`, body);
    return response.data as number;
  }

  // ─── Customers ────────────────────────────────────────────────

  async getCustomer(customerId: number): Promise<MagentoCustomer> {
    let response = await this.axios.get(`/customers/${customerId}`);
    return response.data as MagentoCustomer;
  }

  async searchCustomers(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    sortField?: string;
    sortDirection?: string;
    pageSize?: number;
    currentPage?: number;
  }): Promise<MagentoSearchResult<MagentoCustomer>> {
    let params = this.buildSearchParams(options);
    let response = await this.axios.get('/customers/search', { params });
    return response.data as MagentoSearchResult<MagentoCustomer>;
  }

  async createCustomer(
    customer: Partial<MagentoCustomer>,
    password?: string
  ): Promise<MagentoCustomer> {
    let body: Record<string, any> = { customer };
    if (password) {
      body.password = password;
    }
    let response = await this.axios.post('/customers', body);
    return response.data as MagentoCustomer;
  }

  async updateCustomer(
    customerId: number,
    customer: Partial<MagentoCustomer>
  ): Promise<MagentoCustomer> {
    let response = await this.axios.put(`/customers/${customerId}`, { customer });
    return response.data as MagentoCustomer;
  }

  async deleteCustomer(customerId: number): Promise<boolean> {
    let response = await this.axios.delete(`/customers/${customerId}`);
    return response.data as boolean;
  }

  // ─── Categories ───────────────────────────────────────────────

  async getCategoryTree(): Promise<MagentoCategory> {
    let response = await this.axios.get('/categories');
    return response.data as MagentoCategory;
  }

  async getCategory(categoryId: number): Promise<MagentoCategory> {
    let response = await this.axios.get(`/categories/${categoryId}`);
    return response.data as MagentoCategory;
  }

  async createCategory(category: Partial<MagentoCategory>): Promise<MagentoCategory> {
    let response = await this.axios.post('/categories', { category });
    return response.data as MagentoCategory;
  }

  async updateCategory(
    categoryId: number,
    category: Partial<MagentoCategory>
  ): Promise<MagentoCategory> {
    let response = await this.axios.put(`/categories/${categoryId}`, { category });
    return response.data as MagentoCategory;
  }

  async deleteCategory(categoryId: number): Promise<boolean> {
    let response = await this.axios.delete(`/categories/${categoryId}`);
    return response.data as boolean;
  }

  async assignProductToCategory(
    categoryId: number,
    productSku: string,
    position?: number
  ): Promise<boolean> {
    let body: Record<string, any> = {
      productLink: {
        sku: productSku,
        category_id: String(categoryId)
      }
    };
    if (position !== undefined) {
      body.productLink.position = position;
    }
    let response = await this.axios.post(`/categories/${categoryId}/products`, body);
    return response.data as boolean;
  }

  async removeProductFromCategory(categoryId: number, productSku: string): Promise<boolean> {
    let response = await this.axios.delete(
      `/categories/${categoryId}/products/${encodeURIComponent(productSku)}`
    );
    return response.data as boolean;
  }

  // ─── Inventory ────────────────────────────────────────────────

  async getStockItem(productSku: string): Promise<any> {
    let response = await this.axios.get(`/stockItems/${encodeURIComponent(productSku)}`);
    return response.data;
  }

  async updateStockItem(
    productSku: string,
    itemId: number,
    stockItem: Record<string, any>
  ): Promise<number> {
    let response = await this.axios.put(
      `/products/${encodeURIComponent(productSku)}/stockItems/${itemId}`,
      { stockItem }
    );
    return response.data as number;
  }

  async getSourceItems(sku: string): Promise<MagentoSearchResult<MagentoInventorySourceItem>> {
    let params = this.buildSearchParams({
      filters: [{ field: 'sku', value: sku, conditionType: 'eq' }]
    });
    let response = await this.axios.get('/inventory/source-items', { params });
    return response.data as MagentoSearchResult<MagentoInventorySourceItem>;
  }

  async saveSourceItems(sourceItems: MagentoInventorySourceItem[]): Promise<void> {
    await this.axios.post('/inventory/source-items', { sourceItems });
  }

  async isProductSalable(sku: string, stockId: number): Promise<boolean> {
    let response = await this.axios.get(
      `/inventory/is-product-salable/${encodeURIComponent(sku)}/${stockId}`
    );
    return response.data as boolean;
  }

  // ─── Shopping Cart ────────────────────────────────────────────

  async createCart(): Promise<number> {
    let response = await this.axios.post('/carts/mine');
    return response.data as number;
  }

  async createCartForCustomer(customerId: number): Promise<number> {
    let response = await this.axios.post(`/customers/${customerId}/carts`);
    return response.data as number;
  }

  async createGuestCart(): Promise<string> {
    let response = await this.axios.post('/guest-carts');
    return response.data as string;
  }

  async getCart(cartId: number): Promise<MagentoCart> {
    let response = await this.axios.get(`/carts/${cartId}`);
    return response.data as MagentoCart;
  }

  async addCartItem(
    cartId: number,
    item: { sku: string; qty: number; quoteId?: number }
  ): Promise<MagentoCartItem> {
    let cartItem: Record<string, any> = {
      sku: item.sku,
      qty: item.qty,
      quote_id: item.quoteId || cartId
    };
    let response = await this.axios.post(`/carts/${cartId}/items`, { cartItem });
    return response.data as MagentoCartItem;
  }

  async updateCartItem(
    cartId: number,
    itemId: number,
    item: { qty: number }
  ): Promise<MagentoCartItem> {
    let cartItem = {
      qty: item.qty,
      quote_id: cartId
    };
    let response = await this.axios.put(`/carts/${cartId}/items/${itemId}`, { cartItem });
    return response.data as MagentoCartItem;
  }

  async removeCartItem(cartId: number, itemId: number): Promise<boolean> {
    let response = await this.axios.delete(`/carts/${cartId}/items/${itemId}`);
    return response.data as boolean;
  }

  async estimateShipping(
    cartId: number,
    address: Record<string, any>
  ): Promise<MagentoShippingMethod[]> {
    let response = await this.axios.post(`/carts/${cartId}/estimate-shipping-methods`, {
      address
    });
    return response.data as MagentoShippingMethod[];
  }

  async applyCoupon(cartId: number, couponCode: string): Promise<boolean> {
    let response = await this.axios.put(
      `/carts/${cartId}/coupons/${encodeURIComponent(couponCode)}`
    );
    return response.data as boolean;
  }

  async removeCoupon(cartId: number): Promise<boolean> {
    let response = await this.axios.delete(`/carts/${cartId}/coupons`);
    return response.data as boolean;
  }

  // ─── CMS ──────────────────────────────────────────────────────

  async getCmsPage(pageId: number): Promise<MagentoCmsPage> {
    let response = await this.axios.get(`/cmsPage/${pageId}`);
    return response.data as MagentoCmsPage;
  }

  async searchCmsPages(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    pageSize?: number;
    currentPage?: number;
  }): Promise<MagentoSearchResult<MagentoCmsPage>> {
    let params = this.buildSearchParams(options);
    let response = await this.axios.get('/cmsPage/search', { params });
    return response.data as MagentoSearchResult<MagentoCmsPage>;
  }

  async createCmsPage(page: Partial<MagentoCmsPage>): Promise<MagentoCmsPage> {
    let response = await this.axios.post('/cmsPage', { page });
    return response.data as MagentoCmsPage;
  }

  async updateCmsPage(pageId: number, page: Partial<MagentoCmsPage>): Promise<MagentoCmsPage> {
    let response = await this.axios.put(`/cmsPage/${pageId}`, { page });
    return response.data as MagentoCmsPage;
  }

  async deleteCmsPage(pageId: number): Promise<boolean> {
    let response = await this.axios.delete(`/cmsPage/${pageId}`);
    return response.data as boolean;
  }

  async getCmsBlock(blockId: number): Promise<MagentoCmsBlock> {
    let response = await this.axios.get(`/cmsBlock/${blockId}`);
    return response.data as MagentoCmsBlock;
  }

  async searchCmsBlocks(options?: {
    filters?: Array<{ field: string; value: string; conditionType?: string }>;
    pageSize?: number;
    currentPage?: number;
  }): Promise<MagentoSearchResult<MagentoCmsBlock>> {
    let params = this.buildSearchParams(options);
    let response = await this.axios.get('/cmsBlock/search', { params });
    return response.data as MagentoSearchResult<MagentoCmsBlock>;
  }

  async createCmsBlock(block: Partial<MagentoCmsBlock>): Promise<MagentoCmsBlock> {
    let response = await this.axios.post('/cmsBlock', { block });
    return response.data as MagentoCmsBlock;
  }

  async updateCmsBlock(
    blockId: number,
    block: Partial<MagentoCmsBlock>
  ): Promise<MagentoCmsBlock> {
    let response = await this.axios.put(`/cmsBlock/${blockId}`, { block });
    return response.data as MagentoCmsBlock;
  }

  async deleteCmsBlock(blockId: number): Promise<boolean> {
    let response = await this.axios.delete(`/cmsBlock/${blockId}`);
    return response.data as boolean;
  }

  // ─── Store Configuration ──────────────────────────────────────

  async getStoreConfigs(): Promise<MagentoStoreConfig[]> {
    let response = await this.axios.get('/store/storeConfigs');
    return response.data as MagentoStoreConfig[];
  }

  async getStoreGroups(): Promise<any[]> {
    let response = await this.axios.get('/store/storeGroups');
    return response.data as any[];
  }

  async getWebsites(): Promise<any[]> {
    let response = await this.axios.get('/store/websites');
    return response.data as any[];
  }

  async getCurrencies(): Promise<any> {
    let response = await this.axios.get('/directory/currency');
    return response.data;
  }

  async getCountries(): Promise<any[]> {
    let response = await this.axios.get('/directory/countries');
    return response.data as any[];
  }
}
