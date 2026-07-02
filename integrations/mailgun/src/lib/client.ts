import { createAxios } from 'slates';
import { mailgunApiError } from './errors';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.mailgun.net',
  eu: 'https://api.eu.mailgun.net'
};

let buildFilter = (filters?: MailgunFilter[]) => {
  if (!filters || filters.length === 0) return undefined;

  return {
    AND: filters.map(filter => ({
      attribute: filter.attribute,
      comparator: filter.comparator,
      values: filter.values?.map(value => ({
        value: value.value,
        label: value.label
      }))
    }))
  };
};

let sanitizeMultipartHeader = (value: string) => value.replace(/[\r\n"]/g, '_');

let appendMultipartField = (
  parts: Buffer[],
  boundary: string,
  name: string,
  value: string | number | boolean
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"\r\n\r\n${String(value)}\r\n`
    )
  );
};

let appendMultipartFile = (
  parts: Buffer[],
  boundary: string,
  fieldName: string,
  file: MailgunMessageFile
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${sanitizeMultipartHeader(file.filename)}"\r\nContent-Type: ${file.contentType ?? 'application/octet-stream'}\r\n\r\n`
    )
  );
  parts.push(Buffer.from(file.contentBase64, 'base64'));
  parts.push(Buffer.from('\r\n'));
};

