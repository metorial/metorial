import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { modelingRequestSchema, paginationSchema } from './schemas';

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

export interface ListProductsParams {
  page?: number;
  perPage?: number;
  keywords?: string;
  sku?: string;
  batchId?: string;
  title?: string;
  tags?: string[];
  sourceLabels?: string[];
  contentLabels?: string[];
  toolKinds?: string[];
  sortBy?: string[];
}

export interface ListModelingRequestsParams {
  page?: number;
  perPage?: number;
  workspaceId?: number;
  keywords?: string;
  sku?: string;
  batchUid?: string;
  title?: string;
  status?: string;
  sortBy?: string[];
}

let productSchema = z.object({
  id: z.string(),
  type: z.string(),
  attributes: z.object({
    sku: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    batch_id: z.string().nullable().optional(),
    batchID: z.string().nullable().optional(),
    batchId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    dimensions: z.string().nullable().optional(),
    external_url: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional()
  })
});

let productResponseSchema = z.object({ data: productSchema });
let productListSchema = z.object({
  data: z.array(productSchema),
  meta: paginationSchema.optional()
});
let modelingRequestResponseSchema = z.object({ data: modelingRequestSchema });
let modelingRequestListSchema = z.object({
  data: z.array(modelingRequestSchema),
  meta: paginationSchema.optional()
});
let workspaceListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      attributes: z.object({ name: z.string() })
    })
  )
});

export type ProductResource = z.infer<typeof productSchema>;

export let formatProduct = (product: ProductResource) => ({
  productId: product.id,
  sku: product.attributes.sku ?? null,
  title: product.attributes.title ?? null,
  batchId:
    product.attributes.batch_id ??
    product.attributes.batchID ??
    product.attributes.batchId ??
    null,
  description: product.attributes.description ?? null,
  tags: product.attributes.tags ?? null,
  dimensions: product.attributes.dimensions ?? null,
  externalUrl: product.attributes.external_url ?? product.attributes.externalUrl ?? null
});

let parseResponse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(
      'Modelry returned an unexpected response. Try the request again.',
      {
        reason: 'invalid_modelry_response'
      }
    );
  }
  return result.data;
};

let productPayload = (params: CreateProductParams) => ({
  product: pickDefined({
    sku: params.sku,
    title: params.title,
    batch_id: params.batchId,
    description: params.description,
    tags: params.tags,
    dimensions: params.dimensions,
    external_url: params.externalUrl
  })
});

let validateSort = (sortBy?: string[]) => {
  if (sortBy && (sortBy.length !== 2 || !['asc', 'desc'].includes(sortBy[1] ?? ''))) {
    throw createApiServiceError('sortBy must contain an attribute followed by asc or desc.');
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Modelry',
          reason: 'modelry_api_error'
        })
    });
  }

  async createProduct(params: CreateProductParams) {
    let response = await this.axios.post('/products', productPayload(params));
    return parseResponse(productResponseSchema, response.data);
  }

  async updateProduct(productId: string, params: CreateProductParams) {
    if (Object.values(params).every(value => value === undefined)) {
      throw createApiServiceError('Provide at least one product field to update.');
    }
    let response = await this.axios.put(
      `/products/${encodeURIComponent(productId)}`,
      productPayload(params)
    );
    return parseResponse(productResponseSchema, response.data);
  }

  async getProduct(productId: string) {
    let response = await this.axios.get(`/products/${encodeURIComponent(productId)}`);
    return parseResponse(productResponseSchema, response.data);
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${encodeURIComponent(productId)}`);
  }

  async listProducts(params: ListProductsParams = {}) {
    validateSort(params.sortBy);
    let response = await this.axios.get('/products', {
      validateStatus: status => (status >= 200 && status < 300) || status === 404,
      params: pickDefined({
        page: params.page,
        per_page: params.perPage,
        keywords: params.keywords,
        sku: params.sku,
        batch_id: params.batchId,
        title: params.title,
        'tags[]': params.tags,
        'source_label[]': params.sourceLabels,
        'content_labels[]': params.contentLabels,
        'tool_kinds[]': params.toolKinds,
        'sort_by[]': params.sortBy
      }),
      paramsSerializer: { indexes: false }
    });
    return parseResponse(productListSchema, response.data);
  }

  async listWorkspaces() {
    let response = await this.axios.get('/workspaces');
    return parseResponse(workspaceListSchema, response.data);
  }

  async listModelingRequests(params: ListModelingRequestsParams = {}) {
    validateSort(params.sortBy);
    let response = await this.axios.get('/modeling-requests', {
      params: pickDefined({
        page: params.page,
        per_page: params.perPage,
        workspace_id: params.workspaceId,
        keywords: params.keywords,
        sku: params.sku,
        batch_uid: params.batchUid,
        title: params.title,
        status: params.status,
        'sort_by[]': params.sortBy
      }),
      paramsSerializer: { indexes: false }
    });
    return parseResponse(modelingRequestListSchema, response.data);
  }

  async getModelingRequest(idOrSku: string) {
    let response = await this.axios.get(`/modeling-requests/${encodeURIComponent(idOrSku)}`);
    return parseResponse(modelingRequestResponseSchema, response.data);
  }
}
