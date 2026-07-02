import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    nextLink: string | null;
  };
}

export interface FolkUser {
  id: string;
  fullName: string;
  email: string;
}

export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  description: string;
  birthday: string | null;
  jobTitle: string;
  createdAt: string | null;
  createdBy: FolkUser;
  groups: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  addresses: string[];
  emails: string[];
  phones: string[];
  urls: string[];
  customFieldValues: Record<string, unknown>;
  interactionMetadata: unknown;
  strongestConnection: unknown;
}

export interface CompanyData {
  id: string;
  name: string;
  description: string;
  fundingRaised: string | null;
  lastFundingDate: string | null;
  industry: string | null;
  foundationYear: string | null;
  employeeRange: string | null;
  createdAt: string | null;
  createdBy: FolkUser;
  groups: Array<{ id: string; name: string }>;
  addresses: string[];
  emails: string[];
  phones: string[];
  urls: string[];
  customFieldValues: Record<string, unknown>;
}

export interface DealData {
  id: string;
  name: string;
  companies: Array<{ id: string; name: string }>;
  people: Array<{ id: string; fullName: string }>;
  createdAt: string;
  createdBy: FolkUser;
  customFieldValues: Record<string, unknown>;
}

export interface GroupData {
  id: string;
  name: string;
}

export interface CustomFieldData {
  name: string;
  type: string;
  options?: Array<{ label: string; color: string }>;
  config?: { format?: string; currency?: string };
}

export interface NoteData {
  id: string;
  entity: { id: string; entityType: string; fullName: string };
  content: string;
  visibility: string;
  author: { type: string; id: string; fullName: string; email: string; deleted: boolean };
  createdAt: string;
  parentNote: { id: string } | null;
}

export interface ReminderData {
  id: string;
  name: string;
  entity: { id: string; entityType: string; fullName: string };
  recurrenceRule: string;
  visibility: string;
  assignedUsers: FolkUser[];
  nextTriggerTime: string | null;
  lastTriggerTime: string | null;
  createdBy: FolkUser;
  createdAt: string | null;
}

export interface WebhookData {
  id: string;
  name: string;
  targetUrl: string;
  subscribedEvents: Array<{
    eventType: string;
    filter?: Record<string, unknown>;
  }>;
  signingSecret: string;
  status: string;
  createdAt: string;
}

