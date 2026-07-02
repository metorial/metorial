import { createAxios } from 'slates';

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
  userId: string;
  sessionId: string;
  createdTime: string;
  fsUrl: string;
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

  // ===== Users API (v2) =====

  async createOrUpdateUser(params: CreateUserParams): Promise<FullStoryUser> {
    let body: Record<string, any> = {};
    if (params.uid !== undefined) body.uid = params.uid;
    if (params.displayName !== undefined) body.display_name = params.displayName;
    if (params.email !== undefined) body.email = params.email;
    if (params.properties !== undefined) body.properties = params.properties;
    if (params.schema !== undefined) body.schema = params.schema;

    let response = await this.axios.post('/v2/users', body);
    return mapResponseUser(response.data);
  }

  async getUser(userId: string): Promise<FullStoryUser> {
    let response = await this.axios.get(`/v2/users/${encodeURIComponent(userId)}`);
    return mapResponseUser(response.data);
  }

  async listUsers(params?: {
    uid?: string;
    email?: string;
    displayName?: string;
    isIdentified?: boolean;
    pageToken?: string;
  }): Promise<{ users: FullStoryUser[]; nextPageToken?: string }> {
    let query: Record<string, string> = {};
    if (params?.uid) query.uid = params.uid;
    if (params?.email) query.email = params.email;
    if (params?.displayName) query.display_name = params.displayName;
    if (params?.isIdentified !== undefined) query.is_identified = String(params.isIdentified);
    if (params?.pageToken) query.page_token = params.pageToken;

    let response = await this.axios.get('/v2/users', { params: query });
    let data = response.data;

    return {
      users: (data.results || []).map(mapResponseUser),
      nextPageToken: data.next_page_token || undefined
    };
  }

  async deleteUser(uid: string): Promise<{ operationId: string }> {
    let response = await this.axios.delete(`/users/v1/individual/${encodeURIComponent(uid)}`);
    return { operationId: response.data?.id || response.data?.operationId || '' };
  }

  // ===== Events API (v2) =====

  async createEvent(params: CreateEventParams): Promise<void> {
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
  }

  // ===== Sessions API =====

  async listSessions(params: {
    uid?: string;
    email?: string;
    limit?: number;
  }): Promise<FullStorySession[]> {
    let query: Record<string, string> = {};
    if (params.uid) query.uid = params.uid;
    if (params.email) query.email = params.email;
    if (params.limit) query.limit = String(params.limit);

    let response = await this.axios.get('/sessions/v2', { params: query });
    let sessions = response.data?.sessions || [];

    return sessions.map((s: any) => ({
      userId: s.UserId || s.userId || '',
      sessionId: s.SessionId || s.sessionId || '',
      createdTime: s.CreatedTime || s.createdTime || '',
      fsUrl: s.FsUrl || s.fsUrl || ''
    }));
  }

  // ===== Segments API (v1) =====

  async listSegments(params?: {
    limit?: number;
    paginationToken?: string;
    creator?: string;
  }): Promise<{ segments: FullStorySegment[]; nextPaginationToken?: string }> {
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
  }

  async getSegment(segmentId: string): Promise<FullStorySegment> {
    let response = await this.axios.get(`/segments/v1/${encodeURIComponent(segmentId)}`);
    let s = response.data;
    return {
      segmentId: s.id || '',
      name: s.name || '',
      creator: s.creator,
      created: s.created,
      url: s.url
    };
  }

  async createSegmentExport(
    params: CreateSegmentExportParams
  ): Promise<{ operationId: string }> {
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
  }

  // ===== Operations API (v1) =====

  async getOperation(operationId: string): Promise<FullStoryOperation> {
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
  }

  // ===== Search Export Results (v1) =====

  async getExportResults(exportId: string): Promise<{ downloadUrl: string }> {
    let response = await this.axios.get(
      `/search/v1/exports/${encodeURIComponent(exportId)}/results`
    );
    return { downloadUrl: response.data?.url || response.data?.downloadUrl || '' };
  }

  // ===== Annotations API (v2) =====

  async createAnnotation(params: CreateAnnotationParams): Promise<FullStoryAnnotation> {
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
  }

  // ===== Webhook Endpoints API (v1) =====

  async createWebhookEndpoint(
    params: CreateWebhookEndpointParams
  ): Promise<FullStoryWebhookEndpoint> {
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
  }

  async getWebhookEndpoint(endpointId: string): Promise<FullStoryWebhookEndpoint> {
    let response = await this.axios.get(
      `/webhooks/v1/endpoints/${encodeURIComponent(endpointId)}`
    );
    return mapResponseEndpoint(response.data);
  }

  async listWebhookEndpoints(params?: {
    limit?: number;
    paginationToken?: string;
  }): Promise<{ endpoints: FullStoryWebhookEndpoint[]; nextPaginationToken?: string }> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.paginationToken) query.paginationToken = params.paginationToken;

    let response = await this.axios.get('/webhooks/v1/endpoints', { params: query });
    let data = response.data;

    return {
      endpoints: (data.endpoints || []).map(mapResponseEndpoint),
      nextPaginationToken: data.nextPaginationToken || undefined
    };
  }

  async updateWebhookEndpoint(
    endpointId: string,
    params: UpdateWebhookEndpointParams
  ): Promise<FullStoryWebhookEndpoint> {
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
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await this.axios.delete(`/webhooks/v1/endpoints/${encodeURIComponent(endpointId)}`);
  }
}
