import { createAxios } from '@slates/provider';
import { svixApiError } from './errors';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.us.svix.com',
  eu: 'https://api.eu.svix.com',
  ca: 'https://api.ca.svix.com',
  au: 'https://api.au.svix.com',
  in: 'https://api.in.svix.com'
};

// ---- Interfaces ----

export interface ApplicationIn {
  name: string;
  uid?: string;
  rateLimit?: number;
  throttleRate?: number;
  metadata?: Record<string, string>;
}

export interface ApplicationOut {
  id: string;
  name: string;
  uid?: string;
  rateLimit?: number;
  throttleRate?: number;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  data: T[];
  iterator?: string;
  done: boolean;
  prevIterator?: string;
}

export interface MessageIn {
  eventType: string;
  payload: Record<string, unknown>;
  eventId?: string;
  channels?: string[];
  deliverAt?: string;
  payloadRetentionHours?: number;
  payloadRetentionPeriod?: number;
  application?: ApplicationIn;
  tags?: string[];
  transformationsParams?: Record<string, unknown>;
}

export interface MessageOut {
  id: string;
  eventType: string;
  payload?: Record<string, unknown>;
  eventId?: string;
  channels?: string[];
  deliverAt?: string | null;
  timestamp: string;
  tags?: string[];
}

export interface EndpointIn {
  url: string;
  description?: string;
  uid?: string;
  version?: number;
  filterTypes?: string[];
  channels?: string[];
  headers?: Record<string, string>;
  secret?: string;
  rateLimit?: number;
  throttleRate?: number;
  disabled?: boolean;
  metadata?: Record<string, string>;
}

export interface EndpointOut {
  id: string;
  url: string;
  description: string;
  uid?: string;
  version: number;
  filterTypes?: string[];
  channels?: string[];
  rateLimit?: number;
  throttleRate?: number;
  disabled: boolean;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointSecretOut {
  key: string;
}

export interface EndpointStats {
  success: number;
  pending: number;
  fail: number;
  sending: number;
  canceled: number;
}

export interface EventTypeIn {
  name: string;
  description: string;
  schemas?: Record<string, unknown>;
  archived?: boolean;
  deprecated?: boolean;
  featureFlag?: string;
  featureFlags?: string[];
  groupName?: string;
}

export interface EventTypeOut {
  name: string;
  description: string;
  schemas?: Record<string, unknown>;
  archived: boolean;
  deprecated: boolean;
  featureFlag?: string;
  featureFlags?: string[];
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttemptOut {
  id: string;
  msgId: string;
  endpointId: string;
  response: string;
  responseDurationMs: number;
  responseStatusCode: number;
  status: number;
  statusText: string;
  timestamp: string;
  triggerType: number;
  url: string;
}

export interface AppPortalAccessIn {
  featureFlags?: string[];
}

export interface AppPortalAccessOut {
  url: string;
  token: string;
}

export interface RecoverIn {
  since: string;
  until?: string;
}

export interface RecoverOut {
  id: string;
  status: string;
  task: string;
}

export interface EndpointHeadersOut {
  headers: Record<string, string>;
  sensitive: string[];
}

export interface EndpointHeadersIn {
  headers: Record<string, string>;
}

export interface ListOptions {
  limit?: number;
  iterator?: string;
  order?: 'ascending' | 'descending';
}

export interface ApplicationListOptions extends ListOptions {
  excludeAppsWithNoEndpoints?: boolean;
  excludeAppsWithDisabledEndpoints?: boolean;
  excludeAppsWithSvixPlayEndpoints?: boolean;
}

export interface MessageListOptions extends ListOptions {
  channel?: string;
  before?: string;
  after?: string;
  eventTypes?: string[];
  tag?: string;
  withContent?: boolean;
}

export interface AttemptListOptions extends ListOptions {
  status?: number;
  statusCodeClass?: number;
  channel?: string;
  tag?: string;
  before?: string;
  after?: string;
  eventTypes?: string[];
  expandedStatuses?: boolean;
}

export interface MessagePrecheckIn {
  eventType: string;
  channels?: string[];
}

export interface MessagePrecheckOut {
  active: boolean;
}

export interface EndpointTransformationOut {
  code?: string | null;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface EndpointTransformationPatch {
  code?: string | null;
  enabled?: boolean;
}

export type EventTypeUpdate = Omit<EventTypeIn, 'name'>;

export interface EventTypeImportOpenApiIn {
  spec?: Record<string, unknown>;
  specRaw?: string;
  dryRun?: boolean;
  replaceAll?: boolean;
}

export interface EventTypeImportOpenApiOut {
  data: Record<string, unknown>;
}

// ---- Client ----

export class Client {
  private http;

  constructor(config: { token: string; region: string }) {
    let baseURL = BASE_URLS[config.region] || BASE_URLS.us;
    this.http = createAxios({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      (error: unknown) => Promise.reject(svixApiError(error))
    );
  }

  // ---- Applications ----

  async listApplications(
    options?: ApplicationListOptions
  ): Promise<ListResponse<ApplicationOut>> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    if (options?.excludeAppsWithNoEndpoints) params.exclude_apps_with_no_endpoints = true;
    if (options?.excludeAppsWithDisabledEndpoints)
      params.exclude_apps_with_disabled_endpoints = true;
    if (options?.excludeAppsWithSvixPlayEndpoints)
      params.exclude_apps_with_svix_play_endpoints = true;
    let res = await this.http.get('/app/', { params });
    return res.data;
  }

