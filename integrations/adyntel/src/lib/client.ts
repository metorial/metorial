import { createAxios } from 'slates';

export interface AdyntelAuth {
  token: string;
  email: string;
}

export class Client {
  private http;

  constructor(private auth: AdyntelAuth) {
    this.http = createAxios({
      baseURL: 'https://api.adyntel.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private buildBody(params: Record<string, unknown>): Record<string, unknown> {
    return {
      api_key: this.auth.token,
      email: this.auth.email,
      ...params
    };
  }

  async lookupMetaAds(params: {
    companyDomain?: string;
    facebookUrl?: string;
    continuationToken?: string;
    mediaType?: string;
    countryCode?: string;
    activeStatus?: string;
  }) {
    let body: Record<string, unknown> = {};
    if (params.companyDomain) body.company_domain = params.companyDomain;
    if (params.facebookUrl) body.facebook_url = params.facebookUrl;
    if (params.continuationToken) body.continuation_token = params.continuationToken;
    if (params.mediaType) body.media_type = params.mediaType;
    if (params.countryCode) body.country_code = params.countryCode;
    if (params.activeStatus) body.active_status = params.activeStatus;

    let response = await this.http.post('/facebook', this.buildBody(body));
    return response.data;
  }

  async searchMetaAds(params: { keyword: string; countryCode?: string }) {
    let body: Record<string, unknown> = {
      keyword: params.keyword
    };
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.http.post('/facebook_ad_search', this.buildBody(body));
    return response.data;
  }

  async lookupLinkedInAds(params: { companyDomain?: string; linkedinPageId?: number }) {
    let body: Record<string, unknown> = {};
    if (params.companyDomain) body.company_domain = params.companyDomain;
    if (params.linkedinPageId) body.linkedin_page_id = params.linkedinPageId;

    let response = await this.http.post('/linkedin', this.buildBody(body));
    return response.data;
  }

  async lookupGoogleAds(params: { companyDomain: string; mediaType?: string }) {
    let body: Record<string, unknown> = {
      company_domain: params.companyDomain
    };
    if (params.mediaType) body.media_type = params.mediaType;

    let response = await this.http.post('/google', this.buildBody(body));
    return response.data;
  }

  async submitGoogleShoppingSearch(params: { companyDomain: string }) {
    let body: Record<string, unknown> = {
      company_domain: params.companyDomain
    };

    let response = await this.http.post('/google_shopping', this.buildBody(body));
    return response.data;
  }

  async getGoogleShoppingStatus(params: { requestId: string }) {
    let body: Record<string, unknown> = {
      id: params.requestId
    };

    let response = await this.http.post('/google_shopping_status', this.buildBody(body));
    return response.data;
  }

  async searchTikTokAds(params: { keyword: string; countryCode?: string }) {
    let body: Record<string, unknown> = {
      keyword: params.keyword
    };
    if (params.countryCode) body.country_code = params.countryCode;

    let response = await this.http.post('/tiktok_search', this.buildBody(body));
    return response.data;
  }

  async getTikTokAdDetails(params: { adId: number }) {
    let body: Record<string, unknown> = {
      id: params.adId
    };

    let response = await this.http.post('/tiktok_ad_details', this.buildBody(body));
    return response.data;
  }

  async getKeywordAnalysis(params: { companyDomain: string }) {
    let body: Record<string, unknown> = {
      company_domain: params.companyDomain
    };

    let response = await this.http.post('/domain-keywords', this.buildBody(body));
    return response.data;
  }
}
