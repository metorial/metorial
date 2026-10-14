import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface SendFoxContact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  ip_address: string | null;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  created_at: string;
  updated_at: string;
  form_id: string | null;
  contact_import_id: string | null;
  via_api: boolean;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  first_sent_at: string | null;
  last_sent_at: string | null;
  invalid_at: string | null;
  inactive_at: string | null;
  confirmed_at: string | null;
  confirmation_sent_count: number;
  created_ago: string;
  contact_fields: Array<{ name: string; value: string }>;
  lists?: Array<{ id: number; name: string; created_at: string }>;
}

export interface SendFoxList {
  id: number;
  name: string;
  created_at: string;
  subscribed_contacts_count?: number;
  average_email_open_percent?: number | string | null;
  average_email_click_percent?: number | string | null;
}

export interface SendFoxCampaign {
  id: number;
  title: string;
  subject: string;
  html: string;
  user_id: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  from_email: string;
  from_name: string;
  timezone: string | null;
  preview_text: string | null;
}

export interface SendFoxCampaignStats {
  sent_count: number;
  unique_open_count: number;
  unique_click_count: number;
  unsubscribe_count: number;
  bounce_count: number;
  spam_count: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
  bounce_rate: number;
  spam_rate: number;
  link_stats?: Array<{ url: string; clicks: number }>;
}

