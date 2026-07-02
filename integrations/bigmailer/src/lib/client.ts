import { createAxios } from 'slates';
import type {
  Brand,
  BulkCampaign,
  Contact,
  ContactList,
  Field,
  PaginatedResponse,
  Sender,
  SuppressionList
} from './types';

export class Client {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.bigmailer.io/v1',
      headers: {
        'X-API-Key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Brands ----

  async listBrands(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResponse<Brand>> {
    let response = await this.http.get('/brands', { params });
    return response.data;
  }

  async getBrand(brandId: string): Promise<Brand> {
    let response = await this.http.get(`/brands/${brandId}`);
    return response.data;
  }

  async createBrand(data: {
    name: string;
    from_name?: string;
    from_email?: string;
    bounce_danger_percent?: number;
    max_soft_bounces?: number;
    url?: string;
    unsubscribe_text?: string;
    contact_limit?: number;
    connection_id?: string;
  }): Promise<Brand> {
    let response = await this.http.post('/brands', data);
    return response.data;
  }

  async updateBrand(
    brandId: string,
    data: {
      name?: string;
      from_name?: string;
      from_email?: string;
      bounce_danger_percent?: number;
      max_soft_bounces?: number;
      url?: string;
      unsubscribe_text?: string;
      contact_limit?: number;
      connection_id?: string;
    }
  ): Promise<Brand> {
    let response = await this.http.post(`/brands/${brandId}`, data);
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(
    brandId: string,
    params?: { limit?: number; cursor?: string; list_id?: string }
  ): Promise<PaginatedResponse<Contact>> {
    let response = await this.http.get(`/brands/${brandId}/contacts`, { params });
    return response.data;
  }

  async getContact(brandId: string, contactId: string): Promise<Contact> {
    let response = await this.http.get(`/brands/${brandId}/contacts/${contactId}`);
    return response.data;
  }

  async createContact(
    brandId: string,
    data: {
      email: string;
      field_values?: Array<{ name: string; string?: string; date?: string; integer?: number }>;
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    },
    validate?: boolean
  ): Promise<Contact> {
    let response = await this.http.post(`/brands/${brandId}/contacts`, data, {
      params: validate ? { validate: true } : undefined
    });
    return response.data;
  }

  async updateContact(
    brandId: string,
    contactId: string,
    data: {
      email?: string;
      field_values?: Array<{ name: string; string?: string; date?: string; integer?: number }>;
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    }
  ): Promise<Contact> {
    let response = await this.http.post(`/brands/${brandId}/contacts/${contactId}`, data);
    return response.data;
  }

  async upsertContact(
    brandId: string,
    data: {
      email: string;
      field_values?: Array<{ name: string; string?: string; date?: string; integer?: number }>;
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    },
    validate?: boolean
  ): Promise<Contact> {
    let response = await this.http.post(`/brands/${brandId}/contacts/upsert`, data, {
      params: validate ? { validate: true } : undefined
    });
    return response.data;
  }

  async deleteContact(brandId: string, contactId: string): Promise<void> {
    await this.http.delete(`/brands/${brandId}/contacts/${contactId}`);
  }

  // ---- Lists ----

  async listLists(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<ContactList>> {
    let response = await this.http.get(`/brands/${brandId}/lists`, { params });
    return response.data;
  }

  async getList(brandId: string, listId: string): Promise<ContactList> {
    let response = await this.http.get(`/brands/${brandId}/lists/${listId}`);
    return response.data;
  }

  async createList(brandId: string, data: { name: string }): Promise<ContactList> {
    let response = await this.http.post(`/brands/${brandId}/lists`, data);
    return response.data;
  }

  async updateList(
    brandId: string,
    listId: string,
    data: { name: string }
  ): Promise<ContactList> {
    let response = await this.http.post(`/brands/${brandId}/lists/${listId}`, data);
    return response.data;
  }

  // ---- Fields ----

  async listFields(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Field>> {
    let response = await this.http.get(`/brands/${brandId}/fields`, { params });
    return response.data;
  }

  async createField(
    brandId: string,
    data: {
      name: string;
      merge_tag_name: string;
      type: 'date' | 'integer' | 'text';
      sample_value?: string;
    }
  ): Promise<Field> {
    let response = await this.http.post(`/brands/${brandId}/fields`, data);
    return response.data;
  }

  // ---- Senders ----

  async listSenders(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Sender>> {
    let response = await this.http.get(`/brands/${brandId}/senders`, { params });
    return response.data;
  }

  async createSender(
    brandId: string,
    data: {
      identity: string;
      identity_type: 'domain' | 'email';
      share_type: 'all' | 'none';
    }
  ): Promise<Sender> {
    let response = await this.http.post(`/brands/${brandId}/senders`, data);
    return response.data;
  }

  async deleteSender(brandId: string, senderId: string): Promise<void> {
    await this.http.delete(`/brands/${brandId}/senders/${senderId}`);
  }

  // ---- Suppression Lists ----

  async getSuppressionList(
    brandId: string,
    suppressionListId: string
  ): Promise<SuppressionList> {
    let response = await this.http.get(
      `/brands/${brandId}/suppression-lists/${suppressionListId}`
    );
    return response.data;
  }

  // ---- Bulk Campaigns ----

  async listBulkCampaigns(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<BulkCampaign>> {
    let response = await this.http.get(`/brands/${brandId}/bulk-campaigns`, { params });
    return response.data;
  }

  async createBulkCampaign(
    brandId: string,
    data: {
      name?: string;
      subject?: string;
      preview?: string;
      from?: { email: string; name: string };
      reply_to?: { email: string; name: string };
      recipient_name?: string;
      html?: string;
      text?: string;
      template_id?: string;
      link_params?: string;
      list_ids?: string[];
      excluded_list_ids?: string[];
      segment_id?: string;
      message_type_id?: string;
      track_opens?: boolean;
      track_clicks?: boolean;
      track_text_clicks?: boolean;
      scheduled_for?: number;
      throttling_type?: string;
      throttling_amount?: number;
      throttling_period?: number;
      suppression_list_id?: string;
      ready?: boolean;
    }
  ): Promise<BulkCampaign> {
    let response = await this.http.post(`/brands/${brandId}/bulk-campaigns`, data);
    return response.data;
  }

  // ---- Transactional Campaigns ----

  async sendTransactionalEmail(
    brandId: string,
    campaignId: string,
    data: {
      email: string;
      field_values?: Array<{ name: string; string?: string; date?: string; integer?: number }>;
      variables?: Array<{ name: string; value: string }>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.http.post(
      `/brands/${brandId}/transactional-campaigns/${campaignId}/send`,
      data
    );
    return response.data;
  }
}
