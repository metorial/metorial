import { createAxios } from 'slates';

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  from: number;
  to: number;
  total: number;
  lastPage: number;
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
    this.axios = createAxios({
      baseURL: `https://${params.domain}.cloudcart.net/api/v2`,
      headers: {
        'X-CloudCart-ApiKey': params.token,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      }
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
    let res = await this.axios.get(`/products/${productId}`, { params });
    return res.data;
  }

  async createProduct(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let body: any = {
      data: {
        type: 'products',
        attributes
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
    let res = await this.axios.patch(`/products/${productId}`, {
      data: {
        type: 'products',
        id: productId,
        attributes
      }
    });
    return res.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}`);
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
    let res = await this.axios.get(`/variants/${variantId}`);
    return res.data;
  }

  async updateVariant(
    variantId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let res = await this.axios.patch(`/variants/${variantId}`, {
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
    let res = await this.axios.get(`/orders/${orderId}`, { params });
    return res.data;
  }

  async updateOrder(
    orderId: string,
    attributes: Record<string, any>,
    meta?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
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
    let res = await this.axios.patch(`/orders/${orderId}`, body);
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
    let res = await this.axios.get(`/customers/${customerId}`, { params });
    return res.data;
  }

  async createCustomer(
    attributes: Record<string, any>,
    relationships?: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let body: any = {
      data: {
        type: 'customers',
        attributes
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
    attributes: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let res = await this.axios.patch(`/customers/${customerId}`, {
      data: {
        type: 'customers',
        id: customerId,
        attributes
      }
    });
    return res.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axios.delete(`/customers/${customerId}`);
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
    let res = await this.axios.get(`/categories/${categoryId}`, { params });
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
    attributes: Record<string, any>
  ): Promise<JsonApiSingleResponse> {
    let res = await this.axios.patch(`/categories/${categoryId}`, {
      data: {
        type: 'categories',
        id: categoryId,
        attributes
      }
    });
    return res.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.axios.delete(`/categories/${categoryId}`);
  }

  // ─── Webhooks ──────────────────────────────────────────────────────

  async listWebhooks(opts?: { pagination?: PaginationParams }): Promise<JsonApiListResponse> {
    let params = this.buildListParams(opts);
    let res = await this.axios.get('/webhooks', { params });
    return res.data;
  }

  async createWebhook(attributes: {
    url: string;
    event: string;
    request_headers?: Record<string, string>;
    new_version?: number;
  }): Promise<JsonApiSingleResponse> {
    let res = await this.axios.post('/webhooks', {
      data: {
        type: 'webhooks',
        attributes
      }
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private buildListParams(opts?: {
    pagination?: PaginationParams;
    sort?: string;
    filters?: Record<string, string>;
    include?: string;
  }): Record<string, string | number> {
    let params: Record<string, string | number> = {};

    if (opts?.pagination?.pageNumber) {
      params['page[number]'] = opts.pagination.pageNumber;
    }
    if (opts?.pagination?.pageSize) {
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
