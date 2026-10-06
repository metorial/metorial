import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorResponse,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import { z } from 'zod';
import * as dto from './contracts';
import * as gql from './graphql';
import { canonicalDecimal, date, integer, invalid, numericDecimal, text } from './validation';

export interface PageInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export interface PaginatedResult<T> {
  pageInfo: PageInfo;
  items: T[];
}

export interface MutationResult<T> {
  didSucceed: boolean;
  inputErrors: Array<{ message: string; code: string; path: string[] }>;
  data: T;
}

export interface AddressInput {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  provinceCode?: string;
}

export interface ShippingDetailsInput {
  name?: string;
  phone?: string;
  instructions?: string;
  address?: AddressInput;
}

export interface CustomerCreateInput {
  businessId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  displayId?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  fax?: string;
  tollFree?: string;
  website?: string;
  internalNotes?: string;
  currency?: string;
  address?: AddressInput;
  shippingDetails?: ShippingDetailsInput;
}

export interface CustomerPatchInput {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  displayId?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  fax?: string;
  tollFree?: string;
  website?: string;
  internalNotes?: string;
  currency?: string;
  address?: AddressInput;
  shippingDetails?: ShippingDetailsInput;
}

export interface AccountCreateInput {
  businessId: string;
  name: string;
  subtype: string;
  description?: string;
  currency?: string;
  displayId?: string;
}

export interface AccountPatchInput {
  id: string;
  businessId?: string;
  sequence?: number;
  name?: string;
  description?: string;
  currency?: string;
  displayId?: string;
  subtype?: string;
}

export interface ProductCreateInput {
  businessId: string;
  name: string;
  unitPrice: number;
  description?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
  defaultSalesTaxIds?: string[];
  isSold?: boolean;
  isBought?: boolean;
}

export interface ProductPatchInput {
  id: string;
  name?: string;
  unitPrice?: number;
  description?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
  defaultSalesTaxIds?: string[];
  isSold?: boolean;
  isBought?: boolean;
}

export interface SalesTaxCreateInput {
  businessId: string;
  name: string;
  abbreviation: string;
  rate: number;
  description?: string;
  taxNumber?: string;
  isCompound?: boolean;
  isRecoverable?: boolean;
}

export interface SalesTaxPatchInput {
  id: string;
  rates?: Array<{ effective: string; rate: number }>;
  name?: string;
  abbreviation?: string;
  description?: string;
  taxNumber?: string;
  isCompound?: boolean;
  isRecoverable?: boolean;
}

export interface InvoiceLineItemTaxInput {
  salesTaxId: string;
}

export interface InvoiceLineItemInput {
  productId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxes?: InvoiceLineItemTaxInput[];
}

export interface InvoiceCreateInput {
  businessId: string;
  customerId: string;
  status?: 'DRAFT' | 'SAVED';
  invoiceNumber?: string;
  invoiceDate?: string;
  poNumber?: string;
  dueDate?: string;
  currency?: string;
  exchangeRate?: number;
  title?: string;
  subhead?: string;
  footer?: string;
  memo?: string;
  items?: InvoiceLineItemInput[];
  disableCreditCardPayments?: boolean;
  disableBankPayments?: boolean;
  itemTitle?: string;
  unitTitle?: string;
  priceTitle?: string;
  amountTitle?: string;
  hideName?: boolean;
  hideDescription?: boolean;
  hideUnit?: boolean;
  hidePrice?: boolean;
  hideAmount?: boolean;
}

export interface InvoicePatchInput {
  invoiceId: string;
  customerId?: string;
  status?: 'DRAFT' | 'SAVED';
  invoiceNumber?: string;
  invoiceDate?: string;
  poNumber?: string;
  dueDate?: string;
  currency?: string;
  exchangeRate?: number;
  title?: string;
  subhead?: string;
  footer?: string;
  memo?: string;
  items?: InvoiceLineItemInput[];
  disableCreditCardPayments?: boolean;
  disableBankPayments?: boolean;
  itemTitle?: string;
  unitTitle?: string;
  priceTitle?: string;
  amountTitle?: string;
  hideName?: boolean;
  hideDescription?: boolean;
  hideUnit?: boolean;
  hidePrice?: boolean;
  hideAmount?: boolean;
}

