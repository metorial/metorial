import { createApiServiceError, createAxios } from 'slates';
import { wixApiError } from './errors';

export interface WixClientConfig {
  token: string;
  siteId?: string;
  accountId?: string;
}

export type WixCatalogVersion = 'v1' | 'v3' | 'auto';

type WixQuery = {
  filter?: Record<string, any>;
  sort?: Array<{ fieldName: string; order: string }>;
  paging?: { limit?: number; offset?: number; cursor?: string };
};

let normalizeCatalogVersion = (value: unknown): 'v1' | 'v3' | undefined => {
  if (typeof value !== 'string') return undefined;
  let normalized = value.toLowerCase();
  if (normalized.includes('v3') || normalized.includes('3')) return 'v3';
  if (normalized.includes('v1') || normalized.includes('1')) return 'v1';
  return undefined;
};

let withCatalogVersion = <T extends Record<string, any>>(
  data: T,
  catalogVersion?: 'v1' | 'v3'
) => ({
  ...data,
  catalogVersion
});

export class WixClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: WixClientConfig) {
    if (config.siteId && config.accountId) {
      throw createApiServiceError(
        'Use either siteId or accountId for Wix API calls, not both.'
      );
    }

    let headers: Record<string, string> = {
      Authorization: config.token
    };
    if (config.siteId) headers['wix-site-id'] = config.siteId;
    if (config.accountId) headers['wix-account-id'] = config.accountId;

    this.axios = createAxios({
      baseURL: 'https://www.wixapis.com',
      headers
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw wixApiError(error, operation);
    }
  }

  private async resolveCatalogVersion(catalogVersion?: WixCatalogVersion) {
    if (catalogVersion === 'v1' || catalogVersion === 'v3') return catalogVersion;

    let result = await this.getCatalogVersion();
    let resolved =
      normalizeCatalogVersion(result.catalogVersion) ??
      normalizeCatalogVersion(result.version) ??
      normalizeCatalogVersion(result.catalog?.version);

    if (!resolved) {
      throw createApiServiceError('Wix catalog version response did not include V1 or V3.');
    }

    return resolved;
  }

  // --- Stores Catalog Versioning ---

  async getCatalogVersion() {
    return this.request<Record<string, any>>('get catalog version', () =>
      this.axios.get('/stores/v3/provision/version')
    );
  }

  // --- Products (Stores Catalog V1/V3) ---

  async queryProducts(query?: WixQuery, catalogVersion: WixCatalogVersion = 'v1') {
    let version = await this.resolveCatalogVersion(catalogVersion);

    if (version === 'v3') {
      let data = await this.request<Record<string, any>>('query products v3', () =>
        this.axios.post('/stores/v3/products/query', { query: query || {} })
      );
      return withCatalogVersion(data, version);
    }

    let data = await this.request<Record<string, any>>('query products v1', () =>
      this.axios.post('/stores/v1/products/query', {
        query: query || {}
      })
    );
    return withCatalogVersion(data, version);
  }

  async getProduct(productId: string, catalogVersion: WixCatalogVersion = 'v1') {
    let version = await this.resolveCatalogVersion(catalogVersion);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('get product v3', () =>
            this.axios.get(`/stores/v3/products/${productId}`)
          )
        : await this.request<Record<string, any>>('get product v1', () =>
            this.axios.get(`/stores-reader/v1/products/${productId}`)
          );

    return withCatalogVersion(data, version);
  }

  async createProduct(product: Record<string, any>, catalogVersion: WixCatalogVersion = 'v1') {
    let version = await this.resolveCatalogVersion(catalogVersion);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('create product v3', () =>
            this.axios.post('/stores/v3/products', { product })
          )
        : await this.request<Record<string, any>>('create product v1', () =>
            this.axios.post('/stores/v1/products', { product })
          );

    return withCatalogVersion(data, version);
  }

  async updateProduct(
    productId: string,
    product: Record<string, any>,
    catalogVersion: WixCatalogVersion = 'v1'
  ) {
    let version = await this.resolveCatalogVersion(catalogVersion);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('update product v3', () =>
            this.axios.patch(`/stores/v3/products/${productId}`, { product })
          )
        : await this.request<Record<string, any>>('update product v1', () =>
            this.axios.patch(`/stores/v1/products/${productId}`, { product })
          );

    return withCatalogVersion(data, version);
  }

  async deleteProduct(productId: string, catalogVersion: WixCatalogVersion = 'v1') {
    let version = await this.resolveCatalogVersion(catalogVersion);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('delete product v3', () =>
            this.axios.delete(`/stores/v3/products/${productId}`)
          )
        : await this.request<Record<string, any>>('delete product v1', () =>
            this.axios.delete(`/stores/v1/products/${productId}`)
          );

    return withCatalogVersion(data, version);
  }

  // --- Collections (Catalog V1) ---

  async queryCollections(query?: WixQuery) {
    return this.request<Record<string, any>>('query collections', () =>
      this.axios.post('/stores-reader/v1/collections/query', {
        query: query || {}
      })
    );
  }

