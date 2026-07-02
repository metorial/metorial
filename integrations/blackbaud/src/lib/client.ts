import { createAxios } from 'slates';

let BASE_URL = 'https://api.sky.blackbaud.com';

export interface PaginatedResponse<T> {
  count: number;
  value: T[];
  next_link?: string;
}

export class Client {
  private http;

  constructor(config: { token: string; subscriptionKey: string }) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Bb-Api-Subscription-Key': config.subscriptionKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Constituents ──

  async searchConstituents(params: { searchText: string; limit?: number; offset?: number }) {
    let response = await this.http.get('/constituent/v1/constituents/search', {
      params: {
        search_text: params.searchText,
        limit: params.limit,
        offset: params.offset
      }
    });
    return response.data;
  }

  async listConstituents(params?: {
    limit?: number;
    offset?: number;
    dateAdded?: string;
    lastModified?: string;
    sort?: string;
    constituentCodeId?: string;
    constituentListId?: string;
    includeDeceased?: boolean;
    includeInactive?: boolean;
  }) {
    let response = await this.http.get('/constituent/v1/constituents', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified,
        sort: params?.sort,
        constituent_code_id: params?.constituentCodeId,
        list_id: params?.constituentListId,
        include_deceased: params?.includeDeceased,
        include_inactive: params?.includeInactive
      }
    });
    return response.data;
  }

  async getConstituent(constituentId: string) {
    let response = await this.http.get(`/constituent/v1/constituents/${constituentId}`);
    return response.data;
  }

  async createConstituent(data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/constituents', data);
    return response.data;
  }

  async updateConstituent(constituentId: string, data: Record<string, any>) {
    let response = await this.http.patch(
      `/constituent/v1/constituents/${constituentId}`,
      data
    );
    return response.data;
  }

  // ── Constituent Sub-records ──

  async listConstituentAddresses(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/addresses`
    );
    return response.data;
  }

  async createConstituentAddress(constituentId: string, data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/addresses', {
      constituent_id: constituentId,
      ...data
    });
    return response.data;
  }

  async listConstituentEmailAddresses(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/emailaddresses`
    );
    return response.data;
  }

  async createConstituentEmailAddress(constituentId: string, data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/emailaddresses', {
      constituent_id: constituentId,
      ...data
    });
    return response.data;
  }

  async listConstituentPhones(constituentId: string) {
    let response = await this.http.get(`/constituent/v1/constituents/${constituentId}/phones`);
    return response.data;
  }

  async createConstituentPhone(constituentId: string, data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/phones', {
      constituent_id: constituentId,
      ...data
    });
    return response.data;
  }

  async listConstituentNotes(constituentId: string) {
    let response = await this.http.get(`/constituent/v1/constituents/${constituentId}/notes`);
    return response.data;
  }

  async createConstituentNote(constituentId: string, data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/notes', {
      constituent_id: constituentId,
      ...data
    });
    return response.data;
  }

  async listConstituentCodes(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/constituentcodes`
    );
    return response.data;
  }

  async listConstituentRelationships(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/relationships`
    );
    return response.data;
  }

  async listConstituentCustomFields(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/customfields`
    );
    return response.data;
  }

  // ── Giving Summaries ──

  async getConstituentFirstGift(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/givingsummary/first`
    );
    return response.data;
  }

  async getConstituentLatestGift(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/givingsummary/latest`
    );
    return response.data;
  }

  async getConstituentGreatestGift(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/givingsummary/greatest`
    );
    return response.data;
  }

  async getConstituentLifetimeGiving(constituentId: string) {
    let response = await this.http.get(
      `/constituent/v1/constituents/${constituentId}/givingsummary/lifetimegiving`
    );
    return response.data;
  }

  // ── Gifts ──

  async listGifts(params?: {
    limit?: number;
    offset?: number;
    constituentId?: string;
    giftType?: string;
    campaignId?: string;
    fundId?: string;
    appealId?: string;
    startGiftDate?: string;
    endGiftDate?: string;
    dateAdded?: string;
    lastModified?: string;
    sort?: string;
    listId?: string;
  }) {
    let response = await this.http.get('/gift/v1/gifts', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        constituent_id: params?.constituentId,
        gift_type: params?.giftType,
        campaign_id: params?.campaignId,
        fund_id: params?.fundId,
        appeal_id: params?.appealId,
        start_gift_date: params?.startGiftDate,
        end_gift_date: params?.endGiftDate,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified,
        sort: params?.sort,
        list_id: params?.listId
      }
    });
    return response.data;
  }

  async getGift(giftId: string) {
    let response = await this.http.get(`/gift/v1/gifts/${giftId}`);
    return response.data;
  }

  async createGift(data: Record<string, any>) {
    let response = await this.http.post('/gift/v1/gifts', data);
    return response.data;
  }

  async listGiftCustomFields(giftId: string) {
    let response = await this.http.get(`/gift/v1/gifts/${giftId}/customfields`);
    return response.data;
  }

  async listGiftNotes(giftId: string, params?: { limit?: number; offset?: number }) {
    let response = await this.http.get(`/nxt-data-integration/v1/re/gifts/${giftId}/notes`, {
      params: {
        limit: params?.limit,
        offset: params?.offset
      }
    });
    return response.data;
  }

  // ── Actions ──

  async listActions(params?: {
    limit?: number;
    offset?: number;
    constituentId?: string;
    dateAdded?: string;
    lastModified?: string;
    listId?: string;
    sort?: string;
  }) {
    let response = await this.http.get('/constituent/v1/actions', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        constituent_id: params?.constituentId,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified,
        list_id: params?.listId,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async getAction(actionId: string) {
    let response = await this.http.get(`/constituent/v1/actions/${actionId}`);
    return response.data;
  }

  async createAction(data: Record<string, any>) {
    let response = await this.http.post('/constituent/v1/actions', data);
    return response.data;
  }

  async updateAction(actionId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/constituent/v1/actions/${actionId}`, data);
    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(params?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
    dateAdded?: string;
    lastModified?: string;
  }) {
    let response = await this.http.get('/fundraising/v1/campaigns', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        include_inactive: params?.includeInactive,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.http.get(`/fundraising/v1/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: Record<string, any>) {
    let response = await this.http.post('/nxt-data-integration/v1/re/campaigns', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>) {
    let response = await this.http.patch(
      `/nxt-data-integration/v1/re/campaigns/${campaignId}`,
      data
    );
    return response.data;
  }

  // ── Funds ──

  async listFunds(params?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
    dateAdded?: string;
    lastModified?: string;
  }) {
    let response = await this.http.get('/fundraising/v1/funds', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        include_inactive: params?.includeInactive,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified
      }
    });
    return response.data;
  }

  async getFund(fundId: string) {
    let response = await this.http.get(`/fundraising/v1/funds/${fundId}`);
    return response.data;
  }

  async createFund(data: Record<string, any>) {
    let response = await this.http.post('/nxt-data-integration/v1/re/funds', data);
    return response.data;
  }

  async updateFund(fundId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/nxt-data-integration/v1/re/funds/${fundId}`, data);
    return response.data;
  }

  // ── Appeals ──

  async listAppeals(params?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
    dateAdded?: string;
    lastModified?: string;
  }) {
    let response = await this.http.get('/fundraising/v1/appeals', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        include_inactive: params?.includeInactive,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified
      }
    });
    return response.data;
  }

  async getAppeal(appealId: string) {
    let response = await this.http.get(`/fundraising/v1/appeals/${appealId}`);
    return response.data;
  }

  async createAppeal(data: Record<string, any>) {
    let response = await this.http.post('/nxt-data-integration/v1/re/appeals', data);
    return response.data;
  }

  async updateAppeal(appealId: string, data: Record<string, any>) {
    let response = await this.http.patch(
      `/nxt-data-integration/v1/re/appeals/${appealId}`,
      data
    );
    return response.data;
  }

  // ── Opportunities ──

  async listOpportunities(params?: {
    limit?: number;
    offset?: number;
    constituentId?: string;
    dateAdded?: string;
    lastModified?: string;
  }) {
    let response = await this.http.get('/opportunity/v1/opportunities', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        constituent_id: params?.constituentId,
        date_added: params?.dateAdded,
        last_modified: params?.lastModified
      }
    });
    return response.data;
  }

  async getOpportunity(opportunityId: string) {
    let response = await this.http.get(`/opportunity/v1/opportunities/${opportunityId}`);
    return response.data;
  }

  // ── Webhooks ──

  async createWebhookSubscription(webhookUrl: string, eventType: string) {
    let response = await this.http.post('/webhook/v1/subscriptions', {
      webhook_url: webhookUrl,
      event_type: eventType
    });
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string) {
    let response = await this.http.delete(`/webhook/v1/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async listWebhookSubscriptions() {
    let response = await this.http.get('/webhook/v1/subscriptions');
    return response.data;
  }

  // ── Lists ──

  async listLists(params?: { limit?: number; offset?: number }) {
    let response = await this.http.get('/list/v1/lists', {
      params: {
        limit: params?.limit,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async getListResults(
    listId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.http.get(`/list/v1/lists/${listId}`, {
      params: {
        limit: params?.limit,
        offset: params?.offset
      }
    });
    return response.data;
  }
}
