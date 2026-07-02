import { createAxios } from 'slates';

export class TelnyxClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.telnyx.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Messaging ──────────────────────────────────────────────

  async sendMessage(params: {
    from: string;
    to: string;
    text?: string;
    mediaUrls?: string[];
    messagingProfileId?: string;
    subject?: string;
    type?: 'SMS' | 'MMS';
    webhookUrl?: string;
    autoDetect?: boolean;
  }) {
    let body: Record<string, unknown> = {
      from: params.from,
      to: params.to
    };
    if (params.text) body.text = params.text;
    if (params.mediaUrls) body.media_urls = params.mediaUrls;
    if (params.messagingProfileId) body.messaging_profile_id = params.messagingProfileId;
    if (params.subject) body.subject = params.subject;
    if (params.type) body.type = params.type;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.autoDetect !== undefined) body.auto_detect = params.autoDetect;

    let response = await this.http.post('/messages', body);
    return response.data?.data;
  }

  async getMessage(messageId: string) {
    let response = await this.http.get(`/messages/${messageId}`);
    return response.data?.data;
  }

  async listMessages(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/messages', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  // ─── Messaging Profiles ─────────────────────────────────────

  async listMessagingProfiles(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/messaging_profiles', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async getMessagingProfile(profileId: string) {
    let response = await this.http.get(`/messaging_profiles/${profileId}`);
    return response.data?.data;
  }

  async createMessagingProfile(params: {
    name: string;
    webhookUrl?: string;
    webhookFailoverUrl?: string;
    webhookApiVersion?: string;
    enabled?: boolean;
  }) {
    let body: Record<string, unknown> = { name: params.name };
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.webhookFailoverUrl) body.webhook_failover_url = params.webhookFailoverUrl;
    if (params.webhookApiVersion) body.webhook_api_version = params.webhookApiVersion;
    if (params.enabled !== undefined) body.enabled = params.enabled;

    let response = await this.http.post('/messaging_profiles', body);
    return response.data?.data;
  }

  async updateMessagingProfile(
    profileId: string,
    params: {
      name?: string;
      webhookUrl?: string;
      webhookFailoverUrl?: string;
      webhookApiVersion?: string;
      enabled?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name) body.name = params.name;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.webhookFailoverUrl !== undefined)
      body.webhook_failover_url = params.webhookFailoverUrl;
    if (params.webhookApiVersion) body.webhook_api_version = params.webhookApiVersion;
    if (params.enabled !== undefined) body.enabled = params.enabled;

    let response = await this.http.patch(`/messaging_profiles/${profileId}`, body);
    return response.data?.data;
  }

  async deleteMessagingProfile(profileId: string) {
    await this.http.delete(`/messaging_profiles/${profileId}`);
  }

  // ─── Phone Numbers ──────────────────────────────────────────

  async searchAvailablePhoneNumbers(params: {
    countryCode: string;
    phoneNumberType?: string;
    features?: string[];
    city?: string;
    state?: string;
    startsWith?: string;
    endsWith?: string;
    contains?: string;
    limit?: number;
  }) {
    let query: Record<string, string> = {
      'filter[country_code]': params.countryCode
    };
    if (params.phoneNumberType) query['filter[phone_number_type]'] = params.phoneNumberType;
    if (params.features) query['filter[features]'] = params.features.join(',');
    if (params.city) query['filter[city]'] = params.city;
    if (params.state) query['filter[state]'] = params.state;
    if (params.startsWith) query['filter[phone_number][starts_with]'] = params.startsWith;
    if (params.endsWith) query['filter[phone_number][ends_with]'] = params.endsWith;
    if (params.contains) query['filter[phone_number][contains]'] = params.contains;
    if (params.limit) query['page[size]'] = String(params.limit);

    let response = await this.http.get('/available_phone_numbers', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async listPhoneNumbers(params?: {
    pageNumber?: number;
    pageSize?: number;
    tag?: string;
    status?: string;
    connectionId?: string;
  }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);
    if (params?.tag) query['filter[tag]'] = params.tag;
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.connectionId) query['filter[connection_id]'] = params.connectionId;

    let response = await this.http.get('/phone_numbers', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async getPhoneNumber(phoneNumberId: string) {
    let response = await this.http.get(`/phone_numbers/${phoneNumberId}`);
    return response.data?.data;
  }

  async updatePhoneNumber(
    phoneNumberId: string,
    params: {
      tags?: string[];
      connectionId?: string;
      billingGroupId?: string;
      externalPin?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.tags) body.tags = params.tags;
    if (params.connectionId) body.connection_id = params.connectionId;
    if (params.billingGroupId) body.billing_group_id = params.billingGroupId;
    if (params.externalPin) body.external_pin = params.externalPin;

    let response = await this.http.patch(`/phone_numbers/${phoneNumberId}`, body);
    return response.data?.data;
  }

  async deletePhoneNumber(phoneNumberId: string) {
    await this.http.delete(`/phone_numbers/${phoneNumberId}`);
  }

  async orderPhoneNumbers(phoneNumbers: string[]) {
    let body = {
      phone_numbers: phoneNumbers.map(pn => ({ phone_number: pn }))
    };
    let response = await this.http.post('/number_orders', body);
    return response.data?.data;
  }

  async getNumberOrder(orderId: string) {
    let response = await this.http.get(`/number_orders/${orderId}`);
    return response.data?.data;
  }

  async listNumberOrders(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/number_orders', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  // ─── Call Control ───────────────────────────────────────────

  async dialCall(params: {
    to: string;
    from: string;
    fromDisplayName?: string;
    connectionId: string;
    webhookUrl?: string;
    webhookUrlMethod?: string;
    answerMethod?: string;
    timeoutSecs?: number;
  }) {
    let body: Record<string, unknown> = {
      to: params.to,
      from: params.from,
      connection_id: params.connectionId
    };
    if (params.fromDisplayName) body.from_display_name = params.fromDisplayName;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.webhookUrlMethod) body.webhook_url_method = params.webhookUrlMethod;
    if (params.answerMethod) body.answer_method = params.answerMethod;
    if (params.timeoutSecs) body.timeout_secs = params.timeoutSecs;

    let response = await this.http.post('/calls', body);
    return response.data?.data;
  }

  async callAction(callControlId: string, action: string, params?: Record<string, unknown>) {
    let response = await this.http.post(
      `/calls/${callControlId}/actions/${action}`,
      params ?? {}
    );
    return response.data?.data;
  }

  // ─── Call Control Applications ──────────────────────────────

  async listCallControlApplications(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/call_control_applications', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async createCallControlApplication(params: {
    applicationName: string;
    webhookEventUrl: string;
    webhookEventFailoverUrl?: string;
    active?: boolean;
    anchorSiteOverride?: string;
    dtmfType?: string;
    inbound?: Record<string, unknown>;
    outbound?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      application_name: params.applicationName,
      webhook_event_url: params.webhookEventUrl
    };
    if (params.webhookEventFailoverUrl)
      body.webhook_event_failover_url = params.webhookEventFailoverUrl;
    if (params.active !== undefined) body.active = params.active;
    if (params.anchorSiteOverride) body.anchor_site_override = params.anchorSiteOverride;
    if (params.dtmfType) body.dtmf_type = params.dtmfType;
    if (params.inbound) body.inbound = params.inbound;
    if (params.outbound) body.outbound = params.outbound;

    let response = await this.http.post('/call_control_applications', body);
    return response.data?.data;
  }

  async updateCallControlApplication(
    applicationId: string,
    params: {
      applicationName?: string;
      webhookEventUrl?: string;
      webhookEventFailoverUrl?: string;
      active?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.applicationName) body.application_name = params.applicationName;
    if (params.webhookEventUrl) body.webhook_event_url = params.webhookEventUrl;
    if (params.webhookEventFailoverUrl !== undefined)
      body.webhook_event_failover_url = params.webhookEventFailoverUrl;
    if (params.active !== undefined) body.active = params.active;

    let response = await this.http.patch(`/call_control_applications/${applicationId}`, body);
    return response.data?.data;
  }

  async deleteCallControlApplication(applicationId: string) {
    await this.http.delete(`/call_control_applications/${applicationId}`);
  }

  // ─── Verify (2FA) ──────────────────────────────────────────

  async sendVerification(params: {
    phoneNumber: string;
    verifyProfileId: string;
    type: 'sms' | 'call' | 'flashcall' | 'whatsapp';
    customCode?: string;
    timeoutSecs?: number;
  }) {
    let body: Record<string, unknown> = {
      phone_number: params.phoneNumber,
      verify_profile_id: params.verifyProfileId
    };
    if (params.customCode) body.custom_code = params.customCode;
    if (params.timeoutSecs) body.timeout_secs = params.timeoutSecs;

    let response = await this.http.post(`/verifications/${params.type}`, body);
    return response.data?.data;
  }

  async verifyCode(phoneNumber: string, code: string, verifyProfileId: string) {
    let response = await this.http.post(
      `/verifications/by_phone_number/${encodeURIComponent(phoneNumber)}/actions/verify`,
      { code, verify_profile_id: verifyProfileId }
    );
    return response.data?.data;
  }

  async listVerifyProfiles(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/verify_profiles', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async createVerifyProfile(params: {
    name: string;
    webhookUrl?: string;
    webhookFailoverUrl?: string;
    defaultTimeoutSecs?: number;
  }) {
    let body: Record<string, unknown> = { name: params.name };
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.webhookFailoverUrl) body.webhook_failover_url = params.webhookFailoverUrl;
    if (params.defaultTimeoutSecs) body.default_timeout_secs = params.defaultTimeoutSecs;

    let response = await this.http.post('/verify_profiles', body);
    return response.data?.data;
  }

  async getVerifyProfile(profileId: string) {
    let response = await this.http.get(`/verify_profiles/${profileId}`);
    return response.data?.data;
  }

  async updateVerifyProfile(
    profileId: string,
    params: {
      name?: string;
      webhookUrl?: string;
      webhookFailoverUrl?: string;
      defaultTimeoutSecs?: number;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name) body.name = params.name;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.webhookFailoverUrl !== undefined)
      body.webhook_failover_url = params.webhookFailoverUrl;
    if (params.defaultTimeoutSecs) body.default_timeout_secs = params.defaultTimeoutSecs;

    let response = await this.http.patch(`/verify_profiles/${profileId}`, body);
    return response.data?.data;
  }

  async deleteVerifyProfile(profileId: string) {
    await this.http.delete(`/verify_profiles/${profileId}`);
  }

  // ─── Number Lookup ──────────────────────────────────────────

  async lookupNumber(phoneNumber: string, type?: 'carrier' | 'caller-name') {
    let query: Record<string, string> = {};
    if (type) query.type = type;

    let response = await this.http.get(`/number_lookup/${encodeURIComponent(phoneNumber)}`, {
      params: query
    });
    return response.data?.data;
  }

  // ─── Fax ────────────────────────────────────────────────────

  async sendFax(params: {
    connectionId: string;
    to: string;
    from: string;
    mediaUrl?: string;
    mediaName?: string;
    fromDisplayName?: string;
    quality?: 'normal' | 'high' | 'ultra_light' | 'ultra_dark';
    storeMedia?: boolean;
    webhookUrl?: string;
  }) {
    let body: Record<string, unknown> = {
      connection_id: params.connectionId,
      to: params.to,
      from: params.from
    };
    if (params.mediaUrl) body.media_url = params.mediaUrl;
    if (params.mediaName) body.media_name = params.mediaName;
    if (params.fromDisplayName) body.from_display_name = params.fromDisplayName;
    if (params.quality) body.quality = params.quality;
    if (params.storeMedia !== undefined) body.store_media = params.storeMedia;
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;

    let response = await this.http.post('/faxes', body);
    return response.data?.data;
  }

  async getFax(faxId: string) {
    let response = await this.http.get(`/faxes/${faxId}`);
    return response.data?.data;
  }

  async listFaxes(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/faxes', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async cancelFax(faxId: string) {
    let response = await this.http.post(`/faxes/${faxId}/actions/cancel`);
    return response.data?.data;
  }

  // ─── SIM Cards ──────────────────────────────────────────────

  async listSimCards(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: string;
    simCardGroupId?: string;
  }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.simCardGroupId) query['filter[sim_card_group_id]'] = params.simCardGroupId;

    let response = await this.http.get('/sim_cards', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  async getSimCard(simCardId: string) {
    let response = await this.http.get(`/sim_cards/${simCardId}`);
    return response.data?.data;
  }

  async updateSimCard(
    simCardId: string,
    params: {
      simCardGroupId?: string;
      tags?: string[];
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.simCardGroupId) body.sim_card_group_id = params.simCardGroupId;
    if (params.tags) body.tags = params.tags;

    let response = await this.http.patch(`/sim_cards/${simCardId}`, body);
    return response.data?.data;
  }

  async simCardAction(simCardId: string, action: 'enable' | 'disable' | 'set_standby') {
    let response = await this.http.post(`/sim_cards/${simCardId}/actions/${action}`);
    return response.data?.data;
  }

  async deleteSimCard(simCardId: string) {
    await this.http.delete(`/sim_cards/${simCardId}`);
  }

  // ─── SIM Card Groups ───────────────────────────────────────

  async listSimCardGroups(params?: { pageNumber?: number; pageSize?: number }) {
    let query: Record<string, string> = {};
    if (params?.pageNumber) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize) query['page[size]'] = String(params.pageSize);

    let response = await this.http.get('/sim_card_groups', { params: query });
    return { data: response.data?.data, meta: response.data?.meta };
  }

  // ─── Balance ────────────────────────────────────────────────

  async getBalance() {
    let response = await this.http.get('/balance');
    return response.data?.data;
  }
}