export interface CreatePersonInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  description?: string;
  birthday?: string | null;
  jobTitle?: string;
  groups?: Array<{ id: string }>;
  companies?: Array<{ name?: string; id?: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface UpdatePersonInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  description?: string;
  birthday?: string | null;
  jobTitle?: string;
  groups?: Array<{ id: string }>;
  companies?: Array<{ name?: string; id?: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface CreateCompanyInput {
  name?: string;
  description?: string;
  fundingRaised?: number | string | null;
  lastFundingDate?: string | null;
  industry?: string | null;
  foundationYear?: string | number | null;
  employeeRange?: string | null;
  groups?: Array<{ id: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateCompanyInput {
  name?: string;
  description?: string;
  fundingRaised?: number | string | null;
  lastFundingDate?: string | null;
  industry?: string | null;
  foundationYear?: string | number | null;
  employeeRange?: string | null;
  groups?: Array<{ id: string }>;
  addresses?: string[];
  emails?: string[];
  phones?: string[];
  urls?: string[];
  customFieldValues?: Record<string, unknown>;
}

export interface CreateDealInput {
  name?: string;
  companies?: Array<{ id: string }>;
  people?: Array<{ id: string }>;
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateDealInput {
  name?: string;
  companies?: Array<{ id: string }>;
  people?: Array<{ id: string }>;
  customFieldValues?: Record<string, unknown>;
}

export interface CreateNoteInput {
  entity: { id: string };
  visibility: 'public' | 'private';
  content: string;
  parentNote?: { id: string };
}

export interface UpdateNoteInput {
  visibility?: 'public' | 'private';
  content?: string;
}

export interface CreateReminderInput {
  entity: { id: string };
  name: string;
  recurrenceRule: string;
  visibility: 'public' | 'private';
  assignedUsers?: Array<{ id?: string; email?: string }>;
}

export interface UpdateReminderInput {
  name?: string;
  recurrenceRule?: string;
  visibility?: 'public' | 'private';
  assignedUsers?: Array<{ id?: string; email?: string }>;
}

export interface CreateWebhookInput {
  name: string;
  targetUrl: string;
  subscribedEvents: Array<{
    eventType: string;
    filter?: Record<string, unknown>;
  }>;
}

export interface FilterParams {
  combinator?: 'and' | 'or';
  filter?: Record<string, Record<string, string>>;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.folk.app/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── People ───

  async listPeople(
    params?: PaginationParams & FilterParams
  ): Promise<PaginatedResponse<PersonData>> {
    let response = await this.http.get('/people', { params });
    return response.data.data;
  }

  async getPerson(personId: string): Promise<PersonData> {
    let response = await this.http.get(`/people/${personId}`);
    return response.data.data;
  }

  async createPerson(input: CreatePersonInput): Promise<PersonData> {
    let response = await this.http.post('/people', input);
    return response.data.data;
  }

  async updatePerson(personId: string, input: UpdatePersonInput): Promise<PersonData> {
    let response = await this.http.patch(`/people/${personId}`, input);
    return response.data.data;
  }

  async deletePerson(personId: string): Promise<{ id: string }> {
    let response = await this.http.delete(`/people/${personId}`);
    return response.data.data;
  }

  // ─── Companies ───

  async listCompanies(
    params?: PaginationParams & FilterParams
  ): Promise<PaginatedResponse<CompanyData>> {
    let response = await this.http.get('/companies', { params });
    return response.data.data;
  }

  async getCompany(companyId: string): Promise<CompanyData> {
    let response = await this.http.get(`/companies/${companyId}`);
    return response.data.data;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyData> {
    let response = await this.http.post('/companies', input);
    return response.data.data;
  }

  async updateCompany(companyId: string, input: UpdateCompanyInput): Promise<CompanyData> {
    let response = await this.http.patch(`/companies/${companyId}`, input);
    return response.data.data;
  }

  async deleteCompany(companyId: string): Promise<{ id: string }> {
    let response = await this.http.delete(`/companies/${companyId}`);
    return response.data.data;
  }

  // ─── Deals ───

  async listDeals(
    groupId: string,
    objectType: string,
    params?: PaginationParams & FilterParams
  ): Promise<PaginatedResponse<DealData>> {
    let response = await this.http.get(`/groups/${groupId}/${objectType}`, { params });
    return response.data.data;
  }

  async getDeal(groupId: string, objectType: string, dealId: string): Promise<DealData> {
    let response = await this.http.get(`/groups/${groupId}/${objectType}/${dealId}`);
    return response.data.data;
  }

  async createDeal(
    groupId: string,
    objectType: string,
    input: CreateDealInput
  ): Promise<DealData> {
    let response = await this.http.post(`/groups/${groupId}/${objectType}`, input);
    return response.data.data;
  }

  async updateDeal(
    groupId: string,
    objectType: string,
    dealId: string,
    input: UpdateDealInput
  ): Promise<DealData> {
    let response = await this.http.patch(`/groups/${groupId}/${objectType}/${dealId}`, input);
    return response.data.data;
  }

  async deleteDeal(
    groupId: string,
    objectType: string,
    dealId: string
  ): Promise<{ id: string }> {
    let response = await this.http.delete(`/groups/${groupId}/${objectType}/${dealId}`);
    return response.data.data;
  }

  // ─── Groups ───

  async listGroups(params?: PaginationParams): Promise<PaginatedResponse<GroupData>> {
    let response = await this.http.get('/groups', { params });
    return response.data.data;
  }

  async listGroupCustomFields(
    groupId: string,
    entityType: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<CustomFieldData>> {
    let response = await this.http.get(`/groups/${groupId}/custom-fields/${entityType}`, {
      params
    });
    return response.data.data;
  }

  // ─── Notes ───

  async listNotes(
    entityId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<NoteData>> {
    let response = await this.http.get('/notes', {
      params: { ...params, entityId }
    });
    return response.data.data;
  }

  async getNote(noteId: string): Promise<NoteData> {
    let response = await this.http.get(`/notes/${noteId}`);
    return response.data.data;
  }

  async createNote(input: CreateNoteInput): Promise<NoteData> {
    let response = await this.http.post('/notes', input);
    return response.data.data;
  }

  async updateNote(noteId: string, input: UpdateNoteInput): Promise<NoteData> {
    let response = await this.http.patch(`/notes/${noteId}`, input);
    return response.data.data;
  }

  async deleteNote(noteId: string): Promise<{ id: string }> {
    let response = await this.http.delete(`/notes/${noteId}`);
    return response.data.data;
  }

  // ─── Reminders ───

  async listReminders(
    entityId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ReminderData>> {
    let response = await this.http.get('/reminders', {
      params: { ...params, entityId }
    });
    return response.data.data;
  }

  async getReminder(reminderId: string): Promise<ReminderData> {
    let response = await this.http.get(`/reminders/${reminderId}`);
    return response.data.data;
  }

  async createReminder(input: CreateReminderInput): Promise<ReminderData> {
    let response = await this.http.post('/reminders', input);
    return response.data.data;
  }

  async updateReminder(reminderId: string, input: UpdateReminderInput): Promise<ReminderData> {
    let response = await this.http.patch(`/reminders/${reminderId}`, input);
    return response.data.data;
  }

  async deleteReminder(reminderId: string): Promise<{ id: string }> {
    let response = await this.http.delete(`/reminders/${reminderId}`);
    return response.data.data;
  }

  // ─── Webhooks ───

  async listWebhooks(params?: PaginationParams): Promise<PaginatedResponse<WebhookData>> {
    let response = await this.http.get('/webhooks', { params });
    return response.data.data;
  }

  async createWebhook(input: CreateWebhookInput): Promise<WebhookData> {
    let response = await this.http.post('/webhooks', input);
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<{ id: string }> {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data.data;
  }

  // ─── Users ───

  async getCurrentUser(): Promise<FolkUser> {
    let response = await this.http.get('/users/me');
    return response.data.data;
  }

  async listUsers(params?: PaginationParams): Promise<PaginatedResponse<FolkUser>> {
    let response = await this.http.get('/users', { params });
    return response.data.data;
  }
}