export interface MoneyTransactionLineItemInput {
  accountId: string;
  amount: number;
  balance: 'INCREASE' | 'DECREASE' | 'DEBIT' | 'CREDIT';
  taxes?: Array<{ salesTaxId: string; amount?: number }>;
}

export interface MoneyTransactionCreateInput {
  businessId: string;
  externalId: string;
  date: string;
  description?: string;
  notes?: string;
  anchor: {
    accountId: string;
    amount: number;
    direction: 'DEPOSIT' | 'WITHDRAWAL';
  };
  lineItems: MoneyTransactionLineItemInput[];
}

export const safeWaveError = (error: unknown, operation: string, secrets: string[] = []) => {
  const response = getApiErrorResponse(error);
  const data = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
  const upstream = isApiErrorRecord(data.upstream) ? data.upstream : {};
  const status = response?.status ?? data.upstreamStatus ?? upstream.status;
  const code = data.upstreamCode ?? upstream.code;
  const safeCode =
    typeof code === 'string' &&
    /^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(code) &&
    !secrets.some(secret => code.includes(secret))
      ? code
      : undefined;
  const safeStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined;
  return buildApiServiceError(
    safeStatus === undefined ? {} : { response: { status: safeStatus } },
    {
      providerLabel: 'Wave',
      reason: 'wave_api_error',
      operation,
      extractUpstreamCode: () => safeCode,
      extractMessage: () =>
        operation.includes('mutation')
          ? 'The outcome may be uncertain. Read the exact resource before retrying; a ledger entry or email may be retained. No automatic retry was performed.'
          : 'Check permissions, active subscription, resource identity and current provider state before retrying.',
      parent: {}
    }
  );
};

