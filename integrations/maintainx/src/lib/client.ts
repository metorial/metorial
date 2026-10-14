import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  AssetStatus,
  DowntimeType,
  PaginationParams,
  WorkOrderPriority,
  WorkOrderStatus
} from './types';

export interface ClientConfig {
  token: string;
  organizationId?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`
    };

    if (config.organizationId) {
      if (!/^\d+$/.test(config.organizationId)) {
        throw createApiServiceError(
          'Organization ID must be a single numeric ID from list_organizations.'
        );
      }
      headers['x-organization-id'] = config.organizationId;
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.getmaintainx.com/v1',
      headers,
      timeout: 30000,
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'MaintainX',
          reason: 'maintainx_api_error'
        })
    });
  }

  static fromContext(ctx: {
    auth: { token: string; organizationId?: string; requiresOrganizationId?: boolean };
    input: { organizationId?: string };
    config: unknown;
  }) {
    let legacyOrganizationId =
      ctx.config && typeof ctx.config === 'object' && 'organizationId' in ctx.config
        ? ctx.config.organizationId
        : undefined;
    let organizationId =
      ctx.input.organizationId ??
      ctx.auth.organizationId ??
      (typeof legacyOrganizationId === 'string' ? legacyOrganizationId : undefined);
    if (ctx.auth.requiresOrganizationId && !organizationId) {
      throw createApiServiceError(
        'This key can access multiple organizations. Call list_organizations and provide organizationId.'
      );
    }
    return new Client({ token: ctx.auth.token, organizationId });
  }

  async listOrganizations(params?: PaginationParams) {
    let response = await this.axios.get('/organizations', { params });
    return response.data;
  }

  // --- Work Orders ---

  async listWorkOrders(
    params?: PaginationParams & {
      status?: WorkOrderStatus;
      priority?: WorkOrderPriority;
      type?: string;
      expand?: string[];
      createdAtGte?: string;
      createdAtLte?: string;
      updatedAtGte?: string;
      updatedAtLte?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};

    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.status) queryParams.statuses = [params.status];
    if (params?.priority) queryParams.priorities = [params.priority];
    if (params?.createdAtGte) queryParams['createdAt[gte]'] = params.createdAtGte;
    if (params?.createdAtLte) queryParams['createdAt[lte]'] = params.createdAtLte;
    if (params?.updatedAtGte) queryParams['updatedAt[gte]'] = params.updatedAtGte;
    if (params?.updatedAtLte) queryParams['updatedAt[lte]'] = params.updatedAtLte;

    if (params?.expand) queryParams.expand = params.expand;

    let response = await this.axios.get('/workorders', { params: queryParams });
    if (params?.type) {
      response.data.workOrders = (response.data.workOrders ?? []).filter(
        (workOrder: { type?: string | null }) => workOrder.type === params.type
      );
    }
    return response.data;
  }

  async getWorkOrder(workOrderId: number, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand) params.expand = expand;
    let response = await this.axios.get(`/workorders/${workOrderId}`, { params });
    return response.data;
  }

  async createWorkOrder(data: {
    title: string;
    description?: string;
    priority?: WorkOrderPriority;
    status?: WorkOrderStatus;
    assignees?: number[];
    assetId?: number;
    locationId?: number;
    categories?: string[];
    dueDate?: string;
    workOrderType?: string;
    procedureId?: number;
    teamId?: number;
    extraFields?: Record<string, string>;
  }) {
    let { status, assignees, teamId, workOrderType, procedureId, ...fields } = data;
    let response = await this.axios.post(
      '/workorders',
      pickDefined({
        ...fields,
        type: workOrderType,
        procedureTemplateId: procedureId,
        assignees:
          assignees !== undefined || teamId !== undefined
            ? [
                ...(assignees ?? []).map(id => ({ type: 'USER', id })),
                ...(teamId === undefined ? [] : [{ type: 'TEAM', id: teamId }])
              ]
            : undefined
      })
    );
    if (status && status !== 'OPEN') {
      await this.applyPostWriteWorkOrderStatus(response.data.id, status, 'created');
    }
    return response.data;
  }

  async updateWorkOrder(
    workOrderId: number,
    data: {
      title?: string;
      description?: string;
      priority?: WorkOrderPriority;
      status?: WorkOrderStatus;
      assignees?: number[];
      assetId?: number;
      locationId?: number;
      categories?: string[];
      dueDate?: string;
      teamId?: number;
      extraFields?: Record<string, string>;
    }
  ) {
    let { status, assignees, teamId, ...fields } = data;
    let payload = pickDefined({
      ...fields,
      assignees:
        assignees !== undefined || teamId !== undefined
          ? [
              ...(assignees ?? []).map(id => ({ type: 'USER', id })),
              ...(teamId === undefined ? [] : [{ type: 'TEAM', id: teamId }])
            ]
          : undefined
    });
    if (!Object.keys(payload).length && status === undefined) {
      throw createApiServiceError('Provide at least one work order field to update.');
    }
    if (Object.keys(payload).length) {
      let response = await this.axios.patch(`/workorders/${workOrderId}`, payload);
      if (status === undefined) return response.data;
      return this.applyPostWriteWorkOrderStatus(workOrderId, status, 'updated');
    }
    let response = await this.axios.patch(`/workorders/${workOrderId}/status`, { status });
    return response.data;
  }

  private async applyPostWriteWorkOrderStatus(
    workOrderId: number,
    status: WorkOrderStatus,
    completedWrite: 'created' | 'updated'
  ) {
    try {
      let response = await this.axios.patch(`/workorders/${workOrderId}/status`, { status });
      return response.data;
    } catch (error) {
      let serviceError = buildApiServiceError(error, {
        providerLabel: 'MaintainX',
        reason: 'maintainx_api_error',
        operation: `set status for work order #${workOrderId}`
      });
      let remediation =
        `Retrieve work order #${workOrderId} with get_work_order, then retry only ` +
        `update_work_order with workOrderId ${workOrderId} and status if needed. ` +
        (completedWrite === 'created'
          ? 'Do not repeat create_work_order: the work order already exists.'
          : 'Do not repeat the completed field update: those fields are already saved.');
      serviceError.data.message =
        `Work order #${workOrderId} was ${completedWrite}, but its status update to ${status} ` +
        `failed or could not be confirmed. ${remediation} Upstream: ${serviceError.data.message}`;
      serviceError.message = serviceError.data.message;
      serviceError.data.hint = `${remediation}${serviceError.data.hint ? ` ${serviceError.data.hint}` : ''}`;
      serviceError.data.workOrderId = workOrderId;
      serviceError.data.completedWrite = completedWrite;
      serviceError.data.requestedStatus = status;
      serviceError.data.statusUpdateConfirmed = false;
      throw serviceError;
    }
  }

  // --- Work Requests ---

  async listWorkRequests(
    params?: PaginationParams & {
      title?: string;
      status?: string;
      priority?: WorkOrderPriority;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    if (params?.title !== undefined) queryParams.title = params.title;
    if (params?.status !== undefined) queryParams.statuses = [params.status];
    if (params?.priority !== undefined) queryParams.priorities = [params.priority];
    let response = await this.axios.get('/workrequests', { params: queryParams });
    return response.data;
  }

  async getWorkRequest(workRequestId: number) {
    let response = await this.axios.get(`/workrequests/${workRequestId}`);
    return response.data;
  }

  async createWorkRequest(data: {
    title: string;
    description?: string;
    priority?: WorkOrderPriority;
    assetId?: number;
    locationId?: number;
  }) {
    let response = await this.axios.post('/workrequests', data);
    return response.data;
  }

  // --- Assets ---

  async listAssets(
    params?: PaginationParams & {
      locationId?: number;
      expand?: string[];
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.locationId) queryParams.locationId = params.locationId;

    if (params?.expand) queryParams.expand = params.expand;

    let response = await this.axios.get('/assets', { params: queryParams });
    return response.data;
  }

  async getAsset(assetId: number) {
    let response = await this.axios.get(`/assets/${assetId}`);
    return response.data;
  }

  async createAsset(data: {
    name: string;
    description?: string;
    barcode?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    locationId?: number;
    parentId?: number;
    teamIds?: number[];
    assetTypes?: string[];
    vendorIds?: number[];
    extraFields?: Record<string, string>;
  }) {
    let response = await this.axios.post(
      '/assets',
      pickDefined({
        ...data,
        manufacturer:
          data.manufacturer === undefined ? undefined : { name: data.manufacturer },
        model: data.model === undefined ? undefined : { name: data.model }
      })
    );
    return response.data;
  }

  async updateAsset(
    assetId: number,
    data: {
      name?: string;
      description?: string;
      barcode?: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      locationId?: number;
      parentId?: number;
      teamIds?: number[];
      assetTypes?: string[];
      vendorIds?: number[];
      extraFields?: Record<string, string>;
    }
  ) {
    let response = await this.axios.patch(
      `/assets/${assetId}`,
      pickDefined({
        ...data,
        manufacturer:
          data.manufacturer === undefined ? undefined : { name: data.manufacturer },
        model: data.model === undefined ? undefined : { name: data.model }
      })
    );
    return response.data;
  }

  async deleteAsset(assetId: number) {
    await this.axios.delete(`/assets/${assetId}`);
  }

  async createAssetStatus(
    assetId: number,
    data: {
      status: AssetStatus;
      customStatusId?: number;
      downtimeType?: DowntimeType;
      startedAt?: string;
      endedAt?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.post(`/assets/${assetId}/status`, data);
    return response.data;
  }

  // --- Locations ---

  async listLocations(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/locations', { params: queryParams });
    return response.data;
  }

  async getLocation(locationId: number) {
    let response = await this.axios.get(`/locations/${locationId}`);
    return response.data;
  }

  async createLocation(data: {
    name: string;
    address?: string;
    longitude?: number;
    latitude?: number;
    parentId?: number;
  }) {
    if (data.longitude !== undefined || data.latitude !== undefined) {
      throw createApiServiceError(
        'The MaintainX location API does not accept longitude or latitude. Use address instead.'
      );
    }
    let { longitude: _longitude, latitude: _latitude, ...payload } = data;
    let response = await this.axios.post('/locations', payload);
    return response.data;
  }

  // --- Parts ---

  async listParts(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/parts', { params: queryParams });
    return response.data;
  }

  async getPart(partId: number) {
    let response = await this.axios.get(`/parts/${partId}`);
    return response.data;
  }

  async createPart(data: {
    name: string;
    description?: string;
    unitCost?: number;
    quantity?: number;
    minimumQuantity?: number;
    area?: string;
    barcode?: string;
    nonStock?: boolean;
  }) {
    if (data.nonStock !== undefined) {
      throw createApiServiceError(
        'The MaintainX parts API does not accept nonStock. Omit that field.'
      );
    }
    let { quantity, nonStock: _nonStock, ...fields } = data;
    let response = await this.axios.post(
      '/parts',
      pickDefined({ ...fields, availableQuantity: quantity })
    );
    return response.data;
  }

  async updatePart(
    partId: number,
    data: {
      name?: string;
      description?: string;
      unitCost?: number;
      quantity?: number;
      minimumQuantity?: number;
      area?: string;
      barcode?: string;
      nonStock?: boolean;
    }
  ) {
    if (data.nonStock !== undefined) {
      throw createApiServiceError(
        'The MaintainX parts API does not accept nonStock. Omit that field.'
      );
    }
    let { quantity, nonStock: _nonStock, ...fields } = data;
    let response = await this.axios.patch(
      `/parts/${partId}`,
      pickDefined({ ...fields, availableQuantity: quantity })
    );
    return response.data;
  }

  // --- Meters ---

  async listMeters(params?: PaginationParams & { assetId?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.assetId !== undefined) queryParams.assets = [params.assetId];
    queryParams.expand = ['asset'];

    let response = await this.axios.get('/meters', { params: queryParams });
    return response.data;
  }

  async getMeter(meterId: number) {
    let response = await this.axios.get(`/meters/${meterId}`);
    return response.data;
  }

  async createMeterReading(
    meterId: number,
    data: {
      value: number;
      date?: string;
    }
  ) {
    let response = await this.axios.post(
      `/meters/${meterId}/readings`,
      pickDefined({ readingValue: data.value, readingDate: data.date })
    );
    return response.data;
  }

  // --- Purchase Orders ---

  async listPurchaseOrders(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/purchaseorders', { params: queryParams });
    return response.data;
  }

  async getPurchaseOrder(purchaseOrderId: number) {
    let response = await this.axios.get(`/purchaseorders/${purchaseOrderId}`);
    return response.data;
  }

  async createPurchaseOrder(data: {
    title?: string;
    vendorId?: number;
    description?: string;
    items?: Array<{
      partId?: number;
      name?: string;
      quantity?: number;
      unitCost?: number;
    }>;
  }) {
    if (data.items === undefined || data.items.some(item => item.quantity === undefined)) {
      throw createApiServiceError(
        'Provide items and a quantity for every purchase order item.'
      );
    }
    let response = await this.axios.post(
      '/purchaseorders',
      pickDefined({
        title: data.title,
        note: data.description,
        vendorId: data.vendorId ?? null,
        items: data.items.map(({ quantity, ...item }) => ({
          ...item,
          quantityOrdered: quantity
        }))
      })
    );
    return response.data;
  }

  // --- Vendors ---

  async listVendors(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/vendors', { params: queryParams });
    return response.data;
  }

  async getVendor(vendorId: number) {
    let response = await this.axios.get(`/vendors/${vendorId}`);
    return response.data;
  }

  async createVendor(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  }) {
    if (data.address !== undefined || data.website !== undefined) {
      throw createApiServiceError(
        'The MaintainX vendor API does not accept address or website. Omit those fields.'
      );
    }
    let response = await this.axios.post(
      '/vendors',
      pickDefined({
        name: data.name,
        emails: data.email === undefined ? undefined : [data.email],
        phoneNumbers: data.phone === undefined ? undefined : [data.phone]
      })
    );
    return response.data;
  }

  // --- Users ---

  async listUsers(params?: PaginationParams & { onlyAssignable?: boolean }) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.onlyAssignable !== undefined)
      queryParams.onlyAssignable = params.onlyAssignable;
    queryParams.expand = ['role'];

    let response = await this.axios.get('/users', { params: queryParams });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // --- Teams ---

  async listTeams(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/teams', { params: queryParams });
    return response.data;
  }

  async getTeam(teamId: number) {
    let response = await this.axios.get(`/teams/${teamId}`);
    return response.data;
  }

  // --- Categories ---

  async listCategories(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.axios.get('/categories', { params: queryParams });
    return response.data;
  }

  // --- Conversations / Messages ---

  async listConversations(
    params?: PaginationParams & { type?: 'GROUP' | 'DM' | 'TEAM'; onlyNamed?: boolean }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

    if (params?.type !== undefined) queryParams.type = params.type;
    if (params?.onlyNamed !== undefined) queryParams.onlyNamed = params.onlyNamed;
    let response = await this.axios.get('/conversations', { params: queryParams });
    return response.data;
  }

  async createMessage(
    conversationId: number,
    data: {
      content: string;
    }
  ) {
    let response = await this.axios.post(`/conversations/${conversationId}/messages`, data);
    return response.data;
  }
}
