import { createAxios } from 'slates';

let BASE_URL = 'https://api.moosend.com/v3';

export class MoosendClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private params(
    extra?: Record<string, string | number | boolean | undefined>
  ): Record<string, string | number | boolean | undefined> {
    return { apikey: this.token, ...extra };
  }

  // ─── Campaigns ───

  async createCampaign(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/campaigns/create.json', body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async updateCampaign(
    campaignId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/campaigns/${campaignId}/update.json`, body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getCampaigns(
    page: number = 1,
    pageSize: number = 50
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${page}/${pageSize}.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getCampaign(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/view.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async sendCampaign(campaignId: string): Promise<void> {
    await this.axios.post(`/campaigns/${campaignId}/send.json`, {}, { params: this.params() });
  }

  async scheduleCampaign(
    campaignId: string,
    dateTime: string,
    timezone?: string
  ): Promise<void> {
    let body: Record<string, string> = { DateTime: dateTime };
    if (timezone) body.Timezone = timezone;
    await this.axios.post(`/campaigns/${campaignId}/schedule.json`, body, {
      params: this.params()
    });
  }

  async unscheduleCampaign(campaignId: string): Promise<void> {
    await this.axios.post(
      `/campaigns/${campaignId}/unschedule.json`,
      {},
      { params: this.params() }
    );
  }

  async cloneCampaign(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/campaigns/${campaignId}/clone.json`,
      {},
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.axios.delete(`/campaigns/${campaignId}/delete.json`, { params: this.params() });
  }

  async sendTestEmail(campaignId: string, emails: string[]): Promise<void> {
    await this.axios.post(
      `/campaigns/${campaignId}/send_test.json`,
      { TestEmails: emails },
      { params: this.params() }
    );
  }

  // ─── Campaign Analytics ───

  async getCampaignSummary(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/view_summary.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getCampaignABSummary(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/view_ab_summary.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getCampaignStats(
    campaignId: string,
    type: string,
    page?: number,
    pageSize?: number,
    from?: string,
    to?: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/stats/${type}.json`, {
      params: this.params({
        Page: page,
        PageSize: pageSize,
        From: from,
        To: to
      })
    });
    return response.data?.Context;
  }

  async getCampaignLinkActivity(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/stats/links.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getCampaignActivityByLocation(campaignId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/campaigns/${campaignId}/stats/countries.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  // ─── Mailing Lists ───

  async createMailingList(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/lists/create.json', body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getMailingLists(
    page: number = 1,
    pageSize: number = 100,
    withStatistics: boolean = false
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/lists/${page}/${pageSize}.json`, {
      params: this.params({ WithStatistics: withStatistics ? 'true' : undefined })
    });
    return response.data?.Context;
  }

  async getMailingList(
    listId: string,
    withStatistics: boolean = false
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/lists/${listId}/details.json`, {
      params: this.params({ WithStatistics: withStatistics ? 'true' : undefined })
    });
    return response.data?.Context;
  }

  async updateMailingList(
    listId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/lists/${listId}/update.json`, body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async deleteMailingList(listId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/delete.json`, { params: this.params() });
  }

  // ─── Custom Fields ───

  async createCustomField(
    listId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/lists/${listId}/customfields/create.json`, body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async updateCustomField(
    listId: string,
    fieldId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/lists/${listId}/customfields/${fieldId}/update.json`,
      body,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async deleteCustomField(listId: string, fieldId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/customfields/${fieldId}/delete.json`, {
      params: this.params()
    });
  }

  // ─── Subscribers ───

  async addSubscriber(
    listId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/subscribers/${listId}/subscribe.json`, body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async addMultipleSubscribers(
    listId: string,
    subscribers: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/subscribers/${listId}/subscribe_many.json`,
      { Subscribers: subscribers },
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async updateSubscriber(
    listId: string,
    subscriberId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/subscribers/${listId}/update/${subscriberId}.json`,
      body,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async getSubscriberByEmail(listId: string, email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/subscribers/${listId}/view.json`, {
      params: this.params({ Email: email })
    });
    return response.data?.Context;
  }

  async getSubscriberById(
    listId: string,
    subscriberId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/subscribers/${listId}/find/${subscriberId}.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getSubscribersByStatus(
    listId: string,
    status: string,
    page?: number,
    pageSize?: number,
    since?: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/lists/${listId}/subscribers/${status}.json`, {
      params: this.params({
        Page: page,
        PageSize: pageSize,
        Since: since
      })
    });
    return response.data?.Context;
  }

  async unsubscribeFromList(listId: string, email: string): Promise<void> {
    await this.axios.post(
      `/subscribers/${listId}/unsubscribe.json`,
      { Email: email },
      { params: this.params() }
    );
  }

  async unsubscribeFromCampaign(
    listId: string,
    campaignId: string,
    email: string
  ): Promise<void> {
    await this.axios.post(
      `/subscribers/${listId}/${campaignId}/unsubscribe.json`,
      { Email: email },
      { params: this.params() }
    );
  }

  async removeSubscriber(listId: string, email: string): Promise<void> {
    await this.axios.post(
      `/subscribers/${listId}/remove.json`,
      { Email: email },
      { params: this.params() }
    );
  }

  async removeMultipleSubscribers(
    listId: string,
    emails: string[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/subscribers/${listId}/remove_many.json`,
      { Emails: emails },
      { params: this.params() }
    );
    return response.data?.Context;
  }

  // ─── Segments ───

  async createSegment(
    listId: string,
    name: string,
    matchType?: string
  ): Promise<Record<string, unknown>> {
    let body: Record<string, string> = { Name: name };
    if (matchType) body.MatchType = matchType;
    let response = await this.axios.post(`/lists/${listId}/segments/create.json`, body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getSegments(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/lists/${listId}/segments.json`, {
      params: this.params()
    });
    return response.data?.Context;
  }

  async getSegment(listId: string, segmentId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/lists/${listId}/segments/${segmentId}/details.json`,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async getSegmentSubscribers(
    listId: string,
    segmentId: string,
    page?: number,
    pageSize?: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/lists/${listId}/segments/${segmentId}/members.json`,
      {
        params: this.params({ Page: page, PageSize: pageSize })
      }
    );
    return response.data?.Context;
  }

  async updateSegment(
    listId: string,
    segmentId: string,
    name: string,
    matchType?: string
  ): Promise<Record<string, unknown>> {
    let body: Record<string, string> = { Name: name };
    if (matchType) body.MatchType = matchType;
    let response = await this.axios.post(
      `/lists/${listId}/segments/${segmentId}/update.json`,
      body,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async addSegmentCriteria(
    listId: string,
    segmentId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/lists/${listId}/segments/${segmentId}/criteria/add.json`,
      body,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async updateSegmentCriteria(
    listId: string,
    segmentId: string,
    criteriaId: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/lists/${listId}/segments/${segmentId}/criteria/${criteriaId}/update.json`,
      body,
      { params: this.params() }
    );
    return response.data?.Context;
  }

  async deleteSegment(listId: string, segmentId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/segments/${segmentId}/delete.json`, {
      params: this.params()
    });
  }

  // ─── Transactional Email ───

  async sendTransactionalEmail(
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/campaigns/transactional/send.json', body, {
      params: this.params()
    });
    return response.data?.Context;
  }

  // ─── Senders ───

  async getSenders(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/senders/find_all.json', { params: this.params() });
    return response.data?.Context;
  }

  async getSenderByEmail(email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/senders/find_one.json', {
      params: this.params({ Email: email })
    });
    return response.data?.Context;
  }
}
