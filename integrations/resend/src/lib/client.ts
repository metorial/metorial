import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { resendApiError } from './errors';

type EmailTemplate = {
  id: string;
  variables?: Record<string, string | number>;
};

type AttachmentMetadata = {
  id: string;
  filename?: string;
  size?: number;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
  download_url?: string;
  expires_at?: string;
};

type AutomationStep = {
  key: string;
  type: string;
  config?: Record<string, unknown>;
};

type AutomationConnection = {
  from: string;
  to: string;
};

type EventSchema = Record<string, 'string' | 'number' | 'boolean' | 'date'>;

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.resend.com',
      authHeader: {
        value: `Bearer ${config.token}`
      },
      headers: {
        'User-Agent': 'slates-resend/0.2.0-rc.6'
      },
      errorAdapter: resendApiError
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
    template?: EmailTemplate;
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
        template: params.template,
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
      template?: EmailTemplate;
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
      template: e.template,
      scheduled_at: e.scheduledAt
    }));
    let res = await this.axios.post('/emails/batch', body, { headers });
    return res.data;
  }

  async getEmail(emailId: string) {
    let res = await this.axios.get(`/emails/${emailId}`);
    return res.data;
  }

  async listSentEmails(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/emails', { params });
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

  async listEmailAttachments(emailId: string) {
    let res = await this.axios.get(`/emails/${emailId}/attachments`);
    return res.data;
  }

  async getEmailAttachment(emailId: string, attachmentId: string) {
    let res = await this.axios.get(`/emails/${emailId}/attachments/${attachmentId}`);
    return res.data as AttachmentMetadata;
  }

  async downloadAttachment(downloadUrl: string) {
    try {
      let response = await fetch(downloadUrl);
      if (!response.ok) {
        throw createApiServiceError(
          `Resend attachment download failed: HTTP ${response.status} ${response.statusText}`.trim()
        );
      }

      let contentType = response.headers.get('content-type') ?? 'application/octet-stream';
      let buffer = Buffer.from(await response.arrayBuffer());

      return {
        contentBase64: buffer.toString('base64'),
        contentType,
        size: buffer.byteLength
      };
    } catch (error) {
      throw resendApiError(error, 'download attachment');
    }
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
    return res.data as AttachmentMetadata;
  }

  async listReceivedEmailAttachments(emailId: string) {
    let res = await this.axios.get(`/emails/receiving/${emailId}/attachments`);
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
    segments?: string[];
    topics?: Array<{ id: string; subscription: 'opt_in' | 'opt_out' }>;
  }) {
    let res = await this.axios.post('/contacts', {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      unsubscribed: params.unsubscribed,
      properties: params.properties,
      segments: params.segments?.map(id => ({ id })),
      topics: params.topics
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

  async addContactToSegment(contactIdOrEmail: string, segmentId: string) {
    let res = await this.axios.post(`/contacts/${contactIdOrEmail}/segments/${segmentId}`);
    return res.data;
  }

  async listContactSegments(contactIdOrEmail: string) {
    let res = await this.axios.get(`/contacts/${contactIdOrEmail}/segments`);
    return res.data;
  }

  async removeContactFromSegment(contactIdOrEmail: string, segmentId: string) {
    let res = await this.axios.delete(`/contacts/${contactIdOrEmail}/segments/${segmentId}`);
    return res.data;
  }

  async listContactTopics(contactIdOrEmail: string) {
    let res = await this.axios.get(`/contacts/${contactIdOrEmail}/topics`);
    return res.data;
  }

  async updateContactTopics(
    contactIdOrEmail: string,
    params: { topics: Array<{ id: string; subscription: 'opt_in' | 'opt_out' }> }
  ) {
    let res = await this.axios.patch(`/contacts/${contactIdOrEmail}/topics`, {
      topics: params.topics
    });
    return res.data;
  }

  // ── Contact Properties ─────────────────────────────────

  async createContactProperty(params: {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    fallbackValue?: string | number | boolean;
  }) {
    let res = await this.axios.post('/contact-properties', {
      key: params.key,
      type: params.type,
      fallback_value: params.fallbackValue
    });
    return res.data;
  }

  async getContactProperty(contactPropertyId: string) {
    let res = await this.axios.get(`/contact-properties/${contactPropertyId}`);
    return res.data;
  }

  async updateContactProperty(
    contactPropertyId: string,
    params: { fallbackValue?: string | number | boolean | null }
  ) {
    let res = await this.axios.patch(`/contact-properties/${contactPropertyId}`, {
      fallback_value: params.fallbackValue
    });
    return res.data;
  }

  async listContactProperties(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/contact-properties', { params });
    return res.data;
  }

  async deleteContactProperty(contactPropertyId: string) {
    let res = await this.axios.delete(`/contact-properties/${contactPropertyId}`);
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

  async updateBroadcast(
    broadcastId: string,
    params: {
      from?: string;
      subject?: string;
      html?: string;
      text?: string;
      name?: string;
    }
  ) {
    let res = await this.axios.patch(`/broadcasts/${broadcastId}`, {
      from: params.from,
      subject: params.subject,
      html: params.html,
      text: params.text,
      name: params.name
    });
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

  // ── Automations ────────────────────────────────────────

  async createAutomation(params: {
    name: string;
    status?: 'enabled' | 'disabled';
    steps?: AutomationStep[];
    connections?: AutomationConnection[];
  }) {
    let res = await this.axios.post('/automations', {
      name: params.name,
      status: params.status,
      steps: params.steps,
      connections: params.connections
    });
    return res.data;
  }

  async updateAutomation(
    automationId: string,
    params: {
      name?: string;
      status?: 'enabled' | 'disabled';
      steps?: AutomationStep[];
      connections?: AutomationConnection[];
    }
  ) {
    let res = await this.axios.patch(`/automations/${automationId}`, {
      name: params.name,
      status: params.status,
      steps: params.steps,
      connections: params.connections
    });
    return res.data;
  }

  async getAutomation(automationId: string) {
    let res = await this.axios.get(`/automations/${automationId}`);
    return res.data;
  }

  async listAutomations(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/automations', { params });
    return res.data;
  }

  async stopAutomation(automationId: string) {
    let res = await this.axios.post(`/automations/${automationId}/stop`);
    return res.data;
  }

  async deleteAutomation(automationId: string) {
    let res = await this.axios.delete(`/automations/${automationId}`);
    return res.data;
  }

  async listAutomationRuns(
    automationId: string,
    params?: { status?: string; limit?: number; after?: string; before?: string }
  ) {
    let res = await this.axios.get(`/automations/${automationId}/runs`, { params });
    return res.data;
  }

  async getAutomationRun(automationId: string, runId: string) {
    let res = await this.axios.get(`/automations/${automationId}/runs/${runId}`);
    return res.data;
  }

  // ── Events ──────────────────────────────────────────────

  async createEvent(params: { name: string; schema?: EventSchema }) {
    let res = await this.axios.post('/events', {
      name: params.name,
      schema: params.schema
    });
    return res.data;
  }

  async sendEvent(params: {
    event: string;
    contactId?: string;
    email?: string;
    payload?: Record<string, unknown>;
  }) {
    let res = await this.axios.post('/events/send', {
      event: params.event,
      contact_id: params.contactId,
      email: params.email,
      payload: params.payload
    });
    return res.data;
  }

  async getEvent(eventIdOrName: string) {
    let res = await this.axios.get(`/events/${eventIdOrName}`);
    return res.data;
  }

  async updateEvent(eventIdOrName: string, params: { schema: EventSchema | null }) {
    let res = await this.axios.patch(`/events/${eventIdOrName}`, {
      schema: params.schema
    });
    return res.data;
  }

  async listEvents(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/events', { params });
    return res.data;
  }

  async deleteEvent(eventIdOrName: string) {
    let res = await this.axios.delete(`/events/${eventIdOrName}`);
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

  // ── Logs ───────────────────────────────────────────────

  async listLogs(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/logs', { params });
    return res.data;
  }

  async getLog(logId: string) {
    let res = await this.axios.get(`/logs/${logId}`);
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

  async listSegmentContacts(
    segmentId: string,
    params?: { limit?: number; after?: string; before?: string }
  ) {
    let res = await this.axios.get(`/segments/${segmentId}/contacts`, { params });
    return res.data;
  }

  // ── Topics ─────────────────────────────────────────────

  async createTopic(params: {
    name: string;
    description?: string;
    defaultSubscription?: 'opt_in' | 'opt_out';
  }) {
    let res = await this.axios.post('/topics', {
      name: params.name,
      description: params.description,
      default_subscription: params.defaultSubscription
    });
    return res.data;
  }

  async getTopic(topicId: string) {
    let res = await this.axios.get(`/topics/${topicId}`);
    return res.data;
  }

  async updateTopic(topicId: string, params: { name?: string; description?: string }) {
    let res = await this.axios.patch(`/topics/${topicId}`, {
      name: params.name,
      description: params.description
    });
    return res.data;
  }

  async listTopics(params?: { limit?: number; after?: string; before?: string }) {
    let res = await this.axios.get('/topics', { params });
    return res.data;
  }

  async deleteTopic(topicId: string) {
    let res = await this.axios.delete(`/topics/${topicId}`);
    return res.data;
  }
}
