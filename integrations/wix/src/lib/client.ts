import { createApiServiceError, createAxios, getApiErrorStatus, pickDefined } from 'slates';
import { wixApiError } from './errors';

export interface WixClientConfig {
  token: string;
  siteId?: string;
  accountId?: string;
}

export type WixCatalogVersion = 'v1' | 'v3' | 'auto';

export type WixSort = Array<{ fieldName: string; order: string }>;

export interface WixListOptions {
  filter?: Record<string, any>;
  sort?: WixSort;
  limit?: number;
  offset?: number;
  cursor?: string;
}

let pagingOf = (limit?: number, offset?: number) =>
  limit === undefined && offset === undefined ? undefined : pickDefined({ limit, offset });

// Wix API Query Language with offset paging: { filter, sort, paging }.
let offsetQuery = (options: WixListOptions = {}) =>
  pickDefined({
    filter: options.filter,
    sort: options.sort,
    paging: pagingOf(options.limit, options.offset)
  });

// Wix API Query Language with cursor paging. When a cursor is passed, Wix
// expects only the cursor (and optional limit), not the original filter/sort.
let cursorQuery = (options: WixListOptions = {}) => {
  if (options.cursor) {
    return { cursorPaging: pickDefined({ limit: options.limit, cursor: options.cursor }) };
  }
  return pickDefined({
    filter: options.filter,
    sort: options.sort,
    cursorPaging: options.limit === undefined ? undefined : { limit: options.limit }
  });
};

// Stores Catalog V1 query endpoints take filter and sort as JSON strings,
// for example filter: "{\"brand\":\"Nice\"}" and sort: "[{\"price\":\"desc\"}]".
let storesV1Query = (options: WixListOptions = {}) =>
  pickDefined({
    filter: options.filter ? JSON.stringify(options.filter) : undefined,
    sort: options.sort?.length
      ? JSON.stringify(options.sort.map(s => ({ [s.fieldName]: s.order.toLowerCase() })))
      : undefined,
    paging: pagingOf(options.limit, options.offset)
  });

// Wix GET endpoints expect dot-notation for nested query params
// (paging.limit=10) and repeated keys for arrays (categoryIds=a&categoryIds=b).
let toSearchParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();
  let append = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (let item of value) append(key, item);
      return;
    }
    if (typeof value === 'object') {
      for (let [childKey, child] of Object.entries(value as Record<string, unknown>)) {
        append(`${key}.${childKey}`, child);
      }
      return;
    }
    search.append(key, String(value));
  };
  for (let [key, value] of Object.entries(params)) append(key, value);
  return search;
};

export let getNextCursor = (result: Record<string, any> | undefined): string | undefined => {
  let next =
    result?.pagingMetadata?.cursors?.next ??
    result?.metadata?.cursors?.next ??
    result?.nextCursor?.cursors?.next;
  return typeof next === 'string' && next.length > 0 ? next : undefined;
};

