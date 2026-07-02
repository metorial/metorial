import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app.gatherup.com/api'
});

export interface ClientConfig {
  token: string;
  clientId: string;
  agent?: string;
}

export class Client {
  constructor(private config: ClientConfig) {}

  private buildBody(params: Record<string, unknown> = {}): Record<string, unknown> {
    let body: Record<string, unknown> = {
      clientId: this.config.clientId,
      ...params
    };
    if (this.config.agent) {
      body.agent = this.config.agent;
    }
    return body;
  }

  private buildQuery(params: Record<string, unknown> = {}): Record<string, unknown> {
    let query: Record<string, unknown> = {
      clientId: this.config.clientId,
      ...params
    };
    if (this.config.agent) {
      query.agent = this.config.agent;
    }
    return query;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ==================== Test ====================

  async testConnection(): Promise<{ errorCode: number; errorMessage: string }> {
    let res = await http.post('/test', this.buildBody(), { headers: this.headers });
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
    let res = await http.post(
      '/businesses/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async getBusiness(businessId: number): Promise<any> {
    let res = await http.post('/business/get', this.buildBody({ businessId }), {
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
    let res = await http.post('/business/create', this.buildBody(params), {
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
    let res = await http.post('/business/update', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deleteBusiness(businessId: number): Promise<any> {
    let res = await http.post('/business/delete', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async searchBusiness(params: { by: string; search: string }): Promise<any> {
    let res = await http.post('/business/search', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deactivateBusiness(businessId: number): Promise<any> {
    let res = await http.post('/business/deactivate', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async reactivateBusiness(businessId: number): Promise<any> {
    let res = await http.post('/business/reactivate', this.buildBody({ businessId }), {
      headers: this.headers
    });
    return res.data;
  }

  async getBusinessTypes(): Promise<any> {
    let res = await http.post('/business/types', this.buildBody(), { headers: this.headers });
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
    let res = await http.post(
      '/customers/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async getCustomer(customerId: number): Promise<any> {
    let res = await http.post(
      '/customers/get',
      this.buildBody({
        customerId,
        aggregateResponse: 1
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
    let res = await http.post('/customer/create', this.buildBody(params), {
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
    let res = await http.post('/customer/update', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async deleteCustomer(customerId: number): Promise<any> {
    let res = await http.post('/customer/delete', this.buildBody({ customerId }), {
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
      if (c.email) body[`customerEmail${n}`] = c.email;
      if (c.firstName) body[`customerFirstName${n}`] = c.firstName;
      if (c.lastName) body[`customerLastName${n}`] = c.lastName;
      if (c.phone) body[`customerPhone${n}`] = c.phone;
      if (c.customId) body[`customerCustomId${n}`] = c.customId;
      if (c.jobId) body[`customerJobId${n}`] = c.jobId;
      if (c.preference) body[`customerPreference${n}`] = c.preference;
      if (c.tags) body[`customerTags${n}`] = c.tags;
    });
    body.aggregateResponse = 1;

    let res = await http.post('/customers/create', this.buildBody(body), {
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
    let res = await http.post('/customer/feedback/send', this.buildBody(params), {
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
    let res = await http.post(
      '/feedbacks/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
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
    let res = await http.post(
      '/feedbacks/responses/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
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
    let res = await http.post('/customer/reply', this.buildBody(params), {
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
    let res = await http.post(
      '/online-reviews/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
      }),
      { headers: this.headers }
    );
    return res.data;
  }

  async replyToOnlineReview(params: { reviewId: number; content: string }): Promise<any> {
    let res = await http.post('/online-review/reply', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }

  async getFacebookRecommendations(
    params: { businessId?: string; from?: string; to?: string; page?: number } = {}
  ): Promise<any> {
    let res = await http.post('/facebook-recommendations/get', this.buildBody(params), {
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
    let res = await http.post(
      '/survey-questions/average/get',
      this.buildBody({
        ...params,
        aggregateResponse: params.aggregateResponse ?? 1
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
    let res = await http.post('/widget/get-html', this.buildBody(params), {
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
    let res = await http.get('/google-qa/get', {
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
    let res = await http.post('/user/create', this.buildBody(body), { headers: this.headers });
    return res.data;
  }

  // ==================== Auto Feedback ====================

  async configureAutoFeedback(params: {
    businessId: number;
    autoFeedback: number;
    autoSend?: number;
  }): Promise<any> {
    let res = await http.post('/business/auto-feedback-requests', this.buildBody(params), {
      headers: this.headers
    });
    return res.data;
  }
}
