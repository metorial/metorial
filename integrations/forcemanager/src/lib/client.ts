import crypto from 'crypto';
import { createAxios } from 'slates';

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

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private authConfig: AuthConfig;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
    this.axios = createAxios({
      baseURL: 'https://api.forcemanager.com/api/v4',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.request.use(config => {
      config.headers.set('X-FM-API-Version', '4');

      if (this.authConfig.authMethod === 'hmac') {
        let timestamp = Math.floor(Date.now() / 1000).toString();
        let signature = crypto
          .createHash('sha1')
          .update(timestamp + this.authConfig.publicKey + this.authConfig.privateKey)
          .digest('hex');

        config.headers.set('X-FM-PublicKey', this.authConfig.publicKey);
        config.headers.set('X-FM-UnixTimestamp', timestamp);
        config.headers.set('X-FM-Signature', signature);
      } else {
        config.headers.set('X-Session-Key', this.authConfig.token);
      }

      return config;
    });
  }

  // ---- Generic CRUD ----

  async list<T = any>(
    entity: string,
    params?: Record<string, any>,
    page?: number
  ): Promise<PaginatedResult<T>> {
    let headers: Record<string, string> = {};
    if (page !== undefined) {
      headers['X-FM-Page'] = page.toString();
    }

    let response = await this.axios.get(`/${entity}`, { params, headers });

    let nextPage = response.headers['x-fm-next-page'];
    let entityCount = response.headers['x-fm-entity-count'];

    return {
      records: Array.isArray(response.data) ? response.data : [],
      nextPage: nextPage !== undefined ? Number.parseInt(nextPage, 10) : null,
      entityCount: entityCount ? Number.parseInt(entityCount, 10) : 0
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
    return this.list('companies', params, page);
  }

  async getCompany(companyId: number | string) {
    return this.getById('companies', companyId);
  }

  async createCompany(data: Record<string, any>) {
    return this.create('companies', data);
  }

  async updateCompany(companyId: number | string, data: Record<string, any>) {
    return this.update('companies', companyId, data);
  }

  async deleteCompany(companyId: number | string) {
    return this.remove('companies', companyId);
  }

  // ---- Contacts ----

  async listContacts(params?: Record<string, any>, page?: number) {
    return this.list('contacts', params, page);
  }

  async getContact(contactId: number | string) {
    return this.getById('contacts', contactId);
  }

  async createContact(data: Record<string, any>) {
    return this.create('contacts', data);
  }

  async updateContact(contactId: number | string, data: Record<string, any>) {
    return this.update('contacts', contactId, data);
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
    return this.create('activities', data);
  }

  async updateActivity(activityId: number | string, data: Record<string, any>) {
    return this.update('activities', activityId, data);
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
    return this.create('opportunities', data);
  }

  async updateOpportunity(opportunityId: number | string, data: Record<string, any>) {
    return this.update('opportunities', opportunityId, data);
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
    return this.list('salesorder', params, page);
  }

  async getSalesOrder(salesOrderId: number | string) {
    return this.getById('salesorder', salesOrderId);
  }

  async createSalesOrder(data: Record<string, any>) {
    return this.create('salesorder', data);
  }

  async updateSalesOrder(salesOrderId: number | string, data: Record<string, any>) {
    return this.update('salesorder', salesOrderId, data);
  }

  async deleteSalesOrder(salesOrderId: number | string) {
    return this.remove('salesorder', salesOrderId);
  }

  // ---- Sales Order Lines ----

  async listSalesOrderLines(params?: Record<string, any>, page?: number) {
    return this.list('salesorderline', params, page);
  }

  async getSalesOrderLine(lineId: number | string) {
    return this.getById('salesorderline', lineId);
  }

  async createSalesOrderLine(data: Record<string, any>) {
    return this.create('salesorderline', data);
  }

  async updateSalesOrderLine(lineId: number | string, data: Record<string, any>) {
    return this.update('salesorderline', lineId, data);
  }

  async deleteSalesOrderLine(lineId: number | string) {
    return this.remove('salesorderline', lineId);
  }

  // ---- Calendar ----

  async listCalendarEntries(params?: Record<string, any>, page?: number) {
    return this.list('calendars', params, page);
  }

  async getCalendarEntry(entryId: number | string) {
    return this.getById('calendars', entryId);
  }

  async createCalendarEntry(data: Record<string, any>) {
    return this.create('calendars', data);
  }

  async updateCalendarEntry(entryId: number | string, data: Record<string, any>) {
    return this.update('calendars', entryId, data);
  }

  async deleteCalendarEntry(entryId: number | string) {
    return this.remove('calendars', entryId);
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
    let response = await this.axios.get('/internalid', {
      params: { type: entityType, externalid: externalId }
    });
    return response.data;
  }

  // ---- List of Values ----

  async getValues(resourceName: string, query?: string): Promise<any[]> {
    let params: Record<string, any> = { resourcename: resourceName };
    if (query) {
      params.q = query;
    }
    let response = await this.axios.get('/values', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getValuesInfo(): Promise<any[]> {
    let response = await this.axios.get('/values/info');
    return Array.isArray(response.data) ? response.data : [];
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
