import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let NEEDLE_BASE_URL = 'https://needle.app';
let NEEDLE_SEARCH_URL = 'https://search.needle.app';

let collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  search_queries: z.number()
});

let collectionStatsSchema = z.object({
  users: z.number(),
  chunks_count: z.number(),
  characters: z.number(),
  data_stats: z.array(
    z.object({
      status: z.string(),
      files: z.number().optional(),
      bytes: z.number().nullish(),
      count: z.number().optional(),
      size: z.number().nullish()
    })
  )
});

let collectionFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().nullish(),
  content_type: z.string().nullish(),
  type: z.string().optional(),
  status: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish()
});

let addFileResultSchema = collectionFileSchema.extend({
  url: z.string(),
  status: z.string(),
  error: z.string().nullish()
});

let connectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  collection_id: z.string().optional(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  status: z.string().nullish()
});

let connectorFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
  user_id: z.string(),
  connector_id: z.string().nullish(),
  url: z.string(),
  size: z.number().nullish(),
  md5_hash: z.string().nullish()
});

export interface NeedleAddFileEntry {
  name: string;
  url: string;
}

type NeedleApi = ReturnType<typeof createAuthenticatedAxios>;

export class NeedleClient {
  private api: NeedleApi;
  private searchApi: NeedleApi;

  constructor(token: string) {
    if (typeof token !== 'string' || !token.trim()) {
      throw createApiServiceError('A Needle API key is required. Reconnect with an API key.');
    }

    let authHeader = { name: 'x-api-key', value: token };
    this.api = createAuthenticatedAxios({
      baseURL: NEEDLE_BASE_URL,
      authHeader,
      timeout: 120_000
    });
    this.searchApi = createAuthenticatedAxios({
      baseURL: NEEDLE_SEARCH_URL,
      authHeader,
      timeout: 120_000
    });
  }

