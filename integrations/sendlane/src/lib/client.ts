import { createAxios } from 'slates';

export interface PaginationInfo {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface SendlaneContact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface SendlaneList {
  id: number;
  name: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface SendlaneTag {
  id: number;
  name: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface SendlaneCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface SendlaneCustomField {
  id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface SendlaneSender {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ContactCustomFieldValue {
  custom_field_id: number;
  value: string;
}

export interface AddContactParams {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailConsent?: boolean;
  smsConsent?: boolean;
  customFields?: Record<string, string>;
}

export interface LineItem {
  product_id: string | number;
  sku?: string;
  product_name: string;
  quantity: number;
  item_price: number;
  total: number;
  product_url?: string;
  product_image_url?: string;
}

export interface OrderPlacedParams {
  token: string;
  eventId: string;
  email: string;
  orderId?: string | number;
  subtotal?: number;
  totalTax?: number;
  total: number;
  totalItems?: number;
  currency?: string;
  lineItems: LineItem[];
  time?: number;
  dateCreated?: string;
  initialSync?: boolean;
  billingAddress?: Record<string, string>;
  shippingAddress?: Record<string, string>;
}

export interface CheckoutStartedParams {
  token: string;
  email: string;
  checkoutId: string;
  status?: string;
  checkoutUrl?: string;
  subtotal?: number;
  totalTax?: number;
  total: number;
  totalItems?: number;
  currency?: string;
  lineItems: LineItem[];
}

export interface OrderFulfilledParams {
  token: string;
  eventId: string;
  email: string;
  orderId?: string | number;
  total?: number;
  time?: number;
}

export interface CustomEventParams {
  token: string;
  email: string;
  eventName: string;
  eventId?: string;
  properties?: Record<string, unknown>;
}

export class SendlaneClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.sendlane.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Contacts ──────────────────────────────────────────

  async listContacts(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneContact>> {
    let response = await this.axios.get('/contacts', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async getContact(contactId: number): Promise<SendlaneContact> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    let body = response.data as any;
    return body.data ?? body;
  }

  async searchContacts(params: {
    email?: string;
    phone?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<SendlaneContact>> {
    let queryParams: Record<string, any> = {};
    if (params.email) queryParams.email = params.email;
    if (params.phone) queryParams.phone = params.phone;
    if (params.page) queryParams.page = params.page;
    if (params.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/contacts', { params: queryParams });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async unsubscribeContact(contactId: number): Promise<void> {
    await this.axios.put(`/contacts/${contactId}/unsubscribe`);
  }

  // ─── Lists ─────────────────────────────────────────────

  async listLists(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneList>> {
    let response = await this.axios.get('/lists', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async getListContacts(
    listId: number,
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneContact>> {
    let response = await this.axios.get(`/lists/${listId}/contacts`, {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async addContactToList(listId: number, contact: AddContactParams): Promise<any> {
    let body: Record<string, any> = {};
    if (contact.email) body.email = contact.email;
    if (contact.firstName) body.first_name = contact.firstName;
    if (contact.lastName) body.last_name = contact.lastName;
    if (contact.phone) body.phone = contact.phone;
    if (contact.emailConsent !== undefined) body.email_consent = contact.emailConsent;
    if (contact.smsConsent !== undefined) body.sms_consent = contact.smsConsent;

    if (contact.customFields) {
      body.custom_fields = contact.customFields;
    }

    let response = await this.axios.post(`/lists/${listId}/contacts`, body);
    return response.data;
  }

  async removeContactFromList(listId: number, contactId: number): Promise<void> {
    await this.axios.delete(`/lists/${listId}/contacts/${contactId}`);
  }

  // ─── Tags ──────────────────────────────────────────────

  async listTags(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneTag>> {
    let response = await this.axios.get('/tags', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async getContactTags(contactId: number): Promise<SendlaneTag[]> {
    let response = await this.axios.get(`/contacts/${contactId}/tags`);
    let body = response.data as any;
    return body.data ?? [];
  }

  async addTagsToContact(contactId: number, tagIds: number[]): Promise<void> {
    await this.axios.post(`/contacts/${contactId}/tags`, { tag_ids: tagIds });
  }

  async removeTagFromContact(contactId: number, tagId: number): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}/tags/${tagId}`);
  }

  // ─── Custom Fields ─────────────────────────────────────

  async listCustomFields(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneCustomField>> {
    let response = await this.axios.get('/custom-fields', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async getContactCustomFields(contactId: number): Promise<ContactCustomFieldValue[]> {
    let response = await this.axios.get(`/contacts/${contactId}/custom-fields`);
    let body = response.data as any;
    return body.data ?? [];
  }

  async updateContactCustomFields(
    contactId: number,
    customFields: Record<string, string>
  ): Promise<void> {
    await this.axios.put(`/contacts/${contactId}/custom-fields`, {
      custom_fields: customFields
    });
  }

  // ─── Campaigns ─────────────────────────────────────────

  async listCampaigns(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneCampaign>> {
    let response = await this.axios.get('/campaigns', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  // ─── Senders ───────────────────────────────────────────

  async listSenders(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneSender>> {
    let response = await this.axios.get('/senders', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  // ─── SMS Consent ───────────────────────────────────────

  async updateSmsConsent(
    contactId: number,
    smsConsent: boolean,
    phone?: string
  ): Promise<void> {
    let body: Record<string, any> = { sms_consent: smsConsent };
    if (phone) body.phone = phone;
    await this.axios.put(`/contacts/${contactId}/sms-consent`, body);
  }

  // ─── Suppression ───────────────────────────────────────

  async listSuppressed(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<{ email: string }>> {
    let response = await this.axios.get('/suppression', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  async addToSuppression(emails: string[]): Promise<void> {
    await this.axios.post('/suppression', { emails });
  }

  async removeFromSuppression(emails: string[]): Promise<void> {
    await this.axios.delete('/suppression', { data: { emails } });
  }

  // ─── Unsubscribed ──────────────────────────────────────

  async listUnsubscribed(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResponse<SendlaneContact>> {
    let response = await this.axios.get('/contacts/unsubscribed', {
      params: { page, per_page: perPage }
    });
    let body = response.data as any;
    return {
      data: body.data ?? [],
      pagination: this.extractPagination(body)
    };
  }

  // ─── Helpers ───────────────────────────────────────────

  private extractPagination(body: any): PaginationInfo {
    let pagination = body.pagination ?? body.meta ?? {};
    return {
      currentPage: pagination.current_page ?? 1,
      lastPage: pagination.last_page ?? 1,
      perPage: pagination.per_page ?? 25,
      total: pagination.total ?? 0
    };
  }
}
