import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.resend.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Emails ──────────────────────────────────────────────

  async sendEmail(params: {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
    headers?: Record<string, string>;
    attachments?: Array<{
      content?: string;
      filename?: string;
      path?: string;
      contentType?: string;
    }>;
    tags?: Array<{ name: string; value: string }>;
    scheduledAt?: string;
    idempotencyKey?: string;
  }) {
    let headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }
    let res = await this.axios.post(
      '/emails',
      {
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        headers: params.headers,
        attachments: params.attachments?.map(a => ({
          content: a.content,
          filename: a.filename,
          path: a.path,
          content_type: a.contentType
        })),
        tags: params.tags,
        scheduled_at: params.scheduledAt
      },
      { headers }
    );
    return res.data;
  }

  async sendBatchEmails(params: {
    emails: Array<{
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      cc?: string | string[];
      bcc?: string | string[];
      replyTo?: string | string[];
      headers?: Record<string, string>;
      tags?: Array<{ name: string; value: string }>;
      scheduledAt?: string;
    }>;
    idempotencyKey?: string;
  }) {
    let headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }
    let body = params.emails.map(e => ({
      from: e.from,
      to: e.to,
      subject: e.subject,
      html: e.html,
      text: e.text,
      cc: e.cc,
      bcc: e.bcc,
      reply_to: e.replyTo,
      headers: e.headers,
      tags: e.tags,
      scheduled_at: e.scheduledAt
    }));
    let res = await this.axios.post('/emails/batch', body, { headers });
    return res.data;
  }

  async getEmail(emailId: string) {
    let res = await this.axios.get(`/emails/${emailId}`);
    return res.data;
  }

  async updateEmail(emailId: string, params: { scheduledAt: string }) {
    let res = await this.axios.patch(`/emails/${emailId}`, {
      scheduled_at: params.scheduledAt
    });
    return res.data;
  }

  async cancelEmail(emailId: string) {
    let res = await this.axios.post(`/emails/${emailId}/cancel`);
    return res.data;
  }

  // ── Received Emails ─────────────────────────────────────

  async listReceivedEmails(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/emails/receiving', { params });
    return res.data;
  }

  async getReceivedEmail(emailId: string) {
    let res = await this.axios.get(`/emails/receiving/${emailId}`);
    return res.data;
  }

  async getReceivedEmailAttachment(emailId: string, attachmentId: string) {
    let res = await this.axios.get(`/emails/receiving/${emailId}/attachments/${attachmentId}`);
    return res.data;
  }

  // ── Domains ─────────────────────────────────────────────

  async createDomain(params: {
    name: string;
    region?: string;
    customReturnPath?: string;
    openTracking?: boolean;
    clickTracking?: boolean;
    tls?: string;
  }) {
    let res = await this.axios.post('/domains', {
      name: params.name,
      region: params.region,
      custom_return_path: params.customReturnPath,
      open_tracking: params.openTracking,
      click_tracking: params.clickTracking,
      tls: params.tls
    });
    return res.data;
  }

  async getDomain(domainId: string) {
    let res = await this.axios.get(`/domains/${domainId}`);
    return res.data;
  }

  async updateDomain(
    domainId: string,
    params: {
      openTracking?: boolean;
      clickTracking?: boolean;
      tls?: string;
    }
  ) {
    let res = await this.axios.patch(`/domains/${domainId}`, {
      open_tracking: params.openTracking,
      click_tracking: params.clickTracking,
      tls: params.tls
    });
    return res.data;
  }

  async listDomains(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/domains', { params });
    return res.data;
  }

  async verifyDomain(domainId: string) {
    let res = await this.axios.post(`/domains/${domainId}/verify`);
    return res.data;
  }

  async deleteDomain(domainId: string) {
    let res = await this.axios.delete(`/domains/${domainId}`);
    return res.data;
  }

  // ── Contacts ────────────────────────────────────────────

  async createContact(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    unsubscribed?: boolean;
    properties?: Record<string, string>;
  }) {
    let res = await this.axios.post('/contacts', {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      unsubscribed: params.unsubscribed,
      properties: params.properties
    });
    return res.data;
  }

  async getContact(contactIdOrEmail: string) {
    let res = await this.axios.get(`/contacts/${contactIdOrEmail}`);
    return res.data;
  }

  async updateContact(
    contactIdOrEmail: string,
    params: {
      firstName?: string;
      lastName?: string;
      unsubscribed?: boolean;
      properties?: Record<string, string>;
    }
  ) {
    let res = await this.axios.patch(`/contacts/${contactIdOrEmail}`, {
      first_name: params.firstName,
      last_name: params.lastName,
      unsubscribed: params.unsubscribed,
      properties: params.properties
    });
    return res.data;
  }

  async listContacts(params?: {
    segmentId?: string;
    limit?: number;
    after?: string;
    before?: string;
  }) {
    let res = await this.axios.get('/contacts', {
      params: {
        segment_id: params?.segmentId,
        limit: params?.limit,
        after: params?.after,
        before: params?.before
      }
    });
    return res.data;
  }

  async deleteContact(contactIdOrEmail: string) {
    let res = await this.axios.delete(`/contacts/${contactIdOrEmail}`);
    return res.data;
  }

  // ── Audiences ───────────────────────────────────────────

  async createAudience(name: string) {
    let res = await this.axios.post('/audiences', { name });
    return res.data;
  }

  async getAudience(audienceId: string) {
    let res = await this.axios.get(`/audiences/${audienceId}`);
    return res.data;
  }

  async listAudiences(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/audiences', { params });
    return res.data;
  }

  async deleteAudience(audienceId: string) {
    let res = await this.axios.delete(`/audiences/${audienceId}`);
    return res.data;
  }

  // ── Broadcasts ──────────────────────────────────────────

  async createBroadcast(params: {
    segmentId: string;
    from: string;
    subject: string;
    replyTo?: string | string[];
    html?: string;
    text?: string;
    name?: string;
    topicId?: string;
    send?: boolean;
    scheduledAt?: string;
  }) {
    let res = await this.axios.post('/broadcasts', {
      segment_id: params.segmentId,
      from: params.from,
      subject: params.subject,
      reply_to: params.replyTo,
      html: params.html,
      text: params.text,
      name: params.name,
      topic_id: params.topicId,
      send: params.send,
      scheduled_at: params.scheduledAt
    });
    return res.data;
  }

  async getBroadcast(broadcastId: string) {
    let res = await this.axios.get(`/broadcasts/${broadcastId}`);
    return res.data;
  }

  async sendBroadcast(broadcastId: string, params?: { scheduledAt?: string }) {
    let res = await this.axios.post(`/broadcasts/${broadcastId}/send`, {
      scheduled_at: params?.scheduledAt
    });
    return res.data;
  }

  async listBroadcasts(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/broadcasts', { params });
    return res.data;
  }

  async deleteBroadcast(broadcastId: string) {
    let res = await this.axios.delete(`/broadcasts/${broadcastId}`);
    return res.data;
  }

  // ── Templates ───────────────────────────────────────────

  async createTemplate(params: {
    name: string;
    html: string;
    alias?: string;
    from?: string;
    subject?: string;
    replyTo?: string | string[];
    text?: string;
  }) {
    let res = await this.axios.post('/templates', {
      name: params.name,
      html: params.html,
      alias: params.alias,
      from: params.from,
      subject: params.subject,
      reply_to: params.replyTo,
      text: params.text
    });
    return res.data;
  }

  async getTemplate(templateIdOrAlias: string) {
    let res = await this.axios.get(`/templates/${templateIdOrAlias}`);
    return res.data;
  }

  async updateTemplate(
    templateId: string,
    params: {
      name?: string;
      html?: string;
      alias?: string;
      from?: string;
      subject?: string;
      replyTo?: string | string[];
      text?: string;
    }
  ) {
    let res = await this.axios.patch(`/templates/${templateId}`, {
      name: params.name,
      html: params.html,
      alias: params.alias,
      from: params.from,
      subject: params.subject,
      reply_to: params.replyTo,
      text: params.text
    });
    return res.data;
  }

  async listTemplates(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/templates', { params });
    return res.data;
  }

  async publishTemplate(templateIdOrAlias: string) {
    let res = await this.axios.post(`/templates/${templateIdOrAlias}/publish`);
    return res.data;
  }

  async duplicateTemplate(templateId: string) {
    let res = await this.axios.post(`/templates/${templateId}/duplicate`);
    return res.data;
  }

  async deleteTemplate(templateIdOrAlias: string) {
    let res = await this.axios.delete(`/templates/${templateIdOrAlias}`);
    return res.data;
  }

  // ── API Keys ────────────────────────────────────────────

  async createApiKey(params: { name: string; permission?: string; domainId?: string }) {
    let res = await this.axios.post('/api-keys', {
      name: params.name,
      permission: params.permission,
      domain_id: params.domainId
    });
    return res.data;
  }

  async listApiKeys(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/api-keys', { params });
    return res.data;
  }

  async deleteApiKey(apiKeyId: string) {
    let res = await this.axios.delete(`/api-keys/${apiKeyId}`);
    return res.data;
  }

  // ── Webhooks ────────────────────────────────────────────

  async createWebhook(params: { endpoint: string; events: string[] }) {
    let res = await this.axios.post('/webhooks', {
      endpoint: params.endpoint,
      events: params.events
    });
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      endpoint?: string;
      events?: string[];
      status?: string;
    }
  ) {
    let res = await this.axios.patch(`/webhooks/${webhookId}`, {
      endpoint: params.endpoint,
      events: params.events,
      status: params.status
    });
    return res.data;
  }

  async listWebhooks(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/webhooks', { params });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  // ── Segments ────────────────────────────────────────────

  async createSegment(name: string) {
    let res = await this.axios.post('/segments', { name });
    return res.data;
  }

  async getSegment(segmentId: string) {
    let res = await this.axios.get(`/segments/${segmentId}`);
    return res.data;
  }

  async listSegments(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/segments', { params });
    return res.data;
  }

  async deleteSegment(segmentId: string) {
    let res = await this.axios.delete(`/segments/${segmentId}`);
    return res.data;
  }
}
