import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

export let dubApi = createAxios({
  baseURL: 'https://api.dub.co',
  timeout: 30000
});
dubApi.interceptors.response.use(
  response => response,
  error =>
    Promise.reject(
      buildApiServiceError(error, {
        providerLabel: 'Dub',
        reason: 'dub_api_error'
      })
    )
);
let api = dubApi;

export let userInfoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable()
  })
});

export interface DubFolder {
  id: string;
  name: string;
  description: string | null;
  type: 'default' | 'mega';
  accessLevel: 'read' | 'write' | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCustomerParams {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  externalId?: string;
  stripeCustomerId?: string | null;
  country?: string;
  subscriptionCanceledAt?: string | null;
}

export interface DubLink {
  id: string;
  domain: string;
  key: string;
  url: string;
  shortLink: string;
  qrCode: string;
  archived: boolean;
  externalId: string | null;
  tenantId: string | null;
  programId: string | null;
  partnerId: string | null;
  folderId: string | null;
  trackConversion: boolean;
  proxy: boolean;
  rewrite: boolean;
  doIndex: boolean;
  password: string | null;
  expiresAt: string | null;
  expiredUrl: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  video: string | null;
  ios: string | null;
  android: string | null;
  geo: Record<string, string> | null;
  comments: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
  lastClicked: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
  tags: Array<{ id: string; name: string; color: string }> | null;
  webhookIds: string[];
  testVariants: Array<{ url: string; percentage: number }> | null;
  testStartedAt: string | null;
  testCompletedAt: string | null;
}

export interface DubTag {
  id: string;
  name: string;
  color: string;
}

export interface DubDomain {
  id: string;
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  placeholder: string | null;
  expiredUrl: string | null;
  notFoundUrl: string | null;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DubCustomer extends Record<string, unknown> {
  id: string;
  name?: string | null;
  externalId: string;
  email?: string | null;
  avatar?: string | null;
  country?: string | null;
  createdAt: string;
  sales?: number | null;
  saleAmount?: number | null;
  stripeCustomerId?: string | null;
  firstSaleAt?: string | null;
  subscriptionCanceledAt?: string | null;
}

export interface CreateLinkParams {
  url: string;
  domain?: string;
  key?: string;
  externalId?: string;
  tenantId?: string;
  programId?: string;
  partnerId?: string;
  prefix?: string;
  trackConversion?: boolean;
  archived?: boolean;
  tagIds?: string[];
  tagNames?: string[];
  folderId?: string;
  comments?: string;
  expiresAt?: string;
  expiredUrl?: string;
  password?: string;
  proxy?: boolean;
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  rewrite?: boolean;
  ios?: string;
  android?: string;
  geo?: Record<string, string>;
  doIndex?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  webhookIds?: string[];
}

export interface UpdateLinkParams {
  url?: string;
  domain?: string;
  key?: string;
  externalId?: string;
  tenantId?: string;
  programId?: string;
  partnerId?: string;
  trackConversion?: boolean;
  archived?: boolean;
  tagIds?: string[];
  tagNames?: string[];
  folderId?: string;
  comments?: string;
  expiresAt?: string;
  expiredUrl?: string;
  password?: string;
  proxy?: boolean;
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  rewrite?: boolean;
  ios?: string;
  android?: string;
  geo?: Record<string, string>;
  doIndex?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  webhookIds?: string[];
}

export interface ListLinksParams {
  startingAfter?: string;
  endingBefore?: string;
  domain?: string;
  tagIds?: string[];
  tagNames?: string[];
  folderId?: string;
  search?: string;
  userId?: string;
  tenantId?: string;
  showArchived?: boolean;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface AnalyticsParams {
  event?: string;
  groupBy?: string;
  domain?: string;
  key?: string;
  linkId?: string;
  externalId?: string;
  tenantId?: string;
  tagId?: string;
  folderId?: string;
  partnerId?: string;
  customerId?: string;
  interval?: string;
  start?: string;
  end?: string;
  timezone?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  trigger?: string;
  referer?: string;
  url?: string;
  root?: boolean;
  saleType?: string;
}

export interface TrackLeadParams {
  clickId: string;
  eventName: string;
  customerExternalId: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackSaleParams {
  customerExternalId: string;
  amount: number;
  currency?: string;
  eventName?: string;
  paymentProcessor?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
  clickId?: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
}

export interface ListCustomersParams {
  startingAfter?: string;
  endingBefore?: string;
  email?: string;
  externalId?: string;
  search?: string;
  country?: string;
  linkId?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTagsParams {
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  ids?: string[];
  page?: number;
  pageSize?: number;
}

export interface ListDomainsParams {
  archived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    if (!config.token?.trim())
      throw createApiServiceError('Connect a Dub account before making requests.');
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getCurrentUser() {
    let response = await api.get('/oauth/userinfo', { headers: this.headers });
    let result = userInfoSchema.safeParse(response.data);
    if (!result.success)
      throw createApiServiceError(
        'Dub returned an invalid user profile. Reconnect your account.'
      );
    return result.data;
  }

