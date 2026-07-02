import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; accountEmail?: string }) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`
    };
    if (config.accountEmail) {
      headers['Account-Email'] = config.accountEmail;
    }

    this.http = createAxios({
      baseURL: 'https://api.pingdom.com/api/3.1',
      headers
    });
  }

  // ─── Uptime Checks ─────────────────────────────────────────────

  async listChecks(params?: {
    tags?: string;
    limit?: number;
    offset?: number;
    include_tags?: boolean;
    include_severity?: boolean;
  }) {
    let response = await this.http.get('/checks', { params });
    return response.data;
  }

  async getCheck(checkId: number, params?: { include_teams?: boolean }) {
    let response = await this.http.get(`/checks/${checkId}`, { params });
    return response.data;
  }

  async createCheck(data: Record<string, any>) {
    let response = await this.http.post('/checks', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateCheck(checkId: number, data: Record<string, any>) {
    let response = await this.http.put(`/checks/${checkId}`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteCheck(checkId: number) {
    let response = await this.http.delete(`/checks/${checkId}`);
    return response.data;
  }

  // ─── TMS (Transaction) Checks ──────────────────────────────────

  async listTmsChecks(params?: {
    limit?: number;
    offset?: number;
    tags?: string;
    type?: string;
    extended_tags?: boolean;
  }) {
    let response = await this.http.get('/tms/check', { params });
    return response.data;
  }

  async getTmsCheck(checkId: number) {
    let response = await this.http.get(`/tms/check/${checkId}`);
    return response.data;
  }

  async createTmsCheck(data: Record<string, any>) {
    let response = await this.http.post('/tms/check', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateTmsCheck(checkId: number, data: Record<string, any>) {
    let response = await this.http.put(`/tms/check/${checkId}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteTmsCheck(checkId: number) {
    let response = await this.http.delete(`/tms/check/${checkId}`);
    return response.data;
  }

  // ─── Check Results ─────────────────────────────────────────────

  async getCheckResults(
    checkId: number,
    params?: {
      to?: number;
      from?: number;
      probes?: string;
      status?: string;
      limit?: number;
      offset?: number;
      includeanalysis?: boolean;
      maxresponse?: number;
      minresponse?: number;
    }
  ) {
    let response = await this.http.get(`/results/${checkId}`, { params });
    return response.data;
  }

  // ─── Summary Reports ───────────────────────────────────────────

  async getSummaryAverage(
    checkId: number,
    params?: {
      from?: number;
      to?: number;
      probes?: string;
      includeuptime?: boolean;
    }
  ) {
    let response = await this.http.get(`/summary.average/${checkId}`, { params });
    return response.data;
  }

  async getSummaryPerformance(
    checkId: number,
    params?: {
      from?: number;
      to?: number;
      resolution?: string;
      includeuptime?: boolean;
      probes?: string;
      order?: string;
    }
  ) {
    let response = await this.http.get(`/summary.performance/${checkId}`, { params });
    return response.data;
  }

  async getSummaryOutage(
    checkId: number,
    params?: {
      from?: number;
      to?: number;
      order?: string;
    }
  ) {
    let response = await this.http.get(`/summary.outage/${checkId}`, { params });
    return response.data;
  }

  async getSummaryHoursOfDay(
    checkId: number,
    params?: {
      from?: number;
      to?: number;
      probes?: string;
      uselocaltime?: boolean;
    }
  ) {
    let response = await this.http.get(`/summary.hoursofday/${checkId}`, { params });
    return response.data;
  }

  // ─── Alerting Contacts ─────────────────────────────────────────

  async listContacts() {
    let response = await this.http.get('/alerting/contacts');
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.http.post('/alerting/contacts', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.http.put(`/alerting/contacts/${contactId}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteContact(contactId: number) {
    let response = await this.http.delete(`/alerting/contacts/${contactId}`);
    return response.data;
  }

  // ─── Alerting Teams ────────────────────────────────────────────

  async listTeams() {
    let response = await this.http.get('/alerting/teams');
    return response.data;
  }

  async createTeam(data: Record<string, any>) {
    let response = await this.http.post('/alerting/teams', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateTeam(teamId: number, data: Record<string, any>) {
    let response = await this.http.put(`/alerting/teams/${teamId}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteTeam(teamId: number) {
    let response = await this.http.delete(`/alerting/teams/${teamId}`);
    return response.data;
  }

  // ─── Maintenance Windows ───────────────────────────────────────

  async listMaintenance(params?: { limit?: number; offset?: number; orderby?: string }) {
    let response = await this.http.get('/maintenance', { params });
    return response.data;
  }

  async getMaintenance(maintenanceId: number) {
    let response = await this.http.get(`/maintenance/${maintenanceId}`);
    return response.data;
  }

  async createMaintenance(data: Record<string, any>) {
    let response = await this.http.post('/maintenance', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateMaintenance(maintenanceId: number, data: Record<string, any>) {
    let response = await this.http.put(`/maintenance/${maintenanceId}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteMaintenance(maintenanceId: number) {
    let response = await this.http.delete(`/maintenance/${maintenanceId}`);
    return response.data;
  }

  // ─── Root Cause Analysis ───────────────────────────────────────

  async getAnalysis(
    checkId: number,
    params?: {
      limit?: number;
      offset?: number;
      from?: number;
      to?: number;
    }
  ) {
    let response = await this.http.get(`/analysis/${checkId}`, { params });
    return response.data;
  }

  // ─── Single (Ad-hoc) Check ────────────────────────────────────

  async performSingleCheck(params: { host: string; type: string; probeid?: number }) {
    let response = await this.http.get('/single', { params });
    return response.data;
  }

  // ─── Probes ────────────────────────────────────────────────────

  async listProbes(params?: {
    limit?: number;
    offset?: number;
    onlyactive?: boolean;
    includedeleted?: boolean;
  }) {
    let response = await this.http.get('/probes', { params });
    return response.data;
  }

  // ─── Account / Credits ─────────────────────────────────────────

  async getCredits() {
    let response = await this.http.get('/credits');
    return response.data;
  }

  // ─── Actions (Alerts) ─────────────────────────────────────────

  async listActions(params?: {
    from?: number;
    to?: number;
    limit?: number;
    offset?: number;
    checkids?: string;
    contactids?: string;
    status?: string;
    via?: string;
  }) {
    let response = await this.http.get('/actions', { params });
    return response.data;
  }
}
