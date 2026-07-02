import { createAxios } from 'slates';

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://app.icypeas.com/api',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Email Discovery ───

  async emailSearch(params: {
    firstname?: string;
    lastname?: string;
    domainOrCompany: string;
    webhookUrl?: string;
    externalId?: string;
  }) {
    let body: Record<string, any> = {
      firstname: params.firstname || '',
      lastname: params.lastname || '',
      domainOrCompany: params.domainOrCompany
    };
    if (params.webhookUrl || params.externalId) {
      body.custom = {};
      if (params.webhookUrl) body.custom.webhookUrl = params.webhookUrl;
      if (params.externalId) body.custom.externalId = params.externalId;
    }
    let response = await this.api.post('/email-search', body);
    return response.data;
  }

  // ─── Email Verification ───

  async emailVerification(params: {
    email: string;
    webhookUrl?: string;
    externalId?: string;
  }) {
    let body: Record<string, any> = {
      email: params.email
    };
    if (params.webhookUrl || params.externalId) {
      body.custom = {};
      if (params.webhookUrl) body.custom.webhookUrl = params.webhookUrl;
      if (params.externalId) body.custom.externalId = params.externalId;
    }
    let response = await this.api.post('/email-verification', body);
    return response.data;
  }

  // ─── Domain Scan ───

  async domainSearch(params: {
    domainOrCompany: string;
    webhookUrl?: string;
    externalId?: string;
  }) {
    let body: Record<string, any> = {
      domainOrCompany: params.domainOrCompany
    };
    if (params.webhookUrl || params.externalId) {
      body.custom = {};
      if (params.webhookUrl) body.custom.webhookUrl = params.webhookUrl;
      if (params.externalId) body.custom.externalId = params.externalId;
    }
    let response = await this.api.post('/domain-search', body);
    return response.data;
  }

  // ─── Retrieve Search Results ───

  async getSearchResult(searchId: string) {
    let response = await this.api.post('/bulk-single-searchs/read', {
      mode: 'single',
      id: searchId
    });
    return response.data;
  }

  async getBulkSearchResults(params: {
    fileId: string;
    limit?: number;
    next?: boolean;
    sorts?: any[];
  }) {
    let body: Record<string, any> = {
      mode: 'bulk',
      file: params.fileId,
      limit: params.limit || 10
    };
    if (params.next !== undefined) body.next = params.next;
    if (params.sorts) body.sorts = params.sorts;
    let response = await this.api.post('/bulk-single-searchs/read', body);
    return response.data;
  }

  // ─── Bulk Search ───

  async createBulkSearch(params: {
    name?: string;
    task: 'email-search' | 'email-verification' | 'domain-search';
    data: string[][];
    webhookUrlItem?: string;
    webhookUrlBulkDone?: string;
    externalIds?: string[];
    includeResultsInWebhook?: boolean;
  }) {
    let body: Record<string, any> = {
      task: params.task,
      data: params.data
    };
    if (params.name) body.name = params.name;
    let custom: Record<string, any> = {};
    if (params.webhookUrlItem) custom.webhookUrlItem = params.webhookUrlItem;
    if (params.webhookUrlBulkDone) custom.webhookUrlBulkDone = params.webhookUrlBulkDone;
    if (params.externalIds) custom.externalIds = params.externalIds;
    if (params.includeResultsInWebhook !== undefined)
      custom.includeResultsInWebhook = params.includeResultsInWebhook;
    if (Object.keys(custom).length > 0) body.custom = custom;

    let response = await this.api.post('/bulk-search', body);
    return response.data;
  }

  // ─── Profile Scraping ───

  async scrapeProfile(url: string) {
    let response = await this.api.get('/scrape/profile', {
      params: { url }
    });
    return response.data;
  }

  async scrapeProfiles(urls: string[]) {
    let response = await this.api.post('/scrape', {
      type: 'profile',
      data: urls
    });
    return response.data;
  }

  // ─── Company Scraping ───

  async scrapeCompany(url: string) {
    let response = await this.api.get('/scrape/company', {
      params: { url }
    });
    return response.data;
  }

  async scrapeCompanies(urls: string[]) {
    let response = await this.api.post('/scrape', {
      type: 'company',
      data: urls
    });
    return response.data;
  }

  // ─── Profile URL Finder ───

  async findCompanyUrl(companyOrDomain: string) {
    let response = await this.api.post('/url-search/company', {
      companyOrDomain
    });
    return response.data;
  }

  async findPersonUrl(params: {
    firstname?: string;
    lastname?: string;
    companyOrDomain?: string;
    jobTitle?: string;
  }) {
    let response = await this.api.post('/url-search/person', params);
    return response.data;
  }

  // ─── Lead Database ───

  async findPeople(params: {
    query: Record<string, any>;
    pagination?: { token?: string; size?: number };
  }) {
    let response = await this.api.post('/find-people', params);
    return response.data;
  }

  async countPeople(query: Record<string, any>) {
    let response = await this.api.post('/find-people/count', { query });
    return response.data;
  }

  async findCompanies(params: {
    query: Record<string, any>;
    pagination?: { token?: string; size?: number };
  }) {
    let response = await this.api.post('/find-companies', params);
    return response.data;
  }

  async countCompanies(query: Record<string, any>) {
    let response = await this.api.post('/find-companies/count', { query });
    return response.data;
  }

  // ─── Subscription ───

  async getSubscriptionInfo(email: string) {
    let response = await this.api.post('/a/actions/subscription-information', {
      email
    });
    return response.data;
  }
}
