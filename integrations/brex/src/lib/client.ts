import { createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import {
  accountDto,
  budgetDto,
  budgetId,
  cardDto,
  expenseDto,
  organizationDto,
  page,
  transactionDto,
  transferDto,
  userDto,
  vendorDto
} from './schemas';
import { apiError, exact, pageParams, parse, pathId, required } from './validation';
export type Money = { amount: number; currency: string | null };
export type BudgetType = 'budget' | 'spend_limit';
export class Client {
  private axios;
  constructor(config: { token: string }) {
    required(config.token, 'Token');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.brex.com',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: apiError,
      paramsSerializer: { indexes: null }
    });
  }
  private async request<S extends z.ZodType>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    schema: S,
    data?: unknown,
    params?: object,
    key?: string
  ): Promise<z.output<S>> {
    const response = await this.axios.request({
      method,
      url,
      data,
      params,
      headers:
        key === undefined ? undefined : { 'Idempotency-Key': required(key, 'idempotencyKey') }
    });
    return parse(schema, response.data);
  }
  private async detail<S extends z.ZodType<{ id: string }>>(
    url: string,
    id: string,
    schema: S
  ) {
    const v = await this.request('get', `${url}/${pathId(id)}`, schema);
    exact(v.id, id);
    return v;
  }
  listUsers(params?: { cursor?: string; limit?: number; email?: string }) {
    return this.request(
      'get',
      '/v2/users',
      page(userDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  getUser(id: string) {
    return this.detail('/v2/users', id, userDto);
  }
  getUserMe() {
    return this.request('get', '/v2/users/me', userDto);
  }
  inviteUser(data: object, key?: string, inactive = false) {
    return this.request(
      'post',
      inactive ? '/v2/users/create' : '/v2/users',
      userDto,
      data,
      undefined,
      key
    );
  }
  updateUser(id: string, data: object, key?: string) {
    return this.request('put', `/v2/users/${pathId(id)}`, userDto, data, undefined, key);
  }
  listCards(params?: { cursor?: string; limit?: number; user_id?: string }) {
    return this.request(
      'get',
      '/v2/cards',
      page(cardDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  getCard(id: string) {
    return this.detail('/v2/cards', id, cardDto);
  }
  createCard(data: object, key: string) {
    return this.request('post', '/v2/cards', cardDto, data, undefined, key);
  }
  updateCard(id: string, data: object, key?: string) {
    return this.request('put', `/v2/cards/${pathId(id)}`, cardDto, data, undefined, key);
  }
  lockCard(id: string, reason: string) {
    return this.request('post', `/v2/cards/${pathId(id)}/lock`, cardDto, { reason });
  }
  unlockCard(id: string) {
    return this.request('post', `/v2/cards/${pathId(id)}/unlock`, cardDto, {});
  }
  terminateCard(id: string, reason: string) {
    return this.request('post', `/v2/cards/${pathId(id)}/terminate`, cardDto, { reason });
  }
  listDepartments(params?: { cursor?: string; limit?: number }) {
    return this.request(
      'get',
      '/v2/departments',
      page(organizationDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  listLocations(params?: { cursor?: string; limit?: number }) {
    return this.request(
      'get',
      '/v2/locations',
      page(organizationDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  listCardExpenses(params?: {
    cursor?: string;
    limit?: number;
    expand?: string[];
    updated_at_start?: string;
  }) {
    const { expand, ...rest } = params ?? {};
    return this.request('get', '/v1/expenses', page(expenseDto), undefined, {
      ...pageParams(rest, 100),
      'expand[]': expand?.map(v => (v === 'receipts' ? 'receipts.download_uris' : v)),
      'expense_type[]': ['CARD']
    });
  }
  async getCardExpense(id: string, expand?: string[]) {
    const v = await this.request('get', `/v1/expenses/${pathId(id)}`, expenseDto, undefined, {
      'expand[]': expand?.map(v => (v === 'receipts' ? 'receipts.download_uris' : v))
    });
    exact(v.id, id);
    return v;
  }
  updateCardExpense(id: string, data: object) {
    return this.request('put', `/v1/expenses/card/${pathId(id)}`, expenseDto, data);
  }
  listVendors(params?: { cursor?: string; limit?: number }) {
    return this.request(
      'get',
      '/v1/vendors',
      page(vendorDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  getVendor(id: string) {
    return this.detail('/v1/vendors', id, vendorDto);
  }
  createVendor(data: object, key: string) {
    return this.request('post', '/v1/vendors', vendorDto, data, undefined, key);
  }
  updateVendor(id: string, data: object) {
    return this.request('put', `/v1/vendors/${pathId(id)}`, vendorDto, data);
  }
  async deleteVendor(id: string) {
    await this.request('delete', `/v1/vendors/${pathId(id)}`, z.unknown());
  }
  listTransfers(params?: { cursor?: string; limit?: number }) {
    return this.request(
      'get',
      '/v2/transfers',
      page(transferDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  getTransfer(id: string) {
    return this.detail('/v1/transfers', id, transferDto);
  }
  createTransfer(data: object, key: string) {
    return this.request('post', '/v1/transfers', transferDto, data, undefined, key);
  }
  listBudgets(params?: { cursor?: string; limit?: number }, type: BudgetType = 'budget') {
    return this.request(
      'get',
      type === 'budget' ? '/v2/budgets' : '/v2/spend_limits',
      page(budgetDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  async getBudget(id: string, type: BudgetType = 'budget') {
    const v = await this.request(
      'get',
      `${type === 'budget' ? '/v2/budgets' : '/v2/spend_limits'}/${pathId(id)}`,
      budgetDto
    );
    exact(budgetId(v), id);
    return v;
  }
  createBudget(data: object, key: string, type: BudgetType = 'budget') {
    return this.request(
      'post',
      type === 'budget' ? '/v2/budgets' : '/v2/spend_limits',
      budgetDto,
      data,
      undefined,
      key
    );
  }
  updateBudget(id: string, data: object, key: string, type: BudgetType = 'budget') {
    return this.request(
      'put',
      `${type === 'budget' ? '/v2/budgets' : '/v2/spend_limits'}/${pathId(id)}`,
      budgetDto,
      data,
      undefined,
      key
    );
  }
  async archiveBudget(id: string, type: BudgetType = 'budget') {
    await this.request(
      'post',
      `${type === 'budget' ? '/v2/budgets' : '/v2/spend_limits'}/${pathId(id)}/archive`,
      z.unknown()
    );
  }
  listCardTransactions(params?: {
    cursor?: string;
    limit?: number;
    user_ids?: string[];
    posted_at_start?: string;
  }) {
    return this.request(
      'get',
      '/v2/transactions/card/primary',
      page(transactionDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  listCashTransactions(
    id: string,
    params?: { cursor?: string; limit?: number; posted_at_start?: string }
  ) {
    return this.request(
      'get',
      `/v2/transactions/cash/${pathId(id)}`,
      page(transactionDto),
      undefined,
      pageParams(params ?? {})
    );
  }
  listCardAccounts() {
    return this.request('get', '/v2/accounts/card', z.array(accountDto));
  }
  listCashAccounts() {
    return this.request('get', '/v2/accounts/cash', page(accountDto));
  }
  getPrimaryCashAccount() {
    return this.request('get', '/v2/accounts/cash/primary', accountDto);
  }
  getCashAccount(id: string) {
    return this.detail('/v2/accounts/cash', id, accountDto);
  }
}
