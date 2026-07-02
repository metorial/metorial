import { createAxios } from 'slates';

export class WeaviateClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { instanceUrl: string; token?: string }) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }
    this.axios = createAxios({
      baseURL: config.instanceUrl.replace(/\/+$/, ''),
      headers
    });
  }

  // ── Meta / Cluster ──

  async getMeta(): Promise<any> {
    let res = await this.axios.get('/v1/meta');
    return res.data;
  }

  async getNodes(params?: { output?: string }): Promise<any> {
    let res = await this.axios.get('/v1/nodes', { params });
    return res.data;
  }

  async getLiveness(): Promise<boolean> {
    let res = await this.axios.get('/v1/.well-known/live');
    return res.status === 200;
  }

  async getReadiness(): Promise<boolean> {
    let res = await this.axios.get('/v1/.well-known/ready');
    return res.status === 200;
  }

  // ── Collections (Schema) ──

  async listCollections(): Promise<any> {
    let res = await this.axios.get('/v1/schema');
    return res.data;
  }

  async getCollection(collectionName: string): Promise<any> {
    let res = await this.axios.get(`/v1/schema/${collectionName}`);
    return res.data;
  }

  async createCollection(schema: any): Promise<any> {
    let res = await this.axios.post('/v1/schema', schema);
    return res.data;
  }

  async updateCollection(collectionName: string, updates: any): Promise<any> {
    let res = await this.axios.put(`/v1/schema/${collectionName}`, updates);
    return res.data;
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.axios.delete(`/v1/schema/${collectionName}`);
  }

  async addProperty(collectionName: string, property: any): Promise<any> {
    let res = await this.axios.post(`/v1/schema/${collectionName}/properties`, property);
    return res.data;
  }

  // ── Tenants ──

  async listTenants(collectionName: string): Promise<any[]> {
    let res = await this.axios.get(`/v1/schema/${collectionName}/tenants`);
    return res.data as any[];
  }

  async addTenants(collectionName: string, tenants: any[]): Promise<any> {
    let res = await this.axios.post(`/v1/schema/${collectionName}/tenants`, tenants);
    return res.data;
  }

  async updateTenants(collectionName: string, tenants: any[]): Promise<any> {
    let res = await this.axios.put(`/v1/schema/${collectionName}/tenants`, tenants);
    return res.data;
  }

  async deleteTenants(collectionName: string, tenantNames: string[]): Promise<void> {
    await this.axios.delete(`/v1/schema/${collectionName}/tenants`, {
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
    let res = await this.axios.get(`/v1/objects/${collectionName}/${objectId}`, { params });
    return res.data;
  }

  async createObject(object: {
    class: string;
    properties: Record<string, any>;
    id?: string;
    vector?: number[];
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
      properties: Record<string, any>;
      vector?: number[];
      tenant?: string;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/v1/objects/${collectionName}/${objectId}`, object);
    return res.data;
  }

  async patchObject(
    collectionName: string,
    objectId: string,
    patch: {
      class: string;
      properties: Record<string, any>;
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.patch(`/v1/objects/${collectionName}/${objectId}`, patch);
  }

  async deleteObject(
    collectionName: string,
    objectId: string,
    params?: {
      tenant?: string;
    }
  ): Promise<void> {
    await this.axios.delete(`/v1/objects/${collectionName}/${objectId}`, { params });
  }

  async checkObjectExists(
    collectionName: string,
    objectId: string,
    params?: {
      tenant?: string;
    }
  ): Promise<boolean> {
    try {
      let res = await this.axios.head(`/v1/objects/${collectionName}/${objectId}`, { params });
      return res.status === 204;
    } catch {
      return false;
    }
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
      data: { match, ...params }
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
      `/v1/objects/${collectionName}/${objectId}/references/${refProperty}`,
      ref
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
      `/v1/objects/${collectionName}/${objectId}/references/${refProperty}`,
      { data: ref }
    );
  }

  // ── GraphQL ──

  async graphql(query: string, variables?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { query };
    if (variables) {
      body.variables = variables;
    }
    let res = await this.axios.post('/v1/graphql', body);
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
    let res = await this.axios.post(`/v1/backups/${backend}`, body);
    return res.data;
  }

  async getBackupStatus(backend: string, backupId: string): Promise<any> {
    let res = await this.axios.get(`/v1/backups/${backend}/${backupId}`);
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
    let res = await this.axios.post(`/v1/backups/${backend}/${backupId}/restore`, body || {});
    return res.data;
  }

  async getRestoreStatus(backend: string, backupId: string): Promise<any> {
    let res = await this.axios.get(`/v1/backups/${backend}/${backupId}/restore`);
    return res.data;
  }

  // ── Roles (RBAC) ──

  async listRoles(): Promise<any[]> {
    let res = await this.axios.get('/v1/authz/roles');
    return res.data as any[];
  }

  async getRole(roleName: string): Promise<any> {
    let res = await this.axios.get(`/v1/authz/roles/${roleName}`);
    return res.data;
  }

  async createRole(role: { name: string; permissions: any[] }): Promise<any> {
    let res = await this.axios.post('/v1/authz/roles', role);
    return res.data;
  }

  async deleteRole(roleName: string): Promise<void> {
    await this.axios.delete(`/v1/authz/roles/${roleName}`);
  }

  async assignRoleToUser(roleName: string, userId: string): Promise<void> {
    await this.axios.post(`/v1/authz/roles/${roleName}/users/${userId}`);
  }

  async revokeRoleFromUser(roleName: string, userId: string): Promise<void> {
    await this.axios.delete(`/v1/authz/roles/${roleName}/users/${userId}`);
  }

  async getUserRoles(userId: string): Promise<any[]> {
    let res = await this.axios.get(`/v1/authz/users/${userId}/roles`);
    return res.data as any[];
  }
}
