import { createAxios } from 'slates';

export type Region = 'us' | 'eu';

let getTrackBaseUrl = (region: Region) =>
  region === 'eu' ? 'https://track-eu.customer.io/api/v1' : 'https://track.customer.io/api/v1';

let getAppBaseUrl = (region: Region) =>
  region === 'eu' ? 'https://api-eu.customer.io/v1' : 'https://api.customer.io/v1';

export class TrackClient {
  private axios;

  constructor(opts: { siteId: string; trackApiKey: string; region: Region }) {
    let basicToken = btoa(`${opts.siteId}:${opts.trackApiKey}`);
    this.axios = createAxios({
      baseURL: getTrackBaseUrl(opts.region),
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async identifyPerson(identifier: string, attributes: Record<string, unknown>) {
    let response = await this.axios.put(
      `/customers/${encodeURIComponent(identifier)}`,
      attributes
    );
    return response.data;
  }

  async deletePerson(identifier: string) {
    let response = await this.axios.delete(`/customers/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async suppressPerson(identifier: string) {
    let response = await this.axios.post(
      `/customers/${encodeURIComponent(identifier)}/suppress`
    );
    return response.data;
  }

  async unsuppressPerson(identifier: string) {
    let response = await this.axios.post(
      `/customers/${encodeURIComponent(identifier)}/unsuppress`
    );
    return response.data;
  }

  async trackEvent(
    identifier: string,
    event: { name: string; data?: Record<string, unknown>; timestamp?: number }
  ) {
    let response = await this.axios.post(
      `/customers/${encodeURIComponent(identifier)}/events`,
      event
    );
    return response.data;
  }

  async trackAnonymousEvent(event: {
    name: string;
    data?: Record<string, unknown>;
    anonymous_id?: string;
    timestamp?: number;
  }) {
    let response = await this.axios.post('/events', event);
    return response.data;
  }

  async trackPageView(
    identifier: string,
    page: { name: string; data?: Record<string, unknown>; timestamp?: number }
  ) {
    let response = await this.axios.post(
      `/customers/${encodeURIComponent(identifier)}/events`,
      {
        type: 'page',
        name: page.name,
        data: page.data,
        timestamp: page.timestamp
      }
    );
    return response.data;
  }

  async addDevice(
    identifier: string,
    device: {
      id: string;
      platform: string;
      last_used?: number;
      attributes?: Record<string, unknown>;
    }
  ) {
    let response = await this.axios.put(
      `/customers/${encodeURIComponent(identifier)}/devices`,
      {
        device
      }
    );
    return response.data;
  }

  async deleteDevice(identifier: string, deviceToken: string) {
    let response = await this.axios.delete(
      `/customers/${encodeURIComponent(identifier)}/devices/${encodeURIComponent(deviceToken)}`
    );
    return response.data;
  }

  async mergeCustomers(
    primary: { idType: string; id: string },
    secondary: { idType: string; id: string }
  ) {
    let response = await this.axios.post('/merge_customers', {
      primary: { [primary.idType]: primary.id },
      secondary: { [secondary.idType]: secondary.id }
    });
    return response.data;
  }
}

export class AppClient {
  private axios;

  constructor(opts: { token: string; region: Region }) {
    this.axios = createAxios({
      baseURL: getAppBaseUrl(opts.region),
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- People / Customers ----

  async getCustomerByEmail(email: string) {
    let response = await this.axios.get('/customers', { params: { email } });
    return response.data;
  }

  async getCustomerAttributes(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    let response = await this.axios.get(
      `/customers/${encodeURIComponent(customerId)}/attributes`,
      { params }
    );
    return response.data;
  }

  async getCustomerSegments(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    let response = await this.axios.get(
      `/customers/${encodeURIComponent(customerId)}/segments`,
      { params }
    );
    return response.data;
  }

  async getCustomerMessages(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    let response = await this.axios.get(
      `/customers/${encodeURIComponent(customerId)}/messages`,
      { params }
    );
    return response.data;
  }

  async getCustomerActivities(
    customerId: string,
    idType?: string,
    type?: string,
    start?: string,
    limit?: number
  ) {
    let params: Record<string, string | number> = {};
    if (idType) params.id_type = idType;
    if (type) params.type = type;
    if (start) params.start = start;
    if (limit) params.limit = limit;
    let response = await this.axios.get(
      `/customers/${encodeURIComponent(customerId)}/activities`,
      { params }
    );
    return response.data;
  }

  async searchPeople(filter: Record<string, unknown>) {
    let response = await this.axios.post('/customers', { filter });
    return response.data;
  }

  // ---- Segments ----

  async listSegments() {
    let response = await this.axios.get('/segments');
    return response.data;
  }

  async getSegment(segmentId: number) {
    let response = await this.axios.get(`/segments/${segmentId}`);
    return response.data;
  }

  async getSegmentMembership(segmentId: number, start?: string, limit?: number) {
    let params: Record<string, string | number> = {};
    if (start) params.start = start;
    if (limit) params.limit = limit;
    let response = await this.axios.get(`/segments/${segmentId}/membership`, { params });
    return response.data;
  }

  async addToManualSegment(segmentId: number, customerIds: string[]) {
    let response = await this.axios.post(`/segments/${segmentId}/add_customers`, {
      ids: customerIds
    });
    return response.data;
  }

  async removeFromManualSegment(segmentId: number, customerIds: string[]) {
    let response = await this.axios.post(`/segments/${segmentId}/remove_customers`, {
      ids: customerIds
    });
    return response.data;
  }

  // ---- Campaigns ----

  async listCampaigns() {
    let response = await this.axios.get('/campaigns');
    return response.data;
  }

  async getCampaign(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignMetrics(
    campaignId: number,
    params?: { period?: string; steps?: number; type?: string }
  ) {
    let response = await this.axios.get(`/campaigns/${campaignId}/metrics`, { params });
    return response.data;
  }

  async getCampaignActions(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}/actions`);
    return response.data;
  }

  // ---- Broadcasts ----

  async listBroadcasts() {
    let response = await this.axios.get('/campaigns', {
      params: { type: 'api_triggered_broadcast' }
    });
    return response.data;
  }

  async triggerBroadcast(broadcastId: number, payload: Record<string, unknown>) {
    let response = await this.axios.post(`/campaigns/${broadcastId}/triggers`, payload);
    return response.data;
  }

  async getBroadcastTriggers(broadcastId: number) {
    let response = await this.axios.get(`/campaigns/${broadcastId}/triggers`);
    return response.data;
  }

  // ---- Transactional Messages ----

  async sendTransactionalEmail(message: Record<string, unknown>) {
    let response = await this.axios.post('/send/email', message);
    return response.data;
  }

  async sendTransactionalPush(message: Record<string, unknown>) {
    let response = await this.axios.post('/send/push', message);
    return response.data;
  }

  async sendTransactionalSms(message: Record<string, unknown>) {
    let response = await this.axios.post('/send/sms', message);
    return response.data;
  }

  // ---- Collections ----

  async listCollections() {
    let response = await this.axios.get('/api/collections');
    return response.data;
  }

  async getCollection(collectionId: string) {
    let response = await this.axios.get(
      `/api/collections/${encodeURIComponent(collectionId)}`
    );
    return response.data;
  }

  async getCollectionContents(collectionId: string) {
    let response = await this.axios.get(
      `/api/collections/${encodeURIComponent(collectionId)}/content`
    );
    return response.data;
  }

  async createCollection(name: string, data: unknown[] | string) {
    let body: Record<string, unknown> = { name };
    if (typeof data === 'string') {
      body.url = data;
    } else {
      body.data = data;
    }
    let response = await this.axios.post('/api/collections', body);
    return response.data;
  }

  async updateCollection(
    collectionId: string,
    update: { name?: string; data?: unknown[] | string }
  ) {
    let body: Record<string, unknown> = {};
    if (update.name) body.name = update.name;
    if (update.data) {
      if (typeof update.data === 'string') {
        body.url = update.data;
      } else {
        body.data = update.data;
      }
    }
    let response = await this.axios.put(
      `/api/collections/${encodeURIComponent(collectionId)}`,
      body
    );
    return response.data;
  }

  async deleteCollection(collectionId: string) {
    let response = await this.axios.delete(
      `/api/collections/${encodeURIComponent(collectionId)}`
    );
    return response.data;
  }

  // ---- Exports ----

  async createCustomerExport(filters?: Record<string, unknown>) {
    let response = await this.axios.post('/exports/customers', { filters });
    return response.data;
  }

  async getExport(exportId: number) {
    let response = await this.axios.get(`/exports/${exportId}`);
    return response.data;
  }

  async listExports() {
    let response = await this.axios.get('/exports');
    return response.data;
  }

  // ---- Activities ----

  async listActivities(params?: { start?: string; limit?: number; type?: string }) {
    let response = await this.axios.get('/activities', { params });
    return response.data;
  }

  // ---- Newsletters ----

  async listNewsletters() {
    let response = await this.axios.get('/newsletters');
    return response.data;
  }

  async getNewsletter(newsletterId: number) {
    let response = await this.axios.get(`/newsletters/${newsletterId}`);
    return response.data;
  }

  async getNewsletterMetrics(
    newsletterId: number,
    params?: { period?: string; steps?: number; type?: string }
  ) {
    let response = await this.axios.get(`/newsletters/${newsletterId}/metrics`, { params });
    return response.data;
  }

  // ---- Messages ----

  async getMessage(messageId: string) {
    let response = await this.axios.get(`/messages/${encodeURIComponent(messageId)}`);
    return response.data;
  }
}
