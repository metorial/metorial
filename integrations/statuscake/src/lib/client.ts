import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.statuscake.com/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ── Uptime ──

  async listUptimeTests(params?: {
    status?: string;
    tags?: string;
    matchany?: boolean;
    nouptime?: boolean;
    page?: number;
    limit?: number;
  }) {
    let response = await http.get('/uptime', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getUptimeTest(testId: string) {
    let response = await http.get(`/uptime/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createUptimeTest(data: Record<string, any>) {
    let response = await http.post('/uptime', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updateUptimeTest(testId: string, data: Record<string, any>) {
    let response = await http.put(`/uptime/${testId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteUptimeTest(testId: string) {
    let response = await http.delete(`/uptime/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listUptimeTestHistory(
    testId: string,
    params?: {
      before?: string;
      after?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await http.get(`/uptime/${testId}/history`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async listUptimeTestPeriods(
    testId: string,
    params?: {
      before?: string;
      after?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await http.get(`/uptime/${testId}/periods`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async listUptimeTestAlerts(
    testId: string,
    params?: {
      before?: string;
      after?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await http.get(`/uptime/${testId}/alerts`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Page Speed ──

  async listPagespeedTests(params?: { page?: number; limit?: number }) {
    let response = await http.get('/pagespeed', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getPagespeedTest(testId: string) {
    let response = await http.get(`/pagespeed/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createPagespeedTest(data: Record<string, any>) {
    let response = await http.post('/pagespeed', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updatePagespeedTest(testId: string, data: Record<string, any>) {
    let response = await http.put(`/pagespeed/${testId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deletePagespeedTest(testId: string) {
    let response = await http.delete(`/pagespeed/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listPagespeedTestHistory(
    testId: string,
    params?: {
      before?: string;
      after?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await http.get(`/pagespeed/${testId}/history`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── SSL ──

  async listSslTests(params?: { page?: number; limit?: number }) {
    let response = await http.get('/ssl', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getSslTest(testId: string) {
    let response = await http.get(`/ssl/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createSslTest(data: Record<string, any>) {
    let response = await http.post('/ssl', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updateSslTest(testId: string, data: Record<string, any>) {
    let response = await http.put(`/ssl/${testId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteSslTest(testId: string) {
    let response = await http.delete(`/ssl/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Heartbeat ──

  async listHeartbeatTests(params?: {
    status?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    let response = await http.get('/heartbeat', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getHeartbeatTest(testId: string) {
    let response = await http.get(`/heartbeat/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createHeartbeatTest(data: Record<string, any>) {
    let response = await http.post('/heartbeat', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updateHeartbeatTest(testId: string, data: Record<string, any>) {
    let response = await http.put(`/heartbeat/${testId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteHeartbeatTest(testId: string) {
    let response = await http.delete(`/heartbeat/${testId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Contact Groups ──

  async listContactGroups(params?: { page?: number; limit?: number }) {
    let response = await http.get('/contact-groups', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getContactGroup(groupId: string) {
    let response = await http.get(`/contact-groups/${groupId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createContactGroup(data: Record<string, any>) {
    let response = await http.post('/contact-groups', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updateContactGroup(groupId: string, data: Record<string, any>) {
    let response = await http.put(`/contact-groups/${groupId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteContactGroup(groupId: string) {
    let response = await http.delete(`/contact-groups/${groupId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Maintenance Windows ──

  async listMaintenanceWindows(params?: { state?: string; page?: number; limit?: number }) {
    let response = await http.get('/maintenance-windows', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getMaintenanceWindow(windowId: string) {
    let response = await http.get(`/maintenance-windows/${windowId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createMaintenanceWindow(data: Record<string, any>) {
    let response = await http.post('/maintenance-windows', this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async updateMaintenanceWindow(windowId: string, data: Record<string, any>) {
    let response = await http.put(`/maintenance-windows/${windowId}`, this.encodeForm(data), {
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteMaintenanceWindow(windowId: string) {
    let response = await http.delete(`/maintenance-windows/${windowId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Locations ──

  async listUptimeLocations(params?: { region_code?: string }) {
    let response = await http.get('/uptime-locations', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async listPagespeedLocations(params?: { location?: string }) {
    let response = await http.get('/pagespeed-locations', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Helpers ──

  private encodeForm(data: Record<string, any>): string {
    let parts: string[] = [];
    for (let [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (let item of value) {
          parts.push(`${encodeURIComponent(`${key}[]`)}=${encodeURIComponent(String(item))}`);
        }
      } else if (typeof value === 'boolean') {
        parts.push(`${encodeURIComponent(key)}=${value ? 'true' : 'false'}`);
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join('&');
  }
}
