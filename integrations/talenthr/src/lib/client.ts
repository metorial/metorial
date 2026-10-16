import { buildApiServiceError, createApiServiceError, createAxios, pickDefined } from 'slates';
import { z } from 'zod';

const api = createAxios({
  baseURL: 'https://pubapi.talenthr.io/v1',
  headers: { Accept: 'application/json' }
});

const record = z.record(z.string(), z.unknown());
const namedItem = z.object({ id: z.number(), name: z.string() }).passthrough();
const namedList = z.object({ data: z.array(namedItem) }).passthrough();
const createdItem = z.object({ success: z.literal(true), data: namedItem }).passthrough();
const employeeProfile = z
  .object({
    id: z.number(),
    user: z
      .object({ first_name: z.string(), last_name: z.string(), email: z.string() })
      .passthrough()
  })
  .passthrough();
const directoryResponse = z
  .object({
    data: z
      .object({
        rows: z.array(
          z
            .object({
              id: z.number(),
              user_id: z.number(),
              first_name: z.string(),
              last_name: z.string(),
              email: z.string(),
              division_id: z.number().nullable(),
              division: z.string().nullable(),
              employment_status_id: z.number(),
              employment_status_name: z.string(),
              department_id: z.number().nullable(),
              department: z.string().nullable(),
              job_title_id: z.number().nullable(),
              job_title: z.string().nullable(),
              location_id: z.number().nullable(),
              location: z.string().nullable(),
              termination_date: z.string().nullable(),
              hire_date: z.string(),
              reports_to_employee_id: z.number().nullable(),
              photo_url: z.string().nullable(),
              user_role: z.object({ name: z.string() }).passthrough()
            })
            .passthrough()
        ),
        total: z.number().optional()
      })
      .passthrough()
  })
  .passthrough();
const timeOffResponse = z
  .object({
    data: z
      .object({
        rows: z.array(
          z
            .object({
              id: z.number(),
              timeoff_type_name: z.string(),
              start_date: z.string(),
              end_date: z.string(),
              status: z.string().optional(),
              approved: z.boolean().nullable().optional(),
              is_canceled: z.boolean().optional()
            })
            .passthrough()
        ),
        total: z.number().optional()
      })
      .passthrough()
  })
  .passthrough();
const applicant = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    created_at: z.string(),
    starred: z.boolean(),
    added_at: z.string()
  })
  .passthrough();
const applicantsResponse = (position: boolean) =>
  z
    .object({
      data: z
        .object({
          rows: z.array(
            position
              ? applicant.extend({
                  updated_at: z.string().optional(),
                  applications_count: z.number().optional(),
                  application: record.optional()
                })
              : applicant.extend({ updated_at: z.string(), applications_count: z.number() })
          ),
          total: z.number().optional()
        })
        .passthrough()
    })
    .passthrough();

export function providerId(value: string | number, name: string): number {
  if (
    (typeof value === 'string' && !/^\d+$/.test(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    throw createApiServiceError(`${name} must be a positive integer ID.`);
  }
  return Number(value);
}

export function validateDate(value: string, name: string, monthAllowed = false): void {
  const fullDate = monthAllowed && /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fullDate) ||
    !Number.isFinite(Date.parse(`${fullDate}T00:00:00Z`)) ||
    new Date(`${fullDate}T00:00:00Z`).toISOString().slice(0, 10) !== fullDate
  ) {
    throw createApiServiceError(
      `${name} must be a valid ${monthAllowed ? 'YYYY-MM or YYYY-MM-DD' : 'YYYY-MM-DD'} date.`
    );
  }
}

