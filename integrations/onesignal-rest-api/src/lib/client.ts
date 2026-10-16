import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';
import { validatePagination } from './schemas';

let detailKeys = ['title', 'message', 'detail', 'error', 'error_description', 'code'];

let buildOneSignalError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'OneSignal',
    reason: 'onesignal_api_error',
    detailKeys,
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    extractMessage: (failure, helpers) => {
      let response = helpers.getResponseWithBody(failure);
      let body = response?.data;
      let details: string[] = [];
      if (helpers.isRecord(body) && Array.isArray(body.errors)) {
        for (let item of body.errors.slice(0, 5)) {
          if (!helpers.isRecord(item)) {
            pushBoundedApiErrorDetail(details, item);
            continue;
          }
          for (let [key, value] of Object.entries(item).slice(0, 20)) {
            if (detailKeys.includes(key)) {
              pushBoundedApiErrorDetail(details, value);
              continue;
            }
            // Messaging validation errors use the validation message itself as the key.
            let label = readApiErrorText(key);
            if (label && typeof value === 'string') {
              let detail = readApiErrorText(value);
              pushBoundedApiErrorDetail(
                details,
                detail
                  ? `${truncateApiErrorMessage(label, 200)}: ${truncateApiErrorMessage(detail, 800)}`
                  : label
              );
            }
          }
        }
      }
      return truncateApiErrorMessage(
        details.length
          ? details.join(' - ')
          : helpers.extractMessage(response?.data !== undefined ? { response } : failure, {
              detailKeys
            })
      );
    }
  });

export interface ClientConfig {
  token: string;
  appId?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private configuredAppId?: string;

  constructor(config: ClientConfig) {
    this.configuredAppId = config.appId;
    if (!config.token?.trim()) throw createApiServiceError('Provide a OneSignal API key.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.onesignal.com',
      authHeader: { value: `Key ${config.token}` },
      timeout: 30000,
      errorAdapter: buildOneSignalError
    });
    this.axios.interceptors.response.use(response => {
      const data = response.data;
      const hasErrors = Array.isArray(data?.errors)
        ? data.errors.length > 0
        : data?.errors && Object.keys(data.errors).length > 0;
      if (data?.success === false || (hasErrors && !data.id)) {
        throw buildOneSignalError({ response: { status: response.status, data } });
      }
      return response;
    });
  }

  get appId(): string {
    if (!this.configuredAppId?.trim()) {
      throw createApiServiceError(
        'Provide appId. Use list_apps with an Organization API Key, or find the App ID under Settings > Keys & IDs.'
      );
    }
    return this.configuredAppId;
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
    timeOffset?: string;
    templateId?: string;
  }): Promise<any> {
    validatePagination(params ?? {}, 50);
    if (params?.kind !== undefined && ![0, 1, 3].includes(params.kind))
      throw createApiServiceError('kind must be 0, 1, or 3.');
    if (params?.timeOffset !== undefined && params.offset !== undefined)
      throw createApiServiceError('Use timeOffset or offset, not both.');
    let response = await this.axios.get('/notifications', {
      params: {
        app_id: this.appId,
        limit: params?.limit,
        offset: params?.offset,
        kind: params?.kind,
        time_offset: params?.timeOffset,
        template_id: params?.templateId
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
    let response = await this.axios.get(`/notifications/${encodeURIComponent(messageId)}`, {
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
    let response = await this.axios.delete(`/notifications/${encodeURIComponent(messageId)}`, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  // ── Users ──

  async createUser(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/apps/${encodeURIComponent(this.appId)}/users`,
      params
    );
    return response.data;
  }

  async getUser(aliasLabel: string, aliasId: string): Promise<any> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}`
    );
    return response.data;
  }

  async updateUser(
    aliasLabel: string,
    aliasId: string,
    properties: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}`,
      { properties }
    );
    return response.data;
  }

  async deleteUser(aliasLabel: string, aliasId: string): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}`
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
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}/subscriptions`,
      { subscription }
    );
    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    subscription: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(this.appId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { subscription }
    );
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${encodeURIComponent(this.appId)}/subscriptions/${encodeURIComponent(subscriptionId)}`
    );
    return response.data;
  }

  async transferSubscription(
    subscriptionId: string,
    identity: Record<string, string>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(this.appId)}/subscriptions/${encodeURIComponent(subscriptionId)}/owner`,
      { identity }
    );
    return response.data;
  }

  // ── Segments ──

  async createSegment(name: string, filters: any[]): Promise<any> {
    let response = await this.axios.post(`/apps/${encodeURIComponent(this.appId)}/segments`, {
      name,
      filters
    });
    return response.data;
  }

  async listSegments(params?: { offset?: number; limit?: number }): Promise<any> {
    validatePagination(params ?? {}, 300);
    let response = await this.axios.get(`/apps/${encodeURIComponent(this.appId)}/segments`, {
      params
    });
    return response.data;
  }

  async deleteSegment(segmentId: string): Promise<any> {
    let response = await this.axios.delete(
      `/apps/${encodeURIComponent(this.appId)}/segments/${encodeURIComponent(segmentId)}`
    );
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
    validatePagination(params ?? {}, 50);
    let response = await this.axios.get('/templates', {
      params: {
        app_id: this.appId,
        ...params
      }
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/templates/${encodeURIComponent(templateId)}`, {
      params: { app_id: this.appId }
    });
    return response.data;
  }

  async updateTemplate(templateId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/templates/${encodeURIComponent(templateId)}`,
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
    let response = await this.axios.delete(`/templates/${encodeURIComponent(templateId)}`, {
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

  async getApp(appId?: string): Promise<any> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appId ?? this.appId)}`);
    return response.data;
  }

  async updateApp(appId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/apps/${encodeURIComponent(appId ?? this.appId)}`,
      params
    );
    return response.data;
  }

  // ── Data Export ──

  async exportCsv(params?: {
    segmentName?: string;
    lastActiveSince?: string;
    extraFields?: string[];
    includeUnsubscribed?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params?.segmentName) body.segment_name = params.segmentName;
    if (params?.lastActiveSince) body.last_active_since = params.lastActiveSince;
    if (params?.extraFields) body.extra_fields = params.extraFields;
    if (params?.includeUnsubscribed !== undefined)
      body.include_unsubscribed = params.includeUnsubscribed;

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
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}/identity`,
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
      `/apps/${encodeURIComponent(this.appId)}/users/by/${encodeURIComponent(aliasLabel)}/${encodeURIComponent(aliasId)}/identity/${encodeURIComponent(aliasLabelToDelete)}`
    );
    return response.data;
  }
}
