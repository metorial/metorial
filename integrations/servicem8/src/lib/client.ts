import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
}

export interface ListOptions {
  filter?: string;
  pageStart?: string;
}

export class Client {
  private http;

  constructor(config: ClientConfig) {
    this.http = createAxios({
      baseURL: 'https://api.servicem8.com/api_1.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // --- Generic CRUD ---

  async list(resource: string, options?: ListOptions): Promise<any[]> {
    let params: Record<string, string> = {};
    if (options?.filter) {
      params.$filter = options.filter;
    }
    if (options?.pageStart) {
      params['%next_page_start%'] = options.pageStart;
    }
    let response = await this.http.get(`/${resource}.json`, { params });
    return response.data;
  }

  async get(resource: string, uuid: string): Promise<any> {
    let response = await this.http.get(`/${resource}/${uuid}.json`);
    return response.data;
  }

  async create(resource: string, data: Record<string, any>): Promise<string> {
    let response = await this.http.post(`/${resource}.json`, data);
    let recordUuid = response.headers?.['x-record-uuid'] || response.data?.uuid;
    return recordUuid;
  }

  async update(resource: string, uuid: string, data: Record<string, any>): Promise<void> {
    await this.http.post(`/${resource}/${uuid}.json`, data);
  }

  async remove(resource: string, uuid: string): Promise<void> {
    await this.http.delete(`/${resource}/${uuid}.json`);
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