  async createApplication(app: ApplicationIn): Promise<ApplicationOut> {
    let res = await this.http.post('/app/', app);
    return res.data;
  }

  async getApplication(appId: string): Promise<ApplicationOut> {
    let res = await this.http.get(`/app/${appId}/`);
    return res.data;
  }

  async updateApplication(appId: string, app: ApplicationIn): Promise<ApplicationOut> {
    let res = await this.http.put(`/app/${appId}/`, app);
    return res.data;
  }

  async deleteApplication(appId: string): Promise<void> {
    await this.http.delete(`/app/${appId}/`);
  }

  // ---- Messages ----

  async createMessage(appId: string, message: MessageIn): Promise<MessageOut> {
    let res = await this.http.post(`/app/${appId}/msg/`, message);
    return res.data;
  }

  async listMessages(
    appId: string,
    options?: MessageListOptions
  ): Promise<ListResponse<MessageOut>> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    if (options?.channel) params.channel = options.channel;
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.tag) params.tag = options.tag;
    if (options?.withContent !== undefined) params.with_content = options.withContent;
    if (options?.eventTypes) params.event_types = options.eventTypes.join(',');
    let res = await this.http.get(`/app/${appId}/msg/`, { params });
    return res.data;
  }

  async getMessage(
    appId: string,
    msgId: string,
    options?: { withContent?: boolean }
  ): Promise<MessageOut> {
    let params: Record<string, boolean> = {};
    if (options?.withContent !== undefined) params.with_content = options.withContent;
    let res = await this.http.get(`/app/${appId}/msg/${msgId}/`, { params });
    return res.data;
  }

  async precheckMessage(
    appId: string,
    precheck: MessagePrecheckIn
  ): Promise<MessagePrecheckOut> {
    let res = await this.http.post(`/app/${appId}/msg/precheck/active/`, precheck);
    return res.data;
  }

  async expungeMessageContent(appId: string, msgId: string): Promise<void> {
    await this.http.delete(`/app/${appId}/msg/${msgId}/content/`);
  }

  // ---- Endpoints ----

  async listEndpoints(
    appId: string,
    options?: ListOptions
  ): Promise<ListResponse<EndpointOut>> {
    let params: Record<string, string | number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    let res = await this.http.get(`/app/${appId}/endpoint/`, { params });
    return res.data;
  }

  async createEndpoint(appId: string, endpoint: EndpointIn): Promise<EndpointOut> {
    let res = await this.http.post(`/app/${appId}/endpoint/`, endpoint);
    return res.data;
  }

  async getEndpoint(appId: string, endpointId: string): Promise<EndpointOut> {
    let res = await this.http.get(`/app/${appId}/endpoint/${endpointId}/`);
    return res.data;
  }

  async updateEndpoint(
    appId: string,
    endpointId: string,
    endpoint: EndpointIn
  ): Promise<EndpointOut> {
    let res = await this.http.put(`/app/${appId}/endpoint/${endpointId}/`, endpoint);
    return res.data;
  }

  async deleteEndpoint(appId: string, endpointId: string): Promise<void> {
    await this.http.delete(`/app/${appId}/endpoint/${endpointId}/`);
  }

  async getEndpointSecret(appId: string, endpointId: string): Promise<EndpointSecretOut> {
    let res = await this.http.get(`/app/${appId}/endpoint/${endpointId}/secret/`);
    return res.data;
  }

  async rotateEndpointSecret(appId: string, endpointId: string, key?: string): Promise<void> {
    await this.http.post(`/app/${appId}/endpoint/${endpointId}/secret/rotate/`, { key });
  }

  async getEndpointStats(
    appId: string,
    endpointId: string,
    options?: { since?: string; until?: string }
  ): Promise<EndpointStats> {
    let params: Record<string, string> = {};
    if (options?.since) params.since = options.since;
    if (options?.until) params.until = options.until;
    let res = await this.http.get(`/app/${appId}/endpoint/${endpointId}/stats/`, {
      params
    });
    return res.data;
  }

  async recoverEndpoint(
    appId: string,
    endpointId: string,
    recover: RecoverIn
  ): Promise<RecoverOut> {
    let res = await this.http.post(`/app/${appId}/endpoint/${endpointId}/recover/`, recover);
    return res.data;
  }

  async getEndpointHeaders(appId: string, endpointId: string): Promise<EndpointHeadersOut> {
    let res = await this.http.get(`/app/${appId}/endpoint/${endpointId}/headers/`);
    return res.data;
  }

  async updateEndpointHeaders(
    appId: string,
    endpointId: string,
    headers: EndpointHeadersIn
  ): Promise<void> {
    await this.http.put(`/app/${appId}/endpoint/${endpointId}/headers/`, headers);
  }

