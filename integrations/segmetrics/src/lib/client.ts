import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let createSegMetricsClient = (baseURL: string, token?: string) => {
  let client = createAuthenticatedAxios({
    baseURL,
    timeout: 30_000,
    authHeader: token === undefined ? undefined : { value: token },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'SegMetrics',
        reason: 'segmetrics_api_error'
      })
  });
  client.interceptors.response.use(response => {
    if (isApiErrorRecord(response.data) && response.data.status === 'error') {
      throw buildApiServiceError(
        { response: { data: response.data, status: response.status } },
        { providerLabel: 'SegMetrics', reason: 'segmetrics_api_error' }
      );
    }
    return response;
  });
  return client;
};

let validateContactSelector = (contactId: unknown, email: unknown) => {
  if (
    !(typeof contactId === 'string' && contactId.trim()) &&
    !(typeof email === 'string' && email.trim())
  ) {
    throw createApiServiceError('Provide either contactId or email to identify the contact.');
  }
};

export class ImportClient {
  private axios: ReturnType<typeof createSegMetricsClient>;

  constructor(config: { token: string; accountId: string; integrationId: string }) {
    this.axios = createSegMetricsClient(
      `https://import.segmetrics.io/api/v1/${encodeURIComponent(config.accountId)}/${encodeURIComponent(config.integrationId)}`,
      config.token
    );
  }

  async upsertContact(contact: Record<string, unknown>): Promise<Record<string, unknown>> {
    validateContactSelector(contact.contact_id, contact.email);
    let response = await this.axios.post('/contact', contact);
    return response.data;
  }

  async deleteContact(contactIdOrEmail: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/contact/${encodeURIComponent(contactIdOrEmail)}`);
    return response.data;
  }

  private async updateTags(
    action: 'add' | 'remove',
    params: { contactId?: string; email?: string; tags: unknown[] }
  ): Promise<Record<string, unknown>> {
    validateContactSelector(params.contactId, params.email);
    if (
      params.tags.length === 0 ||
      params.tags.some(tag =>
        typeof tag === 'string'
          ? !tag.trim()
          : !isApiErrorRecord(tag) ||
            !(
              (typeof tag.id === 'string' && tag.id.trim()) ||
              (typeof tag.name === 'string' && tag.name.trim())
            )
      )
    ) {
      throw createApiServiceError('Provide at least one tag, with a nonempty ID or name.');
    }
    let response = await this.axios.post(
      `/tags/${action}`,
      pickDefined({ contact_id: params.contactId, email: params.email, tags: params.tags })
    );
    return response.data;
  }

  async addTags(params: { contactId?: string; email?: string; tags: unknown[] }) {
    return this.updateTags('add', params);
  }

  async removeTags(params: { contactId?: string; email?: string; tags: unknown[] }) {
    return this.updateTags('remove', params);
  }

  async upsertInvoice(invoice: Record<string, unknown>): Promise<Record<string, unknown>> {
    validateContactSelector(invoice.contact_id, invoice.email);
    if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
      throw createApiServiceError('Provide at least one order line item.');
    }
    for (let item of invoice.items) {
      if (
        !isApiErrorRecord(item) ||
        typeof item.product_id !== 'string' ||
        !item.product_id.trim()
      ) {
        throw createApiServiceError('Each order line item requires productId.');
      }
    }
    let response = await this.axios.post('/invoice', invoice);
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/invoice/${encodeURIComponent(invoiceId)}`);
    return response.data;
  }

  async upsertSubscription(
    subscription: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    validateContactSelector(subscription.contact_id, subscription.email);
    if (
      typeof subscription.last_bill_date !== 'string' ||
      !subscription.last_bill_date.trim()
    ) {
      throw createApiServiceError('Provide lastBillDate, the last subscription billing date.');
    }
    if (
      typeof subscription.frequency !== 'number' ||
      !Number.isInteger(subscription.frequency) ||
      subscription.frequency < 1
    ) {
      throw createApiServiceError('Subscription frequency must be a positive whole number.');
    }
    let response = await this.axios.post('/subscription', subscription);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/subscription/${encodeURIComponent(subscriptionId)}`
    );
    return response.data;
  }

  async upsertProduct(product: {
    id: string;
    name: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/product', product);
    return response.data;
  }

  async recordAdPerformance(
    adPerformance: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/ad/performance', adPerformance);
    return response.data;
  }
}

export class ReportingClient {
  private axios: ReturnType<typeof createSegMetricsClient>;
  private queryAxios: ReturnType<typeof createSegMetricsClient>;

  constructor(config: { token: string; accountId: string }) {
    let accountId = encodeURIComponent(config.accountId);
    this.axios = createSegMetricsClient(
      `https://api.segmetrics.io/${accountId}`,
      config.token
    );
    this.queryAxios = createSegMetricsClient(
      `https://api.segmetrics.io/v2/${accountId}`,
      config.token
    );
  }

  async getReport(params: {
    reportType: string;
    reportId?: string;
    start?: string;
    end?: string;
    scale?: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/report/${encodeURIComponent(params.reportType)}${params.reportId ? `/${encodeURIComponent(params.reportId)}` : ''}`,
      { params: pickDefined({ start: params.start, end: params.end, scale: params.scale }) }
    );
    return response.data;
  }

  async getReportContacts(params: {
    reportType: string;
    reportId?: string;
    start?: string;
    end?: string;
    extend?: string[];
    page?: number;
    limit?: number;
  }): Promise<Record<string, unknown>> {
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      throw createApiServiceError('page must be a positive whole number.');
    }
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 100.');
    }
    let response = await this.axios.get(
      `/report/${encodeURIComponent(params.reportType)}${params.reportId ? `/${encodeURIComponent(params.reportId)}` : ''}/contacts`,
      {
        params: pickDefined({
          start: params.start,
          end: params.end,
          extend: params.extend?.join(','),
          page: params.page,
          limit: params.limit
        })
      }
    );
    return response.data;
  }

  async getContact(params: {
    contactIdOrEmail: string;
    extend?: string[];
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/contact/${encodeURIComponent(params.contactIdOrEmail)}`,
      { params: pickDefined({ extend: params.extend?.join(',') }) }
    );
    return response.data;
  }

  async runReportQuery(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.queryAxios.post('/data/query', query);
    return response.data;
  }
}

export class TrackingClient {
  private axios = createSegMetricsClient('https://track.segmetrics.io');

  constructor(private config: { accountId: string }) {}

  async identifyVisitor(params: {
    segUid?: string;
    email?: string;
    contactId?: string;
  }): Promise<unknown> {
    validateContactSelector(params.contactId, params.email);
    let response = await this.axios.get('/identify', {
      params: pickDefined({
        a: this.config.accountId,
        uid: params.segUid,
        e: params.email,
        cid: params.contactId
      })
    });
    return response.data;
  }
}
