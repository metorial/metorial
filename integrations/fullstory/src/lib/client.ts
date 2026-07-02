import { createAxios } from 'slates';
import { fullStoryApiError } from './errors';

export interface FullStoryUser {
  userId: string;
  uid?: string;
  displayName?: string;
  email?: string;
  isBeingDeleted?: boolean;
  properties?: Record<string, any>;
  schema?: Record<string, any> | null;
  typeConflicts?: Record<string, any> | null;
  appUrl?: string;
}

export interface FullStorySession {
  sessionId: string;
  createdTime: string;
  fsUrl: string;
}

export interface FullStoryQuota {
  usage?: string;
  limit?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface FullStoryOrganizationQuotas {
  sessionQuota?: FullStoryQuota;
  serverEventQuota?: FullStoryQuota;
}

export interface GenerateSessionContextParams {
  sessionId: string;
  sliceMode?: 'UNSPECIFIED' | 'FIRST' | 'LAST' | 'TIMESTAMP';
  eventLimit?: number;
  durationLimitMs?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  includeContext?: string[];
  excludeContext?: string[];
  excludeOrgContext?: boolean;
  excludeUserContext?: boolean;
  excludeLocation?: boolean;
  excludeDevice?: boolean;
  includeEventTypes?: string[];
  excludeEventTypes?: string[];
  excludeDefinedEvents?: boolean;
  excludeApiEvents?: boolean;
  excludeEventTimestamps?: boolean;
  excludeSelectors?: boolean;
  includeSelectorTags?: boolean;
  trimToLastNSelectors?: number;
  includeTabIndex?: boolean;
  includeDescriptions?: boolean;
  enableEventCache?: boolean;
}

export interface FullStorySegment {
  segmentId: string;
  name: string;
  creator?: string;
  created?: string;
  url?: string;
}

export interface FullStoryOperation {
  operationId: string;
  type: string;
  state: string;
  details?: Record<string, any>;
  results?: Record<string, any>;
  created?: string;
  finished?: string;
  progress?: number;
  step?: string;
}

export interface FullStoryWebhookEndpoint {
  endpointId: string;
  created: string;
  modified: string;
  enabled: boolean;
  url: string;
  eventTypes: Array<{ eventName: string; subcategory?: string }>;
}

export interface FullStoryAnnotation {
  text: string;
  startTime?: string;
  endTime?: string;
  source?: string;
}

export interface CreateUserParams {
  uid?: string;
  displayName?: string;
  email?: string;
  properties?: Record<string, any>;
  schema?: Record<string, any>;
}

export interface CreateEventParams {
  userId?: string;
  uid?: string;
  sessionId?: string;
  useMostRecent?: boolean;
  name: string;
  timestamp?: string;
  properties?: Record<string, any>;
  schema?: Record<string, any>;
}

export interface CreateAnnotationParams {
  text: string;
  startTime?: string;
  endTime?: string;
  source?: string;
}

export interface CreateWebhookEndpointParams {
  url: string;
  eventTypes: Array<{ eventName: string; subcategory?: string }>;
  secret?: string;
}

export interface UpdateWebhookEndpointParams {
  url?: string;
  eventTypes?: Array<{ eventName: string; subcategory?: string }>;
  secret?: string;
  enabled?: boolean;
}

export interface CreateSegmentExportParams {
  segmentId: string;
  type: string;
  format: string;
  startTime?: string;
  endTime?: string;
  segmentStartTime?: string;
  segmentEndTime?: string;
}

let mapResponseUser = (data: any): FullStoryUser => ({
  userId: data.id || '',
  uid: data.uid,
  displayName: data.display_name,
  email: data.email,
  isBeingDeleted: data.is_being_deleted,
  properties: data.properties,
  schema: data.schema,
  typeConflicts: data.type_conflicts,
  appUrl: data.app_url
});

let mapResponseEndpoint = (data: any): FullStoryWebhookEndpoint => ({
  endpointId: data.id || '',
  created: data.created || '',
  modified: data.modified || '',
  enabled: data.enabled ?? true,
  url: data.url || '',
  eventTypes: (data.eventTypes || data.event_types || []).map((e: any) => ({
    eventName: e.eventName || e.event_name || '',
    subcategory: e.subcategory
  }))
});

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.fullstory.com',
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw fullStoryApiError(error, operation);
    }
  }

  // ===== Users API (v2) =====

  async createOrUpdateUser(params: CreateUserParams): Promise<FullStoryUser> {
    return this.request('create or update user', async () => {
      let body: Record<string, any> = {};
      if (params.uid !== undefined) body.uid = params.uid;
      if (params.displayName !== undefined) body.display_name = params.displayName;
      if (params.email !== undefined) body.email = params.email;
      if (params.properties !== undefined) body.properties = params.properties;
      if (params.schema !== undefined) body.schema = params.schema;

      let response = await this.axios.post('/v2/users', body);
      return mapResponseUser(response.data);
    });
  }

  async getUser(userId: string): Promise<FullStoryUser> {
    return this.request('get user', async () => {
      let response = await this.axios.get(`/v2/users/${encodeURIComponent(userId)}`);
      return mapResponseUser(response.data);
    });
  }

  async listUsers(params?: {
    uid?: string;
    email?: string;
    displayName?: string;
    isIdentified?: boolean;
    pageToken?: string;
  }): Promise<{ users: FullStoryUser[]; nextPageToken?: string }> {
    return this.request('list users', async () => {
      let query: Record<string, string> = {};
      if (params?.uid) query.uid = params.uid;
      if (params?.email) query.email = params.email;
      if (params?.displayName) query.display_name = params.displayName;
      if (params?.isIdentified !== undefined)
        query.is_identified = String(params.isIdentified);
      if (params?.pageToken) query.page_token = params.pageToken;

      let response = await this.axios.get('/v2/users', { params: query });
      let data = response.data;

      return {
        users: (data.results || []).map(mapResponseUser),
        nextPageToken: data.next_page_token || undefined
      };
    });
  }

  async deleteUser(uid: string): Promise<{ operationId: string }> {
    return this.request('delete user', async () => {
      let response = await this.axios.delete(
        `/users/v1/individual/${encodeURIComponent(uid)}`
      );
      return { operationId: response.data?.id || response.data?.operationId || '' };
    });
  }

  // ===== Events API (v2) =====

  async createEvent(params: CreateEventParams): Promise<void> {
    await this.request('create event', async () => {
      let body: Record<string, any> = { name: params.name };

      if (params.sessionId) {
        body.session = { id: params.sessionId };
      } else if (params.useMostRecent && (params.userId || params.uid)) {
        body.session = { use_most_recent: true };
        body.user = {};
        if (params.userId) body.user.id = params.userId;
        if (params.uid) body.user.uid = params.uid;
      } else if (params.userId || params.uid) {
        body.user = {};
        if (params.userId) body.user.id = params.userId;
        if (params.uid) body.user.uid = params.uid;
      }

      if (params.timestamp) body.timestamp = params.timestamp;
      if (params.properties) body.properties = params.properties;
      if (params.schema) body.schema = params.schema;

      await this.axios.post('/v2/events', body);
    });
  }

  // ===== Sessions API =====

  async listSessions(params: {
    uid?: string;
    email?: string;
    limit?: number;
  }): Promise<FullStorySession[]> {
    return this.request('list sessions', async () => {
      let query: Record<string, string> = {};
      if (params.uid) query.uid = params.uid;
      if (params.email) query.email = params.email;
      if (params.limit) query.limit = String(params.limit);

      let response = await this.axios.get('/v2/sessions', { params: query });
      let sessions = response.data?.results || [];

      return sessions.map((s: any) => ({
        sessionId: s.id || '',
        createdTime: s.created_time || '',
        fsUrl: s.app_url || ''
      }));
    });
  }

  async getSessionEvents(
    sessionId: string,
    params?: { enableEventCache?: boolean }
  ): Promise<Record<string, any>> {
    return this.request('get session events', async () => {
      let query: Record<string, string> = {};
      if (params?.enableEventCache !== undefined) {
        query.enable_event_cache = String(params.enableEventCache);
      }

      let response = await this.axios.get(
        `/v2/sessions/${encodeURIComponent(sessionId)}/events`,
        { params: query }
      );
      return response.data;
    });
  }

  async generateSessionContext(
    params: GenerateSessionContextParams
  ): Promise<Record<string, any>> {
    return this.request('generate session context', async () => {
      let body: Record<string, any> = {};

      if (
        params.sliceMode ||
        params.eventLimit !== undefined ||
        params.durationLimitMs ||
        params.startTimestamp ||
        params.endTimestamp
      ) {
        body.slice = {};
        if (params.sliceMode) body.slice.mode = params.sliceMode;
        if (params.eventLimit !== undefined) body.slice.event_limit = params.eventLimit;
        if (params.durationLimitMs) body.slice.duration_limit_ms = params.durationLimitMs;
        if (params.startTimestamp) body.slice.start_timestamp = params.startTimestamp;
        if (params.endTimestamp) body.slice.end_timestamp = params.endTimestamp;
      }

      if (
        params.includeContext ||
        params.excludeContext ||
        params.excludeOrgContext !== undefined ||
        params.excludeUserContext !== undefined ||
        params.excludeLocation !== undefined ||
        params.excludeDevice !== undefined
      ) {
        body.context = {};
        if (params.includeContext) body.context.include = params.includeContext;
        if (params.excludeContext) body.context.exclude = params.excludeContext;
        if (params.excludeOrgContext !== undefined)
          body.context.exclude_org_context = params.excludeOrgContext;
        if (params.excludeUserContext !== undefined)
          body.context.exclude_user_context = params.excludeUserContext;
        if (params.excludeLocation !== undefined)
          body.context.exclude_location = params.excludeLocation;
        if (params.excludeDevice !== undefined)
          body.context.exclude_device = params.excludeDevice;
      }

      if (
        params.includeEventTypes ||
        params.excludeEventTypes ||
        params.excludeDefinedEvents !== undefined ||
        params.excludeApiEvents !== undefined ||
        params.excludeEventTimestamps !== undefined ||
        params.excludeSelectors !== undefined ||
        params.includeSelectorTags !== undefined ||
        params.trimToLastNSelectors !== undefined ||
        params.includeTabIndex !== undefined ||
        params.includeDescriptions !== undefined
      ) {
        body.events = {};
        if (params.includeEventTypes) body.events.include_types = params.includeEventTypes;
        if (params.excludeEventTypes) body.events.exclude_types = params.excludeEventTypes;
        if (params.excludeDefinedEvents !== undefined)
          body.events.exclude_defined_events = params.excludeDefinedEvents;
        if (params.excludeApiEvents !== undefined)
          body.events.exclude_api_events = params.excludeApiEvents;
        if (params.excludeEventTimestamps !== undefined)
          body.events.exclude_event_timestamps = params.excludeEventTimestamps;
        if (params.excludeSelectors !== undefined)
          body.events.exclude_selectors = params.excludeSelectors;
        if (params.includeSelectorTags !== undefined)
          body.events.include_selector_tags = params.includeSelectorTags;
        if (params.trimToLastNSelectors !== undefined)
          body.events.trim_to_last_n_selectors = params.trimToLastNSelectors;
        if (params.includeTabIndex !== undefined)
          body.events.include_tab_index = params.includeTabIndex;
        if (params.includeDescriptions !== undefined)
          body.events.include_descriptions = params.includeDescriptions;
      }

      if (params.enableEventCache !== undefined) {
        body.cache = { enable_event_cache: params.enableEventCache };
      }

      let response = await this.axios.post(
        `/v2/sessions/${encodeURIComponent(params.sessionId)}/context`,
        body
      );
      return response.data;
    });
  }

  // ===== Organization API (v2) =====

  async getOrganizationQuotas(): Promise<FullStoryOrganizationQuotas> {
    return this.request('get organization quotas', async () => {
      let response = await this.axios.get('/v2/organization/quotas');
      let data = response.data;
      let mapQuota = (quota: any): FullStoryQuota | undefined => {
        if (!quota) {
          return undefined;
        }

        return {
          usage: quota.usage,
          limit: quota.limit,
          periodStart: quota.period_start,
          periodEnd: quota.period_end
        };
      };

      return {
        sessionQuota: mapQuota(data.session_quota),
        serverEventQuota: mapQuota(data.server_event_quota)
      };
    });
  }

  // ===== Segments API (v1) =====

  async listSegments(params?: {
    limit?: number;
    paginationToken?: string;
    creator?: string;
  }): Promise<{ segments: FullStorySegment[]; nextPaginationToken?: string }> {
    return this.request('list segments', async () => {
      let query: Record<string, string> = {};
      if (params?.limit) query.limit = String(params.limit);
      if (params?.paginationToken) query.paginationToken = params.paginationToken;
      if (params?.creator) query.creator = params.creator;

      let response = await this.axios.get('/segments/v1', { params: query });
      let data = response.data;

      return {
        segments: (data.segments || []).map((s: any) => ({
          segmentId: s.id || '',
          name: s.name || '',
          creator: s.creator,
          created: s.created,
          url: s.url
        })),
        nextPaginationToken: data.nextPaginationToken || undefined
      };
    });
  }

  async getSegment(segmentId: string): Promise<FullStorySegment> {
    return this.request('get segment', async () => {
      let response = await this.axios.get(`/segments/v1/${encodeURIComponent(segmentId)}`);
      let s = response.data;
      return {
        segmentId: s.id || '',
        name: s.name || '',
        creator: s.creator,
        created: s.created,
        url: s.url
      };
    });
  }

  async createSegmentExport(
    params: CreateSegmentExportParams
  ): Promise<{ operationId: string }> {
    return this.request('create segment export', async () => {
      let body: Record<string, any> = {
        segmentId: params.segmentId,
        type: params.type,
        format: params.format
      };

      if (params.startTime || params.endTime) {
        body.timeRange = {};
        if (params.startTime) body.timeRange.start = params.startTime;
        if (params.endTime) body.timeRange.end = params.endTime;
      }

      if (params.segmentStartTime || params.segmentEndTime) {
        body.segmentTimeRange = {};
        if (params.segmentStartTime) body.segmentTimeRange.start = params.segmentStartTime;
        if (params.segmentEndTime) body.segmentTimeRange.end = params.segmentEndTime;
      }

      let response = await this.axios.post('/segments/v1/exports', body);
      return { operationId: response.data?.id || response.data?.operationId || '' };
    });
  }

  // ===== Operations API (v1) =====

  async getOperation(operationId: string): Promise<FullStoryOperation> {
    return this.request('get operation', async () => {
      let response = await this.axios.get(`/operations/v1/${encodeURIComponent(operationId)}`);
      let data = response.data;
      return {
        operationId: data.id || '',
        type: data.type || '',
        state: data.state || '',
        details: data.details,
        results: data.results,
        created: data.created,
        finished: data.finished,
        progress: data.progress,
        step: data.step
      };
    });
  }

  // ===== Search Export Results (v1) =====

  async getExportResults(exportId: string): Promise<{ downloadUrl: string }> {
    return this.request('get export results', async () => {
      let response = await this.axios.get(
        `/search/v1/exports/${encodeURIComponent(exportId)}/results`
      );
      return { downloadUrl: response.data?.url || response.data?.downloadUrl || '' };
    });
  }

  // ===== Annotations API (v2) =====

  async createAnnotation(params: CreateAnnotationParams): Promise<FullStoryAnnotation> {
    return this.request('create annotation', async () => {
      let body: Record<string, any> = { text: params.text };
      if (params.startTime) body.start_time = params.startTime;
      if (params.endTime) body.end_time = params.endTime;
      if (params.source) body.source = params.source;

      let response = await this.axios.post('/v2/annotations', body);
      return {
        text: response.data?.text || params.text,
        startTime: response.data?.start_time,
        endTime: response.data?.end_time,
        source: response.data?.source
      };
    });
  }

  // ===== Webhook Endpoints API (v1) =====

  async createWebhookEndpoint(
    params: CreateWebhookEndpointParams
  ): Promise<FullStoryWebhookEndpoint> {
    return this.request('create webhook endpoint', async () => {
      let body: Record<string, any> = {
        url: params.url,
        eventTypes: params.eventTypes.map(e => {
          let mapped: Record<string, any> = { eventName: e.eventName };
          if (e.subcategory) mapped.subcategory = e.subcategory;
          return mapped;
        })
      };
      if (params.secret) body.secret = params.secret;

      let response = await this.axios.post('/webhooks/v1/endpoints', body);
      return mapResponseEndpoint(response.data);
    });
  }

  async getWebhookEndpoint(endpointId: string): Promise<FullStoryWebhookEndpoint> {
    return this.request('get webhook endpoint', async () => {
      let response = await this.axios.get(
        `/webhooks/v1/endpoints/${encodeURIComponent(endpointId)}`
      );
      return mapResponseEndpoint(response.data);
    });
  }

  async listWebhookEndpoints(params?: {
    limit?: number;
    paginationToken?: string;
  }): Promise<{ endpoints: FullStoryWebhookEndpoint[]; nextPaginationToken?: string }> {
    return this.request('list webhook endpoints', async () => {
      let query: Record<string, string> = {};
      if (params?.limit) query.limit = String(params.limit);
      if (params?.paginationToken) query.paginationToken = params.paginationToken;

      let response = await this.axios.get('/webhooks/v1/endpoints', { params: query });
      let data = response.data;

      return {
        endpoints: (data.endpoints || []).map(mapResponseEndpoint),
        nextPaginationToken: data.nextPaginationToken || undefined
      };
    });
  }

  async updateWebhookEndpoint(
    endpointId: string,
    params: UpdateWebhookEndpointParams
  ): Promise<FullStoryWebhookEndpoint> {
    return this.request('update webhook endpoint', async () => {
      let body: Record<string, any> = {};
      if (params.url !== undefined) body.url = params.url;
      if (params.enabled !== undefined) body.enabled = params.enabled;
      if (params.secret !== undefined) body.secret = params.secret;
      if (params.eventTypes !== undefined) {
        body.eventTypes = params.eventTypes.map(e => {
          let mapped: Record<string, any> = { eventName: e.eventName };
          if (e.subcategory) mapped.subcategory = e.subcategory;
          return mapped;
        });
      }

      let response = await this.axios.post(
        `/webhooks/v1/endpoints/${encodeURIComponent(endpointId)}`,
        body
      );
      return mapResponseEndpoint(response.data);
    });
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await this.request('delete webhook endpoint', async () => {
      await this.axios.delete(`/webhooks/v1/endpoints/${encodeURIComponent(endpointId)}`);
    });
  }
}
