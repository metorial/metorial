import { createAxios } from 'slates';

export class Client {
  private domain: string;
  private token: string;

  constructor(config: { token: string; domain: string }) {
    this.domain = config.domain;
    this.token = config.token;
  }

  private get http() {
    return createAxios({
      baseURL: `https://${this.domain}.mocoapp.com/api/v1`,
      headers: {
        Authorization: `Token token=${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Activities ----

  async listActivities(params?: Record<string, any>) {
    let response = await this.http.get('/activities', { params });
    return response.data;
  }

  async getActivity(activityId: number) {
    let response = await this.http.get(`/activities/${activityId}`);
    return response.data;
  }

  async createActivity(data: Record<string, any>) {
    let response = await this.http.post('/activities', data);
    return response.data;
  }

  async updateActivity(activityId: number, data: Record<string, any>) {
    let response = await this.http.put(`/activities/${activityId}`, data);
    return response.data;
  }

  async deleteActivity(activityId: number) {
    await this.http.delete(`/activities/${activityId}`);
  }

  async startTimer(activityId: number) {
    let response = await this.http.patch(`/activities/${activityId}/start_timer`);
    return response.data;
  }

  async stopTimer(activityId: number) {
    let response = await this.http.patch(`/activities/${activityId}/stop_timer`);
    return response.data;
  }

  // ---- Projects ----

  async listProjects(params?: Record<string, any>) {
    let response = await this.http.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.http.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: Record<string, any>) {
    let response = await this.http.post('/projects', data);
    return response.data;
  }

  async updateProject(projectId: number, data: Record<string, any>) {
    let response = await this.http.put(`/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: number) {
    await this.http.delete(`/projects/${projectId}`);
  }

  async archiveProject(projectId: number) {
    let response = await this.http.put(`/projects/${projectId}/archive`);
    return response.data;
  }

  async unarchiveProject(projectId: number) {
    let response = await this.http.put(`/projects/${projectId}/unarchive`);
    return response.data;
  }

  async getProjectReport(projectId: number) {
    let response = await this.http.get(`/projects/${projectId}/report`);
    return response.data;
  }

  // ---- Project Tasks ----

  async listProjectTasks(projectId: number) {
    let response = await this.http.get(`/projects/${projectId}/tasks`);
    return response.data;
  }

  async getProjectTask(projectId: number, taskId: number) {
    let response = await this.http.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  }

  async createProjectTask(projectId: number, data: Record<string, any>) {
    let response = await this.http.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  }

  async updateProjectTask(projectId: number, taskId: number, data: Record<string, any>) {
    let response = await this.http.put(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteProjectTask(projectId: number, taskId: number) {
    await this.http.delete(`/projects/${projectId}/tasks/${taskId}`);
  }

  // ---- Project Contracts ----

  async listProjectContracts(projectId: number) {
    let response = await this.http.get(`/projects/${projectId}/contracts`);
    return response.data;
  }

  async createProjectContract(projectId: number, data: Record<string, any>) {
    let response = await this.http.post(`/projects/${projectId}/contracts`, data);
    return response.data;
  }

  async updateProjectContract(
    projectId: number,
    contractId: number,
    data: Record<string, any>
  ) {
    let response = await this.http.put(`/projects/${projectId}/contracts/${contractId}`, data);
    return response.data;
  }

  async deleteProjectContract(projectId: number, contractId: number) {
    await this.http.delete(`/projects/${projectId}/contracts/${contractId}`);
  }

  // ---- Project Expenses ----

  async listProjectExpenses(projectId: number, params?: Record<string, any>) {
    let response = await this.http.get(`/projects/${projectId}/expenses`, { params });
    return response.data;
  }

  async createProjectExpense(projectId: number, data: Record<string, any>) {
    let response = await this.http.post(`/projects/${projectId}/expenses`, data);
    return response.data;
  }

  async updateProjectExpense(projectId: number, expenseId: number, data: Record<string, any>) {
    let response = await this.http.put(`/projects/${projectId}/expenses/${expenseId}`, data);
    return response.data;
  }

  async deleteProjectExpense(projectId: number, expenseId: number) {
    await this.http.delete(`/projects/${projectId}/expenses/${expenseId}`);
  }

  // ---- Companies ----

  async listCompanies(params?: Record<string, any>) {
    let response = await this.http.get('/companies', { params });
    return response.data;
  }

  async getCompany(companyId: number) {
    let response = await this.http.get(`/companies/${companyId}`);
    return response.data;
  }

  async createCompany(data: Record<string, any>) {
    let response = await this.http.post('/companies', data);
    return response.data;
  }

  async updateCompany(companyId: number, data: Record<string, any>) {
    let response = await this.http.put(`/companies/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: number) {
    await this.http.delete(`/companies/${companyId}`);
  }

  async archiveCompany(companyId: number) {
    let response = await this.http.put(`/companies/${companyId}/archive`);
    return response.data;
  }

  async unarchiveCompany(companyId: number) {
    let response = await this.http.put(`/companies/${companyId}/unarchive`);
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: Record<string, any>) {
    let response = await this.http.get('/contacts/people', { params });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await this.http.get(`/contacts/people/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.http.post('/contacts/people', data);
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.http.put(`/contacts/people/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: number) {
    await this.http.delete(`/contacts/people/${contactId}`);
  }

  // ---- Deals ----

  async listDeals(params?: Record<string, any>) {
    let response = await this.http.get('/deals', { params });
    return response.data;
  }

  async getDeal(dealId: number) {
    let response = await this.http.get(`/deals/${dealId}`);
    return response.data;
  }

  async createDeal(data: Record<string, any>) {
    let response = await this.http.post('/deals', data);
    return response.data;
  }

  async updateDeal(dealId: number, data: Record<string, any>) {
    let response = await this.http.put(`/deals/${dealId}`, data);
    return response.data;
  }

  async deleteDeal(dealId: number) {
    await this.http.delete(`/deals/${dealId}`);
  }

  // ---- Invoices ----

  async listInvoices(params?: Record<string, any>) {
    let response = await this.http.get('/invoices', { params });
    return response.data;
  }

  async getInvoice(invoiceId: number) {
    let response = await this.http.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.http.post('/invoices', data);
    return response.data;
  }

  async updateInvoiceStatus(invoiceId: number, status: string) {
    let response = await this.http.put(`/invoices/${invoiceId}/update_status`, { status });
    return response.data;
  }

  async deleteInvoice(invoiceId: number) {
    await this.http.delete(`/invoices/${invoiceId}`);
  }

  async sendInvoiceEmail(invoiceId: number, data: Record<string, any>) {
    let response = await this.http.post(`/invoices/${invoiceId}/send_email`, data);
    return response.data;
  }

  // ---- Invoice Payments ----

  async listInvoicePayments(params?: Record<string, any>) {
    let response = await this.http.get('/invoices/payments', { params });
    return response.data;
  }

  async createInvoicePayment(invoiceId: number, data: Record<string, any>) {
    let response = await this.http.post(`/invoices/${invoiceId}/payments`, {
      ...data,
      invoice_id: invoiceId
    });
    return response.data;
  }

  // ---- Offers ----

  async listOffers(params?: Record<string, any>) {
    let response = await this.http.get('/offers', { params });
    return response.data;
  }

  async getOffer(offerId: number) {
    let response = await this.http.get(`/offers/${offerId}`);
    return response.data;
  }

  async createOffer(data: Record<string, any>) {
    let response = await this.http.post('/offers', data);
    return response.data;
  }

  async updateOfferStatus(offerId: number, status: string) {
    let response = await this.http.put(`/offers/${offerId}/update_status`, { status });
    return response.data;
  }

  async deleteOffer(offerId: number) {
    await this.http.delete(`/offers/${offerId}`);
  }

  // ---- Purchases ----

  async listPurchases(params?: Record<string, any>) {
    let response = await this.http.get('/purchases', { params });
    return response.data;
  }

  async getPurchase(purchaseId: number) {
    let response = await this.http.get(`/purchases/${purchaseId}`);
    return response.data;
  }

  async createPurchase(data: Record<string, any>) {
    let response = await this.http.post('/purchases', data);
    return response.data;
  }

  async updatePurchase(purchaseId: number, data: Record<string, any>) {
    let response = await this.http.put(`/purchases/${purchaseId}`, data);
    return response.data;
  }

  async deletePurchase(purchaseId: number) {
    await this.http.delete(`/purchases/${purchaseId}`);
  }

  // ---- Users ----

  async listUsers(params?: Record<string, any>) {
    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  // ---- User Presences ----

  async listPresences(params?: Record<string, any>) {
    let response = await this.http.get('/users/presences', { params });
    return response.data;
  }

  async createPresence(data: Record<string, any>) {
    let response = await this.http.post('/users/presences', data);
    return response.data;
  }

  async touchPresence(data?: Record<string, any>) {
    let response = await this.http.post('/users/presences/touch', data || {});
    return response.data;
  }

  // ---- Schedules / Absences ----

  async listSchedules(params?: Record<string, any>) {
    let response = await this.http.get('/schedules', { params });
    return response.data;
  }

  async createSchedule(data: Record<string, any>) {
    let response = await this.http.post('/schedules', data);
    return response.data;
  }

  async deleteSchedule(scheduleId: number) {
    await this.http.delete(`/schedules/${scheduleId}`);
  }

  // ---- Planning Entries ----

  async listPlanningEntries(params?: Record<string, any>) {
    let response = await this.http.get('/planning_entries', { params });
    return response.data;
  }

  async createPlanningEntry(data: Record<string, any>) {
    let response = await this.http.post('/planning_entries', data);
    return response.data;
  }

  async updatePlanningEntry(entryId: number, data: Record<string, any>) {
    let response = await this.http.put(`/planning_entries/${entryId}`, data);
    return response.data;
  }

  async deletePlanningEntry(entryId: number) {
    await this.http.delete(`/planning_entries/${entryId}`);
  }

  // ---- Comments ----

  async listComments(params?: Record<string, any>) {
    let response = await this.http.get('/comments', { params });
    return response.data;
  }

  async createComment(data: Record<string, any>) {
    let response = await this.http.post('/comments', data);
    return response.data;
  }

  async updateComment(commentId: number, data: Record<string, any>) {
    let response = await this.http.put(`/comments/${commentId}`, data);
    return response.data;
  }

  async deleteComment(commentId: number) {
    await this.http.delete(`/comments/${commentId}`);
  }

  // ---- Units ----

  async listUnits() {
    let response = await this.http.get('/units');
    return response.data;
  }

  // ---- Deal Categories ----

  async listDealCategories() {
    let response = await this.http.get('/deal_categories');
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let response = await this.http.get('/account/web_hooks');
    return response.data;
  }

  async createWebhook(data: { target: string; event: string; hook: string }) {
    let response = await this.http.post('/account/web_hooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    await this.http.delete(`/account/web_hooks/${webhookId}`);
  }

  async enableWebhook(webhookId: number) {
    let response = await this.http.put(`/account/web_hooks/${webhookId}/enable`);
    return response.data;
  }

  async disableWebhook(webhookId: number) {
    let response = await this.http.put(`/account/web_hooks/${webhookId}/disable`);
    return response.data;
  }

  // ---- User Holidays ----

  async listHolidays(params?: Record<string, any>) {
    let response = await this.http.get('/users/holidays', { params });
    return response.data;
  }

  // ---- User Employments ----

  async listEmployments(params?: Record<string, any>) {
    let response = await this.http.get('/users/employments', { params });
    return response.data;
  }

  // ---- Profile ----

  async getProfile() {
    let response = await this.http.get('/profile');
    return response.data;
  }

  // ---- Session ----

  async getSession() {
    let response = await this.http.get('/session');
    return response.data;
  }
}
