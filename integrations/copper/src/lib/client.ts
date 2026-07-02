import { createAxios } from 'slates';

export interface CopperAuth {
  token: string;
  userEmail?: string;
  authMethod: 'api_key' | 'oauth';
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private auth: CopperAuth) {
    this.axios = createAxios({
      baseURL: 'https://api.copper.com/developer_api/v1'
    });
  }

  private getHeaders(): Record<string, string> {
    if (this.auth.authMethod === 'oauth') {
      return {
        Authorization: `Bearer ${this.auth.token}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'X-PW-AccessToken': this.auth.token,
      'X-PW-UserEmail': this.auth.userEmail || '',
      'X-PW-Application': 'developer_api',
      'Content-Type': 'application/json'
    };
  }

  // ========== People ==========

  async createPerson(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/people', data, { headers: this.getHeaders() });
    return response.data;
  }

  async getPerson(personId: number): Promise<any> {
    let response = await this.axios.get(`/people/${personId}`, { headers: this.getHeaders() });
    return response.data;
  }

  async updatePerson(personId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/people/${personId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deletePerson(personId: number): Promise<any> {
    let response = await this.axios.delete(`/people/${personId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async searchPeople(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/people/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async lookupPersonByEmail(email: string): Promise<any> {
    let response = await this.axios.post(
      '/people/fetch_by_email',
      { email },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // ========== Companies ==========

  async createCompany(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/companies', data, { headers: this.getHeaders() });
    return response.data;
  }

  async getCompany(companyId: number): Promise<any> {
    let response = await this.axios.get(`/companies/${companyId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateCompany(companyId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/companies/${companyId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteCompany(companyId: number): Promise<any> {
    let response = await this.axios.delete(`/companies/${companyId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async searchCompanies(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/companies/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Leads ==========

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/leads', data, { headers: this.getHeaders() });
    return response.data;
  }

  async getLead(leadId: number): Promise<any> {
    let response = await this.axios.get(`/leads/${leadId}`, { headers: this.getHeaders() });
    return response.data;
  }

  async updateLead(leadId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/leads/${leadId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteLead(leadId: number): Promise<any> {
    let response = await this.axios.delete(`/leads/${leadId}`, { headers: this.getHeaders() });
    return response.data;
  }

  async searchLeads(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/leads/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async convertLead(leadId: number, details: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/leads/${leadId}/convert`,
      { details },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // ========== Opportunities ==========

  async createOpportunity(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/opportunities', data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getOpportunity(opportunityId: number): Promise<any> {
    let response = await this.axios.get(`/opportunities/${opportunityId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateOpportunity(opportunityId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/opportunities/${opportunityId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteOpportunity(opportunityId: number): Promise<any> {
    let response = await this.axios.delete(`/opportunities/${opportunityId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async searchOpportunities(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/opportunities/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Tasks ==========

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/tasks', data, { headers: this.getHeaders() });
    return response.data;
  }

  async getTask(taskId: number): Promise<any> {
    let response = await this.axios.get(`/tasks/${taskId}`, { headers: this.getHeaders() });
    return response.data;
  }

  async updateTask(taskId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/tasks/${taskId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteTask(taskId: number): Promise<any> {
    let response = await this.axios.delete(`/tasks/${taskId}`, { headers: this.getHeaders() });
    return response.data;
  }

  async searchTasks(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/tasks/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Projects ==========

  async createProject(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/projects', data, { headers: this.getHeaders() });
    return response.data;
  }

  async getProject(projectId: number): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async updateProject(projectId: number, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/projects/${projectId}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteProject(projectId: number): Promise<any> {
    let response = await this.axios.delete(`/projects/${projectId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async searchProjects(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/projects/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Activities ==========

  async createActivity(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/activities', data, { headers: this.getHeaders() });
    return response.data;
  }

  async searchActivities(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.post('/activities/search', params, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listActivityTypes(): Promise<any[]> {
    let response = await this.axios.get('/activity_types', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Pipelines ==========

  async listPipelines(): Promise<any[]> {
    let response = await this.axios.get('/pipelines', { headers: this.getHeaders() });
    return response.data;
  }

  async listPipelineStages(pipelineId: number): Promise<any[]> {
    let response = await this.axios.get(`/pipeline_stages/pipeline/${pipelineId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Custom Fields ==========

  async listCustomFieldDefinitions(): Promise<any[]> {
    let response = await this.axios.get('/custom_field_definitions', {
      headers: this.getHeaders()
    });
    return response.data;
  }

  // ========== Tags ==========

  async listTags(): Promise<any[]> {
    let response = await this.axios.get('/tags', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Related Items ==========

  async getRelatedItems(entityType: string, entityId: number): Promise<any> {
    let response = await this.axios.get(`/${entityType}/${entityId}/related`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createRelatedItem(
    entityType: string,
    entityId: number,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(`/${entityType}/${entityId}/related`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async deleteRelatedItem(
    entityType: string,
    entityId: number,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.delete(`/${entityType}/${entityId}/related`, {
      headers: this.getHeaders(),
      data
    });
    return response.data;
  }

  // ========== Users ==========

  async listUsers(): Promise<any[]> {
    let response = await this.axios.post('/users/search', {}, { headers: this.getHeaders() });
    return response.data;
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.axios.get(`/users/${userId}`, { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Account ==========

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Customer Sources ==========

  async listCustomerSources(): Promise<any[]> {
    let response = await this.axios.get('/customer_sources', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Loss Reasons ==========

  async listLossReasons(): Promise<any[]> {
    let response = await this.axios.get('/loss_reasons', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Contact Types ==========

  async listContactTypes(): Promise<any[]> {
    let response = await this.axios.get('/contact_types', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Lead Statuses ==========

  async listLeadStatuses(): Promise<any[]> {
    let response = await this.axios.get('/lead_statuses', { headers: this.getHeaders() });
    return response.data;
  }

  // ========== Webhooks ==========

  async createWebhook(data: {
    target: string;
    type: string;
    event: string;
    secret?: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<any> {
    let response = await this.axios.post('/webhooks', data, { headers: this.getHeaders() });
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.delete(`/webhooks/${webhookId}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listWebhooks(): Promise<any[]> {
    let response = await this.axios.get('/webhooks', { headers: this.getHeaders() });
    return response.data;
  }
}
