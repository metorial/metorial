import {
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import { API_VERSION, BASE_URLS, exactId, gustoError, requireFields } from './helpers';

export type Resource = Record<string, unknown>;
export type Pagination = {
  page?: number;
  per?: number;
  totalCount?: number;
  totalPages?: number;
  nextPage?: number;
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string; baseUrl: string }) {
    if (
      !config.token?.trim() ||
      !Object.values(BASE_URLS).some(url => url === config.baseUrl)
    ) {
      throw createApiServiceError('Reconnect Gusto with a valid production or demo token.', {
        reason: 'invalid_auth'
      });
    }
    this.http = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { 'X-Gusto-API-Version': API_VERSION },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => gustoError(error, 'request')
    });
  }
  private path(...segments: string[]) {
    return `/v1/${segments.map(encodeURIComponent).join('/')}`;
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: Resource,
    params?: Resource
  ) {
    return requestAxios(
      'request',
      () => this.http.request<unknown>({ method, url: path, data, params }),
      gustoError
    );
  }
  private resource(value: unknown): Resource {
    if (!isApiErrorRecord(value))
      throw createApiServiceError('Gusto returned an invalid resource object.', {
        reason: 'invalid_response'
      });
    return value;
  }
  private async read(path: string, params?: Resource) {
    return this.resource((await this.request('GET', path, undefined, params)).data);
  }
  private async write(
    method: 'POST' | 'PUT',
    path: string,
    data: Resource,
    required: string[],
    expectedId?: string
  ) {
    requireFields(data, required);
    const body = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );
    if (method === 'PUT' && !Object.keys(body).some(key => key !== 'version')) {
      throw createApiServiceError('Provide at least one field to update.', {
        reason: 'empty_update'
      });
    }
    const result = this.resource((await this.request(method, path, body)).data);
    if (expectedId && exactId(result.uuid) !== expectedId) {
      throw createApiServiceError(
        'Gusto returned a different resource after the update. Review the change in Gusto before retrying.',
        { reason: 'resource_mismatch' }
      );
    }
    return result;
  }
  private async list(path: string, params?: Resource, wrapper?: string) {
    const response = await this.request('GET', path, undefined, params);
    const data = Array.isArray(response.data)
      ? response.data
      : wrapper && isApiErrorRecord(response.data)
        ? response.data[wrapper]
        : undefined;
    if (!Array.isArray(data))
      throw createApiServiceError('Gusto returned an invalid collection.', {
        reason: 'invalid_response'
      });
    const items = data.map(value => this.resource(value));
    const pagination = this.pagination(response.headers);
    return Object.assign(items, { pagination });
  }
  private pagination(headers: unknown): Pagination {
    const pagination: Pagination = {};
    for (const [key, header] of [
      ['page', 'x-page'],
      ['per', 'x-per-page'],
      ['totalCount', 'x-total-count'],
      ['totalPages', 'x-total-pages']
    ] as const) {
      const raw = getResponseHeaderValue(headers, header);
      if (raw !== undefined) {
        const value = Number(raw);
        if (!/^\d+$/.test(String(raw)) || !Number.isSafeInteger(value) || value < 0)
          throw createApiServiceError('Gusto returned invalid pagination metadata.', {
            reason: 'invalid_response'
          });
        pagination[key] = value;
      }
    }
    if (pagination.page && pagination.totalPages && pagination.page < pagination.totalPages)
      pagination.nextPage = pagination.page + 1;
    return pagination;
  }
  async getTokenInfo() {
    return this.read(this.path('token_info'));
  }
  async getCompany(id: string) {
    return this.read(this.path('companies', id));
  }
  async listCompanyLocations(id: string, params?: Resource) {
    return this.list(this.path('companies', id, 'locations'), params);
  }
  async createCompanyLocation(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'locations'), data, [
      'phone_number',
      'street_1',
      'city',
      'state',
      'zip'
    ]);
  }
  async updateCompanyLocation(id: string, data: Resource) {
    return this.write('PUT', this.path('locations', id), data, ['version'], id);
  }
  async listEmployees(id: string, params?: Resource) {
    return this.list(this.path('companies', id, 'employees'), params);
  }
  async getEmployee(id: string, params?: Resource) {
    return this.read(this.path('employees', id), params);
  }
  async createEmployee(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'employees'), data, [
      'first_name',
      'last_name'
    ]);
  }
  async updateEmployee(id: string, data: Resource) {
    return this.write('PUT', this.path('employees', id), data, ['version'], id);
  }
  async terminateEmployee(id: string, data: Resource) {
    return this.write('POST', this.path('employees', id, 'terminations'), data, [
      'effective_date'
    ]);
  }
  async rehireEmployee(id: string, data: Resource) {
    return this.write('POST', this.path('employees', id, 'rehire'), data, [
      'effective_date',
      'file_new_hire_report',
      'work_location_uuid'
    ]);
  }
  async listContractors(id: string, params?: Resource) {
    return this.list(this.path('companies', id, 'contractors'), params);
  }
  async getContractor(id: string) {
    return this.read(this.path('contractors', id));
  }
  async createContractor(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'contractors'), data, [
      'type',
      'wage_type',
      'start_date'
    ]);
  }
  async updateContractor(id: string, data: Resource) {
    return this.write('PUT', this.path('contractors', id), data, ['version'], id);
  }
  async listPayrolls(id: string, params?: Resource) {
    return this.list(this.path('companies', id, 'payrolls'), params);
  }
  async getPayroll(
    company: string,
    id: string,
    params?: Resource
  ): Promise<Resource & { pagination: Pagination }> {
    const response = await this.request(
      'GET',
      this.path('companies', company, 'payrolls', id),
      undefined,
      params
    );
    const result = this.resource(response.data);
    if (exactId(result.payroll_uuid ?? result.uuid) !== id)
      throw createApiServiceError('Gusto returned a different payroll.', {
        reason: 'resource_mismatch'
      });
    return { ...result, pagination: this.pagination(response.headers) };
  }
  async listPaySchedules(id: string, params?: Resource) {
    return this.list(this.path('companies', id, 'pay_schedules'), params);
  }
  async listContractorPayments(
    id: string,
    params: Resource
  ): Promise<Resource & { pagination: Pagination }> {
    requireFields(params, ['start_date', 'end_date']);
    const response = await this.request(
      'GET',
      this.path('companies', id, 'contractor_payments'),
      undefined,
      params
    );
    return { ...this.resource(response.data), pagination: this.pagination(response.headers) };
  }
  async listCompanyBenefits(id: string) {
    return this.list(this.path('companies', id, 'company_benefits'));
  }
  async getCompanyBenefit(id: string) {
    return this.read(this.path('company_benefits', id));
  }
  async createCompanyBenefit(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'company_benefits'), data, [
      'description'
    ]);
  }
  async updateCompanyBenefit(id: string, data: Resource) {
    return this.write('PUT', this.path('company_benefits', id), data, ['version'], id);
  }
  async listEmployeeBenefits(id: string, params?: Resource) {
    return this.list(this.path('employees', id, 'employee_benefits'), params);
  }
  async createEmployeeBenefit(id: string, data: Resource) {
    return this.write('POST', this.path('employees', id, 'employee_benefits'), data, [
      'company_benefit_uuid'
    ]);
  }
  async updateEmployeeBenefit(id: string, data: Resource) {
    return this.write('PUT', this.path('employee_benefits', id), data, ['version'], id);
  }
  async listEarningTypes(id: string) {
    return this.read(this.path('companies', id, 'earning_types'));
  }
  async createEarningType(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'earning_types'), data, ['name']);
  }
  async updateEarningType(company: string, id: string, data: Resource) {
    return this.write(
      'PUT',
      this.path('companies', company, 'earning_types', id),
      data,
      ['name'],
      id
    );
  }
  async listTimeOffPolicies(id: string) {
    return this.list(this.path('companies', id, 'time_off_policies'));
  }
  async getTimeOffBalances(id: string, type: string) {
    return this.list(this.path('employees', id, 'time_off_activities'), {
      time_off_type: type
    });
  }
  async listGarnishments(id: string, params?: Resource) {
    return this.list(this.path('employees', id, 'garnishments'), params);
  }
  async createGarnishment(id: string, data: Resource) {
    return this.write('POST', this.path('employees', id, 'garnishments'), data, [
      'amount',
      'court_ordered'
    ]);
  }
  async updateGarnishment(id: string, data: Resource) {
    return this.write('PUT', this.path('garnishments', id), data, ['version'], id);
  }
  async listDepartments(id: string) {
    return this.list(this.path('companies', id, 'departments'));
  }
  async createDepartment(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'departments'), data, ['title']);
  }
  async updateDepartment(id: string, data: Resource) {
    return this.write('PUT', this.path('departments', id), data, ['version', 'title'], id);
  }
  async listJobCompensations(id: string, params?: Resource) {
    return this.list(this.path('jobs', id, 'compensations'), params);
  }
  async createJobCompensation(id: string, data: Resource) {
    return this.write('POST', this.path('jobs', id, 'compensations'), data, [
      'rate',
      'payment_unit',
      'flsa_status'
    ]);
  }
  async updateCompensation(id: string, data: Resource) {
    return this.write('PUT', this.path('compensations', id), data, ['version'], id);
  }
  async calculatePayroll(company: string, id: string) {
    return this.payrollOperation(company, id, 'calculate');
  }
  async submitPayroll(company: string, id: string) {
    return this.payrollOperation(company, id, 'submit');
  }
  private async payrollOperation(company: string, id: string, action: 'calculate' | 'submit') {
    const response = await this.request(
      'PUT',
      this.path('companies', company, 'payrolls', id, action)
    );
    if (response.status !== 202)
      throw createApiServiceError(
        'Gusto did not confirm asynchronous payroll acceptance. Check the payroll before retrying.',
        { reason: 'ambiguous_outcome' }
      );
    return { payrollId: id, accepted: true, operation: action };
  }
  async createContractorPayment(id: string, data: Resource) {
    return this.write('POST', this.path('companies', id, 'contractor_payments'), data, [
      'contractor_uuid',
      'date'
    ]);
  }
  async cancelContractorPayment(company: string, id: string) {
    const path = this.path('companies', company, 'contractor_payments', id);
    const before = await this.read(path);
    if (exactId(before.uuid) !== id || before.may_cancel !== true)
      throw createApiServiceError(
        'Gusto has not confirmed that this exact payment can be cancelled.',
        { reason: 'invalid_payment_state' }
      );
    const response = await this.request('DELETE', path);
    if (response.status !== 204)
      throw createApiServiceError(
        'Gusto did not acknowledge payment cancellation. Review the payment before retrying.',
        { reason: 'ambiguous_outcome' }
      );
    try {
      await this.read(path);
    } catch (error) {
      if (gustoError(error, 'payment cancellation verification').data.upstreamStatus === 404)
        return { contractorPaymentId: id, cancelled: true };
      throw error;
    }
    throw createApiServiceError(
      'The payment remains readable after cancellation. Review its state in Gusto before retrying.',
      { reason: 'unverified_cancellation' }
    );
  }
  async listCompanyForms(id: string) {
    return this.list(this.path('companies', id, 'forms'));
  }
  async listEmployeeForms(id: string) {
    return this.list(this.path('employees', id, 'forms'));
  }
  async getForm(id: string, parent: { employeeId?: string }) {
    return this.read(
      parent.employeeId
        ? this.path('employees', parent.employeeId, 'forms', id)
        : this.path('forms', id)
    );
  }
  async listEmployeeJobs(id: string, params?: Resource) {
    return this.list(this.path('employees', id, 'jobs'), params);
  }
  async createEmployeeJob(id: string, data: Resource) {
    return this.write('POST', this.path('employees', id, 'jobs'), data, [
      'title',
      'hire_date'
    ]);
  }
  async updateJob(id: string, data: Resource) {
    return this.write('PUT', this.path('jobs', id), data, ['version'], id);
  }
}
