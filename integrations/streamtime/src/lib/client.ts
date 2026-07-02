import { createAxios } from 'slates';

export class StreamtimeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.streamtime.net/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── Organisation ──────────────────────────────────────────────

  async getOrganisation(): Promise<any> {
    let response = await this.axios.get('/organisation');
    return response.data;
  }

  // ── Users ─────────────────────────────────────────────────────

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/users');
    return response.data;
  }

  // ── Branches ──────────────────────────────────────────────────

  async listBranches(): Promise<any[]> {
    let response = await this.axios.get('/branches');
    return response.data;
  }

  async getBranch(branchId: number): Promise<any> {
    let response = await this.axios.get(`/branches/${branchId}`);
    return response.data;
  }

  // ── Companies ─────────────────────────────────────────────────

  async createCompany(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async getCompany(companyId: number): Promise<any> {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async updateCompany(companyId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/companies/${companyId}`, data);
    return response.data;
  }

  async listCompanyAddresses(companyId: number): Promise<any[]> {
    let response = await this.axios.get(`/companies/${companyId}/addresses`);
    return response.data;
  }

  async listCompanyContacts(companyId: number): Promise<any[]> {
    let response = await this.axios.get(`/companies/${companyId}/contacts`);
    return response.data;
  }

  // ── Contacts ──────────────────────────────────────────────────

  async createContact(companyId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/companies/${companyId}/contacts`, data);
    return response.data;
  }

  async getContact(contactId: number): Promise<any> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  // ── Jobs ──────────────────────────────────────────────────────

  async createJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/jobs', data);
    return response.data;
  }

  async getJob(jobId: number): Promise<any> {
    let response = await this.axios.get(`/jobs/${jobId}`);
    return response.data;
  }

  async updateJob(jobId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/jobs/${jobId}`, data);
    return response.data;
  }

  async updateJobStatus(jobId: number, statusData: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/jobs/${jobId}/job_status`, statusData);
    return response.data;
  }

  async duplicateJob(jobId: number, data?: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobId}/duplicate`, data || {});
    return response.data;
  }

  async listJobActivityEntries(jobId: number): Promise<any[]> {
    let response = await this.axios.get(`/jobs/${jobId}/activity_entries`);
    return response.data;
  }

  async createJobActivityEntry(jobId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobId}/activity_entries`, data);
    return response.data;
  }

  // ── Job Phases ────────────────────────────────────────────────

  async listJobPhases(jobId: number): Promise<any[]> {
    let response = await this.axios.get(`/jobs/${jobId}/job_phases`);
    return response.data;
  }

  async createJobPhase(jobId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobId}/job_phases`, data);
    return response.data;
  }

  async getJobPhase(phaseId: number): Promise<any> {
    let response = await this.axios.get(`/job_phases/${phaseId}`);
    return response.data;
  }

  async updateJobPhase(phaseId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/job_phases/${phaseId}`, data);
    return response.data;
  }

  // ── Job Items ─────────────────────────────────────────────────

  async listJobItems(jobId: number): Promise<any[]> {
    let response = await this.axios.get(`/jobs/${jobId}/job_items`);
    return response.data;
  }

  async createJobItem(jobId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobId}/job_items`, data);
    return response.data;
  }

  async getJobItem(jobItemId: number): Promise<any> {
    let response = await this.axios.get(`/job_items/${jobItemId}`);
    return response.data;
  }

  async updateJobItem(jobItemId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/job_items/${jobItemId}`, data);
    return response.data;
  }

  async listJobItemRoles(jobItemId: number): Promise<any[]> {
    let response = await this.axios.get(`/job_items/${jobItemId}/job_item_roles`);
    return response.data;
  }

  async assignJobItemRole(jobItemId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/job_items/${jobItemId}/job_item_roles`, data);
    return response.data;
  }

  async listJobItemUsers(jobItemId: number): Promise<any[]> {
    let response = await this.axios.get(`/job_items/${jobItemId}/job_item_users`);
    return response.data;
  }

  async assignJobItemUser(jobItemId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/job_items/${jobItemId}/job_item_users`, data);
    return response.data;
  }

  async listJobItemSubItems(jobItemId: number): Promise<any[]> {
    let response = await this.axios.get(`/job_items/${jobItemId}/job_item_sub_items`);
    return response.data;
  }

  async createJobItemSubItem(jobItemId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/job_items/${jobItemId}/job_item_sub_items`, data);
    return response.data;
  }

  // ── Job Milestones ────────────────────────────────────────────

  async listJobMilestones(jobId: number): Promise<any[]> {
    let response = await this.axios.get(`/jobs/${jobId}/job_milestones`);
    return response.data;
  }

  async createJobMilestone(jobId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobId}/job_milestones`, data);
    return response.data;
  }

  async getJobMilestone(milestoneId: number): Promise<any> {
    let response = await this.axios.get(`/job_milestones/${milestoneId}`);
    return response.data;
  }

  async updateJobMilestone(milestoneId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/job_milestones/${milestoneId}`, data);
    return response.data;
  }

  async deleteJobMilestone(milestoneId: number): Promise<void> {
    await this.axios.delete(`/job_milestones/${milestoneId}`);
  }

  // ── Invoices ──────────────────────────────────────────────────

  async getInvoice(invoiceId: number): Promise<any> {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async updateInvoice(invoiceId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/invoices/${invoiceId}`, data);
    return response.data;
  }

  async listInvoiceLineItems(invoiceId: number): Promise<any[]> {
    let response = await this.axios.get(`/invoices/${invoiceId}/invoice_line_items`);
    return response.data;
  }

  async listInvoiceTrackedLineItems(invoiceId: number): Promise<any[]> {
    let response = await this.axios.get(`/invoices/${invoiceId}/tracked_line_items`);
    return response.data;
  }

  async listInvoicePayments(invoiceId: number): Promise<any[]> {
    let response = await this.axios.get(`/invoices/${invoiceId}/invoice_payments`);
    return response.data;
  }

  async createInvoicePayment(invoiceId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/invoices/${invoiceId}/invoice_payments`, data);
    return response.data;
  }

  // ── Quotes ────────────────────────────────────────────────────

  async getQuote(quoteId: number): Promise<any> {
    let response = await this.axios.get(`/quotes/${quoteId}`);
    return response.data;
  }

  async listQuoteLineItems(quoteId: number): Promise<any[]> {
    let response = await this.axios.get(`/quotes/${quoteId}/quote_line_items`);
    return response.data;
  }

  async listQuoteTrackedLineItems(quoteId: number): Promise<any[]> {
    let response = await this.axios.get(`/quotes/${quoteId}/tracked_line_items`);
    return response.data;
  }

  // ── Logged Times ──────────────────────────────────────────────

  async createLoggedTime(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/logged_times', data);
    return response.data;
  }

  async createLoggedTimesBulk(entries: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post('/logged_times/bulk', entries);
    return response.data;
  }

  async getLoggedTime(loggedTimeId: number): Promise<any> {
    let response = await this.axios.get(`/logged_times/${loggedTimeId}`);
    return response.data;
  }

  async updateLoggedTime(loggedTimeId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/logged_times/${loggedTimeId}`, data);
    return response.data;
  }

  async deleteLoggedTime(loggedTimeId: number): Promise<void> {
    await this.axios.delete(`/logged_times/${loggedTimeId}`);
  }

  // ── Logged Expenses ───────────────────────────────────────────

  async createLoggedExpense(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/logged_expenses', data);
    return response.data;
  }

  async getLoggedExpense(loggedExpenseId: number): Promise<any> {
    let response = await this.axios.get(`/logged_expenses/${loggedExpenseId}`);
    return response.data;
  }

  async updateLoggedExpense(loggedExpenseId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/logged_expenses/${loggedExpenseId}`, data);
    return response.data;
  }

  async getExpensePurchaseOrder(loggedExpenseId: number): Promise<any> {
    let response = await this.axios.get(`/logged_expenses/${loggedExpenseId}/purchase_order`);
    return response.data;
  }

  async listExpensePurchaseOrderLineItems(loggedExpenseId: number): Promise<any[]> {
    let response = await this.axios.get(
      `/logged_expenses/${loggedExpenseId}/purchase_order_line_items`
    );
    return response.data;
  }

  // ── Labels ────────────────────────────────────────────────────

  async listLabels(params?: Record<string, any>): Promise<any[]> {
    let response = await this.axios.get('/labels', { params });
    return response.data;
  }

  async createLabel(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/labels', data);
    return response.data;
  }

  async searchLabels(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/labels/search', data);
    return response.data;
  }

  async deleteLabel(labelId: number): Promise<void> {
    await this.axios.delete(`/labels/${labelId}`);
  }

  // ── Roles ─────────────────────────────────────────────────────

  async listRoles(params?: Record<string, any>): Promise<any[]> {
    let response = await this.axios.get('/roles', { params });
    return response.data;
  }

  async getRole(roleId: number): Promise<any> {
    let response = await this.axios.get(`/roles/${roleId}`);
    return response.data;
  }

  // ── Rate Cards ────────────────────────────────────────────────

  async listRateCards(): Promise<any[]> {
    let response = await this.axios.get('/rate_cards');
    return response.data;
  }

  async getRateCard(rateCardId: number): Promise<any> {
    let response = await this.axios.get(`/rate_cards/${rateCardId}`);
    return response.data;
  }

  // ── Search ────────────────────────────────────────────────────

  async search(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/search', data);
    return response.data;
  }

  async searchTimeSeries(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/grouped_search/time_series', data);
    return response.data;
  }
}
