import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorResponseWithBody,
  getBase64ByteLength,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export let requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`Finmei returned an invalid ${label}; expected an object.`);
  return value;
};

export let requireId = (value: unknown, label: string): string => {
  if (
    (typeof value !== 'string' || !value.trim()) &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw createApiServiceError(
      `Finmei returned an invalid ${label}; expected an identifier.`
    );
  }
  return String(value);
};

export let readEntity = (result: unknown, label: string) => {
  let envelope = requireRecord(result, label);
  let entity = requireRecord('data' in envelope ? envelope.data : envelope, label);
  requireId(entity.id, `${label} ID`);
  return entity;
};

export let readList = (result: unknown, key: string): Record<string, any>[] => {
  let values = Array.isArray(result)
    ? result
    : isApiErrorRecord(result)
      ? (result.data ?? result[key])
      : undefined;
  if (!Array.isArray(values))
    throw createApiServiceError(`Finmei returned an invalid ${key} list; expected an array.`);
  return values.map(value => requireRecord(value, `${key} item`));
};

export let optionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string')
    throw createApiServiceError(`Finmei returned an invalid ${label}; expected text.`);
  return value;
};

export let optionalNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError(`Finmei returned an invalid ${label}; expected a number.`);
  return value;
};

export let optionalTimestamp = (value: unknown, label: string): string | undefined => {
  if (typeof value === 'number') {
    let date = new Date(value * 1000);
    if (!Number.isFinite(date.getTime()))
      throw createApiServiceError(`Finmei returned an invalid ${label}.`);
    return date.toISOString();
  }
  return optionalString(value, label);
};

export let pagination = (result: unknown) => {
  if (Array.isArray(result)) return {};
  let body = requireRecord(result, 'pagination response');
  let meta = body.meta === undefined ? {} : requireRecord(body.meta, 'pagination metadata');
  return pickDefined({
    total: optionalNumber(body.total ?? meta.total, 'total'),
    page: optionalNumber(body.page ?? meta.current_page, 'page'),
    totalPages: optionalNumber(body.total_pages ?? meta.last_page, 'total pages')
  });
};

export let validatePagination = (params: Record<string, unknown> | undefined) => {
  for (let key of ['page', 'per_page', 'limit', 'offset']) {
    let value = params?.[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < (key === 'offset' ? 0 : 1))
    ) {
      throw createApiServiceError(
        `${key} must be ${key === 'offset' ? 'a nonnegative' : 'a positive'} integer.`
      );
    }
  }
};

export interface ExpenseFile {
  base64: string;
  filename: string;
  mimeType?: string;
}

let fileForm = (file: ExpenseFile) => {
  let encoded = file.base64.replace(/\s/g, '');
  if (
    !file.filename.trim() ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ||
    encoded.length % 4 !== 0 ||
    !getBase64ByteLength(encoded)
  ) {
    throw createApiServiceError(
      'Provide a filename and valid nonempty base64 PDF or image content.'
    );
  }
  let form = new FormData();
  form.set(
    'file',
    new Blob([Buffer.from(encoded, 'base64')], {
      type: file.mimeType ?? 'application/octet-stream'
    }),
    file.filename
  );
  return form;
};

