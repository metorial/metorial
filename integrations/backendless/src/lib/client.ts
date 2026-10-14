import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let regionBaseUrls: Record<string, string> = {
  us: 'https://api.backendless.com',
  eu: 'https://eu-api.backendless.com',
  sa: 'https://api.sa.backendless.com'
};

export interface BackendlessClientConfig {
  applicationId: string;
  token: string;
  subdomain?: string;
  region?: string;
}

export class BackendlessClient {
  private applicationId: string;
  private restApiKey: string;
  private baseUrl: string;
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: BackendlessClientConfig) {
    this.applicationId = config.applicationId;
    this.restApiKey = config.token;

    if (!this.applicationId.trim() || !this.restApiKey.trim()) {
      throw createApiServiceError('Backendless Application ID and REST API Key are required.');
    }

    if (config.subdomain) {
      if (!/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(config.subdomain)) {
        throw createApiServiceError(
          'Enter only the Backendless subdomain, without a URL or .backendless.app suffix.'
        );
      }
      this.baseUrl = `https://${config.subdomain}.backendless.app/api`;
    } else {
      let regionBase = regionBaseUrls[config.region || 'us'] || regionBaseUrls.us;
      this.baseUrl = `${regionBase}/${encodeURIComponent(this.applicationId)}/${encodeURIComponent(this.restApiKey)}`;
    }

    this.axios = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Backendless',
          reason: 'backendless_api_error',
          detailKeys: ['message', 'errorMessage', 'code']
        })
    });
  }

  // ─── Data (Database) Operations ──────────────────────────────────────

  async createObject(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/data/${encodeURIComponent(tableName)}`, data);
    return response.data;
  }

  async bulkCreateObjects(
    tableName: string,
    objects: Record<string, unknown>[]
  ): Promise<string[]> {
    let response = await this.axios.post(
      `/data/bulk/${encodeURIComponent(tableName)}`,
      objects
    );
    return response.data;
  }

  async getObjectById(
    tableName: string,
    objectId: string,
    options?: {
      loadRelations?: string[];
      relationsDepth?: number;
      props?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let params: Record<string, string> = {};
    if (options?.loadRelations?.length) params.loadRelations = options.loadRelations.join(',');
    if (options?.relationsDepth !== undefined)
      params.relationsDepth = String(options.relationsDepth);
    if (options?.props?.length) params.props = options.props.join(',');

    let response = await this.axios.get(
      `/data/${encodeURIComponent(tableName)}/${encodeURIComponent(objectId)}`,
      { params }
    );
    return response.data;
  }

  async queryObjects(
    tableName: string,
    options?: {
      where?: string;
      sortBy?: string[];
      props?: string[];
      excludeProps?: string[];
      loadRelations?: string[];
      relationsDepth?: number;
      pageSize?: number;
      offset?: number;
      groupBy?: string[];
      having?: string;
      distinct?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let params: Record<string, string> = {};
    if (options?.where) params.where = options.where;
    if (options?.sortBy?.length) {
      params.sortBy = options.sortBy
        .map(property => (property.startsWith('-') ? `${property.slice(1)} DESC` : property))
        .join(',');
    }
    if (options?.props?.length) params.props = options.props.join(',');
    if (options?.excludeProps?.length) params.excludeProps = options.excludeProps.join(',');
    if (options?.loadRelations?.length) params.loadRelations = options.loadRelations.join(',');
    if (options?.relationsDepth !== undefined)
      params.relationsDepth = String(options.relationsDepth);
    if (options?.pageSize !== undefined) params.pageSize = String(options.pageSize);
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.groupBy?.length) params.groupBy = options.groupBy.join(',');
    if (options?.having) params.having = options.having;
    if (options?.distinct) {
      params.props = options.distinct;
      params.distinct = 'true';
    }

    let response = await this.axios.get(`/data/${encodeURIComponent(tableName)}`, { params });
    return response.data;
  }

  async getObjectCount(tableName: string, where?: string): Promise<number> {
    let params: Record<string, string> = {};
    if (where) params.where = where;

    let response = await this.axios.get(`/data/${encodeURIComponent(tableName)}/count`, {
      params
    });
    return response.data;
  }

  async updateObject(
    tableName: string,
    objectId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/data/${encodeURIComponent(tableName)}/${encodeURIComponent(objectId)}`,
      data
    );
    return response.data;
  }

  async bulkUpdateObjects(
    tableName: string,
    where: string,
    data: Record<string, unknown>
  ): Promise<number> {
    let response = await this.axios.put(`/data/bulk/${encodeURIComponent(tableName)}`, data, {
      params: { where }
    });
    return response.data;
  }

  async deleteObject(tableName: string, objectId: string): Promise<{ deletionTime: number }> {
    let response = await this.axios.delete(
      `/data/${encodeURIComponent(tableName)}/${encodeURIComponent(objectId)}`
    );
    return response.data;
  }

  async bulkDeleteObjects(tableName: string, where: string): Promise<number> {
    let response = await this.axios.delete(`/data/bulk/${encodeURIComponent(tableName)}`, {
      params: { where }
    });
    return response.data;
  }

  async getTableSchema(tableName: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/data/${encodeURIComponent(tableName)}/properties`);
    return response.data;
  }

  async manageRelations(
    tableName: string,
    parentObjectId: string,
    relationName: string,
    operation: 'set' | 'add' | 'remove',
    childObjectIds: string[]
  ): Promise<number> {
    let response = await this.axios.request({
      method: { set: 'POST', add: 'PUT', remove: 'DELETE' }[operation],
      url: `/data/${encodeURIComponent(tableName)}/${encodeURIComponent(parentObjectId)}/${encodeURIComponent(relationName)}`,
      data: childObjectIds
    });
    return response.data;
  }

  // ─── User Management ─────────────────────────────────────────────────

  async registerUser(userData: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/users/register', userData);
    return response.data;
  }

  async loginUser(login: string, password: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/users/login', { login, password });
    return response.data;
  }

  async getUsers(options?: {
    where?: string;
    sortBy?: string[];
    props?: string[];
    pageSize?: number;
    offset?: number;
    loadRelations?: string[];
    relationsDepth?: number;
  }): Promise<Record<string, unknown>[]> {
    return this.queryObjects('Users', options);
  }

  async getUserById(userId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/data/Users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async getUserCount(where?: string): Promise<number> {
    let params: Record<string, string> = {};
    if (where) params.where = where;

    let response = await this.axios.get('/data/Users/count', { params });
    return response.data;
  }

  // ─── File Operations ─────────────────────────────────────────────────

  async listFiles(
    path: string,
    options?: {
      pattern?: string;
      recursive?: boolean;
      pageSize?: number;
      offset?: number;
    }
  ): Promise<
    Array<{
      name: string;
      createdOn: number;
      publicUrl: string;
      url: string;
      size: number;
    }>
  > {
    let params: Record<string, string> = {};
    if (options?.pattern) params.pattern = options.pattern;
    if (options?.recursive !== undefined) params.sub = String(options.recursive);
    if (options?.pageSize !== undefined) params.pagesize = String(options.pageSize);
    if (options?.offset !== undefined) params.offset = String(options.offset);

    let response = await this.axios.get(`/files/${this.encodeFilePath(path)}`, { params });
    return response.data;
  }

  async deleteFile(path: string): Promise<void> {
    await this.axios.delete(`/files/${this.encodeFilePath(path)}`);
  }

  async deleteDirectory(path: string): Promise<void> {
    await this.axios.delete(`/files/${this.encodeFilePath(path)}`);
  }

  getFileDownloadUrl(path: string): string {
    return `${this.baseUrl}/files/${this.encodeFilePath(path)}`;
  }

  private encodeFilePath(path: string): string {
    let segments = path.replace(/^\/+/, '').split('/');
    if (segments.some(segment => segment === '.' || segment === '..')) {
      throw createApiServiceError(
        'Use a file path from the storage root without . or .. segments.'
      );
    }
    return segments.map(encodeURIComponent).join('/');
  }

  // ─── Messaging (Pub/Sub) ─────────────────────────────────────────────

  async publishMessage(
    channelName: string,
    message: unknown,
    options?: {
      publisherId?: string;
      headers?: Record<string, string>;
      publishAt?: number;
      repeatEvery?: number;
      repeatExpiresAt?: number;
    }
  ): Promise<{ status: string; messageId: string; errorMessage?: string | null }> {
    let body: Record<string, unknown> = { message };
    if (options?.publisherId) body.publisherId = options.publisherId;
    if (options?.headers) body.headers = options.headers;
    if (options?.publishAt) body.publishAt = options.publishAt;
    if (options?.repeatEvery) body.repeatEvery = options.repeatEvery;
    if (options?.repeatExpiresAt) body.repeatExpiresAt = options.repeatExpiresAt;

    let response = await this.axios.post(
      `/messaging/${encodeURIComponent(channelName)}`,
      body
    );
    if (response.data.status === 'failed') {
      throw createApiServiceError(
        response.data.errorMessage || 'Backendless failed to publish the message.'
      );
    }
    return response.data;
  }

  // ─── Email ────────────────────────────────────────────────────────────

  async sendEmailFromTemplate(options: {
    templateName: string;
    addresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    criteria?: string;
    uniqueEmails?: boolean;
    templateValues?: Record<string, unknown>;
    attachments?: string[];
  }): Promise<Record<string, unknown> | undefined> {
    let body: Record<string, unknown> = {
      'template-name': options.templateName
    };
    if (options.addresses) body.addresses = options.addresses;
    if (options.ccAddresses) body['cc-addresses'] = options.ccAddresses;
    if (options.bccAddresses) body['bcc-addresses'] = options.bccAddresses;
    if (options.criteria) body.criteria = options.criteria;
    if (options.uniqueEmails !== undefined) body.uniqueEmails = options.uniqueEmails;
    if (options.templateValues) body['template-values'] = options.templateValues;
    if (options.attachments) {
      body.attachment = options.attachments.map(path => path.replace(/^\/+/, ''));
    }

    let response = await this.axios.post('/emailtemplate/send', body);
    return isApiErrorRecord(response.data) ? response.data : undefined;
  }

  // ─── Atomic Counters ─────────────────────────────────────────────────

  async getCounterValue(counterName: string): Promise<number> {
    let response = await this.axios.get(`/counters/${encodeURIComponent(counterName)}`);
    return response.data;
  }

  async incrementCounter(counterName: string): Promise<number> {
    let response = await this.axios.put(
      `/counters/${encodeURIComponent(counterName)}/increment/get`
    );
    return response.data;
  }

  async decrementCounter(counterName: string): Promise<number> {
    let response = await this.axios.put(
      `/counters/${encodeURIComponent(counterName)}/decrement/get`
    );
    return response.data;
  }

  async incrementCounterBy(counterName: string, value: number): Promise<number> {
    let response = await this.axios.put(
      `/counters/${encodeURIComponent(counterName)}/incrementby/get`,
      undefined,
      { params: { value } }
    );
    return response.data;
  }

  async resetCounter(counterName: string): Promise<void> {
    await this.axios.put(`/counters/${encodeURIComponent(counterName)}/reset`);
  }

  // ─── Caching ──────────────────────────────────────────────────────────

  async putCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    let params: Record<string, string> = {};
    if (ttlSeconds !== undefined) params.timeout = String(ttlSeconds);

    await this.axios.put(`/cache/${encodeURIComponent(key)}`, value, { params });
  }

  async getCache(key: string): Promise<unknown> {
    let response = await this.axios.get(`/cache/${encodeURIComponent(key)}`);
    return response.data;
  }

  async deleteCache(key: string): Promise<void> {
    await this.axios.delete(`/cache/${encodeURIComponent(key)}`);
  }

  async cacheContains(key: string): Promise<boolean> {
    let response = await this.axios.get(`/cache/${encodeURIComponent(key)}/check`);
    return response.data;
  }
}
