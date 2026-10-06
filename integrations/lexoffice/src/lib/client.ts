import { createAuthenticatedAxios, pickDefined } from 'slates';
import type { z } from 'zod';
import {
  actionSchema,
  articleSchema,
  contactSchema,
  pageSchema,
  paymentSchema,
  profileSchema,
  references,
  salesSchema,
  voucherListSchema,
  voucherSchema
} from './schemas';
import {
  apiError,
  dateOnly,
  exact,
  fail,
  integer,
  pageParams,
  parse,
  parseJsonMoney,
  pathId,
  required,
  searchText
} from './validation';

export const BASE_URL = 'https://api.lexware.io/v1';
export const resourcePaths = {
  contact: 'contacts',
  invoice: 'invoices',
  quotation: 'quotations',
  credit_note: 'credit-notes',
  order_confirmation: 'order-confirmations',
  article: 'articles',
  voucher: 'vouchers'
} as const;
export type ResourceType = keyof typeof resourcePaths;
export type ReferenceType = keyof typeof references;
type Filters = {
  page?: number;
  size?: number;
  [key: string]: string | number | boolean | undefined;
};
type SalesOptions = { finalize?: boolean; precedingSalesVoucherId?: string };

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(params: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${required(params.token, 'Connection token')}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      transformResponse: [parseJsonMoney],
      errorAdapter: apiError
    });
  }
  private async get<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: Filters
  ): Promise<z.output<S>> {
    const response = await this.http.get<unknown>(path, {
      params: params ? pickDefined(params) : undefined
    });
    return parse(schema, response.data);
  }
  private async write(
    path: string,
    data: unknown,
    method: 'post' | 'put',
    params?: SalesOptions
  ) {
    try {
      const response = await this.http[method]<unknown>(path, data, {
        params: params ? pickDefined(params) : undefined
      });
      return parse(actionSchema, response.data);
    } catch (error) {
      const safe = apiError(error);
      safe.data.operationOutcome = 'unconfirmed';
      throw safe;
    }
  }
  async getProfile() {
    return this.get('/profile', profileSchema);
  }
  async createContact(data: unknown) {
    return this.write('/contacts', data, 'post');
  }
  async getContact(id: string) {
    const value = await this.get(`/contacts/${pathId(id)}`, contactSchema);
    exact(value.id, id);
    return value;
  }
  async updateContact(id: string, data: unknown) {
    const value = await this.write(`/contacts/${pathId(id)}`, data, 'put');
    exact(value.id, id);
    return value;
  }
  async listContacts(filters: Filters = {}) {
    pageParams(filters);
    integer(typeof filters.number === 'number' ? filters.number : undefined, 'number');
    return this.get('/contacts', pageSchema(contactSchema), {
      ...filters,
      name: searchText(typeof filters.name === 'string' ? filters.name : undefined)
    });
  }
  async createInvoice(data: unknown, options?: SalesOptions) {
    return this.createSales('invoice', data, options);
  }
  async createCreditNote(data: unknown, options?: SalesOptions) {
    return this.createSales('credit_note', data, options);
  }
  async createQuotation(data: unknown, options?: SalesOptions) {
    return this.createSales('quotation', data, options);
  }
  async createOrderConfirmation(data: unknown, options?: SalesOptions) {
    return this.createSales('order_confirmation', data, options);
  }
  private async createSales(
    kind: 'invoice' | 'quotation' | 'credit_note' | 'order_confirmation',
    data: unknown,
    options?: SalesOptions
  ) {
    if (options?.precedingSalesVoucherId !== undefined)
      required(options.precedingSalesVoucherId, 'precedingSalesVoucherId');
    return this.write(`/${resourcePaths[kind]}`, data, 'post', options);
  }
  async getInvoice(id: string) {
    const value = await this.get(`/invoices/${pathId(id)}`, salesSchema);
    exact(value.id, id);
    return value;
  }
  async createArticle(data: unknown) {
    return this.write('/articles', data, 'post');
  }
  async getArticle(id: string) {
    const value = await this.get(`/articles/${pathId(id)}`, articleSchema);
    exact(value.id, id);
    return value;
  }
  async updateArticle(id: string, data: unknown) {
    const value = await this.write(`/articles/${pathId(id)}`, data, 'put');
    exact(value.id, id);
    return value;
  }
  async deleteArticle(id: string) {
    try {
      await this.http.delete(`/articles/${pathId(id)}`);
    } catch (error) {
      const safe = apiError(error);
      safe.data.operationOutcome = 'unconfirmed';
      throw safe;
    }
  }
  async listArticles(filters: Filters = {}) {
    pageParams(filters);
    return this.get('/articles', pageSchema(articleSchema), {
      ...filters,
      type: typeof filters.type === 'string' ? filters.type.toUpperCase() : undefined
    });
  }
  async createVoucher(data: unknown) {
    return this.write('/vouchers', data, 'post');
  }
  async getVoucher(id: string) {
    const value = await this.get(`/vouchers/${pathId(id)}`, voucherSchema);
    exact(value.id, id);
    return value;
  }
  async updateVoucher(id: string, data: unknown) {
    const value = await this.write(`/vouchers/${pathId(id)}`, data, 'put');
    exact(value.id, id);
    return value;
  }
  async listVouchers(filters: Filters = {}) {
    pageParams(filters);
    required(
      typeof filters.voucherType === 'string' ? filters.voucherType : undefined,
      'voucherType (use any for all types)'
    );
    required(
      typeof filters.voucherStatus === 'string' ? filters.voucherStatus : undefined,
      'voucherStatus (use any for all statuses)'
    );
    for (const prefix of ['voucherDate', 'createdDate', 'updatedDate']) {
      const from = filters[`${prefix}From`],
        to = filters[`${prefix}To`];
      dateOnly(typeof from === 'string' ? from : undefined, `${prefix}From`);
      dateOnly(typeof to === 'string' ? to : undefined, `${prefix}To`);
      if (typeof from === 'string' && typeof to === 'string' && from > to)
        fail(`${prefix}From must not be after ${prefix}To.`);
    }
    if (
      filters.sort !== undefined &&
      (typeof filters.sort !== 'string' ||
        !/^(voucherDate|voucherNumber|createdDate|updatedDate)(,(ASC|DESC))?$/.test(
          filters.sort
        ))
    )
      fail('sort must use a supported field and optional ASC or DESC direction.');
    return this.get('/voucherlist', pageSchema(voucherListSchema), {
      ...filters,
      voucherNumber: searchText(
        typeof filters.voucherNumber === 'string' ? filters.voucherNumber : undefined
      )
    });
  }
  async getPayment(id: string) {
    return this.get(`/payments/${pathId(id)}`, paymentSchema);
  }
  async getResource(type: ResourceType, id: string) {
    const schema =
      type === 'article'
        ? articleSchema
        : type === 'contact'
          ? contactSchema
          : type === 'voucher'
            ? voucherSchema
            : salesSchema;
    const value = await this.get(`/${resourcePaths[type]}/${pathId(id)}`, schema);
    exact(value.id, id);
    return value;
  }
  async listReferenceData(
    type: 'posting_categories'
  ): Promise<z.output<typeof references.posting_categories>>;
  async listReferenceData(
    type: 'payment_conditions'
  ): Promise<z.output<typeof references.payment_conditions>>;
  async listReferenceData(type: 'countries'): Promise<z.output<typeof references.countries>>;
  async listReferenceData(
    type: 'print_layouts'
  ): Promise<z.output<typeof references.print_layouts>>;
  async listReferenceData(type: ReferenceType) {
    if (type === 'posting_categories')
      return this.get('/posting-categories', references.posting_categories);
    if (type === 'payment_conditions')
      return this.get('/payment-conditions', references.payment_conditions);
    if (type === 'countries') return this.get('/countries', references.countries);
    return this.get('/print-layouts', references.print_layouts);
  }
}
