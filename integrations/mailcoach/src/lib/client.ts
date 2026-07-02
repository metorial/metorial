import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; domain: string }) {
    this.http = createAxios({
      baseURL: `https://${config.domain}.mailcoach.app/api`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Email Lists ──

  async listEmailLists(params?: { search?: string; sort?: string; page?: number }) {
    let query: Record<string, string> = {};
    if (params?.search) query['filter[search]'] = params.search;
    if (params?.sort) query.sort = params.sort;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get('/email-lists', { params: query });
    return response.data;
  }

  async getEmailList(emailListUuid: string) {
    let response = await this.http.get(`/email-lists/${emailListUuid}`);
    return response.data.data;
  }

  async createEmailList(data: {
    name: string;
    default_from_email: string;
    default_from_name?: string;
    default_reply_to_email?: string;
    default_reply_to_name?: string;
    allow_form_subscriptions?: boolean;
    requires_confirmation?: boolean;
    campaigns_feed_enabled?: boolean;
    report_recipients?: string;
    report_campaign_sent?: boolean;
    report_campaign_summary?: boolean;
    report_email_list_summary?: boolean;
  }) {
    let response = await this.http.post('/email-lists', data);
    return response.data.data;
  }

  async updateEmailList(
    emailListUuid: string,
    data: {
      name: string;
      default_from_email: string;
      default_from_name?: string;
      default_reply_to_email?: string;
      default_reply_to_name?: string;
      allow_form_subscriptions?: boolean;
      requires_confirmation?: boolean;
      campaigns_feed_enabled?: boolean;
      report_recipients?: string;
      report_campaign_sent?: boolean;
      report_campaign_summary?: boolean;
      report_email_list_summary?: boolean;
    }
  ) {
    let response = await this.http.put(`/email-lists/${emailListUuid}`, data);
    return response.data.data;
  }

  async deleteEmailList(emailListUuid: string) {
    await this.http.delete(`/email-lists/${emailListUuid}`);
  }

  // ── Subscribers ──

  async listSubscribers(
    emailListUuid: string,
    params?: {
      search?: string;
      status?: string;
      sort?: string;
      page?: number;
    }
  ) {
    let query: Record<string, string> = {};
    if (params?.search) query['filter[search]'] = params.search;
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.sort) query.sort = params.sort;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/email-lists/${emailListUuid}/subscribers`, {
      params: query
    });
    return response.data;
  }

  async getSubscriber(subscriberUuid: string) {
    let response = await this.http.get(`/subscribers/${subscriberUuid}`);
    return response.data.data;
  }

  async createSubscriber(
    emailListUuid: string,
    data: {
      email: string;
      first_name?: string;
      last_name?: string;
      tags?: string[];
      extra_attributes?: Record<string, unknown>;
      skip_confirmation?: boolean;
    }
  ) {
    let response = await this.http.post(`/email-lists/${emailListUuid}/subscribers`, data);
    return response.data.data;
  }

  async updateSubscriber(
    subscriberUuid: string,
    data: {
      email?: string;
      first_name?: string;
      last_name?: string;
      tags?: string[];
      extra_attributes?: Record<string, unknown>;
    }
  ) {
    let response = await this.http.patch(`/subscribers/${subscriberUuid}`, data);
    return response.data.data;
  }

  async deleteSubscriber(subscriberUuid: string) {
    await this.http.delete(`/subscribers/${subscriberUuid}`);
  }

  async confirmSubscriber(subscriberUuid: string) {
    let response = await this.http.post(`/subscribers/${subscriberUuid}/confirm`);
    return response.data.data;
  }

  async unsubscribe(subscriberUuid: string) {
    let response = await this.http.post(`/subscribers/${subscriberUuid}/unsubscribe`);
    return response.data.data;
  }

  async resendConfirmation(subscriberUuid: string) {
    await this.http.post(`/subscribers/${subscriberUuid}/resend-confirmation`);
  }

  async addTagsToSubscriber(subscriberUuid: string, tags: string[]) {
    let response = await this.http.post(`/subscribers/${subscriberUuid}/tags`, { tags });
    return response.data;
  }

  async removeTagsFromSubscriber(subscriberUuid: string, tags: string[]) {
    let response = await this.http.delete(`/subscribers/${subscriberUuid}/tags`, {
      data: { tags }
    });
    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(params?: {
    search?: string;
    status?: string;
    sort?: string;
    page?: number;
  }) {
    let query: Record<string, string> = {};
    if (params?.search) query['filter[search]'] = params.search;
    if (params?.status) query['filter[status]'] = params.status;
    if (params?.sort) query.sort = params.sort;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get('/campaigns', { params: query });
    return response.data;
  }

  async getCampaign(campaignUuid: string) {
    let response = await this.http.get(`/campaigns/${campaignUuid}`);
    return response.data.data;
  }

  async createCampaign(data: {
    name: string;
    email_list_uuid: string;
    subject?: string;
    html?: string;
    mailable_class?: string;
    template_uuid?: string;
    fields?: Record<string, string>;
    from_email?: string;
    from_name?: string;
    reply_to_email?: string;
    reply_to_name?: string;
    segment_uuid?: string;
    utm_tags?: boolean;
    schedule_at?: string;
  }) {
    let response = await this.http.post('/campaigns', data);
    return response.data.data;
  }

  async updateCampaign(
    campaignUuid: string,
    data: {
      name?: string;
      email_list_uuid?: string;
      subject?: string;
      html?: string;
      template_uuid?: string;
      fields?: Record<string, string>;
      from_email?: string;
      from_name?: string;
      reply_to_email?: string;
      reply_to_name?: string;
      segment_uuid?: string;
      utm_tags?: boolean;
      schedule_at?: string;
    }
  ) {
    let response = await this.http.put(`/campaigns/${campaignUuid}`, data);
    return response.data.data;
  }

  async deleteCampaign(campaignUuid: string) {
    await this.http.delete(`/campaigns/${campaignUuid}`);
  }

  async sendCampaign(campaignUuid: string) {
    let response = await this.http.post(`/campaigns/${campaignUuid}/send`);
    return response.data;
  }

  async sendCampaignTest(campaignUuid: string, email: string) {
    let response = await this.http.post(`/campaigns/${campaignUuid}/send-test`, { email });
    return response.data;
  }

  async getCampaignOpens(campaignUuid: string, params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/campaigns/${campaignUuid}/opens`, { params: query });
    return response.data;
  }

  async getCampaignClicks(campaignUuid: string, params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/campaigns/${campaignUuid}/clicks`, { params: query });
    return response.data;
  }

  async getCampaignUnsubscribes(campaignUuid: string, params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/campaigns/${campaignUuid}/unsubscribes`, {
      params: query
    });
    return response.data;
  }

  async getCampaignBounces(campaignUuid: string, params?: { type?: string; page?: number }) {
    let query: Record<string, string> = {};
    if (params?.type) query['filter[type]'] = params.type;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/campaigns/${campaignUuid}/bounces`, {
      params: query
    });
    return response.data;
  }

  // ── Templates ──

  async listTemplates(params?: { search?: string; sort?: string; page?: number }) {
    let query: Record<string, string> = {};
    if (params?.search) query['filter[search]'] = params.search;
    if (params?.sort) query.sort = params.sort;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get('/templates', { params: query });
    return response.data;
  }

  async getTemplate(templateUuid: string) {
    let response = await this.http.get(`/templates/${templateUuid}`);
    return response.data.data;
  }

  async createTemplate(data: { name: string; html?: string; structured_html?: string }) {
    let response = await this.http.post('/templates', data);
    return response.data.data;
  }

  async updateTemplate(
    templateUuid: string,
    data: { name: string; html?: string; structured_html?: string }
  ) {
    let response = await this.http.put(`/templates/${templateUuid}`, data);
    return response.data.data;
  }

  async deleteTemplate(templateUuid: string) {
    await this.http.delete(`/templates/${templateUuid}`);
  }

  // ── Transactional Emails ──

  async sendTransactionalEmail(data: {
    mail_name?: string;
    subject?: string;
    html?: string;
    from?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    replacements?: Record<string, string>;
    store?: boolean;
    fake?: boolean;
    mailer?: string;
  }) {
    let response = await this.http.post('/transactional-mails/send', data);
    return response.data;
  }

  // ── Tags ──

  async listTags(emailListUuid: string, params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/email-lists/${emailListUuid}/tags`, {
      params: query
    });
    return response.data;
  }

  async getTag(emailListUuid: string, tagUuid: string) {
    let response = await this.http.get(`/email-lists/${emailListUuid}/tags/${tagUuid}`);
    return response.data.data;
  }

  async createTag(
    emailListUuid: string,
    data: { name: string; visible_in_preferences?: boolean }
  ) {
    let response = await this.http.post(`/email-lists/${emailListUuid}/tags`, data);
    return response.data.data;
  }

  async updateTag(
    emailListUuid: string,
    tagUuid: string,
    data: { name: string; visible_in_preferences?: boolean }
  ) {
    let response = await this.http.put(`/email-lists/${emailListUuid}/tags/${tagUuid}`, data);
    return response.data.data;
  }

  async deleteTag(emailListUuid: string, tagUuid: string) {
    await this.http.delete(`/email-lists/${emailListUuid}/tags/${tagUuid}`);
  }

  // ── Segments ──

  async listSegments(emailListUuid: string, params?: { page?: number }) {
    let query: Record<string, string> = {};
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get(`/email-lists/${emailListUuid}/segments`, {
      params: query
    });
    return response.data;
  }

  async getSegment(emailListUuid: string, segmentUuid: string) {
    let response = await this.http.get(
      `/email-lists/${emailListUuid}/segments/${segmentUuid}`
    );
    return response.data.data;
  }

  async createSegment(
    emailListUuid: string,
    data: {
      name: string;
      all_positive_tags_required?: boolean;
      all_negative_tags_required?: boolean;
      positive_tags?: string[];
      negative_tags?: string[];
    }
  ) {
    let response = await this.http.post(`/email-lists/${emailListUuid}/segments`, data);
    return response.data.data;
  }

  async updateSegment(
    emailListUuid: string,
    segmentUuid: string,
    data: {
      name: string;
      all_positive_tags_required?: boolean;
      all_negative_tags_required?: boolean;
      positive_tags?: string[];
      negative_tags?: string[];
    }
  ) {
    let response = await this.http.put(
      `/email-lists/${emailListUuid}/segments/${segmentUuid}`,
      data
    );
    return response.data.data;
  }

  async deleteSegment(emailListUuid: string, segmentUuid: string) {
    await this.http.delete(`/email-lists/${emailListUuid}/segments/${segmentUuid}`);
  }

  // ── Suppressions ──

  async listSuppressions(params?: {
    search?: string;
    reason?: string;
    sort?: string;
    page?: number;
  }) {
    let query: Record<string, string> = {};
    if (params?.search) query['filter[search]'] = params.search;
    if (params?.reason) query['filter[reason]'] = params.reason;
    if (params?.sort) query.sort = params.sort;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get('/suppressions', { params: query });
    return response.data;
  }

  async getSuppression(emailOrUuid: string) {
    let response = await this.http.get(`/suppressions/${emailOrUuid}`);
    return response.data.data;
  }

  async createSuppression(data: { email: string; reason?: string }) {
    let response = await this.http.post('/suppressions', data);
    return response.data.data;
  }

  async deleteSuppression(emailOrUuid: string) {
    await this.http.delete(`/suppressions/${emailOrUuid}`);
  }

  // ── Sends ──

  async listSends(params?: { subscriberUuid?: string; campaignUuid?: string; page?: number }) {
    let query: Record<string, string> = {};
    if (params?.subscriberUuid) query['filter[subscriber_uuid]'] = params.subscriberUuid;
    if (params?.campaignUuid) query['filter[campaign_uuid]'] = params.campaignUuid;
    if (params?.page) query.page = params.page.toString();
    let response = await this.http.get('/sends', { params: query });
    return response.data;
  }

  async getSend(sendUuid: string) {
    let response = await this.http.get(`/sends/${sendUuid}`);
    return response.data.data;
  }

  async deleteSend(sendUuid: string) {
    await this.http.delete(`/sends/${sendUuid}`);
  }

  // ── Subscriber Imports ──

  async createSubscriberImport(data: {
    email_list_uuid: string;
    subscribers_csv: string;
    subscribe_unsubscribed?: boolean;
    unsubscribe_others?: boolean;
  }) {
    let response = await this.http.post('/subscriber-imports', data);
    return response.data.data;
  }

  async startSubscriberImport(importUuid: string) {
    let response = await this.http.post(`/subscriber-imports/${importUuid}/start`);
    return response.data.data;
  }

  async getSubscriberImport(importUuid: string) {
    let response = await this.http.get(`/subscriber-imports/${importUuid}`);
    return response.data.data;
  }
}
