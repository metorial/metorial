import { createAxios } from 'slates';

export class RipplingClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.rippling.com/platform/api',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Employees ──────────────────────────────────────────────

  async listEmployees(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/employees', { params });
    return response.data;
  }

  async listAllEmployees(params?: {
    limit?: number;
    offset?: number;
    sendAllRoles?: boolean;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.sendAllRoles) queryParams.send_all_roles = params.sendAllRoles;

    let response = await this.axios.get('/employees/include_terminated', {
      params: queryParams
    });
    return response.data;
  }

  async getEmployee(employeeId: string) {
    let response = await this.axios.get(`/employees/${employeeId}`);
    return response.data;
  }

  // ── Company ────────────────────────────────────────────────

  async getCompany() {
    let response = await this.axios.get('/companies/current');
    return response.data;
  }

  async getCompanyActivity(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    next?: string;
  }) {
    let response = await this.axios.get('/company_activity', { params });
    return response.data;
  }

  // ── Departments ────────────────────────────────────────────

  async listDepartments(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/departments', { params });
    return response.data;
  }

  // ── Teams ──────────────────────────────────────────────────

  async listTeams(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/teams', { params });
    return response.data;
  }

  // ── Work Locations ─────────────────────────────────────────

  async listWorkLocations() {
    let response = await this.axios.get('/work_locations');
    return response.data;
  }

  // ── Groups ─────────────────────────────────────────────────

  async createGroup(data: { name: string; spokeId: string; userIds: string[] }) {
    let response = await this.axios.post('/groups', {
      name: data.name,
      spokeId: data.spokeId,
      userIds: data.userIds
    });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      spokeId?: string;
      users?: string[];
      version?: number;
    }
  ) {
    let response = await this.axios.put(`/groups/${groupId}`, data);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  // ── Leave Requests ─────────────────────────────────────────

  async listLeaveRequests(params?: { startDate?: string; endDate?: string; status?: string }) {
    let response = await this.axios.get('/leave_requests', { params });
    return response.data;
  }

  async processLeaveRequest(leaveRequestId: string, action: 'APPROVE' | 'DECLINE') {
    let response = await this.axios.post(`/leave_requests/${leaveRequestId}/process`, null, {
      params: { action }
    });
    return response.data;
  }

  // ── Leave Balances ─────────────────────────────────────────

  async getLeaveBalances(roleId: string) {
    let response = await this.axios.get(`/leave_balances/${roleId}`);
    return response.data;
  }

  // ── Leave Types ────────────────────────────────────────────

  async listLeaveTypes(params?: { managedBy?: string }) {
    let response = await this.axios.get('/company_leave_types', { params });
    return response.data;
  }

  // ── ATS Candidates ─────────────────────────────────────────

  async pushCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    title?: string;
    phone?: string;
    department?: string;
    startDate?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.post('/ats_candidates/push_candidate', data);
    return response.data;
  }

  // ── Custom Fields ──────────────────────────────────────────

  async listCustomFields(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/custom_fields', { params });
    return response.data;
  }

  // ── Levels ─────────────────────────────────────────────────

  async listLevels() {
    let response = await this.axios.get('/levels');
    return response.data;
  }

  // ── SAML ───────────────────────────────────────────────────

  async getSamlMetadata() {
    let response = await this.axios.get('/saml/idp_metadata');
    return response.data;
  }

  // ── Current User ───────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.axios.get('/me');
    return response.data;
  }
}
