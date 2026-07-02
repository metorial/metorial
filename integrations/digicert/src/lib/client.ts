import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  certcentral: 'https://www.digicert.com/services/v2',
  certcentral_eu: 'https://www.digicert.com/services/v2'
};

export class CertCentralClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string; platform: string }) {
    let baseURL = BASE_URLS[opts.platform] || BASE_URLS.certcentral;

    this.axios = createAxios({
      baseURL,
      headers: {
        'X-DC-DEVKEY': opts.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Orders ──────────────────────────────────────────────

  async listOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
    productNameId?: string;
    commonName?: string;
  }): Promise<any> {
    let res = await this.axios.get('/order/certificate', { params });
    return res.data;
  }

  async getOrder(orderId: string): Promise<any> {
    let res = await this.axios.get(`/order/certificate/${orderId}`);
    return res.data;
  }

  async orderCertificate(productType: string, body: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/order/certificate/${productType}`, body);
    return res.data;
  }

  async reissueCertificate(orderId: string, body: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/order/certificate/${orderId}/reissue`, body);
    return res.data;
  }

  async duplicateCertificate(orderId: string, body: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/order/certificate/${orderId}/duplicate`, body);
    return res.data;
  }

  async revokeCertificate(
    certificateId: string,
    body: {
      comments?: string;
      skip_approval?: boolean;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/certificate/${certificateId}/revoke`, body);
    return res.data;
  }

  async downloadCertificate(certificateId: string, format: string = 'pem_all'): Promise<any> {
    let res = await this.axios.get(`/certificate/${certificateId}/download/format/${format}`, {
      responseType: format === 'pem_all' ? 'text' : 'arraybuffer'
    });
    return res.data;
  }

  async getCertificate(certificateId: string): Promise<any> {
    let res = await this.axios.get(`/certificate/${certificateId}`);
    return res.data;
  }

  async addOrderNote(orderId: string, note: string): Promise<any> {
    let res = await this.axios.put(`/order/certificate/${orderId}/note`, { note });
    return res.data;
  }

  async cancelOrder(orderId: string, note?: string): Promise<any> {
    let body: Record<string, any> = { status: 'canceled' };
    if (note) {
      body.note = note;
    }
    let res = await this.axios.put(`/order/certificate/${orderId}/status`, body);
    return res.data;
  }

  // ── Domains ─────────────────────────────────────────────

  async listDomains(params?: {
    offset?: number;
    limit?: number;
    container_id?: number;
    include_validation?: boolean;
  }): Promise<any> {
    let res = await this.axios.get('/domain', { params });
    return res.data;
  }

  async getDomain(
    domainId: string,
    params?: {
      include_validation?: boolean;
      include_dcv?: boolean;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/domain/${domainId}`, { params });
    return res.data;
  }

  async addDomain(body: {
    name: string;
    organization: { id: number };
    validations?: Array<{ type: string }>;
    dcv_method?: string;
  }): Promise<any> {
    let res = await this.axios.post('/domain', body);
    return res.data;
  }

  async activateDomain(domainId: string): Promise<any> {
    let res = await this.axios.put(`/domain/${domainId}/activate`);
    return res.data;
  }

  async deactivateDomain(domainId: string): Promise<any> {
    let res = await this.axios.put(`/domain/${domainId}/deactivate`);
    return res.data;
  }

  async submitDomainForValidation(
    domainId: string,
    body: {
      dcv_method: string;
      order_id?: number;
    }
  ): Promise<any> {
    let res = await this.axios.put(`/domain/${domainId}/dcv`, body);
    return res.data;
  }

  async checkDomainDcv(domainId: string): Promise<any> {
    let res = await this.axios.put(`/domain/${domainId}/dcv/cname`);
    return res.data;
  }

  // ── Organizations ───────────────────────────────────────

  async listOrganizations(params?: {
    offset?: number;
    limit?: number;
    include_validation?: boolean;
  }): Promise<any> {
    let res = await this.axios.get('/organization', { params });
    return res.data;
  }

  async getOrganization(
    organizationId: string,
    params?: {
      include_validation?: boolean;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/organization/${organizationId}`, { params });
    return res.data;
  }

  async createOrganization(body: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/organization', body);
    return res.data;
  }

  async updateOrganization(organizationId: string, body: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/organization/${organizationId}`, body);
    return res.data;
  }

  async submitOrganizationForValidation(
    organizationId: string,
    body: {
      validations: Array<{ type: string }>;
    }
  ): Promise<any> {
    let res = await this.axios.post(`/organization/${organizationId}/validation`, body);
    return res.data;
  }

  // ── Products ────────────────────────────────────────────

  async listProducts(params?: { container_id?: number }): Promise<any> {
    let res = await this.axios.get('/product', { params });
    return res.data;
  }

  async getProduct(productNameId: string): Promise<any> {
    let res = await this.axios.get(`/product/${productNameId}`);
    return res.data;
  }

  // ── Requests ────────────────────────────────────────────

  async listRequests(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<any> {
    let res = await this.axios.get('/request', { params });
    return res.data;
  }

  async getRequest(requestId: string): Promise<any> {
    let res = await this.axios.get(`/request/${requestId}`);
    return res.data;
  }

  async updateRequestStatus(
    requestId: string,
    status: string,
    processorComment?: string
  ): Promise<any> {
    let body: Record<string, any> = { status };
    if (processorComment) {
      body.processor_comment = processorComment;
    }
    let res = await this.axios.put(`/request/${requestId}/status`, body);
    return res.data;
  }

  // ── Users ───────────────────────────────────────────────

  async getMyUser(): Promise<any> {
    let res = await this.axios.get('/user/me');
    return res.data;
  }

  // ── Webhooks ────────────────────────────────────────────

  async listWebhooks(): Promise<any> {
    let res = await this.axios.get('/webhook');
    return res.data;
  }

  async createWebhook(body: {
    url: string;
    event_types: string[];
    secret_key?: string;
    include_cert_chain?: boolean;
    send_immediately?: boolean;
  }): Promise<any> {
    let res = await this.axios.post('/webhook', body);
    return res.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let res = await this.axios.get(`/webhook/${webhookId}`);
    return res.data;
  }

  async updateWebhook(webhookId: string, body: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/webhook/${webhookId}`, body);
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let res = await this.axios.delete(`/webhook/${webhookId}`);
    return res.data;
  }

  async activateWebhook(webhookId: string): Promise<any> {
    let res = await this.axios.put(`/webhook/${webhookId}/activate`);
    return res.data;
  }

  async deactivateWebhook(webhookId: string): Promise<any> {
    let res = await this.axios.put(`/webhook/${webhookId}/deactivate`);
    return res.data;
  }
}
