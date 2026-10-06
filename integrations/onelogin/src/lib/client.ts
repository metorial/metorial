import { createApiServiceError, createAuthenticatedAxios, getApiErrorStatus } from 'slates';
import { z } from 'zod';
import * as contracts from './contracts';
import { CredentialGuard, fail, positiveId, registrationId, tenant, text } from './validation';

type Params = Record<string, string | number | undefined>;
type Context = {
  auth: { token: string; refreshToken?: string; subdomain?: string };
  config: { subdomain?: unknown };
  input: unknown;
};

export class OneLoginClient {
  private readonly axios;
  private readonly guard;
  static fromContext(ctx: Context) {
    const client = new OneLoginClient({
      token: ctx.auth.token,
      refreshToken: ctx.auth.refreshToken,
      subdomain: ctx.auth.subdomain ?? ctx.config.subdomain
    });
    client.guard.check(ctx.input);
    return client;
  }
  constructor(config: { token: string; refreshToken?: string; subdomain: unknown }) {
    const host = tenant(config.subdomain);
    const token = text(config.token, 'OneLogin access token');
    if (/\s/.test(token)) fail('The OneLogin access token must not contain whitespace.');
    this.guard = new CredentialGuard([token, config.refreshToken]);
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${host}.onelogin.com`,
      authHeader: { value: `bearer ${token}` },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: Record<string, unknown>,
    params?: Params,
    statuses = [200]
  ) {
    this.guard.check([data, params]);
    let response: Awaited<ReturnType<typeof this.axios.request<unknown>>>;
    try {
      response = await this.axios.request<unknown>({ method, url, data, params });
    } catch (error) {
      const status = getApiErrorStatus(error);
      throw createApiServiceError(
        'The OneLogin request failed. Check the original tenant, API permissions and exact resource ID before retrying; a write may have taken effect.',
        {
          upstreamStatus:
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
              ? status
              : undefined
        }
      );
    }
    this.guard.check([response.data, response.headers]);
    if (!statuses.includes(response.status)) {
      throw createApiServiceError(
        'OneLogin did not acknowledge this request with its documented success status. Check API permissions and reconcile any preceding write before retrying.',
        { upstreamStatus: response.status }
      );
    }
    return response;
  }
  private clean(params: Params = {}, maxLimit = 50): Params {
    const result: Params = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (key === 'limit') {
        positiveId(value, 'Page limit');
        if (Number(value) > maxLimit) fail(`Page limit must not exceed ${maxLimit}.`);
      } else if (key === 'client_id' || key === 'external_id') text(value, key);
      else if (key === 'page' || key.endsWith('_id')) positiveId(value, key);
      else if (typeof value === 'string') text(value, key);
      result[key] = value;
    }
    if (result.cursor !== undefined && result.page !== undefined)
      fail('Use either a cursor or a page number, not both.');
    return result;
  }
  private async page<T>(url: string, schema: z.ZodType<T>, params: Params, maxLimit: number) {
    const clean = this.clean(params, maxLimit);
    const response = await this.request('GET', url, undefined, clean);
    const readHeader = (name: string) => {
      const value = response.headers[name];
      if (value === undefined || value === null || value === '') return null;
      if (typeof value !== 'string') fail('OneLogin returned an invalid pagination header.');
      return value;
    };
    const readCount = (name: string) => {
      const value = readHeader(name);
      if (value === null) return null;
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
        fail('OneLogin returned an invalid pagination count.');
      return Number(value);
    };
    const pagination = contracts.parse(contracts.publicPagination, {
      afterCursor: readHeader('after-cursor'),
      beforeCursor: readHeader('before-cursor'),
      currentPage: readCount('current-page'),
      totalPages: readCount('total-pages'),
      totalCount: readCount('total-count')
    });
    if (pagination.afterCursor !== null && pagination.afterCursor === clean.cursor)
      fail(
        'OneLogin repeated the requested cursor. Continue only after reconciling the page in OneLogin.'
      );
    return { data: contracts.parse(z.array(schema), response.data), pagination };
  }
  private async v1Page<T>(url: string, schema: z.ZodType<T>, params: Params = {}) {
    const response = await this.request('GET', url, undefined, this.clean(params));
    const result = contracts.parse(
      contracts.v1Status.extend({
        data: z.array(schema),
        pagination: contracts.nativePagination
      }),
      response.data
    );
    if (
      result.pagination.after_cursor &&
      result.pagination.after_cursor === params.after_cursor
    )
      fail('OneLogin repeated the requested cursor.');
    return result;
  }
  private async exact<T extends { id: number }>(
    method: 'GET' | 'PUT',
    path: string,
    schema: z.ZodType<T>,
    id: number,
    data?: Record<string, unknown>,
    params?: Params
  ) {
    positiveId(id);
    const response = await this.request(method, `${path}/${id}`, data, params);
    const result = contracts.parse(schema, response.data);
    if (result.id !== id)
      fail(
        'OneLogin returned a different resource ID. A preceding write may have taken effect; reconcile the requested resource before retrying.'
      );
    return result;
  }
  private async remove(path: string, id: number) {
    positiveId(id);
    const response = await this.request(
      'DELETE',
      `${path}/${id}`,
      undefined,
      undefined,
      [204]
    );
    if (response.data !== '' && response.data !== undefined && response.data !== null)
      fail(
        'OneLogin returned an unexpected deletion body. Reconcile the resource before retrying.'
      );
  }
  private userBody(data: Record<string, unknown>, creating: boolean) {
    if (
      creating &&
      !(
        (typeof data.email === 'string' && data.email.trim()) ||
        (typeof data.username === 'string' && data.username.trim())
      )
    )
      fail('Provide email or username before creating a user.');
    if (Object.keys(data).length === 0) fail('Provide at least one user field to update.');
    if (data.password !== undefined || data.password_confirmation !== undefined) {
      text(data.password, 'Password');
      if (data.password !== data.password_confirmation)
        fail('Password and passwordConfirmation must both be supplied and match.');
    }
    for (const key of ['group_id', 'manager_user_id', 'directory_id'])
      if (data[key] !== undefined) positiveId(data[key], key);
    if (data.role_ids !== undefined)
      contracts.parse(
        z.array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
        data.role_ids
      );
    if (data.status !== undefined && ![0, 1, 2, 3, 4, 5, 7, 8].includes(Number(data.status)))
      fail('Use a documented OneLogin user status code.');
    if (data.state !== undefined && ![0, 1, 2, 3].includes(Number(data.state)))
      fail('Use a documented OneLogin user state code.');
  }
  listUsers(params: Params = {}) {
    return this.page('/api/2/users', contracts.user, params, 50);
  }
  getUser(id: number) {
    return this.exact('GET', '/api/2/users', contracts.user, id);
  }
  async createUser(data: Record<string, unknown>) {
    this.userBody(data, true);
    return contracts.parse(
      contracts.user,
      (await this.request('POST', '/api/2/users', data, undefined, [201])).data
    );
  }
  updateUser(id: number, data: Record<string, unknown>, params?: Params) {
    this.userBody(data, false);
    return this.exact('PUT', '/api/2/users', contracts.user, id, data, params);
  }
  deleteUser(id: number) {
    return this.remove('/api/2/users', id);
  }
  listRoles(params: Params = {}) {
    return this.page('/api/2/roles', contracts.role, params, 650);
  }
  getRole(id: number) {
    return this.exact('GET', '/api/2/roles', contracts.role, id);
  }
  async createRole(data: Record<string, unknown>) {
    text(data.name, 'Role name');
    for (const key of ['apps', 'users', 'admins'])
      if (data[key] !== undefined)
        contracts.parse(
          z.array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
          data[key]
        );
    const result = contracts.parse(
      z
        .array(z.object({ id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }))
        .length(1),
      (await this.request('POST', '/api/2/roles', data, undefined, [201])).data
    );
    return result[0]!;
  }
  async updateRole(id: number, data: Record<string, unknown>) {
    if (['apps', 'users', 'admins'].some(key => data[key] !== undefined))
      fail(
        'Role update supports name only. Use OneLogin role association APIs or the admin console for apps, users and admins; no association changes were sent.'
      );
    text(data.name, 'Role name');
    return this.exact(
      'PUT',
      '/api/2/roles',
      z.object({ id: z.number().int().positive() }),
      id,
      data
    );
  }
  deleteRole(id: number) {
    return this.remove('/api/2/roles', id);
  }
  listApps(params: Params = {}) {
    return this.page('/api/2/apps', contracts.app, params, 1000);
  }
  getApp(id: number) {
    return this.exact('GET', '/api/2/apps', contracts.app, id);
  }
  private appBody(data: Record<string, unknown>, creating: boolean) {
    if (creating) {
      positiveId(data.connector_id, 'Connector ID');
      text(data.name, 'Application name');
    }
    if (Object.keys(data).length === 0)
      fail('Provide at least one application field to update.');
    if (data.policy_id !== undefined) positiveId(data.policy_id, 'Policy ID');
  }
  async createApp(data: Record<string, unknown>) {
    this.appBody(data, true);
    return contracts.parse(
      contracts.app,
      (await this.request('POST', '/api/2/apps', data, undefined, [201])).data
    );
  }
  updateApp(id: number, data: Record<string, unknown>) {
    this.appBody(data, false);
    return this.exact('PUT', '/api/2/apps', contracts.app, id, data);
  }
  deleteApp(id: number) {
    return this.remove('/api/2/apps', id);
  }
  listGroups(params: Params = {}) {
    return this.v1Page('/api/1/groups', contracts.group, params);
  }
  getGroup(id: number) {
    return this.exact('GET', '/api/2/groups', contracts.fullGroup, id);
  }
  listEvents(params: Params = {}) {
    return this.v1Page('/api/1/events', contracts.event, params);
  }
  async getEventTypes() {
    return contracts.parse(
      z.array(contracts.eventType),
      (await this.request('GET', '/api/2/events/types')).data
    );
  }
  async getAvailableFactors(userId: number) {
    positiveId(userId, 'User ID');
    return contracts.parse(
      z.array(contracts.factor),
      (await this.request('GET', `/api/2/mfa/users/${userId}/factors`)).data
    );
  }
  async getEnrolledDevices(userId: number) {
    positiveId(userId, 'User ID');
    return contracts.parse(
      z.array(contracts.device),
      (await this.request('GET', `/api/2/mfa/users/${userId}/devices`)).data
    );
  }
  async enrollFactor(userId: number, data: Record<string, unknown>) {
    positiveId(userId, 'User ID');
    positiveId(data.factor_id, 'Factor ID');
    text(data.display_name, 'Display name');
    if (
      data.expires_in !== undefined &&
      (!/^\d+$/.test(String(data.expires_in)) ||
        Number(data.expires_in) < 120 ||
        Number(data.expires_in) > 900)
    )
      fail('expiresIn must be an integer from 120 to 900 seconds.');
    const available = await this.getAvailableFactors(userId);
    const selected = available.find(item => item.factor_id === data.factor_id);
    if (!selected)
      fail('The exact factor ID is not currently available to enroll for this user.');
    const factorFamily = (name: string | null | undefined) => {
      if (name === 'OneLogin Voice') return 'Voice';
      if (name === 'OneLogin Email') return 'Email';
      return name;
    };
    const selectedFamily = factorFamily(selected.auth_factor_name);
    if (data.verified === true && !['SMS', 'Voice', 'Email'].includes(selectedFamily ?? ''))
      fail('Pre-verification is supported only for SMS, Voice or Email.');
    if (data.custom_message !== undefined && selectedFamily !== 'SMS')
      fail('Custom messages are supported only for SMS enrollment.');
    if (data.verified === true) {
      const user = await this.getUser(userId);
      const contact = selectedFamily === 'Email' ? user.email : user.phone;
      text(contact, 'Existing user contact for pre-verification');
    }
    const response = await this.request(
      'POST',
      `/api/2/mfa/users/${userId}/registrations`,
      data,
      undefined,
      [200, 201]
    );
    const result = contracts.parse(z.array(contracts.enrollment).length(1), response.data)[0]!;
    if (
      selectedFamily != null &&
      result.auth_factor_name != null &&
      factorFamily(result.auth_factor_name) !== selectedFamily
    )
      fail(
        'OneLogin returned a different authenticator family. Enrollment may have taken effect; reconcile the selected factor and registration before verification or retrying.'
      );
    return result;
  }
  private async registration(userId: number, id: string, otp?: string) {
    positiveId(userId, 'User ID');
    registrationId(id);
    let data: Record<string, unknown> | undefined;
    if (otp !== undefined) {
      if (!/^\d{1,10}$/.test(otp) || !Number.isSafeInteger(Number(otp)))
        fail(
          'Supply the numeric OTP exactly as provided, or use poll=true for supported push/voice enrollment.'
        );
      data = { otp: Number(otp) };
    }
    const response = await this.request(
      otp === undefined ? 'GET' : 'PUT',
      `/api/2/mfa/users/${userId}/registrations/${id}`,
      data
    );
    const result = contracts.parse(z.array(contracts.enrollment).length(1), response.data)[0]!;
    if (result.id.toLowerCase() !== id.toLowerCase())
      fail(
        'OneLogin returned a different registration ID; reconcile enrollment before retrying.'
      );
    return result;
  }
  verifyEnrollment(userId: number, id: string, otp: string) {
    return this.registration(userId, id, otp);
  }
  pollEnrollment(userId: number, id: string) {
    return this.registration(userId, id);
  }
  private async rolesForUser(
    userId: number,
    roleIds: number[],
    action: 'add_roles' | 'remove_roles'
  ) {
    positiveId(userId, 'User ID');
    contracts.parse(
      z.array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)).min(1),
      roleIds
    );
    if (new Set(roleIds).size !== roleIds.length) fail('Provide each role ID only once.');
    const response = await this.request('PUT', `/api/1/users/${userId}/${action}`, {
      role_id_array: roleIds
    });
    contracts.parse(contracts.v1Status, response.data);
  }
  assignRolesToUser(userId: number, roleIds: number[]) {
    return this.rolesForUser(userId, roleIds, 'add_roles');
  }
  removeRolesFromUser(userId: number, roleIds: number[]) {
    return this.rolesForUser(userId, roleIds, 'remove_roles');
  }
}
