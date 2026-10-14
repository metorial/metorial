import { buildApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://cloudapi.mailercloud.com/v1',
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Mailercloud',
          reason: 'mailercloud_api_error'
        })
    });
  }

  // ---- Account ----

  async getAccountPlan() {
    let response = await this.axios.get('/client/plan');
    return response.data;
  }

  // ---- Lists ----

  async createList(name: string) {
    let response = await this.axios.post('/list', {
      name,
      list_type: 1
    });
    return response.data;
  }

  async searchLists(params: { page?: number; limit?: number; search?: string }) {
    let response = await this.axios.post('/lists/search', {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      list_type: 1,
      ...pickDefined({ search_name: params.search || undefined })
    });
    return response.data;
  }

  // ---- Contacts ----

  async createContact(data: {
    email: string;
    listId: string;
    name?: string;
    lastName?: string;
    middleName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    industry?: string;
    department?: string;
    jobTitle?: string;
    organization?: string;
    leadSource?: string;
    salary?: number;
    contactType?: string;
    customFields?: Record<string, string | number>;
  }) {
    let body: Record<string, unknown> = {
      email: data.email,
      list_id: data.listId,
      contact_type: data.contactType ?? 'active'
    };

    if (data.name !== undefined) body.first_name = data.name;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.middleName !== undefined) body.middle_name = data.middleName;
    if (data.city !== undefined) body.city = data.city;
    if (data.state !== undefined) body.state = data.state;
    if (data.zip !== undefined) body.postal_code = data.zip;
    if (data.country !== undefined) body.country = data.country;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.industry !== undefined) body.industry = data.industry;
    if (data.department !== undefined) body.department = data.department;
    if (data.jobTitle !== undefined) body.job_title = data.jobTitle;
    if (data.organization !== undefined) body.company_name = data.organization;
    if (data.leadSource !== undefined) body.lead_source = data.leadSource;
    if (data.salary !== undefined) body.salary = data.salary;
    if (data.customFields !== undefined) body.custom_fields = data.customFields;

    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      lastName?: string;
      middleName?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      phone?: string;
      industry?: string;
      department?: string;
      jobTitle?: string;
      organization?: string;
      leadSource?: string;
      salary?: number;
      customFields?: Record<string, string | number>;
    }
  ) {
    let body: Record<string, unknown> = {};

    if (data.name !== undefined) body.first_name = data.name;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.middleName !== undefined) body.middle_name = data.middleName;
    if (data.city !== undefined) body.city = data.city;
    if (data.state !== undefined) body.state = data.state;
    if (data.zip !== undefined) body.postal_code = data.zip;
    if (data.country !== undefined) body.country = data.country;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.industry !== undefined) body.industry = data.industry;
    if (data.department !== undefined) body.department = data.department;
    if (data.jobTitle !== undefined) body.job_title = data.jobTitle;
    if (data.organization !== undefined) body.company_name = data.organization;
    if (data.leadSource !== undefined) body.lead_source = data.leadSource;
    if (data.salary !== undefined) body.salary = data.salary;
    if (data.customFields !== undefined) body.custom_fields = data.customFields;

    let response = await this.axios.put(`/contacts/${encodeURIComponent(contactId)}`, body);
    return response.data;
  }

  async searchContacts(
    listId: string,
    params?: { page?: number; limit?: number; search?: string }
  ) {
    let response = await this.axios.post(`/contact/search/${encodeURIComponent(listId)}`, {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search ?? ''
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return response.data;
  }

  // ---- Contact Properties ----

  async listProperties(params: { page?: number; limit?: number; search?: string } = {}) {
    let response = await this.axios.post('/contact/property/search', {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...pickDefined({ search: params.search || undefined })
    });
    return response.data;
  }

  async createProperty(data: { name: string; type: string; description?: string }) {
    let response = await this.axios.post('/contact/property', pickDefined(data));
    return response.data;
  }

  async updateProperty(propertyId: string, data: { name?: string; description?: string }) {
    let response = await this.axios.patch(
      `/contact/property/${encodeURIComponent(propertyId)}`,
      data
    );
    return response.data;
  }

  async deleteProperty(propertyId: string) {
    let response = await this.axios.delete(
      `/contact/property/${encodeURIComponent(propertyId)}`
    );
    return response.data;
  }

  // ---- Campaigns ----

  async createCampaign(data: {
    name: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    htmlContent?: string;
    textContent?: string;
    listId?: string;
    segmentId?: string;
  }) {
    let body: Record<string, unknown> = {
      name: data.name,
      subject: data.subject,
      sender: {
        sender_name: data.fromName,
        sender_email: data.fromEmail
      }
    };

    if (data.replyTo !== undefined) body.reply_email = data.replyTo;
    if (data.htmlContent !== undefined) body.html = data.htmlContent;
    if (data.textContent !== undefined) body.plain_text = data.textContent;
    if (data.listId !== undefined) body.list_ids = [data.listId];
    if (data.segmentId !== undefined) body.segments = data.segmentId;

    let response = await this.axios.post('/campaign', body);
    return response.data;
  }

  async searchCampaigns(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    let response = await this.axios.post('/campaign/list', {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...pickDefined({ search: params.search || undefined, status: params.status })
    });
    return response.data;
  }

  // ---- Webhooks ----

  async createWebhook(data: { name: string; url: string; events: string[] }) {
    let response = await this.axios.post('/webhooks', {
      name: data.name,
      url: data.url,
      events: data.events.map(event => {
        let eventNames: Record<string, string> = {
          send: 'campaign_sent',
          open: 'campaign_opened',
          click: 'campaign_clicked',
          fail: 'campaign_error',
          bounce: 'hard_bounce'
        };
        return eventNames[event] ?? event;
      })
    });
    return response.data;
  }

  async listWebhooks(params: { page?: number; limit?: number; search?: string } = {}) {
    let response = await this.axios.post('/webhooks/search', {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...pickDefined({ search: params.search || undefined })
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }
}
