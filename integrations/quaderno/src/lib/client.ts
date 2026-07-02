import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  accountName: string;
  authMethod?: 'oauth' | 'api_key';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseURL = `https://${config.accountName}.quadernoapp.com/api/`;

    if (config.authMethod === 'oauth') {
      this.axios = createAxios({
        baseURL,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      this.axios = createAxios({
        baseURL,
        auth: {
          username: config.token,
          password: 'x'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // ---- Contacts ----

  async listContacts(params?: { page?: number; q?: string }) {
    let response = await this.axios.get('contacts.json', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`contacts/${contactId}.json`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('contacts.json', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.put(`contacts/${contactId}.json`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    await this.axios.delete(`contacts/${contactId}.json`);
  }

  // ---- Products (Items) ----

  async listProducts(params?: { page?: number; q?: string }) {
    let response = await this.axios.get('items.json', { params });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.axios.get(`items/${productId}.json`);
    return response.data;
  }

  async createProduct(data: Record<string, any>) {
    let response = await this.axios.post('items.json', data);
    return response.data;
  }

  async updateProduct(productId: string, data: Record<string, any>) {
    let response = await this.axios.put(`items/${productId}.json`, data);
    return response.data;
  }

  async deleteProduct(productId: string) {
    await this.axios.delete(`items/${productId}.json`);
  }

  // ---- Invoices ----

  async listInvoices(params?: { page?: number; q?: string; date?: string; state?: string }) {
    let response = await this.axios.get('invoices.json', { params });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.axios.get(`invoices/${invoiceId}.json`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.axios.post('invoices.json', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.axios.put(`invoices/${invoiceId}.json`, data);
    return response.data;
  }

  async deliverInvoice(invoiceId: string) {
    let response = await this.axios.get(`invoices/${invoiceId}/deliver.json`);
    return response.data;
  }

  // ---- Credit Notes ----

  async listCreditNotes(params?: { page?: number; q?: string; date?: string }) {
    let response = await this.axios.get('credits.json', { params });
    return response.data;
  }

  async getCreditNote(creditNoteId: string) {
    let response = await this.axios.get(`credits/${creditNoteId}.json`);
    return response.data;
  }

  async createCreditNote(data: Record<string, any>) {
    let response = await this.axios.post('credits.json', data);
    return response.data;
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>) {
    let response = await this.axios.put(`credits/${creditNoteId}.json`, data);
    return response.data;
  }

  async deliverCreditNote(creditNoteId: string) {
    let response = await this.axios.get(`credits/${creditNoteId}/deliver.json`);
    return response.data;
  }

  // ---- Expenses ----

  async listExpenses(params?: { page?: number; q?: string; date?: string }) {
    let response = await this.axios.get('expenses.json', { params });
    return response.data;
  }

  async getExpense(expenseId: string) {
    let response = await this.axios.get(`expenses/${expenseId}.json`);
    return response.data;
  }

  async createExpense(data: Record<string, any>) {
    let response = await this.axios.post('expenses.json', data);
    return response.data;
  }

  async updateExpense(expenseId: string, data: Record<string, any>) {
    let response = await this.axios.put(`expenses/${expenseId}.json`, data);
    return response.data;
  }

  async deleteExpense(expenseId: string) {
    await this.axios.delete(`expenses/${expenseId}.json`);
  }

  // ---- Estimates ----

  async listEstimates(params?: { page?: number; q?: string }) {
    let response = await this.axios.get('estimates.json', { params });
    return response.data;
  }

  async getEstimate(estimateId: string) {
    let response = await this.axios.get(`estimates/${estimateId}.json`);
    return response.data;
  }

  async createEstimate(data: Record<string, any>) {
    let response = await this.axios.post('estimates.json', data);
    return response.data;
  }

  async updateEstimate(estimateId: string, data: Record<string, any>) {
    let response = await this.axios.put(`estimates/${estimateId}.json`, data);
    return response.data;
  }

  async deleteEstimate(estimateId: string) {
    await this.axios.delete(`estimates/${estimateId}.json`);
  }

  async deliverEstimate(estimateId: string) {
    let response = await this.axios.get(`estimates/${estimateId}/deliver.json`);
    return response.data;
  }

  // ---- Recurring Documents ----

  async listRecurring(params?: { page?: number }) {
    let response = await this.axios.get('recurring.json', { params });
    return response.data;
  }

  async getRecurring(recurringId: string) {
    let response = await this.axios.get(`recurring/${recurringId}.json`);
    return response.data;
  }

  async createRecurring(data: Record<string, any>) {
    let response = await this.axios.post('recurring.json', data);
    return response.data;
  }

  async updateRecurring(recurringId: string, data: Record<string, any>) {
    let response = await this.axios.put(`recurring/${recurringId}.json`, data);
    return response.data;
  }

  async deleteRecurring(recurringId: string) {
    await this.axios.delete(`recurring/${recurringId}.json`);
  }

  // ---- Tax Calculations ----

  async calculateTax(params: {
    to_country: string;
    to_postal_code?: string;
    to_city?: string;
    from_country?: string;
    tax_code?: string;
    amount?: number;
    tax_id?: string;
  }) {
    let response = await this.axios.get('tax_rates/calculate.json', { params });
    return response.data;
  }

  // ---- Tax ID Validation ----

  async validateTaxId(params: { country: string; tax_id: string }) {
    let response = await this.axios.get('tax_ids/validate.json', { params });
    return response.data;
  }

  // ---- Tax Jurisdictions ----

  async listJurisdictions(params?: { page?: number }) {
    let response = await this.axios.get('jurisdictions.json', { params });
    return response.data;
  }

  async getJurisdiction(jurisdictionId: string) {
    let response = await this.axios.get(`jurisdictions/${jurisdictionId}.json`);
    return response.data;
  }

  async createJurisdiction(data: Record<string, any>) {
    let response = await this.axios.post('jurisdictions.json', data);
    return response.data;
  }

  async updateJurisdiction(jurisdictionId: string, data: Record<string, any>) {
    let response = await this.axios.put(`jurisdictions/${jurisdictionId}.json`, data);
    return response.data;
  }

  async deleteJurisdiction(jurisdictionId: string) {
    await this.axios.delete(`jurisdictions/${jurisdictionId}.json`);
  }

  // ---- Transactions ----

  async createTransaction(data: Record<string, any>) {
    let response = await this.axios.post('transactions.json', data);
    return response.data;
  }

  // ---- Checkout Sessions ----

  async listCheckoutSessions(params?: { page?: number }) {
    let response = await this.axios.get('checkout/sessions.json', { params });
    return response.data;
  }

  async getCheckoutSession(sessionId: string) {
    let response = await this.axios.get(`checkout/sessions/${sessionId}.json`);
    return response.data;
  }

  async createCheckoutSession(data: Record<string, any>) {
    let response = await this.axios.post('checkout/sessions.json', data);
    return response.data;
  }

  // ---- Payments ----

  async listPayments(documentType: string, documentId: string) {
    let response = await this.axios.get(`${documentType}/${documentId}/payments.json`);
    return response.data;
  }

  async createPayment(documentType: string, documentId: string, data: Record<string, any>) {
    let response = await this.axios.post(`${documentType}/${documentId}/payments.json`, data);
    return response.data;
  }

  async deletePayment(documentType: string, documentId: string, paymentId: string) {
    await this.axios.delete(`${documentType}/${documentId}/payments/${paymentId}.json`);
  }

  // ---- Reporting ----

  async createReportRequest(data: Record<string, any>) {
    let response = await this.axios.post('reporting/requests.json', data);
    return response.data;
  }

  async getReportRequest(requestId: string) {
    let response = await this.axios.get(`reporting/requests/${requestId}.json`);
    return response.data;
  }

  async listReportRequests(params?: { page?: number }) {
    let response = await this.axios.get('reporting/requests.json', { params });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(params?: { page?: number }) {
    let response = await this.axios.get('webhooks.json', { params });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`webhooks/${webhookId}.json`);
    return response.data;
  }

  async createWebhook(data: { url: string; events_types: string[] }) {
    let response = await this.axios.post('webhooks.json', data);
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>) {
    let response = await this.axios.put(`webhooks/${webhookId}.json`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`webhooks/${webhookId}.json`);
  }

  // ---- Events ----

  async listEvents(params?: { page?: number }) {
    let response = await this.axios.get('events.json', { params });
    return response.data;
  }
}
