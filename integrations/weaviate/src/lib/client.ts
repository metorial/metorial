import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class WeaviateClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { instanceUrl: string; token?: string }) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }
    let url: URL;
    try {
      url = new URL(config.instanceUrl);
    } catch {
      throw createApiServiceError('Enter a valid Weaviate instance URL.');
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw createApiServiceError(
        'Use an HTTP or HTTPS instance URL without credentials, query parameters, or a fragment.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: config.instanceUrl.replace(/\/+$/, ''),
      headers,
      timeout: 60000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Weaviate',
          reason: 'weaviate_api_error'
        })
    });
  }

  // ── Meta / Cluster ──

  async getMeta(): Promise<any> {
    let res = await this.axios.get('/v1/meta');
    return res.data;
  }

  async getCurrentUser(): Promise<any> {
    let res = await this.axios.get('/v1/users/own-info');
    return res.data;
  }

  async getNodes(params?: { output?: string }): Promise<any> {
    let res = await this.axios.get('/v1/nodes', { params });
    return res.data;
  }

  async getLiveness(): Promise<boolean> {
    let res = await this.axios.get('/v1/.well-known/live', {
      validateStatus: status => status === 200 || status === 503
    });
    return res.status === 200;
  }

  async getReadiness(): Promise<boolean> {
    let res = await this.axios.get('/v1/.well-known/ready', {
      validateStatus: status => status === 200 || status === 503
    });
    return res.status === 200;
  }

  // ── Collections (Schema) ──

  async listCollections(): Promise<any> {
    let res = await this.axios.get('/v1/schema');
    return res.data;
  }

  async getCollection(collectionName: string): Promise<any> {
    let res = await this.axios.get(`/v1/schema/${encodeURIComponent(collectionName)}`);
    return res.data;
  }

  async createCollection(schema: any): Promise<any> {
    let res = await this.axios.post('/v1/schema', schema);
    return res.data;
  }

  async updateCollection(collectionName: string, updates: any): Promise<any> {
    let res = await this.axios.put(
      `/v1/schema/${encodeURIComponent(collectionName)}`,
      updates
    );
    return res.data;
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.axios.delete(`/v1/schema/${encodeURIComponent(collectionName)}`);
  }

  async addProperty(collectionName: string, property: any): Promise<any> {
    let res = await this.axios.post(
      `/v1/schema/${encodeURIComponent(collectionName)}/properties`,
      property
    );
    return res.data;
  }

  // ── Tenants ──

  async listTenants(collectionName: string): Promise<any[]> {
    let res = await this.axios.get(`/v1/schema/${encodeURIComponent(collectionName)}/tenants`);
    return res.data as any[];
  }

  async addTenants(collectionName: string, tenants: any[]): Promise<any> {
    let res = await this.axios.post(
      `/v1/schema/${encodeURIComponent(collectionName)}/tenants`,
      tenants
    );
    return res.data;
  }

  async updateTenants(collectionName: string, tenants: any[]): Promise<any> {
    let res = await this.axios.put(
      `/v1/schema/${encodeURIComponent(collectionName)}/tenants`,
      tenants
    );
    return res.data;
  }

  async deleteTenants(collectionName: string, tenantNames: string[]): Promise<void> {
    await this.axios.delete(`/v1/schema/${encodeURIComponent(collectionName)}/tenants`, {
      data: tenantNames
    });
  }

  // ── Objects ──

  async listObjects(params?: {
    class?: string;
    limit?: number;
    offset?: number;
    after?: string;
    include?: string;
    sort?: string;
    order?: string;
    tenant?: string;
  }): Promise<any> {
    let res = await this.axios.get('/v1/objects', { params });
    return res.data;
  }

  async getObject(
    collectionName: string,
    objectId: string,
    params?: {
      include?: string;
      tenant?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}`,
      { params }
    );
    return res.data;
  }

  async createObject(object: {
    class: string;
    properties: Record<string, any>;
    id?: string;
    vector?: number[];
    vectors?: Record<string, unknown>;
    tenant?: string;
  }): Promise<any> {
    let res = await this.axios.post('/v1/objects', object);
    return res.data;
  }

  async updateObject(
    collectionName: string,
    objectId: string,
    object: {
      class: string;
      id?: string;
      properties: Record<string, any>;
      vector?: number[];
      vectors?: Record<string, unknown>;
      tenant?: string;
    }
  ): Promise<any> {
    let res = await this.axios.put(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}`,
      object
    );
    return res.data;
  }

  async patchObject(
    collectionName: string,
    objectId: string,
    patch: {
      class: string;
      properties: Record<string, any>;
      vector?: number[];
      vectors?: Record<string, unknown>;
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.patch(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}`,
      patch
    );
  }

  async deleteObject(
    collectionName: string,
    objectId: string,
    params?: {
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.delete(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}`,
      { params }
    );
  }

  // ── Batch Operations ──

  async batchCreateObjects(objects: any[]): Promise<any[]> {
    let res = await this.axios.post('/v1/batch/objects', { objects });
    return res.data as any[];
  }

  async batchDeleteObjects(
    match: {
      class: string;
      where: any;
    },
    params?: {
      dryRun?: boolean;
      output?: string;
      tenant?: string;
    }
  ): Promise<any> {
    let res = await this.axios.delete('/v1/batch/objects', {
      data: { match, dryRun: params?.dryRun, output: params?.output },
      params: { tenant: params?.tenant }
    });
    return res.data;
  }

  // ── Cross-References ──

  async addReference(
    collectionName: string,
    objectId: string,
    refProperty: string,
    ref: {
      beacon: string;
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.post(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}/references/${encodeURIComponent(refProperty)}`,
      { beacon: ref.beacon },
      { params: { tenant: ref.tenant } }
    );
  }

  async deleteReference(
    collectionName: string,
    objectId: string,
    refProperty: string,
    ref: {
      beacon: string;
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.delete(
      `/v1/objects/${encodeURIComponent(collectionName)}/${encodeURIComponent(objectId)}/references/${encodeURIComponent(refProperty)}`,
      { data: { beacon: ref.beacon }, params: { tenant: ref.tenant } }
    );
  }

  // ── GraphQL ──

  async graphql(query: string, variables?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { query };
    if (variables) {
      body.variables = variables;
    }
    let res = await this.axios.post('/v1/graphql', body);
    if (res.data.errors?.length) {
      throw createApiServiceError(
        `Weaviate GraphQL query failed: ${res.data.errors.map((error: { message?: string }) => error.message || 'Unknown query error').join('; ')}`,
        { reason: 'weaviate_graphql_error' }
      );
    }
    return res.data;
  }

  async search(
    collectionName: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<any> {
    let res = await this.axios.post(
      `/v1/search/${encodeURIComponent(collectionName)}/${method}`,
      body
    );
    return res.data;
  }

  // ── Backups ──

  async createBackup(
    backend: string,
    body: {
      id: string;
      include?: string[];
      exclude?: string[];
    }
  ): Promise<any> {
    let res = await this.axios.post(`/v1/backups/${encodeURIComponent(backend)}`, body);
    return res.data;
  }

  async getBackupStatus(backend: string, backupId: string): Promise<any> {
    let res = await this.axios.get(
      `/v1/backups/${encodeURIComponent(backend)}/${encodeURIComponent(backupId)}`
    );
    return res.data;
  }

  async restoreBackup(
    backend: string,
    backupId: string,
    body?: {
      include?: string[];
      exclude?: string[];
    }
  ): Promise<any> {
    let res = await this.axios.post(
      `/v1/backups/${encodeURIComponent(backend)}/${encodeURIComponent(backupId)}/restore`,
      body || {}
    );
    return res.data;
  }

  async getRestoreStatus(backend: string, backupId: string): Promise<any> {
    let res = await this.axios.get(
      `/v1/backups/${encodeURIComponent(backend)}/${encodeURIComponent(backupId)}/restore`
    );
    return res.data;
  }
}
