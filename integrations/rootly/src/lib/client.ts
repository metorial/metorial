import { createAxios } from 'slates';

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, any>;
  relationships?: Record<string, any>;
}

export interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  links?: Record<string, string>;
  meta?: Record<string, any>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.rootly.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/vnd.api+json'
      }
    });
  }

  // ==================== Incidents ====================

  async listIncidents(
    params?: {
      search?: string;
      status?: string;
      severity?: string;
      serviceIds?: string;
      teamIds?: string;
      sort?: string;
      include?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/incidents', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[status]': params?.status,
        'filter[severity]': params?.severity,
        'filter[service_ids]': params?.serviceIds,
        'filter[team_ids]': params?.teamIds,
        sort: params?.sort,
        include: params?.include
      })
    });
    return response.data;
  }

  async getIncident(incidentId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/incidents/${incidentId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createIncident(attributes: {
    title?: string;
    summary?: string;
    status?: string;
    kind?: string;
    severityId?: string;
    private?: boolean;
    serviceIds?: string[];
    environmentIds?: string[];
    incidentTypeIds?: string[];
    functionalityIds?: string[];
    groupIds?: string[];
    labels?: Record<string, string>;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/incidents', {
      data: {
        type: 'incidents',
        attributes: {
          title: attributes.title,
          summary: attributes.summary,
          status: attributes.status,
          kind: attributes.kind || 'normal',
          severity_id: attributes.severityId,
          private: attributes.private,
          service_ids: attributes.serviceIds,
          environment_ids: attributes.environmentIds,
          incident_type_ids: attributes.incidentTypeIds,
          functionality_ids: attributes.functionalityIds,
          group_ids: attributes.groupIds,
          labels: attributes.labels
        }
      }
    });
    return response.data;
  }

  async updateIncident(
    incidentId: string,
    attributes: {
      title?: string;
      summary?: string;
      status?: string;
      severityId?: string;
      private?: boolean;
      serviceIds?: string[];
      environmentIds?: string[];
      incidentTypeIds?: string[];
      functionalityIds?: string[];
      groupIds?: string[];
      labels?: Record<string, string>;
      mitigationMessage?: string;
      resolutionMessage?: string;
      cancellationMessage?: string;
    }
  ): Promise<JsonApiResponse> {
    let payload: Record<string, any> = {};
    if (attributes.title !== undefined) payload.title = attributes.title;
    if (attributes.summary !== undefined) payload.summary = attributes.summary;
    if (attributes.status !== undefined) payload.status = attributes.status;
    if (attributes.severityId !== undefined) payload.severity_id = attributes.severityId;
    if (attributes.private !== undefined) payload.private = attributes.private;
    if (attributes.serviceIds !== undefined) payload.service_ids = attributes.serviceIds;
    if (attributes.environmentIds !== undefined)
      payload.environment_ids = attributes.environmentIds;
    if (attributes.incidentTypeIds !== undefined)
      payload.incident_type_ids = attributes.incidentTypeIds;
    if (attributes.functionalityIds !== undefined)
      payload.functionality_ids = attributes.functionalityIds;
    if (attributes.groupIds !== undefined) payload.group_ids = attributes.groupIds;
    if (attributes.labels !== undefined) payload.labels = attributes.labels;
    if (attributes.mitigationMessage !== undefined)
      payload.mitigation_message = attributes.mitigationMessage;
    if (attributes.resolutionMessage !== undefined)
      payload.resolution_message = attributes.resolutionMessage;
    if (attributes.cancellationMessage !== undefined)
      payload.cancellation_message = attributes.cancellationMessage;

    let response = await this.axios.put(`/incidents/${incidentId}`, {
      data: {
        type: 'incidents',
        attributes: payload
      }
    });
    return response.data;
  }

  // ==================== Alerts ====================

  async listAlerts(
    params?: {
      search?: string;
      status?: string;
      source?: string;
      services?: string;
      environments?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/alerts', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[status]': params?.status,
        'filter[source]': params?.source,
        'filter[services]': params?.services,
        'filter[environments]': params?.environments,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async getAlert(alertId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/alerts/${alertId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createAlert(attributes: {
    source: string;
    summary: string;
    description?: string;
    status?: string;
    serviceIds?: string[];
    groupIds?: string[];
    environmentIds?: string[];
    externalId?: string;
    externalUrl?: string;
    alertUrgencyId?: string;
    notificationTargetType?: string;
    notificationTargetId?: string;
    deduplicationKey?: string;
    labels?: Array<{ key: string; value: string }>;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/alerts', {
      data: {
        type: 'alerts',
        attributes: {
          source: attributes.source,
          summary: attributes.summary,
          description: attributes.description,
          status: attributes.status,
          service_ids: attributes.serviceIds,
          group_ids: attributes.groupIds,
          environment_ids: attributes.environmentIds,
          external_id: attributes.externalId,
          external_url: attributes.externalUrl,
          alert_urgency_id: attributes.alertUrgencyId,
          notification_target_type: attributes.notificationTargetType,
          notification_target_id: attributes.notificationTargetId,
          deduplication_key: attributes.deduplicationKey,
          labels: attributes.labels
        }
      }
    });
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<JsonApiResponse> {
    let response = await this.axios.put(`/alerts/${alertId}`, {
      data: {
        type: 'alerts',
        attributes: {
          status: 'acknowledged'
        }
      }
    });
    return response.data;
  }

  async resolveAlert(alertId: string): Promise<JsonApiResponse> {
    let response = await this.axios.put(`/alerts/${alertId}`, {
      data: {
        type: 'alerts',
        attributes: {
          status: 'resolved'
        }
      }
    });
    return response.data;
  }

  // ==================== Schedules ====================

  async listSchedules(
    params?: {
      search?: string;
      name?: string;
      include?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/schedules', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        include: params?.include
      })
    });
    return response.data;
  }

  async getSchedule(scheduleId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/schedules/${scheduleId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ==================== On-Call ====================

  async listOnCalls(
    params?: {
      include?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/on_calls', {
      params: this.buildParams(params, {
        include: params?.include
      })
    });
    return response.data;
  }

  // ==================== Escalation Policies ====================

  async listEscalationPolicies(
    params?: {
      search?: string;
      name?: string;
      include?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/escalation_policies', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        include: params?.include
      })
    });
    return response.data;
  }

  async getEscalationPolicy(policyId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/escalation_policies/${policyId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ==================== Services ====================

  async listServices(
    params?: {
      search?: string;
      name?: string;
      slug?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/services', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        'filter[slug]': params?.slug,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async getService(serviceId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/services/${serviceId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ==================== Teams ====================

  async listTeams(
    params?: {
      search?: string;
      name?: string;
      slug?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/teams', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        'filter[slug]': params?.slug,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async getTeam(teamId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/teams/${teamId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ==================== Users ====================

  async listUsers(
    params?: {
      search?: string;
      email?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/users', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[email]': params?.email,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async getUser(userId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/users/${userId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async getCurrentUser(): Promise<JsonApiResponse> {
    let response = await this.axios.get('/users/me');
    return response.data;
  }

  // ==================== Workflows ====================

  async listWorkflows(
    params?: {
      search?: string;
      name?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/workflows', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async getWorkflow(workflowId: string, include?: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/workflows/${workflowId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ==================== Action Items ====================

  async listActionItems(
    params?: {
      search?: string;
      status?: string;
      include?: string;
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/action_items', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[status]': params?.status,
        include: params?.include,
        sort: params?.sort
      })
    });
    return response.data;
  }

  async createActionItem(
    incidentId: string,
    attributes: {
      summary: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedToUserId?: string;
      dueDate?: string;
    }
  ): Promise<JsonApiResponse> {
    let response = await this.axios.post(`/incidents/${incidentId}/action_items`, {
      data: {
        type: 'action_items',
        attributes: {
          summary: attributes.summary,
          description: attributes.description,
          status: attributes.status,
          priority: attributes.priority,
          assigned_to_user_id: attributes.assignedToUserId,
          due_date: attributes.dueDate
        }
      }
    });
    return response.data;
  }

  async updateActionItem(
    incidentId: string,
    actionItemId: string,
    attributes: {
      summary?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedToUserId?: string;
      dueDate?: string;
    }
  ): Promise<JsonApiResponse> {
    let payload: Record<string, any> = {};
    if (attributes.summary !== undefined) payload.summary = attributes.summary;
    if (attributes.description !== undefined) payload.description = attributes.description;
    if (attributes.status !== undefined) payload.status = attributes.status;
    if (attributes.priority !== undefined) payload.priority = attributes.priority;
    if (attributes.assignedToUserId !== undefined)
      payload.assigned_to_user_id = attributes.assignedToUserId;
    if (attributes.dueDate !== undefined) payload.due_date = attributes.dueDate;

    let response = await this.axios.put(
      `/incidents/${incidentId}/action_items/${actionItemId}`,
      {
        data: {
          type: 'action_items',
          attributes: payload
        }
      }
    );
    return response.data;
  }

  // ==================== Heartbeats ====================

  async listHeartbeats(
    params?: {
      search?: string;
      name?: string;
      include?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/heartbeats', {
      params: this.buildParams(params, {
        'filter[search]': params?.search,
        'filter[name]': params?.name,
        include: params?.include
      })
    });
    return response.data;
  }

  async getHeartbeat(heartbeatId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/heartbeats/${heartbeatId}`);
    return response.data;
  }

  async createHeartbeat(attributes: {
    name: string;
    description?: string;
    interval: number;
    intervalUnit: string;
    notificationTargetType?: string;
    notificationTargetId?: string;
    alertSummary?: string;
    alertUrgencyId?: string;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/heartbeats', {
      data: {
        type: 'heartbeats',
        attributes: {
          name: attributes.name,
          description: attributes.description,
          interval: attributes.interval,
          interval_unit: attributes.intervalUnit,
          notification_target_type: attributes.notificationTargetType,
          notification_target_id: attributes.notificationTargetId,
          alert_summary: attributes.alertSummary,
          alert_urgency_id: attributes.alertUrgencyId
        }
      }
    });
    return response.data;
  }

  // ==================== Severities ====================

  async listSeverities(params?: PaginationParams): Promise<JsonApiResponse> {
    let response = await this.axios.get('/severities', {
      params: this.buildParams(params, {})
    });
    return response.data;
  }

  // ==================== Incident Types ====================

  async listIncidentTypes(params?: PaginationParams): Promise<JsonApiResponse> {
    let response = await this.axios.get('/incident_types', {
      params: this.buildParams(params, {})
    });
    return response.data;
  }

  // ==================== Environments ====================

  async listEnvironments(
    params?: {
      search?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/environments', {
      params: this.buildParams(params, {
        'filter[search]': params?.search
      })
    });
    return response.data;
  }

  // ==================== Functionalities ====================

  async listFunctionalities(
    params?: {
      search?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/functionalities', {
      params: this.buildParams(params, {
        'filter[search]': params?.search
      })
    });
    return response.data;
  }

  // ==================== Status Pages ====================

  async listStatusPages(params?: PaginationParams): Promise<JsonApiResponse> {
    let response = await this.axios.get('/status_pages', {
      params: this.buildParams(params, {})
    });
    return response.data;
  }

  async getStatusPage(statusPageId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/status_pages/${statusPageId}`);
    return response.data;
  }

  // ==================== Webhooks ====================

  async listWebhookEndpoints(params?: PaginationParams): Promise<JsonApiResponse> {
    let response = await this.axios.get('/webhooks/endpoints', {
      params: this.buildParams(params, {})
    });
    return response.data;
  }

  async createWebhookEndpoint(attributes: {
    name: string;
    url: string;
    eventTypes: string[];
    secret?: string;
    enabled?: boolean;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/webhooks/endpoints', {
      data: {
        type: 'webhooks_endpoints',
        attributes: {
          name: attributes.name,
          url: attributes.url,
          event_types: attributes.eventTypes,
          secret: attributes.secret,
          enabled: attributes.enabled ?? true
        }
      }
    });
    return response.data;
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await this.axios.delete(`/webhooks/endpoints/${endpointId}`);
  }

  // ==================== Audit Logs ====================

  async listAuditLogs(
    params?: {
      sort?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/audit_logs', {
      params: this.buildParams(params, {
        sort: params?.sort
      })
    });
    return response.data;
  }

  // ==================== Playbooks ====================

  async listPlaybooks(
    params?: {
      search?: string;
    } & PaginationParams
  ): Promise<JsonApiResponse> {
    let response = await this.axios.get('/playbooks', {
      params: this.buildParams(params, {
        'filter[search]': params?.search
      })
    });
    return response.data;
  }

  // ==================== Helpers ====================

  private buildParams(
    paginationSource: PaginationParams | undefined,
    filters: Record<string, string | undefined>
  ): Record<string, string | number> {
    let params: Record<string, string | number> = {};

    for (let [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }

    if (paginationSource?.pageNumber !== undefined) {
      params['page[number]'] = paginationSource.pageNumber;
    }
    if (paginationSource?.pageSize !== undefined) {
      params['page[size]'] = paginationSource.pageSize;
    }

    return params;
  }
}

export let flattenResource = (resource: JsonApiResource): Record<string, any> => {
  return {
    id: resource.id,
    type: resource.type,
    ...resource.attributes
  };
};

export let flattenResources = (resources: JsonApiResource[]): Record<string, any>[] => {
  return resources.map(flattenResource);
};
