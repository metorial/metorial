import { createAxios } from 'slates';

export type ApiVersion = 'freshworks' | 'classic';

export type TargetableType = 'Contact' | 'Lead' | 'Deal' | 'SalesAccount';

export interface ClientConfig {
  token: string;
  domain: string;
  apiVersion: ApiVersion;
}

let buildBaseUrl = (domain: string, apiVersion: ApiVersion): string => {
  if (apiVersion === 'classic') {
    return `https://${domain}.freshsales.io/api`;
  }
  return `https://${domain}.myfreshworks.com/crm/sales/api`;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: buildBaseUrl(config.domain, config.apiVersion),
      headers: {
        Authorization: `Token token=${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Leads ----

  async createLead(lead: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/leads', { lead });
    return response.data.lead;
  }

  async getLead(leadId: number, include?: string): Promise<Record<string, any>> {
    let params: Record<string, any> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/leads/${leadId}`, { params });
    return response.data.lead;
  }

  async updateLead(leadId: number, lead: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.put(`/leads/${leadId}`, { lead });
    return response.data.lead;
  }

  async deleteLead(leadId: number): Promise<void> {
    await this.axios.delete(`/leads/${leadId}`);
  }

  async listLeads(
    viewId: number,
    options?: { page?: number; sort?: string; sortType?: string }
  ): Promise<{ leads: Record<string, any>[]; meta: Record<string, any> }> {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.sort) params.sort = options.sort;
    if (options?.sortType) params.sort_type = options.sortType;
    let response = await this.axios.get(`/leads/view/${viewId}`, { params });
    return { leads: response.data.leads || [], meta: response.data.meta || {} };
  }

  async upsertLead(
    uniqueIdentifier: Record<string, any>,
    lead: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/leads/upsert', {
      unique_identifier: uniqueIdentifier,
      lead
    });
    return response.data.lead;
  }

  async convertLead(leadId: number, lead?: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post(`/leads/${leadId}/convert`, lead ? { lead } : {});
    return response.data;
  }

  async getLeadFilters(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/leads/filters');
    return response.data.filters || [];
  }

  // ---- Contacts ----

  async createContact(contact: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/contacts', { contact });
    return response.data.contact;
  }

  async getContact(contactId: number, include?: string): Promise<Record<string, any>> {
    let params: Record<string, any> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/contacts/${contactId}`, { params });
    return response.data.contact;
  }

  async updateContact(
    contactId: number,
    contact: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/contacts/${contactId}`, { contact });
    return response.data.contact;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async listContacts(
    viewId: number,
    options?: { page?: number; sort?: string; sortType?: string }
  ): Promise<{ contacts: Record<string, any>[]; meta: Record<string, any> }> {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.sort) params.sort = options.sort;
    if (options?.sortType) params.sort_type = options.sortType;
    let response = await this.axios.get(`/contacts/view/${viewId}`, { params });
    return { contacts: response.data.contacts || [], meta: response.data.meta || {} };
  }

  async upsertContact(
    uniqueIdentifier: Record<string, any>,
    contact: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/contacts/upsert', {
      unique_identifier: uniqueIdentifier,
      contact
    });
    return response.data.contact;
  }

  async getContactFilters(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/contacts/filters');
    return response.data.filters || [];
  }

  async getContactActivities(contactId: number): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/contacts/${contactId}/activities`);
    return response.data.activities || [];
  }

  // ---- Accounts (Sales Accounts) ----

  async createAccount(salesAccount: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/sales_accounts', { sales_account: salesAccount });
    return response.data.sales_account;
  }

  async getAccount(accountId: number, include?: string): Promise<Record<string, any>> {
    let params: Record<string, any> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/sales_accounts/${accountId}`, { params });
    return response.data.sales_account;
  }

  async updateAccount(
    accountId: number,
    salesAccount: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/sales_accounts/${accountId}`, {
      sales_account: salesAccount
    });
    return response.data.sales_account;
  }

  async deleteAccount(accountId: number): Promise<void> {
    await this.axios.delete(`/sales_accounts/${accountId}`);
  }

  async listAccounts(
    viewId: number,
    options?: { page?: number; sort?: string; sortType?: string }
  ): Promise<{ salesAccounts: Record<string, any>[]; meta: Record<string, any> }> {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.sort) params.sort = options.sort;
    if (options?.sortType) params.sort_type = options.sortType;
    let response = await this.axios.get(`/sales_accounts/view/${viewId}`, { params });
    return {
      salesAccounts: response.data.sales_accounts || [],
      meta: response.data.meta || {}
    };
  }

  async upsertAccount(
    uniqueIdentifier: Record<string, any>,
    salesAccount: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/sales_accounts/upsert', {
      unique_identifier: uniqueIdentifier,
      sales_account: salesAccount
    });
    return response.data.sales_account;
  }

  async getAccountFilters(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/sales_accounts/filters');
    return response.data.filters || [];
  }

  // ---- Deals ----

  async createDeal(deal: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/deals', { deal });
    return response.data.deal;
  }

  async getDeal(dealId: number, include?: string): Promise<Record<string, any>> {
    let params: Record<string, any> = {};
    if (include) params.include = include;
    let response = await this.axios.get(`/deals/${dealId}`, { params });
    return response.data.deal;
  }

  async updateDeal(dealId: number, deal: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.put(`/deals/${dealId}`, { deal });
    return response.data.deal;
  }

  async deleteDeal(dealId: number): Promise<void> {
    await this.axios.delete(`/deals/${dealId}`);
  }

  async listDeals(
    viewId: number,
    options?: { page?: number; sort?: string; sortType?: string }
  ): Promise<{ deals: Record<string, any>[]; meta: Record<string, any> }> {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.sort) params.sort = options.sort;
    if (options?.sortType) params.sort_type = options.sortType;
    let response = await this.axios.get(`/deals/view/${viewId}`, { params });
    return { deals: response.data.deals || [], meta: response.data.meta || {} };
  }

  async upsertDeal(
    uniqueIdentifier: Record<string, any>,
    deal: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/deals/upsert', {
      unique_identifier: uniqueIdentifier,
      deal
    });
    return response.data.deal;
  }

  async getDealFilters(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/deals/filters');
    return response.data.filters || [];
  }

  // ---- Tasks ----

  async createTask(task: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/tasks', { task });
    return response.data.task;
  }

  async getTask(taskId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data.task;
  }

  async updateTask(taskId: number, task: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.put(`/tasks/${taskId}`, { task });
    return response.data.task;
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  async listTasks(
    filter: string,
    options?: { include?: string }
  ): Promise<Record<string, any>[]> {
    let params: Record<string, any> = { filter };
    if (options?.include) params.include = options.include;
    let response = await this.axios.get('/tasks', { params });
    return response.data.tasks || [];
  }

  // ---- Appointments ----

  async createAppointment(appointment: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/appointments', { appointment });
    return response.data.appointment;
  }

  async getAppointment(appointmentId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/appointments/${appointmentId}`);
    return response.data.appointment;
  }

  async updateAppointment(
    appointmentId: number,
    appointment: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/appointments/${appointmentId}`, { appointment });
    return response.data.appointment;
  }

  async deleteAppointment(appointmentId: number): Promise<void> {
    await this.axios.delete(`/appointments/${appointmentId}`);
  }

  async listAppointments(filter: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/appointments', { params: { filter } });
    return response.data.appointments || [];
  }

  // ---- Notes ----

  async createNote(note: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/notes', { note });
    return response.data.note;
  }

  async updateNote(noteId: number, note: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.put(`/notes/${noteId}`, { note });
    return response.data.note;
  }

  async deleteNote(noteId: number): Promise<void> {
    await this.axios.delete(`/notes/${noteId}`);
  }

  // ---- Sales Activities ----

  async createSalesActivity(salesActivity: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/sales_activities', {
      sales_activity: salesActivity
    });
    return response.data.sales_activity;
  }

  async getSalesActivity(activityId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`/sales_activities/${activityId}`);
    return response.data.sales_activity;
  }

  async updateSalesActivity(
    activityId: number,
    salesActivity: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/sales_activities/${activityId}`, {
      sales_activity: salesActivity
    });
    return response.data.sales_activity;
  }

  async deleteSalesActivity(activityId: number): Promise<void> {
    await this.axios.delete(`/sales_activities/${activityId}`);
  }

  // ---- Search ----

  async search(query: string, entities?: string): Promise<Record<string, any>[]> {
    let params: Record<string, any> = { q: query };
    if (entities) params.include = entities;
    let response = await this.axios.get('/search', { params });
    return response.data || [];
  }

  async lookup(
    query: string,
    field: string,
    entities: string
  ): Promise<Record<string, any>[]> {
    let params: Record<string, any> = { q: query, f: field, entities };
    let response = await this.axios.get('/lookup', { params });
    return response.data || [];
  }

  async filteredSearch(
    entityType: string,
    filterRules: Record<string, any>[],
    options?: { page?: number; perPage?: number }
  ): Promise<Record<string, any>[]> {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.perPage) params.per_page = options.perPage;
    let response = await this.axios.post(
      `/filtered_search/${entityType}`,
      { filter_rule: filterRules },
      { params }
    );
    return response.data || [];
  }

  // ---- Selectors ----

  async getSelector(selectorName: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/selector/${selectorName}`);
    return response.data[selectorName] || response.data || [];
  }

  // ---- Settings / Fields ----

  async getFields(entityType: string): Promise<Record<string, any>[]> {
    let response = await this.axios.get(`/settings/${entityType}/fields`);
    return response.data.fields || [];
  }
}
