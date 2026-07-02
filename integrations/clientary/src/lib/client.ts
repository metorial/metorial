import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  subdomain: string;
}

export class Client {
  private axios;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.clientary.com/api/v2`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      auth: {
        username: config.token,
        password: config.token
      }
    });
  }

  // ─── Clients ───────────────────────────────────────────────

  async listClients(params?: { page?: number; updatedSince?: string; sort?: string }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.updatedSince) query.updated_since = params.updatedSince;
    if (params?.sort) query.sort = params.sort;
    let response = await this.axios.get('/clients', { params: query });
    return response.data;
  }

  async getClient(clientId: number) {
    let response = await this.axios.get(`/clients/${clientId}`);
    return response.data;
  }

  async createClient(data: Record<string, any>) {
    let response = await this.axios.post('/clients', { client: data });
    return response.data;
  }

  async updateClient(clientId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/clients/${clientId}`, { client: data });
    return response.data;
  }

  async deleteClient(clientId: number) {
    let response = await this.axios.delete(`/clients/${clientId}`);
    return response.data;
  }

  // ─── Contacts ──────────────────────────────────────────────

  async listContacts(params?: { page?: number; clientId?: number }) {
    let path = params?.clientId ? `/clients/${params.clientId}/contacts` : '/contacts';
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(clientId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/clients/${clientId}/contacts`, { contact: data });
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/contacts/${contactId}`, { contact: data });
    return response.data;
  }

  async deleteContact(contactId: number) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  // ─── Leads ─────────────────────────────────────────────────

  async listLeads(params?: { page?: number; sort?: string }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.sort) query.sort = params.sort;
    let response = await this.axios.get('/leads', { params: query });
    return response.data;
  }

  async getLead(leadId: number) {
    let response = await this.axios.get(`/leads/${leadId}`);
    return response.data;
  }

  async createLead(data: Record<string, any>) {
    let response = await this.axios.post('/leads', { lead: data });
    return response.data;
  }

  async updateLead(leadId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/leads/${leadId}`, { lead: data });
    return response.data;
  }

  async deleteLead(leadId: number) {
    let response = await this.axios.delete(`/leads/${leadId}`);
    return response.data;
  }

  // ─── Invoices ──────────────────────────────────────────────

  async listInvoices(params?: { page?: number; updatedSince?: string; clientId?: number }) {
    let path = params?.clientId ? `/clients/${params.clientId}/invoices` : '/invoices';
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.updatedSince) query.updated_since = params.updatedSince;
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getInvoice(invoiceId: number) {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>, clientId?: number) {
    let path = clientId ? `/clients/${clientId}/invoices` : '/invoices';
    let response = await this.axios.post(path, { invoice: data });
    return response.data;
  }

  async updateInvoice(invoiceId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/invoices/${invoiceId}`, { invoice: data });
    return response.data;
  }

  async deleteInvoice(invoiceId: number) {
    let response = await this.axios.delete(`/invoices/${invoiceId}`);
    return response.data;
  }

  async sendInvoice(
    invoiceId: number,
    data: {
      recipients: string;
      subject?: string;
      message?: string;
      sendCopy?: boolean;
      attachPdf?: boolean;
    }
  ) {
    let body: Record<string, any> = {
      recipients: data.recipients
    };
    if (data.subject) body.subject = data.subject;
    if (data.message) body.message = data.message;
    if (data.sendCopy !== undefined) body.send_copy = data.sendCopy;
    if (data.attachPdf !== undefined) body.attach_pdf = data.attachPdf;
    let response = await this.axios.post(`/invoices/${invoiceId}/messages`, body);
    return response.data;
  }

  // ─── Estimates ─────────────────────────────────────────────

  async listEstimates(params?: { page?: number; clientId?: number; projectId?: number }) {
    let path = '/estimates';
    if (params?.clientId) path = `/clients/${params.clientId}/estimates`;
    else if (params?.projectId) path = `/projects/${params.projectId}/estimates`;
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getEstimate(estimateId: number) {
    let response = await this.axios.get(`/estimates/${estimateId}`);
    return response.data;
  }

  async createEstimate(data: Record<string, any>, clientId?: number) {
    let path = clientId ? `/clients/${clientId}/estimates` : '/estimates';
    let response = await this.axios.post(path, { estimate: data });
    return response.data;
  }

  async updateEstimate(estimateId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/estimates/${estimateId}`, { estimate: data });
    return response.data;
  }

  async deleteEstimate(estimateId: number) {
    let response = await this.axios.delete(`/estimates/${estimateId}`);
    return response.data;
  }

  async sendEstimate(
    estimateId: number,
    data: { recipients: string; subject?: string; message?: string }
  ) {
    let body: Record<string, any> = {
      recipients: data.recipients
    };
    if (data.subject) body.subject = data.subject;
    if (data.message) body.message = data.message;
    let response = await this.axios.post(`/estimates/${estimateId}/messages`, body);
    return response.data;
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: { page?: number; clientId?: number; filter?: string }) {
    let path = params?.clientId ? `/clients/${params.clientId}/projects` : '/projects';
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.filter) query.filter = params.filter;
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.axios.post('/projects', { project: data });
    return response.data;
  }

  async updateProject(projectId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/projects/${projectId}`, { project: data });
    return response.data;
  }

  async deleteProject(projectId: number) {
    let response = await this.axios.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ─── Hours (Time Tracking) ─────────────────────────────────

  async listHours(projectId: number, params?: { page?: number; filter?: string }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.filter) query.filter = params.filter;
    let response = await this.axios.get(`/projects/${projectId}/hours`, { params: query });
    return response.data;
  }

  async getHour(hourId: number) {
    let response = await this.axios.get(`/hours/${hourId}`);
    return response.data;
  }

  async createHour(projectId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/projects/${projectId}/hours`, { hour: data });
    return response.data;
  }

  async updateHour(hourId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/hours/${hourId}`, { hour: data });
    return response.data;
  }

  async deleteHour(hourId: number) {
    let response = await this.axios.delete(`/hours/${hourId}`);
    return response.data;
  }

  // ─── Tasks ─────────────────────────────────────────────────

  async listTasks(params?: { page?: number; projectId?: number }) {
    let path = params?.projectId ? `/projects/${params.projectId}/tasks` : '/tasks';
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getTask(taskId: number) {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', { task: data });
    return response.data;
  }

  async updateTask(taskId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, { task: data });
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.axios.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // ─── Expenses ──────────────────────────────────────────────

  async listExpenses(params?: {
    page?: number;
    clientId?: number;
    projectId?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    let path = '/expenses';
    if (params?.clientId) path = `/clients/${params.clientId}/expenses`;
    else if (params?.projectId) path = `/projects/${params.projectId}/expenses`;
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.fromDate) query.from_date = params.fromDate;
    if (params?.toDate) query.to_date = params.toDate;
    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getExpense(expenseId: number) {
    let response = await this.axios.get(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(data: Record<string, any>) {
    let response = await this.axios.post('/expenses', { expense: data });
    return response.data;
  }

  async updateExpense(expenseId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/expenses/${expenseId}`, { expense: data });
    return response.data;
  }

  async deleteExpense(expenseId: number) {
    let response = await this.axios.delete(`/expenses/${expenseId}`);
    return response.data;
  }

  // ─── Payments ──────────────────────────────────────────────

  async listPayments(params?: { page?: number; sort?: string }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.sort) query.sort = params.sort;
    let response = await this.axios.get('/payments', { params: query });
    return response.data;
  }

  async createPayment(
    invoiceId: number,
    data: { amount?: number; note?: string; paymentProfileId?: number }
  ) {
    let body: Record<string, any> = {};
    if (data.amount !== undefined) body.amount = data.amount;
    if (data.note) body.note = data.note;
    if (data.paymentProfileId) body.payment_profile_id = data.paymentProfileId;
    let response = await this.axios.post(`/invoices/${invoiceId}/payments`, { payment: body });
    return response.data;
  }

  async deletePayment(invoiceId: number, paymentId: number) {
    let response = await this.axios.delete(`/invoices/${invoiceId}/payments/${paymentId}`);
    return response.data;
  }

  // ─── Recurring Schedules ───────────────────────────────────

  async listRecurringSchedules(params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get('/recurring', { params: query });
    return response.data;
  }

  async getRecurringSchedule(scheduleId: number) {
    let response = await this.axios.get(`/recurring/${scheduleId}`);
    return response.data;
  }

  async createRecurringSchedule(data: Record<string, any>) {
    let response = await this.axios.post('/recurring', { recurring_schedule: data });
    return response.data;
  }

  async updateRecurringSchedule(scheduleId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/recurring/${scheduleId}`, {
      recurring_schedule: data
    });
    return response.data;
  }

  async deleteRecurringSchedule(scheduleId: number) {
    let response = await this.axios.delete(`/recurring/${scheduleId}`);
    return response.data;
  }

  // ─── Staff ─────────────────────────────────────────────────

  async listStaff() {
    let response = await this.axios.get('/staff');
    return response.data;
  }

  async getStaffMember(staffId: number) {
    let response = await this.axios.get(`/staff/${staffId}`);
    return response.data;
  }

  // ─── Payment Profiles ─────────────────────────────────────

  async listPaymentProfiles(clientId: number) {
    let response = await this.axios.get(`/clients/${clientId}/payment_profiles`);
    return response.data;
  }

  async createPaymentProfile(clientId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/clients/${clientId}/payment_profiles`, {
      payment_profile: data
    });
    return response.data;
  }

  async deletePaymentProfile(clientId: number, profileId: number) {
    let response = await this.axios.delete(
      `/clients/${clientId}/payment_profiles/${profileId}`
    );
    return response.data;
  }
}
