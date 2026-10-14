import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class PlatformClient {
  private headers: Record<string, string>;
  private api;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('A Landbot account API token is required.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.landbot.io/v1',
      authHeader: { value: `Token ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Landbot', reason: 'landbot_api' })
    });
    this.headers = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Customers ---

  async listCustomers(params?: {
    offset?: number;
    limit?: number;
    channel_id?: number;
    agent_id?: number;
    search_by?: 'name' | 'email' | 'phone';
    search?: string;
    archived?: boolean;
    opt_in?: boolean;
  }) {
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('Customer offset must be a non-negative whole number.');
    }
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 0 || params.limit > 100)
    ) {
      throw createApiServiceError('Customer limit must be a whole number from 0 to 100.');
    }
    let response = await this.api.get('/customers/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await this.api.get(`/customers/${customerId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCustomer(customerId: number) {
    let response = await this.api.delete(`/customers/${customerId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCustomerFields(customerId: number, fields: Record<string, unknown>) {
    for (let [name, value] of Object.entries(fields)) {
      if (!/^[a-z0-9_]+$/.test(name)) {
        throw createApiServiceError(
          'Customer field names may contain only lowercase letters, numbers, and underscores.'
        );
      }
      if (value === null || value === undefined) {
        throw createApiServiceError(`Provide a non-null value for customer field "${name}".`);
      }
    }
    for (let [name, value] of Object.entries(fields)) {
      let type =
        typeof value === 'number'
          ? Number.isInteger(value)
            ? 'integer'
            : 'float'
          : typeof value === 'boolean'
            ? 'boolean'
            : typeof value === 'string'
              ? 'string'
              : 'object';
      let path = `/customers/${customerId}/fields/${encodeURIComponent(name)}/`;
      let body = { type, extra: {}, value };
      let response = await this.api.post(path, body, {
        headers: this.headers,
        validateStatus: status => (status >= 200 && status < 300) || status === 412
      });
      if (response.status === 412) {
        await this.api.put(path, body, { headers: this.headers });
      }
    }
  }

  async getCustomerMessages(customerId: number) {
    let response = await this.api.get(`/customers/${customerId}/messages/`, {
      headers: this.headers
    });
    return response.data;
  }

  async sendCustomerText(customerId: number, message: string) {
    let response = await this.api.post(
      `/customers/${customerId}/send_text/`,
      { message },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async assignCustomerToBot(customerId: number, botId: number, options?: { node?: string }) {
    let body: Record<string, any> = { launch: true };
    if (options?.node) {
      body.node = options.node;
    }
    let response = await this.api.put(`/customers/${customerId}/assign_bot/${botId}/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async unassignCustomer(customerId: number) {
    let response = await this.api.put(
      `/customers/${customerId}/unassign/`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCustomerOptIns(customerId: number) {
    let response = await this.api.delete(`/customers/${customerId}/opt_ins/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Channels ---

  async listChannels() {
    let response = await this.api.get('/channels/', {
      headers: this.headers
    });
    return response.data;
  }

  async getChannel(channelId: number) {
    let response = await this.api.get(`/channels/${channelId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- WhatsApp Templates ---

  async listWhatsAppTemplates(channelId?: number) {
    let response = await this.api.get('/channels/whatsapp/templates/', {
      headers: this.headers,
      params: { channel_id: channelId }
    });
    return response.data;
  }

  async listWhatsAppTemplatesMultiChannel() {
    let response = await this.api.get('/channels/whatsapp/templates/multi/', {
      headers: this.headers
    });
    return response.data;
  }

  // --- Send WhatsApp Template ---

  async sendWhatsAppTemplate(
    customerId: number,
    templateData: {
      templateId: number;
      templateLanguage: string;
      templateParams?: {
        header?: { url?: string; filename?: string; params?: string[] };
        body?: { params?: string[] };
        buttons?: Array<{ params?: string[] }>;
      };
    }
  ) {
    let params: Record<string, any> = {
      body: templateData.templateParams?.body ?? { params: [] }
    };
    if (templateData.templateParams?.header) {
      params.header = templateData.templateParams.header;
    }
    if (templateData.templateParams?.buttons) {
      params.buttons = templateData.templateParams.buttons;
    }

    let body: Record<string, any> = {
      template_id: templateData.templateId,
      template_language: templateData.templateLanguage,
      template_params: params
    };

    let response = await this.api.post(`/customers/${customerId}/send_template/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Agents ---

  async listAgents() {
    let response = await this.api.get('/agents/', {
      headers: this.headers
    });
    return response.data;
  }

  async getAgent(agentId: number) {
    let response = await this.api.get(`/agents/${agentId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Tickets ---

  async listTickets(params?: { offset?: number; limit?: number }) {
    let response = await this.api.get('/tickets/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTicket(ticketId: number) {
    let response = await this.api.get(`/tickets/${ticketId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTicket(data: Record<string, any>) {
    let response = await this.api.post('/tickets/', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTicket(ticketId: number, data: Record<string, any>) {
    let response = await this.api.put(`/tickets/${ticketId}/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Bots ---

  async getBot(botId: number) {
    let response = await this.api.get(`/bots/${botId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async listBots() {
    let response = await this.api.get('/bots/', {
      headers: this.headers
    });
    return response.data;
  }
}

export class ChatClient {
  private headers: Record<string, string>;
  private api;

  constructor(channelToken: string) {
    if (!channelToken.trim()) {
      throw createApiServiceError('A Landbot APIchat channel token is required.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://chat.landbot.io/v1',
      authHeader: { value: `Token ${channelToken}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Landbot APIchat',
          reason: 'landbot_chat_api'
        })
    });
    this.headers = {
      Authorization: `Token ${channelToken}`,
      'Content-Type': 'application/json'
    };
  }

  async sendTextMessage(customerToken: string, message: string) {
    let response = await this.api.post(
      `/send/${encodeURIComponent(customerToken)}/`,
      {
        message: {
          type: 'text',
          message
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async sendImageMessage(customerToken: string, url: string) {
    let response = await this.api.post(
      `/send/${encodeURIComponent(customerToken)}/`,
      {
        message: {
          type: 'image',
          url
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async sendLocationMessage(
    customerToken: string,
    latitude: string,
    longitude: string,
    address?: string
  ) {
    let numericLatitude = Number(latitude);
    let numericLongitude = Number(longitude);
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(numericLatitude) ||
      !Number.isFinite(numericLongitude) ||
      numericLatitude < -90 ||
      numericLatitude > 90 ||
      numericLongitude < -180 ||
      numericLongitude > 180
    ) {
      throw createApiServiceError(
        'Provide valid numeric latitude (-90 to 90) and longitude (-180 to 180).'
      );
    }
    let response = await this.api.post(
      `/send/${encodeURIComponent(customerToken)}/`,
      {
        message: {
          type: 'location',
          latitude: numericLatitude,
          longitude: numericLongitude,
          message: address
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
