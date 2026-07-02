import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  authType: 'oauth' | 'api_key';
}

export class PandaDocClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let authHeader =
      config.authType === 'api_key' ? `API-Key ${config.token}` : `Bearer ${config.token}`;

    this.axios = createAxios({
      baseURL: 'https://api.pandadoc.com',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Documents ───────────────────────────────────────────────────────

  async createDocument(params: CreateDocumentParams): Promise<any> {
    let response = await this.axios.post('/public/v1/documents', params);
    return response.data;
  }

  async listDocuments(params?: ListDocumentsParams): Promise<any> {
    let response = await this.axios.get('/public/v1/documents', { params });
    return response.data;
  }

  async getDocumentStatus(documentId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/documents/${documentId}`);
    return response.data;
  }

  async getDocumentDetails(documentId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/documents/${documentId}/details`);
    return response.data;
  }

  async sendDocument(documentId: string, params?: SendDocumentParams): Promise<void> {
    await this.axios.post(`/public/v1/documents/${documentId}/send`, params || {});
  }

  async changeDocumentStatus(documentId: string, status: number): Promise<void> {
    await this.axios.patch(`/public/v1/documents/${documentId}/status`, { status });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/public/v1/documents/${documentId}`);
  }

  async downloadDocument(documentId: string): Promise<{ url: string }> {
    let response = await this.axios.get(`/public/v1/documents/${documentId}/download`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });
    if (response.status === 302 || response.status === 301) {
      return { url: response.headers.location || response.headers.Location };
    }
    return { url: response.data?.url || response.request?.responseURL || '' };
  }

  async createDocumentLink(
    documentId: string,
    params: CreateDocumentLinkParams
  ): Promise<any> {
    let response = await this.axios.post(`/public/v1/documents/${documentId}/session`, params);
    return response.data;
  }

  async updateDocument(documentId: string, params: any): Promise<void> {
    await this.axios.patch(`/public/v1/documents/${documentId}`, params);
  }

  async moveDocumentToFolder(documentId: string, folderId: string): Promise<void> {
    await this.axios.post(`/public/v1/documents/${documentId}/move-to-folder/${folderId}`);
  }

  async transferDocumentOwnership(documentId: string, membershipId: string): Promise<void> {
    await this.axios.patch(`/public/v1/documents/${documentId}/ownership`, {
      membership_id: membershipId
    });
  }

  async sendReminder(documentId: string): Promise<void> {
    await this.axios.post(`/public/v1/documents/${documentId}/send-reminder`);
  }

  // ─── Document Recipients ─────────────────────────────────────────────

  async addRecipient(documentId: string, params: any): Promise<any> {
    let response = await this.axios.post(
      `/public/v1/documents/${documentId}/recipients`,
      params
    );
    return response.data;
  }

  async updateRecipient(documentId: string, recipientId: string, params: any): Promise<any> {
    let response = await this.axios.patch(
      `/public/v1/documents/${documentId}/recipients/${recipientId}`,
      params
    );
    return response.data;
  }

  async deleteRecipient(documentId: string, recipientId: string): Promise<void> {
    await this.axios.delete(`/public/v1/documents/${documentId}/recipients/${recipientId}`);
  }

  // ─── Linked Objects ──────────────────────────────────────────────────

  async createLinkedObject(documentId: string, params: any): Promise<any> {
    let response = await this.axios.post(
      `/public/v1/documents/${documentId}/linked-objects`,
      params
    );
    return response.data;
  }

  async listLinkedObjects(documentId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/documents/${documentId}/linked-objects`);
    return response.data;
  }

  async deleteLinkedObject(documentId: string, linkedObjectId: string): Promise<void> {
    await this.axios.delete(
      `/public/v1/documents/${documentId}/linked-objects/${linkedObjectId}`
    );
  }

  // ─── Templates ───────────────────────────────────────────────────────

  async listTemplates(params?: ListTemplatesParams): Promise<any> {
    let response = await this.axios.get('/public/v1/templates', { params });
    return response.data;
  }

  async getTemplateDetails(templateId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/templates/${templateId}/details`);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/public/v1/templates/${templateId}`);
  }

  // ─── Contacts ────────────────────────────────────────────────────────

  async createContact(params: ContactParams): Promise<any> {
    let response = await this.axios.post('/public/v1/contacts', params);
    return response.data;
  }

  async listContacts(email?: string): Promise<any> {
    let params = email ? { email } : undefined;
    let response = await this.axios.get('/public/v1/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: string, params: Partial<ContactParams>): Promise<any> {
    let response = await this.axios.patch(`/public/v1/contacts/${contactId}`, params);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/public/v1/contacts/${contactId}`);
  }

  // ─── Content Library ─────────────────────────────────────────────────

  async listContentLibraryItems(params?: {
    q?: string;
    count?: number;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/public/v1/content-library-items', { params });
    return response.data;
  }

  async getContentLibraryItemDetails(itemId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/content-library-items/${itemId}/details`);
    return response.data;
  }

  // ─── Folders ─────────────────────────────────────────────────────────

  async listDocumentFolders(params?: {
    parent_uuid?: string;
    count?: number;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/public/v1/documents/folders', { params });
    return response.data;
  }

  async createDocumentFolder(params: { name: string; parent_uuid?: string }): Promise<any> {
    let response = await this.axios.post('/public/v1/documents/folders', params);
    return response.data;
  }

  async listTemplateFolders(params?: {
    parent_uuid?: string;
    count?: number;
    page?: number;
  }): Promise<any> {
    let response = await this.axios.get('/public/v1/templates/folders', { params });
    return response.data;
  }

  // ─── Members ─────────────────────────────────────────────────────────

  async listMembers(): Promise<any> {
    let response = await this.axios.get('/public/v1/members');
    return response.data;
  }

  async getCurrentMember(): Promise<any> {
    let response = await this.axios.get('/public/v1/members/current');
    return response.data;
  }

  // ─── Forms ───────────────────────────────────────────────────────────

  async listForms(params?: { count?: number; page?: number }): Promise<any> {
    let response = await this.axios.get('/public/v1/forms', { params });
    return response.data;
  }

  // ─── Webhooks ────────────────────────────────────────────────────────

  async createWebhookSubscription(params: CreateWebhookParams): Promise<any> {
    let response = await this.axios.post('/public/v1/webhook-subscriptions', params);
    return response.data;
  }

  async listWebhookSubscriptions(): Promise<any> {
    let response = await this.axios.get('/public/v1/webhook-subscriptions');
    return response.data;
  }

  async getWebhookSubscription(subscriptionId: string): Promise<any> {
    let response = await this.axios.get(`/public/v1/webhook-subscriptions/${subscriptionId}`);
    return response.data;
  }

  async updateWebhookSubscription(
    subscriptionId: string,
    params: Partial<CreateWebhookParams>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/public/v1/webhook-subscriptions/${subscriptionId}`,
      params
    );
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/public/v1/webhook-subscriptions/${subscriptionId}`);
  }

  // ─── Document Audit Trail ────────────────────────────────────────────

  async getDocumentAuditTrail(documentId: string): Promise<any> {
    let response = await this.axios.get(`/public/v2/documents/${documentId}/audit-trail`);
    return response.data;
  }
}

