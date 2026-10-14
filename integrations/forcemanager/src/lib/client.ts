import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface AuthConfig {
  token: string;
  publicKey: string;
  privateKey: string;
  authMethod: 'hmac' | 'session_key';
}

export interface PaginatedResult<T> {
  records: T[];
  nextPage: number | null;
  entityCount: number;
}

let activityPayload = (data: Record<string, any>) => {
  let {
    activityDateTime,
    activityTypeId,
    isCheckin,
    geocodeLatitude,
    geocodeLongitude,
    ...fields
  } = data;
  return {
    ...fields,
    ...(activityDateTime !== undefined ? { date: activityDateTime } : {}),
    ...(activityTypeId !== undefined ? { typeId: activityTypeId } : {}),
    ...(isCheckin !== undefined ? { checkin: isCheckin } : {}),
    ...(geocodeLatitude !== undefined ? { latitude: geocodeLatitude } : {}),
    ...(geocodeLongitude !== undefined ? { longitude: geocodeLongitude } : {})
  };
};

let calendarPayload = (data: Record<string, any>) => {
  let { ownerId, activityTypeId, isTask, notificationMinutes, ...fields } = data;
  return {
    ...fields,
    ...(ownerId !== undefined ? { salesRepId: ownerId } : {}),
    ...(activityTypeId !== undefined ? { typeId: activityTypeId } : {}),
    ...(isTask !== undefined ? { task: isTask } : {}),
    ...(notificationMinutes !== undefined ? { reminder: notificationMinutes } : {})
  };
};

let contactPayload = (data: Record<string, any>) => {
  let { gender, genderId, useCompanyAddress, ...fields } = data;
  let genderValue = genderId;
  if (genderValue === undefined && gender !== undefined) {
    let genders: Record<string, number> = { male: 0, female: 1, '0': 0, '1': 1 };
    genderValue = genders[String(gender).toLowerCase()];
    if (genderValue === undefined) {
      throw createApiServiceError(
        'Gender must be male, female, 0, or 1. Use genderId for a numeric gender value.'
      );
    }
  }
  return {
    ...fields,
    ...(genderValue !== undefined ? { gender: genderValue } : {}),
    ...(useCompanyAddress !== undefined ? { UseCompanyAddress: useCompanyAddress } : {})
  };
};

