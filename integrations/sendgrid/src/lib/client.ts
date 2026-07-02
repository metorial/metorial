import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region?: string }) {
    let baseURL =
      config.region === 'eu'
        ? 'https://api.eu.sendgrid.com/v3'
        : 'https://api.sendgrid.com/v3';

    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Mail Send ──

  async sendEmail(params: {
    personalizations: Array<{
      to: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      subject?: string;
      headers?: Record<string, string>;
      dynamicTemplateData?: Record<string, any>;
      customArgs?: Record<string, string>;
      sendAt?: number;
    }>;
    from: { email: string; name?: string };
    replyTo?: { email: string; name?: string };
    subject?: string;
    content?: Array<{ type: string; value: string }>;
    attachments?: Array<{
      content: string;
      type?: string;
      filename: string;
      disposition?: string;
      contentId?: string;
    }>;
    templateId?: string;
    headers?: Record<string, string>;
    categories?: string[];
    sendAt?: number;
    batchId?: string;
    asm?: { groupId: number; groupsToDisplay?: number[] };
    mailSettings?: {
      bypassListManagement?: { enable?: boolean };
      bypassSpamManagement?: { enable?: boolean };
      bypassBounceManagement?: { enable?: boolean };
      sandboxMode?: { enable?: boolean };
    };
    trackingSettings?: {
      clickTracking?: { enable?: boolean; enableText?: boolean };
      openTracking?: { enable?: boolean; substitutionTag?: string };
      subscriptionTracking?: {
        enable?: boolean;
        text?: string;
        html?: string;
        substitutionTag?: string;
      };
    };
  }) {
    let body: Record<string, any> = {
      personalizations: params.personalizations.map(p => {
        let personalization: Record<string, any> = {
          to: p.to
        };
        if (p.cc) personalization.cc = p.cc;
        if (p.bcc) personalization.bcc = p.bcc;
        if (p.subject) personalization.subject = p.subject;
        if (p.headers) personalization.headers = p.headers;
        if (p.dynamicTemplateData)
          personalization.dynamic_template_data = p.dynamicTemplateData;
        if (p.customArgs) personalization.custom_args = p.customArgs;
        if (p.sendAt) personalization.send_at = p.sendAt;
        return personalization;
      }),
      from: params.from
    };

    if (params.replyTo) body.reply_to = params.replyTo;
    if (params.subject) body.subject = params.subject;
    if (params.content) body.content = params.content;
    if (params.attachments) {
      body.attachments = params.attachments.map(a => ({
        content: a.content,
        type: a.type,
        filename: a.filename,
        disposition: a.disposition,
        content_id: a.contentId
      }));
    }
    if (params.templateId) body.template_id = params.templateId;
    if (params.headers) body.headers = params.headers;
    if (params.categories) body.categories = params.categories;
    if (params.sendAt) body.send_at = params.sendAt;
    if (params.batchId) body.batch_id = params.batchId;
    if (params.asm) {
      body.asm = {
        group_id: params.asm.groupId,
        groups_to_display: params.asm.groupsToDisplay
      };
    }
    if (params.mailSettings) {
      body.mail_settings = {};
      if (params.mailSettings.bypassListManagement) {
        body.mail_settings.bypass_list_management = params.mailSettings.bypassListManagement;
      }
      if (params.mailSettings.bypassSpamManagement) {
        body.mail_settings.bypass_spam_management = params.mailSettings.bypassSpamManagement;
      }
      if (params.mailSettings.bypassBounceManagement) {
        body.mail_settings.bypass_bounce_management =
          params.mailSettings.bypassBounceManagement;
      }
      if (params.mailSettings.sandboxMode) {
        body.mail_settings.sandbox_mode = params.mailSettings.sandboxMode;
      }
    }
    if (params.trackingSettings) {
      body.tracking_settings = {};
      if (params.trackingSettings.clickTracking) {
        body.tracking_settings.click_tracking = {
          enable: params.trackingSettings.clickTracking.enable,
          enable_text: params.trackingSettings.clickTracking.enableText
        };
      }
      if (params.trackingSettings.openTracking) {
        body.tracking_settings.open_tracking = {
          enable: params.trackingSettings.openTracking.enable,
          substitution_tag: params.trackingSettings.openTracking.substitutionTag
        };
      }
      if (params.trackingSettings.subscriptionTracking) {
        body.tracking_settings.subscription_tracking = {
          enable: params.trackingSettings.subscriptionTracking.enable,
          text: params.trackingSettings.subscriptionTracking.text,
          html: params.trackingSettings.subscriptionTracking.html,
          substitution_tag: params.trackingSettings.subscriptionTracking.substitutionTag
        };
      }
    }

    let response = await this.http.post('/mail/send', body);
    return response;
  }

  // ── Templates ──

  async listTemplates(params: {
    generations?: 'legacy' | 'dynamic';
    pageSize?: number;
    pageToken?: string;
  }) {
    let query: Record<string, string> = {
      generations: params.generations || 'dynamic'
    };
    if (params.pageSize) query.page_size = String(params.pageSize);
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.http.get('/templates', { params: query });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.http.get(`/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(name: string, generation?: 'legacy' | 'dynamic') {
    let response = await this.http.post('/templates', {
      name,
      generation: generation || 'dynamic'
    });
    return response.data;
  }

  async updateTemplate(templateId: string, name: string) {
    let response = await this.http.patch(`/templates/${templateId}`, { name });
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    await this.http.delete(`/templates/${templateId}`);
  }

  async createTemplateVersion(
    templateId: string,
    params: {
      name: string;
      subject?: string;
      htmlContent?: string;
      plainContent?: string;
      active?: number;
      testData?: string;
      editor?: 'code' | 'design';
    }
  ) {
    let body: Record<string, any> = {
      name: params.name,
      active: params.active ?? 1,
      editor: params.editor || 'code'
    };
    if (params.subject) body.subject = params.subject;
    if (params.htmlContent) body.html_content = params.htmlContent;
    if (params.plainContent) body.plain_content = params.plainContent;
    if (params.testData) body.test_data = params.testData;

    let response = await this.http.post(`/templates/${templateId}/versions`, body);
    return response.data;
  }

  async updateTemplateVersion(
    templateId: string,
    versionId: string,
    params: {
      name?: string;
      subject?: string;
      htmlContent?: string;
      plainContent?: string;
      active?: number;
      testData?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.htmlContent !== undefined) body.html_content = params.htmlContent;
    if (params.plainContent !== undefined) body.plain_content = params.plainContent;
    if (params.active !== undefined) body.active = params.active;
    if (params.testData !== undefined) body.test_data = params.testData;

    let response = await this.http.patch(
      `/templates/${templateId}/versions/${versionId}`,
      body
    );
    return response.data;
  }

  async deleteTemplateVersion(templateId: string, versionId: string) {
    await this.http.delete(`/templates/${templateId}/versions/${versionId}`);
  }

  // ── Contacts ──

  async upsertContacts(
    contacts: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      stateProvinceRegion?: string;
      postalCode?: string;
      country?: string;
      phone?: string;
      alternateEmails?: string[];
      customFields?: Record<string, any>;
    }>
  ) {
    let body = {
      contacts: contacts.map(c => {
        let contact: Record<string, any> = { email: c.email };
        if (c.firstName) contact.first_name = c.firstName;
        if (c.lastName) contact.last_name = c.lastName;
        if (c.addressLine1) contact.address_line_1 = c.addressLine1;
        if (c.addressLine2) contact.address_line_2 = c.addressLine2;
        if (c.city) contact.city = c.city;
        if (c.stateProvinceRegion) contact.state_province_region = c.stateProvinceRegion;
        if (c.postalCode) contact.postal_code = c.postalCode;
        if (c.country) contact.country = c.country;
        if (c.phone) contact.phone_number = c.phone;
        if (c.alternateEmails) contact.alternate_emails = c.alternateEmails;
        if (c.customFields) contact.custom_fields = c.customFields;
        return contact;
      })
    };
    let response = await this.http.put('/marketing/contacts', body);
    return response.data;
  }

  async searchContacts(query: string) {
    let response = await this.http.post('/marketing/contacts/search', { query });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/marketing/contacts/${contactId}`);
    return response.data;
  }

  async deleteContacts(contactIds: string[], deleteAllContacts?: boolean) {
    if (deleteAllContacts) {
      let response = await this.http.delete('/marketing/contacts', {
        params: { delete_all_contacts: 'true' }
      });
      return response.data;
    }
    let response = await this.http.delete('/marketing/contacts', {
      params: { ids: contactIds.join(',') }
    });
    return response.data;
  }

  async getContactCount() {
    let response = await this.http.get('/marketing/contacts/count');
    return response.data;
  }

  // ── Contact Lists ──

  async listContactLists(pageSize?: number, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageSize) params.page_size = String(pageSize);
    if (pageToken) params.page_token = pageToken;
    let response = await this.http.get('/marketing/lists', { params });
    return response.data;
  }

  async getContactList(listId: string, contactSample?: boolean) {
    let params: Record<string, string> = {};
    if (contactSample) params.contact_sample = 'true';
    let response = await this.http.get(`/marketing/lists/${listId}`, { params });
    return response.data;
  }

  async createContactList(name: string) {
    let response = await this.http.post('/marketing/lists', { name });
    return response.data;
  }

  async updateContactList(listId: string, name: string) {
    let response = await this.http.patch(`/marketing/lists/${listId}`, { name });
    return response.data;
  }

  async deleteContactList(listId: string, deleteContacts?: boolean) {
    let params: Record<string, string> = {};
    if (deleteContacts) params.delete_contacts = 'true';
    await this.http.delete(`/marketing/lists/${listId}`, { params });
  }

  async addContactsToList(listId: string, contactIds: string[]) {
    let response = await this.http.put('/marketing/contacts', {
      list_ids: [listId],
      contacts: contactIds.map(id => ({ email: id }))
    });
    return response.data;
  }

  async removeContactFromList(listId: string, contactId: string) {
    await this.http.delete(`/marketing/lists/${listId}/contacts`, {
      params: { contact_ids: contactId }
    });
  }

  // ── Suppressions ──

  async listSuppressionGroups() {
    let response = await this.http.get('/asm/groups');
    return response.data;
  }

  async createSuppressionGroup(name: string, description: string, isDefault?: boolean) {
    let response = await this.http.post('/asm/groups', {
      name,
      description,
      is_default: isDefault || false
    });
    return response.data;
  }

  async getSuppressionGroup(groupId: number) {
    let response = await this.http.get(`/asm/groups/${groupId}`);
    return response.data;
  }

  async updateSuppressionGroup(
    groupId: number,
    params: { name?: string; description?: string; isDefault?: boolean }
  ) {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.isDefault !== undefined) body.is_default = params.isDefault;
    let response = await this.http.patch(`/asm/groups/${groupId}`, body);
    return response.data;
  }

  async deleteSuppressionGroup(groupId: number) {
    await this.http.delete(`/asm/groups/${groupId}`);
  }

  async addSuppressedEmails(groupId: number, emails: string[]) {
    let response = await this.http.post(`/asm/groups/${groupId}/suppressions`, {
      recipient_emails: emails
    });
    return response.data;
  }

  async listSuppressedEmails(groupId: number) {
    let response = await this.http.get(`/asm/groups/${groupId}/suppressions`);
    return response.data;
  }

  async deleteSuppressedEmail(groupId: number, email: string) {
    await this.http.delete(`/asm/groups/${groupId}/suppressions/${email}`);
  }

  // ── Global Suppressions ──

  async listGlobalSuppressions(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number
  ) {
    let params: Record<string, string> = {};
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);
    if (limit) params.limit = String(limit);
    if (offset) params.offset = String(offset);
    let response = await this.http.get('/suppression/unsubscribes', { params });
    return response.data;
  }

  async addGlobalSuppression(emails: string[]) {
    let response = await this.http.post('/asm/suppressions/global', {
      recipient_emails: emails
    });
    return response.data;
  }

  async deleteGlobalSuppression(email: string) {
    await this.http.delete(`/asm/suppressions/global/${email}`);
  }

  // ── Bounces ──

  async listBounces(startTime?: number, endTime?: number) {
    let params: Record<string, string> = {};
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);
    let response = await this.http.get('/suppression/bounces', { params });
    return response.data;
  }

  async deleteBounce(email: string) {
    await this.http.delete(`/suppression/bounces/${email}`);
  }

  async deleteAllBounces() {
    await this.http.delete('/suppression/bounces', {
      data: { delete_all: true }
    });
  }

  // ── Blocks ──

  async listBlocks(startTime?: number, endTime?: number) {
    let params: Record<string, string> = {};
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);
    let response = await this.http.get('/suppression/blocks', { params });
    return response.data;
  }

  async deleteBlock(email: string) {
    await this.http.delete(`/suppression/blocks/${email}`);
  }

  // ── Spam Reports ──

  async listSpamReports(startTime?: number, endTime?: number) {
    let params: Record<string, string> = {};
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);
    let response = await this.http.get('/suppression/spam_reports', { params });
    return response.data;
  }

  async deleteSpamReport(email: string) {
    await this.http.delete(`/suppression/spam_reports/${email}`);
  }

  // ── Invalid Emails ──

  async listInvalidEmails(startTime?: number, endTime?: number) {
    let params: Record<string, string> = {};
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);
    let response = await this.http.get('/suppression/invalid_emails', { params });
    return response.data;
  }

  async deleteInvalidEmail(email: string) {
    await this.http.delete(`/suppression/invalid_emails/${email}`);
  }

  // ── Stats ──

  async getGlobalStats(params: {
    startDate: string;
    endDate?: string;
    aggregatedBy?: 'day' | 'week' | 'month';
  }) {
    let query: Record<string, string> = {
      start_date: params.startDate
    };
    if (params.endDate) query.end_date = params.endDate;
    if (params.aggregatedBy) query.aggregated_by = params.aggregatedBy;
    let response = await this.http.get('/stats', { params: query });
    return response.data;
  }

  async getCategoryStats(params: {
    startDate: string;
    endDate?: string;
    categories: string[];
    aggregatedBy?: 'day' | 'week' | 'month';
  }) {
    let query: Record<string, any> = {
      start_date: params.startDate,
      categories: params.categories.join(',')
    };
    if (params.endDate) query.end_date = params.endDate;
    if (params.aggregatedBy) query.aggregated_by = params.aggregatedBy;
    let response = await this.http.get('/categories/stats', { params: query });
    return response.data;
  }

  async listCategories() {
    let response = await this.http.get('/categories', { params: { limit: 500 } });
    return response.data;
  }

  // ── Verified Senders ──

  async listVerifiedSenders() {
    let response = await this.http.get('/verified_senders');
    return response.data;
  }

  async createVerifiedSender(params: {
    nickname: string;
    fromEmail: string;
    fromName?: string;
    replyTo: string;
    replyToName?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }) {
    let response = await this.http.post('/verified_senders', {
      nickname: params.nickname,
      from_email: params.fromEmail,
      from_name: params.fromName,
      reply_to: params.replyTo,
      reply_to_name: params.replyToName,
      address: params.address,
      address2: params.address2,
      city: params.city,
      state: params.state,
      zip: params.zip,
      country: params.country
    });
    return response.data;
  }

  async deleteVerifiedSender(senderId: number) {
    await this.http.delete(`/verified_senders/${senderId}`);
  }

  async resendVerifiedSenderVerification(senderId: number) {
    await this.http.post(`/verified_senders/resend/${senderId}`);
  }

  // ── Event Webhook ──

  async getEventWebhookSettings() {
    let response = await this.http.get('/user/webhooks/event/settings');
    return response.data;
  }

  async updateEventWebhookSettings(params: {
    enabled: boolean;
    url: string;
    groupResubscribe?: boolean;
    delivered?: boolean;
    groupUnsubscribe?: boolean;
    spamReport?: boolean;
    bounce?: boolean;
    deferred?: boolean;
    unsubscribe?: boolean;
    processed?: boolean;
    open?: boolean;
    click?: boolean;
    dropped?: boolean;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthTokenUrl?: string;
  }) {
    let body: Record<string, any> = {
      enabled: params.enabled,
      url: params.url
    };
    if (params.groupResubscribe !== undefined)
      body.group_resubscribe = params.groupResubscribe;
    if (params.delivered !== undefined) body.delivered = params.delivered;
    if (params.groupUnsubscribe !== undefined)
      body.group_unsubscribe = params.groupUnsubscribe;
    if (params.spamReport !== undefined) body.spam_report = params.spamReport;
    if (params.bounce !== undefined) body.bounce = params.bounce;
    if (params.deferred !== undefined) body.deferred = params.deferred;
    if (params.unsubscribe !== undefined) body.unsubscribe = params.unsubscribe;
    if (params.processed !== undefined) body.processed = params.processed;
    if (params.open !== undefined) body.open = params.open;
    if (params.click !== undefined) body.click = params.click;
    if (params.dropped !== undefined) body.dropped = params.dropped;
    if (params.oauthClientId) body.oauth_client_id = params.oauthClientId;
    if (params.oauthClientSecret) body.oauth_client_secret = params.oauthClientSecret;
    if (params.oauthTokenUrl) body.oauth_token_url = params.oauthTokenUrl;

    let response = await this.http.patch('/user/webhooks/event/settings', body);
    return response.data;
  }

  // ── Domain Authentication ──

  async listAuthenticatedDomains() {
    let response = await this.http.get('/whitelabel/domains');
    return response.data;
  }

  async getAuthenticatedDomain(domainId: number) {
    let response = await this.http.get(`/whitelabel/domains/${domainId}`);
    return response.data;
  }

  async authenticateDomain(params: {
    domain: string;
    subdomain?: string;
    customSpf?: boolean;
    isDefault?: boolean;
    automaticSecurity?: boolean;
  }) {
    let response = await this.http.post('/whitelabel/domains', {
      domain: params.domain,
      subdomain: params.subdomain,
      custom_spf: params.customSpf,
      default: params.isDefault,
      automatic_security: params.automaticSecurity ?? true
    });
    return response.data;
  }

  async validateDomainAuthentication(domainId: number) {
    let response = await this.http.post(`/whitelabel/domains/${domainId}/validate`);
    return response.data;
  }

  async deleteDomainAuthentication(domainId: number) {
    await this.http.delete(`/whitelabel/domains/${domainId}`);
  }
}
