import { createAxios } from 'slates';

export interface WixClientConfig {
  token: string;
  siteId?: string;
  accountId?: string;
}

export class WixClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: WixClientConfig) {
    let headers: Record<string, string> = {
      Authorization: config.token
    };
    if (config.siteId) {
      headers['wix-site-id'] = config.siteId;
    }
    if (config.accountId) {
      headers['wix-account-id'] = config.accountId;
    }
    this.axios = createAxios({
      baseURL: 'https://www.wixapis.com',
      headers
    });
  }

  // --- Products (Stores Catalog) ---

  async queryProducts(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/stores/v1/products/query', {
      query: query || {}
    });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.axios.get(`/stores-reader/v1/products/${productId}`);
    return response.data;
  }

  async createProduct(product: Record<string, any>) {
    let response = await this.axios.post('/stores/v1/products', { product });
    return response.data;
  }

  async updateProduct(productId: string, product: Record<string, any>) {
    let response = await this.axios.patch(`/stores/v1/products/${productId}`, { product });
    return response.data;
  }

  async deleteProduct(productId: string) {
    let response = await this.axios.delete(`/stores/v1/products/${productId}`);
    return response.data;
  }

  // --- Collections ---

  async queryCollections(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/stores-reader/v1/collections/query', {
      query: query || {}
    });
    return response.data;
  }

  async getCollection(collectionId: string) {
    let response = await this.axios.get(`/stores-reader/v1/collections/${collectionId}`);
    return response.data;
  }

  // --- eCommerce Orders ---

  async searchOrders(search?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
    search?: { expression?: string; fields?: string[] };
  }) {
    let response = await this.axios.post('/ecom/v1/orders/search', search || {});
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/ecom/v1/orders/${orderId}`);
    return response.data;
  }

  async createOrder(order: Record<string, any>) {
    let response = await this.axios.post('/ecom/v1/orders', order);
    return response.data;
  }

  async updateOrder(orderId: string, order: Record<string, any>) {
    let response = await this.axios.patch(`/ecom/v1/orders/${orderId}`, { order });
    return response.data;
  }

  // --- Contacts ---

  async queryContacts(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
    fields?: string[];
  }) {
    let response = await this.axios.post('/contacts/v4/contacts/query', {
      query: query || {}
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/v4/contacts/${contactId}`);
    return response.data;
  }

  async createContact(contactInfo: Record<string, any>) {
    let response = await this.axios.post('/contacts/v4/contacts', { info: contactInfo });
    return response.data;
  }

  async updateContact(contactId: string, revision: number, contactInfo: Record<string, any>) {
    let response = await this.axios.patch(`/contacts/v4/contacts/${contactId}`, {
      info: contactInfo,
      revision
    });
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/v4/contacts/${contactId}`);
    return response.data;
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
    let response = await this.axios.get('/blog/v3/posts', { params });
    return response.data;
  }

  async getPost(postId: string) {
    let response = await this.axios.get(`/blog/v3/posts/${postId}`);
    return response.data;
  }

  async createDraftPost(draftPost: Record<string, any>) {
    let response = await this.axios.post('/blog/v3/draft-posts', { draftPost });
    return response.data;
  }

  async updateDraftPost(draftPostId: string, draftPost: Record<string, any>) {
    let response = await this.axios.patch(`/blog/v3/draft-posts/${draftPostId}`, {
      draftPost
    });
    return response.data;
  }

  async publishDraftPost(draftPostId: string) {
    let response = await this.axios.post(`/blog/v3/draft-posts/${draftPostId}/publish`);
    return response.data;
  }

  async listDraftPosts(params?: {
    paging?: { limit?: number; offset?: number };
    sort?: string;
    order?: string;
  }) {
    let response = await this.axios.get('/blog/v3/draft-posts', { params });
    return response.data;
  }

  // --- Bookings Services ---

  async queryServices(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/bookings/v2/services/query', {
      query: query || {}
    });
    return response.data;
  }

  async getService(serviceId: string) {
    let response = await this.axios.get(`/bookings/v2/services/${serviceId}`);
    return response.data;
  }

  // --- Bookings ---

  async queryBookings(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/bookings/v2/bookings/query', {
      query: query || {}
    });
    return response.data;
  }

  async getBooking(bookingId: string) {
    let response = await this.axios.get(`/bookings/v2/bookings/${bookingId}`);
    return response.data;
  }

  async createBooking(booking: Record<string, any>) {
    let response = await this.axios.post('/bookings/v2/bookings', booking);
    return response.data;
  }

  // --- Events ---

  async queryEvents(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
    fieldset?: string[];
  }) {
    let response = await this.axios.post('/events/v2/events/query', {
      query: query || {},
      ...(query?.fieldset ? { fieldset: query.fieldset } : {})
    });
    return response.data;
  }

  async getEvent(eventId: string) {
    let response = await this.axios.get(`/events/v1/events/${eventId}`);
    return response.data;
  }

  // --- Members ---

  async queryMembers(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/members/v1/members/query', {
      query: query || {}
    });
    return response.data;
  }

  async getMember(memberId: string) {
    let response = await this.axios.get(`/members/v1/members/${memberId}`);
    return response.data;
  }

  // --- Site Properties ---

  async getSiteProperties() {
    let response = await this.axios.get('/site-properties/v4/properties');
    return response.data;
  }

  // --- Inventory ---

  async getInventoryVariants(productId: string) {
    let response = await this.axios.post('/stores/v2/inventoryItems/query', {
      query: {
        filter: JSON.stringify({ productId })
      }
    });
    return response.data;
  }

  async updateInventoryVariants(inventoryId: string, variants: Record<string, any>[]) {
    let response = await this.axios.patch(`/stores/v1/inventoryItems/${inventoryId}`, {
      inventoryItem: { trackQuantity: true, variants }
    });
    return response.data;
  }

  // --- Pricing Plans ---

  async queryPricingPlans(query?: {
    filter?: Record<string, any>;
    sort?: Array<{ fieldName: string; order: string }>;
    paging?: { limit?: number; offset?: number };
  }) {
    let response = await this.axios.post('/pricing-plans/v2/plans/query', {
      query: query || {}
    });
    return response.data;
  }

  async getPricingPlan(planId: string) {
    let response = await this.axios.get(`/pricing-plans/v2/plans/${planId}`);
    return response.data;
  }

  // --- CMS Data ---

  async queryDataItems(
    collectionId: string,
    query?: {
      filter?: Record<string, any>;
      sort?: Array<{ fieldName: string; order: string }>;
      paging?: { limit?: number; offset?: number };
    }
  ) {
    let response = await this.axios.post('/wix-data/v2/items/query', {
      dataCollectionId: collectionId,
      query: query || {}
    });
    return response.data;
  }

  async getDataItem(collectionId: string, itemId: string) {
    let response = await this.axios.get(
      `/wix-data/v2/collections/${collectionId}/items/${itemId}`
    );
    return response.data;
  }

  async insertDataItem(collectionId: string, item: Record<string, any>) {
    let response = await this.axios.post('/wix-data/v2/items', {
      dataCollectionId: collectionId,
      dataItem: { data: item }
    });
    return response.data;
  }

  async updateDataItem(collectionId: string, itemId: string, item: Record<string, any>) {
    let response = await this.axios.put(`/wix-data/v2/items/${itemId}`, {
      dataCollectionId: collectionId,
      dataItem: { _id: itemId, data: item }
    });
    return response.data;
  }

  async deleteDataItem(collectionId: string, itemId: string) {
    let response = await this.axios.delete(
      `/wix-data/v2/collections/${collectionId}/items/${itemId}`
    );
    return response.data;
  }

  // --- Media ---

  async importFile(url: string, displayName?: string, parentFolderId?: string) {
    let response = await this.axios.post('/site-media/v1/files/import', {
      url,
      displayName,
      parentFolderId
    });
    return response.data;
  }

  async listFiles(params?: {
    parentFolderId?: string;
    paging?: { limit?: number; cursor?: string };
    sort?: { fieldName?: string; order?: string };
  }) {
    let response = await this.axios.post('/site-media/v1/files/list', params || {});
    return response.data;
  }
}
