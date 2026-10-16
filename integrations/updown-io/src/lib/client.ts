import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type {
  Check,
  Downtime,
  ListedRecipient,
  MetricsEntry,
  Node,
  Recipient,
  StatusPage
} from './types';

type RawCheck = {
  token: string;
  url: string;
  type?: string;
  alias?: string | null;
  last_status?: number | null;
  uptime: number;
  down: boolean;
  down_since?: string | null;
  up_since?: string | null;
  error?: string | null;
  period: number;
  apdex_t: number;
  string_match?: string | null;
  enabled: boolean;
  published: boolean;
  disabled_locations?: string[] | null;
  recipients?: string[] | null;
  last_check_at?: string | null;
  next_check_at?: string | null;
  created_at?: string | null;
  mute_until?: string | null;
  favicon_url?: string | null;
  custom_headers?: Record<string, string> | null;
  http_verb?: string | null;
  http_body?: string | null;
  ssl?: {
    tested_at?: string;
    expires_at?: string;
    valid?: boolean;
    error?: string | null;
    cert?: Record<string, unknown>;
  } | null;
  domain?: Record<string, unknown> | null;
  metrics?: unknown;
  results?: unknown;
  [key: string]: unknown;
};
type RawDowntime = {
  id: string;
  error: string;
  started_at: string;
  ended_at?: string | null;
  duration?: number | null;
  partial?: boolean | null;
  details_url?: string;
  results?: unknown;
  [key: string]: unknown;
};
type RawRecipient = {
  id: string;
  type: string;
  name?: string | null;
  value?: string;
  selected?: boolean;
  immutable?: boolean;
  [key: string]: unknown;
};
type RawStatusPage = {
  token: string;
  url?: string | null;
  name?: string | null;
  description?: string | null;
  visibility?: string | null;
  checks?: string[] | null;
  access_key?: string | null;
  [key: string]: unknown;
};
type RawNode = {
  ip: string;
  ip6: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  [key: string]: unknown;
};

let mapCheck = (raw: RawCheck): Check => ({
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
        error: raw.ssl.error ?? null,
        cert: raw.ssl.cert
      }
    : null,
  type: raw.type,
  domain: raw.domain,
  metrics: raw.metrics,
  results: raw.results,
  raw
});

let mapDowntime = (raw: RawDowntime): Downtime => ({
  downtimeId: raw.id,
  error: raw.error,
  startedAt: raw.started_at,
  endedAt: raw.ended_at ?? null,
  duration: raw.duration ?? null,
  partial: raw.partial ?? null,
  detailsUrl: raw.details_url,
  results: raw.results,
  raw
});

let mapRecipient = (raw: RawRecipient): ListedRecipient => ({
  recipientId: raw.id,
  type: raw.type,
  name: raw.name ?? null,
  value: raw.value,
  selected: raw.selected,
  immutable: raw.immutable,
  raw
});

let mapStatusPage = (raw: RawStatusPage): StatusPage => ({
  statusPageToken: raw.token,
  url: raw.url ?? null,
  name: raw.name ?? null,
  description: raw.description ?? null,
  visibility: raw.visibility ?? null,
  checks: raw.checks ?? null,
  accessKey: raw.access_key,
  raw
});

let mapNode = (code: string, raw: RawNode): Node => ({
  nodeCode: code,
  ip: raw.ip,
  ip6: raw.ip6,
  city: raw.city,
  country: raw.country,
  countryCode: raw.country_code,
  lat: raw.lat,
  lng: raw.lng,
  raw
});

