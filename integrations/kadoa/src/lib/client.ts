import { createAxios } from 'slates';

let BASE_URL = 'https://api.kadoa.com';

export class KadoaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': opts.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Workflows ─────────────────────────────────────────

  async listWorkflows(params?: {
    search?: string;
    skip?: number;
    limit?: number;
    state?: string;
    runState?: string;
    tags?: string[];
    monitoring?: boolean;
    updateInterval?: string;
  }): Promise<any> {
    let res = await this.axios.get('/v4/workflows', { params });
    return res.data;
  }

  async getWorkflow(workflowId: string): Promise<any> {
    let res = await this.axios.get(`/v4/workflows/${workflowId}`);
    return res.data;
  }

  async deleteWorkflow(workflowId: string): Promise<any> {
    let res = await this.axios.delete(`/v4/workflows/${workflowId}`);
    return res.data;
  }

  async getWorkflowData(
    workflowId: string,
    params?: {
      runId?: string;
      format?: string;
      sortBy?: string;
      order?: string;
      filters?: string;
      page?: number;
      limit?: number;
      includeAnomalies?: boolean;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/v4/workflows/${workflowId}/data`, { params });
    return res.data;
  }

  async getWorkflowHistory(workflowId: string): Promise<any> {
    let res = await this.axios.get(`/v4/workflows/${workflowId}/history`);
    return res.data;
  }

  async runWorkflow(
    workflowId: string,
    body?: {
      variables?: Record<string, any>;
      limit?: number;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/v4/workflows/${workflowId}/run`, body || {});
    return res.data;
  }

  async pauseWorkflow(workflowId: string): Promise<any> {
    let res = await this.axios.put(`/v4/workflows/${workflowId}/pause`);
    return res.data;
  }

  async resumeWorkflow(workflowId: string): Promise<any> {
    let res = await this.axios.put(`/v4/workflows/${workflowId}/resume`);
    return res.data;
  }

  async scheduleWorkflow(workflowId: string, date: string): Promise<any> {
    let res = await this.axios.put(`/v4/workflows/${workflowId}/schedule`, { date });
    return res.data;
  }

  async updateWorkflowMetadata(
    workflowId: string,
    body: {
      urls?: string[];
      limit?: number;
      updateInterval?: string;
      schedules?: string[];
      name?: string;
      description?: string;
      tags?: string[];
      location?: { type: string; isoCode?: string };
      monitoring?: {
        fields?: Array<{ fieldName: string; operator: string }>;
        conditions?: {
          logicalOperator?: string;
          conditions?: Array<{
            type?: string;
            field?: string;
            operator?: string;
            value?: string;
          }>;
        };
      };
      entity?: string;
      schema?: Array<{
        name: string;
        description?: string;
        example?: string;
        dataType?: string;
        isPrimaryKey?: boolean;
        isRequired?: boolean;
        isUnique?: boolean;
      }>;
      maxPages?: number;
      maxDepth?: number;
      navigationMode?: string;
      userPrompt?: string;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/v4/workflows/${workflowId}/metadata`, body);
    return res.data;
  }

  async bulkWorkflowAction(
    workflowIds: string[],
    action: string,
    params?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post('/v4/workflows/bulk', {
      workflowIds,
      action,
      params
    });
    return res.data;
  }

  // ── Crawling ──────────────────────────────────────────

  async startCrawl(body: {
    url?: string;
    startUrls?: string[];
    maxDepth?: number;
    maxPages?: number;
  }): Promise<any> {
    let res = await this.axios.post('/v4/crawl', body);
    return res.data;
  }

  async getCrawlStatus(sessionId: string): Promise<any> {
    let res = await this.axios.get(`/v4/crawl/${sessionId}`);
    return res.data;
  }

  async getCrawlPages(
    sessionId: string,
    params?: {
      currentPage?: number;
      pageSize?: number;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/v4/crawl/${sessionId}/pages`, { params });
    return res.data;
  }

  async getCrawlPageContent(sessionId: string, pageId: string, format?: string): Promise<any> {
    let res = await this.axios.get(`/v4/crawl/${sessionId}/pages/${pageId}`, {
      params: format ? { format } : undefined
    });
    return res.data;
  }

  // ── Ad-hoc Extraction ─────────────────────────────────

  async runAdhocExtraction(
    schemaId: string,
    body: {
      link: string;
      location?: { type: string; isoCode?: string };
    }
  ): Promise<any> {
    let res = await this.axios.post(`/v4/adhoc/${schemaId}`, body);
    return res.data;
  }

  // ── Data Changes / Monitoring ─────────────────────────

  async getDataChanges(params?: {
    workflowIds?: string;
    startDate?: string;
    endDate?: string;
    skip?: number;
    limit?: number;
    exclude?: string;
  }): Promise<any> {
    let res = await this.axios.get('/v4/changes', { params });
    return res.data;
  }

  async getDataChange(changeId: string): Promise<any> {
    let res = await this.axios.get(`/v4/changes/${changeId}`);
    return res.data;
  }

  // ── Data Validation ───────────────────────────────────

  async listValidationRules(params?: {
    workflowId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    let res = await this.axios.get('/v4/data-validation/rules', { params });
    return res.data;
  }

  async getValidationRule(ruleId: string): Promise<any> {
    let res = await this.axios.get(`/v4/data-validation/rules/${ruleId}`);
    return res.data;
  }

  async deleteValidationRule(ruleId: string, reason?: string): Promise<any> {
    let res = await this.axios.delete(`/v4/data-validation/rules/${ruleId}`, {
      data: reason ? { reason } : undefined
    });
    return res.data;
  }

  // ── Webhook Subscriptions ─────────────────────────────

  async listWebhookSubscriptions(): Promise<any> {
    let res = await this.axios.get('/v4/webhook-subscriptions');
    return res.data;
  }

  async subscribeWebhook(body: {
    url: string;
    httpMethod?: string;
    events: string[];
  }): Promise<any> {
    let res = await this.axios.post('/v4/webhook-subscriptions', {
      webhookConfig: {
        url: body.url,
        httpMethod: body.httpMethod || 'POST'
      },
      events: body.events
    });
    return res.data;
  }

  async unsubscribeWebhook(subscriptionId: string): Promise<any> {
    let res = await this.axios.delete(`/v4/webhook-subscriptions/${subscriptionId}`);
    return res.data;
  }

  // ── Notifications ─────────────────────────────────────

  async listNotificationChannels(params?: {
    workflowId?: string;
    includeConfigurations?: boolean;
  }): Promise<any> {
    let res = await this.axios.get('/v5/notifications/channels', { params });
    return res.data;
  }

  async createNotificationChannel(body: {
    name: string;
    channelType: string;
    config: Record<string, any>;
  }): Promise<any> {
    let res = await this.axios.post('/v5/notifications/channels', body);
    return res.data;
  }

  async deleteNotificationChannel(channelId: string): Promise<any> {
    let res = await this.axios.delete(`/v5/notifications/channels/${channelId}`);
    return res.data;
  }

  async listNotificationSettings(params?: {
    workflowId?: string;
    eventType?: string;
  }): Promise<any> {
    let res = await this.axios.get('/v5/notifications/settings', { params });
    return res.data;
  }

  async createNotificationSetting(body: {
    workflowId?: string;
    eventType: string;
    eventConfiguration?: Record<string, any>;
    enabled?: boolean;
    channelIds: string[];
  }): Promise<any> {
    let res = await this.axios.post('/v5/notifications/settings', body);
    return res.data;
  }

  async deleteNotificationSetting(settingsId: string): Promise<any> {
    let res = await this.axios.delete(`/v5/notifications/settings/${settingsId}`);
    return res.data;
  }

  async getNotificationEventTypes(): Promise<any> {
    let res = await this.axios.get('/v5/notifications/event-types');
    return res.data;
  }

  // ── Locations ─────────────────────────────────────────

  async listLocations(): Promise<any> {
    let res = await this.axios.get('/v4/locations');
    return res.data;
  }

  // ── Workspaces ────────────────────────────────────────

  async getWorkspaceDetails(workspaceId: string): Promise<any> {
    let res = await this.axios.get(`/v5/workspaces/${workspaceId}/details`);
    return res.data;
  }

  async getWorkspaceQuotas(workspaceId: string): Promise<any> {
    let res = await this.axios.get(`/v5/workspaces/${workspaceId}/quotas`);
    return res.data;
  }
}
