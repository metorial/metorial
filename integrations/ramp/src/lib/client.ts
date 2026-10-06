import { createApiServiceError, createAxios } from 'slates';
import {
  apiFailure,
  bases,
  date,
  dateRange,
  environment,
  id,
  invalid,
  object,
  publicRecord,
  type RampRecord,
  required
} from './validation';

export interface PaginationParams {
  start?: string;
  pageSize?: number;
}
export interface PaginatedResponse<T = RampRecord> {
  data: T[];
  page: { next?: string };
}
type Query = Record<string, string | number | boolean | undefined>;
type PageInput = PaginationParams;
export class Client {
  private axios: ReturnType<typeof createAxios>;
  readonly baseURL: string;
  private token: string;
  constructor(config: { token: string; environment?: string }) {
    this.baseURL = bases[environment(config.environment)];
    this.token = required(config.token, 'Access token');
    this.axios = createAxios({
      baseURL: this.baseURL,
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${required(config.token, 'Access token')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }
  async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: RampRecord,
    params?: Query,
    headers?: Record<string, string>,
    emptySuccess = false
  ): Promise<RampRecord> {
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.request<unknown>({
        method,
        url: path,
        data,
        params,
        headers
      });
    } catch (error) {
      apiFailure(error, method === 'GET' ? 'read' : 'mutation');
    }
    if (
      emptySuccess &&
      (response.status === 204 ||
        response.data === '' ||
        response.data === undefined ||
        response.data === null)
    )
      return { acknowledged: true };
    let raw = object(response.data);
    if ('error_v2' in raw || 'error' in raw)
      throw createApiServiceError('Ramp rejected the request.', { reason: 'ramp_api' });
    if (raw.page !== undefined) {
      let page = object(raw.page, 'pagination');
      let next = page.next;
      if (next !== null && next !== undefined && typeof next !== 'string')
        throw createApiServiceError('Ramp returned invalid pagination metadata.', {
          reason: 'ramp_response'
        });
      if (typeof next === 'string' && next) {
        let route = path.startsWith(this.baseURL)
          ? new URL(path).pathname.slice(new URL(this.baseURL).pathname.length)
          : path;
        if (/^https?:\/\//i.test(next)) this.pageUrl(route, next);
        else if (!['/cards', '/limits'].includes(route) || /[/?#\\]/.test(next))
          throw createApiServiceError('Ramp returned an invalid next-page URL.', {
            reason: 'ramp_response'
          });
      }
    }
    return publicRecord(raw, [this.token]);
  }
  private pageUrl(path: string, cursor: string): URL {
    let next: URL;
    try {
      next = new URL(cursor);
    } catch {
      throw invalid('The next-page URL is invalid.');
    }
    let expected = new URL(`${this.baseURL}${path}`);
    if (
      next.origin !== expected.origin ||
      next.pathname !== expected.pathname ||
      next.username ||
      next.password ||
      next.hash ||
      [...next.searchParams.keys()].some(key =>
        /token|authorization|secret|signature|credential/i.test(key)
      )
    )
      throw invalid('Use a next-page URL from this resource and Ramp environment.');
    return next;
  }
  async page(
    path: string,
    input: PageInput = {},
    filters: Record<string, string> = {}
  ): Promise<PaginatedResponse> {
    if (
      input.pageSize !== undefined &&
      (!Number.isInteger(input.pageSize) || input.pageSize < 2 || input.pageSize > 100)
    )
      throw invalid('pageSize must be an integer from 2 to 100.');
    let query: Query = { page_size: input.pageSize };
    let values: Record<string, unknown> = { ...input };
    for (let [name, apiName] of Object.entries(filters)) {
      let value = values[name];
      if (value === undefined) continue;
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
        throw invalid(`${name} has an invalid value.`);
      if (typeof value === 'string') required(value, name);
      let validated: string | number | boolean | undefined = value;
      if (/date/i.test(name)) validated = date(String(value), name);
      query[apiName] = validated;
    }
    dateRange(
      typeof values.fromDate === 'string'
        ? values.fromDate
        : typeof values.fromDueDate === 'string'
          ? values.fromDueDate
          : undefined,
      typeof values.toDate === 'string'
        ? values.toDate
        : typeof values.toDueDate === 'string'
          ? values.toDueDate
          : undefined
    );
    let url = path;
    if (input.start !== undefined) {
      let cursor = required(input.start, 'cursor');
      if (/^https?:\/\//i.test(cursor)) {
        let next = this.pageUrl(path, cursor);
        for (let [key, value] of Object.entries(query))
          if (
            value !== undefined &&
            key !== 'page_size' &&
            next.searchParams.get(key) !== String(value)
          )
            throw invalid('Keep the original filters when following a next-page URL.');
        url = next.toString();
        query = {};
      } else {
        if (cursor.length > 2000 || /[/?#\\]/.test(cursor))
          throw invalid('Use the opaque cursor or next-page URL returned by Ramp.');
        query.start = cursor;
      }
    }
    let raw = await this.request('GET', url, undefined, query);
    if (!Array.isArray(raw.data))
      throw createApiServiceError('Ramp list response did not contain a data array.', {
        reason: 'ramp_response'
      });
    let page = raw.page === undefined ? {} : object(raw.page, 'pagination');
    let next = page.next;
    if (next !== null && next !== undefined && typeof next !== 'string')
      throw createApiServiceError('Ramp returned invalid pagination metadata.', {
        reason: 'ramp_response'
      });
    if (typeof next === 'string' && /^https?:\/\//i.test(next)) this.pageUrl(path, next);
    return {
      data: raw.data.map(entry => publicRecord(entry)),
      page: { next: typeof next === 'string' && next ? next : undefined }
    };
  }
  listTransactions(
    input: PaginationParams & {
      fromDate?: string;
      toDate?: string;
      merchantId?: string;
      state?: string;
      syncStatus?: string;
      entityId?: string;
      spendLimitId?: string;
      userId?: string;
    } = {}
  ) {
    return this.page('/transactions', input, {
      fromDate: 'from_date',
      toDate: 'to_date',
      merchantId: 'merchant_id',
      state: 'state',
      syncStatus: 'sync_status',
      entityId: 'entity_id',
      spendLimitId: 'limit_id',
      userId: 'user_id'
    });
  }
  getTransaction(value: string) {
    return this.request('GET', `/transactions/${id(value)}`);
  }
  listUsers(
    input: PaginationParams & {
      departmentId?: string;
      locationId?: string;
      entityId?: string;
      email?: string;
      status?: string;
    } = {}
  ) {
    if (
      input.status !== undefined &&
      !['USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_SUSPENDED'].includes(input.status)
    )
      throw invalid(
        'status must be USER_ACTIVE, USER_DRAFT, USER_INACTIVE or USER_SUSPENDED for user listing.'
      );
    return this.page('/users', input, {
      departmentId: 'department_id',
      locationId: 'location_id',
      entityId: 'entity_id',
      email: 'email',
      status: 'status'
    });
  }
  getUser(value: string) {
    return this.request('GET', `/users/${id(value)}`);
  }
  createUserInvite(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    departmentId?: string;
    locationId?: string;
    directManagerId?: string;
    isManager?: boolean;
    isDraft?: boolean;
    idempotencyKey: string;
  }) {
    return this.request('POST', '/users/deferred', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      department_id: data.departmentId,
      location_id: data.locationId,
      direct_manager_id: data.directManagerId,
      is_manager: data.isManager,
      is_draft: data.isDraft,
      idempotency_key: data.idempotencyKey
    });
  }
  updateUser(
    value: string,
    data: {
      departmentId?: string;
      locationId?: string;
      directManagerId?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      isManager?: boolean;
    }
  ) {
    return this.request(
      'PATCH',
      `/users/${id(value)}`,
      {
        department_id: data.departmentId,
        location_id: data.locationId,
        direct_manager_id: data.directManagerId,
        role: data.role,
        first_name: data.firstName,
        last_name: data.lastName,
        is_manager: data.isManager
      },
      undefined,
      undefined,
      true
    );
  }
  deactivateUser(value: string) {
    return this.request(
      'PATCH',
      `/users/${id(value)}/deactivate`,
      undefined,
      undefined,
      undefined,
      true
    );
  }
  reactivateUser(value: string) {
    return this.request(
      'PATCH',
      `/users/${id(value)}/reactivate`,
      undefined,
      undefined,
      undefined,
      true
    );
  }
  getDeferredTaskStatus(
    value: string,
    resource: 'user' | 'legacy_card' | 'legacy_limit' = 'user'
  ) {
    return this.request(
      'GET',
      `/${resource === 'user' ? 'users' : resource === 'legacy_card' ? 'cards' : 'limits'}/deferred/status/${id(value, 'taskId')}`
    );
  }
  listCards(
    input: PaginationParams & {
      userId?: string;
      cardProgramId?: string;
      cardType?: 'legacy' | 'physical' | 'virtual';
    } = {}
  ) {
    let kind = input.cardType ?? 'legacy';
    if (kind !== 'legacy' && input.cardProgramId !== undefined)
      throw invalid('cardProgramId is only supported by the legacy Cards API.');
    return this.page(kind === 'legacy' ? '/cards' : `/cards/${kind}`, input, {
      userId: 'user_id',
      ...(kind === 'legacy' ? { cardProgramId: 'card_program_id' } : {})
    });
  }
  getCard(value: string, kind: 'legacy' | 'physical' | 'virtual' = 'legacy') {
    return this.request('GET', `/cards/${kind === 'legacy' ? '' : `${kind}/`}${id(value)}`);
  }
  updateCard(
    value: string,
    data: { displayName?: string; userId?: string; spendingRestrictions?: RampRecord }
  ) {
    return this.request('PATCH', `/cards/${id(value)}`, {
      display_name: data.displayName,
      user_id: data.userId,
      spending_restrictions: data.spendingRestrictions
    });
  }
  createVirtualCard(data: {
    displayName: string;
    userId: string;
    spendProgramId?: string;
    spendingRestrictions?: RampRecord;
    idempotencyKey: string;
  }) {
    return this.request('POST', '/cards/deferred/virtual', {
      display_name: data.displayName,
      user_id: data.userId,
      spend_program_id: data.spendProgramId,
      spending_restrictions: data.spendingRestrictions,
      idempotency_key: data.idempotencyKey
    });
  }
  createPhysicalCard(data: {
    displayName: string;
    userId: string;
    fulfillment: RampRecord;
    spendProgramId?: string;
    spendingRestrictions?: RampRecord;
    idempotencyKey: string;
  }) {
    return this.request('POST', '/cards/deferred/physical', {
      display_name: data.displayName,
      user_id: data.userId,
      fulfillment: data.fulfillment,
      spend_program_id: data.spendProgramId,
      spending_restrictions: data.spendingRestrictions,
      idempotency_key: data.idempotencyKey
    });
  }
  suspendCard(value: string, key: string) {
    return this.request('POST', `/cards/${id(value)}/deferred/suspension`, {
      idempotency_key: key
    });
  }
  unsuspendCard(value: string, key: string) {
    return this.request('POST', `/cards/${id(value)}/deferred/unsuspension`, {
      idempotency_key: key
    });
  }
  terminateCard(value: string, key: string) {
    return this.request('POST', `/cards/${id(value)}/deferred/termination`, {
      idempotency_key: key
    });
  }
  listBills(
    input: PaginationParams & {
      status?: string;
      vendorId?: string;
      entityId?: string;
      syncStatus?: string;
      paymentStatus?: string;
      fromDueDate?: string;
      toDueDate?: string;
      invoiceNumber?: string;
      isArchived?: boolean;
    } = {}
  ) {
    return this.page('/bills', input, {
      status: 'status_summaries',
      vendorId: 'vendor_id',
      entityId: 'entity_id',
      syncStatus: 'sync_status',
      paymentStatus: 'payment_status',
      fromDueDate: 'from_due_date',
      toDueDate: 'to_due_date',
      invoiceNumber: 'invoice_number',
      isArchived: 'is_archived'
    });
  }
  getBill(value: string) {
    return this.request('GET', `/bills/${id(value)}`);
  }
  createBill(data: RampRecord) {
    return this.request('POST', '/bills', data);
  }
  updateBill(value: string, data: RampRecord) {
    return this.request('PATCH', `/bills/${id(value)}`, data);
  }
  archiveBill(value: string) {
    return this.request(
      'DELETE',
      `/bills/${id(value)}`,
      undefined,
      undefined,
      undefined,
      true
    );
  }
  listReimbursements(
    input: PaginationParams & {
      state?: string;
      syncStatus?: string;
      entityId?: string;
      userId?: string;
      fromDate?: string;
      toDate?: string;
      direction?: string;
    } = {}
  ) {
    return this.page('/reimbursements', input, {
      state: 'state',
      syncStatus: 'sync_status',
      entityId: 'entity_id',
      userId: 'user_id',
      fromDate: 'from_date',
      toDate: 'to_date',
      direction: 'direction'
    });
  }
  getReimbursement(value: string) {
    return this.request('GET', `/reimbursements/${id(value)}`);
  }
  listDepartments(input: PaginationParams = {}) {
    return this.page('/departments', input);
  }
  getDepartment(value: string) {
    return this.request('GET', `/departments/${id(value)}`);
  }
  createDepartment(data: { name: string }) {
    return this.request('POST', '/departments', data);
  }
  updateDepartment(value: string, data: { name?: string }) {
    return this.request('PATCH', `/departments/${id(value)}`, data);
  }
  listLocations(input: PaginationParams = {}) {
    return this.page('/locations', input);
  }
  getLocation(value: string) {
    return this.request('GET', `/locations/${id(value)}`);
  }
  listSpendPrograms(input: PaginationParams = {}) {
    return this.page('/spend-programs', input);
  }
  getSpendProgram(value: string) {
    return this.request('GET', `/spend-programs/${id(value)}`);
  }
  createSpendProgram(data: RampRecord) {
    return this.request('POST', '/spend-programs', data);
  }
  updateSpendProgram(value: string, data: RampRecord) {
    return this.request('PATCH', `/spend-programs/${id(value)}`, data);
  }
  listLimits(
    input: PaginationParams & {
      spendProgramId?: string;
      userId?: string;
      entityId?: string;
    } = {}
  ) {
    return this.page('/limits', input, {
      spendProgramId: 'spend_program_id',
      userId: 'user_id',
      entityId: 'entity_id'
    });
  }
  getLimit(value: string) {
    return this.request('GET', `/limits/${id(value)}`);
  }
  createLimit(data: RampRecord) {
    return this.request('POST', '/limits/deferred', data);
  }
  updateLimit(value: string, data: RampRecord) {
    return this.request('PATCH', `/limits/${id(value)}`, data);
  }
  terminateLimit(value: string, key: string) {
    return this.request('POST', `/limits/${id(value)}/deferred/termination`, {
      idempotency_key: key
    });
  }
  listFunds(
    input: PaginationParams & {
      spendProgramId?: string;
      userId?: string;
      entityId?: string;
      displayName?: string;
      isTerminated?: boolean;
    } = {}
  ) {
    return this.page('/funds', input, {
      spendProgramId: 'spend_program_id',
      userId: 'user_id',
      entityId: 'entity_id',
      displayName: 'display_name',
      isTerminated: 'is_terminated'
    });
  }
  getFund(value: string) {
    return this.request('GET', `/funds/${id(value)}`);
  }
  createFund(data: RampRecord, key?: string) {
    return this.request(
      'POST',
      '/funds',
      data,
      undefined,
      key ? { 'X-Idempotency-Key': required(key, 'idempotencyKey') } : undefined
    );
  }
  updateFund(value: string, data: RampRecord, key?: string) {
    return this.request(
      'PATCH',
      `/funds/${id(value)}`,
      data,
      undefined,
      key ? { 'X-Idempotency-Key': key } : undefined
    );
  }
  terminateFund(value: string) {
    return this.request('DELETE', `/funds/${id(value)}`);
  }
  listVendors(input: PaginationParams = {}) {
    return this.page('/vendors', input);
  }
  getVendor(value: string) {
    return this.request('GET', `/vendors/${id(value)}`);
  }
  listEntities(input: PaginationParams = {}) {
    return this.page('/entities', input);
  }
  getEntity(value: string) {
    return this.request('GET', `/entities/${id(value)}`);
  }
  getBusiness() {
    return this.request('GET', '/business');
  }
  getBusinessBalance() {
    return this.request('GET', '/business/balance');
  }
}
export function clientFor(ctx: {
  auth: { token: string; environment?: string };
  config: Record<string, unknown>;
}): Client {
  return new Client({
    token: ctx.auth.token,
    environment: environment(ctx.auth.environment ?? ctx.config.environment)
  });
}
