import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let unwrapOneDeskResponse = (response: unknown): unknown => {
  let code = isApiErrorRecord(response) ? response.code : response;
  if (typeof code === 'string' && (code.startsWith('ERROR_') || code === 'INTERNAL_ERROR')) {
    throw createApiServiceError(`OneDesk request failed: ${code}.`, {
      reason: 'onedesk_api_error',
      upstreamCode: code
    });
  }
  if (isApiErrorRecord(response)) {
    let rejectedFilters = [
      ...(Array.isArray(response.notAppliedPropertyFilters)
        ? response.notAppliedPropertyFilters
        : []),
      ...(Array.isArray(response.notAppliedCustomFieldFilters)
        ? response.notAppliedCustomFieldFilters
        : [])
    ];
    if (rejectedFilters.length > 0) {
      throw createApiServiceError(
        `OneDesk did not apply the requested filters: ${rejectedFilters.join('; ')}.`,
        {
          reason: 'invalid_filter'
        }
      );
    }
    if (Object.hasOwn(response, 'data')) return response.data;
  }
  return response;
};

export let getCreatedId = (result: unknown): string => {
  let value = isApiErrorRecord(result) ? (result.externalId ?? result.id) : result;
  if (
    (typeof value === 'string' && value.trim()) ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return String(value);
  }
  throw createApiServiceError('OneDesk did not return a created resource ID.', {
    reason: 'invalid_response'
  });
};

export let validatePriority = (priority: number | undefined) => {
  if (priority !== undefined && ![0, 20, 40, 60, 80, 100].includes(priority)) {
    throw createApiServiceError('Priority must be 0, 20, 40, 60, 80, or 100.', {
      reason: 'invalid_input'
    });
  }
};

let requireRecord = (result: unknown): Record<string, unknown> => {
  if (isApiErrorRecord(result)) return result;
  throw createApiServiceError('OneDesk did not return the expected resource details.', {
    reason: 'invalid_response'
  });
};

let requireRecords = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result) && result.every(isApiErrorRecord)) return result;
  throw createApiServiceError('OneDesk did not return the expected resource list.', {
    reason: 'invalid_response'
  });
};

export interface FilterProperty {
  property: string;
  operation: string;
  value: string | number | boolean | string[] | null;
  isCustomField?: boolean;
  typedValue?: string | number | boolean | string[] | null;
}

export interface FilterRequest {
  properties?: FilterProperty[];
  isAsc?: boolean;
  itemType?: string[];
  limit?: number;
  offset?: number;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private authMethod: string;
  private token: string;

