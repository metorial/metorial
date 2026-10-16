import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface LinklyAuth {
  token: string;
  workspaceId: number;
}

export interface CreateOrUpdateLinkParams {
  linkId?: number;
  url: string;
  name?: string;
  note?: string;
  domain?: string;
  slug?: string;
  enabled?: boolean;
  blockBots?: boolean;
  cloaking?: boolean;
  hideReferrer?: boolean;
  forwardParams?: boolean;
  publicAnalytics?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  headTags?: string;
  bodyTags?: string;
  gtmId?: string;
  ga4TagId?: string;
  fbPixelId?: string;
  expiryDatetime?: string;
  expiryDestination?: string;
  expiryClicks?: number;
  rules?: RedirectRule[];
  webhooks?: string[];
  password?: string;
}

export interface RedirectRule {
  what: string;
  matches: string;
  url: string;
  percentage?: number;
}

export interface ListLinksParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ClickAnalyticsParams {
  linkId?: number;
  linkIds?: string;
  start?: string;
  end?: string;
  country?: string;
  browser?: string;
  platform?: string;
  referer?: string;
  isp?: string;
  bots?: boolean;
  unique?: boolean;
  format?: 'json' | 'csv' | 'tsv';
  pivot?: string;
  timezone?: string;
  frequency?: 'day' | 'hour';
}

export interface ClickCountersParams {
  counter: 'country' | 'platform' | 'browser' | 'referer' | 'isp' | 'link_id' | 'top_params';
  linkId?: number;
  linkIds?: string;
  start?: string;
  end?: string;
  country?: string;
  bots?: boolean;
  unique?: boolean;
  format?: 'json' | 'csv' | 'tsv';
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private workspaceId: number;

