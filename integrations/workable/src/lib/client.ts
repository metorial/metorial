import { createAuthenticatedAxios, pickDefined, requestAxiosData } from 'slates';
import { workableApiError } from './errors';

export class WorkableClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private subdomain: string;

  constructor(config: { token: string; subdomain: string }) {
    this.subdomain = config.subdomain;
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${config.subdomain}.workable.com/spi/v3`,
      authHeader: {
        value: `Bearer ${config.token}`
      }
    });
  }

  private async request<T>(operation: string, request: () => Promise<{ data: T }>) {
    return await requestAxiosData<T>(operation, request as any, workableApiError);
  }

  // Account and lookup endpoints

  async getAccount(): Promise<any> {
    return await this.request('get account', () =>
      this.axios.get(`/accounts/${this.subdomain}`)
    );
  }

  async listMembers(params?: {
    limit?: number;
    since_id?: string;
    max_id?: string;
    role?: string;
    shortcode?: string;
    email?: string;
    name?: string;
    status?: string;
  }): Promise<any> {
    return await this.request('list members', () =>
      this.axios.get('/members', { params: pickDefined(params ?? {}) })
    );
  }

  async listStages(): Promise<any> {
    return await this.request('list stages', () => this.axios.get('/stages'));
  }

  async listDepartments(): Promise<any> {
    return await this.request('list departments', () => this.axios.get('/departments'));
  }

  async listLegalEntities(): Promise<any> {
    return await this.request('list legal entities', () => this.axios.get('/legal_entities'));
  }

  async listWorkSchedules(): Promise<any> {
    return await this.request('list work schedules', () => this.axios.get('/work_schedules'));
  }

  async listEmployeeFields(): Promise<any> {
    return await this.request('list employee fields', () =>
      this.axios.get('/employee_fields')
    );
  }

  async listAccountCustomAttributes(): Promise<any> {
    return await this.request('list account custom attributes', () =>
      this.axios.get('/custom_attributes')
    );
  }

  async listDisqualificationReasons(): Promise<any> {
    return await this.request('list disqualification reasons', () =>
      this.axios.get('/disqualification_reasons')
    );
  }

  // Jobs

  async listJobs(params?: {
    state?: string;
    limit?: number;
    since_id?: string;
    max_id?: string;
    created_after?: string;
    updated_after?: string;
    include_fields?: string;
  }): Promise<any> {
    return await this.request('list jobs', () =>
      this.axios.get('/jobs', { params: pickDefined(params ?? {}) })
    );
  }

  async getJob(shortcode: string): Promise<any> {
    return await this.request('get job', () => this.axios.get(`/jobs/${shortcode}`));
  }

  async getJobApplicationForm(shortcode: string): Promise<any> {
    return await this.request('get job application form', () =>
      this.axios.get(`/jobs/${shortcode}/application_form`)
    );
  }

  async getJobQuestions(shortcode: string): Promise<any> {
    return await this.request('list job questions', () =>
      this.axios.get(`/jobs/${shortcode}/questions`)
    );
  }

  async getJobCustomAttributes(shortcode: string): Promise<any> {
    return await this.request('list job custom attributes', () =>
      this.axios.get(`/jobs/${shortcode}/custom_attributes`)
    );
  }

  async getJobMembers(shortcode: string): Promise<any> {
    return await this.request('get job members', () =>
      this.axios.get(`/jobs/${shortcode}/members`)
    );
  }

  async getJobStages(shortcode: string): Promise<any> {
    return await this.request('get job stages', () =>
      this.axios.get(`/jobs/${shortcode}/stages`)
    );
  }

  // Candidates

  async listCandidates(params?: {
    email?: string;
    shortcode?: string;
    stage?: string;
    limit?: number;
    since_id?: string;
    max_id?: string;
    created_after?: string;
    updated_after?: string;
  }): Promise<any> {
    return await this.request('list candidates', () =>
      this.axios.get('/candidates', { params: pickDefined(params ?? {}) })
    );
  }

  async getCandidate(candidateId: string): Promise<any> {
    return await this.request('get candidate', () =>
      this.axios.get(`/candidates/${candidateId}`)
    );
  }

  async createCandidate(
    jobShortcode: string,
    body: Record<string, unknown>,
    params?: { stage?: string }
  ): Promise<any> {
    return await this.request('create candidate', () =>
      this.axios.post(`/jobs/${jobShortcode}/candidates`, body, {
        params: pickDefined(params ?? {})
      })
    );
  }

  async updateCandidate(candidateId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('update candidate', () =>
      this.axios.patch(`/candidates/${candidateId}`, body)
    );
  }

  async moveCandidate(candidateId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('move candidate', () =>
      this.axios.post(`/candidates/${candidateId}/move`, body)
    );
  }

  async copyCandidate(candidateId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('copy candidate', () =>
      this.axios.post(`/candidates/${candidateId}/copy`, body)
    );
  }

  async relocateCandidate(candidateId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('relocate candidate', () =>
      this.axios.post(`/candidates/${candidateId}/relocate`, body)
    );
  }

  async disqualifyCandidate(candidateId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('disqualify candidate', () =>
      this.axios.post(`/candidates/${candidateId}/disqualify`, body)
    );
  }

  async revertDisqualification(
    candidateId: string,
    body: Record<string, unknown>
  ): Promise<any> {
    return await this.request('revert candidate disqualification', () =>
      this.axios.post(`/candidates/${candidateId}/revert`, body)
    );
  }

  async addCandidateComment(candidateId: string, body: Record<string, unknown>) {
    return await this.request('comment on candidate', () =>
      this.axios.post(`/candidates/${candidateId}/comments`, body)
    );
  }

  async setCandidateTags(candidateId: string, tags: string[]): Promise<any> {
    return await this.request('set candidate tags', () =>
      this.axios.put(`/candidates/${candidateId}/tags`, { tags })
    );
  }

  async addCandidateRating(candidateId: string, body: Record<string, unknown>) {
    return await this.request('rate candidate', () =>
      this.axios.post(`/candidates/${candidateId}/ratings`, body)
    );
  }

  async getCandidateActivities(
    candidateId: string,
    params?: {
      limit?: number;
      since_id?: string;
      max_id?: string;
      actions?: string;
      updated_after?: string;
    }
  ): Promise<any> {
    return await this.request('list candidate activities', () =>
      this.axios.get(`/candidates/${candidateId}/activities`, {
        params: pickDefined(params ?? {})
      })
    );
  }

  async getCandidateOffer(candidateId: string): Promise<any> {
    return await this.request('get candidate offer', () =>
      this.axios.get(`/candidates/${candidateId}/offer`)
    );
  }

  async listCandidateFiles(candidateId: string): Promise<any> {
    return await this.request('list candidate files', () =>
      this.axios.get(`/candidates/${candidateId}/files`)
    );
  }

  // Employees

  async listEmployees(params?: {
    limit?: number;
    offset?: number;
    query?: string;
    order_by?: string;
    member_id?: string;
  }): Promise<any> {
    return await this.request('list employees', () =>
      this.axios.get('/employees', { params: pickDefined(params ?? {}) })
    );
  }

  async getEmployee(employeeId: string, params?: { member_id?: string }): Promise<any> {
    return await this.request('get employee', () =>
      this.axios.get(`/employees/${employeeId}`, { params: pickDefined(params ?? {}) })
    );
  }

  async createEmployee(body: Record<string, unknown>): Promise<any> {
    return await this.request('create employee', () => this.axios.post('/employees', body));
  }

  async updateEmployee(employeeId: string, body: Record<string, unknown>): Promise<any> {
    return await this.request('update employee', () =>
      this.axios.patch(`/employees/${employeeId}`, body)
    );
  }

  async getEmployeeDocuments(
    employeeId: string,
    params?: {
      member_id?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    return await this.request('list employee documents', () =>
      this.axios.get(`/employees/${employeeId}/documents`, {
        params: pickDefined(params ?? {})
      })
    );
  }

  // Time off

  async listTimeOffCategories(): Promise<any> {
    return await this.request('list time off categories', () =>
      this.axios.get('/timeoff/categories')
    );
  }

  async listTimeOffRequests(params: {
    from_date: string;
    to_date?: string;
    category_ids?: string[];
    states?: string[];
    employee_id?: string;
    employee_ids?: string[];
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return await this.request('list time off requests', () =>
      this.axios.get('/timeoff/requests', { params: pickDefined(params) })
    );
  }

  async createTimeOffRequest(body: Record<string, unknown>): Promise<any> {
    return await this.request('create time off request', () =>
      this.axios.post('/timeoff/requests', body)
    );
  }

  async getTimeOffBalances(params?: { employee_id?: string }): Promise<any> {
    return await this.request('get time off balances', () =>
      this.axios.get('/timeoff/balances', { params: pickDefined(params ?? {}) })
    );
  }

  async updateTimeOffApproval(
    approvalKey: string,
    body: Record<string, unknown>
  ): Promise<any> {
    return await this.request('update time off approval', () =>
      this.axios.patch(`/timeoff/approvals/${approvalKey}`, body)
    );
  }

  // Requisitions

  async listRequisitions(params?: {
    limit?: number;
    since_id?: string;
    max_id?: string;
    state?: string;
    job_id?: string;
    plan_date_from?: string;
    plan_date_to?: string;
    created_after?: string;
    updated_after?: string;
  }): Promise<any> {
    return await this.request('list requisitions', () =>
      this.axios.get('/requisitions', { params: pickDefined(params ?? {}) })
    );
  }

  async getRequisition(requisitionCode: string): Promise<any> {
    return await this.request('get requisition', () =>
      this.axios.get(`/requisitions/${requisitionCode}`)
    );
  }

  async createRequisition(body: Record<string, unknown>): Promise<any> {
    return await this.request('create requisition', () =>
      this.axios.post('/requisitions', body)
    );
  }

  async updateRequisition(requisitionId: string, body: Record<string, unknown>) {
    return await this.request('update requisition', () =>
      this.axios.patch(`/requisitions/${requisitionId}`, body)
    );
  }

  async approveRequisition(requisitionCode: string, body: Record<string, unknown>) {
    return await this.request('approve requisition', () =>
      this.axios.patch(`/requisitions/${requisitionCode}/approve`, body)
    );
  }

  async rejectRequisition(requisitionCode: string, body: Record<string, unknown>) {
    return await this.request('reject requisition', () =>
      this.axios.patch(`/requisitions/${requisitionCode}/reject`, body)
    );
  }

  // Events and webhook subscriptions

  async listEvents(params?: {
    type?: string;
    candidate_id?: string;
    shortcode?: string;
    member_id?: string;
    start_date?: string;
    end_date?: string;
    context?: string;
    limit?: number;
    since_id?: string;
    max_id?: string;
    include_cancelled?: boolean;
  }): Promise<any> {
    return await this.request('list events', () =>
      this.axios.get('/events', { params: pickDefined(params ?? {}) })
    );
  }

  async createSubscription(subscriptionData: {
    target: string;
    event: string;
    args?: { job_shortcode?: string; stage_slug?: string };
  }): Promise<any> {
    return await this.request('create subscription', () =>
      this.axios.post('/subscriptions', subscriptionData)
    );
  }

  async deleteSubscription(subscriptionId: string): Promise<any> {
    return await this.request('delete subscription', () =>
      this.axios.delete(`/subscriptions/${subscriptionId}`)
    );
  }

  async listSubscriptions(): Promise<any> {
    return await this.request('list subscriptions', () => this.axios.get('/subscriptions'));
  }
}
