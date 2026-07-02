import { createAxios } from 'slates';
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

  constructor(config: ClientConfig) {
    let siteUrl = config.siteUrl.replace(/\/+$/, '');
    this.authConfig = config.auth;

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
    let queryParams: Record<string, any> = {};

    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.maxSize !== undefined) queryParams.maxSize = params.maxSize;
    if (params.select && params.select.length > 0)
      queryParams.select = params.select.join(',');
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.order) queryParams.order = params.order;
    if (params.textFilter) queryParams.q = params.textFilter;

    if (params.where && params.where.length > 0) {
      for (let i = 0; i < params.where.length; i++) {
        let clause = params.where[i]!;
        queryParams[`where[${i}][type]`] = clause.type;
        if (clause.attribute) queryParams[`where[${i}][attribute]`] = clause.attribute;
        if (clause.value !== undefined) queryParams[`where[${i}][value]`] = clause.value;
      }
    }

    let response = await this.http.get(`/${entityType}`, { params: queryParams });
    return {
      list: response.data.list || [],
      total: response.data.total || 0
    };
  }

  async getRelatedRecords(
    entityType: string,
    recordId: string,
    linkName: string,
    params: ListParams = {}
  ): Promise<ListResponse> {
    let queryParams: Record<string, any> = {};
    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.maxSize !== undefined) queryParams.maxSize = params.maxSize;
    if (params.select && params.select.length > 0)
      queryParams.select = params.select.join(',');
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.order) queryParams.order = params.order;

    let response = await this.http.get(`/${entityType}/${recordId}/${linkName}`, {
      params: queryParams
    });
    return {
      list: response.data.list || [],
      total: response.data.total || 0
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

  async generatePdf(
    entityType: string,
    entityId: string,
    templateId: string
  ): Promise<Record<string, any>> {
    let response = await this.http.post(`/${entityType}/action/getPdf`, {
      id: entityId,
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
