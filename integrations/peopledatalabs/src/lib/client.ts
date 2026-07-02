import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  sandbox?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseURL = config.sandbox
      ? 'https://sandbox.api.peopledatalabs.com/v5'
      : 'https://api.peopledatalabs.com/v5';

    this.axios = createAxios({
      baseURL,
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Person Enrichment
  async enrichPerson(params: Record<string, unknown>) {
    let response = await this.axios.get('/person/enrich', { params });
    return response.data;
  }

  // Person Bulk Enrichment
  async bulkEnrichPerson(requests: Record<string, unknown>[]) {
    let response = await this.axios.post('/person/bulk', {
      requests
    });
    return response.data;
  }

  // Person Search
  async searchPerson(params: {
    query?: string;
    sql?: string;
    size?: number;
    scroll_token?: string;
    dataset?: string;
    titlecase?: boolean;
  }) {
    let body: Record<string, unknown> = {};
    if (params.sql) {
      body.sql = params.sql;
    } else if (params.query) {
      body.query = JSON.parse(params.query);
    }
    if (params.size !== undefined) body.size = params.size;
    if (params.scroll_token) body.scroll_token = params.scroll_token;
    if (params.dataset) body.dataset = params.dataset;
    if (params.titlecase !== undefined) body.titlecase = params.titlecase;

    let response = await this.axios.post('/person/search', body);
    return response.data;
  }

  // Person Identify
  async identifyPerson(params: Record<string, unknown>) {
    let response = await this.axios.get('/person/identify', { params });
    return response.data;
  }

  // Person Retrieve
  async retrievePerson(personId: string, params?: Record<string, unknown>) {
    let response = await this.axios.get(`/person/retrieve/${personId}`, { params });
    return response.data;
  }

  // Company Enrichment
  async enrichCompany(params: Record<string, unknown>) {
    let response = await this.axios.get('/company/enrich', { params });
    return response.data;
  }

  // Company Search
  async searchCompany(params: {
    query?: string;
    sql?: string;
    size?: number;
    scroll_token?: string;
    titlecase?: boolean;
  }) {
    let body: Record<string, unknown> = {};
    if (params.sql) {
      body.sql = params.sql;
    } else if (params.query) {
      body.query = JSON.parse(params.query);
    }
    if (params.size !== undefined) body.size = params.size;
    if (params.scroll_token) body.scroll_token = params.scroll_token;
    if (params.titlecase !== undefined) body.titlecase = params.titlecase;

    let response = await this.axios.post('/company/search', body);
    return response.data;
  }

  // IP Enrichment
  async enrichIp(ip: string, params?: Record<string, unknown>) {
    let response = await this.axios.get('/ip/enrich', {
      params: { ip, ...params }
    });
    return response.data;
  }

  // Job Title Enrichment
  async enrichJobTitle(jobTitle: string, params?: Record<string, unknown>) {
    let response = await this.axios.get('/job_title/enrich', {
      params: { job_title: jobTitle, ...params }
    });
    return response.data;
  }

  // Skill Enrichment
  async enrichSkill(skill: string, params?: Record<string, unknown>) {
    let response = await this.axios.get('/skill/enrich', {
      params: { skill, ...params }
    });
    return response.data;
  }

  // Company Cleaner
  async cleanCompany(name: string) {
    let response = await this.axios.get('/company/clean', {
      params: { name }
    });
    return response.data;
  }

  // Location Cleaner
  async cleanLocation(location: string) {
    let response = await this.axios.get('/location/clean', {
      params: { location }
    });
    return response.data;
  }

  // School Cleaner
  async cleanSchool(name: string) {
    let response = await this.axios.get('/school/clean', {
      params: { name }
    });
    return response.data;
  }

  // Autocomplete
  async autocomplete(params: {
    field: string;
    text?: string;
    size?: number;
    titlecase?: boolean;
  }) {
    let response = await this.axios.get('/autocomplete', {
      params
    });
    return response.data;
  }
}
