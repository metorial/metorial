import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import {
  administration,
  exactId,
  invalidResponse,
  parseProviderJson,
  pathValue,
  safeMoneybirdError,
  scrubResponse,
  validateToken
} from './validation';

export type Retirement = {
  deleted: boolean;
  retired: true;
  deactivated?: boolean;
  archived?: boolean;
};
export class MoneybirdClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  readonly administrationId: string;
  pagination: { nextPage?: number; previousPage?: number } = {};
  constructor(config: { token: string; administrationId?: string }) {
    validateToken(config.token);
    this.token = config.token;
    this.administrationId = administration(config.administrationId);
    this.http = createAuthenticatedAxios({
      baseURL: `https://moneybird.com/api/v2/${this.administrationId}`,
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      transformResponse: [parseProviderJson],
      errorAdapter: safeMoneybirdError
    });
  }
  private async request(
    method: string,
    url: string,
    dataOrOptions?: unknown,
    options?: Parameters<ReturnType<typeof createAuthenticatedAxios>['request']>[0]
  ) {
    const config = (method === 'get' || method === 'delete' ? dataOrOptions : options) as
      | Parameters<ReturnType<typeof createAuthenticatedAxios>['request']>[0]
      | undefined;
    const response = await requestAxios(
      'request',
      () =>
        this.http.request({
          ...config,
          method,
          url,
          ...(method === 'get' || method === 'delete' ? {} : { data: dataOrOptions })
        }),
      safeMoneybirdError
    );
    const expected =
      (method === 'delete' && !url.endsWith('/unlink_booking.json')) ||
      url.endsWith('/archive.json')
        ? [204]
        : [200, 201];
    if (!expected.includes(response.status))
      throw safeMoneybirdError({ response: { status: response.status } });
    response.data = scrubResponse(response.data, this.token);
    const bind = (record: unknown) => {
      if (!isApiErrorRecord(record)) throw invalidResponse();
      exactId(record.id);
      if (
        record.administration_id !== undefined &&
        exactId(record.administration_id) !== this.administrationId
      )
        throw invalidResponse();
      return record;
    };
    if (response.status !== 204 && !url.endsWith('/link_booking.json')) {
      if (Array.isArray(response.data)) response.data.forEach(bind);
      else {
        const value = bind(response.data);
        const match = /^\/[^/]+\/([1-9]\d*)\.json$/.exec(url);
        if (match && exactId(value.id) !== match[1]) throw invalidResponse();
        const lifecycle =
          /^\/[^/]+\/([1-9]\d*)\/(?:send_invoice|pause|resume|send_estimate|change_state|unlink_booking)\.json$/.exec(
            url
          );
        if (lifecycle && exactId(value.id) !== lifecycle[1]) throw invalidResponse();
        const paymentParent = /^\/sales_invoices\/([1-9]\d*)\/payments\.json$/.exec(url);
        if (
          paymentParent &&
          value.sales_invoice_id !== undefined &&
          exactId(value.sales_invoice_id) !== paymentParent[1]
        )
          throw invalidResponse();
      }
    }
    if (url.endsWith('/link_booking.json') && !Number.isInteger(response.data))
      throw invalidResponse();
    this.pagination = {};
    const link = getResponseHeaderValue(response.headers, 'link');
    if (typeof link === 'string')
      for (const part of link.split(',')) {
        const match = /<([^>]+)>;\s*rel="(next|prev)"/.exec(part);
        if (!match) continue;
        try {
          const next = new URL(match[1] ?? '');
          if (
            next.origin !== 'https://moneybird.com' ||
            next.pathname !== `/api/v2/${this.administrationId}${url}`
          )
            continue;
          const page = Number(next.searchParams.get('page'));
          if (Number.isSafeInteger(page) && page > 0)
            this.pagination[match[2] === 'next' ? 'nextPage' : 'previousPage'] = page;
        } catch {
          /* An invalid continuation is never guessed. */
        }
      }
    return response;
  }
  private async retire(
    path: string,
    id: string,
    flag: 'none' | 'active' | 'state'
  ): Promise<Retirement> {
    const before = await this.request('get', path);
    if (exactId(before.data.id) !== id) throw invalidResponse();
    await this.request('delete', path);
    try {
      const after = await this.request('get', path);
      if (exactId(after.data.id) !== id) throw invalidResponse();
      if (flag === 'active' && after.data.active === false)
        return { deleted: false, retired: true, deactivated: true };
      if (flag === 'state' && after.data.state === 'archived')
        return { deleted: false, retired: true, archived: true };
    } catch (error) {
      const safe = safeMoneybirdError(error);
      if (safe.data.upstreamStatus === 404) return { deleted: true, retired: true };
      throw safe;
    }
    throw invalidResponse();
  }
  // ─── Contacts ──────────────────────────────────────────────────

  async listContacts(params?: {
    page?: number;
    perPage?: number;
    query?: string;
    includeArchived?: boolean;
  }) {
    let response = await this.request('get', '/contacts.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        query: params?.query,
        include_archived: params?.includeArchived
      }
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.request('get', `/contacts/${pathValue(contactId)}.json`);
    return response.data;
  }

  async getContactByCustomerId(customerId: string) {
    let response = await this.request(
      'get',
      `/contacts/customer_id/${pathValue(customerId)}.json`
    );
    if (response.data.customer_id !== customerId) throw invalidResponse();
    return response.data;
  }

  async createContact(contact: Record<string, any>) {
    let response = await this.request('post', '/contacts.json', { contact });
    return response.data;
  }

  async updateContact(contactId: string, contact: Record<string, any>) {
    let response = await this.request('patch', `/contacts/${pathValue(contactId)}.json`, {
      contact
    });
    return response.data;
  }

  async deleteContact(contactId: string) {
    return this.retire(`/contacts/${pathValue(contactId)}.json`, contactId, 'none');
  }

  async archiveContact(contactId: string) {
    await this.request('patch', `/contacts/${pathValue(contactId)}/archive.json`);
  }

  async filterContacts(filters: Record<string, string>) {
    let filterParts = Object.entries(filters).map(([k, v]) => `${k}:${v}`);
    let response = await this.request('get', '/contacts/filter.json', {
      params: { filter: filterParts.join(',') }
    });
    return response.data;
  }

  // ─── Sales Invoices ────────────────────────────────────────────

  async listSalesInvoices(params?: {
    page?: number;
    perPage?: number;
    state?: string;
    period?: string;
    contactId?: string;
    filter?: string;
  }) {
    let response = await this.request('get', '/sales_invoices.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter:
          [
            params?.filter,
            params?.state && `state:${params.state}`,
            params?.period && `period:${params.period}`,
            params?.contactId && `contact_id:${params.contactId}`
          ]
            .filter(Boolean)
            .join(',') || undefined
      }
    });
    return response.data;
  }

  async getSalesInvoice(invoiceId: string) {
    let response = await this.request('get', `/sales_invoices/${pathValue(invoiceId)}.json`);
    return response.data;
  }

  async findSalesInvoiceByInvoiceId(invoiceId: string) {
    let response = await this.request(
      'get',
      `/sales_invoices/find_by_invoice_id/${pathValue(invoiceId)}.json`
    );
    if (response.data.invoice_id !== invoiceId) throw invalidResponse();
    return response.data;
  }

  async createSalesInvoice(invoice: Record<string, any>) {
    let response = await this.request('post', '/sales_invoices.json', {
      sales_invoice: invoice
    });
    return response.data;
  }

  async updateSalesInvoice(invoiceId: string, invoice: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/sales_invoices/${pathValue(invoiceId)}.json`,
      {
        sales_invoice: invoice
      }
    );
    return response.data;
  }

  async deleteSalesInvoice(invoiceId: string) {
    return this.retire(`/sales_invoices/${pathValue(invoiceId)}.json`, invoiceId, 'none');
  }

  async sendSalesInvoice(invoiceId: string, sendOptions?: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/sales_invoices/${pathValue(invoiceId)}/send_invoice.json`,
      {
        sales_invoice_sending: sendOptions || {}
      }
    );
    return response.data;
  }

  async registerPayment(invoiceId: string, payment: Record<string, any>) {
    let response = await this.request(
      'post',
      `/sales_invoices/${pathValue(invoiceId)}/payments.json`,
      {
        payment
      }
    );
    return response.data;
  }

  async createCreditInvoice(invoiceId: string) {
    let response = await this.request(
      'patch',
      `/sales_invoices/${pathValue(invoiceId)}/duplicate_creditinvoice.json`
    );
    return response.data;
  }

  async pauseSalesInvoice(invoiceId: string) {
    let response = await this.request(
      'post',
      `/sales_invoices/${pathValue(invoiceId)}/pause.json`
    );
    return response.data;
  }

  async resumeSalesInvoice(invoiceId: string) {
    let response = await this.request(
      'post',
      `/sales_invoices/${pathValue(invoiceId)}/resume.json`
    );
    return response.data;
  }

  // ─── Recurring Sales Invoices ──────────────────────────────────

  async listRecurringSalesInvoices(params?: {
    page?: number;
    perPage?: number;
    filter?: string;
  }) {
    let response = await this.request('get', '/recurring_sales_invoices.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getRecurringSalesInvoice(recurringInvoiceId: string) {
    let response = await this.request(
      'get',
      `/recurring_sales_invoices/${pathValue(recurringInvoiceId)}.json`
    );
    return response.data;
  }

  async createRecurringSalesInvoice(invoice: Record<string, any>) {
    let response = await this.request('post', '/recurring_sales_invoices.json', {
      recurring_sales_invoice: invoice
    });
    return response.data;
  }

  async updateRecurringSalesInvoice(recurringInvoiceId: string, invoice: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/recurring_sales_invoices/${pathValue(recurringInvoiceId)}.json`,
      { recurring_sales_invoice: invoice }
    );
    return response.data;
  }

  async deleteRecurringSalesInvoice(recurringInvoiceId: string) {
    return this.retire(
      `/recurring_sales_invoices/${pathValue(recurringInvoiceId)}.json`,
      recurringInvoiceId,
      'active'
    );
  }

  // ─── Estimates ─────────────────────────────────────────────────

  async listEstimates(params?: {
    page?: number;
    perPage?: number;
    state?: string;
    period?: string;
    contactId?: string;
  }) {
    let response = await this.request('get', '/estimates.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter:
          [
            params?.state && `state:${params.state}`,
            params?.period && `period:${params.period}`,
            params?.contactId && `contact_id:${params.contactId}`
          ]
            .filter(Boolean)
            .join(',') || undefined
      }
    });
    return response.data;
  }

  async getEstimate(estimateId: string) {
    let response = await this.request('get', `/estimates/${pathValue(estimateId)}.json`);
    return response.data;
  }

  async createEstimate(estimate: Record<string, any>) {
    let response = await this.request('post', '/estimates.json', { estimate });
    return response.data;
  }

  async updateEstimate(estimateId: string, estimate: Record<string, any>) {
    let response = await this.request('patch', `/estimates/${pathValue(estimateId)}.json`, {
      estimate
    });
    return response.data;
  }

  async deleteEstimate(estimateId: string) {
    return this.retire(`/estimates/${pathValue(estimateId)}.json`, estimateId, 'none');
  }

  async sendEstimate(estimateId: string, sendOptions?: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/estimates/${pathValue(estimateId)}/send_estimate.json`,
      {
        estimate_sending: sendOptions || {}
      }
    );
    return response.data;
  }

  async changeEstimateState(estimateId: string, state: string) {
    let response = await this.request(
      'patch',
      `/estimates/${pathValue(estimateId)}/change_state.json`,
      {
        state
      }
    );
    return response.data;
  }

  async billEstimate(estimateId: string) {
    let response = await this.request(
      'patch',
      `/estimates/${pathValue(estimateId)}/bill_estimate.json`
    );
    return response.data;
  }

  // ─── Products ──────────────────────────────────────────────────

  async listProducts(params?: {
    page?: number;
    perPage?: number;
    query?: string;
    currency?: string;
  }) {
    let response = await this.request('get', '/products.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        query: params?.query,
        currency: params?.currency
      }
    });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.request('get', `/products/${pathValue(productId)}.json`);
    return response.data;
  }

  async getProductByIdentifier(identifier: string) {
    let response = await this.request(
      'get',
      `/products/identifier/${pathValue(identifier)}.json`
    );
    if (response.data.identifier !== identifier) throw invalidResponse();
    return response.data;
  }

  async createProduct(product: Record<string, any>) {
    let response = await this.request('post', '/products.json', { product });
    return response.data;
  }

  async updateProduct(productId: string, product: Record<string, any>) {
    let response = await this.request('patch', `/products/${pathValue(productId)}.json`, {
      product
    });
    return response.data;
  }

  async deleteProduct(productId: string) {
    return this.retire(`/products/${pathValue(productId)}.json`, productId, 'none');
  }

  // ─── Ledger Accounts ──────────────────────────────────────────

  async listLedgerAccounts() {
    let response = await this.request('get', '/ledger_accounts.json');
    return response.data;
  }

  async getLedgerAccount(ledgerAccountId: string) {
    let response = await this.request(
      'get',
      `/ledger_accounts/${pathValue(ledgerAccountId)}.json`
    );
    return response.data;
  }

  async createLedgerAccount(ledgerAccount: Record<string, any>) {
    let response = await this.request('post', '/ledger_accounts.json', {
      ledger_account: ledgerAccount
    });
    return response.data;
  }

  async updateLedgerAccount(ledgerAccountId: string, ledgerAccount: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/ledger_accounts/${pathValue(ledgerAccountId)}.json`,
      {
        ledger_account: ledgerAccount
      }
    );
    return response.data;
  }

  async deleteLedgerAccount(ledgerAccountId: string) {
    return this.retire(
      `/ledger_accounts/${pathValue(ledgerAccountId)}.json`,
      ledgerAccountId,
      'active'
    );
  }

  // ─── Tax Rates ─────────────────────────────────────────────────

  async listTaxRates() {
    let response = await this.request('get', '/tax_rates.json');
    return response.data;
  }

  // ─── Time Entries ──────────────────────────────────────────────

  async listTimeEntries(params?: {
    page?: number;
    perPage?: number;
    filter?: string;
    query?: string;
  }) {
    let response = await this.request('get', '/time_entries.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter,
        query: params?.query
      }
    });
    return response.data;
  }

  async getTimeEntry(timeEntryId: string) {
    let response = await this.request('get', `/time_entries/${pathValue(timeEntryId)}.json`);
    return response.data;
  }

  async createTimeEntry(timeEntry: Record<string, any>) {
    let response = await this.request('post', '/time_entries.json', { time_entry: timeEntry });
    return response.data;
  }

  async updateTimeEntry(timeEntryId: string, timeEntry: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/time_entries/${pathValue(timeEntryId)}.json`,
      {
        time_entry: timeEntry
      }
    );
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: string) {
    return this.retire(`/time_entries/${pathValue(timeEntryId)}.json`, timeEntryId, 'none');
  }

  // ─── Projects ──────────────────────────────────────────────────

  async listProjects(params?: { page?: number; perPage?: number; filter?: string }) {
    let response = await this.request('get', '/projects.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.request('get', `/projects/${pathValue(projectId)}.json`);
    return response.data;
  }

  async createProject(project: Record<string, any>) {
    let response = await this.request('post', '/projects.json', { project });
    return response.data;
  }

  async updateProject(projectId: string, project: Record<string, any>) {
    let response = await this.request('patch', `/projects/${pathValue(projectId)}.json`, {
      project
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    return this.retire(`/projects/${pathValue(projectId)}.json`, projectId, 'state');
  }

  // ─── Financial Mutations ───────────────────────────────────────

  async listFinancialMutations(params?: { page?: number; perPage?: number; filter?: string }) {
    let response = await this.request('get', '/financial_mutations.json', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getFinancialMutation(mutationId: string) {
    let response = await this.request(
      'get',
      `/financial_mutations/${pathValue(mutationId)}.json`
    );
    return response.data;
  }

  async linkBooking(mutationId: string, booking: Record<string, any>) {
    let response = await this.request(
      'patch',
      `/financial_mutations/${pathValue(mutationId)}/link_booking.json`,
      booking
    );
    return response.data;
  }

  async unlinkBooking(mutationId: string, booking: Record<string, any>) {
    let response = await this.request(
      'delete',
      `/financial_mutations/${pathValue(mutationId)}/unlink_booking.json`,
      {
        data: booking
      }
    );
    return response.data;
  }
}