export function validateText(value: string, name: string, maximum: number): void {
  if (!value.trim() || value.length > maximum) {
    throw createApiServiceError(`${name} must contain 1 to ${maximum} characters.`);
  }
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A TalentHR API key is required.');
    this.token = config.token;
  }

  private async request<S extends z.ZodType>(options: {
    method?: string;
    path: string;
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
    schema: S;
  }): Promise<z.infer<S>> {
    try {
      const response = await api({
        method: options.method ?? 'GET',
        url: options.path,
        params: options.params,
        data: options.data,
        auth: { username: this.token, password: 'c' }
      });
      if (response.data?.success === false || response.data?.error) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'TalentHR',
            operation: options.path,
            reason: 'talenthr_api_failed',
            extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
          }
        );
      }
      const result = options.schema.safeParse(response.data);
      if (!result.success) {
        throw createApiServiceError(
          `TalentHR returned an invalid response for ${options.path}.`,
          {
            reason: 'talenthr_invalid_response'
          }
        );
      }
      return result.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'TalentHR',
        operation: options.path,
        reason: 'talenthr_api_failed',
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
      });
    }
  }

  private pagination(params: { limit?: number; offset?: number } = {}) {
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 100.');
    }
    if (
      params.offset !== undefined &&
      (!Number.isSafeInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a nonnegative whole number.');
    }
    return pickDefined(params);
  }

  async hireEmployee(data: Record<string, unknown>) {
    return this.request({
      method: 'POST',
      path: '/employees/hire',
      data,
      schema: z
        .object({ success: z.literal(true), data: z.object({ id: z.number() }).passthrough() })
        .passthrough()
    });
  }

  async getEmployee(employeeId: string) {
    return this.request({
      path: `/employees/${providerId(employeeId, 'employeeId')}`,
      schema: employeeProfile
    });
  }

  async updateEmployee(employeeId: string, data: Record<string, unknown>) {
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one employee field to update.');
    if (
      data.first_name === undefined ||
      data.last_name === undefined ||
      data.email === undefined
    ) {
      const current = await this.getEmployee(employeeId);
      data = {
        ...data,
        first_name: data.first_name ?? current.user.first_name,
        last_name: data.last_name ?? current.user.last_name,
        email: data.email ?? current.user.email
      };
    }
    return this.request({
      method: 'PUT',
      path: `/employees/${providerId(employeeId, 'employeeId')}`,
      data,
      schema: z
        .object({ success: z.literal(true), data: z.object({ id: z.number() }).passthrough() })
        .passthrough()
    });
  }

  async listEmployees(params?: {
    limit?: number;
    offset?: number;
    filter?: string;
    custom_fields?: string;
  }) {
    const { filter, custom_fields, ...paging } = params ?? {};
    return this.request({
      path: '/directory',
      params: { ...this.pagination(paging), ...pickDefined({ filter, custom_fields }) },
      schema: directoryResponse
    });
  }

  async listDepartments() {
    return this.request({ path: '/departments', schema: namedList });
  }
  async createDepartment(name: string) {
    validateText(name, 'name', 255);
    return this.request({
      method: 'POST',
      path: '/departments',
      data: { name },
      schema: createdItem
    });
  }
  async listDivisions() {
    return this.request({ path: '/divisions', schema: namedList });
  }
  async createDivision(name: string) {
    validateText(name, 'name', 255);
    return this.request({
      method: 'POST',
      path: '/divisions',
      data: { name },
      schema: createdItem
    });
  }
  async listJobTitles() {
    return this.request({ path: '/job-titles', schema: namedList });
  }
  async createJobTitle(name: string) {
    validateText(name, 'name', 255);
    return this.request({
      method: 'POST',
      path: '/job-titles',
      data: { name },
      schema: createdItem
    });
  }
  async listLocations() {
    return this.request({ path: '/locations', schema: namedList });
  }
  async createLocation(name: string, address?: string, isRemote?: boolean) {
    validateText(name, 'name', 255);
    if (address === undefined || isRemote === undefined)
      throw createApiServiceError(
        'TalentHR requires address and isRemote to create a location.'
      );
    validateText(address, 'address', 100);
    return this.request({
      method: 'POST',
      path: '/locations',
      data: { name, field_data: { address, is_remote: isRemote } },
      schema: createdItem
    });
  }
  async listEmploymentStatuses() {
    return this.request({ path: '/employment-statuses', schema: namedList });
  }

  async listTimeOffRequests(
    employeeId: string,
    params?: { limit?: number; offset?: number; sort?: string }
  ) {
    const { sort, ...paging } = params ?? {};
    return this.request({
      path: `/employees/${providerId(employeeId, 'employeeId')}/time-off-requests`,
      params: { ...this.pagination(paging), ...pickDefined({ sort }) },
      schema: timeOffResponse
    });
  }

  async respondToTimeOffRequest(employeeId: string, requestId: string, accept: boolean) {
    return this.request({
      method: 'POST',
      path: `/employees/${providerId(employeeId, 'employeeId')}/time-off-requests/${providerId(requestId, 'timeOffRequestId')}/reply`,
      data: { accept },
      schema: z.object({ success: z.literal(true) }).passthrough()
    });
  }

  async listJobPositions() {
    return this.request({
      path: '/job-positions',
      schema: z
        .object({
          data: z.array(
            z.object({ id: z.number(), job_position_title: z.string() }).passthrough()
          )
        })
        .passthrough()
    });
  }

  async listJobApplications(params?: {
    limit?: number;
    offset?: number;
    jobPositionId?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const { jobPositionId, search, sort, order, ...paging } = params ?? {};
    const path =
      jobPositionId !== undefined
        ? `/job-positions/${providerId(jobPositionId, 'jobPositionId')}/ats-applicants`
        : '/ats-applicants';
    return this.request({
      path,
      params: { ...this.pagination(paging), ...pickDefined({ search, sort, order }) },
      schema: applicantsResponse(jobPositionId !== undefined)
    });
  }

  async listNationalities() {
    return this.request({
      path: '/nationalities',
      schema: z.object({ data: z.array(z.string()) }).passthrough()
    });
  }
  async listCountries() {
    return this.request({
      path: '/countries',
      schema: z.object({ data: z.array(z.string()) }).passthrough()
    });
  }
  async listRelationshipTypes() {
    return this.request({ path: '/relationship-types', schema: namedList });
  }
  async listLanguages() {
    return this.request({ path: '/languages', schema: namedList });
  }
  async listTimeOffTypes() {
    return this.request({ path: '/time-off-types', schema: namedList });
  }

  async getTimeOffBudgets(
    employeeId: string,
    params: { active?: number; time_off_cycle_id?: number }
  ) {
    if (params.time_off_cycle_id !== undefined)
      providerId(params.time_off_cycle_id, 'timeOffCycleId');
    return this.request({
      path: `/employees/${providerId(employeeId, 'employeeId')}/time-off-budgets`,
      params: pickDefined(params),
      schema: z
        .object({
          data: z.array(
            z
              .object({
                id: z.number(),
                employee_id: z.number(),
                timeoff_type_id: z.number(),
                timeoff_type_name: z.string(),
                budget: z.string(),
                original_budget: z.string(),
                used_budget: z.string()
              })
              .passthrough()
          )
        })
        .passthrough()
    });
  }

  async getCalendar(params: {
    start_date: string;
    end_date?: string;
    employee_id?: string;
    filter?: string;
  }) {
    validateDate(params.start_date, 'startDate', true);
    if (params.end_date !== undefined) {
      validateDate(params.end_date, 'endDate');
      const start = new Date(
        params.start_date.length === 7
          ? `${params.start_date}-01T00:00:00Z`
          : `${params.start_date}T00:00:00Z`
      );
      const end = new Date(`${params.end_date}T00:00:00Z`);
      const maximum = new Date(start);
      maximum.setUTCFullYear(maximum.getUTCFullYear() + 2);
      if (end < start || end > maximum)
        throw createApiServiceError(
          'endDate must be on or after startDate and no more than two years later.'
        );
    }
    if (params.employee_id !== undefined) providerId(params.employee_id, 'employeeId');
    return this.request({
      path: '/calendar',
      params: pickDefined(params),
      schema: z
        .object({ data: z.object({ employees: z.array(record) }).passthrough() })
        .passthrough()
    });
  }

  async listAllPaginated<T extends { id: number }>(
    fetchFn: (params: { limit: number; offset: number }) => Promise<{ data: { rows: T[] } }>,
    maxResults?: number
  ): Promise<T[]> {
    if (maxResults !== undefined && (!Number.isSafeInteger(maxResults) || maxResults < 1))
      throw createApiServiceError('maxResults must be a positive whole number.');
    const results: T[] = [];
    for (let offset = 0; ; offset += 100) {
      const response = await fetchFn({ limit: 100, offset });
      if (!Array.isArray(response?.data?.rows))
        throw createApiServiceError('TalentHR returned invalid paginated rows.');
      results.push(...response.data.rows);
      if (maxResults !== undefined && results.length >= maxResults)
        return results.slice(0, maxResults);
      if (response.data.rows.length < 100) return results;
    }
  }
}
