import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}

export class UptimeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; teamName?: string }) {
    this.axios = createAxios({
      baseURL: 'https://uptime.betterstack.com/api/v2',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
    if (params.teamName) {
      this.axios.defaults.headers.common['X-Team-Name'] = params.teamName;
    }
  }

  // ---- Monitors ----

  async listMonitors(params?: {
    page?: number;
    perPage?: number;
    pronounceableName?: string;
    url?: string;
    monitorType?: string;
    paused?: boolean;
    sort?: string;
    monitorGroupId?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/monitors', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        pronounceable_name: params?.pronounceableName,
        url: params?.url,
        monitor_type: params?.monitorType,
        paused: params?.paused,
        sort: params?.sort,
        monitor_group_id: params?.monitorGroupId
      }
    });
    return response.data;
  }

  async getMonitor(monitorId: string): Promise<any> {
    let response = await this.axios.get(`/monitors/${monitorId}`);
    return response.data;
  }

  async createMonitor(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/monitors', data);
    return response.data;
  }

  async updateMonitor(monitorId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/monitors/${monitorId}`, data);
    return response.data;
  }

  async deleteMonitor(monitorId: string): Promise<void> {
    await this.axios.delete(`/monitors/${monitorId}`);
  }

  // ---- Monitor Groups ----

  async listMonitorGroups(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/monitor-groups', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ---- Heartbeats ----

  async listHeartbeats(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/heartbeats', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getHeartbeat(heartbeatId: string): Promise<any> {
    let response = await this.axios.get(`/heartbeats/${heartbeatId}`);
    return response.data;
  }

  async createHeartbeat(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/heartbeats', data);
    return response.data;
  }

  async updateHeartbeat(heartbeatId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/heartbeats/${heartbeatId}`, data);
    return response.data;
  }

  async deleteHeartbeat(heartbeatId: string): Promise<void> {
    await this.axios.delete(`/heartbeats/${heartbeatId}`);
  }

  // ---- Incidents ----

  async listIncidents(params?: {
    page?: number;
    perPage?: number;
    from?: string;
    to?: string;
    monitorId?: string;
    heartbeatId?: string;
    resolved?: boolean;
    acknowledged?: boolean;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/incidents', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        from: params?.from,
        to: params?.to,
        monitor_id: params?.monitorId,
        heartbeat_id: params?.heartbeatId,
        resolved: params?.resolved,
        acknowledged: params?.acknowledged
      }
    });
    return response.data;
  }

  async getIncident(incidentId: string): Promise<any> {
    let response = await this.axios.get(`/incidents/${incidentId}`);
    return response.data;
  }

  async createIncident(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/incidents', data);
    return response.data;
  }

  async acknowledgeIncident(incidentId: string, acknowledgedBy?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (acknowledgedBy) {
      body.acknowledged_by = acknowledgedBy;
    }
    let response = await this.axios.post(`/incidents/${incidentId}/acknowledge`, body);
    return response.data;
  }

  async resolveIncident(incidentId: string, resolvedBy?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (resolvedBy) {
      body.resolved_by = resolvedBy;
    }
    let response = await this.axios.post(`/incidents/${incidentId}/resolve`, body);
    return response.data;
  }

  async deleteIncident(incidentId: string): Promise<void> {
    await this.axios.delete(`/incidents/${incidentId}`);
  }

  async getIncidentTimeline(
    incidentId: string,
    params?: { page?: number; perPage?: number }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/incidents/${incidentId}/timeline`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ---- Status Pages ----

  async listStatusPages(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/status-pages', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getStatusPage(statusPageId: string): Promise<any> {
    let response = await this.axios.get(`/status-pages/${statusPageId}`);
    return response.data;
  }

  async createStatusPage(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/status-pages', data);
    return response.data;
  }

  async updateStatusPage(statusPageId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/status-pages/${statusPageId}`, data);
    return response.data;
  }

  async deleteStatusPage(statusPageId: string): Promise<void> {
    await this.axios.delete(`/status-pages/${statusPageId}`);
  }

  // ---- Status Page Resources ----

  async listStatusPageResources(
    statusPageId: string,
    params?: { page?: number; perPage?: number }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/status-pages/${statusPageId}/resources`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createStatusPageResource(
    statusPageId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(`/status-pages/${statusPageId}/resources`, data);
    return response.data;
  }

  async deleteStatusPageResource(statusPageId: string, resourceId: string): Promise<void> {
    await this.axios.delete(`/status-pages/${statusPageId}/resources/${resourceId}`);
  }

  // ---- Status Page Reports ----

  async createStatusPageReport(statusPageId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/status-pages/${statusPageId}/status-reports`, data);
    return response.data;
  }

  // ---- On-Call Calendars ----

  async listOnCallCalendars(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/on-calls', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getOnCallCalendar(calendarId: string): Promise<any> {
    let response = await this.axios.get(`/on-calls/${calendarId}`);
    return response.data;
  }

  async createOnCallCalendar(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/on-calls', data);
    return response.data;
  }

  async updateOnCallCalendar(calendarId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/on-calls/${calendarId}`, data);
    return response.data;
  }

  async deleteOnCallCalendar(calendarId: string): Promise<void> {
    await this.axios.delete(`/on-calls/${calendarId}`);
  }

  // ---- Escalation Policies ----

  async listEscalationPolicies(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/policies', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getEscalationPolicy(policyId: string): Promise<any> {
    let response = await this.axios.get(`/policies/${policyId}`);
    return response.data;
  }

  async createEscalationPolicy(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/policies', data);
    return response.data;
  }

  async updateEscalationPolicy(policyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/policies/${policyId}`, data);
    return response.data;
  }

  async deleteEscalationPolicy(policyId: string): Promise<void> {
    await this.axios.delete(`/policies/${policyId}`);
  }

  // ---- Incoming Webhooks ----

  async listIncomingWebhooks(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/incoming-webhooks', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getIncomingWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/incoming-webhooks/${webhookId}`);
    return response.data;
  }

  async createIncomingWebhook(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/incoming-webhooks', data);
    return response.data;
  }

  async updateIncomingWebhook(webhookId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/incoming-webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteIncomingWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/incoming-webhooks/${webhookId}`);
  }
}