  async listFolders(
    params: { search?: string; page?: number; pageSize?: number } = {}
  ): Promise<DubFolder[]> {
    let response = await api.get('/folders', { headers: this.headers, params });
    return response.data;
  }

  async createFolder(params: {
    name: string;
    description?: string | null;
  }): Promise<DubFolder> {
    let response = await api.post('/folders', params, { headers: this.headers });
    return response.data;
  }

  async updateFolder(
    id: string,
    params: { name?: string; description?: string | null }
  ): Promise<DubFolder> {
    let response = await api.patch(`/folders/${encodeURIComponent(id)}`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFolder(id: string): Promise<{ id: string }> {
    let response = await api.delete(`/folders/${encodeURIComponent(id)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCustomer(id: string, params: UpdateCustomerParams): Promise<DubCustomer> {
    let response = await api.patch(`/customers/${encodeURIComponent(id)}`, params, {
      headers: this.headers
    });
    return response.data;
  }

  // Links

  async createLink(params: CreateLinkParams): Promise<DubLink> {
    let response = await api.post('/links', params, { headers: this.headers });
    return response.data as DubLink;
  }

  async getLink(params: {
    linkId?: string;
    externalId?: string;
    domain?: string;
    key?: string;
  }): Promise<DubLink> {
    let identifiers =
      Number(Boolean(params.linkId)) +
      Number(Boolean(params.externalId)) +
      Number(Boolean(params.domain || params.key));
    if (identifiers !== 1 || Boolean(params.domain) !== Boolean(params.key)) {
      throw createApiServiceError(
        'Provide exactly one link identifier: linkId, externalId, or both domain and slug.'
      );
    }
    let query = new URLSearchParams();
    if (params.linkId) query.set('linkId', params.linkId);
    if (params.externalId)
      query.set(
        'externalId',
        params.externalId.startsWith('ext_') ? params.externalId : `ext_${params.externalId}`
      );
    if (params.domain) query.set('domain', params.domain);
    if (params.key) query.set('key', params.key);

    let response = await api.get(`/links/info?${query.toString()}`, { headers: this.headers });
    return response.data as DubLink;
  }

  async listLinks(params: ListLinksParams = {}): Promise<DubLink[]> {
    if (params.startingAfter && params.endingBefore)
      throw createApiServiceError('Use startingAfter or endingBefore, not both.');
    let query = new URLSearchParams();
    if (params.startingAfter) query.set('startingAfter', params.startingAfter);
    if (params.endingBefore) query.set('endingBefore', params.endingBefore);
    if (params.domain) query.set('domain', params.domain);
    if (params.tagIds) params.tagIds.forEach(id => query.append('tagIds', id));
    if (params.tagNames) params.tagNames.forEach(name => query.append('tagNames', name));
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.search) query.set('search', params.search);
    if (params.userId) query.set('userId', params.userId);
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.showArchived !== undefined)
      query.set('showArchived', String(params.showArchived));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    let response = await api.get(`/links?${query.toString()}`, { headers: this.headers });
    return response.data as DubLink[];
  }

  async updateLink(linkId: string, params: UpdateLinkParams): Promise<DubLink> {
    let response = await api.patch(`/links/${encodeURIComponent(linkId)}`, params, {
      headers: this.headers
    });
    return response.data as DubLink;
  }

  async upsertLink(params: CreateLinkParams): Promise<DubLink> {
    let response = await api.put('/links/upsert', params, { headers: this.headers });
    return response.data as DubLink;
  }

  async deleteLink(linkId: string): Promise<{ id: string }> {
    let response = await api.delete(`/links/${encodeURIComponent(linkId)}`, {
      headers: this.headers
    });
    return response.data as { id: string };
  }

  // Analytics

  async getAnalytics(params: AnalyticsParams = {}): Promise<unknown> {
    let query = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    let response = await api.get(`/analytics?${query.toString()}`, { headers: this.headers });
    return response.data;
  }

  // Events

  async listEvents(
    params: {
      event?: string;
      domain?: string;
      key?: string;
      linkId?: string;
      externalId?: string;
      interval?: string;
      start?: string;
      end?: string;
      timezone?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<unknown[]> {
    let query = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    let response = await api.get(`/events?${query.toString()}`, { headers: this.headers });
    return response.data as unknown[];
  }

  // Conversion Tracking

  async trackLead(params: TrackLeadParams): Promise<{
    click: { id: string };
    link: { id: string; domain: string; key: string; shortLink: string; url: string };
    customer: {
      name: string | null;
      email: string | null;
      avatar: string | null;
      externalId: string | null;
    };
  }> {
    let response = await api.post(
      '/track/lead',
      { ...params, mode: 'wait' },
      { headers: this.headers }
    );
    if (!response.data)
      throw createApiServiceError(
        'Dub deduplicated this lead: the customer and event name were already tracked. No new lead was recorded.'
      );
    if (!response.data.link)
      throw createApiServiceError(
        'Dub recorded the lead without a link attribution. Retrieve the customer or events to inspect the result.'
      );
    return response.data;
  }

  async trackSale(params: TrackSaleParams): Promise<{
    eventName: string;
    customer: {
      id: string;
      name: string | null;
      email: string | null;
      avatar: string | null;
      externalId: string | null;
    };
    sale: {
      amount: number;
      currency: string;
      paymentProcessor: string;
      invoiceId: string | null;
      metadata: Record<string, unknown> | null;
    };
  }> {
    if (!Number.isSafeInteger(params.amount) || params.amount < 0)
      throw createApiServiceError(
        'Sale amount must be a non-negative integer in the currency minor unit.'
      );
    let response = await api.post('/track/sale', params, { headers: this.headers });
    if (!response.data?.customer || !response.data?.sale)
      throw createApiServiceError(
        'Dub returned no sale or customer details. The invoice may already be tracked; inspect events before retrying.'
      );
    return response.data;
  }

  // Customers

  async listCustomers(params: ListCustomersParams = {}): Promise<DubCustomer[]> {
    if (params.startingAfter && params.endingBefore)
      throw createApiServiceError('Use startingAfter or endingBefore, not both.');
    let query = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    let response = await api.get(`/customers?${query.toString()}`, { headers: this.headers });
    return response.data as DubCustomer[];
  }

  async getCustomer(customerId: string): Promise<DubCustomer> {
    let response = await api.get(`/customers/${encodeURIComponent(customerId)}`, {
      headers: this.headers
    });
    return response.data as DubCustomer;
  }

  async deleteCustomer(customerId: string): Promise<{ id: string }> {
    let response = await api.delete(`/customers/${encodeURIComponent(customerId)}`, {
      headers: this.headers
    });
    return response.data as { id: string };
  }

  // Tags

  async createTag(params: { name: string; color?: string }): Promise<DubTag> {
    let response = await api.post('/tags', params, { headers: this.headers });
    return response.data as DubTag;
  }

  async listTags(params: ListTagsParams = {}): Promise<DubTag[]> {
    let query = new URLSearchParams();
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.search) query.set('search', params.search);
    if (params.ids) params.ids.forEach(id => query.append('ids', id));
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    let response = await api.get(`/tags?${query.toString()}`, { headers: this.headers });
    return response.data as DubTag[];
  }

  async updateTag(tagId: string, params: { name?: string; color?: string }): Promise<DubTag> {
    let response = await api.patch(`/tags/${encodeURIComponent(tagId)}`, params, {
      headers: this.headers
    });
    return response.data as DubTag;
  }

  async deleteTag(tagId: string): Promise<{ id: string }> {
    let response = await api.delete(`/tags/${encodeURIComponent(tagId)}`, {
      headers: this.headers
    });
    return response.data as { id: string };
  }

  // Domains

  async listDomains(params: ListDomainsParams = {}): Promise<DubDomain[]> {
    let query = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    let response = await api.get(`/domains?${query.toString()}`, { headers: this.headers });
    return response.data as DubDomain[];
  }

  async createDomain(params: {
    slug: string;
    expiredUrl?: string;
    notFoundUrl?: string;
    archived?: boolean;
    placeholder?: string;
  }): Promise<DubDomain> {
    let response = await api.post('/domains', params, { headers: this.headers });
    return response.data as DubDomain;
  }

  async updateDomain(
    domainSlug: string,
    params: {
      slug?: string;
      expiredUrl?: string;
      notFoundUrl?: string;
      archived?: boolean;
      placeholder?: string;
    }
  ): Promise<DubDomain> {
    let response = await api.patch(`/domains/${encodeURIComponent(domainSlug)}`, params, {
      headers: this.headers
    });
    return response.data as DubDomain;
  }

  async deleteDomain(domainSlug: string): Promise<{ slug: string }> {
    let response = await api.delete(`/domains/${encodeURIComponent(domainSlug)}`, {
      headers: this.headers
    });
    return response.data as { slug: string };
  }

  // Metatags

  async getMetatags(
    url: string
  ): Promise<{ title: string | null; description: string | null; image: string | null }> {
    let query = new URLSearchParams({ url });
    let response = await api.get(`/metatags?${query.toString()}`, { headers: this.headers });
    return response.data as {
      title: string | null;
      description: string | null;
      image: string | null;
    };
  }

  // Webhooks

  async createWebhook(params: {
    url: string;
    name: string;
    triggers: string[];
    linkIds?: string[];
  }): Promise<{
    id: string;
    name: string;
    url: string;
    secret: string;
    triggers: string[];
    linkIds: string[];
  }> {
    let response = await api.post('/webhooks', params, { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<{ id: string }> {
    let response = await api.delete(`/webhooks/${encodeURIComponent(webhookId)}`, {
      headers: this.headers
    });
    return response.data as { id: string };
  }

  async listWebhooks(): Promise<
    Array<{
      id: string;
      name: string;
      url: string;
      secret: string;
      triggers: string[];
      linkIds: string[];
    }>
  > {
    let response = await api.get('/webhooks', { headers: this.headers });
    return response.data;
  }
}