export class WaveClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private readonly token: string) {
    text(token, 'Wave access token');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://gql.waveapps.com',
      timeout: 60_000,
      maxRedirects: 0,
      headers: { Authorization: `Bearer ${token}` },
      errorAdapter: error => safeWaveError(error, 'request', [token])
    });
  }
  private privateData(value: unknown) {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') invalid('Wave returned missing response data.');
    const redactor = new AuthConfigSecretRedactor({
      token: this.token,
      escapedToken: JSON.stringify(this.token).slice(1, -1)
    });
    if (serialized !== redactor.redactEmbedded(serialized))
      invalid('Credential-bearing Wave data was refused; details omitted.');
  }
  private parsed<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      invalid(
        'Wave returned an incomplete or invalid response. No missing identity, total, amount or state was fabricated.'
      );
    return result.data;
  }
  private async query<T>(
    document: string,
    variables: Record<string, unknown>,
    schema: z.ZodType<T>
  ): Promise<T> {
    this.privateData(variables);
    const operation = document.trim().startsWith('mutation') ? 'mutation' : 'query';
    const response = await requestAxios(
      operation,
      () => this.http.post<unknown>('/graphql/public', { query: document, variables }),
      error => safeWaveError(error, operation, [this.token])
    );
    if (response.status !== 200) throw safeWaveError({ response }, operation, [this.token]);
    this.privateData(response.data);
    const body = this.parsed(
      z.object({ data: z.unknown().optional(), errors: z.array(z.unknown()).optional() }),
      response.data
    );
    if (body.errors?.length) {
      const first = body.errors[0];
      const extensions =
        isApiErrorRecord(first) && isApiErrorRecord(first.extensions) ? first.extensions : {};
      throw safeWaveError(
        { data: { upstreamStatus: response.status, upstreamCode: extensions.code } },
        operation,
        [this.token]
      );
    }
    return this.parsed(schema, body.data);
  }
  private page(page: number, pageSize: number) {
    return { page: integer(page, 'page'), pageSize: integer(pageSize, 'page size', 1, 100) };
  }
  private async list<T extends { id: string }>(
    document: string,
    field: string,
    schema: z.ZodType<T>,
    page = 1,
    pageSize = 20,
    businessId?: string,
    extra: Record<string, unknown> = {}
  ): Promise<PaginatedResult<T>> {
    const connection = z.object({
      pageInfo: z.object({
        currentPage: z.number().int().positive(),
        totalPages: z.number().int().nonnegative(),
        totalCount: z.number().int().nonnegative()
      }),
      edges: z.array(z.object({ node: schema }))
    });
    const variables = {
      ...this.page(page, pageSize),
      ...extra,
      ...(businessId === undefined
        ? {}
        : { businessId: text(businessId, 'business ID; call list_businesses to discover it') })
    };
    let selected: z.output<typeof connection>;
    if (businessId === undefined) {
      const result = await this.query(document, variables, z.record(z.string(), z.unknown()));
      selected = this.parsed(connection, result[field]);
    } else {
      const result = await this.query(
        document,
        variables,
        z.object({ business: z.record(z.string(), z.unknown()) })
      );
      if (result.business.id !== businessId)
        invalid('Wave returned a different business identity.');
      selected = this.parsed(connection, result.business[field]);
    }
    if (
      !selected ||
      selected.pageInfo.currentPage !== page ||
      selected.edges.length > pageSize ||
      selected.pageInfo.totalCount < selected.edges.length
    )
      invalid('Wave returned inconsistent page metadata.');
    const items = selected.edges.map(edge => edge.node);
    if (new Set(items.map(item => item.id)).size !== items.length)
      invalid('Wave returned repeated identities within a page.');
    for (const item of items) {
      const resource: unknown = item;
      if (
        businessId !== undefined &&
        isApiErrorRecord(resource) &&
        isApiErrorRecord(resource.business) &&
        resource.business.id !== businessId
      )
        invalid('Wave returned a resource belonging to a different business.');
    }
    return { pageInfo: selected.pageInfo, items };
  }
  private async mutation<T extends { id: string }>(
    document: string,
    field: string,
    input: Record<string, unknown>,
    dataKey: string,
    schema: z.ZodType<T>,
    identity?: string,
    businessId?: string
  ): Promise<MutationResult<T>> {
    const raw = await this.query(document, { input }, z.record(z.string(), z.unknown()));
    const payload = this.parsed(z.record(z.string(), z.unknown()), raw[field]);
    const result = this.parsed(
      z.object({ didSucceed: z.boolean(), inputErrors: z.array(z.unknown()).nullish() }),
      payload
    );
    if (!result.didSucceed || result.inputErrors?.length)
      invalid(
        'Wave refused the mutation. Check supported fields, required values, permissions and resource state before retrying.'
      );
    const data = this.parsed(schema, payload[dataKey]);
    if (identity !== undefined && data.id !== identity)
      invalid(
        'Wave returned a different mutation identity. Read the intended resource before any retry.'
      );
    const resource: unknown = data;
    if (
      businessId !== undefined &&
      isApiErrorRecord(resource) &&
      isApiErrorRecord(resource.business) &&
      resource.business.id !== businessId
    )
      invalid('Wave returned a mutation receipt for a different business.');
    return { didSucceed: true, inputErrors: [], data };
  }
  private async receipt(
    document: string,
    field: string,
    input: Record<string, unknown>
  ): Promise<MutationResult<null>> {
    const raw = await this.query(document, { input }, z.record(z.string(), z.unknown()));
    const result = this.parsed(
      z.object({ didSucceed: z.boolean(), inputErrors: z.array(z.unknown()).nullish() }),
      raw[field]
    );
    if (!result?.didSucceed || result.inputErrors?.length)
      invalid(
        'Wave did not acknowledge the requested mutation. Check permissions and state before retrying.'
      );
    return { didSucceed: true, inputErrors: [], data: null };
  }
  private input<T extends object>(input: T) {
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (Array.isArray(value) && key.endsWith('Ids')) for (const id of value) text(id, key);
      if (typeof value === 'string') {
        if (key.endsWith('Id') || key === 'id' || key === 'name') text(value, key);
        if (key === 'currency') {
          if (!/^[A-Z]{3}$/.test(value)) invalid('Provide an uppercase ISO currency code.');
        }
      }
    }
    return Object.fromEntries(Object.entries(input));
  }
  private reject(input: object, keys: string[]) {
    for (const key of keys)
      if (Object.hasOwn(input, key) && Reflect.get(input, key) !== undefined)
        invalid(
          `${key} is not supported by this Wave mutation. Omit it; no unsupported field was silently dropped.`
        );
  }
  listBusinesses(page = 1, pageSize = 20) {
    return this.list(gql.LIST_BUSINESSES_QUERY, 'businesses', dto.business, page, pageSize);
  }
  async getBusiness(businessId: string) {
    const result = await this.query(
      gql.GET_BUSINESS_QUERY,
      { businessId: text(businessId, 'business ID') },
      z.object({ business: dto.business })
    );
    if (result.business.id !== businessId)
      invalid('Wave returned a different business identity.');
    return result.business;
  }
  async getResource(kind: dto.ResourceKind, businessId: string, resourceId?: string) {
    if (kind === 'business') {
      if (resourceId !== undefined && resourceId !== businessId)
        invalid('Business resourceId must match businessId.');
      return this.getBusiness(businessId);
    }
    const id = text(resourceId, 'resource ID');
    const result = await this.query(
      gql.RESOURCE_QUERIES[kind],
      { businessId: text(businessId, 'business ID'), resourceId: id },
      z.object({ business: z.object({ id: z.string(), resource: z.unknown().nullable() }) })
    );
    if (result.business.id !== businessId)
      invalid('Wave returned a different business identity.');
    if (result.business.resource === null) return null;
    const resource = this.parsed(
      dto.resources[kind] as z.ZodType<{ id: string; business: { id: string } }>,
      result.business.resource
    );
    if (resource.id !== id || resource.business.id !== businessId)
      invalid('Wave returned a different resource or business identity.');
    return resource;
  }
  listCustomers(businessId: string, page = 1, pageSize = 20) {
    return this.list(
      gql.LIST_CUSTOMERS_QUERY,
      'customers',
      dto.customer,
      page,
      pageSize,
      businessId
    );
  }
  createCustomer(input: CustomerCreateInput) {
    return this.mutation(
      gql.CREATE_CUSTOMER_MUTATION,
      'customerCreate',
      this.input(input),
      'customer',
      dto.customer,
      undefined,
      input.businessId
    );
  }
  patchCustomer(input: CustomerPatchInput) {
    return this.mutation(
      gql.PATCH_CUSTOMER_MUTATION,
      'customerPatch',
      this.input(input),
      'customer',
      dto.customer,
      input.id
    );
  }
  deleteCustomer(id: string) {
    return this.receipt(gql.DELETE_CUSTOMER_MUTATION, 'customerDelete', {
      id: text(id, 'customer ID')
    });
  }
  listAccounts(businessId: string, page = 1, pageSize = 20) {
    return this.list(
      gql.LIST_ACCOUNTS_QUERY,
      'accounts',
      dto.account,
      page,
      pageSize,
      businessId
    );
  }
  createAccount(input: AccountCreateInput) {
    return this.mutation(
      gql.CREATE_ACCOUNT_MUTATION,
      'accountCreate',
      this.input(input),
      'account',
      dto.account,
      undefined,
      input.businessId
    );
  }
  async patchAccount(input: AccountPatchInput) {
    this.reject(input, ['currency', 'subtype']);
    const { businessId, sequence, ...fields } = input;
    let revision = sequence;
    if (revision === undefined) {
      const business = text(
        businessId,
        'businessId for revision discovery; call list_businesses'
      );
      const resource = await this.getResource('account', business, input.id);
      revision = this.parsed(dto.account, resource).sequence;
    }
    return this.mutation(
      gql.PATCH_ACCOUNT_MUTATION,
      'accountPatch',
      { ...this.input(fields), sequence: integer(revision, 'account revision sequence', 0) },
      'account',
      dto.account,
      input.id,
      businessId
    );
  }
  archiveAccount(id: string) {
    return this.receipt(gql.ARCHIVE_ACCOUNT_MUTATION, 'accountArchive', {
      id: text(id, 'account ID')
    });
  }
  listProducts(businessId: string, page = 1, pageSize = 20) {
    return this.list(
      gql.LIST_PRODUCTS_QUERY,
      'products',
      dto.product,
      page,
      pageSize,
      businessId
    );
  }
  private productInput(input: ProductCreateInput | ProductPatchInput) {
    this.reject(input, ['isSold', 'isBought']);
    return {
      ...this.input(input),
      ...(input.unitPrice === undefined
        ? {}
        : { unitPrice: numericDecimal(input.unitPrice, 'unit price', 5) })
    };
  }
  createProduct(input: ProductCreateInput) {
    return this.mutation(
      gql.CREATE_PRODUCT_MUTATION,
      'productCreate',
      this.productInput(input),
      'product',
      dto.product,
      undefined,
      input.businessId
    );
  }
  patchProduct(input: ProductPatchInput) {
    return this.mutation(
      gql.PATCH_PRODUCT_MUTATION,
      'productPatch',
      this.productInput(input),
      'product',
      dto.product,
      input.id
    );
  }
  archiveProduct(id: string) {
    return this.receipt(gql.ARCHIVE_PRODUCT_MUTATION, 'productArchive', {
      id: text(id, 'product ID')
    });
  }
  listSalesTaxes(businessId: string, page = 1, pageSize = 20) {
    return this.list(
      gql.LIST_SALES_TAXES_QUERY,
      'salesTaxes',
      dto.salesTax,
      page,
      pageSize,
      businessId
    );
  }
  createSalesTax(input: SalesTaxCreateInput) {
    text(input.abbreviation, 'tax abbreviation', 10);
    const rate = canonicalDecimal(numericDecimal(input.rate, 'percentage tax rate', 4), -2);
    return this.mutation(
      gql.CREATE_SALES_TAX_MUTATION,
      'salesTaxCreate',
      { ...this.input(input), rate },
      'salesTax',
      dto.salesTax,
      undefined,
      input.businessId
    );
  }
  patchSalesTax(input: SalesTaxPatchInput) {
    this.reject(input, ['isCompound', 'isRecoverable']);
    if (input.abbreviation !== undefined) text(input.abbreviation, 'tax abbreviation', 10);
    const rates = input.rates?.map(rate => ({
      effective: date(rate.effective),
      rate: canonicalDecimal(numericDecimal(rate.rate, 'percentage tax rate', 4), -2)
    }));
    return this.mutation(
      gql.PATCH_SALES_TAX_MUTATION,
      'salesTaxPatch',
      { ...this.input(input), ...(rates === undefined ? {} : { rates }) },
      'salesTax',
      dto.salesTax,
      input.id
    );
  }
  archiveSalesTax(id: string) {
    return this.receipt(gql.ARCHIVE_SALES_TAX_MUTATION, 'salesTaxArchive', {
      id: text(id, 'sales tax ID')
    });
  }
  listInvoices(businessId: string, page = 1, pageSize = 20, customerId?: string) {
    return this.list(
      customerId === undefined ? gql.LIST_INVOICES_QUERY : gql.LIST_INVOICES_BY_CUSTOMER_QUERY,
      'invoices',
      dto.invoice,
      page,
      pageSize,
      businessId,
      customerId === undefined ? {} : { customerId: text(customerId, 'customer ID') }
    );
  }
  private invoiceInput(input: InvoiceCreateInput | Omit<InvoicePatchInput, 'invoiceId'>) {
    const mapped = this.input(input);
    for (const value of [input.invoiceDate, input.dueDate])
      if (value !== undefined) date(value);
    if (input.items !== undefined && input.items.length === 0)
      invalid('Provide at least one invoice item when replacing the items.');
    return {
      ...mapped,
      ...(input.exchangeRate === undefined
        ? {}
        : {
            exchangeRate: numericDecimal(input.exchangeRate, 'exchange rate', undefined, true)
          }),
      ...(input.items === undefined
        ? {}
        : {
            items: input.items.map(item => ({
              ...item,
              productId: text(
                item.productId,
                'productId for every invoice item; call list_products'
              ),
              ...(item.quantity === undefined
                ? {}
                : { quantity: numericDecimal(item.quantity, 'quantity', 8, true) }),
              ...(item.unitPrice === undefined
                ? {}
                : { unitPrice: numericDecimal(item.unitPrice, 'unit price', 8) })
            }))
          })
    };
  }
  createInvoice(input: InvoiceCreateInput) {
    return this.mutation(
      gql.CREATE_INVOICE_MUTATION,
      'invoiceCreate',
      this.invoiceInput(input),
      'invoice',
      dto.invoice,
      undefined,
      input.businessId
    );
  }
  patchInvoice(input: InvoicePatchInput) {
    const { invoiceId, ...rest } = input;
    return this.mutation(
      gql.PATCH_INVOICE_MUTATION,
      'invoicePatch',
      { ...this.invoiceInput(rest), id: text(invoiceId, 'invoice ID') },
      'invoice',
      dto.invoice,
      invoiceId
    );
  }
  deleteInvoice(id: string) {
    return this.receipt(gql.DELETE_INVOICE_MUTATION, 'invoiceDelete', {
      invoiceId: text(id, 'invoice ID')
    });
  }
  sendInvoice(
    invoiceId: string,
    to?: string[],
    subject?: string,
    message?: string,
    attachPdf?: boolean
  ) {
    if (!to?.length || to.some(email => !z.email().safeParse(email).success))
      invalid(
        'Provide explicit valid recipient addresses; no customer email fallback is used.'
      );
    return this.receipt(gql.SEND_INVOICE_MUTATION, 'invoiceSend', {
      invoiceId: text(invoiceId, 'invoice ID'),
      to,
      subject,
      message,
      attachPDF: attachPdf ?? false
    });
  }
  approveInvoice(invoiceId: string) {
    return this.mutation(
      gql.APPROVE_INVOICE_MUTATION,
      'invoiceApprove',
      { invoiceId: text(invoiceId, 'invoice ID') },
      'invoice',
      dto.invoice,
      invoiceId
    );
  }
  markInvoiceSent(invoiceId: string, sentAt?: string, sendMethod = 'MARKED_SENT') {
    if (
      ![
        'EXPORT_PDF',
        'GMAIL',
        'MARKED_SENT',
        'OUTLOOK',
        'SHARED_LINK',
        'WAVE',
        'YAHOO'
      ].includes(sendMethod)
    )
      invalid('Choose a documented delivery method.');
    if (
      sentAt !== undefined &&
      (!Number.isFinite(Date.parse(sentAt)) || !/^\d{4}-\d{2}-\d{2}T/.test(sentAt))
    )
      invalid('Provide a valid ISO timestamp for sentAt.');
    return this.mutation(
      gql.MARK_INVOICE_SENT_MUTATION,
      'invoiceMarkSent',
      {
        invoiceId: text(invoiceId, 'invoice ID'),
        sendMethod,
        ...(sentAt === undefined ? {} : { sentAt })
      },
      'invoice',
      dto.invoice,
      invoiceId
    );
  }
  cloneInvoice(invoiceId: string) {
    return this.mutation(
      gql.CLONE_INVOICE_MUTATION,
      'invoiceClone',
      { invoiceId: text(invoiceId, 'invoice ID') },
      'invoice',
      dto.invoice
    );
  }
  async createMoneyTransaction(input: MoneyTransactionCreateInput) {
    text(input.description, 'description for the retained accounting entry');
    date(input.date);
    text(input.externalId, 'external reference');
    if (!input.lineItems.length) invalid('Provide at least one accounting line item.');
    const anchorAmount = numericDecimal(input.anchor.amount, 'anchor amount', 2, true);
    const lineItems = input.lineItems.map(item => ({
      ...item,
      accountId: text(item.accountId, 'categorization account ID'),
      amount: numericDecimal(item.amount, 'line item amount', 2, true),
      ...(item.taxes === undefined
        ? {}
        : {
            taxes: item.taxes.map(tax => ({
              salesTaxId: text(tax.salesTaxId, 'sales tax ID'),
              amount: numericDecimal(tax.amount ?? Number.NaN, 'explicit tax amount', 2)
            }))
          })
    }));
    const business = await this.getBusiness(input.businessId);
    if (business.isClassicAccounting)
      invalid('Money transaction creation requires a business with non-classic accounting.');
    return this.mutation(
      gql.CREATE_MONEY_TRANSACTION_MUTATION,
      'moneyTransactionCreate',
      {
        ...this.input(input),
        description: input.description,
        anchor: {
          ...input.anchor,
          accountId: text(input.anchor.accountId, 'anchor account ID'),
          amount: anchorAmount
        },
        lineItems
      },
      'transaction',
      dto.transaction
    );
  }
  listVendors(businessId: string, page = 1, pageSize = 20) {
    return this.list(
      gql.LIST_VENDORS_QUERY,
      'vendors',
      dto.vendor,
      page,
      pageSize,
      businessId
    );
  }
  async getUser() {
    return (await this.query(gql.GET_USER_QUERY, {}, z.object({ user: dto.user }))).user;
  }
}
