import { createAxios } from 'slates';

let BASE_URL = 'https://app.spoki.it/api/1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-Spoki-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // -- Contacts --

  async createContact(data: {
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    language?: string;
    customFields?: Record<string, any>;
    tags?: string[];
    lists?: string[];
  }) {
    let body: Record<string, any> = {
      phone: data.phone
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;
    if (data.language) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;
    if (data.tags) body.tags = data.tags;
    if (data.lists) body.lists = data.lists;

    let response = await this.axios.post('/contacts/', body);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      phone?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      language?: string;
      customFields?: Record<string, any>;
      tags?: string[];
      lists?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.phone) body.phone = data.phone;
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;
    if (data.language) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;
    if (data.tags) body.tags = data.tags;
    if (data.lists) body.lists = data.lists;

    let response = await this.axios.put(`/contacts/${contactId}/`, body);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}/`);
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}/`);
    return response.data;
  }

  async listContacts(params?: {
    page?: number;
    search?: string;
    tag?: string;
    list?: string;
  }) {
    let response = await this.axios.get('/contacts/', { params });
    return response.data;
  }

  // -- Contact Tags --

  async addTagToContact(contactId: string, tag: string) {
    let response = await this.axios.post(`/contacts/${contactId}/tags/`, { tag });
    return response.data;
  }

  async removeTagFromContact(contactId: string, tag: string) {
    let response = await this.axios.delete(`/contacts/${contactId}/tags/`, { data: { tag } });
    return response.data;
  }

  // -- Contact Lists --

  async addContactToList(contactId: string, listId: string) {
    let response = await this.axios.post(`/contacts/${contactId}/lists/`, { list: listId });
    return response.data;
  }

  async removeContactFromList(contactId: string, listId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}/lists/`, {
      data: { list: listId }
    });
    return response.data;
  }

  // -- Messages --

  async sendMessage(data: {
    phone: string;
    message: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    let body: Record<string, any> = {
      phone: data.phone,
      message: data.message
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;

    let response = await this.axios.post('/messages/send/', body);
    return response.data;
  }

  async sendTemplate(data: {
    templateId: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    language?: string;
    customFields?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      template_id: data.templateId,
      phone: data.phone
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;
    if (data.language) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.post('/messages/send_template/', body);
    return response.data;
  }

  // -- Automations --

  async startAutomation(data: {
    automationId: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    language?: string;
    customFields?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      phone: data.phone
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.email) body.email = data.email;
    if (data.language) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.post(`/automations/${data.automationId}/start/`, body);
    return response.data;
  }

  async startAutomationForMany(data: {
    automationId: string;
    contacts: Array<{
      phone: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      language?: string;
      customFields?: Record<string, any>;
    }>;
  }) {
    let contacts = data.contacts.map(c => {
      let contact: Record<string, any> = { phone: c.phone };
      if (c.firstName) contact.first_name = c.firstName;
      if (c.lastName) contact.last_name = c.lastName;
      if (c.email) contact.email = c.email;
      if (c.language) contact.language = c.language;
      if (c.customFields) contact.custom_fields = c.customFields;
      return contact;
    });

    let response = await this.axios.post(`/automations/${data.automationId}/start_many/`, {
      contacts
    });
    return response.data;
  }

  // -- Deals --

  async createDeal(data: {
    name: string;
    contactId?: string;
    phone?: string;
    value?: number;
    pipelineId?: string;
    stageId?: string;
    ownerId?: string;
    expectedCloseDate?: string;
    customFields?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      name: data.name
    };
    if (data.contactId) body.contact_id = data.contactId;
    if (data.phone) body.phone = data.phone;
    if (data.value !== undefined) body.value = data.value;
    if (data.pipelineId) body.pipeline_id = data.pipelineId;
    if (data.stageId) body.stage_id = data.stageId;
    if (data.ownerId) body.owner_id = data.ownerId;
    if (data.expectedCloseDate) body.expected_close_date = data.expectedCloseDate;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.post('/deals/', body);
    return response.data;
  }

  async updateDeal(
    dealId: string,
    data: {
      name?: string;
      value?: number;
      stageId?: string;
      ownerId?: string;
      expectedCloseDate?: string;
      customFields?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name) body.name = data.name;
    if (data.value !== undefined) body.value = data.value;
    if (data.stageId) body.stage_id = data.stageId;
    if (data.ownerId) body.owner_id = data.ownerId;
    if (data.expectedCloseDate) body.expected_close_date = data.expectedCloseDate;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.put(`/deals/${dealId}/`, body);
    return response.data;
  }

  async deleteDeal(dealId: string) {
    let response = await this.axios.delete(`/deals/${dealId}/`);
    return response.data;
  }

  async getDeal(dealId: string) {
    let response = await this.axios.get(`/deals/${dealId}/`);
    return response.data;
  }

  async listDeals(params?: { page?: number; pipelineId?: string; stageId?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.pipelineId) queryParams.pipeline_id = params.pipelineId;
    if (params?.stageId) queryParams.stage_id = params.stageId;

    let response = await this.axios.get('/deals/', { params: queryParams });
    return response.data;
  }

  // -- Lists --

  async getLists() {
    let response = await this.axios.get('/lists/');
    return response.data;
  }

  async createList(name: string) {
    let response = await this.axios.post('/lists/', { name });
    return response.data;
  }

  async deleteList(listId: string) {
    let response = await this.axios.delete(`/lists/${listId}/`);
    return response.data;
  }

  // -- Custom Fields --

  async getCustomFields() {
    let response = await this.axios.get('/custom_fields/');
    return response.data;
  }

  async createCustomField(data: { name: string; type?: string }) {
    let response = await this.axios.post('/custom_fields/', data);
    return response.data;
  }

  // -- Tickets --

  async createTicket(data: {
    contactId?: string;
    phone?: string;
    subject?: string;
    description?: string;
  }) {
    let body: Record<string, any> = {};
    if (data.contactId) body.contact_id = data.contactId;
    if (data.phone) body.phone = data.phone;
    if (data.subject) body.subject = data.subject;
    if (data.description) body.description = data.description;

    let response = await this.axios.post('/tickets/', body);
    return response.data;
  }
}
