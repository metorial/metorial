import { createAxios } from 'slates';

export interface HarvestClientConfig {
  token: string;
  accountId: string;
  userAgent?: string;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalEntries: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
  page: number;
  perPage: number;
}

export class HarvestClient {
  private api;

  constructor(clientConfig: HarvestClientConfig) {
    this.api = createAxios({
      baseURL: 'https://api.harvestapp.com/v2',
      headers: {
        Authorization: `Bearer ${clientConfig.token}`,
        'Harvest-Account-Id': clientConfig.accountId,
        'User-Agent':
          clientConfig.userAgent || 'Slates Harvest Integration (support@slates.dev)',
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Time Entries ---

  async listTimeEntries(params?: {
    userId?: number;
    clientId?: number;
    projectId?: number;
    taskId?: number;
    externalReferenceId?: string;
    isBilled?: boolean;
    isRunning?: boolean;
    updatedSince?: string;
    from?: string;
    to?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/time_entries', {
      params: {
        user_id: params?.userId,
        client_id: params?.clientId,
        project_id: params?.projectId,
        task_id: params?.taskId,
        external_reference_id: params?.externalReferenceId,
        is_billed: params?.isBilled,
        is_running: params?.isRunning,
        updated_since: params?.updatedSince,
        from: params?.from,
        to: params?.to,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'time_entries');
  }

  async getTimeEntry(timeEntryId: number): Promise<any> {
    let response = await this.api.get(`/time_entries/${timeEntryId}`);
    return response.data;
  }

  async createTimeEntry(data: {
    projectId: number;
    taskId: number;
    spentDate: string;
    userId?: number;
    hours?: number;
    startedTime?: string;
    endedTime?: string;
    notes?: string;
    externalReference?: {
      id: string;
      groupId?: string;
      accountId?: string;
      permalink?: string;
    };
  }): Promise<any> {
    let body: any = {
      project_id: data.projectId,
      task_id: data.taskId,
      spent_date: data.spentDate
    };
    if (data.userId !== undefined) body.user_id = data.userId;
    if (data.hours !== undefined) body.hours = data.hours;
    if (data.startedTime !== undefined) body.started_time = data.startedTime;
    if (data.endedTime !== undefined) body.ended_time = data.endedTime;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.externalReference) {
      body.external_reference = {
        id: data.externalReference.id,
        group_id: data.externalReference.groupId,
        account_id: data.externalReference.accountId,
        permalink: data.externalReference.permalink
      };
    }
    let response = await this.api.post('/time_entries', body);
    return response.data;
  }

  async updateTimeEntry(
    timeEntryId: number,
    data: {
      projectId?: number;
      taskId?: number;
      spentDate?: string;
      startedTime?: string;
      endedTime?: string;
      hours?: number;
      notes?: string;
      externalReference?: {
        id: string;
        groupId?: string;
        accountId?: string;
        permalink?: string;
      };
    }
  ): Promise<any> {
    let body: any = {};
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.taskId !== undefined) body.task_id = data.taskId;
    if (data.spentDate !== undefined) body.spent_date = data.spentDate;
    if (data.startedTime !== undefined) body.started_time = data.startedTime;
    if (data.endedTime !== undefined) body.ended_time = data.endedTime;
    if (data.hours !== undefined) body.hours = data.hours;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.externalReference) {
      body.external_reference = {
        id: data.externalReference.id,
        group_id: data.externalReference.groupId,
        account_id: data.externalReference.accountId,
        permalink: data.externalReference.permalink
      };
    }
    let response = await this.api.patch(`/time_entries/${timeEntryId}`, body);
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: number): Promise<void> {
    await this.api.delete(`/time_entries/${timeEntryId}`);
  }

  async restartTimeEntry(timeEntryId: number): Promise<any> {
    let response = await this.api.patch(`/time_entries/${timeEntryId}/restart`);
    return response.data;
  }

  async stopTimeEntry(timeEntryId: number): Promise<any> {
    let response = await this.api.patch(`/time_entries/${timeEntryId}/stop`);
    return response.data;
  }

  // --- Projects ---

  async listProjects(params?: {
    isActive?: boolean;
    clientId?: number;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/projects', {
      params: {
        is_active: params?.isActive,
        client_id: params?.clientId,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'projects');
  }

  async getProject(projectId: number): Promise<any> {
    let response = await this.api.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: {
    clientId: number;
    name: string;
    isBillable: boolean;
    billBy: string;
    budgetBy: string;
    code?: string;
    isActive?: boolean;
    isFixedFee?: boolean;
    hourlyRate?: number;
    budget?: number;
    budgetIsMonthly?: boolean;
    notifyWhenOverBudget?: boolean;
    overBudgetNotificationPercentage?: number;
    showBudgetToAll?: boolean;
    costBudget?: number;
    costBudgetIncludeExpenses?: boolean;
    fee?: number;
    notes?: string;
    startsOn?: string;
    endsOn?: string;
  }): Promise<any> {
    let body: any = {
      client_id: data.clientId,
      name: data.name,
      is_billable: data.isBillable,
      bill_by: data.billBy,
      budget_by: data.budgetBy
    };
    if (data.code !== undefined) body.code = data.code;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.isFixedFee !== undefined) body.is_fixed_fee = data.isFixedFee;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.budget !== undefined) body.budget = data.budget;
    if (data.budgetIsMonthly !== undefined) body.budget_is_monthly = data.budgetIsMonthly;
    if (data.notifyWhenOverBudget !== undefined)
      body.notify_when_over_budget = data.notifyWhenOverBudget;
    if (data.overBudgetNotificationPercentage !== undefined)
      body.over_budget_notification_percentage = data.overBudgetNotificationPercentage;
    if (data.showBudgetToAll !== undefined) body.show_budget_to_all = data.showBudgetToAll;
    if (data.costBudget !== undefined) body.cost_budget = data.costBudget;
    if (data.costBudgetIncludeExpenses !== undefined)
      body.cost_budget_include_expenses = data.costBudgetIncludeExpenses;
    if (data.fee !== undefined) body.fee = data.fee;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startsOn !== undefined) body.starts_on = data.startsOn;
    if (data.endsOn !== undefined) body.ends_on = data.endsOn;
    let response = await this.api.post('/projects', body);
    return response.data;
  }

