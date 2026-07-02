import { createAxios } from 'slates';
import { datadogApiError, datadogServiceError } from './errors';
import type {
  Dashboard,
  DatadogAuthConfig,
  LogSearchParams,
  MetricSeriesInput,
  MetricsQueryParams,
  Monitor,
  MonitorOptions
} from './types';

export class DatadogClient {
  private http: ReturnType<typeof createAxios>;
  private logIntakeHttp: ReturnType<typeof createAxios>;
  private authConfig: DatadogAuthConfig;

  constructor(authConfig: DatadogAuthConfig) {
    this.authConfig = authConfig;
    let baseURL = `https://api.${authConfig.site}`;
    this.http = createAxios({ baseURL });
    this.logIntakeHttp = createAxios({
      baseURL: `https://http-intake.logs.${authConfig.site}`
    });

    for (let http of [this.http, this.logIntakeHttp]) {
      http.interceptors.response.use(
        response => response,
        error => Promise.reject(datadogApiError(error))
      );
    }
  }

  private getHeaders(): Record<string, string> {
    if (this.authConfig.authMethod === 'oauth') {
      return {
        Authorization: `Bearer ${this.authConfig.token}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'DD-API-KEY': this.authConfig.apiKey || this.authConfig.token,
      'DD-APPLICATION-KEY': this.authConfig.appKey || '',
      'Content-Type': 'application/json'
    };
  }

  private getApiKeyOnlyHeaders(): Record<string, string> {
    let apiKey =
      this.authConfig.apiKey ??
      (this.authConfig.authMethod === 'apikey' ? this.authConfig.token : undefined);

    if (!apiKey) {
      throw datadogServiceError(
        'This Datadog endpoint requires API key authentication. Reconnect Datadog with API Key + Application Key credentials.'
      );
    }

    return {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json'
    };
  }

  // ─── Metrics ────────────────────────────────────────────

  async queryMetrics(params: MetricsQueryParams): Promise<any> {
    let response = await this.http.get('/api/v1/query', {
      headers: this.getHeaders(),
      params: {
        from: params.from,
        to: params.to,
        query: params.query
      }
    });
    return response.data;
  }

  async listActiveMetrics(from: number, host?: string, tagFilter?: string): Promise<any> {
    let params: Record<string, any> = { from };
    if (host) params.host = host;
    if (tagFilter) params.tag_filter = tagFilter;

    let response = await this.http.get('/api/v1/metrics', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async getMetricMetadata(metricName: string): Promise<any> {
    let response = await this.http.get(`/api/v1/metrics/${encodeURIComponent(metricName)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async submitMetrics(series: MetricSeriesInput[]): Promise<any> {
    let body = {
      series: series.map(s => ({
        metric: s.metric,
        type: s.type,
        points: s.points.map(([timestamp, value]) => ({ timestamp, value })),
        tags: s.tags,
        resources: s.resources ?? (s.host ? [{ name: s.host, type: 'host' }] : undefined),
        unit: s.unit
      }))
    };

    let response = await this.http.post('/api/v2/series', body, {
      headers: this.getApiKeyOnlyHeaders()
    });
    return response.data;
  }

  // ─── Monitors ───────────────────────────────────────────

  async listMonitors(params?: {
    groupStates?: string;
    name?: string;
    tags?: string;
    monitorTags?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Monitor[]> {
    let queryParams: Record<string, any> = {};
    if (params?.groupStates) queryParams.group_states = params.groupStates;
    if (params?.name) queryParams.name = params.name;
    if (params?.tags) queryParams.tags = params.tags;
    if (params?.monitorTags) queryParams.monitor_tags = params.monitorTags;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.pageSize !== undefined) queryParams.page_size = params.pageSize;

    let response = await this.http.get('/api/v1/monitor', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getMonitor(monitorId: number): Promise<Monitor> {
    let response = await this.http.get(`/api/v1/monitor/${monitorId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createMonitor(monitor: {
    name: string;
    type: string;
    query: string;
    message?: string;
    tags?: string[];
    priority?: number;
    options?: MonitorOptions;
  }): Promise<Monitor> {
    let response = await this.http.post('/api/v1/monitor', monitor, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateMonitor(
    monitorId: number,
    monitor: {
      name?: string;
      type?: string;
      query?: string;
      message?: string;
      tags?: string[];
      priority?: number;
      options?: MonitorOptions;
    }
  ): Promise<Monitor> {
    let response = await this.http.put(`/api/v1/monitor/${monitorId}`, monitor, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteMonitor(monitorId: number, force?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (force) params.force = 'true';

    let response = await this.http.delete(`/api/v1/monitor/${monitorId}`, {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async muteMonitor(
    monitorId: number,
    params?: { scope?: string; end?: number }
  ): Promise<Monitor> {
    let response = await this.http.post(`/api/v1/monitor/${monitorId}/mute`, params || {}, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async unmuteMonitor(monitorId: number, params?: { scope?: string }): Promise<Monitor> {
    let response = await this.http.post(`/api/v1/monitor/${monitorId}/unmute`, params || {}, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async searchMonitors(query: string, page?: number, perPage?: number): Promise<any> {
    let params: Record<string, any> = { query };
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;

    let response = await this.http.get('/api/v1/monitor/search', {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  // ─── Dashboards ─────────────────────────────────────────

  async listDashboards(): Promise<any> {
    let response = await this.http.get('/api/v1/dashboard', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getDashboard(dashboardId: string): Promise<Dashboard> {
    let response = await this.http.get(
      `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async createDashboard(dashboard: {
    title: string;
    layoutType: string;
    widgets: any[];
    description?: string;
    templateVariables?: any[];
    isReadOnly?: boolean;
    notifyList?: string[];
    reflowType?: string;
  }): Promise<Dashboard> {
    let body: Record<string, any> = {
      title: dashboard.title,
      layout_type: dashboard.layoutType,
      widgets: dashboard.widgets
    };
    if (dashboard.description !== undefined) body.description = dashboard.description;
    if (dashboard.templateVariables !== undefined)
      body.template_variables = dashboard.templateVariables;
    if (dashboard.isReadOnly !== undefined) body.is_read_only = dashboard.isReadOnly;
    if (dashboard.notifyList !== undefined) body.notify_list = dashboard.notifyList;
    if (dashboard.reflowType !== undefined) body.reflow_type = dashboard.reflowType;

    let response = await this.http.post('/api/v1/dashboard', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateDashboard(
    dashboardId: string,
    dashboard: {
      title?: string;
      layoutType?: string;
      widgets?: any[];
      description?: string;
      templateVariables?: any[];
      isReadOnly?: boolean;
      notifyList?: string[];
      reflowType?: string;
    }
  ): Promise<Dashboard> {
    let body: Record<string, any> = {};
    if (dashboard.title !== undefined) body.title = dashboard.title;
    if (dashboard.layoutType !== undefined) body.layout_type = dashboard.layoutType;
    if (dashboard.widgets !== undefined) body.widgets = dashboard.widgets;
    if (dashboard.description !== undefined) body.description = dashboard.description;
    if (dashboard.templateVariables !== undefined)
      body.template_variables = dashboard.templateVariables;
    if (dashboard.isReadOnly !== undefined) body.is_read_only = dashboard.isReadOnly;
    if (dashboard.notifyList !== undefined) body.notify_list = dashboard.notifyList;
    if (dashboard.reflowType !== undefined) body.reflow_type = dashboard.reflowType;

    let response = await this.http.put(
      `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`,
      body,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteDashboard(dashboardId: string): Promise<any> {
    let response = await this.http.delete(
      `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  // ─── Events ─────────────────────────────────────────────

  async listEvents(params: {
    start: number;
    end: number;
    priority?: string;
    sources?: string;
    tags?: string;
    unaggregated?: boolean;
    page?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      start: params.start,
      end: params.end
    };
    if (params.priority) queryParams.priority = params.priority;
    if (params.sources) queryParams.sources = params.sources;
    if (params.tags) queryParams.tags = params.tags;
    if (params.unaggregated !== undefined) queryParams.unaggregated = params.unaggregated;
    if (params.page !== undefined) queryParams.page = params.page;

    let response = await this.http.get('/api/v1/events', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getEvent(eventId: number): Promise<any> {
    let response = await this.http.get(`/api/v1/events/${eventId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async postEvent(event: {
    title: string;
    text: string;
    dateHappened?: number;
    priority?: string;
    host?: string;
    tags?: string[];
    alertType?: string;
    aggregationKey?: string;
    sourceTypeName?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      title: event.title,
      text: event.text
    };
    if (event.dateHappened !== undefined) body.date_happened = event.dateHappened;
    if (event.priority) body.priority = event.priority;
    if (event.host) body.host = event.host;
    if (event.tags) body.tags = event.tags;
    if (event.alertType) body.alert_type = event.alertType;
    if (event.aggregationKey) body.aggregation_key = event.aggregationKey;
    if (event.sourceTypeName) body.source_type_name = event.sourceTypeName;

    let response = await this.http.post('/api/v1/events', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Incidents (V2) ────────────────────────────────────

  async listIncidents(params?: { pageSize?: number; pageOffset?: number }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize !== undefined) queryParams['page[size]'] = params.pageSize;
    if (params?.pageOffset !== undefined) queryParams['page[offset]'] = params.pageOffset;

    let response = await this.http.get('/api/v2/incidents', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getIncident(incidentId: string): Promise<any> {
    let response = await this.http.get(`/api/v2/incidents/${encodeURIComponent(incidentId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createIncident(incident: {
    title: string;
    customerImpacted: boolean;
    severity?: string;
    fields?: Record<string, any>;
    notificationHandles?: Array<{ display_name?: string; handle: string }>;
  }): Promise<any> {
    let attributes: Record<string, any> = {
      title: incident.title,
      customer_impacted: incident.customerImpacted
    };
    if (incident.severity) attributes.severity = incident.severity;
    if (incident.fields) attributes.fields = incident.fields;
    if (incident.notificationHandles)
      attributes.notification_handles = incident.notificationHandles;

    let body = {
      data: {
        type: 'incidents',
        attributes
      }
    };

    let response = await this.http.post('/api/v2/incidents', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateIncident(
    incidentId: string,
    updates: {
      title?: string;
      customerImpacted?: boolean;
      severity?: string;
      state?: string;
      fields?: Record<string, any>;
    }
  ): Promise<any> {
    let attributes: Record<string, any> = {};
    if (updates.title !== undefined) attributes.title = updates.title;
    if (updates.customerImpacted !== undefined)
      attributes.customer_impacted = updates.customerImpacted;
    if (updates.severity !== undefined) attributes.severity = updates.severity;
    if (updates.state !== undefined) attributes.state = updates.state;
    if (updates.fields) attributes.fields = updates.fields;

    let body = {
      data: {
        type: 'incidents',
        id: incidentId,
        attributes
      }
    };

    let response = await this.http.patch(
      `/api/v2/incidents/${encodeURIComponent(incidentId)}`,
      body,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteIncident(incidentId: string): Promise<void> {
    await this.http.delete(`/api/v2/incidents/${encodeURIComponent(incidentId)}`, {
      headers: this.getHeaders()
    });
  }

  // ─── Logs ───────────────────────────────────────────────

  async searchLogs(params: LogSearchParams): Promise<any> {
    let body: Record<string, any> = {
      filter: {
        query: params.query || '*',
        from: params.from,
        to: params.to
      },
      page: {
        limit: params.limit || 50
      }
    };
    if (params.cursor) body.page.cursor = params.cursor;
    if (params.sort) body.sort = params.sort;
    if (params.indexes) body.filter.indexes = params.indexes;

    let response = await this.http.post('/api/v2/logs/events/search', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async submitLogs(
    logs: Array<{
      message: string;
      ddsource?: string;
      ddtags?: string;
      hostname?: string;
      service?: string;
    }>
  ): Promise<any> {
    let response = await this.logIntakeHttp.post('/api/v2/logs', logs, {
      headers: this.getApiKeyOnlyHeaders()
    });
    return response.data;
  }

  // ─── SLOs ──────────────────────────────────────────────

  async listSLOs(params?: {
    ids?: string;
    query?: string;
    tagsQuery?: string;
    metricsQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.ids) queryParams.ids = params.ids;
    if (params?.query) queryParams.query = params.query;
    if (params?.tagsQuery) queryParams.tags_query = params.tagsQuery;
    if (params?.metricsQuery) queryParams.metrics_query = params.metricsQuery;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    let response = await this.http.get('/api/v1/slo', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getSLO(sloId: string): Promise<any> {
    let response = await this.http.get(`/api/v1/slo/${encodeURIComponent(sloId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createSLO(slo: {
    name: string;
    type: string;
    description?: string;
    tags?: string[];
    thresholds: Array<{
      timeframe: string;
      target: number;
      warning?: number;
    }>;
    monitorIds?: number[];
    query?: { numerator: string; denominator: string };
    groups?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {
      name: slo.name,
      type: slo.type,
      thresholds: slo.thresholds
    };
    if (slo.description !== undefined) body.description = slo.description;
    if (slo.tags) body.tags = slo.tags;
    if (slo.monitorIds) body.monitor_ids = slo.monitorIds;
    if (slo.query) body.query = slo.query;
    if (slo.groups) body.groups = slo.groups;

    let response = await this.http.post('/api/v1/slo', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateSLO(
    sloId: string,
    slo: {
      name?: string;
      description?: string;
      tags?: string[];
      thresholds?: Array<{
        timeframe: string;
        target: number;
        warning?: number;
      }>;
      monitorIds?: number[];
      query?: { numerator: string; denominator: string };
      groups?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (slo.name !== undefined) body.name = slo.name;
    if (slo.description !== undefined) body.description = slo.description;
    if (slo.tags) body.tags = slo.tags;
    if (slo.thresholds) body.thresholds = slo.thresholds;
    if (slo.monitorIds) body.monitor_ids = slo.monitorIds;
    if (slo.query) body.query = slo.query;
    if (slo.groups) body.groups = slo.groups;

    let response = await this.http.put(`/api/v1/slo/${encodeURIComponent(sloId)}`, body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteSLO(sloId: string): Promise<any> {
    let response = await this.http.delete(`/api/v1/slo/${encodeURIComponent(sloId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getSLOHistory(sloId: string, fromTs: number, toTs: number): Promise<any> {
    let response = await this.http.get(`/api/v1/slo/${encodeURIComponent(sloId)}/history`, {
      headers: this.getHeaders(),
      params: { from_ts: fromTs, to_ts: toTs }
    });
    return response.data;
  }

  // ─── Synthetics ────────────────────────────────────────

  async listSyntheticsTests(): Promise<any> {
    let response = await this.http.get('/api/v1/synthetics/tests', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getSyntheticsTest(publicId: string): Promise<any> {
    let response = await this.http.get(
      `/api/v1/synthetics/tests/${encodeURIComponent(publicId)}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async getSyntheticsTestResults(publicId: string): Promise<any> {
    let response = await this.http.get(
      `/api/v1/synthetics/tests/${encodeURIComponent(publicId)}/results`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async triggerSyntheticsTests(tests: Array<{ public_id: string }>): Promise<any> {
    let response = await this.http.post(
      '/api/v1/synthetics/tests/trigger',
      { tests },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  // ─── Users (V2) ────────────────────────────────────────

  async listUsers(params?: {
    pageSize?: number;
    pageNumber?: number;
    sort?: string;
    sortDir?: string;
    filter?: string;
    filterStatus?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageSize !== undefined) queryParams['page[size]'] = params.pageSize;
    if (params?.pageNumber !== undefined) queryParams['page[number]'] = params.pageNumber;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.sortDir) queryParams.sort_dir = params.sortDir;
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.filterStatus) queryParams.filter_status = params.filterStatus;

    let response = await this.http.get('/api/v2/users', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/api/v2/users/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ─── Downtime ──────────────────────────────────────────

  async listDowntimes(params?: { pageLimit?: number; pageOffset?: number }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.pageLimit !== undefined) queryParams['page[limit]'] = params.pageLimit;
    if (params?.pageOffset !== undefined) queryParams['page[offset]'] = params.pageOffset;

    let response = await this.http.get('/api/v2/downtime', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getDowntime(downtimeId: string): Promise<any> {
    let response = await this.http.get(`/api/v2/downtime/${encodeURIComponent(downtimeId)}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createDowntime(downtime: {
    message?: string;
    monitorIdentifier: { monitorId?: number; monitorTags?: string[] };
    scope: string;
    schedule?: {
      start?: string;
      end?: string;
      timezone?: string;
      recurrences?: Array<{
        duration: string;
        rrule: string;
        start?: string;
      }>;
    };
    notifyEndStates?: string[];
    notifyEndTypes?: string[];
  }): Promise<any> {
    let attributes: Record<string, any> = {
      scope: downtime.scope,
      monitor_identifier: {}
    };
    if (downtime.message) attributes.message = downtime.message;
    if (downtime.monitorIdentifier.monitorId !== undefined) {
      attributes.monitor_identifier.monitor_id = downtime.monitorIdentifier.monitorId;
    }
    if (downtime.monitorIdentifier.monitorTags) {
      attributes.monitor_identifier.monitor_tags = downtime.monitorIdentifier.monitorTags;
    }
    if (downtime.schedule) attributes.schedule = downtime.schedule;
    if (downtime.notifyEndStates) attributes.notify_end_states = downtime.notifyEndStates;
    if (downtime.notifyEndTypes) attributes.notify_end_types = downtime.notifyEndTypes;

    let body = {
      data: {
        type: 'downtime',
        attributes
      }
    };

    let response = await this.http.post('/api/v2/downtime', body, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async cancelDowntime(downtimeId: string): Promise<void> {
    await this.http.delete(`/api/v2/downtime/${encodeURIComponent(downtimeId)}`, {
      headers: this.getHeaders()
    });
  }

  // ─── Webhooks Integration ──────────────────────────────

  async createWebhook(webhook: {
    name: string;
    url: string;
    customHeaders?: string;
    encodeAs?: string;
    payload?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: webhook.name,
      url: webhook.url
    };
    if (webhook.customHeaders) body.custom_headers = webhook.customHeaders;
    if (webhook.encodeAs) body.encode_as = webhook.encodeAs;
    if (webhook.payload) body.payload = webhook.payload;

    let response = await this.http.post(
      '/api/v1/integration/webhooks/configuration/webhooks',
      body,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async getWebhook(webhookName: string): Promise<any> {
    let response = await this.http.get(
      `/api/v1/integration/webhooks/configuration/webhooks/${encodeURIComponent(webhookName)}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async updateWebhook(
    webhookName: string,
    webhook: {
      name?: string;
      url?: string;
      customHeaders?: string;
      encodeAs?: string;
      payload?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (webhook.name !== undefined) body.name = webhook.name;
    if (webhook.url !== undefined) body.url = webhook.url;
    if (webhook.customHeaders !== undefined) body.custom_headers = webhook.customHeaders;
    if (webhook.encodeAs !== undefined) body.encode_as = webhook.encodeAs;
    if (webhook.payload !== undefined) body.payload = webhook.payload;

    let response = await this.http.put(
      `/api/v1/integration/webhooks/configuration/webhooks/${encodeURIComponent(webhookName)}`,
      body,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteWebhook(webhookName: string): Promise<void> {
    await this.http.delete(
      `/api/v1/integration/webhooks/configuration/webhooks/${encodeURIComponent(webhookName)}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  // ─── Hosts ─────────────────────────────────────────────

  async listHosts(params?: {
    filter?: string;
    sortField?: string;
    sortDir?: string;
    start?: number;
    count?: number;
    from?: number;
    includeMutedHostsData?: boolean;
    includeHostsMetadata?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sortField) queryParams.sort_field = params.sortField;
    if (params?.sortDir) queryParams.sort_dir = params.sortDir;
    if (params?.start !== undefined) queryParams.start = params.start;
    if (params?.count !== undefined) queryParams.count = params.count;
    if (params?.from !== undefined) queryParams.from = params.from;
    if (params?.includeMutedHostsData !== undefined)
      queryParams.include_muted_hosts_data = params.includeMutedHostsData;
    if (params?.includeHostsMetadata !== undefined)
      queryParams.include_hosts_metadata = params.includeHostsMetadata;

    let response = await this.http.get('/api/v1/hosts', {
      headers: this.getHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async muteHost(
    hostname: string,
    params?: { message?: string; end?: number; override?: boolean }
  ): Promise<any> {
    let response = await this.http.post(
      `/api/v1/host/${encodeURIComponent(hostname)}/mute`,
      params || {},
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async unmuteHost(hostname: string): Promise<any> {
    let response = await this.http.post(
      `/api/v1/host/${encodeURIComponent(hostname)}/unmute`,
      {},
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }
}
