import { createAxios } from 'slates';

export interface ZoomInfoClientConfig {
  token: string;
  apiVersion: 'new' | 'legacy';
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private apiVersion: 'new' | 'legacy';

  constructor(config: ZoomInfoClientConfig) {
    this.apiVersion = config.apiVersion;

    let baseURL =
      config.apiVersion === 'new'
        ? 'https://api.zoominfo.com/gtm'
        : 'https://api.zoominfo.com';

    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Contact Search ──

  async searchContacts(
    params: Record<string, any>,
    page?: number,
    pageSize?: number,
    sort?: string
  ): Promise<any> {
    if (this.apiVersion === 'new') {
      let queryParams = new URLSearchParams();
      if (page) queryParams.set('page[number]', String(page));
      if (pageSize) queryParams.set('page[size]', String(pageSize));
      if (sort) queryParams.set('sort', sort);

      let qs = queryParams.toString();
      let url = `/data/v1/contacts/search${qs ? `?${qs}` : ''}`;

      let response = await this.http.post(url, {
        data: {
          type: 'ContactSearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/search/contact', {
        ...params,
        rpp: pageSize || 25,
        page: page || 1
      });
      return response.data;
    }
  }

  // ── Company Search ──

  async searchCompanies(
    params: Record<string, any>,
    page?: number,
    pageSize?: number,
    sort?: string
  ): Promise<any> {
    if (this.apiVersion === 'new') {
      let queryParams = new URLSearchParams();
      if (page) queryParams.set('page[number]', String(page));
      if (pageSize) queryParams.set('page[size]', String(pageSize));
      if (sort) queryParams.set('sort', sort);

      let qs = queryParams.toString();
      let url = `/data/v1/companies/search${qs ? `?${qs}` : ''}`;

      let response = await this.http.post(url, {
        data: {
          type: 'CompanySearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/search/company', {
        ...params,
        rpp: pageSize || 25,
        page: page || 1
      });
      return response.data;
    }
  }

  // ── Contact Enrich ──

  async enrichContacts(params: Record<string, any>, outputFields?: string[]): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/contacts/enrich', {
        data: {
          type: 'ContactEnrich',
          attributes: {
            ...params,
            ...(outputFields ? { outputFields } : {})
          }
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/contact', {
        ...params,
        ...(outputFields ? { outputFields } : {})
      });
      return response.data;
    }
  }

  // ── Company Enrich ──

  async enrichCompanies(params: Record<string, any>, outputFields?: string[]): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/companies/enrich', {
        data: {
          type: 'CompanyEnrich',
          attributes: {
            ...params,
            ...(outputFields ? { outputFields } : {})
          }
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/company', {
        ...params,
        ...(outputFields ? { outputFields } : {})
      });
      return response.data;
    }
  }

  // ── Intent Search ──

  async searchIntent(
    params: Record<string, any>,
    page?: number,
    pageSize?: number
  ): Promise<any> {
    if (this.apiVersion === 'new') {
      let queryParams = new URLSearchParams();
      if (page) queryParams.set('page[number]', String(page));
      if (pageSize) queryParams.set('page[size]', String(pageSize));

      let qs = queryParams.toString();
      let url = `/data/v1/intent/search${qs ? `?${qs}` : ''}`;

      let response = await this.http.post(url, {
        data: {
          type: 'IntentSearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/search/intent', {
        ...params,
        rpp: pageSize || 25,
        page: page || 1
      });
      return response.data;
    }
  }

  // ── Intent Enrich ──

  async enrichIntent(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/intent/enrich', {
        data: {
          type: 'IntentEnrich',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/intent', params);
      return response.data;
    }
  }

  // ── Scoops Search ──

  async searchScoops(
    params: Record<string, any>,
    page?: number,
    pageSize?: number
  ): Promise<any> {
    if (this.apiVersion === 'new') {
      let queryParams = new URLSearchParams();
      if (page) queryParams.set('page[number]', String(page));
      if (pageSize) queryParams.set('page[size]', String(pageSize));

      let qs = queryParams.toString();
      let url = `/data/v1/scoops/search${qs ? `?${qs}` : ''}`;

      let response = await this.http.post(url, {
        data: {
          type: 'ScoopSearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/search/scoop', {
        ...params,
        rpp: pageSize || 25,
        page: page || 1
      });
      return response.data;
    }
  }

  // ── Scoops Enrich ──

  async enrichScoops(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/scoops/enrich', {
        data: {
          type: 'ScoopEnrich',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/scoop', params);
      return response.data;
    }
  }

  // ── News Search ──

  async searchNews(
    params: Record<string, any>,
    page?: number,
    pageSize?: number
  ): Promise<any> {
    if (this.apiVersion === 'new') {
      let queryParams = new URLSearchParams();
      if (page) queryParams.set('page[number]', String(page));
      if (pageSize) queryParams.set('page[size]', String(pageSize));

      let qs = queryParams.toString();
      let url = `/data/v1/news/search${qs ? `?${qs}` : ''}`;

      let response = await this.http.post(url, {
        data: {
          type: 'NewsSearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/search/news', {
        ...params,
        rpp: pageSize || 25,
        page: page || 1
      });
      return response.data;
    }
  }

  // ── News Enrich ──

  async enrichNews(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/news/enrich', {
        data: {
          type: 'NewsEnrich',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/news', params);
      return response.data;
    }
  }

  // ── WebSights (IP Lookup) ──

  async lookupWebSights(ipAddresses: string[]): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/websights/enrich', {
        data: {
          type: 'WebSightsEnrich',
          attributes: {
            ipAddresses
          }
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/lookup/websights', {
        ipAddresses
      });
      return response.data;
    }
  }

  // ── Corporate Hierarchy ──

  async enrichCorporateHierarchy(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/companies/corporatehierarchy/enrich', {
        data: {
          type: 'CorporateHierarchyEnrich',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/corporatehierarchy', params);
      return response.data;
    }
  }

  // ── Technology Enrich ──

  async enrichTechnology(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/technologies/enrich', {
        data: {
          type: 'TechnologyEnrich',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/enrich/technology', params);
      return response.data;
    }
  }

  // ── Compliance ──

  async searchCompliance(params: Record<string, any>): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.post('/data/v1/compliance/search', {
        data: {
          type: 'ComplianceSearch',
          attributes: params
        }
      });
      return response.data;
    } else {
      let response = await this.http.post('/lookup/compliance', params);
      return response.data;
    }
  }

  // ── Usage ──

  async getUsage(): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.get('/data/v1/users/usage');
      return response.data;
    } else {
      let response = await this.http.get('/usage');
      return response.data;
    }
  }

  // ── Lookup (field/parameter metadata) ──

  async lookupFields(endpoint: string): Promise<any> {
    if (this.apiVersion === 'new') {
      let response = await this.http.get('/data/v1/lookup', {
        params: { endpoint }
      });
      return response.data;
    } else {
      let response = await this.http.post('/lookup/inputfields', {
        endpoint
      });
      return response.data;
    }
  }

  // ── Webhooks ──

  async listWebhooks(): Promise<any> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async createWebhook(params: {
    targetUrl: string;
    objectType: string;
    eventType: string;
    payloadFields?: string[];
    changedAttributesOnly?: boolean;
  }): Promise<any> {
    let response = await this.http.post('/webhooks', params);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(webhookId: string, params: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/webhooks/${webhookId}`, params);
    return response.data;
  }
}
