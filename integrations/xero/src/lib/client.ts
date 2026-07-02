import { createAxios } from '@slates/provider';
import { xeroApiError } from './errors';
import type {
  XeroAccount,
  XeroBankTransaction,
  XeroBankTransfer,
  XeroBrandingTheme,
  XeroContact,
  XeroContactGroup,
  XeroCreditNote,
  XeroCurrency,
  XeroInvoice,
  XeroItem,
  XeroManualJournal,
  XeroOrganisation,
  XeroPayment,
  XeroPurchaseOrder,
  XeroQuote,
  XeroReport,
  XeroTaxRate,
  XeroTrackingCategory
} from './types';

export class XeroClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; tenantId?: string }) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (params.tenantId) {
      headers['xero-tenant-id'] = params.tenantId;
    }

    this.axios = createAxios({
      baseURL: 'https://api.xero.com/api.xro/2.0',
      headers
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(xeroApiError(error))
    );
  }

  // ─── Invoices ─────────────────────────────────────────────────

  async getInvoices(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
    contactIds?: string[];
    invoiceNumbers?: string[];
    statuses?: string[];
    summaryOnly?: boolean;
  }): Promise<{ Invoices: XeroInvoice[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;
    if (params?.summaryOnly) query.summaryOnly = params.summaryOnly;
    if (params?.contactIds) query.ContactIDs = params.contactIds.join(',');
    if (params?.invoiceNumbers) query.InvoiceNumbers = params.invoiceNumbers.join(',');
    if (params?.statuses) query.Statuses = params.statuses.join(',');

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Invoices', { params: query, headers });
    return response.data as { Invoices: XeroInvoice[] };
  }

  async getInvoice(invoiceId: string): Promise<XeroInvoice> {
    let response = await this.axios.get(`/Invoices/${invoiceId}`);
    let data = response.data as { Invoices: XeroInvoice[] };
    return data.Invoices[0]!;
  }

  async createInvoice(invoice: Partial<XeroInvoice>): Promise<XeroInvoice> {
    let response = await this.axios.post('/Invoices', invoice);
    let data = response.data as { Invoices: XeroInvoice[] };
    return data.Invoices[0]!;
  }

  async updateInvoice(invoiceId: string, invoice: Partial<XeroInvoice>): Promise<XeroInvoice> {
    let response = await this.axios.post(`/Invoices/${invoiceId}`, invoice);
    let data = response.data as { Invoices: XeroInvoice[] };
    return data.Invoices[0]!;
  }

  async voidInvoice(invoiceId: string): Promise<XeroInvoice> {
    let response = await this.axios.post(`/Invoices/${invoiceId}`, {
      InvoiceID: invoiceId,
      Status: 'VOIDED'
    });
    let data = response.data as { Invoices: XeroInvoice[] };
    return data.Invoices[0]!;
  }

  async emailInvoice(invoiceId: string): Promise<void> {
    await this.axios.post(`/Invoices/${invoiceId}/Email`);
  }

  // ─── Contacts ─────────────────────────────────────────────────

  async getContacts(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
    ids?: string[];
    includeArchived?: boolean;
    summaryOnly?: boolean;
    searchTerm?: string;
  }): Promise<{ Contacts: XeroContact[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;
    if (params?.includeArchived) query.includeArchived = params.includeArchived;
    if (params?.summaryOnly) query.summaryOnly = params.summaryOnly;
    if (params?.searchTerm) query.searchTerm = params.searchTerm;
    if (params?.ids) query.IDs = params.ids.join(',');

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Contacts', { params: query, headers });
    return response.data as { Contacts: XeroContact[] };
  }

  async getContact(contactId: string): Promise<XeroContact> {
    let response = await this.axios.get(`/Contacts/${contactId}`);
    let data = response.data as { Contacts: XeroContact[] };
    return data.Contacts[0]!;
  }

  async createContact(contact: Partial<XeroContact>): Promise<XeroContact> {
    let response = await this.axios.post('/Contacts', contact);
    let data = response.data as { Contacts: XeroContact[] };
    return data.Contacts[0]!;
  }

  async updateContact(contactId: string, contact: Partial<XeroContact>): Promise<XeroContact> {
    let response = await this.axios.post(`/Contacts/${contactId}`, contact);
    let data = response.data as { Contacts: XeroContact[] };
    return data.Contacts[0]!;
  }

  // Contact Groups

  async getContactGroups(params?: {
    where?: string;
    order?: string;
  }): Promise<{ ContactGroups: XeroContactGroup[] }> {
    let query: Record<string, any> = {};
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let response = await this.axios.get('/ContactGroups', { params: query });
    return response.data as { ContactGroups: XeroContactGroup[] };
  }

  async getContactGroup(contactGroupId: string): Promise<XeroContactGroup> {
    let response = await this.axios.get(`/ContactGroups/${contactGroupId}`);
    let data = response.data as { ContactGroups: XeroContactGroup[] };
    return data.ContactGroups[0]!;
  }

  async createContactGroup(
    contactGroup: Partial<XeroContactGroup>
  ): Promise<XeroContactGroup> {
    let response = await this.axios.put('/ContactGroups', {
      ContactGroups: [contactGroup]
    });
    let data = response.data as { ContactGroups: XeroContactGroup[] };
    return data.ContactGroups[0]!;
  }

  async updateContactGroup(
    contactGroupId: string,
    contactGroup: Partial<XeroContactGroup>
  ): Promise<XeroContactGroup> {
    let response = await this.axios.post(`/ContactGroups/${contactGroupId}`, {
      ContactGroups: [contactGroup]
    });
    let data = response.data as { ContactGroups: XeroContactGroup[] };
    return data.ContactGroups[0]!;
  }

  async addContactsToContactGroup(
    contactGroupId: string,
    contactIds: string[]
  ): Promise<{ Contacts: XeroContact[] }> {
    let response = await this.axios.put(`/ContactGroups/${contactGroupId}/Contacts`, {
      Contacts: contactIds.map(contactId => ({ ContactID: contactId }))
    });
    return response.data as { Contacts: XeroContact[] };
  }

  async removeContactFromContactGroup(
    contactGroupId: string,
    contactId: string
  ): Promise<void> {
    await this.axios.delete(`/ContactGroups/${contactGroupId}/Contacts/${contactId}`);
  }

  // ─── Credit Notes ─────────────────────────────────────────────

  async getCreditNotes(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ CreditNotes: XeroCreditNote[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/CreditNotes', { params: query, headers });
    return response.data as { CreditNotes: XeroCreditNote[] };
  }

  async getCreditNote(creditNoteId: string): Promise<XeroCreditNote> {
    let response = await this.axios.get(`/CreditNotes/${creditNoteId}`);
    let data = response.data as { CreditNotes: XeroCreditNote[] };
    return data.CreditNotes[0]!;
  }

  async createCreditNote(creditNote: Partial<XeroCreditNote>): Promise<XeroCreditNote> {
    let response = await this.axios.post('/CreditNotes', creditNote);
    let data = response.data as { CreditNotes: XeroCreditNote[] };
    return data.CreditNotes[0]!;
  }

  async updateCreditNote(
    creditNoteId: string,
    creditNote: Partial<XeroCreditNote>
  ): Promise<XeroCreditNote> {
    let response = await this.axios.post(`/CreditNotes/${creditNoteId}`, creditNote);
    let data = response.data as { CreditNotes: XeroCreditNote[] };
    return data.CreditNotes[0]!;
  }

  // ─── Payments ─────────────────────────────────────────────────

  async getPayments(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ Payments: XeroPayment[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Payments', { params: query, headers });
    return response.data as { Payments: XeroPayment[] };
  }

  async getPayment(paymentId: string): Promise<XeroPayment> {
    let response = await this.axios.get(`/Payments/${paymentId}`);
    let data = response.data as { Payments: XeroPayment[] };
    return data.Payments[0]!;
  }

  async createPayment(payment: Partial<XeroPayment>): Promise<XeroPayment> {
    let response = await this.axios.put('/Payments', payment);
    let data = response.data as { Payments: XeroPayment[] };
    return data.Payments[0]!;
  }

  async deletePayment(paymentId: string): Promise<XeroPayment> {
    let response = await this.axios.post(`/Payments/${paymentId}`, {
      PaymentID: paymentId,
      Status: 'DELETED'
    });
    let data = response.data as { Payments: XeroPayment[] };
    return data.Payments[0]!;
  }

  // ─── Bank Transactions ────────────────────────────────────────

  async getBankTransactions(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ BankTransactions: XeroBankTransaction[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/BankTransactions', { params: query, headers });
    return response.data as { BankTransactions: XeroBankTransaction[] };
  }

  async getBankTransaction(bankTransactionId: string): Promise<XeroBankTransaction> {
    let response = await this.axios.get(`/BankTransactions/${bankTransactionId}`);
    let data = response.data as { BankTransactions: XeroBankTransaction[] };
    return data.BankTransactions[0]!;
  }

  async createBankTransaction(
    transaction: Partial<XeroBankTransaction>
  ): Promise<XeroBankTransaction> {
    let response = await this.axios.post('/BankTransactions', transaction);
    let data = response.data as { BankTransactions: XeroBankTransaction[] };
    return data.BankTransactions[0]!;
  }

  async updateBankTransaction(
    transactionId: string,
    transaction: Partial<XeroBankTransaction>
  ): Promise<XeroBankTransaction> {
    let response = await this.axios.post(`/BankTransactions/${transactionId}`, transaction);
    let data = response.data as { BankTransactions: XeroBankTransaction[] };
    return data.BankTransactions[0]!;
  }

  // Bank Transfers

  async getBankTransfers(params?: {
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ BankTransfers: XeroBankTransfer[] }> {
    let query: Record<string, any> = {};
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/BankTransfers', { params: query, headers });
    return response.data as { BankTransfers: XeroBankTransfer[] };
  }

  async getBankTransfer(bankTransferId: string): Promise<XeroBankTransfer> {
    let response = await this.axios.get(`/BankTransfers/${bankTransferId}`);
    let data = response.data as { BankTransfers: XeroBankTransfer[] };
    return data.BankTransfers[0]!;
  }

  async createBankTransfer(transfer: Partial<XeroBankTransfer>): Promise<XeroBankTransfer> {
    let response = await this.axios.put('/BankTransfers', {
      BankTransfers: [transfer]
    });
    let data = response.data as { BankTransfers: XeroBankTransfer[] };
    return data.BankTransfers[0]!;
  }

  // ─── Accounts ─────────────────────────────────────────────────

  async getAccounts(params?: {
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ Accounts: XeroAccount[] }> {
    let query: Record<string, any> = {};
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Accounts', { params: query, headers });
    return response.data as { Accounts: XeroAccount[] };
  }

  async getAccount(accountId: string): Promise<XeroAccount> {
    let response = await this.axios.get(`/Accounts/${accountId}`);
    let data = response.data as { Accounts: XeroAccount[] };
    return data.Accounts[0]!;
  }

  async createAccount(account: Partial<XeroAccount>): Promise<XeroAccount> {
    let response = await this.axios.put('/Accounts', account);
    let data = response.data as { Accounts: XeroAccount[] };
    return data.Accounts[0]!;
  }

  async updateAccount(accountId: string, account: Partial<XeroAccount>): Promise<XeroAccount> {
    let response = await this.axios.post(`/Accounts/${accountId}`, account);
    let data = response.data as { Accounts: XeroAccount[] };
    return data.Accounts[0]!;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.axios.delete(`/Accounts/${accountId}`);
  }

  // ─── Purchase Orders ──────────────────────────────────────────

  async getPurchaseOrders(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ PurchaseOrders: XeroPurchaseOrder[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;
    if (params?.status) query.Status = params.status;
    if (params?.dateFrom) query.DateFrom = params.dateFrom;
    if (params?.dateTo) query.DateTo = params.dateTo;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/PurchaseOrders', { params: query, headers });
    return response.data as { PurchaseOrders: XeroPurchaseOrder[] };
  }

  async getPurchaseOrder(purchaseOrderId: string): Promise<XeroPurchaseOrder> {
    let response = await this.axios.get(`/PurchaseOrders/${purchaseOrderId}`);
    let data = response.data as { PurchaseOrders: XeroPurchaseOrder[] };
    return data.PurchaseOrders[0]!;
  }

  async createPurchaseOrder(
    purchaseOrder: Partial<XeroPurchaseOrder>
  ): Promise<XeroPurchaseOrder> {
    let response = await this.axios.post('/PurchaseOrders', purchaseOrder);
    let data = response.data as { PurchaseOrders: XeroPurchaseOrder[] };
    return data.PurchaseOrders[0]!;
  }

  async updatePurchaseOrder(
    purchaseOrderId: string,
    purchaseOrder: Partial<XeroPurchaseOrder>
  ): Promise<XeroPurchaseOrder> {
    let response = await this.axios.post(`/PurchaseOrders/${purchaseOrderId}`, purchaseOrder);
    let data = response.data as { PurchaseOrders: XeroPurchaseOrder[] };
    return data.PurchaseOrders[0]!;
  }

  // ─── Quotes ───────────────────────────────────────────────────

  async getQuotes(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
    contactId?: string;
  }): Promise<{ Quotes: XeroQuote[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;
    if (params?.status) query.Status = params.status;
    if (params?.dateFrom) query.DateFrom = params.dateFrom;
    if (params?.dateTo) query.DateTo = params.dateTo;
    if (params?.expiryDateFrom) query.ExpiryDateFrom = params.expiryDateFrom;
    if (params?.expiryDateTo) query.ExpiryDateTo = params.expiryDateTo;
    if (params?.contactId) query.ContactID = params.contactId;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Quotes', { params: query, headers });
    return response.data as { Quotes: XeroQuote[] };
  }

  async getQuote(quoteId: string): Promise<XeroQuote> {
    let response = await this.axios.get(`/Quotes/${quoteId}`);
    let data = response.data as { Quotes: XeroQuote[] };
    return data.Quotes[0]!;
  }

  async createQuote(quote: Partial<XeroQuote>): Promise<XeroQuote> {
    let response = await this.axios.post('/Quotes', quote);
    let data = response.data as { Quotes: XeroQuote[] };
    return data.Quotes[0]!;
  }

  async updateQuote(quoteId: string, quote: Partial<XeroQuote>): Promise<XeroQuote> {
    let response = await this.axios.post(`/Quotes/${quoteId}`, quote);
    let data = response.data as { Quotes: XeroQuote[] };
    return data.Quotes[0]!;
  }

  // ─── Organisation ─────────────────────────────────────────────

  async getOrganisation(): Promise<XeroOrganisation> {
    let response = await this.axios.get('/Organisation');
    let data = response.data as { Organisations: XeroOrganisation[] };
    return data.Organisations[0]!;
  }

  // ─── Reports ──────────────────────────────────────────────────

  async getReport(reportName: string, params?: Record<string, string>): Promise<XeroReport> {
    let response = await this.axios.get(`/Reports/${reportName}`, { params });
    let data = response.data as { Reports: XeroReport[] };
    return data.Reports[0]!;
  }

  // ─── Tax Rates ────────────────────────────────────────────────

  async getTaxRates(params?: {
    where?: string;
    order?: string;
  }): Promise<{ TaxRates: XeroTaxRate[] }> {
    let query: Record<string, any> = {};
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let response = await this.axios.get('/TaxRates', { params: query });
    return response.data as { TaxRates: XeroTaxRate[] };
  }

  // ─── Tracking Categories ──────────────────────────────────────

  async getTrackingCategories(): Promise<{ TrackingCategories: XeroTrackingCategory[] }> {
    let response = await this.axios.get('/TrackingCategories');
    return response.data as { TrackingCategories: XeroTrackingCategory[] };
  }

  // ─── Currencies ───────────────────────────────────────────────

  async getCurrencies(): Promise<{ Currencies: XeroCurrency[] }> {
    let response = await this.axios.get('/Currencies');
    return response.data as { Currencies: XeroCurrency[] };
  }

  // ─── Branding Themes ──────────────────────────────────────────

  async getBrandingThemes(): Promise<{ BrandingThemes: XeroBrandingTheme[] }> {
    let response = await this.axios.get('/BrandingThemes');
    return response.data as { BrandingThemes: XeroBrandingTheme[] };
  }

  // ─── Manual Journals ──────────────────────────────────────────

  async getManualJournals(params?: {
    page?: number;
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ ManualJournals: XeroManualJournal[] }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/ManualJournals', { params: query, headers });
    return response.data as { ManualJournals: XeroManualJournal[] };
  }

  async createManualJournal(journal: Partial<XeroManualJournal>): Promise<XeroManualJournal> {
    let response = await this.axios.post('/ManualJournals', journal);
    let data = response.data as { ManualJournals: XeroManualJournal[] };
    return data.ManualJournals[0]!;
  }

  async updateManualJournal(
    journalId: string,
    journal: Partial<XeroManualJournal>
  ): Promise<XeroManualJournal> {
    let response = await this.axios.post(`/ManualJournals/${journalId}`, journal);
    let data = response.data as { ManualJournals: XeroManualJournal[] };
    return data.ManualJournals[0]!;
  }

  // ─── Items ────────────────────────────────────────────────────

  async getItems(params?: {
    where?: string;
    order?: string;
    modifiedAfter?: string;
  }): Promise<{ Items: XeroItem[] }> {
    let query: Record<string, any> = {};
    if (params?.where) query.where = params.where;
    if (params?.order) query.order = params.order;

    let headers: Record<string, string> = {};
    if (params?.modifiedAfter) {
      headers['If-Modified-Since'] = params.modifiedAfter;
    }

    let response = await this.axios.get('/Items', { params: query, headers });
    return response.data as { Items: XeroItem[] };
  }

  async getItem(itemId: string): Promise<XeroItem> {
    let response = await this.axios.get(`/Items/${itemId}`);
    let data = response.data as { Items: XeroItem[] };
    return data.Items[0]!;
  }

  async createItem(item: Partial<XeroItem>): Promise<XeroItem> {
    let response = await this.axios.put('/Items', { Items: [item] });
    let data = response.data as { Items: XeroItem[] };
    return data.Items[0]!;
  }

  async updateItem(itemId: string, item: Partial<XeroItem>): Promise<XeroItem> {
    let response = await this.axios.post(`/Items/${itemId}`, {
      Items: [item]
    });
    let data = response.data as { Items: XeroItem[] };
    return data.Items[0]!;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.axios.delete(`/Items/${itemId}`);
  }
}
