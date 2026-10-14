import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface ClientConfig {
  token: string;
  clientId: string;
  agent?: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private config: ClientConfig) {
    if (!config.token.trim() || !config.clientId.trim()) {
      throw createApiServiceError('GatherUp bearer token and Client ID are required.');
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.gatherup.com/api',
      timeout: 30_000,
      authHeader: { value: `Bearer ${config.token}` },
      errorMapping: {
        extractResponseData: response => {
          if (!isApiErrorRecord(response.data)) return response.data;
          return {
            ...response.data,
            message: response.data.errorMessage,
            code:
              response.data.errorCode === undefined
                ? undefined
                : String(response.data.errorCode)
          };
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'GatherUp',
          reason: 'gatherup_http_error',
          extractUpstreamCode: error => {
            if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
            let upstream = error.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
              ? upstream.code
              : undefined;
          }
        })
    });
    this.http.interceptors.response.use(response => {
      if (!isApiErrorRecord(response.data)) {
        throw createApiServiceError('GatherUp returned an invalid API response.', {
          reason: 'gatherup_invalid_response',
          upstreamStatus: response.status
        });
      }
      let code = response.data.errorCode;
      if (code !== undefined && Number(code) !== 0) {
        let message =
          typeof response.data.errorMessage === 'string'
            ? response.data.errorMessage
            : 'The request failed.';
        throw createApiServiceError(
          `GatherUp API request failed: ${message} (code: ${code})`,
          {
            reason: 'gatherup_api_error',
            upstreamStatus: response.status,
            upstreamCode: String(code)
          }
        );
      }
      return response;
    });
  }

  private buildBody(
    params: Record<string, unknown> = {},
    includeAgent = true
  ): Record<string, unknown> {
    for (let [key, value] of Object.entries(params)) {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        throw createApiServiceError(`${key} must be a whole number.`);
      }
      if ((key === 'page' || key === 'limit') && typeof value === 'number' && value < 1) {
        throw createApiServiceError(`${key} must be at least 1.`);
      }
      if (key === 'delayFeedbackRequest' && typeof value === 'number' && value < 0) {
        throw createApiServiceError('delayFeedbackRequest cannot be negative.');
      }
      if (key === 'roleId' && value !== undefined && ![3, 4, 5, 6].includes(value as number)) {
        throw createApiServiceError('roleId must be 3, 4, 5, or 6.');
      }
    }
    let body: Record<string, unknown> = {
      clientId: this.config.clientId,
      ...pickDefined(params)
    };
    if (includeAgent && this.config.agent) {
      body.agent = this.config.agent;
    }
    return body;
  }

  private buildQuery(params: Record<string, unknown> = {}): Record<string, unknown> {
    return this.buildBody(params);
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ==================== Test ====================

  async testConnection(): Promise<{ errorCode: number; errorMessage: string }> {
    let res = await this.http.post('/test', this.buildBody(), { headers: this.headers });
    return res.data;
  }

  // ==================== Businesses ====================

  async listBusinesses(
    params: {
      page?: number;
      limit?: number;
      includeDeletedBusinesses?: number;
      aggregateResponse?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.post(
      '/businesses/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async getBusiness(businessId: number): Promise<any> {
    let res = await this.http.post('/business/get', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async createBusiness(params: {
    businessName: string;
    businessType: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    websiteUrl?: string;
    organisationType?: string;
    language?: string;
    customField?: string;
    emailLogo?: string;
    feedbackBanner?: string;
    emailImage?: string;
    businessOwnerAccount?: number;
    businessOwnerEmail?: string;
    businessOwnerFirstName?: string;
    businessOwnerLastName?: string;
    businessOwnerSendPasswordEmail?: number;
  }): Promise<any> {
    let res = await this.http.post('/business/create', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async updateBusiness(params: {
    businessId: number;
    businessName?: string;
    businessType?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    websiteUrl?: string;
    organisationType?: string;
    language?: string;
    customField?: string;
    emailLogo?: string;
    feedbackBanner?: string;
    emailImage?: string;
    automatedEmailsPerDay?: number;
    feedbackThreshold?: number;
    pageThreshold?: number;
  }): Promise<any> {
    let res = await this.http.post('/business/update', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deleteBusiness(businessId: number): Promise<any> {
    let res = await this.http.post('/business/delete', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async searchBusiness(params: { by: string; search: string }): Promise<any> {
    let res = await this.http.post('/business/search', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deactivateBusiness(businessId: number): Promise<any> {
    let res = await this.http.post('/business/deactivate', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async reactivateBusiness(businessId: number): Promise<any> {
    let res = await this.http.post('/business/reactivate', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async getBusinessTypes(search?: string): Promise<any> {
    let res = await this.http.post('/business/types', this.buildBody({ search }), {
      headers: this.headers
    });
    return res.data;
  }

  async listAgencyClients(
    params: { page?: number; includeBusinesses?: number } = {}
  ): Promise<any> {
    // Agency discovery must use global credentials, regardless of a configured client target.
    let body = this.buildBody(params, false);
    let res = await this.http.post('/agency/clients', body, { headers: this.headers });
    return res.data;
  }

  // ==================== Customers ====================

  async listCustomers(
    params: {
      businessId?: string;
      customerId?: number;
      customId?: string;
      jobId?: string;
      email?: string;
      page?: number;
      subscription?: number;
      showHistory?: number;
      aggregateResponse?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.post(
      '/customers/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async getCustomer(customerId: number): Promise<any> {
    let res = await this.http.post(
      '/customers/get',
      this.buildBody({
        customerId,
        aggregateResponse: 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async createCustomer(params: {
    businessId: number;
    customerEmail?: string;
    customerFirstName: string;
    customerLastName: string;
    customerPhone?: string;
    customerCustomId?: string;
    customerJobId?: string;
    customerTags?: string;
    customerPreference?: string;
    delayFeedbackRequest?: number;
    sendFeedbackRequest?: number;
  }): Promise<any> {
    let res = await this.http.post('/customer/create', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async updateCustomer(params: {
    customerId: number;
    customerEmail?: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerPhoneNumber?: string;
    customerPreference?: string;
    customerCustomId?: string;
    customerJobId?: string;
    customerTags?: string;
  }): Promise<any> {
    let res = await this.http.post('/customer/update', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deleteCustomer(customerId: number): Promise<any> {
    let res = await this.http.post('/customer/delete', this.buildBody({ customerId }), {
      headers: this.headers
    });
    return res.data;
  }

  async createCustomersBulk(params: {
    businessId: number;
    customers: Array<{
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      customId?: string;
      jobId?: string;
      preference?: string;
      tags?: string;
    }>;
  }): Promise<any> {
    let body: Record<string, unknown> = {
      businessId: params.businessId
    };
    params.customers.forEach((c, i) => {
      let n = i + 1;
      if (c.email !== undefined) body[`customerEmail${n}`] = c.email;
      if (c.firstName !== undefined) body[`customerFirstName${n}`] = c.firstName;
      if (c.lastName !== undefined) body[`customerLastName${n}`] = c.lastName;
      if (c.phone !== undefined) body[`customerPhone${n}`] = c.phone;
      if (c.customId !== undefined) body[`customerCustomId${n}`] = c.customId;
      if (c.jobId !== undefined) body[`customerJobId${n}`] = c.jobId;
      if (c.preference !== undefined) body[`customerPreference${n}`] = c.preference;
      if (c.tags !== undefined) body[`customerTags${n}`] = c.tags;
    });
    body.aggregateResponse = 0;

    let res = await this.http.post('/customers/create', this.buildBody(body), {
      headers: this.headers
    });
    return res.data;
  }

  // ==================== Feedback ====================

  async sendFeedbackRequest(params: {
    customerId: number;
    ratingRevision?: number;
    checkThreshold?: number;
    jobId?: string;
  }): Promise<any> {
    let res = await this.http.post('/customer/feedback/send', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async getFeedbacks(
    params: {
      businessId?: string;
      from?: string;
      to?: string;
      page?: number;
      minRecommend?: number;
      maxRecommend?: number;
      showSurvey?: number;
      customerId?: number;
      visible?: number;
      aggregateResponse?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.post(
      '/feedbacks/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async getFeedbackResponses(
    params: {
      businessId?: string;
      feedbackId?: string;
      from?: string;
      to?: string;
      page?: number;
      aggregateResponse?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.post(
      '/feedbacks/responses/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async replyToCustomerFeedback(params: {
    customerId: number;
    content: string;
    title?: string;
    visibility?: number;
    respondAsBusinessOwner?: number;
  }): Promise<any> {
    let res = await this.http.post('/customer/reply', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  // ==================== Online Reviews ====================

  async getOnlineReviews(
    params: {
      businessId?: string;
      from?: string;
      to?: string;
      page?: number;
      type?: string;
      visible?: number;
      aggregateResponse?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.post(
      '/online-reviews/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async replyToOnlineReview(params: { reviewId: number; content: string }): Promise<any> {
    let res = await this.http.post('/online-review/reply', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async getFacebookRecommendations(
    params: { businessId?: string; from?: string; to?: string; page?: number } = {}
  ): Promise<any> {
    let res = await this.http.post('/facebook-recommendations/get', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  // ==================== Surveys ====================

  async getSurveyAverages(params: {
    businessId: number;
    from?: string;
    to?: string;
    aggregateResponse?: number;
  }): Promise<any> {
    let res = await this.http.post(
      '/survey-questions/average/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 0
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  // ==================== Widget ====================

  async getWidgetHtml(params: {
    businessId: string;
    fullVersion?: number;
    includeSchemaOrg?: number;
    widgetType?: string;
  }): Promise<any> {
    let res = await this.http.post('/widget/get-html', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  // ==================== Google Q&A ====================

  async getGoogleQA(
    params: {
      businessId?: number;
      search?: string;
      locations?: string;
      status?: string;
      labels?: string;
      page?: number;
    } = {}
  ): Promise<any> {
    let res = await this.http.get('/google-qa/get', {
      headers: this.headers,
      params: this.buildQuery(params)
    });
    return res.data;
  }

  // ==================== Users ====================

  async createUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    roleId?: number;
    sendPasswordEmail?: number;
    managedBusinessIds?: number[];
  }): Promise<any> {
    let body: Record<string, unknown> = {
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName
    };
    if (params.roleId !== undefined) body.roleId = params.roleId;
    if (params.sendPasswordEmail !== undefined)
      body.sendPasswordEmail = params.sendPasswordEmail;
    if (params.managedBusinessIds) {
      params.managedBusinessIds.forEach((id, i) => {
        body[`businessId${i + 1}`] = id;
      });
    }
    let res = await this.http.post('/user/create', this.buildBody(body), {
      headers: this.headers
    });
    return res.data;
  }

  // ==================== Auto Feedback ====================

  async configureAutoFeedback(params: {
    businessId: number;
    autoFeedback: number;
    autoSend?: number;
  }): Promise<any> {
    let res = await this.http.post(
      '/business/auto-feedback-requests',
      this.buildBody(params),
      {
        headers: this.headers
      }
    );
    return res.data;
  }
}
