import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { nusiiApiError } from './errors';
import {
  array,
  boolean,
  id,
  invalid,
  nullableNumber,
  nullableText,
  number,
  optionalBoolean,
  optionalNumber,
  optionalText,
  record,
  relationshipIds,
  text
} from './response';
import type {
  NusiiAccount,
  NusiiActivity,
  NusiiClient,
  NusiiLineItem,
  NusiiProposal,
  NusiiSection,
  NusiiTemplate,
  NusiiTheme,
  NusiiUser,
  NusiiWebhookEndpoint,
  PaginatedResult,
  PaginationMeta
} from './types';

let BASE_URL = 'https://app.nusii.com/api/v2';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: {
    token: string;
    isOAuth?: boolean;
    refreshToken?: string;
    expiresAt?: string;
  }) {
    if (!config.token.trim())
      throw createApiServiceError('Reconnect your Nusii account with a valid token.');
    // Older OAuth connections stored refresh/expiry state before the auth-kind flag existed.
    let isOAuth = config.isOAuth ?? Boolean(config.refreshToken || config.expiresAt);
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: {
        value: isOAuth ? `Bearer ${config.token}` : `Token token=${config.token}`
      },
      headers: { Accept: 'application/json' },
      errorAdapter: error => nusiiApiError(error)
    });
  }

  private parsePagination(value: unknown): PaginationMeta {
    let meta = record(value, 'pagination metadata');
    return {
      currentPage: number(meta.current_page ?? meta['current-page'], 'current page'),
      nextPage: nullableNumber(meta.next_page ?? meta['next-page'], 'next page'),
      prevPage: nullableNumber(meta.prev_page ?? meta['prev-page'], 'previous page'),
      totalPages: number(meta.total_pages ?? meta['total-pages'], 'total pages'),
      totalCount: number(meta.total_count ?? meta['total-count'], 'total count')
    };
  }

  private mapClient(value: unknown, creating: true): NusiiClient;
  private mapClient(
    value: unknown,
    creating?: false
  ): NusiiClient & { surname: string; business: string };
  private mapClient(value: unknown, creating = false): NusiiClient {
    let item = record(value, 'client');
    let attrs = record(item.attributes, 'client attributes');
    return {
      clientId: id(item.id),
      email: text(attrs.email, 'client email'),
      name: text(attrs.name, 'client name'),
      surname: creating
        ? optionalText(attrs.surname, 'client surname')
        : text(attrs.surname, 'client surname'),
      fullName: text(attrs.full_name, 'client full name'),
      currency: text(attrs.currency, 'client currency'),
      business: creating
        ? optionalText(attrs.business, 'client business')
        : text(attrs.business, 'client business'),
      locale: text(attrs.locale, 'client locale'),
      pdfPageSize: text(attrs.pdf_page_size, 'client PDF page size'),
      web: optionalText(attrs.web, 'client website'),
      telephone: optionalText(attrs.telephone, 'client telephone'),
      address: optionalText(attrs.address, 'client address'),
      city: optionalText(attrs.city, 'client city'),
      postcode: optionalText(attrs.postcode, 'client postcode'),
      country: optionalText(attrs.country, 'client country'),
      state: optionalText(attrs.state, 'client state'),
      raw: item
    };
  }

  private mapProposal(value: unknown, archiveResponse = false): NusiiProposal {
    let item = record(value, 'proposal');
    let attrs = record(item.attributes, 'proposal attributes');
    let sectionIds = relationshipIds(item, 'sections');
    if (!archiveResponse && sectionIds === undefined)
      throw invalid('proposal section relationships');
    return {
      proposalId: id(item.id),
      title: text(attrs.title, 'proposal title'),
      accountId: number(attrs.account_id, 'proposal account ID'),
      status: text(attrs.status, 'proposal status', true),
      publicId: text(attrs.public_id, 'proposal public ID', true),
      preparedById: nullableNumber(attrs.prepared_by_id, 'preparer ID'),
      clientId: nullableNumber(attrs.client_id, 'client ID'),
      senderId: nullableNumber(attrs.sender_id, 'sender ID'),
      currency: text(attrs.currency, 'proposal currency'),
      archivedAt: nullableText(attrs.archived_at, 'archive date'),
      sectionIds: sectionIds ?? [],
      raw: item
    };
  }

  private mapSection(
    value: unknown,
    withRelationships: true
  ): NusiiSection & { lineItemIds: string[] };
  private mapSection(value: unknown, withRelationships?: false): NusiiSection;
  private mapSection(value: unknown, withRelationships = false): NusiiSection {
    let item = record(value, 'section');
    let attrs = record(item.attributes, 'section attributes');
    let lineItemIds = relationshipIds(item, 'line_items');
    if (withRelationships && lineItemIds === undefined)
      throw invalid('section line-item relationships');
    return {
      sectionId: id(item.id),
      currency: text(attrs.currency, 'section currency'),
      accountId: number(attrs.account_id, 'section account ID'),
      proposalId: nullableNumber(attrs.proposal_id, 'section proposal ID'),
      templateId: nullableNumber(attrs.template_id, 'section template ID'),
      title: text(attrs.title, 'section title'),
      name: nullableText(attrs.name, 'section name'),
      body: nullableText(attrs.body, 'section body'),
      position: number(attrs.position, 'section position'),
      reusable: boolean(attrs.reusable, 'section reusable flag'),
      sectionType: text(attrs.section_type, 'section type', true),
      createdAt: text(attrs.created_at, 'section creation date', true),
      updatedAt: text(attrs.updated_at, 'section update date', true),
      pageBreak: boolean(attrs.page_break, 'page break flag'),
      optional: boolean(attrs.optional, 'optional section flag'),
      selected: boolean(attrs.selected, 'selected section flag'),
      includeTotal: boolean(attrs.include_total, 'include total flag'),
      totalInCents: number(attrs.total_in_cents, 'section total'),
      totalFormatted: text(attrs.total_formatted, 'formatted section total'),
      lineItemIds,
      raw: item
    };
  }

  private mapLineItem(value: unknown): NusiiLineItem {
    let item = record(value, 'line item');
    let attrs = record(item.attributes, 'line item attributes');
    return {
      lineItemId: id(item.id),
      sectionId: number(attrs.section_id, 'line item section ID'),
      name: text(attrs.name, 'line item name'),
      position: number(attrs.position, 'line item position'),
      costType: text(attrs.cost_type, 'line item cost type', true),
      recurringType: nullableText(attrs.recurring_type, 'recurring type'),
      perType: nullableText(attrs.per_type, 'per-unit type'),
      quantity: nullableNumber(attrs.quantity, 'line item quantity'),
      updatedAt: text(attrs.updated_at, 'line item update date', true),
      createdAt: text(attrs.created_at, 'line item creation date', true),
      currency: text(attrs.currency, 'line item currency'),
      amountInCents: number(attrs.amount_in_cents ?? attrs.amount, 'line item amount'),
      amountFormatted: text(attrs.amount_formatted, 'formatted line item amount'),
      totalInCents: number(attrs.total_in_cents, 'line item total'),
      totalFormatted: text(attrs.total_formatted, 'formatted line item total'),
      raw: item
    };
  }

  private mapTemplate(value: unknown): NusiiTemplate {
    let item = record(value, 'template');
    let attrs = record(item.attributes, 'template attributes');
    return {
      templateId: id(item.id),
      name: text(attrs.name, 'template name'),
      accountId: optionalNumber(attrs.account_id, 'template account ID'),
      createdAt: text(attrs.created_at, 'template creation date', true),
      publicTemplate: boolean(attrs.public_template, 'public template flag'),
      dummyTemplate: optionalBoolean(attrs.dummy_template, 'dummy template flag'),
      raw: item
    };
  }

  private mapActivity(value: unknown): NusiiActivity {
    let item = record(value, 'activity');
    let attrs = record(item.attributes, 'activity attributes');
    return {
      activityId: id(item.id),
      activityType: text(attrs.activity_type, 'activity type', true),
      ipAddress: nullableText(attrs.ip_address, 'activity IP address'),
      additionalFields:
        attrs.additional_fields == null
          ? null
          : record(attrs.additional_fields, 'activity details'),
      proposalId: nullableNumber(attrs.proposal_id, 'activity proposal ID'),
      clientId: nullableNumber(attrs.client_id, 'activity client ID'),
      raw: item
    };
  }

  private mapUser(value: unknown): NusiiUser {
    let item = record(value, 'user');
    let attrs = record(item.attributes, 'user attributes');
    return {
      userId: id(item.id),
      email: text(attrs.email, 'user email'),
      name: text(attrs.name, 'user name'),
      raw: item
    };
  }

  private mapTheme(value: unknown): NusiiTheme {
    let item = record(value, 'theme');
    let attrs =
      item.attributes === undefined ? item : record(item.attributes, 'theme attributes');
    return { themeId: id(item.id), name: text(attrs.name, 'theme name'), raw: item };
  }

  private mapWebhookEndpoint(value: unknown): NusiiWebhookEndpoint {
    let item = record(value, 'webhook endpoint');
    let attrs = record(item.attributes, 'webhook endpoint attributes');
    return {
      webhookEndpointId: id(item.id),
      events: array(attrs.events, 'webhook events').map(event => text(event, 'webhook event')),
      targetUrl: text(attrs.target_url, 'webhook target URL'),
      raw: item
    };
  }

  // --- Clients ---

  async listClients(
    page: number = 1,
    perPage: number = 25,
    filters: { query?: string; email?: string; emails?: string[] } = {}
  ): Promise<PaginatedResult<NusiiClient & { surname: string; business: string }>> {
    let response = await this.axios.get('/clients', {
      params: {
        page,
        per: perPage,
        query: filters.query,
        email: filters.email,
        emails: filters.emails?.join(',')
      }
    });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapClient(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async getClient(
    clientId: string
  ): Promise<NusiiClient & { surname: string; business: string }> {
    let response = await this.axios.get(`/clients/${encodeURIComponent(clientId)}`);
    return { ...this.mapClient(response.data?.data), raw: record(response.data, 'response') };
  }

  async createClient(data: {
    email: string;
    name?: string;
    surname?: string;
    currency?: string;
    business?: string;
    locale?: string;
    pdfPageSize?: string;
    web?: string;
    telephone?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
    state?: string;
  }): Promise<NusiiClient> {
    if (!data.name?.trim())
      throw createApiServiceError(
        'Provide the client first name in name. Nusii requires it when creating a client.'
      );
    let response = await this.axios.post('/clients', {
      client: {
        email: data.email,
        name: data.name,
        surname: data.surname,
        currency: data.currency,
        business: data.business,
        locale: data.locale,
        pdf_page_size: data.pdfPageSize,
        web: data.web,
        telephone: data.telephone,
        address: data.address,
        city: data.city,
        postcode: data.postcode,
        country: data.country,
        state: data.state
      }
    });
    return {
      ...this.mapClient(response.data?.data, true),
      raw: record(response.data, 'response')
    };
  }

  async updateClient(
    clientId: string,
    data: {
      email?: string;
      name?: string;
      surname?: string;
      currency?: string;
      business?: string;
      locale?: string;
      pdfPageSize?: string;
      web?: string;
      telephone?: string;
      address?: string;
      city?: string;
      postcode?: string;
      country?: string;
      state?: string;
    }
  ): Promise<NusiiClient & { surname: string; business: string }> {
    let response = await this.axios.put(`/clients/${encodeURIComponent(clientId)}`, {
      client: {
        email: data.email,
        name: data.name,
        surname: data.surname,
        currency: data.currency,
        business: data.business,
        locale: data.locale,
        pdf_page_size: data.pdfPageSize,
        web: data.web,
        telephone: data.telephone,
        address: data.address,
        city: data.city,
        postcode: data.postcode,
        country: data.country,
        state: data.state
      }
    });
    return { ...this.mapClient(response.data?.data), raw: record(response.data, 'response') };
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.axios.delete(`/clients/${encodeURIComponent(clientId)}`);
  }

  // --- Proposals ---

  async listProposals(params?: {
    status?: string;
    query?: string;
    recipientEmail?: string;
    archived?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResult<NusiiProposal>> {
    let response = await this.axios.get('/proposals', {
      params: {
        status: params?.status,
        query: params?.query,
        recipient_email: params?.recipientEmail,
        archived: params?.archived,
        page: params?.page ?? 1,
        per: params?.perPage ?? 25
      }
    });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapProposal(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async getProposal(proposalId: string): Promise<NusiiProposal> {
    let response = await this.axios.get(`/proposals/${encodeURIComponent(proposalId)}`);
    return {
      ...this.mapProposal(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async createProposal(data: {
    title: string;
    clientId?: number;
    clientEmail?: string;
    templateId?: number;
    preparedById?: number;
    expiresAt?: string;
    displayDate?: string;
    report?: boolean;
    excludeTotal?: boolean;
    excludeTotalInPdf?: boolean;
    theme?: string;
    documentSectionTitle?: string;
  }): Promise<NusiiProposal> {
    let response = await this.axios.post('/proposals', {
      proposal: {
        title: data.title,
        client_id: data.clientId,
        client_email: data.clientEmail,
        template_id: data.templateId,
        prepared_by_id: data.preparedById,
        expires_at: data.expiresAt,
        display_date: data.displayDate,
        report: data.report,
        exclude_total: data.excludeTotal,
        exclude_total_in_pdf: data.excludeTotalInPdf,
        theme: data.theme,
        document_section_title: data.documentSectionTitle
      }
    });
    return {
      ...this.mapProposal(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async updateProposal(
    proposalId: string,
    data: {
      title?: string;
      clientId?: number;
      preparedById?: number;
      expiresAt?: string;
      displayDate?: string;
      report?: boolean;
      excludeTotal?: boolean;
      excludeTotalInPdf?: boolean;
      theme?: string;
    }
  ): Promise<NusiiProposal> {
    let response = await this.axios.put(`/proposals/${encodeURIComponent(proposalId)}`, {
      proposal: {
        title: data.title,
        client_id: data.clientId,
        prepared_by_id: data.preparedById,
        expires_at: data.expiresAt,
        display_date: data.displayDate,
        report: data.report,
        exclude_total: data.excludeTotal,
        exclude_total_in_pdf: data.excludeTotalInPdf,
        theme: data.theme
      }
    });
    return {
      ...this.mapProposal(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async deleteProposal(proposalId: string): Promise<void> {
    await this.axios.delete(`/proposals/${encodeURIComponent(proposalId)}`);
  }

  async archiveProposal(proposalId: string): Promise<NusiiProposal> {
    let response = await this.axios.put(
      `/proposals/${encodeURIComponent(proposalId)}/archive`
    );
    return {
      ...this.mapProposal(response.data?.data, true),
      raw: record(response.data, 'response')
    };
  }

  async sendProposal(
    proposalId: string,
    data: {
      email?: string;
      recipients?: Array<{ name?: string; email: string; eligibleToSign?: boolean }>;
      subject?: string;
      message?: string;
      cc?: string;
      bcc?: string;
      senderId?: number;
      senderEmail?: string;
      saveEmailTemplate?: boolean;
    }
  ): Promise<{
    status: string;
    sentAt: string;
    senderId: number | null;
    senderName: string;
    raw: Record<string, unknown>;
  }> {
    if (
      data.recipients !== undefined &&
      (data.recipients.length < 1 || data.recipients.length > 10)
    ) {
      throw createApiServiceError('Provide between 1 and 10 recipients.');
    }
    if (data.recipients === undefined && !data.email?.trim()) {
      throw createApiServiceError('Provide recipientEmail or a non-empty recipients list.');
    }
    let body: Record<string, unknown> = {};

    if (data.email !== undefined) {
      body.email = data.email;
    }
    if (data.recipients) {
      body.recipients = data.recipients.map(r => ({
        name: r.name,
        email: r.email,
        eligible_to_sign: r.eligibleToSign
      }));
    }
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.message !== undefined) body.message = data.message;
    if (data.cc !== undefined) body.cc = data.cc;
    if (data.bcc !== undefined) body.bcc = data.bcc;
    if (data.senderId !== undefined) body.sender_id = data.senderId;
    if (data.senderEmail !== undefined) body.sender_email = data.senderEmail;
    if (data.saveEmailTemplate !== undefined)
      body.save_email_template = data.saveEmailTemplate;

    let response = await this.axios.put(
      `/proposals/${encodeURIComponent(proposalId)}/send_proposal`,
      body
    );
    let d = record(response.data, 'send response');
    return {
      status: text(d.status, 'send status', true),
      sentAt: text(d.sent_at, 'send timestamp', true),
      senderId: nullableNumber(d.sender_id, 'sender ID'),
      senderName: text(d.sender_name, 'sender name'),
      raw: record(d, 'send response')
    };
  }

  // --- Sections ---

  async listSections(params?: {
    proposalId?: number;
    templateId?: number;
    includeLineItems?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResult<NusiiSection & { lineItemIds: string[] }>> {
    let response = await this.axios.get('/sections', {
      params: {
        proposal_id: params?.proposalId,
        template_id: params?.templateId,
        include_line_items: params?.includeLineItems,
        page: params?.page ?? 1,
        per: params?.perPage ?? 25
      }
    });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapSection(item, true)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async getSection(sectionId: string): Promise<NusiiSection & { lineItemIds: string[] }> {
    let response = await this.axios.get(`/sections/${encodeURIComponent(sectionId)}`);
    return {
      ...this.mapSection(response.data?.data, true),
      raw: record(response.data, 'response')
    };
  }

  async createSection(data: {
    proposalId?: number;
    templateId?: number;
    title: string;
    body?: string;
    name?: string;
    position?: number;
    reusable?: boolean;
    sectionType?: string;
    pageBreak?: boolean;
    optional?: boolean;
    includeTotal?: boolean;
  }): Promise<NusiiSection & { lineItemIds: string[] }> {
    let response = await this.axios.post('/sections', {
      section: {
        proposal_id: data.proposalId,
        template_id: data.templateId,
        title: data.title,
        body: data.body,
        name: data.name,
        position: data.position,
        reusable: data.reusable,
        section_type: data.sectionType,
        page_break: data.pageBreak,
        optional: data.optional,
        include_total: data.includeTotal
      }
    });
    return {
      ...this.mapSection(response.data?.data, true),
      raw: record(response.data, 'response')
    };
  }

  async updateSection(
    sectionId: string,
    data: {
      title?: string;
      body?: string;
      name?: string;
      position?: number;
      reusable?: boolean;
      pageBreak?: boolean;
      optional?: boolean;
      includeTotal?: boolean;
    }
  ): Promise<NusiiSection> {
    let response = await this.axios.put(`/sections/${encodeURIComponent(sectionId)}`, {
      section: {
        title: data.title,
        body: data.body,
        name: data.name,
        position: data.position,
        reusable: data.reusable,
        page_break: data.pageBreak,
        optional: data.optional,
        include_total: data.includeTotal
      }
    });
    return { ...this.mapSection(response.data?.data), raw: record(response.data, 'response') };
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.axios.delete(`/sections/${encodeURIComponent(sectionId)}`);
  }

  // --- Line Items ---

  async listLineItems(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiLineItem>> {
    let response = await this.axios.get('/line_items', { params: { page, per: perPage } });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapLineItem(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async listLineItemsBySection(sectionId: string): Promise<NusiiLineItem[]> {
    let response = await this.axios.get(
      `/sections/${encodeURIComponent(sectionId)}/line_items`
    );
    return array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapLineItem(item)
    );
  }

  async createLineItem(
    sectionId: string,
    data: {
      name: string;
      costType?: string;
      recurringType?: string;
      perType?: string;
      position?: number;
      quantity?: number;
      amount?: number;
    }
  ): Promise<NusiiLineItem> {
    let response = await this.axios.post(
      `/sections/${encodeURIComponent(sectionId)}/line_items`,
      {
        line_item: {
          name: data.name,
          cost_type: data.costType,
          recurring_type: data.recurringType,
          per_type: data.perType,
          position: data.position,
          quantity: data.quantity,
          amount: data.amount
        }
      }
    );
    return {
      ...this.mapLineItem(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async updateLineItem(
    lineItemId: string,
    data: {
      name?: string;
      costType?: string;
      recurringType?: string;
      perType?: string;
      position?: number;
      quantity?: number;
      amount?: number;
    }
  ): Promise<NusiiLineItem> {
    let response = await this.axios.put(`/line_items/${encodeURIComponent(lineItemId)}`, {
      line_item: {
        name: data.name,
        cost_type: data.costType,
        recurring_type: data.recurringType,
        per_type: data.perType,
        position: data.position,
        quantity: data.quantity,
        amount: data.amount
      }
    });
    return {
      ...this.mapLineItem(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async deleteLineItem(lineItemId: string): Promise<void> {
    await this.axios.delete(`/line_items/${encodeURIComponent(lineItemId)}`);
  }

  // --- Templates ---

  async listTemplates(
    publicTemplates?: boolean,
    page?: number,
    perPage?: number
  ): Promise<PaginatedResult<NusiiTemplate>> {
    let response = await this.axios.get('/templates', {
      params: { public_templates: publicTemplates, page, per: perPage }
    });
    return {
      items: array(response.data?.data, 'resource collection').map(item =>
        this.mapTemplate(item)
      ),
      pagination: this.parsePagination(response.data?.meta),
      raw: record(response.data, 'template response')
    };
  }

  async getTemplate(
    templateId: string
  ): Promise<NusiiTemplate & { accountId: number; dummyTemplate: boolean }> {
    let response = await this.axios.get(`/templates/${encodeURIComponent(templateId)}`);
    let item = record(response.data?.data, 'template');
    let attrs = record(item.attributes, 'template attributes');
    return {
      ...this.mapTemplate(item),
      accountId: number(attrs.account_id, 'template account ID'),
      dummyTemplate: boolean(attrs.dummy_template, 'dummy template flag'),
      raw: record(response.data, 'response')
    };
  }

  // --- Proposal Activities ---

  async listActivities(params?: {
    proposalId?: number;
    clientId?: number;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResult<NusiiActivity>> {
    let response = await this.axios.get('/proposal_activities', {
      params: {
        proposal_id: params?.proposalId,
        client_id: params?.clientId,
        page: params?.page ?? 1,
        per: params?.perPage ?? 25
      }
    });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapActivity(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async getActivity(activityId: string): Promise<NusiiActivity> {
    let response = await this.axios.get(
      `/proposal_activities/${encodeURIComponent(activityId)}`
    );
    return {
      ...this.mapActivity(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  // --- Users ---

  async listUsers(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiUser>> {
    let response = await this.axios.get('/users', { params: { page, per: perPage } });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapUser(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  // --- Themes ---

  async listThemes(): Promise<NusiiTheme[]> {
    let response = await this.axios.get('/themes');
    return array(
      Array.isArray(response.data) ? response.data : response.data?.data,
      'themes'
    ).map(item => this.mapTheme(item));
  }

  // --- Account ---

  async getAccount(): Promise<NusiiAccount> {
    let response = await this.axios.get('/account/me');
    let item = record(response.data?.data, 'account');
    let attrs = record(item.attributes, 'account attributes');
    return {
      accountId: id(item.id),
      company: text(attrs.name ?? attrs.company, 'account name'),
      currency: text(attrs.currency, 'account currency'),
      locale: optionalText(attrs.locale, 'account locale'),
      theme: optionalText(attrs.theme, 'account theme'),
      email: optionalText(attrs.email, 'account email'),
      raw: record(response.data, 'account response')
    };
  }

  // --- Webhooks ---

  async listWebhookEndpoints(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiWebhookEndpoint>> {
    let response = await this.axios.get('/webhook_endpoints', {
      params: { page, per: perPage }
    });
    let items = array(response.data?.data, 'resource collection').map((item: unknown) =>
      this.mapWebhookEndpoint(item)
    );
    let pagination = this.parsePagination(response.data?.meta);
    return { items, pagination, raw: record(response.data, 'response') };
  }

  async getWebhookEndpoint(webhookEndpointId: string): Promise<NusiiWebhookEndpoint> {
    let response = await this.axios.get(
      `/webhook_endpoints/${encodeURIComponent(webhookEndpointId)}`
    );
    return {
      ...this.mapWebhookEndpoint(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async createWebhookEndpoint(
    targetUrl: string,
    events: string[]
  ): Promise<NusiiWebhookEndpoint> {
    let response = await this.axios.post('/webhook_endpoints', {
      webhook_endpoint: {
        target_url: targetUrl,
        events
      }
    });
    return {
      ...this.mapWebhookEndpoint(response.data?.data),
      raw: record(response.data, 'response')
    };
  }

  async deleteWebhookEndpoint(webhookEndpointId: string): Promise<void> {
    await this.axios.delete(`/webhook_endpoints/${encodeURIComponent(webhookEndpointId)}`);
  }
}
