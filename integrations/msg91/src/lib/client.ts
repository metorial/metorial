import { createAxios } from 'slates';

let controlApi = createAxios({
  baseURL: 'https://control.msg91.com/api/v5'
});

let otpApi = createAxios({
  baseURL: 'https://api.msg91.com/api/v5'
});

export class Msg91Client {
  private authkey: string;

  constructor(config: { token: string }) {
    this.authkey = config.token;
  }

  private headers() {
    return {
      authkey: this.authkey,
      'content-type': 'application/json',
      accept: 'application/json'
    };
  }

  // ─── SMS ──────────────────────────────────────────────────────────────

  async sendSms(params: {
    templateId: string;
    recipients: Array<{ mobiles: string; [key: string]: string }>;
    shortUrl?: string;
    shortUrlExpiry?: number;
    sender?: string;
    unicode?: number;
    scheduleAt?: string;
  }) {
    let body: Record<string, any> = {
      template_id: params.templateId,
      recipients: params.recipients
    };
    if (params.shortUrl) body.short_url = params.shortUrl;
    if (params.shortUrlExpiry) body.short_url_expiry = params.shortUrlExpiry;
    if (params.sender) body.sender = params.sender;
    if (params.unicode !== undefined) body.unicode = params.unicode;
    if (params.scheduleAt) body.send_at = params.scheduleAt;

    let res = await controlApi.post('/flow', body, { headers: this.headers() });
    return res.data;
  }

