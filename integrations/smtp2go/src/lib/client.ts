import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(options: {
    token: string;
    baseUrl: string;
  }) {
    this.axios = createAxios({
      baseURL: options.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': options.token
      }
    });
  }

  private async post<T = any>(path: string, data: Record<string, any> = {}): Promise<T> {
    let response = await this.axios.post(path, data);
    return response.data;
  }

  // ── Email ──

  async sendEmail(params: {
    sender: string;
    to: string[];
    subject: string;
    htmlBody?: string;
    textBody?: string;
    cc?: string[];
    bcc?: string[];
    customHeaders?: Array<{ header: string; value: string }>;
    attachments?: Array<{ filename: string; fileblob: string; mimetype: string }>;
    inlines?: Array<{ filename: string; fileblob: string; mimetype: string }>;
    templateId?: string;
    templateData?: Record<string, string>;
  }) {
    return this.post('/email/send', {
      sender: params.sender,
      to: params.to,
      subject: params.subject,
      html_body: params.htmlBody,
      text_body: params.textBody,
      cc: params.cc,
      bcc: params.bcc,
      custom_headers: params.customHeaders,
      attachments: params.attachments,
      inlines: params.inlines,
      template_id: params.templateId,
      template_data: params.templateData
    });
  }

  async sendMimeEmail(params: { mimeEmail: string }) {
    return this.post('/email/mime', {
      mime_email: params.mimeEmail
    });
  }

  async searchEmails(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    continueToken?: string;
    emailId?: string[];
    filterQuery?: string;
    username?: string;
    openedOnly?: boolean;
    clickedOnly?: boolean;
    sortBy?: string;
    sortDir?: string;
  }) {
    return this.post('/email/search', {
      start_date: params.startDate,
      end_date: params.endDate,
      limit: params.limit,
      continue_token: params.continueToken,
      email_id: params.emailId,
      filter_query: params.filterQuery,
      username: params.username,
      opened_only: params.openedOnly,
      clicked_only: params.clickedOnly,
      sort_by: params.sortBy,
      sort_dir: params.sortDir
    });
  }

  // ── SMS ──

  async sendSms(params: { to: string[]; from: string; body: string }) {
    return this.post('/sms/send', {
      to: params.to,
      from: params.from,
      body: params.body
    });
  }

  async viewReceivedSms() {
    return this.post('/sms/view-received');
  }

  // ── Templates ──

  async addTemplate(params: {
    templateName: string;
    htmlBody?: string;
    textBody?: string;
    subject?: string;
    sender?: string;
  }) {
    return this.post('/template/add', {
      template_name: params.templateName,
      html_body: params.htmlBody,
      text_body: params.textBody,
      subject: params.subject,
      sender: params.sender
    });
  }

  async editTemplate(params: {
    templateId: string;
    templateName?: string;
    htmlBody?: string;
    textBody?: string;
    subject?: string;
    sender?: string;
  }) {
    return this.post('/template/edit', {
      template_id: params.templateId,
      template_name: params.templateName,
      html_body: params.htmlBody,
      text_body: params.textBody,
      subject: params.subject,
      sender: params.sender
    });
  }

  async deleteTemplate(params: { templateId: string }) {
    return this.post('/template/delete', {
      template_id: params.templateId
    });
  }

  async searchTemplates(params: {
    templateName?: string;
    limit?: number;
    continueToken?: string;
  }) {
    return this.post('/template/search', {
      template_name: params.templateName,
      limit: params.limit,
      continue_token: params.continueToken
    });
  }

  async viewTemplate(params: { templateId: string }) {
    return this.post('/template/view', {
      template_id: params.templateId
    });
  }

  // ── Statistics ──

  async getEmailBounces(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_bounces', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  async getEmailCycle(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_cycle', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  async getEmailHistory(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_history', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  async getEmailSpam(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_spam', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  async getEmailUnsubscribes(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_unsubs', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  async getEmailSummary(params?: { startDate?: string; endDate?: string }) {
    return this.post('/stats/email_summary', {
      start_date: params?.startDate,
      end_date: params?.endDate
    });
  }

  // ── Activity ──

  async searchActivity(params: {
    startDate?: string;
    endDate?: string;
    search?: string;
    searchSubject?: string;
    searchSender?: string;
    searchRecipient?: string;
    searchUsernames?: string;
    limit?: number;
    continueToken?: string;
    onlyLatest?: boolean;
    eventTypes?: string[];
  }) {
    return this.post('/activity/search', {
      start_date: params.startDate,
      end_date: params.endDate,
      search: params.search,
      search_subject: params.searchSubject,
      search_sender: params.searchSender,
      search_recipient: params.searchRecipient,
      search_usernames: params.searchUsernames,
      limit: params.limit,
      continue_token: params.continueToken,
      only_latest: params.onlyLatest,
      event_types: params.eventTypes
    });
  }

  // ── Sender Domains ──

  async addDomain(params: {
    domain: string;
    trackingSubdomain?: string;
    returnpathSubdomain?: string;
    autoVerify?: boolean;
    subaccountId?: string;
  }) {
    return this.post('/domain/add', {
      domain: params.domain,
      tracking_subdomain: params.trackingSubdomain,
      returnpath_subdomain: params.returnpathSubdomain,
      auto_verify: params.autoVerify,
      subaccount_id: params.subaccountId
    });
  }

  async removeDomain(params: { domain: string; subaccountId?: string }) {
    return this.post('/domain/remove', {
      domain: params.domain,
      subaccount_id: params.subaccountId
    });
  }

  async viewDomains(params?: { subaccountId?: string }) {
    return this.post('/domain/view', {
      subaccount_id: params?.subaccountId
    });
  }

  async verifyDomain(params: { domain: string; subaccountId?: string }) {
    return this.post('/domain/verify', {
      domain: params.domain,
      subaccount_id: params.subaccountId
    });
  }

  async editTrackingDomain(params: {
    domain: string;
    trackingSubdomain: string;
    subaccountId?: string;
  }) {
    return this.post('/domain/tracking', {
      domain: params.domain,
      tracking_subdomain: params.trackingSubdomain,
      subaccount_id: params.subaccountId
    });
  }

  async editReturnPathDomain(params: {
    domain: string;
    returnpathSubdomain: string;
    subaccountId?: string;
  }) {
    return this.post('/domain/returnpath', {
      domain: params.domain,
      returnpath_subdomain: params.returnpathSubdomain,
      subaccount_id: params.subaccountId
    });
  }

  // ── Single Sender Emails ──

  async addSingleSender(params: { emailAddress: string; subaccountId?: string }) {
    return this.post('/single_sender_emails/add', {
      email_address: params.emailAddress,
      subaccount_id: params.subaccountId
    });
  }

  async removeSingleSender(params: { emailAddress: string; subaccountId?: string }) {
    return this.post('/single_sender_emails/remove', {
      email_address: params.emailAddress,
      subaccount_id: params.subaccountId
    });
  }

  async viewSingleSenders(params?: { subaccountId?: string }) {
    return this.post('/single_sender_emails/view', {
      subaccount_id: params?.subaccountId
    });
  }

  // ── Allowed Senders ──

  async viewAllowedSenders(params?: { subaccountId?: string }) {
    return this.post('/allowed_senders/view', {
      subaccount_id: params?.subaccountId
    });
  }

  async addAllowedSenders(params: { allowedSenders: string[]; subaccountId?: string }) {
    return this.post('/allowed_senders/add', {
      allowed_senders: params.allowedSenders,
      subaccount_id: params.subaccountId
    });
  }

  async removeAllowedSenders(params: { allowedSenders: string[]; subaccountId?: string }) {
    return this.post('/allowed_senders/remove', {
      allowed_senders: params.allowedSenders,
      subaccount_id: params.subaccountId
    });
  }

  async updateAllowedSenders(params: { allowedSenders: string[]; subaccountId?: string }) {
    return this.post('/allowed_senders/update', {
      allowed_senders: params.allowedSenders,
      subaccount_id: params.subaccountId
    });
  }

  // ── Suppressions ──

  async addSuppression(params: { suppressions: string[]; subaccountId?: string }) {
    return this.post('/suppression/add', {
      suppressions: params.suppressions,
      subaccount_id: params.subaccountId
    });
  }

  async removeSuppression(params: { suppressions: string[]; subaccountId?: string }) {
    return this.post('/suppression/remove', {
      suppressions: params.suppressions,
      subaccount_id: params.subaccountId
    });
  }

  async viewSuppressions(params?: { subaccountId?: string }) {
    return this.post('/suppression/view', {
      subaccount_id: params?.subaccountId
    });
  }

  // ── SMTP Users ──

  async addSmtpUser(params: {
    username: string;
    password: string;
    description?: string;
    subaccountId?: string;
  }) {
    return this.post('/users/smtp/add', {
      username: params.username,
      password: params.password,
      description: params.description,
      subaccount_id: params.subaccountId
    });
  }

  async editSmtpUser(params: {
    username: string;
    password?: string;
    description?: string;
    subaccountId?: string;
  }) {
    return this.post('/users/smtp/edit', {
      username: params.username,
      password: params.password,
      description: params.description,
      subaccount_id: params.subaccountId
    });
  }

  async removeSmtpUser(params: { username: string; subaccountId?: string }) {
    return this.post('/users/smtp/remove', {
      username: params.username,
      subaccount_id: params.subaccountId
    });
  }

  async viewSmtpUsers(params?: { subaccountId?: string }) {
    return this.post('/users/smtp/view', {
      subaccount_id: params?.subaccountId
    });
  }

  // ── Webhooks ──

  async addWebhook(params: {
    url: string;
    events?: string[];
    smsEvents?: boolean;
    usernames?: string[];
    outputType?: string;
    authorizationHeader?: string;
    customHeaders?: string[];
  }) {
    return this.post('/webhook/add', {
      url: params.url,
      events: params.events,
      sms_events: params.smsEvents,
      usernames: params.usernames,
      output_type: params.outputType,
      authorization_header: params.authorizationHeader,
      custom_headers: params.customHeaders
    });
  }

  async viewWebhooks() {
    return this.post('/webhook/view');
  }

  async editWebhook(params: {
    webhookId: string;
    url?: string;
    events?: string[];
    smsEvents?: boolean;
    usernames?: string[];
    outputType?: string;
    authorizationHeader?: string;
    customHeaders?: string[];
  }) {
    return this.post('/webhook/edit', {
      webhook_id: params.webhookId,
      url: params.url,
      events: params.events,
      sms_events: params.smsEvents,
      usernames: params.usernames,
      output_type: params.outputType,
      authorization_header: params.authorizationHeader,
      custom_headers: params.customHeaders
    });
  }

  async removeWebhook(params: { webhookId: string }) {
    return this.post('/webhook/remove', {
      webhook_id: params.webhookId
    });
  }

  // ── Subaccounts ──

  async addSubaccount(params: { email: string; password: string; name?: string }) {
    return this.post('/subaccount/add', {
      email: params.email,
      password: params.password,
      name: params.name
    });
  }

  async editSubaccount(params: { subaccountId: string; email?: string; name?: string }) {
    return this.post('/subaccount/edit', {
      subaccount_id: params.subaccountId,
      email: params.email,
      name: params.name
    });
  }

  async viewSubaccounts() {
    return this.post('/subaccount/view');
  }

  async closeSubaccount(params: { subaccountId: string }) {
    return this.post('/subaccount/close', {
      subaccount_id: params.subaccountId
    });
  }

  async reopenSubaccount(params: { subaccountId: string }) {
    return this.post('/subaccount/reopen', {
      subaccount_id: params.subaccountId
    });
  }
}
