import { createAxios } from 'slates';
import type { Check, Downtime, MetricsEntry, Node, Recipient, StatusPage } from './types';

let mapCheck = (raw: any): Check => ({
  token: raw.token,
  url: raw.url,
  alias: raw.alias ?? null,
  lastStatus: raw.last_status ?? null,
  uptime: raw.uptime,
  down: raw.down,
  downSince: raw.down_since ?? null,
  upSince: raw.up_since ?? null,
  error: raw.error ?? null,
  period: raw.period,
  apdexT: raw.apdex_t,
  stringMatch: raw.string_match ?? null,
  enabled: raw.enabled,
  published: raw.published,
  disabledLocations: raw.disabled_locations ?? [],
  recipients: raw.recipients ?? [],
  lastCheckAt: raw.last_check_at ?? null,
  nextCheckAt: raw.next_check_at ?? null,
  createdAt: raw.created_at ?? null,
  muteUntil: raw.mute_until ?? null,
  faviconUrl: raw.favicon_url ?? null,
  customHeaders: raw.custom_headers ?? null,
  httpVerb: raw.http_verb ?? null,
  httpBody: raw.http_body ?? null,
  ssl: raw.ssl
    ? {
        testedAt: raw.ssl.tested_at ?? undefined,
        expiresAt: raw.ssl.expires_at ?? undefined,
        valid: raw.ssl.valid ?? undefined,
        error: raw.ssl.error ?? null
      }
    : null
});

let mapDowntime = (raw: any): Downtime => ({
  downtimeId: String(raw.id),
  error: raw.error,
  startedAt: raw.started_at,
  endedAt: raw.ended_at ?? null,
  duration: raw.duration ?? null,
  partial: raw.partial ?? null
});

let mapRecipient = (raw: any): Recipient => ({
  recipientId: raw.id,
  type: raw.type,
  name: raw.name ?? null,
  value: raw.value,
  selected: raw.selected
});

let mapStatusPage = (raw: any): StatusPage => ({
  statusPageToken: raw.token,
  url: raw.url ?? null,
  name: raw.name ?? null,
  description: raw.description ?? null,
  visibility: raw.visibility ?? null,
  checks: raw.checks ?? null
});

let mapNode = (code: string, raw: any): Node => ({
  nodeCode: code,
  ip: raw.ip,
  ip6: raw.ip6,
  city: raw.city,
  country: raw.country,
  countryCode: raw.country_code,
  lat: raw.lat,
  lng: raw.lng
});

