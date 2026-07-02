import { createAxios } from 'slates';
import { regionToApiDomain } from './regions';

export class Client {
  private token: string;
  private organizationId: string;
  private region: string;

  constructor(config: { token: string; organizationId: string; region: string }) {
    this.token = config.token;
    this.organizationId = config.organizationId;
    this.region = config.region;
  }

  private getAxios() {
    let apiDomain = regionToApiDomain(this.region);
    return createAxios({
      baseURL: `https://${apiDomain}/invoice/v3`,
      headers: {
        Authorization: `Zoho-oauthtoken ${this.token}`,
        'X-com-zoho-invoice-organizationid': this.organizationId,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Invoices ──────────────────────────────────────────

  async createInvoice(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/invoices', data);
    return response.data.invoice;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/invoices/${invoiceId}`);
    return response.data.invoice;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/invoices/${invoiceId}`, data);
    return response.data.invoice;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/invoices/${invoiceId}`);
  }

  async listInvoices(
    params?: Record<string, any>
  ): Promise<{ invoices: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/invoices', { params });
    return {
      invoices: response.data.invoices ?? [],
      pageContext: response.data.page_context
    };
  }

  async markInvoiceAsSent(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/status/sent`);
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/status/void`);
  }

  async markInvoiceAsDraft(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/status/draft`);
  }

  async emailInvoice(invoiceId: string, emailData: Record<string, any>): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/email`, emailData);
  }

  async writeOffInvoice(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/writeoff`);
  }

  async cancelWriteOff(invoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/writeoff/cancel`);
  }

  async applyCreditsToInvoice(invoiceId: string, data: Record<string, any>): Promise<void> {
    let http = this.getAxios();
    await http.post(`/invoices/${invoiceId}/credits`, data);
  }

  async listInvoicePayments(invoiceId: string): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get(`/invoices/${invoiceId}/payments`);
    return response.data.payments ?? [];
  }

  // ─── Contacts ──────────────────────────────────────────

  async createContact(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/contacts', data);
    return response.data.contact;
  }

  async getContact(contactId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/contacts/${contactId}`);
    return response.data.contact;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/contacts/${contactId}`, data);
    return response.data.contact;
  }

  async deleteContact(contactId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/contacts/${contactId}`);
  }

  async listContacts(
    params?: Record<string, any>
  ): Promise<{ contacts: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/contacts', { params });
    return {
      contacts: response.data.contacts ?? [],
      pageContext: response.data.page_context
    };
  }

  async markContactActive(contactId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/contacts/${contactId}/active`);
  }

  async markContactInactive(contactId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/contacts/${contactId}/inactive`);
  }

  // ─── Estimates ─────────────────────────────────────────

  async createEstimate(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/estimates', data);
    return response.data.estimate;
  }

  async getEstimate(estimateId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/estimates/${estimateId}`);
    return response.data.estimate;
  }

  async updateEstimate(estimateId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/estimates/${estimateId}`, data);
    return response.data.estimate;
  }

  async deleteEstimate(estimateId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/estimates/${estimateId}`);
  }

  async listEstimates(
    params?: Record<string, any>
  ): Promise<{ estimates: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/estimates', { params });
    return {
      estimates: response.data.estimates ?? [],
      pageContext: response.data.page_context
    };
  }

  async markEstimateAsSent(estimateId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/estimates/${estimateId}/status/sent`);
  }

  async markEstimateAsAccepted(estimateId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/estimates/${estimateId}/status/accepted`);
  }

  async markEstimateAsDeclined(estimateId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/estimates/${estimateId}/status/declined`);
  }

  async emailEstimate(estimateId: string, emailData: Record<string, any>): Promise<void> {
    let http = this.getAxios();
    await http.post(`/estimates/${estimateId}/email`, emailData);
  }

  // ─── Customer Payments ─────────────────────────────────

  async createPayment(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/customerpayments', data);
    return response.data.payment;
  }

  async getPayment(paymentId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/customerpayments/${paymentId}`);
    return response.data.payment;
  }

  async updatePayment(paymentId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/customerpayments/${paymentId}`, data);
    return response.data.payment;
  }

  async deletePayment(paymentId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/customerpayments/${paymentId}`);
  }

  async listPayments(
    params?: Record<string, any>
  ): Promise<{ payments: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/customerpayments', { params });
    return {
      payments: response.data.customerpayments ?? response.data.payments ?? [],
      pageContext: response.data.page_context
    };
  }

  // ─── Credit Notes ──────────────────────────────────────

  async createCreditNote(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/creditnotes', data);
    return response.data.creditnote;
  }

  async getCreditNote(creditNoteId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/creditnotes/${creditNoteId}`);
    return response.data.creditnote;
  }

  async updateCreditNote(creditNoteId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/creditnotes/${creditNoteId}`, data);
    return response.data.creditnote;
  }

  async deleteCreditNote(creditNoteId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/creditnotes/${creditNoteId}`);
  }

  async listCreditNotes(
    params?: Record<string, any>
  ): Promise<{ creditNotes: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/creditnotes', { params });
    return {
      creditNotes: response.data.creditnotes ?? [],
      pageContext: response.data.page_context
    };
  }

  async voidCreditNote(creditNoteId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/creditnotes/${creditNoteId}/status/void`);
  }

  async openCreditNote(creditNoteId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/creditnotes/${creditNoteId}/status/open`);
  }

  async applyCreditToInvoice(creditNoteId: string, data: Record<string, any>): Promise<void> {
    let http = this.getAxios();
    await http.post(`/creditnotes/${creditNoteId}/invoices`, data);
  }

  // ─── Expenses ──────────────────────────────────────────

  async createExpense(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/expenses', data);
    return response.data.expense;
  }

  async getExpense(expenseId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/expenses/${expenseId}`);
    return response.data.expense;
  }

  async updateExpense(expenseId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/expenses/${expenseId}`, data);
    return response.data.expense;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/expenses/${expenseId}`);
  }

  async listExpenses(
    params?: Record<string, any>
  ): Promise<{ expenses: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/expenses', { params });
    return {
      expenses: response.data.expenses ?? [],
      pageContext: response.data.page_context
    };
  }

  // ─── Items ─────────────────────────────────────────────

  async createItem(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/items', data);
    return response.data.item;
  }

  async getItem(itemId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/items/${itemId}`);
    return response.data.item;
  }

  async updateItem(itemId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/items/${itemId}`, data);
    return response.data.item;
  }

  async deleteItem(itemId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/items/${itemId}`);
  }

  async listItems(params?: Record<string, any>): Promise<{ items: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/items', { params });
    return {
      items: response.data.items ?? [],
      pageContext: response.data.page_context
    };
  }

  async markItemActive(itemId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/items/${itemId}/active`);
  }

  async markItemInactive(itemId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/items/${itemId}/inactive`);
  }

  // ─── Projects ──────────────────────────────────────────

  async createProject(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/projects', data);
    return response.data.project;
  }

  async getProject(projectId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/projects/${projectId}`);
    return response.data.project;
  }

  async updateProject(projectId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/projects/${projectId}`, data);
    return response.data.project;
  }

  async deleteProject(projectId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/projects/${projectId}`);
  }

  async listProjects(
    params?: Record<string, any>
  ): Promise<{ projects: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/projects', { params });
    return {
      projects: response.data.projects ?? [],
      pageContext: response.data.page_context
    };
  }

  async markProjectActive(projectId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/projects/${projectId}/active`);
  }

  async markProjectInactive(projectId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/projects/${projectId}/inactive`);
  }

  // ─── Project Tasks ─────────────────────────────────────

  async createTask(projectId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post(`/projects/${projectId}/tasks`, data);
    return response.data.task;
  }

  async getTask(projectId: string, taskId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data.task;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: Record<string, any>
  ): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data.task;
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/projects/${projectId}/tasks/${taskId}`);
  }

  async listTasks(projectId: string, params?: Record<string, any>): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get(`/projects/${projectId}/tasks`, { params });
    return response.data.tasks ?? [];
  }

  // ─── Time Entries ──────────────────────────────────────

  async createTimeEntry(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/projects/timeentries', data);
    return response.data.time_entry;
  }

  async getTimeEntry(timeEntryId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/projects/timeentries/${timeEntryId}`);
    return response.data.time_entry;
  }

  async updateTimeEntry(timeEntryId: string, data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/projects/timeentries/${timeEntryId}`, data);
    return response.data.time_entry;
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/projects/timeentries/${timeEntryId}`);
  }

  async listTimeEntries(
    params?: Record<string, any>
  ): Promise<{ timeEntries: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/projects/timeentries', { params });
    return {
      timeEntries: response.data.time_entries ?? [],
      pageContext: response.data.page_context
    };
  }

  async startTimer(timeEntryId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.post(`/projects/timeentries/${timeEntryId}/timer/start`);
    return response.data.time_entry;
  }

  async stopTimer(): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/projects/timeentries/timer/stop');
    return response.data.time_entry;
  }

  // ─── Recurring Invoices ────────────────────────────────

  async createRecurringInvoice(data: Record<string, any>): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/recurringinvoices', data);
    return response.data.recurring_invoice;
  }

  async getRecurringInvoice(recurringInvoiceId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get(`/recurringinvoices/${recurringInvoiceId}`);
    return response.data.recurring_invoice;
  }

  async updateRecurringInvoice(
    recurringInvoiceId: string,
    data: Record<string, any>
  ): Promise<any> {
    let http = this.getAxios();
    let response = await http.put(`/recurringinvoices/${recurringInvoiceId}`, data);
    return response.data.recurring_invoice;
  }

  async deleteRecurringInvoice(recurringInvoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.delete(`/recurringinvoices/${recurringInvoiceId}`);
  }

  async listRecurringInvoices(
    params?: Record<string, any>
  ): Promise<{ recurringInvoices: any[]; pageContext: any }> {
    let http = this.getAxios();
    let response = await http.get('/recurringinvoices', { params });
    return {
      recurringInvoices: response.data.recurring_invoices ?? [],
      pageContext: response.data.page_context
    };
  }

  async stopRecurringInvoice(recurringInvoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/recurringinvoices/${recurringInvoiceId}/status/stop`);
  }

  async resumeRecurringInvoice(recurringInvoiceId: string): Promise<void> {
    let http = this.getAxios();
    await http.post(`/recurringinvoices/${recurringInvoiceId}/status/resume`);
  }
}
