import { createAxios } from 'slates';

export class OneLoginClient {
  private axios;

  constructor(config: { token: string; subdomain: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.onelogin.com`,
      headers: {
        Authorization: `bearer:${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Users (v2) ──────────────────────────────────────────────

  async listUsers(params?: Record<string, string | number | undefined>) {
    let cleanParams: Record<string, string | number> = {};
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      }
    }
    let response = await this.axios.get('/api/2/users', { params: cleanParams });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/api/2/users/${userId}`);
    return response.data;
  }

  async createUser(userData: Record<string, any>) {
    let response = await this.axios.post('/api/2/users', userData);
    return response.data;
  }

  async updateUser(
    userId: number,
    userData: Record<string, any>,
    params?: Record<string, string>
  ) {
    let response = await this.axios.put(`/api/2/users/${userId}`, userData, { params });
    return response.data;
  }

  async deleteUser(userId: number) {
    let response = await this.axios.delete(`/api/2/users/${userId}`);
    return response.data;
  }

  // ─── Roles (v2) ──────────────────────────────────────────────

  async listRoles(params?: Record<string, string | number | undefined>) {
    let cleanParams: Record<string, string | number> = {};
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      }
    }
    let response = await this.axios.get('/api/2/roles', { params: cleanParams });
    return response.data;
  }

  async getRole(roleId: number) {
    let response = await this.axios.get(`/api/2/roles/${roleId}`);
    return response.data;
  }

  async getRoleUsers(roleId: number) {
    let response = await this.axios.get(`/api/2/roles/${roleId}/users`);
    return response.data;
  }

  async createRole(roleData: Record<string, any>) {
    let response = await this.axios.post('/api/2/roles', roleData);
    return response.data;
  }

  async updateRole(roleId: number, roleData: Record<string, any>) {
    let response = await this.axios.put(`/api/2/roles/${roleId}`, roleData);
    return response.data;
  }

  async deleteRole(roleId: number) {
    let response = await this.axios.delete(`/api/2/roles/${roleId}`);
    return response.data;
  }

  // ─── Apps (v2) ───────────────────────────────────────────────

  async listApps(params?: Record<string, string | number | undefined>) {
    let cleanParams: Record<string, string | number> = {};
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      }
    }
    let response = await this.axios.get('/api/2/apps', { params: cleanParams });
    return response.data;
  }

  async getApp(appId: number) {
    let response = await this.axios.get(`/api/2/apps/${appId}`);
    return response.data;
  }

  async createApp(appData: Record<string, any>) {
    let response = await this.axios.post('/api/2/apps', appData);
    return response.data;
  }

  async updateApp(appId: number, appData: Record<string, any>) {
    let response = await this.axios.put(`/api/2/apps/${appId}`, appData);
    return response.data;
  }

  async deleteApp(appId: number) {
    let response = await this.axios.delete(`/api/2/apps/${appId}`);
    return response.data;
  }

  // ─── Groups (v1) ─────────────────────────────────────────────

  async listGroups() {
    let response = await this.axios.get('/api/1/groups');
    return response.data;
  }

  async getGroup(groupId: number) {
    let response = await this.axios.get(`/api/1/groups/${groupId}`);
    return response.data;
  }

  // ─── Events (v1) ─────────────────────────────────────────────

  async listEvents(params?: Record<string, string | number | undefined>) {
    let cleanParams: Record<string, string | number> = {};
    if (params) {
      for (let [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      }
    }
    let response = await this.axios.get('/api/1/events', { params: cleanParams });
    return response.data;
  }

  async getEvent(eventId: number) {
    let response = await this.axios.get(`/api/1/events/${eventId}`);
    return response.data;
  }

  async getEventTypes() {
    let response = await this.axios.get('/api/1/events/types');
    return response.data;
  }

  // ─── MFA (v2) ────────────────────────────────────────────────

  async getAvailableFactors(userId: number) {
    let response = await this.axios.get(`/api/2/mfa/users/${userId}/factors`);
    return response.data;
  }

  async getEnrolledDevices(userId: number) {
    let response = await this.axios.get(`/api/2/mfa/users/${userId}/devices`);
    return response.data;
  }

  async enrollFactor(userId: number, enrollData: Record<string, any>) {
    let response = await this.axios.post(
      `/api/2/mfa/users/${userId}/registrations`,
      enrollData
    );
    return response.data;
  }

  async verifyEnrollment(userId: number, registrationId: string, otp: string) {
    let response = await this.axios.put(
      `/api/2/mfa/users/${userId}/registrations/${registrationId}`,
      { otp }
    );
    return response.data;
  }

  async pollEnrollment(userId: number, registrationId: string) {
    let response = await this.axios.get(
      `/api/2/mfa/users/${userId}/registrations/${registrationId}`
    );
    return response.data;
  }

  async triggerMfa(userId: number, deviceId: number) {
    let response = await this.axios.post(
      `/api/1/users/${userId}/otp_devices/${deviceId}/trigger`
    );
    return response.data;
  }

  async verifyFactor(userId: number, verificationId: string, otp: string, deviceId?: string) {
    let body: Record<string, any> = { otp };
    if (deviceId) {
      body.device_id = deviceId;
    }
    let response = await this.axios.put(
      `/api/2/mfa/users/${userId}/verifications/${verificationId}`,
      body
    );
    return response.data;
  }

  // ─── User Roles (v1) ─────────────────────────────────────────

  async assignRolesToUser(userId: number, roleIds: number[]) {
    let response = await this.axios.put(`/api/1/users/${userId}/add_roles`, {
      role_id_array: roleIds
    });
    return response.data;
  }

  async removeRolesFromUser(userId: number, roleIds: number[]) {
    let response = await this.axios.put(`/api/1/users/${userId}/remove_roles`, {
      role_id_array: roleIds
    });
    return response.data;
  }
}