let mapMetricsEntry = (raw: Record<string, unknown>): MetricsEntry => {
  let requests = raw.requests;
  let timings = raw.timings;
  if (
    typeof raw.apdex !== 'number' ||
    !isApiErrorRecord(requests) ||
    !isApiErrorRecord(timings) ||
    ['samples', 'failures', 'satisfied', 'tolerated'].some(
      key => typeof requests[key] !== 'number'
    )
  ) {
    throw createApiServiceError(
      'Updown.io returned an incomplete performance metrics entry.',
      {
        reason: 'invalid_metrics_response'
      }
    );
  }
  return {
    apdex: raw.apdex,
    requests: {
      samples: requests.samples as number,
      failures: requests.failures as number,
      satisfied: requests.satisfied as number,
      tolerated: requests.tolerated as number,
      byResponseTime:
        (requests.by_response_time as Record<string, number> | null | undefined) ?? null
    },
    timings: {
      redirect: (timings.redirect as number | null | undefined) ?? null,
      namelookup: (timings.namelookup as number | null | undefined) ?? null,
      connection: (timings.connection as number | null | undefined) ?? null,
      handshake: (timings.handshake as number | null | undefined) ?? null,
      response: (timings.response as number | null | undefined) ?? null,
      total: (timings.total as number | null | undefined) ?? null
    },
    group: typeof raw.group === 'string' ? raw.group : undefined,
    raw
  };
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Updown.io',
          reason: 'updown_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['errors', 'error']
        }),
      baseURL: 'https://updown.io/api',
      headers: {
        'X-API-KEY': config.token
      }
    });
  }

  // ---- Checks ----

  async listChecks(): Promise<Check[]> {
    let response = await this.axios.get('/checks');
    return (response.data as RawCheck[]).map(mapCheck);
  }

  async getCheck(
    token: string,
    includeMetrics?: boolean,
    includeResults?: boolean
  ): Promise<Check> {
    let params: Record<string, unknown> = {};
    if (includeMetrics) {
      params.metrics = true;
    }
    if (includeResults !== undefined) params.results = includeResults;
    let response = await this.axios.get<RawCheck>(`/checks/${token}`, { params });
    return mapCheck(response.data);
  }

  async createCheck(data: {
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
  }): Promise<Check> {
    let body: Record<string, unknown> = { url: data.url };
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
    let response = await this.axios.post<RawCheck>('/checks', body);
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
    let body: Record<string, unknown> = {};
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
    let response = await this.axios.put<RawCheck>(`/checks/${token}`, body);
    return mapCheck(response.data);
  }

  async deleteCheck(
    token: string
  ): Promise<{ deleted: boolean; raw: Record<string, unknown> }> {
    let response = await this.axios.delete(`/checks/${token}`);
    return { ...response.data, raw: response.data };
  }

  // ---- Downtimes ----

  async getDowntimes(
    token: string,
    options?: {
      page?: number;
      results?: boolean;
    }
  ): Promise<Downtime[]> {
    let params: Record<string, unknown> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.results !== undefined) params.results = options.results;
    let response = await this.axios.get(`/checks/${token}/downtimes`, { params });
    return (response.data as RawDowntime[]).map(mapDowntime);
  }

  // ---- Metrics ----

  async getMetrics(
    token: string,
    options?: {
      from?: string;
      to?: string;
      group?: string;
    }
  ): Promise<{
    uptime?: number;
    metrics: Record<string, MetricsEntry>;
    summary?: MetricsEntry;
    raw: Record<string, unknown>;
  }> {
    let params: Record<string, unknown> = {};
    if (options?.from !== undefined) params.from = options.from;
    if (options?.to !== undefined) params.to = options.to;
    if (options?.group !== undefined) params.group = options.group;
    let response = await this.axios.get<Record<string, unknown>>(`/checks/${token}/metrics`, {
      params
    });
    let raw = response.data;
    let metrics: Record<string, MetricsEntry> = {};
    let summary: MetricsEntry | undefined;
    if (raw.apdex !== undefined || raw.requests !== undefined || raw.timings !== undefined) {
      summary = mapMetricsEntry(raw);
    } else {
      for (let [key, value] of Object.entries(raw)) {
        if (key === 'uptime' || key === 'group') continue;
        if (isApiErrorRecord(value)) metrics[key] = mapMetricsEntry(value);
      }
    }
    if (raw.uptime !== undefined && typeof raw.uptime !== 'number') {
      throw createApiServiceError('Updown.io returned a non-numeric uptime value.', {
        reason: 'invalid_metrics_response'
      });
    }
    return { uptime: raw.uptime, metrics, summary, raw };
  }

  // ---- Recipients ----

  async listRecipients(): Promise<ListedRecipient[]> {
    let response = await this.axios.get('/recipients');
    return (response.data as RawRecipient[]).map(mapRecipient);
  }

  async createRecipient(data: {
    type: string;
    value: string;
    name?: string;
    selected?: boolean;
  }): Promise<Recipient> {
    let response = await this.axios.post<RawRecipient & { value: string }>(
      '/recipients',
      data
    );
    return { ...mapRecipient(response.data), value: response.data.value };
  }

  async deleteRecipient(
    recipientId: string
  ): Promise<{ deleted: boolean; raw: Record<string, unknown> }> {
    let response = await this.axios.delete(`/recipients/${recipientId}`);
    return { ...response.data, raw: response.data };
  }

  // ---- Status Pages ----

  async listStatusPages(): Promise<StatusPage[]> {
    let response = await this.axios.get('/status_pages');
    return (response.data as RawStatusPage[]).map(mapStatusPage);
  }

  async createStatusPage(data: {
    name?: string;
    description?: string;
    visibility?: string;
    checks: string[];
    accessKey?: string;
  }): Promise<StatusPage> {
    let body: Record<string, unknown> = { checks: data.checks };
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.accessKey !== undefined) body.access_key = data.accessKey;
    let response = await this.axios.post<RawStatusPage>('/status_pages', body);
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
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.checks !== undefined) body.checks = data.checks;
    if (data.accessKey !== undefined) body.access_key = data.accessKey;
    let response = await this.axios.put<RawStatusPage>(`/status_pages/${token}`, body);
    return mapStatusPage(response.data);
  }

  async deleteStatusPage(
    token: string
  ): Promise<{ deleted: boolean; raw: Record<string, unknown> }> {
    let response = await this.axios.delete(`/status_pages/${token}`);
    return { ...response.data, raw: response.data };
  }

  async listNodeIps(family?: 'all' | 'ipv4' | 'ipv6'): Promise<string[]> {
    let endpoint = family === 'ipv4' || family === 'ipv6' ? family : 'ips';
    let response = await this.axios.get<string[]>(`/nodes/${endpoint}`, {
      params: { format: 'json' }
    });
    return response.data;
  }

  // ---- Nodes ----

  async listNodes(): Promise<Node[]> {
    let response = await this.axios.get('/nodes');
    let raw = response.data as Record<string, RawNode>;
    return Object.entries(raw).map(([code, data]) => mapNode(code, data));
  }
}
