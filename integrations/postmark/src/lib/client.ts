import { createAxios } from 'slates';

let postmarkAxios = createAxios({
  baseURL: 'https://api.postmarkapp.com'
});

export interface PostmarkAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentID?: string;
}

export interface PostmarkHeader {
  Name: string;
  Value: string;
}

export interface SendEmailParams {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  tag?: string;
  trackOpens?: boolean;
  trackLinks?: string;
  messageStream?: string;
  headers?: Array<{ name: string; value: string }>;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
    contentId?: string;
  }>;
  metadata?: Record<string, string>;
}

export interface SendEmailResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

export interface SendTemplateEmailParams {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  templateId?: number;
  templateAlias?: string;
  templateModel: Record<string, any>;
  replyTo?: string;
  tag?: string;
  trackOpens?: boolean;
  trackLinks?: string;
  messageStream?: string;
  headers?: Array<{ name: string; value: string }>;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
    contentId?: string;
  }>;
  metadata?: Record<string, string>;
}

export interface BounceRecord {
  ID: number;
  Type: string;
  TypeCode: number;
  Name: string;
  Tag: string;
  MessageID: string;
  ServerID: number;
  Description: string;
  Details: string;
  Email: string;
  From: string;
  BouncedAt: string;
  DumpAvailable: boolean;
  Inactive: boolean;
  CanActivate: boolean;
  Subject: string;
  Content?: string;
  MessageStream: string;
  RecordType: string;
}

export interface TemplateRecord {
  TemplateId: number;
  Name: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
  AssociatedServerId: number;
  Active: boolean;
  Alias: string | null;
  TemplateType: string;
  LayoutTemplate: string | null;
}

export interface MessageStreamRecord {
  ID: string;
  ServerID: number;
  Name: string;
  Description: string;
  MessageStreamType: string;
  CreatedAt: string;
  UpdatedAt: string;
  ArchivedAt: string | null;
  ExpectedPurgeDate: string | null;
  SubscriptionManagementConfiguration: {
    UnsubscribeHandlingType: string;
  };
}

export interface WebhookRecord {
  ID: number;
  Url: string;
  MessageStream: string;
  HttpAuth: { Username: string; Password: string } | null;
  HttpHeaders: Array<{ Name: string; Value: string }>;
  Triggers: {
    Open: { Enabled: boolean; PostFirstOpenOnly: boolean };
    Click: { Enabled: boolean };
    Delivery: { Enabled: boolean };
    Bounce: { Enabled: boolean; IncludeContent: boolean };
    SpamComplaint: { Enabled: boolean; IncludeContent: boolean };
    SubscriptionChange: { Enabled: boolean };
  };
}

export interface OutboundMessageRecord {
  Tag: string;
  MessageID: string;
  To: Array<{ Email: string; Name: string }>;
  Cc: Array<{ Email: string; Name: string }>;
  Bcc: Array<{ Email: string; Name: string }>;
  Recipients: string[];
  ReceivedAt: string;
  From: string;
  Subject: string;
  Attachments: Array<{ Name: string; ContentType: string; ContentLength: number }>;
  Status: string;
  TrackOpens: boolean;
  TrackLinks: string;
  Metadata: Record<string, string>;
  Sandboxed: boolean;
  MessageStream: string;
}

export interface SuppressionRecord {
  EmailAddress: string;
  SuppressionReason: string;
  Origin: string;
  CreatedAt: string;
}

export class Client {
  private serverToken: string;
  private accountToken?: string;

  constructor(config: { token: string; accountToken?: string }) {
    this.serverToken = config.token;
    this.accountToken = config.accountToken;
  }

