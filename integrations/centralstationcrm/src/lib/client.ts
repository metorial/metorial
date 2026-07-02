import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  perpage?: number;
}

export interface PersonData {
  first_name?: string;
  name?: string;
  title?: string;
  salutation?: string;
  gender?: string;
  background?: string;
  user_id?: number;
}

export interface CompanyData {
  name?: string;
  background?: string;
  user_id?: number;
}

export interface DealData {
  name?: string;
  value?: string;
  value_type?: string;
  value_count?: string;
  target_date?: string;
  current_state?: string;
  user_id?: number;
}

export interface TaskData {
  subject?: string;
  description?: string;
  due_at?: string;
  user_id?: number;
  person_id?: number;
  company_id?: number;
  deal_id?: number;
  project_id?: number;
  done?: boolean;
}

export interface NoteData {
  content?: string;
  attachable_type?: string;
  attachable_id?: number;
}

export interface ProjectData {
  name?: string;
  description?: string;
  user_id?: number;
}

export interface WebhookData {
  url?: string;
  object_type?: string;
  action?: string;
  methods?: string;
}

export interface ContactDetailData {
  name?: string;
  type?: string;
}

export interface AddressData {
  street?: string;
  zip?: string;
  city?: string;
  state_code?: string;
  country_code?: string;
  type?: string;
}

export interface TagData {
  name?: string;
}

export interface HistoricEventData {
  name?: string;
  date?: string;
  category?: string;
}

export class Client {
  private axios;

