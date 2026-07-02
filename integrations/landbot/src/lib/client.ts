import { createAxios } from 'slates';

let platformApi = createAxios({
  baseURL: 'https://api.landbot.io/v1'
});

let chatApi = createAxios({
  baseURL: 'https://chat.landbot.io/v1'
});

export class PlatformClient {
  private headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Customers ---

  async listCustomers(params?: { offset?: number; limit?: number }) {
    let response = await platformApi.get('/customers/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getCustomer(customerId: number) {
    let response = await platformApi.get(`/customers/${customerId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCustomer(customerId: number) {
    let response = await platformApi.delete(`/customers/${customerId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCustomerFields(customerId: number, fields: Record<string, any>) {
    let response = await platformApi.put(
      `/customers/${customerId}/fields/data/`,
      {
        type: 'object',
        extra: {},
        value: fields
      },
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
    let response = await platformApi.put(
      `/customers/${customerId}/assign_bot/${botId}/`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unassignCustomer(customerId: number) {
    let response = await platformApi.put(
      `/customers/${customerId}/unassign/`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCustomerOptIns(customerId: number) {
    let response = await platformApi.delete(`/customers/${customerId}/opt_ins/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Channels ---

  async listChannels() {
    let response = await platformApi.get('/channels/', {
      headers: this.headers
    });
    return response.data;
  }

  async getChannel(channelId: number) {
    let response = await platformApi.get(`/channels/${channelId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- WhatsApp Templates ---

  async listWhatsAppTemplates() {
    let response = await platformApi.get('/channels/whatsapp/templates/', {
      headers: this.headers
    });
    return response.data;
  }

  async listWhatsAppTemplatesMultiChannel() {
    let response = await platformApi.get('/channels/whatsapp/templates/multi/', {
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
    let body: Record<string, any> = {
      template_id: templateData.templateId,
      template_language: templateData.templateLanguage
    };

    if (templateData.templateParams) {
      let params: Record<string, any> = {};
      if (templateData.templateParams.header) {
        params.header = templateData.templateParams.header;
      }
      if (templateData.templateParams.body) {
        params.body = templateData.templateParams.body;
      }
      if (templateData.templateParams.buttons) {
        params.buttons = templateData.templateParams.buttons;
      }
      body.template_params = params;
    }

    let response = await platformApi.post(`/customers/${customerId}/send_template/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Agents ---

  async listAgents() {
    let response = await platformApi.get('/agents/', {
      headers: this.headers
    });
    return response.data;
  }

  async getAgent(agentId: number) {
    let response = await platformApi.get(`/agents/${agentId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Tickets ---

  async listTickets(params?: { offset?: number; limit?: number }) {
    let response = await platformApi.get('/tickets/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTicket(ticketId: number) {
    let response = await platformApi.get(`/tickets/${ticketId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTicket(data: Record<string, any>) {
    let response = await platformApi.post('/tickets/', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTicket(ticketId: number, data: Record<string, any>) {
    let response = await platformApi.put(`/tickets/${ticketId}/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Bots ---

  async getBot(botId: number) {
    let response = await platformApi.get(`/bots/${botId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async listBots() {
    let response = await platformApi.get('/bots/', {
      headers: this.headers
    });
    return response.data;
  }
}

export class ChatClient {
  private headers: Record<string, string>;

  constructor(channelToken: string) {
    this.headers = {
      Authorization: `Token ${channelToken}`,
      'Content-Type': 'application/json'
    };
  }

  async sendTextMessage(customerToken: string, message: string) {
    let response = await chatApi.post(
      `/send/${customerToken}/`,
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
    let response = await chatApi.post(
      `/send/${customerToken}/`,
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
    let response = await chatApi.post(
      `/send/${customerToken}/`,
      {
        message: {
          type: 'location',
          latitude,
          longitude,
          address
        }
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
