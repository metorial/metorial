import { createAxios } from 'slates';

export interface FilterProperty {
  property: string;
  operation: string;
  value: string;
  isCustomField?: boolean;
}

export interface FilterRequest {
  properties?: FilterProperty[];
  isAsc?: boolean;
  itemType?: string[];
  limit?: number;
  offset?: number;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private authMethod: string;
  private token: string;

  constructor(config: { token: string; authMethod: string }) {
    this.token = config.token;
    this.authMethod = config.authMethod;

    if (config.authMethod === 'api_key') {
      this.http = createAxios({
        baseURL: 'https://app.onedesk.com/rest/public',
        headers: {
          'OD-Public-API-Key': config.token,
          'Content-Type': 'application/json'
        }
      });
    } else {
      this.http = createAxios({
        baseURL: 'https://app.onedesk.com/rest/2.0',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  private addLegacyToken(body: Record<string, any>): Record<string, any> {
    if (this.authMethod === 'legacy_token') {
      return { ...body, authenticationToken: this.token };
    }
    return body;
  }

  // --- Organization ---

  async getOrganizationProfile(): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.get('/organization/profileAndPolicy');
      return response.data;
    } else {
      let response = await this.http.post(
        '/organization/getProfileAndPolicy',
        this.addLegacyToken({})
      );
      return response.data?.data || response.data;
    }
  }

  async getItemTypes(): Promise<any[]> {
    let response = await this.http.get('/organization/itemTypes');
    return response.data || [];
  }

  async getContainerTypes(): Promise<any[]> {
    let response = await this.http.get('/organization/containerTypes');
    return response.data || [];
  }

  async getUserTypes(): Promise<any[]> {
    let response = await this.http.get('/organization/userTypes');
    return response.data || [];
  }

  // --- Items (Tickets, Tasks, etc.) ---

  async createItem(data: {
    name: string;
    type?: string;
    description?: string;
    projectExternalId?: string;
    priority?: number;
    customFields?: Record<string, any>;
  }): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/items/', data);
      return response.data;
    } else {
      let response = await this.http.post(
        '/workitem/createWorkItem',
        this.addLegacyToken({
          name: data.name,
          type: data.type,
          description: data.description,
          spaceId: data.projectExternalId,
          priority: data.priority,
          customFields: data.customFields
        })
      );
      return response.data?.data || response.data;
    }
  }

  async getItemById(itemId: string): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.get(`/items/id/${itemId}`);
      return response.data;
    } else {
      let response = await this.http.post(
        '/workitem/getItemById',
        this.addLegacyToken({ id: itemId })
      );
      return response.data?.data || response.data;
    }
  }

  async getItemByExternalId(externalId: string): Promise<any> {
    let response = await this.http.get(`/items/externalId/${externalId}`);
    return response.data;
  }

  async updateItemById(
    itemId: string,
    data: {
      name?: string;
      description?: string;
      priority?: number;
      percentComplete?: number;
      customFields?: Record<string, any>;
    }
  ): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post(`/items/id/${itemId}`, data);
      return response.data;
    } else {
      let response = await this.http.post(
        '/workitem/updateWorkItem',
        this.addLegacyToken({
          id: itemId,
          ...data
        })
      );
      return response.data?.data || response.data;
    }
  }

  async searchItems(filter: FilterRequest): Promise<any[]> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/items/filter/details', filter);
      return response.data?.data || response.data || [];
    } else {
      let response = await this.http.post(
        '/workitem/search',
        this.addLegacyToken({
          properties: filter.properties,
          isAsc: filter.isAsc
        })
      );
      return response.data?.data || response.data || [];
    }
  }

  async searchItemsPaginated(
    filter: FilterRequest,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    let response = await this.http.post('/items/filter/details', {
      ...filter,
      limit,
      offset
    });
    return response.data?.data || response.data || [];
  }

  // --- Projects ---

  async createProject(data: {
    name: string;
    type?: string;
    description?: string;
    parentPortfolioExternalIds?: string[];
  }): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/projects/', data);
      return response.data;
    } else {
      let response = await this.http.post(
        '/space/create',
        this.addLegacyToken({
          name: data.name,
          containerType: data.type,
          description: data.description,
          parentIds: data.parentPortfolioExternalIds
        })
      );
      return response.data?.data || response.data;
    }
  }

  async searchProjects(filter: FilterRequest): Promise<any[]> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/projects/filter/details', filter);
      return response.data?.data || response.data || [];
    } else {
      let response = await this.http.post(
        '/space/search',
        this.addLegacyToken({
          properties: filter.properties,
          isAsc: filter.isAsc
        })
      );
      return response.data?.data || response.data || [];
    }
  }

  async searchProjectsPaginated(
    filter: FilterRequest,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    let response = await this.http.post('/projects/filter/details', {
      ...filter,
      limit,
      offset
    });
    return response.data?.data || response.data || [];
  }

  // --- Messages / Conversations ---

  async createMessage(data: {
    conversationExternalId: string;
    content: string;
  }): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/conversation-messages/', data);
      return response.data;
    } else {
      let response = await this.http.post('/message/postMessage', this.addLegacyToken(data));
      return response.data?.data || response.data;
    }
  }

  async searchMessages(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/conversation-messages/filter/details', filter);
    return response.data?.data || response.data || [];
  }

  // --- Users ---

  async createUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    type?: string;
    teams?: string[];
    isAdmin?: boolean;
  }): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post('/users/', data);
      return response.data;
    } else {
      let response = await this.http.post('/user/create', this.addLegacyToken(data));
      return response.data?.data || response.data;
    }
  }

  // --- Timesheets ---

  async searchTimesheets(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/timesheets/filter/details', filter);
    return response.data?.data || response.data || [];
  }

  // --- Invoices ---

  async searchInvoices(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/invoices/filter/details', filter);
    return response.data?.data || response.data || [];
  }

  // --- Activities (used for polling triggers) ---

  async searchActivities(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/activities/filter/details', filter);
    return response.data?.data || response.data || [];
  }

  // --- Portfolios ---

  async searchPortfolios(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/portfolios/filter/details', filter);
    return response.data?.data || response.data || [];
  }

  // --- Teams ---

  async searchTeams(filter: FilterRequest): Promise<any[]> {
    let response = await this.http.post('/teams/filter/details', filter);
    return response.data?.data || response.data || [];
  }
}
