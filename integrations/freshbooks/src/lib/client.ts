import { createAxios } from 'slates';

export class FreshBooksClient {
  private http: ReturnType<typeof createAxios>;
  private accountId: string;
  private businessId?: string;

  constructor(config: { token: string; accountId: string; businessId?: string }) {
    this.accountId = config.accountId;
    this.businessId = config.businessId;
    this.http = createAxios({
      baseURL: 'https://api.freshbooks.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Api-Version': 'alpha',
        'Content-Type': 'application/json'
      }
    });
  }

  private get accountingBase() {
    return `/accounting/account/${this.accountId}`;
  }

  private get eventsBase() {
    return `/events/account/${this.accountId}`;
  }

  private get timetrackingBase() {
    if (!this.businessId) {
      throw new Error('businessId is required for time tracking endpoints');
    }
    return `/timetracking/business/${this.businessId}`;
  }

  private get projectsBase() {
    if (!this.businessId) {
      throw new Error('businessId is required for project endpoints');
    }
    return `/projects/business/${this.businessId}`;
  }

  // ========== Clients ==========

  async listClients(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/users/clients`, { params });
    return response.data.response.result;
  }

  async getClient(clientId: number) {
    let response = await this.http.get(`${this.accountingBase}/users/clients/${clientId}`);
    return response.data.response.result.client;
  }

  async createClient(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/users/clients`, {
      client: data
    });
    return response.data.response.result.client;
  }

  async updateClient(clientId: number, data: Record<string, any>) {
    let response = await this.http.put(`${this.accountingBase}/users/clients/${clientId}`, {
      client: data
    });
    return response.data.response.result.client;
  }

  async deleteClient(clientId: number) {
    let response = await this.http.put(`${this.accountingBase}/users/clients/${clientId}`, {
      client: { vis_state: 1 }
    });
    return response.data.response.result.client;
  }

  // ========== Invoices ==========

  async listInvoices(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/invoices/invoices`, { params });
    return response.data.response.result;
  }

  async getInvoice(invoiceId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/invoices/invoices/${invoiceId}`
    );
    return response.data.response.result.invoice;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/invoices/invoices`, {
      invoice: data
    });
    return response.data.response.result.invoice;
  }

  async updateInvoice(invoiceId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/invoices/invoices/${invoiceId}`,
      { invoice: data }
    );
    return response.data.response.result.invoice;
  }

  async deleteInvoice(invoiceId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/invoices/invoices/${invoiceId}`,
      { invoice: { vis_state: 1 } }
    );
    return response.data.response.result.invoice;
  }

  async sendInvoiceByEmail(invoiceId: number, recipients: string[]) {
    let response = await this.http.put(
      `${this.accountingBase}/invoices/invoices/${invoiceId}`,
      {
        invoice: {
          action_email: true,
          email_recipients: recipients
        }
      }
    );
    return response.data.response.result.invoice;
  }

  async markInvoiceAsSent(invoiceId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/invoices/invoices/${invoiceId}`,
      {
        invoice: {
          action_mark_as_sent: true
        }
      }
    );
    return response.data.response.result.invoice;
  }

  // ========== Payments ==========

  async listPayments(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/payments/payments`, { params });
    return response.data.response.result;
  }

  async getPayment(paymentId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/payments/payments/${paymentId}`
    );
    return response.data.response.result.payment;
  }

  async createPayment(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/payments/payments`, {
      payment: data
    });
    return response.data.response.result.payment;
  }

  async updatePayment(paymentId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/payments/payments/${paymentId}`,
      { payment: data }
    );
    return response.data.response.result.payment;
  }

  async deletePayment(paymentId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/payments/payments/${paymentId}`,
      { payment: { vis_state: 1 } }
    );
    return response.data.response.result.payment;
  }

  // ========== Estimates ==========

  async listEstimates(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/estimates/estimates`, {
      params
    });
    return response.data.response.result;
  }

  async getEstimate(estimateId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/estimates/estimates/${estimateId}`
    );
    return response.data.response.result.estimate;
  }

  async createEstimate(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/estimates/estimates`, {
      estimate: data
    });
    return response.data.response.result.estimate;
  }

  async updateEstimate(estimateId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/estimates/estimates/${estimateId}`,
      { estimate: data }
    );
    return response.data.response.result.estimate;
  }

  async deleteEstimate(estimateId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/estimates/estimates/${estimateId}`,
      { estimate: { vis_state: 1 } }
    );
    return response.data.response.result.estimate;
  }

  async sendEstimateByEmail(estimateId: number, recipients: string[]) {
    let response = await this.http.put(
      `${this.accountingBase}/estimates/estimates/${estimateId}`,
      {
        estimate: {
          action_email: true,
          email_recipients: recipients
        }
      }
    );
    return response.data.response.result.estimate;
  }

  // ========== Expenses ==========

  async listExpenses(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/expenses/expenses`, { params });
    return response.data.response.result;
  }

  async getExpense(expenseId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/expenses/expenses/${expenseId}`
    );
    return response.data.response.result.expense;
  }

  async createExpense(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/expenses/expenses`, {
      expense: data
    });
    return response.data.response.result.expense;
  }

  async updateExpense(expenseId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/expenses/expenses/${expenseId}`,
      { expense: data }
    );
    return response.data.response.result.expense;
  }

  async deleteExpense(expenseId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/expenses/expenses/${expenseId}`,
      { expense: { vis_state: 1 } }
    );
    return response.data.response.result.expense;
  }

  // ========== Time Entries ==========

  async listTimeEntries(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.timetrackingBase}/time_entries`, { params });
    return response.data;
  }

  async getTimeEntry(timeEntryId: number) {
    let response = await this.http.get(`${this.timetrackingBase}/time_entries/${timeEntryId}`);
    return response.data.time_entry;
  }

  async createTimeEntry(data: Record<string, any>) {
    let response = await this.http.post(`${this.timetrackingBase}/time_entries`, {
      time_entry: data
    });
    return response.data.time_entry;
  }

  async updateTimeEntry(timeEntryId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.timetrackingBase}/time_entries/${timeEntryId}`,
      { time_entry: data }
    );
    return response.data.time_entry;
  }

  async deleteTimeEntry(timeEntryId: number) {
    await this.http.delete(`${this.timetrackingBase}/time_entries/${timeEntryId}`);
  }

  // ========== Projects ==========

  async listProjects(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.projectsBase}/projects`, { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.http.get(`${this.projectsBase}/project/${projectId}`);
    return response.data.project;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.http.post(`${this.projectsBase}/project`, { project: data });
    return response.data.project;
  }

  async updateProject(projectId: number, data: Record<string, any>) {
    let response = await this.http.put(`${this.projectsBase}/project/${projectId}`, {
      project: data
    });
    return response.data.project;
  }

  async deleteProject(projectId: number) {
    await this.http.delete(`${this.projectsBase}/project/${projectId}`);
  }

  // ========== Taxes ==========

  async listTaxes(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/taxes/taxes`, { params });
    return response.data.response.result;
  }

  async getTax(taxId: number) {
    let response = await this.http.get(`${this.accountingBase}/taxes/taxes/${taxId}`);
    return response.data.response.result.tax;
  }

  async createTax(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/taxes/taxes`, { tax: data });
    return response.data.response.result.tax;
  }

  async updateTax(taxId: number, data: Record<string, any>) {
    let response = await this.http.put(`${this.accountingBase}/taxes/taxes/${taxId}`, {
      tax: data
    });
    return response.data.response.result.tax;
  }

  async deleteTax(taxId: number) {
    await this.http.delete(`${this.accountingBase}/taxes/taxes/${taxId}`);
  }

  // ========== Items (Billable Items) ==========

  async listItems(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/items/items`, { params });
    return response.data.response.result;
  }

  async getItem(itemId: number) {
    let response = await this.http.get(`${this.accountingBase}/items/items/${itemId}`);
    return response.data.response.result.item;
  }

  async createItem(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/items/items`, { item: data });
    return response.data.response.result.item;
  }

  async updateItem(itemId: number, data: Record<string, any>) {
    let response = await this.http.put(`${this.accountingBase}/items/items/${itemId}`, {
      item: data
    });
    return response.data.response.result.item;
  }

  async deleteItem(itemId: number) {
    let response = await this.http.put(`${this.accountingBase}/items/items/${itemId}`, {
      item: { vis_state: 1 }
    });
    return response.data.response.result.item;
  }

  // ========== Webhooks ==========

  async listWebhooks() {
    let response = await this.http.get(`${this.eventsBase}/events/callbacks`);
    return response.data.response.result;
  }

  async createWebhook(event: string, uri: string) {
    let response = await this.http.post(`${this.eventsBase}/events/callbacks`, {
      callback: { event, uri }
    });
    return response.data.response.result.callback;
  }

  async verifyWebhook(callbackId: number, verifier: string) {
    let response = await this.http.put(`${this.eventsBase}/events/callbacks/${callbackId}`, {
      callback: { verifier }
    });
    return response.data.response.result.callback;
  }

  async deleteWebhook(callbackId: number) {
    await this.http.delete(`${this.eventsBase}/events/callbacks/${callbackId}`);
  }

  // ========== Credit Notes ==========

  async listCreditNotes(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/credit_notes/credit_notes`, {
      params
    });
    return response.data.response.result;
  }

  async getCreditNote(creditNoteId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/credit_notes/credit_notes/${creditNoteId}`
    );
    return response.data.response.result.credit_note;
  }

  async createCreditNote(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/credit_notes/credit_notes`, {
      credit_note: data
    });
    return response.data.response.result.credit_note;
  }

  async updateCreditNote(creditNoteId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/credit_notes/credit_notes/${creditNoteId}`,
      { credit_note: data }
    );
    return response.data.response.result.credit_note;
  }

  async deleteCreditNote(creditNoteId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/credit_notes/credit_notes/${creditNoteId}`,
      { credit_note: { vis_state: 1 } }
    );
    return response.data.response.result.credit_note;
  }

  // ========== Services ==========

  async listServices(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.projectsBase}/services`, { params });
    return response.data;
  }

  async getService(serviceId: number) {
    let response = await this.http.get(`${this.projectsBase}/service/${serviceId}`);
    return response.data.service;
  }

  async createService(data: Record<string, any>) {
    let response = await this.http.post(`${this.projectsBase}/service`, { service: data });
    return response.data.service;
  }

  async updateService(serviceId: number, data: Record<string, any>) {
    let response = await this.http.put(`${this.projectsBase}/service/${serviceId}`, {
      service: data
    });
    return response.data.service;
  }

  async deleteService(serviceId: number) {
    await this.http.delete(`${this.projectsBase}/service/${serviceId}`);
  }

  // ========== Other Income ==========

  async listOtherIncome(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/other_incomes/other_incomes`, {
      params
    });
    return response.data.response.result;
  }

  async getOtherIncome(otherIncomeId: number) {
    let response = await this.http.get(
      `${this.accountingBase}/other_incomes/other_incomes/${otherIncomeId}`
    );
    return response.data.response.result.other_income;
  }

  async createOtherIncome(data: Record<string, any>) {
    let response = await this.http.post(`${this.accountingBase}/other_incomes/other_incomes`, {
      other_income: data
    });
    return response.data.response.result.other_income;
  }

  async updateOtherIncome(otherIncomeId: number, data: Record<string, any>) {
    let response = await this.http.put(
      `${this.accountingBase}/other_incomes/other_incomes/${otherIncomeId}`,
      { other_income: data }
    );
    return response.data.response.result.other_income;
  }

  async deleteOtherIncome(otherIncomeId: number) {
    let response = await this.http.put(
      `${this.accountingBase}/other_incomes/other_incomes/${otherIncomeId}`,
      { other_income: { vis_state: 1 } }
    );
    return response.data.response.result.other_income;
  }

  // ========== Expense Categories ==========

  async listExpenseCategories(params?: Record<string, string | number>) {
    let response = await this.http.get(`${this.accountingBase}/expenses/categories`, {
      params
    });
    return response.data.response.result;
  }
}