let mapMetricsEntry = (raw: any): MetricsEntry => ({
  apdex: raw.apdex,
  requests: {
    samples: raw.requests?.samples ?? 0,
    failures: raw.requests?.failures ?? 0,
    satisfied: raw.requests?.satisfied ?? 0,
    tolerated: raw.requests?.tolerated ?? 0,
    byResponseTime: raw.requests?.by_response_time ?? null
  },
  timings: {
    redirect: raw.timings?.redirect ?? null,
    namelookup: raw.timings?.namelookup ?? null,
    connection: raw.timings?.connection ?? null,
    handshake: raw.timings?.handshake ?? null,
    response: raw.timings?.response ?? null,
    total: raw.timings?.total ?? null
  }
});

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://updown.io/api',
      headers: {
        'X-API-KEY': config.token
      }
    });
  }

  // ---- Checks ----

  async listChecks(): Promise<Check[]> {
    let response = await this.axios.get('/checks');
    return (response.data as any[]).map(mapCheck);
  }

  async getCheck(token: string, includeMetrics?: boolean): Promise<Check> {
    let params: Record<string, any> = {};
    if (includeMetrics) {
      params.metrics = true;
    }
    let response = await this.axios.get(`/checks/${token}`, { params });
    return mapCheck(response.data);
  }

  async createCheck(data: {
    url: string;
    type?: string;
    period?: number;
    apdexT?: number;
    enabled?: boolean;
    published?: boolean;
    alias?: string;
    stringMatch?: string;
    httpVerb?: string;
    httpBody?: string;
    disabledLocations?: string[];
    recipients?: string[];
    customHeaders?: Record<string, string>;
    muteUntil?: string;
  }): Promise<Check> {
    let body: Record<string, any> = { url: data.url };
    if (data.type !== undefined) body.type = data.type;
    if (data.period !== undefined) body.period = data.period;
    if (data.apdexT !== undefined) body.apdex_t = data.apdexT;
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.published !== undefined) body.published = data.published;
    if (data.alias !== undefined) body.alias = data.alias;
    if (data.stringMatch !== undefined) body.string_match = data.stringMatch;
    if (data.httpVerb !== undefined) body.http_verb = data.httpVerb;
    if (data.httpBody !== undefined) body.http_body = data.httpBody;
    if (data.disabledLocations !== undefined) body.disabled_locations = data.disabledLocations;
    if (data.recipients !== undefined) body.recipients = data.recipients;
    if (data.customHeaders !== undefined) body.custom_headers = data.customHeaders;
    if (data.muteUntil !== undefined) body.mute_until = data.muteUntil;
    let response = await this.axios.post('/checks', body);
    return mapCheck(response.data);
  }

  async updateCheck(
    token: string,
    data: {
      url?: string;
      type?: string;
      period?: number;
      apdexT?: number;
      enabled?: boolean;
      published?: boolean;
      alias?: string;
      stringMatch?: string;
      httpVerb?: string;
      httpBody?: string;
      disabledLocations?: string[];
      recipients?: string[];
      customHeaders?: Record<string, string>;
      muteUntil?: string;
    }
  ): Promise<Check> {
    let body: Record<string, any> = {};
    if (data.url !== undefined) body.url = data.url;
    if (data.type !== undefined) body.type = data.type;
    if (data.period !== undefined) body.period = data.period;
    if (data.apdexT !== undefined) body.apdex_t = data.apdexT;
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.published !== undefined) body.published = data.published;
    if (data.alias !== undefined) body.alias = data.alias;
    if (data.stringMatch !== undefined) body.string_match = data.stringMatch;
    if (data.httpVerb !== undefined) body.http_verb = data.httpVerb;
    if (data.httpBody !== undefined) body.http_body = data.httpBody;
    if (data.disabledLocations !== undefined) body.disabled_locations = data.disabledLocations;
    if (data.recipients !== undefined) body.recipients = data.recipients;
    if (data.customHeaders !== undefined) body.custom_headers = data.customHeaders;
    if (data.muteUntil !== undefined) body.mute_until = data.muteUntil;
    let response = await this.axios.put(`/checks/${token}`, body);
    return mapCheck(response.data);
  }

  async deleteCheck(token: string): Promise<{ deleted: boolean }> {
    let response = await this.axios.delete(`/checks/${token}`);
    return response.data;
  }

  // ---- Downtimes ----

  async getDowntimes(
    token: string,
    options?: {
      page?: number;
      results?: boolean;
    }
  ): Promise<Downtime[]> {
    let params: Record<string, any> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.results !== undefined) params.results = options.results;
    let response = await this.axios.get(`/checks/${token}/downtimes`, { params });
    return (response.data as any[]).map(mapDowntime);
  }

  // ---- Metrics ----

  async getMetrics(
    token: string,
    options?: {
      from?: string;
      to?: string;
      group?: string;
    }
  ): Promise<{ uptime: number; metrics: Record<string, MetricsEntry> }> {
    let params: Record<string, any> = {};
    if (options?.from !== undefined) params.from = options.from;
    if (options?.to !== undefined) params.to = options.to;
    if (options?.group !== undefined) params.group = options.group;
    let response = await this.axios.get(`/checks/${token}/metrics`, { params });
    let raw = response.data as any;

    // The metrics API returns { uptime: number, ...metricEntries } when grouped by time
    // or { uptime: number, ...hostEntries } when grouped by host
    let uptime = raw.uptime ?? 0;

    let metrics: Record<string, MetricsEntry> = {};
    for (let key of Object.keys(raw)) {
      if (key === 'uptime') continue;
      metrics[key] = mapMetricsEntry(raw[key]);
    }

    return { uptime, metrics };
  }

  // ---- Recipients ----

  async listRecipients(): Promise<Recipient[]> {
    let response = await this.axios.get('/recipients');
    return (response.data as any[]).map(mapRecipient);
  }

  async createRecipient(data: {
    type: string;
    value: string;
    name?: string;
    selected?: boolean;
  }): Promise<Recipient> {
    let response = await this.axios.post('/recipients', data);
    return mapRecipient(response.data);
  }

  async deleteRecipient(recipientId: string): Promise<{ deleted: boolean }> {
    let response = await this.axios.delete(`/recipients/${recipientId}`);
    return response.data;
  }

  // ---- Status Pages ----

  async listStatusPages(): Promise<StatusPage[]> {
    let response = await this.axios.get('/status_pages');
    return (response.data as any[]).map(mapStatusPage);
  }

  async createStatusPage(data: {
    name?: string;
    description?: string;
    visibility?: string;
    checks: string[];
    accessKey?: string;
  }): Promise<StatusPage> {
    let body: Record<string, any> = { checks: data.checks };
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.accessKey !== undefined) body.access_key = data.accessKey;
    let response = await this.axios.post('/status_pages', body);
    return mapStatusPage(response.data);
  }

  async updateStatusPage(
    token: string,
    data: {
      name?: string;
      description?: string;
      visibility?: string;
      checks?: string[];
      accessKey?: string;
    }
  ): Promise<StatusPage> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.checks !== undefined) body.checks = data.checks;
    if (data.accessKey !== undefined) body.access_key = data.accessKey;
    let response = await this.axios.put(`/status_pages/${token}`, body);
    return mapStatusPage(response.data);
  }

  async deleteStatusPage(token: string): Promise<{ deleted: boolean }> {
    let response = await this.axios.delete(`/status_pages/${token}`);
    return response.data;
  }

  // ---- Nodes ----

  async listNodes(): Promise<Node[]> {
    let response = await this.axios.get('/nodes');
    let raw = response.data as Record<string, any>;
    return Object.entries(raw).map(([code, data]) => mapNode(code, data));
  }
}
