import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string;
  cursor?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ListResponse<T> {
  data: T[];
  itemCount: number;
  limit: number;
  offset: number;
  next_page_url?: string | null;
}

export interface ItemResponse<T> {
  data: T;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.rentman.net',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Rentman',
          reason: 'rentman_api_error',
          extractResponse: (input, helpers) => {
            let response = helpers.getResponse(input);
            if (
              response?.data === undefined &&
              helpers.isRecord(input) &&
              helpers.isRecord(input.data) &&
              helpers.isRecord(input.data.baggage)
            ) {
              return { ...response, data: input.data.baggage.response };
            }
            return response;
          }
        })
    });
  }

  async list<T = Record<string, any>>(
    resource: string,
    params?: ListParams
  ): Promise<ListResponse<T>> {
    if (params?.cursor) params = { ...params, limit: undefined, offset: undefined };
    let response = await this.axios.get(`/${resource}`, { params });
    return this.listResponse<T>(response.data, params);
  }

  async get<T = Record<string, any>>(
    resource: string,
    resourceId: number | 'current'
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.get(`/${resource}/${resourceId}`);
    return this.itemResponse<T>(response.data);
  }

  async create<T = Record<string, any>>(
    resource: string,
    data: Record<string, any>
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.post(`/${resource}`, data);
    return this.itemResponse<T>(response.data);
  }

  async update<T = Record<string, any>>(
    resource: string,
    resourceId: number,
    data: Record<string, any>
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.put(`/${resource}/${resourceId}`, data);
    return this.itemResponse<T>(response.data);
  }

  async remove(resource: string, resourceId: number): Promise<void> {
    await this.axios.delete(`/${resource}/${resourceId}`);
  }

  async listNested<T = Record<string, any>>(
    parentResource: string,
    parentId: number,
    childResource: string,
    params?: ListParams
  ): Promise<ListResponse<T>> {
    if (params?.cursor) params = { ...params, limit: undefined, offset: undefined };
    let response = await this.axios.get(`/${parentResource}/${parentId}/${childResource}`, {
      params
    });
    return this.listResponse<T>(response.data, params);
  }

  async createNested<T = Record<string, any>>(
    parentResource: string,
    parentId: number,
    childResource: string,
    data: Record<string, any>
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.post(
      `/${parentResource}/${parentId}/${childResource}`,
      data
    );
    return this.itemResponse<T>(response.data);
  }

  private itemResponse<T>(response: ItemResponse<T>): ItemResponse<T> {
    if (!response?.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw createApiServiceError('Rentman returned an invalid item response.', {
        reason: 'rentman_invalid_response'
      });
    }
    return response;
  }

  private listResponse<T>(response: ListResponse<T>, params?: ListParams): ListResponse<T> {
    if (!response || !Array.isArray(response.data)) {
      throw createApiServiceError('Rentman returned an invalid collection response.', {
        reason: 'rentman_invalid_response'
      });
    }
    return {
      ...response,
      offset: response.offset ?? params?.offset ?? 0
    };
  }
}