let buildMultipartBody = (params: {
  fields: [string, string | number | boolean][];
  files?: Array<{ fieldName: string; file: MailgunMessageFile }>;
}) => {
  let boundary = `----SlatesMailgunBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
  let parts: Buffer[] = [];

  for (let [name, value] of params.fields) {
    appendMultipartField(parts, boundary, name, value);
  }

  for (let file of params.files ?? []) {
    appendMultipartFile(parts, boundary, file.fieldName, file.file);
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

export class MailgunClient {
  private axios;

  constructor(config: { token: string; region: string }) {
    let baseURL = BASE_URLS[config.region] || BASE_URLS.us;
    this.axios = createAxios({
      baseURL,
      auth: {
        username: 'api',
        password: config.token
      }
    });
    this.axios.interceptors?.response?.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(mailgunApiError(error))
    );
  }

  // ==================== Messages ====================

  async sendMessage(
    domain: string,
    params: {
      from: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject?: string;
      text?: string;
      html?: string;
      template?: string;
      templateVersion?: string;
      templateVariables?: Record<string, unknown>;
      tags?: string[];
      deliveryTime?: string;
      testMode?: boolean;
      tracking?: boolean;
      trackingClicks?: string;
      trackingOpens?: boolean;
      requireTls?: boolean;
      skipVerification?: boolean;
      customHeaders?: Record<string, string>;
      customVariables?: Record<string, string>;
      recipientVariables?: Record<string, Record<string, unknown>>;
      replyTo?: string;
      sendingIp?: string;
      sendingIpPool?: string;
      attachments?: MailgunMessageFile[];
      inlineAttachments?: MailgunMessageFile[];
    }
  ) {
    let fields: [string, string | number | boolean][] = [];
    fields.push(['from', params.from]);

    for (let recipient of params.to) {
      fields.push(['to', recipient]);
    }

    if (params.cc) {
      for (let recipient of params.cc) {
        fields.push(['cc', recipient]);
      }
    }

    if (params.bcc) {
      for (let recipient of params.bcc) {
        fields.push(['bcc', recipient]);
      }
    }

    if (params.subject) fields.push(['subject', params.subject]);
    if (params.text) fields.push(['text', params.text]);
    if (params.html) fields.push(['html', params.html]);
    if (params.template) fields.push(['template', params.template]);
    if (params.templateVersion) fields.push(['t:version', params.templateVersion]);
    if (params.templateVariables)
      fields.push(['t:variables', JSON.stringify(params.templateVariables)]);
    if (params.replyTo) fields.push(['h:Reply-To', params.replyTo]);

    if (params.tags) {
      for (let tag of params.tags) {
        fields.push(['o:tag', tag]);
      }
    }

    if (params.deliveryTime) fields.push(['o:deliverytime', params.deliveryTime]);
    if (params.testMode) fields.push(['o:testmode', 'yes']);
    if (params.tracking !== undefined)
      fields.push(['o:tracking', params.tracking ? 'yes' : 'no']);
    if (params.trackingClicks) fields.push(['o:tracking-clicks', params.trackingClicks]);
    if (params.trackingOpens !== undefined)
      fields.push(['o:tracking-opens', params.trackingOpens ? 'yes' : 'no']);
    if (params.requireTls) fields.push(['o:require-tls', 'yes']);
    if (params.skipVerification) fields.push(['o:skip-verification', 'yes']);
    if (params.sendingIp) fields.push(['o:sending-ip', params.sendingIp]);
    if (params.sendingIpPool) fields.push(['o:sending-ip-pool', params.sendingIpPool]);

    if (params.customHeaders) {
      for (let [key, value] of Object.entries(params.customHeaders)) {
        fields.push([`h:${key}`, value]);
      }
    }

    if (params.customVariables) {
      for (let [key, value] of Object.entries(params.customVariables)) {
        fields.push([`v:${key}`, value]);
      }
    }

    if (params.recipientVariables) {
      fields.push(['recipient-variables', JSON.stringify(params.recipientVariables)]);
    }

    let files = [
      ...(params.attachments ?? []).map(file => ({ fieldName: 'attachment', file })),
      ...(params.inlineAttachments ?? []).map(file => ({ fieldName: 'inline', file }))
    ];
    let multipart = buildMultipartBody({ fields, files });

    let response = await this.axios.post(`/v3/${domain}/messages`, multipart.body, {
      headers: { 'Content-Type': multipart.contentType }
    });

    return response.data as { id: string; message: string };
  }

  async getStoredMessage(domain: string, storageKey: string) {
    let response = await this.axios.get(
      `/v3/domains/${encodeURIComponent(domain)}/messages/${encodeURIComponent(storageKey)}`
    );
    return response.data as StoredMessage;
  }

  // ==================== Domains ====================

  async listDomains(params?: { limit?: number; skip?: number; state?: string }) {
    let response = await this.axios.get('/v4/domains', { params });
    return response.data as { items: DomainItem[]; total_count: number };
  }

  async getDomain(domainName: string) {
    let response = await this.axios.get(`/v4/domains/${domainName}`);
    return response.data as {
      domain: DomainItem;
      sending_dns_records: DnsRecord[];
      receiving_dns_records: DnsRecord[];
    };
  }

  async createDomain(params: {
    name: string;
    spamAction?: string;
    wildcard?: boolean;
    forceDkimAuthority?: boolean;
    dkimKeySize?: number;
    webScheme?: string;
  }) {
    let formData = new URLSearchParams();
    formData.append('name', params.name);
    if (params.spamAction) formData.append('spam_action', params.spamAction);
    if (params.wildcard !== undefined) formData.append('wildcard', String(params.wildcard));
    if (params.forceDkimAuthority !== undefined)
      formData.append('force_dkim_authority', String(params.forceDkimAuthority));
    if (params.dkimKeySize) formData.append('dkim_key_size', String(params.dkimKeySize));
    if (params.webScheme) formData.append('web_scheme', params.webScheme);

    let response = await this.axios.post('/v4/domains', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data as {
      domain: DomainItem;
      sending_dns_records: DnsRecord[];
      receiving_dns_records: DnsRecord[];
    };
  }

  async deleteDomain(domainName: string) {
    let response = await this.axios.delete(`/v3/domains/${encodeURIComponent(domainName)}`);
    return response.data;
  }

  async verifyDomain(domainName: string) {
    let response = await this.axios.put(`/v4/domains/${domainName}/verify`);
    return response.data as {
      domain: DomainItem;
      sending_dns_records: DnsRecord[];
      receiving_dns_records: DnsRecord[];
    };
  }

  // ==================== Domain Tracking ====================

  async getDomainTracking(domainName: string) {
    let response = await this.axios.get(`/v3/domains/${domainName}/tracking`);
    return response.data as { tracking: TrackingSettings };
  }

  async updateDomainTracking(
    domainName: string,
    trackingType: 'open' | 'click' | 'unsubscribe',
    params: {
      active: boolean | string;
      htmlFooter?: string;
      textFooter?: string;
    }
  ) {
    let formData = new URLSearchParams();
    formData.append('active', String(params.active));
    if (params.htmlFooter) formData.append('html_footer', params.htmlFooter);
    if (params.textFooter) formData.append('text_footer', params.textFooter);

    let response = await this.axios.put(
      `/v3/domains/${domainName}/tracking/${trackingType}`,
      formData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return response.data;
  }

  // ==================== Events ====================

  async getEvents(
    domain: string,
    params?: {
      begin?: string;
      end?: string;
      ascending?: string;
      limit?: number;
      event?: string;
      recipient?: string;
      from?: string;
      to?: string;
      subject?: string;
      messageId?: string;
      severity?: string;
    }
  ) {
    let queryParams: Record<string, string | number> = {};
    if (params?.begin) queryParams.begin = params.begin;
    if (params?.end) queryParams.end = params.end;
    if (params?.ascending) queryParams.ascending = params.ascending;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.event) queryParams.event = params.event;
    if (params?.recipient) queryParams.recipient = params.recipient;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.subject) queryParams.subject = params.subject;
    if (params?.messageId) queryParams['message-id'] = params.messageId;
    if (params?.severity) queryParams.severity = params.severity;

    let response = await this.axios.get(`/v3/${domain}/events`, { params: queryParams });
    return response.data as { items: EventItem[]; paging: { next: string; previous: string } };
  }

  async getEventsPage(url: string) {
    let response = await this.axios.get(url);
    return response.data as { items: EventItem[]; paging: { next: string; previous: string } };
  }

  // ==================== Suppressions - Bounces ====================

  async listBounces(domain: string, params?: { limit?: number; skip?: number }) {
    let response = await this.axios.get(`/v3/${domain}/bounces`, { params });
    return response.data as { items: BounceItem[]; paging: PagingInfo };
  }

  async getBounce(domain: string, address: string) {
    let response = await this.axios.get(
      `/v3/${domain}/bounces/${encodeURIComponent(address)}`
    );
    return response.data as BounceItem;
  }

  async addBounce(
    domain: string,
    params: { address: string; code?: number; error?: string; createdAt?: string }
  ) {
    let formData = new URLSearchParams();
    formData.append('address', params.address);
    if (params.code) formData.append('code', String(params.code));
    if (params.error) formData.append('error', params.error);
    if (params.createdAt) formData.append('created_at', params.createdAt);

    let response = await this.axios.post(`/v3/${domain}/bounces`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteBounce(domain: string, address: string) {
    let response = await this.axios.delete(
      `/v3/${domain}/bounces/${encodeURIComponent(address)}`
    );
    return response.data;
  }

  // ==================== Suppressions - Complaints ====================

  async listComplaints(domain: string, params?: { limit?: number; skip?: number }) {
    let response = await this.axios.get(`/v3/${domain}/complaints`, { params });
    return response.data as { items: ComplaintItem[]; paging: PagingInfo };
  }

  async addComplaint(domain: string, params: { address: string; createdAt?: string }) {
    let formData = new URLSearchParams();
    formData.append('address', params.address);
    if (params.createdAt) formData.append('created_at', params.createdAt);

    let response = await this.axios.post(`/v3/${domain}/complaints`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteComplaint(domain: string, address: string) {
    let response = await this.axios.delete(
      `/v3/${domain}/complaints/${encodeURIComponent(address)}`
    );
    return response.data;
  }

  // ==================== Suppressions - Unsubscribes ====================

  async listUnsubscribes(domain: string, params?: { limit?: number; skip?: number }) {
    let response = await this.axios.get(`/v3/${domain}/unsubscribes`, { params });
    return response.data as { items: UnsubscribeItem[]; paging: PagingInfo };
  }

  async addUnsubscribe(
    domain: string,
    params: { address: string; tag?: string; createdAt?: string }
  ) {
    let formData = new URLSearchParams();
    formData.append('address', params.address);
    if (params.tag) formData.append('tag', params.tag);
    if (params.createdAt) formData.append('created_at', params.createdAt);

    let response = await this.axios.post(`/v3/${domain}/unsubscribes`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteUnsubscribe(domain: string, address: string) {
    let response = await this.axios.delete(
      `/v3/${domain}/unsubscribes/${encodeURIComponent(address)}`
    );
    return response.data;
  }

  // ==================== Allowlist ====================

  async listAllowlist(
    domain: string,
    params?: { limit?: number; page?: string; address?: string; term?: string }
  ) {
    let response = await this.axios.get(`/v3/${domain}/whitelists`, { params });
    return response.data as { items: AllowlistItem[]; paging: PagingInfo };
  }

  async addAllowlistEntry(
    domain: string,
    params: { entryType: 'address' | 'domain'; value: string }
  ) {
    let formData = new URLSearchParams();
    formData.append(params.entryType, params.value);

    let response = await this.axios.post(`/v3/${domain}/whitelists`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteAllowlistEntry(domain: string, value: string) {
    let response = await this.axios.delete(
      `/v3/${domain}/whitelists/${encodeURIComponent(value)}`
    );
    return response.data;
  }

  // ==================== Mailing Lists ====================

  async listMailingLists(params?: { limit?: number; skip?: number; address?: string }) {
    let response = await this.axios.get('/v3/lists/pages', { params });
    return response.data as { items: MailingListItem[] };
  }

  async getMailingList(listAddress: string) {
    let response = await this.axios.get(`/v3/lists/${listAddress}`);
    return response.data as { list: MailingListItem };
  }

  async createMailingList(params: {
    address: string;
    name?: string;
    description?: string;
    accessLevel?: string;
    replyPreference?: string;
  }) {
    let formData = new URLSearchParams();
    formData.append('address', params.address);
    if (params.name) formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.accessLevel) formData.append('access_level', params.accessLevel);
    if (params.replyPreference) formData.append('reply_preference', params.replyPreference);

    let response = await this.axios.post('/v3/lists', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data as { list: MailingListItem };
  }

  async updateMailingList(
    listAddress: string,
    params: {
      address?: string;
      name?: string;
      description?: string;
      accessLevel?: string;
      replyPreference?: string;
    }
  ) {
    let formData = new URLSearchParams();
    if (params.address) formData.append('address', params.address);
    if (params.name) formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.accessLevel) formData.append('access_level', params.accessLevel);
    if (params.replyPreference) formData.append('reply_preference', params.replyPreference);

    let response = await this.axios.put(`/v3/lists/${listAddress}`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data as { list: MailingListItem };
  }

  async deleteMailingList(listAddress: string) {
    let response = await this.axios.delete(`/v3/lists/${listAddress}`);
    return response.data;
  }

  // ==================== Mailing List Members ====================

  async listMailingListMembers(
    listAddress: string,
    params?: { limit?: number; skip?: number; subscribed?: boolean }
  ) {
    let response = await this.axios.get(`/v3/lists/${listAddress}/members/pages`, { params });
    return response.data as { items: MailingListMember[] };
  }

  async getMailingListMember(listAddress: string, memberAddress: string) {
    let response = await this.axios.get(`/v3/lists/${listAddress}/members/${memberAddress}`);
    return response.data as { member: MailingListMember };
  }

  async addMailingListMember(
    listAddress: string,
    params: {
      address: string;
      name?: string;
      vars?: Record<string, unknown>;
      subscribed?: boolean;
      upsert?: boolean;
    }
  ) {
    let formData = new URLSearchParams();
    formData.append('address', params.address);
    if (params.name) formData.append('name', params.name);
    if (params.vars) formData.append('vars', JSON.stringify(params.vars));
    if (params.subscribed !== undefined)
      formData.append('subscribed', String(params.subscribed));
    if (params.upsert !== undefined) formData.append('upsert', String(params.upsert));

    let response = await this.axios.post(
      `/v3/lists/${listAddress}/members`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data as { member: MailingListMember };
  }

  async updateMailingListMember(
    listAddress: string,
    memberAddress: string,
    params: {
      name?: string;
      vars?: Record<string, unknown>;
      subscribed?: boolean;
    }
  ) {
    let formData = new URLSearchParams();
    if (params.name) formData.append('name', params.name);
    if (params.vars) formData.append('vars', JSON.stringify(params.vars));
    if (params.subscribed !== undefined)
      formData.append('subscribed', String(params.subscribed));

    let response = await this.axios.put(
      `/v3/lists/${listAddress}/members/${memberAddress}`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data as { member: MailingListMember };
  }

  async deleteMailingListMember(listAddress: string, memberAddress: string) {
    let response = await this.axios.delete(
      `/v3/lists/${listAddress}/members/${memberAddress}`
    );
    return response.data;
  }

  // ==================== Templates ====================

  async listTemplates(domain: string, params?: { limit?: number; skip?: number }) {
    let response = await this.axios.get(`/v3/${domain}/templates`, { params });
    return response.data as { items: TemplateItem[] };
  }

  async getTemplate(domain: string, templateName: string, active?: boolean) {
    let params: Record<string, string> = {};
    if (active) params.active = 'yes';
    let response = await this.axios.get(`/v3/${domain}/templates/${templateName}`, { params });
    return response.data as { template: TemplateItem };
  }

  async createTemplate(
    domain: string,
    params: {
      name: string;
      description?: string;
      template?: string;
      tag?: string;
      comment?: string;
    }
  ) {
    let formData = new URLSearchParams();
    formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.template) formData.append('template', params.template);
    if (params.tag) formData.append('tag', params.tag);
    if (params.comment) formData.append('comment', params.comment);

    let response = await this.axios.post(`/v3/${domain}/templates`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data as { template: TemplateItem; message: string };
  }

  async updateTemplate(
    domain: string,
    templateName: string,
    params: { description?: string }
  ) {
    let formData = new URLSearchParams();
    if (params.description) formData.append('description', params.description);

    let response = await this.axios.put(
      `/v3/${domain}/templates/${templateName}`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteTemplate(domain: string, templateName: string) {
    let response = await this.axios.delete(`/v3/${domain}/templates/${templateName}`);
    return response.data;
  }

  // ==================== Template Versions ====================

  async createTemplateVersion(
    domain: string,
    templateName: string,
    params: {
      template: string;
      tag: string;
      comment?: string;
      active?: boolean;
    }
  ) {
    let formData = new URLSearchParams();
    formData.append('template', params.template);
    formData.append('tag', params.tag);
    if (params.comment) formData.append('comment', params.comment);
    if (params.active !== undefined) formData.append('active', params.active ? 'yes' : 'no');

    let response = await this.axios.post(
      `/v3/${domain}/templates/${templateName}/versions`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async listTemplateVersions(
    domain: string,
    templateName: string,
    params?: { page?: string; limit?: number; pivot?: string }
  ) {
    let queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.pivot) queryParams.p = params.pivot;

    let response = await this.axios.get(`/v3/${domain}/templates/${templateName}/versions`, {
      params: queryParams
    });
    return response.data as { template: { versions: TemplateVersionItem[] } };
  }

  async getTemplateVersion(domain: string, templateName: string, tag: string) {
    let response = await this.axios.get(
      `/v3/${domain}/templates/${templateName}/versions/${tag}`
    );
    return response.data as { template: TemplateItem };
  }

  async updateTemplateVersion(
    domain: string,
    templateName: string,
    tag: string,
    params: { template?: string; comment?: string; active?: boolean }
  ) {
    let formData = new URLSearchParams();
    if (params.template) formData.append('template', params.template);
    if (params.comment) formData.append('comment', params.comment);
    if (params.active !== undefined) formData.append('active', params.active ? 'yes' : 'no');

    let response = await this.axios.put(
      `/v3/${domain}/templates/${templateName}/versions/${tag}`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteTemplateVersion(domain: string, templateName: string, tag: string) {
    let response = await this.axios.delete(
      `/v3/${domain}/templates/${templateName}/versions/${tag}`
    );
    return response.data;
  }

  // ==================== Routes ====================

  async listRoutes(params?: { limit?: number; skip?: number }) {
    let response = await this.axios.get('/v3/routes', { params });
    return response.data as { items: RouteItem[]; total_count: number };
  }

  async getRoute(routeId: string) {
    let response = await this.axios.get(`/v3/routes/${routeId}`);
    return response.data as { route: RouteItem };
  }

  async createRoute(params: {
    priority?: number;
    description?: string;
    expression: string;
    actions: string[];
  }) {
    let formData = new URLSearchParams();
    if (params.priority !== undefined) formData.append('priority', String(params.priority));
    if (params.description) formData.append('description', params.description);
    formData.append('expression', params.expression);
    for (let action of params.actions) {
      formData.append('action', action);
    }

    let response = await this.axios.post('/v3/routes', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data as { route: RouteItem; message: string };
  }

  async updateRoute(
    routeId: string,
    params: {
      priority?: number;
      description?: string;
      expression?: string;
      actions?: string[];
    }
  ) {
    let formData = new URLSearchParams();
    if (params.priority !== undefined) formData.append('priority', String(params.priority));
    if (params.description) formData.append('description', params.description);
    if (params.expression) formData.append('expression', params.expression);
    if (params.actions) {
      for (let action of params.actions) {
        formData.append('action', action);
      }
    }

    let response = await this.axios.put(`/v3/routes/${routeId}`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteRoute(routeId: string) {
    let response = await this.axios.delete(`/v3/routes/${routeId}`);
    return response.data;
  }

  // ==================== Email Validation ====================

  async validateEmail(address: string) {
    let response = await this.axios.get('/v4/address/validate', { params: { address } });
    return response.data as EmailValidationResult;
  }

  // ==================== Webhooks ====================

  async listWebhooks(domain: string) {
    let response = await this.axios.get(`/v3/domains/${domain}/webhooks`);
    return response.data as { webhooks: Record<string, { urls: string[] }> };
  }

  async getWebhook(domain: string, webhookName: string) {
    let response = await this.axios.get(`/v3/domains/${domain}/webhooks/${webhookName}`);
    return response.data;
  }

  async createWebhook(domain: string, params: { id: string; url: string }) {
    let formData = new URLSearchParams();
    formData.append('id', params.id);
    formData.append('url', params.url);

    let response = await this.axios.post(
      `/v3/domains/${domain}/webhooks`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async updateWebhook(domain: string, webhookName: string, url: string) {
    let formData = new URLSearchParams();
    formData.append('url', url);

    let response = await this.axios.put(
      `/v3/domains/${domain}/webhooks/${webhookName}`,
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deleteWebhook(domain: string, webhookName: string) {
    let response = await this.axios.delete(`/v3/domains/${domain}/webhooks/${webhookName}`);
    return response.data;
  }

  // ==================== Logs and Metrics ====================

  async queryMetrics(params: MetricsQuery) {
    let response = await this.axios.post('/v1/analytics/metrics', {
      start: params.start,
      end: params.end,
      resolution: params.resolution,
      duration: params.duration,
      dimensions: params.dimensions,
      metrics: params.metrics,
      filter: buildFilter(params.filters),
      include_subaccounts: params.includeSubaccounts,
      include_aggregates: params.includeAggregates
    });

    return response.data as MetricsResponse;
  }

  async queryLogs(params: LogsQuery) {
    let response = await this.axios.post('/v1/analytics/logs', {
      start: params.start,
      end: params.end,
      duration: params.duration,
      events: params.events,
      metric_events: params.metricEvents,
      filter: buildFilter(params.filters),
      include_subaccounts: params.includeSubaccounts,
      include_totals: params.includeTotals,
      pagination: params.pagination
    });

    return response.data as LogsResponse;
  }

  // ==================== Stats ====================

  async getStats(
    domain: string,
    params: {
      event: string[];
      start?: string;
      end?: string;
      resolution?: string;
      duration?: string;
    }
  ) {
    let queryParams = new URLSearchParams();
    for (let event of params.event) {
      queryParams.append('event', event);
    }
    if (params.start) queryParams.append('start', params.start);
    if (params.end) queryParams.append('end', params.end);
    if (params.resolution) queryParams.append('resolution', params.resolution);
    if (params.duration) queryParams.append('duration', params.duration);

    let response = await this.axios.get(`/v3/${domain}/stats/total`, { params: queryParams });
    return response.data as {
      stats: StatsItem[];
      start: string;
      end: string;
      resolution: string;
    };
  }
}

// ==================== Types ====================

export type DomainItem = {
  id: string;
  name: string;
  state: string;
  type: string;
  spam_action: string;
  wildcard: boolean;
  created_at: string;
  web_prefix: string;
  web_scheme: string;
  is_disabled: boolean;
};

export type DnsRecord = {
  record_type: string;
  valid: string;
  name: string;
  value: string;
  priority?: string;
};

export type TrackingSettings = {
  open: { active: boolean };
  click: { active: boolean };
  unsubscribe: { active: boolean; html_footer: string; text_footer: string };
};

export type EventItem = {
  id: string;
  event: string;
  timestamp: number;
  recipient?: string;
  message?: {
    headers?: {
      from?: string;
      to?: string;
      subject?: string;
      'message-id'?: string;
    };
  };
  severity?: string;
  reason?: string;
  'delivery-status'?: {
    code?: number;
    message?: string;
    description?: string;
  };
  tags?: string[];
  campaigns?: unknown[];
  'log-level'?: string;
  [key: string]: unknown;
};

export type StoredMessage = Record<string, unknown>;

export type MailgunMessageFile = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export type BounceItem = {
  address: string;
  code: string;
  error: string;
  created_at: string;
};

export type ComplaintItem = {
  address: string;
  created_at: string;
};

export type UnsubscribeItem = {
  address: string;
  tag: string;
  created_at: string;
};

export type AllowlistItem = {
  type?: string;
  value?: string;
  reason?: string;
  createdAt?: string;
};

export type MailingListItem = {
  address: string;
  name: string;
  description: string;
  access_level: string;
  reply_preference: string;
  members_count: number;
  created_at: string;
};

export type MailingListMember = {
  address: string;
  name: string;
  subscribed: boolean;
  vars: Record<string, unknown>;
};

export type TemplateItem = {
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  id: string;
  version?: {
    tag: string;
    template: string;
    engine: string;
    active: boolean;
    comment: string;
    createdAt: string;
  };
};

export type TemplateVersionItem = {
  tag: string;
  template?: string;
  engine?: string;
  active?: boolean;
  comment?: string;
  createdAt?: string;
};

export type RouteItem = {
  id: string;
  priority: number;
  description: string;
  expression: string;
  actions: string[];
  created_at: string;
};

export type EmailValidationResult = {
  address: string;
  is_disposable_address: boolean;
  is_role_address: boolean;
  reason: string[];
  result: string;
  risk: string;
};

export type PagingInfo = {
  first: string;
  last: string;
  next: string;
  previous: string;
};

export type MailgunFilter = {
  attribute: string;
  comparator: string;
  values?: Array<{
    value: string;
    label?: string;
  }>;
};

export type MetricsQuery = {
  start?: string;
  end?: string;
  resolution?: string;
  duration?: string;
  dimensions?: string[];
  metrics?: string[];
  filters?: MailgunFilter[];
  includeSubaccounts?: boolean;
  includeAggregates?: boolean;
};

export type MetricsResponse = {
  start?: string;
  end?: string;
  resolution?: string;
  duration?: string;
  dimensions?: string[];
  items: Array<{
    dimensions?: Array<{
      dimension?: string;
      value?: string;
      display_value?: string;
    }>;
    metrics?: Record<string, unknown>;
  }>;
  aggregates?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
};

export type LogsQuery = {
  start?: string;
  end?: string;
  duration: string;
  events?: string[];
  metricEvents?: string[];
  filters?: MailgunFilter[];
  includeSubaccounts?: boolean;
  includeTotals?: boolean;
  pagination?: {
    sort?: string;
    token?: string;
    limit?: number;
  };
};

export type LogsResponse = {
  start: string;
  end: string;
  items: Record<string, unknown>[];
  pagination: Record<string, unknown>;
  aggregates?: Record<string, unknown>;
};

export type StatsItem = {
  time: string;
  accepted?: { incoming: number; outgoing: number; total: number };
  delivered?: { smtp: number; http: number; optimized: number; total: number };
  failed?: {
    permanent: { bounce: number; 'delayed-bounce': number; suppressed: number; total: number };
    temporary: { espblock: number; total: number };
  };
  opened?: { total: number };
  clicked?: { total: number };
  unsubscribed?: { total: number };
  complained?: { total: number };
  stored?: { total: number };
};
