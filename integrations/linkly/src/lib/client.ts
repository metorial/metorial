import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;
  private workspaceId: number;

  constructor(auth: LinklyAuth) {
    this.apiKey = auth.token;
    this.workspaceId = auth.workspaceId;
    this.axios = createAxios({
      baseURL: 'https://app.linklyhq.com/api/v1',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createOrUpdateLink(params: CreateOrUpdateLinkParams): Promise<any> {
    let body: Record<string, any> = {
      api_key: this.apiKey,
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
    if (params.rules !== undefined) body.rules = params.rules;
    if (params.webhooks !== undefined) body.webhooks = params.webhooks;

    let response = await this.axios.post('/link', body);
    return response.data;
  }

  async getLink(linkId: number): Promise<any> {
    let response = await this.axios.get(`/get_link/${linkId}`, {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async listLinks(params?: ListLinksParams): Promise<any> {
    let queryParams: Record<string, any> = {
      api_key: this.apiKey
    };

    if (params?.search) queryParams.search = params.search;
    if (params?.page) queryParams.page = params.page;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDir) queryParams.sort_dir = params.sortDir;

    let response = await this.axios.get(`/workspace/${this.workspaceId}/list_links`, {
      params: queryParams
    });
    return response.data;
  }

  async deleteLink(linkId: number): Promise<any> {
    let response = await this.axios.delete(`/workspace/${this.workspaceId}/links/${linkId}`, {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async deleteLinks(linkIds: number[]): Promise<any> {
    let response = await this.axios.delete(`/workspace/${this.workspaceId}/links`, {
      params: {
        api_key: this.apiKey
      },
      data: {
        ids: linkIds
      }
    });
    return response.data;
  }

  async getClickAnalytics(params?: ClickAnalyticsParams): Promise<any> {
    let queryParams: Record<string, any> = {
      api_key: this.apiKey
    };

    if (params?.linkId !== undefined) queryParams.link_id = params.linkId;
    if (params?.linkIds) queryParams.link_ids = params.linkIds;
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
    if (params?.pivot) queryParams.pivot = params.pivot;
    if (params?.timezone) queryParams.timezone = params.timezone;
    if (params?.frequency) queryParams.frequency = params.frequency;

    let response = await this.axios.get(`/workspace/${this.workspaceId}/clicks`, {
      params: queryParams
    });
    return response.data;
  }

  async getClickCounters(params: ClickCountersParams): Promise<any> {
    let queryParams: Record<string, any> = {
      api_key: this.apiKey
    };

    if (params.linkId !== undefined) queryParams.link_id = params.linkId;
    if (params.linkIds) queryParams.link_ids = params.linkIds;
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
    let response = await this.axios.get(`/link/${linkId}/webhooks`, {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async createLinkWebhook(linkId: number, url: string): Promise<any> {
    let response = await this.axios.post(`/link/${linkId}/webhooks`, {
      api_key: this.apiKey,
      url
    });
    return response.data;
  }

  async deleteLinkWebhook(linkId: number, hookId: string): Promise<any> {
    let response = await this.axios.delete(
      `/link/${linkId}/webhooks/${encodeURIComponent(hookId)}`,
      {
        params: {
          api_key: this.apiKey
        }
      }
    );
    return response.data;
  }

  // Webhook management - Workspace level
  async listWorkspaceWebhooks(): Promise<any> {
    let response = await this.axios.get(`/workspace/${this.workspaceId}/webhooks`, {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  async createWorkspaceWebhook(url: string): Promise<any> {
    let response = await this.axios.post(`/workspace/${this.workspaceId}/webhooks`, {
      api_key: this.apiKey,
      url
    });
    return response.data;
  }

  async deleteWorkspaceWebhook(hookId: string): Promise<any> {
    let response = await this.axios.delete(
      `/workspace/${this.workspaceId}/webhooks/${encodeURIComponent(hookId)}`,
      {
        params: {
          api_key: this.apiKey
        }
      }
    );
    return response.data;
  }

  // Domains
  async listDomains(): Promise<any> {
    let response = await this.axios.get(`/workspace/${this.workspaceId}/domains`, {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }

  // Workspaces
  async listWorkspaces(): Promise<any> {
    let response = await this.axios.get('/workspaces', {
      params: {
        api_key: this.apiKey
      }
    });
    return response.data;
  }
}
