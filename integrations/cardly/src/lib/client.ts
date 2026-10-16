import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

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
  raw?: Record<string, unknown>;
  id: string;
  name: string;
  slug?: string;
  customFields: Array<{
    id: string;
    name: string;
    slug?: string;
    type: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  raw?: Record<string, unknown>;
  id: string;
  externalId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  company?: string;
  address: string;
  address2?: string;
  city: string;
  region?: string;
  country: string;
  postcode?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
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
  slug?: string;
  dimensions?: Record<string, unknown>;
  creditCost?: number;
}

export interface Font {
  id: string;
  name: string;
  slug?: string;
  category?: string;
}

export interface WritingStyle {
  id: string;
  name: string;
  slug?: string;
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
  raw?: Record<string, unknown>;
  id: string;
  firstName?: string;
  lastName?: string;
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

type ProviderArtwork = Omit<Artwork, 'artwork'> & { artwork: Array<string | null> };
type ProviderContact = Omit<
  Contact,
  | 'raw'
  | 'lastName'
  | 'externalId'
  | 'email'
  | 'company'
  | 'address2'
  | 'city'
  | 'region'
  | 'postcode'
  | 'customFields'
  | 'createdAt'
  | 'updatedAt'
> & {
  lastName?: string | null;
  externalId?: string | null;
  email?: string | null;
  company?: string | null;
  address2?: string | null;
  locality: string;
  adminAreaLevel1?: string | null;
  postcode?: string | null;
  fields?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
type ProviderContactList = ContactList & {
  fields: Array<{ id: string; name: string; code: string; type: string }>;
};
type ProviderOrder = Order & {
  items: Record<string, unknown>[];
  costs?: Record<string, unknown>;
  timings: { created: string; updated: string };
  customer?: { purchaseOrderNo?: string };
};
type ProviderWebhook = Webhook & { targetUrl: string; status: string };
type ProviderUser = Omit<User, 'permissions' | 'firstName' | 'lastName'> & {
  firstName?: string | null;
  lastName?: string | null;
  permissions?: Record<string, boolean>;
};
type ProviderInvitation = Omit<Invitation, 'permissions'> & {
  permissions: Record<string, boolean>;
  invited: string;
};

let normalizeArtwork = (artwork: ProviderArtwork): Artwork => ({
  ...artwork,
  artwork: artwork.artwork.map((url, index) => ({ page: index + 1, url: url ?? undefined }))
});

let normalizeContact = (contact: ProviderContact): Contact => ({
  ...contact,
  externalId: contact.externalId ?? undefined,
  email: contact.email ?? undefined,
  company: contact.company ?? undefined,
  address2: contact.address2 ?? undefined,
  city: contact.locality,
  region: contact.adminAreaLevel1 ?? undefined,
  postcode: contact.postcode ?? undefined,
  customFields: contact.fields ?? undefined,
  lastName: contact.lastName ?? undefined,
  createdAt: contact.createdAt ?? undefined,
  updatedAt: contact.updatedAt ?? undefined,
  raw: { ...contact }
});

let normalizeContactList = (list: ProviderContactList): ContactList => ({
  ...list,
  slug: list.slug ?? undefined,
  createdAt: list.createdAt ?? undefined,
  updatedAt: list.updatedAt ?? undefined,
  customFields: (list.fields ?? []).map(field => ({ ...field, slug: field.code })),
  raw: { ...list }
});

let normalizeOrder = (order: ProviderOrder): Order => ({
  ...order,
  lines: order.items,
  cost: order.costs,
  purchaseOrderNumber: order.customer?.purchaseOrderNo,
  createdAt: order.timings.created,
  updatedAt: order.timings.updated
});

let normalizeWebhook = (webhook: ProviderWebhook): Webhook => ({
  ...webhook,
  url: webhook.targetUrl,
  enabled: webhook.status === 'active'
});

let permissionNames = (permissions: Record<string, boolean> = {}) =>
  Object.entries(permissions)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

let normalizeUser = (user: ProviderUser): User => ({
  ...user,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  permissions: permissionNames(user.permissions),
  raw: { ...user }
});

let normalizeInvitation = (invitation: ProviderInvitation): Invitation => ({
  ...invitation,
  permissions: permissionNames(invitation.permissions),
  createdAt: invitation.invited
});

let validateSender = (sender?: OrderSender) => {
  if (sender && (!sender.address || !sender.city || !sender.country)) {
    throw createApiServiceError(
      'When supplying sender details, include the street address, city, and country, plus region and postal code when required by that country.'
    );
  }
};

export class CardlyClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.card.ly/v2',
      authHeader: { name: 'API-Key', value: config.token },
      contentType: 'text/json',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Cardly',
          reason: 'cardly_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['message', 'messages', 'error', 'validation'],
          nestedKeys: ['state', 'errors', 'validation', 'messages']
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.state?.status === 'ERROR') {
        throw createApiServiceError(
          `Cardly could not complete the request: ${(response.data.state.messages ?? []).join('; ') || 'Unknown provider error'}`
        );
      }
      return response;
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
    return { records: response.data.data.results, meta: response.data.data.meta };
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
    return { records: response.data.data.results, meta: response.data.data.meta };
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
    return {
      artwork: response.data.data.results.map(normalizeArtwork),
      meta: response.data.data.meta
    };
  }

  async getArtwork(artworkId: string): Promise<Artwork> {
    let response = await this.axios.get(`/art/${encodeURIComponent(artworkId)}`);
    return normalizeArtwork(response.data.data);
  }

  async createArtwork(params: {
    media: string;
    name: string;
    description?: string;
    artwork: Array<{ page: number; image: string }>;
  }): Promise<Artwork> {
    let response = await this.axios.post('/art', params);
    return normalizeArtwork(response.data.data);
  }

  async editArtwork(
    artworkId: string,
    params: {
      name?: string;
      description?: string;
      artwork?: Array<{ page: number; image: string }>;
    }
  ): Promise<Artwork> {
    let response = await this.axios.post(`/art/${encodeURIComponent(artworkId)}`, params);
    return normalizeArtwork(response.data.data);
  }

  async deleteArtwork(artworkId: string): Promise<void> {
    await this.axios.delete(`/art/${encodeURIComponent(artworkId)}`);
  }

  // ---- Contact Lists ----

  async listContactLists(
    params?: PaginationParams
  ): Promise<{ lists: ContactList[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/contact-lists', { params: queryParams });
    return {
      lists: response.data.data.results.map(normalizeContactList),
      meta: response.data.data.meta
    };
  }

  async getContactList(listId: string): Promise<ContactList> {
    let response = await this.axios.get(`/contact-lists/${encodeURIComponent(listId)}`);
    return normalizeContactList(response.data.data);
  }

  async createContactList(params: {
    name: string;
    customFields?: Array<{ name: string; type: string }>;
  }): Promise<ContactList> {
    let response = await this.axios.post('/contact-lists', {
      name: params.name,
      fields: params.customFields
    });
    return normalizeContactList(response.data.data);
  }

  async deleteContactList(listId: string): Promise<void> {
    await this.axios.delete(`/contact-lists/${encodeURIComponent(listId)}`);
  }

  // ---- Contacts ----

  async listContacts(
    listId: string,
    params?: PaginationParams
  ): Promise<{ contacts: Contact[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get(
      `/contact-lists/${encodeURIComponent(listId)}/contacts`,
      {
        params: queryParams
      }
    );
    return {
      contacts: response.data.data.results.map(normalizeContact),
      meta: response.data.data.meta
    };
  }

  async getContact(listId: string, contactId: string): Promise<Contact> {
    let response = await this.axios.get(
      `/contact-lists/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(contactId)}`
    );
    return normalizeContact(response.data.data);
  }

  async findContact(
    listId: string,
    params: { email?: string; externalId?: string }
  ): Promise<Contact> {
    let query = params.externalId || params.email;
    if (!query)
      throw createApiServiceError(
        'Provide an email address or external ID to find a contact.'
      );

    let response = await this.axios.get(
      `/contact-lists/${encodeURIComponent(listId)}/contacts/find`,
      {
        params: { query }
      }
    );
    return normalizeContact(response.data.data);
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
    let { city, customFields, ...contact } = params;
    let response = await this.axios.post(
      `/contact-lists/${encodeURIComponent(listId)}/contacts`,
      { ...contact, locality: city, fields: customFields }
    );
    return normalizeContact(response.data.data);
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
    let { city, customFields, ...contact } = params;
    let response = await this.axios.post(
      `/contact-lists/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(contactId)}`,
      { ...contact, locality: city, fields: customFields }
    );
    return normalizeContact(response.data.data);
  }

  async deleteContact(listId: string, contactId: string): Promise<void> {
    await this.axios.delete(
      `/contact-lists/${encodeURIComponent(listId)}/contacts/${encodeURIComponent(contactId)}`
    );
  }

  async deleteContactByFilter(
    listId: string,
    params: { email?: string; externalId?: string }
  ): Promise<void> {
    let queryParams: Record<string, string> = {};
    if (params.email) queryParams.email = params.email;
    if (params.externalId) queryParams.externalId = params.externalId;

    if (!params.email && !params.externalId)
      throw createApiServiceError(
        'Provide a contact ID, email address, or external ID to delete a contact.'
      );
    await this.axios.delete(`/contact-lists/${encodeURIComponent(listId)}/contacts`, {
      data: queryParams
    });
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
    let { city, customFields, ...contact } = params;
    if (!params.email && !params.externalId)
      throw createApiServiceError(
        'Provide an email address or external ID to sync a contact.'
      );
    let response = await this.axios.post(
      `/contact-lists/${encodeURIComponent(listId)}/contacts/sync`,
      { ...contact, locality: city, fields: customFields }
    );
    return normalizeContact(response.data.data);
  }

  // ---- Templates ----

  async listTemplates(
    params?: PaginationParams
  ): Promise<{ templates: Template[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/templates', { params: queryParams });
    return {
      templates: response.data.data.results.map(
        (
          template: Template & {
            definition?: {
              style?: Record<string, unknown>;
              variables?: Record<string, unknown>;
            };
          }
        ) => ({
          ...template,
          style: template.definition?.style,
          variables: template.definition?.variables
            ? Object.keys(template.definition.variables)
            : undefined
        })
      ),
      meta: response.data.data.meta
    };
  }

  // ---- Orders ----

  async listOrders(
    params?: PaginationParams
  ): Promise<{ orders: Order[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/orders', { params: queryParams });
    return {
      orders: response.data.data.results.map(normalizeOrder),
      meta: response.data.data.meta
    };
  }

  async getOrder(orderId: string): Promise<Order> {
    let response = await this.axios.get(`/orders/${encodeURIComponent(orderId)}`);
    return normalizeOrder(response.data.data);
  }

  async placeOrder(params: PlaceOrderParams): Promise<Order> {
    if (params.idempotencyKey && params.idempotencyKey.length > 64)
      throw createApiServiceError('The idempotency key must be at most 64 characters.');
    for (let line of params.lines) {
      validateSender(line.sender);
      if (
        line.shippingMethod &&
        !['standard', 'tracked', 'express'].includes(line.shippingMethod)
      ) {
        throw createApiServiceError('Shipping method must be standard, tracked, or express.');
      }
    }
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
        if (params.requestedArrivalDate) mapped.requestedArrival = params.requestedArrivalDate;
        return mapped;
      })
    };

    if (params.purchaseOrderNumber) body.purchaseOrderNumber = params.purchaseOrderNumber;

    let response = await this.axios.post('/orders/place', body, { headers });
    return normalizeOrder(response.data.data.order);
  }

  async generatePreview(params: {
    artwork: string;
    template: string;
    recipient: OrderRecipient;
    sender?: OrderSender;
    variables?: Record<string, string>;
  }): Promise<Record<string, unknown>> {
    validateSender(params.sender);
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
    return {
      media: response.data.data.results.map((media: MediaType) => ({
        ...media,
        slug: media.slug ?? undefined
      })),
      meta: response.data.data.meta
    };
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
    return {
      fonts: response.data.data.results.map((font: Font) => ({
        ...font,
        slug: font.slug ?? undefined
      })),
      meta: response.data.data.meta
    };
  }

  async listWritingStyles(
    params?: PaginationParams
  ): Promise<{ styles: WritingStyle[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/writing-styles', { params: queryParams });
    return {
      styles: response.data.data.results.map((style: WritingStyle) => ({
        ...style,
        slug: style.slug ?? undefined
      })),
      meta: response.data.data.meta
    };
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
    return {
      doodles: response.data.data.results.map((doodle: Doodle & { image?: string }) => ({
        ...doodle,
        url: doodle.image
      })),
      meta: response.data.data.meta
    };
  }

  // ---- Users ----

  async listUsers(
    params?: PaginationParams
  ): Promise<{ users: User[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/users', { params: queryParams });
    return {
      users: response.data.data.results.map(normalizeUser),
      meta: response.data.data.meta
    };
  }

  async getUser(userId: string): Promise<User> {
    let response = await this.axios.get(`/users/${encodeURIComponent(userId)}`);
    return normalizeUser(response.data.data);
  }

  async removeUser(userId: string): Promise<void> {
    await this.axios.delete(`/users/${encodeURIComponent(userId)}`);
  }

  // ---- Invitations ----

  async listInvitations(
    params?: PaginationParams & {
      acceptedOnly?: boolean;
      expiredOnly?: boolean;
      includeAccepted?: boolean;
    }
  ): Promise<{ invitations: Invitation[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    for (let key of ['acceptedOnly', 'expiredOnly', 'includeAccepted'] as const) {
      if (params?.[key] !== undefined) queryParams[key] = String(params[key]);
    }

    let response = await this.axios.get('/invitations', { params: queryParams });
    return {
      invitations: response.data.data.results.map(normalizeInvitation),
      meta: response.data.data.meta
    };
  }

  async getInvitation(invitationId: string): Promise<Invitation> {
    let response = await this.axios.get(`/invitations/${encodeURIComponent(invitationId)}`);
    return normalizeInvitation(response.data.data);
  }

  async findInvitation(email: string): Promise<Invitation> {
    let response = await this.axios.get('/invitations/find', { params: { email } });
    return normalizeInvitation(response.data.data);
  }

  async createInvitation(params: {
    email: string;
    permissions: string[];
  }): Promise<Invitation> {
    let response = await this.axios.post('/invitations', params);
    return normalizeInvitation(response.data.data);
  }

  async resendInvitation(invitationId: string): Promise<void> {
    await this.axios.post(`/invitations/resend/${encodeURIComponent(invitationId)}`);
  }

  async resendInvitationByEmail(email: string): Promise<void> {
    await this.axios.post('/invitations/resend', { email });
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    await this.axios.delete(`/invitations/${encodeURIComponent(invitationId)}`);
  }

  async deleteInvitationByEmail(email: string): Promise<void> {
    await this.axios.delete('/invitations', { data: { email } });
  }

  // ---- Webhooks ----

  async listWebhooks(
    params?: PaginationParams
  ): Promise<{ webhooks: Webhook[]; meta: PaginationMeta }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.axios.get('/webhooks', { params: queryParams });
    return {
      webhooks: response.data.data.results.map(normalizeWebhook),
      meta: response.data.data.meta
    };
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`);
    return normalizeWebhook(response.data.data);
  }

  async createWebhook(params: {
    url: string;
    events: string[];
    enabled?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<Webhook> {
    let response = await this.axios.post('/webhooks', {
      targetUrl: params.url,
      events: params.events,
      metadata: params.metadata
    });
    let webhook = normalizeWebhook(response.data.data);
    if (params.enabled === false) {
      try {
        let updated = await this.updateWebhook(webhook.id, { enabled: false });
        return { ...updated, secret: webhook.secret };
      } catch (error) {
        throw createApiServiceError(
          `Webhook ${webhook.id} was created but could not be disabled. Use update_webhook with this ID to disable it, or delete_webhook to remove it.`,
          { parent: error }
        );
      }
    }
    return webhook;
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
    let targetUrl = params.url ?? (await this.getWebhook(webhookId)).url;
    let response = await this.axios.post(`/webhooks/${encodeURIComponent(webhookId)}`, {
      targetUrl,
      events: params.events,
      disabled: params.enabled === undefined ? undefined : !params.enabled,
      metadata: params.metadata
    });
    return normalizeWebhook(response.data.data);
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
  }
}
