import { createAxios } from 'slates';

export class MoneybirdClient {
  private http: ReturnType<typeof createAxios>;
  private administrationId: string;

  constructor(config: { token: string; administrationId: string }) {
    this.administrationId = config.administrationId;
    this.http = createAxios({
      baseURL: `https://moneybird.com/api/v2/${config.administrationId}`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Contacts ──────────────────────────────────────────────────

  async listContacts(params?: {
    page?: number;
    perPage?: number;
    query?: string;
    includeArchived?: boolean;
  }) {
    let response = await this.http.get('/contacts.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        query: params?.query,
        include_archived: params?.includeArchived
      }
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}.json`);
    return response.data;
  }

  async getContactByCustomerId(customerId: string) {
    let response = await this.http.get(`/contacts/customer_id/${customerId}.json`);
    return response.data;
  }

  async createContact(contact: Record<string, any>) {
    let response = await this.http.post('/contacts.json', { contact });
    return response.data;
  }

  async updateContact(contactId: string, contact: Record<string, any>) {
    let response = await this.http.patch(`/contacts/${contactId}.json`, { contact });
    return response.data;
  }

  async deleteContact(contactId: string) {
    await this.http.delete(`/contacts/${contactId}.json`);
  }

  async archiveContact(contactId: string) {
    await this.http.patch(`/contacts/${contactId}/archive.json`);
  }

  async filterContacts(filters: Record<string, string>) {
    let filterParts = Object.entries(filters).map(([k, v]) => `${k}:${v}`);
    let response = await this.http.get('/contacts/filter.json', {
      params: { filter: filterParts.join(',') }
    });
    return response.data;
  }

  // ─── Sales Invoices ────────────────────────────────────────────

  async listSalesInvoices(params?: {
    page?: number;
    perPage?: number;
    state?: string;
    period?: string;
    contactId?: string;
    filter?: string;
  }) {
    let response = await this.http.get('/sales_invoices.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        state: params?.state,
        period: params?.period,
        contact_id: params?.contactId,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getSalesInvoice(invoiceId: string) {
    let response = await this.http.get(`/sales_invoices/${invoiceId}.json`);
    return response.data;
  }

  async findSalesInvoiceByInvoiceId(invoiceId: string) {
    let response = await this.http.get(`/sales_invoices/find_by_invoice_id/${invoiceId}.json`);
    return response.data;
  }

  async createSalesInvoice(invoice: Record<string, any>) {
    let response = await this.http.post('/sales_invoices.json', { sales_invoice: invoice });
    return response.data;
  }

  async updateSalesInvoice(invoiceId: string, invoice: Record<string, any>) {
    let response = await this.http.patch(`/sales_invoices/${invoiceId}.json`, {
      sales_invoice: invoice
    });
    return response.data;
  }

  async deleteSalesInvoice(invoiceId: string) {
    await this.http.delete(`/sales_invoices/${invoiceId}.json`);
  }

  async sendSalesInvoice(invoiceId: string, sendOptions?: Record<string, any>) {
    let response = await this.http.patch(
      `/sales_invoices/${invoiceId}/sends_an_invoice.json`,
      {
        sales_invoice_sending: sendOptions || {}
      }
    );
    return response.data;
  }

  async registerPayment(invoiceId: string, payment: Record<string, any>) {
    let response = await this.http.patch(
      `/sales_invoices/${invoiceId}/register_a_payment.json`,
      {
        payment
      }
    );
    return response.data;
  }

  async createCreditInvoice(invoiceId: string) {
    let response = await this.http.patch(
      `/sales_invoices/${invoiceId}/duplicate_creditinvoice.json`
    );
    return response.data;
  }

  async pauseSalesInvoice(invoiceId: string) {
    let response = await this.http.post(`/sales_invoices/${invoiceId}/pause.json`);
    return response.data;
  }

  async resumeSalesInvoice(invoiceId: string) {
    let response = await this.http.post(`/sales_invoices/${invoiceId}/resume.json`);
    return response.data;
  }

  // ─── Recurring Sales Invoices ──────────────────────────────────

  async listRecurringSalesInvoices(params?: {
    page?: number;
    perPage?: number;
    filter?: string;
  }) {
    let response = await this.http.get('/recurring_sales_invoices.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getRecurringSalesInvoice(recurringInvoiceId: string) {
    let response = await this.http.get(`/recurring_sales_invoices/${recurringInvoiceId}.json`);
    return response.data;
  }

  async createRecurringSalesInvoice(invoice: Record<string, any>) {
    let response = await this.http.post('/recurring_sales_invoices.json', {
      recurring_sales_invoice: invoice
    });
    return response.data;
  }

  async updateRecurringSalesInvoice(recurringInvoiceId: string, invoice: Record<string, any>) {
    let response = await this.http.patch(
      `/recurring_sales_invoices/${recurringInvoiceId}.json`,
      { recurring_sales_invoice: invoice }
    );
    return response.data;
  }

  async deleteRecurringSalesInvoice(recurringInvoiceId: string) {
    await this.http.delete(`/recurring_sales_invoices/${recurringInvoiceId}.json`);
  }

  // ─── Estimates ─────────────────────────────────────────────────

  async listEstimates(params?: {
    page?: number;
    perPage?: number;
    state?: string;
    period?: string;
    contactId?: string;
  }) {
    let response = await this.http.get('/estimates.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        state: params?.state,
        period: params?.period,
        contact_id: params?.contactId
      }
    });
    return response.data;
  }

  async getEstimate(estimateId: string) {
    let response = await this.http.get(`/estimates/${estimateId}.json`);
    return response.data;
  }

  async createEstimate(estimate: Record<string, any>) {
    let response = await this.http.post('/estimates.json', { estimate });
    return response.data;
  }

  async updateEstimate(estimateId: string, estimate: Record<string, any>) {
    let response = await this.http.patch(`/estimates/${estimateId}.json`, { estimate });
    return response.data;
  }

  async deleteEstimate(estimateId: string) {
    await this.http.delete(`/estimates/${estimateId}.json`);
  }

  async sendEstimate(estimateId: string, sendOptions?: Record<string, any>) {
    let response = await this.http.patch(`/estimates/${estimateId}/send_estimate.json`, {
      estimate_sending: sendOptions || {}
    });
    return response.data;
  }

  async changeEstimateState(estimateId: string, state: string) {
    let response = await this.http.patch(`/estimates/${estimateId}/change_state.json`, {
      state
    });
    return response.data;
  }

  async billEstimate(estimateId: string) {
    let response = await this.http.patch(`/estimates/${estimateId}/bill_estimate.json`);
    return response.data;
  }

  // ─── Products ──────────────────────────────────────────────────

  async listProducts(params?: {
    page?: number;
    perPage?: number;
    query?: string;
    currency?: string;
  }) {
    let response = await this.http.get('/products.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        query: params?.query,
        currency: params?.currency
      }
    });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.http.get(`/products/${productId}.json`);
    return response.data;
  }

  async getProductByIdentifier(identifier: string) {
    let response = await this.http.get(`/products/identifier/${identifier}.json`);
    return response.data;
  }

  async createProduct(product: Record<string, any>) {
    let response = await this.http.post('/products.json', { product });
    return response.data;
  }

  async updateProduct(productId: string, product: Record<string, any>) {
    let response = await this.http.patch(`/products/${productId}.json`, { product });
    return response.data;
  }

  async deleteProduct(productId: string) {
    await this.http.delete(`/products/${productId}.json`);
  }

  // ─── Ledger Accounts ──────────────────────────────────────────

  async listLedgerAccounts() {
    let response = await this.http.get('/ledger_accounts.json');
    return response.data;
  }

  async getLedgerAccount(ledgerAccountId: string) {
    let response = await this.http.get(`/ledger_accounts/${ledgerAccountId}.json`);
    return response.data;
  }

  async createLedgerAccount(ledgerAccount: Record<string, any>) {
    let response = await this.http.post('/ledger_accounts.json', {
      ledger_account: ledgerAccount
    });
    return response.data;
  }

  async updateLedgerAccount(ledgerAccountId: string, ledgerAccount: Record<string, any>) {
    let response = await this.http.patch(`/ledger_accounts/${ledgerAccountId}.json`, {
      ledger_account: ledgerAccount
    });
    return response.data;
  }

  async deleteLedgerAccount(ledgerAccountId: string) {
    await this.http.delete(`/ledger_accounts/${ledgerAccountId}.json`);
  }

  // ─── Tax Rates ─────────────────────────────────────────────────

  async listTaxRates() {
    let response = await this.http.get('/tax_rates.json');
    return response.data;
  }

  // ─── Time Entries ──────────────────────────────────────────────

  async listTimeEntries(params?: {
    page?: number;
    perPage?: number;
    filter?: string;
    query?: string;
  }) {
    let response = await this.http.get('/time_entries.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter,
        query: params?.query
      }
    });
    return response.data;
  }

  async getTimeEntry(timeEntryId: string) {
    let response = await this.http.get(`/time_entries/${timeEntryId}.json`);
    return response.data;
  }

  async createTimeEntry(timeEntry: Record<string, any>) {
    let response = await this.http.post('/time_entries.json', { time_entry: timeEntry });
    return response.data;
  }

  async updateTimeEntry(timeEntryId: string, timeEntry: Record<string, any>) {
    let response = await this.http.patch(`/time_entries/${timeEntryId}.json`, {
      time_entry: timeEntry
    });
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: string) {
    await this.http.delete(`/time_entries/${timeEntryId}.json`);
  }

  // ─── Projects ──────────────────────────────────────────────────

  async listProjects(params?: { page?: number; perPage?: number; filter?: string }) {
    let response = await this.http.get('/projects.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}.json`);
    return response.data;
  }

  async createProject(project: Record<string, any>) {
    let response = await this.http.post('/projects.json', { project });
    return response.data;
  }

  async updateProject(projectId: string, project: Record<string, any>) {
    let response = await this.http.patch(`/projects/${projectId}.json`, { project });
    return response.data;
  }

  async deleteProject(projectId: string) {
    await this.http.delete(`/projects/${projectId}.json`);
  }

  // ─── Financial Mutations ───────────────────────────────────────

  async listFinancialMutations(params?: { page?: number; perPage?: number; filter?: string }) {
    let response = await this.http.get('/financial_mutations.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getFinancialMutation(mutationId: string) {
    let response = await this.http.get(`/financial_mutations/${mutationId}.json`);
    return response.data;
  }

  async linkBooking(mutationId: string, booking: Record<string, any>) {
    let response = await this.http.patch(
      `/financial_mutations/${mutationId}/link_booking.json`,
      booking
    );
    return response.data;
  }

  async unlinkBooking(mutationId: string, booking: Record<string, any>) {
    let response = await this.http.delete(
      `/financial_mutations/${mutationId}/unlink_booking.json`,
      {
        data: booking
      }
    );
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async createWebhook(url: string, events?: string[]) {
    let body: Record<string, any> = { url };
    if (events && events.length > 0) {
      body.enabled_events = events;
    }
    let response = await this.http.post('/webhooks.json', body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}.json`);
  }

  async listWebhooks() {
    let response = await this.http.get('/webhooks.json');
    return response.data;
  }
}
