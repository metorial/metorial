import { createAxios } from 'slates';

export interface ControlPlaneClientConfig {
  token: string;
  region?: string;
}

export interface DataPlaneClientConfig {
  sourceWriteKey: string;
  dataPlaneUrl: string;
}

let getControlPlaneBaseUrl = (region?: string): string => {
  if (region === 'eu') {
    return 'https://api.eu.rudderstack.com';
  }
  return 'https://api.rudderstack.com';
};

export class ControlPlaneClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ControlPlaneClientConfig) {
    let baseURL = getControlPlaneBaseUrl(config.region);
    let basicAuth = btoa(`:${config.token}`);

    this.axios = createAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.request.use(reqConfig => {
      let url = reqConfig.url || '';
      // Bearer auth for: /v2/regulations, /v2/retl-connections, audit-logs
      if (
        url.includes('/v2/regulations') ||
        url.includes('/v2/retl-connections') ||
        url.includes('/audit-logs') ||
        url.includes('/v2/catalog')
      ) {
        reqConfig.headers.set('Authorization', `Bearer ${config.token}`);
      } else {
        reqConfig.headers.set('Authorization', `Basic ${basicAuth}`);
      }
      return reqConfig;
    });
  }

  // ===== Transformations =====

  async createTransformation(data: {
    name: string;
    code: string;
    language?: string;
    description?: string;
    publish?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/transformations', data);
    return response.data;
  }

  async listTransformations(): Promise<any> {
    let response = await this.axios.get('/transformations');
    return response.data;
  }

  async getTransformation(transformationId: string): Promise<any> {
    let response = await this.axios.get(`/transformations/${transformationId}`);
    return response.data;
  }

  async updateTransformation(
    transformationId: string,
    data: {
      code?: string;
      description?: string;
      publish?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/transformations/${transformationId}`, data);
    return response.data;
  }

  async deleteTransformation(transformationId: string): Promise<any> {
    let response = await this.axios.delete(`/transformations/${transformationId}`);
    return response.data;
  }

  async getTransformationVersions(transformationId: string, order?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (order) params.orderBy = order;
    let response = await this.axios.get(`/transformations/${transformationId}/versions`, {
      params
    });
    return response.data;
  }

  // ===== Libraries =====

  async createLibrary(data: {
    name: string;
    code: string;
    language?: string;
    description?: string;
    publish?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/libraries', data);
    return response.data;
  }

  async listLibraries(): Promise<any> {
    let response = await this.axios.get('/libraries');
    return response.data;
  }

  async getLibrary(libraryId: string): Promise<any> {
    let response = await this.axios.get(`/libraries/${libraryId}`);
    return response.data;
  }

  async updateLibrary(
    libraryId: string,
    data: {
      code?: string;
      description?: string;
      publish?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/libraries/${libraryId}`, data);
    return response.data;
  }

  async deleteLibrary(libraryId: string): Promise<any> {
    let response = await this.axios.delete(`/libraries/${libraryId}`);
    return response.data;
  }

  async getLibraryVersions(libraryId: string, order?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (order) params.orderBy = order;
    let response = await this.axios.get(`/libraries/${libraryId}/versions`, { params });
    return response.data;
  }

  // ===== Publish =====

  async publish(data: { transformationIds?: string[]; libraryIds?: string[] }): Promise<any> {
    let body: Record<string, any> = {};
    if (data.transformationIds)
      body.transformations = data.transformationIds.map(id => ({ id }));
    if (data.libraryIds) body.libraries = data.libraryIds.map(id => ({ id }));
    let response = await this.axios.post('/publish', body);
    return response.data;
  }

  // ===== Tracking Plans =====

  async createTrackingPlan(data: { name: string; description?: string }): Promise<any> {
    let response = await this.axios.post('/v2/catalog/tracking-plans', data);
    return response.data;
  }

  async listTrackingPlans(): Promise<any> {
    let response = await this.axios.get('/v2/catalog/tracking-plans');
    return response.data;
  }

  async getTrackingPlan(trackingPlanId: string): Promise<any> {
    let response = await this.axios.get(`/v2/catalog/tracking-plans/${trackingPlanId}`);
    return response.data;
  }

  async updateTrackingPlan(
    trackingPlanId: string,
    data: {
      name?: string;
      description?: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/v2/catalog/tracking-plans/${trackingPlanId}`, data);
    return response.data;
  }

  async deleteTrackingPlan(trackingPlanId: string): Promise<any> {
    let response = await this.axios.delete(`/v2/catalog/tracking-plans/${trackingPlanId}`);
    return response.data;
  }

  async upsertTrackingPlanEvents(trackingPlanId: string, events: any[]): Promise<any> {
    let response = await this.axios.put(
      `/v2/catalog/tracking-plans/${trackingPlanId}/events`,
      { events }
    );
    return response.data;
  }

  async deleteTrackingPlanEvent(trackingPlanId: string, eventId: string): Promise<any> {
    let response = await this.axios.delete(
      `/v2/catalog/tracking-plans/${trackingPlanId}/events/${eventId}`
    );
    return response.data;
  }

  // ===== User Suppression (Regulations) =====

  async createRegulation(data: {
    regulationType: string;
    sourceIds?: string[];
    destinationIds?: string[];
    users: Array<{ userId: string; [key: string]: any }>;
  }): Promise<any> {
    let response = await this.axios.post('/v2/regulations', data);
    return response.data;
  }

  async listRegulations(params?: { limit?: number; offset?: number }): Promise<any> {
    let response = await this.axios.get('/v2/regulations', { params });
    return response.data;
  }

  async deleteRegulation(regulationId: string): Promise<any> {
    let response = await this.axios.delete(`/v2/regulations/${regulationId}`);
    return response.data;
  }

  // ===== Reverse ETL =====

  async triggerRetlSync(connectionId: string, syncType: string): Promise<any> {
    let response = await this.axios.post(`/v2/retl-connections/${connectionId}/start`, {
      syncType
    });
    return response.data;
  }

  async stopRetlSync(connectionId: string): Promise<any> {
    let response = await this.axios.post(`/v2/retl-connections/${connectionId}/stop`);
    return response.data;
  }

  async getRetlSyncStatus(connectionId: string, syncId: string): Promise<any> {
    let response = await this.axios.get(
      `/v2/retl-connections/${connectionId}/syncs/${syncId}`
    );
    return response.data;
  }

  async listRetlSyncs(
    connectionId: string,
    params?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/v2/retl-connections/${connectionId}/syncs`, {
      params
    });
    return response.data;
  }

  // ===== Test API =====

  async testDestination(data: {
    destinationId: string;
    sourceId: string;
    stage?: string;
    event?: any;
  }): Promise<any> {
    let response = await this.axios.post('/v2/testDestination', data);
    return response.data;
  }

  async testSource(data: { sourceId: string; stage?: string; event?: any }): Promise<any> {
    let response = await this.axios.post('/v2/testSource', data);
    return response.data;
  }

  // ===== Event Audit (Data Governance) =====

  async getEventModels(params?: { sourceId?: string }): Promise<any> {
    let response = await this.axios.get('/v1/event-audit/event-models', { params });
    return response.data;
  }

  async getEventModelMetadata(eventModelId: string): Promise<any> {
    let response = await this.axios.get(
      `/v1/event-audit/event-models/${eventModelId}/metadata`
    );
    return response.data;
  }

  // ===== Audit Logs =====

  async getAuditLogs(params?: {
    workspaceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let response = await this.axios.get('/audit-logs', { params });
    return response.data;
  }
}

export class DataPlaneClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: DataPlaneClientConfig) {
    let basicAuth = btoa(`${config.sourceWriteKey}:`);

    this.axios = createAxios({
      baseURL: config.dataPlaneUrl.replace(/\/+$/, ''),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`
      }
    });
  }

  async identify(data: {
    userId?: string;
    anonymousId?: string;
    traits?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/identify', data);
    return response.data;
  }

  async track(data: {
    userId?: string;
    anonymousId?: string;
    event: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/track', data);
    return response.data;
  }

  async page(data: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/page', data);
    return response.data;
  }

  async screen(data: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/screen', data);
    return response.data;
  }

  async group(data: {
    userId?: string;
    anonymousId?: string;
    groupId: string;
    traits?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/group', data);
    return response.data;
  }

  async alias(data: {
    userId: string;
    previousId: string;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/alias', data);
    return response.data;
  }

  async batch(data: {
    batch: Array<{
      type: string;
      [key: string]: any;
    }>;
  }): Promise<any> {
    let response = await this.axios.post('/v1/batch', data);
    return response.data;
  }
}