let opportunityPayload = (data: Record<string, any>) => {
  let { typeId, salesProbability, ...fields } = data;
  if (
    salesProbability !== undefined &&
    (!Number.isInteger(salesProbability) ||
      salesProbability < 0 ||
      salesProbability > 100 ||
      salesProbability % 10 !== 0)
  ) {
    throw createApiServiceError(
      'Win probability must be a percentage from 0 to 100 in increments of 10.'
    );
  }
  return {
    ...fields,
    ...(typeId !== undefined ? { type_id: typeId } : {}),
    ...(salesProbability !== undefined ? { salesProbability: salesProbability / 10 } : {})
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private authConfig: AuthConfig;

  static async login(publicKey: string, privateKey: string): Promise<string> {
    let axios = createAuthenticatedAxios({
      baseURL: 'https://api.forcemanager.com/api/v4',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ForceManager',
          reason: 'forcemanager_login_error',
          operation: 'login'
        })
    });
    let response = await axios.post('/login', { username: publicKey, password: privateKey });
    let token = response.data?.token;
    if (typeof token !== 'string' || !token.trim()) {
      throw createApiServiceError(
        'ForceManager login did not return a session token. Check your API keys.'
      );
    }
    return token;
  }

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.forcemanager.com/api/v4',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ForceManager',
          reason: 'forcemanager_api_error'
        }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.request.use(async config => {
      if (!this.authConfig.token) {
        this.authConfig = {
          ...this.authConfig,
          token: await Client.login(this.authConfig.publicKey, this.authConfig.privateKey)
        };
      }
      config.headers.set('X-Session-Key', this.authConfig.token);
      return config;
    });
  }

  // ---- Generic CRUD ----

  async list<T = any>(
    entity: string,
    params?: Record<string, any>,
    page?: number
  ): Promise<PaginatedResult<T>> {
    let currentPage = page ?? 0;
    if (!Number.isInteger(currentPage) || currentPage < 0) {
      throw createApiServiceError('Page must be a non-negative integer.');
    }
    let { q, count, ...filters } = params ?? {};
    let conditions = Object.entries(filters).map(([key, value]) =>
      typeof value === 'string'
        ? `${key} LIKE '%${value.replaceAll("'", "''")}%'`
        : `${key}=${value}`
    );
    if (q) conditions.unshift(`(${q})`);
    let response = await this.axios.get(`/${entity}`, {
      params: {
        page: currentPage,
        ...(conditions.length ? { where: conditions.join(' AND ') } : {})
      },
      headers: count !== undefined ? { Count: String(count) } : undefined
    });
    let records: T[] = Array.isArray(response.data) ? response.data : [];

    return {
      records,
      nextPage: records.length ? currentPage + 1 : null,
      entityCount: records.length
    };
  }

  async getById<T = any>(entity: string, id: number | string): Promise<T> {
    let response = await this.axios.get(`/${entity}/${id}`);
    return response.data;
  }

  async create<T = any>(entity: string, data: Record<string, any>): Promise<T> {
    let response = await this.axios.post(`/${entity}`, data);
    return response.data;
  }

  async update<T = any>(
    entity: string,
    id: number | string,
    data: Record<string, any>
  ): Promise<T> {
    let response = await this.axios.put(`/${entity}/${id}`, data);
    return response.data;
  }

  async remove(entity: string, id: number | string): Promise<void> {
    await this.axios.delete(`/${entity}/${id}`);
  }

  // ---- Accounts (Companies) ----

  async listCompanies(params?: Record<string, any>, page?: number) {
    return this.list('accounts', params, page);
  }

  async getCompany(companyId: number | string) {
    return this.getById('accounts', companyId);
  }

  async createCompany(data: Record<string, any>) {
    return this.create('accounts', data);
  }

  async updateCompany(companyId: number | string, data: Record<string, any>) {
    return this.update('accounts', companyId, data);
  }

  async deleteCompany(companyId: number | string) {
    return this.remove('accounts', companyId);
  }

  // ---- Contacts ----

  async listContacts(params?: Record<string, any>, page?: number) {
    return this.list('contacts', params, page);
  }

  async getContact(contactId: number | string) {
    return this.getById('contacts', contactId);
  }

  async createContact(data: Record<string, any>) {
    return this.create('contacts', contactPayload(data));
  }

  async updateContact(contactId: number | string, data: Record<string, any>) {
    return this.update('contacts', contactId, contactPayload(data));
  }

  async deleteContact(contactId: number | string) {
    return this.remove('contacts', contactId);
  }

  // ---- Activities ----

  async listActivities(params?: Record<string, any>, page?: number) {
    return this.list('activities', params, page);
  }

  async getActivity(activityId: number | string) {
    return this.getById('activities', activityId);
  }

  async createActivity(data: Record<string, any>) {
    return this.create('activities', activityPayload(data));
  }

  async updateActivity(activityId: number | string, data: Record<string, any>) {
    return this.update('activities', activityId, activityPayload(data));
  }

  async deleteActivity(activityId: number | string) {
    return this.remove('activities', activityId);
  }

  // ---- Opportunities ----

  async listOpportunities(params?: Record<string, any>, page?: number) {
    return this.list('opportunities', params, page);
  }

  async getOpportunity(opportunityId: number | string) {
    return this.getById('opportunities', opportunityId);
  }

  async createOpportunity(data: Record<string, any>) {
    return this.create('opportunities', opportunityPayload(data));
  }

  async updateOpportunity(opportunityId: number | string, data: Record<string, any>) {
    return this.update('opportunities', opportunityId, opportunityPayload(data));
  }

  async deleteOpportunity(opportunityId: number | string) {
    return this.remove('opportunities', opportunityId);
  }

  // ---- Products ----

  async listProducts(params?: Record<string, any>, page?: number) {
    return this.list('products', params, page);
  }

  async getProduct(productId: number | string) {
    return this.getById('products', productId);
  }

  async createProduct(data: Record<string, any>) {
    return this.create('products', data);
  }

  async updateProduct(productId: number | string, data: Record<string, any>) {
    return this.update('products', productId, data);
  }

  async deleteProduct(productId: number | string) {
    return this.remove('products', productId);
  }

  // ---- Sales Orders ----

  async listSalesOrders(params?: Record<string, any>, page?: number) {
    return this.list('salesorders', params, page);
  }

  async getSalesOrder(salesOrderId: number | string) {
    return this.getById('salesorders', salesOrderId);
  }

  async createSalesOrder(data: Record<string, any>) {
    let { salesForecastDate, ...fields } = data;
    return this.create('salesorders', {
      ...fields,
      ...(salesForecastDate !== undefined ? { salesForcecastDate: salesForecastDate } : {})
    });
  }

  async updateSalesOrder(salesOrderId: number | string, data: Record<string, any>) {
    let { salesForecastDate, ...fields } = data;
    return this.update('salesorders', salesOrderId, {
      ...fields,
      ...(salesForecastDate !== undefined ? { salesForcecastDate: salesForecastDate } : {})
    });
  }

  async deleteSalesOrder(salesOrderId: number | string) {
    return this.remove('salesorders', salesOrderId);
  }

  // ---- Sales Order Lines ----

  async listSalesOrderLines(params?: Record<string, any>, page?: number) {
    return this.list('salesordersLines', params, page);
  }

  async getSalesOrderLine(lineId: number | string) {
    return this.getById('salesordersLines', lineId);
  }

  async createSalesOrderLine(data: Record<string, any>) {
    let { salesOrderId, ...fields } = data;
    return this.create('salesOrdersLines', { ...fields, salesorderId: salesOrderId });
  }

  async updateSalesOrderLine(lineId: number | string, data: Record<string, any>) {
    let { salesOrderId, ...fields } = data;
    return this.update('salesordersLines', lineId, {
      ...fields,
      ...(salesOrderId !== undefined ? { salesorderId: salesOrderId } : {})
    });
  }

  async deleteSalesOrderLine(lineId: number | string) {
    return this.remove('salesordersLines', lineId);
  }

  // ---- Calendar ----

  async listCalendarEntries(params?: Record<string, any>, page?: number) {
    return this.list('calendar', params, page);
  }

  async getCalendarEntry(entryId: number | string) {
    return this.getById('calendar', entryId);
  }

  async createCalendarEntry(data: Record<string, any>) {
    return this.create('calendar', calendarPayload(data));
  }

  async updateCalendarEntry(entryId: number | string, data: Record<string, any>) {
    return this.update('calendar', entryId, calendarPayload(data));
  }

  async deleteCalendarEntry(entryId: number | string) {
    return this.remove('calendar', entryId);
  }

  // ---- Users ----

  async listUsers(params?: Record<string, any>, page?: number) {
    return this.list('users', params, page);
  }

  async getUser(userId: number | string) {
    return this.getById('users', userId);
  }

  // ---- External ID Mapping ----

  async getInternalId(entityType: string, externalId: string): Promise<any> {
    let entities: Record<string, string> = {
      company: 'accounts',
      companies: 'accounts',
      account: 'accounts',
      accounts: 'accounts',
      contact: 'contacts',
      contacts: 'contacts',
      activity: 'activities',
      activities: 'activities',
      opportunity: 'opportunities',
      opportunities: 'opportunities',
      product: 'products',
      products: 'products',
      salesorder: 'salesorders',
      salesorders: 'salesorders',
      user: 'users',
      users: 'users',
      calendar: 'calendar',
      calendars: 'calendar',
      salesorderline: 'salesordersLines',
      salesorderslines: 'salesordersLines'
    };
    let entity = entities[entityType.toLowerCase()];
    if (!entity) {
      throw createApiServiceError(
        'Unsupported entity type. Use account, contact, activity, opportunity, product, salesorder, user, calendar, or salesorderline.'
      );
    }
    let result = await this.list(entity, {
      q: `extId='${externalId.replaceAll("'", "''")}'`,
      count: 1
    });
    return result.records[0] ?? null;
  }

  // ---- List of Values ----

  async getValues(resourceName: string, query?: string, page?: number) {
    let resources: Record<string, string> = {
      AccountType: 'accountTypes',
      AccountStatus: 'accountStatuses',
      ActivityType: 'activityTypes',
      OpportunityStatus: 'opportunityStatuses',
      OpportunityType: 'opportunityTypes',
      ContactType: 'contactTypes',
      Branch: 'branches',
      Segment: 'accountSegments',
      Country: 'countries',
      Currency: 'currencies',
      Timezone: 'timezones',
      ProductCategory: 'productCategories',
      ProductFamily: 'productFamilies',
      SalesOrderStatus: 'salesorderStatuses',
      Rate: 'rates'
    };
    let endpoint =
      resources[resourceName] ??
      Object.values(resources).find(value => value === resourceName);
    return this.list(
      endpoint ?? `list/${encodeURIComponent(resourceName)}`,
      { q: query },
      page
    );
  }

  async getValuesInfo(page?: number) {
    return this.list('list', undefined, page);
  }

  // ---- Querying with date filter (for polling) ----

  async listModifiedSince(
    entity: string,
    since: string,
    page?: number
  ): Promise<PaginatedResult<any>> {
    let query = `dateUpdated>='${since}'`;
    return this.list(entity, { q: query }, page);
  }
}
