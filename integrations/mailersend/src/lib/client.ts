import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.mailersend.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Email ----

  async sendEmail(params: {
    from: { email: string; name?: string };
    to: Array<{ email: string; name?: string }>;
    subject?: string;
    text?: string;
    html?: string;
    templateId?: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    replyTo?: { email: string; name?: string };
    attachments?: Array<{
      filename: string;
      content: string;
      disposition?: string;
      id?: string;
    }>;
    tags?: string[];
    personalization?: Array<{ email: string; data: Record<string, unknown> }>;
    variables?: Array<{ email: string; substitutions: Array<{ var: string; value: string }> }>;
    sendAt?: number;
    settings?: {
      trackClicks?: boolean;
      trackOpens?: boolean;
      trackContent?: boolean;
    };
    headers?: Array<{ name: string; value: string }>;
    inReplyTo?: string;
    references?: string[];
  }) {
    let body: Record<string, unknown> = {
      from: params.from,
      to: params.to
    };

    if (params.subject) body.subject = params.subject;
    if (params.text) body.text = params.text;
    if (params.html) body.html = params.html;
    if (params.templateId) body.template_id = params.templateId;
    if (params.cc) body.cc = params.cc;
    if (params.bcc) body.bcc = params.bcc;
    if (params.replyTo) body.reply_to = params.replyTo;
    if (params.tags) body.tags = params.tags;
    if (params.sendAt) body.send_at = params.sendAt;
    if (params.inReplyTo) body.in_reply_to = params.inReplyTo;
    if (params.references) body.references = params.references;

    if (params.attachments) {
      body.attachments = params.attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        disposition: a.disposition || 'attachment',
        id: a.id
      }));
    }

    if (params.personalization) {
      body.personalization = params.personalization;
    }

    if (params.variables) {
      body.variables = params.variables;
    }

    if (params.settings) {
      body.settings = {
        track_clicks: params.settings.trackClicks,
        track_opens: params.settings.trackOpens,
        track_content: params.settings.trackContent
      };
    }

    if (params.headers) {
      body.headers = params.headers;
    }

    let response = await this.axios.post('/email', body, {
      validateStatus: () => true
    });

    let messageId = response.headers?.['x-message-id'] as string | undefined;

    return {
      statusCode: response.status as number,
      messageId: messageId || null,
      warnings: response.data || null
    };
  }

  async sendBulkEmail(messages: Record<string, unknown>[]) {
    let response = await this.axios.post('/bulk-email', messages);
    return response.data as { message: string; bulk_email_id: string };
  }

  async getBulkEmailStatus(bulkEmailId: string) {
    let response = await this.axios.get(`/bulk-email/${bulkEmailId}`);
    return response.data as { data: Record<string, unknown> };
  }

  // ---- SMS ----

  async sendSms(params: {
    from: string;
    to: string[];
    text: string;
    personalization?: Array<{ phone_number: string; data: Record<string, unknown> }>;
  }) {
    let response = await this.axios.post('/sms', params, {
      validateStatus: () => true
    });

    let smsMessageId = response.headers?.['x-sms-message-id'] as string | undefined;

    return {
      statusCode: response.status as number,
      smsMessageId: smsMessageId || null
    };
  }

  // ---- Templates ----

  async listTemplates(params?: { domainId?: string; page?: number; limit?: number }) {
    let response = await this.axios.get('/templates', {
      params: {
        domain_id: params?.domainId,
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async deleteTemplate(templateId: string) {
    await this.axios.delete(`/templates/${templateId}`);
  }

  // ---- Domains ----

  async listDomains(params?: { page?: number; limit?: number; verified?: boolean }) {
    let response = await this.axios.get('/domains', {
      params: {
        page: params?.page,
        limit: params?.limit,
        verified: params?.verified
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async getDomain(domainId: string) {
    let response = await this.axios.get(`/domains/${domainId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async createDomain(params: {
    name: string;
    returnPathSubdomain?: string;
    customTrackingSubdomain?: string;
    inboundRoutingSubdomain?: string;
  }) {
    let response = await this.axios.post('/domains', {
      name: params.name,
      return_path_subdomain: params.returnPathSubdomain,
      custom_tracking_subdomain: params.customTrackingSubdomain,
      inbound_routing_subdomain: params.inboundRoutingSubdomain
    });
    return response.data as { data: Record<string, unknown> };
  }

  async deleteDomain(domainId: string) {
    await this.axios.delete(`/domains/${domainId}`);
  }

  async getDomainDnsRecords(domainId: string) {
    let response = await this.axios.get(`/domains/${domainId}/dns-records`);
    return response.data as { data: Record<string, unknown>[] };
  }

  async verifyDomain(domainId: string) {
    let response = await this.axios.get(`/domains/${domainId}/verify`);
    return response.data as { data: Record<string, unknown> };
  }

  async updateDomainSettings(domainId: string, settings: Record<string, unknown>) {
    let response = await this.axios.put(`/domains/${domainId}/settings`, settings);
    return response.data as { data: Record<string, unknown> };
  }

  // ---- Sender Identities ----

  async listIdentities(params?: { domainId?: string; page?: number; limit?: number }) {
    let response = await this.axios.get('/identities', {
      params: {
        domain_id: params?.domainId,
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async getIdentity(identityId: string) {
    let response = await this.axios.get(`/identities/${identityId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async getIdentityByEmail(email: string) {
    let response = await this.axios.get(`/identities/email/${email}`);
    return response.data as { data: Record<string, unknown> };
  }

  async createIdentity(params: {
    domainId: string;
    email: string;
    name: string;
    replyToEmail?: string;
    replyToName?: string;
    addNote?: boolean;
    personalNote?: string;
  }) {
    let response = await this.axios.post('/identities', {
      domain_id: params.domainId,
      email: params.email,
      name: params.name,
      reply_to_email: params.replyToEmail,
      reply_to_name: params.replyToName,
      add_note: params.addNote,
      personal_note: params.personalNote
    });
    return response.data as { data: Record<string, unknown> };
  }

  async updateIdentity(
    identityId: string,
    params: {
      name?: string;
      replyToEmail?: string;
      replyToName?: string;
      addNote?: boolean;
      personalNote?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.replyToEmail !== undefined) body.reply_to_email = params.replyToEmail;
    if (params.replyToName !== undefined) body.reply_to_name = params.replyToName;
    if (params.addNote !== undefined) body.add_note = params.addNote;
    if (params.personalNote !== undefined) body.personal_note = params.personalNote;

    let response = await this.axios.put(`/identities/${identityId}`, body);
    return response.data as { data: Record<string, unknown> };
  }

  async deleteIdentity(identityId: string) {
    await this.axios.delete(`/identities/${identityId}`);
  }

  // ---- Email Verification ----

  async verifySingleEmail(email: string) {
    let response = await this.axios.post('/email-verification/verify', { email });
    return response.data as { data: Record<string, unknown> };
  }

  async createVerificationList(params: { name: string; emails: string[] }) {
    let response = await this.axios.post('/email-verification', {
      name: params.name,
      emails: params.emails
    });
    return response.data as { data: Record<string, unknown> };
  }

  async listVerificationLists(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/email-verification', {
      params: {
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async getVerificationList(listId: string) {
    let response = await this.axios.get(`/email-verification/${listId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async startVerificationList(listId: string) {
    let response = await this.axios.get(`/email-verification/${listId}/verify`);
    return response.data as { data: Record<string, unknown> };
  }

  async getVerificationListResults(
    listId: string,
    params?: { page?: number; limit?: number; results?: string[] }
  ) {
    let response = await this.axios.get(`/email-verification/${listId}/results`, {
      params: {
        page: params?.page,
        limit: params?.limit,
        'results[]': params?.results
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  // ---- Activity ----

  async listActivity(
    domainId: string,
    params: {
      dateFrom: number;
      dateTo: number;
      page?: number;
      limit?: number;
      events?: string[];
    }
  ) {
    let queryParams: Record<string, unknown> = {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      page: params.page,
      limit: params.limit
    };

    if (params.events && params.events.length > 0) {
      queryParams['event[]'] = params.events;
    }

    let response = await this.axios.get(`/activity/${domainId}`, {
      params: queryParams
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  // ---- Recipients ----

  async listRecipients(params?: { domainId?: string; page?: number; limit?: number }) {
    let response = await this.axios.get('/recipients', {
      params: {
        domain_id: params?.domainId,
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async getRecipient(recipientId: string) {
    let response = await this.axios.get(`/recipients/${recipientId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async deleteRecipient(recipientId: string) {
    await this.axios.delete(`/recipients/${recipientId}`);
  }

  // ---- Suppressions ----

  async getSuppressionList(
    type: 'blocklist' | 'hard-bounces' | 'spam-complaints' | 'unsubscribes',
    params?: {
      domainId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    let response = await this.axios.get(`/suppressions/${type}`, {
      params: {
        domain_id: params?.domainId,
        page: params?.page,
        limit: params?.limit
      }
    });
    return response.data as {
      data: Record<string, unknown>[];
      meta: Record<string, unknown>;
    };
  }

  async addToSuppressionList(
    type: 'blocklist' | 'hard-bounces' | 'spam-complaints' | 'unsubscribes',
    params: {
      domainId: string;
      recipients?: string[];
      patterns?: string[];
    }
  ) {
    let body: Record<string, unknown> = {
      domain_id: params.domainId
    };
    if (params.recipients) body.recipients = params.recipients;
    if (params.patterns) body.patterns = params.patterns;

    let response = await this.axios.post(`/suppressions/${type}`, body);
    return response.data as { data: Record<string, unknown>[] };
  }

  async deleteFromSuppressionList(
    type: 'blocklist' | 'hard-bounces' | 'spam-complaints' | 'unsubscribes',
    params: {
      ids?: string[];
      all?: boolean;
      domainId?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (params.ids) body.ids = params.ids;
    if (params.all) body.all = params.all;
    if (params.domainId) body.domain_id = params.domainId;

    await this.axios.delete(`/suppressions/${type}`, { data: body });
  }

  // ---- Webhooks ----

  async listWebhooks(domainId: string) {
    let response = await this.axios.get('/webhooks', {
      params: { domain_id: domainId }
    });
    return response.data as { data: Record<string, unknown>[] };
  }

  async createWebhook(params: {
    url: string;
    name: string;
    events: string[];
    domainId: string;
    enabled?: boolean;
  }) {
    let response = await this.axios.post('/webhooks', {
      url: params.url,
      name: params.name,
      events: params.events,
      domain_id: params.domainId,
      enabled: params.enabled ?? true
    });
    return response.data as { data: Record<string, unknown> };
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data as { data: Record<string, unknown> };
  }

  async updateWebhook(
    webhookId: string,
    params: {
      url?: string;
      name?: string;
      events?: string[];
      enabled?: boolean;
    }
  ) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, params);
    return response.data as { data: Record<string, unknown> };
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ---- SMS Webhooks ----

  async listSmsWebhooks(smsNumberId: string) {
    let response = await this.axios.get('/sms-webhooks', {
      params: { sms_number_id: smsNumberId }
    });
    return response.data as { data: Record<string, unknown>[] };
  }

  async createSmsWebhook(params: {
    url: string;
    name: string;
    events: string[];
    smsNumberId: string;
    enabled?: boolean;
  }) {
    let response = await this.axios.post('/sms-webhooks', {
      url: params.url,
      name: params.name,
      events: params.events,
      sms_number_id: params.smsNumberId,
      enabled: params.enabled ?? true
    });
    return response.data as { data: Record<string, unknown> };
  }

  async deleteSmsWebhook(smsWebhookId: string) {
    await this.axios.delete(`/sms-webhooks/${smsWebhookId}`);
  }
}
