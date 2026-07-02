import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: BackendlessClientConfig) {
    this.applicationId = config.applicationId;
    this.restApiKey = config.token;

    if (config.subdomain) {
      this.baseUrl = `https://${config.subdomain}.backendless.app/api`;
    } else {
      let regionBase = regionBaseUrls[config.region || 'us'] || regionBaseUrls.us;
      this.baseUrl = `${regionBase}/${this.applicationId}/${this.restApiKey}`;
    }

    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Data (Database) Operations ──────────────────────────────────────

  async createObject(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/data/${tableName}`, data);
    return response.data;
  }

  async bulkCreateObjects(
    tableName: string,
    objects: Record<string, unknown>[]
  ): Promise<string[]> {
    let response = await this.axios.post(`/data/bulk/${tableName}`, objects);
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
    if (options?.relationsDepth) params.relationsDepth = String(options.relationsDepth);
    if (options?.props?.length) params.props = options.props.join(',');

    let response = await this.axios.get(`/data/${tableName}/${objectId}`, { params });
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
    if (options?.sortBy?.length) params.sortBy = options.sortBy.join(',');
    if (options?.props?.length) params.props = options.props.join(',');
    if (options?.excludeProps?.length) params.excludeProps = options.excludeProps.join(',');
    if (options?.loadRelations?.length) params.loadRelations = options.loadRelations.join(',');
    if (options?.relationsDepth) params.relationsDepth = String(options.relationsDepth);
    if (options?.pageSize) params.pageSize = String(options.pageSize);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.groupBy?.length) params.groupBy = options.groupBy.join(',');
    if (options?.having) params.having = options.having;
    if (options?.distinct) params.distinct = options.distinct;

    let response = await this.axios.get(`/data/${tableName}`, { params });
    return response.data;
  }

  async getObjectCount(tableName: string, where?: string): Promise<number> {
    let params: Record<string, string> = {};
    if (where) params.where = where;

    let response = await this.axios.get(`/data/${tableName}/count`, { params });
    return response.data;
  }

  async updateObject(
    tableName: string,
    objectId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/data/${tableName}/${objectId}`, data);
    return response.data;
  }

  async bulkUpdateObjects(
    tableName: string,
    where: string,
    data: Record<string, unknown>
  ): Promise<number> {
    let response = await this.axios.put(`/data/bulk/${tableName}`, data, {
      params: { where }
    });
    return response.data;
  }

  async deleteObject(tableName: string, objectId: string): Promise<{ deletionTime: number }> {
    let response = await this.axios.delete(`/data/${tableName}/${objectId}`);
    return response.data;
  }

  async bulkDeleteObjects(tableName: string, where: string): Promise<number> {
    let response = await this.axios.delete(`/data/bulk/${tableName}`, {
      params: { where }
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
    let params: Record<string, string> = {};
    if (options?.where) params.where = options.where;
    if (options?.sortBy?.length) params.sortBy = options.sortBy.join(',');
    if (options?.props?.length) params.props = options.props.join(',');
    if (options?.pageSize) params.pageSize = String(options.pageSize);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.loadRelations?.length) params.loadRelations = options.loadRelations.join(',');
    if (options?.relationsDepth) params.relationsDepth = String(options.relationsDepth);

    let response = await this.axios.get('/data/Users', { params });
    return response.data;
  }

  async getUserById(userId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/data/Users/${userId}`);
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
    if (options?.recursive) params.sub = 'true';
    if (options?.pageSize) params.pagesize = String(options.pageSize);
    if (options?.offset) params.offset = String(options.offset);

    let response = await this.axios.get(`/files/${path}`, { params });
    return response.data;
  }

  async deleteFile(path: string): Promise<void> {
    await this.axios.delete(`/files/${path}`);
  }

  async deleteDirectory(path: string): Promise<void> {
    await this.axios.delete(`/files/${path}`);
  }

  getFileDownloadUrl(path: string): string {
    return `${this.baseUrl}/files/${path}`;
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
  ): Promise<{ status: string; messageId: string }> {
    let body: Record<string, unknown> = { message };
    if (options?.publisherId) body.publisherId = options.publisherId;
    if (options?.headers) body.headers = options.headers;
    if (options?.publishAt) body.publishAt = options.publishAt;
    if (options?.repeatEvery) body.repeatEvery = options.repeatEvery;
    if (options?.repeatExpiresAt) body.repeatExpiresAt = options.repeatExpiresAt;

    let response = await this.axios.post(`/messaging/${channelName}`, body);
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
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      'template-name': options.templateName
    };
    if (options.addresses) body.addresses = options.addresses;
    if (options.ccAddresses) body['cc-addresses'] = options.ccAddresses;
    if (options.bccAddresses) body['bcc-addresses'] = options.bccAddresses;
    if (options.criteria) body.criteria = options.criteria;
    if (options.uniqueEmails !== undefined) body.uniqueEmails = options.uniqueEmails;
    if (options.templateValues) body['template-values'] = options.templateValues;
    if (options.attachments) body.attachment = options.attachments;

    let response = await this.axios.post('/emailtemplate/send', body);
    return response.data;
  }

  // ─── Atomic Counters ─────────────────────────────────────────────────

  async getCounterValue(counterName: string): Promise<number> {
    let response = await this.axios.get(`/counters/${counterName}`);
    return response.data;
  }

  async incrementCounter(counterName: string): Promise<number> {
    let response = await this.axios.put(`/counters/${counterName}/increment/get`);
    return response.data;
  }

  async decrementCounter(counterName: string): Promise<number> {
    let response = await this.axios.put(`/counters/${counterName}/decrement/get`);
    return response.data;
  }

  async incrementCounterBy(counterName: string, value: number): Promise<number> {
    let response = await this.axios.put(`/counters/${counterName}/incrementby/${value}/get`);
    return response.data;
  }

  async resetCounter(counterName: string): Promise<void> {
    await this.axios.put(`/counters/${counterName}/reset`);
  }

  // ─── Caching ──────────────────────────────────────────────────────────

  async putCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    let params: Record<string, string> = {};
    if (ttlSeconds) params.timeout = String(ttlSeconds);

    await this.axios.put(`/cache/${key}`, value, { params });
  }

  async getCache(key: string): Promise<unknown> {
    let response = await this.axios.get(`/cache/${key}`);
    return response.data;
  }

  async deleteCache(key: string): Promise<void> {
    await this.axios.delete(`/cache/${key}`);
  }

  async cacheContains(key: string): Promise<boolean> {
    let response = await this.axios.get(`/cache/${key}/check`);
    return response.data;
  }
}
