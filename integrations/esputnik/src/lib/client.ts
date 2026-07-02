import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    let basicToken = Buffer.from(`x:${config.token}`).toString('base64');

    this.axios = createAxios({
      baseURL: 'https://api.yespo.io/api',
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        Accept: 'application/json'
      }
    });
  }

  // ── Account ──────────────────────────────────────────────

  async getAccountInfo(): Promise<any> {
    let response = await this.axios.get('/v1/account/info');
    return response.data;
  }

  async getBalance(): Promise<any> {
    let response = await this.axios.get('/v1/balance');
    return response.data;
  }

  // ── Contacts ─────────────────────────────────────────────

  async addOrUpdateContact(contact: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v1/contact', contact);
    return response.data;
  }

  async updateContact(contactId: number, contact: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/v1/contact/${contactId}`, contact);
    return response.data;
  }

  async getContact(contactId: number): Promise<any> {
    let response = await this.axios.get(`/v1/contact/${contactId}`);
    return response.data;
  }

  async searchContacts(params: Record<string, any>): Promise<any[]> {
    let response = await this.axios.get('/v1/contacts', { params });
    return response.data;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.axios.delete(`/v1/contact/${contactId}`);
  }

  async deleteContactByExternalId(externalCustomerId: string): Promise<void> {
    await this.axios.delete('/v1/contact', {
      params: { externalCustomerId }
    });
  }

  async bulkAddOrUpdateContacts(payload: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v1/contacts', payload);
    return response.data;
  }

  async subscribeContact(payload: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v1/contact/subscribe', payload);
    return response.data;
  }

  // ── Unsubscribe ──────────────────────────────────────────

  async addUnsubscribedEmails(emails: string[]): Promise<void> {
    await this.axios.post('/v1/emails/unsubscribed', { emails });
  }

  async removeUnsubscribedEmails(emails: string[]): Promise<void> {
    await this.axios.post('/v1/emails/unsubscribed/delete', { emails });
  }

  // ── Segments ─────────────────────────────────────────────

  async getSegments(): Promise<any[]> {
    let response = await this.axios.get('/v1/groups');
    return response.data;
  }

  async getSegmentContacts(segmentId: number): Promise<any[]> {
    let response = await this.axios.get(`/v1/group/${segmentId}/contacts`);
    return response.data;
  }

  async attachContactsToSegment(
    segmentId: number,
    contacts: Array<{ contactId?: number; externalCustomerId?: string }>
  ): Promise<void> {
    await this.axios.post(`/v1/group/${segmentId}/contacts/attach`, contacts);
  }

  async detachContactsFromSegment(
    segmentId: number,
    contacts: Array<{ contactId?: number; externalCustomerId?: string }>
  ): Promise<void> {
    await this.axios.post(`/v1/group/${segmentId}/contacts/detach`, contacts);
  }

  // ── Messaging ────────────────────────────────────────────

  async sendEmail(payload: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v1/message/email', payload);
    return response.data;
  }

  async sendSms(payload: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/v1/message/sms', payload);
    return response.data;
  }

  async smartSend(messageId: number, recipients: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post(`/v1/message/${messageId}/smartsend`, { recipients });
    return response.data;
  }

  async getMessageStatus(ids: string[]): Promise<any> {
    let response = await this.axios.get('/v1/message/status', {
      params: { ids: ids.join(',') }
    });
    return response.data;
  }

  // ── Events ───────────────────────────────────────────────

  async generateEvent(payload: {
    eventTypeKey: string;
    keyValue?: string;
    params: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/v3/event', payload);
    return response.data;
  }

  // ── Orders ───────────────────────────────────────────────

  async addOrders(orders: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post('/v1/orders', { orders });
    return response.data;
  }

  async deleteOrders(orderIds: string[]): Promise<void> {
    await this.axios.delete('/v1/orders', {
      data: { externalOrderIds: orderIds }
    });
  }

  // ── Promotional Codes ────────────────────────────────────

  async getPromoCodes(promoCodeId: number): Promise<any> {
    let response = await this.axios.get(`/v1/promocodes/${promoCodeId}`);
    return response.data;
  }

  async uploadPromoCodes(promoCodeId: number, codes: string[]): Promise<any> {
    let response = await this.axios.post(`/v1/promocodes/${promoCodeId}`, {
      promoCodes: codes
    });
    return response.data;
  }

  // ── Contact Activity ─────────────────────────────────────

  async getContactActivity(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/v1/contacts/activity', { params });
    return response.data;
  }
}
