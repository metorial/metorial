import { createAxios } from 'slates';
import type {
  PaginationResponse,
  SimlaCorporateCustomer,
  SimlaCustomer,
  SimlaHistoryEntry,
  SimlaNote,
  SimlaOrder,
  SimlaPayment,
  SimlaProduct,
  SimlaSegment,
  SimlaTask,
  SimlaUser
} from './types';

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private site?: string;

  constructor(config: { token: string; subdomain: string; site?: string }) {
    this.site = config.site;
    this.axios = createAxios({
      baseURL: `https://${config.subdomain}.simla.com/api/v5`,
      headers: {
        'X-API-KEY': config.token
      }
    });
  }

  private addSiteParam(params: Record<string, any>): Record<string, any> {
    if (this.site) {
      params.site = this.site;
    }
    return params;
  }

  // ========== Customers ==========

  async getCustomers(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    customers: SimlaCustomer[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/customers', { params });
    return {
      customers: response.data.customers || [],
      pagination: response.data.pagination
    };
  }

  async getCustomer(
    id: string,
    by: 'id' | 'externalId' = 'externalId'
  ): Promise<SimlaCustomer> {
    let params: Record<string, any> = { by };
    this.addSiteParam(params);
    let response = await this.axios.get(`/customers/${encodeURIComponent(id)}`, { params });
    return response.data.customer;
  }

  async createCustomer(customer: SimlaCustomer): Promise<{ customerId: number }> {
    let params = new URLSearchParams();
    params.append('customer', JSON.stringify(customer));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/customers/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { customerId: response.data.id };
  }

  async editCustomer(
    id: string,
    customer: SimlaCustomer,
    by: 'id' | 'externalId' = 'externalId'
  ): Promise<{ customerId: number }> {
    let params = new URLSearchParams();
    params.append('customer', JSON.stringify(customer));
    params.append('by', by);
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post(`/customers/${encodeURIComponent(id)}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { customerId: response.data.id };
  }

  async combineCustomers(
    customers: Array<{ id: number }>,
    resultCustomerId: number
  ): Promise<void> {
    let params = new URLSearchParams();
    params.append('customers', JSON.stringify(customers));
    params.append('resultCustomer', JSON.stringify({ id: resultCustomerId }));
    await this.axios.post('/customers/combine', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async getCustomersHistory(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    history: SimlaHistoryEntry[];
    pagination: PaginationResponse;
    generatedAt: string;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/customers/history', { params });
    return {
      history: response.data.history || [],
      pagination: response.data.pagination,
      generatedAt: response.data.generatedAt
    };
  }

  // ========== Customer Notes ==========

  async getCustomerNotes(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    notes: SimlaNote[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/customers/notes', { params });
    return {
      notes: response.data.notes || [],
      pagination: response.data.pagination
    };
  }

  async createCustomerNote(note: {
    customer: { id?: number; externalId?: string; site?: string };
    managerId?: number;
    text: string;
  }): Promise<{ noteId: number }> {
    let params = new URLSearchParams();
    params.append('note', JSON.stringify(note));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/customers/notes/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { noteId: response.data.id };
  }

  async deleteCustomerNote(noteId: number): Promise<void> {
    let params = new URLSearchParams();
    params.append('id', String(noteId));
    await this.axios.post(`/customers/notes/${noteId}/delete`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Corporate Customers ==========

  async getCorporateCustomers(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    customersCorporate: SimlaCorporateCustomer[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/customers-corporate', { params });
    return {
      customersCorporate: response.data.customersCorporate || [],
      pagination: response.data.pagination
    };
  }

  async getCorporateCustomer(
    id: string,
    by: 'id' | 'externalId' = 'externalId'
  ): Promise<SimlaCorporateCustomer> {
    let params: Record<string, any> = { by };
    this.addSiteParam(params);
    let response = await this.axios.get(`/customers-corporate/${encodeURIComponent(id)}`, {
      params
    });
    return response.data.customerCorporate;
  }

  async createCorporateCustomer(
    customer: SimlaCorporateCustomer
  ): Promise<{ customerId: number }> {
    let params = new URLSearchParams();
    params.append('customerCorporate', JSON.stringify(customer));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/customers-corporate/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { customerId: response.data.id };
  }

  async editCorporateCustomer(
    id: string,
    customer: SimlaCorporateCustomer,
    by: 'id' | 'externalId' = 'externalId'
  ): Promise<{ customerId: number }> {
    let params = new URLSearchParams();
    params.append('customerCorporate', JSON.stringify(customer));
    params.append('by', by);
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post(
      `/customers-corporate/${encodeURIComponent(id)}/edit`,
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return { customerId: response.data.id };
  }

  // ========== Orders ==========

  async getOrders(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    orders: SimlaOrder[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/orders', { params });
    return {
      orders: response.data.orders || [],
      pagination: response.data.pagination
    };
  }

  async getOrder(id: string, by: 'id' | 'externalId' = 'externalId'): Promise<SimlaOrder> {
    let params: Record<string, any> = { by };
    this.addSiteParam(params);
    let response = await this.axios.get(`/orders/${encodeURIComponent(id)}`, { params });
    return response.data.order;
  }

  async createOrder(order: SimlaOrder): Promise<{ orderId: number }> {
    let params = new URLSearchParams();
    params.append('order', JSON.stringify(order));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/orders/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { orderId: response.data.id };
  }

  async editOrder(
    id: string,
    order: SimlaOrder,
    by: 'id' | 'externalId' = 'externalId'
  ): Promise<{ orderId: number }> {
    let params = new URLSearchParams();
    params.append('order', JSON.stringify(order));
    params.append('by', by);
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post(`/orders/${encodeURIComponent(id)}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { orderId: response.data.id };
  }

  async combineOrders(
    technique: 'ours' | 'summ' | 'theirs',
    order: { id: number },
    resultOrder: { id: number }
  ): Promise<void> {
    let params = new URLSearchParams();
    params.append('technique', technique);
    params.append('order', JSON.stringify(order));
    params.append('resultOrder', JSON.stringify(resultOrder));
    await this.axios.post('/orders/combine', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async getOrdersHistory(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    history: SimlaHistoryEntry[];
    pagination: PaginationResponse;
    generatedAt: string;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/orders/history', { params });
    return {
      history: response.data.history || [],
      pagination: response.data.pagination,
      generatedAt: response.data.generatedAt
    };
  }

  // ========== Order Payments ==========

  async createOrderPayment(payment: SimlaPayment): Promise<{ paymentId: number }> {
    let params = new URLSearchParams();
    params.append('payment', JSON.stringify(payment));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/orders/payments/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { paymentId: response.data.id };
  }

  async editOrderPayment(
    id: number,
    payment: SimlaPayment,
    by: 'id' | 'externalId' = 'id'
  ): Promise<{ paymentId: number }> {
    let params = new URLSearchParams();
    params.append('payment', JSON.stringify(payment));
    params.append('by', by);
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post(`/orders/payments/${id}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { paymentId: response.data.id };
  }

  async deleteOrderPayment(id: number): Promise<void> {
    await this.axios.post(`/orders/payments/${id}/delete`, new URLSearchParams(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Products ==========

  async getProducts(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    products: SimlaProduct[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/store/products', { params });
    return {
      products: response.data.products || [],
      pagination: response.data.pagination
    };
  }

  async getProductGroups(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    productGroup: Array<{
      id?: number;
      parentId?: number;
      name?: string;
      externalId?: string;
      active?: boolean;
    }>;
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/store/product-groups', { params });
    return {
      productGroup: response.data.productGroup || [],
      pagination: response.data.pagination
    };
  }

  // ========== Tasks ==========

  async getTasks(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    tasks: SimlaTask[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/tasks', { params });
    return {
      tasks: response.data.tasks || [],
      pagination: response.data.pagination
    };
  }

  async getTask(id: number): Promise<SimlaTask> {
    let response = await this.axios.get(`/tasks/${id}`);
    return response.data.task;
  }

  async createTask(task: SimlaTask): Promise<{ taskId: number }> {
    let params = new URLSearchParams();
    params.append('task', JSON.stringify(task));
    if (this.site) params.append('site', this.site);
    let response = await this.axios.post('/tasks/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { taskId: response.data.id };
  }

  async editTask(id: number, task: SimlaTask): Promise<void> {
    let params = new URLSearchParams();
    params.append('task', JSON.stringify(task));
    if (this.site) params.append('site', this.site);
    await this.axios.post(`/tasks/${id}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Users ==========

  async getUsers(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    users: SimlaUser[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/users', { params });
    return {
      users: response.data.users || [],
      pagination: response.data.pagination
    };
  }

  async getUser(id: number): Promise<SimlaUser> {
    let response = await this.axios.get(`/users/${id}`);
    return response.data.user;
  }

  async setUserStatus(id: number, status: string): Promise<void> {
    let params = new URLSearchParams();
    params.append('status', status);
    await this.axios.post(`/users/${id}/status`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Segments ==========

  async getSegments(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    segments: SimlaSegment[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/segments', { params });
    return {
      segments: response.data.segments || [],
      pagination: response.data.pagination
    };
  }

  // ========== Reference Data ==========

  async getStatuses(): Promise<{ statuses: Record<string, any> }> {
    let response = await this.axios.get('/reference/statuses');
    return { statuses: response.data.statuses };
  }

  async getStatusGroups(): Promise<{ statusGroups: Record<string, any> }> {
    let response = await this.axios.get('/reference/status-groups');
    return { statusGroups: response.data.statusGroups };
  }

  async getPaymentTypes(): Promise<{ paymentTypes: Record<string, any> }> {
    let response = await this.axios.get('/reference/payment-types');
    return { paymentTypes: response.data.paymentTypes };
  }

  async getDeliveryTypes(): Promise<{ deliveryTypes: Record<string, any> }> {
    let response = await this.axios.get('/reference/delivery-types');
    return { deliveryTypes: response.data.deliveryTypes };
  }

  async getOrderMethods(): Promise<{ orderMethods: Record<string, any> }> {
    let response = await this.axios.get('/reference/order-methods');
    return { orderMethods: response.data.orderMethods };
  }

  async getOrderTypes(): Promise<{ orderTypes: Record<string, any> }> {
    let response = await this.axios.get('/reference/order-types');
    return { orderTypes: response.data.orderTypes };
  }

  async getSites(): Promise<{ sites: Record<string, any> }> {
    let response = await this.axios.get('/reference/sites');
    return { sites: response.data.sites };
  }

  async getStores(): Promise<{ stores: Record<string, any> }> {
    let response = await this.axios.get('/reference/stores');
    return { stores: response.data.stores };
  }

  async getUnits(): Promise<{ units: Record<string, any> }> {
    let response = await this.axios.get('/reference/units');
    return { units: response.data.units };
  }

  async getCountries(): Promise<{ countriesIso: string[] }> {
    let response = await this.axios.get('/reference/countries');
    return { countriesIso: response.data.countriesIso || [] };
  }

  async getDeliveryServices(): Promise<{ deliveryServices: Record<string, any> }> {
    let response = await this.axios.get('/reference/delivery-services');
    return { deliveryServices: response.data.deliveryServices };
  }

  async getPaymentStatuses(): Promise<{ paymentStatuses: Record<string, any> }> {
    let response = await this.axios.get('/reference/payment-statuses');
    return { paymentStatuses: response.data.paymentStatuses };
  }

  async getProductStatuses(): Promise<{ productStatuses: Record<string, any> }> {
    let response = await this.axios.get('/reference/product-statuses');
    return { productStatuses: response.data.productStatuses };
  }

  // ========== Custom Fields ==========

  async getCustomFields(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    customFields: Record<string, any>[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/custom-fields', { params });
    return {
      customFields: response.data.customFields || [],
      pagination: response.data.pagination
    };
  }

  async getCustomField(entity: string, code: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/custom-fields/${entity}/${code}`);
    return response.data.customField;
  }

  async createCustomField(
    entity: string,
    customField: Record<string, any>
  ): Promise<{ code: string }> {
    let params = new URLSearchParams();
    params.append('customField', JSON.stringify(customField));
    let response = await this.axios.post(`/custom-fields/${entity}/create`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { code: response.data.code };
  }

  async editCustomField(
    entity: string,
    code: string,
    customField: Record<string, any>
  ): Promise<void> {
    let params = new URLSearchParams();
    params.append('customField', JSON.stringify(customField));
    await this.axios.post(`/custom-fields/${entity}/${code}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Custom Dictionaries ==========

  async getCustomDictionaries(
    filter?: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<{
    customDictionaries: Record<string, any>[];
    pagination: PaginationResponse;
  }> {
    let params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    let response = await this.axios.get('/custom-fields/dictionaries', { params });
    return {
      customDictionaries: response.data.customDictionaries || [],
      pagination: response.data.pagination
    };
  }

  async getCustomDictionary(code: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/custom-fields/dictionaries/${code}`);
    return response.data.customDictionary;
  }

  async createCustomDictionary(dictionary: Record<string, any>): Promise<{ code: string }> {
    let params = new URLSearchParams();
    params.append('customDictionary', JSON.stringify(dictionary));
    let response = await this.axios.post('/custom-fields/dictionaries/create', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { code: response.data.code };
  }

  async editCustomDictionary(code: string, dictionary: Record<string, any>): Promise<void> {
    let params = new URLSearchParams();
    params.append('customDictionary', JSON.stringify(dictionary));
    await this.axios.post(`/custom-fields/dictionaries/${code}/edit`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== API Credentials ==========

  async getCredentials(): Promise<{ credentials: string[]; siteAccess: string[] }> {
    let response = await this.axios.get('/credentials');
    return {
      credentials: response.data.credentials || [],
      siteAccess: response.data.siteAccess || []
    };
  }
}
