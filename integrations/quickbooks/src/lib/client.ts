import { createAxios } from '@slates/provider';
import { quickBooksApiError } from './errors';

export interface QuickBooksClientConfig {
  token: string;
  companyId: string;
  environment: 'sandbox' | 'production';
}

export interface QuickBooksQueryResult {
  entities: any[];
  totalCount?: number;
  startPosition?: number;
  maxResults?: number;
}

export class QuickBooksClient {
  private axios: ReturnType<typeof createAxios>;
  private companyId: string;

  constructor(config: QuickBooksClientConfig) {
    let baseURL =
      config.environment === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com';

    this.companyId = config.companyId;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(quickBooksApiError(error))
    );
  }

  private get basePath(): string {
    return `/v3/company/${this.companyId}`;
  }

  // ── Read Operations ──────────────────────────────────────────────

  async getEntity(entityType: string, entityId: string): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath}/${entityType.toLowerCase()}/${entityId}`
    );
    return response.data;
  }

  async query(queryString: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/query`, {
      params: { query: queryString }
    });
    return response.data;
  }

  // ── Create / Update Operations ───────────────────────────────────

  async createEntity(entityType: string, data: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/${entityType.toLowerCase()}`, data);
    return response.data;
  }

  async updateEntity(entityType: string, data: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/${entityType.toLowerCase()}`, data);
    return response.data;
  }

  async deleteEntity(
    entityType: string,
    data: { Id: string; SyncToken: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `${this.basePath}/${entityType.toLowerCase()}?operation=delete`,
      data
    );
    return response.data;
  }

  // ── Invoice ──────────────────────────────────────────────────────

  async createInvoice(invoiceData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/invoice`, invoiceData);
    return response.data?.Invoice ?? response.data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/invoice/${invoiceId}`);
    return response.data?.Invoice ?? response.data;
  }

  async updateInvoice(invoiceData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/invoice`, invoiceData);
    return response.data?.Invoice ?? response.data;
  }

  async sendInvoice(invoiceId: string, emailAddress?: string): Promise<any> {
    let url = `${this.basePath}/invoice/${invoiceId}/send`;
    if (emailAddress) {
      url += `?sendTo=${encodeURIComponent(emailAddress)}`;
    }
    let response = await this.axios.post(url);
    return response.data?.Invoice ?? response.data;
  }

  async voidInvoice(invoiceId: string, syncToken: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/invoice?operation=void`, {
      Id: invoiceId,
      SyncToken: syncToken
    });
    return response.data?.Invoice ?? response.data;
  }

  async queryInvoices(
    where?: string,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]> {
    let query = 'SELECT * FROM Invoice';
    if (where) query += ` WHERE ${where}`;
    if (orderBy) query += ` ORDERBY ${orderBy}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Invoice ?? [];
  }

  // ── Customer ─────────────────────────────────────────────────────

  async createCustomer(customerData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/customer`, customerData);
    return response.data?.Customer ?? response.data;
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/customer/${customerId}`);
    return response.data?.Customer ?? response.data;
  }

  async updateCustomer(customerData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/customer`, customerData);
    return response.data?.Customer ?? response.data;
  }

  async queryCustomers(
    where?: string,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]> {
    let query = 'SELECT * FROM Customer';
    if (where) query += ` WHERE ${where}`;
    if (orderBy) query += ` ORDERBY ${orderBy}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Customer ?? [];
  }

  // ── Vendor ───────────────────────────────────────────────────────

  async createVendor(vendorData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/vendor`, vendorData);
    return response.data?.Vendor ?? response.data;
  }

  async getVendor(vendorId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/vendor/${vendorId}`);
    return response.data?.Vendor ?? response.data;
  }

  async updateVendor(vendorData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/vendor`, vendorData);
    return response.data?.Vendor ?? response.data;
  }

  async queryVendors(
    where?: string,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]> {
    let query = 'SELECT * FROM Vendor';
    if (where) query += ` WHERE ${where}`;
    if (orderBy) query += ` ORDERBY ${orderBy}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Vendor ?? [];
  }

  // ── Payment ──────────────────────────────────────────────────────

  async createPayment(paymentData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/payment`, paymentData);
    return response.data?.Payment ?? response.data;
  }

  async getPayment(paymentId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/payment/${paymentId}`);
    return response.data?.Payment ?? response.data;
  }

  async queryPayments(where?: string, limit?: number, offset?: number): Promise<any[]> {
    let query = 'SELECT * FROM Payment';
    if (where) query += ` WHERE ${where}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Payment ?? [];
  }

  // ── Bill ─────────────────────────────────────────────────────────

  async createBill(billData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/bill`, billData);
    return response.data?.Bill ?? response.data;
  }

  async getBill(billId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/bill/${billId}`);
    return response.data?.Bill ?? response.data;
  }

  async updateBill(billData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/bill`, billData);
    return response.data?.Bill ?? response.data;
  }

  async createBillPayment(billPaymentData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/billpayment`, billPaymentData);
    return response.data?.BillPayment ?? response.data;
  }

  // ── Estimate ─────────────────────────────────────────────────────

  async createEstimate(estimateData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/estimate`, estimateData);
    return response.data?.Estimate ?? response.data;
  }

  async getEstimate(estimateId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/estimate/${estimateId}`);
    return response.data?.Estimate ?? response.data;
  }

  async updateEstimate(estimateData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/estimate`, estimateData);
    return response.data?.Estimate ?? response.data;
  }

  // ── Sales Receipt ────────────────────────────────────────────────

  async createSalesReceipt(salesReceiptData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/salesreceipt`, salesReceiptData);
    return response.data?.SalesReceipt ?? response.data;
  }

  async getSalesReceipt(salesReceiptId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/salesreceipt/${salesReceiptId}`);
    return response.data?.SalesReceipt ?? response.data;
  }

  async deleteSalesReceipt(salesReceiptId: string, syncToken: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/salesreceipt?operation=delete`, {
      Id: salesReceiptId,
      SyncToken: syncToken
    });
    return response.data?.SalesReceipt ?? response.data;
  }

  // ── Item ─────────────────────────────────────────────────────────

  async createItem(itemData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/item`, itemData);
    return response.data?.Item ?? response.data;
  }

  async getItem(itemId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/item/${itemId}`);
    return response.data?.Item ?? response.data;
  }

  async updateItem(itemData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/item`, itemData);
    return response.data?.Item ?? response.data;
  }

  async queryItems(where?: string, limit?: number, offset?: number): Promise<any[]> {
    let query = 'SELECT * FROM Item';
    if (where) query += ` WHERE ${where}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Item ?? [];
  }

  // ── Account ──────────────────────────────────────────────────────

  async createAccount(accountData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/account`, accountData);
    return response.data?.Account ?? response.data;
  }

  async getAccount(accountId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/account/${accountId}`);
    return response.data?.Account ?? response.data;
  }

  async updateAccount(accountData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/account`, accountData);
    return response.data?.Account ?? response.data;
  }

  async queryAccounts(where?: string, limit?: number, offset?: number): Promise<any[]> {
    let query = 'SELECT * FROM Account';
    if (where) query += ` WHERE ${where}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    return response?.QueryResponse?.Account ?? [];
  }

  // ── Journal Entry ────────────────────────────────────────────────

  async createJournalEntry(journalEntryData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/journalentry`, journalEntryData);
    return response.data?.JournalEntry ?? response.data;
  }

  async getJournalEntry(journalEntryId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/journalentry/${journalEntryId}`);
    return response.data?.JournalEntry ?? response.data;
  }

  // ── Purchase / Expense ───────────────────────────────────────────

  async createPurchase(purchaseData: any): Promise<any> {
    let response = await this.axios.post(`${this.basePath}/purchase`, purchaseData);
    return response.data?.Purchase ?? response.data;
  }

  async getPurchase(purchaseId: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/purchase/${purchaseId}`);
    return response.data?.Purchase ?? response.data;
  }

  // ── Reports ──────────────────────────────────────────────────────

  async getReport(reportName: string, params?: Record<string, string>): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/reports/${reportName}`, {
      params
    });
    return response.data;
  }

  // ── Change Data Capture ──────────────────────────────────────────

  async getChangedEntities(entities: string[], changedSince: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/cdc`, {
      params: {
        entities: entities.join(','),
        changedSince
      }
    });
    return response.data;
  }

  // ── Company Info ─────────────────────────────────────────────────

  async getCompanyInfo(): Promise<any> {
    let response = await this.axios.get(`${this.basePath}/companyinfo/${this.companyId}`);
    return response.data?.CompanyInfo ?? response.data;
  }

  // ── Generic Query ────────────────────────────────────────────────

  async runQuery(
    entityType: string,
    where?: string,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<any[]> {
    return (await this.runQueryWithMetadata(entityType, where, orderBy, limit, offset))
      .entities;
  }

  async runQueryWithMetadata(
    entityType: string,
    where?: string,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<QuickBooksQueryResult> {
    let query = `SELECT * FROM ${entityType}`;
    if (where) query += ` WHERE ${where}`;
    if (orderBy) query += ` ORDERBY ${orderBy}`;
    if (limit) query += ` MAXRESULTS ${limit}`;
    if (offset) query += ` STARTPOSITION ${offset}`;
    let response = await this.query(query);
    let queryResponse = response?.QueryResponse ?? {};

    return {
      entities: queryResponse[entityType] ?? [],
      totalCount: queryResponse.totalCount,
      startPosition: queryResponse.startPosition,
      maxResults: queryResponse.maxResults
    };
  }

  async countEntity(entityType: string, where?: string): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${entityType}`;
    if (where) query += ` WHERE ${where}`;
    let response = await this.query(query);
    return response?.QueryResponse?.totalCount ?? 0;
  }
}
