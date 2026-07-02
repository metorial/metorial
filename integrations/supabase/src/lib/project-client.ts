import { createAxios } from 'slates';
import { supabaseApiError } from './errors';

let storagePath = (bucketId: string, path: string) =>
  `/storage/v1/object/${encodeURIComponent(bucketId)}/${path
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/')}`;

export class ProjectClient {
  private http: ReturnType<typeof createAxios>;
  private projectRef: string;

  constructor(projectRef: string, apiKey: string) {
    this.projectRef = projectRef;
    this.http = createAxios({
      baseURL: `https://${projectRef}.supabase.co`,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(supabaseApiError(error, 'Project API request'))
    );
  }

  // ─── REST API (PostgREST) ─────────────────────────────────

  async selectRows(
    table: string,
    params: {
      select?: string;
      filters?: Record<string, string>;
      order?: string;
      limit?: number;
      offset?: number;
      schema?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = {};
    if (params.select) queryParams.select = params.select;
    if (params.order) queryParams.order = params.order;
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.offset !== undefined) queryParams.offset = String(params.offset);

    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[key] = value;
      }
    }

    let headers: Record<string, string> = {};
    if (params.schema) {
      headers['Accept-Profile'] = params.schema;
    }

    let response = await this.http.get(`/rest/v1/${table}`, {
      params: queryParams,
      headers
    });
    return response.data;
  }

  async insertRows(
    table: string,
    rows: Record<string, any> | Record<string, any>[],
    params: {
      onConflict?: string;
      returning?: string;
      schema?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = {};
    if (params.onConflict) queryParams.on_conflict = params.onConflict;

    let headers: Record<string, string> = {
      Prefer: params.returning === 'minimal' ? 'return=minimal' : 'return=representation'
    };
    if (params.schema) {
      headers['Content-Profile'] = params.schema;
    }

    let response = await this.http.post(`/rest/v1/${table}`, rows, {
      params: queryParams,
      headers
    });
    return response.data;
  }

  async updateRows(
    table: string,
    updates: Record<string, any>,
    filters: Record<string, string>,
    params: {
      returning?: string;
      schema?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = { ...filters };

    let headers: Record<string, string> = {
      Prefer: params.returning === 'minimal' ? 'return=minimal' : 'return=representation'
    };
    if (params.schema) {
      headers['Content-Profile'] = params.schema;
    }

    let response = await this.http.patch(`/rest/v1/${table}`, updates, {
      params: queryParams,
      headers
    });
    return response.data;
  }

  async deleteRows(
    table: string,
    filters: Record<string, string>,
    params: {
      returning?: string;
      schema?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = { ...filters };

    let headers: Record<string, string> = {
      Prefer: params.returning === 'minimal' ? 'return=minimal' : 'return=representation'
    };
    if (params.schema) {
      headers['Content-Profile'] = params.schema;
    }

    let response = await this.http.delete(`/rest/v1/${table}`, {
      params: queryParams,
      headers
    });
    return response.data;
  }

  async upsertRows(
    table: string,
    rows: Record<string, any> | Record<string, any>[],
    params: {
      onConflict?: string;
      returning?: string;
      schema?: string;
    } = {}
  ) {
    let queryParams: Record<string, string> = {};
    if (params.onConflict) queryParams.on_conflict = params.onConflict;

    let headers: Record<string, string> = {
      Prefer: `return=representation,resolution=merge-duplicates`
    };
    if (params.returning === 'minimal') {
      headers.Prefer = 'return=minimal,resolution=merge-duplicates';
    }
    if (params.schema) {
      headers['Content-Profile'] = params.schema;
    }

    let response = await this.http.post(`/rest/v1/${table}`, rows, {
      params: queryParams,
      headers
    });
    return response.data;
  }

  async rpc(
    functionName: string,
    args: Record<string, any> = {},
    params: {
      schema?: string;
    } = {}
  ) {
    let headers: Record<string, string> = {};
    if (params.schema) {
      headers['Content-Profile'] = params.schema;
    }

    let response = await this.http.post(`/rest/v1/rpc/${functionName}`, args, {
      headers
    });
    return response.data;
  }

  // ─── Auth ─────────────────────────────────────────────────

  async listAuthUsers(params: { page?: number; perPage?: number } = {}) {
    let response = await this.http.get('/auth/v1/admin/users', {
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async getAuthUser(userId: string) {
    let response = await this.http.get(`/auth/v1/admin/users/${userId}`);
    return response.data;
  }

  async createAuthUser(data: {
    email?: string;
    phone?: string;
    password?: string;
    emailConfirm?: boolean;
    phoneConfirm?: boolean;
    userMetadata?: Record<string, any>;
  }) {
    let response = await this.http.post('/auth/v1/admin/users', {
      email: data.email,
      phone: data.phone,
      password: data.password,
      email_confirm: data.emailConfirm,
      phone_confirm: data.phoneConfirm,
      user_metadata: data.userMetadata
    });
    return response.data;
  }

  async updateAuthUser(
    userId: string,
    data: {
      email?: string;
      phone?: string;
      password?: string;
      emailConfirm?: boolean;
      phoneConfirm?: boolean;
      userMetadata?: Record<string, any>;
      banned?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.email !== undefined) body.email = data.email;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.password !== undefined) body.password = data.password;
    if (data.emailConfirm !== undefined) body.email_confirm = data.emailConfirm;
    if (data.phoneConfirm !== undefined) body.phone_confirm = data.phoneConfirm;
    if (data.userMetadata !== undefined) body.user_metadata = data.userMetadata;
    if (data.banned !== undefined) body.ban_duration = data.banned ? 'none' : '0';

    let response = await this.http.put(`/auth/v1/admin/users/${userId}`, body);
    return response.data;
  }

  async deleteAuthUser(userId: string) {
    let response = await this.http.delete(`/auth/v1/admin/users/${userId}`);
    return response.data;
  }

  // ─── Storage Objects ──────────────────────────────────────

  async listStorageObjects(
    bucketId: string,
    params: {
      prefix?: string;
      limit?: number;
      offset?: number;
      search?: string;
      sortBy?: { column: string; order: string };
    } = {}
  ) {
    let response = await this.http.post(`/storage/v1/object/list/${bucketId}`, {
      prefix: params.prefix ?? '',
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      search: params.search,
      sortBy: params.sortBy ?? { column: 'name', order: 'asc' }
    });
    return response.data;
  }

  async deleteStorageObjects(bucketId: string, paths: string[]) {
    let response = await this.http.delete(`/storage/v1/object/${bucketId}`, {
      data: { prefixes: paths }
    });
    return response.data;
  }

  async moveStorageObject(bucketId: string, sourceKey: string, destinationKey: string) {
    let response = await this.http.post('/storage/v1/object/move', {
      bucketId,
      sourceKey,
      destinationKey
    });
    return response.data;
  }

  async copyStorageObject(bucketId: string, sourceKey: string, destinationKey: string) {
    let response = await this.http.post('/storage/v1/object/copy', {
      bucketId,
      sourceKey,
      destinationKey
    });
    return response.data;
  }

  async uploadStorageObject(
    bucketId: string,
    path: string,
    content: string | Buffer,
    params: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    } = {}
  ) {
    let response = await this.http.post(storagePath(bucketId, path), content, {
      headers: {
        'Content-Type': params.contentType ?? 'application/octet-stream',
        ...(params.cacheControl ? { 'Cache-Control': params.cacheControl } : {}),
        ...(params.upsert !== undefined ? { 'x-upsert': String(params.upsert) } : {})
      }
    });
    return response.data;
  }

  async updateStorageObject(
    bucketId: string,
    path: string,
    content: string | Buffer,
    params: {
      contentType?: string;
      cacheControl?: string;
    } = {}
  ) {
    let response = await this.http.put(storagePath(bucketId, path), content, {
      headers: {
        'Content-Type': params.contentType ?? 'application/octet-stream',
        ...(params.cacheControl ? { 'Cache-Control': params.cacheControl } : {})
      }
    });
    return response.data;
  }

  async downloadStorageObject(bucketId: string, path: string) {
    let response = await this.http.get(storagePath(bucketId, path), {
      responseType: 'arraybuffer'
    });
    let content = Buffer.from(response.data).toString('base64');
    let contentType =
      typeof response.headers?.['content-type'] === 'string'
        ? response.headers['content-type']
        : 'application/octet-stream';
    let contentLength = Buffer.byteLength(content, 'base64');

    return {
      content,
      contentType,
      contentLength
    };
  }

  async getStorageObjectInfo(bucketId: string, path: string) {
    let response = await this.http.get(
      `/storage/v1/object/info/${encodeURIComponent(bucketId)}/${path
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/')}`
    );
    return response.data;
  }

  async getPublicUrl(bucketId: string, path: string) {
    return `https://${this.projectRef}.supabase.co/storage/v1/object/public/${encodeURIComponent(bucketId)}/${path
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/')}`;
  }

  async createSignedUrl(bucketId: string, path: string, expiresIn: number) {
    let response = await this.http.post(
      `/storage/v1/object/sign/${encodeURIComponent(bucketId)}/${path
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/')}`,
      {
        expiresIn
      }
    );
    return response.data;
  }
}
