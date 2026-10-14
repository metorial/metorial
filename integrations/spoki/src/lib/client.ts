import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.spoki.com/api/1';

let validatePage = (page?: number) => {
  if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
    throw createApiServiceError('Page must be a positive whole number.');
  }
};

let numericId = (id: string, resource: string) => {
  let value = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`Provide a valid numeric Spoki ${resource} ID.`);
  }
  return value;
};

type ContactData = {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  language?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  lists?: string[];
};

let contactBody = (data: ContactData) =>
  pickDefined({
    phone: data.phone,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    language: data.language,
    custom_fields: data.customFields,
    tags: data.tags,
    lists: data.lists
  });

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Spoki API key is required. Reconnect with a valid key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { name: 'X-Spoki-Api-Key', value: config.token },
      errorMapping: {
        mapAxiosError: error => ({
          message: extractApiErrorMessage(error, {
            detailKeys: ['detail', 'title', 'message', 'errors']
          })
        })
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Spoki',
          reason: 'spoki_api_error',
          detailKeys: ['detail', 'title', 'message', 'errors']
        })
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
    let response = await this.axios.post('/contacts/sync/', contactBody(data));
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
    let response = await this.axios.patch(
      `/contacts/${encodeURIComponent(contactId)}/`,
      contactBody(data)
    );
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${encodeURIComponent(contactId)}/`);
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}/`);
    return response.data;
  }

  async listContacts(params?: {
    page?: number;
    search?: string;
    tag?: string;
    list?: string;
  }) {
    validatePage(params?.page);
    let response = await this.axios.get('/contacts/', { params });
    return response.data;
  }

  // -- Contact Tags --

  async addTagToContact(contactId: string, tag: string) {
    let response = await this.axios.post(`/contacts/${encodeURIComponent(contactId)}/tags/`, {
      tag
    });
    return response.data;
  }

  async removeTagFromContact(contactId: string, tag: string) {
    let response = await this.axios.delete(
      `/contacts/${encodeURIComponent(contactId)}/tags/`,
      { data: { tag } }
    );
    return response.data;
  }

  // -- Contact Lists --

  async addContactToList(contactId: string, listId: string) {
    let contact = await this.getContact(contactId);
    if (!contact?.phone) {
      throw createApiServiceError('The contact has no phone number to add to the list.');
    }
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/sync_contacts/`,
      { contacts: [{ phone: contact.phone }] }
    );
    return response.data;
  }

  async removeContactFromList(contactId: string, listId: string) {
    let response = await this.axios.post(
      `/lists/${encodeURIComponent(listId)}/remove_contacts/`,
      { ids: [numericId(contactId, 'contact')] }
    );
    let result = response.data;
    if (
      result?.removed_count === 0 ||
      result?.not_found?.ids?.length ||
      result?.invalid?.ids?.length
    ) {
      throw createApiServiceError(
        'Spoki did not remove the requested contact from the list. Verify the contact and list IDs.'
      );
    }
    return result;
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
      type: 'Message',
      content_type: 'Text',
      text: data.message
    };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;

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
      type: 'Template',
      template: numericId(data.templateId, 'template'),
      phone: data.phone
    };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.language !== undefined) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.post('/messages/send/', body);
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
    webhookUuid?: string;
  }) {
    let webhook = await this.getAutomationWebhook(data.automationId, data.webhookUuid);
    let body: Record<string, any> = {
      secret: webhook.secret,
      phone: data.phone
    };
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.language !== undefined) body.language = data.language;
    if (data.customFields) body.custom_fields = data.customFields;

    let response = await this.axios.post(`/wh/ap/${encodeURIComponent(webhook.uuid)}/`, body, {
      baseURL: 'https://api.spoki.com'
    });
    return response.data;
  }

  async startAutomationForMany(data: {
    automationId: string;
    webhookUuid?: string;
    contacts: Array<{
      phone: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      language?: string;
      customFields?: Record<string, any>;
    }>;
  }) {
    if (data.contacts.length < 1 || data.contacts.length > 500) {
      throw createApiServiceError('Provide between 1 and 500 contacts for a bulk automation.');
    }
    let webhook = await this.getAutomationWebhook(data.automationId, data.webhookUuid);
    let contacts = data.contacts.map(c => {
      let contact: Record<string, any> = { phone: c.phone };
      if (c.firstName !== undefined) contact.first_name = c.firstName;
      if (c.lastName !== undefined) contact.last_name = c.lastName;
      if (c.email !== undefined) contact.email = c.email;
      if (c.language !== undefined) contact.language = c.language;
      if (c.customFields) contact.custom_fields = c.customFields;
      return contact;
    });

    let response = await this.axios.post(
      `/wh/ap/${encodeURIComponent(webhook.uuid)}/bulk/`,
      { secret: webhook.secret, contacts },
      { baseURL: 'https://api.spoki.com' }
    );
    return response.data;
  }

  async listAccounts() {
    let response = await this.axios.get('/accounts/');
    return response.data;
  }

  async listTemplates(params?: { page?: number }) {
    validatePage(params?.page);
    let response = await this.axios.get('/templates/', { params });
    return response.data;
  }

  async listAutomations(params?: { page?: number }) {
    validatePage(params?.page);
    let response = await this.axios.get('/automations/', { params });
    return response.data;
  }

  private async getAutomationWebhook(automationId: string, webhookUuid?: string) {
    let response = await this.axios.get(`/automations/${encodeURIComponent(automationId)}/`);
    let webhooks = Array.isArray(response.data?.webhook_set)
      ? response.data.webhook_set.filter(
          (webhook: { is_active?: boolean; uuid?: string; secret?: string }) =>
            webhook.is_active &&
            webhook.uuid &&
            webhook.secret &&
            (webhookUuid === undefined || webhook.uuid === webhookUuid)
        )
      : [];
    if (webhooks.length !== 1) {
      throw createApiServiceError(
        webhooks.length > 1
          ? 'This automation has multiple active API startup steps. Provide webhookUuid from list_automations to select one.'
          : 'No matching active API startup step was found. Add or enable an API startup step in the automation.'
      );
    }
    return webhooks[0] as { uuid: string; secret: string };
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

    let response = await this.axios.put(`/deals/${encodeURIComponent(dealId)}/`, body);
    return response.data;
  }

  async deleteDeal(dealId: string) {
    let response = await this.axios.delete(`/deals/${encodeURIComponent(dealId)}/`);
    return response.data;
  }

  async getDeal(dealId: string) {
    let response = await this.axios.get(`/deals/${encodeURIComponent(dealId)}/`);
    return response.data;
  }

  async listDeals(params?: { page?: number; pipelineId?: string; stageId?: string }) {
    validatePage(params?.page);
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
    let response = await this.axios.delete(`/lists/${encodeURIComponent(listId)}/`);
    return response.data;
  }

  // -- Custom Fields --

  async getCustomFields() {
    let response = await this.axios.get('/custom-fields/');
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
