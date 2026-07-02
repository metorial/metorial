import crypto from 'crypto';
import { createAxios } from 'slates';

let BASE_URL = 'https://app.useitem.io';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listObjects(
    objectType: string,
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters?: Record<string, string | number | boolean>;
    }
  ): Promise<{ data: any[]; pagination?: any }> {
    let query: Record<string, any> = {};
    let filters = params?.filters ?? {};

    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    if (params?.sortOrder) query.sort_order = params.sortOrder;

    let derivedSearch =
      params?.search ??
      (filters.name !== undefined ? String(filters.name) : undefined) ??
      (filters.email !== undefined ? String(filters.email) : undefined);

    if (derivedSearch) query.search = derivedSearch;

    for (let [fieldName, fieldValue] of Object.entries(filters)) {
      if (fieldName === 'name' || fieldName === 'email') {
        continue;
      }

      query[`filter[${fieldName}]`] = String(fieldValue);
    }

    let response = await this.axios.get(`/api/objects/${objectType}`, { params: query });
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination
    };
  }

  async getObject(
    objectType: string,
    params: {
      objectId?: number;
      email?: string;
      includeAllFields?: boolean;
      includeSummary?: boolean;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};

    if (params.objectId !== undefined) query.id = params.objectId;
    if (params.email) query.email = params.email;
    if (params.includeAllFields !== undefined)
      query.include_all_fields = params.includeAllFields;
    if (params.includeSummary !== undefined) query.include_summary = params.includeSummary;

    let response = await this.axios.get(`/api/objects/${objectType}`, { params: query });
    return response.data.data;
  }

  async createObject(
    objectType: string,
    body: {
      name: string;
      fields?: Record<string, any>;
      profileImageUrl?: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/api/objects/${objectType}`, {
      name: body.name,
      fields: body.fields,
      profile_image_url: body.profileImageUrl
    });
    return response.data.data;
  }

  async updateObject(
    objectType: string,
    body: {
      objectId?: number;
      email?: string;
      name?: string;
      fields?: Record<string, any>;
      profileImageUrl?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/api/objects/${objectType}`, {
      id: body.objectId,
      email: body.email,
      name: body.name,
      fields: body.fields,
      profile_image_url: body.profileImageUrl
    });
    return response.data.data;
  }

  async deleteObject(objectType: string, objectId: number): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/api/objects/${objectType}`, {
      data: {
        id: objectId
      }
    });
    return response.data;
  }

  async batchUpsertObjects(
    objectType: string,
    objects: Array<{
      name: string;
      matchBy?: 'id' | 'email' | 'name';
      matchValue?: string | number;
      fields?: Record<string, any>;
      profileImageUrl?: string;
    }>
  ): Promise<any> {
    let response = await this.axios.post(`/api/objects/${objectType}/batch`, {
      objects: objects.map(object => ({
        name: object.name,
        match_by: object.matchBy,
        match_value: object.matchValue,
        fields: object.fields,
        profile_image_url: object.profileImageUrl
      }))
    });
    return response.data;
  }

  async getSchema(): Promise<any[]> {
    let response = await this.axios.get('/api/meta/schema');
    return response.data.data ?? [];
  }

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/api/meta/users');
    return response.data.data ?? [];
  }

  async listViews(objectType: string): Promise<any[]> {
    let response = await this.axios.get(`/api/objects/${objectType}/views`);
    return response.data.data ?? [];
  }

  async executeView(
    objectType: string,
    viewId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: any[]; view?: any; pagination?: any }> {
    let response = await this.axios.get(`/api/objects/${objectType}/views/${viewId}`, {
      params
    });

    return {
      data: response.data.data ?? [],
      view: response.data.view,
      pagination: response.data.pagination
    };
  }

  async triggerSkillWebhook(
    skillId: string,
    payload: Record<string, any>,
    options?: {
      signPayload?: boolean;
    }
  ): Promise<any> {
    let rawBody = JSON.stringify(payload);
    let headers: Record<string, string> = {};

    if (options?.signPayload) {
      let signature = crypto
        .createHmac('sha256', this.config.token)
        .update(rawBody)
        .digest('hex');
      headers['x-webhook-signature'] = `sha256=${signature}`;
    }

    let response = await this.axios.post(`/api/webhooks/${skillId}`, rawBody, {
      headers
    });

    return response.data;
  }
}