let parseCatalogVersion = (value: unknown): 'v1' | 'v3' | undefined => {
  if (value === 'V1_CATALOG') return 'v1';
  if (value === 'V3_CATALOG') return 'v3';
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

  // Omitted catalogVersion detects the site's catalog and falls back to V1 (the
  // previous default) only when the versioning endpoint is unavailable to the caller.
  async resolveCatalogVersion(catalogVersion?: WixCatalogVersion): Promise<'v1' | 'v3'> {
    if (catalogVersion === 'v1' || catalogVersion === 'v3') return catalogVersion;

    let result: Record<string, any>;
    try {
      let response = await this.axios.get('/stores/v3/provision/version');
      result = response.data;
    } catch (error) {
      let status = Number(getApiErrorStatus(error));
      if (catalogVersion === undefined && (status === 403 || status === 404)) return 'v1';
      throw wixApiError(error, 'get catalog version');
    }

    if (result?.catalogVersion === 'STORES_NOT_INSTALLED') {
      throw createApiServiceError('Wix Stores is not installed on this site.');
    }

    let resolved = parseCatalogVersion(result?.catalogVersion);
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

  async queryProducts(
    options: WixListOptions & { includeHiddenProducts?: boolean } = {},
    catalogVersion?: WixCatalogVersion
  ) {
    let version = await this.resolveCatalogVersion(catalogVersion);

    if (version === 'v3') {
      let data = await this.request<Record<string, any>>('query products v3', () =>
        this.axios.post('/stores/v3/products/query', { query: cursorQuery(options) })
      );
      return withCatalogVersion(data, version);
    }

    let data = await this.request<Record<string, any>>('query products v1', () =>
      this.axios.post(
        '/stores-reader/v1/products/query',
        pickDefined({
          query: storesV1Query(options),
          includeHiddenProducts: options.includeHiddenProducts
        })
      )
    );
    return withCatalogVersion(data, version);
  }

  async getProduct(productId: string, catalogVersion?: WixCatalogVersion) {
    let version = await this.resolveCatalogVersion(catalogVersion);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('get product v3', () =>
            this.axios.get(`/stores/v3/products/${encodeURIComponent(productId)}`)
          )
        : await this.request<Record<string, any>>('get product v1', () =>
            this.axios.get(`/stores-reader/v1/products/${encodeURIComponent(productId)}`)
          );

    return withCatalogVersion(data, version);
  }

  async createProduct(product: Record<string, any>, version: 'v1' | 'v3') {
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

  async updateProduct(productId: string, product: Record<string, any>, version: 'v1' | 'v3') {
    let id = encodeURIComponent(productId);
    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('update product v3', () =>
            this.axios.patch(`/stores/v3/products/${id}`, {
              product: { ...product, id: productId }
            })
          )
        : await this.request<Record<string, any>>('update product v1', () =>
            this.axios.patch(`/stores/v1/products/${id}`, { product })
          );

    return withCatalogVersion(data, version);
  }

  async deleteProduct(productId: string, catalogVersion?: WixCatalogVersion) {
    let version = await this.resolveCatalogVersion(catalogVersion);
    let id = encodeURIComponent(productId);

    let data =
      version === 'v3'
        ? await this.request<Record<string, any>>('delete product v3', () =>
            this.axios.delete(`/stores/v3/products/${id}`)
          )
        : await this.request<Record<string, any>>('delete product v1', () =>
            this.axios.delete(`/stores/v1/products/${id}`)
          );

    return withCatalogVersion(data, version);
  }

  // --- Collections (Catalog V1) ---

  async queryCollections(options: WixListOptions = {}) {
    return this.request<Record<string, any>>('query collections', () =>
      this.axios.post('/stores-reader/v1/collections/query', {
        query: storesV1Query(options)
      })
    );
  }

  async getCollection(collectionId: string) {
    return this.request<Record<string, any>>('get collection', () =>
      this.axios.get(`/stores-reader/v1/collections/${encodeURIComponent(collectionId)}`)
    );
  }

  // --- eCommerce Orders ---

  async searchOrders(options: WixListOptions = {}) {
    return this.request<Record<string, any>>('search orders', () =>
      this.axios.post('/ecom/v1/orders/search', { search: cursorQuery(options) })
    );
  }

  async getOrder(orderId: string) {
    return this.request<Record<string, any>>('get order', () =>
      this.axios.get(`/ecom/v1/orders/${encodeURIComponent(orderId)}`)
    );
  }

  async createOrder(body: Record<string, any>) {
    return this.request<Record<string, any>>('create order', () =>
      this.axios.post('/ecom/v1/orders', body)
    );
  }

  async updateOrder(orderId: string, order: Record<string, any>) {
    return this.request<Record<string, any>>('update order', () =>
      this.axios.patch(`/ecom/v1/orders/${encodeURIComponent(orderId)}`, {
        order: { ...order, id: orderId }
      })
    );
  }

  async cancelOrder(
    orderId: string,
    options: {
      customMessage?: string;
      sendOrderCanceledEmail?: boolean;
      restockAllItems?: boolean;
    } = {}
  ) {
    return this.request<Record<string, any>>('cancel order', () =>
      this.axios.post(
        `/ecom/v1/orders/${encodeURIComponent(orderId)}/cancel`,
        pickDefined(options)
      )
    );
  }

  // --- eCommerce Order Fulfillments ---

  async listFulfillments(orderId: string) {
    return this.request<Record<string, any>>('list fulfillments', () =>
      this.axios.get(`/ecom/v1/fulfillments/orders/${encodeURIComponent(orderId)}`)
    );
  }

  async createFulfillment(orderId: string, fulfillment: Record<string, any>) {
    return this.request<Record<string, any>>('create fulfillment', () =>
      this.axios.post(
        `/ecom/v1/fulfillments/orders/${encodeURIComponent(orderId)}/create-fulfillment`,
        { fulfillment }
      )
    );
  }

  async updateFulfillment(
    orderId: string,
    fulfillmentId: string,
    fulfillment: Record<string, any>
  ) {
    return this.request<Record<string, any>>('update fulfillment', () =>
      this.axios.patch(
        `/ecom/v1/fulfillments/${encodeURIComponent(fulfillmentId)}/orders/${encodeURIComponent(orderId)}`,
        { fulfillment: { ...fulfillment, id: fulfillmentId } }
      )
    );
  }

  async deleteFulfillment(orderId: string, fulfillmentId: string) {
    return this.request<Record<string, any>>('delete fulfillment', () =>
      this.axios.delete(
        `/ecom/v1/fulfillments/${encodeURIComponent(fulfillmentId)}/orders/${encodeURIComponent(orderId)}`
      )
    );
  }

  // --- Contacts ---

  async queryContacts(options: WixListOptions & { search?: string } = {}) {
    return this.request<Record<string, any>>('query contacts', () =>
      this.axios.post(
        '/contacts/v4/contacts/query',
        pickDefined({ query: offsetQuery(options), search: options.search })
      )
    );
  }

  async getContact(contactId: string) {
    return this.request<Record<string, any>>('get contact', () =>
      this.axios.get(`/contacts/v4/contacts/${encodeURIComponent(contactId)}`)
    );
  }

  async createContact(info: Record<string, any>, allowDuplicates?: boolean) {
    return this.request<Record<string, any>>('create contact', () =>
      this.axios.post('/contacts/v4/contacts', pickDefined({ info, allowDuplicates }))
    );
  }

  async updateContact(
    contactId: string,
    revision: number,
    info: Record<string, any>,
    allowDuplicates?: boolean
  ) {
    return this.request<Record<string, any>>('update contact', () =>
      this.axios.patch(
        `/contacts/v4/contacts/${encodeURIComponent(contactId)}`,
        pickDefined({ info, revision, allowDuplicates })
      )
    );
  }

  async deleteContact(contactId: string) {
    return this.request<Record<string, any>>('delete contact', () =>
      this.axios.delete(`/contacts/v4/contacts/${encodeURIComponent(contactId)}`)
    );
  }

  // --- Blog Posts ---

  async listPosts(params: {
    limit?: number;
    offset?: number;
    categoryIds?: string[];
    tagIds?: string[];
    featured?: boolean;
    language?: string;
  }) {
    return this.request<Record<string, any>>('list blog posts', () =>
      this.axios.get('/blog/v3/posts', {
        params: toSearchParams({
          paging: pagingOf(params.limit, params.offset),
          categoryIds: params.categoryIds,
          tagIds: params.tagIds,
          featured: params.featured,
          language: params.language
        })
      })
    );
  }

  async getPost(postId: string) {
    return this.request<Record<string, any>>('get blog post', () =>
      this.axios.get(`/blog/v3/posts/${encodeURIComponent(postId)}`)
    );
  }

  async createDraftPost(draftPost: Record<string, any>) {
    return this.request<Record<string, any>>('create draft post', () =>
      this.axios.post('/blog/v3/draft-posts', { draftPost })
    );
  }

  async updateDraftPost(draftPostId: string, draftPost: Record<string, any>) {
    return this.request<Record<string, any>>('update draft post', () =>
      this.axios.patch(`/blog/v3/draft-posts/${encodeURIComponent(draftPostId)}`, {
        draftPost: { ...draftPost, id: draftPostId }
      })
    );
  }

  async publishDraftPost(draftPostId: string) {
    return this.request<Record<string, any>>('publish draft post', () =>
      this.axios.post(`/blog/v3/draft-posts/${encodeURIComponent(draftPostId)}/publish`, {})
    );
  }

  async listDraftPosts(params: { limit?: number; offset?: number; language?: string }) {
    return this.request<Record<string, any>>('list draft posts', () =>
      this.axios.get('/blog/v3/draft-posts', {
        params: toSearchParams({
          paging: pagingOf(params.limit, params.offset),
          language: params.language
        })
      })
    );
  }

  // --- Bookings Services ---

  async queryServices(options: WixListOptions = {}) {
    return this.request<Record<string, any>>('query services', () =>
      this.axios.post('/bookings/v2/services/query', { query: offsetQuery(options) })
    );
  }

  async getService(serviceId: string) {
    return this.request<Record<string, any>>('get service', () =>
      this.axios.get(`/bookings/v2/services/${encodeURIComponent(serviceId)}`)
    );
  }

  // --- Bookings ---

  async queryExtendedBookings(options: WixListOptions = {}) {
    return this.request<Record<string, any>>('query bookings', () =>
      this.axios.post('/bookings/bookings-reader/v2/extended-bookings/query', {
        query: cursorQuery(options)
      })
    );
  }

  async getBooking(bookingId: string) {
    let result = await this.queryExtendedBookings({ filter: { id: bookingId }, limit: 1 });
    let booking = result.extendedBookings?.[0]?.booking;
    if (!booking) {
      throw createApiServiceError(`Wix booking ${bookingId} was not found.`);
    }
    return booking as Record<string, any>;
  }

  async createBooking(body: Record<string, any>) {
    return this.request<Record<string, any>>('create booking', () =>
      this.axios.post('/bookings/v2/bookings', body)
    );
  }

  async cancelBooking(
    bookingId: string,
    body: {
      revision: string | number;
      participantNotification?: { notifyParticipants?: boolean; message?: string };
    }
  ) {
    return this.request<Record<string, any>>('cancel booking', () =>
      this.axios.post(`/bookings/v2/bookings/${encodeURIComponent(bookingId)}/cancel`, body)
    );
  }

  // --- Events (Events V3) ---

  async queryEvents(options: WixListOptions & { fields?: string[]; includeDrafts?: boolean }) {
    return this.request<Record<string, any>>('query events', () =>
      this.axios.post(
        '/events/v3/events/query',
        pickDefined({
          query: offsetQuery(options),
          fields: options.fields,
          includeDrafts: options.includeDrafts
        })
      )
    );
  }

  async getEvent(eventId: string, fields?: string[]) {
    return this.request<Record<string, any>>('get event', () =>
      this.axios.get(`/events/v3/events/${encodeURIComponent(eventId)}`, {
        params: toSearchParams({ fields })
      })
    );
  }

  // --- Members ---

  async queryMembers(options: WixListOptions & { fieldsets?: string[]; search?: string }) {
    return this.request<Record<string, any>>('query members', () =>
      this.axios.post(
        '/members/v1/members/query',
        pickDefined({
          query: pickDefined({
            filter: options.filter,
            sorting: options.sort,
            paging: pagingOf(options.limit, options.offset)
          }),
          fieldsets: options.fieldsets,
          search: options.search ? { expression: options.search } : undefined
        })
      )
    );
  }

  async getMember(memberId: string, fieldsets?: string[]) {
    return this.request<Record<string, any>>('get member', () =>
      this.axios.get(`/members/v1/members/${encodeURIComponent(memberId)}`, {
        params: toSearchParams({ fieldsets })
      })
    );
  }

  // --- Site Properties ---

  async getSiteProperties() {
    return this.request<Record<string, any>>('get site properties', () =>
      this.axios.get('/site-properties/v4/properties')
    );
  }

  // --- Pricing Plans V3 ---

  async queryPricingPlans(options: WixListOptions = {}) {
    return this.request<Record<string, any>>('query pricing plans', () =>
      this.axios.post('/pricing-plans/v3/plans/query', { query: cursorQuery(options) })
    );
  }

  async getPricingPlan(planId: string) {
    return this.request<Record<string, any>>('get pricing plan', () =>
      this.axios.get(`/pricing-plans/v3/plans/${encodeURIComponent(planId)}`)
    );
  }

  // --- CMS Data ---

  async listDataCollections(params: { limit?: number; offset?: number }) {
    return this.request<Record<string, any>>('list data collections', () =>
      this.axios.get('/wix-data/v2/collections', {
        params: toSearchParams({ paging: pagingOf(params.limit, params.offset) })
      })
    );
  }

  async queryDataItems(collectionId: string, options: WixListOptions = {}) {
    return this.request<Record<string, any>>('query data items', () =>
      this.axios.post('/wix-data/v2/items/query', {
        dataCollectionId: collectionId,
        query: offsetQuery(options),
        returnTotalCount: true
      })
    );
  }

  async getDataItem(collectionId: string, itemId: string) {
    return this.request<Record<string, any>>('get data item', () =>
      this.axios.get(`/wix-data/v2/items/${encodeURIComponent(itemId)}`, {
        params: { dataCollectionId: collectionId, consistentRead: true }
      })
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

  // Update Data Item replaces the item's whole payload with dataItem.data.
  async replaceDataItem(collectionId: string, itemId: string, item: Record<string, any>) {
    return this.request<Record<string, any>>('update data item', () =>
      this.axios.put(`/wix-data/v2/items/${encodeURIComponent(itemId)}`, {
        dataCollectionId: collectionId,
        dataItem: { id: itemId, data: item }
      })
    );
  }

  async deleteDataItem(collectionId: string, itemId: string) {
    return this.request<Record<string, any>>('delete data item', () =>
      this.axios.delete(`/wix-data/v2/items/${encodeURIComponent(itemId)}`, {
        params: { dataCollectionId: collectionId }
      })
    );
  }

  // --- Media ---

  async importFile(params: {
    url: string;
    displayName?: string;
    parentFolderId?: string;
    mimeType?: string;
  }) {
    return this.request<Record<string, any>>('import media file', () =>
      this.axios.post('/site-media/v1/files/import', pickDefined(params))
    );
  }

  async listFiles(params: {
    parentFolderId?: string;
    mediaTypes?: string[];
    limit?: number;
    cursor?: string;
  }) {
    return this.request<Record<string, any>>('list media files', () =>
      this.axios.get('/site-media/v1/files', {
        params: toSearchParams({
          parentFolderId: params.parentFolderId,
          mediaTypes: params.mediaTypes,
          paging: pickDefined({ limit: params.limit, cursor: params.cursor })
        })
      })
    );
  }
}