  private serverHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': this.serverToken
    };
  }

  // ── Email Sending ──

  async sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
    let body: Record<string, any> = {
      From: params.from,
      To: params.to,
      Subject: params.subject
    };

    if (params.cc) body.Cc = params.cc;
    if (params.bcc) body.Bcc = params.bcc;
    if (params.htmlBody) body.HtmlBody = params.htmlBody;
    if (params.textBody) body.TextBody = params.textBody;
    if (params.replyTo) body.ReplyTo = params.replyTo;
    if (params.tag) body.Tag = params.tag;
    if (params.trackOpens !== undefined) body.TrackOpens = params.trackOpens;
    if (params.trackLinks) body.TrackLinks = params.trackLinks;
    if (params.messageStream) body.MessageStream = params.messageStream;
    if (params.metadata) body.Metadata = params.metadata;

    if (params.headers && params.headers.length > 0) {
      body.Headers = params.headers.map(h => ({ Name: h.name, Value: h.value }));
    }

    if (params.attachments && params.attachments.length > 0) {
      body.Attachments = params.attachments.map(a => ({
        Name: a.name,
        Content: a.content,
        ContentType: a.contentType,
        ...(a.contentId ? { ContentID: a.contentId } : {})
      }));
    }

    let response = await postmarkAxios.post('/email', body, {
      headers: this.serverHeaders()
    });

    return response.data;
  }

  async sendBatchEmails(messages: SendEmailParams[]): Promise<SendEmailResponse[]> {
    let bodies = messages.map(params => {
      let body: Record<string, any> = {
        From: params.from,
        To: params.to,
        Subject: params.subject
      };

      if (params.cc) body.Cc = params.cc;
      if (params.bcc) body.Bcc = params.bcc;
      if (params.htmlBody) body.HtmlBody = params.htmlBody;
      if (params.textBody) body.TextBody = params.textBody;
      if (params.replyTo) body.ReplyTo = params.replyTo;
      if (params.tag) body.Tag = params.tag;
      if (params.trackOpens !== undefined) body.TrackOpens = params.trackOpens;
      if (params.trackLinks) body.TrackLinks = params.trackLinks;
      if (params.messageStream) body.MessageStream = params.messageStream;
      if (params.metadata) body.Metadata = params.metadata;

      if (params.headers && params.headers.length > 0) {
        body.Headers = params.headers.map(h => ({ Name: h.name, Value: h.value }));
      }

      if (params.attachments && params.attachments.length > 0) {
        body.Attachments = params.attachments.map(a => ({
          Name: a.name,
          Content: a.content,
          ContentType: a.contentType,
          ...(a.contentId ? { ContentID: a.contentId } : {})
        }));
      }

      return body;
    });

    let response = await postmarkAxios.post('/email/batch', bodies, {
      headers: this.serverHeaders()
    });

    return response.data;
  }

  async sendTemplateEmail(params: SendTemplateEmailParams): Promise<SendEmailResponse> {
    let body: Record<string, any> = {
      From: params.from,
      To: params.to,
      TemplateModel: params.templateModel
    };

    if (params.templateId) body.TemplateId = params.templateId;
    if (params.templateAlias) body.TemplateAlias = params.templateAlias;
    if (params.cc) body.Cc = params.cc;
    if (params.bcc) body.Bcc = params.bcc;
    if (params.replyTo) body.ReplyTo = params.replyTo;
    if (params.tag) body.Tag = params.tag;
    if (params.trackOpens !== undefined) body.TrackOpens = params.trackOpens;
    if (params.trackLinks) body.TrackLinks = params.trackLinks;
    if (params.messageStream) body.MessageStream = params.messageStream;
    if (params.metadata) body.Metadata = params.metadata;

    if (params.headers && params.headers.length > 0) {
      body.Headers = params.headers.map(h => ({ Name: h.name, Value: h.value }));
    }

    if (params.attachments && params.attachments.length > 0) {
      body.Attachments = params.attachments.map(a => ({
        Name: a.name,
        Content: a.content,
        ContentType: a.contentType,
        ...(a.contentId ? { ContentID: a.contentId } : {})
      }));
    }

    let response = await postmarkAxios.post('/email/withTemplate', body, {
      headers: this.serverHeaders()
    });

    return response.data;
  }

  async sendBatchTemplateEmails(
    messages: SendTemplateEmailParams[]
  ): Promise<SendEmailResponse[]> {
    let bodies = messages.map(params => {
      let body: Record<string, any> = {
        From: params.from,
        To: params.to,
        TemplateModel: params.templateModel
      };

      if (params.templateId) body.TemplateId = params.templateId;
      if (params.templateAlias) body.TemplateAlias = params.templateAlias;
      if (params.cc) body.Cc = params.cc;
      if (params.bcc) body.Bcc = params.bcc;
      if (params.replyTo) body.ReplyTo = params.replyTo;
      if (params.tag) body.Tag = params.tag;
      if (params.trackOpens !== undefined) body.TrackOpens = params.trackOpens;
      if (params.trackLinks) body.TrackLinks = params.trackLinks;
      if (params.messageStream) body.MessageStream = params.messageStream;
      if (params.metadata) body.Metadata = params.metadata;

      if (params.headers && params.headers.length > 0) {
        body.Headers = params.headers.map(h => ({ Name: h.name, Value: h.value }));
      }

      if (params.attachments && params.attachments.length > 0) {
        body.Attachments = params.attachments.map(a => ({
          Name: a.name,
          Content: a.content,
          ContentType: a.contentType,
          ...(a.contentId ? { ContentID: a.contentId } : {})
        }));
      }

      return body;
    });

    let response = await postmarkAxios.post(
      '/email/batchWithTemplates',
      { Messages: bodies },
      {
        headers: this.serverHeaders()
      }
    );

    return response.data;
  }

  // ── Bounces ──

  async getDeliveryStats(): Promise<{
    InactiveMails: number;
    Bounces: Array<{ Type: string; Name: string; Count: number }>;
  }> {
    let response = await postmarkAxios.get('/deliverystats', {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async getBounces(params: {
    count: number;
    offset: number;
    type?: string;
    inactive?: boolean;
    emailFilter?: string;
    tag?: string;
    messageID?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<{ TotalCount: number; Bounces: BounceRecord[] }> {
    let response = await postmarkAxios.get('/bounces', {
      headers: this.serverHeaders(),
      params: {
        count: params.count,
        offset: params.offset,
        type: params.type,
        inactive: params.inactive,
        emailFilter: params.emailFilter,
        tag: params.tag,
        messageID: params.messageID,
        fromdate: params.fromdate,
        todate: params.todate,
        messagestream: params.messageStream
      }
    });
    return response.data;
  }

  async getBounce(bounceId: number): Promise<BounceRecord> {
    let response = await postmarkAxios.get(`/bounces/${bounceId}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async activateBounce(bounceId: number): Promise<{ Message: string; Bounce: BounceRecord }> {
    let response = await postmarkAxios.put(
      `/bounces/${bounceId}/activate`,
      {},
      {
        headers: this.serverHeaders()
      }
    );
    return response.data;
  }

  // ── Templates ──

  async listTemplates(params: {
    count: number;
    offset: number;
    templateType?: string;
  }): Promise<{
    TotalCount: number;
    Templates: Array<{
      TemplateId: number;
      Name: string;
      Active: boolean;
      Alias: string | null;
      TemplateType: string;
    }>;
  }> {
    let response = await postmarkAxios.get('/templates', {
      headers: this.serverHeaders(),
      params: {
        Count: params.count,
        Offset: params.offset,
        TemplateType: params.templateType
      }
    });
    return response.data;
  }

  async getTemplate(templateIdOrAlias: string | number): Promise<TemplateRecord> {
    let response = await postmarkAxios.get(`/templates/${templateIdOrAlias}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async createTemplate(params: {
    name: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    alias?: string;
    templateType?: string;
    layoutTemplate?: string;
  }): Promise<TemplateRecord> {
    let body: Record<string, any> = {
      Name: params.name,
      Subject: params.subject
    };

    if (params.htmlBody) body.HtmlBody = params.htmlBody;
    if (params.textBody) body.TextBody = params.textBody;
    if (params.alias) body.Alias = params.alias;
    if (params.templateType) body.TemplateType = params.templateType;
    if (params.layoutTemplate) body.LayoutTemplate = params.layoutTemplate;

    let response = await postmarkAxios.post('/templates', body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async updateTemplate(
    templateIdOrAlias: string | number,
    params: {
      name?: string;
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      alias?: string;
      layoutTemplate?: string;
    }
  ): Promise<TemplateRecord> {
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.Name = params.name;
    if (params.subject !== undefined) body.Subject = params.subject;
    if (params.htmlBody !== undefined) body.HtmlBody = params.htmlBody;
    if (params.textBody !== undefined) body.TextBody = params.textBody;
    if (params.alias !== undefined) body.Alias = params.alias;
    if (params.layoutTemplate !== undefined) body.LayoutTemplate = params.layoutTemplate;

    let response = await postmarkAxios.put(`/templates/${templateIdOrAlias}`, body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async deleteTemplate(
    templateIdOrAlias: string | number
  ): Promise<{ ErrorCode: number; Message: string }> {
    let response = await postmarkAxios.delete(`/templates/${templateIdOrAlias}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async validateTemplate(params: {
    subject: string;
    htmlBody?: string;
    textBody?: string;
    testRenderModel?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      Subject: params.subject
    };

    if (params.htmlBody) body.HtmlBody = params.htmlBody;
    if (params.textBody) body.TextBody = params.textBody;
    if (params.testRenderModel) body.TestRenderModel = params.testRenderModel;

    let response = await postmarkAxios.post('/templates/validate', body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  // ── Message Streams ──

  async listMessageStreams(params?: {
    messageStreamType?: string;
    includeArchivedStreams?: boolean;
  }): Promise<{ TotalCount: number; MessageStreams: MessageStreamRecord[] }> {
    let response = await postmarkAxios.get('/message-streams', {
      headers: this.serverHeaders(),
      params: {
        MessageStreamType: params?.messageStreamType,
        IncludeArchivedStreams: params?.includeArchivedStreams
      }
    });
    return response.data;
  }

  async getMessageStream(streamId: string): Promise<MessageStreamRecord> {
    let response = await postmarkAxios.get(`/message-streams/${streamId}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async createMessageStream(params: {
    id: string;
    name: string;
    messageStreamType: string;
    description?: string;
  }): Promise<MessageStreamRecord> {
    let body: Record<string, any> = {
      ID: params.id,
      Name: params.name,
      MessageStreamType: params.messageStreamType
    };

    if (params.description) body.Description = params.description;

    let response = await postmarkAxios.post('/message-streams', body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async updateMessageStream(
    streamId: string,
    params: {
      name?: string;
      description?: string;
    }
  ): Promise<MessageStreamRecord> {
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.Name = params.name;
    if (params.description !== undefined) body.Description = params.description;

    let response = await postmarkAxios.patch(`/message-streams/${streamId}`, body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async archiveMessageStream(
    streamId: string
  ): Promise<{ ID: string; ServerID: number; ExpectedPurgeDate: string }> {
    let response = await postmarkAxios.post(
      `/message-streams/${streamId}/archive`,
      {},
      {
        headers: this.serverHeaders()
      }
    );
    return response.data;
  }

  async unarchiveMessageStream(streamId: string): Promise<MessageStreamRecord> {
    let response = await postmarkAxios.post(
      `/message-streams/${streamId}/unarchive`,
      {},
      {
        headers: this.serverHeaders()
      }
    );
    return response.data;
  }

  // ── Suppressions ──

  async getSuppressions(
    streamId: string,
    params?: {
      suppressionReason?: string;
      origin?: string;
      fromDate?: string;
      toDate?: string;
      emailAddress?: string;
    }
  ): Promise<{ Suppressions: SuppressionRecord[] }> {
    let response = await postmarkAxios.get(`/message-streams/${streamId}/suppressions/dump`, {
      headers: this.serverHeaders(),
      params: {
        SuppressionReason: params?.suppressionReason,
        Origin: params?.origin,
        FromDate: params?.fromDate,
        ToDate: params?.toDate,
        EmailAddress: params?.emailAddress
      }
    });
    return response.data;
  }

  async createSuppressions(
    streamId: string,
    emailAddresses: string[]
  ): Promise<{
    Suppressions: Array<{ EmailAddress: string; Status: string; Message: string }>;
  }> {
    let response = await postmarkAxios.post(
      `/message-streams/${streamId}/suppressions`,
      {
        Suppressions: emailAddresses.map(email => ({ EmailAddress: email }))
      },
      {
        headers: this.serverHeaders()
      }
    );
    return response.data;
  }

  async deleteSuppressions(
    streamId: string,
    emailAddresses: string[]
  ): Promise<{
    Suppressions: Array<{ EmailAddress: string; Status: string; Message: string }>;
  }> {
    let response = await postmarkAxios.post(
      `/message-streams/${streamId}/suppressions/delete`,
      {
        Suppressions: emailAddresses.map(email => ({ EmailAddress: email }))
      },
      {
        headers: this.serverHeaders()
      }
    );
    return response.data;
  }

  // ── Messages ──

  async searchOutboundMessages(params: {
    count: number;
    offset: number;
    recipient?: string;
    fromemail?: string;
    tag?: string;
    status?: string;
    fromdate?: string;
    todate?: string;
    subject?: string;
    metadata_any?: string;
    messageStream?: string;
  }): Promise<{ TotalCount: number; Messages: OutboundMessageRecord[] }> {
    let queryParams: Record<string, any> = {
      count: params.count,
      offset: params.offset
    };

    if (params.recipient) queryParams.recipient = params.recipient;
    if (params.fromemail) queryParams.fromemail = params.fromemail;
    if (params.tag) queryParams.tag = params.tag;
    if (params.status) queryParams.status = params.status;
    if (params.fromdate) queryParams.fromdate = params.fromdate;
    if (params.todate) queryParams.todate = params.todate;
    if (params.subject) queryParams.subject = params.subject;
    if (params.metadata_any) queryParams.metadata_any = params.metadata_any;
    if (params.messageStream) queryParams.messagestream = params.messageStream;

    let response = await postmarkAxios.get('/messages/outbound', {
      headers: this.serverHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getOutboundMessageDetails(messageId: string): Promise<any> {
    let response = await postmarkAxios.get(`/messages/outbound/${messageId}/details`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async searchInboundMessages(params: {
    count: number;
    offset: number;
    recipient?: string;
    fromemail?: string;
    tag?: string;
    status?: string;
    fromdate?: string;
    todate?: string;
    subject?: string;
    mailboxhash?: string;
  }): Promise<{ TotalCount: number; InboundMessages: any[] }> {
    let queryParams: Record<string, any> = {
      count: params.count,
      offset: params.offset
    };

    if (params.recipient) queryParams.recipient = params.recipient;
    if (params.fromemail) queryParams.fromemail = params.fromemail;
    if (params.tag) queryParams.tag = params.tag;
    if (params.status) queryParams.status = params.status;
    if (params.fromdate) queryParams.fromdate = params.fromdate;
    if (params.todate) queryParams.todate = params.todate;
    if (params.subject) queryParams.subject = params.subject;
    if (params.mailboxhash) queryParams.mailboxhash = params.mailboxhash;

    let response = await postmarkAxios.get('/messages/inbound', {
      headers: this.serverHeaders(),
      params: queryParams
    });
    return response.data;
  }

  async getInboundMessageDetails(messageId: string): Promise<any> {
    let response = await postmarkAxios.get(`/messages/inbound/${messageId}/details`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  // ── Statistics ──

  async getOutboundOverview(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<{
    Sent: number;
    Bounced: number;
    SMTPApiErrors: number;
    BounceRate: number;
    SpamComplaints: number;
    SpamComplaintsRate: number;
    Opens: number;
    UniqueOpens: number;
    Tracked: number;
    WithClientRecorded: number;
    WithPlatformRecorded: number;
    WithReadTimeRecorded: number;
    TotalClicks: number;
    UniqueLinksClicked: number;
    TotalTrackedLinksSent: number;
    WithLinkTracking: number;
    WithOpenTracking: number;
  }> {
    let response = await postmarkAxios.get('/stats/outbound', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  async getSentCounts(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<{ Sent: number; Days: Array<{ Date: string; Sent: number }> }> {
    let response = await postmarkAxios.get('/stats/outbound/sends', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  async getBounceCounts(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<any> {
    let response = await postmarkAxios.get('/stats/outbound/bounces', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  async getSpamComplaintsCounts(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<any> {
    let response = await postmarkAxios.get('/stats/outbound/spam', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  async getOpenCounts(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<any> {
    let response = await postmarkAxios.get('/stats/outbound/opens', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  async getClickCounts(params?: {
    tag?: string;
    fromdate?: string;
    todate?: string;
    messageStream?: string;
  }): Promise<any> {
    let response = await postmarkAxios.get('/stats/outbound/clicks', {
      headers: this.serverHeaders(),
      params: {
        tag: params?.tag,
        fromdate: params?.fromdate,
        todate: params?.todate,
        messagestream: params?.messageStream
      }
    });
    return response.data;
  }

  // ── Server ──

  async getServer(): Promise<any> {
    let response = await postmarkAxios.get('/server', {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async editServer(params: Record<string, any>): Promise<any> {
    let response = await postmarkAxios.put('/server', params, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(messageStream?: string): Promise<{ Webhooks: WebhookRecord[] }> {
    let response = await postmarkAxios.get('/webhooks', {
      headers: this.serverHeaders(),
      params: messageStream ? { MessageStream: messageStream } : {}
    });
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<WebhookRecord> {
    let response = await postmarkAxios.get(`/webhooks/${webhookId}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async createWebhook(params: {
    url: string;
    messageStream?: string;
    httpAuth?: { username: string; password: string };
    httpHeaders?: Array<{ name: string; value: string }>;
    triggers: {
      open?: { enabled: boolean; postFirstOpenOnly?: boolean };
      click?: { enabled: boolean };
      delivery?: { enabled: boolean };
      bounce?: { enabled: boolean; includeContent?: boolean };
      spamComplaint?: { enabled: boolean; includeContent?: boolean };
      subscriptionChange?: { enabled: boolean };
    };
  }): Promise<WebhookRecord> {
    let body: Record<string, any> = {
      Url: params.url
    };

    if (params.messageStream) body.MessageStream = params.messageStream;

    if (params.httpAuth) {
      body.HttpAuth = {
        Username: params.httpAuth.username,
        Password: params.httpAuth.password
      };
    }

    if (params.httpHeaders && params.httpHeaders.length > 0) {
      body.HttpHeaders = params.httpHeaders.map(h => ({ Name: h.name, Value: h.value }));
    }

    let triggers: Record<string, any> = {};
    if (params.triggers.open) {
      triggers.Open = {
        Enabled: params.triggers.open.enabled,
        PostFirstOpenOnly: params.triggers.open.postFirstOpenOnly ?? false
      };
    }
    if (params.triggers.click) {
      triggers.Click = { Enabled: params.triggers.click.enabled };
    }
    if (params.triggers.delivery) {
      triggers.Delivery = { Enabled: params.triggers.delivery.enabled };
    }
    if (params.triggers.bounce) {
      triggers.Bounce = {
        Enabled: params.triggers.bounce.enabled,
        IncludeContent: params.triggers.bounce.includeContent ?? false
      };
    }
    if (params.triggers.spamComplaint) {
      triggers.SpamComplaint = {
        Enabled: params.triggers.spamComplaint.enabled,
        IncludeContent: params.triggers.spamComplaint.includeContent ?? false
      };
    }
    if (params.triggers.subscriptionChange) {
      triggers.SubscriptionChange = { Enabled: params.triggers.subscriptionChange.enabled };
    }
    body.Triggers = triggers;

    let response = await postmarkAxios.post('/webhooks', body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async editWebhook(
    webhookId: number,
    params: {
      url?: string;
      httpAuth?: { username: string; password: string } | null;
      httpHeaders?: Array<{ name: string; value: string }>;
      triggers?: {
        open?: { enabled: boolean; postFirstOpenOnly?: boolean };
        click?: { enabled: boolean };
        delivery?: { enabled: boolean };
        bounce?: { enabled: boolean; includeContent?: boolean };
        spamComplaint?: { enabled: boolean; includeContent?: boolean };
        subscriptionChange?: { enabled: boolean };
      };
    }
  ): Promise<WebhookRecord> {
    let body: Record<string, any> = {};

    if (params.url !== undefined) body.Url = params.url;

    if (params.httpAuth !== undefined) {
      body.HttpAuth = params.httpAuth
        ? {
            Username: params.httpAuth.username,
            Password: params.httpAuth.password
          }
        : null;
    }

    if (params.httpHeaders) {
      body.HttpHeaders = params.httpHeaders.map(h => ({ Name: h.name, Value: h.value }));
    }

    if (params.triggers) {
      let triggers: Record<string, any> = {};
      if (params.triggers.open) {
        triggers.Open = {
          Enabled: params.triggers.open.enabled,
          PostFirstOpenOnly: params.triggers.open.postFirstOpenOnly ?? false
        };
      }
      if (params.triggers.click) {
        triggers.Click = { Enabled: params.triggers.click.enabled };
      }
      if (params.triggers.delivery) {
        triggers.Delivery = { Enabled: params.triggers.delivery.enabled };
      }
      if (params.triggers.bounce) {
        triggers.Bounce = {
          Enabled: params.triggers.bounce.enabled,
          IncludeContent: params.triggers.bounce.includeContent ?? false
        };
      }
      if (params.triggers.spamComplaint) {
        triggers.SpamComplaint = {
          Enabled: params.triggers.spamComplaint.enabled,
          IncludeContent: params.triggers.spamComplaint.includeContent ?? false
        };
      }
      if (params.triggers.subscriptionChange) {
        triggers.SubscriptionChange = { Enabled: params.triggers.subscriptionChange.enabled };
      }
      body.Triggers = triggers;
    }

    let response = await postmarkAxios.put(`/webhooks/${webhookId}`, body, {
      headers: this.serverHeaders()
    });
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<{ ErrorCode: number; Message: string }> {
    let response = await postmarkAxios.delete(`/webhooks/${webhookId}`, {
      headers: this.serverHeaders()
    });
    return response.data;
  }
}
