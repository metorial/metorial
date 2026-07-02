import { createAxios } from 'slates';
import { clearbitApiError } from './errors';
import type {
  ClearbitAutocompleteItem,
  ClearbitCombined,
  ClearbitCompany,
  ClearbitDiscoveryResponse,
  ClearbitNameToDomain,
  ClearbitPerson,
  ClearbitProspectorResponse,
  ClearbitReveal,
  ClearbitRisk
} from './types';

export class ClearbitClient {
  private token: string;

  constructor(params: { token: string }) {
    this.token = params.token;
  }

  private createClient(baseURL: string) {
    return createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw clearbitApiError(error, operation);
    }
  }

  // ─── Person Enrichment ─────────────────────────────────────────

  async findPerson(params: {
    email: string;
    webhookUrl?: string;
    subscribe?: boolean;
  }): Promise<ClearbitPerson> {
    let client = this.createClient('https://person-stream.clearbit.com');
    let query: Record<string, any> = { email: params.email };
    if (params.webhookUrl) query.webhook_url = params.webhookUrl;
    if (params.subscribe !== undefined) query.subscribe = params.subscribe;

    return this.request('find person', async () => {
      let response = await client.get('/v2/people/find', { params: query });
      return response.data as ClearbitPerson;
    });
  }

  // ─── Company Enrichment ────────────────────────────────────────

  async findCompany(params: {
    domain: string;
    webhookUrl?: string;
  }): Promise<ClearbitCompany> {
    let client = this.createClient('https://company-stream.clearbit.com');
    let query: Record<string, any> = { domain: params.domain };
    if (params.webhookUrl) query.webhook_url = params.webhookUrl;

    return this.request('find company', async () => {
      let response = await client.get('/v2/companies/find', { params: query });
      return response.data as ClearbitCompany;
    });
  }

  // ─── Combined Enrichment ───────────────────────────────────────

  async findCombined(params: {
    email: string;
    webhookUrl?: string;
  }): Promise<ClearbitCombined> {
    let client = this.createClient('https://person-stream.clearbit.com');
    let query: Record<string, any> = { email: params.email };
    if (params.webhookUrl) query.webhook_url = params.webhookUrl;

    return this.request('find combined person and company', async () => {
      let response = await client.get('/v2/combined/find', { params: query });
      return response.data as ClearbitCombined;
    });
  }

  // ─── Reveal (IP Intelligence) ──────────────────────────────────

  async reveal(params: { ip: string }): Promise<ClearbitReveal> {
    let client = this.createClient('https://reveal.clearbit.com');
    return this.request('reveal company by IP', async () => {
      let response = await client.get('/v1/companies/reveal', {
        params: { ip: params.ip }
      });
      return response.data as ClearbitReveal;
    });
  }

  // ─── Prospector ────────────────────────────────────────────────

  async searchProspects(params: {
    domain: string;
    role?: string;
    roles?: string[];
    seniority?: string;
    seniorities?: string[];
    title?: string;
    titles?: string[];
    name?: string;
    city?: string;
    cities?: string[];
    state?: string;
    states?: string[];
    country?: string;
    countries?: string[];
    page?: number;
    pageSize?: number;
    suppression?: string;
  }): Promise<ClearbitProspectorResponse> {
    let client = this.createClient('https://prospector.clearbit.com');
    let query: Record<string, any> = { domain: params.domain };

    if (params.role) query.role = params.role;
    if (params.roles) query['roles[]'] = params.roles;
    if (params.seniority) query.seniority = params.seniority;
    if (params.seniorities) query['seniorities[]'] = params.seniorities;
    if (params.title) query.title = params.title;
    if (params.titles) query['titles[]'] = params.titles;
    if (params.name) query.name = params.name;
    if (params.city) query.city = params.city;
    if (params.cities) query['cities[]'] = params.cities;
    if (params.state) query.state = params.state;
    if (params.states) query['states[]'] = params.states;
    if (params.country) query.country = params.country;
    if (params.countries) query['countries[]'] = params.countries;
    if (params.page !== undefined) query.page = params.page;
    if (params.pageSize !== undefined) query.page_size = params.pageSize;
    if (params.suppression) query.suppression = params.suppression;

    return this.request('search prospects', async () => {
      let response = await client.get('/v1/people/search', { params: query });
      return response.data as ClearbitProspectorResponse;
    });
  }

  // ─── Discovery ─────────────────────────────────────────────────

  async discoverCompanies(params: {
    query: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Promise<ClearbitDiscoveryResponse> {
    let client = this.createClient('https://discovery.clearbit.com');
    let query: Record<string, any> = { query: params.query };
    if (params.page !== undefined) query.page = params.page;
    if (params.pageSize !== undefined) query.page_size = params.pageSize;
    if (params.sort) query.sort = params.sort;

    return this.request('discover companies', async () => {
      let response = await client.get('/v1/companies/search', { params: query });
      return response.data as ClearbitDiscoveryResponse;
    });
  }

  // ─── Name to Domain ────────────────────────────────────────────

  async nameToDomain(params: { name: string }): Promise<ClearbitNameToDomain> {
    let client = this.createClient('https://company.clearbit.com');
    return this.request('resolve company name to domain', async () => {
      let response = await client.get('/v1/domains/find', {
        params: { name: params.name }
      });
      return response.data as ClearbitNameToDomain;
    });
  }

  // ─── Autocomplete ──────────────────────────────────────────────

  async autocomplete(params: { query: string }): Promise<ClearbitAutocompleteItem[]> {
    let client = this.createClient('https://autocomplete.clearbit.com');
    return this.request('autocomplete companies', async () => {
      let response = await client.get('/v1/companies/suggest', {
        params: { query: params.query }
      });
      return response.data as ClearbitAutocompleteItem[];
    });
  }

  // ─── Risk ──────────────────────────────────────────────────────

  async calculateRisk(params: {
    email: string;
    ip: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    countryCode?: string;
    zipCode?: string;
  }): Promise<ClearbitRisk> {
    let client = this.createClient('https://risk.clearbit.com');
    let body: Record<string, any> = {
      email: params.email,
      ip: params.ip
    };
    if (params.name) body.name = params.name;
    if (params.givenName) body.given_name = params.givenName;
    if (params.familyName) body.family_name = params.familyName;
    if (params.countryCode) body.country_code = params.countryCode;
    if (params.zipCode) body.zip_code = params.zipCode;

    return this.request('calculate risk', async () => {
      let response = await client.post('/v1/calculate', body);
      return response.data as ClearbitRisk;
    });
  }
}
