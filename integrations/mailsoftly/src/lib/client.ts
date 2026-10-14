import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';

export interface MailsoftlyPage {
  items: any[];
  page?: number;
  perPage?: number;
  total?: number;
  hasMore?: boolean;
}

export interface MailsoftlyPagination {
  page?: number;
  perPage?: number;
}

export interface MailsoftlySender {
  kind: string;
  sender_id?: number | null;
  email_sender_id?: number;
  name?: string;
  email: string;
  usable_as: 'sender_id' | 'email_sender_id';
  [key: string]: unknown;
}

export class MailsoftlyClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.mailsoftly.com/api/v3',
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Mailsoftly',
          reason: 'mailsoftly_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.status === 'error') {
        throw createApiServiceError(
          response.data.error ?? response.data.message ?? 'Mailsoftly rejected the request.',
          { upstreamStatus: response.status, upstreamCode: response.data.gate?.reason }
        );
      }
      return response;
    });
  }

  private numericId(value: string, field: string): number {
    let id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
      throw createApiServiceError(`Provide a positive numeric ${field}.`);
    }
    return id;
  }

  private readPage(data: any, field: string, headers?: unknown): MailsoftlyPage {
    let items = Array.isArray(data) ? data : data?.[field];
    if (!Array.isArray(items)) {
      throw createApiServiceError(`Mailsoftly returned an invalid ${field} response.`);
    }
    let legacyTotal = getResponseHeaderValue(headers, 'X-Total-Count');
    let truncated = getResponseHeaderValue(headers, 'X-Truncated');
    return {
      items,
      ...(!Array.isArray(data)
        ? pickDefined({
            page: data.page,
            perPage: data.per_page,
            total: data.total ?? (legacyTotal === undefined ? undefined : Number(legacyTotal)),
            hasMore:
              data.has_more ?? (truncated === undefined ? undefined : truncated === 'true')
          })
        : pickDefined({
            total: legacyTotal === undefined ? undefined : Number(legacyTotal),
            hasMore: truncated === undefined ? undefined : truncated === 'true'
          }))
    };
  }

  async authenticate(): Promise<{ firmId: number; firmName: string; adminName?: string }> {
    let response = await this.axios.post('/authentication');
    if (
      typeof response.data.firm_id !== 'number' ||
      typeof response.data.firm_name !== 'string'
    ) {
      throw createApiServiceError('Mailsoftly authentication did not return an account ID.');
    }
    return {
      firmId: response.data.firm_id,
      firmName: response.data.firm_name,
      adminName: response.data.admin_name
    };
  }

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/get_account');
    return response.data;
  }

  async listSenders(): Promise<{
    senders: MailsoftlySender[];
    default_sender_id?: number | null;
    note?: string;
  }> {
    let response = await this.axios.get('/list_senders');
    if (!Array.isArray(response.data.senders)) {
      throw createApiServiceError('Mailsoftly returned an invalid sender list.');
    }
    return response.data;
  }

  async getCampaignStatistics(campaignId: string): Promise<any> {
    let response = await this.axios.get('/get_campaign_stats', {
      params: { id: this.numericId(campaignId, 'campaignId') }
    });
    return response.data;
  }

  async getContacts(pagination: MailsoftlyPagination = {}): Promise<MailsoftlyPage> {
    let response = await this.axios.get('/get_contacts', {
      params: pickDefined({ page: pagination.page, per_page: pagination.perPage })
    });
    return this.readPage(response.data, 'contacts', response.headers);
  }

  async getContact(contactId: string, type?: string): Promise<any> {
    let response = await this.axios.get('/get_contact', {
      params: pickDefined({ contact_id: this.numericId(contactId, 'contactId'), type })
    });
    return response.data.contact ?? response.data;
  }

  async createOrUpdateContact(data: {
    contactId?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    customFields?: Record<string, string>;
  }): Promise<any> {
    let response = await this.axios.post(
      '/create_or_update_contact',
      pickDefined({
        contact_id:
          data.contactId === undefined
            ? undefined
            : this.numericId(data.contactId, 'contactId'),
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName
      })
    );
    let contact = response.data.contact ?? response.data;
    let fields = Object.entries(data.customFields ?? {});
    if (fields.length) {
      if (contact.id === undefined) {
        throw createApiServiceError(
          'The contact was saved, but Mailsoftly did not return its ID for custom field updates.'
        );
      }
      for (let [name, value] of fields) {
        try {
          await this.addCustomFieldToContact(String(contact.id), name, value);
        } catch (error) {
          let failure = buildApiServiceError(error, {
            providerLabel: 'Mailsoftly',
            reason: 'mailsoftly_custom_field_error'
          });
          failure.data.message = `Contact ${contact.id} was saved, but custom field "${name}" could not be updated. Retry that field with add_custom_field_to_contact. ${failure.data.message}`;
          failure.message = failure.data.message;
          throw failure;
        }
      }
      contact = await this.getContact(String(contact.id), 'detailed');
    }
    return contact;
  }

  async searchContacts(
    criteria: Record<string, string>,
    pagination: MailsoftlyPagination = {}
  ): Promise<MailsoftlyPage> {
    let response = await this.axios.get('/search_contacts', {
      params: {
        ...criteria,
        ...pickDefined({ page: pagination.page, per_page: pagination.perPage })
      }
    });
    return this.readPage(response.data, 'contacts', response.headers);
  }

  async getContactFields(): Promise<any[]> {
    let response = await this.axios.get('/get_contact_fields');
    return this.readPage(response.data, 'fields').items;
  }

  async getCustomFields(): Promise<{ name: string; type: string }[]> {
    let response = await this.axios.get('/get_custom_fields');
    let fields = response.data.custom_fields ?? response.data;
    if (Array.isArray(fields)) return fields;
    if (!fields || typeof fields !== 'object') {
      throw createApiServiceError('Mailsoftly returned an invalid custom field map.');
    }
    return Object.entries(fields).map(([name, type]) => ({ name, type: String(type) }));
  }

  async addCustomFieldToContact(
    contactId: string,
    fieldName: string,
    fieldValue: string
  ): Promise<any> {
    let response = await this.axios.post('/add_custom_field_to_contact', {
      contact_id: this.numericId(contactId, 'contactId'),
      custom_field_name: fieldName,
      custom_field_value: fieldValue
    });
    return response.data;
  }

  async getContactLists(): Promise<any[]> {
    let response = await this.axios.get('/get_contact_lists');
    return this.readPage(response.data, 'contact_lists').items;
  }

  async getContactList(contactListId: string): Promise<any> {
    let response = await this.axios.get('/get_contact_list', {
      params: { contact_list_id: this.numericId(contactListId, 'contactListId') }
    });
    return response.data.contact_list ?? response.data;
  }

  async createContactList(name: string): Promise<any> {
    let response = await this.axios.post('/create_contact_list', { name });
    return response.data.contact_list ?? response.data;
  }

  async getContactListContacts(
    contactListId: string,
    pagination: MailsoftlyPagination = {}
  ): Promise<MailsoftlyPage> {
    let response = await this.axios.get('/get_contact_list_contacts', {
      params: {
        contact_list_id: this.numericId(contactListId, 'contactListId'),
        ...pickDefined({ page: pagination.page, per_page: pagination.perPage })
      }
    });
    return this.readPage(response.data, 'contacts', response.headers);
  }

  async addContactToContactList(contactListId: string, contactId: string): Promise<any> {
    let response = await this.axios.post('/add_contact_to_contact_list', {
      contact_list_id: this.numericId(contactListId, 'contactListId'),
      contact_id: this.numericId(contactId, 'contactId')
    });
    return response.data;
  }

  async addContactsToContactList(
    contactListId: string,
    contacts: { email: string; firstName?: string; lastName?: string }[]
  ): Promise<any> {
    let response = await this.axios.post('/add_contacts_to_contact_list', {
      contact_list_id: this.numericId(contactListId, 'contactListId'),
      contacts: contacts.map(c =>
        pickDefined({ email: c.email, first_name: c.firstName, last_name: c.lastName })
      )
    });
    return response.data;
  }

  async getTags(): Promise<any[]> {
    let response = await this.axios.get('/get_tags');
    return this.readPage(response.data, 'tags').items;
  }

  async assignTagToContact(
    contactId: string,
    tag: { tagId?: string; tagName?: string; tagColor?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      '/assign_tag_to_contact',
      pickDefined({
        contact_id: this.numericId(contactId, 'contactId'),
        tag_id: tag.tagId === undefined ? undefined : this.numericId(tag.tagId, 'tagId'),
        tag_name: tag.tagName,
        tag_color: tag.tagColor
      })
    );
    return response.data;
  }

  async assignTagsToContact(
    contactId: string,
    tags: { tagName: string; tagColor?: string }[]
  ): Promise<any> {
    let response = await this.axios.post('/assign_tags_to_contact', {
      contact_id: this.numericId(contactId, 'contactId'),
      tags: tags.map(t => pickDefined({ tag_name: t.tagName, tag_color: t.tagColor }))
    });
    return response.data;
  }

  async getEmails(
    pagination: MailsoftlyPagination & { status?: string; query?: string } = {}
  ): Promise<MailsoftlyPage> {
    let response = await this.axios.get('/list_campaigns', {
      params: pickDefined({
        page: pagination.page ?? 1,
        per_page: pagination.perPage ?? 50,
        status: pagination.status,
        q: pagination.query
      })
    });
    return this.readPage(response.data, 'campaigns');
  }

  async createEmail(data: {
    subject: string;
    contactListId?: string;
    recipients?: { email: string; firstName?: string; lastName?: string }[];
    body?: string;
    htmlBody?: string;
    attachments?: string[];
    senderName?: string;
    senderEmail?: string;
    senderId?: string;
    emailSenderId?: string;
    replyTo?: string;
  }): Promise<any> {
    if (!data.subject.trim()) throw createApiServiceError('Provide a non-empty subject.');
    if (
      (data.contactListId !== undefined) === (data.recipients !== undefined) ||
      (data.recipients !== undefined && data.recipients.length === 0)
    ) {
      throw createApiServiceError(
        'Provide exactly one of contactListId or a non-empty recipients array.'
      );
    }
    if (data.senderId !== undefined && data.emailSenderId !== undefined) {
      throw createApiServiceError(
        'Provide either senderId or emailSenderId, not both. Call list_senders to choose one.'
      );
    }
    let senderId = data.senderId;
    let emailSenderId = data.emailSenderId;
    if (data.senderEmail || data.senderName) {
      let { senders } = await this.listSenders();
      let matches = senders.filter(
        sender =>
          (!data.senderEmail ||
            sender.email.toLowerCase() === data.senderEmail.toLowerCase()) &&
          (!data.senderName || sender.name === data.senderName) &&
          (!senderId || String(sender.sender_id) === senderId) &&
          (!emailSenderId || String(sender.email_sender_id) === emailSenderId)
      );
      let sender = matches[0];
      if (matches.length !== 1 || !sender) {
        throw createApiServiceError(
          'The sender name/email must identify exactly one available sender. Call list_senders and provide senderId or emailSenderId.'
        );
      }
      if (sender.usable_as === 'sender_id') senderId = String(sender.sender_id);
      else emailSenderId = String(sender.email_sender_id);
    }
    let attaches = data.attachments?.map((url, index) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw createApiServiceError(
          'Attachments must be valid publicly accessible HTTP or HTTPS URLs.'
        );
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw createApiServiceError('Attachments must use HTTP or HTTPS URLs.');
      }
      return { url, filename: parsed.pathname.split('/').pop() || `attachment-${index + 1}` };
    });
    let body =
      data.htmlBody ??
      data.body
        ?.replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\n', '<br>');
    let response = await this.axios.post(
      '/create_emails',
      pickDefined({
        subject: data.subject,
        contact_list_id:
          data.contactListId === undefined
            ? undefined
            : this.numericId(data.contactListId, 'contactListId'),
        recipients: data.recipients?.map(r =>
          pickDefined({ email: r.email, first_name: r.firstName, last_name: r.lastName })
        ),
        body,
        body_format: data.htmlBody !== undefined ? 'html' : 'content',
        attaches,
        sender_id: senderId === undefined ? undefined : this.numericId(senderId, 'senderId'),
        email_sender_id:
          emailSenderId === undefined
            ? undefined
            : this.numericId(emailSenderId, 'emailSenderId'),
        reply_to: data.replyTo
      })
    );
    if (!Array.isArray(response.data.drafts) || response.data.drafts.length === 0) {
      throw createApiServiceError(
        'Mailsoftly did not create an email draft. Check the audience, content, and sender.'
      );
    }
    return response.data;
  }

  async getEmailStatus(emailId: string): Promise<any> {
    let response = await this.axios.get('/email_status', {
      params: { id: this.numericId(emailId, 'emailId') }
    });
    return response.data;
  }

  async sendEmail(emailId: string): Promise<any> {
    let response = await this.axios.post('/send_email', {
      id: this.numericId(emailId, 'emailId')
    });
    return response.data;
  }
}
