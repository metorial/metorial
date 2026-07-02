import { createAxios } from 'slates';
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; isOAuth?: boolean }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: config.isOAuth
          ? `Bearer ${config.token}`
          : `Token token=${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Slates Integration (slates.dev)'
      }
    });
  }

  // --- Helpers ---

  private parsePagination(meta: any): PaginationMeta {
    return {
      currentPage: meta?.['current-page'] ?? 1,
      nextPage: meta?.['next-page'] ?? null,
      prevPage: meta?.['prev-page'] ?? null,
      totalPages: meta?.['total-pages'] ?? 1,
      totalCount: meta?.['total-count'] ?? 0
    };
  }

  private mapClient(item: any): NusiiClient {
    let attrs = item.attributes || {};
    return {
      clientId: String(item.id),
      email: attrs.email || '',
      name: attrs.name || '',
      surname: attrs.surname || '',
      fullName: attrs.full_name || '',
      currency: attrs.currency || '',
      business: attrs.business || '',
      locale: attrs.locale || '',
      pdfPageSize: attrs.pdf_page_size || '',
      web: attrs.web || '',
      telephone: attrs.telephone || '',
      address: attrs.address || '',
      city: attrs.city || '',
      postcode: attrs.postcode || '',
      country: attrs.country || '',
      state: attrs.state || ''
    };
  }

  private mapProposal(item: any): NusiiProposal {
    let attrs = item.attributes || {};
    let sectionIds = (item.relationships?.sections?.data || []).map((s: any) => String(s.id));
    return {
      proposalId: String(item.id),
      title: attrs.title || '',
      accountId: attrs.account_id,
      status: attrs.status || 'draft',
      publicId: attrs.public_id || '',
      preparedById: attrs.prepared_by_id ?? null,
      clientId: attrs.client_id ?? null,
      senderId: attrs.sender_id ?? null,
      currency: attrs.currency || '',
      archivedAt: attrs.archived_at ?? null,
      sectionIds
    };
  }

  private mapSection(item: any): NusiiSection {
    let attrs = item.attributes || {};
    let lineItemIds = (item.relationships?.line_items?.data || []).map((li: any) =>
      String(li.id)
    );
    return {
      sectionId: String(item.id),
      currency: attrs.currency || '',
      accountId: attrs.account_id,
      proposalId: attrs.proposal_id ?? null,
      templateId: attrs.template_id ?? null,
      title: attrs.title || '',
      name: attrs.name ?? null,
      body: attrs.body ?? null,
      position: attrs.position ?? 0,
      reusable: attrs.reusable ?? false,
      sectionType: attrs.section_type || 'text',
      createdAt: attrs.created_at || '',
      updatedAt: attrs.updated_at || '',
      pageBreak: attrs.page_break ?? false,
      optional: attrs.optional ?? false,
      selected: attrs.selected ?? false,
      includeTotal: attrs.include_total ?? false,
      totalInCents: attrs.total_in_cents ?? 0,
      totalFormatted: attrs.total_formatted || '',
      lineItemIds
    };
  }

  private mapLineItem(item: any): NusiiLineItem {
    let attrs = item.attributes || {};
    return {
      lineItemId: String(item.id),
      sectionId: attrs.section_id,
      name: attrs.name || '',
      position: attrs.position ?? 0,
      costType: attrs.cost_type || 'fixed',
      recurringType: attrs.recurring_type ?? null,
      perType: attrs.per_type ?? null,
      quantity: attrs.quantity ?? null,
      updatedAt: attrs.updated_at || '',
      createdAt: attrs.created_at || '',
      currency: attrs.currency || '',
      amountInCents: attrs.amount_in_cents ?? 0,
      amountFormatted: attrs.amount_formatted || '',
      totalInCents: attrs.total_in_cents ?? 0,
      totalFormatted: attrs.total_formatted || ''
    };
  }

  private mapTemplate(item: any): NusiiTemplate {
    let attrs = item.attributes || {};
    return {
      templateId: String(item.id),
      name: attrs.name || '',
      accountId: attrs.account_id,
      createdAt: attrs.created_at || '',
      publicTemplate: attrs.public_template ?? false,
      dummyTemplate: attrs.dummy_template ?? false
    };
  }

  private mapActivity(item: any): NusiiActivity {
    let attrs = item.attributes || {};
    return {
      activityId: String(item.id),
      activityType: attrs.activity_type || '',
      ipAddress: attrs.ip_address ?? null,
      additionalFields: attrs.additional_fields ?? null,
      proposalId: attrs.proposal_id ?? null,
      clientId: attrs.client_id ?? null
    };
  }

  private mapUser(item: any): NusiiUser {
    let attrs = item.attributes || {};
    return {
      userId: String(item.id),
      email: attrs.email || '',
      name: attrs.name || ''
    };
  }

  private mapTheme(item: any): NusiiTheme {
    let attrs = item.attributes || {};
    return {
      themeId: String(item.id),
      name: attrs.name || ''
    };
  }

  private mapWebhookEndpoint(item: any): NusiiWebhookEndpoint {
    let attrs = item.attributes || {};
    return {
      webhookEndpointId: String(item.id),
      events: attrs.events || [],
      targetUrl: attrs.target_url || ''
    };
  }

  // --- Clients ---

  async listClients(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiClient>> {
    let response = await this.axios.get('/clients', { params: { page, per: perPage } });
    let items = (response.data.data || []).map((item: any) => this.mapClient(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async getClient(clientId: string): Promise<NusiiClient> {
    let response = await this.axios.get(`/clients/${clientId}`);
    return this.mapClient(response.data.data);
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
    return this.mapClient(response.data.data);
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
  ): Promise<NusiiClient> {
    let response = await this.axios.put(`/clients/${clientId}`, {
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
    return this.mapClient(response.data.data);
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.axios.delete(`/clients/${clientId}`);
  }

  // --- Proposals ---

  async listProposals(params?: {
    status?: string;
    archived?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResult<NusiiProposal>> {
    let response = await this.axios.get('/proposals', {
      params: {
        status: params?.status,
        archived: params?.archived,
        page: params?.page ?? 1,
        per: params?.perPage ?? 25
      }
    });
    let items = (response.data.data || []).map((item: any) => this.mapProposal(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async getProposal(proposalId: string): Promise<NusiiProposal> {
    let response = await this.axios.get(`/proposals/${proposalId}`);
    return this.mapProposal(response.data.data);
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
    return this.mapProposal(response.data.data);
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
    let response = await this.axios.put(`/proposals/${proposalId}`, {
      title: data.title,
      client_id: data.clientId,
      prepared_by_id: data.preparedById,
      expires_at: data.expiresAt,
      display_date: data.displayDate,
      report: data.report,
      exclude_total: data.excludeTotal,
      exclude_total_in_pdf: data.excludeTotalInPdf,
      theme: data.theme
    });
    return this.mapProposal(response.data.data);
  }

  async deleteProposal(proposalId: string): Promise<void> {
    await this.axios.delete(`/proposals/${proposalId}`);
  }

  async archiveProposal(proposalId: string): Promise<NusiiProposal> {
    let response = await this.axios.put(`/proposals/${proposalId}/archive`);
    return this.mapProposal(response.data.data);
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
  }> {
    let body: Record<string, any> = {};

    if (data.email) {
      body.email = data.email;
    }
    if (data.recipients) {
      body.recipients = data.recipients.map(r => ({
        name: r.name,
        email: r.email,
        eligible_to_sign: r.eligibleToSign
      }));
    }
    if (data.subject) body.subject = data.subject;
    if (data.message) body.message = data.message;
    if (data.cc) body.cc = data.cc;
    if (data.bcc) body.bcc = data.bcc;
    if (data.senderId !== undefined) body.sender_id = data.senderId;
    if (data.senderEmail) body.sender_email = data.senderEmail;
    if (data.saveEmailTemplate !== undefined)
      body.save_email_template = data.saveEmailTemplate;

    let response = await this.axios.put(`/proposals/${proposalId}/send_proposal`, body);
    let d = response.data;
    return {
      status: d.status || '',
      sentAt: d.sent_at || '',
      senderId: d.sender_id ?? null,
      senderName: d.sender_name || ''
    };
  }

  // --- Sections ---

  async listSections(params?: {
    proposalId?: number;
    templateId?: number;
    includeLineItems?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResult<NusiiSection>> {
    let response = await this.axios.get('/sections', {
      params: {
        proposal_id: params?.proposalId,
        template_id: params?.templateId,
        include_line_items: params?.includeLineItems,
        page: params?.page ?? 1,
        per: params?.perPage ?? 25
      }
    });
    let items = (response.data.data || []).map((item: any) => this.mapSection(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async getSection(sectionId: string): Promise<NusiiSection> {
    let response = await this.axios.get(`/sections/${sectionId}`);
    return this.mapSection(response.data.data);
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
  }): Promise<NusiiSection> {
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
    return this.mapSection(response.data.data);
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
    let response = await this.axios.put(`/sections/${sectionId}`, {
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
    return this.mapSection(response.data.data);
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.axios.delete(`/sections/${sectionId}`);
  }

  // --- Line Items ---

  async listLineItems(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiLineItem>> {
    let response = await this.axios.get('/line_items', { params: { page, per: perPage } });
    let items = (response.data.data || []).map((item: any) => this.mapLineItem(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async listLineItemsBySection(sectionId: string): Promise<NusiiLineItem[]> {
    let response = await this.axios.get(`/sections/${sectionId}/line_items`);
    return (response.data.data || []).map((item: any) => this.mapLineItem(item));
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
    let response = await this.axios.post(`/sections/${sectionId}/line_items`, {
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
    return this.mapLineItem(response.data.data);
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
    let response = await this.axios.put(`/line_items/${lineItemId}`, {
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
    return this.mapLineItem(response.data.data);
  }

  async deleteLineItem(lineItemId: string): Promise<void> {
    await this.axios.delete(`/line_items/${lineItemId}`);
  }

  // --- Templates ---

  async listTemplates(publicTemplates?: boolean): Promise<NusiiTemplate[]> {
    let response = await this.axios.get('/templates', {
      params: { public_templates: publicTemplates }
    });
    return (response.data.data || []).map((item: any) => this.mapTemplate(item));
  }

  async getTemplate(templateId: string): Promise<NusiiTemplate> {
    let response = await this.axios.get(`/templates/${templateId}`);
    return this.mapTemplate(response.data.data);
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
    let items = (response.data.data || []).map((item: any) => this.mapActivity(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async getActivity(activityId: string): Promise<NusiiActivity> {
    let response = await this.axios.get(`/proposal_activities/${activityId}`);
    return this.mapActivity(response.data.data);
  }

  // --- Users ---

  async listUsers(
    page: number = 1,
    perPage: number = 25
  ): Promise<PaginatedResult<NusiiUser>> {
    let response = await this.axios.get('/users', { params: { page, per: perPage } });
    let items = (response.data.data || []).map((item: any) => this.mapUser(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  // --- Themes ---

  async listThemes(): Promise<NusiiTheme[]> {
    let response = await this.axios.get('/themes');
    return (response.data.data || []).map((item: any) => this.mapTheme(item));
  }

  // --- Account ---

  async getAccount(): Promise<NusiiAccount> {
    let response = await this.axios.get('/account/me');
    let item = response.data.data;
    let attrs = item?.attributes || {};
    return {
      accountId: String(item?.id || ''),
      company: attrs.company || '',
      currency: attrs.currency || '',
      locale: attrs.locale || '',
      theme: attrs.theme || ''
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
    let items = (response.data.data || []).map((item: any) => this.mapWebhookEndpoint(item));
    let pagination = this.parsePagination(response.data.meta);
    return { items, pagination };
  }

  async getWebhookEndpoint(webhookEndpointId: string): Promise<NusiiWebhookEndpoint> {
    let response = await this.axios.get(`/webhook_endpoints/${webhookEndpointId}`);
    return this.mapWebhookEndpoint(response.data.data);
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
    return this.mapWebhookEndpoint(response.data.data);
  }

  async deleteWebhookEndpoint(webhookEndpointId: string): Promise<void> {
    await this.axios.delete(`/webhook_endpoints/${webhookEndpointId}`);
  }
}
