import { createAxios } from 'slates';

export class MetaAdsClient {
  private token: string;
  private adAccountId: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor(config: { token: string; adAccountId: string; apiVersion: string }) {
    this.token = config.token;
    this.adAccountId = config.adAccountId;
    this.apiVersion = config.apiVersion;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  private get axios() {
    return createAxios({
      baseURL: this.baseUrl,
      params: {
        access_token: this.token
      }
    });
  }

  private get accountPath() {
    return `/${this.adAccountId}`;
  }

  // ---- Campaigns ----

  async getCampaigns(params?: {
    fields?: string;
    limit?: number;
    after?: string;
    filtering?: Array<{ field: string; operator: string; value: string }>;
  }) {
    let response = await this.axios.get(`${this.accountPath}/campaigns`, {
      params: {
        fields:
          params?.fields ||
          'id,name,objective,status,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time,start_time,stop_time,special_ad_categories,buying_type',
        limit: params?.limit || 25,
        after: params?.after,
        filtering: params?.filtering ? JSON.stringify(params.filtering) : undefined
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string, fields?: string) {
    let response = await this.axios.get(`/${campaignId}`, {
      params: {
        fields:
          fields ||
          'id,name,objective,status,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time,start_time,stop_time,special_ad_categories,buying_type'
      }
    });
    return response.data;
  }

  async createCampaign(params: Record<string, any>) {
    let response = await this.axios.post(`${this.accountPath}/campaigns`, params);
    return response.data;
  }

  async updateCampaign(campaignId: string, params: Record<string, any>) {
    let response = await this.axios.post(`/${campaignId}`, params);
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(`/${campaignId}`);
    return response.data;
  }

  // ---- Ad Sets ----

  async getAdSets(params?: {
    campaignId?: string;
    fields?: string;
    limit?: number;
    after?: string;
    filtering?: Array<{ field: string; operator: string; value: string }>;
  }) {
    let path = params?.campaignId
      ? `/${params.campaignId}/adsets`
      : `${this.accountPath}/adsets`;

    let response = await this.axios.get(path, {
      params: {
        fields:
          params?.fields ||
          'id,name,campaign_id,status,daily_budget,lifetime_budget,budget_remaining,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,created_time,updated_time',
        limit: params?.limit || 25,
        after: params?.after,
        filtering: params?.filtering ? JSON.stringify(params.filtering) : undefined
      }
    });
    return response.data;
  }

  async getAdSet(adSetId: string, fields?: string) {
    let response = await this.axios.get(`/${adSetId}`, {
      params: {
        fields:
          fields ||
          'id,name,campaign_id,status,daily_budget,lifetime_budget,budget_remaining,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,created_time,updated_time'
      }
    });
    return response.data;
  }

  async createAdSet(params: Record<string, any>) {
    let response = await this.axios.post(`${this.accountPath}/adsets`, params);
    return response.data;
  }

  async updateAdSet(adSetId: string, params: Record<string, any>) {
    let response = await this.axios.post(`/${adSetId}`, params);
    return response.data;
  }

  async deleteAdSet(adSetId: string) {
    let response = await this.axios.delete(`/${adSetId}`);
    return response.data;
  }

  // ---- Ads ----

  async getAds(params?: {
    adSetId?: string;
    fields?: string;
    limit?: number;
    after?: string;
    filtering?: Array<{ field: string; operator: string; value: string }>;
  }) {
    let path = params?.adSetId ? `/${params.adSetId}/ads` : `${this.accountPath}/ads`;

    let response = await this.axios.get(path, {
      params: {
        fields:
          params?.fields ||
          'id,name,adset_id,campaign_id,status,creative,created_time,updated_time',
        limit: params?.limit || 25,
        after: params?.after,
        filtering: params?.filtering ? JSON.stringify(params.filtering) : undefined
      }
    });
    return response.data;
  }

  async getAd(adId: string, fields?: string) {
    let response = await this.axios.get(`/${adId}`, {
      params: {
        fields:
          fields || 'id,name,adset_id,campaign_id,status,creative,created_time,updated_time'
      }
    });
    return response.data;
  }

  async createAd(params: Record<string, any>) {
    let response = await this.axios.post(`${this.accountPath}/ads`, params);
    return response.data;
  }

  async updateAd(adId: string, params: Record<string, any>) {
    let response = await this.axios.post(`/${adId}`, params);
    return response.data;
  }

  async deleteAd(adId: string) {
    let response = await this.axios.delete(`/${adId}`);
    return response.data;
  }

  // ---- Ad Creatives ----

  async getAdCreatives(params?: { fields?: string; limit?: number; after?: string }) {
    let response = await this.axios.get(`${this.accountPath}/adcreatives`, {
      params: {
        fields:
          params?.fields ||
          'id,name,title,body,image_url,thumbnail_url,object_story_spec,status,created_time',
        limit: params?.limit || 25,
        after: params?.after
      }
    });
    return response.data;
  }

  async getAdCreative(creativeId: string, fields?: string) {
    let response = await this.axios.get(`/${creativeId}`, {
      params: {
        fields:
          fields ||
          'id,name,title,body,image_url,thumbnail_url,object_story_spec,status,created_time'
      }
    });
    return response.data;
  }

  async createAdCreative(params: Record<string, any>) {
    let response = await this.axios.post(`${this.accountPath}/adcreatives`, params);
    return response.data;
  }

  // ---- Insights ----

  async getInsights(params: {
    objectId?: string;
    level?: string;
    fields?: string;
    datePreset?: string;
    timeRange?: { since: string; until: string };
    breakdowns?: string[];
    timeIncrement?: string;
    filtering?: Array<{ field: string; operator: string; value: string }>;
    limit?: number;
    after?: string;
  }) {
    let objectId = params.objectId || this.adAccountId;

    let requestParams: Record<string, any> = {
      fields:
        params.fields ||
        'impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type',
      limit: params.limit || 25,
      after: params.after
    };

    if (params.level) requestParams.level = params.level;
    if (params.datePreset) requestParams.date_preset = params.datePreset;
    if (params.timeRange) requestParams.time_range = JSON.stringify(params.timeRange);
    if (params.breakdowns) requestParams.breakdowns = params.breakdowns.join(',');
    if (params.timeIncrement) requestParams.time_increment = params.timeIncrement;
    if (params.filtering) requestParams.filtering = JSON.stringify(params.filtering);

    let response = await this.axios.get(`/${objectId}/insights`, { params: requestParams });
    return response.data;
  }

  // ---- Custom Audiences ----

  async getCustomAudiences(params?: { fields?: string; limit?: number; after?: string }) {
    let response = await this.axios.get(`${this.accountPath}/customaudiences`, {
      params: {
        fields:
          params?.fields ||
          'id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,operation_status,time_created,time_updated',
        limit: params?.limit || 25,
        after: params?.after
      }
    });
    return response.data;
  }

  async getCustomAudience(audienceId: string, fields?: string) {
    let response = await this.axios.get(`/${audienceId}`, {
      params: {
        fields:
          fields ||
          'id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,operation_status,time_created,time_updated'
      }
    });
    return response.data;
  }

  async createCustomAudience(params: Record<string, any>) {
    let response = await this.axios.post(`${this.accountPath}/customaudiences`, params);
    return response.data;
  }

  async updateCustomAudience(audienceId: string, params: Record<string, any>) {
    let response = await this.axios.post(`/${audienceId}`, params);
    return response.data;
  }

  async deleteCustomAudience(audienceId: string) {
    let response = await this.axios.delete(`/${audienceId}`);
    return response.data;
  }

  async addUsersToCustomAudience(audienceId: string, params: Record<string, any>) {
    let response = await this.axios.post(`/${audienceId}/users`, params);
    return response.data;
  }

  async removeUsersFromCustomAudience(audienceId: string, params: Record<string, any>) {
    let response = await this.axios.delete(`/${audienceId}/users`, { data: params });
    return response.data;
  }

  // ---- Conversions API ----

  async sendConversionEvents(
    datasetId: string,
    events: Record<string, any>[],
    testEventCode?: string
  ) {
    let params: Record<string, any> = {
      data: JSON.stringify(events)
    };
    if (testEventCode) {
      params.test_event_code = testEventCode;
    }

    let response = await this.axios.post(`/${datasetId}/events`, params);
    return response.data;
  }

  // ---- Ad Library ----

  async searchAdLibrary(params: {
    searchTerms?: string;
    adReachedCountries: string[];
    adType?: string;
    adActiveStatus?: string;
    fields?: string;
    limit?: number;
    after?: string;
    searchPageIds?: string[];
    bylines?: string[];
  }) {
    let requestParams: Record<string, any> = {
      ad_reached_countries: JSON.stringify(params.adReachedCountries),
      fields:
        params.fields ||
        'id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles,page_id,page_name,publisher_platforms,estimated_audience_size,spend,impressions',
      limit: params.limit || 25,
      after: params.after
    };

    if (params.searchTerms) requestParams.search_terms = params.searchTerms;
    if (params.adType) requestParams.ad_type = params.adType;
    if (params.adActiveStatus) requestParams.ad_active_status = params.adActiveStatus;
    if (params.searchPageIds)
      requestParams.search_page_ids = JSON.stringify(params.searchPageIds);
    if (params.bylines) requestParams.bylines = JSON.stringify(params.bylines);

    let response = await this.axios.get('/ads_archive', { params: requestParams });
    return response.data;
  }

  // ---- Lead Ads ----

  async getLeadForms(
    pageId: string,
    params?: {
      fields?: string;
      limit?: number;
      after?: string;
    }
  ) {
    let response = await this.axios.get(`/${pageId}/leadgen_forms`, {
      params: {
        fields: params?.fields || 'id,name,status,created_time,leads_count,locale,page',
        limit: params?.limit || 25,
        after: params?.after
      }
    });
    return response.data;
  }

  async getLeads(
    formId: string,
    params?: {
      fields?: string;
      limit?: number;
      after?: string;
    }
  ) {
    let response = await this.axios.get(`/${formId}/leads`, {
      params: {
        fields:
          params?.fields ||
          'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name,form_id,is_organic',
        limit: params?.limit || 25,
        after: params?.after
      }
    });
    return response.data;
  }

  async getLead(leadId: string, fields?: string) {
    let response = await this.axios.get(`/${leadId}`, {
      params: {
        fields:
          fields ||
          'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name,form_id,is_organic'
      }
    });
    return response.data;
  }

  // ---- Product Catalogs ----

  async getCatalogs(params?: { fields?: string; limit?: number; after?: string }) {
    let response = await this.axios.get(
      `/${this.adAccountId.replace('act_', '')}/owned_product_catalogs`,
      {
        params: {
          fields: params?.fields || 'id,name,product_count,vertical',
          limit: params?.limit || 25,
          after: params?.after
        }
      }
    );
    return response.data;
  }

  async getCatalogProducts(
    catalogId: string,
    params?: {
      fields?: string;
      limit?: number;
      after?: string;
      filter?: Record<string, any>;
    }
  ) {
    let response = await this.axios.get(`/${catalogId}/products`, {
      params: {
        fields:
          params?.fields ||
          'id,name,description,price,currency,availability,image_url,url,retailer_id',
        limit: params?.limit || 25,
        after: params?.after,
        filter: params?.filter ? JSON.stringify(params.filter) : undefined
      }
    });
    return response.data;
  }

  // ---- Generic helpers ----

  async getAdAccounts(fields?: string) {
    let response = await this.axios.get('/me/adaccounts', {
      params: {
        fields: fields || 'id,name,account_status,currency,timezone_name,business'
      }
    });
    return response.data;
  }

  async getPages(fields?: string) {
    let response = await this.axios.get('/me/accounts', {
      params: {
        fields: fields || 'id,name,access_token,category'
      }
    });
    return response.data;
  }

  async subscribePageApp(pageId: string, pageAccessToken: string, subscribedFields: string[]) {
    let axiosInstance = createAxios({
      baseURL: this.baseUrl,
      params: {
        access_token: pageAccessToken
      }
    });

    let response = await axiosInstance.post(`/${pageId}/subscribed_apps`, {
      subscribed_fields: subscribedFields.join(',')
    });
    return response.data;
  }
}
