import { createAxios } from 'slates';
import { signRequest } from './hmac';

export interface DuoAuth {
  integrationKey: string;
  secretKey: string;
  apiHostname: string;
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
    this.auth = auth;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: `https://${this.auth.apiHostname}`
    });
  }

  private flattenParams(params: Record<string, any>): Record<string, string> {
    let result: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = String(value);
      }
    }
    return result;
  }

  async get<T = any>(path: string, params: Record<string, any> = {}): Promise<DuoResponse<T>> {
    let flatParams = this.flattenParams(params);
    let { authorization, date } = await signRequest({
      integrationKey: this.auth.integrationKey,
      secretKey: this.auth.secretKey,
      apiHostname: this.auth.apiHostname,
      method: 'GET',
      path,
      params: flatParams
    });

    let axiosInstance = this.createAxiosInstance();
    let response = await axiosInstance.get(path, {
      params: flatParams,
      headers: {
        Authorization: authorization,
        Date: date
      }
    });

    return response.data;
  }

  async post<T = any>(
    path: string,
    params: Record<string, any> = {}
  ): Promise<DuoResponse<T>> {
    let flatParams = this.flattenParams(params);
    let { authorization, date } = await signRequest({
      integrationKey: this.auth.integrationKey,
      secretKey: this.auth.secretKey,
      apiHostname: this.auth.apiHostname,
      method: 'POST',
      path,
      params: flatParams
    });

    let body = new URLSearchParams(flatParams).toString();
    let axiosInstance = this.createAxiosInstance();
    let response = await axiosInstance.post(path, body, {
      headers: {
        Authorization: authorization,
        Date: date,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data;
  }

  async delete<T = any>(
    path: string,
    params: Record<string, any> = {}
  ): Promise<DuoResponse<T>> {
    let flatParams = this.flattenParams(params);
    let { authorization, date } = await signRequest({
      integrationKey: this.auth.integrationKey,
      secretKey: this.auth.secretKey,
      apiHostname: this.auth.apiHostname,
      method: 'DELETE',
      path,
      params: flatParams
    });

    let axiosInstance = this.createAxiosInstance();
    let response = await axiosInstance.delete(path, {
      params: flatParams,
      headers: {
        Authorization: authorization,
        Date: date
      }
    });

    return response.data;
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
      ...(params.username ? { username: params.username } : {}),
      ...(params.email ? { email: params.email } : {})
    });
  }

  async getUser(userId: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/users/${userId}`);
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
    return this.post(`/admin/v1/users/${userId}`, params);
  }

  async deleteUser(userId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${userId}`);
  }

  async enrollUser(params: {
    username: string;
    email: string;
    validSecs?: number;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/users/enroll', {
      username: params.username,
      email: params.email,
      ...(params.validSecs ? { valid_secs: params.validSecs } : {})
    });
  }

  async getUserGroups(userId: string): Promise<DuoResponse<any[]>> {
    return this.get(`/admin/v1/users/${userId}/groups`);
  }

  async associateUserGroup(userId: string, groupId: string): Promise<DuoResponse<string>> {
    return this.post(`/admin/v1/users/${userId}/groups`, { group_id: groupId });
  }

  async disassociateUserGroup(userId: string, groupId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${userId}/groups/${groupId}`);
  }

  async getUserPhones(userId: string): Promise<DuoResponse<any[]>> {
    return this.get(`/admin/v1/users/${userId}/phones`);
  }

  async associateUserPhone(userId: string, phoneId: string): Promise<DuoResponse<string>> {
    return this.post(`/admin/v1/users/${userId}/phones`, { phone_id: phoneId });
  }

  async disassociateUserPhone(userId: string, phoneId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/users/${userId}/phones/${phoneId}`);
  }

  async createBypassCodes(
    userId: string,
    params: {
      count?: number;
      validSecs?: number;
    } = {}
  ): Promise<DuoResponse<string[]>> {
    return this.post(`/admin/v1/users/${userId}/bypass_codes`, {
      ...(params.count ? { count: params.count } : {}),
      ...(params.validSecs ? { valid_secs: params.validSecs } : {})
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
    return this.get(`/admin/v1/groups/${groupId}`);
  }

  async createGroup(params: {
    name: string;
    desc?: string;
    status?: string;
  }): Promise<DuoResponse<any>> {
    return this.post('/admin/v1/groups', params);
  }

  async deleteGroup(groupId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/groups/${groupId}`);
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
    return this.get(`/admin/v1/phones/${phoneId}`);
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
    return this.post(`/admin/v1/phones/${phoneId}`, params);
  }

  async deletePhone(phoneId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/phones/${phoneId}`);
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
    return this.get(`/admin/v1/admins/${adminId}`);
  }

  async createAdmin(params: {
    name: string;
    email: string;
    phone: string;
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
    return this.post(`/admin/v1/admins/${adminId}`, params);
  }

  async deleteAdmin(adminId: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/admins/${adminId}`);
  }

  // ========================
  // Integrations (Applications)
  // ========================

  async listIntegrations(
    params: { limit?: number; offset?: number } = {}
  ): Promise<DuoResponse<any[]>> {
    return this.get('/admin/v1/integrations', {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0
    });
  }

  async getIntegration(integrationKey: string): Promise<DuoResponse<any>> {
    return this.get(`/admin/v1/integrations/${integrationKey}`);
  }

  async deleteIntegration(integrationKey: string): Promise<DuoResponse<string>> {
    return this.delete(`/admin/v1/integrations/${integrationKey}`);
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

    // next_offset is passed as two separate parameters with the same key
    // We handle this by appending them to the query string manually
    if (params.nextOffset && params.nextOffset.length === 2) {
      queryParams.next_offset = params.nextOffset;
    }

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
