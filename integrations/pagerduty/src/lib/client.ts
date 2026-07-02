import { createAxios } from 'slates';
import type {
  PagerDutyAnalyticsIncidentData,
  PagerDutyEscalationPolicy,
  PagerDutyIncident,
  PagerDutyIncidentNote,
  PagerDutyMaintenanceWindow,
  PagerDutyOnCall,
  PagerDutyPriority,
  PagerDutySchedule,
  PagerDutyService,
  PagerDutyTeam,
  PagerDutyUser,
  PagerDutyWebhookSubscription
} from './types';

export class PagerDutyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; tokenType?: string; region?: string }) {
    let baseURL =
      params.region === 'eu' ? 'https://api.eu.pagerduty.com' : 'https://api.pagerduty.com';

    let authHeader =
      params.tokenType === 'api_key'
        ? `Token token=${params.token}`
        : `Bearer ${params.token}`;

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Generic helpers ────────────────────────────────────────

  private async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    let response = await this.axios.get(path, { params });
    return response.data as T;
  }

  private async post<T>(path: string, body?: Record<string, any>): Promise<T> {
    let response = await this.axios.post(path, body || {});
    return response.data as T;
  }

  private async put<T>(path: string, body?: Record<string, any>): Promise<T> {
    let response = await this.axios.put(path, body || {});
    return response.data as T;
  }

  private async delete(path: string): Promise<void> {
    await this.axios.delete(path);
  }

  // ─── Incidents ──────────────────────────────────────────────

  async listIncidents(params?: {
    statuses?: string[];
    serviceIds?: string[];
    teamIds?: string[];
    userIds?: string[];
    urgencies?: string[];
    since?: string;
    until?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
    includeFields?: string[];
  }): Promise<{ incidents: PagerDutyIncident[]; more: boolean; total: number }> {
    let query: Record<string, any> = {};
    if (params?.statuses) query['statuses[]'] = params.statuses;
    if (params?.serviceIds) query['service_ids[]'] = params.serviceIds;
    if (params?.teamIds) query['team_ids[]'] = params.teamIds;
    if (params?.userIds) query['user_ids[]'] = params.userIds;
    if (params?.urgencies) query['urgencies[]'] = params.urgencies;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;
    if (params?.includeFields) query['include[]'] = params.includeFields;

    let data = await this.get<{
      incidents: PagerDutyIncident[];
      more: boolean;
      total: number;
    }>('/incidents', query);
    return data;
  }

  async getIncident(incidentId: string): Promise<PagerDutyIncident> {
    let data = await this.get<{ incident: PagerDutyIncident }>(`/incidents/${incidentId}`);
    return data.incident;
  }

  async createIncident(
    params: {
      title: string;
      serviceId: string;
      urgency?: string;
      body?: string;
      escalationPolicyId?: string;
      assignmentIds?: string[];
      priorityId?: string;
      incidentKey?: string;
      conferenceNumber?: string;
      conferenceUrl?: string;
    },
    _fromEmail: string
  ): Promise<PagerDutyIncident> {
    let incident: Record<string, any> = {
      type: 'incident',
      title: params.title,
      service: { id: params.serviceId, type: 'service_reference' }
    };

    if (params.urgency) incident.urgency = params.urgency;
    if (params.body) incident.body = { type: 'incident_body', details: params.body };
    if (params.escalationPolicyId) {
      incident.escalation_policy = {
        id: params.escalationPolicyId,
        type: 'escalation_policy_reference'
      };
    }
    if (params.assignmentIds) {
      incident.assignments = params.assignmentIds.map(id => ({
        assignee: { id, type: 'user_reference' }
      }));
    }
    if (params.priorityId) {
      incident.priority = { id: params.priorityId, type: 'priority_reference' };
    }
    if (params.incidentKey) incident.incident_key = params.incidentKey;
    if (params.conferenceNumber || params.conferenceUrl) {
      incident.conference_bridge = {};
      if (params.conferenceNumber)
        incident.conference_bridge.conference_number = params.conferenceNumber;
      if (params.conferenceUrl)
        incident.conference_bridge.conference_url = params.conferenceUrl;
    }

    let data = await this.post<{ incident: PagerDutyIncident }>('/incidents', { incident });
    return data.incident;
  }

  async updateIncident(
    incidentId: string,
    params: {
      status?: string;
      title?: string;
      urgency?: string;
      escalationPolicyId?: string;
      assignmentIds?: string[];
      priorityId?: string;
      conferenceNumber?: string;
      conferenceUrl?: string;
      resolution?: string;
    },
    fromEmail: string
  ): Promise<PagerDutyIncident> {
    let incident: Record<string, any> = {
      id: incidentId,
      type: 'incident'
    };

    if (params.status) incident.status = params.status;
    if (params.title) incident.title = params.title;
    if (params.urgency) incident.urgency = params.urgency;
    if (params.escalationPolicyId) {
      incident.escalation_policy = {
        id: params.escalationPolicyId,
        type: 'escalation_policy_reference'
      };
    }
    if (params.assignmentIds) {
      incident.assignments = params.assignmentIds.map(id => ({
        assignee: { id, type: 'user_reference' }
      }));
    }
    if (params.priorityId) {
      incident.priority = { id: params.priorityId, type: 'priority_reference' };
    }
    if (params.conferenceNumber || params.conferenceUrl) {
      incident.conference_bridge = {};
      if (params.conferenceNumber)
        incident.conference_bridge.conference_number = params.conferenceNumber;
      if (params.conferenceUrl)
        incident.conference_bridge.conference_url = params.conferenceUrl;
    }
    if (params.resolution) {
      incident.body = { type: 'incident_body', details: params.resolution };
    }

    let response = await this.axios.put(
      `/incidents/${incidentId}`,
      { incident },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { incident: PagerDutyIncident }).incident;
  }

  async manageIncidents(
    incidents: {
      incidentId: string;
      status?: string;
      title?: string;
      urgency?: string;
      escalationPolicyId?: string;
      assignmentIds?: string[];
      priorityId?: string;
    }[],
    fromEmail: string
  ): Promise<PagerDutyIncident[]> {
    let body = incidents.map(inc => {
      let item: Record<string, any> = {
        id: inc.incidentId,
        type: 'incident_reference'
      };
      if (inc.status) item.status = inc.status;
      if (inc.title) item.title = inc.title;
      if (inc.urgency) item.urgency = inc.urgency;
      if (inc.escalationPolicyId) {
        item.escalation_policy = {
          id: inc.escalationPolicyId,
          type: 'escalation_policy_reference'
        };
      }
      if (inc.assignmentIds) {
        item.assignments = inc.assignmentIds.map(id => ({
          assignee: { id, type: 'user_reference' }
        }));
      }
      if (inc.priorityId) {
        item.priority = { id: inc.priorityId, type: 'priority_reference' };
      }
      return item;
    });

    let response = await this.axios.put(
      '/incidents',
      { incidents: body },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { incidents: PagerDutyIncident[] }).incidents;
  }

  async mergeIncidents(
    targetIncidentId: string,
    sourceIncidentIds: string[],
    fromEmail: string
  ): Promise<PagerDutyIncident> {
    let response = await this.axios.put(
      `/incidents/${targetIncidentId}/merge`,
      {
        source_incidents: sourceIncidentIds.map(id => ({
          id,
          type: 'incident_reference'
        }))
      },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { incident: PagerDutyIncident }).incident;
  }

  async addIncidentNote(
    incidentId: string,
    content: string,
    fromEmail: string
  ): Promise<PagerDutyIncidentNote> {
    let response = await this.axios.post(
      `/incidents/${incidentId}/notes`,
      {
        note: { content }
      },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { note: PagerDutyIncidentNote }).note;
  }

  async listIncidentNotes(incidentId: string): Promise<PagerDutyIncidentNote[]> {
    let data = await this.get<{ notes: PagerDutyIncidentNote[] }>(
      `/incidents/${incidentId}/notes`
    );
    return data.notes;
  }

  async snoozeIncident(
    incidentId: string,
    durationSeconds: number,
    fromEmail: string
  ): Promise<PagerDutyIncident> {
    let response = await this.axios.post(
      `/incidents/${incidentId}/snooze`,
      {
        duration: durationSeconds
      },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { incident: PagerDutyIncident }).incident;
  }

  // ─── Services ───────────────────────────────────────────────

  async listServices(params?: {
    teamIds?: string[];
    query?: string;
    includeFields?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<{ services: PagerDutyService[]; more: boolean; total: number }> {
    let query: Record<string, any> = {};
    if (params?.teamIds) query['team_ids[]'] = params.teamIds;
    if (params?.query) query.query = params.query;
    if (params?.includeFields) query['include[]'] = params.includeFields;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;

    let data = await this.get<{ services: PagerDutyService[]; more: boolean; total: number }>(
      '/services',
      query
    );
    return data;
  }

  async getService(serviceId: string, includeFields?: string[]): Promise<PagerDutyService> {
    let params: Record<string, any> = {};
    if (includeFields) params['include[]'] = includeFields;
    let data = await this.get<{ service: PagerDutyService }>(`/services/${serviceId}`, params);
    return data.service;
  }

  async createService(params: {
    name: string;
    description?: string;
    escalationPolicyId: string;
    autoResolveTimeout?: number | null;
    acknowledgementTimeout?: number | null;
    alertCreation?: string;
    urgency?: string;
  }): Promise<PagerDutyService> {
    let service: Record<string, any> = {
      type: 'service',
      name: params.name,
      escalation_policy: { id: params.escalationPolicyId, type: 'escalation_policy_reference' }
    };

    if (params.description !== undefined) service.description = params.description;
    if (params.autoResolveTimeout !== undefined)
      service.auto_resolve_timeout = params.autoResolveTimeout;
    if (params.acknowledgementTimeout !== undefined)
      service.acknowledgement_timeout = params.acknowledgementTimeout;
    if (params.alertCreation) service.alert_creation = params.alertCreation;
    if (params.urgency) {
      service.incident_urgency_rule = { type: 'constant', urgency: params.urgency };
    }

    let data = await this.post<{ service: PagerDutyService }>('/services', { service });
    return data.service;
  }

  async updateService(
    serviceId: string,
    params: {
      name?: string;
      description?: string;
      escalationPolicyId?: string;
      autoResolveTimeout?: number | null;
      acknowledgementTimeout?: number | null;
      alertCreation?: string;
      urgency?: string;
    }
  ): Promise<PagerDutyService> {
    let service: Record<string, any> = {
      type: 'service'
    };

    if (params.name !== undefined) service.name = params.name;
    if (params.description !== undefined) service.description = params.description;
    if (params.escalationPolicyId) {
      service.escalation_policy = {
        id: params.escalationPolicyId,
        type: 'escalation_policy_reference'
      };
    }
    if (params.autoResolveTimeout !== undefined)
      service.auto_resolve_timeout = params.autoResolveTimeout;
    if (params.acknowledgementTimeout !== undefined)
      service.acknowledgement_timeout = params.acknowledgementTimeout;
    if (params.alertCreation) service.alert_creation = params.alertCreation;
    if (params.urgency) {
      service.incident_urgency_rule = { type: 'constant', urgency: params.urgency };
    }

    let data = await this.put<{ service: PagerDutyService }>(`/services/${serviceId}`, {
      service
    });
    return data.service;
  }

  async deleteService(serviceId: string): Promise<void> {
    await this.delete(`/services/${serviceId}`);
  }

  // ─── Users ──────────────────────────────────────────────────

  async listUsers(params?: {
    query?: string;
    teamIds?: string[];
    includeFields?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ users: PagerDutyUser[]; more: boolean; total: number }> {
    let query: Record<string, any> = {};
    if (params?.query) query.query = params.query;
    if (params?.teamIds) query['team_ids[]'] = params.teamIds;
    if (params?.includeFields) query['include[]'] = params.includeFields;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let data = await this.get<{ users: PagerDutyUser[]; more: boolean; total: number }>(
      '/users',
      query
    );
    return data;
  }

  async getUser(userId: string, includeFields?: string[]): Promise<PagerDutyUser> {
    let params: Record<string, any> = {};
    if (includeFields) params['include[]'] = includeFields;
    let data = await this.get<{ user: PagerDutyUser }>(`/users/${userId}`, params);
    return data.user;
  }

  async getCurrentUser(includeFields?: string[]): Promise<PagerDutyUser> {
    let params: Record<string, any> = {};
    if (includeFields) params['include[]'] = includeFields;
    let data = await this.get<{ user: PagerDutyUser }>('/users/me', params);
    return data.user;
  }

  // ─── Teams ──────────────────────────────────────────────────

  async listTeams(params?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ teams: PagerDutyTeam[]; more: boolean; total: number }> {
    let query: Record<string, any> = {};
    if (params?.query) query.query = params.query;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let data = await this.get<{ teams: PagerDutyTeam[]; more: boolean; total: number }>(
      '/teams',
      query
    );
    return data;
  }

  async getTeam(teamId: string): Promise<PagerDutyTeam> {
    let data = await this.get<{ team: PagerDutyTeam }>(`/teams/${teamId}`);
    return data.team;
  }

  // ─── Escalation Policies ───────────────────────────────────

  async listEscalationPolicies(params?: {
    query?: string;
    userIds?: string[];
    teamIds?: string[];
    includeFields?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<{
    escalation_policies: PagerDutyEscalationPolicy[];
    more: boolean;
    total: number;
  }> {
    let query: Record<string, any> = {};
    if (params?.query) query.query = params.query;
    if (params?.userIds) query['user_ids[]'] = params.userIds;
    if (params?.teamIds) query['team_ids[]'] = params.teamIds;
    if (params?.includeFields) query['include[]'] = params.includeFields;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;

    let data = await this.get<{
      escalation_policies: PagerDutyEscalationPolicy[];
      more: boolean;
      total: number;
    }>('/escalation_policies', query);
    return data;
  }

  async getEscalationPolicy(
    policyId: string,
    includeFields?: string[]
  ): Promise<PagerDutyEscalationPolicy> {
    let params: Record<string, any> = {};
    if (includeFields) params['include[]'] = includeFields;
    let data = await this.get<{ escalation_policy: PagerDutyEscalationPolicy }>(
      `/escalation_policies/${policyId}`,
      params
    );
    return data.escalation_policy;
  }

  // ─── Schedules ──────────────────────────────────────────────

  async listSchedules(params?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ schedules: PagerDutySchedule[]; more: boolean; total: number }> {
    let query: Record<string, any> = {};
    if (params?.query) query.query = params.query;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let data = await this.get<{
      schedules: PagerDutySchedule[];
      more: boolean;
      total: number;
    }>('/schedules', query);
    return data;
  }

  async getSchedule(
    scheduleId: string,
    params?: { since?: string; until?: string; timeZone?: string }
  ): Promise<PagerDutySchedule> {
    let query: Record<string, any> = {};
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.timeZone) query.time_zone = params.timeZone;

    let data = await this.get<{ schedule: PagerDutySchedule }>(
      `/schedules/${scheduleId}`,
      query
    );
    return data.schedule;
  }

  // ─── On-Calls ───────────────────────────────────────────────

  async listOnCalls(params?: {
    scheduleIds?: string[];
    userIds?: string[];
    escalationPolicyIds?: string[];
    since?: string;
    until?: string;
    earliest?: boolean;
    limit?: number;
    offset?: number;
    includeFields?: string[];
  }): Promise<{ oncalls: PagerDutyOnCall[]; more: boolean }> {
    let query: Record<string, any> = {};
    if (params?.scheduleIds) query['schedule_ids[]'] = params.scheduleIds;
    if (params?.userIds) query['user_ids[]'] = params.userIds;
    if (params?.escalationPolicyIds)
      query['escalation_policy_ids[]'] = params.escalationPolicyIds;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.earliest !== undefined) query.earliest = params.earliest;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;
    if (params?.includeFields) query['include[]'] = params.includeFields;

    let data = await this.get<{ oncalls: PagerDutyOnCall[]; more: boolean }>(
      '/oncalls',
      query
    );
    return data;
  }

  // ─── Maintenance Windows ────────────────────────────────────

  async listMaintenanceWindows(params?: {
    serviceIds?: string[];
    teamIds?: string[];
    filter?: string;
    query?: string;
    limit?: number;
    offset?: number;
    includeFields?: string[];
  }): Promise<{
    maintenance_windows: PagerDutyMaintenanceWindow[];
    more: boolean;
    total: number;
  }> {
    let query: Record<string, any> = {};
    if (params?.serviceIds) query['service_ids[]'] = params.serviceIds;
    if (params?.teamIds) query['team_ids[]'] = params.teamIds;
    if (params?.filter) query.filter = params.filter;
    if (params?.query) query.query = params.query;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;
    if (params?.includeFields) query['include[]'] = params.includeFields;

    let data = await this.get<{
      maintenance_windows: PagerDutyMaintenanceWindow[];
      more: boolean;
      total: number;
    }>('/maintenance_windows', query);
    return data;
  }

  async createMaintenanceWindow(
    params: {
      startTime: string;
      endTime: string;
      description?: string;
      serviceIds: string[];
    },
    fromEmail: string
  ): Promise<PagerDutyMaintenanceWindow> {
    let maintenanceWindow: Record<string, any> = {
      type: 'maintenance_window',
      start_time: params.startTime,
      end_time: params.endTime,
      services: params.serviceIds.map(id => ({ id, type: 'service_reference' }))
    };
    if (params.description) maintenanceWindow.description = params.description;

    let response = await this.axios.post(
      '/maintenance_windows',
      { maintenance_window: maintenanceWindow },
      {
        headers: { From: fromEmail }
      }
    );
    return (response.data as { maintenance_window: PagerDutyMaintenanceWindow })
      .maintenance_window;
  }

  async deleteMaintenanceWindow(windowId: string): Promise<void> {
    await this.delete(`/maintenance_windows/${windowId}`);
  }

  // ─── Priorities ─────────────────────────────────────────────

  async listPriorities(): Promise<PagerDutyPriority[]> {
    let data = await this.get<{ priorities: PagerDutyPriority[] }>('/priorities');
    return data.priorities;
  }

  // ─── Analytics ──────────────────────────────────────────────

  async getAnalyticsIncidents(params?: {
    since?: string;
    until?: string;
    serviceIds?: string[];
    teamIds?: string[];
    urgency?: string;
  }): Promise<PagerDutyAnalyticsIncidentData[]> {
    let body: Record<string, any> = {};
    if (params?.since || params?.until) {
      body.filters = {};
      if (params?.since) body.filters.created_at_start = params.since;
      if (params?.until) body.filters.created_at_end = params.until;
      if (params?.serviceIds) body.filters.service_ids = params.serviceIds;
      if (params?.teamIds) body.filters.team_ids = params.teamIds;
      if (params?.urgency) body.filters.urgency = params.urgency;
    }

    let data = await this.post<{ data: PagerDutyAnalyticsIncidentData[] }>(
      '/analytics/metrics/incidents/all',
      body
    );
    return data.data;
  }

  // ─── Webhook Subscriptions ──────────────────────────────────

  async listWebhookSubscriptions(params?: { limit?: number; offset?: number }): Promise<{
    webhook_subscriptions: PagerDutyWebhookSubscription[];
    more: boolean;
    total: number;
  }> {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let data = await this.get<{
      webhook_subscriptions: PagerDutyWebhookSubscription[];
      more: boolean;
      total: number;
    }>('/webhook_subscriptions', query);
    return data;
  }

  async createWebhookSubscription(params: {
    deliveryUrl: string;
    events: string[];
    filterType: string;
    filterId?: string;
    description?: string;
    customHeaders?: { name: string; value: string }[];
  }): Promise<PagerDutyWebhookSubscription> {
    let subscription: Record<string, any> = {
      type: 'webhook_subscription',
      delivery_method: {
        type: 'http_delivery_method',
        url: params.deliveryUrl
      },
      events: params.events,
      filter: {
        type: params.filterType
      }
    };

    if (params.filterId) subscription.filter.id = params.filterId;
    if (params.description) subscription.description = params.description;
    if (params.customHeaders) {
      subscription.delivery_method.custom_headers = params.customHeaders;
    }

    let data = await this.post<{ webhook_subscription: PagerDutyWebhookSubscription }>(
      '/webhook_subscriptions',
      { webhook_subscription: subscription }
    );
    return data.webhook_subscription;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.delete(`/webhook_subscriptions/${subscriptionId}`);
  }

  // ─── Events API v2 ─────────────────────────────────────────

  async sendEvent(params: {
    routingKey: string;
    eventAction: 'trigger' | 'acknowledge' | 'resolve';
    dedupKey?: string;
    severity?: string;
    summary?: string;
    source?: string;
    component?: string;
    group?: string;
    eventClass?: string;
    customDetails?: Record<string, any>;
  }): Promise<{ status: string; message: string; dedup_key: string }> {
    let eventsAxios = createAxios({
      baseURL: 'https://events.pagerduty.com',
      headers: { 'Content-Type': 'application/json' }
    });

    let body: Record<string, any> = {
      routing_key: params.routingKey,
      event_action: params.eventAction
    };

    if (params.dedupKey) body.dedup_key = params.dedupKey;

    if (params.eventAction === 'trigger') {
      body.payload = {
        summary: params.summary || 'Triggered via API',
        severity: params.severity || 'critical',
        source: params.source || 'Slates Integration'
      };
      if (params.component) body.payload.component = params.component;
      if (params.group) body.payload.group = params.group;
      if (params.eventClass) body.payload.class = params.eventClass;
      if (params.customDetails) body.payload.custom_details = params.customDetails;
    }

    let response = await eventsAxios.post('/v2/enqueue', body);
    return response.data as { status: string; message: string; dedup_key: string };
  }

  async sendChangeEvent(params: {
    routingKey: string;
    summary: string;
    source?: string;
    timestamp?: string;
    customDetails?: Record<string, any>;
    links?: { href: string; text?: string }[];
  }): Promise<{ status: string; message: string }> {
    let eventsAxios = createAxios({
      baseURL: 'https://events.pagerduty.com',
      headers: { 'Content-Type': 'application/json' }
    });

    let body: Record<string, any> = {
      routing_key: params.routingKey,
      payload: {
        summary: params.summary,
        source: params.source || 'Slates Integration'
      }
    };

    if (params.timestamp) body.payload.timestamp = params.timestamp;
    if (params.customDetails) body.payload.custom_details = params.customDetails;
    if (params.links) body.links = params.links;

    let response = await eventsAxios.post('/v2/change/enqueue', body);
    return response.data as { status: string; message: string };
  }
}
