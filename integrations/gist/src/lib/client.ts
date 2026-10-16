import {
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { gistApiError, normalizeResponse, requireValue } from './response';

export class GistClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  readonly responses: unknown[] = [];

  constructor(config: { token: string }) {
    requireValue(config.token, 'API token');
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.getgist.com',
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${config.token}` }
    });
  }

  private async request(request: Parameters<typeof requestAxiosData>[1]) {
    let data = await requestAxiosData('Gist API request', request, gistApiError);
    this.responses.push(data);
    if (
      isApiErrorRecord(data) &&
      (data.success === false ||
        data.error ||
        (Array.isArray(data.errors) && data.errors.length && !('status' in data)))
    ) {
      throw gistApiError({ response: { status: 200, data } }, 'Gist API request');
    }
    return normalizeResponse(data) ?? {};
  }

  // ── Contacts ──

  async getContact(contactId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/contacts/${pathId(contactId)}`)
    );
    return responseData;
  }

  async getContactByEmail(email: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get('/contacts', { params: { email } })
    );
    return responseData;
  }

  async getContactByUserId(userId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get('/contacts', { params: { user_id: userId } })
    );
    return responseData;
  }

  async listContacts(params?: {
    page?: number;
    per_page?: number;
    order?: string;
    order_by?: string;
    status?: string;
    tag_id?: string;
    segment_id?: string;
    campaign_id?: string;
    form_id?: string;
    email_like?: string;
    created_since?: string;
  }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/contacts', { params }));
    return responseData;
  }

  async createOrUpdateContact(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/contacts', data));
    return responseData;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request(() => this.api.delete(`/contacts/${pathId(contactId)}`));
  }

  async batchImportContacts(contacts: Record<string, any>[]): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post('/contacts/batch', { contacts })
    );
    return responseData;
  }

  async getBatchStatus(batchId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/contacts/batch/${pathId(batchId)}`)
    );
    return responseData;
  }

  // ── Conversations ──

  async getConversation(conversationId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/conversations/${pathId(conversationId)}`)
    );
    return responseData;
  }

  async listConversations(params?: {
    page?: number;
    per_page?: number;
    order?: string;
  }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/conversations', { params }));
    return responseData;
  }

  async searchConversations(params?: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(
        '/conversations/search',
        { filter_query: params?.filter_query ?? [] },
        { params: pickDefined({ page: params?.page, per_page: params?.per_page }) }
      )
    );
    return responseData;
  }

  async createConversation(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/conversations', data));
    return responseData;
  }

  async updateConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}`, data)
    );
    return responseData;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.request(() => this.api.delete(`/conversations/${pathId(conversationId)}`));
  }

  async replyToConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/conversations/${pathId(conversationId)}/messages`, data)
    );
    return responseData;
  }

  async listMessages(
    conversationId: string,
    params?: { page?: number; per_page?: number; with_notes?: boolean }
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/conversations/${pathId(conversationId)}/messages`, { params })
    );
    return responseData;
  }

  async assignConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}/assign`, data)
    );
    return responseData;
  }

  async unassignConversation(conversationId: string, teammateId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}/assign`, {
        teammate_id: teammateId,
        assignee_id: null
      })
    );
    return responseData;
  }

  async closeConversation(conversationId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}`, {
        state: 'closed',
        type: 'bot'
      })
    );
    return responseData;
  }

  async snoozeConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}`, {
        ...data,
        state: 'snoozed',
        type: 'bot'
      })
    );
    return responseData;
  }

  async unsnoozeConversation(conversationId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}`, {
        state: 'open',
        type: 'bot'
      })
    );
    return responseData;
  }

  async prioritizeConversation(
    conversationId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/conversations/${pathId(conversationId)}/priority`, {
        ...data,
        type: 'bot'
      })
    );
    return responseData;
  }

  async tagConversation(conversationId: string, tagName: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/conversations/${pathId(conversationId)}/tags`, { tags: tagName })
    );
    return responseData;
  }

  async untagConversation(conversationId: string, tagId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.delete(`/conversations/${pathId(conversationId)}/tags`, {
        data: { tag_id: tagId }
      })
    );
    return responseData;
  }

  async getConversationCountsGlobal(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/conversations/count'));
    return responseData;
  }

  async getConversationCountsTeams(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/conversations/count/teams'));
    return responseData;
  }

  async getConversationCountsTeammates(): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get('/conversations/count/teammates')
    );
    return responseData;
  }

  // ── Campaigns ──

  async getCampaign(campaignId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/campaigns/${pathId(campaignId)}`)
    );
    return responseData;
  }

  async listCampaigns(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/campaigns', { params }));
    return responseData;
  }

  async subscribeToCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post('/campaigns', { ...data, id: campaignId, unsubscribed: false })
    );
    return responseData;
  }

  async unsubscribeFromCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post('/campaigns', { ...data, id: campaignId, unsubscribed: true })
    );
    return responseData;
  }

  // ── Tags ──

  async listTags(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/tags', { params }));
    return responseData;
  }

  async createTag(name: string): Promise<any> {
    let responseData = await this.request(() => this.api.post('/tags', { name }));
    return responseData;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.request(() => this.api.delete(`/tags/${pathId(tagId)}`));
  }

  async tagContacts(tagName: string, contactIds: string[]): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post('/tags', {
        name: tagName,
        contacts: contactIds.map(id => ({ id }))
      })
    );
    return responseData;
  }

  async untagContacts(tagName: string, contactIds: string[]): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post('/tags', {
        name: tagName,
        contacts: contactIds.map(id => ({ id, untag: true }))
      })
    );
    return responseData;
  }

  // ── Segments ──

  async getSegment(segmentId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/segments/${pathId(segmentId)}`)
    );
    return responseData;
  }

  async listSegments(params?: {
    include_count?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/segments', { params }));
    return responseData;
  }

  // ── Events ──

  async trackEvent(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/events', data));
    return responseData;
  }

  async listEvents(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get('/events', { params: { ...params, event_type: 'all' } })
    );
    return responseData;
  }

  // ── Forms ──

  async getForm(formId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get('/forms', { params: { form_id: requireValue(formId, 'Form ID') } })
    );
    return responseData;
  }

  async listForms(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/forms', { params }));
    return responseData;
  }

  async listFormSubmissions(
    formId: string,
    params?: { page?: number; per_page?: number }
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/forms/${pathId(formId)}/submissions`, { params })
    );
    return responseData;
  }

  async subscribeToForm(formId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/forms/${pathId(formId)}/subscribe`, data)
    );
    return responseData;
  }

  // ── Subscription Types ──

  async listSubscriptionTypes(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/subscription_types'));
    return responseData;
  }

  async getSubscriptionType(subscriptionTypeId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/subscription_types/${pathId(subscriptionTypeId)}`)
    );
    return responseData;
  }

  async attachSubscriptionType(
    subscriptionTypeId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/subscription_types/${pathId(subscriptionTypeId)}`, {
        ...data,
        subscribed_status: true
      })
    );
    return responseData;
  }

  async detachSubscriptionType(
    subscriptionTypeId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/subscription_types/${pathId(subscriptionTypeId)}`, {
        ...data,
        subscribed_status: false
      })
    );
    return responseData;
  }

  // ── Knowledge Base ──

  async getArticle(articleId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/articles/${pathId(articleId)}`)
    );
    return responseData;
  }

  async listArticles(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    collection_id?: string;
    author_id?: string;
  }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/articles', { params }));
    return responseData;
  }

  async createArticle(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/articles', data));
    return responseData;
  }

  async updateArticle(articleId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/articles/${pathId(articleId)}`, data)
    );
    return responseData;
  }

  async deleteArticle(articleId: string): Promise<void> {
    await this.request(() => this.api.delete(`/articles/${pathId(articleId)}`));
  }

  async searchArticles(
    data: Record<string, any>,
    params?: { page?: number; per_page?: number }
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch('/articles/search', data, { params })
    );
    return responseData;
  }

  async getKnowledgeBaseSettings(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/articles/settings'));
    return responseData;
  }

  // ── Collections ──

  async getCollection(collectionId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/collections/${pathId(collectionId)}`)
    );
    return responseData;
  }

  async listCollections(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/collections', { params }));
    return responseData;
  }

  async createCollection(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/collections', data));
    return responseData;
  }

  async updateCollection(collectionId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/collections/${pathId(collectionId)}`, data)
    );
    return responseData;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.request(() => this.api.delete(`/collections/${pathId(collectionId)}`));
  }

  // ── Teams ──

  async getTeam(teamId: string): Promise<any> {
    let responseData = await this.request(() => this.api.get(`/teams/${pathId(teamId)}`));
    return responseData;
  }

  async listTeams(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/teams', { params }));
    return responseData;
  }

  // ── Teammates ──

  async getTeammate(teammateId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/teammates/${pathId(teammateId)}`)
    );
    return responseData;
  }

  async listTeammates(params?: { page?: number; per_page?: number }): Promise<any> {
    let responseData = await this.request(() => this.api.get('/teammates', { params }));
    return responseData;
  }

  // ── E-Commerce: Stores ──

  async createStore(data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() => this.api.post('/ecommerce/stores', data));
    return responseData;
  }

  async updateStore(storeId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/ecommerce/stores/${pathId(storeId)}`, data)
    );
    return responseData;
  }

  async getStore(storeId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/ecommerce/stores/${pathId(storeId)}`)
    );
    return responseData;
  }

  async listStores(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/ecommerce/stores'));
    return responseData;
  }

  // ── E-Commerce: Customers ──

  async createCustomer(storeId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/ecommerce/stores/${pathId(storeId)}/customers`, data)
    );
    return responseData;
  }

  async updateCustomer(
    storeId: string,
    customerId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(
        `/ecommerce/stores/${pathId(storeId)}/customers/${pathId(customerId)}`,
        data
      )
    );
    return responseData;
  }

  async getCustomer(storeId: string, customerId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/ecommerce/stores/${pathId(storeId)}/customers/${pathId(customerId)}`)
    );
    return responseData;
  }

  // ── E-Commerce: Products ──

  async createProduct(storeId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/ecommerce/stores/${pathId(storeId)}/products`, data)
    );
    return responseData;
  }

  async updateProduct(
    storeId: string,
    productId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(
        `/ecommerce/stores/${pathId(storeId)}/products/${pathId(productId)}`,
        data
      )
    );
    return responseData;
  }

  async getProduct(storeId: string, productId: string): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(`/ecommerce/stores/${pathId(storeId)}/products/${pathId(productId)}`)
    );
    return responseData;
  }

  // ── E-Commerce: Product Variants ──

  async createProductVariant(
    storeId: string,
    productId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(
        `/ecommerce/stores/${pathId(storeId)}/products/${pathId(productId)}/variants`,
        data
      )
    );
    return responseData;
  }

  async updateProductVariant(
    storeId: string,
    productId: string,
    variantId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(
        `/ecommerce/stores/${pathId(storeId)}/products/${pathId(productId)}/variants/${pathId(variantId)}`,
        data
      )
    );
    return responseData;
  }

  async getProductVariant(
    storeId: string,
    productId: string,
    variantId: string
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.get(
        `/ecommerce/stores/${pathId(storeId)}/products/${pathId(productId)}/variants/${pathId(variantId)}`
      )
    );
    return responseData;
  }

  // ── E-Commerce: Carts ──

  async createOrUpdateCart(
    storeId: string,
    customerId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(
        `/ecommerce/stores/${pathId(storeId)}/customers/${pathId(customerId)}/cart`,
        data
      )
    );
    return responseData;
  }

  async deleteCart(storeId: string, customerId: string): Promise<void> {
    await this.request(() =>
      this.api.delete(
        `/ecommerce/stores/${pathId(storeId)}/customers/${pathId(customerId)}/cart`
      )
    );
  }

  // ── E-Commerce: Orders ──

  async createOrder(storeId: string, data: Record<string, any>): Promise<any> {
    let responseData = await this.request(() =>
      this.api.post(`/ecommerce/stores/${pathId(storeId)}/orders`, data)
    );
    return responseData;
  }

  async updateOrder(
    storeId: string,
    orderId: string,
    data: Record<string, any>
  ): Promise<any> {
    let responseData = await this.request(() =>
      this.api.patch(`/ecommerce/stores/${pathId(storeId)}/orders/${pathId(orderId)}`, data)
    );
    return responseData;
  }

  // ── Workspace ──

  async getWorkspaceMeta(): Promise<any> {
    let responseData = await this.request(() => this.api.get('/token/info'));
    return responseData;
  }
}

let pathId = (value: string) => encodeURIComponent(requireValue(value, 'Resource ID'));
