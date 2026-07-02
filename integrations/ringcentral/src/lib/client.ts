import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(params: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: params.baseUrl,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // === SMS / MMS ===

  async sendSms(
    from: string,
    to: string[],
    text: string,
    _attachments?: { fileName: string; contentType: string; content: string }[]
  ) {
    let body: any = {
      from: { phoneNumber: from },
      to: to.map(num => ({ phoneNumber: num })),
      text
    };

    let response = await this.http.post('/restapi/v1.0/account/~/extension/~/sms', body);
    return response.data;
  }

  async sendA2pSms(from: string, to: string[], text: string) {
    let body = {
      from: from,
      text: text,
      messages: to.map(num => ({ to: [num] }))
    };

    let response = await this.http.post('/restapi/v1.0/account/~/a2p-sms/batch', body);
    return response.data;
  }

  async getA2pBatchStatus(batchId: string) {
    let response = await this.http.get(`/restapi/v1.0/account/~/a2p-sms/batch/${batchId}`);
    return response.data;
  }

  // === Fax ===

  async sendFax(
    to: string[],
    faxResolution?: string,
    coverPageText?: string,
    attachmentContentType?: string,
    attachmentBase64?: string
  ) {
    let boundary = `---RingCentralFaxBoundary${Date.now()}`;
    let parts: string[] = [];

    let jsonBody: any = {
      to: to.map(num => ({ phoneNumber: num }))
    };
    if (faxResolution) jsonBody.faxResolution = faxResolution;
    if (coverPageText) jsonBody.coverPageText = coverPageText;

    parts.push(
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(jsonBody)}`
    );

    if (attachmentBase64 && attachmentContentType) {
      parts.push(
        `--${boundary}\r\n` +
          `Content-Type: ${attachmentContentType}\r\n` +
          `Content-Transfer-Encoding: base64\r\n\r\n` +
          attachmentBase64
      );
    }

    parts.push(`--${boundary}--`);

    let response = await this.http.post(
      '/restapi/v1.0/account/~/extension/~/fax',
      parts.join('\r\n'),
      {
        headers: {
          'Content-Type': `multipart/mixed; boundary=${boundary}`
        }
      }
    );
    return response.data;
  }

  // === Voice Calls (RingOut) ===

  async makeRingOutCall(from: string, to: string, callerId?: string, playPrompt?: boolean) {
    let body: any = {
      from: { phoneNumber: from },
      to: { phoneNumber: to }
    };
    if (callerId) body.callerId = { phoneNumber: callerId };
    if (playPrompt !== undefined) body.playPrompt = playPrompt;

    let response = await this.http.post('/restapi/v1.0/account/~/extension/~/ring-out', body);
    return response.data;
  }

  async getRingOutStatus(ringOutId: string) {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/~/ring-out/${ringOutId}`
    );
    return response.data;
  }

  async cancelRingOut(ringOutId: string) {
    await this.http.delete(`/restapi/v1.0/account/~/extension/~/ring-out/${ringOutId}`);
  }

  // === Call Control ===

  async getActiveCalls(extensionId: string = '~') {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/active-calls`
    );
    return response.data;
  }

  async holdCall(telephonySessionId: string, partyId: string) {
    let response = await this.http.post(
      `/restapi/v1.0/account/~/telephony/sessions/${telephonySessionId}/parties/${partyId}/hold`
    );
    return response.data;
  }

  async unholdCall(telephonySessionId: string, partyId: string) {
    let response = await this.http.post(
      `/restapi/v1.0/account/~/telephony/sessions/${telephonySessionId}/parties/${partyId}/unhold`
    );
    return response.data;
  }

  async transferCall(telephonySessionId: string, partyId: string, toNumber: string) {
    let response = await this.http.post(
      `/restapi/v1.0/account/~/telephony/sessions/${telephonySessionId}/parties/${partyId}/transfer`,
      { phoneNumber: toNumber }
    );
    return response.data;
  }

  async forwardCall(telephonySessionId: string, partyId: string, toNumber: string) {
    let response = await this.http.post(
      `/restapi/v1.0/account/~/telephony/sessions/${telephonySessionId}/parties/${partyId}/forward`,
      { phoneNumber: toNumber }
    );
    return response.data;
  }

  // === Call Logs ===

  async getCallLog(params: {
    extensionId?: string;
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    direction?: string;
    view?: string;
    perPage?: number;
    page?: number;
  }) {
    let { extensionId = '~', ...queryParams } = params;
    let query = new URLSearchParams();
    if (queryParams.dateFrom) query.set('dateFrom', queryParams.dateFrom);
    if (queryParams.dateTo) query.set('dateTo', queryParams.dateTo);
    if (queryParams.type) query.set('type', queryParams.type);
    if (queryParams.direction) query.set('direction', queryParams.direction);
    if (queryParams.view) query.set('view', queryParams.view);
    if (queryParams.perPage) query.set('perPage', String(queryParams.perPage));
    if (queryParams.page) query.set('page', String(queryParams.page));

    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/call-log?${query.toString()}`
    );
    return response.data;
  }

  async getAccountCallLog(params: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    direction?: string;
    view?: string;
    perPage?: number;
    page?: number;
  }) {
    let query = new URLSearchParams();
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.type) query.set('type', params.type);
    if (params.direction) query.set('direction', params.direction);
    if (params.view) query.set('view', params.view);
    if (params.perPage) query.set('perPage', String(params.perPage));
    if (params.page) query.set('page', String(params.page));

    let response = await this.http.get(`/restapi/v1.0/account/~/call-log?${query.toString()}`);
    return response.data;
  }

  // === Team Messaging ===

  async postTeamMessage(chatId: string, text: string, attachments?: any[]) {
    let body: any = { text };
    if (attachments) body.attachments = attachments;

    let response = await this.http.post(`/restapi/v1.0/glip/chats/${chatId}/posts`, body);
    return response.data;
  }

  async listTeamChats(params?: { type?: string; perPage?: number; pageToken?: string }) {
    let query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.perPage) query.set('perPage', String(params.perPage));
    if (params?.pageToken) query.set('pageToken', params.pageToken);

    let response = await this.http.get(`/restapi/v1.0/glip/chats?${query.toString()}`);
    return response.data;
  }

  async getTeamChat(chatId: string) {
    let response = await this.http.get(`/restapi/v1.0/glip/chats/${chatId}`);
    return response.data;
  }

  async createTeam(name: string, description?: string, memberIds?: string[]) {
    let body: any = { name };
    if (description) body.description = description;
    if (memberIds) body.members = memberIds.map(id => ({ id }));

    let response = await this.http.post('/restapi/v1.0/glip/teams', body);
    return response.data;
  }

  // === Video Meetings ===

  async createMeeting(params: {
    topic?: string;
    meetingType?: string;
    schedule?: { startTime: string; durationInMinutes?: number };
    password?: string;
    allowJoinBeforeHost?: boolean;
  }) {
    let response = await this.http.post('/restapi/v1.0/account/~/extension/~/meeting', params);
    return response.data;
  }

  async getMeeting(meetingId: string) {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/~/meeting/${meetingId}`
    );
    return response.data;
  }

  async updateMeeting(meetingId: string, params: any) {
    let response = await this.http.put(
      `/restapi/v1.0/account/~/extension/~/meeting/${meetingId}`,
      params
    );
    return response.data;
  }

  async deleteMeeting(meetingId: string) {
    await this.http.delete(`/restapi/v1.0/account/~/extension/~/meeting/${meetingId}`);
  }

  async listMeetings() {
    let response = await this.http.get('/restapi/v1.0/account/~/extension/~/meeting');
    return response.data;
  }

  // === Messages ===

  async getMessageList(params?: {
    extensionId?: string;
    messageType?: string;
    direction?: string;
    dateFrom?: string;
    dateTo?: string;
    perPage?: number;
    page?: number;
  }) {
    let extensionId = params?.extensionId || '~';
    let query = new URLSearchParams();
    if (params?.messageType) query.set('messageType', params.messageType);
    if (params?.direction) query.set('direction', params.direction);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.perPage) query.set('perPage', String(params.perPage));
    if (params?.page) query.set('page', String(params.page));

    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/message-store?${query.toString()}`
    );
    return response.data;
  }

  async getMessage(messageId: string, extensionId: string = '~') {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/message-store/${messageId}`
    );
    return response.data;
  }

  async deleteMessage(messageId: string, extensionId: string = '~') {
    await this.http.delete(
      `/restapi/v1.0/account/~/extension/${extensionId}/message-store/${messageId}`
    );
  }

  async updateMessage(messageId: string, readStatus: string, extensionId: string = '~') {
    let response = await this.http.put(
      `/restapi/v1.0/account/~/extension/${extensionId}/message-store/${messageId}`,
      {
        readStatus
      }
    );
    return response.data;
  }

  // === User / Extension ===

  async getExtensionInfo(extensionId: string = '~') {
    let response = await this.http.get(`/restapi/v1.0/account/~/extension/${extensionId}`);
    return response.data;
  }

  async listExtensions(params?: {
    type?: string;
    status?: string;
    perPage?: number;
    page?: number;
  }) {
    let query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.perPage) query.set('perPage', String(params.perPage));
    if (params?.page) query.set('page', String(params.page));

    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension?${query.toString()}`
    );
    return response.data;
  }

  async updateExtension(extensionId: string, params: any) {
    let response = await this.http.put(
      `/restapi/v1.0/account/~/extension/${extensionId}`,
      params
    );
    return response.data;
  }

  // === Presence ===

  async getPresence(extensionId: string = '~') {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/presence`
    );
    return response.data;
  }

  async updatePresence(
    extensionId: string,
    params: { dndStatus?: string; userStatus?: string }
  ) {
    let response = await this.http.put(
      `/restapi/v1.0/account/~/extension/${extensionId}/presence`,
      params
    );
    return response.data;
  }

  // === Phone Numbers ===

  async listPhoneNumbers(extensionId: string = '~') {
    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/phone-number`
    );
    return response.data;
  }

  // === Address Book / Contacts ===

  async listContacts(extensionId: string = '~', params?: { perPage?: number; page?: number }) {
    let query = new URLSearchParams();
    if (params?.perPage) query.set('perPage', String(params.perPage));
    if (params?.page) query.set('page', String(params.page));

    let response = await this.http.get(
      `/restapi/v1.0/account/~/extension/${extensionId}/address-book/contact?${query.toString()}`
    );
    return response.data;
  }

  async createContact(extensionId: string, contact: any) {
    let response = await this.http.post(
      `/restapi/v1.0/account/~/extension/${extensionId}/address-book/contact`,
      contact
    );
    return response.data;
  }

  async updateContact(contactId: string, contact: any, extensionId: string = '~') {
    let response = await this.http.put(
      `/restapi/v1.0/account/~/extension/${extensionId}/address-book/contact/${contactId}`,
      contact
    );
    return response.data;
  }

  async deleteContact(contactId: string, extensionId: string = '~') {
    await this.http.delete(
      `/restapi/v1.0/account/~/extension/${extensionId}/address-book/contact/${contactId}`
    );
  }

  // === Subscriptions (for webhooks) ===

  async createSubscription(
    eventFilters: string[],
    deliveryAddress: string,
    expiresIn?: number
  ) {
    let body: any = {
      eventFilters,
      deliveryMode: {
        transportType: 'WebHook',
        address: deliveryAddress
      }
    };
    if (expiresIn) body.expiresIn = expiresIn;

    let response = await this.http.post('/restapi/v1.0/subscription', body);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string) {
    await this.http.delete(`/restapi/v1.0/subscription/${subscriptionId}`);
  }

  async getSubscription(subscriptionId: string) {
    let response = await this.http.get(`/restapi/v1.0/subscription/${subscriptionId}`);
    return response.data;
  }

  async renewSubscription(subscriptionId: string, expiresIn?: number) {
    let body: any = {};
    if (expiresIn) body.expiresIn = expiresIn;
    let response = await this.http.post(
      `/restapi/v1.0/subscription/${subscriptionId}/renew`,
      body
    );
    return response.data;
  }

  // === Account Info ===

  async getAccountInfo() {
    let response = await this.http.get('/restapi/v1.0/account/~');
    return response.data;
  }

  // === Company Directory ===

  async searchDirectory(params?: { searchString?: string; perPage?: number; page?: number }) {
    let query = new URLSearchParams();
    if (params?.searchString) query.set('searchString', params.searchString);
    if (params?.perPage) query.set('perPage', String(params.perPage));
    if (params?.page) query.set('page', String(params.page));

    let response = await this.http.get(
      `/restapi/v1.0/account/~/directory/entries?${query.toString()}`
    );
    return response.data;
  }
}
