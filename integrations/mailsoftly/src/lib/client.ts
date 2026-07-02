import { createAxios } from 'slates';

export class MailsoftlyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.mailsoftly.com/api/v3',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Authentication ────────────────────────────────────────────────

  async authenticate(): Promise<{
    firmId: number;
    firmName: string;
    adminName: string;
  }> {
    let response = await this.axios.post('/authentication');
    return {
      firmId: response.data.firm_id,
      firmName: response.data.firm_name,
      adminName: response.data.admin_name
    };
  }

  // ─── Contacts ──────────────────────────────────────────────────────

  async getContacts(): Promise<any[]> {
    let response = await this.axios.get('/get_contacts');
    return response.data.contacts ?? response.data ?? [];
  }

  async getContact(contactId: string, type?: string): Promise<any> {
    let params: Record<string, string> = { contact_id: contactId };
    if (type) {
      params.type = type;
    }
    let response = await this.axios.get('/get_contact', { params });
    return response.data.contact ?? response.data;
  }

  async createContact(data: {
    firstName?: string;
    lastName?: string;
    email: string;
    customFields?: Record<string, string>;
  }): Promise<any> {
    let body: Record<string, any> = {
      email: data.email
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.customFields) {
      Object.assign(body, data.customFields);
    }
    let response = await this.axios.post('/create_contact', body);
    return response.data.contact ?? response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      customFields?: Record<string, string>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.customFields) {
      Object.assign(body, data.customFields);
    }
    let response = await this.axios.post('/update_contact', body, {
      params: { contact_id: contactId }
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
    let body: Record<string, any> = {
      email: data.email
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.customFields) {
      Object.assign(body, data.customFields);
    }
    let params: Record<string, string> = {};
    if (data.contactId) {
      params.contact_id = data.contactId;
    }
    let response = await this.axios.post('/create_or_update_contact', body, { params });
    return response.data.contact ?? response.data;
  }

  async searchContacts(criteria: Record<string, string>): Promise<any[]> {
    let response = await this.axios.get('/search_contacts', { params: criteria });
    return response.data.contacts ?? response.data ?? [];
  }

  // ─── Contact Fields ────────────────────────────────────────────────

  async getContactFields(): Promise<any[]> {
    let response = await this.axios.get('/get_contact_fields');
    return response.data.fields ?? response.data ?? [];
  }

  async getCustomFields(): Promise<any[]> {
    let response = await this.axios.get('/get_custom_fields');
    return response.data.custom_fields ?? response.data ?? [];
  }

  async addCustomFieldToContact(
    contactId: string,
    fieldName: string,
    fieldValue: string
  ): Promise<any> {
    let response = await this.axios.post(
      '/add_custom_field_to_contact',
      {
        custom_field_name: fieldName,
        custom_field_value: fieldValue
      },
      {
        params: { contact_id: contactId }
      }
    );
    return response.data;
  }

  // ─── Contact Lists ─────────────────────────────────────────────────

  async getContactLists(): Promise<any[]> {
    let response = await this.axios.get('/get_contact_lists');
    return response.data.contact_lists ?? response.data ?? [];
  }

  async getContactList(contactListId: string): Promise<any> {
    let response = await this.axios.get('/get_contact_list', {
      params: { contact_list_id: contactListId }
    });
    return response.data.contact_list ?? response.data;
  }

  async createContactList(name: string): Promise<any> {
    let response = await this.axios.post('/create_contact_list', { name });
    return response.data.contact_list ?? response.data;
  }

  async getContactListContacts(contactListId: string): Promise<any[]> {
    let response = await this.axios.get('/get_contact_list_contacts', {
      params: { contact_list_id: contactListId }
    });
    return response.data.contacts ?? response.data ?? [];
  }

  async addContactToContactList(contactListId: string, contactId: string): Promise<any> {
    let response = await this.axios.post(
      '/add_contact_to_contact_list',
      {},
      {
        params: { contact_list_id: contactListId, contact_id: contactId }
      }
    );
    return response.data;
  }

  async addContactsToContactList(
    contactListId: string,
    contacts: Array<{ email: string; firstName?: string; lastName?: string }>
  ): Promise<any> {
    let mappedContacts = contacts.map(c => {
      let obj: Record<string, string> = { email: c.email };
      if (c.firstName) obj.first_name = c.firstName;
      if (c.lastName) obj.last_name = c.lastName;
      return obj;
    });
    let response = await this.axios.post(
      '/add_contacts_to_contact_list',
      {
        contacts: mappedContacts
      },
      {
        params: { contact_list_id: contactListId }
      }
    );
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────────────

  async getTags(): Promise<any[]> {
    let response = await this.axios.get('/get_tags');
    return response.data.tags ?? response.data ?? [];
  }

  async assignTagToContact(
    contactId: string,
    tag: { tagId?: string; tagName?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (tag.tagId) body.tag_id = tag.tagId;
    if (tag.tagName) body.tag_name = tag.tagName;
    let response = await this.axios.post('/assign_tag_to_contact', body, {
      params: { contact_id: contactId }
    });
    return response.data;
  }

  async assignTagsToContact(
    contactId: string,
    tags: Array<{ tagName: string; tagColor?: string }>
  ): Promise<any> {
    let mappedTags = tags.map(t => {
      let obj: Record<string, string> = { tag_name: t.tagName };
      if (t.tagColor) obj.tag_color = t.tagColor;
      return obj;
    });
    let response = await this.axios.post(
      '/assign_tags_to_contact',
      {
        tags: mappedTags
      },
      {
        params: { contact_id: contactId }
      }
    );
    return response.data;
  }

  // ─── Email Campaigns ───────────────────────────────────────────────

  async getEmails(): Promise<any[]> {
    let response = await this.axios.get('/get_emails');
    return response.data.emails ?? response.data ?? [];
  }

  async createEmail(data: {
    subject: string;
    contactListId?: string;
    recipients?: Array<{ email: string; firstName?: string; lastName?: string }>;
    body?: string;
    htmlBody?: string;
    attachments?: string[];
    senderName?: string;
    senderEmail?: string;
  }): Promise<any> {
    let emailObj: Record<string, any> = {
      subject: data.subject
    };
    if (data.contactListId) emailObj.contact_list_id = data.contactListId;
    if (data.recipients) {
      emailObj.recipients = data.recipients.map(r => {
        let obj: Record<string, string> = { email: r.email };
        if (r.firstName) obj.first_name = r.firstName;
        if (r.lastName) obj.last_name = r.lastName;
        return obj;
      });
    }
    if (data.body) emailObj.body = data.body;
    if (data.htmlBody) emailObj.html_body = data.htmlBody;
    if (data.attachments && data.attachments.length > 0) {
      emailObj.attaches = data.attachments;
    }
    if (data.senderName) emailObj.sender_name = data.senderName;
    if (data.senderEmail) emailObj.sender_email = data.senderEmail;

    let response = await this.axios.post('/create_email', {
      mailLists: [emailObj]
    });
    return response.data;
  }

  async getEmailStatus(emailId: string): Promise<any> {
    let response = await this.axios.get('/email_status', {
      params: { email_id: emailId }
    });
    return response.data;
  }

  async sendEmail(emailId: string): Promise<any> {
    let response = await this.axios.post('/send_email', {
      email_id: emailId
    });
    return response.data;
  }
}
