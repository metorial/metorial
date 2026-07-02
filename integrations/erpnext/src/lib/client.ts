import { createAxios } from 'slates';

export interface ClientConfig {
  siteUrl: string;
  token: string;
}

export interface ListParams {
  doctype: string;
  fields?: string[];
  filters?: Record<string, any> | any[][];
  orFilters?: Record<string, any> | any[][];
  orderBy?: string;
  limitPageLength?: number;
  limitStart?: number;
}

export interface DocumentData {
  [key: string]: any;
}

export interface WebhookConfig {
  webhookDoctype: string;
  webhookDoctypeEvent: string;
  requestUrl: string;
  requestStructure?: string;
  webhookHeaders?: { key: string; value: string }[];
  webhookSecret?: string;
  condition?: string;
  enabled?: boolean;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let siteUrl = config.siteUrl.replace(/\/+$/, '');
    let isSessionToken = !config.token.includes(':') && !config.token.startsWith('ey');
    let authHeader = isSessionToken
      ? undefined
      : config.token.includes(':')
        ? `token ${config.token}`
        : `Bearer ${config.token}`;

    this.http = createAxios({
      baseURL: siteUrl,
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(isSessionToken ? { Cookie: `sid=${config.token}` } : {}),
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Document CRUD ---

  async getDocument(doctype: string, name: string, fields?: string[]): Promise<DocumentData> {
    let params: Record<string, string> = {};
    if (fields && fields.length > 0) {
      params.fields = JSON.stringify(fields);
    }
    let response = await this.http.get(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { params }
    );
    return response.data.data;
  }

  async listDocuments(params: ListParams): Promise<DocumentData[]> {
    let queryParams: Record<string, string> = {};
    if (params.fields && params.fields.length > 0) {
      queryParams.fields = JSON.stringify(params.fields);
    }
    if (params.filters) {
      queryParams.filters = JSON.stringify(params.filters);
    }
    if (params.orFilters) {
      queryParams.or_filters = JSON.stringify(params.orFilters);
    }
    if (params.orderBy) {
      queryParams.order_by = params.orderBy;
    }
    if (params.limitPageLength !== undefined) {
      queryParams.limit_page_length = String(params.limitPageLength);
    }
    if (params.limitStart !== undefined) {
      queryParams.limit_start = String(params.limitStart);
    }
    let response = await this.http.get(`/api/resource/${encodeURIComponent(params.doctype)}`, {
      params: queryParams
    });
    return response.data.data;
  }

  async createDocument(doctype: string, data: DocumentData): Promise<DocumentData> {
    let response = await this.http.post(`/api/resource/${encodeURIComponent(doctype)}`, data);
    return response.data.data;
  }

  async updateDocument(
    doctype: string,
    name: string,
    data: DocumentData
  ): Promise<DocumentData> {
    let response = await this.http.put(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      data
    );
    return response.data.data;
  }

  async deleteDocument(doctype: string, name: string): Promise<void> {
    await this.http.delete(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );
  }

  // --- Document Workflow ---

  async submitDocument(doctype: string, name: string): Promise<DocumentData> {
    let response = await this.http.put(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { docstatus: 1 }
    );
    return response.data.data;
  }

  async cancelDocument(doctype: string, name: string): Promise<DocumentData> {
    let response = await this.http.put(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { docstatus: 2 }
    );
    return response.data.data;
  }

  async amendDocument(
    doctype: string,
    name: string,
    data?: DocumentData
  ): Promise<DocumentData> {
    let original = await this.getDocument(doctype, name);
    let newDoc: DocumentData = { ...original, ...data };
    newDoc.name = undefined;
    newDoc.amended_from = name;
    newDoc.docstatus = 0;
    let response = await this.http.post(
      `/api/resource/${encodeURIComponent(doctype)}`,
      newDoc
    );
    return response.data.data;
  }

  // --- Remote Method Calls ---

  async callMethod(method: string, params?: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/api/method/${method}`, params || {});
    return response.data;
  }

  async callGetMethod(method: string, params?: Record<string, any>): Promise<any> {
    let response = await this.http.get(`/api/method/${method}`, { params: params || {} });
    return response.data;
  }

  // --- Count ---

  async getCount(doctype: string, filters?: Record<string, any> | any[][]): Promise<number> {
    let params: Record<string, string> = { doctype };
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    let response = await this.http.get('/api/method/frappe.client.get_count', { params });
    return response.data.message;
  }

  // --- Webhook Management ---

  async createWebhook(config: WebhookConfig): Promise<DocumentData> {
    let data: DocumentData = {
      webhook_doctype: config.webhookDoctype,
      webhook_docevent: config.webhookDoctypeEvent,
      request_url: config.requestUrl,
      request_structure: config.requestStructure || 'Form URL-Encoded',
      enabled: config.enabled !== false ? 1 : 0
    };
    if (config.condition) {
      data.condition = config.condition;
    }
    if (config.webhookSecret) {
      data.webhook_secret = config.webhookSecret;
    }
    if (config.webhookHeaders && config.webhookHeaders.length > 0) {
      data.webhook_headers = config.webhookHeaders.map(h => ({
        key: h.key,
        value: h.value
      }));
    }
    return await this.createDocument('Webhook', data);
  }

  async deleteWebhook(webhookName: string): Promise<void> {
    await this.deleteDocument('Webhook', webhookName);
  }

  async getReportData(reportName: string, filters?: Record<string, any>): Promise<any> {
    let params: Record<string, string> = { report_name: reportName };
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    let response = await this.http.get('/api/method/frappe.desk.query_report.run', { params });
    return response.data.message;
  }
}
