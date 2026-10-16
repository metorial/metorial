import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface PaginationParams {
  pageIndex?: number;
  pageSize?: number;
  orderBy?: string;
  query?: string;
}

export interface ListCustomersParams extends PaginationParams {
  email?: string;
}

export interface ListInvoicesParams extends PaginationParams {
  sortBy?: string;
  sortDirection?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
  status?: string;
  includeCanceled?: boolean;
  cancelled?: 'Only' | 'Excluded' | 'All';
  processed?: 'Only' | 'Excluded' | 'All';
}

export interface ListProductsParams extends PaginationParams {
  productNumber?: string;
  familyId?: string;
}

export interface MarkAsPaidParams {
  invoiceId: number;
  date: string;
  paymentMethod: string;
  metadata?: Record<string, unknown>;
  amount?: number;
  paymentReference?: string;
  allowUpdate?: boolean;
  finalizationDate?: string;
  dateAdjustment?: 'None' | 'MinimumDate' | 'Today';
}

export let requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Altoviz returned an invalid ${label}; expected an object.`);
  }
  return value;
};

export let requireNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Altoviz returned an invalid ${label}; expected a number.`);
  }
  return value;
};

export let requireBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') {
    throw createApiServiceError(`Altoviz returned an invalid ${label}; expected a boolean.`);
  }
  return value;
};

let requireEntity = (value: unknown, label: string) => {
  let entity = requireRecord(value, label);
  requireNumber(entity.id, `${label} ID`);
  return entity;
};

let findErrorCode = (value: unknown): string | undefined => {
  if (!isApiErrorRecord(value)) return undefined;
  for (let key of ['code', 'errorCode', 'Code']) {
    let code = value[key];
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }
  for (let nested of Object.values(value)) {
    for (let item of Array.isArray(nested) ? nested : [nested]) {
      let code = findErrorCode(item);
      if (code) return code;
    }
  }
  return undefined;
};

let mapDocument = (data: Record<string, any>) => {
  let { lines, ...document } = data;
  return pickDefined({
    ...document,
    lines: lines?.map((line: Record<string, any>) => {
      let { unitPrice, vatId, discount, discountType, unit, ...fields } = line;
      return pickDefined({
        ...fields,
        taxExcludedPrice: fields.taxExcludedPrice ?? unitPrice,
        vat: vatId === undefined ? undefined : { id: vatId },
        discount:
          discount === undefined
            ? undefined
            : { type: discountType ?? 'Percent', value: discount },
        unit: unit === undefined ? undefined : { code: unit }
      });
    })
  });
};

let mapProduct = (data: Record<string, any>) => {
  let { salePrice, vatId, unitCode, ...fields } = data;
  return pickDefined({
    ...fields,
    taxExcludedPrice: fields.taxExcludedPrice ?? salePrice,
    vat: vatId === undefined ? undefined : { id: vatId },
    unit: unitCode === undefined ? undefined : { code: unitCode }
  });
};

let mapSupplier = (data: Record<string, any>) => {
  let { companyName, ...fields } = data;
  return pickDefined({ ...fields, name: fields.name ?? companyName });
};

