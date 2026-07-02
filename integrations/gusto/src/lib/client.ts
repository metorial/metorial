import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-Gusto-API-Version': '2024-04-01'
      }
    });
  }

  // ─── Company ──────────────────────────────────────────────────

  async getCompany(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}`);
    return response.data;
  }

  async listCompanyLocations(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/locations`);
    return response.data;
  }

  async createCompanyLocation(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/locations`, data);
    return response.data;
  }

  async updateCompanyLocation(locationId: string, data: any) {
    let response = await this.http.put(`/v1/locations/${locationId}`, data);
    return response.data;
  }

  // ─── Employees ────────────────────────────────────────────────

  async listEmployees(companyId: string, params?: any) {
    let response = await this.http.get(`/v1/companies/${companyId}/employees`, { params });
    return response.data;
  }

  async getEmployee(employeeId: string, params?: any) {
    let response = await this.http.get(`/v1/employees/${employeeId}`, { params });
    return response.data;
  }

  async createEmployee(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/employees`, data);
    return response.data;
  }

  async updateEmployee(employeeId: string, data: any) {
    let response = await this.http.put(`/v1/employees/${employeeId}`, data);
    return response.data;
  }

  async terminateEmployee(employeeId: string, data: any) {
    let response = await this.http.post(`/v1/employees/${employeeId}/terminations`, data);
    return response.data;
  }

  async rehireEmployee(employeeId: string, data: any) {
    let response = await this.http.post(`/v1/employees/${employeeId}/rehire`, data);
    return response.data;
  }

  // ─── Contractors ──────────────────────────────────────────────

  async listContractors(companyId: string, params?: any) {
    let response = await this.http.get(`/v1/companies/${companyId}/contractors`, { params });
    return response.data;
  }

  async getContractor(contractorId: string) {
    let response = await this.http.get(`/v1/contractors/${contractorId}`);
    return response.data;
  }

  async createContractor(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/contractors`, data);
    return response.data;
  }

  async updateContractor(contractorId: string, data: any) {
    let response = await this.http.put(`/v1/contractors/${contractorId}`, data);
    return response.data;
  }

  // ─── Payroll ──────────────────────────────────────────────────

  async listPayrolls(companyId: string, params?: any) {
    let response = await this.http.get(`/v1/companies/${companyId}/payrolls`, { params });
    return response.data;
  }

  async getPayroll(companyId: string, payrollId: string, params?: any) {
    let response = await this.http.get(`/v1/companies/${companyId}/payrolls/${payrollId}`, {
      params
    });
    return response.data;
  }

  async calculatePayroll(companyId: string, payrollId: string) {
    let response = await this.http.put(
      `/v1/companies/${companyId}/payrolls/${payrollId}/calculate`
    );
    return response.data;
  }

  async submitPayroll(companyId: string, payrollId: string) {
    let response = await this.http.put(
      `/v1/companies/${companyId}/payrolls/${payrollId}/submit`
    );
    return response.data;
  }

  async createOffCyclePayroll(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/payrolls`, data);
    return response.data;
  }

  // ─── Pay Schedules ────────────────────────────────────────────

  async listPaySchedules(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/pay_schedules`);
    return response.data;
  }

  async getPaySchedule(companyId: string, payScheduleId: string) {
    let response = await this.http.get(
      `/v1/companies/${companyId}/pay_schedules/${payScheduleId}`
    );
    return response.data;
  }

  // ─── Contractor Payments ──────────────────────────────────────

  async listContractorPayments(companyId: string, params: any) {
    let response = await this.http.get(`/v1/companies/${companyId}/contractor_payments`, {
      params
    });
    return response.data;
  }

  async createContractorPayment(companyId: string, data: any) {
    let response = await this.http.post(
      `/v1/companies/${companyId}/contractor_payments`,
      data
    );
    return response.data;
  }

  async cancelContractorPayment(companyId: string, contractorPaymentId: string) {
    let response = await this.http.delete(
      `/v1/companies/${companyId}/contractor_payments/${contractorPaymentId}`
    );
    return response.data;
  }

  // ─── Benefits ─────────────────────────────────────────────────

  async listCompanyBenefits(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/company_benefits`);
    return response.data;
  }

  async getCompanyBenefit(companyBenefitId: string) {
    let response = await this.http.get(`/v1/company_benefits/${companyBenefitId}`);
    return response.data;
  }

  async createCompanyBenefit(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/company_benefits`, data);
    return response.data;
  }

  async updateCompanyBenefit(companyBenefitId: string, data: any) {
    let response = await this.http.put(`/v1/company_benefits/${companyBenefitId}`, data);
    return response.data;
  }

  async listEmployeeBenefits(employeeId: string) {
    let response = await this.http.get(`/v1/employees/${employeeId}/employee_benefits`);
    return response.data;
  }

  async createEmployeeBenefit(employeeId: string, data: any) {
    let response = await this.http.post(`/v1/employees/${employeeId}/employee_benefits`, data);
    return response.data;
  }

  async updateEmployeeBenefit(employeeBenefitId: string, data: any) {
    let response = await this.http.put(`/v1/employee_benefits/${employeeBenefitId}`, data);
    return response.data;
  }

  // ─── Earning Types ────────────────────────────────────────────

  async listEarningTypes(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/earning_types`);
    return response.data;
  }

  async createEarningType(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/earning_types`, data);
    return response.data;
  }

  async updateEarningType(companyId: string, earningTypeId: string, data: any) {
    let response = await this.http.put(
      `/v1/companies/${companyId}/earning_types/${earningTypeId}`,
      data
    );
    return response.data;
  }

  // ─── Time Off ─────────────────────────────────────────────────

  async listTimeOffPolicies(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/time_off_policies`);
    return response.data;
  }

  async getTimeOffBalances(employeeId: string) {
    let response = await this.http.get(`/v1/employees/${employeeId}/time_off_activities`);
    return response.data;
  }

  // ─── Garnishments ─────────────────────────────────────────────

  async listGarnishments(employeeId: string) {
    let response = await this.http.get(`/v1/employees/${employeeId}/garnishments`);
    return response.data;
  }

  async createGarnishment(employeeId: string, data: any) {
    let response = await this.http.post(`/v1/employees/${employeeId}/garnishments`, data);
    return response.data;
  }

  async updateGarnishment(garnishmentId: string, data: any) {
    let response = await this.http.put(`/v1/garnishments/${garnishmentId}`, data);
    return response.data;
  }

  // ─── Forms ────────────────────────────────────────────────────

  async listCompanyForms(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/forms`);
    return response.data;
  }

  async getForm(formId: string) {
    let response = await this.http.get(`/v1/forms/${formId}`);
    return response.data;
  }

  async listEmployeeForms(employeeId: string) {
    let response = await this.http.get(`/v1/employees/${employeeId}/forms`);
    return response.data;
  }

  // ─── Departments ──────────────────────────────────────────────

  async listDepartments(companyId: string) {
    let response = await this.http.get(`/v1/companies/${companyId}/departments`);
    return response.data;
  }

  async createDepartment(companyId: string, data: any) {
    let response = await this.http.post(`/v1/companies/${companyId}/departments`, data);
    return response.data;
  }

  async updateDepartment(departmentId: string, data: any) {
    let response = await this.http.put(`/v1/departments/${departmentId}`, data);
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────

  async createWebhookSubscription(data: { url: string; subscription_types: string[] }) {
    let response = await this.http.post('/v1/webhook_subscriptions', data);
    return response.data;
  }

  async deleteWebhookSubscription(webhookSubscriptionId: string) {
    let response = await this.http.delete(
      `/v1/webhook_subscriptions/${webhookSubscriptionId}`
    );
    return response.data;
  }

  async listWebhookSubscriptions() {
    let response = await this.http.get('/v1/webhook_subscriptions');
    return response.data;
  }

  async verifyWebhookSubscription(webhookSubscriptionId: string, verificationToken: string) {
    let response = await this.http.put(
      `/v1/webhook_subscriptions/${webhookSubscriptionId}/verify`,
      {
        verification_token: verificationToken
      }
    );
    return response.data;
  }

  // ─── Jobs and Compensations ───────────────────────────────────

  async listEmployeeJobs(employeeId: string) {
    let response = await this.http.get(`/v1/employees/${employeeId}/jobs`);
    return response.data;
  }

  async createEmployeeJob(employeeId: string, data: any) {
    let response = await this.http.post(`/v1/employees/${employeeId}/jobs`, data);
    return response.data;
  }

  async updateJob(jobId: string, data: any) {
    let response = await this.http.put(`/v1/jobs/${jobId}`, data);
    return response.data;
  }

  async listJobCompensations(jobId: string) {
    let response = await this.http.get(`/v1/jobs/${jobId}/compensations`);
    return response.data;
  }

  async createJobCompensation(jobId: string, data: any) {
    let response = await this.http.post(`/v1/jobs/${jobId}/compensations`, data);
    return response.data;
  }

  async updateCompensation(compensationId: string, data: any) {
    let response = await this.http.put(`/v1/compensations/${compensationId}`, data);
    return response.data;
  }
}
