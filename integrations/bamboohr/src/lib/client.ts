import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  companyDomain: string;
  isApiKey?: boolean;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private companyDomain: string;

  constructor(config: ClientConfig) {
    this.companyDomain = config.companyDomain;

    let headers: Record<string, string> = {
      Accept: 'application/json'
    };

    // For API key auth, use Basic Auth header (key:x base64 encoded)
    // For OAuth, use Bearer token
    if (config.isApiKey) {
      let encoded = btoa(`${config.token}:x`);
      headers.Authorization = `Basic ${encoded}`;
    } else {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.http = createAxios({
      baseURL: `https://${config.companyDomain}.bamboohr.com/api/gateway.php/${config.companyDomain}/v1`,
      headers
    });
  }

  // ─── Employee ───

  async getEmployee(employeeId: string, fields: string[]): Promise<any> {
    let fieldList = fields.join(',');
    let response = await this.http.get(`/employees/${employeeId}`, {
      params: { fields: fieldList }
    });
    return response.data;
  }

  async getEmployeeDirectory(): Promise<any> {
    let response = await this.http.get('/employees/directory');
    return response.data;
  }

  async addEmployee(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/employees/', data);
    return response.data;
  }

  async updateEmployee(employeeId: string, data: Record<string, any>): Promise<void> {
    await this.http.post(`/employees/${employeeId}`, data);
  }

  // ─── Custom Report ───

  async getCustomReport(
    format: string,
    fields: string[],
    title?: string,
    filterLastChanged?: string
  ): Promise<any> {
    let body: any = {
      title: title || 'Custom Report',
      fields
    };
    if (filterLastChanged) {
      body.filters = { lastChanged: { includeNull: 'no', value: filterLastChanged } };
    }
    let response = await this.http.post(
      `/reports/custom?format=${format}&onlyCurrent=true`,
      body
    );
    return response.data;
  }

  async getCompanyReport(
    reportId: string,
    format: string,
    filterLastChanged?: string
  ): Promise<any> {
    let params: Record<string, string> = { format };
    if (filterLastChanged) {
      params.fd = filterLastChanged;
    }
    let response = await this.http.get(`/reports/${reportId}`, { params });
    return response.data;
  }

  // ─── Tabular Data ───

  async getTableRows(employeeId: string, tableName: string): Promise<any> {
    let response = await this.http.get(`/employees/${employeeId}/tables/${tableName}`);
    return response.data;
  }

  async addTableRow(
    employeeId: string,
    tableName: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.http.post(`/employees/${employeeId}/tables/${tableName}`, data);
    return response.data;
  }

  async updateTableRow(
    employeeId: string,
    tableName: string,
    rowId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.http.post(
      `/employees/${employeeId}/tables/${tableName}/${rowId}`,
      data
    );
    return response.data;
  }

  async deleteTableRow(employeeId: string, tableName: string, rowId: string): Promise<void> {
    await this.http.delete(`/employees/${employeeId}/tables/${tableName}/${rowId}`);
  }

  // ─── Time Off ───

  async getTimeOffRequests(params: {
    start: string;
    end: string;
    employeeId?: string;
    status?: string;
    action?: string;
    type?: string;
  }): Promise<any> {
    let response = await this.http.get('/time_off/requests/', { params });
    return response.data;
  }

  async createTimeOffRequest(
    employeeId: string,
    data: {
      status: string;
      start: string;
      end: string;
      timeOffTypeId: string;
      amount: number;
      notes?: Record<string, string>;
      dates?: Record<string, number>;
      previousRequest?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(`/employees/${employeeId}/time_off/request/`, data);
    return response.data;
  }

  async updateTimeOffRequestStatus(
    requestId: string,
    status: string,
    note?: string
  ): Promise<void> {
    let body: any = { status };
    if (note) {
      body.note = note;
    }
    await this.http.put(`/time_off/requests/${requestId}/status/`, body);
  }

  async getWhosOut(start?: string, end?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (start) params.start = start;
    if (end) params.end = end;
    let response = await this.http.get('/time_off/whos_out/', { params });
    return response.data;
  }

  async getTimeOffPolicies(employeeId: string): Promise<any> {
    let response = await this.http.get(`/employees/${employeeId}/time_off/policies/`);
    return response.data;
  }

  async getTimeOffBalances(employeeId: string, end?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (end) params.end = end;
    let response = await this.http.get(`/employees/${employeeId}/time_off/calculator/`, {
      params
    });
    return response.data;
  }

  async getTimeOffTypes(): Promise<any> {
    let response = await this.http.get('/meta/time_off/types/');
    return response.data;
  }

  // ─── Time Tracking ───

  async clockIn(
    employeeId: string,
    data: {
      start: string;
      timezone?: string;
      note?: string;
      projectId?: string;
      taskId?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/employees/${employeeId}/time_tracking/clock_in`,
      data
    );
    return response.data;
  }

  async clockOut(
    employeeId: string,
    data?: {
      timezone?: string;
      note?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/employees/${employeeId}/time_tracking/clock_out`,
      data || {}
    );
    return response.data;
  }

  async getTimesheetEntries(params: {
    start: string;
    end: string;
    employeeIds?: string;
  }): Promise<any> {
    let response = await this.http.get('/time_tracking/timesheet_entries', { params });
    return response.data;
  }

  async addTimesheetEntry(
    employeeId: string,
    data: {
      date: string;
      hours: number;
      note?: string;
      projectId?: string;
      taskId?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/employees/${employeeId}/time_tracking/timesheet_entries`,
      data
    );
    return response.data;
  }

  async deleteTimesheetEntry(employeeId: string, entryId: string): Promise<void> {
    await this.http.delete(
      `/employees/${employeeId}/time_tracking/timesheet_entries/${entryId}`
    );
  }

  async getClockEntries(params: {
    start: string;
    end: string;
    employeeIds?: string;
  }): Promise<any> {
    let response = await this.http.get('/time_tracking/clock_entries', { params });
    return response.data;
  }

  // ─── Goals ───

  async getGoals(employeeId: string, filter?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (filter) params.filter = filter;
    let response = await this.http.get(`/v1/performance/employees/${employeeId}/goals`, {
      params
    });
    return response.data;
  }

  async createGoal(
    employeeId: string,
    data: {
      title: string;
      description?: string;
      percentComplete?: number;
      alignsWithOptionId?: string;
      sharedWithEmployeeIds?: string[];
      dueDate?: string;
      milestonesEnabled?: boolean;
    }
  ): Promise<any> {
    let response = await this.http.post(`/v1/performance/employees/${employeeId}/goals`, data);
    return response.data;
  }

  async updateGoal(
    employeeId: string,
    goalId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/v1/performance/employees/${employeeId}/goals/${goalId}`,
      data
    );
    return response.data;
  }

  async deleteGoal(employeeId: string, goalId: string): Promise<void> {
    await this.http.delete(`/v1/performance/employees/${employeeId}/goals/${goalId}`);
  }

  async addGoalComment(employeeId: string, goalId: string, text: string): Promise<any> {
    let response = await this.http.post(
      `/v1/performance/employees/${employeeId}/goals/${goalId}/comments`,
      { text }
    );
    return response.data;
  }

  async closeGoal(employeeId: string, goalId: string): Promise<any> {
    let response = await this.http.post(
      `/v1/performance/employees/${employeeId}/goals/${goalId}/close`,
      {}
    );
    return response.data;
  }

  async reopenGoal(employeeId: string, goalId: string): Promise<any> {
    let response = await this.http.post(
      `/v1/performance/employees/${employeeId}/goals/${goalId}/reopen`,
      {}
    );
    return response.data;
  }

  async getGoalStatusCounts(employeeId: string): Promise<any> {
    let response = await this.http.get(
      `/v1/performance/employees/${employeeId}/goals/aggregate`
    );
    return response.data;
  }

  // ─── Training ───

  async getTrainingTypes(): Promise<any> {
    let response = await this.http.get('/training/type');
    return response.data;
  }

  async addTrainingType(data: {
    name: string;
    frequency?: number;
    renewable?: boolean;
    category?: { categoryId: string } | { name: string };
    required?: boolean;
    dueFromHireDate?: number;
    linkUrl?: string;
    description?: string;
  }): Promise<any> {
    let response = await this.http.post('/training/type', data);
    return response.data;
  }

  async updateTrainingType(trainingTypeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/training/type/${trainingTypeId}`, data);
    return response.data;
  }

  async getTrainingRecordsForEmployee(
    employeeId: string,
    trainingTypeId?: string
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (trainingTypeId) params.trainingTypeId = trainingTypeId;
    let response = await this.http.get(`/training/record/employee/${employeeId}`, { params });
    return response.data;
  }

  async addTrainingRecord(
    employeeId: string,
    data: {
      completed: string;
      cost?: { currency: string; cost: number };
      instructor?: string;
      hours?: number;
      credits?: number;
      notes?: string;
      trainingTypeId: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/training/record/employee/${employeeId}`, data);
    return response.data;
  }

  // ─── Benefits ───

  async getBenefitDeductionTypes(): Promise<any> {
    let response = await this.http.get('/benefits/settings/deduction_types/all');
    return response.data;
  }

  async getBenefitPlans(): Promise<any> {
    let response = await this.http.get('/benefitplans');
    return response.data;
  }

  async getBenefitCoverages(employeeId?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (employeeId) params.employeeId = employeeId;
    let response = await this.http.get('/benefitcoverages', { params });
    return response.data;
  }

  async getEmployeeDependents(employeeId: string): Promise<any> {
    let response = await this.http.get(`/employeedependents`, {
      params: { employeeid: employeeId }
    });
    return response.data;
  }

  // ─── Files ───

  async listEmployeeFiles(employeeId: string): Promise<any> {
    let response = await this.http.get(`/employees/${employeeId}/files/view/`);
    return response.data;
  }

  async listCompanyFiles(): Promise<any> {
    let response = await this.http.get('/files/view/');
    return response.data;
  }

  async uploadEmployeeFile(
    employeeId: string,
    categoryId: string,
    fileName: string,
    fileContent: string,
    shareWithEmployee?: boolean
  ): Promise<any> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\n${categoryId}\r\n--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n${fileName}\r\n--${boundary}\r\nContent-Disposition: form-data; name="share"\r\n\r\n${shareWithEmployee ? 'yes' : 'no'}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${fileContent}\r\n--${boundary}--`;

    let response = await this.http.post(`/employees/${employeeId}/files/`, body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  async uploadCompanyFile(
    categoryId: string,
    fileName: string,
    fileContent: string,
    shareWithEmployees?: boolean
  ): Promise<any> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\n${categoryId}\r\n--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n${fileName}\r\n--${boundary}\r\nContent-Disposition: form-data; name="share"\r\n\r\n${shareWithEmployees ? 'yes' : 'no'}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${fileContent}\r\n--${boundary}--`;

    let response = await this.http.post('/files/', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  async deleteEmployeeFile(employeeId: string, fileId: string): Promise<void> {
    await this.http.delete(`/employees/${employeeId}/files/${fileId}`);
  }

  async deleteCompanyFile(fileId: string): Promise<void> {
    await this.http.delete(`/files/${fileId}`);
  }

  // ─── Photos ───

  async getEmployeePhoto(employeeId: string, size?: string): Promise<string> {
    let params: Record<string, string> = {};
    if (size) params.size = size;
    let response = await this.http.get(`/employees/${employeeId}/photo/small`, { params });
    return response.data;
  }

  // ─── Account Metadata ───

  async getFields(): Promise<any> {
    let response = await this.http.get('/meta/fields/');
    return response.data;
  }

  async getLists(): Promise<any> {
    let response = await this.http.get('/meta/lists/');
    return response.data;
  }

  async getTables(): Promise<any> {
    let response = await this.http.get('/meta/tables/');
    return response.data;
  }

  async getUsers(): Promise<any> {
    let response = await this.http.get('/meta/users/');
    return response.data;
  }

  // ─── Applicant Tracking ───

  async getJobSummaries(): Promise<any> {
    let response = await this.http.get('/applicant_tracking/jobs');
    return response.data;
  }

  async getApplications(params?: {
    page?: number;
    pageLimit?: number;
    jobId?: string;
    applicationStatusId?: string;
    newSince?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<any> {
    let response = await this.http.get('/applicant_tracking/applications', { params });
    return response.data;
  }

  async getApplicationDetails(applicationId: string): Promise<any> {
    let response = await this.http.get(`/applicant_tracking/applications/${applicationId}`);
    return response.data;
  }

  async getApplicationStatuses(): Promise<any> {
    let response = await this.http.get('/applicant_tracking/statuses');
    return response.data;
  }

  async changeApplicationStatus(applicationId: string, statusId: string): Promise<void> {
    await this.http.post(`/applicant_tracking/applications/${applicationId}/status`, {
      status: statusId
    });
  }

  async addApplicationComment(applicationId: string, comment: string): Promise<any> {
    let response = await this.http.post(
      `/applicant_tracking/applications/${applicationId}/comments`,
      {
        type: 'comment',
        comment
      }
    );
    return response.data;
  }

  // ─── Webhooks ───

  async getWebhooks(): Promise<any> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    monitorFields: string[];
    postFields: Record<string, string>;
    url: string;
    format?: string;
    frequency?: { hour?: number; minute?: number; day?: number; month?: number };
    limit?: { times?: number; seconds?: number };
    includeCompanyDomain?: boolean;
  }): Promise<any> {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async getWebhookMonitorFields(): Promise<any> {
    let response = await this.http.get('/webhooks/monitor_fields');
    return response.data;
  }

  // ─── Changed Employees (for polling) ───

  async getChangedEmployees(since: string): Promise<any> {
    let response = await this.http.get('/employees/changed', {
      params: { since }
    });
    return response.data;
  }
}
