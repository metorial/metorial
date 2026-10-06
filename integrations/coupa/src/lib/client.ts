import { createApiServiceError, createAxios } from 'slates';
import {
  credential,
  instance,
  integer,
  type NativeRecord,
  nativeSchema,
  publicJson,
  requireValue,
  safeJson,
  upstream
} from './contracts';
export interface CoupaQueryParams {
  offset?: number;
  limit?: number;
  orderBy?: string;
  dir?: 'asc' | 'desc';
  fields?: string[];
  returnObject?: 'shallow' | 'limited' | 'none';
  exportedFlag?: boolean;
  filters?: Record<string, string>;
}
export type CoupaAuth = {
  token: string;
  instanceUrl?: string;
  mode?: 'oauth_client_credentials' | 'api_key';
  expiresAt?: string;
};
const resources = new Set([
  'purchase_orders',
  'invoices',
  'suppliers',
  'requisitions',
  'expense_reports',
  'contracts',
  'approvals',
  'users',
  'accounts',
  'receiving_transactions'
]);
export class CoupaClient {
  readonly instanceUrl: string;
  private readonly http: ReturnType<typeof createAxios>;
  static from(ctx: { auth: CoupaAuth; config: Record<string, unknown>; input?: unknown }) {
    return new CoupaClient({
      ...ctx.auth,
      instanceUrl: ctx.auth.instanceUrl ?? ctx.config.instanceUrl,
      input: ctx.input
    });
  }
  constructor(
    private readonly auth: Omit<CoupaAuth, 'instanceUrl'> & {
      instanceUrl: unknown;
      input?: unknown;
    }
  ) {
    this.instanceUrl = instance(auth.instanceUrl);
    credential(auth.token, 1024 * 1024);
    requireValue(
      auth.mode === 'oauth_client_credentials' || auth.mode === 'api_key',
      'This older Coupa connection does not record its authentication mode. Reconnect using OAuth Client Credentials or the existing deprecated API Key method before calling tools; credentials cannot be safely sent in both headers.'
    );
    if (auth.expiresAt !== undefined)
      requireValue(
        Number.isFinite(Date.parse(auth.expiresAt)) && Date.parse(auth.expiresAt) > Date.now(),
        'Coupa OAuth token has expired. Renew the client-credentials connection before retrying.'
      );
    if (auth.input !== undefined) {
      safeJson(auth.input, [auth.token]);
      this.inputIds(auth.input);
    }
    this.http = createAxios({
      baseURL: `${this.instanceUrl}/api`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(auth.mode === 'api_key'
          ? { 'X-COUPA-API-KEY': auth.token }
          : { Authorization: `Bearer ${auth.token}` })
      },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024,
      errorMapping: {
        defaults: { message: 'Coupa request failed.' },
        extractResponseData: () => ({})
      }
    });
  }
  private inputIds(v: unknown) {
    if (Array.isArray(v)) v.forEach(item => this.inputIds(item));
    else if (v && typeof v === 'object')
      for (const [key, item] of Object.entries(v)) {
        if (
          item !== undefined &&
          key !== 'taxId' &&
          (key === 'id' || key.endsWith('Id') || key === 'lineNumber')
        )
          integer(item, key);
        if (key !== 'customFields') this.inputIds(item);
      }
  }
  private resource(value: string) {
    requireValue(resources.has(value), 'Use one of the supported Coupa resources.');
    return value;
  }
  private query(params: CoupaQueryParams = {}) {
    integer(params.offset ?? 0, 'offset', 0);
    integer(params.limit ?? 50, 'limit', 1, 50);
    const query: Record<string, string> = {
      offset: String(params.offset ?? 0),
      limit: String(params.limit ?? 50)
    };
    if (params.orderBy !== undefined) {
      requireValue(
        /^[a-zA-Z][a-zA-Z0-9_-]{0,100}$/.test(params.orderBy),
        'Provide a native orderBy field.'
      );
      query.order_by = params.orderBy;
    }
    if (params.dir !== undefined) {
      requireValue(['asc', 'desc'].includes(params.dir), 'Use asc or desc sorting.');
      query.dir = params.dir;
    }
    if (params.fields?.length) query.fields = JSON.stringify(params.fields);
    if (params.returnObject !== undefined) query.return_object = params.returnObject;
    if (params.exportedFlag !== undefined) query.exported = String(params.exportedFlag);
    for (const [key, value] of Object.entries(params.filters ?? {})) {
      requireValue(
        /^[a-zA-Z][a-zA-Z0-9_-]*(?:\[[a-zA-Z0-9_-]+\])*$/.test(key) &&
          ![
            'limit',
            'offset',
            'order_by',
            'dir',
            'fields',
            'return_object',
            'access_token',
            'api_key'
          ].includes(key) &&
          typeof value === 'string' &&
          value.length > 0 &&
          value.length <= 4096,
        'Use native resource filters; reserved paging, format and authentication parameters cannot be overridden.'
      );
      requireValue(
        !(key in query) || query[key] === value,
        'Conflicting Coupa filter and explicit paging/format parameter.'
      );
      query[key] = value;
    }
    return query;
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    data?: unknown,
    params?: Record<string, string>
  ) {
    safeJson({ data: data ?? null, params: params ?? null }, [this.auth.token]);
    let received = false;
    let returnedId: number | undefined;
    try {
      const response = await this.http.request({ method, url: path, data, params });
      received = true;
      returnedId = this.safeId(response.data?.id);
      const projected = publicJson(response.data, [this.auth.token]);
      safeJson(
        {
          body: projected.value,
          headers:
            typeof response.headers.toJSON === 'function'
              ? response.headers.toJSON()
              : response.headers,
          statusText: response.statusText
        },
        projected.secrets
      );
      requireValue(
        [200, 201].includes(response.status),
        'Coupa returned an unexpected receipt. A dispatched mutation may have taken effect; inspect the exact resource before retrying.'
      );
      return projected.value;
    } catch (error) {
      if (received && method !== 'GET') {
        const [, resource, requested] = path.split('/');
        throw this.unconfirmed(
          resource,
          requested ? Number(requested) : undefined,
          returnedId
        );
      }
      throw upstream(error, method !== 'GET');
    }
  }
  private receipt(value: unknown, mutation = false): NativeRecord {
    const parsed = nativeSchema.safeParse(value);
    requireValue(
      parsed.success,
      `Coupa did not return a JSON resource with a safe integer ID.${mutation ? ' The operation may have taken effect; inspect native records before retrying.' : ' Verify JSON API access and the requested resource.'}`
    );
    return parsed.data;
  }
  async getResource(resource: string, resourceId: number | string) {
    integer(resourceId, 'resource ID');
    const row = this.receipt(
      await this.request('GET', `/${this.resource(resource)}/${resourceId}`)
    );
    requireValue(row.id === resourceId, 'Coupa returned a different resource ID.');
    return row;
  }
  async listResources(resource: string, params?: CoupaQueryParams) {
    const query = this.query(params),
      value = await this.request('GET', `/${this.resource(resource)}`, undefined, query);
    requireValue(
      Array.isArray(value) && value.length <= Number(query.limit),
      'Coupa did not return a bounded JSON resource array. No empty inventory is inferred; verify resource filters and JSON access.'
    );
    const rows = value.map(v => this.receipt(v));
    requireValue(
      new Set(rows.map(r => r.id)).size === rows.length,
      'Coupa returned duplicate resource IDs in one page.'
    );
    return rows;
  }
  private safeId(value: unknown) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
      ? value
      : undefined;
  }
  private unconfirmed(
    resource: string | undefined,
    requestedId?: number,
    returnedId?: number
  ) {
    const error = createApiServiceError(
      'Coupa mutation was dispatched, but its exact receipt or requested changes could not be confirmed. It may have taken effect. Inspect the safe native identifiers before retrying; no rollback or automatic retry was attempted.',
      { reason: 'accepted_unconfirmed' }
    );
    error.data.outcome = 'accepted_unconfirmed';
    if (resource && resources.has(resource)) error.data.resourceType = resource;
    if (this.safeId(requestedId) !== undefined) {
      error.data.resourceId = requestedId;
      error.data.requestedResourceId = requestedId;
    }
    if (this.safeId(returnedId) !== undefined) {
      error.data.returnedResourceId = returnedId;
      if (requestedId === undefined) error.data.resourceId = returnedId;
    }
    return error;
  }
  private matches(requested: unknown, returned: unknown, field = ''): boolean {
    if (requested === undefined) return true;
    if (Array.isArray(requested)) {
      if (!Array.isArray(returned)) return false;
      if (requested.length === 0) return returned.length === 0;
      const remaining = [...returned];
      return requested.every(item => {
        const index = remaining.findIndex(candidate => this.matches(item, candidate, field));
        if (index < 0) return false;
        remaining.splice(index, 1);
        return true;
      });
    }
    if (requested && typeof requested === 'object') {
      if (!returned || typeof returned !== 'object' || Array.isArray(returned)) return false;
      return Object.entries(requested).every(([key, value]) =>
        this.matches(value, (returned as Record<string, unknown>)[key], key)
      );
    }
    if (
      [
        'quantity',
        'price',
        'unit-price',
        'amount',
        'accounting-total',
        'minimum-value',
        'maximum-value'
      ].includes(field)
    ) {
      const canonical = (value: unknown) => {
        if (
          typeof value === 'number' &&
          (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
        )
          return undefined;
        if (typeof value !== 'string' && typeof value !== 'number') return undefined;
        const text = String(value);
        if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(text)) return undefined;
        const negative = text.startsWith('-');
        const [whole = '', fraction = ''] = text.replace(/^-/, '').split('.');
        const integral = whole.replace(/^0+(?=.)/, ''),
          fractional = fraction.replace(/0+$/, '');
        const zero = integral === '0' && !fractional;
        return `${negative && !zero ? '-' : ''}${integral}${fractional ? `.${fractional}` : ''}`;
      };
      const left = canonical(requested),
        right = canonical(returned);
      return left !== undefined && left === right;
    }
    return requested === returned;
  }
  private writableReceipt(row: NativeRecord, data: Record<string, unknown>, resource: string) {
    return Object.entries(data).every(([key, value]) =>
      resource === 'purchase_orders' && key === 'type'
        ? true
        : key === 'is-credit-note'
          ? row['document-type'] === (value ? 'Credit Note' : 'Invoice')
          : this.matches(value, row[key], key)
    );
  }
  async createResource(resource: string, data: Record<string, unknown>) {
    safeJson(data, [this.auth.token]);
    const requested = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    const value = await this.request('POST', `/${this.resource(resource)}`, requested);
    try {
      const row = this.receipt(value, true);
      requireValue(
        this.writableReceipt(row, requested, resource),
        'Requested native changes were not confirmed.'
      );
      return row;
    } catch {
      throw this.unconfirmed(resource, undefined, this.safeId((value as NativeRecord)?.id));
    }
  }
  async updateResource(
    resource: string,
    resourceId: number | string,
    data: Record<string, unknown>
  ) {
    integer(resourceId, 'resource ID');
    requireValue(Object.keys(data).length > 0, 'Provide at least one writable change.');
    safeJson(data, [this.auth.token]);
    const requested = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    const value = await this.request(
      'PUT',
      `/${this.resource(resource)}/${resourceId}`,
      requested
    );
    try {
      const row = this.receipt(value, true);
      requireValue(
        row.id === resourceId && this.writableReceipt(row, requested, resource),
        'Exact updated resource or requested changes were not confirmed.'
      );
      return row;
    } catch {
      throw this.unconfirmed(resource, resourceId, this.safeId((value as NativeRecord)?.id));
    }
  }
  getPurchaseOrder(id: number | string) {
    return this.getResource('purchase_orders', id);
  }
  listPurchaseOrders(p?: CoupaQueryParams) {
    return this.listResources('purchase_orders', p);
  }
  createPurchaseOrder(data: Record<string, unknown>) {
    return this.createResource('purchase_orders', data);
  }
  updatePurchaseOrder(id: number | string, data: Record<string, unknown>) {
    return this.updateResource('purchase_orders', id, data);
  }
  getInvoice(id: number | string) {
    return this.getResource('invoices', id);
  }
  listInvoices(p?: CoupaQueryParams) {
    return this.listResources('invoices', p);
  }
  createInvoice(data: Record<string, unknown>) {
    return this.createResource('invoices', data);
  }
  listSuppliers(p?: CoupaQueryParams) {
    return this.listResources('suppliers', p);
  }
  createSupplier(data: Record<string, unknown>) {
    return this.createResource('suppliers', data);
  }
  updateSupplier(id: number | string, data: Record<string, unknown>) {
    return this.updateResource('suppliers', id, data);
  }
  listRequisitions(p?: CoupaQueryParams) {
    return this.listResources('requisitions', p);
  }
  createRequisition(data: Record<string, unknown>) {
    return this.createResource('requisitions', data);
  }
  listExpenseReports(p?: CoupaQueryParams) {
    return this.listResources('expense_reports', p);
  }
  createExpenseReport(data: Record<string, unknown>) {
    return this.createResource('expense_reports', data);
  }
  listContracts(p?: CoupaQueryParams) {
    return this.listResources('contracts', p);
  }
  createContract(data: Record<string, unknown>) {
    return this.createResource('contracts', data);
  }
  listUsers(p?: CoupaQueryParams) {
    return this.listResources('users', p);
  }
  createUser(data: Record<string, unknown>) {
    return this.createResource('users', data);
  }
  updateUser(id: number | string, data: Record<string, unknown>) {
    return this.updateResource('users', id, data);
  }
  listAccounts(p?: CoupaQueryParams) {
    return this.listResources('accounts', p);
  }
  createAccount(data: Record<string, unknown>) {
    return this.createResource('accounts', data);
  }
  listApprovals(p?: CoupaQueryParams) {
    return this.listResources('approvals', p);
  }
  listReceipts(p?: CoupaQueryParams) {
    return this.listResources('receiving_transactions', p);
  }
  createReceipt(data: Record<string, unknown>) {
    return this.createResource('receiving_transactions', data);
  }
  approveApproval(id: number | string, reason?: string) {
    return this.approval(id, 'approve', reason);
  }
  rejectApproval(id: number | string, reason: string) {
    return this.approval(id, 'reject', reason);
  }
  private async approval(id: number | string, action: 'approve' | 'reject', reason?: string) {
    integer(id, 'approval ID');
    requireValue(
      action !== 'reject' || Boolean(reason?.trim()),
      'Provide an explicit rejection reason; no default reason is invented.'
    );
    if (reason !== undefined)
      requireValue(
        reason.length > 0 && reason.length <= 5000,
        'Use a reason between 1 and 5000 characters.'
      );
    const before = await this.getResource('approvals', id);
    requireValue(
      ['pending', 'pending_approval'].includes(before.status),
      'Only a native pending approval can be processed. Inspect its current state first.'
    );
    integer(before['approvable-id'], 'approvable ID');
    requireValue(
      typeof before['approvable-type'] === 'string' &&
        /^[A-Za-z][A-Za-z0-9]{0,100}$/.test(before['approvable-type']),
      'The exact native approvable type is missing or malformed. No approval action was dispatched.'
    );
    let documentId: number | undefined;
    try {
      const value = await this.request(
        'PUT',
        `/approvals/${id}/${action}`,
        {},
        reason === undefined ? undefined : { reason }
      );
      documentId = this.safeId((value as NativeRecord)?.id);
      const document = this.receipt(value, true);
      const row = await this.getResource('approvals', id);
      requireValue(
        row.status === (action === 'approve' ? 'approved' : 'rejected') &&
          row['approvable-id'] === before['approvable-id'] &&
          row['approvable-type'] === before['approvable-type'] &&
          document.id === before['approvable-id'],
        'Approval action accepted but exact state or underlying document was not confirmed.'
      );
      return row;
    } catch (cause) {
      const error = this.unconfirmed('approvals', id, documentId);
      if (cause && typeof cause === 'object' && 'data' in cause) {
        const data = cause.data as Record<string, unknown>;
        if (this.safeId(data?.returnedResourceId) !== undefined)
          error.data.returnedResourceId = data.returnedResourceId;
      }
      const returnedApprovableId = error.data.returnedResourceId;
      delete error.data.returnedResourceId;
      if (this.safeId(returnedApprovableId) !== undefined)
        error.data.returnedApprovableId = returnedApprovableId;
      error.data.approvableType = before['approvable-type'];
      error.data.approvalId = id;
      error.data.approvableId = before['approvable-id'];
      error.data.outcome = 'accepted_unconfirmed';
      throw error;
    }
  }
}
