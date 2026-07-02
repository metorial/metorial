import { createAxios } from 'slates';

export interface KnackClientConfig {
  applicationId: string;
  token: string;
  authMode: 'api_key' | 'view_based';
}

export interface KnackFilter {
  field: string;
  operator: string;
  value: string;
}

export interface KnackFilterSet {
  match: 'and' | 'or';
  rules: KnackFilter[];
}

export interface ListRecordsOptions {
  page?: number;
  rowsPerPage?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: KnackFilterSet;
}

export interface KnackRecordsResponse {
  records: Record<string, any>[];
  totalPages: number;
  totalRecords: number;
  currentPage: number;
}

export class KnackClient {
  private api: ReturnType<typeof createAxios>;
  private applicationId: string;
  private token: string;
  private authMode: 'api_key' | 'view_based';

  constructor(config: KnackClientConfig) {
    this.applicationId = config.applicationId;
    this.token = config.token;
    this.authMode = config.authMode;

    this.api = createAxios({
      baseURL: 'https://api.knack.com/v1'
    });
  }

  private getHeaders(): Record<string, string> {
    let headers: Record<string, string> = {
      'X-Knack-Application-Id': this.applicationId,
      'Content-Type': 'application/json'
    };

    if (this.authMode === 'api_key') {
      headers['X-Knack-REST-API-Key'] = this.token;
    } else {
      headers['X-Knack-REST-API-Key'] = 'knack';
      headers.Authorization = this.token;
    }

    return headers;
  }

  async getApplicationMetadata(): Promise<Record<string, any>> {
    let response = await this.api.get(`/applications/${this.applicationId}`, {
      headers: this.getHeaders()
    });
    return response.data.application;
  }

  async listObjectRecords(
    objectKey: string,
    options?: ListRecordsOptions
  ): Promise<KnackRecordsResponse> {
    let params: Record<string, any> = {};

    if (options?.page) params.page = options.page;
    if (options?.rowsPerPage) params.rows_per_page = options.rowsPerPage;
    if (options?.sortField) params.sort_field = options.sortField;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.filters) params.filters = JSON.stringify(options.filters);

    let response = await this.api.get(`/objects/${objectKey}/records`, {
      headers: this.getHeaders(),
      params
    });

    return {
      records: response.data.records,
      totalPages: response.data.total_pages,
      totalRecords: response.data.total_records,
      currentPage: response.data.current_page
    };
  }

  async listViewRecords(
    sceneKey: string,
    viewKey: string,
    options?: ListRecordsOptions
  ): Promise<KnackRecordsResponse> {
    let params: Record<string, any> = {};

    if (options?.page) params.page = options.page;
    if (options?.rowsPerPage) params.rows_per_page = options.rowsPerPage;
    if (options?.sortField) params.sort_field = options.sortField;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.filters) params.filters = JSON.stringify(options.filters);

    let response = await this.api.get(`/pages/${sceneKey}/views/${viewKey}/records`, {
      headers: this.getHeaders(),
      params
    });

    return {
      records: response.data.records,
      totalPages: response.data.total_pages,
      totalRecords: response.data.total_records,
      currentPage: response.data.current_page
    };
  }

  async getObjectRecord(objectKey: string, recordId: string): Promise<Record<string, any>> {
    let response = await this.api.get(`/objects/${objectKey}/records/${recordId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getViewRecord(
    sceneKey: string,
    viewKey: string,
    recordId: string
  ): Promise<Record<string, any>> {
    let response = await this.api.get(
      `/pages/${sceneKey}/views/${viewKey}/records/${recordId}`,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async createObjectRecord(
    objectKey: string,
    fields: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.api.post(`/objects/${objectKey}/records`, fields, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createViewRecord(
    sceneKey: string,
    viewKey: string,
    fields: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.api.post(`/pages/${sceneKey}/views/${viewKey}/records`, fields, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateObjectRecord(
    objectKey: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.api.put(`/objects/${objectKey}/records/${recordId}`, fields, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateViewRecord(
    sceneKey: string,
    viewKey: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.api.put(
      `/pages/${sceneKey}/views/${viewKey}/records/${recordId}`,
      fields,
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }

  async deleteObjectRecord(
    objectKey: string,
    recordId: string
  ): Promise<{ deleted: boolean }> {
    let response = await this.api.delete(`/objects/${objectKey}/records/${recordId}`, {
      headers: this.getHeaders()
    });
    return { deleted: response.data.delete === true || response.status === 200 };
  }

  async deleteViewRecord(
    sceneKey: string,
    viewKey: string,
    recordId: string
  ): Promise<{ deleted: boolean }> {
    let response = await this.api.delete(
      `/pages/${sceneKey}/views/${viewKey}/records/${recordId}`,
      {
        headers: this.getHeaders()
      }
    );
    return { deleted: response.data.delete === true || response.status === 200 };
  }

  async uploadFile(
    _objectKey: string,
    _fieldKey: string,
    fileName: string,
    fileContent: string,
    contentType: string
  ): Promise<string> {
    let headers = this.getHeaders();
    headers['Content-Type'] = `multipart/form-data`;

    // Step 1: Upload the file asset
    let formData = `--boundary\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n${fileContent}\r\n--boundary--`;

    let response = await this.api.post(
      `/applications/${this.applicationId}/assets/file/upload`,
      formData,
      {
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'multipart/form-data; boundary=boundary'
        }
      }
    );

    return response.data.id;
  }

  async remoteLogin(
    email: string,
    password: string
  ): Promise<{ token: string; profile: Record<string, any> }> {
    let response = await this.api.post(
      '/applications/session',
      {
        email,
        password
      },
      {
        headers: {
          'X-Knack-Application-Id': this.applicationId,
          'X-Knack-REST-API-Key': this.token,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      token: response.data.session.user.token,
      profile: response.data.session.user
    };
  }
}
