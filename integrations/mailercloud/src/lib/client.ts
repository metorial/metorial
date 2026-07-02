import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://cloudapi.mailercloud.com/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(private config: { token: string }) {
    this.headers = {
      Authorization: this.config.token,
      'Content-Type': 'application/json'
    };
  }

  // ---- Account ----

  async getAccountPlan() {
    let response = await axios.get('/client/plan', { headers: this.headers });
    return response.data;
  }

  // ---- Lists ----

  async createList(name: string) {
    let response = await axios.post(
      '/list',
      {
        name,
        list_type: 1
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async searchLists(params: { page?: number; limit?: number; search?: string }) {
    let response = await axios.post(
      '/lists/search',
      {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        search: params.search ?? ''
      },
      { headers: this.headers }
    );
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

    if (data.name !== undefined) body.name = data.name;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.middleName !== undefined) body.middle_name = data.middleName;
    if (data.city !== undefined) body.city = data.city;
    if (data.state !== undefined) body.state = data.state;
    if (data.zip !== undefined) body.zip = data.zip;
    if (data.country !== undefined) body.country = data.country;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.industry !== undefined) body.industry = data.industry;
    if (data.department !== undefined) body.department = data.department;
    if (data.jobTitle !== undefined) body.job_title = data.jobTitle;
    if (data.organization !== undefined) body.organization = data.organization;
    if (data.leadSource !== undefined) body.lead_source = data.leadSource;
    if (data.salary !== undefined) body.salary = data.salary;
    if (data.customFields !== undefined) body.custom_fields = data.customFields;

    let response = await axios.post('/contacts', body, { headers: this.headers });
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

    if (data.name !== undefined) body.name = data.name;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.middleName !== undefined) body.middle_name = data.middleName;
    if (data.city !== undefined) body.city = data.city;
    if (data.state !== undefined) body.state = data.state;
    if (data.zip !== undefined) body.zip = data.zip;
    if (data.country !== undefined) body.country = data.country;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.industry !== undefined) body.industry = data.industry;
    if (data.department !== undefined) body.department = data.department;
    if (data.jobTitle !== undefined) body.job_title = data.jobTitle;
    if (data.organization !== undefined) body.organization = data.organization;
    if (data.leadSource !== undefined) body.lead_source = data.leadSource;
    if (data.salary !== undefined) body.salary = data.salary;
    if (data.customFields !== undefined) body.custom_fields = data.customFields;

    let response = await axios.put(`/contacts/${contactId}`, body, { headers: this.headers });
    return response.data;
  }

  async searchContacts(
    listId: string,
    params?: { page?: number; limit?: number; search?: string }
  ) {
    let response = await axios.post(
      `/contact/search/${listId}`,
      {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        search: params?.search ?? ''
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Contact Properties ----

  async listProperties() {
    let response = await axios.post('/contact/property', {}, { headers: this.headers });
    return response.data;
  }

  async updateProperty(propertyId: string, data: { name?: string; description?: string }) {
    let response = await axios.patch(`/contact/property/${propertyId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteProperty(propertyId: string) {
    let response = await axios.delete(`/contact/property/${propertyId}`, {
      headers: this.headers
    });
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
    tags?: string[];
  }) {
    let body: Record<string, unknown> = {
      name: data.name,
      subject: data.subject,
      from_name: data.fromName,
      from_email: data.fromEmail
    };

    if (data.replyTo !== undefined) body.reply_to = data.replyTo;
    if (data.htmlContent !== undefined) body.html_content = data.htmlContent;
    if (data.textContent !== undefined) body.text_content = data.textContent;
    if (data.listId !== undefined) body.list_id = data.listId;
    if (data.segmentId !== undefined) body.segment_id = data.segmentId;
    if (data.tags !== undefined) body.tags = data.tags;

    let response = await axios.post('/campaign', body, { headers: this.headers });
    return response.data;
  }

  // ---- Webhooks ----

  async createWebhook(data: { name: string; url: string; events: string[] }) {
    let response = await axios.post(
      '/webhook',
      {
        name: data.name,
        url: data.url,
        events: data.events
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async listWebhooks() {
    let response = await axios.get('/webhook', { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await axios.delete(`/webhook/${webhookId}`, { headers: this.headers });
    return response.data;
  }
}
