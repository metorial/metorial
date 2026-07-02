import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.incident.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Incidents ───

  async listIncidents(params?: {
    pageSize?: number;
    after?: string;
    sortBy?: string;
    status?: string[];
    severity?: string[];
    statusCategory?: string[];
    incidentType?: string[];
    mode?: string[];
    createdAtGte?: string;
    createdAtLte?: string;
  }): Promise<{ incidents: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.status) query['status[one_of]'] = params.status.join(',');
    if (params?.severity) query['severity[one_of]'] = params.severity.join(',');
    if (params?.statusCategory)
      query['status_category[one_of]'] = params.statusCategory.join(',');
    if (params?.incidentType) query['incident_type[one_of]'] = params.incidentType.join(',');
    if (params?.mode) query['mode[one_of]'] = params.mode.join(',');
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.axios.get('/v2/incidents', { params: query });
    return response.data;
  }

  async getIncident(incidentId: string): Promise<{ incident: any }> {
    let response = await this.axios.get(`/v2/incidents/${incidentId}`);
    return response.data;
  }

  async createIncident(data: {
    idempotencyKey: string;
    visibility: 'public' | 'private';
    name?: string;
    summary?: string;
    severityId?: string;
    incidentStatusId?: string;
    incidentTypeId?: string;
    mode?: string;
    customFieldEntries?: Array<{
      custom_field_id: string;
      values: Array<{
        value_link?: string;
        value_catalog_entry_id?: string;
        value_literal?: string;
      }>;
    }>;
    incidentRoleAssignments?: Array<{
      incident_role_id: string;
      assignee: { email?: string; id?: string; slack_user_id?: string };
    }>;
    incidentTimestampValues?: Array<{ incident_timestamp_id: string; value: string }>;
  }): Promise<{ incident: any }> {
    let body: Record<string, any> = {
      idempotency_key: data.idempotencyKey,
      visibility: data.visibility
    };
    if (data.name) body.name = data.name;
    if (data.summary) body.summary = data.summary;
    if (data.severityId) body.severity_id = data.severityId;
    if (data.incidentStatusId) body.incident_status_id = data.incidentStatusId;
    if (data.incidentTypeId) body.incident_type_id = data.incidentTypeId;
    if (data.mode) body.mode = data.mode;
    if (data.customFieldEntries) body.custom_field_entries = data.customFieldEntries;
    if (data.incidentRoleAssignments)
      body.incident_role_assignments = data.incidentRoleAssignments;
    if (data.incidentTimestampValues)
      body.incident_timestamp_values = data.incidentTimestampValues;

    let response = await this.axios.post('/v2/incidents', body);
    return response.data;
  }

  async editIncident(
    incidentId: string,
    data: {
      notifyIncidentChannel: boolean;
      incident: {
        name?: string;
        summary?: string;
        callUrl?: string;
        severityId?: string;
        incidentStatusId?: string;
        customFieldEntries?: Array<{
          custom_field_id: string;
          values: Array<{
            value_link?: string;
            value_catalog_entry_id?: string;
            value_literal?: string;
          }>;
        }>;
        incidentRoleAssignments?: Array<{
          incident_role_id: string;
          assignee: { email?: string; id?: string; slack_user_id?: string };
        }>;
        incidentTimestampValues?: Array<{ incident_timestamp_id: string; value: string }>;
      };
    }
  ): Promise<{ incident: any }> {
    let incidentBody: Record<string, any> = {};
    let inc = data.incident;
    if (inc.name !== undefined) incidentBody.name = inc.name;
    if (inc.summary !== undefined) incidentBody.summary = inc.summary;
    if (inc.callUrl !== undefined) incidentBody.call_url = inc.callUrl;
    if (inc.severityId !== undefined) incidentBody.severity_id = inc.severityId;
    if (inc.incidentStatusId !== undefined)
      incidentBody.incident_status_id = inc.incidentStatusId;
    if (inc.customFieldEntries) incidentBody.custom_field_entries = inc.customFieldEntries;
    if (inc.incidentRoleAssignments)
      incidentBody.incident_role_assignments = inc.incidentRoleAssignments;
    if (inc.incidentTimestampValues)
      incidentBody.incident_timestamp_values = inc.incidentTimestampValues;

    let response = await this.axios.post(`/v2/incidents/${incidentId}/actions/edit`, {
      incident: incidentBody,
      notify_incident_channel: data.notifyIncidentChannel
    });
    return response.data;
  }

  // ─── Incident Updates ───

  async listIncidentUpdates(params?: {
    incidentId?: string;
    pageSize?: number;
    after?: string;
  }): Promise<{ incident_updates: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.incidentId) query.incident_id = params.incidentId;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/incident_updates', { params: query });
    return response.data;
  }

  // ─── Alerts ───

  async listAlerts(params?: {
    pageSize?: number;
    after?: string;
  }): Promise<{ alerts: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/alerts', { params: query });
    return response.data;
  }

  async getAlert(alertId: string): Promise<{ alert: any }> {
    let response = await this.axios.get(`/v2/alerts/${alertId}`);
    return response.data;
  }

  async createAlertEvent(
    alertSourceConfigId: string,
    data: {
      title: string;
      status: 'firing' | 'resolved';
      description?: string;
      deduplicationKey?: string;
      metadata?: Record<string, string>;
      sourceUrl?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      title: data.title,
      status: data.status
    };
    if (data.description) body.description = data.description;
    if (data.deduplicationKey) body.deduplication_key = data.deduplicationKey;
    if (data.metadata) body.metadata = data.metadata;
    if (data.sourceUrl) body.source_url = data.sourceUrl;

    let response = await this.axios.post(`/v2/alert_events/http/${alertSourceConfigId}`, body);
    return response.data;
  }

  // ─── Alert Sources ───

  async listAlertSources(): Promise<{ alert_sources: any[] }> {
    let response = await this.axios.get('/v2/alert_sources');
    return response.data;
  }

  async getAlertSource(alertSourceId: string): Promise<{ alert_source: any }> {
    let response = await this.axios.get(`/v2/alert_sources/${alertSourceId}`);
    return response.data;
  }

  // ─── Escalation Paths ───

  async getEscalationPath(escalationPathId: string): Promise<{ escalation_path: any }> {
    let response = await this.axios.get(`/v2/escalation_paths/${escalationPathId}`);
    return response.data;
  }

  async createEscalationPath(data: {
    name: string;
    path: any[];
  }): Promise<{ escalation_path: any }> {
    let response = await this.axios.post('/v2/escalation_paths', data);
    return response.data;
  }

  async updateEscalationPath(
    escalationPathId: string,
    data: {
      name: string;
      path: any[];
    }
  ): Promise<{ escalation_path: any }> {
    let response = await this.axios.put(`/v2/escalation_paths/${escalationPathId}`, data);
    return response.data;
  }

  // ─── Escalations ───

  async listEscalations(params?: {
    pageSize?: number;
    after?: string;
  }): Promise<{ escalations: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/escalations', { params: query });
    return response.data;
  }

  async createEscalation(data: {
    escalationPathId?: string;
    title?: string;
    idempotencyKey: string;
  }): Promise<{ escalation: any }> {
    let body: Record<string, any> = {
      idempotency_key: data.idempotencyKey
    };
    if (data.escalationPathId) body.escalation_path_id = data.escalationPathId;
    if (data.title) body.title = data.title;

    let response = await this.axios.post('/v2/escalations', body);
    return response.data;
  }

  // ─── Schedules ───

  async listSchedules(params?: {
    pageSize?: number;
    after?: string;
  }): Promise<{ schedules: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/schedules', { params: query });
    return response.data;
  }

  async getSchedule(scheduleId: string): Promise<{ schedule: any }> {
    let response = await this.axios.get(`/v2/schedules/${scheduleId}`);
    return response.data;
  }

  async listScheduleEntries(params: {
    scheduleId: string;
    entryWindowStart: string;
    entryWindowEnd: string;
  }): Promise<{ schedule_entries: any[] }> {
    let response = await this.axios.get('/v2/schedule_entries', {
      params: {
        schedule_id: params.scheduleId,
        entry_window_start: params.entryWindowStart,
        entry_window_end: params.entryWindowEnd
      }
    });
    return response.data;
  }

  async createScheduleOverride(data: {
    scheduleId: string;
    startAt: string;
    endAt: string;
    rotationId: string;
    layerId: string;
    userId?: string;
  }): Promise<{ override: any }> {
    let body: Record<string, any> = {
      schedule_id: data.scheduleId,
      start_at: data.startAt,
      end_at: data.endAt,
      rotation_id: data.rotationId,
      layer_id: data.layerId
    };
    if (data.userId) body.user_id = data.userId;

    let response = await this.axios.post('/v2/schedule_overrides', body);
    return response.data;
  }

  // ─── Catalog ───

  async listCatalogTypes(): Promise<{ catalog_types: any[] }> {
    let response = await this.axios.get('/v2/catalog_types');
    return response.data;
  }

  async getCatalogType(catalogTypeId: string): Promise<{ catalog_type: any }> {
    let response = await this.axios.get(`/v2/catalog_types/${catalogTypeId}`);
    return response.data;
  }

  async listCatalogEntries(
    catalogTypeId: string,
    params?: {
      pageSize?: number;
      after?: string;
    }
  ): Promise<{ catalog_entries: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {
      catalog_type_id: catalogTypeId
    };
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/catalog_entries', { params: query });
    return response.data;
  }

  async getCatalogEntry(catalogEntryId: string): Promise<{ catalog_entry: any }> {
    let response = await this.axios.get(`/v2/catalog_entries/${catalogEntryId}`);
    return response.data;
  }

  async createCatalogEntry(data: {
    catalogTypeId: string;
    name: string;
    externalId?: string;
    aliases?: string[];
    attributeValues?: Record<
      string,
      { value: { literal?: string; catalog_entry_id?: string } }
    >;
  }): Promise<{ catalog_entry: any }> {
    let body: Record<string, any> = {
      catalog_type_id: data.catalogTypeId,
      name: data.name
    };
    if (data.externalId) body.external_id = data.externalId;
    if (data.aliases) body.aliases = data.aliases;
    if (data.attributeValues) body.attribute_values = data.attributeValues;

    let response = await this.axios.post('/v2/catalog_entries', body);
    return response.data;
  }

  async updateCatalogEntry(
    catalogEntryId: string,
    data: {
      name?: string;
      externalId?: string;
      aliases?: string[];
      attributeValues?: Record<
        string,
        { value: { literal?: string; catalog_entry_id?: string } }
      >;
    }
  ): Promise<{ catalog_entry: any }> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    if (data.aliases !== undefined) body.aliases = data.aliases;
    if (data.attributeValues !== undefined) body.attribute_values = data.attributeValues;

    let response = await this.axios.put(`/v2/catalog_entries/${catalogEntryId}`, body);
    return response.data;
  }

  async deleteCatalogEntry(catalogEntryId: string): Promise<void> {
    await this.axios.delete(`/v2/catalog_entries/${catalogEntryId}`);
  }

  // ─── Severities ───

  async listSeverities(): Promise<{ severities: any[] }> {
    let response = await this.axios.get('/v1/severities');
    return response.data;
  }

  // ─── Statuses ───

  async listIncidentStatuses(): Promise<{ incident_statuses: any[] }> {
    let response = await this.axios.get('/v1/incident_statuses');
    return response.data;
  }

  // ─── Incident Roles ───

  async listIncidentRoles(): Promise<{ incident_roles: any[] }> {
    let response = await this.axios.get('/v2/incident_roles');
    return response.data;
  }

  // ─── Incident Types ───

  async listIncidentTypes(): Promise<{ incident_types: any[] }> {
    let response = await this.axios.get('/v1/incident_types');
    return response.data;
  }

  // ─── Follow-ups ───

  async listFollowUps(params?: {
    incidentId?: string;
    incidentMode?: string;
  }): Promise<{ follow_ups: any[] }> {
    let query: Record<string, any> = {};
    if (params?.incidentId) query.incident_id = params.incidentId;
    if (params?.incidentMode) query.incident_mode = params.incidentMode;

    let response = await this.axios.get('/v2/follow_ups', { params: query });
    return response.data;
  }

  async getFollowUp(followUpId: string): Promise<{ follow_up: any }> {
    let response = await this.axios.get(`/v2/follow_ups/${followUpId}`);
    return response.data;
  }

  // ─── Custom Fields ───

  async listCustomFields(): Promise<{ custom_fields: any[] }> {
    let response = await this.axios.get('/v2/custom_fields');
    return response.data;
  }

  // ─── Incident Timestamps ───

  async listIncidentTimestamps(): Promise<{ incident_timestamps: any[] }> {
    let response = await this.axios.get('/v2/incident_timestamps');
    return response.data;
  }

  // ─── Status Pages ───

  async listStatusPages(): Promise<{ status_pages: any[] }> {
    let response = await this.axios.get('/v2/status_pages');
    return response.data;
  }

  async getStatusPageStructure(statusPageId: string): Promise<any> {
    let response = await this.axios.get(`/v2/status_pages/${statusPageId}/structure`);
    return response.data;
  }

  async createStatusPageIncident(data: {
    statusPageId: string;
    name: string;
    incidentStatus: string;
    message: string;
    idempotencyKey: string;
    notifySubscribers?: boolean;
    componentStatuses?: Array<{ component_id: string; status: string }>;
  }): Promise<{ status_page_incident: any }> {
    let body: Record<string, any> = {
      status_page_id: data.statusPageId,
      name: data.name,
      incident_status: data.incidentStatus,
      message: data.message,
      idempotency_key: data.idempotencyKey
    };
    if (data.notifySubscribers !== undefined) body.notify_subscribers = data.notifySubscribers;
    if (data.componentStatuses) body.component_statuses = data.componentStatuses;

    let response = await this.axios.post('/v2/status_pages/incidents', body);
    return response.data;
  }

  async updateStatusPageIncident(
    statusPageIncidentId: string,
    data: {
      incidentStatus?: string;
      message?: string;
      name?: string;
      componentStatuses?: Array<{ component_id: string; status: string }>;
    }
  ): Promise<{ status_page_incident: any }> {
    let body: Record<string, any> = {};
    if (data.incidentStatus !== undefined) body.incident_status = data.incidentStatus;
    if (data.message !== undefined) body.message = data.message;
    if (data.name !== undefined) body.name = data.name;
    if (data.componentStatuses) body.component_statuses = data.componentStatuses;

    let response = await this.axios.patch(
      `/v2/status_pages/incidents/${statusPageIncidentId}`,
      body
    );
    return response.data;
  }

  async postStatusPageIncidentUpdate(
    statusPageIncidentId: string,
    data: {
      message: string;
      incidentStatus?: string;
      componentStatuses?: Array<{ component_id: string; status: string }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      message: data.message
    };
    if (data.incidentStatus) body.incident_status = data.incidentStatus;
    if (data.componentStatuses) body.component_statuses = data.componentStatuses;

    let response = await this.axios.post(
      `/v2/status_pages/incidents/${statusPageIncidentId}/updates`,
      body
    );
    return response.data;
  }

  async listStatusPageIncidents(params?: {
    statusPageId?: string;
    pageSize?: number;
    after?: string;
  }): Promise<{ status_page_incidents: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.statusPageId) query.status_page_id = params.statusPageId;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/status_pages/incidents', { params: query });
    return response.data;
  }

  // ─── Workflows ───

  async listWorkflows(): Promise<{ workflows: any[] }> {
    let response = await this.axios.get('/v2/workflows');
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<{ workflow: any }> {
    let response = await this.axios.get(`/v2/workflows/${workflowId}`);
    return response.data;
  }

  // ─── Users ───

  async listUsers(params?: {
    pageSize?: number;
    after?: string;
  }): Promise<{ users: any[]; pagination_meta: any }> {
    let query: Record<string, any> = {};
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.after) query.after = params.after;

    let response = await this.axios.get('/v2/users', { params: query });
    return response.data;
  }

  async getUser(userId: string): Promise<{ user: any }> {
    let response = await this.axios.get(`/v2/users/${userId}`);
    return response.data;
  }

  // ─── Identity ───

  async getIdentity(): Promise<{ identity: any }> {
    let response = await this.axios.get('/v1/identity');
    return response.data;
  }
}
