import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { apiId: string; token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.victorops.com',
      headers: {
        'X-VO-Api-Id': config.apiId,
        'X-VO-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Incidents ──

  async listIncidents(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/incidents');
    return response.data;
  }

  async getIncident(incidentNumber: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/incidents/${incidentNumber}`);
    return response.data;
  }

  async createIncident(params: {
    summary: string;
    details: string;
    userName: string;
    targets: Array<{ type: string; slug: string }>;
    isMultiResponder?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/incidents', params);
    return response.data;
  }

  async acknowledgeIncidents(params: {
    userName: string;
    incidentNames: string[];
    message?: string;
  }): Promise<any> {
    let response = await this.axios.patch('/api-public/v1/incidents/ack', params);
    return response.data;
  }

  async resolveIncidents(params: {
    userName: string;
    incidentNames: string[];
    message?: string;
  }): Promise<any> {
    let response = await this.axios.patch('/api-public/v1/incidents/resolve', params);
    return response.data;
  }

  async acknowledgeUserIncidents(params: {
    userName: string;
    message?: string;
  }): Promise<any> {
    let response = await this.axios.patch('/api-public/v1/incidents/byUser/ack', params);
    return response.data;
  }

  async resolveUserIncidents(params: { userName: string; message?: string }): Promise<any> {
    let response = await this.axios.patch('/api-public/v1/incidents/byUser/resolve', params);
    return response.data;
  }

  async rerouteIncidents(params: {
    userName: string;
    reroutes: Array<{
      incidentNames: string[];
      targets: Array<{ type: string; slug: string }>;
    }>;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/incidents/reroute', params);
    return response.data;
  }

  // ── Incident Notes ──

  async getIncidentNotes(incidentNumber: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/incidents/${incidentNumber}/notes`);
    return response.data;
  }

  async createIncidentNote(
    incidentNumber: string,
    params: {
      content: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/api-public/v1/incidents/${incidentNumber}/notes`,
      params
    );
    return response.data;
  }

  async updateIncidentNote(
    incidentNumber: string,
    noteName: string,
    params: {
      content: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(
      `/api-public/v1/incidents/${incidentNumber}/notes/${noteName}`,
      params
    );
    return response.data;
  }

  async deleteIncidentNote(incidentNumber: string, noteName: string): Promise<any> {
    let response = await this.axios.delete(
      `/api-public/v1/incidents/${incidentNumber}/notes/${noteName}`
    );
    return response.data;
  }

  // ── Alerts ──

  async getAlert(uuid: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/alerts/${uuid}`);
    return response.data;
  }

  // ── Users ──

  async listUsers(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/user');
    return response.data;
  }

  async getUser(username: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/user/${username}`);
    return response.data;
  }

  async createUser(params: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    admin?: boolean;
    expirationHours?: number;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/user', params);
    return response.data;
  }

  async updateUser(
    username: string,
    params: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      admin?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/api-public/v1/user/${username}`, params);
    return response.data;
  }

  async deleteUser(username: string, replacement: string): Promise<any> {
    let response = await this.axios.delete(`/api-public/v1/user/${username}`, {
      data: { replacement }
    });
    return response.data;
  }

  async getUserTeams(username: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/user/${username}/teams`);
    return response.data;
  }

  // ── Teams ──

  async listTeams(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/team');
    return response.data;
  }

  async getTeam(teamSlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/team/${teamSlug}`);
    return response.data;
  }

  async createTeam(params: { name: string }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/team', params);
    return response.data;
  }

  async updateTeam(teamSlug: string, params: { name: string }): Promise<any> {
    let response = await this.axios.put(`/api-public/v1/team/${teamSlug}`, params);
    return response.data;
  }

  async deleteTeam(teamSlug: string): Promise<any> {
    let response = await this.axios.delete(`/api-public/v1/team/${teamSlug}`);
    return response.data;
  }

  async getTeamMembers(teamSlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/team/${teamSlug}/members`);
    return response.data;
  }

  async addTeamMember(teamSlug: string, username: string): Promise<any> {
    let response = await this.axios.post(`/api-public/v1/team/${teamSlug}/members`, {
      username
    });
    return response.data;
  }

  async removeTeamMember(
    teamSlug: string,
    username: string,
    replacement: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/api-public/v1/team/${teamSlug}/members/${username}`,
      {
        data: { replacement }
      }
    );
    return response.data;
  }

  async getTeamAdmins(teamSlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/team/${teamSlug}/admins`);
    return response.data;
  }

  // ── On-Call ──

  async getCurrentOnCall(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/oncall/current');
    return response.data;
  }

  async getUserOnCallSchedule(username: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v2/user/${username}/oncall/schedule`);
    return response.data;
  }

  async getTeamOnCallSchedule(
    teamSlug: string,
    params?: {
      daysForward?: number;
      daysSkip?: number;
      step?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/api-public/v2/team/${teamSlug}/oncall/schedule`, {
      params
    });
    return response.data;
  }

  async createOnCallOverride(
    policySlug: string,
    params: {
      fromUser: string;
      toUser: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/api-public/v1/policies/${policySlug}/oncall/user`,
      params
    );
    return response.data;
  }

  // ── Escalation Policies ──

  async listEscalationPolicies(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/policies');
    return response.data;
  }

  async getEscalationPolicy(policySlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/policies/${policySlug}`);
    return response.data;
  }

  async getTeamEscalationPolicies(teamSlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/team/${teamSlug}/policies`);
    return response.data;
  }

  async createEscalationPolicy(params: {
    name: string;
    teamId: string;
    steps: Array<{
      timeout: number;
      entries: Array<{ type: string; slug: string }>;
    }>;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/policies', {
      name: params.name,
      team_id: params.teamId,
      step: params.steps
    });
    return response.data;
  }

  async deleteEscalationPolicy(policySlug: string): Promise<any> {
    let response = await this.axios.delete(`/api-public/v1/policies/${policySlug}`);
    return response.data;
  }

  // ── Routing Keys ──

  async listRoutingKeys(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/org/routing-keys');
    return response.data;
  }

  async createRoutingKey(params: {
    routingKey: string;
    targets: Array<{ policySlug: string; _type: string }>;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/org/routing-keys', params);
    return response.data;
  }

  // ── Rotations ──

  async getTeamRotations(teamSlug: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v2/team/${teamSlug}/rotations`);
    return response.data;
  }

  // ── Scheduled Overrides ──

  async listScheduledOverrides(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/overrides');
    return response.data;
  }

  async createScheduledOverride(params: { start: string; end: string }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/overrides', params);
    return response.data;
  }

  async getScheduledOverride(publicId: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/overrides/${publicId}`);
    return response.data;
  }

  async deleteScheduledOverride(publicId: string): Promise<any> {
    let response = await this.axios.delete(`/api-public/v1/overrides/${publicId}`);
    return response.data;
  }

  // ── Maintenance Mode ──

  async getMaintenanceMode(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/maintenancemode');
    return response.data;
  }

  async startMaintenanceMode(params: {
    names: string[];
    purpose: string;
    type: string;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/maintenancemode/start', params);
    return response.data;
  }

  async endMaintenanceMode(maintenanceModeId: string): Promise<any> {
    let response = await this.axios.put(
      `/api-public/v1/maintenancemode/${maintenanceModeId}/end`
    );
    return response.data;
  }

  // ── Reporting ──

  async searchIncidentHistory(params?: {
    entityId?: string;
    incidentNumber?: string;
    startedAfter?: string;
    startedBefore?: string;
    host?: string;
    service?: string;
    currentPhase?: string;
    routingKey?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let response = await this.axios.get('/api-reporting/v2/incidents', { params });
    return response.data;
  }

  async getTeamShiftLog(
    teamSlug: string,
    params?: {
      start?: string;
      end?: string;
      userName?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/api-reporting/v1/team/${teamSlug}/oncall/log`, {
      params
    });
    return response.data;
  }

  // ── Chat ──

  async sendChatMessage(params: {
    username: string;
    text: string;
    monitoringTool?: string;
  }): Promise<any> {
    let response = await this.axios.post('/api-public/v1/chat', params);
    return response.data;
  }

  // ── Contact Methods ──

  async getUserContactMethods(username: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/user/${username}/contact-methods`);
    return response.data;
  }

  // ── Paging Policies ──

  async getUserPagingPolicies(username: string): Promise<any> {
    let response = await this.axios.get(`/api-public/v1/user/${username}/policies`);
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/api-public/v1/webhooks');
    return response.data;
  }
}