  async getCollection(collectionId: string) {
    return this.request<Record<string, any>>('get collection', () =>
      this.axios.get(`/stores-reader/v1/collections/${collectionId}`)
    );
  }

  // --- eCommerce Orders ---

  async searchOrders(
    search?: WixQuery & { search?: { expression?: string; fields?: string[] } }
  ) {
    return this.request<Record<string, any>>('search orders', () =>
      this.axios.post('/ecom/v1/orders/search', search || {})
    );
  }

  async getOrder(orderId: string) {
    return this.request<Record<string, any>>('get order', () =>
      this.axios.get(`/ecom/v1/orders/${orderId}`)
    );
  }

  async createOrder(order: Record<string, any>) {
    return this.request<Record<string, any>>('create order', () =>
      this.axios.post('/ecom/v1/orders', order)
    );
  }

  async updateOrder(orderId: string, order: Record<string, any>) {
    return this.request<Record<string, any>>('update order', () =>
      this.axios.patch(`/ecom/v1/orders/${orderId}`, { order })
    );
  }

  async cancelOrder(orderId: string, reason?: string) {
    return this.request<Record<string, any>>('cancel order', () =>
      this.axios.post(`/ecom/v1/orders/${orderId}/cancel`, reason ? { reason } : {})
    );
  }

  // --- eCommerce Order Fulfillments ---

  async listFulfillments(orderId: string) {
    return this.request<Record<string, any>>('list fulfillments', () =>
      this.axios.get(`/ecom/v1/fulfillments/orders/${orderId}`)
    );
  }

  async createFulfillment(orderId: string, fulfillment: Record<string, any>) {
    return this.request<Record<string, any>>('create fulfillment', () =>
      this.axios.post(`/ecom/v1/fulfillments/orders/${orderId}/create-fulfillment`, {
        fulfillment
      })
    );
  }

  async updateFulfillment(
    orderId: string,
    fulfillmentId: string,
    fulfillment: Record<string, any>
  ) {
    return this.request<Record<string, any>>('update fulfillment', () =>
      this.axios.patch(`/ecom/v1/fulfillments/${fulfillmentId}/orders/${orderId}`, {
        fulfillment
      })
    );
  }

  async deleteFulfillment(orderId: string, fulfillmentId: string) {
    return this.request<Record<string, any>>('delete fulfillment', () =>
      this.axios.delete(`/ecom/v1/fulfillments/${fulfillmentId}/orders/${orderId}`)
    );
  }

  // --- Contacts ---

  async queryContacts(query?: WixQuery & { fields?: string[] }) {
    return this.request<Record<string, any>>('query contacts', () =>
      this.axios.post('/contacts/v4/contacts/query', {
        query: query || {}
      })
    );
  }

  async getContact(contactId: string) {
    return this.request<Record<string, any>>('get contact', () =>
      this.axios.get(`/contacts/v4/contacts/${contactId}`)
    );
  }

  async createContact(contactInfo: Record<string, any>) {
    return this.request<Record<string, any>>('create contact', () =>
      this.axios.post('/contacts/v4/contacts', { info: contactInfo })
    );
  }

  async updateContact(contactId: string, revision: number, contactInfo: Record<string, any>) {
    return this.request<Record<string, any>>('update contact', () =>
      this.axios.patch(`/contacts/v4/contacts/${contactId}`, {
        info: contactInfo,
        revision
      })
    );
  }

  async deleteContact(contactId: string) {
    return this.request<Record<string, any>>('delete contact', () =>
      this.axios.delete(`/contacts/v4/contacts/${contactId}`)
    );
  }

  // --- Blog Posts ---

  async listPosts(params?: {
    paging?: { limit?: number; offset?: number };
    sort?: string;
    order?: string;
    categoryIds?: string[];
    tagged?: boolean;
    featured?: boolean;
  }) {
    return this.request<Record<string, any>>('list blog posts', () =>
      this.axios.get('/blog/v3/posts', { params })
    );
  }

  async getPost(postId: string) {
    return this.request<Record<string, any>>('get blog post', () =>
      this.axios.get(`/blog/v3/posts/${postId}`)
    );
  }

  async createDraftPost(draftPost: Record<string, any>) {
    return this.request<Record<string, any>>('create draft post', () =>
      this.axios.post('/blog/v3/draft-posts', { draftPost })
    );
  }

  async updateDraftPost(draftPostId: string, draftPost: Record<string, any>) {
    return this.request<Record<string, any>>('update draft post', () =>
      this.axios.patch(`/blog/v3/draft-posts/${draftPostId}`, {
        draftPost
      })
    );
  }

  async publishDraftPost(draftPostId: string) {
    return this.request<Record<string, any>>('publish draft post', () =>
      this.axios.post(`/blog/v3/draft-posts/${draftPostId}/publish`)
    );
  }

  async listDraftPosts(params?: {
    paging?: { limit?: number; offset?: number };
    sort?: string;
    order?: string;
  }) {
    return this.request<Record<string, any>>('list draft posts', () =>
      this.axios.get('/blog/v3/draft-posts', { params })
    );
  }

  // --- Bookings Services ---

