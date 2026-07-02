import { createAxios } from 'slates';

export interface ZohoClientConfig {
  token: string;
  organizationId: string;
  region: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private organizationId: string;

  constructor(config: ZohoClientConfig) {
    this.organizationId = config.organizationId;
    let baseURL = `https://www.zohoapis${config.region}/books/v3`;
    this.http = createAxios({ baseURL });
    this.http.defaults.headers.common.Authorization = `Zoho-oauthtoken ${config.token}`;
  }

  private params(extra?: Record<string, any>) {
    return { organization_id: this.organizationId, ...extra };
  }

  // ─── Contacts ──────────────────────────────────────────────

  async listContacts(query?: Record<string, any>) {
    let resp = await this.http.get('/contacts', { params: this.params(query) });
    return resp.data;
  }

  async getContact(contactId: string) {
    let resp = await this.http.get(`/contacts/${contactId}`, { params: this.params() });
    return resp.data;
  }

  async createContact(data: Record<string, any>) {
    let resp = await this.http.post('/contacts', data, { params: this.params() });
    return resp.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/contacts/${contactId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteContact(contactId: string) {
    let resp = await this.http.delete(`/contacts/${contactId}`, { params: this.params() });
    return resp.data;
  }

  async listContactPersons(contactId: string) {
    let resp = await this.http.get(`/contacts/${contactId}/contactpersons`, {
      params: this.params()
    });
    return resp.data;
  }

  async markContactActive(contactId: string) {
    let resp = await this.http.post(`/contacts/${contactId}/active`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markContactInactive(contactId: string) {
    let resp = await this.http.post(`/contacts/${contactId}/inactive`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Invoices ──────────────────────────────────────────────

  async listInvoices(query?: Record<string, any>) {
    let resp = await this.http.get('/invoices', { params: this.params(query) });
    return resp.data;
  }

  async getInvoice(invoiceId: string) {
    let resp = await this.http.get(`/invoices/${invoiceId}`, { params: this.params() });
    return resp.data;
  }

  async createInvoice(data: Record<string, any>) {
    let resp = await this.http.post('/invoices', data, { params: this.params() });
    return resp.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/invoices/${invoiceId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteInvoice(invoiceId: string) {
    let resp = await this.http.delete(`/invoices/${invoiceId}`, { params: this.params() });
    return resp.data;
  }

  async markInvoiceSent(invoiceId: string) {
    let resp = await this.http.post(`/invoices/${invoiceId}/status/sent`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markInvoiceVoid(invoiceId: string) {
    let resp = await this.http.post(`/invoices/${invoiceId}/status/void`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async emailInvoice(invoiceId: string, emailData: Record<string, any>) {
    let resp = await this.http.post(`/invoices/${invoiceId}/email`, emailData, {
      params: this.params()
    });
    return resp.data;
  }

  async applyCreditsToInvoice(invoiceId: string, creditsData: Record<string, any>) {
    let resp = await this.http.post(`/invoices/${invoiceId}/credits`, creditsData, {
      params: this.params()
    });
    return resp.data;
  }

  async writeOffInvoice(invoiceId: string) {
    let resp = await this.http.post(`/invoices/${invoiceId}/writeoff`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async cancelWriteOff(invoiceId: string) {
    let resp = await this.http.post(`/invoices/${invoiceId}/writeoff/cancel`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Estimates ─────────────────────────────────────────────

  async listEstimates(query?: Record<string, any>) {
    let resp = await this.http.get('/estimates', { params: this.params(query) });
    return resp.data;
  }

  async getEstimate(estimateId: string) {
    let resp = await this.http.get(`/estimates/${estimateId}`, { params: this.params() });
    return resp.data;
  }

  async createEstimate(data: Record<string, any>) {
    let resp = await this.http.post('/estimates', data, { params: this.params() });
    return resp.data;
  }

  async updateEstimate(estimateId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/estimates/${estimateId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteEstimate(estimateId: string) {
    let resp = await this.http.delete(`/estimates/${estimateId}`, { params: this.params() });
    return resp.data;
  }

  async markEstimateSent(estimateId: string) {
    let resp = await this.http.post(`/estimates/${estimateId}/status/sent`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markEstimateAccepted(estimateId: string) {
    let resp = await this.http.post(`/estimates/${estimateId}/status/accepted`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markEstimateDeclined(estimateId: string) {
    let resp = await this.http.post(`/estimates/${estimateId}/status/declined`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async convertEstimateToInvoice(estimateId: string) {
    let resp = await this.http.post(`/estimates/${estimateId}/lineitems/invoices`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async emailEstimate(estimateId: string, emailData: Record<string, any>) {
    let resp = await this.http.post(`/estimates/${estimateId}/email`, emailData, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Sales Orders ─────────────────────────────────────────

  async listSalesOrders(query?: Record<string, any>) {
    let resp = await this.http.get('/salesorders', { params: this.params(query) });
    return resp.data;
  }

  async getSalesOrder(salesOrderId: string) {
    let resp = await this.http.get(`/salesorders/${salesOrderId}`, { params: this.params() });
    return resp.data;
  }

  async createSalesOrder(data: Record<string, any>) {
    let resp = await this.http.post('/salesorders', data, { params: this.params() });
    return resp.data;
  }

  async updateSalesOrder(salesOrderId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/salesorders/${salesOrderId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteSalesOrder(salesOrderId: string) {
    let resp = await this.http.delete(`/salesorders/${salesOrderId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async markSalesOrderOpen(salesOrderId: string) {
    let resp = await this.http.post(`/salesorders/${salesOrderId}/status/open`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markSalesOrderVoid(salesOrderId: string) {
    let resp = await this.http.post(`/salesorders/${salesOrderId}/status/void`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async convertSalesOrderToInvoice(salesOrderId: string) {
    let resp = await this.http.post(`/salesorders/${salesOrderId}/invoices`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Purchase Orders ──────────────────────────────────────

  async listPurchaseOrders(query?: Record<string, any>) {
    let resp = await this.http.get('/purchaseorders', { params: this.params(query) });
    return resp.data;
  }

  async getPurchaseOrder(purchaseOrderId: string) {
    let resp = await this.http.get(`/purchaseorders/${purchaseOrderId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async createPurchaseOrder(data: Record<string, any>) {
    let resp = await this.http.post('/purchaseorders', data, { params: this.params() });
    return resp.data;
  }

  async updatePurchaseOrder(purchaseOrderId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/purchaseorders/${purchaseOrderId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deletePurchaseOrder(purchaseOrderId: string) {
    let resp = await this.http.delete(`/purchaseorders/${purchaseOrderId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async markPurchaseOrderOpen(purchaseOrderId: string) {
    let resp = await this.http.post(`/purchaseorders/${purchaseOrderId}/status/open`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async convertPurchaseOrderToBill(purchaseOrderId: string) {
    let resp = await this.http.post(`/purchaseorders/${purchaseOrderId}/bills`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Bills ─────────────────────────────────────────────────

  async listBills(query?: Record<string, any>) {
    let resp = await this.http.get('/bills', { params: this.params(query) });
    return resp.data;
  }

  async getBill(billId: string) {
    let resp = await this.http.get(`/bills/${billId}`, { params: this.params() });
    return resp.data;
  }

  async createBill(data: Record<string, any>) {
    let resp = await this.http.post('/bills', data, { params: this.params() });
    return resp.data;
  }

  async updateBill(billId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/bills/${billId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteBill(billId: string) {
    let resp = await this.http.delete(`/bills/${billId}`, { params: this.params() });
    return resp.data;
  }

  async markBillOpen(billId: string) {
    let resp = await this.http.post(`/bills/${billId}/status/open`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markBillVoid(billId: string) {
    let resp = await this.http.post(`/bills/${billId}/status/void`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Expenses ──────────────────────────────────────────────

  async listExpenses(query?: Record<string, any>) {
    let resp = await this.http.get('/expenses', { params: this.params(query) });
    return resp.data;
  }

  async getExpense(expenseId: string) {
    let resp = await this.http.get(`/expenses/${expenseId}`, { params: this.params() });
    return resp.data;
  }

  async createExpense(data: Record<string, any>) {
    let resp = await this.http.post('/expenses', data, { params: this.params() });
    return resp.data;
  }

  async updateExpense(expenseId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/expenses/${expenseId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteExpense(expenseId: string) {
    let resp = await this.http.delete(`/expenses/${expenseId}`, { params: this.params() });
    return resp.data;
  }

  // ─── Customer Payments ─────────────────────────────────────

  async listCustomerPayments(query?: Record<string, any>) {
    let resp = await this.http.get('/customerpayments', { params: this.params(query) });
    return resp.data;
  }

  async getCustomerPayment(paymentId: string) {
    let resp = await this.http.get(`/customerpayments/${paymentId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async createCustomerPayment(data: Record<string, any>) {
    let resp = await this.http.post('/customerpayments', data, { params: this.params() });
    return resp.data;
  }

  async updateCustomerPayment(paymentId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/customerpayments/${paymentId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteCustomerPayment(paymentId: string) {
    let resp = await this.http.delete(`/customerpayments/${paymentId}`, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Vendor Payments ───────────────────────────────────────

  async listVendorPayments(query?: Record<string, any>) {
    let resp = await this.http.get('/vendorpayments', { params: this.params(query) });
    return resp.data;
  }

  async getVendorPayment(paymentId: string) {
    let resp = await this.http.get(`/vendorpayments/${paymentId}`, { params: this.params() });
    return resp.data;
  }

  async createVendorPayment(data: Record<string, any>) {
    let resp = await this.http.post('/vendorpayments', data, { params: this.params() });
    return resp.data;
  }

  async updateVendorPayment(paymentId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/vendorpayments/${paymentId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteVendorPayment(paymentId: string) {
    let resp = await this.http.delete(`/vendorpayments/${paymentId}`, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Credit Notes ──────────────────────────────────────────

  async listCreditNotes(query?: Record<string, any>) {
    let resp = await this.http.get('/creditnotes', { params: this.params(query) });
    return resp.data;
  }

  async getCreditNote(creditNoteId: string) {
    let resp = await this.http.get(`/creditnotes/${creditNoteId}`, { params: this.params() });
    return resp.data;
  }

  async createCreditNote(data: Record<string, any>) {
    let resp = await this.http.post('/creditnotes', data, { params: this.params() });
    return resp.data;
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/creditnotes/${creditNoteId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteCreditNote(creditNoteId: string) {
    let resp = await this.http.delete(`/creditnotes/${creditNoteId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async applyCreditNoteToInvoices(
    creditNoteId: string,
    invoices: Array<{ invoice_id: string; amount_applied: number }>
  ) {
    let resp = await this.http.post(
      `/creditnotes/${creditNoteId}/invoices`,
      { invoices },
      { params: this.params() }
    );
    return resp.data;
  }

  // ─── Vendor Credits (Debit Notes) ─────────────────────────

  async listVendorCredits(query?: Record<string, any>) {
    let resp = await this.http.get('/vendorcredits', { params: this.params(query) });
    return resp.data;
  }

  async getVendorCredit(vendorCreditId: string) {
    let resp = await this.http.get(`/vendorcredits/${vendorCreditId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async createVendorCredit(data: Record<string, any>) {
    let resp = await this.http.post('/vendorcredits', data, { params: this.params() });
    return resp.data;
  }

  async updateVendorCredit(vendorCreditId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/vendorcredits/${vendorCreditId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteVendorCredit(vendorCreditId: string) {
    let resp = await this.http.delete(`/vendorcredits/${vendorCreditId}`, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(query?: Record<string, any>) {
    let resp = await this.http.get('/projects', { params: this.params(query) });
    return resp.data;
  }

  async getProject(projectId: string) {
    let resp = await this.http.get(`/projects/${projectId}`, { params: this.params() });
    return resp.data;
  }

  async createProject(data: Record<string, any>) {
    let resp = await this.http.post('/projects', data, { params: this.params() });
    return resp.data;
  }

  async updateProject(projectId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/projects/${projectId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteProject(projectId: string) {
    let resp = await this.http.delete(`/projects/${projectId}`, { params: this.params() });
    return resp.data;
  }

  // ─── Time Entries ──────────────────────────────────────────

  async listTimeEntries(query?: Record<string, any>) {
    let resp = await this.http.get('/projects/timeentries', { params: this.params(query) });
    return resp.data;
  }

  async getTimeEntry(timeEntryId: string) {
    let resp = await this.http.get(`/projects/timeentries/${timeEntryId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async logTimeEntry(data: Record<string, any>) {
    let resp = await this.http.post('/projects/timeentries', data, { params: this.params() });
    return resp.data;
  }

  async updateTimeEntry(timeEntryId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/projects/timeentries/${timeEntryId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteTimeEntry(timeEntryId: string) {
    let resp = await this.http.delete(`/projects/timeentries/${timeEntryId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async startTimer(timeEntryId: string) {
    let resp = await this.http.post(`/projects/timeentries/${timeEntryId}/timer/start`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async stopTimer(timeEntryId: string) {
    let resp = await this.http.post(`/projects/timeentries/${timeEntryId}/timer/stop`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Items ─────────────────────────────────────────────────

  async listItems(query?: Record<string, any>) {
    let resp = await this.http.get('/items', { params: this.params(query) });
    return resp.data;
  }

  async getItem(itemId: string) {
    let resp = await this.http.get(`/items/${itemId}`, { params: this.params() });
    return resp.data;
  }

  async createItem(data: Record<string, any>) {
    let resp = await this.http.post('/items', data, { params: this.params() });
    return resp.data;
  }

  async updateItem(itemId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/items/${itemId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteItem(itemId: string) {
    let resp = await this.http.delete(`/items/${itemId}`, { params: this.params() });
    return resp.data;
  }

  async markItemActive(itemId: string) {
    let resp = await this.http.post(`/items/${itemId}/active`, null, {
      params: this.params()
    });
    return resp.data;
  }

  async markItemInactive(itemId: string) {
    let resp = await this.http.post(`/items/${itemId}/inactive`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Banking ───────────────────────────────────────────────

  async listBankAccounts(query?: Record<string, any>) {
    let resp = await this.http.get('/bankaccounts', { params: this.params(query) });
    return resp.data;
  }

  async getBankAccount(accountId: string) {
    let resp = await this.http.get(`/bankaccounts/${accountId}`, { params: this.params() });
    return resp.data;
  }

  async listBankTransactions(query?: Record<string, any>) {
    let resp = await this.http.get('/banktransactions', { params: this.params(query) });
    return resp.data;
  }

  async getBankTransaction(transactionId: string) {
    let resp = await this.http.get(`/banktransactions/${transactionId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async createBankTransaction(data: Record<string, any>) {
    let resp = await this.http.post('/banktransactions', data, { params: this.params() });
    return resp.data;
  }

  async matchBankTransaction(transactionId: string, data: Record<string, any>) {
    let resp = await this.http.post(`/banktransactions/${transactionId}/match`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async unmatchBankTransaction(transactionId: string) {
    let resp = await this.http.post(`/banktransactions/${transactionId}/unmatch`, null, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Chart of Accounts ────────────────────────────────────

  async listChartOfAccounts(query?: Record<string, any>) {
    let resp = await this.http.get('/chartofaccounts', { params: this.params(query) });
    return resp.data;
  }

  async getChartOfAccount(accountId: string) {
    let resp = await this.http.get(`/chartofaccounts/${accountId}`, { params: this.params() });
    return resp.data;
  }

  async createChartOfAccount(data: Record<string, any>) {
    let resp = await this.http.post('/chartofaccounts', data, { params: this.params() });
    return resp.data;
  }

  async updateChartOfAccount(accountId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/chartofaccounts/${accountId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteChartOfAccount(accountId: string) {
    let resp = await this.http.delete(`/chartofaccounts/${accountId}`, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Journals ──────────────────────────────────────────────

  async listJournals(query?: Record<string, any>) {
    let resp = await this.http.get('/journals', { params: this.params(query) });
    return resp.data;
  }

  async getJournal(journalId: string) {
    let resp = await this.http.get(`/journals/${journalId}`, { params: this.params() });
    return resp.data;
  }

  async createJournal(data: Record<string, any>) {
    let resp = await this.http.post('/journals', data, { params: this.params() });
    return resp.data;
  }

  async updateJournal(journalId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/journals/${journalId}`, data, { params: this.params() });
    return resp.data;
  }

  async deleteJournal(journalId: string) {
    let resp = await this.http.delete(`/journals/${journalId}`, { params: this.params() });
    return resp.data;
  }

  // ─── Taxes ─────────────────────────────────────────────────

  async listTaxes(query?: Record<string, any>) {
    let resp = await this.http.get('/settings/taxes', { params: this.params(query) });
    return resp.data;
  }

  async getTax(taxId: string) {
    let resp = await this.http.get(`/settings/taxes/${taxId}`, { params: this.params() });
    return resp.data;
  }

  async createTax(data: Record<string, any>) {
    let resp = await this.http.post('/settings/taxes', data, { params: this.params() });
    return resp.data;
  }

  async updateTax(taxId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/settings/taxes/${taxId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteTax(taxId: string) {
    let resp = await this.http.delete(`/settings/taxes/${taxId}`, { params: this.params() });
    return resp.data;
  }

  // ─── Currencies ────────────────────────────────────────────

  async listCurrencies(query?: Record<string, any>) {
    let resp = await this.http.get('/settings/currencies', { params: this.params(query) });
    return resp.data;
  }

  async createCurrency(data: Record<string, any>) {
    let resp = await this.http.post('/settings/currencies', data, { params: this.params() });
    return resp.data;
  }

  // ─── Organizations ────────────────────────────────────────

  async listOrganizations() {
    let resp = await this.http.get('/organizations', { params: this.params() });
    return resp.data;
  }

  async getOrganization(organizationId: string) {
    let resp = await this.http.get(`/organizations/${organizationId}`, {
      params: this.params()
    });
    return resp.data;
  }

  // ─── Recurring Invoices ───────────────────────────────────

  async listRecurringInvoices(query?: Record<string, any>) {
    let resp = await this.http.get('/recurringinvoices', { params: this.params(query) });
    return resp.data;
  }

  async getRecurringInvoice(recurringInvoiceId: string) {
    let resp = await this.http.get(`/recurringinvoices/${recurringInvoiceId}`, {
      params: this.params()
    });
    return resp.data;
  }

  async createRecurringInvoice(data: Record<string, any>) {
    let resp = await this.http.post('/recurringinvoices', data, { params: this.params() });
    return resp.data;
  }

  async updateRecurringInvoice(recurringInvoiceId: string, data: Record<string, any>) {
    let resp = await this.http.put(`/recurringinvoices/${recurringInvoiceId}`, data, {
      params: this.params()
    });
    return resp.data;
  }

  async deleteRecurringInvoice(recurringInvoiceId: string) {
    let resp = await this.http.delete(`/recurringinvoices/${recurringInvoiceId}`, {
      params: this.params()
    });
    return resp.data;
  }
}
