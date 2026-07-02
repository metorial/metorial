import { createAxios } from 'slates';

let BASE_URL = 'https://platform.brexapis.com';

export interface PaginatedResponse<T> {
  next_cursor: string | null;
  items: T[];
}

export interface Money {
  amount: number;
  currency: string | null;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──

  async listUsers(params?: { cursor?: string; limit?: number; email?: string }) {
    let response = await this.axios.get('/v2/users', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/v2/users/${userId}`);
    return response.data;
  }

  async getUserMe() {
    let response = await this.axios.get('/v2/users/me');
    return response.data;
  }

  async inviteUser(userData: {
    first_name: string;
    last_name: string;
    email: string;
    manager_id?: string;
    department_id?: string;
    location_id?: string;
  }) {
    let response = await this.axios.post('/v2/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Record<string, any>) {
    let response = await this.axios.put(`/v2/users/${userId}`, userData);
    return response.data;
  }

  async getUserLimit(userId: string) {
    let response = await this.axios.get(`/v2/users/${userId}/limit`);
    return response.data;
  }

  async setUserLimit(userId: string, limitData: { monthly_limit?: Money | null }) {
    let response = await this.axios.post(`/v2/users/${userId}/limit`, limitData);
    return response.data;
  }

  // ── Cards ──

  async listCards(params?: { cursor?: string; limit?: number; user_id?: string }) {
    let response = await this.axios.get('/v2/cards', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getCard(cardId: string) {
    let response = await this.axios.get(`/v2/cards/${cardId}`);
    return response.data;
  }

  async createCard(cardData: Record<string, any>) {
    let response = await this.axios.post('/v2/cards', cardData);
    return response.data;
  }

  async updateCard(cardId: string, cardData: Record<string, any>) {
    let response = await this.axios.put(`/v2/cards/${cardId}`, cardData);
    return response.data;
  }

  async lockCard(cardId: string, reason?: string) {
    let response = await this.axios.post(`/v2/cards/${cardId}/lock`, { reason });
    return response.data;
  }

  async unlockCard(cardId: string) {
    let response = await this.axios.post(`/v2/cards/${cardId}/unlock`, {});
    return response.data;
  }

  async terminateCard(cardId: string, reason?: string) {
    let response = await this.axios.post(`/v2/cards/${cardId}/terminate`, { reason });
    return response.data;
  }

  // ── Departments ──

  async listDepartments(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v2/departments', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getDepartment(departmentId: string) {
    let response = await this.axios.get(`/v2/departments/${departmentId}`);
    return response.data;
  }

  // ── Locations ──

  async listLocations(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v2/locations', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getLocation(locationId: string) {
    let response = await this.axios.get(`/v2/locations/${locationId}`);
    return response.data;
  }

  // ── Expenses ──

  async listCardExpenses(params?: {
    cursor?: string;
    limit?: number;
    expand?: string[];
    updated_at_start?: string;
  }) {
    let queryParams: Record<string, any> = { ...params };
    if (params?.expand) {
      queryParams['expand[]'] = params.expand;
      queryParams.expand = undefined;
    }
    let response = await this.axios.get('/v1/expenses/card', { params: queryParams });
    return response.data as PaginatedResponse<any>;
  }

  async getCardExpense(expenseId: string, expand?: string[]) {
    let params: Record<string, any> = {};
    if (expand) {
      params['expand[]'] = expand;
    }
    let response = await this.axios.get(`/v1/expenses/card/${expenseId}`, { params });
    return response.data;
  }

  async updateCardExpense(expenseId: string, expenseData: Record<string, any>) {
    let response = await this.axios.put(`/v1/expenses/card/${expenseId}`, expenseData);
    return response.data;
  }

  // ── Vendors ──

  async listVendors(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v1/vendors', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getVendor(vendorId: string) {
    let response = await this.axios.get(`/v1/vendors/${vendorId}`);
    return response.data;
  }

  async createVendor(vendorData: Record<string, any>, idempotencyKey: string) {
    let response = await this.axios.post('/v1/vendors', vendorData, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    return response.data;
  }

  async updateVendor(vendorId: string, vendorData: Record<string, any>) {
    let response = await this.axios.put(`/v1/vendors/${vendorId}`, vendorData);
    return response.data;
  }

  async deleteVendor(vendorId: string) {
    await this.axios.delete(`/v1/vendors/${vendorId}`);
  }

  // ── Transfers ──

  async listTransfers(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v2/transfers', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getTransfer(transferId: string) {
    let response = await this.axios.get(`/v1/transfers/${transferId}`);
    return response.data;
  }

  async createTransfer(transferData: Record<string, any>, idempotencyKey: string) {
    let response = await this.axios.post('/v1/transfers', transferData, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    return response.data;
  }

  // ── Budgets ──

  async listBudgets(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v2/budgets', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getBudget(budgetId: string) {
    let response = await this.axios.get(`/v2/budgets/${budgetId}`);
    return response.data;
  }

  async createBudget(budgetData: Record<string, any>) {
    let response = await this.axios.post('/v2/budgets', budgetData);
    return response.data;
  }

  async updateBudget(budgetId: string, budgetData: Record<string, any>) {
    let response = await this.axios.put(`/v2/budgets/${budgetId}`, budgetData);
    return response.data;
  }

  async archiveBudget(budgetId: string) {
    let response = await this.axios.post(`/v2/budgets/${budgetId}/archive`, {});
    return response.data;
  }

  // ── Transactions ──

  async listCardTransactions(params?: {
    cursor?: string;
    limit?: number;
    user_ids?: string[];
    posted_at_start?: string;
  }) {
    let queryParams: Record<string, any> = { ...params };
    if (params?.user_ids) {
      queryParams['user_ids[]'] = params.user_ids;
      queryParams.user_ids = undefined;
    }
    let response = await this.axios.get('/v2/transactions/card/primary', {
      params: queryParams
    });
    return response.data as PaginatedResponse<any>;
  }

  async listCashTransactions(
    accountId: string,
    params?: { cursor?: string; limit?: number; posted_at_start?: string }
  ) {
    let response = await this.axios.get(`/v2/transactions/cash/${accountId}`, { params });
    return response.data as PaginatedResponse<any>;
  }

  // ── Accounts ──

  async listCardAccounts() {
    let response = await this.axios.get('/v2/accounts/card');
    return response.data as PaginatedResponse<any>;
  }

  async listCashAccounts() {
    let response = await this.axios.get('/v2/accounts/cash');
    return response.data as PaginatedResponse<any>;
  }

  async getPrimaryCashAccount() {
    let response = await this.axios.get('/v2/accounts/cash/primary');
    return response.data;
  }

  async getCashAccount(accountId: string) {
    let response = await this.axios.get(`/v2/accounts/cash/${accountId}`);
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks() {
    let response = await this.axios.get('/v1/webhooks');
    return response.data as PaginatedResponse<any>;
  }

  async createWebhook(webhookData: { url: string; event_types: string[] }) {
    let response = await this.axios.post('/v1/webhooks', webhookData);
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/v1/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(webhookId: string, webhookData: { url: string; event_types: string[] }) {
    let response = await this.axios.put(`/v1/webhooks/${webhookId}`, webhookData);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/v1/webhooks/${webhookId}`);
  }

  // ── Travel ──

  async listTrips(params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get('/v1/trips', { params });
    return response.data as PaginatedResponse<any>;
  }

  async getTrip(tripId: string) {
    let response = await this.axios.get(`/v1/trips/${tripId}`);
    return response.data;
  }

  async listTripBookings(tripId: string, params?: { cursor?: string; limit?: number }) {
    let response = await this.axios.get(`/v1/trips/${tripId}/bookings`, { params });
    return response.data as PaginatedResponse<any>;
  }
}
