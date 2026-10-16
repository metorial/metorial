import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface ClientConfig {
  token: string;
  websiteDomain: string;
}

export class Client {
  private axios;

  constructor(config: ClientConfig) {
    if (!config.token?.trim()) {
      throw createApiServiceError('An API key is required. Reconnect with a valid API key.');
    }
    let baseURL: string;
    try {
      let url = new URL(config.websiteDomain);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        throw createApiServiceError(
          'websiteDomain must be an HTTP or HTTPS website URL without credentials, query parameters, or a fragment.'
        );
      }
      baseURL = url.toString().replace(/\/+$/, '');
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Brilliant Directories',
        operation: 'validate websiteDomain',
        reason: 'brilliant_directories_invalid_website_url',
        fallbackMessage: 'Provide the complete website URL, including https://.'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Brilliant Directories',
          reason: 'brilliant_directories_request_failed',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        }),
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    this.axios.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (isApiErrorRecord(data) && data.status === 'error') {
        throw buildApiServiceError(
          { response: { data, status: response.status } },
          {
            providerLabel: 'Brilliant Directories',
            reason: 'brilliant_directories_api_error'
          }
        );
      }
      if (response.config.url?.endsWith('/fields')) {
        if (!Array.isArray(data)) {
          throw createApiServiceError(
            'Brilliant Directories returned an invalid writable-fields response.'
          );
        }
        return response;
      }
      if (!isApiErrorRecord(data) || typeof data.status !== 'string') {
        throw createApiServiceError(
          'Brilliant Directories returned an invalid response without a status.'
        );
      }
      if (
        data.status !== 'success' ||
        !Object.hasOwn(data, 'message') ||
        data.message === undefined
      ) {
        throw createApiServiceError(
          'Brilliant Directories returned an invalid success response without a result.'
        );
      }
      return response;
    });
  }

  // ─── Token ───────────────────────────────────────────────────────

  async verifyToken(): Promise<any> {
    let response = await this.axios.get('/api/v2/token/verify');
    return response.data;
  }

  // ─── Users / Members ─────────────────────────────────────────────

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/api/v2/user/get/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async getUserByProperty(
    property: string,
    propertyValue: string,
    options?: { limit?: number; page?: string }
  ): Promise<any> {
    let params: Record<string, string> = { property, property_value: propertyValue };
    if (options?.limit !== undefined) {
      if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) {
        throw createApiServiceError('limit must be an integer between 1 and 100.');
      }
      params.limit = String(options.limit);
    }
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
    let response = await this.axios.get(`/api/v2/leads/get/${encodeURIComponent(leadId)}`);
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
    let response = await this.axios.delete('/api/v2/leads/delete', {
      data: this.toFormData({ lead_id: leadId, bdapi_model: 'leads' })
    });
    return response.data;
  }

  // ─── Reviews ─────────────────────────────────────────────────────

  async getReview(reviewId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/v2/users_reviews/get/${encodeURIComponent(reviewId)}`
    );
    return response.data;
  }

  async getReviewByProperty(property: string, propertyValue: string): Promise<any> {
    let response = await this.axios.get('/api/v2/users_reviews/get', {
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
    let response = await this.axios.delete('/api/v2/users_reviews/delete', {
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
    let response = await this.axios.get(
      `/api/v2/data_posts/get/${encodeURIComponent(postId)}`
    );
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
    let response = await this.axios.get(
      `/api/v2/users_portfolio_groups/get/${encodeURIComponent(groupId)}`
    );
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
    let response = await this.axios.get(
      `/api/v2/users_portfolio/get/${encodeURIComponent(photoId)}`
    );
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
      data: this.toFormData({ photo_id: photoId })
    });
    return response.data;
  }

  // ─── Post Types (Data Categories) ───────────────────────────────

  async getCategory(categoryId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/v2/data_categories/get/${encodeURIComponent(categoryId)}`
    );
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
    let { q, ...filters } = params;
    let response = await this.axios.get('/api/v2/data_categories/get', {
      params: {
        ...(q === undefined
          ? {}
          : { property: 'data_name', property_value: q, property_logic: 'contains' }),
        ...filters
      }
    });
    return response.data;
  }

  async getCategoryCustomFields(dataId: string): Promise<any> {
    let response = await this.axios.post(
      '/api/v2/data_categories/custom_fields',
      this.toFormData({ data_id: dataId })
    );
    return response.data;
  }

  // ─── Widgets ─────────────────────────────────────────────────────

  async getWidget(widgetId: string): Promise<any> {
    let response = await this.axios.get(
      `/api/v2/data_widgets/get/${encodeURIComponent(widgetId)}`
    );
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
    let response = await this.axios.get(
      `/api/v2/users_clicks/get/${encodeURIComponent(clickId)}`
    );
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
    let response = await this.axios.get(
      `/api/v2/unsubscribe_list/get/${encodeURIComponent(unsubscribeId)}`
    );
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
      data: this.toFormData({ id: unsubscribeId })
    });
    return response.data;
  }

  async listRecords(model: string, params: URLSearchParams): Promise<any> {
    let response = await this.axios.get(`/api/v2/${model}/get`, { params });
    return response.data;
  }

  async getFields(model: string, formName?: string): Promise<unknown[]> {
    let response = await this.axios.get(`/api/v2/${model}/fields`, {
      params: { form_name: formName }
    });
    return response.data;
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private toFormData(data: Record<string, any>): string {
    if (
      data.limit !== undefined &&
      (!Number.isInteger(Number(data.limit)) ||
        Number(data.limit) < 1 ||
        Number(data.limit) > 100)
    ) {
      throw createApiServiceError('limit must be an integer between 1 and 100.');
    }
    for (let key of [
      'rating_overall',
      'rating_service',
      'rating_response',
      'rating_expertise',
      'rating_results',
      'rating_language'
    ]) {
      let value = data[key];
      if (
        value !== undefined &&
        (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)
      ) {
        throw createApiServiceError(`${key} must be an integer between 1 and 5.`);
      }
    }
    let params = new URLSearchParams();
    for (let [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }
}
