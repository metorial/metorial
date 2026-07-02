import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { customerIoApiError, customerIoServiceError } from './errors';

export type Region = 'us' | 'eu';

type AxiosResponse<T> = {
  data: T;
};

let getTrackBaseUrl = (region: Region) =>
  region === 'eu' ? 'https://track-eu.customer.io/api/v1' : 'https://track.customer.io/api/v1';

let getAppBaseUrl = (region: Region) =>
  region === 'eu' ? 'https://api-eu.customer.io/v1' : 'https://api.customer.io/v1';

let withoutUndefined = (value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

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

  private async request<T>(operation: string, run: () => Promise<AxiosResponse<T>>) {
    try {
      return (await run()).data;
    } catch (error) {
      throw customerIoApiError(error, operation);
    }
  }

  async identifyPerson(identifier: string, attributes: Record<string, unknown>) {
    return await this.request('identify person', () =>
      this.axios.put(`/customers/${encodeURIComponent(identifier)}`, attributes)
    );
  }

  async deletePerson(identifier: string) {
    return await this.request('delete person', () =>
      this.axios.delete(`/customers/${encodeURIComponent(identifier)}`)
    );
  }

  async suppressPerson(identifier: string) {
    return await this.request('suppress person', () =>
      this.axios.post(`/customers/${encodeURIComponent(identifier)}/suppress`)
    );
  }

  async unsuppressPerson(identifier: string) {
    return await this.request('unsuppress person', () =>
      this.axios.post(`/customers/${encodeURIComponent(identifier)}/unsuppress`)
    );
  }

  async trackEvent(
    identifier: string,
    event: {
      name: string;
      type?: 'event' | 'page' | 'screen';
      id?: string;
      data?: Record<string, unknown>;
      anonymous_id?: string;
      timestamp?: number;
    }
  ) {
    return await this.request('track customer event', () =>
      this.axios.post(
        `/customers/${encodeURIComponent(identifier)}/events`,
        withoutUndefined(event)
      )
    );
  }

  async trackAnonymousEvent(event: {
    name: string;
    type?: 'event' | 'page' | 'screen';
    id?: string;
    data?: Record<string, unknown>;
    anonymous_id?: string;
    timestamp?: number;
  }) {
    return await this.request('track anonymous event', () =>
      this.axios.post('/events', withoutUndefined(event))
    );
  }

  async addDevice(
    identifier: string,
    device: {
      id: string;
      platform: 'ios' | 'android';
      last_used?: number;
      attributes?: Record<string, unknown>;
    }
  ) {
    return await this.request('add device', () =>
      this.axios.put(`/customers/${encodeURIComponent(identifier)}/devices`, {
        device: withoutUndefined(device)
      })
    );
  }

  async deleteDevice(identifier: string, deviceToken: string) {
    return await this.request('delete device', () =>
      this.axios.delete(
        `/customers/${encodeURIComponent(identifier)}/devices/${encodeURIComponent(deviceToken)}`
      )
    );
  }

  async addToManualSegment(segmentId: number, customerIds: string[]) {
    return await this.request('add people to manual segment', () =>
      this.axios.post(`/segments/${segmentId}/add_customers`, {
        ids: customerIds
      })
    );
  }

  async removeFromManualSegment(segmentId: number, customerIds: string[]) {
    return await this.request('remove people from manual segment', () =>
      this.axios.post(`/segments/${segmentId}/remove_customers`, {
        ids: customerIds
      })
    );
  }

  async mergeCustomers(
    primary: { idType: string; id: string },
    secondary: { idType: string; id: string }
  ) {
    return await this.request('merge people', () =>
      this.axios.post('/merge_customers', {
        primary: { [primary.idType]: primary.id },
        secondary: { [secondary.idType]: secondary.id }
      })
    );
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

  private async request<T>(operation: string, run: () => Promise<AxiosResponse<T>>) {
    try {
      return (await run()).data;
    } catch (error) {
      throw customerIoApiError(error, operation);
    }
  }

  // ---- People / Customers ----

  async getCustomerByEmail(email: string) {
    return await this.request('get customer by email', () =>
      this.axios.get('/customers', { params: { email } })
    );
  }

  async getCustomerAttributes(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    return await this.request('get customer attributes', () =>
      this.axios.get(`/customers/${encodeURIComponent(customerId)}/attributes`, {
        params
      })
    );
  }

  async getCustomerSegments(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    return await this.request('get customer segments', () =>
      this.axios.get(`/customers/${encodeURIComponent(customerId)}/segments`, { params })
    );
  }

  async getCustomerMessages(customerId: string, idType?: string) {
    let params: Record<string, string> = {};
    if (idType) params.id_type = idType;
    return await this.request('get customer messages', () =>
      this.axios.get(`/customers/${encodeURIComponent(customerId)}/messages`, { params })
    );
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
    return await this.request('get customer activities', () =>
      this.axios.get(`/customers/${encodeURIComponent(customerId)}/activities`, {
        params
      })
    );
  }

  async searchPeople(filter: Record<string, unknown>) {
    return await this.request('search people', () =>
      this.axios.post('/customers', { filter })
    );
  }

  // ---- Segments ----

  async listSegments() {
    return await this.request('list segments', () => this.axios.get('/segments'));
  }

  async getSegment(segmentId: number) {
    return await this.request('get segment', () => this.axios.get(`/segments/${segmentId}`));
  }

  async getSegmentMembership(segmentId: number, start?: string, limit?: number) {
    let params: Record<string, string | number> = {};
    if (start) params.start = start;
    if (limit) params.limit = limit;
    return await this.request('get segment membership', () =>
      this.axios.get(`/segments/${segmentId}/membership`, { params })
    );
  }

  async createManualSegment(name: string, description?: string) {
    return await this.request('create manual segment', () =>
      this.axios.post('/segments', withoutUndefined({ name, description }))
    );
  }

  async deleteManualSegment(segmentId: number) {
    return await this.request('delete manual segment', () =>
      this.axios.delete(`/segments/${segmentId}`)
    );
  }

  // ---- Campaigns ----

  async listCampaigns() {
    return await this.request('list campaigns', () => this.axios.get('/campaigns'));
  }

  async getCampaign(campaignId: number) {
    return await this.request('get campaign', () =>
      this.axios.get(`/campaigns/${campaignId}`)
    );
  }

  async getCampaignMetrics(
    campaignId: number,
    params?: { period?: string; steps?: number; type?: string }
  ) {
    return await this.request('get campaign metrics', () =>
      this.axios.get(`/campaigns/${campaignId}/metrics`, { params })
    );
  }

  async getCampaignActions(campaignId: number) {
    return await this.request('get campaign actions', () =>
      this.axios.get(`/campaigns/${campaignId}/actions`)
    );
  }

  // ---- Broadcasts ----

  async listBroadcasts() {
    return await this.request('list broadcasts', () => this.axios.get('/broadcasts'));
  }

  async getBroadcast(broadcastId: number) {
    return await this.request('get broadcast', () =>
      this.axios.get(`/broadcasts/${broadcastId}`)
    );
  }

  async getBroadcastActions(broadcastId: number) {
    return await this.request('get broadcast actions', () =>
      this.axios.get(`/broadcasts/${broadcastId}/actions`)
    );
  }

  async getBroadcastMetrics(broadcastId: number) {
    return await this.request('get broadcast metrics', () =>
      this.axios.get(`/broadcasts/${broadcastId}/metrics`)
    );
  }

  async triggerBroadcast(broadcastId: number, payload: Record<string, unknown>) {
    return await this.request('trigger broadcast', () =>
      this.axios.post(`/campaigns/${broadcastId}/triggers`, payload)
    );
  }

  async getBroadcastTriggers(broadcastId: number) {
    return await this.request('get broadcast triggers', () =>
      this.axios.get(`/broadcasts/${broadcastId}/triggers`)
    );
  }

  async getBroadcastTrigger(broadcastId: number, triggerId: number) {
    return await this.request('get broadcast trigger', () =>
      this.axios.get(`/campaigns/${broadcastId}/triggers/${triggerId}`)
    );
  }

  async getBroadcastTriggerErrors(broadcastId: number, triggerId: number, start?: string) {
    return await this.request('get broadcast trigger errors', () =>
      this.axios.get(`/campaigns/${broadcastId}/triggers/${triggerId}/errors`, {
        params: start ? { start } : undefined
      })
    );
  }

  // ---- Transactional Messages ----

  async listTransactionalMessages() {
    return await this.request('list transactional messages', () =>
      this.axios.get('/transactional')
    );
  }

  async getTransactionalMessage(transactionalId: number | string) {
    return await this.request('get transactional message', () =>
      this.axios.get(`/transactional/${encodeURIComponent(String(transactionalId))}`)
    );
  }

  async sendTransactionalEmail(message: Record<string, unknown>) {
    return await this.request('send transactional email', () =>
      this.axios.post('/send/email', message)
    );
  }

  async sendTransactionalPush(message: Record<string, unknown>) {
    return await this.request('send transactional push', () =>
      this.axios.post('/send/push', message)
    );
  }

  async sendTransactionalSms(message: Record<string, unknown>) {
    return await this.request('send transactional sms', () =>
      this.axios.post('/send/sms', message)
    );
  }

  async sendTransactionalInApp(message: Record<string, unknown>) {
    return await this.request('send transactional in-app message', () =>
      this.axios.post('/send/in_app', message)
    );
  }

  async sendTransactionalInboxMessage(message: Record<string, unknown>) {
    return await this.request('send transactional inbox message', () =>
      this.axios.post('/send/inbox_message', message)
    );
  }

  // ---- Collections ----

  async listCollections() {
    return await this.request('list collections', () => this.axios.get('/collections'));
  }

  async getCollection(collectionId: string) {
    return await this.request('get collection', () =>
      this.axios.get(`/collections/${encodeURIComponent(collectionId)}`)
    );
  }

  async getCollectionContents(collectionId: string) {
    return await this.request('get collection contents', () =>
      this.axios.get(`/collections/${encodeURIComponent(collectionId)}/content`)
    );
  }

  async createCollection(name: string, data: unknown[] | string) {
    let body: Record<string, unknown> = { name };
    if (typeof data === 'string') {
      body.url = data;
    } else {
      body.data = data;
    }
    return await this.request('create collection', () =>
      this.axios.post('/collections', body)
    );
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
    return await this.request('update collection', () =>
      this.axios.put(`/collections/${encodeURIComponent(collectionId)}`, body)
    );
  }

  async deleteCollection(collectionId: string) {
    return await this.request('delete collection', () =>
      this.axios.delete(`/collections/${encodeURIComponent(collectionId)}`)
    );
  }

  // ---- Exports ----

  async createCustomerExport(filters: Record<string, unknown>) {
    return await this.request('create customer export', () =>
      this.axios.post('/exports/customers', { filters })
    );
  }

  async getExport(exportId: number) {
    return await this.request('get export', () => this.axios.get(`/exports/${exportId}`));
  }

  async listExports() {
    return await this.request('list exports', () => this.axios.get('/exports'));
  }

  async getExportDownloadUrl(exportId: number) {
    return await this.request<{ url?: string }>('get export download URL', () =>
      this.axios.get(`/exports/${exportId}/download`)
    );
  }

  async downloadExport(exportId: number) {
    let result = await this.getExportDownloadUrl(exportId);
    if (!result.url) {
      throw customerIoServiceError('Customer.io did not return an export download URL.');
    }

    try {
      let response = await fetch(result.url);
      if (!response.ok) {
        throw customerIoServiceError(
          `Customer.io export file download failed: HTTP ${response.status} ${response.statusText}`
        );
      }

      let mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
      let bytes = Buffer.from(await response.arrayBuffer());

      return {
        exportId,
        mimeType,
        byteLength: bytes.byteLength,
        contentBase64: bytes.toString('base64')
      };
    } catch (error) {
      throw customerIoApiError(error, 'download export file');
    }
  }

  // ---- Activities ----

  async listActivities(params?: { start?: string; limit?: number; type?: string }) {
    return await this.request('list activities', () =>
      this.axios.get('/activities', { params })
    );
  }

  // ---- Newsletters ----

  async listNewsletters() {
    return await this.request('list newsletters', () => this.axios.get('/newsletters'));
  }

  async getNewsletter(newsletterId: number) {
    return await this.request('get newsletter', () =>
      this.axios.get(`/newsletters/${newsletterId}`)
    );
  }

  async getNewsletterMetrics(
    newsletterId: number,
    params?: { period?: string; steps?: number; type?: string }
  ) {
    return await this.request('get newsletter metrics', () =>
      this.axios.get(`/newsletters/${newsletterId}/metrics`, { params })
    );
  }

  // ---- Messages ----

  async listMessages() {
    return await this.request('list messages', () => this.axios.get('/messages'));
  }

  async getMessage(messageId: string) {
    return await this.request('get message', () =>
      this.axios.get(`/messages/${encodeURIComponent(messageId)}`)
    );
  }
}