  private async request<TSchema extends z.ZodType>(
    client: NeedleApi,
    operation: string,
    config: Parameters<NeedleApi['request']>[0],
    schema: TSchema
  ): Promise<z.output<TSchema>> {
    let data = await requestAxiosData<unknown>(
      operation,
      () => client.request(config),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Needle',
          reason: 'needle_api_error',
          nestedKeys: ['error', 'errors'],
          operation
        })
    );

    if (isApiErrorRecord(data) && data.error != null) {
      throw buildApiServiceError(
        { response: { data } },
        {
          providerLabel: 'Needle',
          reason: 'needle_api_error',
          nestedKeys: ['error', 'errors'],
          operation
        }
      );
    }

    let result = isApiErrorRecord(data) && 'result' in data ? data.result : data;
    let parsed = schema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        `Needle returned an unexpected response while attempting to ${operation}.`,
        { reason: 'needle_invalid_response' }
      );
    }
    return parsed.data;
  }

  async listCollections() {
    return this.request(
      this.api,
      'list collections',
      { method: 'GET', url: '/api/v1/collections' },
      z.array(collectionSchema)
    );
  }

  async getCollection(collectionId: string) {
    return this.request(
      this.api,
      'get collection details',
      { method: 'GET', url: `/api/v1/collections/${encodeURIComponent(collectionId)}` },
      collectionSchema
    );
  }

  async getCollectionStats(collectionId: string) {
    let stats = await this.request(
      this.api,
      'get collection statistics',
      { method: 'GET', url: `/api/v1/collections/${encodeURIComponent(collectionId)}/stats` },
      collectionStatsSchema
    );

    return {
      ...stats,
      data_stats: stats.data_stats.map(row => {
        let files = row.files ?? row.count;
        if (files === undefined) {
          throw createApiServiceError(
            'Needle did not return a file count for collection statistics.',
            {
              reason: 'needle_invalid_response'
            }
          );
        }
        return { status: row.status, files, bytes: row.bytes ?? row.size ?? null };
      })
    };
  }

  async createCollection(
    name: string,
    options?: {
      fileIds?: string[];
      model?: 'basilikum-minima' | 'mate-meta' | 'tortellini-maxima';
    }
  ) {
    return this.request(
      this.api,
      'create collection',
      {
        method: 'POST',
        url: '/api/v1/collections',
        data: { name, file_ids: options?.fileIds, model: options?.model }
      },
      collectionSchema.pick({ id: true, name: true, created_at: true })
    );
  }

  async deleteCollection(collectionId: string) {
    await this.request(
      this.api,
      'delete collection',
      { method: 'DELETE', url: `/api/v1/collections/${encodeURIComponent(collectionId)}` },
      z.unknown()
    );
  }

  async listCollectionFiles(
    collectionId: string,
    options?: { offset?: number; limit?: number }
  ) {
    this.validatePagination(options);
    return this.request(
      this.api,
      'list collection files',
      {
        method: 'GET',
        url: `/api/v1/collections/${encodeURIComponent(collectionId)}/files`,
        params: options
      },
      z.array(collectionFileSchema)
    );
  }

  async addFilesToCollection(collectionId: string, files: NeedleAddFileEntry[]) {
    return this.request(
      this.api,
      'add files to collection',
      {
        method: 'POST',
        url: `/api/v1/collections/${encodeURIComponent(collectionId)}/files`,
        data: { files }
      },
      z.array(addFileResultSchema)
    );
  }

  async deleteFilesFromCollection(collectionId: string, fileIds: string[]) {
    await this.request(
      this.api,
      'delete files from collection',
      {
        method: 'DELETE',
        url: `/api/v1/collections/${encodeURIComponent(collectionId)}/files`,
        data: { file_ids: fileIds }
      },
      z.unknown()
    );
  }

  async searchCollection(
    collectionId: string,
    text: string,
    options?: { topK?: number; offset?: number }
  ) {
    return this.request(
      this.searchApi,
      'search collection',
      {
        method: 'POST',
        url: `/api/v1/collections/${encodeURIComponent(collectionId)}/search`,
        data: { text, top_k: options?.topK, offset: options?.offset }
      },
      z.array(z.object({ id: z.string(), content: z.string(), file_id: z.string() }))
    );
  }

  async getUploadUrl(contentTypes: string[]) {
    let params = new URLSearchParams();
    for (let contentType of contentTypes) params.append('content_type', contentType);
    return this.request(
      this.api,
      'get file upload URLs',
      { method: 'GET', url: '/api/v1/files/upload_url', params },
      z.array(z.object({ url: z.string(), upload_url: z.string() }))
    );
  }

  async getDownloadUrl(fileId: string) {
    let result = await this.request(
      this.api,
      'get file download URL',
      { method: 'GET', url: `/api/v1/files/${encodeURIComponent(fileId)}/download_url` },
      z.union([z.string().url(), z.object({ url: z.string().url() })])
    );
    return typeof result === 'string' ? result : result.url;
  }

  async listConnectors() {
    return this.request(
      this.api,
      'list connectors',
      { method: 'GET', url: '/api/v1/connectors' },
      z.array(connectorSchema)
    );
  }

  async listConnectorFiles(
    connectorId: string,
    options?: { offset?: number; limit?: number }
  ) {
    this.validatePagination(options);
    return this.request(
      this.api,
      'list connector files',
      {
        method: 'GET',
        url: `/api/v1/connectors/${encodeURIComponent(connectorId)}/files`,
        params: options
      },
      z.array(connectorFileSchema)
    );
  }

  private validatePagination(options?: { offset?: number; limit?: number }) {
    for (let [name, value] of Object.entries(options ?? {})) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw createApiServiceError(`${name} must be a non-negative whole number.`);
      }
    }
    if (options?.limit !== undefined && options.limit > 500) {
      throw createApiServiceError(
        'limit cannot exceed 500. Use offset to retrieve another page.'
      );
    }
  }
}