  async updateProject(
    projectId: number,
    data: {
      clientId?: number;
      name?: string;
      isBillable?: boolean;
      billBy?: string;
      budgetBy?: string;
      code?: string;
      isActive?: boolean;
      isFixedFee?: boolean;
      hourlyRate?: number;
      budget?: number;
      budgetIsMonthly?: boolean;
      notifyWhenOverBudget?: boolean;
      overBudgetNotificationPercentage?: number;
      showBudgetToAll?: boolean;
      costBudget?: number;
      costBudgetIncludeExpenses?: boolean;
      fee?: number;
      notes?: string;
      startsOn?: string;
      endsOn?: string;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.name !== undefined) body.name = data.name;
    if (data.isBillable !== undefined) body.is_billable = data.isBillable;
    if (data.billBy !== undefined) body.bill_by = data.billBy;
    if (data.budgetBy !== undefined) body.budget_by = data.budgetBy;
    if (data.code !== undefined) body.code = data.code;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.isFixedFee !== undefined) body.is_fixed_fee = data.isFixedFee;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.budget !== undefined) body.budget = data.budget;
    if (data.budgetIsMonthly !== undefined) body.budget_is_monthly = data.budgetIsMonthly;
    if (data.notifyWhenOverBudget !== undefined)
      body.notify_when_over_budget = data.notifyWhenOverBudget;
    if (data.overBudgetNotificationPercentage !== undefined)
      body.over_budget_notification_percentage = data.overBudgetNotificationPercentage;
    if (data.showBudgetToAll !== undefined) body.show_budget_to_all = data.showBudgetToAll;
    if (data.costBudget !== undefined) body.cost_budget = data.costBudget;
    if (data.costBudgetIncludeExpenses !== undefined)
      body.cost_budget_include_expenses = data.costBudgetIncludeExpenses;
    if (data.fee !== undefined) body.fee = data.fee;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startsOn !== undefined) body.starts_on = data.startsOn;
    if (data.endsOn !== undefined) body.ends_on = data.endsOn;
    let response = await this.api.patch(`/projects/${projectId}`, body);
    return response.data;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.api.delete(`/projects/${projectId}`);
  }

  // --- Clients ---

  async listClients(params?: {
    isActive?: boolean;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/clients', {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'clients');
  }

  async getClient(clientId: number): Promise<any> {
    let response = await this.api.get(`/clients/${clientId}`);
    return response.data;
  }

  async createClient(data: {
    name: string;
    isActive?: boolean;
    address?: string;
    currency?: string;
  }): Promise<any> {
    let body: any = { name: data.name };
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.address !== undefined) body.address = data.address;
    if (data.currency !== undefined) body.currency = data.currency;
    let response = await this.api.post('/clients', body);
    return response.data;
  }

  async updateClient(
    clientId: number,
    data: {
      name?: string;
      isActive?: boolean;
      address?: string;
      currency?: string;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.address !== undefined) body.address = data.address;
    if (data.currency !== undefined) body.currency = data.currency;
    let response = await this.api.patch(`/clients/${clientId}`, body);
    return response.data;
  }

  async deleteClient(clientId: number): Promise<void> {
    await this.api.delete(`/clients/${clientId}`);
  }

  // --- Contacts ---

  async listContacts(params?: {
    clientId?: number;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/contacts', {
      params: {
        client_id: params?.clientId,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'contacts');
  }

  async getContact(contactId: number): Promise<any> {
    let response = await this.api.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: {
    clientId: number;
    firstName: string;
    lastName?: string;
    title?: string;
    email?: string;
    phoneOffice?: string;
    phoneMobile?: string;
    fax?: string;
  }): Promise<any> {
    let body: any = {
      client_id: data.clientId,
      first_name: data.firstName
    };
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.title !== undefined) body.title = data.title;
    if (data.email !== undefined) body.email = data.email;
    if (data.phoneOffice !== undefined) body.phone_office = data.phoneOffice;
    if (data.phoneMobile !== undefined) body.phone_mobile = data.phoneMobile;
    if (data.fax !== undefined) body.fax = data.fax;
    let response = await this.api.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: number,
    data: {
      clientId?: number;
      firstName?: string;
      lastName?: string;
      title?: string;
      email?: string;
      phoneOffice?: string;
      phoneMobile?: string;
      fax?: string;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.title !== undefined) body.title = data.title;
    if (data.email !== undefined) body.email = data.email;
    if (data.phoneOffice !== undefined) body.phone_office = data.phoneOffice;
    if (data.phoneMobile !== undefined) body.phone_mobile = data.phoneMobile;
    if (data.fax !== undefined) body.fax = data.fax;
    let response = await this.api.patch(`/contacts/${contactId}`, body);
    return response.data;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.api.delete(`/contacts/${contactId}`);
  }

  // --- Invoices ---

  async listInvoices(params?: {
    clientId?: number;
    projectId?: number;
    updatedSince?: string;
    from?: string;
    to?: string;
    state?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/invoices', {
      params: {
        client_id: params?.clientId,
        project_id: params?.projectId,
        updated_since: params?.updatedSince,
        from: params?.from,
        to: params?.to,
        state: params?.state,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'invoices');
  }

  async getInvoice(invoiceId: number): Promise<any> {
    let response = await this.api.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: {
    clientId: number;
    retainerId?: number;
    estimateId?: number;
    number?: string;
    purchaseOrder?: string;
    tax?: number;
    tax2?: number;
    discount?: number;
    subject?: string;
    notes?: string;
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    paymentTerm?: string;
    lineItems?: Array<{
      kind: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      projectId?: number;
      taxed?: boolean;
      taxed2?: boolean;
    }>;
  }): Promise<any> {
    let body: any = { client_id: data.clientId };
    if (data.retainerId !== undefined) body.retainer_id = data.retainerId;
    if (data.estimateId !== undefined) body.estimate_id = data.estimateId;
    if (data.number !== undefined) body.number = data.number;
    if (data.purchaseOrder !== undefined) body.purchase_order = data.purchaseOrder;
    if (data.tax !== undefined) body.tax = data.tax;
    if (data.tax2 !== undefined) body.tax2 = data.tax2;
    if (data.discount !== undefined) body.discount = data.discount;
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.issueDate !== undefined) body.issue_date = data.issueDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.paymentTerm !== undefined) body.payment_term = data.paymentTerm;
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => ({
        kind: item.kind,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        project_id: item.projectId,
        taxed: item.taxed,
        taxed2: item.taxed2
      }));
    }
    let response = await this.api.post('/invoices', body);
    return response.data;
  }

  async updateInvoice(
    invoiceId: number,
    data: {
      clientId?: number;
      retainerId?: number;
      estimateId?: number;
      number?: string;
      purchaseOrder?: string;
      tax?: number;
      tax2?: number;
      discount?: number;
      subject?: string;
      notes?: string;
      currency?: string;
      issueDate?: string;
      dueDate?: string;
      paymentTerm?: string;
      lineItems?: Array<{
        lineItemId?: number;
        kind?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        projectId?: number;
        taxed?: boolean;
        taxed2?: boolean;
        destroy?: boolean;
      }>;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.retainerId !== undefined) body.retainer_id = data.retainerId;
    if (data.estimateId !== undefined) body.estimate_id = data.estimateId;
    if (data.number !== undefined) body.number = data.number;
    if (data.purchaseOrder !== undefined) body.purchase_order = data.purchaseOrder;
    if (data.tax !== undefined) body.tax = data.tax;
    if (data.tax2 !== undefined) body.tax2 = data.tax2;
    if (data.discount !== undefined) body.discount = data.discount;
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.issueDate !== undefined) body.issue_date = data.issueDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.paymentTerm !== undefined) body.payment_term = data.paymentTerm;
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => {
        let li: any = {};
        if (item.lineItemId !== undefined) li.id = item.lineItemId;
        if (item.kind !== undefined) li.kind = item.kind;
        if (item.description !== undefined) li.description = item.description;
        if (item.quantity !== undefined) li.quantity = item.quantity;
        if (item.unitPrice !== undefined) li.unit_price = item.unitPrice;
        if (item.projectId !== undefined) li.project_id = item.projectId;
        if (item.taxed !== undefined) li.taxed = item.taxed;
        if (item.taxed2 !== undefined) li.taxed2 = item.taxed2;
        if (item.destroy !== undefined) li._destroy = item.destroy;
        return li;
      });
    }
    let response = await this.api.patch(`/invoices/${invoiceId}`, body);
    return response.data;
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    await this.api.delete(`/invoices/${invoiceId}`);
  }

  // --- Invoice Payments ---

  async listInvoicePayments(
    invoiceId: number,
    params?: {
      updatedSince?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/invoices/${invoiceId}/payments`, {
      params: {
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'payments');
  }

  async createInvoicePayment(
    invoiceId: number,
    data: {
      amount: number;
      paidAt?: string;
      paidDate?: string;
      notes?: string;
    }
  ): Promise<any> {
    let body: any = { amount: data.amount };
    if (data.paidAt !== undefined) body.paid_at = data.paidAt;
    if (data.paidDate !== undefined) body.paid_date = data.paidDate;
    if (data.notes !== undefined) body.notes = data.notes;
    let response = await this.api.post(`/invoices/${invoiceId}/payments`, body);
    return response.data;
  }

  async deleteInvoicePayment(invoiceId: number, paymentId: number): Promise<void> {
    await this.api.delete(`/invoices/${invoiceId}/payments/${paymentId}`);
  }

  // --- Estimates ---

  async listEstimates(params?: {
    clientId?: number;
    updatedSince?: string;
    from?: string;
    to?: string;
    state?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/estimates', {
      params: {
        client_id: params?.clientId,
        updated_since: params?.updatedSince,
        from: params?.from,
        to: params?.to,
        state: params?.state,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'estimates');
  }

  async getEstimate(estimateId: number): Promise<any> {
    let response = await this.api.get(`/estimates/${estimateId}`);
    return response.data;
  }

  async createEstimate(data: {
    clientId: number;
    number?: string;
    purchaseOrder?: string;
    tax?: number;
    tax2?: number;
    discount?: number;
    subject?: string;
    notes?: string;
    currency?: string;
    issueDate?: string;
    lineItems?: Array<{
      kind: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      taxed?: boolean;
      taxed2?: boolean;
    }>;
  }): Promise<any> {
    let body: any = { client_id: data.clientId };
    if (data.number !== undefined) body.number = data.number;
    if (data.purchaseOrder !== undefined) body.purchase_order = data.purchaseOrder;
    if (data.tax !== undefined) body.tax = data.tax;
    if (data.tax2 !== undefined) body.tax2 = data.tax2;
    if (data.discount !== undefined) body.discount = data.discount;
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.issueDate !== undefined) body.issue_date = data.issueDate;
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => ({
        kind: item.kind,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        taxed: item.taxed,
        taxed2: item.taxed2
      }));
    }
    let response = await this.api.post('/estimates', body);
    return response.data;
  }

  async updateEstimate(
    estimateId: number,
    data: {
      clientId?: number;
      number?: string;
      purchaseOrder?: string;
      tax?: number;
      tax2?: number;
      discount?: number;
      subject?: string;
      notes?: string;
      currency?: string;
      issueDate?: string;
      lineItems?: Array<{
        lineItemId?: number;
        kind?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        taxed?: boolean;
        taxed2?: boolean;
        destroy?: boolean;
      }>;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.number !== undefined) body.number = data.number;
    if (data.purchaseOrder !== undefined) body.purchase_order = data.purchaseOrder;
    if (data.tax !== undefined) body.tax = data.tax;
    if (data.tax2 !== undefined) body.tax2 = data.tax2;
    if (data.discount !== undefined) body.discount = data.discount;
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.issueDate !== undefined) body.issue_date = data.issueDate;
    if (data.lineItems) {
      body.line_items = data.lineItems.map(item => {
        let li: any = {};
        if (item.lineItemId !== undefined) li.id = item.lineItemId;
        if (item.kind !== undefined) li.kind = item.kind;
        if (item.description !== undefined) li.description = item.description;
        if (item.quantity !== undefined) li.quantity = item.quantity;
        if (item.unitPrice !== undefined) li.unit_price = item.unitPrice;
        if (item.taxed !== undefined) li.taxed = item.taxed;
        if (item.taxed2 !== undefined) li.taxed2 = item.taxed2;
        if (item.destroy !== undefined) li._destroy = item.destroy;
        return li;
      });
    }
    let response = await this.api.patch(`/estimates/${estimateId}`, body);
    return response.data;
  }

  async deleteEstimate(estimateId: number): Promise<void> {
    await this.api.delete(`/estimates/${estimateId}`);
  }

  // --- Expenses ---

  async listExpenses(params?: {
    userId?: number;
    clientId?: number;
    projectId?: number;
    isBilled?: boolean;
    updatedSince?: string;
    from?: string;
    to?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/expenses', {
      params: {
        user_id: params?.userId,
        client_id: params?.clientId,
        project_id: params?.projectId,
        is_billed: params?.isBilled,
        updated_since: params?.updatedSince,
        from: params?.from,
        to: params?.to,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'expenses');
  }

  async getExpense(expenseId: number): Promise<any> {
    let response = await this.api.get(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(data: {
    projectId: number;
    expenseCategoryId: number;
    spentDate: string;
    userId?: number;
    totalCost?: number;
    units?: number;
    notes?: string;
    billable?: boolean;
  }): Promise<any> {
    let body: any = {
      project_id: data.projectId,
      expense_category_id: data.expenseCategoryId,
      spent_date: data.spentDate
    };
    if (data.userId !== undefined) body.user_id = data.userId;
    if (data.totalCost !== undefined) body.total_cost = data.totalCost;
    if (data.units !== undefined) body.units = data.units;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.billable !== undefined) body.billable = data.billable;
    let response = await this.api.post('/expenses', body);
    return response.data;
  }

  async updateExpense(
    expenseId: number,
    data: {
      projectId?: number;
      expenseCategoryId?: number;
      spentDate?: string;
      totalCost?: number;
      units?: number;
      notes?: string;
      billable?: boolean;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.expenseCategoryId !== undefined)
      body.expense_category_id = data.expenseCategoryId;
    if (data.spentDate !== undefined) body.spent_date = data.spentDate;
    if (data.totalCost !== undefined) body.total_cost = data.totalCost;
    if (data.units !== undefined) body.units = data.units;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.billable !== undefined) body.billable = data.billable;
    let response = await this.api.patch(`/expenses/${expenseId}`, body);
    return response.data;
  }

  async deleteExpense(expenseId: number): Promise<void> {
    await this.api.delete(`/expenses/${expenseId}`);
  }

  // --- Expense Categories ---

  async listExpenseCategories(params?: {
    isActive?: boolean;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/expense_categories', {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'expense_categories');
  }

  // --- Tasks ---

  async listTasks(params?: {
    isActive?: boolean;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/tasks', {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'tasks');
  }

  async getTask(taskId: number): Promise<any> {
    let response = await this.api.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: {
    name: string;
    billableByDefault?: boolean;
    defaultHourlyRate?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<any> {
    let body: any = { name: data.name };
    if (data.billableByDefault !== undefined)
      body.billable_by_default = data.billableByDefault;
    if (data.defaultHourlyRate !== undefined)
      body.default_hourly_rate = data.defaultHourlyRate;
    if (data.isDefault !== undefined) body.is_default = data.isDefault;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    let response = await this.api.post('/tasks', body);
    return response.data;
  }

  async updateTask(
    taskId: number,
    data: {
      name?: string;
      billableByDefault?: boolean;
      defaultHourlyRate?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Promise<any> {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.billableByDefault !== undefined)
      body.billable_by_default = data.billableByDefault;
    if (data.defaultHourlyRate !== undefined)
      body.default_hourly_rate = data.defaultHourlyRate;
    if (data.isDefault !== undefined) body.is_default = data.isDefault;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    let response = await this.api.patch(`/tasks/${taskId}`, body);
    return response.data;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.api.delete(`/tasks/${taskId}`);
  }

  // --- Users ---

  async listUsers(params?: {
    isActive?: boolean;
    updatedSince?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/users', {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'users');
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    let response = await this.api.get('/users/me');
    return response.data;
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    timezone?: string;
    hasAccessToAllFutureProjects?: boolean;
    isContractor?: boolean;
    isActive?: boolean;
    weeklyCapacity?: number;
    defaultHourlyRate?: number;
    costRate?: number;
    roles?: string[];
    accessRoles?: string[];
  }): Promise<any> {
    let body: any = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email
    };
    if (data.timezone !== undefined) body.timezone = data.timezone;
    if (data.hasAccessToAllFutureProjects !== undefined)
      body.has_access_to_all_future_projects = data.hasAccessToAllFutureProjects;
    if (data.isContractor !== undefined) body.is_contractor = data.isContractor;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.weeklyCapacity !== undefined) body.weekly_capacity = data.weeklyCapacity;
    if (data.defaultHourlyRate !== undefined)
      body.default_hourly_rate = data.defaultHourlyRate;
    if (data.costRate !== undefined) body.cost_rate = data.costRate;
    if (data.roles !== undefined) body.roles = data.roles;
    if (data.accessRoles !== undefined) body.access_roles = data.accessRoles;
    let response = await this.api.post('/users', body);
    return response.data;
  }

  async updateUser(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      timezone?: string;
      hasAccessToAllFutureProjects?: boolean;
      isContractor?: boolean;
      isActive?: boolean;
      weeklyCapacity?: number;
      defaultHourlyRate?: number;
      costRate?: number;
      roles?: string[];
      accessRoles?: string[];
    }
  ): Promise<any> {
    let body: any = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.timezone !== undefined) body.timezone = data.timezone;
    if (data.hasAccessToAllFutureProjects !== undefined)
      body.has_access_to_all_future_projects = data.hasAccessToAllFutureProjects;
    if (data.isContractor !== undefined) body.is_contractor = data.isContractor;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.weeklyCapacity !== undefined) body.weekly_capacity = data.weeklyCapacity;
    if (data.defaultHourlyRate !== undefined)
      body.default_hourly_rate = data.defaultHourlyRate;
    if (data.costRate !== undefined) body.cost_rate = data.costRate;
    if (data.roles !== undefined) body.roles = data.roles;
    if (data.accessRoles !== undefined) body.access_roles = data.accessRoles;
    let response = await this.api.patch(`/users/${userId}`, body);
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.api.delete(`/users/${userId}`);
  }

  // --- Roles ---

  async listRoles(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.api.get('/roles', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'roles');
  }

  async getRole(roleId: number): Promise<any> {
    let response = await this.api.get(`/roles/${roleId}`);
    return response.data;
  }

  async createRole(data: { name: string; userIds?: number[] }): Promise<any> {
    let body: any = { name: data.name };
    if (data.userIds !== undefined) body.user_ids = data.userIds;
    let response = await this.api.post('/roles', body);
    return response.data;
  }

  async updateRole(roleId: number, data: { name?: string; userIds?: number[] }): Promise<any> {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.userIds !== undefined) body.user_ids = data.userIds;
    let response = await this.api.patch(`/roles/${roleId}`, body);
    return response.data;
  }

  async deleteRole(roleId: number): Promise<void> {
    await this.api.delete(`/roles/${roleId}`);
  }

  // --- Project Task Assignments ---

  async listProjectTaskAssignments(
    projectId: number,
    params?: {
      isActive?: boolean;
      updatedSince?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/projects/${projectId}/task_assignments`, {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'task_assignments');
  }

  async createProjectTaskAssignment(
    projectId: number,
    data: {
      taskId: number;
      isActive?: boolean;
      billable?: boolean;
      hourlyRate?: number;
      budget?: number;
    }
  ): Promise<any> {
    let body: any = { task_id: data.taskId };
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.billable !== undefined) body.billable = data.billable;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.budget !== undefined) body.budget = data.budget;
    let response = await this.api.post(`/projects/${projectId}/task_assignments`, body);
    return response.data;
  }

  // --- Project User Assignments ---

  async listProjectUserAssignments(
    projectId: number,
    params?: {
      isActive?: boolean;
      updatedSince?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.api.get(`/projects/${projectId}/user_assignments`, {
      params: {
        is_active: params?.isActive,
        updated_since: params?.updatedSince,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return this.parsePaginatedResponse(response.data, 'user_assignments');
  }

  async createProjectUserAssignment(
    projectId: number,
    data: {
      userId: number;
      isActive?: boolean;
      isProjectManager?: boolean;
      useDefaultRates?: boolean;
      hourlyRate?: number;
      budget?: number;
    }
  ): Promise<any> {
    let body: any = { user_id: data.userId };
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.isProjectManager !== undefined) body.is_project_manager = data.isProjectManager;
    if (data.useDefaultRates !== undefined) body.use_default_rates = data.useDefaultRates;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.budget !== undefined) body.budget = data.budget;
    let response = await this.api.post(`/projects/${projectId}/user_assignments`, body);
    return response.data;
  }

  // --- Company ---

  async getCompany(): Promise<any> {
    let response = await this.api.get('/company');
    return response.data;
  }

  // --- Reports ---

  async getTimeReport(params: {
    from: string;
    to: string;
    page?: number;
    perPage?: number;
  }): Promise<any> {
    let response = await this.api.get('/reports/time/projects', {
      params: {
        from: params.from,
        to: params.to,
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async getExpenseReport(params: {
    from: string;
    to: string;
    page?: number;
    perPage?: number;
  }): Promise<any> {
    let response = await this.api.get('/reports/expenses/projects', {
      params: {
        from: params.from,
        to: params.to,
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async getUninvoicedReport(params: {
    from: string;
    to: string;
    page?: number;
    perPage?: number;
  }): Promise<any> {
    let response = await this.api.get('/reports/uninvoiced', {
      params: {
        from: params.from,
        to: params.to,
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async getProjectBudgetReport(params?: { page?: number; perPage?: number }): Promise<any> {
    let response = await this.api.get('/reports/project_budget', {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // --- Invoice Messages ---

  async createInvoiceMessage(
    invoiceId: number,
    data: {
      eventType?: string;
      recipients?: Array<{ name?: string; email: string }>;
      subject?: string;
      body?: string;
      includeLinkToClientInvoice?: boolean;
      attachPdf?: boolean;
      sendMeACopy?: boolean;
      thankYou?: boolean;
    }
  ): Promise<any> {
    let reqBody: any = {};
    if (data.eventType !== undefined) reqBody.event_type = data.eventType;
    if (data.recipients !== undefined) reqBody.recipients = data.recipients;
    if (data.subject !== undefined) reqBody.subject = data.subject;
    if (data.body !== undefined) reqBody.body = data.body;
    if (data.includeLinkToClientInvoice !== undefined)
      reqBody.include_link_to_client_invoice = data.includeLinkToClientInvoice;
    if (data.attachPdf !== undefined) reqBody.attach_pdf = data.attachPdf;
    if (data.sendMeACopy !== undefined) reqBody.send_me_a_copy = data.sendMeACopy;
    if (data.thankYou !== undefined) reqBody.thank_you = data.thankYou;
    let response = await this.api.post(`/invoices/${invoiceId}/messages`, reqBody);
    return response.data;
  }

  // --- Estimate Messages ---

  async createEstimateMessage(
    estimateId: number,
    data: {
      recipients: Array<{ name?: string; email: string }>;
      subject?: string;
      body?: string;
      sendMeACopy?: boolean;
      eventType?: string;
    }
  ): Promise<any> {
    let reqBody: any = { recipients: data.recipients };
    if (data.subject !== undefined) reqBody.subject = data.subject;
    if (data.body !== undefined) reqBody.body = data.body;
    if (data.sendMeACopy !== undefined) reqBody.send_me_a_copy = data.sendMeACopy;
    if (data.eventType !== undefined) reqBody.event_type = data.eventType;
    let response = await this.api.post(`/estimates/${estimateId}/messages`, reqBody);
    return response.data;
  }

  // --- Helpers ---

  private parsePaginatedResponse(data: any, key: string): PaginatedResponse<any> {
    return {
      results: data[key] ?? [],
      totalEntries: data.total_entries ?? 0,
      totalPages: data.total_pages ?? 0,
      nextPage: data.next_page ?? null,
      previousPage: data.previous_page ?? null,
      page: data.page ?? 1,
      perPage: data.per_page ?? 100
    };
  }
}
