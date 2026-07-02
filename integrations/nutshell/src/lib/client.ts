import { createAxios } from 'slates';

export interface NutshellEntityRef {
  entityType: string;
  id: number;
}

export interface FindParams {
  query?: Record<string, any>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  page?: number;
  stubResponses?: boolean;
}

export class NutshellClient {
  private axios;
  private requestCounter = 0;

  constructor(private credentials: { username: string; token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.nutshell.com/api/v1/json'
    });
  }

  private nextId(): string {
    this.requestCounter++;
    return `req-${this.requestCounter}-${Date.now()}`;
  }

  private getAuth() {
    return {
      username: this.credentials.username,
      password: this.credentials.token
    };
  }

  async rpc(method: string, params: Record<string, any> = {}): Promise<any> {
    let response = await this.axios.post(
      '',
      {
        id: this.nextId(),
        method,
        params
      },
      {
        auth: this.getAuth()
      }
    );

    let data = response.data;

    if (data.error) {
      throw new Error(`Nutshell API error (${data.error.code}): ${data.error.message}`);
    }

    return data.result;
  }

  // ---- Contacts ----

  async getContact(contactId: number, rev?: string): Promise<any> {
    let params: Record<string, any> = { contactId };
    if (rev) params.rev = rev;
    return this.rpc('getContact', params);
  }

  async newContact(contact: Record<string, any>): Promise<any> {
    return this.rpc('newContact', { contact });
  }

  async editContact(
    contactId: number,
    rev: string,
    contact: Record<string, any>
  ): Promise<any> {
    return this.rpc('editContact', { contactId, rev, contact });
  }

  async findContacts(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findContacts', params) ?? [];
  }

  async searchContacts(searchString: string): Promise<any[]> {
    return this.rpc('searchContacts', { string: searchString }) ?? [];
  }

  // ---- Accounts ----

  async getAccount(accountId: number, rev?: string): Promise<any> {
    let params: Record<string, any> = { accountId };
    if (rev) params.rev = rev;
    return this.rpc('getAccount', params);
  }

  async newAccount(account: Record<string, any>): Promise<any> {
    return this.rpc('newAccount', { account });
  }

  async editAccount(
    accountId: number,
    rev: string,
    account: Record<string, any>
  ): Promise<any> {
    return this.rpc('editAccount', { accountId, rev, account });
  }

  async findAccounts(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findAccounts', params) ?? [];
  }

  async searchAccounts(searchString: string): Promise<any[]> {
    return this.rpc('searchAccounts', { string: searchString }) ?? [];
  }

  // ---- Leads ----

  async getLead(leadId: number, rev?: string): Promise<any> {
    let params: Record<string, any> = { leadId };
    if (rev) params.rev = rev;
    return this.rpc('getLead', params);
  }

  async newLead(lead: Record<string, any>): Promise<any> {
    return this.rpc('newLead', { lead });
  }

  async editLead(leadId: number, rev: string, lead: Record<string, any>): Promise<any> {
    return this.rpc('editLead', { leadId, rev, lead });
  }

  async findLeads(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findLeads', params) ?? [];
  }

  async searchLeads(searchString: string): Promise<any[]> {
    return this.rpc('searchByEntity', { string: searchString, entityType: 'Leads' }) ?? [];
  }

  // ---- Activities ----

  async getActivity(activityId: number, rev?: string): Promise<any> {
    let params: Record<string, any> = { activityId };
    if (rev) params.rev = rev;
    return this.rpc('getActivity', params);
  }

  async newActivity(activity: Record<string, any>): Promise<any> {
    return this.rpc('newActivity', { activity });
  }

  async editActivity(
    activityId: number,
    rev: string,
    activity: Record<string, any>
  ): Promise<any> {
    return this.rpc('editActivity', { activityId, rev, activity });
  }

  async findActivities(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findActivities', params) ?? [];
  }

  // ---- Tasks ----

  async newTask(task: Record<string, any>): Promise<any> {
    return this.rpc('newTask', { task });
  }

  async getTask(taskId: number): Promise<any> {
    return this.rpc('getTask', { taskId });
  }

  async editTask(taskId: number, rev: string, task: Record<string, any>): Promise<any> {
    return this.rpc('editTask', { taskId, rev, task });
  }

  // ---- Notes ----

  async newNote(entity: NutshellEntityRef, note: string): Promise<any> {
    return this.rpc('newNote', { entity, note });
  }

  // ---- Products ----

  async findProducts(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findProducts', params) ?? [];
  }

  async searchProducts(searchString: string): Promise<any[]> {
    return this.rpc('searchProducts', { string: searchString }) ?? [];
  }

  async getProduct(productId: number): Promise<any> {
    return this.rpc('getProduct', { productId });
  }

  // ---- Competitors ----

  async findCompetitors(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findCompetitors', params) ?? [];
  }

  async searchCompetitors(searchString: string): Promise<any[]> {
    return this.rpc('searchCompetitors', { string: searchString }) ?? [];
  }

  // ---- Pipeline / Stages ----

  async findMilestones(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findMilestones', params) ?? [];
  }

  // ---- Users & Teams ----

  async findUsers(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findUsers', params) ?? [];
  }

  async findTeams(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findTeams', params) ?? [];
  }

  async getUser(userId: number): Promise<any> {
    return this.rpc('getUser', { userId });
  }

  // ---- Sources, Tags, Industries, Markets ----

  async findSources(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findSources', params) ?? [];
  }

  async searchSources(searchString: string): Promise<any[]> {
    return this.rpc('searchSources', { string: searchString }) ?? [];
  }

  async findIndustries(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findIndustries', params) ?? [];
  }

  async findMarkets(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findMarkets', params) ?? [];
  }

  // ---- Activity Types ----

  async findActivityTypes(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findActivityTypes', params) ?? [];
  }

  // ---- Lead Outcomes ----

  async findLeadOutcomes(params: FindParams = {}): Promise<any[]> {
    return this.rpc('findLead_Outcomes', params) ?? [];
  }

  // ---- Timeline ----

  async findTimeline(entity: NutshellEntityRef, params: FindParams = {}): Promise<any[]> {
    return this.rpc('findTimeline', { entity, ...params }) ?? [];
  }

  // ---- Universal Search ----

  async searchUniversal(searchString: string): Promise<any[]> {
    return this.rpc('searchUniversal', { string: searchString }) ?? [];
  }
}
