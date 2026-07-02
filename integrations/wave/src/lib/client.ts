import { createAxios } from 'slates';
import * as gql from './graphql';

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
  data: T | null;
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
  taxes?: Array<{ salesTaxId: string }>;
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

export class WaveClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://gql.waveapps.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    let response = await this.http.post('/graphql/public', {
      query,
      variables
    });

    let body = response.data as { data?: T; errors?: Array<{ message: string }> };

    if (body.errors && body.errors.length > 0) {
      throw new Error(`GraphQL Error: ${body.errors.map(e => e.message).join(', ')}`);
    }

    if (!body.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return body.data;
  }

  private extractEdges<T>(connection: {
    pageInfo: PageInfo;
    edges: Array<{ node: T }>;
  }): PaginatedResult<T> {
    return {
      pageInfo: connection.pageInfo,
      items: connection.edges.map(e => e.node)
    };
  }

  private handleMutationResult<T>(
    result: { didSucceed: boolean; inputErrors: any[]; [key: string]: any },
    dataKey: string
  ): MutationResult<T> {
    return {
      didSucceed: result.didSucceed,
      inputErrors: result.inputErrors || [],
      data: result.didSucceed ? result[dataKey] : null
    };
  }

  // --- Business Queries ---

  async listBusinesses(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ businesses: any }>(gql.LIST_BUSINESSES_QUERY, {
      page,
      pageSize
    });
    return this.extractEdges(data.businesses);
  }

  async getBusiness(businessId: string): Promise<any> {
    let data = await this.query<{ business: any }>(gql.GET_BUSINESS_QUERY, { businessId });
    return data.business;
  }

  // --- Customer Operations ---

  async listCustomers(
    businessId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ business: { customers: any } }>(gql.LIST_CUSTOMERS_QUERY, {
      businessId,
      page,
      pageSize
    });
    return this.extractEdges(data.business.customers);
  }

  async createCustomer(input: CustomerCreateInput): Promise<MutationResult<any>> {
    let data = await this.query<{ customerCreate: any }>(gql.CREATE_CUSTOMER_MUTATION, {
      input
    });
    return this.handleMutationResult(data.customerCreate, 'customer');
  }

  async patchCustomer(input: CustomerPatchInput): Promise<MutationResult<any>> {
    let data = await this.query<{ customerPatch: any }>(gql.PATCH_CUSTOMER_MUTATION, {
      input
    });
    return this.handleMutationResult(data.customerPatch, 'customer');
  }

  async deleteCustomer(customerId: string): Promise<MutationResult<null>> {
    let data = await this.query<{ customerDelete: any }>(gql.DELETE_CUSTOMER_MUTATION, {
      input: { id: customerId }
    });
    return {
      didSucceed: data.customerDelete.didSucceed,
      inputErrors: data.customerDelete.inputErrors || [],
      data: null
    };
  }

  // --- Account Operations ---

  async listAccounts(
    businessId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ business: { accounts: any } }>(gql.LIST_ACCOUNTS_QUERY, {
      businessId,
      page,
      pageSize
    });
    return this.extractEdges(data.business.accounts);
  }

  async createAccount(input: AccountCreateInput): Promise<MutationResult<any>> {
    let data = await this.query<{ accountCreate: any }>(gql.CREATE_ACCOUNT_MUTATION, {
      input
    });
    return this.handleMutationResult(data.accountCreate, 'account');
  }

  async patchAccount(input: AccountPatchInput): Promise<MutationResult<any>> {
    let data = await this.query<{ accountPatch: any }>(gql.PATCH_ACCOUNT_MUTATION, { input });
    return this.handleMutationResult(data.accountPatch, 'account');
  }

  async archiveAccount(accountId: string): Promise<MutationResult<null>> {
    let data = await this.query<{ accountArchive: any }>(gql.ARCHIVE_ACCOUNT_MUTATION, {
      input: { id: accountId }
    });
    return {
      didSucceed: data.accountArchive.didSucceed,
      inputErrors: data.accountArchive.inputErrors || [],
      data: null
    };
  }

  // --- Product Operations ---

  async listProducts(
    businessId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ business: { products: any } }>(gql.LIST_PRODUCTS_QUERY, {
      businessId,
      page,
      pageSize
    });
    return this.extractEdges(data.business.products);
  }

  async createProduct(input: ProductCreateInput): Promise<MutationResult<any>> {
    let data = await this.query<{ productCreate: any }>(gql.CREATE_PRODUCT_MUTATION, {
      input
    });
    return this.handleMutationResult(data.productCreate, 'product');
  }

  async patchProduct(input: ProductPatchInput): Promise<MutationResult<any>> {
    let data = await this.query<{ productPatch: any }>(gql.PATCH_PRODUCT_MUTATION, { input });
    return this.handleMutationResult(data.productPatch, 'product');
  }

  async archiveProduct(productId: string): Promise<MutationResult<any>> {
    let data = await this.query<{ productArchive: any }>(gql.ARCHIVE_PRODUCT_MUTATION, {
      input: { id: productId }
    });
    return {
      didSucceed: data.productArchive.didSucceed,
      inputErrors: data.productArchive.inputErrors || [],
      data: null
    };
  }

  // --- Sales Tax Operations ---

  async listSalesTaxes(
    businessId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ business: { salesTaxes: any } }>(
      gql.LIST_SALES_TAXES_QUERY,
      { businessId, page, pageSize }
    );
    return this.extractEdges(data.business.salesTaxes);
  }

  async createSalesTax(input: SalesTaxCreateInput): Promise<MutationResult<any>> {
    let data = await this.query<{ salesTaxCreate: any }>(gql.CREATE_SALES_TAX_MUTATION, {
      input
    });
    return this.handleMutationResult(data.salesTaxCreate, 'salesTax');
  }

  async patchSalesTax(input: SalesTaxPatchInput): Promise<MutationResult<any>> {
    let data = await this.query<{ salesTaxPatch: any }>(gql.PATCH_SALES_TAX_MUTATION, {
      input
    });
    return this.handleMutationResult(data.salesTaxPatch, 'salesTax');
  }

  async archiveSalesTax(salesTaxId: string): Promise<MutationResult<any>> {
    let data = await this.query<{ salesTaxArchive: any }>(gql.ARCHIVE_SALES_TAX_MUTATION, {
      input: { id: salesTaxId }
    });
    return {
      didSucceed: data.salesTaxArchive.didSucceed,
      inputErrors: data.salesTaxArchive.inputErrors || [],
      data: null
    };
  }

  // --- Invoice Operations ---

  async listInvoices(
    businessId: string,
    page: number = 1,
    pageSize: number = 20,
    customerId?: string
  ): Promise<PaginatedResult<any>> {
    if (customerId) {
      let data = await this.query<{ business: { invoices: any } }>(
        gql.LIST_INVOICES_BY_CUSTOMER_QUERY,
        { businessId, page, pageSize, customerId }
      );
      return this.extractEdges(data.business.invoices);
    }
    let data = await this.query<{ business: { invoices: any } }>(gql.LIST_INVOICES_QUERY, {
      businessId,
      page,
      pageSize
    });
    return this.extractEdges(data.business.invoices);
  }

  async createInvoice(input: InvoiceCreateInput): Promise<MutationResult<any>> {
    let data = await this.query<{ invoiceCreate: any }>(gql.CREATE_INVOICE_MUTATION, {
      input
    });
    return this.handleMutationResult(data.invoiceCreate, 'invoice');
  }

  async patchInvoice(input: InvoicePatchInput): Promise<MutationResult<any>> {
    let data = await this.query<{ invoicePatch: any }>(gql.PATCH_INVOICE_MUTATION, { input });
    return this.handleMutationResult(data.invoicePatch, 'invoice');
  }

  async deleteInvoice(invoiceId: string): Promise<MutationResult<null>> {
    let data = await this.query<{ invoiceDelete: any }>(gql.DELETE_INVOICE_MUTATION, {
      input: { id: invoiceId }
    });
    return {
      didSucceed: data.invoiceDelete.didSucceed,
      inputErrors: data.invoiceDelete.inputErrors || [],
      data: null
    };
  }

  async sendInvoice(
    invoiceId: string,
    to?: string[],
    subject?: string,
    message?: string,
    attachPdf?: boolean
  ): Promise<MutationResult<null>> {
    let input: any = { invoiceId };
    if (to) input.to = to;
    if (subject) input.subject = subject;
    if (message) input.message = message;
    if (attachPdf !== undefined) input.attachPDF = attachPdf;

    let data = await this.query<{ invoiceSend: any }>(gql.SEND_INVOICE_MUTATION, { input });
    return {
      didSucceed: data.invoiceSend.didSucceed,
      inputErrors: data.invoiceSend.inputErrors || [],
      data: null
    };
  }

  async approveInvoice(invoiceId: string): Promise<MutationResult<any>> {
    let data = await this.query<{ invoiceApprove: any }>(gql.APPROVE_INVOICE_MUTATION, {
      input: { invoiceId }
    });
    return this.handleMutationResult(data.invoiceApprove, 'invoice');
  }

  async markInvoiceSent(invoiceId: string, sentAt?: string): Promise<MutationResult<any>> {
    let input: any = { invoiceId };
    if (sentAt) input.sentAt = sentAt;

    let data = await this.query<{ invoiceMarkSent: any }>(gql.MARK_INVOICE_SENT_MUTATION, {
      input
    });
    return this.handleMutationResult(data.invoiceMarkSent, 'invoice');
  }

  async cloneInvoice(invoiceId: string): Promise<MutationResult<any>> {
    let data = await this.query<{ invoiceClone: any }>(gql.CLONE_INVOICE_MUTATION, {
      input: { invoiceId }
    });
    return this.handleMutationResult(data.invoiceClone, 'invoice');
  }

  // --- Money Transaction Operations ---

  async createMoneyTransaction(
    input: MoneyTransactionCreateInput
  ): Promise<MutationResult<any>> {
    let data = await this.query<{ moneyTransactionCreate: any }>(
      gql.CREATE_MONEY_TRANSACTION_MUTATION,
      { input }
    );
    return this.handleMutationResult(data.moneyTransactionCreate, 'transaction');
  }

  // --- Vendor Operations ---

  async listVendors(
    businessId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<any>> {
    let data = await this.query<{ business: { vendors: any } }>(gql.LIST_VENDORS_QUERY, {
      businessId,
      page,
      pageSize
    });
    return this.extractEdges(data.business.vendors);
  }

  // --- User Operations ---

  async getUser(): Promise<any> {
    let data = await this.query<{ user: any }>(gql.GET_USER_QUERY);
    return data.user;
  }
}
