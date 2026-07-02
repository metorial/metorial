import { createAxios } from 'slates';

export interface ListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ListResponse<T> {
  data: T[];
  itemCount: number;
  limit: number;
  offset: number;
}

export interface ItemResponse<T> {
  data: T;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.rentman.net',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Generic list method
  async list<T = Record<string, any>>(
    resource: string,
    params?: ListParams
  ): Promise<ListResponse<T>> {
    let response = await this.axios.get(`/${resource}`, { params });
    return response.data;
  }

  // Generic get by ID
  async get<T = Record<string, any>>(
    resource: string,
    resourceId: number
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.get(`/${resource}/${resourceId}`);
    return response.data;
  }

  // Generic create
  async create<T = Record<string, any>>(
    resource: string,
    data: Record<string, any>
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.post(`/${resource}`, data);
    return response.data;
  }

  // Generic update
  async update<T = Record<string, any>>(
    resource: string,
    resourceId: number,
    data: Record<string, any>
  ): Promise<ItemResponse<T>> {
    let response = await this.axios.put(`/${resource}/${resourceId}`, data);
    return response.data;
  }

  // Generic delete
  async remove(resource: string, resourceId: number): Promise<void> {
    await this.axios.delete(`/${resource}/${resourceId}`);
  }

  // Nested resource list (e.g. /projects/{id}/subprojects)
  async listNested<T = Record<string, any>>(
    parentResource: string,
    parentId: number,
    childResource: string,
    params?: ListParams
  ): Promise<ListResponse<T>> {
    let response = await this.axios.get(`/${parentResource}/${parentId}/${childResource}`, {
      params
    });
    return response.data;
  }

  // Nested resource create (e.g. POST /contacts/{id}/contactpersons)
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
    return response.data;
  }
}
