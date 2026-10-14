import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

export type MessageResult = {
  locator?: string;
  status: string;
  requestId?: string;
  message?: string;
};
export type PreparedRecipient = {
  contactId?: number;
  externalCustomerId?: string;
  locator?: string;
  jsonParam?: string;
  languageCode?: string;
  email?: boolean;
  fromName?: string;
  externalRequestId?: string;
};
export type SegmentContact = { contactId?: number; externalCustomerId?: string };

export let getMessageResults = (response: { results?: MessageResult | MessageResult[] }) =>
  Array.isArray(response.results)
    ? response.results
    : response.results
      ? [response.results]
      : [];
export let getGroupNames = (groups?: Array<string | { name?: string }>) =>
  groups?.flatMap(group =>
    typeof group === 'string' ? [group] : group.name ? [group.name] : []
  );

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://esputnik.com/api',
      auth: { username: 'x', password: config.token },
      contentType: 'application/json; charset=UTF-8',
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'eSputnik',
          reason: 'esputnik_api_error',
          extractResponse: (failure, helpers) => {
            let response = helpers.getResponse(failure);
            if (
              isApiErrorRecord(failure) &&
              isApiErrorRecord(failure.data) &&
              isApiErrorRecord(failure.data.baggage)
            ) {
              return { ...response, data: failure.data.baggage.response };
            }
            return response;
          },
          extractUpstreamCode: (failure, response) => {
            if (
              isApiErrorRecord(failure) &&
              isApiErrorRecord(failure.data) &&
              isApiErrorRecord(failure.data.upstream) &&
              typeof failure.data.upstream.code === 'string'
            ) {
              return failure.data.upstream.code;
            }
            return isApiErrorRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined;
          }
        })
    });
  }

  async getAccountInfo(): Promise<any> {
    return (await this.axios.get('/v1/account/info')).data;
  }
  async getBalance(): Promise<any> {
    return (await this.axios.get('/v1/balance')).data;
  }
  async addOrUpdateContact(contact: Record<string, unknown>): Promise<any> {
    return (await this.axios.post('/v1/contact', contact)).data;
  }
  async updateContact(contactId: number, contact: Record<string, unknown>): Promise<any> {
    return (await this.axios.put(`/v1/contact/${contactId}`, contact)).data;
  }
  async getContact(contactId: number): Promise<any> {
    return (await this.axios.get(`/v1/contact/${contactId}`)).data;
  }
  async searchContacts(params: Record<string, unknown>): Promise<any[]> {
    return (await this.axios.get('/v1/contacts', { params })).data;
  }
  async deleteContact(contactId: number, erase?: boolean): Promise<void> {
    await this.axios.delete(`/v1/contact/${contactId}`, { params: { erase } });
  }
  async deleteContactByExternalId(externalCustomerId: string, erase?: boolean): Promise<void> {
    await this.axios.delete('/v1/contact', { params: { externalCustomerId, erase } });
  }
  async bulkAddOrUpdateContacts(payload: Record<string, unknown>): Promise<any> {
    return (await this.axios.post('/v1/contacts', payload)).data;
  }
  async subscribeContact(payload: Record<string, unknown>): Promise<any> {
    return (await this.axios.post('/v1/contact/subscribe', payload)).data;
  }
  async getContactImportStatus(sessionId: string): Promise<any> {
    return (await this.axios.get(`/v1/importstatus/${encodeURIComponent(sessionId)}`)).data;
  }
  async getAdditionalFields(): Promise<any> {
    return (await this.axios.get('/v1/additionalfields')).data;
  }
  async addUnsubscribedEmails(emails: string[]): Promise<void> {
    await this.axios.post('/v1/emails/unsubscribed/add', { emails });
  }
  async removeUnsubscribedEmails(emails: string[]): Promise<void> {
    await this.axios.post('/v1/emails/unsubscribed/delete', { emails });
  }
  async getSegments(params: Record<string, unknown> = {}): Promise<any[]> {
    return (await this.axios.get('/v1/groups', { params })).data;
  }
  async getSegmentContacts(
    segmentId: number,
    params: Record<string, unknown> = {}
  ): Promise<any[]> {
    return (await this.axios.get(`/v1/group/${segmentId}/contacts`, { params })).data;
  }
  async attachContactsToSegment(segmentId: number, contacts: SegmentContact[]): Promise<void> {
    await this.modifySegment(segmentId, 'attach', contacts);
  }
  async detachContactsFromSegment(
    segmentId: number,
    contacts: SegmentContact[]
  ): Promise<void> {
    await this.modifySegment(segmentId, 'detach', contacts);
  }
  private async modifySegment(
    segmentId: number,
    action: 'attach' | 'detach',
    contacts: SegmentContact[]
  ) {
    let contactIds = contacts.flatMap(contact =>
      contact.contactId !== undefined ? [contact.contactId] : []
    );
    let externalCustomerIds = contacts.flatMap(contact =>
      contact.contactId === undefined && contact.externalCustomerId
        ? [contact.externalCustomerId]
        : []
    );
    if (contactIds.length) {
      await this.axios.post(`/v1/group/${segmentId}/contacts/${action}`, { contactIds });
    }
    if (externalCustomerIds.length) {
      await this.axios.post(`/v1/group/${segmentId}/contacts/${action}`, {
        externalCustomerIds
      });
    }
  }
  async sendEmail(
    payload: Record<string, unknown>
  ): Promise<{ results?: MessageResult | MessageResult[] }> {
    return (await this.axios.post('/v1/message/email', payload)).data;
  }
  async sendSms(
    payload: Record<string, unknown>
  ): Promise<{ results?: MessageResult | MessageResult[] }> {
    return (await this.axios.post('/v1/message/sms', payload)).data;
  }
  async smartSend(
    messageId: number,
    recipients: PreparedRecipient[]
  ): Promise<{ results: MessageResult[] }> {
    let groups = new Map<
      string,
      {
        email?: boolean;
        fromName?: string;
        recipients: Omit<PreparedRecipient, 'email' | 'fromName'>[];
        indices: number[];
      }
    >();
    for (let [index, { email, fromName, ...recipient }] of recipients.entries()) {
      let key = JSON.stringify([email, fromName]);
      let group = groups.get(key) ?? { email, fromName, recipients: [], indices: [] };
      group.recipients.push(recipient);
      group.indices.push(index);
      groups.set(key, group);
    }
    let orderedResults: MessageResult[] = [];
    for (let { indices, ...payload } of groups.values()) {
      let response = await this.axios.post(`/v1/message/${messageId}/smartsend`, payload);
      for (let [index, result] of getMessageResults(response.data).entries()) {
        orderedResults[indices[index] ?? orderedResults.length] = result;
      }
    }
    return { results: orderedResults.filter(Boolean) };
  }
  async getMessageStatus(ids: string[]): Promise<any> {
    return (await this.axios.get('/v1/message/status', { params: { ids: ids.join(',') } }))
      .data;
  }
  async generateEvent(payload: {
    eventTypeKey: string;
    keyValue?: string;
    params: Record<string, unknown>;
  }): Promise<any> {
    return (await this.axios.post('/v3/event', payload)).data;
  }
  async addOrders(orders: Record<string, unknown>[]): Promise<any> {
    return (await this.axios.post('/v1/orders', { orders })).data;
  }
  async deleteOrders(orderIds: string[]): Promise<void> {
    for (let externalOrderId of orderIds) {
      await this.axios.delete('/v1/orders', { params: { externalOrderId } });
    }
  }
  async getContactActivity(params: Record<string, unknown>): Promise<any> {
    return (await this.axios.get('/v2/contacts/activity', { params })).data;
  }
}
