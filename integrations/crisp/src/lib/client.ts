import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.crisp.chat/v1'
});

export class Client {
  private token: string;
  private websiteId: string;

  constructor(config: { token: string; websiteId: string }) {
    this.token = config.token;
    this.websiteId = config.websiteId;
  }

  private headers() {
    return {
      Authorization: `Basic ${this.token}`,
      'X-Crisp-Tier': 'plugin',
      'Content-Type': 'application/json'
    };
  }

  private url(path: string) {
    return `/website/${this.websiteId}${path}`;
  }

  // ── Conversations ──

  async listConversations(
    params: {
      pageNumber?: number;
      searchQuery?: string;
      searchType?: string;
      searchOperator?: string;
      filterUnread?: boolean;
      filterResolved?: boolean;
      filterNotResolved?: boolean;
      filterAssigned?: boolean;
      filterUnassigned?: boolean;
      filterInboxId?: string;
      filterDateStart?: string;
      filterDateEnd?: string;
      orderDateCreated?: string;
      orderDateUpdated?: string;
    } = {}
  ) {
    let page = params.pageNumber ?? 1;
    let queryParams: Record<string, string> = {};

    if (params.searchQuery) queryParams.search_query = params.searchQuery;
    if (params.searchType) queryParams.search_type = params.searchType;
    if (params.searchOperator) queryParams.search_operator = params.searchOperator;
    if (params.filterUnread !== undefined)
      queryParams.filter_unread = String(params.filterUnread ? 1 : 0);
    if (params.filterResolved !== undefined)
      queryParams.filter_resolved = String(params.filterResolved ? 1 : 0);
    if (params.filterNotResolved !== undefined)
      queryParams.filter_not_resolved = String(params.filterNotResolved ? 1 : 0);
    if (params.filterAssigned !== undefined)
      queryParams.filter_assigned = String(params.filterAssigned ? 1 : 0);
    if (params.filterUnassigned !== undefined)
      queryParams.filter_unassigned = String(params.filterUnassigned ? 1 : 0);
    if (params.filterInboxId) queryParams.filter_inbox_id = params.filterInboxId;
    if (params.filterDateStart) queryParams.filter_date_start = params.filterDateStart;
    if (params.filterDateEnd) queryParams.filter_date_end = params.filterDateEnd;
    if (params.orderDateCreated) queryParams.order_date_created = params.orderDateCreated;
    if (params.orderDateUpdated) queryParams.order_date_updated = params.orderDateUpdated;

    let response = await axios.get(this.url(`/conversations/${page}`), {
      headers: this.headers(),
      params: queryParams
    });
    return response.data.data;
  }

