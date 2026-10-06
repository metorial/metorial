import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginatedResponse<T> {
  entries: T[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
}

export class Client {
  private axios;

  constructor(credentials: { token: string; appKey: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.pipelinecrm.com/api/v3',
      authHeader: { value: `Bearer ${credentials.token}` },
      headers: { 'app-key': credentials.appKey },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Pipeline CRM',
          reason: 'pipeline_crm_api_error'
        })
    });
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    return {
      ...extra
    };
  }

  // ── Deals ──

  async listDeals(
    options: {
      page?: number;
      perPage?: number;
      conditions?: Record<string, any>;
      sort?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = this.params({
      page: options.page ?? 1,
      per_page: options.perPage ?? 200
    });
    if (options.sort) params.sort = options.sort;
    if (options.conditions) {
      for (let [key, value] of Object.entries(options.conditions)) {
        params[`conditions[${key}]`] = value;
      }
    }
    let response = await this.axios.get('/deals.json', { params });
    return response.data;
  }

  async getDeal(dealId: number): Promise<any> {
    let response = await this.axios.get(`/deals/${dealId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async createDeal(deal: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/deals.json',
      { deal },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateDeal(dealId: number, deal: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/deals/${dealId}.json`,
      { deal },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteDeal(dealId: number): Promise<void> {
    await this.axios.delete(`/deals/${dealId}.json`, {
      params: this.params()
    });
  }

  // ── People ──

  async listPeople(
    options: {
      page?: number;
      perPage?: number;
      conditions?: Record<string, any>;
      sort?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = this.params({
      page: options.page ?? 1,
      per_page: options.perPage ?? 200
    });
    if (options.sort) params.sort = options.sort;
    if (options.conditions) {
      for (let [key, value] of Object.entries(options.conditions)) {
        params[`conditions[${key}]`] = value;
      }
    }
    let response = await this.axios.get('/people.json', { params });
    return response.data;
  }

  async getPerson(personId: number): Promise<any> {
    let response = await this.axios.get(`/people/${personId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async createPerson(person: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/people.json',
      { person },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updatePerson(personId: number, person: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/people/${personId}.json`,
      { person },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deletePerson(personId: number): Promise<void> {
    await this.axios.delete(`/people/${personId}.json`, {
      params: this.params()
    });
  }

  // ── Companies ──

  async listCompanies(
    options: {
      page?: number;
      perPage?: number;
      conditions?: Record<string, any>;
      sort?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = this.params({
      page: options.page ?? 1,
      per_page: options.perPage ?? 200
    });
    if (options.sort) params.sort = options.sort;
    if (options.conditions) {
      for (let [key, value] of Object.entries(options.conditions)) {
        params[`conditions[${key}]`] = value;
      }
    }
    let response = await this.axios.get('/companies.json', { params });
    return response.data;
  }

  async getCompany(companyId: number): Promise<any> {
    let response = await this.axios.get(`/companies/${companyId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async createCompany(company: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/companies.json',
      { company },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateCompany(companyId: number, company: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/companies/${companyId}.json`,
      { company },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteCompany(companyId: number): Promise<void> {
    await this.axios.delete(`/companies/${companyId}.json`, {
      params: this.params()
    });
  }

  // ── Notes ──

  async listNotes(
    options: {
      page?: number;
      perPage?: number;
      dealId?: number;
      personId?: number;
      companyId?: number;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    if (
      [options.dealId, options.personId, options.companyId].filter(id => id !== undefined)
        .length > 1
    ) {
      throw createApiServiceError('Choose only one deal, person, or company to filter notes.');
    }
    let basePath: string;
    if (options.dealId) {
      basePath = `/deals/${options.dealId}/notes.json`;
    } else if (options.personId) {
      basePath = `/people/${options.personId}/notes.json`;
    } else if (options.companyId) {
      basePath = `/companies/${options.companyId}/notes.json`;
    } else {
      basePath = '/notes.json';
    }

    let response = await this.axios.get(basePath, {
      params: this.params({
        page: options.page ?? 1,
        per_page: options.perPage ?? 200
      })
    });
    return response.data;
  }

  async getNote(noteId: number): Promise<any> {
    let response = await this.axios.get(`/notes/${noteId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async createNote(note: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/notes.json',
      { note },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateNote(noteId: number, note: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/notes/${noteId}.json`,
      { note },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteNote(noteId: number): Promise<void> {
    await this.axios.delete(`/notes/${noteId}.json`, {
      params: this.params()
    });
  }

  // ── Calendar Entries ──

  async listCalendarEntries(
    options: {
      page?: number;
      perPage?: number;
      conditions?: Record<string, any>;
      sort?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = this.params({
      page: options.page ?? 1,
      per_page: options.perPage ?? 200
    });
    if (options.sort) params.sort = options.sort;
    if (options.conditions) {
      for (let [key, value] of Object.entries(options.conditions)) {
        params[`conditions[${key}]`] = value;
      }
    }
    let response = await this.axios.get('/calendar_entries.json', { params });
    return response.data;
  }

  async getCalendarEntry(entryId: number): Promise<any> {
    let response = await this.axios.get(`/calendar_entries/${entryId}.json`, {
      params: this.params()
    });
    return response.data;
  }

  async createCalendarEntry(entry: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/calendar_entries.json',
      { calendar_entry: entry },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async updateCalendarEntry(entryId: number, entry: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/calendar_entries/${entryId}.json`,
      { calendar_entry: entry },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteCalendarEntry(entryId: number): Promise<void> {
    await this.axios.delete(`/calendar_entries/${entryId}.json`, {
      params: this.params()
    });
  }

  private async listMetadata(path: string): Promise<any[]> {
    let entries: any[] = [];
    let page = 1;
    while (true) {
      let response = await this.axios.get(path, { params: { page, per_page: 200 } });
      if (Array.isArray(response.data)) return response.data;
      let pageEntries = response.data.entries ?? [];
      entries.push(...pageEntries);
      let pagination = response.data.pagination;
      let totalPages =
        pagination?.pages ??
        Math.ceil((pagination?.total ?? entries.length) / (pagination?.per_page ?? 200));
      if (pageEntries.length === 0 || page >= totalPages) return entries;
      page++;
    }
  }

  // ── Users ──

  async listUsers(): Promise<any[]> {
    return this.listMetadata('/admin/users.json');
  }

  // ── Admin / Metadata ──

  async listDealStages(): Promise<any[]> {
    return this.listMetadata('/admin/deal_stages.json');
  }

  async listNoteCategories(): Promise<any[]> {
    return this.listMetadata('/admin/note_categories.json');
  }

  async listLeadSources(): Promise<any[]> {
    return this.listMetadata('/admin/lead_sources.json');
  }

  async listCustomFieldLabels(resourceType: 'deal' | 'person' | 'company'): Promise<any[]> {
    return this.listMetadata(`/admin/${resourceType}_custom_field_labels.json`);
  }

  async listEventCategories(): Promise<any[]> {
    return this.listMetadata('/admin/event_categories.json');
  }

  // ── Profile ──

  async getProfile(): Promise<any> {
    let response = await this.axios.get('/profile.json', {
      params: this.params()
    });
    return response.data;
  }
}
