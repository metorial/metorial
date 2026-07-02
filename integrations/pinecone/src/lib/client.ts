import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { pineconeApiError } from './errors';

export let PINECONE_API_VERSION = '2026-04';

let controlPlaneAxios = createAxios({
  baseURL: 'https://api.pinecone.io'
});

let cleanUndefined = <T extends Record<string, any>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

let encodePath = (value: string) => encodeURIComponent(value);

export interface IndexSpec {
  serverless?: {
    cloud: string;
    region: string;
    read_capacity?: {
      mode: 'OnDemand' | 'Dedicated';
      dedicated?: {
        node_type: string;
        scaling?: 'Manual';
        manual?: {
          shards?: number;
          replicas?: number;
        };
      };
    };
  };
  pod?: {
    environment: string;
    pod_type: string;
    pods?: number;
    replicas?: number;
    shards?: number;
    metadata_config?: { indexed?: string[] };
    source_collection?: string;
  };
  byoc?: {
    environment: string;
  };
}

export interface IntegratedEmbedConfig {
  model: string;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
  field_map: Record<string, string>;
  read_parameters?: {
    input_type?: 'query' | 'passage';
    truncate?: 'END' | 'NONE';
  };
  write_parameters?: {
    input_type?: 'query' | 'passage';
    truncate?: 'END' | 'NONE';
  };
}

export interface IndexModel {
  id?: string;
  name: string;
  dimension?: number;
  metric: string;
  host: string;
  private_host?: string;
  spec: any;
  status: { ready: boolean; state: string };
  vector_type?: string;
  deletion_protection?: string;
  tags?: Record<string, string> | null;
  embed?: {
    model?: string;
    field_map?: Record<string, string>;
    dimension?: number;
    metric?: string;
    read_parameters?: Record<string, any>;
    write_parameters?: Record<string, any>;
    vector_type?: string;
  };
}

export interface VectorRecord {
  id: string;
  values?: number[];
  sparseValues?: { indices: number[]; values: number[] };
  metadata?: Record<string, any>;
}

export interface QueryMatch {
  id: string;
  score: number;
  values?: number[];
  sparseValues?: { indices: number[]; values: number[] };
  metadata?: Record<string, any>;
}

export interface NamespaceModel {
  name: string;
  record_count?: string | number;
  schema?: Record<string, any>;
}