  constructor(auth: LinklyAuth) {
    if (!auth.token.trim()) {
      throw createApiServiceError('Enter a Linkly API key from Settings → API Keys.');
    }
    if (!Number.isSafeInteger(auth.workspaceId) || auth.workspaceId <= 0) {
      throw createApiServiceError(
        'workspaceId must be a positive integer from Linkly settings.'
      );
    }
    this.workspaceId = auth.workspaceId;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.linklyhq.com/api/v1',
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 65000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Linkly',
          reason: 'linkly_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        })
    });
  }

  private linkBody(params: CreateOrUpdateLinkParams) {
    if (!params.url.trim()) {
      throw createApiServiceError('Provide a non-empty destination URL.');
    }
    if (
      params.linkId !== undefined &&
      (!Number.isSafeInteger(params.linkId) || params.linkId <= 0)
    ) {
      throw createApiServiceError('linkId must be a positive integer.');
    }
    let body: Record<string, unknown> = {
      workspace_id: this.workspaceId,
      url: params.url
    };

    if (params.linkId !== undefined) body.id = params.linkId;
    if (params.name !== undefined) body.name = params.name;
    if (params.note !== undefined) body.note = params.note;
    if (params.domain !== undefined) body.domain = params.domain;
    if (params.slug !== undefined) body.slug = params.slug;
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.blockBots !== undefined) body.block_bots = params.blockBots;
    if (params.cloaking !== undefined) body.cloaking = params.cloaking;
    if (params.hideReferrer !== undefined) body.hide_referrer = params.hideReferrer;
    if (params.forwardParams !== undefined) body.forward_params = params.forwardParams;
    if (params.publicAnalytics !== undefined) body.public_analytics = params.publicAnalytics;
    if (params.utmSource !== undefined) body.utm_source = params.utmSource;
    if (params.utmMedium !== undefined) body.utm_medium = params.utmMedium;
    if (params.utmCampaign !== undefined) body.utm_campaign = params.utmCampaign;
    if (params.utmContent !== undefined) body.utm_content = params.utmContent;
    if (params.utmTerm !== undefined) body.utm_term = params.utmTerm;
    if (params.ogTitle !== undefined) body.og_title = params.ogTitle;
    if (params.ogDescription !== undefined) body.og_description = params.ogDescription;
    if (params.ogImage !== undefined) body.og_image = params.ogImage;
    if (params.headTags !== undefined) body.head_tags = params.headTags;
    if (params.bodyTags !== undefined) body.body_tags = params.bodyTags;
    if (params.gtmId !== undefined) body.gtm_id = params.gtmId;
    if (params.ga4TagId !== undefined) body.ga4_tag_id = params.ga4TagId;
    if (params.fbPixelId !== undefined) body.fb_pixel_id = params.fbPixelId;
    if (params.expiryDatetime !== undefined) body.expiry_datetime = params.expiryDatetime;
    if (params.expiryDestination !== undefined)
      body.expiry_destination = params.expiryDestination;
    if (params.expiryClicks !== undefined) body.expiry_clicks = params.expiryClicks;
    if (params.password !== undefined) body.password = params.password;
    if (params.rules !== undefined)
      body.rules = params.rules.map(rule => ({
        ...rule,
        what:
          rule.what === 'geo' ? 'country' : rule.what === 'device' ? 'platform' : rule.what,
        ...(rule.percentage === undefined ? {} : { percentage: String(rule.percentage) })
      }));
    if (params.webhooks !== undefined) body.webhooks = params.webhooks;

    return body;
  }

  async createOrUpdateLink(params: CreateOrUpdateLinkParams): Promise<any> {
    let response = await this.axios.post('/link', this.linkBody(params));
    return response.data;
  }

  async getLink(linkId: number): Promise<any> {
    if (!Number.isSafeInteger(linkId) || linkId <= 0) {
      throw createApiServiceError('linkId must be a positive integer.');
    }
    let response = await this.axios.get(`/get_link/${linkId}`);
    return response.data;
  }

  async listLinks(params?: ListLinksParams): Promise<any> {
    let queryParams: Record<string, string | number | boolean> = {};

    if (params?.search) queryParams.search = params.search;
    if (params?.page !== undefined) {
      if (!Number.isSafeInteger(params.page) || params.page < 1) {
        throw createApiServiceError('page must be a positive integer.');
      }
      queryParams.page = params.page;
    }
    if (params?.pageSize !== undefined) {
      if (
        !Number.isSafeInteger(params.pageSize) ||
        params.pageSize < 1 ||
        params.pageSize > 1000
      ) {
        throw createApiServiceError('pageSize must be an integer from 1 to 1000.');
      }
      queryParams.page_size = params.pageSize;
    }
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDir) queryParams.sort_dir = params.sortDir;

    let response = await this.axios.get(`/workspace/${this.workspaceId}/list_links`, {
      params: queryParams
    });
    return response.data;
  }

  async deleteLink(linkId: number): Promise<any> {
    let response = await this.axios.delete(`/workspace/${this.workspaceId}/links/${linkId}`);
    return response.data;
  }

  private analyticsLinkIds(value: string) {
    let ids = value.split(/[,\s-]+/).filter(Boolean);
    if (ids.length === 0 || ids.some(id => !/^\d+$/.test(id) || Number(id) <= 0)) {
      throw createApiServiceError(
        'linkIds must contain positive link IDs separated by commas or hyphens.'
      );
    }
    return ids.join('-');
  }

  private analyticsQuery(params?: ClickAnalyticsParams) {
    let queryParams: Record<string, string | number | boolean> = {};

    if (params?.linkId !== undefined) queryParams.link_id = params.linkId;
    if (params?.linkIds) queryParams.link_ids = this.analyticsLinkIds(params.linkIds);
    if (params?.start) queryParams.start = params.start;
    if (params?.end) queryParams.end = params.end;
    if (params?.country) queryParams.country = params.country;
    if (params?.browser) queryParams.browser = params.browser;
    if (params?.platform) queryParams.platform = params.platform;
    if (params?.referer) queryParams.referer = params.referer;
    if (params?.isp) queryParams.isp = params.isp;
    if (params?.bots !== undefined) queryParams.bots = params.bots;
    if (params?.unique !== undefined) queryParams.unique = params.unique;
    if (params?.format) queryParams.format = params.format;
    if (params?.pivot !== undefined) {
      if (params.pivot !== 'link_id') {
        throw createApiServiceError('The supported pivot value is "link_id".');
      }
      queryParams.pivot = params.pivot;
    }
    if (params?.timezone) queryParams.timezone = params.timezone;
    if (params?.frequency) queryParams.frequency = params.frequency;

    return queryParams;
  }

  async getClickAnalytics(params?: ClickAnalyticsParams): Promise<any> {
    let response = await this.axios.get(`/workspace/${this.workspaceId}/clicks`, {
      params: this.analyticsQuery(params)
    });
    return response.data;
  }

  getAnalyticsDownload(params: ClickAnalyticsParams & { format: 'csv' | 'tsv' }) {
    return {
      url: `https://api.linklyhq.com/api/v1/workspace/${this.workspaceId}/clicks`,
      query: Object.fromEntries(
        Object.entries(this.analyticsQuery(params)).map(([key, value]) => [key, String(value)])
      )
    };
  }

  async bulkUpsertLinks(links: CreateOrUpdateLinkParams[]): Promise<unknown> {
    let response = await this.axios.post(
      '/links',
      links.map(link => this.linkBody(link))
    );
    return response.data;
  }

  async getClickCounters(params: ClickCountersParams): Promise<any> {
    let queryParams: Record<string, string | number | boolean> = {};

    if (params.linkId !== undefined) queryParams.link_id = params.linkId;
    if (params.linkIds) queryParams.link_ids = this.analyticsLinkIds(params.linkIds);
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.country) queryParams.country = params.country;
    if (params.bots !== undefined) queryParams.bots = params.bots;
    if (params.unique !== undefined) queryParams.unique = params.unique;
    if (params.format) queryParams.format = params.format;

    let response = await this.axios.get(
      `/workspace/${this.workspaceId}/clicks/counters/${params.counter}`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  // Webhook management - Link level
  async listLinkWebhooks(linkId: number): Promise<any> {
    let response = await this.axios.get(`/link/${linkId}/webhooks`);
    return response.data;
  }

  async createLinkWebhook(linkId: number, url: string): Promise<any> {
    let response = await this.axios.post(`/link/${linkId}/webhooks`, {
      url
    });
    return response.data;
  }

  async deleteLinkWebhook(linkId: number, hookId: string): Promise<any> {
    let response = await this.axios.delete(
      `/link/${linkId}/webhooks/${encodeURIComponent(hookId)}`
    );
    return response.data;
  }

  // Webhook management - Workspace level
  async listWorkspaceWebhooks(): Promise<any> {
    let response = await this.axios.get(`/workspace/${this.workspaceId}/webhooks`);
    return response.data;
  }

  async createWorkspaceWebhook(url: string): Promise<any> {
    let response = await this.axios.post(`/workspace/${this.workspaceId}/webhooks`, {
      url
    });
    return response.data;
  }

  async deleteWorkspaceWebhook(hookId: string): Promise<any> {
    let response = await this.axios.delete(
      `/workspace/${this.workspaceId}/webhooks/${encodeURIComponent(hookId)}`
    );
    return response.data;
  }

  // Domains
  async listDomains(): Promise<any> {
    let response = await this.axios.get(`/workspace/${this.workspaceId}/domains`);
    return response.data;
  }

  // Workspaces
  async listWorkspaces(): Promise<any> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }
}
