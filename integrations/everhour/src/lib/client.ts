import { createAxios } from 'slates';

export class EverhourClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.everhour.com',
      headers: {
        'X-Api-Key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Users ───────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.axios.get('/users/me');
    return response.data;
  }

  async listTeamUsers() {
    let response = await this.axios.get('/team/users');
    return response.data;
  }

  // ─── Clients ─────────────────────────────────────────────

  async listClients(params?: { query?: string }) {
    let response = await this.axios.get('/clients', { params });
    return response.data;
  }

  async getClient(clientId: number) {
    let response = await this.axios.get(`/clients/${clientId}`);
    return response.data;
  }

  async createClient(data: { name: string; projects?: string[]; businessDetails?: string }) {
    let response = await this.axios.post('/clients', data);
    return response.data;
  }

  async updateClient(
    clientId: number,
    data: { name?: string; projects?: string[]; businessDetails?: string }
  ) {
    let response = await this.axios.put(`/clients/${clientId}`, data);
    return response.data;
  }

  async deleteClient(clientId: number) {
    await this.axios.delete(`/clients/${clientId}`);
  }

  async setClientBudget(
    clientId: number,
    data: {
      type: string;
      budget: number;
      period?: string;
      appliedFrom?: string;
      disallowOverbudget?: boolean;
      excludeUnbillableTime?: boolean;
      excludeExpenses?: boolean;
      threshold?: number;
    }
  ) {
    let response = await this.axios.put(`/clients/${clientId}/budget`, data);
    return response.data;
  }

  async removeClientBudget(clientId: number) {
    await this.axios.delete(`/clients/${clientId}/budget`);
  }

  // ─── Projects ────────────────────────────────────────────

  async listProjects(params?: { limit?: number; query?: string; platform?: string }) {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: { name: string; type: string; users?: number[] }) {
    let response = await this.axios.post('/projects', data);
    return response.data;
  }

  async updateProject(projectId: string, data: { name?: string; users?: number[] }) {
    let response = await this.axios.put(`/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: string) {
    await this.axios.delete(`/projects/${projectId}`);
  }

  async archiveProject(projectId: string, archived: boolean) {
    let response = await this.axios.patch(`/projects/${projectId}/archive`, { archived });
    return response.data;
  }

  async setProjectBilling(
    projectId: string,
    data: {
      billing?: { type: string; fee?: number };
      budget?: {
        type?: string;
        budget?: number;
        period?: string;
        appliedFrom?: string;
        disallowOverbudget?: boolean;
        excludeUnbillableTime?: boolean;
        excludeExpenses?: boolean;
        threshold?: number;
      };
      rate?: {
        type?: string;
        rate?: number;
        userRateOverrides?: Record<string, number>;
      };
    }
  ) {
    let response = await this.axios.put(`/projects/${projectId}/billing`, data);
    return response.data;
  }

  // ─── Sections ────────────────────────────────────────────

  async listSections(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}/sections`);
    return response.data;
  }

  async getSection(sectionId: number) {
    let response = await this.axios.get(`/sections/${sectionId}`);
    return response.data;
  }

  async createSection(
    projectId: string,
    data: { name: string; position?: number; status?: string }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/sections`, data);
    return response.data;
  }

  async updateSection(
    sectionId: number,
    data: { name?: string; position?: number; status?: string }
  ) {
    let response = await this.axios.put(`/sections/${sectionId}`, data);
    return response.data;
  }

  async deleteSection(sectionId: number) {
    await this.axios.delete(`/sections/${sectionId}`);
  }

  // ─── Tasks ───────────────────────────────────────────────

  async listTasks(
    projectId: string,
    params?: { page?: number; limit?: number; 'exclude-closed'?: boolean; query?: string }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async searchTasks(params: { query?: string; limit?: number; searchInClosed?: boolean }) {
    let response = await this.axios.get('/tasks/search', { params });
    return response.data;
  }

  async searchTasksInProject(
    projectId: string,
    params: { query?: string; limit?: number; searchInClosed?: boolean }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/tasks/search`, { params });
    return response.data;
  }

  async createTask(
    projectId: string,
    data: {
      name: string;
      section?: number;
      labels?: string[];
      position?: number;
      description?: string;
      dueOn?: string;
      status?: string;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      name?: string;
      section?: number;
      labels?: string[];
      position?: number;
      description?: string;
      dueOn?: string;
      status?: string;
    }
  ) {
    let response = await this.axios.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  async setTaskEstimate(
    taskId: string,
    data: { total: number; type: string; users?: Record<string, number> }
  ) {
    let response = await this.axios.put(`/tasks/${taskId}/estimate`, data);
    return response.data;
  }

  async removeTaskEstimate(taskId: string) {
    await this.axios.delete(`/tasks/${taskId}/estimate`);
  }

  // ─── Time Records ───────────────────────────────────────

  async listTeamTime(params?: { from?: string; to?: string; limit?: number; page?: number }) {
    let response = await this.axios.get('/team/time', { params });
    return response.data;
  }

  async listUserTime(
    userId: number,
    params?: { from?: string; to?: string; limit?: number; page?: number }
  ) {
    let response = await this.axios.get(`/users/${userId}/time`, { params });
    return response.data;
  }

  async listTaskTime(taskId: string, params?: { from?: string; to?: string }) {
    let response = await this.axios.get(`/tasks/${taskId}/time`, { params });
    return response.data;
  }

  async listProjectTime(
    projectId: string,
    params?: { from?: string; to?: string; limit?: number; page?: number }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/time`, { params });
    return response.data;
  }

  async logTime(data: {
    time: number;
    date: string;
    task?: string;
    user?: number;
    comment?: string;
  }) {
    let response = await this.axios.post('/time', data);
    return response.data;
  }

  async updateTimeRecord(
    timeId: number,
    data: { time?: number; date?: string; task?: string; user?: number; comment?: string }
  ) {
    let response = await this.axios.put(`/time/${timeId}`, data);
    return response.data;
  }

  async deleteTimeRecord(timeId: number) {
    await this.axios.delete(`/time/${timeId}`);
  }

  // ─── Timers ──────────────────────────────────────────────

  async startTimer(data: { task: string; userDate?: string; comment?: string }) {
    let response = await this.axios.post('/timers', data);
    return response.data;
  }

  async getCurrentTimer() {
    let response = await this.axios.get('/timers/current');
    return response.data;
  }

  async getTeamTimers() {
    let response = await this.axios.get('/team/timers');
    return response.data;
  }

  async stopTimer() {
    let response = await this.axios.delete('/timers/current');
    return response.data;
  }

  // ─── Expenses ────────────────────────────────────────────

  async listExpenses(params?: { from?: string; to?: string }) {
    let response = await this.axios.get('/expenses', { params });
    return response.data;
  }

  async createExpense(data: {
    amount: number;
    category: number;
    date: string;
    billable?: boolean;
    details?: string;
    project?: string;
    quantity?: number;
    user?: number;
  }) {
    let response = await this.axios.post('/expenses', data);
    return response.data;
  }

  async updateExpense(
    expenseId: number,
    data: {
      amount?: number;
      category?: number;
      date?: string;
      billable?: boolean;
      details?: string;
      project?: string;
      quantity?: number;
      user?: number;
    }
  ) {
    let response = await this.axios.put(`/expenses/${expenseId}`, data);
    return response.data;
  }

  async deleteExpense(expenseId: number) {
    await this.axios.delete(`/expenses/${expenseId}`);
  }

  async listExpenseCategories() {
    let response = await this.axios.get('/expenses/categories');
    return response.data;
  }

  async createExpenseCategory(data: {
    name: string;
    color?: string;
    unitBased?: boolean;
    unitName?: string;
    unitPrice?: number;
  }) {
    let response = await this.axios.post('/expenses/categories', data);
    return response.data;
  }

  async updateExpenseCategory(
    categoryId: number,
    data: {
      name?: string;
      color?: string;
      unitBased?: boolean;
      unitName?: string;
      unitPrice?: number;
    }
  ) {
    let response = await this.axios.put(`/expenses/categories/${categoryId}`, data);
    return response.data;
  }

  async deleteExpenseCategory(
    categoryId: number,
    data?: { targetCategory?: number; removeExpenses?: boolean }
  ) {
    await this.axios.delete(`/expenses/categories/${categoryId}`, { data });
  }

  // ─── Invoices ────────────────────────────────────────────

  async listInvoices() {
    let response = await this.axios.get('/invoices');
    return response.data;
  }

  async getInvoice(invoiceId: number) {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  async createInvoice(
    clientId: number,
    data: {
      limitDateFrom?: string;
      limitDateTill?: string;
      includeExpenses?: boolean;
      includeTime?: boolean;
      projects?: string[];
      tax?: { rate: number; amount?: number };
      discount?: { rate: number; amount?: number };
    }
  ) {
    let response = await this.axios.post(`/clients/${clientId}/invoices`, data);
    return response.data;
  }

  async updateInvoice(
    invoiceId: number,
    data: {
      publicId?: string;
      issueDate?: string;
      dueDate?: string;
      reference?: string;
      publicNotes?: string;
      tax?: { rate: number; amount?: number };
      discount?: { rate: number; amount?: number };
      invoiceItems?: Array<{
        id?: number;
        name: string;
        billedTime?: number;
        listAmount?: number;
        taxable?: boolean;
        position?: number;
      }>;
    }
  ) {
    let response = await this.axios.put(`/invoices/${invoiceId}`, data);
    return response.data;
  }

  async deleteInvoice(invoiceId: number) {
    await this.axios.delete(`/invoices/${invoiceId}`);
  }

  async setInvoiceStatus(invoiceId: number, status: string) {
    let response = await this.axios.post(`/invoices/${invoiceId}/${status}`);
    return response.data;
  }

  // ─── Schedule / Resource Planner ─────────────────────────

  async listAssignments(params?: {
    type?: string;
    project?: string;
    task?: string;
    client?: number;
    from?: string;
    to?: string;
  }) {
    let response = await this.axios.get('/resource-planner/assignments', { params });
    return response.data;
  }

  async createAssignment(data: {
    startDate: string;
    endDate: string;
    type: string;
    user?: number;
    users?: number[];
    project?: string;
    task?: string;
    time?: number;
    timeOffType?: number;
    timeOffPeriod?: string;
    status?: string;
    forceOverride?: boolean;
  }) {
    let response = await this.axios.post('/resource-planner/assignments', data);
    return response.data;
  }

  async updateAssignment(
    assignmentId: number,
    data: {
      startDate?: string;
      endDate?: string;
      time?: number;
      project?: string;
      task?: string;
    }
  ) {
    let response = await this.axios.put(`/resource-planner/assignments/${assignmentId}`, data);
    return response.data;
  }

  async deleteAssignment(assignmentId: number) {
    await this.axios.delete(`/resource-planner/assignments/${assignmentId}`);
  }

  // ─── Time Off Types ──────────────────────────────────────

  async listTimeOffTypes() {
    let response = await this.axios.get('/resource-planner/time-off-types');
    return response.data;
  }

  async createTimeOffType(data: {
    name: string;
    color?: string;
    paid?: boolean;
    description?: string;
  }) {
    let response = await this.axios.post('/resource-planner/time-off-types', data);
    return response.data;
  }

  async updateTimeOffType(
    typeId: number,
    data: { name?: string; color?: string; paid?: boolean; description?: string }
  ) {
    let response = await this.axios.put(`/resource-planner/time-off-types/${typeId}`, data);
    return response.data;
  }

  async deleteTimeOffType(typeId: number) {
    await this.axios.delete(`/resource-planner/time-off-types/${typeId}`);
  }

  // ─── Reports / Dashboards ───────────────────────────────

  async getProjectsReport(params?: {
    'date.gte'?: string;
    'date.lte'?: string;
    projectId?: string;
    clientId?: number;
    memberId?: number;
  }) {
    let response = await this.axios.get('/dashboards/projects', { params });
    return response.data;
  }

  async getClientsReport(params?: {
    'date.gte'?: string;
    'date.lte'?: string;
    projectId?: string;
    clientId?: number;
    memberId?: number;
  }) {
    let response = await this.axios.get('/dashboards/clients', { params });
    return response.data;
  }

  async getUsersReport(params?: {
    'date.gte'?: string;
    'date.lte'?: string;
    projectId?: string;
    clientId?: number;
    memberId?: number;
  }) {
    let response = await this.axios.get('/dashboards/users', { params });
    return response.data;
  }

  // ─── Timecards ───────────────────────────────────────────

  async getUserTimecard(userId: number, date: string) {
    let response = await this.axios.get(`/users/${userId}/timecards/${date}`);
    return response.data;
  }

  async listUserTimecards(userId: number, params?: { from?: string; to?: string }) {
    let response = await this.axios.get(`/users/${userId}/timecards`, { params });
    return response.data;
  }

  async listTeamTimecards(params?: { from?: string; to?: string }) {
    let response = await this.axios.get('/timecards', { params });
    return response.data;
  }

  async clockIn(userId: number, data?: { userDate?: string }) {
    let response = await this.axios.post(`/users/${userId}/timecards/clock-in`, data || {});
    return response.data;
  }

  async clockOut(userId: number, data?: { userDate?: string }) {
    let response = await this.axios.post(`/users/${userId}/timecards/clock-out`, data || {});
    return response.data;
  }

  async updateTimecard(
    userId: number,
    date: string,
    data: { clockIn?: string; clockOut?: string; breakTime?: number }
  ) {
    let response = await this.axios.put(`/users/${userId}/timecards/${date}`, data);
    return response.data;
  }

  async deleteTimecard(userId: number, date: string) {
    await this.axios.delete(`/users/${userId}/timecards/${date}`);
  }

  // ─── Timesheets ──────────────────────────────────────────

  async getUserTimesheets(userId: number, params?: { limit?: number }) {
    let response = await this.axios.get(`/users/${userId}/timesheets`, { params });
    return response.data;
  }

  async getTeamTimesheets(params: { weekId: number }) {
    let response = await this.axios.get('/timesheets', { params });
    return response.data;
  }

  async submitTimesheetForApproval(
    timesheetId: number,
    data?: { comment?: string; reviewer?: number; sendNotification?: boolean }
  ) {
    let response = await this.axios.post(`/timesheets/${timesheetId}/approval`, data || {});
    return response.data;
  }

  async approveOrRejectTimesheet(
    timesheetId: number,
    data: {
      status: string;
      comment?: string;
      sendNotification?: boolean;
      days?: Record<string, boolean>;
    }
  ) {
    let response = await this.axios.put(`/timesheets/${timesheetId}/approval`, data);
    return response.data;
  }

  async discardTimesheetApproval(timesheetId: number, data?: { comment?: string }) {
    let response = await this.axios.put(
      `/timesheets/${timesheetId}/discard-approval`,
      data || {}
    );
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────────

  async createWebhook(data: { targetUrl: string; events: string[]; project?: string }) {
    let response = await this.axios.post('/hooks', data);
    return response.data;
  }

  async getWebhook(hookId: number) {
    let response = await this.axios.get(`/hooks/${hookId}`);
    return response.data;
  }

  async updateWebhook(
    hookId: number,
    data: { targetUrl?: string; events?: string[]; project?: string }
  ) {
    let response = await this.axios.put(`/hooks/${hookId}`, data);
    return response.data;
  }

  async deleteWebhook(hookId: number) {
    await this.axios.delete(`/hooks/${hookId}`);
  }
}