// ─── Parameter Types ─────────────────────────────────────────────────────

export interface CreateDocumentParams {
  name?: string;
  template_uuid?: string;
  url?: string;
  detect_title_variables?: boolean;
  folder_uuid?: string;
  owner?: { email?: string; membership_id?: string };
  recipients: Array<{
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    signing_order?: number;
  }>;
  tokens?: Array<{ name: string; value: string }>;
  fields?: Record<string, { value: any }>;
  metadata?: Record<string, string>;
  tags?: string[];
  pricing_tables?: any[];
  content_placeholders?: any[];
  images?: any[];
}

export interface ListDocumentsParams {
  q?: string;
  status?: number;
  status__ne?: number;
  deleted?: boolean;
  count?: number;
  page?: number;
  order_by?: string;
  created_from?: string;
  created_to?: string;
  modified_from?: string;
  modified_to?: string;
  completed_from?: string;
  completed_to?: string;
  template_id?: string;
  folder_uuid?: string;
  contact_id?: string;
  membership_id?: string;
  tag?: string;
  id?: string;
  form_id?: string;
  metadata?: Record<string, string>;
}

export interface SendDocumentParams {
  message?: string;
  subject?: string;
  silent?: boolean;
  sender?: { email?: string; membership_id?: string };
}

export interface CreateDocumentLinkParams {
  recipient: string;
  lifetime?: number;
}

export interface ListTemplatesParams {
  q?: string;
  shared?: boolean;
  deleted?: boolean;
  count?: number;
  page?: number;
  id?: string;
  folder_uuid?: string;
  tag?: string;
}

export interface ContactParams {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  phone?: string;
  country?: string;
  state?: string;
  street_address?: string;
}

export interface CreateWebhookParams {
  name: string;
  url: string;
  active: boolean;
  triggers: string[];
  payload?: string[];
}
