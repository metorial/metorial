import { createAxios } from 'slates';

export class ManagementClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.supabase.com/v1',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ─── Organizations ──────────────────────────────────────────

  async listOrganizations() {
    let response = await this.http.get('/organizations');
    return response.data;
  }

  async getOrganization(organizationId: string) {
    let response = await this.http.get(`/organizations/${organizationId}`);
    return response.data;
  }

  async createOrganization(name: string) {
    let response = await this.http.post('/organizations', { name });
    return response.data;
  }

  async listOrganizationMembers(slug: string) {
    let response = await this.http.get(`/organizations/${slug}/members`);
    return response.data;
  }

  // ─── Projects ───────────────────────────────────────────────

  async listProjects() {
    let response = await this.http.get('/projects');
    return response.data;
  }

  async getProject(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    organizationId: string;
    region: string;
    dbPass: string;
    plan?: string;
  }) {
    let response = await this.http.post('/projects', {
      name: data.name,
      organization_id: data.organizationId,
      region: data.region,
      db_pass: data.dbPass,
      plan: data.plan ?? 'free'
    });
    return response.data;
  }

  async deleteProject(projectRef: string) {
    let response = await this.http.delete(`/projects/${projectRef}`);
    return response.data;
  }

  async pauseProject(projectRef: string) {
    let response = await this.http.post(`/projects/${projectRef}/pause`);
    return response.data;
  }

  async restoreProject(projectRef: string) {
    let response = await this.http.post(`/projects/${projectRef}/restore`);
    return response.data;
  }

  // ─── Project API Keys ──────────────────────────────────────

  async getProjectApiKeys(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/api-keys`);
    return response.data;
  }

  // ─── Database ──────────────────────────────────────────────

  async runQuery(projectRef: string, query: string) {
    let response = await this.http.post(`/projects/${projectRef}/database/query`, {
      query
    });
    return response.data;
  }

  // ─── Edge Functions ────────────────────────────────────────

  async listEdgeFunctions(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/functions`);
    return response.data;
  }

  async getEdgeFunction(projectRef: string, functionSlug: string) {
    let response = await this.http.get(`/projects/${projectRef}/functions/${functionSlug}`);
    return response.data;
  }

  async createEdgeFunction(
    projectRef: string,
    data: {
      name: string;
      slug: string;
      body: string;
      verifyJwt?: boolean;
    }
  ) {
    let response = await this.http.post(`/projects/${projectRef}/functions`, {
      name: data.name,
      slug: data.slug,
      body: data.body,
      verify_jwt: data.verifyJwt
    });
    return response.data;
  }

  async updateEdgeFunction(
    projectRef: string,
    functionSlug: string,
    data: {
      name?: string;
      body?: string;
      verifyJwt?: boolean;
    }
  ) {
    let response = await this.http.patch(`/projects/${projectRef}/functions/${functionSlug}`, {
      name: data.name,
      body: data.body,
      verify_jwt: data.verifyJwt
    });
    return response.data;
  }

  async deleteEdgeFunction(projectRef: string, functionSlug: string) {
    let response = await this.http.delete(`/projects/${projectRef}/functions/${functionSlug}`);
    return response.data;
  }

  // ─── Secrets ───────────────────────────────────────────────

  async listSecrets(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/secrets`);
    return response.data;
  }

  async createSecrets(projectRef: string, secrets: Array<{ name: string; value: string }>) {
    let response = await this.http.post(`/projects/${projectRef}/secrets`, secrets);
    return response.data;
  }

  async deleteSecrets(projectRef: string, secretNames: string[]) {
    let response = await this.http.delete(`/projects/${projectRef}/secrets`, {
      data: secretNames
    });
    return response.data;
  }

  // ─── Storage Buckets ──────────────────────────────────────

  async listStorageBuckets(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/storage/buckets`);
    return response.data;
  }

  async getStorageBucket(projectRef: string, bucketId: string) {
    let response = await this.http.get(`/projects/${projectRef}/storage/buckets/${bucketId}`);
    return response.data;
  }

  async createStorageBucket(
    projectRef: string,
    data: {
      name: string;
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  ) {
    let response = await this.http.post(`/projects/${projectRef}/storage/buckets`, {
      name: data.name,
      public: data.public ?? false,
      file_size_limit: data.fileSizeLimit,
      allowed_mime_types: data.allowedMimeTypes
    });
    return response.data;
  }

  async updateStorageBucket(
    projectRef: string,
    bucketId: string,
    data: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  ) {
    let response = await this.http.patch(
      `/projects/${projectRef}/storage/buckets/${bucketId}`,
      {
        public: data.public,
        file_size_limit: data.fileSizeLimit,
        allowed_mime_types: data.allowedMimeTypes
      }
    );
    return response.data;
  }

  async deleteStorageBucket(projectRef: string, bucketId: string) {
    let response = await this.http.delete(
      `/projects/${projectRef}/storage/buckets/${bucketId}`
    );
    return response.data;
  }

  async emptyStorageBucket(projectRef: string, bucketId: string) {
    let response = await this.http.post(
      `/projects/${projectRef}/storage/buckets/${bucketId}/empty`
    );
    return response.data;
  }

  // ─── Custom Domains ───────────────────────────────────────

  async getCustomDomainConfig(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/custom-hostname`);
    return response.data;
  }

  // ─── Network Restrictions ─────────────────────────────────

  async getNetworkRestrictions(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/network-restrictions`);
    return response.data;
  }

  // ─── Auth Config ──────────────────────────────────────────

  async getAuthConfig(projectRef: string) {
    let response = await this.http.get(`/projects/${projectRef}/config/auth`);
    return response.data;
  }

  async updateAuthConfig(projectRef: string, config: Record<string, any>) {
    let response = await this.http.patch(`/projects/${projectRef}/config/auth`, config);
    return response.data;
  }

  // ─── Project Logs ─────────────────────────────────────────

  async getProjectLogs(
    projectRef: string,
    params: {
      collection: string;
      startTimestamp?: string;
      endTimestamp?: string;
    }
  ) {
    let response = await this.http.get(
      `/projects/${projectRef}/analytics/endpoints/logs.all`,
      {
        params: {
          iso_timestamp_start: params.startTimestamp,
          iso_timestamp_end: params.endTimestamp,
          source: params.collection
        }
      }
    );
    return response.data;
  }

  // ─── Database Webhooks (pg_net + triggers) ────────────────

  async listDatabaseWebhooks(projectRef: string) {
    let query = `
      SELECT
        t.tgname as trigger_name,
        c.relname as table_name,
        n.nspname as schema_name,
        pg_get_triggerdef(t.oid) as trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE NOT t.tgisinternal
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname, t.tgname;
    `;
    return this.runQuery(projectRef, query);
  }
}
