import { createAxios } from 'slates';

export interface GorgiasClientConfig {
  token: string;
  subdomain: string;
  authType?: 'bearer' | 'basic';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    next_cursor: string | null;
    prev_cursor: string | null;
  };
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: GorgiasClientConfig) {
    let authHeader =
      config.authType === 'basic' ? `Basic ${config.token}` : `Bearer ${config.token}`;

    this.http = createAxios({
      baseURL: `https://${config.subdomain}.gorgias.com/api`,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── Tickets ──

  async listTickets(params?: {
    cursor?: string;
    limit?: number;
    customer_id?: number;
    assignee_user_id?: number;
    assignee_team_id?: number;
    status?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/tickets', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getTicket(ticketId: number): Promise<any> {
    let response = await this.http.get(`/tickets/${ticketId}`);
    return response.data;
  }

  async createTicket(data: {
    customer?: { id?: number; email?: string };
    messages: Array<{
      channel: string;
      via: string;
      from_agent: boolean;
      sender?: { id?: number; email?: string };
      receiver?: { id?: number; email?: string };
      subject?: string;
      body_html?: string;
      body_text?: string;
      stripped_text?: string;
      source?: { to?: Array<{ address: string }>; from?: { address: string } };
    }>;
    channel?: string;
    via?: string;
    from_agent?: boolean;
    status?: string;
    priority?: string;
    subject?: string;
    tags?: Array<{ name: string }>;
    meta?: Record<string, any>;
    assignee_user?: { id: number } | null;
    assignee_team?: { id: number } | null;
    external_id?: string;
  }): Promise<any> {
    let response = await this.http.post('/tickets', data);
    return response.data;
  }

  async updateTicket(
    ticketId: number,
    data: {
      status?: string;
      priority?: string;
      subject?: string;
      spam?: boolean;
      language?: string;
      assignee_user?: { id: number } | null;
      assignee_team?: { id: number } | null;
      customer?: { id?: number; email?: string };
      tags?: Array<{ name: string }>;
      custom_fields?: Array<{ id: number; value: any }>;
      meta?: Record<string, any>;
      external_id?: string;
      snooze_datetime?: string | null;
      closed_datetime?: string | null;
    }
  ): Promise<any> {
    let response = await this.http.put(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}`);
  }

  // ── Ticket Tags ──

  async addTicketTags(ticketId: number, tags: Array<{ name: string }>): Promise<any> {
    let response = await this.http.post(`/tickets/${ticketId}/tags`, tags);
    return response.data;
  }

  async removeTicketTags(ticketId: number, tags: Array<{ name: string }>): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/tags`, { data: tags });
  }

  async setTicketTags(ticketId: number, tags: Array<{ name: string }>): Promise<any> {
    let response = await this.http.put(`/tickets/${ticketId}/tags`, tags);
    return response.data;
  }

  // ── Messages ──

  async listMessages(
    ticketId: number,
    params?: {
      cursor?: string;
      limit?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let response = await this.http.get(`/tickets/${ticketId}/messages`, { params });
    return response.data as PaginatedResponse<any>;
  }

  async getMessage(ticketId: number, messageId: number): Promise<any> {
    let response = await this.http.get(`/tickets/${ticketId}/messages/${messageId}`);
    return response.data;
  }

  async createMessage(
    ticketId: number,
    data: {
      channel: string;
      via: string;
      from_agent: boolean;
      sender?: { id?: number; email?: string };
      receiver?: { id?: number; email?: string };
      subject?: string;
      body_html?: string;
      body_text?: string;
      stripped_text?: string;
      source?: { to?: Array<{ address: string }>; from?: { address: string } };
      attachments?: Array<{
        url: string;
        name?: string;
        content_type?: string;
        size?: number;
      }>;
    }
  ): Promise<any> {
    let response = await this.http.post(`/tickets/${ticketId}/messages`, data);
    return response.data;
  }

  async updateMessage(
    ticketId: number,
    messageId: number,
    data: {
      body_html?: string;
      body_text?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(`/tickets/${ticketId}/messages/${messageId}`, data);
    return response.data;
  }

  async deleteMessage(ticketId: number, messageId: number): Promise<void> {
    await this.http.delete(`/tickets/${ticketId}/messages/${messageId}`);
  }

  // ── Customers ──

  async listCustomers(params?: {
    cursor?: string;
    limit?: number;
    email?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/customers', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getCustomer(customerId: number): Promise<any> {
    let response = await this.http.get(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(data: {
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    language?: string;
    timezone?: string;
    external_id?: string;
    channels?: Array<{ type: string; address: string; preferred?: boolean }>;
    note?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.post('/customers', data);
    return response.data;
  }

  async updateCustomer(
    customerId: number,
    data: {
      email?: string;
      name?: string;
      firstname?: string;
      lastname?: string;
      language?: string;
      timezone?: string;
      external_id?: string;
      channels?: Array<{ type: string; address: string; preferred?: boolean }>;
      note?: string;
      meta?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.http.put(`/customers/${customerId}`, data);
    return response.data;
  }

  async mergeCustomers(mainCustomerId: number, secondaryCustomerIds: number[]): Promise<any> {
    let response = await this.http.put('/customers/merge', {
      main_customer_id: mainCustomerId,
      secondary_customer_ids: secondaryCustomerIds
    });
    return response.data;
  }

  async deleteCustomer(customerId: number): Promise<void> {
    await this.http.delete(`/customers/${customerId}`);
  }

  // ── Tags ──

  async listTags(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/tags', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getTag(tagId: number): Promise<any> {
    let response = await this.http.get(`/tags/${tagId}`);
    return response.data;
  }

  async createTag(data: {
    name: string;
    decoration?: { color?: string };
    uri?: string;
  }): Promise<any> {
    let response = await this.http.post('/tags', data);
    return response.data;
  }

  async updateTag(
    tagId: number,
    data: {
      name?: string;
      decoration?: { color?: string };
    }
  ): Promise<any> {
    let response = await this.http.put(`/tags/${tagId}`, data);
    return response.data;
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.http.delete(`/tags/${tagId}`);
  }

  // ── Macros ──

  async listMacros(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/macros', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getMacro(macroId: number): Promise<any> {
    let response = await this.http.get(`/macros/${macroId}`);
    return response.data;
  }

  async createMacro(data: {
    name: string;
    actions?: Array<{
      type: string;
      args?: any;
    }>;
  }): Promise<any> {
    let response = await this.http.post('/macros', data);
    return response.data;
  }

  async updateMacro(
    macroId: number,
    data: {
      name?: string;
      actions?: Array<{
        type: string;
        args?: any;
      }>;
    }
  ): Promise<any> {
    let response = await this.http.put(`/macros/${macroId}`, data);
    return response.data;
  }

  async deleteMacro(macroId: number): Promise<void> {
    await this.http.delete(`/macros/${macroId}`);
  }

  // ── Rules ──

  async listRules(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/rules', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getRule(ruleId: number): Promise<any> {
    let response = await this.http.get(`/rules/${ruleId}`);
    return response.data;
  }

  async createRule(data: {
    name: string;
    description?: string;
    events?: Array<{ type: string }>;
    conditions?: any;
    actions?: Array<{ type: string; args?: any }>;
    enabled?: boolean;
    priority?: number;
  }): Promise<any> {
    let response = await this.http.post('/rules', data);
    return response.data;
  }

  async updateRule(
    ruleId: number,
    data: {
      name?: string;
      description?: string;
      events?: Array<{ type: string }>;
      conditions?: any;
      actions?: Array<{ type: string; args?: any }>;
      enabled?: boolean;
      priority?: number;
    }
  ): Promise<any> {
    let response = await this.http.put(`/rules/${ruleId}`, data);
    return response.data;
  }

  async deleteRule(ruleId: number): Promise<void> {
    await this.http.delete(`/rules/${ruleId}`);
  }

  // ── Users ──

  async listUsers(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/users', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getUser(userId: number): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  // ── Teams ──

  async listTeams(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/teams', { params });
    return response.data as PaginatedResponse<any>;
  }

  // ── Satisfaction Surveys ──

  async listSatisfactionSurveys(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/satisfaction-surveys', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getSatisfactionSurvey(surveyId: number): Promise<any> {
    let response = await this.http.get(`/satisfaction-surveys/${surveyId}`);
    return response.data;
  }

  async createSatisfactionSurvey(data: {
    body_text?: string;
    body_html?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.post('/satisfaction-surveys', data);
    return response.data;
  }

  // ── Custom Fields ──

  async listCustomFields(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/custom-fields', { params });
    return response.data as PaginatedResponse<any>;
  }

  // ── Integrations ──

  async listIntegrations(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/integrations', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getIntegration(integrationId: number): Promise<any> {
    let response = await this.http.get(`/integrations/${integrationId}`);
    return response.data;
  }

  async createIntegration(data: {
    name: string;
    description?: string;
    type: string;
    http?: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      request_content_type?: string;
      response_content_type?: string;
      triggers?: {
        'ticket-created'?: boolean;
        'ticket-message-created'?: boolean;
        'ticket-updated'?: boolean;
      };
      form?: {
        body?: string;
      };
    };
  }): Promise<any> {
    let response = await this.http.post('/integrations', data);
    return response.data;
  }

  async updateIntegration(
    integrationId: number,
    data: {
      name?: string;
      description?: string;
      http?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        request_content_type?: string;
        response_content_type?: string;
        triggers?: {
          'ticket-created'?: boolean;
          'ticket-message-created'?: boolean;
          'ticket-updated'?: boolean;
        };
        form?: {
          body?: string;
        };
      };
    }
  ): Promise<any> {
    let response = await this.http.put(`/integrations/${integrationId}`, data);
    return response.data;
  }

  async deleteIntegration(integrationId: number): Promise<void> {
    await this.http.delete(`/integrations/${integrationId}`);
  }

  // ── Search ──

  async search(
    query: string,
    params?: {
      type?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<any> {
    let response = await this.http.post('/search', {
      query,
      ...params
    });
    return response.data;
  }

  // ── Account ──

  async getAccount(): Promise<any> {
    let response = await this.http.get('/account');
    return response.data;
  }

  // ── Views ──

  async listViews(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/views', { params });
    return response.data as PaginatedResponse<any>;
  }

  // ── Events ──

  async listEvents(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/events', { params });
    return response.data as PaginatedResponse<any>;
  }

  // ── Jobs ──

  async getJob(jobId: number): Promise<any> {
    let response = await this.http.get(`/jobs/${jobId}`);
    return response.data;
  }
}
