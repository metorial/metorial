import { createAxios } from 'slates';
import type {
  Block,
  BlogPost,
  Booking,
  CreateBlockInput,
  CreatePageInput,
  CreateSiteContactInput,
  CreateSiteInput,
  EventType,
  FormTemplate,
  Invoice,
  OrderWebhookEvent,
  Page,
  PageTheme,
  PaginatedResponse,
  PaginationParams,
  Site,
  SiteAnalytics,
  SiteContact,
  SiteContactItem,
  UpdateBlockInput,
  UpdatePageInput,
  UpdateSiteInput,
  Webhook,
  WebhookTrigger,
  Workspace
} from './types';

let BASE_URL = 'https://api.fingertip.com/v1';

export class FingertipClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sites ──

  async listSites(
    params?: PaginationParams & {
      search?: string;
      workspaceId?: string;
      statuses?: string[];
    }
  ): Promise<PaginatedResponse<Site>> {
    let response = await this.axios.get('/sites', { params });
    return response.data;
  }

  async getSite(siteId: string): Promise<Site> {
    let response = await this.axios.get(`/sites/${siteId}`);
    return response.data.site;
  }

  async createSite(input: CreateSiteInput): Promise<Site> {
    let response = await this.axios.post('/sites', input);
    return response.data.site;
  }

  async updateSite(siteId: string, input: UpdateSiteInput): Promise<Site> {
    let response = await this.axios.patch(`/sites/${siteId}`, input);
    return response.data.site;
  }

  async deleteSite(siteId: string): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/sites/${siteId}`);
    return response.data;
  }

  async getSiteAnalytics(
    siteId: string,
    params?: {
      period?: '7d' | '30d' | '90d' | '1y' | 'all';
      includeStore?: boolean;
    }
  ): Promise<SiteAnalytics> {
    let response = await this.axios.get(`/sites/${siteId}/analytics`, { params });
    return response.data;
  }

  // ── Pages ──

  async listPages(
    siteId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Page>> {
    let response = await this.axios.get(`/sites/${siteId}/pages`, { params });
    return response.data;
  }

  async getPage(pageId: string): Promise<Page> {
    let response = await this.axios.get(`/pages/${pageId}`);
    return response.data.page;
  }

  async createPage(siteId: string, input: CreatePageInput): Promise<Page> {
    let response = await this.axios.post(`/sites/${siteId}/pages`, input);
    return response.data.page;
  }

  async updatePage(pageId: string, input: UpdatePageInput): Promise<Page> {
    let response = await this.axios.patch(`/pages/${pageId}`, input);
    return response.data.page;
  }

  async deletePage(pageId: string): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/pages/${pageId}`);
    return response.data;
  }

  // ── Page Themes ──

  async getPageTheme(pageId: string): Promise<PageTheme> {
    let response = await this.axios.get(`/pages/${pageId}/theme`);
    return response.data.pageTheme;
  }

  async updatePageTheme(pageId: string, content: any): Promise<PageTheme> {
    let response = await this.axios.patch(`/pages/${pageId}/theme`, { content });
    return response.data.pageTheme;
  }

  // ── Blocks ──

  async listBlocks(pageId: string): Promise<Block[]> {
    let response = await this.axios.get(`/pages/${pageId}/blocks`);
    return response.data.blocks;
  }

  async getBlock(blockId: string): Promise<Block> {
    let response = await this.axios.get(`/blocks/${blockId}`);
    return response.data.block ?? response.data;
  }

  async createBlock(pageId: string, input: CreateBlockInput): Promise<Block> {
    let response = await this.axios.post(`/pages/${pageId}/blocks`, input);
    return response.data.block;
  }

  async updateBlock(blockId: string, input: UpdateBlockInput): Promise<Block> {
    let response = await this.axios.patch(`/blocks/${blockId}`, input);
    return response.data.block ?? response.data;
  }

  async deleteBlock(blockId: string): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/blocks/${blockId}`);
    return response.data;
  }

  // ── Site Contacts ──

  async listSiteContacts(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    search?: string;
    marketingStatuses?: string[];
    createdAfter?: string;
  }): Promise<PaginatedResponse<SiteContactItem>> {
    let response = await this.axios.get('/site-contacts', { params });
    return response.data;
  }

  async createSiteContact(input: CreateSiteContactInput): Promise<SiteContact> {
    let response = await this.axios.post('/site-contacts', input);
    return response.data.siteContact;
  }

  // ── Bookings ──

  async listBookings(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResponse<Booking>> {
    let response = await this.axios.get('/bookings', { params });
    return response.data;
  }

  async acceptBooking(bookingId: string, siteId: string): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/bookings/${bookingId}/accept`, { siteId });
    return response.data;
  }

  async declineBooking(
    bookingId: string,
    siteId: string,
    cancellationReason?: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/bookings/${bookingId}/decline`, {
      siteId,
      cancellationReason
    });
    return response.data;
  }

  async completeBooking(
    bookingId: string,
    siteId: string,
    options?: { noShow?: boolean; chargeAmountInCents?: number }
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/bookings/${bookingId}/complete`, {
      siteId,
      ...options
    });
    return response.data;
  }

  async rescheduleBooking(
    bookingId: string,
    startTime: string,
    endTime: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/bookings/${bookingId}/reschedule`, {
      startTime,
      endTime
    });
    return response.data;
  }

  async cancelBooking(
    bookingId: string,
    siteId: string,
    options?: { cancellationReason?: string; chargeCancellationFee?: boolean }
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/bookings/${bookingId}/cancel`, {
      siteId,
      ...options
    });
    return response.data;
  }

  // ── Event Types ──

  async listEventTypes(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<EventType>> {
    let response = await this.axios.get('/event-types', { params });
    return response.data;
  }

  async getEventType(eventTypeId: string): Promise<EventType> {
    let response = await this.axios.get(`/event-types/${eventTypeId}`);
    return response.data.eventType;
  }

  // ── Blog Posts ──

  async listBlogPosts(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<BlogPost>> {
    let response = await this.axios.get('/blog-posts', { params });
    return response.data;
  }

  async getBlogPost(blogPostId: string): Promise<BlogPost> {
    let response = await this.axios.get(`/blog-posts/${blogPostId}`);
    return response.data.post;
  }

  // ── Form Templates ──

  async listFormTemplates(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<FormTemplate>> {
    let response = await this.axios.get('/form-templates', { params });
    return response.data;
  }

  async getFormTemplate(formTemplateId: string): Promise<FormTemplate> {
    let response = await this.axios.get(`/form-templates/${formTemplateId}`);
    return response.data.formTemplate ?? response.data;
  }

  async listFormResponses(params: {
    formTemplateId: string;
    siteId: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/form-responses', { params });
    return response.data;
  }

  // ── Invoices ──

  async listInvoices(params: {
    siteId: string;
    cursor?: string;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: string;
  }): Promise<PaginatedResponse<Invoice>> {
    let response = await this.axios.get('/invoices', { params });
    return response.data;
  }

  // ── Orders ──

  async listOrders(params: {
    site: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<OrderWebhookEvent>> {
    let response = await this.axios.get('/orders', { params });
    return response.data;
  }

  // ── Workspaces ──

  async listWorkspaces(params?: PaginationParams): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get('/workspaces', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data.workspace ?? response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    input: { name?: string; slug?: string }
  ): Promise<Workspace> {
    let response = await this.axios.patch(`/workspaces/${workspaceId}`, input);
    return response.data.workspace ?? response.data;
  }

  // ── Webhooks ──

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<Webhook>> {
    let response = await this.axios.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(
    endpointUrl: string,
    triggers: WebhookTrigger[]
  ): Promise<{ id: string }> {
    let response = await this.axios.post('/webhooks', { endpointUrl, triggers });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    input: { endpointUrl?: string; triggers?: WebhookTrigger[] }
  ): Promise<Webhook> {
    let response = await this.axios.patch(`/webhooks/${webhookId}`, input);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
