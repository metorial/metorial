import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

export interface ClientConfig {
  token: string;
  apiKey?: string;
  expiresAt?: string;
  refreshToken?: string;
}

export interface ListOptions {
  filter?: string;
  pageStart?: string;
}

export class Client {
  private http;

  constructor(config: ClientConfig) {
    if (!(config.apiKey || config.token)) {
      throw createApiServiceError('Reconnect ServiceM8 with a valid API key or OAuth token.');
    }
    let apiKey =
      config.apiKey ||
      (config.expiresAt === undefined && config.refreshToken === undefined
        ? config.token
        : undefined);
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.servicem8.com/api_1.0',
      authHeader: apiKey
        ? { name: 'X-API-Key', value: apiKey }
        : { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ServiceM8',
          reason: 'servicem8_api_error'
        })
    });
    this.http.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (
        isApiErrorRecord(data) &&
        data.errorCode !== undefined &&
        Number(data.errorCode) !== 0
      ) {
        throw createApiServiceError(
          typeof data.message === 'string' ? data.message : 'ServiceM8 rejected the request.',
          { upstreamStatus: response.status, upstreamCode: String(data.errorCode) }
        );
      }
      return response;
    });
  }

  // --- Generic CRUD ---

  async list(resource: string, options?: ListOptions): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.filter) {
      params.$filter = options.filter;
    }
    let cursor = options?.pageStart ?? '-1';
    let seen = new Set<string>();
    let records: any[] = [];
    while (cursor) {
      if (seen.has(cursor)) {
        throw createApiServiceError('ServiceM8 returned a repeated pagination cursor.');
      }
      seen.add(cursor);
      let response = await this.http.get(`/${resource}.json`, {
        params: { ...params, cursor }
      });
      if (!Array.isArray(response.data)) {
        throw createApiServiceError(`ServiceM8 did not return a list of ${resource} records.`);
      }
      records.push(...response.data);
      cursor = getResponseHeaderValue(response.headers, 'x-next-cursor') ?? '';
    }
    return records;
  }

  async get(resource: string, uuid: string): Promise<any> {
    let response = await this.http.get(`/${resource}/${encodeURIComponent(uuid)}.json`);
    return response.data;
  }

  async create(resource: string, data: Record<string, any>): Promise<string> {
    let response = await this.http.post(`/${resource}.json`, data);
    let recordUuid =
      getResponseHeaderValue(response.headers, 'x-record-uuid') || response.data?.uuid;
    if (typeof recordUuid !== 'string' || !recordUuid) {
      throw createApiServiceError(
        'ServiceM8 did not confirm the created record UUID. Check the account before retrying.'
      );
    }
    return recordUuid;
  }

  async update(resource: string, uuid: string, data: Record<string, any>): Promise<void> {
    if (!Object.keys(data).length) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    await this.http.post(`/${resource}/${encodeURIComponent(uuid)}.json`, data);
  }

  async remove(resource: string, uuid: string): Promise<void> {
    await this.http.delete(`/${resource}/${encodeURIComponent(uuid)}.json`);
  }

  // --- Jobs ---

  async listJobs(options?: ListOptions): Promise<any[]> {
    return this.list('job', options);
  }

  async getJob(uuid: string): Promise<any> {
    return this.get('job', uuid);
  }

  async createJob(data: Record<string, any>): Promise<string> {
    return this.create('job', data);
  }

  async updateJob(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('job', uuid, data);
  }

  async deleteJob(uuid: string): Promise<void> {
    return this.remove('job', uuid);
  }

  // --- Companies (Clients) ---

  async listCompanies(options?: ListOptions): Promise<any[]> {
    return this.list('company', options);
  }

  async getCompany(uuid: string): Promise<any> {
    return this.get('company', uuid);
  }

  async createCompany(data: Record<string, any>): Promise<string> {
    return this.create('company', data);
  }

  async updateCompany(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('company', uuid, data);
  }

  async deleteCompany(uuid: string): Promise<void> {
    return this.remove('company', uuid);
  }

  // --- Company Contacts ---

  async listCompanyContacts(options?: ListOptions): Promise<any[]> {
    return this.list('companycontact', options);
  }

  async getCompanyContact(uuid: string): Promise<any> {
    return this.get('companycontact', uuid);
  }

  async createCompanyContact(data: Record<string, any>): Promise<string> {
    return this.create('companycontact', data);
  }

  async updateCompanyContact(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('companycontact', uuid, data);
  }

  async deleteCompanyContact(uuid: string): Promise<void> {
    return this.remove('companycontact', uuid);
  }

  // --- Staff ---

  async listStaff(options?: ListOptions): Promise<any[]> {
    return this.list('staff', options);
  }

  async getStaffMember(uuid: string): Promise<any> {
    return this.get('staff', uuid);
  }

  // --- Job Activities (Scheduling) ---

  async listJobActivities(options?: ListOptions): Promise<any[]> {
    return this.list('jobactivity', options);
  }

  async getJobActivity(uuid: string): Promise<any> {
    return this.get('jobactivity', uuid);
  }

  async createJobActivity(data: Record<string, any>): Promise<string> {
    return this.create('jobactivity', data);
  }

  async updateJobActivity(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('jobactivity', uuid, data);
  }

  async deleteJobActivity(uuid: string): Promise<void> {
    return this.remove('jobactivity', uuid);
  }

  // --- Job Allocations ---

  async listJobAllocations(options?: ListOptions): Promise<any[]> {
    return this.list('joballocation', options);
  }

  async createJobAllocation(data: Record<string, any>): Promise<string> {
    return this.create('joballocation', data);
  }

  async deleteJobAllocation(uuid: string): Promise<void> {
    return this.remove('joballocation', uuid);
  }

  // --- Job Materials ---

  async listJobMaterials(options?: ListOptions): Promise<any[]> {
    return this.list('jobmaterial', options);
  }

  async getJobMaterial(uuid: string): Promise<any> {
    return this.get('jobmaterial', uuid);
  }

  async createJobMaterial(data: Record<string, any>): Promise<string> {
    return this.create('jobmaterial', data);
  }

  async updateJobMaterial(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('jobmaterial', uuid, data);
  }

  async deleteJobMaterial(uuid: string): Promise<void> {
    return this.remove('jobmaterial', uuid);
  }

  // --- Materials (Catalog) ---

  async listMaterials(options?: ListOptions): Promise<any[]> {
    return this.list('material', options);
  }

  async getMaterial(uuid: string): Promise<any> {
    return this.get('material', uuid);
  }

  async createMaterial(data: Record<string, any>): Promise<string> {
    return this.create('material', data);
  }

  async updateMaterial(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('material', uuid, data);
  }

  // --- Notes ---

  async listNotes(options?: ListOptions): Promise<any[]> {
    return this.list('note', options);
  }

  async createNote(data: Record<string, any>): Promise<string> {
    return this.create('note', data);
  }

  // --- Attachments ---

  async listAttachments(options?: ListOptions): Promise<any[]> {
    return this.list('attachment', options);
  }

  async getAttachment(uuid: string): Promise<any> {
    return this.get('attachment', uuid);
  }

  // --- Job Contacts ---

  async listJobContacts(options?: ListOptions): Promise<any[]> {
    return this.list('jobcontact', options);
  }

  async getJobContact(uuid: string): Promise<any> {
    return this.get('jobcontact', uuid);
  }

  async createJobContact(data: Record<string, any>): Promise<string> {
    return this.create('jobcontact', data);
  }

  // --- Job Payments ---

  async listJobPayments(options?: ListOptions): Promise<any[]> {
    return this.list('jobpayment', options);
  }

  async createJobPayment(data: Record<string, any>): Promise<string> {
    return this.create('jobpayment', data);
  }

  // --- Job Checklists ---

  async listJobChecklists(options?: ListOptions): Promise<any[]> {
    return this.list('jobchecklist', options);
  }

  // --- Categories ---

  async listCategories(options?: ListOptions): Promise<any[]> {
    return this.list('category', options);
  }

  // --- Assets ---

  async listAssets(options?: ListOptions): Promise<any[]> {
    return this.list('asset', options);
  }

  async getAsset(uuid: string): Promise<any> {
    return this.get('asset', uuid);
  }

  async updateAsset(uuid: string, data: Record<string, any>): Promise<void> {
    return this.update('asset', uuid, data);
  }

  // --- Asset Types ---

  async listAssetTypes(options?: ListOptions): Promise<any[]> {
    return this.list('assettype', options);
  }
}
