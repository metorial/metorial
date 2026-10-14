import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage
} from 'slates';

export class TwoChatClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.p.2chat.io/open',
      authHeader: { name: 'X-User-API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: '2Chat',
          reason: '2chat_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.success === false) {
        throw createApiServiceError(
          extractApiErrorMessage(
            { response: { data: response.data } },
            { fallbackMessage: '2Chat rejected the request.' }
          ),
          { reason: '2chat_api_error' }
        );
      }
      return response;
    });
  }

  async getAccountInfo(): Promise<any> {
    return (await this.axios.get('/info')).data;
  }

  // ── WhatsApp Numbers ────────────────────────────────────────────

  async listWhatsAppNumbers(params?: {
    page?: number;
    resultsPerPage?: number;
    status?: string;
  }): Promise<any> {
    let response = await this.axios.get('/whatsapp/get-numbers', {
      params: {
        page_number: params?.page ?? 0,
        results_per_page: params?.resultsPerPage ?? 50,
        status: params?.status
      }
    });
    return response.data;
  }

  async getWhatsAppNumber(channelUuid: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/channel/${encodeURIComponent(channelUuid)}`
    );
    return response.data;
  }

  async getChannelStatus(phoneNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/channel/${encodeURIComponent(phoneNumber)}/status`
    );
    return response.data;
  }

  // ── WhatsApp Messaging ──────────────────────────────────────────

  async sendTextMessage(params: {
    fromNumber: string;
    toNumber: string;
    text: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/send-message', {
      from_number: params.fromNumber,
      to_number: params.toNumber,
      text: params.text
    });
    return response.data;
  }

  async sendMediaMessage(params: {
    fromNumber: string;
    toNumber: string;
    url: string;
    text?: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/send-message', {
      from_number: params.fromNumber,
      to_number: params.toNumber,
      url: params.url,
      text: params.text
    });
    return response.data;
  }

  async sendGroupTextMessage(params: {
    fromNumber: string;
    groupUuid: string;
    text: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/send-message', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      text: params.text
    });
    return response.data;
  }

  async sendGroupMediaMessage(params: {
    fromNumber: string;
    groupUuid: string;
    url: string;
    text?: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/send-message', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      url: params.url,
      text: params.text
    });
    return response.data;
  }

  // ── WhatsApp Messages Retrieval ─────────────────────────────────

  async getMessages(
    phoneNumber: string,
    params?: {
      page?: number;
      remoteNumber?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/messages/${encodeURIComponent(phoneNumber)}${params?.remoteNumber ? `/${encodeURIComponent(params.remoteNumber)}` : ''}`,
      { params: { page_number: params?.page ?? 0 } }
    );
    return response.data;
  }

  private async resolveSessionKey(
    phoneNumber: string,
    messageUuid: string,
    sessionKey?: string
  ): Promise<string> {
    if (sessionKey?.trim()) return sessionKey;
    let result = await this.getMessages(phoneNumber);
    let message = result.messages?.find(
      (item: any) => (item.uuid ?? item.message_uuid) === messageUuid
    );
    if (typeof message?.session_key === 'string') return message.session_key;
    throw createApiServiceError(
      'Provide sessionKey from Get WhatsApp Messages for this message. Automatic lookup covers only the newest 100 messages.',
      { reason: 'missing_session_key' }
    );
  }

  async getSingleMessage(
    phoneNumber: string,
    messageUuid: string,
    sessionKey?: string
  ): Promise<any> {
    let key = await this.resolveSessionKey(phoneNumber, messageUuid, sessionKey);
    let response = await this.axios.get(
      `/whatsapp/message/${encodeURIComponent(key)}/${encodeURIComponent(messageUuid)}`
    );
    return response.data;
  }

  async deleteMessage(
    phoneNumber: string,
    messageUuid: string,
    sessionKey?: string
  ): Promise<any> {
    let key = await this.resolveSessionKey(phoneNumber, messageUuid, sessionKey);
    let response = await this.axios.delete(
      `/whatsapp/message/${encodeURIComponent(key)}/${encodeURIComponent(messageUuid)}`
    );
    return response.data;
  }

  async listConversations(phoneNumber: string, params?: { page?: number }): Promise<any> {
    let page = 0;
    let channelUuid: string | undefined;
    while (!channelUuid) {
      let result = await this.listWhatsAppNumbers({ page });
      let numbers = result.numbers ?? [];
      channelUuid = numbers.find(
        (item: any) =>
          item.phone_number?.replace(/[^0-9]/g, '') === phoneNumber.replace(/[^0-9]/g, '')
      )?.uuid;
      if (channelUuid || numbers.length < 50) break;
      page += 1;
    }
    if (!channelUuid)
      throw createApiServiceError(
        'The connected number was not found. Use List WhatsApp Numbers to select a connected number.',
        { reason: 'unknown_connected_number' }
      );
    let response = await this.axios.get(
      `/whatsapp/conversations/${encodeURIComponent(channelUuid)}`,
      { params: { page_number: params?.page ?? 0 } }
    );
    return response.data;
  }

  async getGroupMessages(
    _phoneNumber: string,
    groupUuid: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/groups/messages/${encodeURIComponent(groupUuid)}`,
      { params: { page_number: params?.page ?? 0 } }
    );
    return response.data;
  }

  // ── WhatsApp Number Verification ────────────────────────────────

  async checkNumber(fromNumber: string, toNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/check-number/${encodeURIComponent(fromNumber)}/${encodeURIComponent(toNumber)}`
    );
    return response.data;
  }

  // ── WhatsApp Groups ─────────────────────────────────────────────

  async listGroups(phoneNumber: string): Promise<any> {
    let response = await this.axios.get(`/whatsapp/groups/${encodeURIComponent(phoneNumber)}`);
    return response.data;
  }

  async createGroup(params: {
    fromNumber: string;
    groupName: string;
    participants: string[];
    description?: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/group/create', {
      from_number: params.fromNumber,
      group: {
        name: params.groupName,
        participants: params.participants,
        description: params.description
      }
    });
    return response.data;
  }

  async listGroupParticipants(_phoneNumber: string, groupUuid: string): Promise<any> {
    let response = await this.axios.get(`/whatsapp/group/${encodeURIComponent(groupUuid)}`);
    return response.data;
  }

  async addGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post(
      `/whatsapp/group/${encodeURIComponent(params.groupUuid)}/add-participant`,
      {
        from_number: params.fromNumber,
        participants: [params.phoneNumber]
      }
    );
    return response.data;
  }

  async removeGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post(
      `/whatsapp/group/${encodeURIComponent(params.groupUuid)}/remove-participant`,
      {
        from_number: params.fromNumber,
        participants: [params.phoneNumber]
      }
    );
    return response.data;
  }

  async promoteGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post(
      `/whatsapp/group/${encodeURIComponent(params.groupUuid)}/promote-participant`,
      {
        from_number: params.fromNumber,
        participants: [params.phoneNumber]
      }
    );
    return response.data;
  }

  async demoteGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post(
      `/whatsapp/group/${encodeURIComponent(params.groupUuid)}/demote-participant`,
      {
        from_number: params.fromNumber,
        participants: [params.phoneNumber]
      }
    );
    return response.data;
  }

  async setGroupDescription(params: {
    fromNumber: string;
    groupUuid: string;
    description: string;
  }): Promise<any> {
    let response = await this.axios.post(
      `/whatsapp/group/${encodeURIComponent(params.groupUuid)}/set-description`,
      {
        from_number: params.fromNumber,
        description: params.description
      }
    );
    return response.data;
  }

  // ── Contacts ────────────────────────────────────────────────────

  async createContact(params: {
    firstName: string;
    lastName?: string;
    channelUuid?: string;
    details: Array<{
      type: string;
      value: string;
      label?: string;
    }>;
  }): Promise<any> {
    let response = await this.axios.post('/contacts', {
      first_name: params.firstName,
      last_name: params.lastName,
      channel_uuid: params.channelUuid,
      contact_detail: params.details.map(d => ({
        type:
          (
            { phone: 'PH', email: 'E', address: 'A', whatsapp: 'WAPH' } as Record<
              string,
              string
            >
          )[d.type] ?? d.type,
        value: d.value
      }))
    });
    return response.data;
  }

  async listContacts(params: {
    page?: number;
    resultsPerPage?: number;
    channelUuid?: string;
  }): Promise<any> {
    let response = await this.axios.get('/contacts', {
      params: {
        page_number: params.page ?? 0,
        results_per_page: params.resultsPerPage ?? 50,
        channel_uuid: params.channelUuid
      }
    });
    return response.data;
  }

  async searchContacts(query: string): Promise<any> {
    let response = await this.axios.get(`/contacts/search?query=${encodeURIComponent(query)}`);
    return response.data;
  }

  // ── Webhooks ────────────────────────────────────────────────────

  async subscribeWebhook(params: {
    hookUrl: string;
    onNumber: string;
    event: string;
    toGroupUuid?: string;
    timePeriod?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      hook_url: params.hookUrl,
      on_number: params.onNumber,
      event: params.event
    };
    if (params.toGroupUuid) body.to_group_uuid = params.toGroupUuid;
    if (params.timePeriod) body.time_period = params.timePeriod;

    let response = await this.axios.post('/whatsapp/webhooks/subscribe', body);
    return response.data;
  }

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhooks/list-all');
    return response.data;
  }

  async deleteWebhook(webhookUuid: string): Promise<any> {
    let response = await this.axios.delete(
      `/webhooks/${encodeURIComponent(webhookUuid)}/delete`
    );
    return response.data;
  }

  // ── Phone Calls ─────────────────────────────────────────────────

  async listCallerIds(): Promise<any> {
    let response = await this.axios.get('/phone-calls/caller-ids');
    return response.data;
  }

  async subscribePhoneCallWebhook(params: {
    hookUrl: string;
    onNumber: string;
    event: string;
  }): Promise<any> {
    let response = await this.axios.post('/phone-calls/webhooks/subscribe', {
      hook_url: params.hookUrl,
      on_number: params.onNumber,
      event: params.event
    });
    return response.data;
  }
}
