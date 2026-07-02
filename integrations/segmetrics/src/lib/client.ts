import { createAxios } from 'slates';

export class ImportClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; accountId: string; integrationId: string }) {
    this.axios = createAxios({
      baseURL: `https://import.segmetrics.io/api/v1/${config.accountId}/${config.integrationId}`,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Contacts ---

  async upsertContact(contact: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/contact', contact);
    return response.data;
  }

  async deleteContact(contactIdOrEmail: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/contact/${encodeURIComponent(contactIdOrEmail)}`);
    return response.data;
  }

  // --- Tags ---

  async addTags(params: {
    contactId?: string;
    email?: string;
    tags: unknown[];
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { tags: params.tags };
    if (params.contactId) body.contact_id = params.contactId;
    if (params.email) body.email = params.email;
    let response = await this.axios.post('/tags/add', body);
    return response.data;
  }

  async removeTags(params: {
    contactId?: string;
    email?: string;
    tags: unknown[];
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { tags: params.tags };
    if (params.contactId) body.contact_id = params.contactId;
    if (params.email) body.email = params.email;
    let response = await this.axios.post('/tags/remove', body);
    return response.data;
  }

  // --- Invoices / Orders ---

  async upsertInvoice(invoice: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/invoice', invoice);
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/invoice/${encodeURIComponent(invoiceId)}`);
    return response.data;
  }

  // --- Subscriptions ---

  async upsertSubscription(
    subscription: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/subscription', subscription);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/subscription/${encodeURIComponent(subscriptionId)}`
    );
    return response.data;
  }

  // --- Products ---

  async upsertProduct(product: {
    id: string;
    name: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/product', product);
    return response.data;
  }

  // --- Ad Performance ---

  async recordAdPerformance(
    adPerformance: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/ad/performance', adPerformance);
    return response.data;
  }
}

export class ReportingClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; accountId: string }) {
    this.axios = createAxios({
      baseURL: `https://api.segmetrics.io/${config.accountId}`,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Reports ---

  async getReport(params: {
    reportType: string;
    reportId: string;
    start?: string;
    end?: string;
    scale?: string;
  }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.scale) queryParams.scale = params.scale;

    let response = await this.axios.get(`/report/${params.reportType}/${params.reportId}`, {
      params: queryParams
    });
    return response.data;
  }

  // --- Customer Journey ---

  async getReportContacts(params: {
    reportType: string;
    reportId: string;
    start?: string;
    end?: string;
    extend?: string[];
    page?: number;
  }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.extend && params.extend.length > 0)
      queryParams.extend = params.extend.join(',');
    if (params.page) queryParams.page = String(params.page);

    let response = await this.axios.get(
      `/report/${params.reportType}/${params.reportId}/contacts`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  // --- Contact ---

  async getContact(params: {
    contactIdOrEmail: string;
    extend?: string[];
  }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params.extend && params.extend.length > 0)
      queryParams.extend = params.extend.join(',');

    let response = await this.axios.get(
      `/contact/${encodeURIComponent(params.contactIdOrEmail)}`,
      {
        params: queryParams
      }
    );
    return response.data;
  }
}

export class TrackingClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { accountId: string }) {
    this.axios = createAxios({
      baseURL: 'https://track.segmetrics.io'
    });
    this.accountId = config.accountId;
  }

  private accountId: string;

  async identifyVisitor(params: {
    segUid: string;
    email: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/identify', {
      params: {
        account_id: this.accountId,
        seg_uid: params.segUid,
        email: params.email
      }
    });
    return response.data;
  }
}