  async createConversation() {
    let response = await axios.post(
      this.url('/conversation'),
      {},
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async getConversation(sessionId: string) {
    let response = await axios.get(this.url(`/conversation/${sessionId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async removeConversation(sessionId: string) {
    await axios.delete(this.url(`/conversation/${sessionId}`), {
      headers: this.headers()
    });
  }

  // ── Conversation Meta ──

  async getConversationMeta(sessionId: string) {
    let response = await axios.get(this.url(`/conversation/${sessionId}/meta`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updateConversationMeta(
    sessionId: string,
    meta: {
      nickname?: string;
      email?: string;
      phone?: string;
      address?: string;
      subject?: string;
      avatar?: string;
      segments?: string[];
      data?: Record<string, any>;
    }
  ) {
    let response = await axios.patch(this.url(`/conversation/${sessionId}/meta`), meta, {
      headers: this.headers()
    });
    return response.data.data;
  }

  // ── Conversation State ──

  async getConversationState(sessionId: string) {
    let response = await axios.get(this.url(`/conversation/${sessionId}/state`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async changeConversationState(
    sessionId: string,
    state: 'pending' | 'unresolved' | 'resolved'
  ) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/state`),
      { state },
      {
        headers: this.headers()
      }
    );
  }

  // ── Conversation Routing ──

  async getConversationRouting(sessionId: string) {
    let response = await axios.get(this.url(`/conversation/${sessionId}/routing`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async assignConversationRouting(sessionId: string, assigned: { user_id: string } | null) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/routing`),
      { assigned },
      {
        headers: this.headers()
      }
    );
  }

  // ── Conversation Block ──

  async updateConversationBlock(sessionId: string, blocked: boolean) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/block`),
      { blocked },
      {
        headers: this.headers()
      }
    );
  }

  // ── Messages ──

  async getMessagesInConversation(sessionId: string, timestampBefore?: number) {
    let params: Record<string, string> = {};
    if (timestampBefore) params.timestamp_before = String(timestampBefore);

    let response = await axios.get(this.url(`/conversation/${sessionId}/messages`), {
      headers: this.headers(),
      params
    });
    return response.data.data;
  }

  async sendMessageInConversation(
    sessionId: string,
    message: {
      type: string;
      from: string;
      origin: string;
      content: any;
      stealth?: boolean;
      user?: { nickname?: string; avatar?: string };
    }
  ) {
    let response = await axios.post(this.url(`/conversation/${sessionId}/message`), message, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getMessage(sessionId: string, fingerprint: string) {
    let response = await axios.get(
      this.url(`/conversation/${sessionId}/message/${fingerprint}`),
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async updateMessage(sessionId: string, fingerprint: string, content: any) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/message/${fingerprint}`),
      { content },
      {
        headers: this.headers()
      }
    );
  }

  async removeMessage(sessionId: string, fingerprint: string) {
    await axios.delete(this.url(`/conversation/${sessionId}/message/${fingerprint}`), {
      headers: this.headers()
    });
  }

  // ── Mark Messages ──

  async markMessagesRead(
    sessionId: string,
    from: string,
    origin: string,
    fingerprints: string[]
  ) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/read`),
      {
        from,
        origin,
        fingerprints
      },
      {
        headers: this.headers()
      }
    );
  }

  async markConversationUnread(sessionId: string) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/unread`),
      {},
      {
        headers: this.headers()
      }
    );
  }

  async markMessagesDelivered(
    sessionId: string,
    from: string,
    origin: string,
    fingerprints: string[]
  ) {
    await axios.patch(
      this.url(`/conversation/${sessionId}/delivered`),
      {
        from,
        origin,
        fingerprints
      },
      {
        headers: this.headers()
      }
    );
  }

  // ── People / Contacts ──

  async listPeopleProfiles(
    params: {
      pageNumber?: number;
      searchQuery?: string;
      searchType?: string;
      searchOperator?: string;
    } = {}
  ) {
    let page = params.pageNumber ?? 1;
    let queryParams: Record<string, string> = {};
    if (params.searchQuery) queryParams.search_query = params.searchQuery;
    if (params.searchType) queryParams.search_type = params.searchType;
    if (params.searchOperator) queryParams.search_operator = params.searchOperator;

    let response = await axios.get(this.url(`/people/profiles/${page}`), {
      headers: this.headers(),
      params: queryParams
    });
    return response.data.data;
  }

  async createPeopleProfile(profile: { email?: string; person?: { nickname?: string } }) {
    let response = await axios.post(this.url('/people/profile'), profile, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getPeopleProfile(peopleId: string) {
    let response = await axios.get(this.url(`/people/profile/${peopleId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updatePeopleProfile(
    peopleId: string,
    profile: {
      email?: string;
      person?: { nickname?: string; avatar?: string };
      phone?: string;
      address?: string;
      segments?: string[];
    }
  ) {
    let response = await axios.patch(this.url(`/people/profile/${peopleId}`), profile, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async savePeopleProfile(
    peopleId: string,
    profile: {
      email?: string;
      person?: { nickname?: string; avatar?: string };
      phone?: string;
      address?: string;
      segments?: string[];
    }
  ) {
    let response = await axios.put(this.url(`/people/profile/${peopleId}`), profile, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async removePeopleProfile(peopleId: string) {
    await axios.delete(this.url(`/people/profile/${peopleId}`), {
      headers: this.headers()
    });
  }

  async getPeopleData(peopleId: string) {
    let response = await axios.get(this.url(`/people/data/${peopleId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updatePeopleData(peopleId: string, data: Record<string, any>) {
    let response = await axios.patch(
      this.url(`/people/data/${peopleId}`),
      { data },
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async listPeopleConversations(peopleId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/people/conversations/${peopleId}/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async addPeopleEvent(
    peopleId: string,
    event: { text: string; data?: Record<string, any>; color?: string }
  ) {
    let response = await axios.post(this.url(`/people/events/${peopleId}`), event, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async listPeopleEvents(peopleId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/people/events/${peopleId}/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getPeopleSubscriptionStatus(peopleId: string) {
    let response = await axios.get(this.url(`/people/subscription/${peopleId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updatePeopleSubscriptionStatus(peopleId: string, subscription: { email?: boolean }) {
    let response = await axios.patch(
      this.url(`/people/subscription/${peopleId}`),
      subscription,
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async getPeopleStatistics() {
    let response = await axios.get(this.url('/people/stats'), {
      headers: this.headers()
    });
    return response.data.data;
  }

  // ── Helpdesk ──

  async listHelpdeskLocales() {
    let response = await axios.get(this.url('/helpdesk/locales'), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async listHelpdeskArticles(localeId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/helpdesk/locale/${localeId}/articles/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async createHelpdeskArticle(
    localeId: string,
    article: {
      title: string;
      description?: string;
      content?: string;
      featured?: boolean;
      order?: number;
      category?: string;
    }
  ) {
    let response = await axios.post(
      this.url(`/helpdesk/locale/${localeId}/article`),
      article,
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async getHelpdeskArticle(localeId: string, articleId: string) {
    let response = await axios.get(
      this.url(`/helpdesk/locale/${localeId}/article/${articleId}`),
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async updateHelpdeskArticle(
    localeId: string,
    articleId: string,
    article: {
      title?: string;
      description?: string;
      content?: string;
      featured?: boolean;
      order?: number;
      category?: string;
    }
  ) {
    let response = await axios.patch(
      this.url(`/helpdesk/locale/${localeId}/article/${articleId}`),
      article,
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async deleteHelpdeskArticle(localeId: string, articleId: string) {
    await axios.delete(this.url(`/helpdesk/locale/${localeId}/article/${articleId}`), {
      headers: this.headers()
    });
  }

  // ── Campaigns ──

  async listCampaigns(pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/campaigns/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getCampaign(campaignId: string) {
    let response = await axios.get(this.url(`/campaign/${campaignId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async createCampaign(campaign: {
    type?: string;
    name?: string;
    message?: Record<string, any>;
  }) {
    let response = await axios.post(this.url('/campaign'), campaign, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updateCampaign(
    campaignId: string,
    campaign: {
      name?: string;
      message?: Record<string, any>;
    }
  ) {
    let response = await axios.patch(this.url(`/campaign/${campaignId}`), campaign, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async deleteCampaign(campaignId: string) {
    await axios.delete(this.url(`/campaign/${campaignId}`), {
      headers: this.headers()
    });
  }

  async dispatchCampaign(campaignId: string) {
    let response = await axios.post(
      this.url(`/campaign/${campaignId}/dispatch`),
      {},
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  // ── Operators ──

  async listOperators() {
    let response = await axios.get(this.url('/operators/list'), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getOperator(userId: string) {
    let response = await axios.get(this.url(`/operator/${userId}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async inviteOperator(email: string, role?: string) {
    let body: Record<string, string> = { email };
    if (role) body.role = role;
    let response = await axios.post(this.url('/operator'), body, {
      headers: this.headers()
    });
    return response.data.data;
  }

  async changeOperatorMembership(userId: string, role: string) {
    let response = await axios.patch(
      this.url(`/operator/${userId}`),
      { role },
      {
        headers: this.headers()
      }
    );
    return response.data.data;
  }

  async unlinkOperator(userId: string) {
    await axios.delete(this.url(`/operator/${userId}`), {
      headers: this.headers()
    });
  }

  // ── Website ──

  async getWebsite() {
    let response = await axios.get(this.url(''), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async getWebsiteSettings() {
    let response = await axios.get(this.url('/settings'), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async updateWebsiteSettings(settings: Record<string, any>) {
    let response = await axios.patch(this.url('/settings'), settings, {
      headers: this.headers()
    });
    return response.data.data;
  }

  // ── Availability ──

  async getWebsiteAvailability() {
    let response = await axios.get(this.url('/availability/status'), {
      headers: this.headers()
    });
    return response.data.data;
  }

  // ── Batch Operations ──

  async batchResolveConversations(sessionIds: string[]) {
    await axios.patch(
      this.url('/batch/resolve'),
      { sessions: sessionIds },
      {
        headers: this.headers()
      }
    );
  }

  async batchReadConversations(sessionIds: string[]) {
    await axios.patch(
      this.url('/batch/read'),
      { sessions: sessionIds },
      {
        headers: this.headers()
      }
    );
  }

  async batchRemoveConversations(sessionIds: string[]) {
    await axios.patch(
      this.url('/batch/remove'),
      { sessions: sessionIds },
      {
        headers: this.headers()
      }
    );
  }

  // ── Conversation Participants ──

  async getConversationParticipants(sessionId: string) {
    let response = await axios.get(this.url(`/conversation/${sessionId}/participants`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async saveConversationParticipants(
    sessionId: string,
    participants: { type: string; target: string }[]
  ) {
    await axios.put(
      this.url(`/conversation/${sessionId}/participants`),
      { participants },
      {
        headers: this.headers()
      }
    );
  }

  // ── Conversation Pages / Events / Files ──

  async listConversationPages(sessionId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/conversation/${sessionId}/pages/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async listConversationEvents(sessionId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/conversation/${sessionId}/events/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  async listConversationFiles(sessionId: string, pageNumber?: number) {
    let page = pageNumber ?? 1;
    let response = await axios.get(this.url(`/conversation/${sessionId}/files/${page}`), {
      headers: this.headers()
    });
    return response.data.data;
  }

  // ── Transcript ──

  async requestTranscript(sessionId: string, to: string, email?: string) {
    await axios.post(
      this.url(`/conversation/${sessionId}/transcript`),
      { to, email },
      {
        headers: this.headers()
      }
    );
  }
}
