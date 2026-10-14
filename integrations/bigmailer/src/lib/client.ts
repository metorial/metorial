import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorStatus
} from 'slates';
import type {
  Brand,
  BulkCampaign,
  Contact,
  ContactList,
  Field,
  FieldValue,
  PaginatedResponse,
  Sender,
  SuppressionList,
  TransactionalCampaign
} from './types';

export class Client {
  private http;

  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.bigmailer.io/v1',
      authHeader: { name: 'X-API-Key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'BigMailer', reason: 'upstream_error' })
    });
  }

  async getIdentity(): Promise<Record<string, unknown>> {
    let response = await this.http.get('/me');
    return response.data;
  }

  private async hydrateMutation<T>(
    result: { id?: string },
    operation: string,
    read: (id: string) => Promise<T>
  ): Promise<T> {
    if (!result.id) {
      throw createApiServiceError(
        `BigMailer ${operation} was accepted but returned no resource ID. Check the resource before repeating the operation.`
      );
    }
    let id = result.id;
    try {
      return await read(id);
    } catch (error) {
      throw createApiServiceError(
        `BigMailer ${operation} succeeded for resource ${id}, but retrieving its details failed: ${extractApiErrorMessage(error)}. Retry retrieving this resource instead of repeating the mutation.`,
        {
          reason: 'mutation_read_failed',
          upstreamStatus: getApiErrorStatus(error),
          parent: error
        }
      );
    }
  }

  private validateFieldValues(values?: FieldValue[]) {
    for (let value of values ?? []) {
      let supplied = [value.string, value.date, value.integer].filter(
        item => item !== undefined
      );
      if (supplied.length !== 1) {
        throw createApiServiceError(
          `Field ${value.name} must have exactly one string, date, or integer value.`
        );
      }
      if (value.integer !== undefined && !Number.isInteger(value.integer)) {
        throw createApiServiceError(
          `Field ${value.name} must use a whole number for its integer value.`
        );
      }
      if (value.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
        throw createApiServiceError(
          `Field ${value.name} must use YYYY-MM-DD for its date value.`
        );
      }
    }
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
    let response = await this.http.get(`/brands/${encodeURIComponent(brandId)}`);
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
    return this.hydrateMutation(response.data, 'brand creation', id => this.getBrand(id));
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
    let response = await this.http.post(`/brands/${encodeURIComponent(brandId)}`, data);
    return this.hydrateMutation(response.data, 'brand update', id => this.getBrand(id));
  }

  // ---- Contacts ----

  async listContacts(
    brandId: string,
    params?: { limit?: number; cursor?: string; list_id?: string }
  ): Promise<PaginatedResponse<Contact>> {
    let response = await this.http.get(`/brands/${encodeURIComponent(brandId)}/contacts`, {
      params
    });
    return response.data;
  }

  async getContact(brandId: string, contactId: string): Promise<Contact> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/contacts/${encodeURIComponent(contactId)}`
    );
    return response.data;
  }

  async createContact(
    brandId: string,
    data: {
      email: string;
      field_values?: FieldValue[];
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    },
    validate?: boolean
  ): Promise<Contact> {
    this.validateFieldValues(data.field_values);
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/contacts`,
      data,
      {
        params: validate ? { validate: true } : undefined
      }
    );
    return this.hydrateMutation(response.data, 'contact creation', id =>
      this.getContact(brandId, id)
    );
  }

  async updateContact(
    brandId: string,
    contactId: string,
    data: {
      email?: string;
      field_values?: FieldValue[];
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    }
  ): Promise<Contact> {
    this.validateFieldValues(data.field_values);
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/contacts/${encodeURIComponent(contactId)}`,
      data
    );
    return this.hydrateMutation(response.data, 'contact update', id =>
      this.getContact(brandId, id)
    );
  }

  async upsertContact(
    brandId: string,
    data: {
      email: string;
      field_values?: FieldValue[];
      list_ids?: string[];
      unsubscribe_all?: boolean;
      unsubscribe_ids?: string[];
    },
    validate?: boolean
  ): Promise<Contact> {
    this.validateFieldValues(data.field_values);
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/contacts/upsert`,
      data,
      {
        params: validate ? { validate: true } : undefined
      }
    );
    return this.hydrateMutation(response.data, 'contact upsert', id =>
      this.getContact(brandId, id)
    );
  }

  async deleteContact(brandId: string, contactId: string): Promise<void> {
    await this.http.delete(
      `/brands/${encodeURIComponent(brandId)}/contacts/${encodeURIComponent(contactId)}`
    );
  }

  // ---- Lists ----

  async listLists(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<ContactList>> {
    let response = await this.http.get(`/brands/${encodeURIComponent(brandId)}/lists`, {
      params
    });
    return response.data;
  }

  async getList(brandId: string, listId: string): Promise<ContactList> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/lists/${encodeURIComponent(listId)}`
    );
    return response.data;
  }

  async createList(brandId: string, data: { name: string }): Promise<ContactList> {
    let response = await this.http.post(`/brands/${encodeURIComponent(brandId)}/lists`, data);
    return this.hydrateMutation(response.data, 'list creation', id =>
      this.getList(brandId, id)
    );
  }

  async updateList(
    brandId: string,
    listId: string,
    data: { name: string }
  ): Promise<ContactList> {
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/lists/${encodeURIComponent(listId)}`,
      data
    );
    return this.hydrateMutation(response.data, 'list update', id => this.getList(brandId, id));
  }

  // ---- Fields ----

  async listFields(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Field>> {
    let response = await this.http.get(`/brands/${encodeURIComponent(brandId)}/fields`, {
      params
    });
    return response.data;
  }

  async getField(brandId: string, fieldId: string): Promise<Field> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/fields/${encodeURIComponent(fieldId)}`
    );
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
    let response = await this.http.post(`/brands/${encodeURIComponent(brandId)}/fields`, data);
    return this.hydrateMutation(response.data, 'field creation', id =>
      this.getField(brandId, id)
    );
  }

  // ---- Senders ----

  async listSenders(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<Sender>> {
    let response = await this.http.get(`/brands/${encodeURIComponent(brandId)}/senders`, {
      params
    });
    return response.data;
  }

  async getSender(brandId: string, senderId: string): Promise<Sender> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/senders/${encodeURIComponent(senderId)}`
    );
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
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/senders`,
      data
    );
    return this.hydrateMutation(response.data, 'sender creation', id =>
      this.getSender(brandId, id)
    );
  }

  async deleteSender(brandId: string, senderId: string): Promise<void> {
    await this.http.delete(
      `/brands/${encodeURIComponent(brandId)}/senders/${encodeURIComponent(senderId)}`
    );
  }

  // ---- Suppression Lists ----

  async getSuppressionList(
    brandId: string,
    suppressionListId: string
  ): Promise<SuppressionList> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/suppression-lists/${encodeURIComponent(suppressionListId)}`
    );
    return response.data;
  }

  // ---- Bulk Campaigns ----

  async listBulkCampaigns(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<BulkCampaign>> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/bulk-campaigns`,
      { params }
    );
    return response.data;
  }

  async getBulkCampaign(brandId: string, campaignId: string): Promise<BulkCampaign> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/bulk-campaigns/${encodeURIComponent(campaignId)}`
    );
    return response.data;
  }

  async createBulkCampaign(
    brandId: string,
    data: {
      name?: string;
      subject?: string;
      preview?: string;
      from?: { email?: string; name?: string };
      reply_to?: { email?: string; name?: string };
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
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/bulk-campaigns`,
      data
    );
    return this.hydrateMutation(response.data, 'bulk campaign creation', id =>
      this.getBulkCampaign(brandId, id)
    );
  }

  // ---- Transactional Campaigns ----

  async listTransactionalCampaigns(
    brandId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<TransactionalCampaign>> {
    let response = await this.http.get(
      `/brands/${encodeURIComponent(brandId)}/transactional-campaigns`,
      { params }
    );
    return response.data;
  }

  async sendTransactionalEmail(
    brandId: string,
    campaignId: string,
    data: {
      email: string;
      field_values?: FieldValue[];
      variables?: Array<{ name: string; value: string }>;
    }
  ): Promise<{ contact_id: string }> {
    this.validateFieldValues(data.field_values);
    let response = await this.http.post(
      `/brands/${encodeURIComponent(brandId)}/transactional-campaigns/${encodeURIComponent(campaignId)}/send`,
      data
    );
    return response.data;
  }
}