  async getEndpointTransformation(
    appId: string,
    endpointId: string
  ): Promise<EndpointTransformationOut> {
    let res = await this.http.get(`/app/${appId}/endpoint/${endpointId}/transformation/`);
    return res.data;
  }

  async patchEndpointTransformation(
    appId: string,
    endpointId: string,
    transformation: EndpointTransformationPatch
  ): Promise<void> {
    await this.http.patch(
      `/app/${appId}/endpoint/${endpointId}/transformation/`,
      transformation
    );
  }

  // ---- Event Types ----

  async listEventTypes(
    options?: ListOptions & { withContent?: boolean; includeArchived?: boolean }
  ): Promise<ListResponse<EventTypeOut>> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    if (options?.withContent) params.with_content = true;
    if (options?.includeArchived) params.include_archived = true;
    let res = await this.http.get('/event-type/', { params });
    return res.data;
  }

  async createEventType(eventType: EventTypeIn): Promise<EventTypeOut> {
    let res = await this.http.post('/event-type/', eventType);
    return res.data;
  }

  async getEventType(eventTypeName: string): Promise<EventTypeOut> {
    let res = await this.http.get(`/event-type/${eventTypeName}/`);
    return res.data;
  }

  async updateEventType(
    eventTypeName: string,
    eventType: EventTypeUpdate
  ): Promise<EventTypeOut> {
    let res = await this.http.put(`/event-type/${eventTypeName}/`, eventType);
    return res.data;
  }

  async deleteEventType(eventTypeName: string): Promise<void> {
    await this.http.delete(`/event-type/${eventTypeName}/`);
  }

  async importEventTypesFromOpenApi(
    input: EventTypeImportOpenApiIn
  ): Promise<EventTypeImportOpenApiOut> {
    let res = await this.http.post('/event-type/import/openapi/', input);
    return res.data;
  }

  // ---- Message Attempts ----

  async listAttemptsByMessage(
    appId: string,
    msgId: string,
    options?: AttemptListOptions
  ): Promise<ListResponse<MessageAttemptOut>> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    if (options?.status !== undefined) params.status = options.status;
    if (options?.statusCodeClass !== undefined)
      params.status_code_class = options.statusCodeClass;
    if (options?.channel) params.channel = options.channel;
    if (options?.tag) params.tag = options.tag;
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.expandedStatuses !== undefined)
      params.expanded_statuses = options.expandedStatuses;
    if (options?.eventTypes) params.event_types = options.eventTypes.join(',');
    let res = await this.http.get(`/app/${appId}/attempt/msg/${msgId}/`, { params });
    return res.data;
  }

  async listAttemptsByEndpoint(
    appId: string,
    endpointId: string,
    options?: AttemptListOptions
  ): Promise<ListResponse<MessageAttemptOut>> {
    let params: Record<string, string | number | boolean> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    if (options?.order) params.order = options.order;
    if (options?.status !== undefined) params.status = options.status;
    if (options?.statusCodeClass !== undefined)
      params.status_code_class = options.statusCodeClass;
    if (options?.channel) params.channel = options.channel;
    if (options?.tag) params.tag = options.tag;
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.expandedStatuses !== undefined)
      params.expanded_statuses = options.expandedStatuses;
    if (options?.eventTypes) params.event_types = options.eventTypes.join(',');
    let res = await this.http.get(`/app/${appId}/attempt/endpoint/${endpointId}/`, { params });
    return res.data;
  }

  async resendMessage(appId: string, msgId: string, endpointId: string): Promise<void> {
    await this.http.post(`/app/${appId}/msg/${msgId}/endpoint/${endpointId}/resend/`);
  }

  // ---- Authentication / Portal ----

  async getAppPortalAccess(
    appId: string,
    options?: AppPortalAccessIn
  ): Promise<AppPortalAccessOut> {
    let res = await this.http.post(`/auth/app-portal-access/${appId}/`, options || {});
    return res.data;
  }

  // ---- Operational Webhook Endpoints ----

  async listOperationalWebhookEndpoints(
    options?: ListOptions
  ): Promise<ListResponse<EndpointOut>> {
    let params: Record<string, string | number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.iterator) params.iterator = options.iterator;
    let res = await this.http.get('/operational-webhook/endpoint/', { params });
    return res.data;
  }

  async createOperationalWebhookEndpoint(endpoint: EndpointIn): Promise<EndpointOut> {
    let res = await this.http.post('/operational-webhook/endpoint/', endpoint);
    return res.data;
  }

  async deleteOperationalWebhookEndpoint(endpointId: string): Promise<void> {
    await this.http.delete(`/operational-webhook/endpoint/${endpointId}/`);
  }

  async getOperationalWebhookEndpoint(endpointId: string): Promise<EndpointOut> {
    let res = await this.http.get(`/operational-webhook/endpoint/${endpointId}/`);
    return res.data;
  }

  async updateOperationalWebhookEndpoint(
    endpointId: string,
    endpoint: EndpointIn
  ): Promise<EndpointOut> {
    let res = await this.http.put(`/operational-webhook/endpoint/${endpointId}/`, endpoint);
    return res.data;
  }
}
