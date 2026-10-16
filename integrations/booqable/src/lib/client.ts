import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface BooqableClientConfig {
  token: string;
  companySlug: string;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

type ResourceOptions = {
  pagination?: PaginationParams;
  filters?: FilterParams;
  include?: string[];
  sort?: string;
};

export let normalizeCompanySlug = (value: string) => {
  let slug = value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw createApiServiceError('Enter the company slug from your Booqable account URL.');
  }
  return slug;
};

export let validateNumber = (
  value: number | undefined,
  name: string,
  options: { integer?: boolean; min?: number; max?: number } = {}
) => {
  if (value === undefined) return;
  if (
    !Number.isFinite(value) ||
    (options.integer && !Number.isSafeInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw createApiServiceError(
      `${name} must be ${options.integer ? 'a whole number' : 'a finite number'}${options.min !== undefined ? ` at least ${options.min}` : ''}${options.max !== undefined ? ` and at most ${options.max}` : ''}.`
    );
  }
};

export let requireValue = (value: string | undefined, name: string) => {
  if (!value?.trim()) throw createApiServiceError(`${name} is required.`);
  return value;
};

export let validatePeriod = (from?: string, till?: string) => {
  for (let [name, value] of [
    ['Start date', from],
    ['End date', till]
  ]) {
    if (value !== undefined && !Number.isFinite(Date.parse(value))) {
      throw createApiServiceError(`${name} must be a valid ISO 8601 date/time.`);
    }
  }
  if (from && till && Date.parse(from) >= Date.parse(till)) {
    throw createApiServiceError('The end date must be after the start date.');
  }
};

let findErrorCode = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    for (let item of value) {
      let code = findErrorCode(item);
      if (code) return code;
    }
  } else if (isApiErrorRecord(value)) {
    if (typeof value.code === 'string' || typeof value.code === 'number') {
      return String(value.code);
    }
    return findErrorCode(value.errors) ?? findErrorCode(value.error);
  }
  return undefined;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: BooqableClientConfig) {
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${normalizeCompanySlug(config.companySlug)}.booqable.com/api/4`,
      authHeader: { value: `Bearer ${requireValue(config.token, 'Access token')}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Booqable',
          reason: 'booqable_api_error',
          detailKeys: ['message', 'detail', 'title', 'code', 'error_description'],
          nestedKeys: ['errors', 'error'],
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response) => findErrorCode(response?.data)
        })
    });
  }

  private buildQueryParams(options?: ResourceOptions): Record<string, string | string[]> {
    validateNumber(options?.pagination?.pageNumber, 'Page number', { integer: true, min: 1 });
    validateNumber(options?.pagination?.pageSize, 'Page size', {
      integer: true,
      min: 1,
      max: 100
    });
    let params: Record<string, string | string[]> = {};
    if (options?.pagination?.pageNumber !== undefined) {
      params['page[number]'] = String(options.pagination.pageNumber);
    }
    if (options?.pagination?.pageSize !== undefined) {
      params['page[size]'] = String(options.pagination.pageSize);
    }
    for (let [key, value] of Object.entries(options?.filters ?? {})) {
      if (value !== undefined) {
        let [field, ...operators] = key.split('[');
        let suffix = operators.length ? `[${operators.join('[')}` : '';
        params[`filter[${field}]${suffix}`] = Array.isArray(value) ? value : String(value);
      }
    }
    if (options?.include?.length) params.include = options.include.join(',');
    if (options?.sort) params.sort = options.sort;
    return params;
  }

  async listResource(resource: string, options?: ResourceOptions): Promise<any> {
    let params = this.buildQueryParams(options);
    params['meta[total][]'] = 'count';
    let response = await this.axios.get(`/${resource}`, { params });
    return response.data;
  }

  async getResource(
    resource: string,
    resourceId: string,
    options?: { include?: string[] }
  ): Promise<any> {
    requireValue(resourceId, 'Resource ID');
    let response = await this.axios.get(`/${resource}/${encodeURIComponent(resourceId)}`, {
      params: this.buildQueryParams({ include: options?.include })
    });
    return response.data;
  }

  async createResource(
    resource: string,
    type: string,
    attributes: Record<string, unknown>
  ): Promise<any> {
    let response = await this.axios.post(`/${resource}`, { data: { type, attributes } });
    return response.data;
  }

  async updateResource(
    resource: string,
    resourceId: string,
    type: string,
    attributes: Record<string, unknown>
  ): Promise<any> {
    requireValue(resourceId, 'Resource ID');
    if (!Object.keys(attributes).length)
      throw createApiServiceError('Provide at least one field to update.');
    let response = await this.axios.put(`/${resource}/${encodeURIComponent(resourceId)}`, {
      data: { id: resourceId, type, attributes }
    });
    return response.data;
  }

  async deleteResource(resource: string, resourceId: string): Promise<void> {
    requireValue(resourceId, 'Resource ID');
    await this.axios.delete(`/${resource}/${encodeURIComponent(resourceId)}`);
  }

  listCustomers(options?: ResourceOptions) {
    return this.listResource('customers', options);
  }
  getCustomer(id: string, include?: string[]) {
    return this.getResource('customers', id, { include });
  }
  createCustomer(attributes: Record<string, unknown>) {
    return this.createResource('customers', 'customers', attributes);
  }
  updateCustomer(id: string, attributes: Record<string, unknown>) {
    return this.updateResource('customers', id, 'customers', attributes);
  }
  archiveCustomer(id: string) {
    return this.deleteResource('customers', id);
  }
  listOrders(options?: ResourceOptions) {
    return this.listResource('orders', options);
  }
  getOrder(id: string, include?: string[]) {
    return this.getResource('orders', id, { include });
  }
  createOrder(attributes: Record<string, unknown>) {
    return this.createResource('orders', 'orders', attributes);
  }
  updateOrder(id: string, attributes: Record<string, unknown>) {
    return this.updateResource('orders', id, 'orders', attributes);
  }
  listProductGroups(options?: ResourceOptions) {
    return this.listResource('product_groups', options);
  }
  getProductGroup(id: string, include?: string[]) {
    return this.getResource('product_groups', id, { include });
  }
  createProductGroup(attributes: Record<string, unknown>) {
    return this.createResource('product_groups', 'product_groups', attributes);
  }
  updateProductGroup(id: string, attributes: Record<string, unknown>) {
    return this.updateResource('product_groups', id, 'product_groups', attributes);
  }
  listStockItems(options?: ResourceOptions) {
    return this.listResource('stock_items', options);
  }
  createStockItem(attributes: Record<string, unknown>) {
    return this.createResource('stock_items', 'stock_items', attributes);
  }
  updateStockItem(id: string, attributes: Record<string, unknown>) {
    return this.updateResource('stock_items', id, 'stock_items', attributes);
  }
  listDocuments(options?: ResourceOptions) {
    return this.listResource('documents', options);
  }
  getDocument(id: string, include?: string[]) {
    return this.getResource('documents', id, { include });
  }
  listPayments(options?: ResourceOptions) {
    return this.listResource('payments', options);
  }
  createPaymentCharge(attributes: Record<string, unknown>) {
    return this.createResource('payment_charges', 'payment_charges', attributes);
  }
  createPaymentRefund(attributes: Record<string, unknown>) {
    return this.createResource('payment_refunds', 'payment_refunds', attributes);
  }
  createPaymentAuthorization(attributes: Record<string, unknown>) {
    return this.createResource('payment_authorizations', 'payment_authorizations', attributes);
  }
  listLocations(options?: ResourceOptions) {
    return this.listResource('locations', options);
  }
  listCoupons(options?: ResourceOptions) {
    return this.listResource('coupons', options);
  }
  createCoupon(attributes: Record<string, unknown>) {
    return this.createResource('coupons', 'coupons', attributes);
  }
  updateCoupon(id: string, attributes: Record<string, unknown>) {
    return this.updateResource('coupons', id, 'coupons', attributes);
  }
  archiveCoupon(id: string) {
    return this.deleteResource('coupons', id);
  }
  createEmail(attributes: Record<string, unknown>) {
    return this.createResource('emails', 'emails', attributes);
  }
  listInventoryLevels(options?: ResourceOptions) {
    return this.listResource('inventory_levels', options);
  }
  getCompany() {
    return this.getResource('companies', 'current');
  }
}
