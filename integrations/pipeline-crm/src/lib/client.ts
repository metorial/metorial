import { createAxios } from 'slates';

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

  constructor(private credentials: { token: string; appKey: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.pipelinecrm.com/api/v3'
    });
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    return {
      api_key: this.credentials.token,
      app_key: this.credentials.appKey,
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

  // ── Users ──

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/admin/users.json', {
      params: this.params()
    });
    return response.data;
  }

  // ── Admin / Metadata ──

  async listDealStages(): Promise<any[]> {
    let response = await this.axios.get('/admin/deal_stages.json', {
      params: this.params()
    });
    return response.data;
  }

  async listNoteCategories(): Promise<any[]> {
    let response = await this.axios.get('/admin/note_categories.json', {
      params: this.params()
    });
    return response.data;
  }

  async listLeadSources(): Promise<any[]> {
    let response = await this.axios.get('/admin/lead_sources.json', {
      params: this.params()
    });
    return response.data;
  }

  async listCustomFieldLabels(resourceType: 'deal' | 'person' | 'company'): Promise<any[]> {
    let response = await this.axios.get(`/admin/${resourceType}_custom_field_labels.json`, {
      params: this.params()
    });
    return response.data;
  }

  // ── Profile ──

  async getProfile(): Promise<any> {
    let response = await this.axios.get('/profile.json', {
      params: this.params()
    });
    return response.data;
  }
}
