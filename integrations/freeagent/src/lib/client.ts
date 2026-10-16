import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export type Environment = 'production' | 'sandbox';

export let getBaseUrl = (environment: Environment): string => {
  return environment === 'sandbox'
    ? 'https://api.sandbox.freeagent.com/v2'
    : 'https://api.freeagent.com/v2';
};

let extractId = (url: string): string => {
  let parts = url.split('/');
  return parts[parts.length - 1] || '';
};

let buildResourceUrl = (baseUrl: string, resource: string, id: string): string => {
  let prefix = `${baseUrl}/${resource}/`;
  if (id.startsWith(prefix) && /^[^/?#]+$/.test(id.slice(prefix.length))) return id;
  if (!id.trim() || /[/:?#]/.test(id)) {
    throw createApiServiceError(
      `Provide a ${resource} ID or its URL in the selected FreeAgent environment.`
    );
  }
  return `${prefix}${encodeURIComponent(id)}`;
};

export let createFreeAgentHttp = (environment: Environment = 'production', token?: string) => {
  if (token !== undefined && !token.trim()) {
    throw createApiServiceError('Reconnect FreeAgent: the access token is missing.');
  }
  let http = createAuthenticatedAxios({
    baseURL: getBaseUrl(environment),
    authHeader: token ? { value: `Bearer ${token}` } : undefined,
    headers: { Accept: 'application/json' },
    timeout: 30000,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'FreeAgent',
        reason: 'freeagent_api_error',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        detailKeys: ['message', 'error', 'error_description'],
        nestedKeys: ['errors']
      })
  });
  http.interceptors.request.use(request => {
    for (let [key, maximum] of [
      ['page', Number.MAX_SAFE_INTEGER],
      ['per_page', 100]
    ] as const) {
      let value = request.params?.[key];
      if (
        value !== undefined &&
        (!Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > maximum)
      ) {
        throw createApiServiceError(
          `FreeAgent ${key} must be a whole number from 1 to ${maximum}.`
        );
      }
    }
    return request;
  });
  return http;
};

export let createClient = (ctx: {
  auth: { token: string; environment?: Environment };
  config: unknown;
}) => {
  let legacyEnvironment: Environment =
    isApiErrorRecord(ctx.config) && ctx.config.environment === 'sandbox'
      ? 'sandbox'
      : 'production';
  return new FreeAgentClient({
    token: ctx.auth.token,
    environment: ctx.auth.environment ?? legacyEnvironment
  });
};

export class FreeAgentClient {
  private http;
  private baseUrl: string;

  constructor(config: { token: string; environment?: Environment }) {
    this.baseUrl = getBaseUrl(config.environment || 'production');
    this.http = createFreeAgentHttp(config.environment || 'production', config.token);
  }

  private requireCollection(data: unknown, key: string) {
    if (!isApiErrorRecord(data) || !Array.isArray(data[key])) {
      throw createApiServiceError(`FreeAgent returned an invalid ${key} collection.`);
    }
    return data[key] as Record<string, any>[];
  }

  private async readAfterUpdate(resource: string, id: string, read: () => Promise<any>) {
    try {
      let result = await read();
      if (!isApiErrorRecord(result)) {
        throw createApiServiceError(`FreeAgent did not return the updated ${resource}.`);
      }
      return result;
    } catch (error) {
      throw createApiServiceError(
        `FreeAgent accepted the ${resource} update for ${id}, but reading its current state failed. Do not repeat the update automatically; retrieve the resource to verify it.`,
        { reason: 'freeagent_update_readback', parent: error }
      );
    }
  }

  async getInvoicePdf(invoiceId: string) {
    let response = await this.http.get(`/invoices/${encodeURIComponent(invoiceId)}/pdf`);
    let content = response.data?.pdf?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw createApiServiceError('FreeAgent did not return PDF content for this invoice.');
    }
    let compact = content.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
      throw createApiServiceError('FreeAgent returned invalid PDF content.');
    }
    let bytes = Buffer.from(compact, 'base64');
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw createApiServiceError('FreeAgent returned content that is not a PDF.');
    }
    return bytes;
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/contacts', { params: queryParams });
    return this.requireCollection(response.data, 'contacts');
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${encodeURIComponent(contactId)}`);
    return response.data.contact;
  }

  async createContact(contact: Record<string, any>) {
    let response = await this.http.post('/contacts', { contact });
    return response.data.contact;
  }

  async updateContact(contactId: string, contact: Record<string, any>) {
    let response = await this.http.put(`/contacts/${encodeURIComponent(contactId)}`, {
      contact
    });
    return (
      response.data?.contact ??
      this.readAfterUpdate('contact', contactId, () => this.getContact(contactId))
    );
  }

  async deleteContact(contactId: string) {
    await this.http.delete(`/contacts/${encodeURIComponent(contactId)}`);
  }

  // ==================== Invoices ====================

  async listInvoices(params?: {
    view?: string;
    sort?: string;
    updatedSince?: string;
    contactId?: string;
    projectId?: string;
    nestedItems?: boolean;
    months?: number;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.view === 'last_N_months') {
      if (
        !Number.isSafeInteger(params.months) ||
        params.months === undefined ||
        params.months < 1
      ) {
        throw createApiServiceError(
          'Provide months as a positive whole number when view is last_N_months.'
        );
      }
      queryParams.view = `last_${params.months}_months`;
    } else if (params?.view) queryParams.view = params.view;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.updatedSince) queryParams.updated_since = params.updatedSince;
    if (params?.contactId)
      queryParams.contact = buildResourceUrl(this.baseUrl, 'contacts', params.contactId);
    if (params?.projectId)
      queryParams.project = buildResourceUrl(this.baseUrl, 'projects', params.projectId);
    if (params?.nestedItems) queryParams.nested_invoice_items = 'true';
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/invoices', { params: queryParams });
    return this.requireCollection(response.data, 'invoices');
  }

  async getInvoice(invoiceId: string) {
    let response = await this.http.get(`/invoices/${encodeURIComponent(invoiceId)}`);
    return response.data.invoice;
  }

  async createInvoice(invoice: Record<string, any>) {
    if (invoice.contact) {
      invoice.contact = buildResourceUrl(this.baseUrl, 'contacts', invoice.contact);
    }
    if (invoice.project) {
      invoice.project = buildResourceUrl(this.baseUrl, 'projects', invoice.project);
    }
    if (Array.isArray(invoice.invoice_items)) {
      invoice.invoice_items = invoice.invoice_items.map((item: Record<string, any>) => ({
        ...item,
        ...(item.category
          ? { category: buildResourceUrl(this.baseUrl, 'categories', item.category) }
          : {})
      }));
    }
    let response = await this.http.post('/invoices', { invoice });
    return response.data.invoice;
  }

  async updateInvoice(invoiceId: string, invoice: Record<string, any>) {
    if (invoice.contact) {
      invoice.contact = buildResourceUrl(this.baseUrl, 'contacts', invoice.contact);
    }
    if (invoice.project) {
      invoice.project = buildResourceUrl(this.baseUrl, 'projects', invoice.project);
    }
    if (Array.isArray(invoice.invoice_items)) {
      invoice.invoice_items = invoice.invoice_items.map((item: Record<string, any>) => ({
        ...item,
        ...(item.category
          ? { category: buildResourceUrl(this.baseUrl, 'categories', item.category) }
          : {})
      }));
    }
    let response = await this.http.put(`/invoices/${encodeURIComponent(invoiceId)}`, {
      invoice
    });
    return (
      response.data?.invoice ??
      this.readAfterUpdate('invoice', invoiceId, () => this.getInvoice(invoiceId))
    );
  }

  async deleteInvoice(invoiceId: string) {
    await this.http.delete(`/invoices/${encodeURIComponent(invoiceId)}`);
  }

  async transitionInvoice(invoiceId: string, transition: string) {
    let response = await this.http.put(
      `/invoices/${encodeURIComponent(invoiceId)}/transitions/${transition}`
    );
    return (
      response.data?.invoice ??
      this.readAfterUpdate('invoice', invoiceId, () => this.getInvoice(invoiceId))
    );
  }

  async emailInvoice(invoiceId: string, emailParams: Record<string, any>) {
    await this.http.post(`/invoices/${encodeURIComponent(invoiceId)}/send_email`, {
      invoice: emailParams
    });
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/estimates', { params: queryParams });
    return this.requireCollection(response.data, 'estimates');
  }

  async getEstimate(estimateId: string) {
    let response = await this.http.get(`/estimates/${encodeURIComponent(estimateId)}`);
    return response.data.estimate;
  }

  async createEstimate(estimate: Record<string, any>) {
    if (estimate.contact) {
      estimate.contact = buildResourceUrl(this.baseUrl, 'contacts', estimate.contact);
    }
    if (estimate.project) {
      estimate.project = buildResourceUrl(this.baseUrl, 'projects', estimate.project);
    }
    if (Array.isArray(estimate.estimate_items)) {
      estimate.estimate_items = estimate.estimate_items.map((item: Record<string, any>) => ({
        ...item,
        ...(item.category
          ? { category: buildResourceUrl(this.baseUrl, 'categories', item.category) }
          : {})
      }));
    }
    let response = await this.http.post('/estimates', { estimate });
    return response.data.estimate;
  }

  async updateEstimate(estimateId: string, estimate: Record<string, any>) {
    let response = await this.http.put(`/estimates/${encodeURIComponent(estimateId)}`, {
      estimate
    });
    return (
      response.data?.estimate ??
      this.readAfterUpdate('estimate', estimateId, () => this.getEstimate(estimateId))
    );
  }

  async deleteEstimate(estimateId: string) {
    await this.http.delete(`/estimates/${encodeURIComponent(estimateId)}`);
  }

  async transitionEstimate(estimateId: string, transition: string) {
    let response = await this.http.put(
      `/estimates/${encodeURIComponent(estimateId)}/transitions/${transition}`
    );
    return (
      response.data?.estimate ??
      this.readAfterUpdate('estimate', estimateId, () => this.getEstimate(estimateId))
    );
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/credit_notes', { params: queryParams });
    return this.requireCollection(response.data, 'credit_notes');
  }

  async getCreditNote(creditNoteId: string) {
    let response = await this.http.get(`/credit_notes/${encodeURIComponent(creditNoteId)}`);
    return response.data.credit_note;
  }

  async createCreditNote(creditNote: Record<string, any>) {
    if (creditNote.contact) {
      creditNote.contact = buildResourceUrl(this.baseUrl, 'contacts', creditNote.contact);
    }
    let response = await this.http.post('/credit_notes', { credit_note: creditNote });
    return response.data.credit_note;
  }

  async deleteCreditNote(creditNoteId: string) {
    await this.http.delete(`/credit_notes/${encodeURIComponent(creditNoteId)}`);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/expenses', { params: queryParams });
    return this.requireCollection(response.data, 'expenses');
  }

  async getExpense(expenseId: string) {
    let response = await this.http.get(`/expenses/${encodeURIComponent(expenseId)}`);
    return response.data.expense;
  }

  async createExpense(expense: Record<string, any>) {
    if (expense.user) {
      expense.user = buildResourceUrl(this.baseUrl, 'users', expense.user);
    }
    if (expense.project) {
      expense.project = buildResourceUrl(this.baseUrl, 'projects', expense.project);
    }
    if (expense.category && expense.category !== 'Mileage') {
      expense.category = buildResourceUrl(this.baseUrl, 'categories', expense.category);
    }
    let response = await this.http.post('/expenses', { expense });
    return response.data.expense;
  }

  async updateExpense(expenseId: string, expense: Record<string, any>) {
    if (expense.category && expense.category !== 'Mileage') {
      expense.category = buildResourceUrl(this.baseUrl, 'categories', expense.category);
    }
    if (expense.project)
      expense.project = buildResourceUrl(this.baseUrl, 'projects', expense.project);
    if (expense.user) expense.user = buildResourceUrl(this.baseUrl, 'users', expense.user);
    let response = await this.http.put(`/expenses/${encodeURIComponent(expenseId)}`, {
      expense
    });
    return (
      response.data?.expense ??
      this.readAfterUpdate('expense', expenseId, () => this.getExpense(expenseId))
    );
  }

  async deleteExpense(expenseId: string) {
    await this.http.delete(`/expenses/${encodeURIComponent(expenseId)}`);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/projects', { params: queryParams });
    return this.requireCollection(response.data, 'projects');
  }

  async getProject(projectId: string) {
    let response = await this.http.get(`/projects/${encodeURIComponent(projectId)}`);
    return response.data.project;
  }

  async createProject(project: Record<string, any>) {
    if (project.contact) {
      project.contact = buildResourceUrl(this.baseUrl, 'contacts', project.contact);
    }
    let response = await this.http.post('/projects', { project });
    return response.data.project;
  }

  async updateProject(projectId: string, project: Record<string, any>) {
    if (project.contact) {
      project.contact = buildResourceUrl(this.baseUrl, 'contacts', project.contact);
    }
    let response = await this.http.put(`/projects/${encodeURIComponent(projectId)}`, {
      project
    });
    return (
      response.data?.project ??
      this.readAfterUpdate('project', projectId, () => this.getProject(projectId))
    );
  }

  async deleteProject(projectId: string) {
    await this.http.delete(`/projects/${encodeURIComponent(projectId)}`);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/tasks', { params: queryParams });
    return this.requireCollection(response.data, 'tasks');
  }

  async getTask(taskId: string) {
    let response = await this.http.get(`/tasks/${encodeURIComponent(taskId)}`);
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
    let response = await this.http.put(`/tasks/${encodeURIComponent(taskId)}`, { task });
    return (
      response.data?.task ?? this.readAfterUpdate('task', taskId, () => this.getTask(taskId))
    );
  }

  async deleteTask(taskId: string) {
    await this.http.delete(`/tasks/${encodeURIComponent(taskId)}`);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/timeslips', { params: queryParams });
    return this.requireCollection(response.data, 'timeslips');
  }

  async getTimeslip(timeslipId: string) {
    let response = await this.http.get(`/timeslips/${encodeURIComponent(timeslipId)}`);
    return response.data.timeslip;
  }

  async createTimeslip(timeslip: Record<string, any>) {
    if (timeslip.user) {
      timeslip.user = buildResourceUrl(this.baseUrl, 'users', timeslip.user);
    }
    if (timeslip.task) {
      timeslip.task = buildResourceUrl(this.baseUrl, 'tasks', timeslip.task);
    }
    if (timeslip.project) {
      timeslip.project = buildResourceUrl(this.baseUrl, 'projects', timeslip.project);
    }
    let response = await this.http.post('/timeslips', { timeslip });
    return response.data.timeslip;
  }

  async updateTimeslip(timeslipId: string, timeslip: Record<string, any>) {
    let response = await this.http.put(`/timeslips/${encodeURIComponent(timeslipId)}`, {
      timeslip
    });
    return (
      response.data?.timeslip ??
      this.readAfterUpdate('timeslip', timeslipId, () => this.getTimeslip(timeslipId))
    );
  }

  async deleteTimeslip(timeslipId: string) {
    await this.http.delete(`/timeslips/${encodeURIComponent(timeslipId)}`);
  }

  async startTimer(timeslipId: string) {
    let response = await this.http.post(`/timeslips/${encodeURIComponent(timeslipId)}/timer`);
    return response.data.timeslip;
  }

  async stopTimer(timeslipId: string) {
    let response = await this.http.delete(
      `/timeslips/${encodeURIComponent(timeslipId)}/timer`
    );
    return response.data.timeslip;
  }

  // ==================== Bank Accounts ====================

  async listBankAccounts(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bank_accounts', { params: queryParams });
    return this.requireCollection(response.data, 'bank_accounts');
  }

  async getBankAccount(bankAccountId: string) {
    let response = await this.http.get(`/bank_accounts/${encodeURIComponent(bankAccountId)}`);
    return response.data.bank_account;
  }

  async createBankAccount(bankAccount: Record<string, any>) {
    let response = await this.http.post('/bank_accounts', { bank_account: bankAccount });
    return response.data.bank_account;
  }

  async updateBankAccount(bankAccountId: string, bankAccount: Record<string, any>) {
    let response = await this.http.put(`/bank_accounts/${encodeURIComponent(bankAccountId)}`, {
      bank_account: bankAccount
    });
    return (
      response.data?.bank_account ??
      this.readAfterUpdate('bank_account', bankAccountId, () =>
        this.getBankAccount(bankAccountId)
      )
    );
  }

  async deleteBankAccount(bankAccountId: string) {
    await this.http.delete(`/bank_accounts/${encodeURIComponent(bankAccountId)}`);
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bank_transactions', { params: queryParams });
    return this.requireCollection(response.data, 'bank_transactions');
  }

  async getBankTransaction(transactionId: string) {
    let response = await this.http.get(
      `/bank_transactions/${encodeURIComponent(transactionId)}`
    );
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
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/bills', { params: queryParams });
    return this.requireCollection(response.data, 'bills');
  }

  async getBill(billId: string) {
    let response = await this.http.get(`/bills/${encodeURIComponent(billId)}`);
    return response.data.bill;
  }

  async createBill(bill: Record<string, any>) {
    if (bill.contact) {
      bill.contact = buildResourceUrl(this.baseUrl, 'contacts', bill.contact);
    }
    if (bill.project) {
      bill.project = buildResourceUrl(this.baseUrl, 'projects', bill.project);
    }
    if (Array.isArray(bill.bill_items)) {
      bill.bill_items = bill.bill_items.map((item: Record<string, any>) => ({
        ...item,
        ...(item.category
          ? { category: buildResourceUrl(this.baseUrl, 'categories', item.category) }
          : {})
      }));
    }
    let response = await this.http.post('/bills', { bill });
    return response.data.bill;
  }

  async updateBill(billId: string, bill: Record<string, any>) {
    let response = await this.http.put(`/bills/${encodeURIComponent(billId)}`, { bill });
    return (
      response.data?.bill ?? this.readAfterUpdate('bill', billId, () => this.getBill(billId))
    );
  }

  async deleteBill(billId: string) {
    await this.http.delete(`/bills/${encodeURIComponent(billId)}`);
  }

  // ==================== Users ====================

  async listUsers(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/users', { params: queryParams });
    return this.requireCollection(response.data, 'users');
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`);
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
    return this.requireCollection(response.data, 'timeline_items');
  }

  // ==================== Categories ====================

  async listCategories(params?: { subAccounts?: boolean }) {
    let queryParams: Record<string, string> = {};
    if (params?.subAccounts) queryParams.sub_accounts = 'true';

    let response = await this.http.get('/categories', { params: queryParams });
    return response.data;
  }

  async getCategory(nominalCode: string) {
    let response = await this.http.get(`/categories/${encodeURIComponent(nominalCode)}`);
    return response.data.category;
  }

  // ==================== Recurring Invoices ====================

  async listRecurringInvoices(params?: { view?: string; page?: number; perPage?: number }) {
    let queryParams: Record<string, string> = {};
    if (params?.view) queryParams.view = params.view;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.per_page = String(params.perPage);

    let response = await this.http.get('/recurring_invoices', { params: queryParams });
    return this.requireCollection(response.data, 'recurring_invoices');
  }

  async getRecurringInvoice(recurringInvoiceId: string) {
    let response = await this.http.get(
      `/recurring_invoices/${encodeURIComponent(recurringInvoiceId)}`
    );
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
    return this.requireCollection(response.data, 'notes');
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
    await this.http.delete(`/notes/${encodeURIComponent(noteId)}`);
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