let mapReceipt = (data: Record<string, any>) => {
  let { description, supplierId, ...fields } = data;
  if (supplierId !== undefined) {
    throw createApiServiceError(
      'Altoviz receipts record customer payments, not supplier payments. Use customerId for a customer receipt; supplierId is not supported by the receipts API.'
    );
  }
  return pickDefined({ ...fields, notes: fields.notes ?? description });
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('An Altoviz API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.altoviz.com/v1',
      authHeader: { name: 'X-API-KEY', value: config.token },
      timeout: 30_000
    });
  }

  private async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    return requestAxiosData(
      `${method} ${path}`,
      () => this.axios.request<T>({ method, url: path, data, params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Altoviz',
          reason: 'altoviz_api_error',
          operation,
          detailKeys: [
            'message',
            'detail',
            'title',
            'error',
            'error_description',
            'code',
            'errorCode'
          ],
          nestedKeys: ['errors', 'error'],
          extractResponse: (source, helpers) => helpers.getResponseWithBody(source),
          extractMessage: (source, helpers) => {
            let body = helpers.getResponseWithBody(source)?.data;
            let details: string[] = [];
            let collect = (value: unknown) => {
              helpers.collectDetails(value, details, {
                detailKeys: ['message', 'detail', 'title', 'error', 'code', 'errorCode'],
                nestedKeys: ['errors', 'error']
              });
              if (isApiErrorRecord(value)) {
                for (let key of ['errors', 'error']) {
                  if (isApiErrorRecord(value[key])) {
                    for (let nested of Object.values(value[key])) collect(nested);
                  }
                }
              }
            };
            collect(body);
            return details.length ? details.join(' - ') : undefined;
          },
          extractUpstreamCode: (_source, response) => findErrorCode(response?.data)
        })
    );
  }

  private async entity(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    return requireEntity(await this.request(method, path, data, params), path);
  }

  private async list(path: string, params?: Record<string, unknown>) {
    let result = await this.request('GET', path, undefined, params);
    if (!Array.isArray(result)) {
      throw createApiServiceError(
        `Altoviz returned an invalid ${path} list; expected an array.`
      );
    }
    return result.map(value => requireEntity(value, path));
  }

  private pagination(params?: PaginationParams): Record<string, unknown> {
    return pickDefined({
      PageIndex: params?.pageIndex,
      PageSize: params?.pageSize,
      OrderBy: params?.orderBy,
      query: params?.query
    });
  }

  async getCurrentUser() {
    return requireRecord(await this.request('GET', '/Users/me'), 'current user');
  }
  async getSettings() {
    return requireRecord(await this.request('GET', '/Settings'), 'settings');
  }
  async getVatRates() {
    return this.list('/Vats');
  }
  async getClassifications() {
    return this.list('/Classifications');
  }
  async getUnits() {
    let result = await this.request('GET', '/Units');
    if (!Array.isArray(result))
      throw createApiServiceError('Altoviz returned an invalid units list.');
    return result.map(value => requireRecord(value, 'unit'));
  }

  async listCustomers(params?: ListCustomersParams) {
    if (params?.email !== undefined) return this.getCustomerByEmail(params.email);
    return this.list('/Customers', this.pagination(params));
  }
  async getCustomer(id: number) {
    return this.entity('GET', `/Customers/${id}`);
  }
  async getCustomerByInternalId(id: string) {
    return this.entity('GET', `/Customers/GetByInternalId/${encodeURIComponent(id)}`);
  }
  async getCustomerByEmail(email: string) {
    return this.list('/Customers/Find', { email });
  }
  async createCustomer(data: Record<string, unknown>) {
    return this.entity('POST', '/Customers', data);
  }
  async updateCustomer(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/Customers/${id}`, data);
  }
  async deleteCustomer(id: number) {
    await this.request('DELETE', `/Customers/${id}`);
  }

  async listContacts(params?: PaginationParams) {
    return this.list('/Contacts', this.pagination(params));
  }
  async getContact(id: number) {
    return this.entity('GET', `/Contacts/${id}`);
  }
  async createContact(data: Record<string, unknown>) {
    return this.entity('POST', '/Contacts', data);
  }
  async updateContact(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/Contacts/${id}`, data);
  }
  async deleteContact(id: number) {
    await this.request('DELETE', `/Contacts/${id}`);
  }

  async listSaleInvoices(params?: ListInvoicesParams) {
    let orderBy = params?.orderBy;
    if (!orderBy && params?.sortBy) {
      let direction = params.sortDirection?.toLowerCase();
      if (direction && direction !== 'asc' && direction !== 'desc') {
        throw createApiServiceError('sortDirection must be asc or desc.');
      }
      orderBy = `${params.sortBy}${direction ? ` ${direction}` : ''}`;
    }
    return this.list('/SalesInvoices', {
      ...this.pagination({ ...params, orderBy }),
      ...pickDefined({
        From: params?.dateFrom,
        To: params?.dateTo,
        CustomerId: params?.customerId,
        Status: params?.status,
        Cancelled:
          params?.cancelled ??
          (params?.includeCanceled === undefined
            ? undefined
            : params.includeCanceled
              ? 'All'
              : 'Excluded'),
        Processed: params?.processed
      })
    });
  }
  async getSaleInvoice(id: number) {
    return this.entity('GET', `/SalesInvoices/${id}`);
  }
  async createSaleInvoice(data: Record<string, unknown>) {
    return this.entity('POST', '/SalesInvoices', mapDocument(data));
  }
  async updateSaleInvoice(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/SalesInvoices/${id}`, mapDocument(data));
  }
  async deleteSaleInvoice(id: number) {
    await this.request('DELETE', `/SalesInvoices/${id}`);
  }
  async finalizeSaleInvoice(
    id: number,
    params?: { finalizationDate?: string; dateAdjustment?: string }
  ) {
    return this.entity(
      'POST',
      `/SalesInvoices/Finalize/${id}`,
      undefined,
      pickDefined(params ?? {})
    );
  }
  async markSaleInvoiceAsPaid(params: MarkAsPaidParams) {
    let paymentMethod =
      ({ BankTransfer: 'Transfer', CreditCard: 'Card' } as Record<string, string>)[
        params.paymentMethod
      ] ?? params.paymentMethod;
    return this.entity(
      'POST',
      '/SalesInvoices/MarkAsPaid',
      pickDefined({ ...params, paymentMethod, finalizeInvoice: true })
    );
  }
  async sendSaleInvoiceByEmail(id: number, recipients?: string[]) {
    await this.request('POST', `/SalesInvoices/Send/${id}`, recipients);
  }

  async listSaleQuotes(params?: PaginationParams) {
    return this.list('/SalesQuotes', this.pagination(params));
  }
  async getSaleQuote(id: number) {
    return this.entity('GET', `/SalesQuotes/${id}`);
  }
  async createSaleQuote(data: Record<string, unknown>) {
    return this.entity('POST', '/SalesQuotes', mapDocument(data));
  }
  // Retain the existing route: the current OpenAPI does not document quote updates.
  async updateSaleQuote(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/SaleQuotes/${id}`, mapDocument(data));
  }
  async deleteSaleQuote(id: number) {
    await this.request('DELETE', `/SalesQuotes/${id}`);
  }
  async sendSaleQuoteByEmail(id: number, recipients?: string[]) {
    await this.request('POST', `/SalesQuotes/Send/${id}`, recipients);
  }

  async listSaleCredits(params?: PaginationParams) {
    return this.list('/SalesCredits', this.pagination(params));
  }
  async getSaleCredit(id: number) {
    return this.entity('GET', `/SalesCredits/${id}`);
  }
  async createSaleCredit(data: Record<string, unknown>) {
    return this.entity('POST', '/SalesCredits', mapDocument(data));
  }
  async updateSaleCredit(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/SalesCredits/${id}`, mapDocument(data));
  }
  async deleteSaleCredit(id: number) {
    await this.request('DELETE', `/SalesCredits/${id}`);
  }

  async listProducts(params?: ListProductsParams) {
    if (params?.productNumber !== undefined) return this.findProduct(params.productNumber);
    return this.list('/Products', {
      ...this.pagination(params),
      ...pickDefined({ familyId: params?.familyId })
    });
  }
  async getProduct(id: number) {
    return this.entity('GET', `/Products/${id}`);
  }
  async findProduct(number: string) {
    return this.list('/Products/Find', { number });
  }
  async createProduct(data: Record<string, unknown>) {
    return this.entity('POST', '/Products', mapProduct(data));
  }
  async updateProduct(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/Products/${id}`, mapProduct(data));
  }
  async deleteProduct(id: number) {
    await this.request('DELETE', `/Products/${id}`);
  }

  async listSuppliers(params?: PaginationParams) {
    return this.list('/Suppliers', this.pagination(params));
  }
  async getSupplier(id: number) {
    return this.entity('GET', `/Suppliers/${id}`);
  }
  async createSupplier(data: Record<string, unknown>) {
    return this.entity('POST', '/Suppliers', mapSupplier(data));
  }
  async updateSupplier(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/Suppliers/${id}`, mapSupplier(data));
  }
  async deleteSupplier(id: number) {
    await this.request('DELETE', `/Suppliers/${id}`);
  }

  async listReceipts(params?: PaginationParams) {
    return this.list('/Receipts', this.pagination(params));
  }
  async getReceipt(id: number) {
    return this.entity('GET', `/Receipts/${id}`);
  }
  async createReceipt(data: Record<string, unknown>) {
    return this.entity('POST', '/Receipts', mapReceipt(data));
  }
  async updateReceipt(id: number, data: Record<string, unknown>) {
    return this.entity('PUT', `/Receipts/${id}`, mapReceipt(data));
  }
  async deleteReceipt(id: number) {
    await this.request('DELETE', `/Receipts/${id}`);
  }
}
