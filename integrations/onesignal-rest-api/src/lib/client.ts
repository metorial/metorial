import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  appId: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private appId: string;

  constructor(config: ClientConfig) {
    this.appId = config.appId;
    this.axios = createAxios({
      baseURL: 'https://api.onesignal.com',
      headers: {
        Authorization: `Key ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Notifications ──

  async sendNotification(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/notifications', {
      app_id: this.appId,
      ...params
    });
    return response.data;
  }

  async listNotifications(params?: {
    limit?: number;
    offset?: number;
    kind?: number;
  }): Promise<any> {
    let response = await this.axios.get('/notifications', {
      params: {
        app_id: this.appId,
        ...params
      }
    });
    return response.data;
  }

  async getNotification(
    messageId: string,
    params?: {
      outcomeNames?: string[];
      outcomeTimeRange?: string;
      outcomePlatforms?: string;
      outcomeAttribution?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/notifications/${messageId}`, {
      params: {
        app_id: this.appId,
        outcome_names: params?.outcomeNames,
        outcome_time_range: params?.outcomeTimeRange,
        outcome_platforms: params?.outcomePlatforms,
        outcome_attribution: params?.outcomeAttribution
      }
    });
    return response.data;
  }

  async cancelNotification(messageId: string): Promise<any> {
    let response = await this.axios.delete(`/notifications/${messageId}`, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  // ── Users ──

  async createUser(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/apps/${this.appId}/users`, params);
    return response.data;
  }

  async getUser(aliasLabel: string, aliasId: string): Promise<any> {
    let response = await this.axios.get(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}`
    );
    return response.data;
  }

  async updateUser(
    aliasLabel: string,
    aliasId: string,
    properties: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}`,
      { properties }
    );
    return response.data;
  }

  async deleteUser(aliasLabel: string, aliasId: string): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}`
    );
    return response.data;
  }

  // ── Subscriptions ──

  async createSubscription(
    aliasLabel: string,
    aliasId: string,
    subscription: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}/subscriptions`,
      { subscription }
    );
    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    subscription: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${this.appId}/subscriptions/${subscriptionId}`,
      { subscription }
    );
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${this.appId}/subscriptions/${subscriptionId}`
    );
    return response.data;
  }

  async transferSubscription(
    subscriptionId: string,
    identity: Record<string, string>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${this.appId}/subscriptions/${subscriptionId}/owner`,
      { identity }
    );
    return response.data;
  }

  // ── Segments ──

  async createSegment(name: string, filters: any[]): Promise<any> {
    let response = await this.axios.post(`/apps/${this.appId}/segments`, {
      name,
      filters
    });
    return response.data;
  }

  async listSegments(params?: { offset?: number; limit?: number }): Promise<any> {
    let response = await this.axios.get(`/apps/${this.appId}/segments`, {
      params
    });
    return response.data;
  }

  async deleteSegment(segmentId: string): Promise<any> {
    let response = await this.axios.delete(`/apps/${this.appId}/segments/${segmentId}`);
    return response.data;
  }

  // ── Templates ──

  async createTemplate(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/templates', {
      app_id: this.appId,
      ...params
    });
    return response.data;
  }

  async listTemplates(params?: {
    limit?: number;
    offset?: number;
    channel?: string;
  }): Promise<any> {
    let response = await this.axios.get('/templates', {
      params: {
        app_id: this.appId,
        ...params
      }
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}`, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  async updateTemplate(templateId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/templates/${templateId}`,
      {
        app_id: this.appId,
        ...params
      },
      {
        params: { app_id: this.appId }
      }
    );
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<any> {
    let response = await this.axios.delete(`/templates/${templateId}`, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  // ── Apps ──

  async createApp(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/apps', params);
    return response.data;
  }

  async listApps(): Promise<any> {
    let response = await this.axios.get('/apps');
    return response.data;
  }

  async getApp(appId: string): Promise<any> {
    let response = await this.axios.get(`/apps/${appId}`);
    return response.data;
  }

  async updateApp(appId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/apps/${appId}`, params);
    return response.data;
  }

  // ── Data Export ──

  async exportCsv(params?: {
    segmentName?: string;
    lastActiveSince?: string;
    extraFields?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params?.segmentName) body.segment_name = params.segmentName;
    if (params?.lastActiveSince) body.last_active_since = params.lastActiveSince;
    if (params?.extraFields) body.extra_fields = params.extraFields;

    let response = await this.axios.post('/players/csv_export', body, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  // ── User Identity / Aliases ──

  async updateUserIdentity(
    aliasLabel: string,
    aliasId: string,
    identity: Record<string, string>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}/identity`,
      { identity }
    );
    return response.data;
  }

  async deleteUserAlias(
    aliasLabel: string,
    aliasId: string,
    aliasLabelToDelete: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${this.appId}/users/by/${aliasLabel}/${aliasId}/identity/${aliasLabelToDelete}`
    );
    return response.data;
  }
}
