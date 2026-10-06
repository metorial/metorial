import { pickDefined } from 'slates';
import { credential, host, requireValue, resourceId, safeJson, upstream } from './contracts';
import { canonicalizeParams, signRequest } from './hmac';
import { createDuoAxios } from './http';
import { validateNative } from './models';

export interface DuoAuth {
  integrationKey: string;
  secretKey: string;
  apiHostname: string;
  signingVersion?: 'v2' | 'v5';
}

export interface DuoResponse<T = any> {
  stat: string;
  response: T;
  metadata?: {
    total_objects?: number;
    next_offset?: number | string[];
  };
}

export interface PaginatedResult<T> {
  items: T[];
  totalObjects: number;
  hasMore: boolean;
  nextOffset?: number;
}

export class DuoClient {
  private auth: DuoAuth;

  constructor(auth: DuoAuth) {
    credential(auth.integrationKey);
    credential(auth.secretKey);
    resourceId(auth.integrationKey);
    requireValue(
      auth.signingVersion === undefined || ['v2', 'v5'].includes(auth.signingVersion),
      'Select v2 or v5 Duo request signing.'
    );
    this.auth = { ...auth, apiHostname: host(auth.apiHostname) };
  }
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    params: Record<string, unknown> = {}
  ): Promise<DuoResponse<T>> {
    requireValue(
      /^\/admin\/v[123]\/[A-Za-z0-9_/-]+$/.test(path) &&
        !path.includes('//') &&
        !path.includes('..'),
      'Use a supported Duo Admin API route.'
    );
    const clean = pickDefined(params);
    safeJson(clean, [this.auth.secretKey]);
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(clean)) {
      requireValue(
        ['string', 'number', 'boolean'].includes(typeof value),
        'Duo parameters must be scalar values.'
      );
      flat[key] = String(value);
    }
    const version = this.auth.signingVersion ?? 'v2';
    const query = method === 'POST' ? '' : canonicalizeParams(flat);
    const body =
      method === 'POST'
        ? version === 'v2'
          ? canonicalizeParams(flat)
          : JSON.stringify(clean)
        : undefined;
    const signed = await signRequest({
      ...this.auth,
      method,
      path,
      params: version === 'v2' || method !== 'POST' ? flat : {},
      version,
      body
    });
    const secrets = [
      this.auth.secretKey,
      signed.authorization,
      signed.authorization.slice(6),
      Buffer.from(signed.authorization.slice(6), 'base64').toString().split(':')[1]!
    ];
    try {
      const client = createDuoAxios(
        {
          baseURL: `https://${this.auth.apiHostname}`,
          timeout: 30000,
          maxRedirects: 0,
          maxContentLength: 4 * 1024 * 1024,
          maxBodyLength: 1024 * 1024,
          errorMapping: {
            mapAxiosError: () => ({
              message:
                'Duo request failed. Verify Admin API grants, application type and clock synchronization.'
            })
          }
        },
        secrets
      );
      const response = await client.request({
        method,
        url: path + (query ? '?' + query : ''),
        data: body,
        headers: {
          Authorization: signed.authorization,
          Date: signed.date,
          ...(method === 'POST'
            ? {
                'Content-Type':
                  version === 'v2' ? 'application/x-www-form-urlencoded' : 'application/json'
              }
            : {})
        }
      });
      safeJson(response.data, secrets);
      requireValue(response.status === 200, 'Duo returned an unexpected HTTP status.');
      validateNative(method, path, response.data);
      const result = response.data as DuoResponse<T>;
      const segment = path.split('/'),
        kind = segment[3],
        id = segment[4];
      if (id && !['enroll'].includes(id) && segment.length === 5 && method !== 'DELETE') {
        const row = result.response as Record<string, unknown>,
          field =
            kind === 'integrations'
              ? 'integration_key'
              : kind === 'users'
                ? 'user_id'
                : kind === 'groups'
                  ? 'group_id'
                  : kind === 'phones'
                    ? 'phone_id'
                    : kind === 'admins'
                      ? 'admin_id'
                      : undefined;
        if (field)
          requireValue(row[field] === id, 'Duo returned a different resource than requested.');
      }
      return result;
    } catch (error) {
      throw upstream(
        error,
        method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'write'
      );
    }
  }
  get<T = any>(path: string, params: Record<string, unknown> = {}) {
    return this.request<T>('GET', path, params);
  }
  post<T = any>(path: string, params: Record<string, unknown> = {}) {
    return this.request<T>('POST', path, params);
  }
  delete<T = any>(path: string, params: Record<string, unknown> = {}) {
    return this.request<T>('DELETE', path, params);
  }
  // ========================
  // Users
  // ========================

  async listUsers(
    params: { limit?: number; offset?: number; username?: string; email?: string } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/users', {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      ...(params.username !== undefined ? { username: params.username } : {}),
      ...(params.email !== undefined ? { email: params.email } : {})
    });
  }

  async getUser(userId: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/users/${resourceId(userId)}`);
  }

  async createUser(params: {
    username: string;
    email?: string;
    realname?: string;
    firstname?: string;
    lastname?: string;
    status?: string;
    notes?: string;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/users', params);
  }

  async updateUser(
    userId: string,
    params: {
      username?: string;
      email?: string;
      realname?: string;
      firstname?: string;
      lastname?: string;
      status?: string;
      notes?: string;
    }
  ): Promise<DuoResponse<any>> {
    return this.post(`/admin/v1/users/${resourceId(userId)}`, params);
  }

  async deleteUser(userId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${resourceId(userId)}`);
  }

  async enrollUser(params: {
    username: string;
    email: string;
    validSecs?: number;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/users/enroll', {
      username: params.username,
      email: params.email,
      ...(params.validSecs !== undefined ? { valid_secs: params.validSecs } : {})
    });
  }

  async getUserGroups(userId: string): Promise<DuoResponse<any[]>> {
    return this.get(`/admin/v1/users/${resourceId(userId)}/groups`);
  }

  async associateUserGroup(userId: string, groupId: string): Promise<DuoResponse<string>> {
    return this.post(`/admin/v1/users/${resourceId(userId)}/groups`, { group_id: groupId });
  }

  async disassociateUserGroup(userId: string, groupId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${resourceId(userId)}/groups/${resourceId(groupId)}`);
  }

  async getUserPhones(userId: string): Promise<DuoResponse<any[]>> {
    return this.get(`/admin/v1/users/${resourceId(userId)}/phones`);
  }

  async associateUserPhone(userId: string, phoneId: string): Promise<DuoResponse<string>> {
    return this.post(`/admin/v1/users/${resourceId(userId)}/phones`, { phone_id: phoneId });
  }

  async disassociateUserPhone(userId: string, phoneId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${resourceId(userId)}/phones/${resourceId(phoneId)}`);
  }

  async createBypassCodes(
    userId: string,
    params: {
      count?: number;
      validSecs?: number;
    } = {}
  ): Promise<DuoResponse<string[]>> {
    return this.post(`/admin/v1/users/${resourceId(userId)}/bypass_codes`, {
      ...(params.count ? { count: params.count } : {}),
      ...(params.validSecs !== undefined ? { valid_secs: params.validSecs } : {})
    });
  }

  // ========================
  // Groups
  // ========================

  async listGroups(
    params: { limit?: number; offset?: number } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/groups', {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0
    });
  }

  async getGroup(groupId: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/groups/${resourceId(groupId)}`);
  }

  async createGroup(params: {
    name: string;
    desc?: string;
    status?: string;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/groups', params);
  }

  async deleteGroup(groupId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/groups/${resourceId(groupId)}`);
  }

  // ========================
  // Phones
  // ========================

  async listPhones(
    params: { limit?: number; offset?: number } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/phones', {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0
    });
  }

  async getPhone(phoneId: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/phones/${resourceId(phoneId)}`);
  }

  async createPhone(params: {
    number?: string;
    name?: string;
    type?: string;
    platform?: string;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/phones', params);
  }

  async updatePhone(
    phoneId: string,
    params: {
      number?: string;
      name?: string;
      type?: string;
      platform?: string;
    }
  ): Promise<DuoResponse<any>> {
    return this.post(`/admin/v1/phones/${resourceId(phoneId)}`, params);
  }

  async deletePhone(phoneId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/phones/${resourceId(phoneId)}`);
  }

  // ========================
  // Admins
  // ========================

  async listAdmins(
    params: { limit?: number; offset?: number } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/admins', {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0
    });
  }

  async getAdmin(adminId: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/admins/${resourceId(adminId)}`);
  }

  async createAdmin(params: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/admins', params);
  }

  async updateAdmin(
    adminId: string,
    params: {
      name?: string;
      phone?: string;
      role?: string;
    }
  ): Promise<DuoResponse<any>> {
    return this.post(`/admin/v1/admins/${resourceId(adminId)}`, params);
  }

  async deleteAdmin(adminId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/admins/${resourceId(adminId)}`);
  }

  // ========================
  // Integrations (Applications)
  // ========================

  async listIntegrations(
    params: { limit?: number; offset?: number } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get(
      this.auth.signingVersion !== 'v5' ? '/admin/v1/integrations' : '/admin/v3/integrations',
      {
        limit: params.limit ?? 100,
        offset: params.offset ?? 0
      }
    );
  }

  async getIntegration(integrationKey: string): Promise<DuoResponse<any>> {
    return this.get(
      `/admin/${this.auth.signingVersion !== 'v5' ? 'v1' : 'v3'}/integrations/${resourceId(integrationKey)}`
    );
  }

  async deleteIntegration(integrationKey: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/integrations/${resourceId(integrationKey)}`);
  }

  // ========================
  // Logs
  // ========================

  async getAuthenticationLogsV2(params: {
    mintime: string;
    maxtime: string;
    limit?: number;
    nextOffset?: string[];
    sort?: string;
    users?: string;
    applications?: string;
    results?: string;
    factors?: string;
    eventTypes?: string;
    groups?: string;
    reasons?: string;
  }): Promise<DuoResponse<{ authlogs: any[]; metadata: any }>> {
    let queryParams: Record<string, any> = {
      mintime: params.mintime,
      maxtime: params.maxtime,
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.sort ? { sort: params.sort } : {})
    };

    if (params.nextOffset && params.nextOffset.length === 2) {
      queryParams.next_offset = params.nextOffset.join(',');
    }

    for (const name of [
      'users',
      'applications',
      'results',
      'factors',
      'groups',
      'reasons'
    ] as const)
      if (params[name] !== undefined) queryParams[name] = params[name];
    if (params.eventTypes !== undefined) queryParams.event_types = params.eventTypes;
    return this.get('/admin/v2/logs/authentication', queryParams);
  }

  async getAdministratorLogs(params: {
    mintime: string;
    maxtime?: string;
    limit?: number;
    offset?: number;
  }): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/logs/administrator', {
      mintime: params.mintime,
      ...(params.maxtime ? { maxtime: params.maxtime } : {}),
      ...(params.limit ? { limit: params.limit } : {})
    });
  }

  async getTelephonyLogs(params: {
    mintime: string;
    maxtime?: string;
    limit?: number;
    offset?: number;
  }): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/logs/telephony', {
      mintime: params.mintime,
      ...(params.maxtime ? { maxtime: params.maxtime } : {}),
      ...(params.limit ? { limit: params.limit } : {})
    });
  }

  // ========================
  // Account Settings
  // ========================

  async getAccountSettings(): Promise<DuoResponse<any>> {
    return this.get('/admin/v1/settings');
  }

  async updateAccountSettings(params: {
    lockoutThreshold?: number;
    lockoutExpireDurationSecs?: number;
    inactiveUserExpiration?: number;
    callerID?: string;
    fraudEmail?: string;
    fraudEmailEnabled?: boolean;
    keystrokesEnabled?: boolean;
    userTelephonyCostMax?: number;
  }): Promise<DuoResponse<any>> {
    let postParams: Record<string, any> = {};
    if (params.lockoutThreshold !== undefined)
      postParams.lockout_threshold = params.lockoutThreshold;
    if (params.lockoutExpireDurationSecs !== undefined)
      postParams.lockout_expire_duration_secs = params.lockoutExpireDurationSecs;
    if (params.inactiveUserExpiration !== undefined)
      postParams.inactive_user_expiration = params.inactiveUserExpiration;
    if (params.callerID !== undefined) postParams.caller_id = params.callerID;
    if (params.fraudEmail !== undefined) postParams.fraud_email = params.fraudEmail;
    if (params.fraudEmailEnabled !== undefined)
      postParams.fraud_email_enabled = params.fraudEmailEnabled ? '1' : '0';
    if (params.keystrokesEnabled !== undefined)
      postParams.keystrokes_enabled = params.keystrokesEnabled ? '1' : '0';
    if (params.userTelephonyCostMax !== undefined)
      postParams.user_telephony_cost_max = params.userTelephonyCostMax;
    return this.post('/admin/v1/settings', postParams);
  }

  // ========================
  // Account Info
  // ========================

  async getAccountInfo(): Promise<DuoResponse<any>> {
    return this.get('/admin/v1/info/summary');
  }
}
