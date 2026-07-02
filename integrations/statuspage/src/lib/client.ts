import { createAxios } from 'slates';

export class Client {
  private api: ReturnType<typeof createAxios>;
  private pageId: string;

  constructor(params: { token: string; pageId: string }) {
    this.pageId = params.pageId;
    this.api = createAxios({
      baseURL: 'https://api.statuspage.io/v1',
      headers: {
        Authorization: `OAuth ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Page ───

  async getPage(): Promise<any> {
    let response = await this.api.get(`/pages/${this.pageId}`);
    return response.data;
  }

  async updatePage(data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/pages/${this.pageId}`, { page: data });
    return response.data;
  }

  // ─── Components ───

  async listComponents(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/components`);
    return response.data;
  }

  async getComponent(componentId: string): Promise<any> {
    let response = await this.api.get(`/pages/${this.pageId}/components/${componentId}`);
    return response.data;
  }

  async createComponent(data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/components`, {
      component: data
    });
    return response.data;
  }

  async updateComponent(componentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/pages/${this.pageId}/components/${componentId}`, {
      component: data
    });
    return response.data;
  }

  async deleteComponent(componentId: string): Promise<void> {
    await this.api.delete(`/pages/${this.pageId}/components/${componentId}`);
  }

  async getComponentUptime(componentId: string, start?: string, end?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (start) params.start = start;
    if (end) params.end = end;
    let response = await this.api.get(
      `/pages/${this.pageId}/components/${componentId}/uptime`,
      { params }
    );
    return response.data;
  }

  // ─── Component Groups ───

  async listComponentGroups(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/component-groups`);
    return response.data;
  }

  async createComponentGroup(data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/component-groups`, {
      component_group: data
    });
    return response.data;
  }

  async updateComponentGroup(groupId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/pages/${this.pageId}/component-groups/${groupId}`, {
      component_group: data
    });
    return response.data;
  }

  async deleteComponentGroup(groupId: string): Promise<void> {
    await this.api.delete(`/pages/${this.pageId}/component-groups/${groupId}`);
  }

  // ─── Incidents ───

  async listIncidents(params?: {
    query?: string;
    limit?: number;
    page?: number;
  }): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/incidents`, {
      params: { q: params?.query, per_page: params?.limit, page: params?.page }
    });
    return response.data;
  }

  async listUnresolvedIncidents(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/incidents/unresolved`);
    return response.data;
  }

  async listScheduledIncidents(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/incidents/scheduled`);
    return response.data;
  }

  async getIncident(incidentId: string): Promise<any> {
    let response = await this.api.get(`/pages/${this.pageId}/incidents/${incidentId}`);
    return response.data;
  }

  async createIncident(data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/incidents`, { incident: data });
    return response.data;
  }

  async updateIncident(incidentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/pages/${this.pageId}/incidents/${incidentId}`, {
      incident: data
    });
    return response.data;
  }

  async deleteIncident(incidentId: string): Promise<void> {
    await this.api.delete(`/pages/${this.pageId}/incidents/${incidentId}`);
  }

  // ─── Incident Templates ───

  async listIncidentTemplates(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/incident_templates`);
    return response.data;
  }

  // ─── Subscribers ───

  async listSubscribers(params?: {
    type?: string;
    state?: string;
    limit?: number;
    page?: number;
    sortField?: string;
    sortDirection?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.state) queryParams.state = params.state;
    if (params?.limit) queryParams.per_page = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.sortField) queryParams.sort_field = params.sortField;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    let response = await this.api.get(`/pages/${this.pageId}/subscribers`, {
      params: queryParams
    });
    return response.data;
  }

  async getSubscriber(subscriberId: string): Promise<any> {
    let response = await this.api.get(`/pages/${this.pageId}/subscribers/${subscriberId}`);
    return response.data;
  }

  async createSubscriber(data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/subscribers`, {
      subscriber: data
    });
    return response.data;
  }

  async unsubscribeSubscriber(subscriberId: string): Promise<void> {
    await this.api.delete(`/pages/${this.pageId}/subscribers/${subscriberId}`);
  }

  async resubscribeSubscriber(subscriberId: string): Promise<any> {
    let response = await this.api.post(
      `/pages/${this.pageId}/subscribers/${subscriberId}/resubscribe`
    );
    return response.data;
  }

  // ─── Incident Subscribers ───

  async listIncidentSubscribers(incidentId: string): Promise<any[]> {
    let response = await this.api.get(
      `/pages/${this.pageId}/incidents/${incidentId}/subscribers`
    );
    return response.data;
  }

  async createIncidentSubscriber(incidentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(
      `/pages/${this.pageId}/incidents/${incidentId}/subscribers`,
      { subscriber: data }
    );
    return response.data;
  }

  // ─── Metrics ───

  async listMetrics(): Promise<any[]> {
    let response = await this.api.get(`/pages/${this.pageId}/metrics`);
    return response.data;
  }

  async getMetric(metricId: string): Promise<any> {
    let response = await this.api.get(`/pages/${this.pageId}/metrics/${metricId}`);
    return response.data;
  }

  async createMetric(data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/metrics`, { metric: data });
    return response.data;
  }

  async updateMetric(metricId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/pages/${this.pageId}/metrics/${metricId}`, {
      metric: data
    });
    return response.data;
  }

  async deleteMetric(metricId: string): Promise<void> {
    await this.api.delete(`/pages/${this.pageId}/metrics/${metricId}`);
  }

  async submitMetricData(
    metricId: string,
    dataPoints: { timestamp: number; value: number }[]
  ): Promise<any> {
    let response = await this.api.post(`/pages/${this.pageId}/metrics/${metricId}/data`, {
      data: dataPoints
    });
    return response.data;
  }

  // ─── Postmortems ───

  async getPostmortem(incidentId: string): Promise<any> {
    let response = await this.api.get(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem`
    );
    return response.data;
  }

  async createOrUpdatePostmortem(incidentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem`,
      { postmortem: data }
    );
    return response.data;
  }

  async publishPostmortem(
    incidentId: string,
    notifySubscribers: boolean,
    notifyTwitter: boolean
  ): Promise<any> {
    let response = await this.api.put(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem/publish`,
      {
        postmortem: {
          notify_subscribers: notifySubscribers,
          notify_twitter: notifyTwitter
        }
      }
    );
    return response.data;
  }

  async revertPostmortem(incidentId: string): Promise<any> {
    let response = await this.api.put(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem/revert`
    );
    return response.data;
  }
}
