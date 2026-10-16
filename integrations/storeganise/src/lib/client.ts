import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: { token: string; subdomain: string }) {
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(params.subdomain)) {
      throw createApiServiceError(
        'Enter the Storeganise business code only, without a URL or path.'
      );
    }
    if (!params.token.trim()) {
      throw createApiServiceError('A Storeganise API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${params.subdomain}.storeganise.com/api/v1`,
      authHeader: { value: `ApiKey ${params.token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Storeganise',
          reason: 'storeganise_api_error',
          nestedKeys: ['error', 'errors'],
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    });
  }

  // ---- Sites ----

  async listSites(params?: { search?: string }): Promise<any[]> {
    let response = await this.axios.get('/admin/sites', { params });
    return response.data;
  }

  async getSite(siteIdOrCode: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/sites/${encodeURIComponent(siteIdOrCode)}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  // ---- Units ----

  async listUnits(params?: {
    siteId?: string;
    state?: string;
    search?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
    include?: string;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/units', { params });
    return response.data;
  }

  async getUnit(unitId: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/units/${encodeURIComponent(unitId)}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async updateUnit(unitId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/units/${encodeURIComponent(unitId)}`, data);
    return response.data;
  }

  // ---- Users ----

  async listUsers(params?: {
    search?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
    include?: string;
    ids?: string;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/users', { params });
    return response.data;
  }

  async getUser(userIdOrEmail: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/users/${encodeURIComponent(userIdOrEmail)}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createUser(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/users/${encodeURIComponent(userId)}`, data);
    return response.data;
  }

  // ---- Invoices ----

  async listInvoices(params?: {
    ids?: string;
    userId?: string;
    state?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
    include?: string;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/invoices', { params });
    return response.data;
  }

  async getInvoice(invoiceId: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/invoices/${encodeURIComponent(invoiceId)}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/admin/invoices/${encodeURIComponent(invoiceId)}`,
      data
    );
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.axios.delete(`/admin/invoices/${encodeURIComponent(invoiceId)}`);
  }

  async addInvoicePayment(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/admin/invoices/${encodeURIComponent(invoiceId)}/payments`,
      data
    );
    return response.data;
  }

  async addInvoiceComment(invoiceId: string, comment: string): Promise<any> {
    let response = await this.axios.post(
      `/admin/invoices/${encodeURIComponent(invoiceId)}/history`,
      { comment }
    );
    return response.data;
  }

  // ---- Unit Rentals ----

  async listUnitRentals(params?: {
    siteId?: string;
    userId?: string;
    state?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
    include?: string;
  }): Promise<any[]> {
    let { userId, ...filters } = params ?? {};
    let response = await this.axios.get('/admin/unit-rentals', {
      params: { ...filters, ownerId: userId }
    });
    return response.data;
  }

  async getUnitRental(rentalId: string, include?: string): Promise<any> {
    let response = await this.axios.get(
      `/admin/unit-rentals/${encodeURIComponent(rentalId)}`,
      {
        params: include ? { include } : undefined
      }
    );
    return response.data;
  }

  async updateUnitRental(rentalId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/admin/unit-rentals/${encodeURIComponent(rentalId)}`,
      data
    );
    return response.data;
  }

  // ---- Move-In Jobs ----

  async listMoveInJobs(params?: {
    siteId?: string;
    state?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/jobs/unit-move-ins', { params });
    return response.data;
  }

  async getMoveInJob(jobId: string, include?: string): Promise<any> {
    let response = await this.axios.get(
      `/admin/jobs/unit-move-ins/${encodeURIComponent(jobId)}`,
      {
        params: include ? { include } : undefined
      }
    );
    return response.data;
  }

  async createMoveInJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/jobs/unit-move-ins', data);
    return response.data;
  }

  async confirmMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(
      `/admin/jobs/unit-move-ins/${encodeURIComponent(jobId)}/confirm`
    );
    return response.data;
  }

  async completeMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(
      `/admin/jobs/unit-move-ins/${encodeURIComponent(jobId)}/complete`
    );
    return response.data;
  }

  async cancelMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(
      `/admin/jobs/unit-move-ins/${encodeURIComponent(jobId)}/cancel`
    );
    return response.data;
  }

  // ---- Move-Out Jobs ----

  async listMoveOutJobs(params?: {
    siteId?: string;
    state?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/jobs/unit-move-outs', { params });
    return response.data;
  }

  async getMoveOutJob(jobId: string, include?: string): Promise<any> {
    let response = await this.axios.get(
      `/admin/jobs/unit-move-outs/${encodeURIComponent(jobId)}`,
      {
        params: include ? { include } : undefined
      }
    );
    return response.data;
  }

  async createMoveOutJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/jobs/unit-move-outs', data);
    return response.data;
  }

  async completeMoveOutJob(jobId: string): Promise<any> {
    let response = await this.axios.put(
      `/admin/jobs/unit-move-outs/${encodeURIComponent(jobId)}/complete`
    );
    return response.data;
  }

  async cancelMoveOutJob(jobId: string): Promise<any> {
    let response = await this.axios.put(
      `/admin/jobs/unit-move-outs/${encodeURIComponent(jobId)}/cancel`
    );
    return response.data;
  }

  // ---- Valet Orders ----

  async listValetOrders(params?: {
    state?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
    include?: string;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/valet-orders', { params });
    return response.data;
  }

  async getValetOrder(orderId: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/valet-orders/${encodeURIComponent(orderId)}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async updateValetOrder(orderId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/admin/valet-orders/${encodeURIComponent(orderId)}`,
      data
    );
    return response.data;
  }

  async updateValetOrderStep(
    orderId: string,
    stepId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/admin/valet-orders/${encodeURIComponent(orderId)}/steps/${encodeURIComponent(stepId)}`,
      data
    );
    return response.data;
  }

  // ---- Leads ----

  async listLeads(params?: {
    search?: string;
    updatedAfter?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let response = await this.axios.get('/admin/leads', { params });
    return response.data;
  }

  async getLead(leadId: string): Promise<any> {
    let response = await this.axios.get(`/admin/leads/${encodeURIComponent(leadId)}`);
    return response.data;
  }

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/leads', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/leads/${encodeURIComponent(leadId)}`, data);
    return response.data;
  }

  // ---- Settings ----

  async getSettings(): Promise<any> {
    let response = await this.axios.get('/admin/settings');
    return response.data;
  }

  // ---- Items (Valet) ----

  async updateItems(data: {
    command: string;
    itemSids: string[];
    data: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.put('/admin/items', data);
    return response.data;
  }

  // ---- User History / Comments ----

  async addUserComment(userId: string, comment: string): Promise<any> {
    let response = await this.axios.post(
      `/admin/users/${encodeURIComponent(userId)}/history`,
      { comment }
    );
    return response.data;
  }

  // ---- Unit Tasks ----

  async addUnitTask(unitId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/admin/units/${encodeURIComponent(unitId)}/tasks`,
      data
    );
    return response.data;
  }
}
