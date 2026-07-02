import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.ramp.com/developer/v1',
  sandbox: 'https://demo-api.ramp.com/developer/v1'
};

export interface PaginationParams {
  start?: string;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: {
    next?: string;
  };
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; environment?: string }) {
    let baseURL = BASE_URLS[config.environment || 'production'] || BASE_URLS.production;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Transactions ----

  async listTransactions(params?: {
    start?: string;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    merchantId?: string;
    state?: string;
    syncStatus?: string;
    entityId?: string;
    spendLimitId?: string;
    userId?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.fromDate) query.from_date = params.fromDate;
    if (params?.toDate) query.to_date = params.toDate;
    if (params?.merchantId) query.merchant_id = params.merchantId;
    if (params?.state) query.state = params.state;
    if (params?.syncStatus) query.sync_status = params.syncStatus;
    if (params?.entityId) query.entity_id = params.entityId;
    if (params?.spendLimitId) query.spend_limit_id = params.spendLimitId;
    if (params?.userId) query.user_id = params.userId;

    let response = await this.axios.get('/transactions', { params: query });
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<any> {
    let response = await this.axios.get(`/transactions/${transactionId}`);
    return response.data;
  }

  // ---- Users ----

  async listUsers(params?: {
    start?: string;
    pageSize?: number;
    departmentId?: string;
    locationId?: string;
    entityId?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.departmentId) query.department_id = params.departmentId;
    if (params?.locationId) query.location_id = params.locationId;
    if (params?.entityId) query.entity_id = params.entityId;

    let response = await this.axios.get('/users', { params: query });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async createUserInvite(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    departmentId?: string;
    locationId?: string;
    directManagerId?: string;
    isManager?: boolean;
    idempotencyKey: string;
  }): Promise<any> {
    let response = await this.axios.post('/users/deferred', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      department_id: data.departmentId,
      location_id: data.locationId,
      direct_manager_id: data.directManagerId,
      is_manager: data.isManager,
      idempotency_key: data.idempotencyKey
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    data: {
      departmentId?: string;
      locationId?: string;
      directManagerId?: string;
      role?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.departmentId !== undefined) body.department_id = data.departmentId;
    if (data.locationId !== undefined) body.location_id = data.locationId;
    if (data.directManagerId !== undefined) body.direct_manager_id = data.directManagerId;
    if (data.role !== undefined) body.role = data.role;

    let response = await this.axios.patch(`/users/${userId}`, body);
    return response.data;
  }

  async deactivateUser(userId: string): Promise<any> {
    let response = await this.axios.post(`/users/${userId}/deferred/deactivation`);
    return response.data;
  }

  async reactivateUser(userId: string): Promise<any> {
    let response = await this.axios.post(`/users/${userId}/deferred/reactivation`);
    return response.data;
  }

  // ---- Cards ----

  async listCards(params?: {
    start?: string;
    pageSize?: number;
    userId?: string;
    cardProgramId?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.userId) query.user_id = params.userId;
    if (params?.cardProgramId) query.card_program_id = params.cardProgramId;

    let response = await this.axios.get('/cards', { params: query });
    return response.data;
  }

  async getCard(cardId: string): Promise<any> {
    let response = await this.axios.get(`/cards/${cardId}`);
    return response.data;
  }

  async updateCard(
    cardId: string,
    data: {
      displayName?: string;
      userId?: string;
      spendingRestrictions?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.displayName !== undefined) body.display_name = data.displayName;
    if (data.userId !== undefined) body.user_id = data.userId;
    if (data.spendingRestrictions !== undefined)
      body.spending_restrictions = data.spendingRestrictions;

    let response = await this.axios.patch(`/cards/${cardId}`, body);
    return response.data;
  }

  async createVirtualCard(data: {
    displayName: string;
    userId: string;
    spendProgramId?: string;
    spendingRestrictions?: Record<string, any>;
    idempotencyKey: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      display_name: data.displayName,
      user_id: data.userId,
      idempotency_key: data.idempotencyKey
    };
    if (data.spendProgramId) body.spend_program_id = data.spendProgramId;
    if (data.spendingRestrictions) body.spending_restrictions = data.spendingRestrictions;

    let response = await this.axios.post('/cards/deferred/virtual', body);
    return response.data;
  }

  async createPhysicalCard(data: {
    displayName: string;
    userId: string;
    fulfillment: Record<string, any>;
    spendProgramId?: string;
    spendingRestrictions?: Record<string, any>;
    idempotencyKey: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      display_name: data.displayName,
      user_id: data.userId,
      fulfillment: data.fulfillment,
      idempotency_key: data.idempotencyKey
    };
    if (data.spendProgramId) body.spend_program_id = data.spendProgramId;
    if (data.spendingRestrictions) body.spending_restrictions = data.spendingRestrictions;

    let response = await this.axios.post('/cards/deferred/physical', body);
    return response.data;
  }

  async suspendCard(cardId: string, idempotencyKey: string): Promise<any> {
    let response = await this.axios.post(`/cards/${cardId}/deferred/suspension`, {
      idempotency_key: idempotencyKey
    });
    return response.data;
  }

  async unsuspendCard(cardId: string, idempotencyKey: string): Promise<any> {
    let response = await this.axios.post(`/cards/${cardId}/deferred/unsuspension`, {
      idempotency_key: idempotencyKey
    });
    return response.data;
  }

  async terminateCard(cardId: string, idempotencyKey: string): Promise<any> {
    let response = await this.axios.post(`/cards/${cardId}/deferred/termination`, {
      idempotency_key: idempotencyKey
    });
    return response.data;
  }

  async getDeferredTaskStatus(taskId: string): Promise<any> {
    let response = await this.axios.get(`/cards/deferred/status/${taskId}`);
    return response.data;
  }

  // ---- Bills ----

  async listBills(params?: {
    start?: string;
    pageSize?: number;
    status?: string;
    vendorId?: string;
    entityId?: string;
    syncStatus?: string;
    paymentStatus?: string;
    fromDueDate?: string;
    toDueDate?: string;
    invoiceNumber?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.status) query.status_summaries = params.status;
    if (params?.vendorId) query.vendor_id = params.vendorId;
    if (params?.entityId) query.entity_id = params.entityId;
    if (params?.syncStatus) query.sync_status = params.syncStatus;
    if (params?.paymentStatus) query.payment_status = params.paymentStatus;
    if (params?.fromDueDate) query.from_due_date = params.fromDueDate;
    if (params?.toDueDate) query.to_due_date = params.toDueDate;
    if (params?.invoiceNumber) query.invoice_number = params.invoiceNumber;

    let response = await this.axios.get('/bills', { params: query });
    return response.data;
  }

  async getBill(billId: string): Promise<any> {
    let response = await this.axios.get(`/bills/${billId}`);
    return response.data;
  }

  async createBill(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/bills', data);
    return response.data;
  }

  async updateBill(billId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/bills/${billId}`, data);
    return response.data;
  }

  async archiveBill(billId: string): Promise<any> {
    let response = await this.axios.delete(`/bills/${billId}`);
    return response.data;
  }

  // ---- Reimbursements ----

  async listReimbursements(params?: {
    start?: string;
    pageSize?: number;
    state?: string;
    syncStatus?: string;
    entityId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    direction?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.state) query.state = params.state;
    if (params?.syncStatus) query.sync_status = params.syncStatus;
    if (params?.entityId) query.entity_id = params.entityId;
    if (params?.userId) query.user_id = params.userId;
    if (params?.fromDate) query.from_date = params.fromDate;
    if (params?.toDate) query.to_date = params.toDate;
    if (params?.direction) query.direction = params.direction;

    let response = await this.axios.get('/reimbursements', { params: query });
    return response.data;
  }

  async getReimbursement(reimbursementId: string): Promise<any> {
    let response = await this.axios.get(`/reimbursements/${reimbursementId}`);
    return response.data;
  }

  // ---- Departments ----

  async listDepartments(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/departments', { params: query });
    return response.data;
  }

  async getDepartment(departmentId: string): Promise<any> {
    let response = await this.axios.get(`/departments/${departmentId}`);
    return response.data;
  }

  async createDepartment(data: { name: string }): Promise<any> {
    let response = await this.axios.post('/departments', data);
    return response.data;
  }

  async updateDepartment(
    departmentId: string,
    data: {
      name?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/departments/${departmentId}`, data);
    return response.data;
  }

  // ---- Locations ----

  async listLocations(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/locations', { params: query });
    return response.data;
  }

  async getLocation(locationId: string): Promise<any> {
    let response = await this.axios.get(`/locations/${locationId}`);
    return response.data;
  }

  // ---- Spend Programs ----

  async listSpendPrograms(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/spend-programs', { params: query });
    return response.data;
  }

  async getSpendProgram(spendProgramId: string): Promise<any> {
    let response = await this.axios.get(`/spend-programs/${spendProgramId}`);
    return response.data;
  }

  async createSpendProgram(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/spend-programs', data);
    return response.data;
  }

  async updateSpendProgram(spendProgramId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/spend-programs/${spendProgramId}`, data);
    return response.data;
  }

  // ---- Limits ----

  async listLimits(params?: {
    start?: string;
    pageSize?: number;
    spendProgramId?: string;
    userId?: string;
    entityId?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.spendProgramId) query.spend_program_id = params.spendProgramId;
    if (params?.userId) query.user_id = params.userId;
    if (params?.entityId) query.entity_id = params.entityId;

    let response = await this.axios.get('/limits', { params: query });
    return response.data;
  }

  async getLimit(limitId: string): Promise<any> {
    let response = await this.axios.get(`/limits/${limitId}`);
    return response.data;
  }

  async createLimit(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/limits/deferred', data);
    return response.data;
  }

  async updateLimit(limitId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/limits/${limitId}`, data);
    return response.data;
  }

  async terminateLimit(limitId: string, idempotencyKey: string): Promise<any> {
    let response = await this.axios.post(`/limits/${limitId}/deferred/termination`, {
      idempotency_key: idempotencyKey
    });
    return response.data;
  }

  // ---- Vendors ----

  async listVendors(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/vendors', { params: query });
    return response.data;
  }

  async getVendor(vendorId: string): Promise<any> {
    let response = await this.axios.get(`/vendors/${vendorId}`);
    return response.data;
  }

  // ---- Entities ----

  async listEntities(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/entities', { params: query });
    return response.data;
  }

  async getEntity(entityId: string): Promise<any> {
    let response = await this.axios.get(`/entities/${entityId}`);
    return response.data;
  }

  // ---- Business ----

  async getBusiness(): Promise<any> {
    let response = await this.axios.get('/business');
    return response.data;
  }

  async getBusinessBalance(): Promise<any> {
    let response = await this.axios.get('/business/balance');
    return response.data;
  }

  // ---- Merchants ----

  async listMerchants(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/merchants', { params: query });
    return response.data;
  }

  async getMerchant(merchantId: string): Promise<any> {
    let response = await this.axios.get(`/merchants/${merchantId}`);
    return response.data;
  }

  // ---- Receipts ----

  async listReceipts(params?: {
    start?: string;
    pageSize?: number;
    transactionId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.transactionId) query.transaction_id = params.transactionId;
    if (params?.userId) query.user_id = params.userId;
    if (params?.fromDate) query.from_date = params.fromDate;
    if (params?.toDate) query.to_date = params.toDate;

    let response = await this.axios.get('/receipts', { params: query });
    return response.data;
  }

  // ---- Transfers ----

  async listTransfers(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/transfers', { params: query });
    return response.data;
  }

  // ---- Statements ----

  async listStatements(params?: {
    start?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.start) query.start = params.start;
    if (params?.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/statements', { params: query });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { url: string; eventTypes: string[] }): Promise<any> {
    let response = await this.axios.post('/webhooks', {
      url: data.url,
      event_types: data.eventTypes
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ---- Accounting Syncs ----

  async reportSyncResults(data: {
    idempotencyKey: string;
    syncResults: Record<string, any>[];
  }): Promise<any> {
    let response = await this.axios.post('/accounting/syncs', {
      idempotency_key: data.idempotencyKey,
      sync_results: data.syncResults
    });
    return response.data;
  }
}
