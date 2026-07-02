import { createAxios } from 'slates';

let getBaseUrl = (environment: string) =>
  environment === 'sandbox'
    ? 'https://gateway.remote-sandbox.com'
    : 'https://gateway.remote.com';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; environment: string }) {
    this.http = createAxios({
      baseURL: `${getBaseUrl(params.environment)}/v1`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ===== Companies =====

  async listCompanies(page?: number, pageSize?: number) {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    let response = await this.http.get('/companies', { params });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.http.get(`/companies/${companyId}`);
    return response.data;
  }

  async updateCompany(companyId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/companies/${companyId}`, data);
    return response.data;
  }

  // ===== Employments =====

  async listEmployments(params?: {
    companyId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.companyId) query.company_id = params.companyId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/employments', { params: query });
    return response.data;
  }

  async getEmployment(employmentId: string) {
    let response = await this.http.get(`/employments/${employmentId}`);
    return response.data;
  }

  async createEmployment(data: Record<string, any>) {
    let response = await this.http.post('/employments', data);
    return response.data;
  }

  async updateEmployment(employmentId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/employments/${employmentId}`, data);
    return response.data;
  }

  async inviteEmployment(employmentId: string) {
    let response = await this.http.post(`/employments/${employmentId}/invite`);
    return response.data;
  }

  // ===== Time Off =====

  async listTimeOff(params?: {
    employmentId?: string;
    status?: string;
    timeoffType?: string;
    page?: number;
    pageSize?: number;
    order?: string;
    orderDirection?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.timeoffType) query.timeoff_type = params.timeoffType;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.order) query.order = params.order;
    if (params?.orderDirection) query.order_direction = params.orderDirection;
    let response = await this.http.get('/timeoff', { params: query });
    return response.data;
  }

  async getTimeOff(timeoffId: string) {
    let response = await this.http.get(`/timeoff/${timeoffId}`);
    return response.data;
  }

  async createTimeOff(data: {
    employmentId: string;
    timeoffType: string;
    startDate: string;
    endDate: string;
    timezone: string;
    notes?: string;
    startDateIsHalfDay?: boolean;
    endDateIsHalfDay?: boolean;
    document?: string;
  }) {
    let response = await this.http.post('/timeoff', {
      employment_id: data.employmentId,
      timeoff_type: data.timeoffType,
      start_date: data.startDate,
      end_date: data.endDate,
      timezone: data.timezone,
      notes: data.notes,
      start_date_is_half_day: data.startDateIsHalfDay,
      end_date_is_half_day: data.endDateIsHalfDay,
      document: data.document
    });
    return response.data;
  }

  async approveTimeOff(timeoffId: string) {
    let response = await this.http.post(`/timeoff/${timeoffId}/approve`);
    return response.data;
  }

  async declineTimeOff(timeoffId: string, reason?: string) {
    let data: Record<string, any> = {};
    if (reason) data.reason = reason;
    let response = await this.http.post(`/timeoff/${timeoffId}/decline`, data);
    return response.data;
  }

  async cancelTimeOff(timeoffId: string) {
    let response = await this.http.post(`/timeoff/${timeoffId}/cancel`);
    return response.data;
  }

  // ===== Leave Policies =====

  async listLeavePoliciesSummary(employmentId: string) {
    let response = await this.http.get(`/employments/${employmentId}/leave-policies-summary`);
    return response.data;
  }

  // ===== Expenses =====

  async listExpenses(params?: {
    employmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/expenses', { params: query });
    return response.data;
  }

  async getExpense(expenseId: string) {
    let response = await this.http.get(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(data: Record<string, any>) {
    let response = await this.http.post('/expenses', data);
    return response.data;
  }

  async updateExpense(expenseId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/expenses/${expenseId}`, data);
    return response.data;
  }

  async listExpenseCategories(params?: { employmentId?: string; expenseId?: string }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.expenseId) query.expense_id = params.expenseId;
    let response = await this.http.get('/expense-categories', { params: query });
    return response.data;
  }

  // ===== Incentives =====

  async listIncentives(params?: {
    employmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/incentives', { params: query });
    return response.data;
  }

  async getIncentive(incentiveId: string) {
    let response = await this.http.get(`/incentives/${incentiveId}`);
    return response.data;
  }

  async createIncentive(data: {
    employmentId: string;
    amount: number;
    amountTaxType: string;
    type: string;
    effectiveDate: string;
    note?: string;
    currency?: string;
  }) {
    let response = await this.http.post('/incentives', {
      employment_id: data.employmentId,
      amount: data.amount,
      amount_tax_type: data.amountTaxType,
      type: data.type,
      effective_date: data.effectiveDate,
      note: data.note,
      currency: data.currency
    });
    return response.data;
  }

  async updateIncentive(incentiveId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/incentives/${incentiveId}`, data);
    return response.data;
  }

  async deleteIncentive(incentiveId: string) {
    let response = await this.http.delete(`/incentives/${incentiveId}`);
    return response.data;
  }

  async createRecurringIncentive(data: {
    employmentId: string;
    amount: number;
    amountTaxType: string;
    type: string;
    startDate: string;
    note?: string;
    currency?: string;
    endDate?: string;
  }) {
    let response = await this.http.post('/incentives/recurring', {
      employment_id: data.employmentId,
      amount: data.amount,
      amount_tax_type: data.amountTaxType,
      type: data.type,
      start_date: data.startDate,
      note: data.note,
      currency: data.currency,
      end_date: data.endDate
    });
    return response.data;
  }

  async listRecurringIncentives(params?: {
    employmentId?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/incentives/recurring', { params: query });
    return response.data;
  }

  async deleteRecurringIncentive(recurringIncentiveId: string) {
    let response = await this.http.delete(`/incentives/recurring/${recurringIncentiveId}`);
    return response.data;
  }

  // ===== Offboarding =====

  async listOffboardings(params?: {
    employmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/offboardings', { params: query });
    return response.data;
  }

  async getOffboarding(offboardingId: string) {
    let response = await this.http.get(`/offboardings/${offboardingId}`);
    return response.data;
  }

  async createOffboarding(data: {
    employmentId: string;
    terminationDate: string;
    terminationReason?: string;
    additionalComments?: string;
    confidential?: boolean;
    type?: string;
    proposedLastWorkingDate?: string;
    riskAssessment?: Record<string, any>;
  }) {
    let response = await this.http.post('/offboardings', {
      employment_id: data.employmentId,
      termination_date: data.terminationDate,
      termination_reason: data.terminationReason,
      additional_comments: data.additionalComments,
      confidential: data.confidential,
      type: data.type,
      proposed_last_working_date: data.proposedLastWorkingDate,
      risk_assessment: data.riskAssessment
    });
    return response.data;
  }

  // ===== Timesheets =====

  async listTimesheets(params?: {
    employmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/timesheets', { params: query });
    return response.data;
  }

  async getTimesheet(timesheetId: string) {
    let response = await this.http.get(`/timesheets/${timesheetId}`);
    return response.data;
  }

  async approveTimesheet(timesheetId: string) {
    let response = await this.http.post(`/timesheets/${timesheetId}/approve`);
    return response.data;
  }

  // ===== Countries =====

  async listCountries() {
    let response = await this.http.get('/countries');
    return response.data;
  }

  async getCountryFormSchema(countryCode: string, form: string) {
    let response = await this.http.get(`/countries/${countryCode}/${form}`);
    return response.data;
  }

  // ===== Contract Amendments =====

  async listContractAmendments(params?: {
    employmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/contract-amendments', { params: query });
    return response.data;
  }

  async createContractAmendment(data: Record<string, any>) {
    let response = await this.http.post('/contract-amendments', data);
    return response.data;
  }

  // ===== Payslips =====

  async listPayslips(params?: {
    employmentId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.employmentId) query.employment_id = params.employmentId;
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/payslips', { params: query });
    return response.data;
  }

  // ===== Company Managers =====

  async listCompanyManagers(params?: { page?: number; pageSize?: number }) {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/company-managers', { params: query });
    return response.data;
  }

  // ===== Webhook Callbacks =====

  async listWebhookCallbacks() {
    let response = await this.http.get('/webhook-callbacks');
    return response.data;
  }

  async createWebhookCallback(url: string, subscribedEvents: string[]) {
    let response = await this.http.post('/webhook-callbacks', {
      url,
      subscribed_events: subscribedEvents
    });
    return response.data;
  }

  async updateWebhookCallback(
    callbackId: string,
    data: { url?: string; subscribedEvents?: string[] }
  ) {
    let body: Record<string, any> = {};
    if (data.url) body.url = data.url;
    if (data.subscribedEvents) body.subscribed_events = data.subscribedEvents;
    let response = await this.http.patch(`/webhook-callbacks/${callbackId}`, body);
    return response.data;
  }

  async deleteWebhookCallback(callbackId: string) {
    let response = await this.http.delete(`/webhook-callbacks/${callbackId}`);
    return response.data;
  }

  // ===== Webhook Events =====

  async listWebhookEvents(params?: {
    eventType?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    deliveryStatus?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.eventType) query.event_type = params.eventType;
    if (params?.companyId) query.company_id = params.companyId;
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.deliveryStatus) query.delivery_status = params.deliveryStatus;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    let response = await this.http.get('/webhook-events', { params: query });
    return response.data;
  }

  // ===== Cost Calculator =====

  async estimateEmploymentCost(data: {
    employmentId?: string;
    countryCode?: string;
    currency?: string;
    salary?: number;
    employerCurrencySlug?: string;
    age?: number;
    region?: string;
  }) {
    let response = await this.http.post('/cost-calculator/estimation', {
      employment_id: data.employmentId,
      country_code: data.countryCode,
      currency: data.currency,
      salary: data.salary,
      employer_currency_slug: data.employerCurrencySlug,
      age: data.age,
      region: data.region
    });
    return response.data;
  }

  // ===== Files / Documents =====

  async listEmploymentFiles(employmentId: string) {
    let response = await this.http.get(`/employments/${employmentId}/files`);
    return response.data;
  }

  async uploadEmploymentFile(
    employmentId: string,
    data: { name: string; type: string; content: string }
  ) {
    let response = await this.http.post(`/employments/${employmentId}/files`, data);
    return response.data;
  }
}
