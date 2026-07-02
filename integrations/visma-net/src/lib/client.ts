import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';
import { vismaNetApiError } from './errors';

let DEFAULT_BASE_URL = 'https://api.finance.visma.net';

export type BackgroundMode = 'sync' | 'background';

export type BackgroundOperation = {
  id?: string;
  stateLocation?: string;
};

export type VismaNetJsonResult<T> = {
  data?: T;
  eTag?: string;
  backgroundOperation?: BackgroundOperation;
};

export type VismaNetFileResult = {
  body?: string;
  byteLength?: number;
  mimeType?: string;
  fileName?: string;
  eTag?: string;
  backgroundOperation?: BackgroundOperation;
};

type RequestOptions = {
  backgroundMode?: BackgroundMode;
};

export let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let toBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value);
  return Buffer.from(JSON.stringify(value ?? null));
};

let parseRecordBody = (data: unknown) => {
  let text =
    Buffer.isBuffer(data) ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    typeof data === 'string'
      ? toBuffer(data).toString('utf8').trim()
      : undefined;

  if (!text) {
    return isRecord(data) ? data : undefined;
  }

  try {
    let parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export let normalizeBackgroundOperation = (data: unknown): BackgroundOperation | undefined => {
  let record = parseRecordBody(data);
  if (!record) return undefined;

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    stateLocation: typeof record.stateLocation === 'string' ? record.stateLocation : undefined
  };
};

let getRequestHeaders = (options?: RequestOptions) => {
  if (options?.backgroundMode !== 'background') {
    return undefined;
  }

  return {
    'erp-api-background': 'none'
  };
};

export let serializeVismaNetParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (let item of value) {
        if (item !== undefined && item !== null) {
          search.append(key, String(item));
        }
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

export class VismaNetClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; baseUrl?: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: params.baseUrl ?? DEFAULT_BASE_URL,
      authHeader: {
        value: `Bearer ${params.token}`
      },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: {
        serialize: serializeVismaNetParams
      }
    });
  }

  async requestJson<T>(
    operation: string,
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<VismaNetJsonResult<T>> {
    let response = await requestAxios<T>(
      operation,
      () =>
        this.http.get(path, {
          params: pickDefined(params ?? {}),
          headers: getRequestHeaders(options)
        }),
      vismaNetApiError
    );

    if (response.status === 202) {
      return {
        backgroundOperation: normalizeBackgroundOperation(response.data) ?? {}
      };
    }

    return {
      data: response.data,
      eTag: getResponseHeaderValue(response.headers, 'etag')
    };
  }

  async requestFile(
    operation: string,
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<VismaNetFileResult> {
    let response = await requestAxios<ArrayBuffer>(
      operation,
      () =>
        this.http.get(path, {
          params: pickDefined(params ?? {}),
          headers: getRequestHeaders(options),
          responseType: 'arraybuffer'
        }),
      vismaNetApiError
    );

    if (response.status === 202) {
      return {
        backgroundOperation: normalizeBackgroundOperation(response.data) ?? {}
      };
    }

    let buffer = toBuffer(response.data);
    let contentDisposition = getResponseHeaderValue(response.headers, 'content-disposition');
    let fileName = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];

    return {
      body: buffer.toString('base64'),
      byteLength: buffer.byteLength,
      mimeType:
        getResponseHeaderValue(response.headers, 'content-type') ?? 'application/octet-stream',
      fileName: fileName ? decodeURIComponent(fileName) : undefined,
      eTag: getResponseHeaderValue(response.headers, 'etag')
    };
  }

  listCustomers(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>('list customers', '/v1/customer', params, options);
  }

  getCustomer(customerCd: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get customer',
      `/v1/customer/${encodeURIComponent(customerCd)}`,
      undefined,
      options
    );
  }

  listSuppliers(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>('list suppliers', '/v1/supplier', params, options);
  }

  getSupplier(supplierCd: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get supplier',
      `/v1/supplier/${encodeURIComponent(supplierCd)}`,
      undefined,
      options
    );
  }

  listAccounts(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>('list accounts', '/v1/account', params, options);
  }

  getAccount(accountCd: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get account',
      `/v1/account/${encodeURIComponent(accountCd)}`,
      undefined,
      options
    );
  }

  listCustomerInvoices(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>(
      'list customer invoices',
      '/v1/customerinvoice',
      params,
      options
    );
  }

  getCustomerInvoice(invoiceNumber: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get customer invoice',
      `/v1/customerinvoice/${encodeURIComponent(invoiceNumber)}`,
      undefined,
      options
    );
  }

  listSupplierInvoices(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>(
      'list supplier invoices',
      '/v1/supplierInvoice',
      params,
      options
    );
  }

  getSupplierInvoice(
    invoiceNumber: string,
    documentType?: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ) {
    let path = documentType
      ? `/v1/supplierInvoice/${encodeURIComponent(documentType)}/${encodeURIComponent(invoiceNumber)}`
      : `/v1/supplierInvoice/${encodeURIComponent(invoiceNumber)}`;

    return this.requestJson<Record<string, unknown>>(
      'get supplier invoice',
      path,
      params,
      options
    );
  }

  listProjects(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>('list projects', '/v1/project', params, options);
  }

  getProject(projectId: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get project',
      `/v1/project/${encodeURIComponent(projectId)}`,
      undefined,
      options
    );
  }

  listInventoryItems(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>(
      'list inventory items',
      '/v1/inventory',
      params,
      options
    );
  }

  getInventoryItem(inventoryNumber: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get inventory item',
      `/v1/inventory/${encodeURIComponent(inventoryNumber)}`,
      undefined,
      options
    );
  }

  listSalesOrders(params: Record<string, unknown>, options?: RequestOptions) {
    return this.requestJson<unknown[]>('list sales orders', '/v2/salesorder', params, options);
  }

  getSalesOrder(orderNumber: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get sales order',
      `/v2/salesorder/${encodeURIComponent(orderNumber)}`,
      undefined,
      options
    );
  }

  downloadAttachment(attachmentId: string, options?: RequestOptions) {
    return this.requestFile(
      'download attachment',
      `/v1/attachment/${encodeURIComponent(attachmentId)}`,
      undefined,
      options
    );
  }

  downloadBlob(blobId: string, options?: RequestOptions) {
    return this.requestFile(
      'download blob',
      `/v1/blob/download/${encodeURIComponent(blobId)}`,
      undefined,
      options
    );
  }

  getBlobMetadata(blobId: string, options?: RequestOptions) {
    return this.requestJson<Record<string, unknown>>(
      'get blob metadata',
      `/v1/blob/metadata/${encodeURIComponent(blobId)}`,
      undefined,
      options
    );
  }

  getBackgroundOperation(requestId: string) {
    return this.requestJson<Record<string, unknown>>(
      'get background operation',
      `/v1/background/${encodeURIComponent(requestId)}`
    );
  }

  getBackgroundContent(requestId: string) {
    return this.requestFile(
      'download background operation content',
      `/v1/background/${encodeURIComponent(requestId)}/content`
    );
  }
}
