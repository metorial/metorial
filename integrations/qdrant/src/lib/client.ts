import { createAxios } from 'slates';

export class QdrantClient {
  private http;

  constructor(config: { clusterEndpoint: string; token: string }) {
    let baseURL = config.clusterEndpoint.replace(/\/+$/, '');
    this.http = createAxios({
      baseURL,
      headers: {
        'api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ========== Collections ==========

  async listCollections(): Promise<{ collections: Array<{ name: string }> }> {
    let response = await this.http.get('/collections');
    return response.data.result;
  }

  async getCollection(collectionName: string): Promise<any> {
    let response = await this.http.get(`/collections/${encodeURIComponent(collectionName)}`);
    return response.data.result;
  }

  async collectionExists(collectionName: string): Promise<boolean> {
    let response = await this.http.get(
      `/collections/${encodeURIComponent(collectionName)}/exists`
    );
    return response.data.result.exists;
  }

  async createCollection(
    collectionName: string,
    params: {
      vectors: any;
      shardNumber?: number;
      replicationFactor?: number;
      onDiskPayload?: boolean;
      hnswConfig?: any;
      quantizationConfig?: any;
      sparseVectors?: any;
    }
  ): Promise<any> {
    let body: any = { vectors: params.vectors };
    if (params.shardNumber !== undefined) body.shard_number = params.shardNumber;
    if (params.replicationFactor !== undefined)
      body.replication_factor = params.replicationFactor;
    if (params.onDiskPayload !== undefined) body.on_disk_payload = params.onDiskPayload;
    if (params.hnswConfig !== undefined) body.hnsw_config = params.hnswConfig;
    if (params.quantizationConfig !== undefined)
      body.quantization_config = params.quantizationConfig;
    if (params.sparseVectors !== undefined) body.sparse_vectors = params.sparseVectors;
    let response = await this.http.put(
      `/collections/${encodeURIComponent(collectionName)}`,
      body
    );
    return response.data;
  }

  async updateCollection(collectionName: string, params: any): Promise<any> {
    let response = await this.http.patch(
      `/collections/${encodeURIComponent(collectionName)}`,
      params
    );
    return response.data;
  }

  async deleteCollection(collectionName: string): Promise<any> {
    let response = await this.http.delete(
      `/collections/${encodeURIComponent(collectionName)}`
    );
    return response.data;
  }

  // ========== Aliases ==========

  async listAliases(): Promise<any> {
    let response = await this.http.get('/aliases');
    return response.data.result;
  }

  async listCollectionAliases(collectionName: string): Promise<any> {
    let response = await this.http.get(
      `/collections/${encodeURIComponent(collectionName)}/aliases`
    );
    return response.data.result;
  }

  async updateAliases(actions: any[]): Promise<any> {
    let response = await this.http.post('/collections/aliases', { actions });
    return response.data;
  }

  // ========== Points ==========

  async upsertPoints(collectionName: string, points: any[], wait?: boolean): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;
    let response = await this.http.put(
      `/collections/${encodeURIComponent(collectionName)}/points`,
      { points },
      { params }
    );
    return response.data;
  }

  async getPoints(
    collectionName: string,
    ids: Array<string | number>,
    withPayload?: boolean,
    withVector?: boolean
  ): Promise<any[]> {
    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points`,
      {
        ids,
        with_payload: withPayload ?? true,
        with_vector: withVector ?? false
      }
    );
    return response.data.result;
  }

  async deletePoints(
    collectionName: string,
    selector: { points?: Array<string | number>; filter?: any },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;
    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/delete`,
      selector,
      { params }
    );
    return response.data;
  }

  async scrollPoints(
    collectionName: string,
    options: {
      offset?: string | number | null;
      limit?: number;
      filter?: any;
      withPayload?: boolean;
      withVector?: boolean;
      orderBy?: any;
    }
  ): Promise<{ points: any[]; nextPageOffset: any }> {
    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/scroll`,
      {
        offset: options.offset ?? null,
        limit: options.limit ?? 10,
        filter: options.filter,
        with_payload: options.withPayload ?? true,
        with_vector: options.withVector ?? false,
        order_by: options.orderBy
      }
    );
    return {
      points: response.data.result.points,
      nextPageOffset: response.data.result.next_page_offset
    };
  }

  async countPoints(collectionName: string, filter?: any, exact?: boolean): Promise<number> {
    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/count`,
      {
        filter: filter ?? null,
        exact: exact ?? true
      }
    );
    return response.data.result.count;
  }

  // ========== Search ==========

  async queryPoints(
    collectionName: string,
    options: {
      query?: any;
      filter?: any;
      limit?: number;
      offset?: number;
      withPayload?: boolean;
      withVector?: boolean;
      scoreThreshold?: number;
      using?: string;
      params?: any;
      prefetch?: any;
    }
  ): Promise<any[]> {
    let body: any = {};
    if (options.query !== undefined) body.query = options.query;
    if (options.filter !== undefined) body.filter = options.filter;
    if (options.limit !== undefined) body.limit = options.limit;
    if (options.offset !== undefined) body.offset = options.offset;
    if (options.withPayload !== undefined) body.with_payload = options.withPayload;
    if (options.withVector !== undefined) body.with_vector = options.withVector;
    if (options.scoreThreshold !== undefined) body.score_threshold = options.scoreThreshold;
    if (options.using !== undefined) body.using = options.using;
    if (options.params !== undefined) body.params = options.params;
    if (options.prefetch !== undefined) body.prefetch = options.prefetch;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/query`,
      body
    );
    return response.data.result.points;
  }

  async recommendPoints(
    collectionName: string,
    options: {
      positive: Array<string | number | number[]>;
      negative?: Array<string | number | number[]>;
      strategy?: string;
      filter?: any;
      limit?: number;
      offset?: number;
      withPayload?: boolean;
      withVector?: boolean;
      scoreThreshold?: number;
      using?: string;
      params?: any;
    }
  ): Promise<any[]> {
    let body: any = {
      positive: options.positive
    };
    if (options.negative !== undefined) body.negative = options.negative;
    if (options.strategy !== undefined) body.strategy = options.strategy;
    if (options.filter !== undefined) body.filter = options.filter;
    if (options.limit !== undefined) body.limit = options.limit;
    if (options.offset !== undefined) body.offset = options.offset;
    if (options.withPayload !== undefined) body.with_payload = options.withPayload;
    if (options.withVector !== undefined) body.with_vector = options.withVector;
    if (options.scoreThreshold !== undefined) body.score_threshold = options.scoreThreshold;
    if (options.using !== undefined) body.using = options.using;
    if (options.params !== undefined) body.params = options.params;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/recommend`,
      body
    );
    return response.data.result;
  }