  constructor(params: {
    token: string;
    accountName: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://${params.accountName}.centralstationcrm.net/api`,
      headers: {
        'X-apikey': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ====== People ======

  async listPeople(params?: PaginationParams & { includes?: string }) {
    let response = await this.axios.get('/people.json', { params });
    return response.data;
  }

  async getPerson(personId: number, params?: { includes?: string }) {
    let response = await this.axios.get(`/people/${personId}.json`, { params });
    return response.data;
  }

  async createPerson(data: PersonData) {
    let response = await this.axios.post('/people.json', { person: data });
    return response.data;
  }

  async updatePerson(personId: number, data: PersonData) {
    let response = await this.axios.put(`/people/${personId}.json`, { person: data });
    return response.data;
  }

  async deletePerson(personId: number) {
    let response = await this.axios.delete(`/people/${personId}.json`);
    return response.data;
  }

  async searchPeople(query: string, params?: PaginationParams) {
    let response = await this.axios.get('/people.json', {
      params: { ...params, q: query }
    });
    return response.data;
  }

  async countPeople() {
    let response = await this.axios.get('/people/count.json');
    return response.data;
  }

  async mergePerson(personId: number, mergeIntoPersonId: number) {
    let response = await this.axios.put(`/people/${personId}/merge/${mergeIntoPersonId}.json`);
    return response.data;
  }

  // ====== Person Contact Details ======

  async listPersonContactDetails(personId: number) {
    let response = await this.axios.get(`/people/${personId}/contact_details.json`);
    return response.data;
  }

  async createPersonContactDetail(personId: number, data: ContactDetailData) {
    let response = await this.axios.post(`/people/${personId}/contact_details.json`, {
      contact_detail: data
    });
    return response.data;
  }

  async updatePersonContactDetail(
    personId: number,
    contactDetailId: number,
    data: ContactDetailData
  ) {
    let response = await this.axios.put(
      `/people/${personId}/contact_details/${contactDetailId}.json`,
      { contact_detail: data }
    );
    return response.data;
  }

  async deletePersonContactDetail(personId: number, contactDetailId: number) {
    let response = await this.axios.delete(
      `/people/${personId}/contact_details/${contactDetailId}.json`
    );
    return response.data;
  }

  // ====== Person Addresses ======

  async listPersonAddresses(personId: number) {
    let response = await this.axios.get(`/people/${personId}/addrs.json`);
    return response.data;
  }

  async createPersonAddress(personId: number, data: AddressData) {
    let response = await this.axios.post(`/people/${personId}/addrs.json`, { addr: data });
    return response.data;
  }

  async updatePersonAddress(personId: number, addressId: number, data: AddressData) {
    let response = await this.axios.put(`/people/${personId}/addrs/${addressId}.json`, {
      addr: data
    });
    return response.data;
  }

  async deletePersonAddress(personId: number, addressId: number) {
    let response = await this.axios.delete(`/people/${personId}/addrs/${addressId}.json`);
    return response.data;
  }

  // ====== Person Tags ======

  async listPersonTags(personId: number) {
    let response = await this.axios.get(`/people/${personId}/tags.json`);
    return response.data;
  }

  async addPersonTag(personId: number, data: TagData) {
    let response = await this.axios.post(`/people/${personId}/tags.json`, { tag: data });
    return response.data;
  }

  async removePersonTag(personId: number, tagId: number) {
    let response = await this.axios.delete(`/people/${personId}/tags/${tagId}.json`);
    return response.data;
  }

  // ====== Person Historic Events ======

  async listPersonHistoricEvents(personId: number) {
    let response = await this.axios.get(`/people/${personId}/historic_events.json`);
    return response.data;
  }

  async createPersonHistoricEvent(personId: number, data: HistoricEventData) {
    let response = await this.axios.post(`/people/${personId}/historic_events.json`, {
      historic_event: data
    });
    return response.data;
  }

  async updatePersonHistoricEvent(personId: number, eventId: number, data: HistoricEventData) {
    let response = await this.axios.put(
      `/people/${personId}/historic_events/${eventId}.json`,
      { historic_event: data }
    );
    return response.data;
  }

  async deletePersonHistoricEvent(personId: number, eventId: number) {
    let response = await this.axios.delete(
      `/people/${personId}/historic_events/${eventId}.json`
    );
    return response.data;
  }

  // ====== Companies ======

  async listCompanies(params?: PaginationParams & { includes?: string }) {
    let response = await this.axios.get('/companies.json', { params });
    return response.data;
  }

  async getCompany(companyId: number, params?: { includes?: string }) {
    let response = await this.axios.get(`/companies/${companyId}.json`, { params });
    return response.data;
  }

  async createCompany(data: CompanyData) {
    let response = await this.axios.post('/companies.json', { company: data });
    return response.data;
  }

  async updateCompany(companyId: number, data: CompanyData) {
    let response = await this.axios.put(`/companies/${companyId}.json`, { company: data });
    return response.data;
  }

  async deleteCompany(companyId: number) {
    let response = await this.axios.delete(`/companies/${companyId}.json`);
    return response.data;
  }

  async searchCompanies(query: string, params?: PaginationParams) {
    let response = await this.axios.get('/companies.json', {
      params: { ...params, q: query }
    });
    return response.data;
  }

  // ====== Company Tags ======

  async listCompanyTags(companyId: number) {
    let response = await this.axios.get(`/companies/${companyId}/tags.json`);
    return response.data;
  }

  async addCompanyTag(companyId: number, data: TagData) {
    let response = await this.axios.post(`/companies/${companyId}/tags.json`, { tag: data });
    return response.data;
  }

  async removeCompanyTag(companyId: number, tagId: number) {
    let response = await this.axios.delete(`/companies/${companyId}/tags/${tagId}.json`);
    return response.data;
  }

  // ====== Deals ======

  async listDeals(params?: PaginationParams & { includes?: string }) {
    let response = await this.axios.get('/deals.json', { params });
    return response.data;
  }

  async getDeal(dealId: number, params?: { includes?: string }) {
    let response = await this.axios.get(`/deals/${dealId}.json`, { params });
    return response.data;
  }

  async createDeal(data: DealData) {
    let response = await this.axios.post('/deals.json', { deal: data });
    return response.data;
  }

  async updateDeal(dealId: number, data: DealData) {
    let response = await this.axios.put(`/deals/${dealId}.json`, { deal: data });
    return response.data;
  }

  async deleteDeal(dealId: number) {
    let response = await this.axios.delete(`/deals/${dealId}.json`);
    return response.data;
  }

  // ====== Deal Tags ======

  async listDealTags(dealId: number) {
    let response = await this.axios.get(`/deals/${dealId}/tags.json`);
    return response.data;
  }

  async addDealTag(dealId: number, data: TagData) {
    let response = await this.axios.post(`/deals/${dealId}/tags.json`, { tag: data });
    return response.data;
  }

  async removeDealTag(dealId: number, tagId: number) {
    let response = await this.axios.delete(`/deals/${dealId}/tags/${tagId}.json`);
    return response.data;
  }

  // ====== Tasks ======

  async listTasks(params?: PaginationParams) {
    let response = await this.axios.get('/tasks.json', { params });
    return response.data;
  }

  async getTask(taskId: number) {
    let response = await this.axios.get(`/tasks/${taskId}.json`);
    return response.data;
  }

  async createTask(data: TaskData) {
    let response = await this.axios.post('/tasks.json', { task: data });
    return response.data;
  }

  async updateTask(taskId: number, data: TaskData) {
    let response = await this.axios.put(`/tasks/${taskId}.json`, { task: data });
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.axios.delete(`/tasks/${taskId}.json`);
    return response.data;
  }

  // ====== Notes ======

  async listNotes(
    params?: PaginationParams & { attachable_type?: string; attachable_id?: number }
  ) {
    let response = await this.axios.get('/actions.json', { params });
    return response.data;
  }

  async getNote(noteId: number) {
    let response = await this.axios.get(`/actions/${noteId}.json`);
    return response.data;
  }

  async createNote(data: NoteData) {
    let response = await this.axios.post('/actions.json', { action: data });
    return response.data;
  }

  async updateNote(noteId: number, data: NoteData) {
    let response = await this.axios.put(`/actions/${noteId}.json`, { action: data });
    return response.data;
  }

  async deleteNote(noteId: number) {
    let response = await this.axios.delete(`/actions/${noteId}.json`);
    return response.data;
  }

  // ====== Projects ======

  async listProjects(params?: PaginationParams) {
    let response = await this.axios.get('/projects.json', { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}.json`);
    return response.data;
  }

  async createProject(data: ProjectData) {
    let response = await this.axios.post('/projects.json', { project: data });
    return response.data;
  }

  async updateProject(projectId: number, data: ProjectData) {
    let response = await this.axios.put(`/projects/${projectId}.json`, { project: data });
    return response.data;
  }

  async deleteProject(projectId: number) {
    let response = await this.axios.delete(`/projects/${projectId}.json`);
    return response.data;
  }

  // ====== Users ======

  async listUsers(params?: PaginationParams) {
    let response = await this.axios.get('/users.json', { params });
    return response.data;
  }

  // ====== Webhooks (Hooks) ======

  async listWebhooks() {
    let response = await this.axios.get('/hooks.json');
    return response.data;
  }

  async createWebhook(data: WebhookData) {
    let response = await this.axios.post('/hooks.json', { hook: data });
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/hooks/${webhookId}.json`);
    return response.data;
  }

  // ====== Statistics ======

  async getStats(params?: { type?: string }) {
    let response = await this.axios.get('/stats.json', { params });
    return response.data;
  }

  // ====== Emails / Maildrop ======

  async getPersonMaildrop(personId: number) {
    let response = await this.axios.get(`/people/${personId}/maildrop.json`);
    return response.data;
  }

  async getCompanyMaildrop(companyId: number) {
    let response = await this.axios.get(`/companies/${companyId}/maildrop.json`);
    return response.data;
  }

  // ====== Link People and Companies ======

  async linkPersonToCompany(personId: number, companyId: number) {
    let response = await this.axios.post(`/people/${personId}/companies/${companyId}.json`);
    return response.data;
  }

  async unlinkPersonFromCompany(personId: number, companyId: number) {
    let response = await this.axios.delete(`/people/${personId}/companies/${companyId}.json`);
    return response.data;
  }

  // ====== Link Deals to People/Companies ======

  async linkDealToPerson(dealId: number, personId: number) {
    let response = await this.axios.post(`/deals/${dealId}/people/${personId}.json`);
    return response.data;
  }

  async unlinkDealFromPerson(dealId: number, personId: number) {
    let response = await this.axios.delete(`/deals/${dealId}/people/${personId}.json`);
    return response.data;
  }

  async linkDealToCompany(dealId: number, companyId: number) {
    let response = await this.axios.post(`/deals/${dealId}/companies/${companyId}.json`);
    return response.data;
  }

  async unlinkDealFromCompany(dealId: number, companyId: number) {
    let response = await this.axios.delete(`/deals/${dealId}/companies/${companyId}.json`);
    return response.data;
  }
}
