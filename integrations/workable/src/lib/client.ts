import { createAxios } from 'slates';

export class WorkableClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; subdomain: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.workable.com/spi/v3`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Account ──────────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  async getMembers(params?: { limit?: number; cursor?: string }): Promise<any> {
    let response = await this.axios.get('/members', { params });
    return response.data;
  }

  // ─── Jobs ─────────────────────────────────────────────────

  async listJobs(params?: {
    state?: string;
    limit?: number;
    since_id?: string;
    created_after?: string;
    updated_after?: string;
  }): Promise<any> {
    let response = await this.axios.get('/jobs', { params });
    return response.data;
  }

  async getJob(shortcode: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${shortcode}`);
    return response.data;
  }

  async getJobApplicationForm(shortcode: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${shortcode}/application_form`);
    return response.data;
  }

  async getJobMembers(shortcode: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${shortcode}/members`);
    return response.data;
  }

  async getJobStages(shortcode: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${shortcode}/stages`);
    return response.data;
  }

  async getJobActivities(
    shortcode: string,
    params?: { limit?: number; since_id?: string }
  ): Promise<any> {
    let response = await this.axios.get(`/jobs/${shortcode}/activities`, { params });
    return response.data;
  }

  // ─── Candidates ───────────────────────────────────────────

  async listCandidates(params?: {
    job_shortcode?: string;
    stage?: string;
    state?: string;
    limit?: number;
    since_id?: string;
    created_after?: string;
    updated_after?: string;
  }): Promise<any> {
    let allParams: any = { ...params };
    if (params?.job_shortcode) {
      let shortcode = params.job_shortcode;
      allParams.job_shortcode = undefined;
      let response = await this.axios.get(`/jobs/${shortcode}/candidates`, {
        params: allParams
      });
      return response.data;
    }
    let response = await this.axios.get('/candidates', { params: allParams });
    return response.data;
  }

  async getCandidate(jobShortcode: string, candidateId: string): Promise<any> {
    let response = await this.axios.get(`/jobs/${jobShortcode}/candidates/${candidateId}`);
    return response.data;
  }

  async createCandidate(jobShortcode: string, candidateData: any): Promise<any> {
    let response = await this.axios.post(`/jobs/${jobShortcode}/candidates`, candidateData);
    return response.data;
  }

  async moveCandidate(
    jobShortcode: string,
    candidateId: string,
    stageSlug: string
  ): Promise<any> {
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/move`,
      {
        stage: stageSlug
      }
    );
    return response.data;
  }

  async copyCandidate(
    jobShortcode: string,
    candidateId: string,
    targetJobShortcode: string,
    stageSlug?: string
  ): Promise<any> {
    let body: any = { target_job: targetJobShortcode };
    if (stageSlug) body.target_stage = stageSlug;
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/copy`,
      body
    );
    return response.data;
  }

  async relocateCandidate(
    jobShortcode: string,
    candidateId: string,
    targetJobShortcode: string,
    stageSlug?: string
  ): Promise<any> {
    let body: any = { target_job: targetJobShortcode };
    if (stageSlug) body.target_stage = stageSlug;
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/relocate`,
      body
    );
    return response.data;
  }

  async disqualifyCandidate(
    jobShortcode: string,
    candidateId: string,
    reason?: string
  ): Promise<any> {
    let body: any = {};
    if (reason) body.disqualification_reason = reason;
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/disqualify`,
      body
    );
    return response.data;
  }

  async revertDisqualification(jobShortcode: string, candidateId: string): Promise<any> {
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/revert`
    );
    return response.data;
  }

  async addCandidateComment(
    jobShortcode: string,
    candidateId: string,
    body: string,
    policyName?: string
  ): Promise<any> {
    let payload: any = { body };
    if (policyName) payload.policy = policyName;
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/comments`,
      payload
    );
    return response.data;
  }

  async addCandidateTag(jobShortcode: string, candidateId: string, tag: string): Promise<any> {
    let response = await this.axios.post(
      `/jobs/${jobShortcode}/candidates/${candidateId}/tags`,
      { tag }
    );
    return response.data;
  }

  async getCandidateActivities(
    jobShortcode: string,
    candidateId: string,
    params?: { limit?: number; since_id?: string }
  ): Promise<any> {
    let response = await this.axios.get(
      `/jobs/${jobShortcode}/candidates/${candidateId}/activities`,
      { params }
    );
    return response.data;
  }

  async getCandidateOffer(jobShortcode: string, candidateId: string): Promise<any> {
    let response = await this.axios.get(
      `/jobs/${jobShortcode}/candidates/${candidateId}/offer`
    );
    return response.data;
  }

  // ─── Departments ──────────────────────────────────────────

  async listDepartments(): Promise<any> {
    let response = await this.axios.get('/departments');
    return response.data;
  }

  async createDepartment(name: string, parentId?: string): Promise<any> {
    let body: any = { name };
    if (parentId) body.parent_id = parentId;
    let response = await this.axios.post('/departments', body);
    return response.data;
  }

  // ─── Employees ────────────────────────────────────────────

  async listEmployees(params?: {
    limit?: number;
    cursor?: string;
    email?: string;
    work_email?: string;
  }): Promise<any> {
    let response = await this.axios.get('/employees', { params });
    return response.data;
  }

  async getEmployee(employeeId: string): Promise<any> {
    let response = await this.axios.get(`/employees/${employeeId}`);
    return response.data;
  }

  async createEmployee(employeeData: any): Promise<any> {
    let response = await this.axios.post('/employees', employeeData);
    return response.data;
  }

  async updateEmployee(employeeId: string, employeeData: any): Promise<any> {
    let response = await this.axios.patch(`/employees/${employeeId}`, employeeData);
    return response.data;
  }

  async getEmployeeDocuments(employeeId: string): Promise<any> {
    let response = await this.axios.get(`/employees/${employeeId}/documents`);
    return response.data;
  }

  // ─── Time Off ─────────────────────────────────────────────

  async listTimeOffCategories(): Promise<any> {
    let response = await this.axios.get('/time_off/categories');
    return response.data;
  }

  async listTimeOffRequests(params?: {
    employee_id?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<any> {
    let response = await this.axios.get('/time_off/requests', { params });
    return response.data;
  }

  async createTimeOffRequest(requestData: any): Promise<any> {
    let response = await this.axios.post('/time_off/requests', requestData);
    return response.data;
  }

  async getTimeOffBalances(employeeId: string): Promise<any> {
    let response = await this.axios.get(`/time_off/balances/${employeeId}`);
    return response.data;
  }

  // ─── Requisitions ─────────────────────────────────────────

  async listRequisitions(params?: {
    limit?: number;
    cursor?: string;
    state?: string;
  }): Promise<any> {
    let response = await this.axios.get('/requisitions', { params });
    return response.data;
  }

  async getRequisition(requisitionId: string): Promise<any> {
    let response = await this.axios.get(`/requisitions/${requisitionId}`);
    return response.data;
  }

  async createRequisition(requisitionData: any): Promise<any> {
    let response = await this.axios.post('/requisitions', requisitionData);
    return response.data;
  }

  async updateRequisition(requisitionId: string, requisitionData: any): Promise<any> {
    let response = await this.axios.patch(`/requisitions/${requisitionId}`, requisitionData);
    return response.data;
  }

  async approveRequisition(requisitionId: string): Promise<any> {
    let response = await this.axios.post(`/requisitions/${requisitionId}/approve`);
    return response.data;
  }

  async rejectRequisition(requisitionId: string, reason?: string): Promise<any> {
    let body: any = {};
    if (reason) body.reason = reason;
    let response = await this.axios.post(`/requisitions/${requisitionId}/reject`, body);
    return response.data;
  }

  // ─── Events / Interviews ──────────────────────────────────

  async listEvents(params?: {
    type?: string;
    candidate_id?: string;
    job_shortcode?: string;
    member_id?: string;
    start_date?: string;
    end_date?: string;
    context?: string;
    limit?: number;
    since_id?: string;
  }): Promise<any> {
    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  // ─── Webhooks / Subscriptions ─────────────────────────────

  async createSubscription(subscriptionData: {
    target: string;
    event: string;
    args?: { job_shortcode?: string; stage_slug?: string };
  }): Promise<any> {
    let response = await this.axios.post('/subscriptions', subscriptionData);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<any> {
    let response = await this.axios.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listSubscriptions(): Promise<any> {
    let response = await this.axios.get('/subscriptions');
    return response.data;
  }

  // ─── Work Schedules ───────────────────────────────────────

  async listWorkSchedules(): Promise<any> {
    let response = await this.axios.get('/work_schedules');
    return response.data;
  }
}
