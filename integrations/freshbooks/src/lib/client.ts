import { AuthConfigSecretRedactor, createAuthenticatedAxios } from 'slates';
import {
  accountId,
  type FreshBooksAuth,
  integer,
  invalid,
  ORIGIN,
  type Row,
  resourceId,
  row,
  safeApiError,
  sanitize,
  text,
  unexpected
} from './contracts';

export const resources = {
  clients: {
    path: 'users/clients',
    one: 'client',
    many: 'clients',
    id: 'clientId',
    ids: ['id', 'userid']
  },
  invoices: {
    path: 'invoices/invoices',
    one: 'invoice',
    many: 'invoices',
    id: 'invoiceId',
    ids: ['id', 'invoiceid']
  },
  payments: {
    path: 'payments/payments',
    one: 'payment',
    many: 'payments',
    id: 'paymentId',
    ids: ['id', 'paymentid']
  },
  estimates: {
    path: 'estimates/estimates',
    one: 'estimate',
    many: 'estimates',
    id: 'estimateId',
    ids: ['id', 'estimateid']
  },
  expenses: {
    path: 'expenses/expenses',
    one: 'expense',
    many: 'expenses',
    id: 'expenseId',
    ids: ['id', 'expenseid']
  },
  taxes: { path: 'taxes/taxes', one: 'tax', many: 'taxes', id: 'taxId', ids: ['taxid', 'id'] },
  items: {
    path: 'items/items',
    one: 'item',
    many: 'items',
    id: 'itemId',
    ids: ['id', 'itemid']
  },
  credit_notes: {
    path: 'credit_notes/credit_notes',
    one: 'credit_note',
    many: 'credit_notes',
    id: 'creditNoteId',
    ids: ['creditid', 'id']
  },
  expense_categories: {
    path: 'expenses/categories',
    one: 'category',
    many: 'categories',
    id: 'categoryId',
    ids: ['categoryid', 'id']
  },
  projects: {
    path: 'project',
    one: 'project',
    many: 'projects',
    id: 'projectId',
    ids: ['id']
  },
  time_entries: {
    path: 'time_entries',
    one: 'time_entry',
    many: 'time_entries',
    id: 'timeEntryId',
    ids: ['id']
  }
} as const;
export type Kind = keyof typeof resources;
export const idOf = (kind: Kind, value: Row): number => {
  const ids = resources[kind].ids
    .map(key => value[key])
    .filter(id => id !== undefined && id !== null)
    .map(id => resourceId(id));
  if (!ids.length || ids.some(id => id !== ids[0])) unexpected();
  return ids[0]!;
};
export type Membership = {
  accountId?: string;
  businessId: number;
  businessName?: string;
  role?: string;
};
export class FreshBooksClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private redactor: AuthConfigSecretRedactor;
  private memberships?: Membership[];
  private scope?: { accountId?: string; businessId: number };
  constructor(
    auth: FreshBooksAuth,
    private input: Row = {},
    private stored: Row = {}
  ) {
    text(auth.token, 'Access token');
    this.redactor = new AuthConfigSecretRedactor({
      token: auth.token,
      refreshToken: auth.refreshToken
    });
    this.http = createAuthenticatedAxios({
      baseURL: ORIGIN,
      authHeader: { value: `Bearer ${auth.token}` },
      contentType: false,
      headers: { 'Api-Version': 'alpha' },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: safeApiError
    });
  }
  async identity() {
    const response = await this.http.get('/auth/api/v1/users/me');
    const user = row(row(sanitize(response.data, this.redactor)).response);
    const identityId = resourceId(user.id, 'Identity ID');
    if (!Array.isArray(user.business_memberships)) unexpected();
    this.memberships = user.business_memberships.map(item => {
      const membership = row(item),
        business = row(membership.business);
      return {
        businessId: resourceId(business.id, 'Business ID'),
        ...(business.account_id === null || business.account_id === undefined
          ? {}
          : { accountId: accountId(business.account_id) }),
        ...(typeof business.name === 'string' ? { businessName: business.name } : {}),
        ...(typeof membership.role === 'string' ? { role: membership.role } : {})
      };
    });
    return {
      identityId,
      firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
      lastName: typeof user.last_name === 'string' ? user.last_name : undefined,
      email: typeof user.email === 'string' ? user.email : undefined,
      memberships: this.memberships
    };
  }
  private async resolve(kind: Kind) {
    if (!this.memberships) await this.identity();
    if (!this.scope) {
      const requestedAccount =
        this.input.accountId ??
        (this.input.businessId === undefined ? this.stored.accountId : undefined);
      const requestedBusiness =
        this.input.businessId ??
        (this.input.accountId === undefined ? this.stored.businessId : undefined);
      const account = requestedAccount === undefined ? undefined : accountId(requestedAccount);
      const business =
        requestedBusiness === undefined
          ? undefined
          : resourceId(requestedBusiness, 'businessId');
      if (account === undefined && business === undefined)
        invalid('Select an accountId or businessId from get_identity.');
      const matches = this.memberships!.filter(
        item =>
          (account === undefined || item.accountId === account) &&
          (business === undefined || item.businessId === business)
      );
      const unique = [
        ...new Map(
          matches.map(item => [`${item.businessId}:${item.accountId ?? ''}`, item])
        ).values()
      ];
      if (unique.length !== 1)
        invalid(
          'The selected account/business is unavailable or ambiguous for this identity. Select an exact membership from get_identity.'
        );
      this.scope = unique[0]!;
    }
    if (kind === 'projects') return `/projects/business/${this.scope.businessId}`;
    if (kind === 'time_entries') return `/timetracking/business/${this.scope.businessId}`;
    if (!this.scope.accountId)
      invalid(
        'This business has no accounting account. Select an accounting membership from get_identity.'
      );
    return `/accounting/account/${this.scope.accountId}`;
  }
  private envelope(kind: Kind, value: unknown) {
    const root = row(sanitize(value, this.redactor));
    return kind === 'projects' || kind === 'time_entries'
      ? root
      : row(row(root.response).result);
  }
  private check(kind: Kind, value: unknown, expected?: number) {
    const record = row(value);
    const id = idOf(kind, record);
    if (expected !== undefined && id !== expected) unexpected();
    // Expenses use accountid for a numeric expense-account relation, not the accounting scope.
    for (const key of kind === 'expenses'
      ? ['account_id', 'accounting_systemid']
      : ['accountid', 'account_id', 'accounting_systemid'])
      if (
        record[key] !== undefined &&
        record[key] !== null &&
        this.scope?.accountId !== String(record[key])
      )
        unexpected();
    if (
      record.business_id !== undefined &&
      resourceId(record.business_id) !== this.scope?.businessId
    )
      unexpected();
    return record;
  }
  async list(kind: Kind, params: Record<string, string | number>) {
    const base = await this.resolve(kind);
    const info = resources[kind];
    const response = await this.http.get(
      `${base}/${kind === 'projects' ? 'projects' : info.path}`,
      { params }
    );
    const result = this.envelope(kind, response.data);
    const values = result[info.many];
    if (!Array.isArray(values)) unexpected();
    const records = values.map(value => this.check(kind, value));
    if (new Set(records.map(value => idOf(kind, value))).size !== records.length) unexpected();
    const meta = kind === 'projects' || kind === 'time_entries' ? row(result.meta) : result;
    const total = integer(meta.total, 'Provider total'),
      page = integer(meta.page, 'Provider page'),
      pages = integer(meta.pages, 'Provider pages');
    const requestedPage = Math.max(1, Number(params.page));
    if (
      (page !== requestedPage &&
        !(kind === 'projects' && requestedPage === 1 && page === 0)) ||
      records.length > total ||
      records.length > Number(params.per_page) ||
      (pages === 0 && (total !== 0 || records.length !== 0)) ||
      (requestedPage > pages && records.length !== 0)
    )
      unexpected();
    return { records, totalCount: total, currentPage: page, totalPages: pages };
  }
  async get(kind: Kind, id: number) {
    resourceId(id);
    if (kind === 'credit_notes')
      invalid(
        'Exact credit-note detail is not supported by the current documented API contract. Use list_resources and match creditNoteId.'
      );
    const base = await this.resolve(kind),
      info = resources[kind];
    const response = await this.http.get(`${base}/${info.path}/${id}`, {
      params:
        kind === 'invoices'
          ? { 'include[]': 'lines' }
          : kind === 'clients'
            ? { 'include[]': 'outstanding_balance' }
            : undefined
    });
    return this.check(kind, this.envelope(kind, response.data)[info.one], id);
  }
  async credit(id: number) {
    let total: number | undefined;
    let pages: number | undefined;
    const seen = new Set<number>();
    for (let page = 1; page <= 50; page++) {
      const result = await this.list('credit_notes', { page, per_page: 100 });
      if (
        (total !== undefined && total !== result.totalCount) ||
        (pages !== undefined && pages !== result.totalPages)
      )
        unexpected();
      total = result.totalCount;
      pages = result.totalPages;
      for (const value of result.records) {
        const key = idOf('credit_notes', value);
        if (seen.has(key)) unexpected();
        seen.add(key);
      }
      const found = result.records.find(value => idOf('credit_notes', value) === id);
      if (found) return found;
      if (page >= result.totalPages) {
        if (seen.size !== total) unexpected();
        invalid('The selected credit note was not found in this account.');
      }
    }
    invalid(
      'Credit-note ownership cannot be verified within 50 pages. Use a smaller account or the provider interface.'
    );
  }
  async write(
    kind: Kind,
    action: 'create' | 'update' | 'delete' | 'send' | 'markAsSent',
    data: Row,
    id?: number
  ) {
    const info = resources[kind],
      base = await this.resolve(kind);
    const path = `${base}/${info.path}${id === undefined ? '' : `/${resourceId(id)}`}`;
    if (
      action === 'delete' &&
      (kind === 'projects' || kind === 'time_entries' || kind === 'taxes')
    ) {
      const response = await this.http.delete(path);
      if (response.status !== 200 && response.status !== 204) unexpected();
      if (response.status !== 204) {
        const ack = row(sanitize(response.data, this.redactor));
        if (
          Object.keys(ack).length !== 0 &&
          (Object.keys(ack).length !== 1 || Object.keys(row(ack.response)).length !== 0)
        )
          unexpected();
      }
      return undefined;
    }
    const response = await this.http.request({
      method:
        action === 'create'
          ? 'POST'
          : action === 'delete' && kind === 'invoices'
            ? 'DELETE'
            : 'PUT',
      url: path,
      data: { [info.one]: data },
      headers: { 'Content-Type': 'application/json' }
    });
    if (action === 'delete' && ['clients', 'expenses', 'items'].includes(kind)) {
      const ack = row(sanitize(response.data, this.redactor));
      if (
        Object.keys(ack).length === 1 &&
        ack.response !== undefined &&
        Object.keys(row(ack.response)).length === 0
      )
        return undefined;
    }
    const result = this.envelope(kind, response.data);
    if (kind === 'credit_notes') {
      if (!Array.isArray(result.credit_notes) || result.credit_notes.length !== 1)
        unexpected();
      return this.check(kind, result.credit_notes[0], id);
    }
    if (action === 'delete' && Object.keys(result).length === 0) return undefined;
    return this.check(kind, result[info.one], id);
  }
}