export class FinmeiClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private token: string) {
    if (!token.trim()) throw createApiServiceError('A Finmei API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.finmei.com/api',
      authHeader: { value: `Bearer ${token}` },
      contentType: false,
      timeout: 30_000,
      headers: { Accept: 'application/json' }
    });
  }

  private async request<T = any>(
    method: string,
    url: string,
    options?: {
      data?: any;
      params?: Record<string, any>;
    }
  ): Promise<T> {
    validatePagination(options?.params);
    return requestAxiosData<T>(
      `${method} ${url}`,
      () =>
        this.axios.request({
          method,
          url,
          data: options?.data,
          params: options?.params
        }),
      (error, operation) => {
        let scrub = (text: string) => text.split(this.token).join('[redacted]');
        let response = getApiErrorResponseWithBody(error);
        let safeError = {
          response: response
            ? {
                ...response,
                statusText: response.statusText ? scrub(response.statusText) : undefined,
                data: response.data
              }
            : undefined,
          message: error instanceof Error ? scrub(error.message) : 'Request failed'
        };
        return buildApiServiceError(error, {
          providerLabel: 'Finmei',
          reason: 'finmei_api_error',
          operation,
          extractResponse: () => safeError.response,
          extractMessage: (_source, helpers) => {
            let details: string[] = [];
            helpers.collectDetails(response?.data, details);
            if (isApiErrorRecord(response?.data) && isApiErrorRecord(response.data.errors)) {
              for (let [field, messages] of Object.entries(response.data.errors)) {
                let fieldDetails: string[] = [];
                helpers.collectDetails(messages, fieldDetails);
                if (fieldDetails.length) details.push(`${field}: ${fieldDetails.join(', ')}`);
              }
            }
            return scrub(details.length ? details.join(' - ') : safeError.message);
          },
          parent: safeError,
          formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
            scrub(`${providerLabel} API ${operation} failed: ${statusLabel}${message}`)
        });
      }
    );
  }

  downloadUrl(kind: 'invoices' | 'expenses', id: string) {
    return `https://app.finmei.com/api/${kind}/${this.pathId(id)}/download`;
  }

  private pathId(id: string) {
    if (!id.trim())
      throw createApiServiceError(
        'Provide a nonempty resource ID from the matching list tool.'
      );
    return encodeURIComponent(id);
  }

  // ========== Profile ==========

  async getProfile(): Promise<any> {
    return this.request('GET', '/profile');
  }

  // ========== Invoices ==========

  async listInvoices(params?: { page?: number; per_page?: number }): Promise<any> {
    return this.request('GET', '/invoices', { params });
  }

  async createInvoice(data: {
    type?: string;
    invoice_date?: string;
    series?: string;
    currency?: string;
    use_default_seller_info?: boolean;
    buyer?: Record<string, any>;
    products?: Record<string, any>[];
    notes?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/invoices', { data });
  }

  async updateInvoice(invoiceId: string, data: Record<string, unknown>): Promise<any> {
    return this.request('PUT', `/invoices/${this.pathId(invoiceId)}`, { data });
  }

  async deleteInvoice(invoiceId: string): Promise<any> {
    return this.request('DELETE', `/invoices/${this.pathId(invoiceId)}`);
  }

  // ========== Customers ==========

  async listCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
  }): Promise<any> {
    return this.request('GET', '/customers', { params });
  }

  async updateCustomer(
    customerId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<any> {
    return this.request('PUT', `/customers/${this.pathId(customerId)}`, { data });
  }

  async deleteCustomer(customerId: string): Promise<any> {
    return this.request('DELETE', `/customers/${this.pathId(customerId)}`);
  }

  // ========== Products ==========

  async listProducts(params?: {
    page?: number;
    per_page?: number;
    name?: string;
    status?: string;
  }): Promise<any> {
    return this.request('GET', '/products', { params });
  }

  async getProduct(productId: string): Promise<any> {
    return this.request('GET', `/products/${this.pathId(productId)}`);
  }

  async createProduct(data: {
    name: string;
    price?: number;
    currency?: string;
    description?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/products', { data });
  }

  async updateProduct(
    productId: string,
    data: {
      name?: string;
      price?: number;
      currency?: string;
      description?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    return this.request('PUT', `/products/${this.pathId(productId)}`, { data });
  }

  async deleteProduct(productId: string): Promise<any> {
    return this.request('DELETE', `/products/${this.pathId(productId)}`);
  }

  // ========== Payments ==========

  async listPayments(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    return this.request('GET', '/payments', { params });
  }

  async getPayment(paymentId: string): Promise<any> {
    return this.request('GET', `/payments/${this.pathId(paymentId)}`);
  }

  async createPayment(data: {
    invoice_id?: string;
    amount?: number;
    date?: string;
    mode?: string;
    reference?: string;
    notes?: string;
    [key: string]: any;
  }): Promise<any> {
    return this.request('POST', '/payments', { data });
  }

  async deletePayment(paymentId: string): Promise<any> {
    return this.request('DELETE', `/payments/${this.pathId(paymentId)}`);
  }

  // ========== Expenses ==========

  async listExpenses(params?: { page?: number; per_page?: number }): Promise<any> {
    return this.request('GET', '/expenses', { params });
  }

  async getInvoice(invoiceId: string): Promise<any> {
    return this.request('GET', `/invoices/${this.pathId(invoiceId)}`);
  }

  async getExpense(expenseId: string): Promise<any> {
    return this.request('GET', `/expenses/${this.pathId(expenseId)}`);
  }

  async createExpense(
    data: { date: string; total: number; currency: string; seller: string },
    file: ExpenseFile
  ): Promise<any> {
    let form = fileForm(file);
    for (let [key, value] of Object.entries(pickDefined(data))) form.set(key, String(value));
    return this.request('POST', '/expenses', { data: form });
  }

  async updateExpense(
    expenseId: string,
    data: { date: string; total: number; currency: string; seller: string }
  ): Promise<any> {
    return this.request('PUT', `/expenses/${this.pathId(expenseId)}`, { data });
  }

  async updateExpenseFile(expenseId: string, file: ExpenseFile): Promise<any> {
    return this.request('POST', `/expenses/${this.pathId(expenseId)}/file`, {
      data: fileForm(file)
    });
  }

  async deleteExpense(expenseId: string): Promise<any> {
    return this.request('DELETE', `/expenses/${this.pathId(expenseId)}`);
  }

  // ========== Currencies ==========

  async listCurrencies(): Promise<any> {
    return this.request('GET', '/currencies');
  }
}
