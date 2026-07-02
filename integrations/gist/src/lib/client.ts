import { createAxios } from 'slates';

export class GistClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.getgist.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Contacts ──

  async getContact(contactId: string): Promise<any> {
    let response = await this.api.get(`/contacts/${contactId}`);
    return response.data;
  }

  async getContactByEmail(email: string): Promise<any> {
    let response = await this.api.get('/contacts', { params: { email } });
    return response.data;
  }

  async getContactByUserId(userId: string): Promise<any> {
    let response = await this.api.get('/contacts', { params: { user_id: userId } });
    return response.data;
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
    let response = await this.api.get('/contacts', { params });
    return response.data;
  }

  async createOrUpdateContact(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/contacts', data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.api.delete(`/contacts/${contactId}`);
  }

  async batchImportContacts(contacts: Record<string, any>[]): Promise<any> {
    let response = await this.api.post('/contacts/batch', { contacts });
    return response.data;
  }

  async getBatchStatus(batchId: string): Promise<any> {
    let response = await this.api.get(`/contacts/batch/${batchId}`);
    return response.data;
  }

  // ── Conversations ──

  async getConversation(conversationId: string): Promise<any> {
    let response = await this.api.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async listConversations(params?: {
    page?: number;
    per_page?: number;
    order?: string;
  }): Promise<any> {
    let response = await this.api.get('/conversations', { params });
    return response.data;
  }

  async searchConversations(params?: Record<string, any>): Promise<any> {
    let response = await this.api.get('/conversations/search', { params });
    return response.data;
  }

  async createConversation(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/conversations', data);
    return response.data;
  }

  async updateConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/conversations/${conversationId}`, data);
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.api.delete(`/conversations/${conversationId}`);
  }

  async replyToConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/messages`, data);
    return response.data;
  }

  async listMessages(
    conversationId: string,
    params?: { page?: number; per_page?: number }
  ): Promise<any> {
    let response = await this.api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  }

  async assignConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/assign`, data);
    return response.data;
  }

  async unassignConversation(conversationId: string): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/unassign`);
    return response.data;
  }

  async closeConversation(conversationId: string): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/close`);
    return response.data;
  }

  async snoozeConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/snooze`, data);
    return response.data;
  }

  async unsnoozeConversation(conversationId: string): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/unsnooze`);
    return response.data;
  }

  async prioritizeConversation(
    conversationId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/prioritize`, data);
    return response.data;
  }

  async tagConversation(conversationId: string, tagName: string): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/tag`, {
      name: tagName
    });
    return response.data;
  }

  async untagConversation(conversationId: string, tagName: string): Promise<any> {
    let response = await this.api.post(`/conversations/${conversationId}/untag`, {
      name: tagName
    });
    return response.data;
  }

  async getConversationCountsGlobal(): Promise<any> {
    let response = await this.api.get('/conversations/counts/global');
    return response.data;
  }

  async getConversationCountsTeams(): Promise<any> {
    let response = await this.api.get('/conversations/counts/teams');
    return response.data;
  }

  async getConversationCountsTeammates(): Promise<any> {
    let response = await this.api.get('/conversations/counts/teammates');
    return response.data;
  }

  // ── Campaigns ──

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.api.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async listCampaigns(params?: { page?: number; per_page?: number }): Promise<any> {
    let response = await this.api.get('/campaigns', { params });
    return response.data;
  }

  async subscribeToCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/campaigns/${campaignId}/subscribe`, data);
    return response.data;
  }

  async unsubscribeFromCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/campaigns/${campaignId}/unsubscribe`, data);
    return response.data;
  }

  // ── Tags ──

  async listTags(): Promise<any> {
    let response = await this.api.get('/tags');
    return response.data;
  }

  async createTag(name: string): Promise<any> {
    let response = await this.api.post('/tags', { name });
    return response.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.api.delete(`/tags/${tagId}`);
  }

  async tagContacts(tagName: string, contactIds: string[]): Promise<any> {
    let response = await this.api.post('/tags', {
      name: tagName,
      contacts: contactIds.map(id => ({ id }))
    });
    return response.data;
  }

  async untagContacts(tagName: string, contactIds: string[]): Promise<any> {
    let response = await this.api.post('/tags', {
      name: tagName,
      contacts: contactIds.map(id => ({ id, untag: true }))
    });
    return response.data;
  }

  // ── Segments ──

  async getSegment(segmentId: string): Promise<any> {
    let response = await this.api.get(`/segments/${segmentId}`);
    return response.data;
  }

  async listSegments(params?: { include_count?: boolean }): Promise<any> {
    let response = await this.api.get('/segments', { params });
    return response.data;
  }

  // ── Events ──

  async trackEvent(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/events', data);
    return response.data;
  }

  async listEvents(): Promise<any> {
    let response = await this.api.get('/events');
    return response.data;
  }

  // ── Forms ──

  async getForm(formId: string): Promise<any> {
    let response = await this.api.get(`/forms/${formId}`);
    return response.data;
  }

  async listForms(): Promise<any> {
    let response = await this.api.get('/forms');
    return response.data;
  }

  async listFormSubmissions(
    formId: string,
    params?: { page?: number; per_page?: number }
  ): Promise<any> {
    let response = await this.api.get(`/forms/${formId}/submissions`, { params });
    return response.data;
  }

  async subscribeToForm(formId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/forms/${formId}/subscribe`, data);
    return response.data;
  }

  // ── Subscription Types ──

  async listSubscriptionTypes(): Promise<any> {
    let response = await this.api.get('/subscription_types');
    return response.data;
  }

  async getSubscriptionType(subscriptionTypeId: string): Promise<any> {
    let response = await this.api.get(`/subscription_types/${subscriptionTypeId}`);
    return response.data;
  }

  async attachSubscriptionType(
    subscriptionTypeId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(
      `/subscription_types/${subscriptionTypeId}/attach`,
      data
    );
    return response.data;
  }

  async detachSubscriptionType(
    subscriptionTypeId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.api.post(
      `/subscription_types/${subscriptionTypeId}/detach`,
      data
    );
    return response.data;
  }

  // ── Knowledge Base ──

  async getArticle(articleId: string): Promise<any> {
    let response = await this.api.get(`/articles/${articleId}`);
    return response.data;
  }

  async listArticles(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    collection_id?: string;
    author_id?: string;
  }): Promise<any> {
    let response = await this.api.get('/articles', { params });
    return response.data;
  }

  async createArticle(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/articles', data);
    return response.data;
  }

  async updateArticle(articleId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/articles/${articleId}`, data);
    return response.data;
  }

  async deleteArticle(articleId: string): Promise<void> {
    await this.api.delete(`/articles/${articleId}`);
  }

  async searchArticles(data: Record<string, any>): Promise<any> {
    let response = await this.api.patch('/articles/search', data);
    return response.data;
  }

  async getKnowledgeBaseSettings(): Promise<any> {
    let response = await this.api.get('/articles/settings');
    return response.data;
  }

  // ── Collections ──

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.api.get(`/collections/${collectionId}`);
    return response.data;
  }

  async listCollections(): Promise<any> {
    let response = await this.api.get('/collections');
    return response.data;
  }

  async createCollection(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/collections', data);
    return response.data;
  }

  async updateCollection(collectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.post(`/collections/${collectionId}`, data);
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.api.delete(`/collections/${collectionId}`);
  }

  // ── Teams ──

  async getTeam(teamId: string): Promise<any> {
    let response = await this.api.get(`/teams/${teamId}`);
    return response.data;
  }

  async listTeams(): Promise<any> {
    let response = await this.api.get('/teams');
    return response.data;
  }

  // ── Teammates ──

  async getTeammate(teammateId: string): Promise<any> {
    let response = await this.api.get(`/teammates/${teammateId}`);
    return response.data;
  }

  async listTeammates(): Promise<any> {
    let response = await this.api.get('/teammates');
    return response.data;
  }

  // ── E-Commerce: Stores ──

  async createStore(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/stores', data);
    return response.data;
  }

  async updateStore(storeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/stores/${storeId}`, data);
    return response.data;
  }

  async getStore(storeId: string): Promise<any> {
    let response = await this.api.get(`/stores/${storeId}`);
    return response.data;
  }

  async listStores(): Promise<any> {
    let response = await this.api.get('/stores');
    return response.data;
  }

  // ── E-Commerce: Customers ──

  async createCustomer(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/customers', data);
    return response.data;
  }

  async updateCustomer(customerId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/customers/${customerId}`, data);
    return response.data;
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.api.get(`/customers/${customerId}`);
    return response.data;
  }

  // ── E-Commerce: Products ──

  async createProduct(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/products', data);
    return response.data;
  }

  async updateProduct(productId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/products/${productId}`, data);
    return response.data;
  }

  async getProduct(productId: string): Promise<any> {
    let response = await this.api.get(`/products/${productId}`);
    return response.data;
  }

  // ── E-Commerce: Product Variants ──

  async createProductVariant(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/product_variants', data);
    return response.data;
  }

  async updateProductVariant(variantId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/product_variants/${variantId}`, data);
    return response.data;
  }

  async getProductVariant(variantId: string): Promise<any> {
    let response = await this.api.get(`/product_variants/${variantId}`);
    return response.data;
  }

  // ── E-Commerce: Carts ──

  async createOrUpdateCart(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/carts', data);
    return response.data;
  }

  async deleteCart(cartId: string): Promise<void> {
    await this.api.delete(`/carts/${cartId}`);
  }

  // ── E-Commerce: Orders ──

  async createOrder(data: Record<string, any>): Promise<any> {
    let response = await this.api.post('/orders', data);
    return response.data;
  }

  async updateOrder(orderId: string, data: Record<string, any>): Promise<any> {
    let response = await this.api.patch(`/orders/${orderId}`, data);
    return response.data;
  }

  // ── Workspace ──

  async getWorkspaceMeta(): Promise<any> {
    let response = await this.api.get('/token');
    return response.data;
  }
}
