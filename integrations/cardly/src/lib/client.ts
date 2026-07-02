import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  orderBy: string;
  orderDirection: string;
  startRecord: number;
  lastRecord: number;
  limit: number;
  page: number;
  offset: number;
  totalRecords: number;
}

export interface CardlyResponse<T> {
  state: {
    status: string;
    messages: string[];
    version: number;
  };
  data: T;
  meta?: PaginationMeta;
  testMode?: boolean;
}

export interface ArtworkPage {
  page: number;
  url?: string;
  image?: string;
}

export interface Artwork {
  id: string;
  revision: number;
  name: string;
  slug: string;
  fullPath: string;
  description: string;
  artwork: ArtworkPage[];
  media: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactList {
  id: string;
  name: string;
  slug: string;
  customFields: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  address: string;
  address2?: string;
  city: string;
  region?: string;
  country: string;
  postcode?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  description?: string;
  style?: Record<string, unknown>;
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  status: string;
  purchaseOrderNumber?: string;
  lines: Record<string, unknown>[];
  cost?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaType {
  id: string;
  name: string;
  slug: string;
  dimensions?: Record<string, unknown>;
  creditCost?: number;
}

export interface Font {
  id: string;
  name: string;
  slug: string;
  category?: string;
}

export interface WritingStyle {
  id: string;
  name: string;
  slug: string;
}

export interface Doodle {
  id: string;
  name: string;
  slug: string;
  url?: string;
}

export interface CreditHistory {
  id: string;
  orderId?: string;
  transactionId?: string;
  type: string;
  typeCode: string;
  change: number;
  newBalance: number;
  effectiveTime: string;
  notes?: string;
}

export interface AccountBalance {
  balance: number;
  giftCredit: {
    balance: number;
    currency: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions?: string[];
}

export interface Invitation {
  id: string;
  email: string;
  permissions: string[];
  status?: string;
  createdAt: string;
}

export interface OrderRecipient {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  address2?: string;
  city: string;
  region?: string;
  country: string;
  postcode?: string;
}

export interface OrderSender {
  firstName: string;
  lastName: string;
  company?: string;
  address?: string;
  address2?: string;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
}

export interface OrderLineItem {
  artwork: string;
  template: string;
  recipient: OrderRecipient;
  sender?: OrderSender;
  variables?: Record<string, string>;
  shipToMe?: boolean;
  shippingMethod?: string;
}

export interface PlaceOrderParams {
  lines: OrderLineItem[];
  requestedArrivalDate?: string;
  purchaseOrderNumber?: string;
  idempotencyKey?: string;
}

export class CardlyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.card.ly/v2',
      headers: {
        'API-Key': config.token,
        'Content-type': 'text/json'
      }
    });
  }

  // ---- Account ----

  async getBalance(): Promise<AccountBalance> {
    let response = await this.axios.get('/account/balance');
    return response.data.data;
  }

  async listCreditHistory(
    params?: PaginationParams & {
      effectiveTimeLt?: string;
      effectiveTimeLte?: string;
      effectiveTimeGt?: string;
      effectiveTimeGte?: string;
    }
  ): Promise<{ records: CreditHistory[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.effectiveTimeLt) queryParams['effectiveTime.lt'] = params.effectiveTimeLt;
    if (params?.effectiveTimeLte) queryParams['effectiveTime.lte'] = params.effectiveTimeLte;
    if (params?.effectiveTimeGt) queryParams['effectiveTime.gt'] = params.effectiveTimeGt;
    if (params?.effectiveTimeGte) queryParams['effectiveTime.gte'] = params.effectiveTimeGte;

    let response = await this.axios.get('/account/credit-history', { params: queryParams });
    return { records: response.data.data, meta: response.data.meta };
  }

  async listGiftCreditHistory(
    params?: PaginationParams & {
      effectiveTimeLt?: string;
      effectiveTimeLte?: string;
      effectiveTimeGt?: string;
      effectiveTimeGte?: string;
    }
  ): Promise<{ records: CreditHistory[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.effectiveTimeLt) queryParams['effectiveTime.lt'] = params.effectiveTimeLt;
    if (params?.effectiveTimeLte) queryParams['effectiveTime.lte'] = params.effectiveTimeLte;
    if (params?.effectiveTimeGt) queryParams['effectiveTime.gt'] = params.effectiveTimeGt;
    if (params?.effectiveTimeGte) queryParams['effectiveTime.gte'] = params.effectiveTimeGte;

    let response = await this.axios.get('/account/gift-credit-history', {
      params: queryParams
    });
    return { records: response.data.data, meta: response.data.meta };
  }

  // ---- Artwork ----

  async listArtwork(
    params?: PaginationParams & { ownOnly?: boolean }
  ): Promise<{ artwork: Artwork[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.ownOnly !== undefined) queryParams.ownOnly = String(params.ownOnly);

    let response = await this.axios.get('/art', { params: queryParams });
    return { artwork: response.data.data, meta: response.data.meta };
  }

  async getArtwork(artworkId: string): Promise<Artwork> {
    let response = await this.axios.get(`/art/${artworkId}`);
    return response.data.data;
  }

  async createArtwork(params: {
    media: string;
    name: string;
    description?: string;
    artwork: Array<{ page: number; image: string }>;
  }): Promise<Artwork> {
    let response = await this.axios.post('/art', params);
    return response.data.data;
  }

  async editArtwork(
    artworkId: string,
    params: {
      name?: string;
      description?: string;
      artwork?: Array<{ page: number; image: string }>;
    }
  ): Promise<Artwork> {
    let response = await this.axios.post(`/art/${artworkId}`, params);
    return response.data.data;
  }

  async deleteArtwork(artworkId: string): Promise<void> {
    await this.axios.delete(`/art/${artworkId}`);
  }

  // ---- Contact Lists ----

  async listContactLists(
    params?: PaginationParams
  ): Promise<{ lists: ContactList[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/contact-lists', { params: queryParams });
    return { lists: response.data.data, meta: response.data.meta };
  }

  async getContactList(listId: string): Promise<ContactList> {
    let response = await this.axios.get(`/contact-lists/${listId}`);
    return response.data.data;
  }

  async createContactList(params: {
    name: string;
    customFields?: Array<{ name: string; type: string }>;
  }): Promise<ContactList> {
    let response = await this.axios.post('/contact-lists', params);
    return response.data.data;
  }

  async deleteContactList(listId: string): Promise<void> {
    await this.axios.delete(`/contact-lists/${listId}`);
  }

  // ---- Contacts ----

  async listContacts(
    listId: string,
    params?: PaginationParams
  ): Promise<{ contacts: Contact[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get(`/contact-lists/${listId}/contacts`, {
      params: queryParams
    });
    return { contacts: response.data.data, meta: response.data.meta };
  }

  async getContact(listId: string, contactId: string): Promise<Contact> {
    let response = await this.axios.get(`/contact-lists/${listId}/contacts/${contactId}`);
    return response.data.data;
  }

  async findContact(
    listId: string,
    params: { email?: string; externalId?: string }
  ): Promise<Contact> {
    let queryParams: Record<string, string> = {};
    if (params.email) queryParams.email = params.email;
    if (params.externalId) queryParams.externalId = params.externalId;

    let response = await this.axios.get(`/contact-lists/${listId}/contacts/find`, {
      params: queryParams
    });
    return response.data.data;
  }

  async createContact(
    listId: string,
    params: {
      firstName: string;
      lastName: string;
      email?: string;
      externalId?: string;
      company?: string;
      address: string;
      address2?: string;
      city: string;
      region?: string;
      country: string;
      postcode?: string;
      customFields?: Record<string, unknown>;
    }
  ): Promise<Contact> {
    let response = await this.axios.post(`/contact-lists/${listId}/contacts`, params);
    return response.data.data;
  }

  async editContact(
    listId: string,
    contactId: string,
    params: {
      firstName?: string;
      lastName?: string;
      email?: string;
      externalId?: string;
      company?: string;
      address?: string;
      address2?: string;
      city?: string;
      region?: string;
      country?: string;
      postcode?: string;
      customFields?: Record<string, unknown>;
    }
  ): Promise<Contact> {
    let response = await this.axios.post(
      `/contact-lists/${listId}/contacts/${contactId}`,
      params
    );
    return response.data.data;
  }

  async deleteContact(listId: string, contactId: string): Promise<void> {
    await this.axios.delete(`/contact-lists/${listId}/contacts/${contactId}`);
  }

  async deleteContactByFilter(
    listId: string,
    params: { email?: string; externalId?: string }
  ): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (params.email) queryParams.email = params.email;
    if (params.externalId) queryParams.externalId = params.externalId;

    await this.axios.delete(`/contact-lists/${listId}/contacts`, { params: queryParams });
  }

  async syncContact(
    listId: string,
    params: {
      firstName: string;
      lastName: string;
      email?: string;
      externalId?: string;
      company?: string;
      address: string;
      address2?: string;
      city: string;
      region?: string;
      country: string;
      postcode?: string;
      customFields?: Record<string, unknown>;
    }
  ): Promise<Contact> {
    let response = await this.axios.post(`/contact-lists/${listId}/contacts/sync`, params);
    return response.data.data;
  }

  // ---- Templates ----

  async listTemplates(
    params?: PaginationParams
  ): Promise<{ templates: Template[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/templates', { params: queryParams });
    return { templates: response.data.data, meta: response.data.meta };
  }

  // ---- Orders ----

  async listOrders(
    params?: PaginationParams
  ): Promise<{ orders: Order[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/orders', { params: queryParams });
    return { orders: response.data.data, meta: response.data.meta };
  }

  async getOrder(orderId: string): Promise<Order> {
    let response = await this.axios.get(`/orders/${orderId}`);
    return response.data.data;
  }

  async placeOrder(params: PlaceOrderParams): Promise<Order> {
    let headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }

    let body: Record<string, unknown> = {
      lines: params.lines.map(line => {
        let mapped: Record<string, unknown> = {
          artwork: line.artwork,
          template: line.template,
          recipient: line.recipient
        };
        if (line.sender) mapped.sender = line.sender;
        if (line.variables) mapped.variables = line.variables;
        if (line.shipToMe !== undefined) mapped.shipToMe = line.shipToMe;
        if (line.shippingMethod) mapped.shippingMethod = line.shippingMethod;
        return mapped;
      })
    };

    if (params.requestedArrivalDate) body.requestedArrivalDate = params.requestedArrivalDate;
    if (params.purchaseOrderNumber) body.purchaseOrderNumber = params.purchaseOrderNumber;

    let response = await this.axios.post('/orders/place', body, { headers });
    return response.data.data;
  }

  async generatePreview(params: {
    artwork: string;
    template: string;
    recipient: OrderRecipient;
    sender?: OrderSender;
    variables?: Record<string, string>;
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/orders/preview', params);
    return response.data.data;
  }

  // ---- Resources ----

  async listMedia(
    params?: PaginationParams
  ): Promise<{ media: MediaType[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/media', { params: queryParams });
    return { media: response.data.data, meta: response.data.meta };
  }

  async listFonts(
    params?: PaginationParams & { organisationOnly?: boolean }
  ): Promise<{ fonts: Font[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.organisationOnly !== undefined)
      queryParams.organisationOnly = String(params.organisationOnly);

    let response = await this.axios.get('/fonts', { params: queryParams });
    return { fonts: response.data.data, meta: response.data.meta };
  }

  async listWritingStyles(
    params?: PaginationParams
  ): Promise<{ styles: WritingStyle[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/writing-styles', { params: queryParams });
    return { styles: response.data.data, meta: response.data.meta };
  }

  async listDoodles(
    params?: PaginationParams & { organisationOnly?: boolean }
  ): Promise<{ doodles: Doodle[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);
    if (params?.organisationOnly !== undefined)
      queryParams.organisationOnly = String(params.organisationOnly);

    let response = await this.axios.get('/doodles', { params: queryParams });
    return { doodles: response.data.data, meta: response.data.meta };
  }

  // ---- Users ----

  async listUsers(
    params?: PaginationParams
  ): Promise<{ users: User[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/users', { params: queryParams });
    return { users: response.data.data, meta: response.data.meta };
  }

  async getUser(userId: string): Promise<User> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data.data;
  }

  async removeUser(userId: string): Promise<void> {
    await this.axios.delete(`/users/${userId}`);
  }

  // ---- Invitations ----

  async listInvitations(
    params?: PaginationParams
  ): Promise<{ invitations: Invitation[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/invitations', { params: queryParams });
    return { invitations: response.data.data, meta: response.data.meta };
  }

  async getInvitation(invitationId: string): Promise<Invitation> {
    let response = await this.axios.get(`/invitations/${invitationId}`);
    return response.data.data;
  }

  async findInvitation(email: string): Promise<Invitation> {
    let response = await this.axios.get('/invitations/find', { params: { email } });
    return response.data.data;
  }

  async createInvitation(params: {
    email: string;
    permissions: string[];
  }): Promise<Invitation> {
    let response = await this.axios.post('/invitations', params);
    return response.data.data;
  }

  async resendInvitation(invitationId: string): Promise<void> {
    await this.axios.post(`/invitations/resend/${invitationId}`);
  }

  async resendInvitationByEmail(email: string): Promise<void> {
    await this.axios.post('/invitations/resend', { email });
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    await this.axios.delete(`/invitations/${invitationId}`);
  }

  async deleteInvitationByEmail(email: string): Promise<void> {
    await this.axios.delete('/invitations', { params: { email } });
  }

  // ---- Webhooks ----

  async listWebhooks(
    params?: PaginationParams
  ): Promise<{ webhooks: Webhook[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/webhooks', { params: queryParams });
    return { webhooks: response.data.data, meta: response.data.meta };
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data.data;
  }

  async createWebhook(params: {
    url: string;
    events: string[];
    enabled?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<Webhook> {
    let response = await this.axios.post('/webhooks', params);
    return response.data.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      url?: string;
      events?: string[];
      enabled?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Webhook> {
    let response = await this.axios.post(`/webhooks/${webhookId}`, params);
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}
