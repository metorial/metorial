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

  // ---- Mail Send ----

  async sendEmail(params: {
    personalizations: Array<{
      to: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      subject?: string;
      headers?: Record<string, string>;
      dynamicTemplateData?: Record<string, any>;
    }>;
    from: { email: string; name?: string };
    replyTo?: { email: string; name?: string };
    subject?: string;
    content?: Array<{ type: string; value: string }>;
    templateId?: string;
    attachments?: Array<{
      content: string;
      type?: string;
      filename: string;
      disposition?: string;
      contentId?: string;
    }>;
    categories?: string[];
    customArgs?: Record<string, string>;
    sendAt?: number;
    batchId?: string;
    asmGroupId?: number;
    asmGroupsToDisplay?: number[];
    ipPoolName?: string;
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
      personalizations: params.personalizations,
      from: params.from,
      subject: params.subject
    };

    if (params.replyTo) body.reply_to = params.replyTo;
    if (params.content) body.content = params.content;
    if (params.templateId) body.template_id = params.templateId;
    if (params.attachments)
      body.attachments = params.attachments.map(a => ({
        content: a.content,
        type: a.type,
        filename: a.filename,
        disposition: a.disposition,
        content_id: a.contentId
      }));
    if (params.categories) body.categories = params.categories;
    if (params.customArgs) body.custom_args = params.customArgs;
    if (params.sendAt) body.send_at = params.sendAt;
    if (params.batchId) body.batch_id = params.batchId;
    if (params.asmGroupId) {
      body.asm = { group_id: params.asmGroupId };
      if (params.asmGroupsToDisplay) {
        body.asm.groups_to_display = params.asmGroupsToDisplay;
      }
    }
    if (params.ipPoolName) body.ip_pool_name = params.ipPoolName;
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

    // Personalizations need snake_case conversion for dynamic_template_data
    body.personalizations = params.personalizations.map(p => {
      let result: Record<string, any> = { to: p.to };
      if (p.cc) result.cc = p.cc;
      if (p.bcc) result.bcc = p.bcc;
      if (p.subject) result.subject = p.subject;
      if (p.headers) result.headers = p.headers;
      if (p.dynamicTemplateData) result.dynamic_template_data = p.dynamicTemplateData;
      return result;
    });

    let response = await this.http.post('/mail/send', body);
    return {
      statusCode: response.status,
      messageId: response.headers?.['x-message-id'] || null
    };
  }

  // ---- Contacts ----

  async addOrUpdateContacts(
    contacts: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      customFields?: Record<string, any>;
    }>,
    listIds?: string[]
  ) {
    let body: Record<string, any> = {
      contacts: contacts.map(c => {
        let contact: Record<string, any> = { email: c.email };
        if (c.firstName) contact.first_name = c.firstName;
        if (c.lastName) contact.last_name = c.lastName;
        if (c.customFields) contact.custom_fields = c.customFields;
        return contact;
      })
    };
    if (listIds && listIds.length > 0) body.list_ids = listIds;

    let response = await this.http.put('/marketing/contacts', body);
    return response.data;
  }

  async searchContacts(query: string) {
    let response = await this.http.post('/marketing/contacts/search', { query });
    return response.data;
  }

  async getContactById(contactId: string) {
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

  // ---- Lists ----

  async getLists(pageSize?: number, pageToken?: string) {
    let response = await this.http.get('/marketing/lists', {
      params: { page_size: pageSize, page_token: pageToken }
    });
    return response.data;
  }

  async createList(name: string) {
    let response = await this.http.post('/marketing/lists', { name });
    return response.data;
  }

  async getListById(listId: string) {
    let response = await this.http.get(`/marketing/lists/${listId}`);
    return response.data;
  }

  async updateList(listId: string, name: string) {
    let response = await this.http.patch(`/marketing/lists/${listId}`, { name });
    return response.data;
  }

  async deleteList(listId: string, deleteContacts?: boolean) {
    let response = await this.http.delete(`/marketing/lists/${listId}`, {
      params: { delete_contacts: deleteContacts ? 'true' : 'false' }
    });
    return response.data;
  }

  async addContactsToList(listId: string, contactIds: string[]) {
    let response = await this.http.put(`/marketing/lists/${listId}/contacts`, {
      contact_ids: contactIds
    });
    return response.data;
  }

  async removeContactsFromList(listId: string, contactIds: string[]) {
    let response = await this.http.delete(`/marketing/lists/${listId}/contacts`, {
      params: { contact_ids: contactIds.join(',') }
    });
    return response.data;
  }

  // ---- Templates ----

  async getTemplates(generations?: string, pageSize?: number) {
    let response = await this.http.get('/templates', {
      params: { generations, page_size: pageSize }
    });
    return response.data;
  }

  async createTemplate(name: string, generation?: string) {
    let response = await this.http.post('/templates', {
      name,
      generation: generation || 'dynamic'
    });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.http.get(`/templates/${templateId}`);
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
    version: {
      name: string;
      subject?: string;
      htmlContent?: string;
      plainContent?: string;
      active?: number;
      testData?: string;
    }
  ) {
    let body: Record<string, any> = { name: version.name };
    if (version.subject) body.subject = version.subject;
    if (version.htmlContent) body.html_content = version.htmlContent;
    if (version.plainContent) body.plain_content = version.plainContent;
    if (version.active !== undefined) body.active = version.active;
    if (version.testData) body.test_data = version.testData;

    let response = await this.http.post(`/templates/${templateId}/versions`, body);
    return response.data;
  }

  // ---- Suppressions ----

  async getSuppressionGroups() {
    let response = await this.http.get('/asm/groups');
    return response.data;
  }

  async getGlobalSuppressions(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number
  ) {
    let response = await this.http.get('/suppression/unsubscribes', {
      params: { start_time: startTime, end_time: endTime, limit, offset }
    });
    return response.data;
  }

  async addGlobalSuppression(emails: string[]) {
    let response = await this.http.post('/asm/suppressions/global', {
      recipient_emails: emails
    });
    return response.data;
  }

  async removeGlobalSuppression(email: string) {
    await this.http.delete(`/asm/suppressions/global/${email}`);
  }

  async getGroupSuppressions(groupId: number) {
    let response = await this.http.get(`/asm/groups/${groupId}/suppressions`);
    return response.data;
  }

  async addGroupSuppression(groupId: number, emails: string[]) {
    let response = await this.http.post(`/asm/groups/${groupId}/suppressions`, {
      recipient_emails: emails
    });
    return response.data;
  }

  async removeGroupSuppression(groupId: number, email: string) {
    await this.http.delete(`/asm/groups/${groupId}/suppressions/${email}`);
  }

  async getBounces(startTime?: number, endTime?: number, limit?: number, offset?: number) {
    let response = await this.http.get('/suppression/bounces', {
      params: { start_time: startTime, end_time: endTime, limit, offset }
    });
    return response.data;
  }

  async getBlocks(startTime?: number, endTime?: number, limit?: number, offset?: number) {
    let response = await this.http.get('/suppression/blocks', {
      params: { start_time: startTime, end_time: endTime, limit, offset }
    });
    return response.data;
  }

  async getSpamReports(startTime?: number, endTime?: number, limit?: number, offset?: number) {
    let response = await this.http.get('/suppression/spam_reports', {
      params: { start_time: startTime, end_time: endTime, limit, offset }
    });
    return response.data;
  }

  async getInvalidEmails(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number
  ) {
    let response = await this.http.get('/suppression/invalid_emails', {
      params: { start_time: startTime, end_time: endTime, limit, offset }
    });
    return response.data;
  }

  // ---- Statistics ----

  async getGlobalStats(startDate: string, endDate?: string, aggregatedBy?: string) {
    let response = await this.http.get('/stats', {
      params: { start_date: startDate, end_date: endDate, aggregated_by: aggregatedBy }
    });
    return response.data;
  }

  async getCategoryStats(
    categories: string[],
    startDate: string,
    endDate?: string,
    aggregatedBy?: string
  ) {
    let response = await this.http.get('/categories/stats', {
      params: {
        categories: categories.join(','),
        start_date: startDate,
        end_date: endDate,
        aggregated_by: aggregatedBy
      }
    });
    return response.data;
  }

  // ---- Email Validation ----

  async validateEmail(email: string, source?: string) {
    let body: Record<string, any> = { email };
    if (source) body.source = source;
    let response = await this.http.post('/validations/email', body);
    return response.data;
  }

  // ---- Sender Authentication ----

  async getAuthenticatedDomains(limit?: number, offset?: number) {
    let response = await this.http.get('/whitelabel/domains', {
      params: { limit, offset }
    });
    return response.data;
  }

  async authenticateDomain(domain: string, subdomain?: string, automaticSecurity?: boolean) {
    let body: Record<string, any> = { domain };
    if (subdomain) body.subdomain = subdomain;
    if (automaticSecurity !== undefined) body.automatic_security = automaticSecurity;
    let response = await this.http.post('/whitelabel/domains', body);
    return response.data;
  }

  async validateDomain(domainId: number) {
    let response = await this.http.post(`/whitelabel/domains/${domainId}/validate`);
    return response.data;
  }

  async getBrandedLinks(limit?: number, offset?: number) {
    let response = await this.http.get('/whitelabel/links', {
      params: { limit, offset }
    });
    return response.data;
  }

  // ---- Event Webhook ----

  async getEventWebhookSettings() {
    let response = await this.http.get('/user/webhooks/event/settings');
    return response.data;
  }

  async updateEventWebhookSettings(settings: {
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
  }) {
    let body: Record<string, any> = {
      enabled: settings.enabled,
      url: settings.url
    };
    if (settings.groupResubscribe !== undefined)
      body.group_resubscribe = settings.groupResubscribe;
    if (settings.delivered !== undefined) body.delivered = settings.delivered;
    if (settings.groupUnsubscribe !== undefined)
      body.group_unsubscribe = settings.groupUnsubscribe;
    if (settings.spamReport !== undefined) body.spam_report = settings.spamReport;
    if (settings.bounce !== undefined) body.bounce = settings.bounce;
    if (settings.deferred !== undefined) body.deferred = settings.deferred;
    if (settings.unsubscribe !== undefined) body.unsubscribe = settings.unsubscribe;
    if (settings.processed !== undefined) body.processed = settings.processed;
    if (settings.open !== undefined) body.open = settings.open;
    if (settings.click !== undefined) body.click = settings.click;
    if (settings.dropped !== undefined) body.dropped = settings.dropped;

    let response = await this.http.patch('/user/webhooks/event/settings', body);
    return response.data;
  }

  // ---- Inbound Parse ----

  async getInboundParseSettings() {
    let response = await this.http.get('/user/webhooks/parse/settings');
    return response.data;
  }
}
