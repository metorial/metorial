import { createAxios } from 'slates';
import { opsgenieApiError } from './errors';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.opsgenie.com',
  eu: 'https://api.eu.opsgenie.com'
};

export class OpsGenieClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; instance?: string }) {
    let baseURL = BASE_URLS[config.instance ?? 'us'] ?? BASE_URLS.us;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `GenieKey ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(opsgenieApiError(error))
    );
  }

  // ─── Alerts ──────────────────────────────────────────────────

  async createAlert(data: {
    message: string;
    alias?: string;
    description?: string;
    responders?: Array<{ type: string; id?: string; username?: string; name?: string }>;
    visibleTo?: Array<{ type: string; id?: string; username?: string; name?: string }>;
    actions?: string[];
    tags?: string[];
    details?: Record<string, string>;
    entity?: string;
    source?: string;
    priority?: string;
    user?: string;
    note?: string;
  }) {
    let response = await this.http.post('/v2/alerts', data);
    return response.data;
  }

  async getAlert(identifier: string, identifierType: string = 'id') {
    let response = await this.http.get(`/v2/alerts/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data.data;
  }

  async listAlerts(
    params: {
      query?: string;
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
      searchIdentifier?: string;
      searchIdentifierType?: string;
    } = {}
  ) {
    let response = await this.http.get('/v2/alerts', { params });
    return response.data;
  }

  async countAlerts(params: { query?: string } = {}) {
    let response = await this.http.get('/v2/alerts/count', { params });
    return response.data.data;
  }

  async closeAlert(
    identifier: string,
    identifierType: string = 'id',
    data: {
      user?: string;
      source?: string;
      note?: string;
    } = {}
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/close`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async acknowledgeAlert(
    identifier: string,
    identifierType: string = 'id',
    data: {
      user?: string;
      source?: string;
      note?: string;
    } = {}
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/acknowledge`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async unacknowledgeAlert(
    identifier: string,
    identifierType: string = 'id',
    data: {
      user?: string;
      source?: string;
      note?: string;
    } = {}
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/unacknowledge`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async deleteAlert(
    identifier: string,
    identifierType: string = 'id',
    params: {
      user?: string;
      source?: string;
    } = {}
  ) {
    let response = await this.http.delete(`/v2/alerts/${encodeURIComponent(identifier)}`, {
      params: { identifierType, ...params }
    });
    return response.data;
  }

  async snoozeAlert(
    identifier: string,
    identifierType: string,
    data: {
      endTime: string;
      user?: string;
      source?: string;
      note?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/snooze`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async addNoteToAlert(
    identifier: string,
    identifierType: string,
    data: {
      note: string;
      user?: string;
      source?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/notes`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async listAlertNotes(
    identifier: string,
    identifierType: string = 'id',
    params: {
      offset?: number;
      limit?: number;
      order?: string;
      direction?: string;
    } = {}
  ) {
    let response = await this.http.get(`/v2/alerts/${encodeURIComponent(identifier)}/notes`, {
      params: { identifierType, ...params }
    });
    return response.data;
  }

  async addTagsToAlert(
    identifier: string,
    identifierType: string,
    data: {
      tags: string[];
      user?: string;
      source?: string;
      note?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/tags`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async removeTagsFromAlert(
    identifier: string,
    identifierType: string,
    params: {
      tags: string;
      user?: string;
      source?: string;
    }
  ) {
    let response = await this.http.delete(
      `/v2/alerts/${encodeURIComponent(identifier)}/tags`,
      {
        params: { identifierType, ...params }
      }
    );
    return response.data;
  }

  async updateAlertPriority(
    identifier: string,
    identifierType: string,
    data: {
      priority: string;
    }
  ) {
    let response = await this.http.put(
      `/v2/alerts/${encodeURIComponent(identifier)}/priority`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async updateAlertMessage(
    identifier: string,
    identifierType: string,
    data: {
      message: string;
    }
  ) {
    let response = await this.http.put(
      `/v2/alerts/${encodeURIComponent(identifier)}/message`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async updateAlertDescription(
    identifier: string,
    identifierType: string,
    data: {
      description: string;
    }
  ) {
    let response = await this.http.put(
      `/v2/alerts/${encodeURIComponent(identifier)}/description`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async assignAlert(
    identifier: string,
    identifierType: string,
    data: {
      owner: { id?: string; username?: string };
      user?: string;
      source?: string;
      note?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/assign`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async escalateAlert(
    identifier: string,
    identifierType: string,
    data: {
      escalation: { id?: string; name?: string };
      user?: string;
      source?: string;
      note?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/escalate`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async addResponderToAlert(
    identifier: string,
    identifierType: string,
    data: {
      responder: { type: string; id?: string; username?: string; name?: string };
      user?: string;
      source?: string;
      note?: string;
    }
  ) {
    let response = await this.http.post(
      `/v2/alerts/${encodeURIComponent(identifier)}/responders`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async getAlertRequestStatus(requestId: string) {
    let response = await this.http.get(`/v2/alerts/requests/${requestId}`);
    return response.data;
  }

  async listAlertLogs(
    identifier: string,
    identifierType: string = 'id',
    params: {
      offset?: string;
      limit?: number;
      order?: string;
      direction?: string;
    } = {}
  ) {
    let response = await this.http.get(`/v2/alerts/${encodeURIComponent(identifier)}/logs`, {
      params: { identifierType, ...params }
    });
    return response.data;
  }

  // ─── Incidents ──────────────────────────────────────────────

  async createIncident(data: {
    message: string;
    description?: string;
    responders?: Array<{ type: string; id?: string }>;
    tags?: string[];
    details?: Record<string, string>;
    priority?: string;
    note?: string;
    impactedServices?: Array<{ id: string }>;
    statusPageEntry?: { title: string; detail: string };
    notifyStakeholders?: boolean;
  }) {
    let response = await this.http.post('/v1/incidents/create', data);
    return response.data;
  }

  async getIncident(identifier: string, identifierType: string = 'id') {
    let response = await this.http.get(`/v1/incidents/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data.data;
  }

  async listIncidents(
    params: {
      query?: string;
      offset?: number;
      limit?: number;
      sort?: string;
      order?: string;
    } = {}
  ) {
    let response = await this.http.get('/v1/incidents', { params });
    return response.data;
  }

  async closeIncident(
    identifier: string,
    identifierType: string = 'id',
    data: {
      note?: string;
    } = {}
  ) {
    let response = await this.http.post(
      `/v1/incidents/${encodeURIComponent(identifier)}/close`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async resolveIncident(
    identifier: string,
    identifierType: string = 'id',
    data: {
      note?: string;
    } = {}
  ) {
    let response = await this.http.post(
      `/v1/incidents/${encodeURIComponent(identifier)}/resolve`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async deleteIncident(identifier: string, identifierType: string = 'id') {
    let response = await this.http.delete(`/v1/incidents/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data;
  }

  async addNoteToIncident(
    identifier: string,
    identifierType: string,
    data: {
      note: string;
    }
  ) {
    let response = await this.http.post(
      `/v1/incidents/${encodeURIComponent(identifier)}/notes`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  async getIncidentRequestStatus(requestId: string) {
    let response = await this.http.get(`/v1/incidents/requests/${requestId}`);
    return response.data;
  }

  // ─── Schedules ──────────────────────────────────────────────

  async createSchedule(data: {
    name: string;
    description?: string;
    timezone?: string;
    enabled?: boolean;
    ownerTeam?: { id?: string; name?: string };
    rotations?: Array<{
      name?: string;
      startDate: string;
      endDate?: string;
      type: string;
      length?: number;
      participants: Array<{ type: string; id?: string; username?: string }>;
      timeRestriction?: any;
    }>;
  }) {
    let response = await this.http.post('/v2/schedules', data);
    return response.data.data;
  }

  async getSchedule(identifier: string, identifierType: string = 'id') {
    let response = await this.http.get(`/v2/schedules/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data.data;
  }

  async listSchedules(params: { expand?: string } = {}) {
    let response = await this.http.get('/v2/schedules', { params });
    return response.data.data;
  }

  async updateSchedule(
    identifier: string,
    identifierType: string,
    data: {
      name?: string;
      description?: string;
      timezone?: string;
      enabled?: boolean;
      ownerTeam?: { id?: string; name?: string };
      rotations?: Array<{
        name?: string;
        startDate: string;
        endDate?: string;
        type: string;
        length?: number;
        participants: Array<{ type: string; id?: string; username?: string }>;
        timeRestriction?: any;
      }>;
    }
  ) {
    let response = await this.http.patch(
      `/v2/schedules/${encodeURIComponent(identifier)}`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data.data;
  }

  async deleteSchedule(identifier: string, identifierType: string = 'id') {
    let response = await this.http.delete(`/v2/schedules/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data;
  }

  async getOnCalls(
    scheduleIdentifier: string,
    params: {
      scheduleIdentifierType?: string;
      flat?: boolean;
      date?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/on-calls`,
      {
        params
      }
    );
    return response.data.data;
  }

  async getNextOnCalls(
    scheduleIdentifier: string,
    params: {
      scheduleIdentifierType?: string;
      flat?: boolean;
      date?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/next-on-calls`,
      {
        params
      }
    );
    return response.data.data;
  }

  // ─── Schedule Overrides ─────────────────────────────────────

  async createScheduleOverride(
    scheduleIdentifier: string,
    params: { scheduleIdentifierType?: string },
    data: {
      alias?: string;
      user: { type: string; id?: string; username?: string };
      startDate: string;
      endDate: string;
      rotations?: Array<{ id?: string; name?: string }>;
    }
  ) {
    let response = await this.http.post(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/overrides`,
      data,
      { params }
    );
    return response.data;
  }

  async getScheduleOverride(
    scheduleIdentifier: string,
    alias: string,
    params: { scheduleIdentifierType?: string } = {}
  ) {
    let response = await this.http.get(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/overrides/${encodeURIComponent(alias)}`,
      { params }
    );
    return response.data.data;
  }

  async updateScheduleOverride(
    scheduleIdentifier: string,
    alias: string,
    params: { scheduleIdentifierType?: string },
    data: {
      user: { type: string; id?: string; username?: string };
      startDate: string;
      endDate: string;
      rotations?: Array<{ id?: string; name?: string }>;
    }
  ) {
    let response = await this.http.put(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/overrides/${encodeURIComponent(alias)}`,
      data,
      { params }
    );
    return response.data;
  }

  async deleteScheduleOverride(
    scheduleIdentifier: string,
    alias: string,
    params: { scheduleIdentifierType?: string } = {}
  ) {
    let response = await this.http.delete(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/overrides/${encodeURIComponent(alias)}`,
      { params }
    );
    return response.data;
  }

  async listScheduleOverrides(
    scheduleIdentifier: string,
    params: { scheduleIdentifierType?: string } = {}
  ) {
    let response = await this.http.get(
      `/v2/schedules/${encodeURIComponent(scheduleIdentifier)}/overrides`,
      { params }
    );
    return response.data.data;
  }

  // ─── Schedule Rotations ─────────────────────────────────────

  async createRotation(
    scheduleId: string,
    data: {
      name?: string;
      startDate: string;
      endDate?: string;
      type: string;
      length?: number;
      participants: Array<{ type: string; id?: string; username?: string }>;
      timeRestriction?: any;
    }
  ) {
    let response = await this.http.post(
      `/v2/schedules/${encodeURIComponent(scheduleId)}/rotations`,
      data
    );
    return response.data.data;
  }

  async listRotations(scheduleId: string) {
    let response = await this.http.get(
      `/v2/schedules/${encodeURIComponent(scheduleId)}/rotations`
    );
    return response.data.data;
  }

  async updateRotation(
    scheduleId: string,
    rotationId: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      length?: number;
      participants?: Array<{ type: string; id?: string; username?: string }>;
      timeRestriction?: any;
    }
  ) {
    let response = await this.http.patch(
      `/v2/schedules/${encodeURIComponent(scheduleId)}/rotations/${encodeURIComponent(rotationId)}`,
      data
    );
    return response.data.data;
  }

  async deleteRotation(scheduleId: string, rotationId: string) {
    let response = await this.http.delete(
      `/v2/schedules/${encodeURIComponent(scheduleId)}/rotations/${encodeURIComponent(rotationId)}`
    );
    return response.data;
  }

  // ─── Escalations ────────────────────────────────────────────

  async createEscalation(data: {
    name: string;
    description?: string;
    rules: Array<{
      condition: string;
      notifyType: string;
      delay: { timeAmount: number; timeUnit: string };
      recipient: { type: string; id?: string; username?: string; name?: string };
    }>;
    ownerTeam?: { id?: string; name?: string };
    repeat?: {
      waitInterval?: number;
      count?: number;
      resetRecipientStates?: boolean;
      closeAlertAfterAll?: boolean;
    };
  }) {
    let response = await this.http.post('/v2/escalations', data);
    return response.data.data;
  }

  async getEscalation(identifier: string, identifierType: string = 'id') {
    let response = await this.http.get(`/v2/escalations/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data.data;
  }

  async listEscalations() {
    let response = await this.http.get('/v2/escalations');
    return response.data.data;
  }

  async updateEscalation(
    identifier: string,
    identifierType: string,
    data: {
      name?: string;
      description?: string;
      rules?: Array<{
        condition: string;
        notifyType: string;
        delay: { timeAmount: number; timeUnit: string };
        recipient: { type: string; id?: string; username?: string; name?: string };
      }>;
      ownerTeam?: { id?: string; name?: string };
      repeat?: {
        waitInterval?: number;
        count?: number;
        resetRecipientStates?: boolean;
        closeAlertAfterAll?: boolean;
      };
    }
  ) {
    let response = await this.http.patch(
      `/v2/escalations/${encodeURIComponent(identifier)}`,
      data,
      {
        params: { identifierType }
      }
    );
    return response.data.data;
  }

  async deleteEscalation(identifier: string, identifierType: string = 'id') {
    let response = await this.http.delete(
      `/v2/escalations/${encodeURIComponent(identifier)}`,
      {
        params: { identifierType }
      }
    );
    return response.data;
  }

  // ─── Teams ──────────────────────────────────────────────────

  async createTeam(data: {
    name: string;
    description?: string;
    members?: Array<{
      user: { id?: string; username?: string };
      role?: string;
    }>;
  }) {
    let response = await this.http.post('/v2/teams', data);
    return response.data.data;
  }

  async getTeam(identifier: string, identifierType: string = 'id') {
    let response = await this.http.get(`/v2/teams/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data.data;
  }

  async listTeams() {
    let response = await this.http.get('/v2/teams');
    return response.data.data;
  }

  async updateTeam(
    teamId: string,
    data: {
      name?: string;
      description?: string;
      members?: Array<{
        user: { id?: string; username?: string };
        role?: string;
      }>;
    }
  ) {
    let response = await this.http.patch(`/v2/teams/${encodeURIComponent(teamId)}`, data);
    return response.data.data;
  }

  async deleteTeam(identifier: string, identifierType: string = 'id') {
    let response = await this.http.delete(`/v2/teams/${encodeURIComponent(identifier)}`, {
      params: { identifierType }
    });
    return response.data;
  }

  // ─── Users ──────────────────────────────────────────────────

  async createUser(data: {
    username: string;
    fullName: string;
    role: { name: string };
    skypeUsername?: string;
    userAddress?: {
      country?: string;
      state?: string;
      city?: string;
      line?: string;
      zipCode?: string;
    };
    tags?: string[];
    details?: Record<string, string[]>;
    timezone?: string;
    locale?: string;
    invitationDisabled?: boolean;
  }) {
    let response = await this.http.post('/v2/users', data);
    return response.data.data;
  }

  async getUser(identifier: string, expand?: string) {
    let response = await this.http.get(`/v2/users/${encodeURIComponent(identifier)}`, {
      params: expand ? { expand } : {}
    });
    return response.data.data;
  }

  async listUsers(
    params: {
      limit?: number;
      offset?: number;
      sort?: string;
      order?: string;
      query?: string;
    } = {}
  ) {
    let response = await this.http.get('/v2/users', { params });
    return response.data;
  }

  async updateUser(
    identifier: string,
    data: {
      username?: string;
      fullName?: string;
      role?: { name: string };
      skypeUsername?: string;
      userAddress?: {
        country?: string;
        state?: string;
        city?: string;
        line?: string;
        zipCode?: string;
      };
      tags?: string[];
      details?: Record<string, string[]>;
      timezone?: string;
      locale?: string;
    }
  ) {
    let response = await this.http.patch(`/v2/users/${encodeURIComponent(identifier)}`, data);
    return response.data.data;
  }

  async deleteUser(identifier: string) {
    let response = await this.http.delete(`/v2/users/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async listUserTeams(identifier: string) {
    let response = await this.http.get(`/v2/users/${encodeURIComponent(identifier)}/teams`);
    return response.data.data;
  }

  async listUserSchedules(identifier: string) {
    let response = await this.http.get(
      `/v2/users/${encodeURIComponent(identifier)}/schedules`
    );
    return response.data.data;
  }

  async listUserEscalations(identifier: string) {
    let response = await this.http.get(
      `/v2/users/${encodeURIComponent(identifier)}/escalations`
    );
    return response.data.data;
  }

  // ─── Services ───────────────────────────────────────────────

  async createService(data: {
    name: string;
    teamId: string;
    description?: string;
    tags?: string[];
  }) {
    let response = await this.http.post('/v1/services', data);
    return response.data.data;
  }

  async getService(serviceId: string) {
    let response = await this.http.get(`/v1/services/${encodeURIComponent(serviceId)}`);
    return response.data.data;
  }

  async listServices(
    params: {
      query?: string;
      limit?: number;
      offset?: number;
      sort?: string;
      order?: string;
    } = {}
  ) {
    let response = await this.http.get('/v1/services', { params });
    return response.data;
  }

  async updateService(
    serviceId: string,
    data: {
      name: string;
      description?: string;
      tags?: string[];
    }
  ) {
    let response = await this.http.patch(
      `/v1/services/${encodeURIComponent(serviceId)}`,
      data
    );
    return response.data.data;
  }

  async deleteService(serviceId: string) {
    let response = await this.http.delete(`/v1/services/${encodeURIComponent(serviceId)}`);
    return response.data;
  }

  // ─── Integrations ──────────────────────────────────────────

  async listIntegrations() {
    let response = await this.http.get('/v2/integrations');
    return response.data.data;
  }
}