export interface AssistantModel {
  name: string;
  instructions?: string;
  metadata?: Record<string, any>;
  status: string;
  host?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssistantFileModel {
  id: string;
  name?: string;
  size?: number;
  metadata?: Record<string, any> | null;
  status?: string;
  created_on?: string;
  updated_on?: string;
  signed_url?: string;
  multimodal?: boolean;
}

export interface AssistantOperationModel {
  id: string;
  operation_type?: string;
  file_id?: string;
  status?: string;
  created_on?: string;
  percent_complete?: number;
  error_message?: string;
}

export class PineconeControlPlaneClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers(contentType = 'application/json') {
    return {
      Accept: 'application/json',
      'Api-Key': this.token,
      'Content-Type': contentType,
      'X-Pinecone-Api-Version': PINECONE_API_VERSION
    };
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw pineconeApiError(error, operation);
    }
  }

  async listIndexes(): Promise<{ indexes: IndexModel[] }> {
    return await this.request('list indexes', () =>
      controlPlaneAxios.get('/indexes', {
        headers: this.headers()
      })
    );
  }

  async describeIndex(indexName: string): Promise<IndexModel> {
    return await this.request('describe index', () =>
      controlPlaneAxios.get(`/indexes/${encodePath(indexName)}`, {
        headers: this.headers()
      })
    );
  }

  async createIndex(params: {
    name: string;
    dimension?: number;
    metric?: string;
    spec: IndexSpec;
    vector_type?: string;
    deletion_protection?: string;
    tags?: Record<string, string>;
  }): Promise<IndexModel> {
    return await this.request('create index', () =>
      controlPlaneAxios.post('/indexes', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async createIntegratedIndex(params: {
    name: string;
    cloud: 'aws' | 'gcp' | 'azure';
    region: string;
    embed: IntegratedEmbedConfig;
    deletion_protection?: string;
    tags?: Record<string, string>;
    schema?: Record<string, any>;
    read_capacity?: Record<string, any>;
  }): Promise<IndexModel> {
    return await this.request('create integrated index', () =>
      controlPlaneAxios.post('/indexes/create-for-model', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async configureIndex(
    indexName: string,
    params: {
      spec?: { pod?: { pod_type?: string; replicas?: number } };
      deletion_protection?: string;
      tags?: Record<string, string>;
      embed?: {
        field_map?: Record<string, string>;
        read_parameters?: Record<string, any>;
        write_parameters?: Record<string, any>;
      };
    }
  ): Promise<IndexModel> {
    return await this.request('configure index', () =>
      controlPlaneAxios.patch(`/indexes/${encodePath(indexName)}`, cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.request('delete index', () =>
      controlPlaneAxios.delete(`/indexes/${encodePath(indexName)}`, {
        headers: this.headers()
      })
    );
  }

  async listCollections(): Promise<{ collections: any[] }> {
    return await this.request('list collections', () =>
      controlPlaneAxios.get('/collections', {
        headers: this.headers()
      })
    );
  }

  async createCollection(params: { name: string; source: string }): Promise<any> {
    return await this.request('create collection', () =>
      controlPlaneAxios.post('/collections', params, {
        headers: this.headers()
      })
    );
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.request('delete collection', () =>
      controlPlaneAxios.delete(`/collections/${encodePath(collectionName)}`, {
        headers: this.headers()
      })
    );
  }

  async generateEmbeddings(params: {
    model: string;
    inputs: { text: string }[];
    parameters?: { input_type?: string; truncate?: string };
  }): Promise<{
    model: string;
    vector_type: string;
    data: { values?: number[]; sparse_values?: { indices: number[]; values: number[] } }[];
    usage: { total_tokens: number };
  }> {
    return await this.request('generate embeddings', () =>
      controlPlaneAxios.post('/embed', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async rerank(params: {
    model: string;
    query: string;
    documents: Record<string, any>[];
    top_n?: number;
    return_documents?: boolean;
    rank_fields?: string[];
    parameters?: Record<string, any>;
  }): Promise<{
    model: string;
    data: { index: number; score: number; document?: Record<string, any> }[];
    usage: { rerank_units: number };
  }> {
    return await this.request('rerank', () =>
      controlPlaneAxios.post('/rerank', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async listAssistants(): Promise<{ assistants: AssistantModel[] }> {
    return await this.request('list assistants', () =>
      controlPlaneAxios.get('/assistant/assistants', {
        headers: this.headers()
      })
    );
  }

  async createAssistant(params: {
    name: string;
    instructions?: string;
    metadata?: Record<string, any>;
    region?: string;
  }): Promise<AssistantModel> {
    return await this.request('create assistant', () =>
      controlPlaneAxios.post('/assistant/assistants', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async describeAssistant(assistantName: string): Promise<AssistantModel> {
    return await this.request('describe assistant', () =>
      controlPlaneAxios.get(`/assistant/assistants/${encodePath(assistantName)}`, {
        headers: this.headers()
      })
    );
  }

  async updateAssistant(
    assistantName: string,
    params: { instructions?: string; metadata?: Record<string, any> }
  ): Promise<AssistantModel> {
    return await this.request('update assistant', () =>
      controlPlaneAxios.patch(
        `/assistant/assistants/${encodePath(assistantName)}`,
        cleanUndefined(params),
        {
          headers: this.headers()
        }
      )
    );
  }

  async deleteAssistant(assistantName: string): Promise<void> {
    await this.request('delete assistant', () =>
      controlPlaneAxios.delete(`/assistant/assistants/${encodePath(assistantName)}`, {
        headers: this.headers()
      })
    );
  }
}

export class PineconeDataPlaneClient {
  private token: string;
  private indexHost: string;

  constructor(config: { token: string; indexHost: string }) {
    this.token = config.token;
    this.indexHost = config.indexHost.replace(/\/$/, '');
  }

  private headers(contentType = 'application/json') {
    return {
      Accept: 'application/json',
      'Api-Key': this.token,
      'Content-Type': contentType,
      'X-Pinecone-Api-Version': PINECONE_API_VERSION
    };
  }

  private baseUrl(): string {
    let host = this.indexHost;
    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      host = `https://${host}`;
    }
    return host;
  }

  private axios() {
    return createAxios({ baseURL: this.baseUrl() });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw pineconeApiError(error, operation);
    }
  }

  async createNamespace(params: {
    name: string;
    schema?: Record<string, any>;
  }): Promise<NamespaceModel> {
    return await this.request('create namespace', () =>
      this.axios().post('/namespaces', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async listNamespaces(params?: {
    limit?: number;
    paginationToken?: string;
  }): Promise<{ namespaces: NamespaceModel[]; pagination?: { next?: string } }> {
    let queryParams = new URLSearchParams();
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.paginationToken) queryParams.append('paginationToken', params.paginationToken);
    let path = queryParams.size > 0 ? `/namespaces?${queryParams.toString()}` : '/namespaces';

    return await this.request('list namespaces', () =>
      this.axios().get(path, {
        headers: this.headers()
      })
    );
  }

  async describeNamespace(namespace: string): Promise<NamespaceModel> {
    return await this.request('describe namespace', () =>
      this.axios().get(`/namespaces/${encodePath(namespace)}`, {
        headers: this.headers()
      })
    );
  }

  async deleteNamespace(namespace: string): Promise<void> {
    await this.request('delete namespace', () =>
      this.axios().delete(`/namespaces/${encodePath(namespace)}`, {
        headers: this.headers()
      })
    );
  }

  async upsertVectors(params: {
    vectors: {
      id: string;
      values?: number[];
      sparseValues?: { indices: number[]; values: number[] };
      metadata?: Record<string, any>;
    }[];
    namespace?: string;
  }): Promise<{ upsertedCount: number }> {
    return await this.request('upsert records', () =>
      this.axios().post('/vectors/upsert', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async upsertTextRecords(params: {
    namespace: string;
    records: Array<{ id: string; fields: Record<string, any> }>;
  }): Promise<void> {
    let body = params.records
      .map(record =>
        JSON.stringify({
          _id: record.id,
          ...record.fields
        })
      )
      .join('\n');

    await this.request('upsert text records', () =>
      this.axios().post(`/records/namespaces/${encodePath(params.namespace)}/upsert`, body, {
        headers: this.headers('application/x-ndjson')
      })
    );
  }

  async queryVectors(params: {
    vector?: number[];
    id?: string;
    topK: number;
    namespace?: string;
    filter?: Record<string, any>;
    includeValues?: boolean;
    includeMetadata?: boolean;
    sparseVector?: { indices: number[]; values: number[] };
  }): Promise<{
    matches: QueryMatch[];
    namespace: string;
    usage?: { readUnits?: number; read_units?: number };
  }> {
    return await this.request('search with vector', () =>
      this.axios().post('/query', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async searchRecords(params: {
    namespace: string;
    query: {
      inputs?: Record<string, any>;
      vector?: { values: number[]; sparse_values?: { indices: number[]; values: number[] } };
      id?: string;
      top_k: number;
      filter?: Record<string, any>;
    };
    fields?: string[];
    rerank?: {
      query?: string;
      model: string;
      top_n?: number;
      rank_fields?: string[];
    };
  }): Promise<{
    result?: { hits?: Record<string, any>[] };
    usage?: Record<string, any>;
  }> {
    return await this.request('search records', () =>
      this.axios().post(
        `/records/namespaces/${encodePath(params.namespace)}/search`,
        cleanUndefined({
          query: cleanUndefined(params.query),
          fields: params.fields,
          rerank: params.rerank ? cleanUndefined(params.rerank) : undefined
        }),
        {
          headers: this.headers()
        }
      )
    );
  }

  async fetchVectors(params: { ids: string[]; namespace?: string }): Promise<{
    vectors: Record<string, VectorRecord>;
    namespace: string;
    usage?: { readUnits?: number; read_units?: number };
  }> {
    let queryParams = new URLSearchParams();
    for (let id of params.ids) {
      queryParams.append('ids', id);
    }
    if (params.namespace) {
      queryParams.append('namespace', params.namespace);
    }

    return await this.request('fetch records', () =>
      this.axios().get(`/vectors/fetch?${queryParams.toString()}`, {
        headers: this.headers()
      })
    );
  }

  async fetchVectorsByMetadata(params: {
    namespace?: string;
    filter: Record<string, any>;
    limit?: number;
    paginationToken?: string;
  }): Promise<{
    vectors: Record<string, VectorRecord>;
    namespace: string;
    usage?: { readUnits?: number; read_units?: number };
    pagination?: { next?: string };
  }> {
    return await this.request('fetch records by metadata', () =>
      this.axios().post('/vectors/fetch_by_metadata', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async updateVector(params: {
    id: string;
    values?: number[];
    sparseValues?: { indices: number[]; values: number[] };
    setMetadata?: Record<string, any>;
    namespace?: string;
  }): Promise<void> {
    await this.request('update record', () =>
      this.axios().post('/vectors/update', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async deleteVectors(params: {
    ids?: string[];
    deleteAll?: boolean;
    namespace?: string;
    filter?: Record<string, any>;
  }): Promise<void> {
    await this.request('delete records', () =>
      this.axios().post('/vectors/delete', cleanUndefined(params), {
        headers: this.headers()
      })
    );
  }

  async listVectorIds(params: {
    namespace?: string;
    prefix?: string;
    limit?: number;
    paginationToken?: string;
  }): Promise<{
    vectors: { id: string }[];
    pagination?: { next?: string };
    namespace: string;
    usage?: { readUnits?: number; read_units?: number };
  }> {
    let queryParams = new URLSearchParams();
    if (params.namespace) queryParams.append('namespace', params.namespace);
    if (params.prefix) queryParams.append('prefix', params.prefix);
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.paginationToken) queryParams.append('paginationToken', params.paginationToken);
    let path =
      queryParams.size > 0 ? `/vectors/list?${queryParams.toString()}` : '/vectors/list';

    return await this.request('list record IDs', () =>
      this.axios().get(path, {
        headers: this.headers()
      })
    );
  }

  async describeIndexStats(params?: { filter?: Record<string, any> }): Promise<{
    namespaces: Record<string, { vectorCount: number }>;
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
    metric?: string;
    vectorType?: string;
  }> {
    return await this.request('get index stats', () =>
      this.axios().post('/describe_index_stats', params || {}, {
        headers: this.headers()
      })
    );
  }
}

export class PineconeAssistantClient {
  private token: string;
  private assistantHost: string;

  constructor(config: { token: string; assistantHost: string }) {
    this.token = config.token;
    this.assistantHost = config.assistantHost.replace(/\/$/, '');
  }

  private headers(contentType?: string) {
    return {
      Accept: 'application/json',
      'Api-Key': this.token,
      ...(contentType ? { 'Content-Type': contentType } : {}),
      'X-Pinecone-Api-Version': PINECONE_API_VERSION
    };
  }

  private baseUrl(): string {
    let host = this.assistantHost;
    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      host = `https://${host}`;
    }
    return host;
  }

  private axios() {
    return createAxios({ baseURL: this.baseUrl() });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw pineconeApiError(error, operation);
    }
  }

  async chat(
    assistantName: string,
    params: {
      messages: { role: string; content: string }[];
      model?: string;
      temperature?: number;
      filter?: Record<string, any>;
      json_response?: boolean;
      include_highlights?: boolean;
      context_options?: Record<string, any>;
    }
  ): Promise<{
    id?: string;
    finish_reason: string;
    message: { role: string; content: string };
    model: string;
    citations?: any[];
    context_snippet_count?: number;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    return await this.request('chat with assistant', () =>
      this.axios().post(
        `/assistant/chat/${encodePath(assistantName)}`,
        {
          ...cleanUndefined(params),
          stream: false
        },
        {
          headers: this.headers('application/json')
        }
      )
    );
  }

  async getContext(
    assistantName: string,
    params: {
      query?: string;
      messages?: { role: string; content: string }[];
      filter?: Record<string, any>;
      top_k?: number;
      snippet_size?: number;
      multimodal?: boolean;
      include_binary_content?: boolean;
    }
  ): Promise<{
    id?: string;
    snippets?: any[];
    usage?: Record<string, any>;
  }> {
    return await this.request('retrieve assistant context', () =>
      this.axios().post(
        `/assistant/chat/${encodePath(assistantName)}/context`,
        cleanUndefined(params),
        {
          headers: this.headers('application/json')
        }
      )
    );
  }

  async listFiles(
    assistantName: string,
    params?: {
      filter?: Record<string, any>;
      limit?: number;
      paginationToken?: string;
    }
  ): Promise<{ files: AssistantFileModel[]; pagination?: { next?: string } }> {
    let queryParams = new URLSearchParams();
    if (params?.filter) queryParams.append('filter', JSON.stringify(params.filter));
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.paginationToken) queryParams.append('paginationToken', params.paginationToken);
    let suffix = queryParams.size > 0 ? `?${queryParams.toString()}` : '';

    return await this.request('list assistant files', () =>
      this.axios().get(`/assistant/files/${encodePath(assistantName)}${suffix}`, {
        headers: this.headers()
      })
    );
  }

  async uploadFile(
    assistantName: string,
    params: {
      fileName: string;
      fileBase64: string;
      mimeType?: string;
      metadata?: Record<string, any>;
      multimodal?: boolean;
      fileId?: string;
    }
  ): Promise<AssistantOperationModel> {
    let fileBytes = Buffer.from(params.fileBase64, 'base64');
    let formData = new FormData();
    formData.append(
      'file',
      new Blob([fileBytes], { type: params.mimeType ?? 'application/octet-stream' }),
      params.fileName
    );
    if (params.metadata) {
      formData.append('metadata', JSON.stringify(params.metadata));
    }

    let queryParams = new URLSearchParams();
    if (params.multimodal !== undefined) {
      queryParams.append('multimodal', String(params.multimodal));
    }
    let suffix = queryParams.size > 0 ? `?${queryParams.toString()}` : '';
    let path = params.fileId
      ? `/assistant/files/${encodePath(assistantName)}/${encodePath(params.fileId)}${suffix}`
      : `/assistant/files/${encodePath(assistantName)}${suffix}`;

    if (params.fileId) {
      return await this.request('upsert assistant file', () =>
        this.axios().put(path, formData, {
          headers: this.headers()
        })
      );
    }

    return await this.request('upload assistant file', () =>
      this.axios().post(path, formData, {
        headers: this.headers()
      })
    );
  }

  async describeFile(
    assistantName: string,
    fileId: string,
    params?: { includeUrl?: boolean }
  ): Promise<AssistantFileModel> {
    let queryParams = new URLSearchParams();
    if (params?.includeUrl !== undefined) {
      queryParams.append('include_url', String(params.includeUrl));
    }
    let suffix = queryParams.size > 0 ? `?${queryParams.toString()}` : '';

    return await this.request('describe assistant file', () =>
      this.axios().get(
        `/assistant/files/${encodePath(assistantName)}/${encodePath(fileId)}${suffix}`,
        {
          headers: this.headers()
        }
      )
    );
  }

  async deleteFile(assistantName: string, fileId: string): Promise<AssistantOperationModel> {
    return await this.request('delete assistant file', () =>
      this.axios().delete(
        `/assistant/files/${encodePath(assistantName)}/${encodePath(fileId)}`,
        {
          headers: this.headers()
        }
      )
    );
  }

  async listOperations(
    assistantName: string,
    params?: { status?: string; operationType?: string }
  ): Promise<{ operations: AssistantOperationModel[] }> {
    let queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.operationType) queryParams.append('operation_type', params.operationType);
    let suffix = queryParams.size > 0 ? `?${queryParams.toString()}` : '';

    return await this.request('list assistant operations', () =>
      this.axios().get(`/assistant/operations/${encodePath(assistantName)}${suffix}`, {
        headers: this.headers()
      })
    );
  }

  async describeOperation(
    assistantName: string,
    operationId: string
  ): Promise<AssistantOperationModel> {
    return await this.request('describe assistant operation', () =>
      this.axios().get(
        `/assistant/operations/${encodePath(assistantName)}/${encodePath(operationId)}`,
        {
          headers: this.headers()
        }
      )
    );
  }
}
