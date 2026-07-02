import { randomUUID } from 'node:crypto';
import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios,
  requestAxiosData
} from 'slates';
import type { FikenAuthOutput } from '../auth';
import { fikenApiError, fikenValidationError } from './errors';

export const FIKEN_API_BASE_URL = 'https://api.fiken.no/api/v2';

export type FikenPagination = {
  page?: number;
  pageSize?: number;
  pageCount?: number;
  resultCount?: number;
  nextPage?: number;
};

export type FikenListResponse<T> = FikenPagination & {
  items: T[];
};

let wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let requestHeaders = () => ({
  'X-Request-ID': randomUUID()
});

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      for (let item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let numberHeader = (headers: unknown, name: string) => {
  let value = getResponseHeaderValue(headers, name);
  if (value === undefined || value === '') return undefined;
  let parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let normalizeList = <T>(
  data: unknown,
  headers: unknown,
  requested: { page?: number; pageSize?: number }
): FikenListResponse<T> => {
  if (!Array.isArray(data)) {
    throw fikenValidationError('Fiken returned an unexpected non-list response.');
  }

  let page = numberHeader(headers, 'Fiken-Api-Page') ?? requested.page;
  let pageSize = numberHeader(headers, 'Fiken-Api-Page-Size') ?? requested.pageSize;
  let pageCount = numberHeader(headers, 'Fiken-Api-Page-Count');
  let resultCount = numberHeader(headers, 'Fiken-Api-Result-Count');
  let nextPage =
    page !== undefined && pageCount !== undefined && page + 1 < pageCount
      ? page + 1
      : page !== undefined &&
          pageCount === undefined &&
          pageSize !== undefined &&
          data.length >= pageSize
        ? page + 1
        : undefined;

  return {
    items: data as T[],
    page,
    pageSize,
    pageCount,
    resultCount,
    nextPage
  };
};

let locationPath = (location: string | undefined) => {
  if (!location) return undefined;

  try {
    let url = new URL(location, FIKEN_API_BASE_URL);
    return url.pathname.replace(/^\/api\/v2/, '') || undefined;
  } catch {
    return undefined;
  }
};

let lastLocationId = (location: string | undefined) => {
  let path = locationPath(location);
  let last = path?.split('/').filter(Boolean).at(-1);
  if (!last) return undefined;
  let parsed = Number(last);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let withPagination = (params: Record<string, unknown>) =>
  pickDefined({
    ...params,
    page: params.page ?? 0,
    pageSize: params.pageSize ?? 25
  });

export class FikenClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private queue = Promise.resolve();
  private lastRequestAt = 0;

  constructor(auth: FikenAuthOutput) {
    this.http = createAuthenticatedAxios({
      baseURL: FIKEN_API_BASE_URL,
      authHeader: {
        value: `Bearer ${auth.token}`
      },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams },
      errorAdapter: error => fikenApiError(error)
    });
  }

  private async enqueue<T>(run: () => Promise<T>) {
    let execute = async () => {
      let elapsed = Date.now() - this.lastRequestAt;
      if (this.lastRequestAt > 0 && elapsed < 275) {
        await wait(275 - elapsed);
      }

      try {
        return await run();
      } finally {
        this.lastRequestAt = Date.now();
      }
    };

    let next = this.queue.then(execute, execute);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private async getList<T>(path: string, params: Record<string, unknown> = {}) {
    let query = withPagination(params);
    let response = await this.enqueue(() =>
      requestAxios<unknown[]>(
        `list ${path}`,
        () => this.http.get(path, { params: query, headers: requestHeaders() }),
        fikenApiError
      )
    );

    return normalizeList<T>(response.data, response.headers, {
      page: typeof query.page === 'number' ? query.page : undefined,
      pageSize: typeof query.pageSize === 'number' ? query.pageSize : undefined
    });
  }

  private async getValue<T>(path: string, params: Record<string, unknown> = {}) {
    return await this.enqueue(() =>
      requestAxiosData<T>(
        `get ${path}`,
        () => this.http.get(path, { params, headers: requestHeaders() }),
        fikenApiError
      )
    );
  }

  private async postAndFetch<T>(path: string, body: Record<string, unknown>) {
    let response = await this.enqueue(() =>
      requestAxios(
        `create ${path}`,
        () => this.http.post(path, body, { headers: requestHeaders() }),
        fikenApiError
      )
    );

    let location = getResponseHeaderValue(response.headers, 'Location');
    let createdPath = locationPath(location);
    let createdId = lastLocationId(location);
    let record = createdPath ? await this.getValue<T>(createdPath) : undefined;

    return {
      id: createdId,
      location,
      record
    };
  }

  async getUser() {
    return await this.getValue<Record<string, unknown>>('/user');
  }

  async listCompanies(params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>('/companies', params);
  }

  async getCompany(companySlug: string) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}`
    );
  }

  async listContacts(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/contacts`,
      params
    );
  }

  async getContact(companySlug: string, contactId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/contacts/${contactId}`
    );
  }

  async createContact(companySlug: string, body: Record<string, unknown>) {
    return await this.postAndFetch<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/contacts`,
      body
    );
  }

  async listInvoices(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/invoices`,
      params
    );
  }

  async getInvoice(companySlug: string, invoiceId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/invoices/${invoiceId}`
    );
  }

  async listInvoiceDrafts(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/invoices/drafts`,
      params
    );
  }

  async getInvoiceDraft(companySlug: string, draftId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/invoices/drafts/${draftId}`
    );
  }

  async createInvoiceDraft(companySlug: string, body: Record<string, unknown>) {
    return await this.postAndFetch<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/invoices/drafts`,
      body
    );
  }

  async listProducts(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/products`,
      params
    );
  }

  async getProduct(companySlug: string, productId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/products/${productId}`
    );
  }

  async createProduct(companySlug: string, body: Record<string, unknown>) {
    return await this.postAndFetch<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/products`,
      body
    );
  }

  async listProjects(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/projects`,
      params
    );
  }

  async getProject(companySlug: string, projectId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/projects/${projectId}`
    );
  }

  async createProject(companySlug: string, body: Record<string, unknown>) {
    return await this.postAndFetch<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/projects`,
      body
    );
  }

  async listPurchases(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/purchases`,
      params
    );
  }

  async getPurchase(companySlug: string, purchaseId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/purchases/${purchaseId}`
    );
  }

  async listSales(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/sales`,
      params
    );
  }

  async getSale(companySlug: string, saleId: number) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/sales/${saleId}`
    );
  }

  async listAccounts(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/accounts`,
      params
    );
  }

  async getAccount(companySlug: string, accountCode: string) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/accounts/${encodeURIComponent(accountCode)}`
    );
  }

  async listAccountBalances(companySlug: string, params: Record<string, unknown>) {
    return await this.getList<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/accountBalances`,
      params
    );
  }

  async getAccountBalance(companySlug: string, accountCode: string, date: string) {
    return await this.getValue<Record<string, unknown>>(
      `/companies/${encodeURIComponent(companySlug)}/accountBalances/${encodeURIComponent(accountCode)}`,
      { date }
    );
  }
}
