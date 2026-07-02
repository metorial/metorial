import { createAxios } from 'slates';

export interface ClientConfig {
  baseUrl: string;
  token: string;
}

export interface QueryParams {
  fields?: string[];
  populate?: string | Record<string, any>;
  filters?: Record<string, any>;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
  status?: 'draft' | 'published';
  locale?: string;
}

export interface PaginationMeta {
  page?: number;
  pageSize?: number;
  pageCount?: number;
  total?: number;
  start?: number;
  limit?: number;
}

export interface ListResponse {
  data: Record<string, any>[];
  meta: {
    pagination?: PaginationMeta;
  };
}

export interface SingleResponse {
  data: Record<string, any>;
  meta: Record<string, any>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private buildQueryString(params: QueryParams): Record<string, any> {
    let query: Record<string, any> = {};

    if (params.fields && params.fields.length > 0) {
      params.fields.forEach((field, i) => {
        query[`fields[${i}]`] = field;
      });
    }

    if (params.populate) {
      if (typeof params.populate === 'string') {
        query.populate = params.populate;
      } else {
        let flatPopulate = this.flattenObject(params.populate, 'populate');
        Object.assign(query, flatPopulate);
      }
    }

    if (params.filters) {
      let flatFilters = this.flattenObject(params.filters, 'filters');
      Object.assign(query, flatFilters);
    }

    if (params.sort) {
      if (typeof params.sort === 'string') {
        query.sort = params.sort;
      } else {
        params.sort.forEach((s, i) => {
          query[`sort[${i}]`] = s;
        });
      }
    }

    if (params.pagination) {
      if (params.pagination.page !== undefined) {
        query['pagination[page]'] = params.pagination.page;
      }
      if (params.pagination.pageSize !== undefined) {
        query['pagination[pageSize]'] = params.pagination.pageSize;
      }
      if (params.pagination.start !== undefined) {
        query['pagination[start]'] = params.pagination.start;
      }
      if (params.pagination.limit !== undefined) {
        query['pagination[limit]'] = params.pagination.limit;
      }
      if (params.pagination.withCount !== undefined) {
        query['pagination[withCount]'] = params.pagination.withCount;
      }
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.locale) {
      query.locale = params.locale;
    }

    return query;
  }

  private flattenObject(obj: Record<string, any>, prefix: string): Record<string, any> {
    let result: Record<string, any> = {};
    for (let key of Object.keys(obj)) {
      let value = obj[key];
      let newKey = `${prefix}[${key}]`;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(result, this.flattenObject(item, `${newKey}[${i}]`));
          } else {
            result[`${newKey}[${i}]`] = item;
          }
        });
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  async listEntries(pluralApiId: string, params: QueryParams = {}): Promise<ListResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.get(`/api/${pluralApiId}`, { params: query });
    return response.data;
  }

  async getEntry(
    pluralApiId: string,
    documentId: string,
    params: Pick<QueryParams, 'fields' | 'populate' | 'status' | 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.get(`/api/${pluralApiId}/${documentId}`, {
      params: query
    });
    return response.data;
  }

  async createEntry(
    pluralApiId: string,
    data: Record<string, any>,
    params: Pick<QueryParams, 'status' | 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.post(`/api/${pluralApiId}`, { data }, { params: query });
    return response.data;
  }

  async updateEntry(
    pluralApiId: string,
    documentId: string,
    data: Record<string, any>,
    params: Pick<QueryParams, 'status' | 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.put(
      `/api/${pluralApiId}/${documentId}`,
      { data },
      { params: query }
    );
    return response.data;
  }

  async deleteEntry(
    pluralApiId: string,
    documentId: string,
    params: Pick<QueryParams, 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.delete(`/api/${pluralApiId}/${documentId}`, {
      params: query
    });
    return response.data;
  }

  async getSingleType(
    singularApiId: string,
    params: Pick<QueryParams, 'fields' | 'populate' | 'status' | 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.get(`/api/${singularApiId}`, { params: query });
    return response.data;
  }

  async updateSingleType(
    singularApiId: string,
    data: Record<string, any>,
    params: Pick<QueryParams, 'status' | 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.put(`/api/${singularApiId}`, { data }, { params: query });
    return response.data;
  }

  async deleteSingleType(
    singularApiId: string,
    params: Pick<QueryParams, 'locale'> = {}
  ): Promise<SingleResponse> {
    let query = this.buildQueryString(params);
    let response = await this.axios.delete(`/api/${singularApiId}`, { params: query });
    return response.data;
  }

  async listFiles(params: QueryParams = {}): Promise<any[]> {
    let query = this.buildQueryString(params);
    let response = await this.axios.get('/api/upload/files', { params: query });
    return response.data;
  }

  async getFile(fileId: number): Promise<any> {
    let response = await this.axios.get(`/api/upload/files/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: number): Promise<any> {
    let response = await this.axios.delete(`/api/upload/files/${fileId}`);
    return response.data;
  }

  async uploadFileFromUrl(
    fileUrl: string,
    fileName: string,
    fileInfo?: { name?: string; alternativeText?: string; caption?: string }
  ): Promise<any[]> {
    let fileResponse = await this.axios.get(fileUrl, { responseType: 'arraybuffer' });
    let fileData = fileResponse.data;

    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let parts: string[] = [];

    let binaryStr = '';
    let bytes = new Uint8Array(fileData);
    for (let i = 0; i < bytes.length; i++) {
      binaryStr += String.fromCharCode(bytes[i]!);
    }

    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n`);
    parts.push(`Content-Type: application/octet-stream\r\n`);
    parts.push(`Content-Transfer-Encoding: binary\r\n\r\n`);
    parts.push(binaryStr);
    parts.push('\r\n');

    if (fileInfo) {
      parts.push(`--${boundary}\r\n`);
      parts.push(`Content-Disposition: form-data; name="fileInfo"\r\n`);
      parts.push(`Content-Type: application/json\r\n\r\n`);
      parts.push(JSON.stringify(fileInfo));
      parts.push('\r\n');
    }

    parts.push(`--${boundary}--\r\n`);

    let body = parts.join('');

    let response = await this.axios.post('/api/upload', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    return response.data;
  }

  async updateFileInfo(
    fileId: number,
    fileInfo: { name?: string; alternativeText?: string; caption?: string }
  ): Promise<any> {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let parts: string[] = [];

    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="fileInfo"\r\n`);
    parts.push(`Content-Type: application/json\r\n\r\n`);
    parts.push(JSON.stringify(fileInfo));
    parts.push('\r\n');
    parts.push(`--${boundary}--\r\n`);

    let body = parts.join('');

    let response = await this.axios.post(`/api/upload?id=${fileId}`, body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    return response.data;
  }

  async getMe(): Promise<any> {
    let response = await this.axios.get('/api/users/me');
    return response.data;
  }
}
