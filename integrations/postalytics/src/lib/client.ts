import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.postalytics.com',
  development: 'https://api-dev.postalytics.com'
};

export interface ContactInput {
  firstName: string;
  lastName: string;
  company?: string;
  addressStreet: string;
  addressStreet2?: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  country?: string;
  varField1?: string;
  varField2?: string;
  varField3?: string;
  varField4?: string;
  varField5?: string;
  varField6?: string;
  varField7?: string;
  varField8?: string;
  varField9?: string;
  varField10?: string;
}

export interface CampaignSummary {
  campaignId: string;
  name: string;
  audience: number;
  delivered: number;
  uniqueVisitors: number;
  conversions: number;
  campaignType: string;
  creativeType: string;
  status: string;
  isLiveMode: boolean;
  thumbnail: string;
  createdDate: string;
  updatedDate: string;
}

export interface WebhookRecord {
  webhookId: string;
  campaignId: string;
  isSubscribed: boolean;
  campaignName: string;
  url: string;
  createdDate: string;
}

export class PostalyticsClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; environment: string }) {
    let baseURL = BASE_URLS[config.environment] || BASE_URLS.production;

    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Postalytics API key is required. Reconnect your account.'
      );
    }

    let adaptError = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Postalytics',
        reason: 'postalytics_api_error',
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
        nestedKeys: ['error', 'errors'],
        formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
          `${providerLabel} API ${operation} failed: ${statusLabel}${message.split(config.token).join('[redacted]')}`,
        extractStatus: (_error, response) => {
          let body = response?.data;
          let failure =
            isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error : undefined;
          return typeof failure?.status_code === 'number'
            ? failure.status_code
            : response?.status;
        }
      });

    this.axios = createAuthenticatedAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: config.token,
        password: ''
      },
      errorAdapter: adaptError
    });
    this.axios.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (isApiErrorRecord(body) && isApiErrorRecord(body.error)) {
        let status = body.error.status_code;
        if (typeof status === 'number' && status >= 400) {
          throw adaptError({ response: { status, data: body } });
        }
      }
      return response;
    });
  }

  private singleRecord(value: unknown, resource: string): Record<string, unknown> {
    let record = Array.isArray(value) && value.length === 1 ? value[0] : value;
    if (!isApiErrorRecord(record)) {
      throw createApiServiceError(`Postalytics returned an invalid ${resource} response.`);
    }
    return record;
  }

  // ---- Account ----

  async getMyAccount(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/v1/account/me');
    return this.singleRecord(response.data, 'current account');
  }

  async getAccount(accountId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/account/${accountId}`);
    return this.singleRecord(response.data, 'account');
  }

  async createAccount(params: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    emailAddress?: string;
    company?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      username: params.username,
      password: params.password,
      first_name: params.firstName,
      last_name: params.lastName
    };
    if (params.emailAddress !== undefined) body.email_address = params.emailAddress;
    if (params.company !== undefined) body.company = params.company;
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.address !== undefined) {
      body.address = params.address;
      body.address_street = params.address;
    }
    if (params.city !== undefined) {
      body.city = params.city;
      body.address_city = params.city;
    }
    if (params.state !== undefined) {
      body.state = params.state;
      body.address_state = params.state;
    }
    if (params.zip !== undefined) {
      body.zip = params.zip;
      body.address_zip = params.zip;
    }

    let response = await this.axios.post('/api/v1/account', body);
    return response.data;
  }

  async updateAccount(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/api/v1/account', params);
    return response.data;
  }

  async deleteAccount(accountId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/account/${accountId}`);
    return response.data;
  }

  async getIntegrations(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/v1/account/integrations');
    return Array.isArray(response.data) ? { data: response.data } : response.data;
  }

  // ---- Contacts ----

  async getContactLists(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/contacts');
    return response.data;
  }

  async getContact(contactId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/contacts/details/${contactId}`);
    return response.data;
  }

  async getContactsOnList(
    listId: string,
    params?: { start?: number; limit?: number }
  ): Promise<Record<string, unknown>[]> {
    let queryParams: Record<string, string> = {};
    if (params?.start !== undefined) queryParams.start = String(params.start);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);

    let response = await this.axios.get(`/api/v1/contacts/${listId}`, { params: queryParams });
    return response.data;
  }

  async createOrUpdateContact(params: {
    contactListId: string;
    contact: ContactInput;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      contact_list_id: params.contactListId,
      first_name: params.contact.firstName,
      last_name: params.contact.lastName,
      address_street: params.contact.addressStreet,
      address_city: params.contact.addressCity,
      address_state: params.contact.addressState,
      address_zip: params.contact.addressZip
    };
    if (params.contact.company !== undefined) body.company = params.contact.company;
    if (params.contact.addressStreet2 !== undefined)
      body.address_street2 = params.contact.addressStreet2;
    if (params.contact.country !== undefined) body.country = params.contact.country;
    if (params.contact.varField1 !== undefined) body.var_field_1 = params.contact.varField1;
    if (params.contact.varField2 !== undefined) body.var_field_2 = params.contact.varField2;
    if (params.contact.varField3 !== undefined) body.var_field_3 = params.contact.varField3;
    if (params.contact.varField4 !== undefined) body.var_field_4 = params.contact.varField4;
    if (params.contact.varField5 !== undefined) body.var_field_5 = params.contact.varField5;
    if (params.contact.varField6 !== undefined) body.var_field_6 = params.contact.varField6;
    if (params.contact.varField7 !== undefined) body.var_field_7 = params.contact.varField7;
    if (params.contact.varField8 !== undefined) body.var_field_8 = params.contact.varField8;
    if (params.contact.varField9 !== undefined) body.var_field_9 = params.contact.varField9;
    if (params.contact.varField10 !== undefined) body.var_field_10 = params.contact.varField10;

    let response = await this.axios.post('/api/v1/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: string,
    params: {
      contactListId: string;
      contact: Partial<ContactInput>;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      contact_id: contactId,
      contact_list_id: params.contactListId
    };
    if (params.contact.firstName !== undefined) body.first_name = params.contact.firstName;
    if (params.contact.lastName !== undefined) body.last_name = params.contact.lastName;
    if (params.contact.company !== undefined) body.company = params.contact.company;
    if (params.contact.addressStreet !== undefined)
      body.address_street = params.contact.addressStreet;
    if (params.contact.addressStreet2 !== undefined)
      body.address_street2 = params.contact.addressStreet2;
    if (params.contact.addressCity !== undefined)
      body.address_city = params.contact.addressCity;
    if (params.contact.addressState !== undefined)
      body.address_state = params.contact.addressState;
    if (params.contact.addressZip !== undefined) body.address_zip = params.contact.addressZip;
    if (params.contact.country !== undefined) body.country = params.contact.country;
    if (params.contact.varField1 !== undefined) body.var_field_1 = params.contact.varField1;
    if (params.contact.varField2 !== undefined) body.var_field_2 = params.contact.varField2;
    if (params.contact.varField3 !== undefined) body.var_field_3 = params.contact.varField3;
    if (params.contact.varField4 !== undefined) body.var_field_4 = params.contact.varField4;
    if (params.contact.varField5 !== undefined) body.var_field_5 = params.contact.varField5;
    if (params.contact.varField6 !== undefined) body.var_field_6 = params.contact.varField6;
    if (params.contact.varField7 !== undefined) body.var_field_7 = params.contact.varField7;
    if (params.contact.varField8 !== undefined) body.var_field_8 = params.contact.varField8;
    if (params.contact.varField9 !== undefined) body.var_field_9 = params.contact.varField9;
    if (params.contact.varField10 !== undefined) body.var_field_10 = params.contact.varField10;

    let response = await this.axios.put(`/api/v1/contacts/${contactId}`, body);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/contacts/${contactId}`);
    return response.data;
  }

  // ---- Templates ----

  async getTemplates(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/templates');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/templates/${templateId}`);
    return this.singleRecord(response.data, 'template');
  }

  async createTemplate(params: {
    name: string;
    html?: string;
    front?: string;
    back?: string;
    size: number;
    isFullHtml?: boolean;
    isProofed?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      size: params.size
    };
    if (params.html !== undefined) body.html = params.html;
    if (params.front !== undefined) body.front = params.front;
    if (params.back !== undefined) body.back = params.back;
    if (params.isFullHtml !== undefined) body.is_full_html = params.isFullHtml;
    if (params.isProofed !== undefined) body.is_proofed = params.isProofed;
    let response = await this.axios.post('/api/v1/templates', body);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/templates/${templateId}`);
    return response.data;
  }

  // ---- Campaigns ----

  async getCampaigns(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/campaigns');
    return response.data;
  }

  async getDripCampaigns(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/campaigns/drips');
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/campaigns/${campaignId}/details`);
    return response.data;
  }

  async getCampaignStats(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/campaigns/${campaignId}`);
    return this.singleRecord(response.data, 'campaign statistics');
  }

  async getCampaignEvents(
    campaignId: string,
    params?: {
      dataId?: string;
      pageNumber?: number;
      pageSize?: number;
    }
  ): Promise<Record<string, unknown>> {
    let url = `/api/v1/campaigns/${campaignId}/events`;
    if (params?.dataId) {
      url += `/${params.dataId}`;
    }
    let queryParams: Record<string, string> = {};
    if (params?.pageNumber !== undefined) queryParams.PageNumber = String(params.pageNumber);
    if (params?.pageSize !== undefined) queryParams.PageSize = String(params.pageSize);

    let response = await this.axios.get(url, { params: queryParams });
    return Array.isArray(response.data) ? { data: response.data } : response.data;
  }

  async createCampaign(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/v1/campaigns', params);
    return response.data;
  }

  async updateCampaignStatus(
    campaignId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/v1/campaigns/${campaignId}`, params);
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/campaigns/${campaignId}`);
    return response.data;
  }

  // ---- Send ----

  async sendMailPiece(
    endpoint: string,
    contact: ContactInput
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      address_street: contact.addressStreet,
      address_city: contact.addressCity,
      address_state: contact.addressState,
      address_zip: contact.addressZip
    };
    if (contact.company !== undefined) body.company = contact.company;
    if (contact.addressStreet2 !== undefined) body.address_street2 = contact.addressStreet2;
    if (contact.country !== undefined) body.country = contact.country;
    if (contact.varField1 !== undefined) body.var_field_1 = contact.varField1;
    if (contact.varField2 !== undefined) body.var_field_2 = contact.varField2;
    if (contact.varField3 !== undefined) body.var_field_3 = contact.varField3;
    if (contact.varField4 !== undefined) body.var_field_4 = contact.varField4;
    if (contact.varField5 !== undefined) body.var_field_5 = contact.varField5;
    if (contact.varField6 !== undefined) body.var_field_6 = contact.varField6;
    if (contact.varField7 !== undefined) body.var_field_7 = contact.varField7;
    if (contact.varField8 !== undefined) body.var_field_8 = contact.varField8;
    if (contact.varField9 !== undefined) body.var_field_9 = contact.varField9;
    if (contact.varField10 !== undefined) body.var_field_10 = contact.varField10;

    let response = await this.axios.post(`/api/v1/send/${endpoint}`, body);
    return response.data;
  }

  // ---- Flows ----

  async getFlows(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/flow');
    return response.data;
  }

  async enrollContactInFlow(
    endpoint: string,
    contact: ContactInput
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      address_street: contact.addressStreet,
      address_city: contact.addressCity,
      address_state: contact.addressState,
      address_zip: contact.addressZip
    };
    if (contact.company !== undefined) body.company = contact.company;
    if (contact.addressStreet2 !== undefined) body.address_street2 = contact.addressStreet2;
    if (contact.country !== undefined) body.country = contact.country;
    if (contact.varField1 !== undefined) body.var_field_1 = contact.varField1;
    if (contact.varField2 !== undefined) body.var_field_2 = contact.varField2;
    if (contact.varField3 !== undefined) body.var_field_3 = contact.varField3;
    if (contact.varField4 !== undefined) body.var_field_4 = contact.varField4;
    if (contact.varField5 !== undefined) body.var_field_5 = contact.varField5;
    if (contact.varField6 !== undefined) body.var_field_6 = contact.varField6;
    if (contact.varField7 !== undefined) body.var_field_7 = contact.varField7;
    if (contact.varField8 !== undefined) body.var_field_8 = contact.varField8;
    if (contact.varField9 !== undefined) body.var_field_9 = contact.varField9;
    if (contact.varField10 !== undefined) body.var_field_10 = contact.varField10;

    let response = await this.axios.post(`/api/v1/flow/${endpoint}`, body);
    return response.data;
  }

  async unenrollContactFromFlow(
    endpoint: string,
    dataId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/flow/unenroll/${endpoint}/${dataId}`);
    return response.data;
  }

  // ---- Webhooks ----

  async getWebhooks(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/webhooks/${webhookId}`);
    return this.singleRecord(response.data, 'webhook');
  }

  async createWebhook(params: {
    campaignId: string;
    isEnabled: boolean;
    url: string;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/v1/webhooks', {
      campaign_id: params.campaignId,
      is_enabled: params.isEnabled,
      is_subscribed: params.isEnabled ? 1 : 0,
      url: params.url
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      campaignId?: string;
      isEnabled?: boolean;
      url?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.campaignId !== undefined) body.campaign_id = params.campaignId;
    if (params.isEnabled !== undefined) {
      body.is_enabled = params.isEnabled;
      body.is_subscribed = params.isEnabled ? 1 : 0;
    }
    if (params.url !== undefined) body.url = params.url;

    let response = await this.axios.put(`/api/v1/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/v1/webhooks/${webhookId}`);
    return response.data;
  }

  // ---- Suppression Lists ----

  async getSuppressionLists(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/lists/suppression');
    return response.data;
  }

  async addSuppressedContact(
    listId: string,
    contact: ContactInput
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      address_street: contact.addressStreet,
      address_city: contact.addressCity,
      address_state: contact.addressState,
      address_zip: contact.addressZip
    };
    if (contact.company !== undefined) body.company = contact.company;
    if (contact.addressStreet2 !== undefined) body.address_street2 = contact.addressStreet2;

    Object.assign(body, {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Address: contact.addressStreet,
      City: contact.addressCity,
      State: contact.addressState,
      Zip: contact.addressZip
    });
    if (contact.company !== undefined) body.Company = contact.company;
    if (contact.addressStreet2 !== undefined) body.Address2 = contact.addressStreet2;

    let response = await this.axios.post(`/api/v1/lists/suppression/contacts/${listId}`, body);
    return response.data;
  }

  async getFlow(endpointId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/flow/${encodeURIComponent(endpointId)}`);
    return response.data;
  }

  async getSuppressionList(listId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/lists/suppression/${encodeURIComponent(listId)}`
    );
    return response.data;
  }

  async createSuppressionList(params: {
    name?: string;
    country?: string;
  }): Promise<Record<string, unknown>[]> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.Name = params.name;
    if (params.country !== undefined) body.Country = params.country;
    let response = await this.axios.post('/api/v1/lists/suppression', body);
    return response.data;
  }

  async deleteSuppressionList(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/api/v1/lists/suppression/${encodeURIComponent(listId)}`
    );
    return response.data;
  }

  async getSuppressedContacts(
    listId: string,
    params: { offset?: number; contactId?: string }
  ): Promise<Record<string, unknown>> {
    let url = `/api/v1/lists/suppression/contacts/${encodeURIComponent(listId)}`;
    if (params.contactId !== undefined) url += `/${encodeURIComponent(params.contactId)}`;
    let response = await this.axios.get(url, { params: { offset: params.offset } });
    return response.data;
  }

  async deleteSuppressedContact(
    listId: string,
    contactId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/api/v1/lists/suppression/contacts/${encodeURIComponent(listId)}/${encodeURIComponent(contactId)}`
    );
    return response.data;
  }

  // ---- Login Links ----

  async createLoginLink(params: {
    apiKey: string;
    url: string;
    resourceId?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      api_key: params.apiKey,
      url: params.url
    };
    if (params.resourceId !== undefined) body.id = params.resourceId;

    let response = await this.axios.post('/api/v1/loginlink', body);
    return response.data;
  }
}
