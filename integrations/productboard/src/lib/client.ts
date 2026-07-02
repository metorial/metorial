import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  data: T[];
  pageCursor?: string;
  totalResults?: number;
  links?: {
    next?: string;
  };
}

export interface PaginationParams {
  pageCursor?: string;
  pageLimit?: number;
}

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.productboard.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'X-Version': '1',
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Features ----

  async listFeatures(
    params?: PaginationParams & {
      updatedSince?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);
    if (params?.updatedSince) queryParams.updatedSince = params.updatedSince;

    let response = await this.api.get('/features', { params: queryParams });
    return response.data;
  }

  async getFeature(featureId: string): Promise<any> {
    let response = await this.api.get(`/features/${featureId}`);
    return response.data.data;
  }

  async createFeature(data: {
    name: string;
    description?: string;
    status?: { id: string };
    parent?: {
      feature?: { id: string };
      component?: { id: string };
      product?: { id: string };
    };
    timeframe?: { startDate?: string; endDate?: string };
    assignee?: { email: string };
  }): Promise<any> {
    let response = await this.api.post('/features', { data });
    return response.data.data;
  }

  async updateFeature(
    featureId: string,
    data: {
      name?: string;
      description?: string;
      status?: { id: string };
      parent?: {
        feature?: { id: string };
        component?: { id: string };
        product?: { id: string };
      };
      timeframe?: { startDate?: string; endDate?: string };
      assignee?: { email: string };
    }
  ): Promise<any> {
    let response = await this.api.put(`/features/${featureId}`, { data });
    return response.data.data;
  }

  async deleteFeature(featureId: string): Promise<void> {
    await this.api.delete(`/features/${featureId}`);
  }

  async listFeatureStatuses(): Promise<any[]> {
    let response = await this.api.get('/feature-statuses');
    return response.data.data;
  }

  // ---- Notes ----

  async listNotes(
    params?: PaginationParams & {
      updatedSince?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);
    if (params?.updatedSince) queryParams.updatedSince = params.updatedSince;

    let response = await this.api.get('/notes', { params: queryParams });
    return response.data;
  }

  async getNote(noteId: string): Promise<any> {
    let response = await this.api.get(`/notes/${noteId}`);
    return response.data.data;
  }

  async createNote(data: {
    title: string;
    content?: string;
    displayUrl?: string;
    source?: { origin: string; record_id?: string };
    tags?: string[];
    customerEmail?: string;
    companyName?: string;
    user?: { email: string };
  }): Promise<any> {
    let response = await this.api.post('/notes', data);
    return response.data.data;
  }

  async updateNote(
    noteId: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
    }
  ): Promise<any> {
    let response = await this.api.put(`/notes/${noteId}`, data);
    return response.data.data;
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.api.delete(`/notes/${noteId}`);
  }

  // ---- Products ----

  async listProducts(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/products', { params: queryParams });
    return response.data;
  }

  // ---- Components ----

  async listComponents(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/components', { params: queryParams });
    return response.data;
  }

  // ---- Companies ----

  async listCompanies(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/companies', { params: queryParams });
    return response.data;
  }

  async createCompany(data: {
    name: string;
    domain?: string;
    customFields?: Record<string, any>;
  }): Promise<any> {
    let response = await this.api.post('/companies', { data });
    return response.data.data;
  }

  async updateCompany(
    companyId: string,
    data: {
      name?: string;
      domain?: string;
      customFields?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.api.put(`/companies/${companyId}`, { data });
    return response.data.data;
  }

  // ---- Users (feedback users, not workspace members) ----

  async listUsers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/users', { params: queryParams });
    return response.data;
  }

  async createUser(data: {
    email: string;
    name?: string;
    externalId?: string;
    company?: { id: string };
  }): Promise<any> {
    let response = await this.api.post('/users', { data });
    return response.data.data;
  }

  async updateUser(
    userId: string,
    data: {
      name?: string;
      externalId?: string;
      company?: { id: string };
    }
  ): Promise<any> {
    let response = await this.api.put(`/users/${userId}`, { data });
    return response.data.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}`);
  }

  // ---- Custom Fields ----

  async listCustomFields(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/custom-fields', { params: queryParams });
    return response.data;
  }

  async getCustomFieldValues(entityType: string, entityId: string): Promise<any[]> {
    let response = await this.api.get(`/${entityType}/${entityId}/custom-fields`);
    return response.data.data;
  }

  async setCustomFieldValue(
    entityType: string,
    entityId: string,
    customFieldId: string,
    value: any
  ): Promise<any> {
    let response = await this.api.put(
      `/${entityType}/${entityId}/custom-fields/${customFieldId}`,
      { value }
    );
    return response.data;
  }

  async deleteCustomFieldValue(
    entityType: string,
    entityId: string,
    customFieldId: string
  ): Promise<void> {
    await this.api.delete(`/${entityType}/${entityId}/custom-fields/${customFieldId}`);
  }

  // ---- Releases ----

  async listReleases(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/releases', { params: queryParams });
    return response.data;
  }

  async getRelease(releaseId: string): Promise<any> {
    let response = await this.api.get(`/releases/${releaseId}`);
    return response.data.data;
  }

  async createRelease(data: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    releaseGroup?: { id: string };
  }): Promise<any> {
    let response = await this.api.post('/releases', { data });
    return response.data.data;
  }

  async updateRelease(
    releaseId: string,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    let response = await this.api.put(`/releases/${releaseId}`, { data });
    return response.data.data;
  }

  async deleteRelease(releaseId: string): Promise<void> {
    await this.api.delete(`/releases/${releaseId}`);
  }

  // ---- Release Groups ----

  async listReleaseGroups(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/release-groups', { params: queryParams });
    return response.data;
  }

  // ---- Feature-Release Assignments ----

  async assignFeatureToRelease(featureId: string, releaseId: string): Promise<any> {
    let response = await this.api.post('/feature-release-assignments', {
      data: {
        feature: { id: featureId },
        release: { id: releaseId }
      }
    });
    return response.data.data;
  }

  async unassignFeatureFromRelease(featureId: string, releaseId: string): Promise<void> {
    await this.api.delete(`/feature-release-assignments`, {
      data: {
        data: {
          feature: { id: featureId },
          release: { id: releaseId }
        }
      }
    });
  }

  // ---- Objectives ----

  async listObjectives(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/objectives', { params: queryParams });
    return response.data;
  }

  async getObjective(objectiveId: string): Promise<any> {
    let response = await this.api.get(`/objectives/${objectiveId}`);
    return response.data.data;
  }

  async createObjective(data: {
    name: string;
    description?: string;
    state?: string;
    timeframe?: { startDate?: string; endDate?: string };
  }): Promise<any> {
    let response = await this.api.post('/objectives', { data });
    return response.data.data;
  }

  async updateObjective(
    objectiveId: string,
    data: {
      name?: string;
      description?: string;
      state?: string;
      timeframe?: { startDate?: string; endDate?: string };
    }
  ): Promise<any> {
    let response = await this.api.put(`/objectives/${objectiveId}`, { data });
    return response.data.data;
  }

  async deleteObjective(objectiveId: string): Promise<void> {
    await this.api.delete(`/objectives/${objectiveId}`);
  }

  // ---- Key Results ----

  async listKeyResults(
    params?: PaginationParams & {
      objectiveId?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);
    if (params?.objectiveId) queryParams['objective.id'] = params.objectiveId;

    let response = await this.api.get('/key-results', { params: queryParams });
    return response.data;
  }

  async getKeyResult(keyResultId: string): Promise<any> {
    let response = await this.api.get(`/key-results/${keyResultId}`);
    return response.data.data;
  }

  async createKeyResult(data: {
    name: string;
    description?: string;
    objective?: { id: string };
    targetValue?: number;
    currentValue?: number;
  }): Promise<any> {
    let response = await this.api.post('/key-results', { data });
    return response.data.data;
  }

  async updateKeyResult(
    keyResultId: string,
    data: {
      name?: string;
      description?: string;
      targetValue?: number;
      currentValue?: number;
    }
  ): Promise<any> {
    let response = await this.api.put(`/key-results/${keyResultId}`, { data });
    return response.data.data;
  }

  async deleteKeyResult(keyResultId: string): Promise<void> {
    await this.api.delete(`/key-results/${keyResultId}`);
  }

  // ---- Initiatives ----

  async listInitiatives(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/initiatives', { params: queryParams });
    return response.data;
  }

  async getInitiative(initiativeId: string): Promise<any> {
    let response = await this.api.get(`/initiatives/${initiativeId}`);
    return response.data.data;
  }

  async createInitiative(data: {
    name: string;
    description?: string;
    state?: string;
    timeframe?: { startDate?: string; endDate?: string };
  }): Promise<any> {
    let response = await this.api.post('/initiatives', { data });
    return response.data.data;
  }

  async updateInitiative(
    initiativeId: string,
    data: {
      name?: string;
      description?: string;
      state?: string;
      timeframe?: { startDate?: string; endDate?: string };
    }
  ): Promise<any> {
    let response = await this.api.put(`/initiatives/${initiativeId}`, { data });
    return response.data.data;
  }

  async deleteInitiative(initiativeId: string): Promise<void> {
    await this.api.delete(`/initiatives/${initiativeId}`);
  }

  // ---- Webhooks ----

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params?.pageCursor) queryParams.pageCursor = params.pageCursor;
    if (params?.pageLimit) queryParams.pageLimit = String(params.pageLimit);

    let response = await this.api.get('/webhooks', { params: queryParams });
    return response.data;
  }

  async createWebhook(data: { notificationUrl: string; eventType: string }): Promise<any> {
    let response = await this.api.post('/webhooks', { data });
    return response.data.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.api.get(`/webhooks/${webhookId}`);
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.api.delete(`/webhooks/${webhookId}`);
  }
}
