import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://pubapi.talenthr.io/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private async request<T = any>(options: {
    method?: string;
    path: string;
    params?: Record<string, any>;
    data?: Record<string, any>;
  }): Promise<T> {
    let response = await api({
      method: options.method || 'GET',
      url: options.path,
      params: options.params,
      data: options.data,
      auth: {
        username: this.token,
        password: 'c'
      }
    });
    return response.data;
  }

  // Employee Management

  async hireEmployee(data: {
    first_name: string;
    last_name: string;
    email: string;
    hire_date: string;
    employment_status: { employment_status_id: string };
    reports_to_employee_id?: string;
    job_record?: {
      job_title_id?: string;
      location_id?: string;
      division_id?: string;
      department_id?: string;
    };
    compensation_record?: {
      pay_rate?: number;
      pay_rate_period?: string;
      pay_rate_schedule?: string;
      overtime_status?: string;
    };
    prevent_email?: boolean;
    is_existing?: boolean;
    hire_packet?: {
      who_id?: number;
      address?: string;
      when_time?: string;
      instructions?: string;
    };
  }) {
    return this.request({
      method: 'POST',
      path: '/employees/hire',
      data
    });
  }

  async updateEmployee(employeeId: string, data: Record<string, any>) {
    return this.request({
      method: 'PUT',
      path: `/employees/${employeeId}`,
      data
    });
  }

  async listEmployees(params?: { limit?: number; offset?: number }) {
    return this.request<{
      data: {
        rows: Array<{
          id: number;
          user_id: number;
          first_name: string;
          last_name: string;
          email: string;
          division_id: number | null;
          division: string | null;
          employment_status_id: number;
          employment_status_name: string;
          department_id: number | null;
          department: string | null;
          job_title_id: number | null;
          job_title: string | null;
          location_id: number | null;
          location: string | null;
          termination_date: string | null;
          hire_date: string;
          reports_to_employee_id: number | null;
          linked_in_url: string | null;
          work_phone: string | null;
          photo_url: string | null;
          user_role: {
            id: number;
            slug: string;
            name: string;
          };
        }>;
      };
    }>({
      path: '/directory',
      params
    });
  }

  // Organizational Structure

  async listDepartments() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/departments'
    });
  }

  async createDepartment(name: string) {
    return this.request<{ data: { id: number; name: string } }>({
      method: 'POST',
      path: '/departments',
      data: { name }
    });
  }

  async listDivisions() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/divisions'
    });
  }

  async createDivision(name: string) {
    return this.request<{ data: { id: number; name: string } }>({
      method: 'POST',
      path: '/divisions',
      data: { name }
    });
  }

  async listJobTitles() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/job-titles'
    });
  }

  async createJobTitle(name: string) {
    return this.request<{ data: { id: number; name: string } }>({
      method: 'POST',
      path: '/job-titles',
      data: { name }
    });
  }

  async listLocations() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/locations'
    });
  }

  async createLocation(name: string) {
    return this.request<{ data: { id: number; name: string } }>({
      method: 'POST',
      path: '/locations',
      data: { name }
    });
  }

  async listEmploymentStatuses() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/employment-statuses'
    });
  }

  // Time Off Management

  async listTimeOffRequests(employeeId: string, params?: { limit?: number; offset?: number }) {
    return this.request<{
      data: {
        rows: Array<{
          id: number;
          timeoff_type_name: string;
          start_date: string;
          end_date: string;
          status: string;
          [key: string]: any;
        }>;
      };
    }>({
      path: `/employees/${employeeId}/time-off-requests`,
      params
    });
  }

  async respondToTimeOffRequest(
    employeeId: string,
    timeOffRequestId: string,
    accept: boolean
  ) {
    return this.request({
      method: 'POST',
      path: `/employees/${employeeId}/time-off-requests/${timeOffRequestId}/reply`,
      data: { accept }
    });
  }

  // Applicant Tracking

  async listJobPositions() {
    return this.request<{
      data: Array<{
        id: number;
        job_position_title: string;
        [key: string]: any;
      }>;
    }>({
      path: '/job-positions'
    });
  }

  async listJobApplications(params?: {
    limit?: number;
    offset?: number;
    jobPositionId?: string;
  }) {
    let { jobPositionId, ...restParams } = params || {};
    let path = jobPositionId
      ? `/job-positions/${jobPositionId}/ats-applicants`
      : '/ats-applicants';
    return this.request<{
      data: {
        rows: Array<{
          id: number;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          starred: boolean;
          applications_count: number;
          added_at: string;
          [key: string]: any;
        }>;
      };
    }>({
      path,
      params: restParams
    });
  }

  // Reference Data

  async listNationalities() {
    return this.request<{ data: string[] }>({
      path: '/nationalities'
    });
  }

  async listCountries() {
    return this.request<{ data: string[] }>({
      path: '/countries'
    });
  }

  async listRelationshipTypes() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/relationship-types'
    });
  }

  async listLanguages() {
    return this.request<{ data: Array<{ id: number; name: string }> }>({
      path: '/languages'
    });
  }

  // Pagination helper
  async listAllPaginated<T extends { id: number }>(
    fetchFn: (params: { limit: number; offset: number }) => Promise<{ data: { rows: T[] } }>,
    maxResults?: number
  ): Promise<T[]> {
    let allResults: T[] = [];
    let offset = 0;
    let limit = 100;
    let hasMore = true;

    while (hasMore) {
      let response = await fetchFn({ limit, offset });
      let rows = response.data.rows;
      allResults.push(...rows);

      if (maxResults && allResults.length >= maxResults) {
        return allResults.slice(0, maxResults);
      }

      hasMore = rows.length === limit;
      offset += limit;
    }

    return allResults;
  }
}
