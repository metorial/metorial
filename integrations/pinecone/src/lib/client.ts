import { createAxios } from 'slates';

let controlPlaneAxios = createAxios({
  baseURL: 'https://api.pinecone.io'
});

export interface IndexSpec {
  serverless?: {
    cloud: string;
    region: string;
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
}

export interface IndexModel {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  spec: any;
  status: { ready: boolean; state: string };
  vector_type?: string;
  deletion_protection?: string;
  tags?: Record<string, string>;
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

export interface AssistantModel {
  name: string;
  instructions?: string;
  metadata?: Record<string, any>;
  status: string;
  host?: string;
  created_at?: string;
  updated_at?: string;
}

export class PineconeControlPlaneClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'Api-Key': this.token,
      'Content-Type': 'application/json',
      'X-Pinecone-Api-Version': '2025-04'
    };
  }

  async listIndexes(): Promise<{ indexes: IndexModel[] }> {
    let response = await controlPlaneAxios.get('/indexes', {
      headers: this.headers()
    });
    return response.data;
  }

  async describeIndex(indexName: string): Promise<IndexModel> {
    let response = await controlPlaneAxios.get(`/indexes/${indexName}`, {
      headers: this.headers()
    });
    return response.data;
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
    let response = await controlPlaneAxios.post('/indexes', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async configureIndex(
    indexName: string,
    params: {
      spec?: { pod?: { pod_type?: string; replicas?: number } };
      deletion_protection?: string;
      tags?: Record<string, string>;
    }
  ): Promise<IndexModel> {
    let response = await controlPlaneAxios.patch(`/indexes/${indexName}`, params, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteIndex(indexName: string): Promise<void> {
    await controlPlaneAxios.delete(`/indexes/${indexName}`, {
      headers: this.headers()
    });
  }

  async listCollections(): Promise<{ collections: any[] }> {
    let response = await controlPlaneAxios.get('/collections', {
      headers: this.headers()
    });
    return response.data;
  }

  async createCollection(params: { name: string; source: string }): Promise<any> {
    let response = await controlPlaneAxios.post('/collections', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await controlPlaneAxios.delete(`/collections/${collectionName}`, {
      headers: this.headers()
    });
  }

  // Inference endpoints
  async generateEmbeddings(params: {
    model: string;
    inputs: { text: string }[];
    parameters?: { input_type?: string; truncate?: string };
  }): Promise<{
    model: string;
    vector_type: string;
    data: { values: number[]; vector_type?: string }[];
    usage: { total_tokens: number };
  }> {
    let response = await controlPlaneAxios.post('/embed', params, {
      headers: this.headers()
    });
    return response.data;
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
    let response = await controlPlaneAxios.post('/rerank', params, {
      headers: this.headers()
    });
    return response.data;
  }

  // Assistant endpoints
  async listAssistants(): Promise<{ assistants: AssistantModel[] }> {
    let response = await controlPlaneAxios.get('/assistant/assistants', {
      headers: this.headers()
    });
    return response.data;
  }

  async createAssistant(params: {
    name: string;
    instructions?: string;
    metadata?: Record<string, any>;
    region?: string;
  }): Promise<AssistantModel> {
    let response = await controlPlaneAxios.post('/assistant/assistants', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async describeAssistant(assistantName: string): Promise<AssistantModel> {
    let response = await controlPlaneAxios.get(`/assistant/assistants/${assistantName}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteAssistant(assistantName: string): Promise<void> {
    await controlPlaneAxios.delete(`/assistant/assistants/${assistantName}`, {
      headers: this.headers()
    });
  }
}

export class PineconeDataPlaneClient {
  private token: string;
  private indexHost: string;

  constructor(config: { token: string; indexHost: string }) {
    this.token = config.token;
    this.indexHost = config.indexHost.replace(/\/$/, '');
  }

  private headers() {
    return {
      'Api-Key': this.token,
      'Content-Type': 'application/json',
      'X-Pinecone-Api-Version': '2025-04'
    };
  }

  private baseUrl(): string {
    let host = this.indexHost;
    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      host = `https://${host}`;
    }
    return host;
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
    let axios = createAxios({ baseURL: this.baseUrl() });
    let response = await axios.post('/vectors/upsert', params, {
      headers: this.headers()
    });
    return response.data;
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
    usage?: { readUnits: number };
  }> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let response = await axios.post('/query', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async fetchVectors(params: { ids: string[]; namespace?: string }): Promise<{
    vectors: Record<string, VectorRecord>;
    namespace: string;
    usage?: { readUnits: number };
  }> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let queryParams = new URLSearchParams();
    for (let id of params.ids) {
      queryParams.append('ids', id);
    }
    if (params.namespace) {
      queryParams.append('namespace', params.namespace);
    }
    let response = await axios.get(`/vectors/fetch?${queryParams.toString()}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateVector(params: {
    id: string;
    values?: number[];
    sparseValues?: { indices: number[]; values: number[] };
    setMetadata?: Record<string, any>;
    namespace?: string;
  }): Promise<void> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    await axios.post('/vectors/update', params, {
      headers: this.headers()
    });
  }

  async deleteVectors(params: {
    ids?: string[];
    deleteAll?: boolean;
    namespace?: string;
    filter?: Record<string, any>;
  }): Promise<void> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    await axios.post('/vectors/delete', params, {
      headers: this.headers()
    });
  }

  async listVectorIds(params: {
    namespace?: string;
    prefix?: string;
    limit?: number;
    paginationToken?: string;
  }): Promise<{
    vectors: { id: string }[];
    pagination?: { next: string };
    namespace: string;
    usage?: { readUnits: number };
  }> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let queryParams = new URLSearchParams();
    if (params.namespace) queryParams.append('namespace', params.namespace);
    if (params.prefix) queryParams.append('prefix', params.prefix);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.paginationToken) queryParams.append('paginationToken', params.paginationToken);
    let response = await axios.get(`/vectors/list?${queryParams.toString()}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async describeIndexStats(params?: { filter?: Record<string, any> }): Promise<{
    namespaces: Record<string, { vectorCount: number }>;
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
    metric?: string;
    vectorType?: string;
  }> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let response = await axios.post('/describe_index_stats', params || {}, {
      headers: this.headers()
    });
    return response.data;
  }
}

export class PineconeAssistantClient {
  private token: string;
  private assistantHost: string;

  constructor(config: { token: string; assistantHost: string }) {
    this.token = config.token;
    this.assistantHost = config.assistantHost.replace(/\/$/, '');
  }

  private headers() {
    return {
      'Api-Key': this.token,
      'Content-Type': 'application/json'
    };
  }

  private baseUrl(): string {
    let host = this.assistantHost;
    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      host = `https://${host}`;
    }
    return host;
  }

  async chat(
    assistantName: string,
    params: {
      messages: { role: string; content: string }[];
      model?: string;
      filter?: Record<string, any>;
      json_response?: boolean;
      include_highlights?: boolean;
    }
  ): Promise<{
    chatId: string;
    finish_reason: string;
    message: { role: string; content: string };
    model: string;
    citations?: any[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let response = await axios.post(
      `/chat/${assistantName}`,
      {
        ...params,
        stream: false
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getContext(
    assistantName: string,
    params: {
      messages: { role: string; content: string }[];
      filter?: Record<string, any>;
    }
  ): Promise<any> {
    let axios = createAxios({ baseURL: this.baseUrl() });
    let response = await axios.post(`/context/${assistantName}`, params, {
      headers: this.headers()
    });
    return response.data;
  }
}
