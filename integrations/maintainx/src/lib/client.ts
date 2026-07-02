import { createAxios } from 'slates';
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`
    };

    if (config.organizationId) {
      headers['x-organization-ids'] = config.organizationId;
    }

    this.axios = createAxios({
      baseURL: 'https://api.getmaintainx.com/v1',
      headers
    });
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
    if (params?.status) queryParams.status = params.status;
    if (params?.priority) queryParams.priority = params.priority;
    if (params?.type) queryParams.type = params.type;
    if (params?.createdAtGte) queryParams['createdAt[gte]'] = params.createdAtGte;
    if (params?.createdAtLte) queryParams['createdAt[lte]'] = params.createdAtLte;
    if (params?.updatedAtGte) queryParams['updatedAt[gte]'] = params.updatedAtGte;
    if (params?.updatedAtLte) queryParams['updatedAt[lte]'] = params.updatedAtLte;

    if (params?.expand) {
      for (let exp of params.expand) {
        queryParams.expand = exp;
      }
    }

    let response = await this.axios.get('/workorders', { params: queryParams });
    return response.data;
  }

  async getWorkOrder(workOrderId: number, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand) {
      for (let exp of expand) {
        params.expand = exp;
      }
    }
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
    extraFields?: Record<string, any>[];
  }) {
    let response = await this.axios.post('/workorders', data);
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
      extraFields?: Record<string, any>[];
    }
  ) {
    let response = await this.axios.patch(`/workorders/${workOrderId}`, data);
    return response.data;
  }

  // --- Work Requests ---

  async listWorkRequests(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

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

    if (params?.expand) {
      for (let exp of params.expand) {
        queryParams.expand = exp;
      }
    }

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
    extraFields?: Record<string, any>[];
  }) {
    let response = await this.axios.post('/assets', data);
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
      extraFields?: Record<string, any>[];
    }
  ) {
    let response = await this.axios.patch(`/assets/${assetId}`, data);
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
    let response = await this.axios.post('/locations', data);
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
    let response = await this.axios.post('/parts', data);
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
    let response = await this.axios.patch(`/parts/${partId}`, data);
    return response.data;
  }

  // --- Meters ---

  async listMeters(params?: PaginationParams & { assetId?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.assetId) queryParams.assetId = params.assetId;

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
    let response = await this.axios.post(`/meters/${meterId}/readings`, data);
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
    let response = await this.axios.post('/purchaseorders', data);
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
    let response = await this.axios.post('/vendors', data);
    return response.data;
  }

  // --- Users ---

  async listUsers(params?: PaginationParams & { onlyAssignable?: boolean }) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.onlyAssignable) queryParams.onlyAssignable = params.onlyAssignable;

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

  async listConversations(params?: PaginationParams) {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = params.limit;

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