  async discoverPoints(
    collectionName: string,
    options: {
      target?: any;
      context: Array<{ positive: any; negative: any }>;
      filter?: any;
      limit?: number;
      offset?: number;
      withPayload?: boolean;
      withVector?: boolean;
      using?: string;
      params?: any;
    }
  ): Promise<any[]> {
    let body: any = {
      context: options.context
    };
    if (options.target !== undefined) body.target = options.target;
    if (options.filter !== undefined) body.filter = options.filter;
    if (options.limit !== undefined) body.limit = options.limit;
    if (options.offset !== undefined) body.offset = options.offset;
    if (options.withPayload !== undefined) body.with_payload = options.withPayload;
    if (options.withVector !== undefined) body.with_vector = options.withVector;
    if (options.using !== undefined) body.using = options.using;
    if (options.params !== undefined) body.params = options.params;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/discover`,
      body
    );
    return response.data.result;
  }

  // ========== Payload ==========

  async setPayload(
    collectionName: string,
    options: {
      payload: any;
      points?: Array<string | number>;
      filter?: any;
      key?: string;
    },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;
    let body: any = { payload: options.payload };
    if (options.points !== undefined) body.points = options.points;
    if (options.filter !== undefined) body.filter = options.filter;
    if (options.key !== undefined) body.key = options.key;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/payload`,
      body,
      { params }
    );
    return response.data;
  }

  async overwritePayload(
    collectionName: string,
    options: {
      payload: any;
      points?: Array<string | number>;
      filter?: any;
    },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;
    let body: any = { payload: options.payload };
    if (options.points !== undefined) body.points = options.points;
    if (options.filter !== undefined) body.filter = options.filter;

    let response = await this.http.put(
      `/collections/${encodeURIComponent(collectionName)}/points/payload`,
      body,
      { params }
    );
    return response.data;
  }

  async deletePayloadKeys(
    collectionName: string,
    options: {
      keys: string[];
      points?: Array<string | number>;
      filter?: any;
    },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/payload/delete`,
      options,
      { params }
    );
    return response.data;
  }

  async clearPayload(
    collectionName: string,
    options: {
      points?: Array<string | number>;
      filter?: any;
    },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/points/payload/clear`,
      options,
      { params }
    );
    return response.data;
  }

  // ========== Payload Index ==========

  async createPayloadIndex(
    collectionName: string,
    fieldName: string,
    fieldSchema: any,
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.put(
      `/collections/${encodeURIComponent(collectionName)}/index`,
      { field_name: fieldName, field_schema: fieldSchema },
      { params }
    );
    return response.data;
  }

  async deletePayloadIndex(
    collectionName: string,
    fieldName: string,
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.delete(
      `/collections/${encodeURIComponent(collectionName)}/index/${encodeURIComponent(fieldName)}`,
      { params }
    );
    return response.data;
  }

  // ========== Snapshots ==========

  async createSnapshot(collectionName: string, wait?: boolean): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.post(
      `/collections/${encodeURIComponent(collectionName)}/snapshots`,
      undefined,
      { params }
    );
    return response.data.result;
  }

  async listSnapshots(collectionName: string): Promise<any[]> {
    let response = await this.http.get(
      `/collections/${encodeURIComponent(collectionName)}/snapshots`
    );
    return response.data.result;
  }

  async deleteSnapshot(
    collectionName: string,
    snapshotName: string,
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.delete(
      `/collections/${encodeURIComponent(collectionName)}/snapshots/${encodeURIComponent(snapshotName)}`,
      { params }
    );
    return response.data;
  }

  async recoverSnapshot(
    collectionName: string,
    options: {
      location: string;
      priority?: string;
      checksum?: string;
      apiKey?: string;
    },
    wait?: boolean
  ): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let body: any = { location: options.location };
    if (options.priority !== undefined) body.priority = options.priority;
    if (options.checksum !== undefined) body.checksum = options.checksum;
    if (options.apiKey !== undefined) body.api_key = options.apiKey;

    let response = await this.http.put(
      `/collections/${encodeURIComponent(collectionName)}/snapshots/recover`,
      body,
      { params }
    );
    return response.data;
  }

  // ========== Full Storage Snapshots ==========

  async createFullSnapshot(wait?: boolean): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.post('/snapshots', undefined, { params });
    return response.data.result;
  }

  async listFullSnapshots(): Promise<any[]> {
    let response = await this.http.get('/snapshots');
    return response.data.result;
  }

  async deleteFullSnapshot(snapshotName: string, wait?: boolean): Promise<any> {
    let params: any = {};
    if (wait !== undefined) params.wait = wait;

    let response = await this.http.delete(`/snapshots/${encodeURIComponent(snapshotName)}`, {
      params
    });
    return response.data;
  }
}
