import { createAxios } from 'slates';

export interface BooqableClientConfig {
  token: string;
  companySlug: string;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: BooqableClientConfig) {
    this.axios = createAxios({
      baseURL: `https://${config.companySlug}.booqable.com/api/4`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private buildQueryParams(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    fields?: Record<string, string[]>;
    sort?: string;
  }): Record<string, string> {
    let params: Record<string, string> = {};

    if (options?.pagination?.pageNumber) {
      params['page[number]'] = String(options.pagination.pageNumber);
    }
    if (options?.pagination?.pageSize) {
      params['page[size]'] = String(options.pagination.pageSize);
    }

    if (options?.filters) {
      for (let [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          params[`filter[${key}]`] = String(value);
        }
      }
    }

    if (options?.include?.length) {
      params.include = options.include.join(',');
    }

    if (options?.fields) {
      for (let [resource, fieldList] of Object.entries(options.fields)) {
        params[`fields[${resource}]`] = fieldList.join(',');
      }
    }

    if (options?.sort) {
      params.sort = options.sort;
    }

    return params;
  }

  // ---- Generic resource methods ----

  async listResource(
    resource: string,
    options?: {
      pagination?: PaginationParams;
      filters?: FilterParams;
      include?: string[];
      sort?: string;
    }
  ): Promise<any> {
    let params = this.buildQueryParams(options);
    let response = await this.axios.get(`/${resource}`, { params });
    return response.data;
  }

  async getResource(
    resource: string,
    resourceId: string,
    options?: {
      include?: string[];
    }
  ): Promise<any> {
    let params = this.buildQueryParams({ include: options?.include });
    let response = await this.axios.get(`/${resource}/${resourceId}`, { params });
    return response.data;
  }

  async createResource(
    resource: string,
    type: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<any> {
    let body: any = {
      data: {
        type,
        attributes
      }
    };
    if (relationships) {
      body.data.relationships = relationships;
    }
    let response = await this.axios.post(`/${resource}`, body);
    return response.data;
  }

  async updateResource(
    resource: string,
    resourceId: string,
    type: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<any> {
    let body: any = {
      data: {
        id: resourceId,
        type,
        attributes
      }
    };
    if (relationships) {
      body.data.relationships = relationships;
    }
    let response = await this.axios.patch(`/${resource}/${resourceId}`, body);
    return response.data;
  }

  async deleteResource(resource: string, resourceId: string): Promise<void> {
    await this.axios.delete(`/${resource}/${resourceId}`);
  }

  // ---- Customers ----

  async listCustomers(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('customers', options);
  }

  async getCustomer(customerId: string, include?: string[]) {
    return this.getResource('customers', customerId, { include });
  }

  async createCustomer(attributes: Record<string, any>) {
    return this.createResource('customers', 'customers', attributes);
  }

  async updateCustomer(customerId: string, attributes: Record<string, any>) {
    return this.updateResource('customers', customerId, 'customers', attributes);
  }

  async archiveCustomer(customerId: string) {
    return this.deleteResource('customers', customerId);
  }

  // ---- Orders ----

  async listOrders(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('orders', options);
  }

  async getOrder(orderId: string, include?: string[]) {
    return this.getResource('orders', orderId, { include });
  }

  async createOrder(attributes: Record<string, any>) {
    return this.createResource('orders', 'orders', attributes);
  }

  async updateOrder(orderId: string, attributes: Record<string, any>) {
    return this.updateResource('orders', orderId, 'orders', attributes);
  }

  async archiveOrder(orderId: string) {
    return this.deleteResource('orders', orderId);
  }

  // ---- Product Groups ----

  async listProductGroups(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('product_groups', options);
  }

  async getProductGroup(productGroupId: string, include?: string[]) {
    return this.getResource('product_groups', productGroupId, { include });
  }

  async createProductGroup(attributes: Record<string, any>) {
    return this.createResource('product_groups', 'product_groups', attributes);
  }

  async updateProductGroup(productGroupId: string, attributes: Record<string, any>) {
    return this.updateResource('product_groups', productGroupId, 'product_groups', attributes);
  }

  async archiveProductGroup(productGroupId: string) {
    return this.deleteResource('product_groups', productGroupId);
  }

  // ---- Products ----

  async listProducts(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('products', options);
  }

  async getProduct(productId: string, include?: string[]) {
    return this.getResource('products', productId, { include });
  }

  async createProduct(attributes: Record<string, any>) {
    return this.createResource('products', 'products', attributes);
  }

  async updateProduct(productId: string, attributes: Record<string, any>) {
    return this.updateResource('products', productId, 'products', attributes);
  }

  // ---- Bundles ----

  async listBundles(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('bundles', options);
  }

  async getBundle(bundleId: string, include?: string[]) {
    return this.getResource('bundles', bundleId, { include });
  }

  async createBundle(attributes: Record<string, any>) {
    return this.createResource('bundles', 'bundles', attributes);
  }

  async updateBundle(bundleId: string, attributes: Record<string, any>) {
    return this.updateResource('bundles', bundleId, 'bundles', attributes);
  }

  async archiveBundle(bundleId: string) {
    return this.deleteResource('bundles', bundleId);
  }

  // ---- Stock Items ----

  async listStockItems(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('stock_items', options);
  }

  async getStockItem(stockItemId: string, include?: string[]) {
    return this.getResource('stock_items', stockItemId, { include });
  }

  async createStockItem(attributes: Record<string, any>) {
    return this.createResource('stock_items', 'stock_items', attributes);
  }

  async updateStockItem(stockItemId: string, attributes: Record<string, any>) {
    return this.updateResource('stock_items', stockItemId, 'stock_items', attributes);
  }

  // ---- Documents (Invoices, Quotes, Contracts) ----

  async listDocuments(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('documents', options);
  }

  async getDocument(documentId: string, include?: string[]) {
    return this.getResource('documents', documentId, { include });
  }

  async createDocument(attributes: Record<string, any>) {
    return this.createResource('documents', 'documents', attributes);
  }

  async updateDocument(documentId: string, attributes: Record<string, any>) {
    return this.updateResource('documents', documentId, 'documents', attributes);
  }

  async archiveDocument(documentId: string) {
    return this.deleteResource('documents', documentId);
  }

  // ---- Invoice Finalizations ----

  async finalizeInvoice(attributes: Record<string, any>) {
    return this.createResource('invoice_finalizations', 'invoice_finalizations', attributes);
  }

  // ---- Invoice Revisions ----

  async reviseInvoice(attributes: Record<string, any>) {
    return this.createResource('invoice_revisions', 'invoice_revisions', attributes);
  }

  // ---- Payments ----

  async listPayments(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('payments', options);
  }

  async getPayment(paymentId: string, include?: string[]) {
    return this.getResource('payments', paymentId, { include });
  }

  // ---- Payment Charges ----

  async createPaymentCharge(attributes: Record<string, any>) {
    return this.createResource('payment_charges', 'payment_charges', attributes);
  }

  // ---- Payment Refunds ----

  async createPaymentRefund(attributes: Record<string, any>) {
    return this.createResource('payment_refunds', 'payment_refunds', attributes);
  }

  // ---- Payment Authorizations ----

  async createPaymentAuthorization(attributes: Record<string, any>) {
    return this.createResource('payment_authorizations', 'payment_authorizations', attributes);
  }

  // ---- Locations ----

  async listLocations(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('locations', options);
  }

  async getLocation(locationId: string, include?: string[]) {
    return this.getResource('locations', locationId, { include });
  }

  async createLocation(attributes: Record<string, any>) {
    return this.createResource('locations', 'locations', attributes);
  }

  async updateLocation(locationId: string, attributes: Record<string, any>) {
    return this.updateResource('locations', locationId, 'locations', attributes);
  }

  async archiveLocation(locationId: string) {
    return this.deleteResource('locations', locationId);
  }

  // ---- Coupons ----

  async listCoupons(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('coupons', options);
  }

  async getCoupon(couponId: string, include?: string[]) {
    return this.getResource('coupons', couponId, { include });
  }

  async createCoupon(attributes: Record<string, any>) {
    return this.createResource('coupons', 'coupons', attributes);
  }

  async updateCoupon(couponId: string, attributes: Record<string, any>) {
    return this.updateResource('coupons', couponId, 'coupons', attributes);
  }

  async archiveCoupon(couponId: string) {
    return this.deleteResource('coupons', couponId);
  }

  // ---- Emails ----

  async listEmails(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
    sort?: string;
  }) {
    return this.listResource('emails', options);
  }

  async createEmail(attributes: Record<string, any>) {
    return this.createResource('emails', 'emails', attributes);
  }

  // ---- Tags ----

  async listTags(options?: { pagination?: PaginationParams; filters?: FilterParams }) {
    return this.listResource('tags', options);
  }

  // ---- Notes ----

  async listNotes(options?: { pagination?: PaginationParams; filters?: FilterParams }) {
    return this.listResource('notes', options);
  }

  async createNote(attributes: Record<string, any>) {
    return this.createResource('notes', 'notes', attributes);
  }

  async deleteNote(noteId: string) {
    return this.deleteResource('notes', noteId);
  }

  // ---- Webhook Endpoints ----

  async listWebhookEndpoints(options?: { pagination?: PaginationParams }) {
    return this.listResource('webhook_endpoints', options);
  }

  async createWebhookEndpoint(attributes: Record<string, any>) {
    return this.createResource('webhook_endpoints', 'webhook_endpoints', attributes);
  }

  async updateWebhookEndpoint(webhookEndpointId: string, attributes: Record<string, any>) {
    return this.updateResource(
      'webhook_endpoints',
      webhookEndpointId,
      'webhook_endpoints',
      attributes
    );
  }

  async deleteWebhookEndpoint(webhookEndpointId: string) {
    return this.deleteResource('webhook_endpoints', webhookEndpointId);
  }

  // ---- Inventory / Availability ----

  async listInventoryLevels(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
  }) {
    return this.listResource('inventory_levels', options);
  }

  async listInventoryBreakdowns(options?: {
    pagination?: PaginationParams;
    filters?: FilterParams;
    include?: string[];
  }) {
    return this.listResource('inventory_breakdowns', options);
  }

  // ---- Companies ----

  async getCompany() {
    let response = await this.axios.get('/companies/current');
    return response.data;
  }
}