  constructor(config: { token: string; authMethod: string }) {
    this.token = config.token;
    this.authMethod = config.authMethod;

    if (!config.token?.trim() || !['api_key', 'legacy_token'].includes(config.authMethod)) {
      throw createApiServiceError('Reconnect OneDesk with a valid API key or legacy token.', {
        reason: 'invalid_auth'
      });
    }
    this.http = createAuthenticatedAxios({
      baseURL:
        config.authMethod === 'api_key'
          ? 'https://app.onedesk.com/rest/public'
          : 'https://app.onedesk.com/rest/2.0',
      ...(config.authMethod === 'api_key'
        ? { authHeader: { name: 'OD-Public-API-Key', value: config.token } }
        : {}),
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OneDesk',
          reason: 'onedesk_api_error'
        })
    });
    this.http.interceptors.response.use(response => {
      response.data = unwrapOneDeskResponse(response.data);
      return response;
    });
  }

  private addLegacyToken(body: Record<string, any>): Record<string, any> {
    if (this.authMethod === 'legacy_token') {
      return { ...body, authenticationToken: this.token };
    }
    return body;
  }

  private requirePublicApi() {
    if (this.authMethod !== 'api_key') {
      throw createApiServiceError(
        'This operation requires a OneDesk Public API key connection.',
        { reason: 'unsupported_auth' }
      );
    }
  }

  private publicFilter(filter: FilterRequest) {
    if (
      filter.limit !== undefined &&
      (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 50)
    ) {
      throw createApiServiceError(
        'Limit must be a whole number from 1 to 50 for detailed searches.',
        { reason: 'invalid_input' }
      );
    }
    if (
      filter.offset !== undefined &&
      (!Number.isInteger(filter.offset) || filter.offset < 0)
    ) {
      throw createApiServiceError('Offset must be a non-negative whole number.', {
        reason: 'invalid_input'
      });
    }
    let properties = filter.properties
      ?.filter(property => !property.isCustomField)
      .map(({ property, operation, value, typedValue }) => ({
        property,
        operation,
        value: typedValue !== undefined ? typedValue : value
      }));
    let customFields = filter.properties
      ?.filter(property => property.isCustomField)
      .map(({ property, operation, value, typedValue }) => ({
        property,
        operation,
        value: typedValue !== undefined ? typedValue : value
      }));
    return pickDefined({
      properties: properties?.length ? properties : undefined,
      customFields: customFields?.length ? customFields : undefined,
      itemType: filter.itemType,
      isAsc: filter.isAsc,
      limit: filter.limit,
      offset: filter.offset
    });
  }

  // --- Organization ---

  async getOrganizationProfile(): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.get('/organization/profileAndPolicy');
      return requireRecord(response.data);
    } else {
      let response = await this.http.post(
        '/organization/getProfileAndPolicy',
        this.addLegacyToken({})
      );
      return requireRecord(response.data);
    }
  }

  async getItemTypes(): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.get('/organization/itemTypes');
    return requireRecords(response.data);
  }

  async getContainerTypes(): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.get('/organization/containerTypes');
    return requireRecords(response.data);
  }

  async getUserTypes(): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.get('/organization/userTypes');
    return requireRecords(response.data);
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
      return response.data;
    }
  }

  async getItemById(itemId: string): Promise<any> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.get(`/items/id/${encodeURIComponent(itemId)}`);
      return requireRecord(response.data);
    } else {
      let response = await this.http.post(
        '/workitem/getItemById',
        this.addLegacyToken({ id: itemId })
      );
      return requireRecord(response.data);
    }
  }

  async getItemByExternalId(externalId: string): Promise<any> {
    this.requirePublicApi();
    let response = await this.http.get(`/items/externalId/${encodeURIComponent(externalId)}`);
    return requireRecord(response.data);
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
      let response = await this.http.post(`/items/id/${encodeURIComponent(itemId)}`, data);
      return response.data;
    } else {
      let response = await this.http.post(
        '/workitem/updateWorkItem',
        this.addLegacyToken({
          id: itemId,
          ...data
        })
      );
      return response.data;
    }
  }

  async updateItemByExternalId(
    externalId: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    this.requirePublicApi();
    let response = await this.http.post(
      `/items/externalId/${encodeURIComponent(externalId)}`,
      data
    );
    return response.data;
  }

  async searchItems(filter: FilterRequest): Promise<any[]> {
    if (this.authMethod === 'api_key') {
      let itemType = filter.itemType;
      if (!itemType?.length) {
        itemType = (await this.getItemTypes())
          .map(type => type.label)
          .filter((label): label is string => typeof label === 'string' && label.length > 0);
      }
      if (!itemType.length)
        throw createApiServiceError(
          'No OneDesk item types were found. Call get_organization to inspect available types.',
          { reason: 'invalid_response' }
        );
      let response = await this.http.post(
        '/items/filter/details',
        this.publicFilter({ ...filter, itemType })
      );
      return requireRecords(response.data);
    } else {
      let response = await this.http.post(
        '/workitem/search',
        this.addLegacyToken({
          properties: filter.properties,
          isAsc: filter.isAsc
        })
      );
      return requireRecords(response.data);
    }
  }

  async searchItemsPaginated(filter: FilterRequest, limit = 50, offset = 0): Promise<any[]> {
    return this.searchItems({ ...filter, limit, offset });
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
      return response.data;
    }
  }

  async searchProjects(filter: FilterRequest): Promise<any[]> {
    if (this.authMethod === 'api_key') {
      let response = await this.http.post(
        '/projects/filter/details',
        this.publicFilter(filter)
      );
      return requireRecords(response.data);
    } else {
      let response = await this.http.post(
        '/space/search',
        this.addLegacyToken({
          properties: filter.properties,
          isAsc: filter.isAsc
        })
      );
      return requireRecords(response.data);
    }
  }

  async searchProjectsPaginated(
    filter: FilterRequest,
    limit = 50,
    offset = 0
  ): Promise<any[]> {
    return this.searchProjects({ ...filter, limit, offset });
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
      return response.data;
    }
  }

  async searchMessages(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post(
      '/conversation-messages/filter/details',
      this.publicFilter(filter)
    );
    return requireRecords(response.data);
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
      return response.data;
    }
  }

  // --- Timesheets ---

  async searchTimesheets(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post(
      '/timesheets/filter/details',
      this.publicFilter(filter)
    );
    return requireRecords(response.data);
  }

  // --- Invoices ---

  async searchInvoices(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post('/invoices/filter/details', this.publicFilter(filter));
    return requireRecords(response.data);
  }

  // --- Activities (used for polling triggers) ---

  async searchActivities(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post(
      '/activities/filter/details',
      this.publicFilter(filter)
    );
    return requireRecords(response.data);
  }

  // --- Portfolios ---

  async searchPortfolios(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post(
      '/portfolios/filter/details',
      this.publicFilter(filter)
    );
    return requireRecords(response.data);
  }

  // --- Teams ---

  async searchTeams(filter: FilterRequest): Promise<any[]> {
    this.requirePublicApi();
    let response = await this.http.post('/teams/filter/details', this.publicFilter(filter));
    return requireRecords(response.data);
  }
  async getProject(externalId: string): Promise<Record<string, unknown>> {
    this.requirePublicApi();
    let response = await this.http.get(
      `/projects/externalId/${encodeURIComponent(externalId)}`
    );
    return requireRecord(response.data);
  }

  async searchUsers(filter: FilterRequest): Promise<Record<string, unknown>[]> {
    this.requirePublicApi();
    let response = await this.http.post('/users/filter/details', this.publicFilter(filter));
    return requireRecords(response.data);
  }
}
