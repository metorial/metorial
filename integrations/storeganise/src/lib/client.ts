import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: { token: string; subdomain: string }) {
    this.axios = createAxios({
      baseURL: `https://${params.subdomain}.storeganise.com/api/v1`,
      headers: {
        Authorization: `ApiKey ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Sites ----

  async listSites(params?: { search?: string }): Promise<any[]> {
    let response = await this.axios.get('/admin/sites', { params });
    return response.data;
  }

  async getSite(siteIdOrCode: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/sites/${siteIdOrCode}`, {
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
    let response = await this.axios.get(`/admin/units/${unitId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async updateUnit(unitId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/units/${unitId}`, data);
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
    let response = await this.axios.get(`/admin/users/${userIdOrEmail}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createUser(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  // ---- Invoices ----

  async listInvoices(params?: {
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
    let response = await this.axios.get(`/admin/invoices/${invoiceId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createInvoice(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/invoices', data);
    return response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/invoices/${invoiceId}`, data);
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.axios.delete(`/admin/invoices/${invoiceId}`);
  }

  async addInvoicePayment(invoiceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/admin/invoices/${invoiceId}/payments`, data);
    return response.data;
  }

  async addInvoiceComment(invoiceId: string, comment: string): Promise<any> {
    let response = await this.axios.post(`/admin/invoices/${invoiceId}/history`, { comment });
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
    let response = await this.axios.get('/admin/unit-rentals', { params });
    return response.data;
  }

  async getUnitRental(rentalId: string, include?: string): Promise<any> {
    let response = await this.axios.get(`/admin/unit-rentals/${rentalId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async updateUnitRental(rentalId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/unit-rentals/${rentalId}`, data);
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
    let response = await this.axios.get(`/admin/jobs/unit-move-ins/${jobId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createMoveInJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/jobs/unit-move-ins', data);
    return response.data;
  }

  async confirmMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(`/admin/jobs/unit-move-ins/${jobId}/confirm`);
    return response.data;
  }

  async completeMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(`/admin/jobs/unit-move-ins/${jobId}/complete`);
    return response.data;
  }

  async cancelMoveInJob(jobId: string): Promise<any> {
    let response = await this.axios.put(`/admin/jobs/unit-move-ins/${jobId}/cancel`);
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
    let response = await this.axios.get(`/admin/jobs/unit-move-outs/${jobId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async createMoveOutJob(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/jobs/unit-move-outs', data);
    return response.data;
  }

  async completeMoveOutJob(jobId: string): Promise<any> {
    let response = await this.axios.put(`/admin/jobs/unit-move-outs/${jobId}/complete`);
    return response.data;
  }

  async cancelMoveOutJob(jobId: string): Promise<any> {
    let response = await this.axios.put(`/admin/jobs/unit-move-outs/${jobId}/cancel`);
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
    let response = await this.axios.get(`/admin/valet-orders/${orderId}`, {
      params: include ? { include } : undefined
    });
    return response.data;
  }

  async updateValetOrder(orderId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/valet-orders/${orderId}`, data);
    return response.data;
  }

  async updateValetOrderStep(
    orderId: string,
    stepId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/admin/valet-orders/${orderId}/steps/${stepId}`,
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
    let response = await this.axios.get(`/admin/leads/${leadId}`);
    return response.data;
  }

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/admin/leads', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/admin/leads/${leadId}`, data);
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
    let response = await this.axios.post(`/admin/users/${userId}/history`, { comment });
    return response.data;
  }

  // ---- Unit Tasks ----

  async addUnitTask(unitId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/admin/units/${unitId}/tasks`, data);
    return response.data;
  }
}
