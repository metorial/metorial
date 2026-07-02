import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.rocketreach.co/api/v2'
    });
  }

  private get headers() {
    return {
      'Api-Key': this.config.token,
      'Content-Type': 'application/json'
    };
  }

  // ─── Account ───────────────────────────────────────────────

  async getAccount() {
    let response = await this.axios.get('/account', {
      headers: this.headers
    });
    return response.data;
  }

  // ─── People Search ─────────────────────────────────────────

  async searchPeople(params: {
    query: Record<string, any>;
    start?: number;
    pageSize?: number;
    orderBy?: string;
  }) {
    let body: Record<string, any> = {
      query: params.query
    };
    if (params.start !== undefined) body.start = params.start;
    if (params.pageSize !== undefined) body.page_size = params.pageSize;
    if (params.orderBy !== undefined) body.order_by = params.orderBy;

    let response = await this.axios.post('/person/search', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── People Lookup ─────────────────────────────────────────

  async lookupPerson(params: {
    name?: string;
    currentEmployer?: string;
    linkedinUrl?: string;
    profileId?: number;
    email?: string;
    title?: string;
    webhookId?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params.name) queryParams.name = params.name;
    if (params.currentEmployer) queryParams.current_employer = params.currentEmployer;
    if (params.linkedinUrl) queryParams.linkedin_url = params.linkedinUrl;
    if (params.profileId) queryParams.id = params.profileId;
    if (params.email) queryParams.email = params.email;
    if (params.title) queryParams.title = params.title;
    if (params.webhookId) queryParams.webhook_id = params.webhookId;

    let response = await this.axios.get('/person/lookup', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // ─── People Lookup Status ──────────────────────────────────

  async checkPersonLookupStatus(profileIds: number[]) {
    let response = await this.axios.get('/person/checkStatus', {
      headers: this.headers,
      params: { ids: profileIds }
    });
    return response.data;
  }

  // ─── Company Search ────────────────────────────────────────

  async searchCompanies(params: {
    query: Record<string, any>;
    start?: number;
    pageSize?: number;
    orderBy?: string;
  }) {
    let body: Record<string, any> = {
      query: params.query
    };
    if (params.start !== undefined) body.start = params.start;
    if (params.pageSize !== undefined) body.page_size = params.pageSize;
    if (params.orderBy !== undefined) body.order_by = params.orderBy;

    let response = await this.axios.post('/searchCompany', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Company Lookup ────────────────────────────────────────

  async lookupCompany(params: { domain?: string; name?: string; linkedinUrl?: string }) {
    let queryParams: Record<string, any> = {};
    if (params.domain) queryParams.domain = params.domain;
    if (params.name) queryParams.name = params.name;
    if (params.linkedinUrl) queryParams.linkedin_url = params.linkedinUrl;

    let response = await this.axios.get('/company/lookup', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }
}
