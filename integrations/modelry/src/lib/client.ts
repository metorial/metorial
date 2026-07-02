import { createAxios } from 'slates';

let BASE_URL = 'https://api.modelry.ai/api/v1';

export interface CreateProductParams {
  sku?: string;
  title?: string;
  batchId?: string;
  description?: string;
  tags?: string[];
  dimensions?: string;
  externalUrl?: string;
}

export interface ProductAttributes {
  sku: string | null;
  title: string | null;
  batch_id: string | null;
  description: string | null;
  tags: string[] | null;
  dimensions: string | null;
  external_url: string | null;
}

export interface ProductResource {
  id: string;
  type: string;
  attributes: ProductAttributes;
}

export interface ProductListResponse {
  data: ProductResource[];
}

export interface ProductSingleResponse {
  data: ProductResource;
}

export interface WorkspaceAttributes {
  name: string;
}

export interface WorkspaceResource {
  id: string;
  type: string;
  attributes: WorkspaceAttributes;
}

export interface WorkspaceListResponse {
  data: WorkspaceResource[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.token
      }
    });
  }

  async createProduct(params: CreateProductParams): Promise<ProductSingleResponse> {
    let response = await this.axios.post('/products', {
      product: {
        sku: params.sku,
        title: params.title,
        batch_id: params.batchId,
        description: params.description,
        tags: params.tags,
        dimensions: params.dimensions,
        external_url: params.externalUrl
      }
    });
    return response.data;
  }

  async getProduct(productId: string): Promise<ProductSingleResponse> {
    let response = await this.axios.get(`/products/${productId}/`);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}/`);
  }

  async listProducts(): Promise<ProductListResponse> {
    let response = await this.axios.get('/products');
    return response.data;
  }

  async listWorkspaces(): Promise<WorkspaceListResponse> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }
}
