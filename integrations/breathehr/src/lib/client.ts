import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface EmployeeCreateParams {
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  joinDate?: string;
  dob?: string;
  gender?: string;
  knownAs?: string;
  lineManagerId?: string;
  departmentId?: string;
  divisionId?: string;
  locationId?: string;
  workingPatternId?: string;
  holidayAllowanceId?: string;
}

export interface LeaveRequestCreateParams {
  startDate: string;
  endDate: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  otherLeaveReasonId?: string;
  notes?: string;
}

export interface SicknessCreateParams {
  startDate: string;
  endDate?: string;
  companySicknessTypeId?: string;
  reason?: string;
}

export interface ExpenseCreateParams {
  employeeId: string;
  expenseDate: string;
  description: string;
  amount: string;
  payableToEmployee?: boolean;
  chargeable?: boolean;
}

export interface ExpenseClaimCreateParams {
  employeeId: string;
  expenseIds?: string[];
}

export interface ExpenseClaimUpdateParams {
  status?: string;
}

export interface AbsenceListParams extends PaginationParams {
  type?: string;
  employeeId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  excludeCancelledAbsences?: boolean;
}

export interface SicknessListParams extends PaginationParams {
  employeeId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface EmployeeListParams extends PaginationParams {
  status?: string;
}

let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let _convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; environment: string }) {
    let baseURL =
      config.environment === 'sandbox'
        ? 'https://api.sandbox.breathehr.info/v1'
        : 'https://api.breathehr.com/v1';

    this.axios = createAxios({
      baseURL,
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Account
  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  // Employees
  async listEmployees(params?: EmployeeListParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.status) query.status = params.status;

    let response = await this.axios.get('/employees', { params: query });
    return response.data;
  }

  async getEmployee(employeeId: string): Promise<any> {
    let response = await this.axios.get(`/employees/${employeeId}`);
    return response.data;
  }

  async createEmployee(params: EmployeeCreateParams): Promise<any> {
    let employee: Record<string, any> = {};
    if (params.firstName) employee.first_name = params.firstName;
    if (params.lastName) employee.last_name = params.lastName;
    if (params.email) employee.email = params.email;
    if (params.jobTitle) employee.job_title = params.jobTitle;
    if (params.joinDate) employee.join_date = params.joinDate;
    if (params.dob) employee.dob = params.dob;
    if (params.gender) employee.gender = params.gender;
    if (params.knownAs) employee.known_as = params.knownAs;
    if (params.lineManagerId) employee.line_manager_id = params.lineManagerId;
    if (params.departmentId) employee.department_id = params.departmentId;
    if (params.divisionId) employee.division_id = params.divisionId;
    if (params.locationId) employee.location_id = params.locationId;
    if (params.workingPatternId) employee.working_pattern_id = params.workingPatternId;
    if (params.holidayAllowanceId) employee.holiday_allowance_id = params.holidayAllowanceId;

    let response = await this.axios.post('/employees', { employee });
    return response.data;
  }

  // Absences
  async listAbsences(params?: AbsenceListParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.type) query.type = params.type;
    if (params?.employeeId) query.employee_id = params.employeeId;
    if (params?.departmentId) query.department_id = params.departmentId;
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.excludeCancelledAbsences !== undefined)
      query.exclude_cancelled_absences = params.excludeCancelledAbsences;

    let response = await this.axios.get('/absences', { params: query });
    return response.data;
  }

  async cancelAbsence(absenceId: string, reason?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (reason) body.reason = reason;

    let response = await this.axios.post(`/absences/${absenceId}/cancel`, body);
    return response.data;
  }

  // Employee absences
  async getEmployeeAbsences(employeeId: string, params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/employees/${employeeId}/absences`, {
      params: query
    });
    return response.data;
  }

  // Leave Requests
  async listLeaveRequests(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/leave_requests', { params: query });
    return response.data;
  }

  async getLeaveRequest(leaveRequestId: string): Promise<any> {
    let response = await this.axios.get(`/leave_requests/${leaveRequestId}`);
    return response.data;
  }

  async createLeaveRequest(
    employeeId: string,
    params: LeaveRequestCreateParams
  ): Promise<any> {
    let leaveRequest: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.halfDayStart !== undefined) leaveRequest.half_day_start = params.halfDayStart;
    if (params.halfDayEnd !== undefined) leaveRequest.half_day_end = params.halfDayEnd;
    if (params.otherLeaveReasonId)
      leaveRequest.other_leave_reason_id = params.otherLeaveReasonId;
    if (params.notes) leaveRequest.notes = params.notes;

    let response = await this.axios.post(`/employees/${employeeId}/leave_requests`, {
      leave_request: leaveRequest
    });
    return response.data;
  }

  async approveLeaveRequest(leaveRequestId: string): Promise<any> {
    let response = await this.axios.post(`/leave_requests/${leaveRequestId}/approve`);
    return response.data;
  }

  async rejectLeaveRequest(leaveRequestId: string, reason?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (reason) body.reason = reason;

    let response = await this.axios.post(`/leave_requests/${leaveRequestId}/reject`, body);
    return response.data;
  }

  // Sicknesses
  async listSicknesses(params?: SicknessListParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.employeeId) query.employee_id = params.employeeId;
    if (params?.departmentId) query.department_id = params.departmentId;
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;

    let response = await this.axios.get('/sicknesses', { params: query });
    return response.data;
  }

  async createSickness(employeeId: string, params: SicknessCreateParams): Promise<any> {
    let sickness: Record<string, any> = {
      start_date: params.startDate
    };
    if (params.endDate) sickness.end_date = params.endDate;
    if (params.companySicknessTypeId)
      sickness.company_sickness_type_id = params.companySicknessTypeId;
    if (params.reason) sickness.reason = params.reason;

    let response = await this.axios.post(`/employees/${employeeId}/sicknesses`, { sickness });
    return response.data;
  }

  // Expenses
  async getExpense(expenseId: string): Promise<any> {
    let response = await this.axios.get(`/employee_expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(params: ExpenseCreateParams): Promise<any> {
    let expense: Record<string, any> = {
      employee_id: params.employeeId,
      expense_date: params.expenseDate,
      description: params.description,
      amount: params.amount
    };
    if (params.payableToEmployee !== undefined)
      expense.payable_to_employee = params.payableToEmployee;
    if (params.chargeable !== undefined) expense.chargeable = params.chargeable;

    let response = await this.axios.post('/employee_expenses', { employee_expense: expense });
    return response.data;
  }

  async deleteExpense(expenseId: string): Promise<any> {
    let response = await this.axios.delete(`/employee_expenses/${expenseId}`);
    return response.data;
  }

  // Expense Claims
  async createExpenseClaim(params: ExpenseClaimCreateParams): Promise<any> {
    let claim: Record<string, any> = {
      employee_id: params.employeeId
    };
    if (params.expenseIds) claim.expense_ids = params.expenseIds;

    let response = await this.axios.post('/employee_expense_claims', {
      employee_expense_claim: claim
    });
    return response.data;
  }

  async updateExpenseClaim(claimId: string, params: ExpenseClaimUpdateParams): Promise<any> {
    let claim: Record<string, any> = {};
    if (params.status) claim.status = params.status;

    let response = await this.axios.put(`/employee_expense_claims/${claimId}`, {
      employee_expense_claim: claim
    });
    return response.data;
  }

  // Bonuses
  async listBonuses(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/bonuses', { params: query });
    return response.data;
  }

  // Salaries
  async listSalaries(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/salaries', { params: query });
    return response.data;
  }

  // Benefits
  async listEmployeeBenefits(employeeId: string, params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/employees/${employeeId}/benefits`, {
      params: query
    });
    return response.data;
  }

  // Departments
  async listDepartments(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/departments', { params: query });
    return response.data;
  }

  async getDepartmentAbsences(
    departmentId: string,
    params?: PaginationParams & { excludeCancelledAbsences?: boolean }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;
    if (params?.excludeCancelledAbsences !== undefined)
      query.exclude_cancelled_absences = params.excludeCancelledAbsences;

    let response = await this.axios.get(`/departments/${departmentId}/absences`, {
      params: query
    });
    return response.data;
  }

  async getDepartmentBenefits(departmentId: string, params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/departments/${departmentId}/benefits`, {
      params: query
    });
    return response.data;
  }

  async getDepartmentBonuses(departmentId: string, params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/departments/${departmentId}/bonuses`, {
      params: query
    });
    return response.data;
  }

  async getDepartmentLeaveRequests(
    departmentId: string,
    params?: PaginationParams
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/departments/${departmentId}/leave_requests`, {
      params: query
    });
    return response.data;
  }

  async getDepartmentSalaries(departmentId: string, params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/departments/${departmentId}/salaries`, {
      params: query
    });
    return response.data;
  }

  // Divisions
  async listDivisions(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/divisions', { params: query });
    return response.data;
  }

  // Locations
  async listLocations(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/locations', { params: query });
    return response.data;
  }

  // Training
  async listCompanyTrainingTypes(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/company_training_types', { params: query });
    return response.data;
  }

  async listEmployeeTrainingCourses(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/employee_training_courses', { params: query });
    return response.data;
  }

  async deleteEmployeeTrainingCourse(courseId: string): Promise<any> {
    let response = await this.axios.delete(`/employee_training_courses/${courseId}`);
    return response.data;
  }

  // Working Patterns
  async listWorkingPatterns(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/working_patterns', { params: query });
    return response.data;
  }

  // Holiday Allowances
  async listHolidayAllowances(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/holiday_allowances', { params: query });
    return response.data;
  }

  // Other Leave Reasons
  async listOtherLeaveReasons(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/other_leave_reasons', { params: query });
    return response.data;
  }

  // Change Requests
  async listChangeRequests(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/change_requests', { params: query });
    return response.data;
  }

  // Employee Change Requests
  async getEmployeeChangeRequests(
    employeeId: string,
    params?: PaginationParams
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get(`/employees/${employeeId}/change_requests`, {
      params: query
    });
    return response.data;
  }

  // Employee Jobs
  async listEmployeeJobs(params?: PaginationParams): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.per_page = params.perPage;

    let response = await this.axios.get('/employee_jobs', { params: query });
    return response.data;
  }

  // Custom Fields
  async listCustomFields(): Promise<any> {
    let response = await this.axios.get('/custom_fields');
    return response.data;
  }
}
