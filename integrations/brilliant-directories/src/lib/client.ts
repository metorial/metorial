import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  websiteDomain: string;
}

export class Client {
  private axios;

  constructor(config: ClientConfig) {
    let baseURL = config.websiteDomain.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL,
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  // ─── Token ───────────────────────────────────────────────────────

  async verifyToken(): Promise<{ status: string; message: string }> {
    let response = await this.axios.get('/api/v2/token/verify');
    return response.data;
  }

  // ─── Users / Members ─────────────────────────────────────────────

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/user/get/${userId}`);
    return response.data;
  }

  async getUserByProperty(
    property: string,
    propertyValue: string,
    options?: { limit?: number; page?: string }
  ): Promise<any> {
    let params: Record<string, string> = { property, property_value: propertyValue };
    if (options?.limit) params.limit = String(options.limit);
    if (options?.page) params.page = options.page;
    let response = await this.axios.get('/api/v2/user/get', { params });
    return response.data;
  }

  async createUser(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/user/create', this.toFormData(data));
    return response.data;
  }

  async updateUser(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v2/user/update', this.toFormData(data));
    return response.data;
  }

  async deleteUser(userId: string, deleteImages?: boolean): Promise<any> {
    let data: Record<string, any> = { user_id: userId };
    if (deleteImages !== undefined) data.delete_images = deleteImages ? '1' : '0';
    let response = await this.axios.delete('/api/v2/user/delete', {
      data: this.toFormData(data)
    });
    return response.data;
  }

  async searchUsers(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/user/search', this.toFormData(params));
    return response.data;
  }

  async getUserTransactions(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/user/transactions', this.toFormData(params));
    return response.data;
  }

  async verifyUserLogin(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/user/login', this.toFormData(data));
    return response.data;
  }

  // ─── Leads ───────────────────────────────────────────────────────

  async getLead(leadId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/leads/get/${leadId}`);
    return response.data;
  }

  async getLeadByProperty(property: string, propertyValue: string): Promise<any> {
    let response = await this.axios.get('/api/v2/leads/get', {
      params: { property, property_value: propertyValue }
    });
    return response.data;
  }

  async createLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/leads/create',
      this.toFormData({ ...data, bdapi_model: 'leads' })
    );
    return response.data;
  }

  async updateLead(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      '/api/v2/leads/update',
      this.toFormData({ ...data, bdapi_model: 'leads' })
    );
    return response.data;
  }

  async matchLead(leadId: string, usersToMatch: string): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/leads/match',
      this.toFormData({
        lead_id: leadId,
        users_to_match: usersToMatch,
        bdapi_model: 'leads',
        action: 'match'
      })
    );
    return response.data;
  }

  async deleteLead(leadId: string): Promise<any> {
    let response = await this.axios.delete(`/api/v2/leads/delete/${leadId}`, {
      data: this.toFormData({ lead_id: leadId, bdapi_model: 'leads' })
    });
    return response.data;
  }

  // ─── Reviews ─────────────────────────────────────────────────────

  async getReview(reviewId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/user_reviews/get/${reviewId}`);
    return response.data;
  }

  async getReviewByProperty(property: string, propertyValue: string): Promise<any> {
    let response = await this.axios.get('/api/v2/user_reviews/get', {
      params: { property, property_value: propertyValue }
    });
    return response.data;
  }

  async createReview(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/users_reviews/create',
      this.toFormData(data)
    );
    return response.data;
  }

  async updateReview(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v2/users_reviews/update', this.toFormData(data));
    return response.data;
  }

  async deleteReview(reviewId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/user_reviews/delete', {
      data: this.toFormData({ review_id: reviewId })
    });
    return response.data;
  }

  async searchReviews(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/users_reviews/search',
      this.toFormData(params)
    );
    return response.data;
  }

  // ─── Single Image Posts (Data Posts) ─────────────────────────────

  async getPost(postId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/data_posts/get/${postId}`);
    return response.data;
  }

  async getPostByProperty(property: string, propertyValue: string): Promise<any> {
    let response = await this.axios.get('/api/v2/data_posts/get', {
      params: { property, property_value: propertyValue }
    });
    return response.data;
  }

  async createPost(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/data_posts/create', this.toFormData(data));
    return response.data;
  }

  async updatePost(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v2/data_posts/update', this.toFormData(data));
    return response.data;
  }

  async deletePost(postId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/data_posts/delete', {
      data: this.toFormData({ post_id: postId })
    });
    return response.data;
  }

  async searchPosts(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/data_posts/search', this.toFormData(params));
    return response.data;
  }

  // ─── Multi-Image Posts (Portfolio Groups) ────────────────────────

  async getPortfolioGroup(groupId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/users_portfolio_groups/get/${groupId}`);
    return response.data;
  }

  async getPortfolioGroupByProperty(property: string, propertyValue: string): Promise<any> {
    let response = await this.axios.get('/api/v2/users_portfolio_groups/get', {
      params: { property, property_value: propertyValue }
    });
    return response.data;
  }

  async createPortfolioGroup(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/users_portfolio_groups/create',
      this.toFormData(data)
    );
    return response.data;
  }

  async updatePortfolioGroup(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      '/api/v2/users_portfolio_groups/update',
      this.toFormData(data)
    );
    return response.data;
  }

  async deletePortfolioGroup(groupId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/users_portfolio_groups/delete', {
      data: this.toFormData({ group_id: groupId })
    });
    return response.data;
  }

  async searchPortfolioGroups(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/users_portfolio_groups/search',
      this.toFormData(params)
    );
    return response.data;
  }

  // ─── Album Photos (Portfolio) ────────────────────────────────────

  async getAlbumPhoto(photoId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/users_portfolio/get/${photoId}`);
    return response.data;
  }

  async createAlbumPhoto(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/users_portfolio/create',
      this.toFormData(data)
    );
    return response.data;
  }

  async updateAlbumPhoto(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      '/api/v2/users_portfolio/update',
      this.toFormData(data)
    );
    return response.data;
  }

  async deleteAlbumPhoto(photoId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/users_portfolio/delete', {
      data: this.toFormData({ portfolio_id: photoId })
    });
    return response.data;
  }

  // ─── Post Types (Data Categories) ───────────────────────────────

  async getCategory(categoryId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/data_categories/get/${categoryId}`);
    return response.data;
  }

  async createCategory(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/data_categories/create',
      this.toFormData(data)
    );
    return response.data;
  }

  async updateCategory(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      '/api/v2/data_categories/update',
      this.toFormData(data)
    );
    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/data_categories/delete', {
      data: this.toFormData({ data_id: categoryId })
    });
    return response.data;
  }

  async searchCategories(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/data_categories/search',
      this.toFormData(params)
    );
    return response.data;
  }

  async getCategoryCustomFields(): Promise<any> {
    let response = await this.axios.post('/api/v2/data_categories/custom_fields');
    return response.data;
  }

  // ─── Widgets ─────────────────────────────────────────────────────

  async getWidget(widgetId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/data_widgets/get/${widgetId}`);
    return response.data;
  }

  async createWidget(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/data_widgets/create', this.toFormData(data));
    return response.data;
  }

  async updateWidget(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v2/data_widgets/update', this.toFormData(data));
    return response.data;
  }

  async deleteWidget(widgetId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/data_widgets/delete', {
      data: this.toFormData({ widget_id: widgetId })
    });
    return response.data;
  }

  async renderWidget(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/data_widgets/render',
      this.toFormData(params)
    );
    return response.data;
  }

  // ─── User Click Tracking ─────────────────────────────────────────

  async getClick(clickId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/users_clicks/get/${clickId}`);
    return response.data;
  }

  async createClick(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v2/users_clicks/create', this.toFormData(data));
    return response.data;
  }

  async updateClick(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v2/users_clicks/update', this.toFormData(data));
    return response.data;
  }

  async deleteClick(clickId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/users_clicks/delete', {
      data: this.toFormData({ click_id: clickId })
    });
    return response.data;
  }

  // ─── Unsubscribe ─────────────────────────────────────────────────

  async getUnsubscribe(unsubscribeId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/unsubscribe_list/get/${unsubscribeId}`);
    return response.data;
  }

  async createUnsubscribe(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/unsubscribe_list/create',
      this.toFormData(data)
    );
    return response.data;
  }

  async updateUnsubscribe(data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      '/api/v2/unsubscribe_list/update',
      this.toFormData(data)
    );
    return response.data;
  }

  async deleteUnsubscribe(unsubscribeId: string): Promise<any> {
    let response = await this.axios.delete('/api/v2/unsubscribe_list/delete', {
      data: this.toFormData({ unsub_id: unsubscribeId })
    });
    return response.data;
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private toFormData(data: Record<string, any>): string {
    let params = new URLSearchParams();
    for (let [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }
}
