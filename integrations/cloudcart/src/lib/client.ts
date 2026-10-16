import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ListOptions {
  pagination?: PaginationParams;
  sort?: string;
  filters?: Record<string, string>;
  include?: string;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, any>;
  relationships?: Record<string, any>;
  links?: Record<string, any>;
}

export interface JsonApiListResponse {
  meta: Record<string, any>;
  links: Record<string, any>;
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

export interface JsonApiSingleResponse {
  data: JsonApiResource;
  included?: JsonApiResource[];
}

export class Client {
  private axios;

  constructor(params: { token: string; domain: string }) {
    if (!params.token.trim()) throw createApiServiceError('A CloudCart API key is required.');
    let domain = params.domain.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(domain)) {
      throw createApiServiceError(
        'Enter the store subdomain only, without a protocol, path, or .cloudcart.net suffix.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${domain}.cloudcart.net/api/v2`,
      timeout: 30_000,
      authHeader: { name: 'X-CloudCart-ApiKey', value: params.token },
      contentType: 'application/vnd.api+json',
      headers: { Accept: 'application/vnd.api+json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CloudCart',
          reason: 'cloudcart_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['title', 'detail', 'message', 'error', 'code'],
          nestedKeys: ['errors'],
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            if (!helpers.isRecord(body)) return undefined;
            let errors = Array.isArray(body.errors) ? body.errors : [];
            for (let item of [body, ...errors]) {
              if (
                helpers.isRecord(item) &&
                (typeof item.code === 'string' || typeof item.code === 'number')
              ) {
                return String(item.code);
              }
            }
            return undefined;
          }
        })
    });
  }

  // ─── Products ──────────────────────────────────────────────────────

  async listProducts(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/products', { params });
    return res.data;
  }

  async getProduct(productId: string, include?: string): Promise<JsonApiSingleResponse> {
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let res = await this.axios.get(this.resourcePath('products', productId), { params });
    return res.data;
  }

  async createProduct(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let body: any = {
      data: {
        type: 'products',
        attributes: this.productAttributes(attributes)
      }
    };
    if (relationships) {
      body.data.relationships = relationships;
    }
    let res = await this.axios.post('/products', body);
    return res.data;
  }

  async updateProduct(
    productId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    this.requireChanges(attributes);
    let res = await this.axios.patch(this.resourcePath('products', productId), {
      data: {
        type: 'products',
        id: productId,
        attributes: this.productAttributes(attributes)
      }
    });
    return res.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(this.resourcePath('products', productId));
  }

  // ─── Variants ──────────────────────────────────────────────────────

  async listVariants(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/variants', { params });
    return res.data;
  }

  async getVariant(variantId: string): Promise<JsonApiSingleResponse> {
    let res = await this.axios.get(this.resourcePath('variants', variantId));
    return res.data;
  }

  async updateVariant(
    variantId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    this.requireChanges(attributes);
    if (
      attributes.quantity !== undefined &&
      (typeof attributes.quantity !== 'number' || !Number.isFinite(attributes.quantity))
    ) {
      throw createApiServiceError(
        'Quantity must be a finite number; fractional quantities are supported.'
      );
    }
    if (typeof attributes.price === 'string' && /^\d+$/.test(attributes.price)) {
      attributes = { ...attributes, price: Number(attributes.price) };
    }
    if (
      attributes.price !== undefined &&
      (typeof attributes.price !== 'number' ||
        !Number.isSafeInteger(attributes.price) ||
        attributes.price < 0)
    ) {
      throw createApiServiceError(
        'Price must be a non-negative integer in minor currency units (5500 means 55.00).'
      );
    }
    let res = await this.axios.patch(this.resourcePath('variants', variantId), {
      data: {
        type: 'variants',
        id: variantId,
        attributes
      }
    });
    return res.data;
  }

  // ─── Orders ────────────────────────────────────────────────────────

  async listOrders(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/orders', { params });
    return res.data;
  }

  async getOrder(orderId: string, include?: string): Promise<JsonApiSingleResponse> {
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let res = await this.axios.get(this.resourcePath('orders', orderId), { params });
    return res.data;
  }

  async updateOrder(
    orderId: string,
    attributes: Record<string, any>,
    meta?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    this.requireChanges(attributes, meta);
    let body: any = {
      data: {
        type: 'orders',
        id: orderId,
        attributes
      }
    };
    if (meta) {
      body.data.meta = meta;
    }
    let res = await this.axios.patch(this.resourcePath('orders', orderId), body);
    return res.data;
  }

  // ─── Customers ─────────────────────────────────────────────────────

  async listCustomers(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/customers', { params });
    return res.data;
  }

  async getCustomer(customerId: string, include?: string): Promise<JsonApiSingleResponse> {
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let res = await this.axios.get(this.resourcePath('customers', customerId), { params });
    return res.data;
  }

  async createCustomer(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let body: any = {
      data: {
        type: 'customers',
        attributes: this.customerAttributes(attributes)
      }
    };
    if (relationships) {
      body.data.relationships = relationships;
    }
    let res = await this.axios.post('/customers', body);
    return res.data;
  }

  async updateCustomer(
    customerId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    this.requireChanges(attributes, relationships);
    let res = await this.axios.patch(this.resourcePath('customers', customerId), {
      data: {
        type: 'customers',
        id: customerId,
        attributes: this.customerAttributes(attributes),
        ...(relationships ? { relationships } : {})
      }
    });
    return res.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axios.delete(this.resourcePath('customers', customerId));
  }

  // ─── Categories ────────────────────────────────────────────────────

  async listCategories(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/categories', { params });
    return res.data;
  }

  async getCategory(categoryId: string, include?: string): Promise<JsonApiSingleResponse> {
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let res = await this.axios.get(this.resourcePath('categories', categoryId), { params });
    return res.data;
  }

  async createCategory(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let body: any = {
      data: {
        type: 'categories',
        attributes
      }
    };
    if (relationships) {
      body.data.relationships = relationships;
    }
    let res = await this.axios.post('/categories', body);
    return res.data;
  }

  async updateCategory(
    categoryId: string,
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    this.requireChanges(attributes, relationships);
    let res = await this.axios.patch(this.resourcePath('categories', categoryId), {
      data: {
        type: 'categories',
        id: categoryId,
        attributes,
        ...(relationships ? { relationships } : {})
      }
    });
    return res.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.axios.delete(this.resourcePath('categories', categoryId));
  }

  async listVendors(opts?: ListOptions): Promise<JsonApiListResponse> {
    let res = await this.axios.get('/vendors', { params: this.buildListParams(opts) });
    return res.data;
  }

  async listCustomerGroups(opts?: ListOptions): Promise<JsonApiListResponse> {
    let res = await this.axios.get('/customer-groups', { params: this.buildListParams(opts) });
    return res.data;
  }

  private resourcePath(type: string, id: string) {
    if (!id.trim()) throw createApiServiceError('A non-empty resource ID is required.');
    return `/${type}/${encodeURIComponent(id)}`;
  }

  private requireChanges(...parts: (Record<string, unknown> | undefined)[]) {
    if (!parts.some(part => part && Object.keys(part).length > 0)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
  }

  private productAttributes(attributes: Record<string, any>) {
    let result = { ...attributes };
    for (let key of ['active', 'draft', 'digital', 'shipping', 'sale', 'tracking']) {
      if (typeof result[key] === 'boolean') result[key] = result[key] ? 'yes' : 'no';
    }
    if (typeof result.featured === 'boolean') result.featured = result.featured ? 1 : 0;
    return result;
  }

  private customerAttributes(attributes: Record<string, any>) {
    let result = { ...attributes };
    for (let key of ['newsletter', 'marketing', 'banned']) {
      if (typeof result[key] === 'boolean') result[key] = result[key] ? 'yes' : 'no';
    }
    if (typeof result.active === 'boolean') result.active = result.active ? 1 : 0;
    return result;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private buildListParams(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Record<string, string | number> {
    let params: Record<string, string | number> = {};

    if (opts?.pagination?.pageNumber !== undefined) {
      if (
        !Number.isSafeInteger(opts.pagination.pageNumber) ||
        opts.pagination.pageNumber < 1
      ) {
        throw createApiServiceError('Page number must be a positive integer.');
      }
      params['page[number]'] = opts.pagination.pageNumber;
    }
    if (opts?.pagination?.pageSize !== undefined) {
      if (
        !Number.isInteger(opts.pagination.pageSize) ||
        opts.pagination.pageSize < 1 ||
        opts.pagination.pageSize > 100
      ) {
        throw createApiServiceError('Page size must be an integer between 1 and 100.');
      }
      params['page[size]'] = opts.pagination.pageSize;
    }
    if (opts?.sort) {
      params.sort = opts.sort;
    }
    if (opts?.filters) {
      for (let [key, value] of Object.entries(opts.filters)) {
        params[`filter[${key}]`] = value;
      }
    }
    if (opts?.include) {
      params.include = opts.include;
    }

    return params;
  }
}
