import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let getEmployeeRecord = (response: unknown): Record<string, unknown> => {
  let employee =
    isApiErrorRecord(response) && isApiErrorRecord(response.employee)
      ? response.employee
      : response;
  if (!isApiErrorRecord(employee)) {
    throw createApiServiceError('DeskTime returned an invalid employee response.', {
      reason: 'desktime_invalid_response'
    });
  }
  return employee;
};

export class Client {
  private http;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a DeskTime API key from your API settings.');
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://desktime.com/api/v2/json',
      authHeader: { name: 'X-API-Key', value: config.token },
      contentType: false,
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DeskTime',
          reason: 'desktime_api_error'
        })
    });
  }

  private validateDate(date?: string) {
    if (date === undefined) return;
    let parsed = new Date(`${date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      throw createApiServiceError('Provide a valid DeskTime date in YYYY-MM-DD format.');
    }
  }

  private validateName(value: string | undefined, field: string) {
    if (value !== undefined && !value.trim()) {
      throw createApiServiceError(`Provide a non-empty ${field}.`);
    }
  }

  private async request(
    path: string,
    params?: Record<string, string | undefined>,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<unknown> {
    let response = await this.http.request<unknown>({
      method,
      url: path,
      params: pickDefined(params ?? {})
    });
    let data = response.data;
    if (isApiErrorRecord(data) && (data.error || data.success === false)) {
      throw buildApiServiceError(
        { response: { status: response.status, data } },
        {
          providerLabel: 'DeskTime',
          reason: 'desktime_api_error',
          operation: path
        }
      );
    }
    return data;
  }

  async getCompany() {
    return this.request('/company');
  }

  async getEmployee(params?: { employeeId?: string; date?: string }) {
    this.validateDate(params?.date);
    this.validateName(params?.employeeId, 'employee ID');
    return this.request('/employee', {
      id: params?.employeeId,
      date: params?.date
    });
  }

  async getEmployeeByEmail(email: string, date?: string) {
    this.validateDate(date);
    this.validateName(email, 'employee email');
    return this.request('/employee', { email, date });
  }

  async getCurrentUser() {
    return this.request('/employee/basic');
  }

  async getEmployeeProjects(params?: { employeeId?: string; date?: string }) {
    this.validateDate(params?.date);
    this.validateName(params?.employeeId, 'employee ID');
    return this.request('/employee/projects', {
      id: params?.employeeId,
      date: params?.date
    });
  }

  async getEmployees(params?: { date?: string; period?: string }) {
    this.validateDate(params?.date);
    return this.request('/employees', {
      date: params?.date,
      period: params?.period
    });
  }

  async getProjects() {
    return this.request('/projects');
  }

  async createProject(project: string, task?: string) {
    this.validateName(project, 'project name');
    this.validateName(task, 'task name');
    return this.request('/create-project', { project, task }, 'POST');
  }

  async startTracking(project: string, task?: string) {
    this.validateName(project, 'project name');
    this.validateName(task, 'task name');
    let response = await this.request('/start-project', { project, task });
    if (!isApiErrorRecord(response) || response.started !== true) {
      throw createApiServiceError(
        'DeskTime did not confirm that project tracking started. Check the project and task names and your account permissions.',
        {
          reason: 'desktime_tracking_not_started'
        }
      );
    }
    return response;
  }

  async stopTracking(project: string, task?: string) {
    this.validateName(project, 'project name');
    this.validateName(task, 'task name');
    let response = await this.request('/stop-project', { project, task });
    if (!isApiErrorRecord(response) || response.stopped !== true) {
      throw createApiServiceError(
        'DeskTime did not confirm that project tracking stopped. Check the project and task names and your account permissions.',
        {
          reason: 'desktime_tracking_not_stopped'
        }
      );
    }
    return response;
  }

  async ping() {
    return this.request('/ping');
  }
}