  async getSmsLogs(params: {
    startDate?: string;
    endDate?: string;
    number?: string;
    requestId?: string;
    templateId?: string;
    senderId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params.startDate) body.start_date = params.startDate;
    if (params.endDate) body.end_date = params.endDate;
    if (params.number) body.number = params.number;
    if (params.requestId) body.request_id = params.requestId;
    if (params.templateId) body.template_id = params.templateId;
    if (params.senderId) body.sender_id = params.senderId;
    if (params.status) body.status = params.status;
    if (params.page) body.page = params.page;
    if (params.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/sms/logs', body, { headers: this.headers() });
    return res.data;
  }

  async getSmsAnalytics(params?: { startDate?: string; endDate?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;

    let res = await controlApi.get('/sms/analytics', {
      headers: this.headers(),
      params: queryParams
    });
    return res.data;
  }

  // ─── OTP ──────────────────────────────────────────────────────────────

  async sendOtp(params: {
    mobile: string;
    templateId?: string;
    otp?: string;
    otpLength?: number;
    otpExpiry?: number;
    sender?: string;
    email?: string;
  }) {
    let queryParams: Record<string, any> = {
      mobile: params.mobile
    };
    if (params.templateId) queryParams.template_id = params.templateId;
    if (params.otp) queryParams.otp = params.otp;
    if (params.otpLength) queryParams.otp_length = params.otpLength;
    if (params.otpExpiry) queryParams.otp_expiry = params.otpExpiry;
    if (params.sender) queryParams.sender = params.sender;
    if (params.email) queryParams.email = params.email;

    let res = await otpApi.post('/otp', null, {
      headers: this.headers(),
      params: queryParams
    });
    return res.data;
  }

  async verifyOtp(params: { mobile: string; otp: string }) {
    let res = await otpApi.get('/otp/verify', {
      headers: this.headers(),
      params: {
        mobile: params.mobile,
        otp: params.otp
      }
    });
    return res.data;
  }

  async resendOtp(params: { mobile: string; retryType?: 'text' | 'voice' }) {
    let queryParams: Record<string, any> = {
      mobile: params.mobile
    };
    if (params.retryType) queryParams.retrytype = params.retryType;

    let res = await otpApi.post('/otp/retry', null, {
      headers: this.headers(),
      params: queryParams
    });
    return res.data;
  }

  // ─── EMAIL ────────────────────────────────────────────────────────────

  async sendEmail(params: {
    recipients: Array<{
      to: Array<{ name?: string; email: string }>;
      cc?: Array<{ name?: string; email: string }>;
      bcc?: Array<{ name?: string; email: string }>;
      variables?: Record<string, string>;
    }>;
    from: { name: string; email: string };
    domain: string;
    templateId: string;
    replyTo?: Array<{ email: string }>;
    attachments?: Array<{ filePath: string; fileName: string }>;
    subject?: string;
  }) {
    let body: Record<string, any> = {
      recipients: params.recipients,
      from: params.from,
      domain: params.domain,
      template_id: params.templateId
    };
    if (params.replyTo) body.reply_to = params.replyTo;
    if (params.attachments) body.attachments = params.attachments;
    if (params.subject) body.subject = params.subject;

    let res = await controlApi.post('/email/send', body, { headers: this.headers() });
    return res.data;
  }

  async getEmailTemplates() {
    let res = await controlApi.get('/email/templates', { headers: this.headers() });
    return res.data;
  }

  async getEmailLogs(params: {
    startDate?: string;
    endDate?: string;
    email?: string;
    requestId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params.startDate) body.start_date = params.startDate;
    if (params.endDate) body.end_date = params.endDate;
    if (params.email) body.email = params.email;
    if (params.requestId) body.request_id = params.requestId;
    if (params.status) body.status = params.status;
    if (params.page) body.page = params.page;
    if (params.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/email/logs', body, { headers: this.headers() });
    return res.data;
  }

  async validateEmail(params: { email: string }) {
    let res = await controlApi.post('/email/validate', params, { headers: this.headers() });
    return res.data;
  }

  // ─── WHATSAPP ─────────────────────────────────────────────────────────

  async sendWhatsAppTemplate(params: {
    integratedNumber: string;
    templateName: string;
    languageCode: string;
    namespace?: string;
    recipients: Array<{
      to: string[];
      components?: Record<string, string>;
    }>;
  }) {
    let body = {
      integrated_number: params.integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode,
            policy: 'deterministic'
          },
          namespace: params.namespace,
          to_and_components: params.recipients.map(r => ({
            to: r.to,
            components: r.components
          }))
        }
      }
    };

    let res = await otpApi.post('/whatsapp/whatsapp-outbound-message/bulk/', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async getWhatsAppTemplates() {
    let res = await controlApi.get('/whatsapp/templates', { headers: this.headers() });
    return res.data;
  }

  async getWhatsAppNumbers() {
    let res = await controlApi.get('/whatsapp/number', { headers: this.headers() });
    return res.data;
  }

  async getWhatsAppLogs(params: {
    startDate?: string;
    endDate?: string;
    number?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params.startDate) body.start_date = params.startDate;
    if (params.endDate) body.end_date = params.endDate;
    if (params.number) body.number = params.number;
    if (params.status) body.status = params.status;
    if (params.page) body.page = params.page;
    if (params.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/whatsapp/logs', body, { headers: this.headers() });
    return res.data;
  }

  // ─── VOICE ────────────────────────────────────────────────────────────

  async sendVoiceCall(params: {
    template: string;
    callerId: string;
    clientNumber: string;
    callbackUrl?: string;
    variables?: Record<
      string,
      { type: string; value: string; asDigits?: boolean; currencyCode?: string }
    >;
  }) {
    let body: Record<string, any> = {
      template: params.template,
      caller_id: params.callerId,
      client_number: params.clientNumber
    };
    if (params.callbackUrl) body.callback_url = params.callbackUrl;
    if (params.variables) body.variables = params.variables;

    let res = await controlApi.post('/voice/call/', body, { headers: this.headers() });
    return res.data;
  }

  async clickToCall(params: {
    callerId: string;
    destination: string;
    destinationB: string[];
  }) {
    let body = {
      caller_id: params.callerId,
      destination: params.destination,
      destinationB: params.destinationB
    };

    let res = await controlApi.post('/voice/call/ctc', body, { headers: this.headers() });
    return res.data;
  }

  async getVoiceLogs(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params?.startDate) body.start_date = params.startDate;
    if (params?.endDate) body.end_date = params.endDate;
    if (params?.page) body.page = params.page;
    if (params?.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/voice/logs', body, { headers: this.headers() });
    return res.data;
  }

  // ─── RCS ──────────────────────────────────────────────────────────────

  async sendRcsText(params: { to: string; message: string; senderId: string }) {
    let body = {
      to: params.to,
      message: params.message,
      sender_id: params.senderId
    };

    let res = await controlApi.post('/rcs/bulk/template', body, { headers: this.headers() });
    return res.data;
  }

  async sendRcsMedia(params: {
    to: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string;
    senderId: string;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      media_url: params.mediaUrl,
      media_type: params.mediaType,
      sender_id: params.senderId
    };
    if (params.caption) body.caption = params.caption;

    let res = await controlApi.post('/rcs/bulk/media', body, { headers: this.headers() });
    return res.data;
  }

  async sendRcsRichCard(params: {
    to: string;
    senderId: string;
    title: string;
    description?: string;
    mediaUrl?: string;
    mediaType?: string;
    suggestions?: Array<{ text: string; postbackData: string }>;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      sender_id: params.senderId,
      title: params.title
    };
    if (params.description) body.description = params.description;
    if (params.mediaUrl) body.media_url = params.mediaUrl;
    if (params.mediaType) body.media_type = params.mediaType;
    if (params.suggestions) body.suggestions = params.suggestions;

    let res = await controlApi.post('/rcs/bulk/rich-card', body, { headers: this.headers() });
    return res.data;
  }

  async getRcsLogs(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params?.startDate) body.start_date = params.startDate;
    if (params?.endDate) body.end_date = params.endDate;
    if (params?.page) body.page = params.page;
    if (params?.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/rcs/logs', body, { headers: this.headers() });
    return res.data;
  }

  // ─── CAMPAIGN ─────────────────────────────────────────────────────────

  async runCampaign(params: {
    campaignSlug: string;
    recipients: Array<{
      to: Array<{
        name?: string;
        email?: string;
        mobiles?: string;
        variables?: Record<string, { type: string; value: string }>;
      }>;
      cc?: Array<{ name?: string; email?: string }>;
      bcc?: Array<{ name?: string; email?: string }>;
      variables?: Record<string, { type: string; value: string }>;
    }>;
    attachments?: Array<{ fileType: string; fileName: string; file: string }>;
    replyTo?: Array<{ name?: string; email?: string }>;
    scheduleFor?: string;
    timezone?: string;
    timezoneBy?: 'company' | 'contact' | 'manual';
  }) {
    let queryParams: Record<string, string> = {};
    if (params.scheduleFor) queryParams.schedule_for = params.scheduleFor;
    if (params.timezone) queryParams.timezone = params.timezone;
    if (params.timezoneBy) queryParams.timezone_by = params.timezoneBy;

    let body: Record<string, any> = {
      data: {
        sendTo: params.recipients
      }
    };
    if (params.attachments) body.data.attachments = params.attachments;
    if (params.replyTo) body.data.reply_to = params.replyTo;

    let res = await controlApi.post(
      `/campaign/api/campaigns/${params.campaignSlug}/run`,
      body,
      { headers: this.headers(), params: queryParams }
    );
    return res.data;
  }

  // ─── CONTACTS (SEGMENTO) ─────────────────────────────────────────────

  async createOrUpdateContact(params: { contact: Record<string, any> }) {
    let res = await controlApi.post('/segmento/contact', params.contact, {
      headers: this.headers()
    });
    return res.data;
  }

  async searchContacts(params: {
    filters?: Record<string, any>;
    page?: number;
    pageSize?: number;
  }) {
    let body: Record<string, any> = {};
    if (params.filters) body.filters = params.filters;
    if (params.page) body.page = params.page;
    if (params.pageSize) body.page_size = params.pageSize;

    let res = await controlApi.post('/segmento/contact/filter', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteContacts(params: { contactIds: string[] }) {
    let res = await controlApi.delete('/segmento/contacts', {
      headers: this.headers(),
      data: { ids: params.contactIds }
    });
    return res.data;
  }

  async getPhonebookFields() {
    let res = await controlApi.get('/segmento/phonebook/fields', {
      headers: this.headers()
    });
    return res.data;
  }

  async trackEvent(params: { events: Record<string, any>[] }) {
    let res = await controlApi.post('/segmento/events', params.events, {
      headers: this.headers()
    });
    return res.data;
  }

  async getEventTypes() {
    let res = await controlApi.get('/segmento/events/types', {
      headers: this.headers()
    });
    return res.data;
  }
}
