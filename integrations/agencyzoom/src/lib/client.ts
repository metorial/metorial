import { AxiosHeaders } from 'axios';
import { createAxios } from 'slates';

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(authConfig: { token: string; apiKey?: string; apiSecret?: string }) {
    this.api = createAxios({
      baseURL: 'https://api.agencyzoom.com/v1/api'
    });

    this.api.interceptors.request.use(config => {
      const headers = AxiosHeaders.from(config.headers);

      if (authConfig.token) {
        headers.set('Authorization', `Bearer ${authConfig.token}`);
      }
      if (authConfig.apiKey) {
        headers.set('X-Api-Key', authConfig.apiKey);
      }
      if (authConfig.apiSecret) {
        headers.set('X-Api-Secret', authConfig.apiSecret);
      }
      config.headers = headers;
      return config;
    });
  }

  // ─── Leads ───────────────────────────────────────────────────────

  async searchLeads(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/leads', { params });
    return response.data;
  }

  async getLead(leadId: string): Promise<any> {
    let response = await this.api.get(`/leads/${leadId}`);
    return response.data;
  }

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/leads', data);
    return response.data;
  }

  async createBusinessLead(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/leads/business', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/leads/${leadId}`, data);
    return response.data;
  }

  async deleteLead(leadId: string): Promise<any> {
    let response = await this.api.delete(`/leads/${leadId}`);
    return response.data;
  }

  async changeLeadStatus(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/leads/${leadId}/status`, data);
    return response.data;
  }

  async markLeadSold(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/leads/${leadId}/sold`, data);
    return response.data;
  }

  async addLeadNote(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/leads/${leadId}/notes`, data);
    return response.data;
  }

  async getLeadOpportunities(leadId: string): Promise<any> {
    let response = await this.api.get(`/leads/${leadId}/opportunities`);
    return response.data;
  }

  async addLeadOpportunity(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/leads/${leadId}/opportunities`, data);
    return response.data;
  }

  async updateLeadOpportunity(
    leadId: string,
    opportunityId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.put(`/leads/${leadId}/opportunities/${opportunityId}`, data);
    return response.data;
  }

  async deleteLeadOpportunity(leadId: string, opportunityId: string): Promise<any> {
    let response = await this.api.delete(`/leads/${leadId}/opportunities/${opportunityId}`);
    return response.data;
  }

  async getLeadQuotes(leadId: string): Promise<any> {
    let response = await this.api.get(`/leads/${leadId}/quotes`);
    return response.data;
  }

  async addLeadQuote(leadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/leads/${leadId}/quotes`, data);
    return response.data;
  }

  async updateLeadQuote(
    leadId: string,
    quoteId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.put(`/leads/${leadId}/quotes/${quoteId}`, data);
    return response.data;
  }

  async deleteLeadQuote(leadId: string, quoteId: string): Promise<any> {
    let response = await this.api.delete(`/leads/${leadId}/quotes/${quoteId}`);
    return response.data;
  }

  async searchLeadFiles(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/leads/files', data);
    return response.data;
  }

  // ─── Customers ───────────────────────────────────────────────────

  async searchCustomers(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/customers', { params });
    return response.data;
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.api.get(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/customers', data);
    return response.data;
  }

  async updateCustomer(customerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/customers/${customerId}`, data);
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<any> {
    let response = await this.api.delete(`/customers/${customerId}`);
    return response.data;
  }

  async addCustomerNote(customerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/customers/${customerId}/notes`, data);
    return response.data;
  }

  async getCustomerPolicies(customerId: string): Promise<any> {
    let response = await this.api.get(`/customers/${customerId}/policies`);
    return response.data;
  }

  async getCustomerTasks(customerId: string): Promise<any> {
    let response = await this.api.get(`/customers/${customerId}/tasks`);
    return response.data;
  }

  async updateCustomerTags(customerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/customers/${customerId}/tags`, data);
    return response.data;
  }

  async deleteCustomerFile(customerId: string, fileId: string): Promise<any> {
    let response = await this.api.delete(`/customers/${customerId}/files/${fileId}`);
    return response.data;
  }

  // ─── Policies ────────────────────────────────────────────────────

  async createPolicy(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/policies', data);
    return response.data;
  }

  async updatePolicy(policyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/policies/${policyId}`, data);
    return response.data;
  }

  async updatePolicyStatus(policyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/policies/${policyId}/status`, data);
    return response.data;
  }

  async updatePolicyTags(policyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/policies/${policyId}/tags`, data);
    return response.data;
  }

  async createPolicyEndorsement(policyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/policies/${policyId}/endorsements`, data);
    return response.data;
  }

  async deletePolicy(policyId: string): Promise<any> {
    let response = await this.api.delete(`/policies/${policyId}`);
    return response.data;
  }

  // ─── Tasks ───────────────────────────────────────────────────────

  async searchTasks(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/tasks', { params });
    return response.data;
  }

  async getTask(taskId: string): Promise<any> {
    let response = await this.api.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<any> {
    let response = await this.api.delete(`/tasks/${taskId}`);
    return response.data;
  }

  async completeTask(taskId: string): Promise<any> {
    let response = await this.api.put(`/tasks/${taskId}/complete`);
    return response.data;
  }

  async reopenTask(taskId: string, data?: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/tasks/${taskId}/reopen`, data);
    return response.data;
  }

  async batchDeleteTasks(taskIds: string[]): Promise<any> {
    let response = await this.api.post('/tasks/batch-delete', { taskIds });
    return response.data;
  }

  // ─── Opportunities ──────────────────────────────────────────────

  async getOpportunity(opportunityId: string): Promise<any> {
    let response = await this.api.get(`/opportunities/${opportunityId}`);
    return response.data;
  }

  async createOpportunity(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/opportunities', data);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/opportunities/${opportunityId}`, data);
    return response.data;
  }

  async deleteOpportunity(opportunityId: string): Promise<any> {
    let response = await this.api.delete(`/opportunities/${opportunityId}`);
    return response.data;
  }

  async getOpportunityDrivers(opportunityId: string): Promise<any> {
    let response = await this.api.get(`/opportunities/${opportunityId}/drivers`);
    return response.data;
  }

  async createOpportunityDriver(
    opportunityId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(`/opportunities/${opportunityId}/drivers`, data);
    return response.data;
  }

  async updateOpportunityDriver(
    opportunityId: string,
    driverId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.put(
      `/opportunities/${opportunityId}/drivers/${driverId}`,
      data
    );
    return response.data;
  }

  async deleteOpportunityDriver(opportunityId: string, driverId: string): Promise<any> {
    let response = await this.api.delete(
      `/opportunities/${opportunityId}/drivers/${driverId}`
    );
    return response.data;
  }

  async getOpportunityVehicles(opportunityId: string): Promise<any> {
    let response = await this.api.get(`/opportunities/${opportunityId}/vehicles`);
    return response.data;
  }

  async createOpportunityVehicle(
    opportunityId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(`/opportunities/${opportunityId}/vehicles`, data);
    return response.data;
  }

  async updateOpportunityVehicle(
    opportunityId: string,
    vehicleId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.put(
      `/opportunities/${opportunityId}/vehicles/${vehicleId}`,
      data
    );
    return response.data;
  }

  async deleteOpportunityVehicle(opportunityId: string, vehicleId: string): Promise<any> {
    let response = await this.api.delete(
      `/opportunities/${opportunityId}/vehicles/${vehicleId}`
    );
    return response.data;
  }

  // ─── Service Tickets ─────────────────────────────────────────────

  async searchServiceTickets(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/service-tickets', { params });
    return response.data;
  }

  async createServiceTicket(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/service-tickets', data);
    return response.data;
  }

  async updateServiceTicket(ticketId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/service-tickets/${ticketId}`, data);
    return response.data;
  }

  async completeServiceTicket(ticketId: string, data?: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/service-tickets/${ticketId}/complete`, data);
    return response.data;
  }

  // ─── Contacts ────────────────────────────────────────────────────

  async batchCreateContacts(data: Record<string, any>[]): Promise<any> {
    let response = await this.api.post('/contacts/batch', data);
    return response.data;
  }

  // ─── Reference Data ──────────────────────────────────────────────

  async getCarriers(): Promise<any> {
    let response = await this.api.get('/carriers');
    return response.data;
  }

  async getProductLines(): Promise<any> {
    let response = await this.api.get('/product-lines');
    return response.data;
  }

  async getProductCategories(): Promise<any> {
    let response = await this.api.get('/product-categories');
    return response.data;
  }

  async getEmployees(): Promise<any> {
    let response = await this.api.get('/employees');
    return response.data;
  }

  async getLeadSources(): Promise<any> {
    let response = await this.api.get('/lead-sources');
    return response.data;
  }

  async getLeadSourceCategories(): Promise<any> {
    let response = await this.api.get('/lead-source-categories');
    return response.data;
  }

  async getLocations(): Promise<any> {
    let response = await this.api.get('/locations');
    return response.data;
  }

  async getLossReasons(): Promise<any> {
    let response = await this.api.get('/loss-reasons');
    return response.data;
  }

  async getCustomFields(): Promise<any> {
    let response = await this.api.get('/custom-fields');
    return response.data;
  }

  async getPipelines(): Promise<any> {
    let response = await this.api.get('/pipelines');
    return response.data;
  }

  async getPipelineStages(pipelineId: string): Promise<any> {
    let response = await this.api.get(`/pipelines/${pipelineId}/stages`);
    return response.data;
  }

  async getServiceCategories(): Promise<any> {
    let response = await this.api.get('/service-categories');
    return response.data;
  }

  async getServicePriorities(): Promise<any> {
    let response = await this.api.get('/service-priorities');
    return response.data;
  }

  async getServiceResolutions(): Promise<any> {
    let response = await this.api.get('/service-resolutions');
    return response.data;
  }

  async getAssignGroups(): Promise<any> {
    let response = await this.api.get('/assign-groups');
    return response.data;
  }

  async getCsrs(): Promise<any> {
    let response = await this.api.get('/csrs');
    return response.data;
  }

  async getBusinessClassifications(params?: Record<string, any>): Promise<any> {
    let response = await this.api.get('/business-classifications', { params });
    return response.data;
  }

  async getLifeProfessionals(): Promise<any> {
    let response = await this.api.get('/life-professionals');
    return response.data;
  }

  // ─── Email Threads ───────────────────────────────────────────────

  async searchEmailThreads(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/email-threads', { params });
    return response.data;
  }

  async getEmailThread(threadId: string): Promise<any> {
    let response = await this.api.get(`/email-threads/${threadId}`);
    return response.data;
  }

  async deleteEmailThread(threadId: string): Promise<any> {
    let response = await this.api.delete(`/email-threads/${threadId}`);
    return response.data;
  }

  async markEmailThreadUnread(threadId: string): Promise<any> {
    let response = await this.api.put(`/email-threads/${threadId}/unread`);
    return response.data;
  }

  // ─── SMS Threads ─────────────────────────────────────────────────

  async searchSmsThreads(params: Record<string, any> = {}): Promise<any> {
    let response = await this.api.get('/text-threads', { params });
    return response.data;
  }

  async deleteSmsThread(threadId: string): Promise<any> {
    let response = await this.api.delete(`/text-threads/${threadId}`);
    return response.data;
  }

  // ─── User Profile ────────────────────────────────────────────────

  async updateProfile(data: Record<string, any>): Promise<any> {
    let response = await this.api.put('/profile', data);
    return response.data;
  }
}
