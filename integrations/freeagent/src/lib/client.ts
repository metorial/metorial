import { createAxios } from 'slates';

export type Environment = 'production' | 'sandbox';

let getBaseUrl = (environment: Environment): string => {
  return environment === 'sandbox'
    ? 'https://api.sandbox.freeagent.com/v2'
    : 'https://api.freeagent.com/v2';
};

let extractId = (url: string): string => {
  let parts = url.split('/');
  return parts[parts.length - 1] || '';
};

let buildResourceUrl = (baseUrl: string, resource: string, id: string): string => {
  return `${baseUrl}/${resource}/${id}`;
};

export class FreeAgentClient {
  private http;
  private baseUrl: string;

  constructor(config: { token: string; environment?: Environment }) {
    this.baseUrl = getBaseUrl(config.environment || 'production');
    this.http = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ==================== Contacts ====================

  async listContacts(params?: {
    view?: string;
    sort?: string;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/contacts', { params: queryParams });
    return response.data.contacts || [];
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data.contact;
  }

  async createContact(contact: Record<string, any>) {
    let response = await this.http.post('/contacts', { contact });
    return response.data.contact;
  }

  async updateContact(contactId: string, contact: Record<string, any>) {
    let response = await this.http.put(`/contacts/${contactId}`, { contact });
    return response.data.contact;
  }

  async deleteContact(contactId: string) {
    await this.http.delete(`/contacts/${contactId}`);
  }

  // ==================== Invoices ====================

  async listInvoices(params?: {
    view?: string;
    sort?: string;
    updatedSince?: string;
    contactId?: string;
    projectId?: string;
    nestedItems?: boolean;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.nestedItems) queryParams.nested_invoice_items = 'true';
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/invoices', { params: queryParams });
    return response.data.invoices || [];
  }

  async getInvoice(invoiceId: string) {
    let response = await this.http.get(`/invoices/${invoiceId}`);
    return response.data.invoice;
  }

  async createInvoice(invoice: Record<string, any>) {
    if (invoice.contact && !invoice.contact.startsWith('http')) {
      invoice.contact = buildResourceUrl(this.baseUrl, 'contacts', invoice.contact);
    }
    if (invoice.project && !invoice.project.startsWith('http')) {
      invoice.project = buildResourceUrl(this.baseUrl, 'projects', invoice.project);
    }
    let response = await this.http.post('/invoices', { invoice });
    return response.data.invoice;
  }

  async updateInvoice(invoiceId: string, invoice: Record<string, any>) {
    if (invoice.contact && !invoice.contact.startsWith('http')) {
      invoice.contact = buildResourceUrl(this.baseUrl, 'contacts', invoice.contact);
    }
    if (invoice.project && !invoice.project.startsWith('http')) {
      invoice.project = buildResourceUrl(this.baseUrl, 'projects', invoice.project);
    }
    let response = await this.http.put(`/invoices/${invoiceId}`, { invoice });
    return response.data.invoice;
  }

  async deleteInvoice(invoiceId: string) {
    await this.http.delete(`/invoices/${invoiceId}`);
  }

  async transitionInvoice(invoiceId: string, transition: string) {
    let response = await this.http.put(`/invoices/${invoiceId}/transitions/${transition}`);
    return response.data.invoice;
  }

  async emailInvoice(invoiceId: string, emailParams: Record<string, any>) {
    await this.http.post(`/invoices/${invoiceId}/send_email`, { invoice: emailParams });
  }

  // ==================== Estimates ====================

  async listEstimates(params?: {
    view?: string;
    updatedSince?: string;
    contactId?: string;
    projectId?: string;
    nestedItems?: boolean;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.nestedItems) queryParams.nested_estimate_items = 'true';
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/estimates', { params: queryParams });
    return response.data.estimates || [];
  }

  async getEstimate(estimateId: string) {
    let response = await this.http.get(`/estimates/${estimateId}`);
    return response.data.estimate;
  }

  async createEstimate(estimate: Record<string, any>) {
    if (estimate.contact && !estimate.contact.startsWith('http')) {
      estimate.contact = buildResourceUrl(this.baseUrl, 'contacts', estimate.contact);
    }
    if (estimate.project && !estimate.project.startsWith('http')) {
      estimate.project = buildResourceUrl(this.baseUrl, 'projects', estimate.project);
    }
    let response = await this.http.post('/estimates', { estimate });
    return response.data.estimate;
  }

  async updateEstimate(estimateId: string, estimate: Record<string, any>) {
    let response = await this.http.put(`/estimates/${estimateId}`, { estimate });
    return response.data.estimate;
  }

  async deleteEstimate(estimateId: string) {
    await this.http.delete(`/estimates/${estimateId}`);
  }

  async transitionEstimate(estimateId: string, transition: string) {
    let response = await this.http.put(`/estimates/${estimateId}/transitions/${transition}`);
    return response.data.estimate;
  }

  // ==================== Credit Notes ====================

  async listCreditNotes(params?: {
    view?: string;
    updatedSince?: string;
    contactId?: string;
    projectId?: string;
    sort?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/credit_notes', { params: queryParams });
    return response.data.credit_notes || [];
  }

  async getCreditNote(creditNoteId: string) {
    let response = await this.http.get(`/credit_notes/${creditNoteId}`);
    return response.data.credit_note;
  }

  async createCreditNote(creditNote: Record<string, any>) {
    if (creditNote.contact && !creditNote.contact.startsWith('http')) {
      creditNote.contact = buildResourceUrl(this.baseUrl, 'contacts', creditNote.contact);
    }
    let response = await this.http.post('/credit_notes', { credit_note: creditNote });
    return response.data.credit_note;
  }

  async deleteCreditNote(creditNoteId: string) {
    await this.http.delete(`/credit_notes/${creditNoteId}`);
  }

  // ==================== Expenses ====================

  async listExpenses(params?: {
    view?: string;
    fromDate?: string;
    toDate?: string;
    updatedSince?: string;
    projectId?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/expenses', { params: queryParams });
    return response.data.expenses || [];
  }

  async getExpense(expenseId: string) {
    let response = await this.http.get(`/expenses/${expenseId}`);
    return response.data.expense;
  }

  async createExpense(expense: Record<string, any>) {
    if (expense.user && !expense.user.startsWith('http')) {
      expense.user = buildResourceUrl(this.baseUrl, 'users', expense.user);
    }
    if (expense.project && !expense.project.startsWith('http')) {
      expense.project = buildResourceUrl(this.baseUrl, 'projects', expense.project);
    }
    let response = await this.http.post('/expenses', { expense });
    return response.data.expense;
  }

  async updateExpense(expenseId: string, expense: Record<string, any>) {
    let response = await this.http.put(`/expenses/${expenseId}`, { expense });
    return response.data.expense;
  }

  async deleteExpense(expenseId: string) {
    await this.http.delete(`/expenses/${expenseId}`);
  }

  // ==================== Projects ====================

  async listProjects(params?: {
    view?: string;
    sort?: string;
    contactId?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/projects', { params: queryParams });
    return response.data.projects || [];
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${projectId}`);
    return response.data.project;
  }

  async createProject(project: Record<string, any>) {
    if (project.contact && !project.contact.startsWith('http')) {
      project.contact = buildResourceUrl(this.baseUrl, 'contacts', project.contact);
    }
    let response = await this.http.post('/projects', { project });
    return response.data.project;
  }

  async updateProject(projectId: string, project: Record<string, any>) {
    if (project.contact && !project.contact.startsWith('http')) {
      project.contact = buildResourceUrl(this.baseUrl, 'contacts', project.contact);
    }
    let response = await this.http.put(`/projects/${projectId}`, { project });
    return response.data.project;
  }

  async deleteProject(projectId: string) {
    await this.http.delete(`/projects/${projectId}`);
  }

  // ==================== Tasks ====================

  async listTasks(params?: {
    view?: string;
    sort?: string;
    updatedSince?: string;
    projectId?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/tasks', { params: queryParams });
    return response.data.tasks || [];
  }

  async getTask(taskId: string) {
    let response = await this.http.get(`/tasks/${taskId}`);
    return response.data.task;
  }

  async createTask(projectId: string, task: Record<string, any>) {
    let response = await this.http.post(
      `/tasks`,
      { task },
      {
        params: { project: buildResourceUrl(this.baseUrl, 'projects', projectId) }
      }
    );
    return response.data.task;
  }

  async updateTask(taskId: string, task: Record<string, any>) {
    let response = await this.http.put(`/tasks/${taskId}`, { task });
    return response.data.task;
  }

  async deleteTask(taskId: string) {
    await this.http.delete(`/tasks/${taskId}`);
  }

  // ==================== Timeslips ====================

  async listTimeslips(params?: {
    view?: string;
    fromDate?: string;
    toDate?: string;
    updatedSince?: string;
    userId?: string;
    taskId?: string;
    projectId?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.userId)
      queryParams.user = buildResourceUrl(this.baseUrl, 'users', params.userId);
    if (params?.taskId)
      queryParams.task = buildResourceUrl(this.baseUrl, 'tasks', params.taskId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/timeslips', { params: queryParams });
    return response.data.timeslips || [];
  }

  async getTimeslip(timeslipId: string) {
    let response = await this.http.get(`/timeslips/${timeslipId}`);
    return response.data.timeslip;
  }

  async createTimeslip(timeslip: Record<string, any>) {
    if (timeslip.user && !timeslip.user.startsWith('http')) {
      timeslip.user = buildResourceUrl(this.baseUrl, 'users', timeslip.user);
    }
    if (timeslip.task && !timeslip.task.startsWith('http')) {
      timeslip.task = buildResourceUrl(this.baseUrl, 'tasks', timeslip.task);
    }
    if (timeslip.project && !timeslip.project.startsWith('http')) {
      timeslip.project = buildResourceUrl(this.baseUrl, 'projects', timeslip.project);
    }
    let response = await this.http.post('/timeslips', { timeslip });
    return response.data.timeslip;
  }

  async updateTimeslip(timeslipId: string, timeslip: Record<string, any>) {
    let response = await this.http.put(`/timeslips/${timeslipId}`, { timeslip });
    return response.data.timeslip;
  }

  async deleteTimeslip(timeslipId: string) {
    await this.http.delete(`/timeslips/${timeslipId}`);
  }

  async startTimer(timeslipId: string) {
    let response = await this.http.post(`/timeslips/${timeslipId}/timer`);
    return response.data.timeslip;
  }

  async stopTimer(timeslipId: string) {
    let response = await this.http.delete(`/timeslips/${timeslipId}/timer`);
    return response.data.timeslip;
  }

  // ==================== Bank Accounts ====================

  async listBankAccounts(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bank_accounts', { params: queryParams });
    return response.data.bank_accounts || [];
  }

  async getBankAccount(bankAccountId: string) {
    let response = await this.http.get(`/bank_accounts/${bankAccountId}`);
    return response.data.bank_account;
  }

  async createBankAccount(bankAccount: Record<string, any>) {
    let response = await this.http.post('/bank_accounts', { bank_account: bankAccount });
    return response.data.bank_account;
  }

  async updateBankAccount(bankAccountId: string, bankAccount: Record<string, any>) {
    let response = await this.http.put(`/bank_accounts/${bankAccountId}`, {
      bank_account: bankAccount
    });
    return response.data.bank_account;
  }

  async deleteBankAccount(bankAccountId: string) {
    await this.http.delete(`/bank_accounts/${bankAccountId}`);
  }

  // ==================== Bank Transactions ====================

  async listBankTransactions(
    bankAccountId: string,
    params?: {
      view?: string;
      fromDate?: string;
      toDate?: string;
      updatedSince?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let queryParams: Record<string, string> = {
      bank_account: buildResourceUrl(this.baseUrl, 'bank_accounts', bankAccountId)
    };
    if (params?.view) queryParams.view = params.view;
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bank_transactions', { params: queryParams });
    return response.data.bank_transactions || [];
  }

  async getBankTransaction(transactionId: string) {
    let response = await this.http.get(`/bank_transactions/${transactionId}`);
    return response.data.bank_transaction;
  }

  // ==================== Bills ====================

  async listBills(params?: {
    view?: string;
    fromDate?: string;
    toDate?: string;
    updatedSince?: string;
    contactId?: string;
    projectId?: string;
    nestedItems?: boolean;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.nestedItems) queryParams.nested_bill_items = 'true';
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bills', { params: queryParams });
    return response.data.bills || [];
  }

  async getBill(billId: string) {
    let response = await this.http.get(`/bills/${billId}`);
    return response.data.bill;
  }

  async createBill(bill: Record<string, any>) {
    if (bill.contact && !bill.contact.startsWith('http')) {
      bill.contact = buildResourceUrl(this.baseUrl, 'contacts', bill.contact);
    }
    if (bill.project && !bill.project.startsWith('http')) {
      bill.project = buildResourceUrl(this.baseUrl, 'projects', bill.project);
    }
    let response = await this.http.post('/bills', { bill });
    return response.data.bill;
  }

  async updateBill(billId: string, bill: Record<string, any>) {
    let response = await this.http.put(`/bills/${billId}`, { bill });
    return response.data.bill;
  }

  async deleteBill(billId: string) {
    await this.http.delete(`/bills/${billId}`);
  }

  // ==================== Users ====================

  async listUsers(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/users', { params: queryParams });
    return response.data.users || [];
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data.user;
  }

  async getCurrentUser() {
    let response = await this.http.get('/users/me');
    return response.data.user;
  }

  // ==================== Company ====================

  async getCompany() {
    let response = await this.http.get('/company');
    return response.data.company;
  }

  async getTaxTimeline() {
    let response = await this.http.get('/company/tax_timeline');
    return response.data.timeline_items || [];
  }

  // ==================== Categories ====================

  async listCategories(params?: { subAccounts?: boolean }) {
    let queryParams: Record<string, string> = {};
    if (params?.subAccounts) queryParams.sub_accounts = 'true';

    let response = await this.http.get('/categories', { params: queryParams });
    return response.data;
  }

  async getCategory(nominalCode: string) {
    let response = await this.http.get(`/categories/${nominalCode}`);
    return response.data.category;
  }

  // ==================== Recurring Invoices ====================

  async listRecurringInvoices(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/recurring_invoices', { params: queryParams });
    return response.data.recurring_invoices || [];
  }

  async getRecurringInvoice(recurringInvoiceId: string) {
    let response = await this.http.get(`/recurring_invoices/${recurringInvoiceId}`);
    return response.data.recurring_invoice;
  }

  // ==================== Financial Reports ====================

  async getProfitAndLoss(params?: { fromDate?: string; toDate?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;

    let response = await this.http.get('/accounting/profit_and_loss/summary', {
      params: queryParams
    });
    return response.data;
  }

  async getBalanceSheet(params?: { asAtDate?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.asAtDate) queryParams.as_at_date = params.asAtDate;

    let response = await this.http.get('/accounting/balance_sheet', { params: queryParams });
    return response.data;
  }

  async getTrialBalance(params?: { fromDate?: string; toDate?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;

    let response = await this.http.get('/accounting/trial_balance/summary', {
      params: queryParams
    });
    return response.data;
  }

  // ==================== Notes ====================

  async listNotes(params: { contactId?: string; projectId?: string }) {
    let queryParams: Record<string, string> = {};
    if (params.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);

    let response = await this.http.get('/notes', { params: queryParams });
    return response.data.notes || [];
  }

  async createNote(params: { contactId?: string; projectId?: string; note: string }) {
    let queryParams: Record<string, string> = {};
    if (params.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);

    let response = await this.http.post(
      '/notes',
      { note: { note: params.note } },
      { params: queryParams }
    );
    return response.data.note;
  }

  async deleteNote(noteId: string) {
    await this.http.delete(`/notes/${noteId}`);
  }
}

export let normalizeResource = (resource: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(resource)) {
    if (key === 'url' && typeof value === 'string') {
      result.url = value;
      result.resourceId = extractId(value);
    } else if (
      typeof value === 'string' &&
      value.startsWith('https://api.') &&
      value.includes('/v2/')
    ) {
      result[key] = value;
      result[`${key}Id`] = extractId(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};
