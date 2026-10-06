import { createApiServiceError, createAxios, pickDefined } from 'slates';
import { z } from 'zod';
import * as models from './models';
import {
  apiFailure,
  apiStatus,
  date,
  exact,
  invalid,
  paging,
  required,
  requireV1,
  response,
  routeId,
  safeResponse
} from './validation';

type Query = Record<string, string | number | boolean | undefined>;
export class RipplingClient {
  private http: ReturnType<typeof createAxios>;
  private token: string;
  constructor(config: { token: string; apiVersion?: unknown }) {
    requireV1(config.apiVersion);
    if (config.token !== config.token.trim())
      throw invalid('Provide the access token without surrounding whitespace.');
    this.token = required(config.token, 'Rippling access token');
    if (/\s/.test(this.token))
      throw invalid('Provide a Rippling access token without whitespace.');
    this.http = createAxios({
      baseURL: 'https://api.rippling.com/platform/api',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Query
  ): Promise<unknown> {
    let value: unknown;
    try {
      const result = await this.http.request<unknown>({
        method,
        url: path,
        data,
        params: params ? pickDefined(params) : undefined
      });
      value = result.data;
    } catch (error) {
      apiFailure(error, method !== 'GET');
    }
    return safeResponse(value, [this.token]);
  }
  async listEmployees(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.employee,
      await this.request('GET', '/employees', undefined, params)
    );
  }
  async listAllEmployees(params?: {
    limit?: number;
    offset?: number;
    sendAllRoles?: boolean;
  }) {
    paging(params);
    return models.collection(
      models.employee,
      await this.request('GET', '/employees/include_terminated', undefined, {
        limit: params?.limit,
        offset: params?.offset,
        send_all_roles: params?.sendAllRoles
      })
    );
  }
  async getEmployee(employeeId: string) {
    return exact(
      response(
        models.employee,
        await this.request('GET', `/employees/${routeId(employeeId)}`)
      ),
      employeeId
    );
  }
  async getCompany() {
    return response(models.company, await this.request('GET', '/companies/current'));
  }
  async listDepartments(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.orgUnit,
      await this.request('GET', '/departments', undefined, params)
    );
  }
  async listTeams(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.orgUnit,
      await this.request('GET', '/teams', undefined, params)
    );
  }
  async listWorkLocations(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.workLocation,
      await this.request('GET', '/work_locations', undefined, params)
    );
  }
  async listLevels(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.orgUnit,
      await this.request('GET', '/levels', undefined, params)
    );
  }
  async createGroup(data: { name: string; spokeId: string; userIds: string[] }) {
    const users = data.userIds.map(value => required(value, 'member role ID'));
    if (new Set(users).size !== users.length)
      throw invalid('Provide distinct group member role IDs.');
    const payload = {
      name: required(data.name, 'group name'),
      spokeId: required(data.spokeId, 'group spoke ID'),
      users
    };
    const result = response(models.group, await this.request('POST', '/groups', payload));
    if (
      result.name !== payload.name ||
      result.spokeId !== payload.spokeId ||
      result.users.length !== users.length ||
      users.some(id => !result.users.includes(id))
    )
      throw createApiServiceError(
        'Rippling did not confirm the requested group. Verify provider state before retrying.',
        { reason: 'rippling_response', parent: {} }
      );
    return result;
  }
  async getGroup(groupId: string) {
    return exact(
      response(models.group, await this.request('GET', `/groups/${routeId(groupId)}`)),
      groupId
    );
  }
  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      spokeId?: string;
      users?: string[];
      version?: number;
      versionToken?: string;
    }
  ) {
    if (data.name === undefined && data.spokeId === undefined && data.users === undefined)
      throw invalid('Provide a group name, spoke ID or member list to update.');
    if (
      data.version !== undefined &&
      (!Number.isSafeInteger(data.version) || data.version < 0)
    )
      throw invalid(
        'Legacy numeric version must be a nonnegative safe whole number; use versionToken for opaque versions.'
      );
    if (
      data.versionToken !== undefined &&
      data.version !== undefined &&
      data.versionToken !== String(data.version)
    )
      throw invalid('version and versionToken must identify the same concurrency token.');
    const current = await this.getGroup(groupId);
    const users = (data.users ?? current.users).map(value =>
      required(value, 'member role ID')
    );
    if (new Set(users).size !== users.length)
      throw invalid('Provide distinct group member role IDs.');
    const version =
      data.versionToken !== undefined
        ? data.versionToken
        : data.version !== undefined
          ? String(data.version)
          : current.version;
    required(version, 'group version token');
    const payload = {
      name: required(data.name ?? current.name, 'group name'),
      spokeId: required(data.spokeId ?? current.spokeId, 'group spoke ID'),
      users,
      version
    };
    const result = exact(
      response(
        models.group,
        await this.request('PUT', `/groups/${routeId(groupId)}`, payload)
      ),
      groupId
    );
    if (
      result.name !== payload.name ||
      result.spokeId !== payload.spokeId ||
      result.users.length !== users.length ||
      users.some(id => !result.users.includes(id))
    )
      throw createApiServiceError(
        'Rippling did not confirm the requested group change. Read its current state before retrying.',
        { reason: 'rippling_response', parent: {} }
      );
    return result;
  }
  async deleteGroup(groupId: string): Promise<void> {
    await this.getGroup(groupId);
    await this.request('DELETE', `/groups/${routeId(groupId)}`);
    try {
      await this.getGroup(groupId);
    } catch (error) {
      if (apiStatus(error) === 404) return;
      throw error;
    }
    throw createApiServiceError(
      'Rippling accepted the deletion request but the group remains readable. Verify its current state.',
      { reason: 'rippling_response', parent: {} }
    );
  }
  async listLeaveRequests(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    id?: string;
    role?: string;
    limit?: number;
    offset?: number;
  }) {
    paging(params);
    date(params?.startDate, 'startDate');
    date(params?.endDate, 'endDate');
    if (params?.startDate && params.endDate && params.startDate > params.endDate)
      throw invalid('startDate must not follow endDate.');
    return models.collection(
      models.leaveRequest,
      await this.request('GET', '/leave_requests', undefined, params)
    );
  }
  async processLeaveRequest(id: string, action: 'APPROVE' | 'DECLINE') {
    const requestedId = required(id, 'leave request ID');
    const current = await this.listLeaveRequests({ id: requestedId, limit: 1 });
    if (
      current.length !== 1 ||
      current[0]?.id !== requestedId ||
      current[0].status !== 'PENDING'
    )
      throw invalid(
        'Read an exact pending leave request before processing it; only pending requests can be approved or declined.'
      );
    const value = exact(
      response(
        models.leaveRequest,
        await this.request('POST', `/leave_requests/${routeId(id)}/process`, undefined, {
          action: action.toLowerCase()
        })
      ),
      id
    );
    if (value.status !== (action === 'APPROVE' ? 'APPROVED' : 'DECLINED'))
      throw createApiServiceError(
        'Rippling did not confirm the requested leave status. Verify the request before retrying.',
        { reason: 'rippling_response', parent: {} }
      );
    return value;
  }
  async getLeaveBalances(roleId: string) {
    const value = response(
      models.leaveBalances,
      await this.request('GET', `/leave_balances/${routeId(roleId)}`)
    );
    if (value.role !== roleId.trim())
      throw createApiServiceError('Rippling returned balances for a different employee.', {
        reason: 'rippling_response',
        parent: {}
      });
    return value;
  }
  async listLeaveTypes(params?: { managedBy?: string }) {
    return models.collection(
      models.leaveType,
      await this.request('GET', '/company_leave_types', undefined, params)
    );
  }
  async pushCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    title?: string;
    phone?: string;
    department?: string;
    startDate?: string;
    candidateId?: string;
  }) {
    date(data.startDate, 'startDate');
    if (!z.email().safeParse(data.email).success)
      throw invalid('Provide a valid candidate email address.');
    const payload = pickDefined({
      name: `${required(data.firstName, 'candidate first name')} ${required(data.lastName, 'candidate last name')}`,
      email: data.email,
      jobTitle: data.title,
      phoneNumber: data.phone,
      department: data.department,
      startDate: data.startDate,
      candidateId: data.candidateId
    });
    const result = response(
      models.candidate,
      await this.request('POST', '/ats_candidates/push_candidate', payload)
    );
    if (
      result.name !== payload.name ||
      result.email !== payload.email ||
      (data.candidateId !== undefined && result.candidateId !== data.candidateId)
    )
      throw createApiServiceError(
        'Rippling did not confirm the submitted candidate. Check onboarding state before retrying.',
        { reason: 'rippling_response', parent: {} }
      );
    return result;
  }
  async listCustomFields(params?: { limit?: number; offset?: number }) {
    paging(params);
    return models.collection(
      models.customField,
      await this.request('GET', '/custom_fields', undefined, params)
    );
  }
  async getCurrentUser() {
    return response(models.currentUser, await this.request('GET', '/me'));
  }
}
