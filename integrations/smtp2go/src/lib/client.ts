import { randomUUID } from 'node:crypto';
import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

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

  private async request<T = any>(
    method: 'post' | 'patch',
    path: string,
    data: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      let response = await this.axios.request({ method, url: path, data });
      let body = response.data;
      let error = body?.data?.error ?? body?.error;
      if (error || body?.data?.error_code || body?.error_code) {
        throw createApiServiceError(
          `SMTP2GO API request failed: ${error ?? 'Unknown error'}`,
          {
            reason: 'smtp2go_api_error',
            upstreamStatus: response.status,
            upstreamCode: body?.data?.error_code ?? body?.error_code
          }
        );
      }
      return body;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'SMTP2GO',
        reason: 'smtp2go_api_error',
        operation: path,
        nestedKeys: ['data', 'field_validation_errors', 'errors']
      });
    }
  }

  private post<T = any>(path: string, data: Record<string, unknown> = {}): Promise<T> {
    return this.request<T>('post', path, data);
  }

  async getApiPermissions() {
    return this.post('/api_keys/permissions');
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
    schedule?: string;
    fastAccept?: boolean;
  }) {
    if (!params.htmlBody && !params.textBody && !params.templateId) {
      throw createApiServiceError(
        'Provide htmlBody, textBody, or templateId to send an email.'
      );
    }
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
      template_data: params.templateData,
      schedule: params.schedule,
      fastaccept: params.fastAccept
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
      clicked_only: params.clickedOnly
    });
  }

  // ── SMS ──

  async sendSms(params: { to: string[]; from?: string; body: string }) {
    return this.post('/sms/send', {
      destination: params.to,
      sender: params.from,
      content: params.body
    });
  }

  async viewReceivedSms() {
    return this.post('/sms/view-received');
  }

  // ── Templates ──

  async addTemplate(params: {
    templateName: string;
    templateId?: string;
    htmlBody?: string;
    textBody?: string;
    subject?: string;
    sender?: string;
  }) {
    if (params.sender !== undefined) {
      throw createApiServiceError(
        'SMTP2GO templates do not store a sender. Set sender when sending the email.'
      );
    }
    return this.post('/template/add', {
      id: params.templateId ?? randomUUID().replaceAll('-', '').slice(0, 24),
      template_name: params.templateName,
      html_body: params.htmlBody ?? '',
      text_body: params.textBody ?? '',
      subject: params.subject ?? ''
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
    if (params.sender !== undefined) {
      throw createApiServiceError(
        'SMTP2GO templates do not store a sender. Set sender when sending the email.'
      );
    }
    return this.post('/template/edit', {
      id: params.templateId,
      template_name: params.templateName,
      html_body: params.htmlBody,
      text_body: params.textBody,
      subject: params.subject
    });
  }

  async deleteTemplate(params: { templateId: string }) {
    return this.post('/template/delete', {
      id: params.templateId
    });
  }

  async searchTemplates(params: {
    templateName?: string;
    limit?: number;
    continueToken?: string;
  }) {
    return this.post('/template/search', {
      search_terms: params.templateName ? [params.templateName] : undefined,
      fuzzy_search: params.templateName ? true : undefined,
      page_size: params.limit,
      continue_token: params.continueToken
    });
  }

  async viewTemplate(params: { templateId: string }) {
    return this.post('/template/view', {
      id: params.templateId
    });
  }

  // ── Statistics ──

  async getEmailBounces(params?: { startDate?: string; endDate?: string; username?: string }) {
    if (params?.startDate !== undefined || params?.endDate !== undefined) {
      throw createApiServiceError(
        'This SMTP2GO statistics report does not support date filters. Omit startDate and endDate, or use Get Email History.'
      );
    }
    return this.post('/stats/email_bounces', { username: params?.username });
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

  async getEmailSummary(params?: { startDate?: string; endDate?: string; username?: string }) {
    if (params?.startDate !== undefined || params?.endDate !== undefined) {
      throw createApiServiceError(
        'This SMTP2GO statistics report does not support date filters. Omit startDate and endDate, or use Get Email History.'
      );
    }
    return this.post('/stats/email_summary', { username: params?.username });
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
    usernames?: string[];
    searchEmailId?: string;
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
      search_usernames:
        params.usernames ?? (params.searchUsernames ? [params.searchUsernames] : undefined),
      search_email_id: params.searchEmailId,
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
    let suppressions: string[] = [];
    for (let emailAddress of params.suppressions) {
      let result = await this.post('/suppression/add', {
        email_address: emailAddress,
        subaccount_id: params.subaccountId
      });
      if (result.data?.added) suppressions.push(result.data.email_address ?? emailAddress);
    }
    return { data: { suppressions } };
  }

  async removeSuppression(params: {
    suppressions: string[];
    subaccountId?: string;
    reasons?: string[];
  }) {
    let suppressions: string[] = [];
    let results: Array<{ emailAddress: string; reason: string; removed: boolean }> = [];
    for (let emailAddress of params.suppressions) {
      let result = await this.post('/suppression/remove', {
        email_address: emailAddress,
        reasons: params.reasons ?? ['manual', 'spam', 'unsubscribe', 'bounce', 'compliance'],
        subaccount_id: params.subaccountId
      });
      for (let entry of result.data?.suppressions ?? []) {
        results.push({
          emailAddress: entry.email_address ?? emailAddress,
          reason: entry.reason,
          removed: entry.removed === true
        });
      }
      if (result.data?.suppressions?.some((entry: { removed?: boolean }) => entry.removed)) {
        suppressions.push(emailAddress);
      }
    }
    return { data: { suppressions, results } };
  }

  async viewSuppressions(params?: {
    subaccountId?: string;
    continueToken?: string;
    emailAddress?: string;
  }) {
    return this.post('/suppression/view', {
      continue_token: params?.continueToken,
      email_address: params?.emailAddress,
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
      email_password: params.password,
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
    return this.request('patch', '/users/smtp/edit', {
      username: params.username,
      email_password: params.password,
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

  private webhookPayload(params: {
    url?: string;
    events?: string[];
    smsEvents?: boolean;
    smsEventTypes?: string[];
    usernames?: string[];
    outputType?: string;
    authorizationHeader?: string;
    customHeaders?: string[];
    httpHeaders?: string[];
    subaccountId?: string;
    disabled?: boolean;
  }) {
    if (params.events?.includes('resubscribe')) {
      throw createApiServiceError('SMTP2GO does not support resubscribe webhook events.');
    }
    let authorization = params.authorizationHeader?.match(/^(Bearer|Basic)\s+(.+)$/i);
    return {
      url: params.url,
      events: params.events,
      sms_events:
        params.smsEventTypes ??
        (params.smsEvents === undefined
          ? undefined
          : params.smsEvents
            ? ['delivered', 'failed', 'rejected', 'sending', 'submitted']
            : []),
      usernames: params.usernames,
      output_format: params.outputType,
      auth_header_type:
        params.authorizationHeader === undefined
          ? undefined
          : params.authorizationHeader === ''
            ? ''
            : (authorization?.[1]?.toLowerCase() ?? 'bearer'),
      auth_header_value: authorization?.[2] ?? params.authorizationHeader,
      headers: params.customHeaders,
      custom_headers: params.httpHeaders,
      subaccount_id: params.subaccountId,
      disabled: params.disabled
    };
  }

  async addWebhook(params: Parameters<Client['webhookPayload']>[0] & { url: string }) {
    return this.post('/webhook/add', this.webhookPayload(params));
  }

  async viewWebhooks(params?: { subaccountId?: string }) {
    return this.post('/webhook/view', { subaccount_id: params?.subaccountId });
  }

  private webhookId(value: string) {
    let id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError('Provide a positive numeric webhook ID from List Webhooks.');
    }
    return id;
  }

  async editWebhook(params: Parameters<Client['webhookPayload']>[0] & { webhookId: string }) {
    return this.post('/webhook/edit', {
      id: this.webhookId(params.webhookId),
      ...this.webhookPayload(params)
    });
  }

  async removeWebhook(params: { webhookId: string; subaccountId?: string }) {
    return this.post('/webhook/remove', {
      id: this.webhookId(params.webhookId),
      subaccount_id: params.subaccountId
    });
  }

  // ── Subaccounts ──

  async addSubaccount(params: { email?: string; password?: string; name?: string }) {
    if (params.password !== undefined) {
      throw createApiServiceError(
        'SMTP2GO subaccounts use email invitations. Omit password when creating a subaccount.'
      );
    }
    let fullname = params.name ?? params.email;
    if (!fullname) throw createApiServiceError('Provide a name or email for the subaccount.');
    return this.post('/subaccount/add', {
      subaccount_email: params.email,
      fullname
    });
  }

  async editSubaccount(params: { subaccountId: string; email?: string; name?: string }) {
    if (params.email !== undefined) {
      throw createApiServiceError(
        'SMTP2GO does not support changing a subaccount email with this endpoint. Omit email.'
      );
    }
    return this.post('/subaccount/edit', {
      id: params.subaccountId,
      fullname: params.name
    });
  }

  async viewSubaccounts(params?: {
    continueToken?: string;
    pageSize?: number;
    searchTerms?: string[];
  }) {
    return this.post('/subaccounts/search', {
      continue_token: params?.continueToken,
      page_size: params?.pageSize,
      search_terms: params?.searchTerms
    });
  }

  async closeSubaccount(params: { subaccountId: string }) {
    return this.post('/subaccount/close', {
      id: params.subaccountId
    });
  }

  async reopenSubaccount(params: { subaccountId: string }) {
    return this.post('/subaccount/reopen', {
      id: params.subaccountId
    });
  }
}