  async queryServices(query?: WixQuery) {
    return this.request<Record<string, any>>('query services', () =>
      this.axios.post('/bookings/v2/services/query', {
        query: query || {}
      })
    );
  }

  async getService(serviceId: string) {
    return this.request<Record<string, any>>('get service', () =>
      this.axios.get(`/bookings/v2/services/${serviceId}`)
    );
  }

  // --- Bookings ---

  async queryBookings(query?: WixQuery) {
    return this.request<Record<string, any>>('query bookings', () =>
      this.axios.post('/bookings/v2/bookings/query', {
        query: query || {}
      })
    );
  }

  async getBooking(bookingId: string) {
    return this.request<Record<string, any>>('get booking', () =>
      this.axios.get(`/bookings/v2/bookings/${bookingId}`)
    );
  }

  async createBooking(booking: Record<string, any>) {
    return this.request<Record<string, any>>('create booking', () =>
      this.axios.post('/bookings/v2/bookings', booking)
    );
  }

  // --- Events ---

  async queryEvents(query?: WixQuery & { fieldset?: string[] }) {
    return this.request<Record<string, any>>('query events', () =>
      this.axios.post('/events/v2/events/query', {
        query: query || {},
        ...(query?.fieldset ? { fieldset: query.fieldset } : {})
      })
    );
  }

  async getEvent(eventId: string) {
    return this.request<Record<string, any>>('get event', () =>
      this.axios.get(`/events/v1/events/${eventId}`)
    );
  }

  // --- Members ---

  async queryMembers(query?: WixQuery) {
    return this.request<Record<string, any>>('query members', () =>
      this.axios.post('/members/v1/members/query', {
        query: query || {}
      })
    );
  }

  async getMember(memberId: string) {
    return this.request<Record<string, any>>('get member', () =>
      this.axios.get(`/members/v1/members/${memberId}`)
    );
  }

  // --- Site Properties ---

  async getSiteProperties() {
    return this.request<Record<string, any>>('get site properties', () =>
      this.axios.get('/site-properties/v4/properties')
    );
  }

  // --- Inventory (Catalog V1) ---

  async getInventoryVariants(productId: string) {
    return this.request<Record<string, any>>('query inventory variants', () =>
      this.axios.post('/stores/v2/inventoryItems/query', {
        query: {
          filter: JSON.stringify({ productId })
        }
      })
    );
  }

  async updateInventoryVariants(inventoryId: string, variants: Record<string, any>[]) {
    return this.request<Record<string, any>>('update inventory variants', () =>
      this.axios.patch(`/stores/v1/inventoryItems/${inventoryId}`, {
        inventoryItem: { trackQuantity: true, variants }
      })
    );
  }

  // --- Pricing Plans V3 ---

  async queryPricingPlans(query?: WixQuery) {
    return this.request<Record<string, any>>('query pricing plans', () =>
      this.axios.post('/pricing-plans/v3/bulk/plans/query', {
        query: query || {}
      })
    );
  }

  async getPricingPlan(planId: string) {
    return this.request<Record<string, any>>('get pricing plan', () =>
      this.axios.get(`/pricing-plans/v3/plans/${planId}`)
    );
  }

  // --- CMS Data ---

  async queryDataItems(collectionId: string, query?: WixQuery) {
    return this.request<Record<string, any>>('query data items', () =>
      this.axios.post('/wix-data/v2/items/query', {
        dataCollectionId: collectionId,
        query: query || {}
      })
    );
  }

  async getDataItem(collectionId: string, itemId: string) {
    return this.request<Record<string, any>>('get data item', () =>
      this.axios.get(`/wix-data/v2/collections/${collectionId}/items/${itemId}`)
    );
  }

  async insertDataItem(collectionId: string, item: Record<string, any>) {
    return this.request<Record<string, any>>('insert data item', () =>
      this.axios.post('/wix-data/v2/items', {
        dataCollectionId: collectionId,
        dataItem: { data: item }
      })
    );
  }

  async updateDataItem(collectionId: string, itemId: string, item: Record<string, any>) {
    return this.request<Record<string, any>>('update data item', () =>
      this.axios.put(`/wix-data/v2/items/${itemId}`, {
        dataCollectionId: collectionId,
        dataItem: { _id: itemId, data: item }
      })
    );
  }

  async deleteDataItem(collectionId: string, itemId: string) {
    return this.request<Record<string, any>>('delete data item', () =>
      this.axios.delete(`/wix-data/v2/collections/${collectionId}/items/${itemId}`)
    );
  }

  // --- Media ---

  async importFile(url: string, displayName?: string, parentFolderId?: string) {
    return this.request<Record<string, any>>('import media file', () =>
      this.axios.post('/site-media/v1/files/import', {
        url,
        displayName,
        parentFolderId
      })
    );
  }

  async listFiles(params?: {
    parentFolderId?: string;
    paging?: { limit?: number; cursor?: string };
    sort?: { fieldName?: string; order?: string };
  }) {
    return this.request<Record<string, any>>('list media files', () =>
      this.axios.post('/site-media/v1/files/list', params || {})
    );
  }
}
