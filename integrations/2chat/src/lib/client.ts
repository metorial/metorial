import { createAxios } from 'slates';

export class TwoChatClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.p.2chat.io/open',
      headers: {
        'X-User-API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── WhatsApp Numbers ────────────────────────────────────────────

  async listWhatsAppNumbers(): Promise<any> {
    let response = await this.axios.get('/whatsapp/get-numbers');
    return response.data;
  }

  async getWhatsAppNumber(phoneNumber: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/get-number/${encodeURIComponent(phoneNumber)}`
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
    let response = await this.axios.post('/whatsapp/send-group-message', {
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
    let response = await this.axios.post('/whatsapp/send-group-message', {
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
    let query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.remoteNumber) query.set('remote_number', params.remoteNumber);
    let qs = query.toString();
    let response = await this.axios.get(
      `/whatsapp/messages/${encodeURIComponent(phoneNumber)}${qs ? `?${qs}` : ''}`
    );
    return response.data;
  }

  async getSingleMessage(phoneNumber: string, messageUuid: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/messages/${encodeURIComponent(phoneNumber)}/message/${encodeURIComponent(messageUuid)}`
    );
    return response.data;
  }

  async deleteMessage(phoneNumber: string, messageUuid: string): Promise<any> {
    let response = await this.axios.delete(
      `/whatsapp/messages/${encodeURIComponent(phoneNumber)}/message/${encodeURIComponent(messageUuid)}`
    );
    return response.data;
  }

  async listConversations(
    phoneNumber: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    let qs = query.toString();
    let response = await this.axios.get(
      `/whatsapp/conversations/${encodeURIComponent(phoneNumber)}${qs ? `?${qs}` : ''}`
    );
    return response.data;
  }

  async getGroupMessages(
    phoneNumber: string,
    groupUuid: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    let qs = query.toString();
    let response = await this.axios.get(
      `/whatsapp/messages/${encodeURIComponent(phoneNumber)}/group/${encodeURIComponent(groupUuid)}${qs ? `?${qs}` : ''}`
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
    let response = await this.axios.get(
      `/whatsapp/groups/${encodeURIComponent(phoneNumber)}/get-groups`
    );
    return response.data;
  }

  async createGroup(params: {
    fromNumber: string;
    groupName: string;
    participants: string[];
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/create-group', {
      from_number: params.fromNumber,
      group_name: params.groupName,
      participants: params.participants
    });
    return response.data;
  }

  async listGroupParticipants(phoneNumber: string, groupUuid: string): Promise<any> {
    let response = await this.axios.get(
      `/whatsapp/groups/${encodeURIComponent(phoneNumber)}/${encodeURIComponent(groupUuid)}/get-participants`
    );
    return response.data;
  }

  async addGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/add-participant', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      phone_number: params.phoneNumber
    });
    return response.data;
  }

  async removeGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/remove-participant', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      phone_number: params.phoneNumber
    });
    return response.data;
  }

  async promoteGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/promote-participant', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      phone_number: params.phoneNumber
    });
    return response.data;
  }

  async demoteGroupParticipant(params: {
    fromNumber: string;
    groupUuid: string;
    phoneNumber: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/demote-participant', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      phone_number: params.phoneNumber
    });
    return response.data;
  }

  async setGroupDescription(params: {
    fromNumber: string;
    groupUuid: string;
    description: string;
  }): Promise<any> {
    let response = await this.axios.post('/whatsapp/groups/set-description', {
      from_number: params.fromNumber,
      to_group_uuid: params.groupUuid,
      description: params.description
    });
    return response.data;
  }

  // ── Contacts ────────────────────────────────────────────────────

  async createContact(params: {
    firstName: string;
    lastName?: string;
    details: Array<{
      type: string;
      value: string;
      label?: string;
    }>;
  }): Promise<any> {
    let response = await this.axios.post('/contacts/create', {
      first_name: params.firstName,
      last_name: params.lastName,
      details: params.details.map(d => ({
        type: d.type,
        value: d.value,
        label: d.label
      }))
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
