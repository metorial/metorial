import { createAxios } from 'slates';

export class SegmentClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string, region: string = 'us') {
    let baseURL =
      region === 'eu' ? 'https://eu1.api.segmentapis.com' : 'https://api.segmentapis.com';

    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Workspace ──────────────────────────────────────────────────

  async getWorkspace() {
    let response = await this.http.get('/v1/workspace');
    return response.data?.data?.workspace;
  }

  // ─── Sources ────────────────────────────────────────────────────

  async listSources(params: { page?: number; count?: number } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.page) pagination['pagination.cursor'] = params.page;

    let response = await this.http.get('/v1/sources', { params: pagination });
    return response.data?.data;
  }

  async getSource(sourceId: string) {
    let response = await this.http.get(`/v1/sources/${sourceId}`);
    return response.data?.data?.source;
  }

  async createSource(data: {
    slug: string;
    enabled: boolean;
    metadataId: string;
    settings?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/sources', data);
    return response.data?.data?.source;
  }

  async updateSource(
    sourceId: string,
    data: {
      name?: string;
      enabled?: boolean;
      slug?: string;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.http.patch(`/v1/sources/${sourceId}`, data);
    return response.data?.data?.source;
  }

  async deleteSource(sourceId: string) {
    await this.http.delete(`/v1/sources/${sourceId}`);
  }

  async listConnectedDestinationsFromSource(
    sourceId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/sources/${sourceId}/destinations`, {
      params: pagination
    });
    return response.data?.data;
  }

  async listConnectedWarehousesFromSource(
    sourceId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/sources/${sourceId}/warehouses`, {
      params: pagination
    });
    return response.data?.data;
  }

  // ─── Destinations ───────────────────────────────────────────────

  async listDestinations(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/destinations', { params: pagination });
    return response.data?.data;
  }

  async getDestination(destinationId: string) {
    let response = await this.http.get(`/v1/destinations/${destinationId}`);
    return response.data?.data?.destination;
  }

  async createDestination(data: {
    sourceId: string;
    metadataId: string;
    enabled?: boolean;
    name?: string;
    settings?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      sourceId: data.sourceId,
      metadataId: data.metadataId,
      settings: data.settings ?? {}
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.name) body.name = data.name;

    let response = await this.http.post('/v1/destinations', body);
    return response.data?.data?.destination;
  }

  async updateDestination(
    destinationId: string,
    data: {
      name?: string;
      enabled?: boolean;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.http.patch(`/v1/destinations/${destinationId}`, data);
    return response.data?.data?.destination;
  }

  async deleteDestination(destinationId: string) {
    await this.http.delete(`/v1/destinations/${destinationId}`);
  }

  async listDeliveryMetrics(
    destinationId: string,
    params: {
      sourceId?: string;
      startTime?: string;
      endTime?: string;
      granularity?: string;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.sourceId) query.sourceId = params.sourceId;
    if (params.startTime) query.startTime = params.startTime;
    if (params.endTime) query.endTime = params.endTime;
    if (params.granularity) query.granularity = params.granularity;

    let response = await this.http.get(`/v1/destinations/${destinationId}/delivery-metrics`, {
      params: query
    });
    return response.data?.data;
  }

  // ─── Destination Subscriptions ──────────────────────────────────

  async listDestinationSubscriptions(
    destinationId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/destinations/${destinationId}/subscriptions`, {
      params: pagination
    });
    return response.data?.data;
  }

  async createDestinationSubscription(
    destinationId: string,
    data: {
      name: string;
      actionId: string;
      trigger: string;
      enabled?: boolean;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.http.post(
      `/v1/destinations/${destinationId}/subscriptions`,
      data
    );
    return response.data?.data?.subscription;
  }

  async updateDestinationSubscription(
    destinationId: string,
    subscriptionId: string,
    data: {
      name?: string;
      trigger?: string;
      enabled?: boolean;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.http.patch(
      `/v1/destinations/${destinationId}/subscriptions/${subscriptionId}`,
      data
    );
    return response.data?.data?.subscription;
  }

  async removeDestinationSubscription(destinationId: string, subscriptionId: string) {
    await this.http.delete(
      `/v1/destinations/${destinationId}/subscriptions/${subscriptionId}`
    );
  }

  // ─── Destination Filters ───────────────────────────────────────

  async listDestinationFilters(
    destinationId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/destinations/${destinationId}/filters`, {
      params: pagination
    });
    return response.data?.data;
  }

  async getDestinationFilter(destinationId: string, filterId: string) {
    let response = await this.http.get(
      `/v1/destinations/${destinationId}/filters/${filterId}`
    );
    return response.data?.data?.filter;
  }

  async createDestinationFilter(
    destinationId: string,
    data: {
      sourceId: string;
      title: string;
      description?: string;
      if: string;
      actions: Array<{
        type: string;
        fields?: Record<string, any>;
      }>;
      enabled?: boolean;
    }
  ) {
    let response = await this.http.post(`/v1/destinations/${destinationId}/filters`, data);
    return response.data?.data?.filter;
  }

  async updateDestinationFilter(
    destinationId: string,
    filterId: string,
    data: {
      title?: string;
      description?: string;
      if?: string;
      actions?: Array<{
        type: string;
        fields?: Record<string, any>;
      }>;
      enabled?: boolean;
    }
  ) {
    let response = await this.http.patch(
      `/v1/destinations/${destinationId}/filters/${filterId}`,
      data
    );
    return response.data?.data?.filter;
  }

  async removeDestinationFilter(destinationId: string, filterId: string) {
    await this.http.delete(`/v1/destinations/${destinationId}/filters/${filterId}`);
  }

  async previewDestinationFilter(
    destinationId: string,
    data: {
      filter: { if: string; actions: Array<{ type: string; fields?: Record<string, any> }> };
      input: Record<string, any>;
    }
  ) {
    let response = await this.http.post(
      `/v1/destinations/${destinationId}/filters/preview`,
      data
    );
    return response.data?.data;
  }

  // ─── Tracking Plans ────────────────────────────────────────────

  async listTrackingPlans(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/tracking-plans', { params: pagination });
    return response.data?.data;
  }

  async getTrackingPlan(trackingPlanId: string) {
    let response = await this.http.get(`/v1/tracking-plans/${trackingPlanId}`);
    return response.data?.data?.trackingPlan;
  }

  async createTrackingPlan(data: {
    name: string;
    description?: string;
    type?: string;
    rules?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/tracking-plans', data);
    return response.data?.data?.trackingPlan;
  }

  async updateTrackingPlan(
    trackingPlanId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.http.patch(`/v1/tracking-plans/${trackingPlanId}`, data);
    return response.data?.data;
  }

  async deleteTrackingPlan(trackingPlanId: string) {
    await this.http.delete(`/v1/tracking-plans/${trackingPlanId}`);
  }

  async listTrackingPlanRules(
    trackingPlanId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/tracking-plans/${trackingPlanId}/rules`, {
      params: pagination
    });
    return response.data?.data;
  }

  async updateTrackingPlanRules(
    trackingPlanId: string,
    data: {
      rules: Record<string, any>[];
    }
  ) {
    let response = await this.http.patch(`/v1/tracking-plans/${trackingPlanId}/rules`, data);
    return response.data?.data;
  }

  async replaceTrackingPlanRules(
    trackingPlanId: string,
    data: {
      rules: Record<string, any>[];
    }
  ) {
    let response = await this.http.put(`/v1/tracking-plans/${trackingPlanId}/rules`, data);
    return response.data?.data;
  }

  async removeTrackingPlanRules(
    trackingPlanId: string,
    data: {
      rules: Record<string, any>[];
    }
  ) {
    let response = await this.http.delete(`/v1/tracking-plans/${trackingPlanId}/rules`, {
      data
    });
    return response.data?.data;
  }

  async listSourcesFromTrackingPlan(
    trackingPlanId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/tracking-plans/${trackingPlanId}/sources`, {
      params: pagination
    });
    return response.data?.data;
  }

  async connectSourceToTrackingPlan(trackingPlanId: string, sourceId: string) {
    let response = await this.http.post(`/v1/tracking-plans/${trackingPlanId}/sources`, {
      sourceId
    });
    return response.data?.data;
  }

  async disconnectSourceFromTrackingPlan(trackingPlanId: string, sourceId: string) {
    await this.http.delete(`/v1/tracking-plans/${trackingPlanId}/sources/${sourceId}`);
  }

  // ─── Warehouses ────────────────────────────────────────────────

  async listWarehouses(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/warehouses', { params: pagination });
    return response.data?.data;
  }

  async getWarehouse(warehouseId: string) {
    let response = await this.http.get(`/v1/warehouses/${warehouseId}`);
    return response.data?.data?.warehouse;
  }

  async createWarehouse(data: {
    metadataId: string;
    settings?: Record<string, any>;
    enabled?: boolean;
    name?: string;
  }) {
    let response = await this.http.post('/v1/warehouses', data);
    return response.data?.data?.warehouse;
  }

  async updateWarehouse(
    warehouseId: string,
    data: {
      name?: string;
      enabled?: boolean;
      settings?: Record<string, any>;
    }
  ) {
    let response = await this.http.patch(`/v1/warehouses/${warehouseId}`, data);
    return response.data?.data?.warehouse;
  }

  async deleteWarehouse(warehouseId: string) {
    await this.http.delete(`/v1/warehouses/${warehouseId}`);
  }

  async addSourceToWarehouse(warehouseId: string, sourceId: string) {
    let response = await this.http.post(
      `/v1/warehouses/${warehouseId}/connected-sources/${sourceId}`
    );
    return response.data?.data;
  }

  async removeSourceFromWarehouse(warehouseId: string, sourceId: string) {
    await this.http.delete(`/v1/warehouses/${warehouseId}/connected-sources/${sourceId}`);
  }

  async listConnectedSourcesFromWarehouse(
    warehouseId: string,
    params: { count?: number; cursor?: string } = {}
  ) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get(`/v1/warehouses/${warehouseId}/connected-sources`, {
      params: pagination
    });
    return response.data?.data;
  }

  async getWarehouseConnectionState(warehouseId: string) {
    let response = await this.http.get(`/v1/warehouses/${warehouseId}/connection-state`);
    return response.data?.data;
  }

  // ─── Catalog ───────────────────────────────────────────────────

  async listCatalogSources(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/catalog/sources', { params: pagination });
    return response.data?.data;
  }

  async getCatalogSource(sourceMetadataId: string) {
    let response = await this.http.get(`/v1/catalog/sources/${sourceMetadataId}`);
    return response.data?.data?.sourceCatalogItem;
  }

  async listCatalogDestinations(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/catalog/destinations', { params: pagination });
    return response.data?.data;
  }

  async getCatalogDestination(destinationMetadataId: string) {
    let response = await this.http.get(`/v1/catalog/destinations/${destinationMetadataId}`);
    return response.data?.data?.destinationCatalogItem;
  }

  async listCatalogWarehouses(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/catalog/warehouses', { params: pagination });
    return response.data?.data;
  }

  // ─── Functions ─────────────────────────────────────────────────

  async listFunctions(
    params: { count?: number; cursor?: string; resourceType?: string } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.count) query['pagination.count'] = params.count;
    if (params.cursor) query['pagination.cursor'] = params.cursor;
    if (params.resourceType) query.resourceType = params.resourceType;

    let response = await this.http.get('/v1/functions', { params: query });
    return response.data?.data;
  }

  async getFunction(functionId: string) {
    let response = await this.http.get(`/v1/functions/${functionId}`);
    return response.data?.data?.function;
  }

  async createFunction(data: {
    code: string;
    settings?: Array<{
      name: string;
      label: string;
      description?: string;
      type: string;
      required?: boolean;
    }>;
    displayName: string;
    resourceType: string;
    description?: string;
  }) {
    let response = await this.http.post('/v1/functions', data);
    return response.data?.data?.function;
  }

  async updateFunction(
    functionId: string,
    data: {
      code?: string;
      settings?: Array<{
        name: string;
        label: string;
        description?: string;
        type: string;
        required?: boolean;
      }>;
      displayName?: string;
      description?: string;
    }
  ) {
    let response = await this.http.patch(`/v1/functions/${functionId}`, data);
    return response.data?.data?.function;
  }

  async deleteFunction(functionId: string) {
    await this.http.delete(`/v1/functions/${functionId}`);
  }

  // ─── Transformations ───────────────────────────────────────────

  async listTransformations(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/transformations', { params: pagination });
    return response.data?.data;
  }

  async getTransformation(transformationId: string) {
    let response = await this.http.get(`/v1/transformations/${transformationId}`);
    return response.data?.data?.transformation;
  }

  async createTransformation(data: {
    name: string;
    sourceId: string;
    destinationMetadataId?: string;
    if?: string;
    newEventName?: string;
    propertyRenames?: Array<{ oldName: string; newName: string }>;
    fqlDefinedProperties?: Array<{ fql: string; propertyName: string }>;
    enabled?: boolean;
  }) {
    let response = await this.http.post('/v1/transformations', data);
    return response.data?.data?.transformation;
  }

  async updateTransformation(
    transformationId: string,
    data: {
      name?: string;
      if?: string;
      newEventName?: string;
      propertyRenames?: Array<{ oldName: string; newName: string }>;
      fqlDefinedProperties?: Array<{ fql: string; propertyName: string }>;
      enabled?: boolean;
    }
  ) {
    let response = await this.http.patch(`/v1/transformations/${transformationId}`, data);
    return response.data?.data?.transformation;
  }

  async deleteTransformation(transformationId: string) {
    await this.http.delete(`/v1/transformations/${transformationId}`);
  }

  // ─── Reverse ETL ──────────────────────────────────────────────

  async listReverseEtlModels(params: { count?: number; cursor?: string } = {}) {
    let pagination: Record<string, any> = {};
    if (params.count) pagination['pagination.count'] = params.count;
    if (params.cursor) pagination['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/reverse-etl-models', { params: pagination });
    return response.data?.data;
  }

  async getReverseEtlModel(modelId: string) {
    let response = await this.http.get(`/v1/reverse-etl-models/${modelId}`);
    return response.data?.data?.reverseEtlModel;
  }

  async createReverseEtlModel(data: {
    sourceId: string;
    name: string;
    description?: string;
    enabled?: boolean;
    query: string;
    queryIdentifierColumn: string;
    scheduleStrategy: string;
    scheduleConfig?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/reverse-etl-models', data);
    return response.data?.data?.reverseEtlModel;
  }

  async updateReverseEtlModel(
    modelId: string,
    data: {
      name?: string;
      description?: string;
      enabled?: boolean;
      query?: string;
      queryIdentifierColumn?: string;
      scheduleStrategy?: string;
      scheduleConfig?: Record<string, any>;
    }
  ) {
    let response = await this.http.patch(`/v1/reverse-etl-models/${modelId}`, data);
    return response.data?.data?.reverseEtlModel;
  }

  async deleteReverseEtlModel(modelId: string) {
    await this.http.delete(`/v1/reverse-etl-models/${modelId}`);
  }

  // ─── Deletion and Suppression ──────────────────────────────────

  async createRegulation(data: {
    regulationType: string;
    subjectType: string;
    subjectIds: string[];
  }) {
    let response = await this.http.post('/v1/regulations', data);
    return response.data?.data;
  }

  async listRegulations(params: { status?: string; count?: number; cursor?: string } = {}) {
    let query: Record<string, any> = {};
    if (params.status) query.status = params.status;
    if (params.count) query['pagination.count'] = params.count;
    if (params.cursor) query['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/regulations', { params: query });
    return response.data?.data;
  }

  async createSourceRegulation(
    sourceId: string,
    data: {
      regulationType: string;
      subjectType: string;
      subjectIds: string[];
    }
  ) {
    let response = await this.http.post(`/v1/sources/${sourceId}/regulations`, data);
    return response.data?.data;
  }

  // ─── Usage ─────────────────────────────────────────────────────

  async getApiCallUsage(
    params: { period: string; count?: number; cursor?: string } = { period: 'current' }
  ) {
    let query: Record<string, any> = { period: params.period };
    if (params.count) query['pagination.count'] = params.count;
    if (params.cursor) query['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/usage/api-calls', { params: query });
    return response.data?.data;
  }

  async getMtuUsage(
    params: { period: string; count?: number; cursor?: string } = { period: 'current' }
  ) {
    let query: Record<string, any> = { period: params.period };
    if (params.count) query['pagination.count'] = params.count;
    if (params.cursor) query['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/usage/mtu', { params: query });
    return response.data?.data;
  }

  // ─── Audit Trail ───────────────────────────────────────────────

  async listAuditEvents(
    params: {
      startTime?: string;
      endTime?: string;
      resourceId?: string;
      resourceType?: string;
      count?: number;
      cursor?: string;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.startTime) query.startTime = params.startTime;
    if (params.endTime) query.endTime = params.endTime;
    if (params.resourceId) query.resourceId = params.resourceId;
    if (params.resourceType) query.resourceType = params.resourceType;
    if (params.count) query['pagination.count'] = params.count;
    if (params.cursor) query['pagination.cursor'] = params.cursor;

    let response = await this.http.get('/v1/audit-events', { params: query });
    return response.data?.data;
  }
}
