import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://rest.clicksend.com/v3'
});

export class ClickSendClient {
  private authHeader: string;

  constructor(params: { username: string; token: string }) {
    this.authHeader = `Basic ${Buffer.from(`${params.username}:${params.token}`).toString('base64')}`;
  }

  private get headers() {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json'
    };
  }

  // ─── Account ───────────────────────────────────────────────

  async getAccount() {
    let response = await api.get('/account', { headers: this.headers });
    return response.data.data;
  }

  // ─── SMS ───────────────────────────────────────────────────

  async sendSms(
    messages: {
      to: string;
      body: string;
      from?: string;
      schedule?: number;
      customString?: string;
      country?: string;
      fromEmail?: string;
    }[]
  ) {
    let response = await api.post(
      '/sms/send',
      {
        messages: messages.map(msg => ({
          to: msg.to,
          body: msg.body,
          from: msg.from,
          schedule: msg.schedule,
          custom_string: msg.customString,
          country: msg.country,
          from_email: msg.fromEmail
        }))
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getSmsHistory(params?: {
    page?: number;
    limit?: number;
    dateFrom?: number;
    dateTo?: number;
  }) {
    let response = await api.get('/sms/history', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit,
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  async cancelScheduledSms(messageId: string) {
    let response = await api.put(`/sms/${messageId}/cancel`, {}, { headers: this.headers });
    return response.data;
  }

  async cancelAllScheduledSms() {
    let response = await api.put('/sms/cancel-all', {}, { headers: this.headers });
    return response.data;
  }

  // ─── MMS ───────────────────────────────────────────────────

  async sendMms(
    messages: {
      to: string;
      body: string;
      subject: string;
      mediaFileUrl: string;
      from?: string;
      schedule?: number;
      country?: string;
    }[]
  ) {
    let response = await api.post(
      '/mms/send',
      {
        media_file: messages[0]?.mediaFileUrl,
        messages: messages.map(msg => ({
          to: msg.to,
          body: msg.body,
          subject: msg.subject,
          from: msg.from,
          schedule: msg.schedule,
          country: msg.country
        }))
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Voice ─────────────────────────────────────────────────

  async sendVoice(
    messages: {
      to: string;
      body: string;
      voiceGender?: string;
      voiceLang?: string;
      schedule?: number;
      customString?: string;
      country?: string;
      from?: string;
      machineDetection?: number;
      requireInput?: number;
    }[]
  ) {
    let response = await api.post(
      '/voice/send',
      {
        messages: messages.map(msg => ({
          to: msg.to,
          body: msg.body,
          voice: msg.voiceGender || 'female',
          lang: msg.voiceLang || 'en-us',
          schedule: msg.schedule,
          custom_string: msg.customString,
          country: msg.country,
          from: msg.from,
          machine_detection: msg.machineDetection,
          require_input: msg.requireInput
        }))
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Email ─────────────────────────────────────────────────

  async sendEmail(params: {
    to: { email: string; name?: string }[];
    from: { emailAddressId: number; name?: string };
    subject: string;
    body: string;
    schedule?: number;
  }) {
    let response = await api.post(
      '/email/send',
      {
        to: params.to.map(t => ({
          email: t.email,
          name: t.name
        })),
        from: {
          email_address_id: params.from.emailAddressId,
          name: params.from.name
        },
        subject: params.subject,
        body: params.body,
        schedule: params.schedule
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getEmailHistory(params?: {
    page?: number;
    limit?: number;
    dateFrom?: number;
    dateTo?: number;
  }) {
    let response = await api.get('/email/history', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit,
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  async getAllowedEmailAddresses() {
    let response = await api.get('/email/addresses', { headers: this.headers });
    return response.data;
  }

  // ─── Post / Letters ────────────────────────────────────────

  async sendLetter(params: {
    fileUrl: string;
    recipients: {
      addressName: string;
      addressLine1: string;
      addressLine2?: string;
      addressCity: string;
      addressState: string;
      addressPostalCode: string;
      addressCountry: string;
      returnAddressId?: number;
      schedule?: number;
    }[];
    templateUsed?: number;
    colour?: number;
    duplex?: number;
    priorityPost?: number;
  }) {
    let response = await api.post(
      '/post/letters/send',
      {
        file_url: params.fileUrl,
        template_used: params.templateUsed || 0,
        colour: params.colour || 0,
        duplex: params.duplex || 0,
        priority_post: params.priorityPost || 0,
        recipients: params.recipients.map(r => ({
          address_name: r.addressName,
          address_line_1: r.addressLine1,
          address_line_2: r.addressLine2,
          address_city: r.addressCity,
          address_state: r.addressState,
          address_postal_code: r.addressPostalCode,
          address_country: r.addressCountry,
          return_address_id: r.returnAddressId,
          schedule: r.schedule
        }))
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getPostLetterHistory(params?: { page?: number; limit?: number }) {
    let response = await api.get('/post/letters/history', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async sendPostcard(params: {
    fileUrls: string[];
    recipients: {
      addressName: string;
      addressLine1: string;
      addressLine2?: string;
      addressCity: string;
      addressState: string;
      addressPostalCode: string;
      addressCountry: string;
      schedule?: number;
    }[];
  }) {
    let response = await api.post(
      '/post/postcards/send',
      {
        file_urls: params.fileUrls,
        recipients: params.recipients.map(r => ({
          address_name: r.addressName,
          address_line_1: r.addressLine1,
          address_line_2: r.addressLine2,
          address_city: r.addressCity,
          address_state: r.addressState,
          address_postal_code: r.addressPostalCode,
          address_country: r.addressCountry,
          schedule: r.schedule
        }))
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Contact Lists ────────────────────────────────────────

  async getContactLists(params?: { page?: number; limit?: number }) {
    let response = await api.get('/lists', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getContactList(listId: number) {
    let response = await api.get(`/lists/${listId}`, { headers: this.headers });
    return response.data;
  }

  async createContactList(listName: string) {
    let response = await api.post(
      '/lists',
      {
        list_name: listName
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateContactList(listId: number, listName: string) {
    let response = await api.put(
      `/lists/${listId}`,
      {
        list_name: listName
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteContactList(listId: number) {
    let response = await api.delete(`/lists/${listId}`, { headers: this.headers });
    return response.data;
  }

  // ─── Contacts ─────────────────────────────────────────────

  async getContacts(listId: number, params?: { page?: number; limit?: number }) {
    let response = await api.get(`/lists/${listId}/contacts`, {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getContact(listId: number, contactId: number) {
    let response = await api.get(`/lists/${listId}/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createContact(
    listId: number,
    contact: {
      phoneNumber: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      addressLine1?: string;
      addressLine2?: string;
      addressCity?: string;
      addressState?: string;
      addressPostalCode?: string;
      addressCountry?: string;
      organizationName?: string;
      faxNumber?: string;
      custom1?: string;
      custom2?: string;
      custom3?: string;
      custom4?: string;
    }
  ) {
    let response = await api.post(
      `/lists/${listId}/contacts`,
      {
        phone_number: contact.phoneNumber,
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        address_line_1: contact.addressLine1,
        address_line_2: contact.addressLine2,
        address_city: contact.addressCity,
        address_state: contact.addressState,
        address_postal_code: contact.addressPostalCode,
        address_country: contact.addressCountry,
        organization_name: contact.organizationName,
        fax_number: contact.faxNumber,
        custom_1: contact.custom1,
        custom_2: contact.custom2,
        custom_3: contact.custom3,
        custom_4: contact.custom4
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateContact(
    listId: number,
    contactId: number,
    contact: {
      phoneNumber?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      addressLine1?: string;
      addressLine2?: string;
      addressCity?: string;
      addressState?: string;
      addressPostalCode?: string;
      addressCountry?: string;
      organizationName?: string;
      faxNumber?: string;
      custom1?: string;
      custom2?: string;
      custom3?: string;
      custom4?: string;
    }
  ) {
    let response = await api.put(
      `/lists/${listId}/contacts/${contactId}`,
      {
        phone_number: contact.phoneNumber,
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        address_line_1: contact.addressLine1,
        address_line_2: contact.addressLine2,
        address_city: contact.addressCity,
        address_state: contact.addressState,
        address_postal_code: contact.addressPostalCode,
        address_country: contact.addressCountry,
        organization_name: contact.organizationName,
        fax_number: contact.faxNumber,
        custom_1: contact.custom1,
        custom_2: contact.custom2,
        custom_3: contact.custom3,
        custom_4: contact.custom4
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteContact(listId: number, contactId: number) {
    let response = await api.delete(`/lists/${listId}/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Dedicated Numbers ────────────────────────────────────

  async getDedicatedNumbers(params?: { page?: number; limit?: number }) {
    let response = await api.get('/numbers', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ─── Inbound Rules (Automations) ──────────────────────────

  async getInboundSmsRules(params?: { page?: number; limit?: number }) {
    let response = await api.get('/automations/sms/inbound', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async createInboundSmsRule(rule: {
    dedicatedNumber: string;
    ruleType: string;
    action: string;
    actionAddress: string;
    matchType?: string;
    enabled?: number;
  }) {
    let response = await api.post(
      '/automations/sms/inbound',
      {
        dedicated_number: rule.dedicatedNumber,
        rule_type: rule.ruleType,
        action: rule.action,
        action_address: rule.actionAddress,
        match_type: rule.matchType,
        enabled: rule.enabled ?? 1
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteInboundSmsRule(ruleId: number) {
    let response = await api.delete(`/automations/sms/inbound/${ruleId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── SMS Delivery Receipt Rules ───────────────────────────

  async getSmsDeliveryReceiptRules(params?: { page?: number; limit?: number }) {
    let response = await api.get('/automations/sms/receipts', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async createSmsDeliveryReceiptRule(rule: {
    ruleType: string;
    action: string;
    actionAddress: string;
    matchType?: string;
    enabled?: number;
  }) {
    let response = await api.post(
      '/automations/sms/receipts',
      {
        rule_type: rule.ruleType,
        action: rule.action,
        action_address: rule.actionAddress,
        match_type: rule.matchType,
        enabled: rule.enabled ?? 1
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteSmsDeliveryReceiptRule(ruleId: number) {
    let response = await api.delete(`/automations/sms/receipts/${ruleId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Subaccounts ──────────────────────────────────────────

  async getSubaccounts(params?: { page?: number; limit?: number }) {
    let response = await api.get('/subaccounts', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async createSubaccount(subaccount: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    apiUsername: string;
  }) {
    let response = await api.post(
      '/subaccounts',
      {
        first_name: subaccount.firstName,
        last_name: subaccount.lastName,
        email: subaccount.email,
        password: subaccount.password,
        phone_number: subaccount.phoneNumber,
        api_username: subaccount.apiUsername
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteSubaccount(subaccountId: number) {
    let response = await api.delete(`/subaccounts/${subaccountId}`, { headers: this.headers });
    return response.data;
  }

  // ─── Statistics ───────────────────────────────────────────

  async getSmsStatistics(params?: { page?: number; limit?: number }) {
    let response = await api.get('/statistics/sms', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  async getVoiceStatistics(params?: { page?: number; limit?: number }) {
    let response = await api.get('/statistics/voice', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ─── File Uploads ─────────────────────────────────────────

  async uploadFile(fileContent: string, fileType: string) {
    let response = await api.post(
      '/uploads',
      {
        content: fileContent
      },
      {
        headers: this.headers,
        params: { convert: fileType }
      }
    );
    return response.data;
  }

  // ─── Sender IDs ───────────────────────────────────────────

  async getSenderIds(params?: { page?: number; limit?: number }) {
    let response = await api.get('/sms/sender-ids', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ─── SMS Inbound ──────────────────────────────────────────

  async getInboundSms(params?: { page?: number; limit?: number }) {
    let response = await api.get('/sms/inbound', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data;
  }

  // ─── Voice History ────────────────────────────────────────

  async getVoiceHistory(params?: {
    page?: number;
    limit?: number;
    dateFrom?: number;
    dateTo?: number;
  }) {
    let response = await api.get('/voice/history', {
      headers: this.headers,
      params: {
        page: params?.page,
        limit: params?.limit,
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  // ─── Account Balance ──────────────────────────────────────

  async getAccountBalance() {
    let account = await this.getAccount();
    return {
      balance: account.balance,
      currencySymbol: account.currency?.currency_name_short
    };
  }
}
