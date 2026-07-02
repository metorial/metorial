import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://app.retently.com/api/v2'
});

export interface CustomerProperty {
  label: string;
  type: 'string' | 'date' | 'integer' | 'collection' | 'boolean';
  value: string | number | boolean;
}

export interface CustomerInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  tags?: string[];
  properties?: CustomerProperty[];
}

export interface AttributeFilter {
  name: string;
  operator: string;
  value?: string | number | boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export class Client {
  constructor(private token: string) {}

  private get headers() {
    return {
      'X-Api-Key': this.token,
      'Content-Type': 'application/json'
    };
  }

  // ─── Customers ───

  async getCustomers(
    params?: PaginationParams &
      DateRangeParams & {
        email?: string;
        attributes?: AttributeFilter[];
        match?: 'all' | 'any';
      }
  ) {
    let response = await apiAxios.get('/customers', {
      headers: this.headers,
      params: this.buildQueryParams(params)
    });
    return response.data.data;
  }

  async getCustomer(customerId: string) {
    let response = await apiAxios.get(`/customers/${customerId}`, {
      headers: this.headers
    });
    return response.data.data;
  }

  async createOrUpdateCustomers(subscribers: CustomerInput[]) {
    let response = await apiAxios.post(
      '/customers',
      {
        subscribers
      },
      {
        headers: this.headers
      }
    );
    return response.data.data;
  }

  async deleteCustomers(emails: string[]) {
    let response = await apiAxios.delete('/customers', {
      headers: this.headers,
      data: {
        subscribers: emails.map(email => ({ email }))
      }
    });
    return response.data;
  }

  async unsubscribeCustomers(emails: string[], message?: string) {
    let response = await apiAxios.post(
      '/customers/unsubscribe',
      {
        message,
        subscribers: emails.map(email => ({ email }))
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Surveys ───

  async sendSurvey(campaignId: string, subscribers: CustomerInput[], delay?: number) {
    let body: Record<string, unknown> = {
      campaign: campaignId,
      subscribers
    };
    if (delay !== undefined) {
      body.delay = delay;
    }
    let response = await apiAxios.post('/survey', body, {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Feedback ───

  async getFeedback(
    params?: PaginationParams &
      DateRangeParams & {
        email?: string;
        customerId?: string;
        campaignId?: string;
        attributes?: AttributeFilter[];
        match?: 'all' | 'any';
      }
  ) {
    let response = await apiAxios.get('/feedback', {
      headers: this.headers,
      params: this.buildQueryParams(params)
    });
    return response.data.data;
  }

  async getFeedbackById(feedbackId: string) {
    let response = await apiAxios.get(`/feedback/${feedbackId}`, {
      headers: this.headers
    });
    return response.data.data;
  }

  async setResponseTopics(
    responseId: string,
    topics: { name: string; sentiment: 'positive' | 'neutral' | 'negative' }[],
    op?: 'append' | 'override'
  ) {
    let response = await apiAxios.post(
      '/response/topics',
      {
        id: responseId,
        topics,
        op
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async setResponseTags(responseId: string, tags: string[], op?: 'append' | 'override') {
    let response = await apiAxios.post(
      '/response/tags',
      {
        id: responseId,
        tags,
        op
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Scores ───

  async getScore(metric: 'nps' | 'csat' | 'ces' | 'star') {
    let response = await apiAxios.get(`/${metric}/score`, {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Campaigns ───

  async getCampaigns() {
    let response = await apiAxios.get('/campaigns', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Templates ───

  async getTemplates() {
    let response = await apiAxios.get('/templates', {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Companies ───

  async getCompanies(params?: PaginationParams) {
    let response = await apiAxios.get('/companies', {
      headers: this.headers,
      params: this.buildQueryParams(params)
    });
    return response.data.data;
  }

  async getCompany(companyIdOrDomain: string) {
    let response = await apiAxios.get(`/companies/${encodeURIComponent(companyIdOrDomain)}`, {
      headers: this.headers
    });
    return response.data.data;
  }

  // ─── Reports ───

  async getReports(params?: DateRangeParams & { campaignId?: string }) {
    let path = params?.campaignId ? `/reports/${params.campaignId}` : '/reports/';
    let queryParams: Record<string, string> = {};
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    let response = await apiAxios.get(path, {
      headers: this.headers,
      params: queryParams
    });
    return response.data.data;
  }

  // ─── Trends ───

  async getTrendGroups() {
    let response = await apiAxios.get('/trends', {
      headers: this.headers
    });
    return response.data;
  }

  async getTrends(
    groupId: string,
    params?: {
      date?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let queryParams: Record<string, string> = {};
    if (params?.date) queryParams.date = params.date;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    let response = await apiAxios.get(`/trends/${groupId}`, {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // ─── Outbox ───

  async getOutbox(
    params?: PaginationParams &
      DateRangeParams & {
        email?: string;
        campaignId?: string;
        channel?: string;
        sentBy?: string;
        attributes?: AttributeFilter[];
        match?: 'all' | 'any';
      }
  ) {
    let response = await apiAxios.get('/outbox', {
      headers: this.headers,
      params: this.buildQueryParams(params)
    });
    return response.data.data;
  }

  // ─── Suppressions ───

  async getSuppressedEmails() {
    let response = await apiAxios.get('/suppressions/emails', {
      headers: this.headers
    });
    return response.data.data;
  }

  async addSuppressedEmail(email: string, note?: string) {
    let response = await apiAxios.post(
      '/suppressions/emails',
      {
        email,
        note
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async removeSuppressedEmail(suppressionId: string) {
    let response = await apiAxios.delete(`/suppressions/emails/${suppressionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getSuppressedDomains() {
    let response = await apiAxios.get('/suppressions/domains', {
      headers: this.headers
    });
    return response.data.data;
  }

  async addSuppressedDomain(pattern: string, category?: string, note?: string) {
    let body: Record<string, string> = { pattern };
    if (category) body.category = category;
    if (note) body.note = note;

    let response = await apiAxios.post('/suppressions/domains', body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeSuppressedDomain(suppressionId: string) {
    let response = await apiAxios.delete(`/suppressions/domains/${suppressionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Helpers ───

  private buildQueryParams(params?: Record<string, any>): Record<string, string> {
    if (!params) return {};
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (key === 'attributes' && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          let attr = value[i] as AttributeFilter;
          queryParams[`attributes[${i}][name]`] = attr.name;
          queryParams[`attributes[${i}][operator]`] = attr.operator;
          if (attr.value !== undefined) {
            queryParams[`attributes[${i}][value]`] = String(attr.value);
          }
        }
      } else {
        queryParams[key] = String(value);
      }
    }
    return queryParams;
  }
}
