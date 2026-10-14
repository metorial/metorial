import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { createHmacSignature } from './hmac';

export interface AuthConfig {
  token: string;
  secretKey?: string;
  authMethod: 'api_key' | 'hmac' | 'basic';
}

export interface ClientConfig {
  siteUrl: string;
  auth: AuthConfig;
}

export interface ListParams {
  offset?: number;
  maxSize?: number;
  select?: string[];
  orderBy?: string;
  order?: 'asc' | 'desc';
  where?: WhereClause[];
  textFilter?: string;
  primaryFilter?: string;
  boolFilterList?: string[];
}

export interface WhereClause {
  type: string;
  attribute?: string;
  value?: any;
}

export interface ListResponse {
  list: Record<string, any>[];
  total: number;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private authConfig: AuthConfig;
  private siteUrl: string;

  constructor(config: ClientConfig) {
    let siteUrl = config.siteUrl.replace(/\/+$/, '');
    this.siteUrl = siteUrl;
    this.authConfig = config.auth;

    if (config.auth.authMethod === 'hmac' && !config.auth.secretKey) {
      throw createApiServiceError(
        'A secret key is required for HMAC authentication. Reconnect with both API and secret keys.'
      );
    }

    this.http = createAxios({
      baseURL: `${siteUrl}/api/v1`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.request.use(reqConfig => {
      if (this.authConfig.authMethod === 'api_key') {
        reqConfig.headers['X-Api-Key'] = this.authConfig.token;
      } else if (this.authConfig.authMethod === 'hmac') {
        let method = (reqConfig.method || 'GET').toUpperCase();
        let url = reqConfig.url || '';
        let uri = url.startsWith('/') ? url.slice(1) : url;
        let signature = createHmacSignature(
          method,
          uri,
          this.authConfig.token,
          this.authConfig.secretKey!
        );
        reqConfig.headers['X-Hmac-Authorization'] = signature;
      } else if (this.authConfig.authMethod === 'basic') {
        reqConfig.headers['Espo-Authorization'] = this.authConfig.token;
      }
      return reqConfig;
    });

    this.http.interceptors.response.use(
      response => response,
      error =>
        Promise.reject(
          buildApiServiceError(error, {
            providerLabel: 'EspoCRM',
            reason: 'espocrm_api_error'
          })
        )
    );
  }

  async createRecord(
    entityType: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.http.post(`/${entityType}`, data);
    return response.data;
  }

  async getRecord(
    entityType: string,
    recordId: string,
    select?: string[]
  ): Promise<Record<string, any>> {
    let params: Record<string, any> = {};
    if (select && select.length > 0) {
      params.select = select.join(',');
    }
    let response = await this.http.get(`/${entityType}/${recordId}`, { params });
    return response.data;
  }

  async updateRecord(
    entityType: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.http.put(`/${entityType}/${recordId}`, data);
    return response.data;
  }

  async deleteRecord(entityType: string, recordId: string): Promise<void> {
    await this.http.delete(`/${entityType}/${recordId}`);
  }

  async listRecords(entityType: string, params: ListParams = {}): Promise<ListResponse> {
    let response = await this.http.get(`/${entityType}`, {
      params: { searchParams: JSON.stringify(pickDefined(params)) }
    });
    return {
      list: response.data.list || [],
      total: response.data.total ?? 0
    };
  }

  async getRelatedRecords(
    entityType: string,
    recordId: string,
    linkName: string,
    params: ListParams = {}
  ): Promise<ListResponse> {
    let response = await this.http.get(`/${entityType}/${recordId}/${linkName}`, {
      params: { searchParams: JSON.stringify(pickDefined(params)) }
    });
    return {
      list: response.data.list || [],
      total: response.data.total ?? 0
    };
  }

  async linkRecord(
    entityType: string,
    recordId: string,
    linkName: string,
    relatedRecordId: string
  ): Promise<void> {
    await this.http.post(`/${entityType}/${recordId}/${linkName}`, { id: relatedRecordId });
  }

  async unlinkRecord(
    entityType: string,
    recordId: string,
    linkName: string,
    relatedRecordId: string
  ): Promise<void> {
    await this.http.delete(`/${entityType}/${recordId}/${linkName}`, {
      data: { id: relatedRecordId }
    });
  }

  async convertLead(
    leadId: string,
    records: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.http.post('/Lead/action/convert', {
      id: leadId,
      records
    });
    return response.data;
  }

  async getLeadConversionAttributes(
    leadId: string
  ): Promise<Record<string, Record<string, any>>> {
    let response = await this.http.post('/Lead/action/getConvertAttributes', { id: leadId });
    return response.data;
  }

  async getCurrentUser(): Promise<Record<string, any>> {
    let response = await this.http.get('/App/user');
    let user = response.data?.user;
    if (!user || typeof user.id !== 'string') {
      throw createApiServiceError('EspoCRM did not return a current user record.');
    }
    return user;
  }

  async listStream(params: {
    entityType?: string;
    recordId?: string;
    offset?: number;
    maxSize?: number;
  }): Promise<ListResponse> {
    let path =
      params.entityType && params.recordId
        ? `/${params.entityType}/${params.recordId}/stream`
        : '/Stream';
    let response = await this.http.get(path, {
      params: pickDefined({ offset: params.offset, maxSize: params.maxSize })
    });
    return { list: response.data.list || [], total: response.data.total ?? 0 };
  }

  async sendEmail(emailData: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.http.post('/Email', {
      ...emailData,
      status: 'Sending'
    });
    return response.data;
  }

  async createAttachment(data: {
    name: string;
    type: string;
    role: string;
    relatedType?: string;
    relatedId?: string;
    parentType?: string;
    field?: string;
    file: string;
  }): Promise<Record<string, any>> {
    let response = await this.http.post('/Attachment', data);
    return response.data;
  }

  async getAttachment(attachmentId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/Attachment/${attachmentId}`);
    return response.data;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.http.delete(`/Attachment/${attachmentId}`);
  }

  getAttachmentDownload(attachmentId: string): {
    url: string;
    headers: Record<string, string>;
  } {
    let headers: Record<string, string> =
      this.authConfig.authMethod === 'basic'
        ? { 'Espo-Authorization': this.authConfig.token }
        : { 'X-Api-Key': this.authConfig.token };
    return {
      url: `${this.siteUrl}/api/v1/Attachment/file/${encodeURIComponent(attachmentId)}`,
      headers
    };
  }

  async getAttachmentFile(
    attachmentId: string
  ): Promise<{ content: ArrayBuffer; mimeType?: string }> {
    let response = await this.http.get<ArrayBuffer>(
      `/Attachment/file/${encodeURIComponent(attachmentId)}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return {
      content: response.data,
      mimeType: getResponseHeaderValue(response.headers, 'content-type')
    };
  }

  async generatePdf(
    entityType: string,
    entityId: string,
    templateId: string
  ): Promise<Record<string, any>> {
    let response = await this.http.post('/Pdf/action/massPrint', {
      entityType,
      idList: [entityId],
      templateId
    });
    return response.data;
  }

  async postNote(
    entityType: string,
    recordId: string,
    post: string
  ): Promise<Record<string, any>> {
    let response = await this.http.post('/Note', {
      type: 'Post',
      parentType: entityType,
      parentId: recordId,
      post
    });
    return response.data;
  }

  async createWebhook(event: string, url: string): Promise<Record<string, any>> {
    let response = await this.http.post('/Webhook', { event, url });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/Webhook/${webhookId}`);
  }
}