export interface SendFoxUser {
  id: number;
  name: string;
  email: string;
  country: string | null;
  timezone: string | null;
  language: string | null;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.sendfox.com',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SendFox',
          reason: 'sendfox_api_error'
        })
    });
  }

  // ===== User =====

  async getMe(): Promise<SendFoxUser> {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ===== Contacts =====

  async listContacts(page?: number): Promise<PaginatedResponse<SendFoxContact>> {
    let response = await this.axios.get('/contacts', {
      params: { page }
    });
    return response.data;
  }

  async getContact(contactId: number): Promise<SendFoxContact> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async getContactByEmail(email: string): Promise<SendFoxContact | null> {
    let response = await this.axios.get('/contacts', {
      params: { email }
    });
    let data = response.data;
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
    return null;
  }

  async createContact(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    lists?: number[];
    contactFields?: Array<{ name: string; value: string }>;
  }): Promise<SendFoxContact> {
    let body: Record<string, unknown> = {
      email: params.email
    };
    if (params.firstName !== undefined) body.first_name = params.firstName;
    if (params.lastName !== undefined) body.last_name = params.lastName;
    if (params.lists) body.lists = params.lists;
    if (params.contactFields) body.contact_fields = params.contactFields;

    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: number,
    params: {
      firstName?: string;
      lastName?: string;
      lists?: number[];
      contactFields?: Array<{ name: string; value: string }>;
    }
  ): Promise<SendFoxContact> {
    let body: Record<string, unknown> = {};
    if (params.firstName !== undefined) body.first_name = params.firstName;
    if (params.lastName !== undefined) body.last_name = params.lastName;
    if (params.lists) body.lists = params.lists;
    if (params.contactFields) body.contact_fields = params.contactFields;

    let response = await this.axios.patch(`/contacts/${contactId}`, body);
    return response.data;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async unsubscribeContact(email: string): Promise<SendFoxContact> {
    let response = await this.axios.patch('/unsubscribe', { email });
    return response.data;
  }

  async batchImportContacts(params: {
    contacts: Array<{
      email: string;
      first_name?: string;
      last_name?: string;
    }>;
    listIds?: number[];
  }): Promise<{ created: number; updated: number }> {
    if (params.contacts.length === 0 || params.contacts.length > 1000) {
      throw createApiServiceError('Provide between 1 and 1,000 contacts to import.', {
        reason: 'invalid_contact_batch'
      });
    }

    let body = {
      contacts: params.contacts.map(contact => ({
        ...contact,
        ...(params.listIds !== undefined ? { lists: params.listIds } : {})
      }))
    };

    let response = await this.axios.post('/contacts/batch', body);
    return response.data;
  }

  // ===== Lists =====

  async listLists(page?: number): Promise<PaginatedResponse<SendFoxList>> {
    let response = await this.axios.get('/lists', {
      params: { page }
    });
    return response.data;
  }

  async getList(listId: number): Promise<SendFoxList> {
    let response = await this.axios.get(`/lists/${listId}`);
    return response.data;
  }

  async listListContacts(
    listId: number,
    options: { page?: number; query?: string; status?: 'subscribed' | 'unsubscribed' } = {}
  ): Promise<PaginatedResponse<SendFoxContact>> {
    let response = await this.axios.get(`/lists/${listId}/contacts`, { params: options });
    return response.data;
  }

  async createList(name: string): Promise<SendFoxList> {
    let response = await this.axios.post('/lists', { name });
    return response.data;
  }

  async deleteList(listId: number): Promise<void> {
    await this.axios.delete(`/lists/${listId}`);
  }

  async addContactToList(listId: number, contactId: number): Promise<void> {
    await this.axios.post(`/lists/${listId}/contacts`, {
      contact_id: contactId
    });
  }

  async removeContactFromList(listId: number, contactId: number): Promise<SendFoxContact> {
    let response = await this.axios.delete(`/lists/${listId}/contacts/${contactId}`);
    return response.data;
  }

  // ===== Campaigns =====

  async listCampaigns(page?: number): Promise<PaginatedResponse<SendFoxCampaign>> {
    let response = await this.axios.get('/campaigns', {
      params: { page }
    });
    return response.data;
  }

  async getCampaign(campaignId: number): Promise<SendFoxCampaign> {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignStats(
    campaignId: number,
    options: { includeLinkStats?: boolean; linkLimit?: number } = {}
  ): Promise<SendFoxCampaignStats> {
    let response = await this.axios.get(`/campaigns/${campaignId}/stats`, {
      params: {
        include_link_stats: options.includeLinkStats,
        link_limit: options.linkLimit
      }
    });
    return response.data;
  }

  async getCampaignStatsBatch(
    campaignIds: number[]
  ): Promise<Array<SendFoxCampaignStats & { id: number }>> {
    if (campaignIds.length === 0) return [];
    let params = new URLSearchParams();
    for (let campaignId of campaignIds) {
      params.append('campaign_ids[]', String(campaignId));
    }
    let response = await this.axios.get('/campaigns/stats', { params });
    return response.data.data;
  }

  async createCampaign(params: {
    title: string;
    subject: string;
    html: string;
    fromName: string;
    fromEmail: string;
    listIds: number[];
    scheduledAt?: string;
    timezone?: string;
    previewText?: string;
  }): Promise<SendFoxCampaign> {
    let body: Record<string, unknown> = {
      title: params.title,
      subject: params.subject,
      html: params.html,
      from_name: params.fromName,
      from_email: params.fromEmail,
      lists: params.listIds
    };
    if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
    if (params.timezone) body.timezone = params.timezone;
    if (params.previewText) body.preview_text = params.previewText;

    let response = await this.axios.post('/campaigns', body);
    return response.data;
  }

  async updateCampaign(
    campaignId: number,
    params: {
      title?: string;
      subject?: string;
      html?: string;
      fromName?: string;
      fromEmail?: string;
      listIds?: number[];
      scheduledAt?: string;
      timezone?: string;
      previewText?: string;
    }
  ): Promise<SendFoxCampaign> {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.html !== undefined) body.html = params.html;
    if (params.fromName !== undefined) body.from_name = params.fromName;
    if (params.fromEmail !== undefined) body.from_email = params.fromEmail;
    if (params.listIds !== undefined) body.lists = params.listIds;
    if (params.scheduledAt !== undefined) body.scheduled_at = params.scheduledAt;
    if (params.timezone !== undefined) body.timezone = params.timezone;
    if (params.previewText !== undefined) body.preview_text = params.previewText;

    let response = await this.axios.patch(`/campaigns/${campaignId}`, body);
    return response.data;
  }

  async deleteCampaign(campaignId: number): Promise<void> {
    await this.axios.delete(`/campaigns/${campaignId}`);
  }

  async sendCampaign(campaignId: number): Promise<SendFoxCampaign> {
    let response = await this.axios.post(`/campaigns/${campaignId}/send`);
    return response.data;
  }

  // ===== Automations =====

  async listAutomations(page?: number): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/automations', {
      params: { page }
    });
    return response.data;
  }

  async getAutomation(automationId: number): Promise<any> {
    let response = await this.axios.get(`/automations/${automationId}`);
    return response.data;
  }

  // ===== Forms =====

  async listForms(page?: number): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/forms', {
      params: { page }
    });
    return response.data;
  }

  async getForm(formId: number): Promise<any> {
    let response = await this.axios.get(`/forms/${formId}`);
    return response.data;
  }
}
