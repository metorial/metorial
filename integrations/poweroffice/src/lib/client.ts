import { randomUUID } from 'node:crypto';
import {
  createAuthenticatedAxios,
  createAxios,
  getBase64ByteLength,
  getOAuthExpiresAtFromExpiresIn,
  getResponseHeaderValue,
  normalizeOAuthTokenResponse,
  requestAxios,
  requestAxiosData,
  setIfDefined
} from 'slates';
import { powerOfficeApiError, powerOfficeValidationError } from './errors';

export type PowerOfficeEnvironment = 'demo' | 'production';

export type PowerOfficeAuthInput = {
  environment: PowerOfficeEnvironment;
  appKey: string;
  clientKey: string;
  subscriptionKey: string;
};

export type PowerOfficeAuthOutput = {
  token: string;
  expiresAt?: string;
  tokenType?: string;
  environment: PowerOfficeEnvironment;
  subscriptionKey: string;
};

export type JsonPatchOperation = {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: unknown;
};

const environmentUrls = {
  demo: {
    tokenUrl: 'https://goapi.poweroffice.net/Demo/OAuth/Token',
    baseUrl: 'https://goapi.poweroffice.net/Demo/v2'
  },
  production: {
    tokenUrl: 'https://goapi.poweroffice.net/OAuth/Token',
    baseUrl: 'https://goapi.poweroffice.net/v2'
  }
} satisfies Record<PowerOfficeEnvironment, { tokenUrl: string; baseUrl: string }>;

export let getPowerOfficeBaseUrl = (environment: PowerOfficeEnvironment) =>
  environmentUrls[environment].baseUrl;

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      let joined = value
        .filter(item => item !== undefined && item !== null && item !== '')
        .join(',');
      if (joined) search.append(key, joined);
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let tokenHttp = createAxios();

export let exchangePowerOfficeClientCredentials = async (
  input: PowerOfficeAuthInput,
  operation = 'exchange client credentials'
): Promise<PowerOfficeAuthOutput> => {
  let urls = environmentUrls[input.environment];
  let credentials = Buffer.from(`${input.appKey}:${input.clientKey}`).toString('base64');
  let body = new URLSearchParams({ grant_type: 'client_credentials' });

  try {
    let response = await tokenHttp.post(urls.tokenUrl, body.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Ocp-Apim-Subscription-Key': input.subscriptionKey
      }
    });

    let token = normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'PowerOffice',
      operation,
      required: true
    });

    return {
      token: token.token,
      expiresAt:
        token.expiresAt ??
        getOAuthExpiresAtFromExpiresIn(1200, {
          providerLabel: 'PowerOffice',
          operation
        }),
      tokenType:
        response.data && typeof response.data === 'object' && 'token_type' in response.data
          ? String(response.data.token_type)
          : undefined,
      environment: input.environment,
      subscriptionKey: input.subscriptionKey
    };
  } catch (error) {
    throw powerOfficeApiError(error, operation);
  }
};

export let compact = <T extends Record<string, unknown>>(value: T) => {
  let result: Record<string, unknown> = {};

  for (let [key, child] of Object.entries(value)) {
    if (child !== undefined) result[key] = child;
  }

  return result;
};

export let buildPatch = (body: Record<string, unknown>): JsonPatchOperation[] =>
  Object.entries(body)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      op: 'replace',
      path: `/${key}`,
      value
    }));

let sanitizeMultipartHeader = (value: string) => value.replace(/["\r\n]/g, '_');

let buildMultipartFileBody = (params: {
  fieldName: string;
  filename: string;
  mimeType: string;
  content: Buffer;
}) => {
  let boundary = `slates-poweroffice-${randomUUID()}`;
  let prefix = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="${sanitizeMultipartHeader(params.fieldName)}"; filename="${sanitizeMultipartHeader(params.filename)}"`,
      `Content-Type: ${sanitizeMultipartHeader(params.mimeType)}`,
      '',
      ''
    ].join('\r\n')
  );
  let suffix = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    body: Buffer.concat([prefix, params.content, suffix]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

export class PowerOfficeClient {
  private http;

  constructor(auth: PowerOfficeAuthOutput) {
    this.http = createAuthenticatedAxios({
      baseURL: getPowerOfficeBaseUrl(auth.environment),
      authHeader: { value: `Bearer ${auth.token}` },
      headers: {
        'Ocp-Apim-Subscription-Key': auth.subscriptionKey
      },
      paramsSerializer: { serialize: serializeParams }
    });
  }

  private getData<T>(operation: string, path: string, params?: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => this.http.get(path, { params }),
      powerOfficeApiError
    );
  }

  private async getArrayData<T>(
    operation: string,
    path: string,
    params?: Record<string, unknown>
  ) {
    let data = await this.getData<T[] | '' | null | undefined>(operation, path, params);
    if (data === undefined || data === null || data === '') return [];
    if (Array.isArray(data)) return data;
    throw powerOfficeValidationError(`PowerOffice ${operation} did not return a list.`);
  }

  private postData<T>(operation: string, path: string, body?: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => this.http.post(path, body ?? {}),
      powerOfficeApiError
    );
  }

  private patchJson<T>(operation: string, path: string, patch: JsonPatchOperation[]) {
    if (patch.length === 0) {
      throw powerOfficeValidationError('Provide at least one field to update.');
    }

    return requestAxiosData<T>(
      operation,
      () =>
        this.http.patch(path, patch, {
          headers: {
            'Content-Type': 'application/json-patch+json'
          }
        }),
      powerOfficeApiError
    );
  }

  async getClientIntegrationInfo() {
    return this.getData<Record<string, unknown>>(
      'get client integration information',
      '/ClientIntegrationInformation'
    );
  }

  async listCustomers(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list customers', '/Customers', params);
  }

  async createCustomer(body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>('create customer', '/Customers', body);
  }

  async updateCustomer(id: number, patch: JsonPatchOperation[]) {
    return this.patchJson<Record<string, unknown>>(
      'update customer',
      `/Customers/${id}`,
      patch
    );
  }

  async listSuppliers(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list suppliers', '/Suppliers', params);
  }

  async getSupplier(id: number) {
    return this.getData<Record<string, unknown>>('get supplier', `/Suppliers/${id}`);
  }

  async createSupplier(body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>('create supplier', '/Suppliers', body);
  }

  async updateSupplier(id: number, patch: JsonPatchOperation[]) {
    return this.patchJson<Record<string, unknown>>(
      'update supplier',
      `/Suppliers/${id}`,
      patch
    );
  }

  async listProducts(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list products', '/Products', params);
  }

  async createProduct(body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>('create product', '/Products', body);
  }

  async updateProduct(id: number, patch: JsonPatchOperation[]) {
    return this.patchJson<Record<string, unknown>>('update product', `/Products/${id}`, patch);
  }

  async listSalesOrders(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list sales orders',
      '/SalesOrders',
      params
    );
  }

  async getSalesOrder(id: string, params?: Record<string, unknown>) {
    return this.getData<Record<string, unknown>>(
      'get sales order',
      `/SalesOrders/${encodeURIComponent(id)}/Complete`,
      params
    );
  }

  async createSalesOrder(body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'create sales order',
      '/SalesOrders/Complete',
      body
    );
  }

  async listSalesOrderLines(id: string, params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list sales order lines',
      `/SalesOrders/${encodeURIComponent(id)}/Lines`,
      params
    );
  }

  async createSalesOrderLine(id: string, body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'create sales order line',
      `/SalesOrders/${encodeURIComponent(id)}/Lines`,
      body
    );
  }

  async updateSalesOrderLine(id: string, lineId: string, patch: JsonPatchOperation[]) {
    return this.patchJson<Record<string, unknown>>(
      'update sales order line',
      `/SalesOrders/${encodeURIComponent(id)}/Lines/${encodeURIComponent(lineId)}`,
      patch
    );
  }

  async deleteSalesOrderLine(id: string, lineId: string) {
    await requestAxios(
      'delete sales order line',
      () =>
        this.http.delete(
          `/SalesOrders/${encodeURIComponent(id)}/Lines/${encodeURIComponent(lineId)}`
        ),
      powerOfficeApiError
    );
  }

  async sendSalesOrderInvoice(id: string, body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'send sales order invoice',
      `/SalesOrders/${encodeURIComponent(id)}/CreateAndSendInvoice`,
      body
    );
  }

  async listSalesOrderSentState(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list sales order sent states',
      '/SalesOrders/SentState',
      params
    );
  }

  async listSalesOrderAttachments(id: string, params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list sales order attachments',
      `/SalesOrders/${encodeURIComponent(id)}/attachments`,
      params
    );
  }

  async downloadSalesOrderAttachment(params: {
    salesOrderId: string;
    attachmentId: number;
    filename?: string;
  }) {
    let response = await requestAxios(
      'download sales order attachment',
      () =>
        this.http.get(
          `/SalesOrders/${encodeURIComponent(params.salesOrderId)}/attachments/${params.attachmentId}`,
          {
            responseType: 'arraybuffer'
          }
        ),
      powerOfficeApiError
    );

    let contentType =
      getResponseHeaderValue(response.headers, 'content-type') ?? 'application/octet-stream';
    let disposition = getResponseHeaderValue(response.headers, 'content-disposition');
    let dispositionFilename = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];
    let filename =
      params.filename ??
      (dispositionFilename ? decodeURIComponent(dispositionFilename) : undefined) ??
      `poweroffice-sales-order-${params.salesOrderId}-attachment-${params.attachmentId}`;
    let buffer = Buffer.from(response.data);
    if (buffer.byteLength === 0) {
      throw powerOfficeValidationError(
        'PowerOffice returned an empty sales order attachment.'
      );
    }

    let contentBase64 = buffer.toString('base64');

    return {
      filename,
      mimeType: contentType,
      sizeBytes: getBase64ByteLength(contentBase64),
      contentBase64
    };
  }

  async listOutgoingInvoices(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list outgoing invoices',
      '/OutgoingInvoices',
      params
    );
  }

  async getOutgoingInvoice(id: string) {
    return this.getData<Record<string, unknown>>(
      'get outgoing invoice',
      `/OutgoingInvoices/${encodeURIComponent(id)}`
    );
  }

  async getOutgoingInvoiceLines(id: string, params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'get outgoing invoice lines',
      `/OutgoingInvoices/${encodeURIComponent(id)}/Lines`,
      params
    );
  }

  async listIncomingInvoices(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list incoming invoices',
      '/IncomingInvoices',
      params
    );
  }

  async getIncomingInvoice(id: string) {
    return this.getData<Record<string, unknown>>(
      'get incoming invoice',
      `/IncomingInvoices/${encodeURIComponent(id)}`
    );
  }

  async listAccountTransactions(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list account transactions',
      '/AccountTransactions',
      params
    );
  }

  async listGeneralLedgerAccounts(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list general ledger accounts',
      '/GeneralLedgerAccounts',
      params
    );
  }

  async listVatCodes(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list VAT codes', '/VatCodes', params);
  }

  async listCurrencies(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list currencies',
      '/Currencies',
      params
    );
  }

  async getCurrencyRate(params: Record<string, unknown>) {
    return this.getData<Record<string, unknown>>(
      'get currency rate',
      '/CurrencyRates',
      params
    );
  }

  async getFinancialSettings() {
    return this.getData<Record<string, unknown>>(
      'get financial settings',
      '/FinancialSettings'
    );
  }

  async listPaymentTerms(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list payment terms',
      '/PaymentTerms',
      params
    );
  }

  async listDeliveryTerms(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list delivery terms',
      '/DeliveryTerms',
      params
    );
  }

  async listBrandingThemes(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list branding themes',
      '/BrandingThemes',
      params
    );
  }

  async getTrialBalance(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'get trial balance',
      '/TrialBalance',
      params
    );
  }

  async listCustomerLedger(path: string, params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list customer ledger',
      `/Customerledger/${path}`,
      params
    );
  }

  async listSupplierLedger(path: string, params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list supplier ledger',
      `/Supplierledger/${path}`,
      params
    );
  }

  async listProjects(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list projects', '/Projects', params);
  }

  async listDepartments(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list departments',
      '/Departments',
      params
    );
  }

  async listLocations(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>('list locations', '/Locations', params);
  }

  async listCustomDimensionSettings() {
    return this.getArrayData<Record<string, unknown>>(
      'list custom dimension settings',
      '/CustomDimensionSettings'
    );
  }

  async listCustomDimensions(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list custom dimensions',
      '/CustomDimensions',
      params
    );
  }

  async listVoucherDocumentation(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list voucher documentation',
      '/VoucherDocumentation',
      params
    );
  }

  async downloadVoucherDocumentation(params: {
    id: string;
    documentationType?: string;
    filename?: string;
  }) {
    let response = await requestAxios(
      'download voucher documentation',
      () =>
        this.http.get('/VoucherDocumentation/Download', {
          params: {
            id: params.id,
            documentationType: params.documentationType
          },
          responseType: 'arraybuffer'
        }),
      powerOfficeApiError
    );

    if (response.status === 204) {
      throw powerOfficeValidationError(
        'PowerOffice did not return voucher documentation for this voucher id and documentation type.'
      );
    }

    let contentType =
      getResponseHeaderValue(response.headers, 'content-type') ?? 'application/octet-stream';
    let disposition = getResponseHeaderValue(response.headers, 'content-disposition');
    let dispositionFilename = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];
    let filename =
      params.filename ??
      (dispositionFilename ? decodeURIComponent(dispositionFilename) : undefined) ??
      `poweroffice-voucher-${params.id}`;
    let buffer = Buffer.from(response.data);
    if (buffer.byteLength === 0) {
      throw powerOfficeValidationError(
        'PowerOffice returned an empty voucher documentation download.'
      );
    }

    let contentBase64 = buffer.toString('base64');

    return {
      filename,
      mimeType: contentType,
      sizeBytes: getBase64ByteLength(contentBase64),
      contentBase64
    };
  }

  async listJournalEntryVouchers(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list journal entry vouchers',
      '/JournalEntryVouchers',
      params
    );
  }

  async createSupplierInvoiceJournalEntryVoucher(body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'create supplier invoice journal entry voucher',
      '/JournalEntryVouchers/SupplierInvoices',
      body
    );
  }

  async getSupplierInvoiceJournalEntryVoucher(id: string) {
    return this.getData<Record<string, unknown>>(
      'get supplier invoice journal entry voucher',
      `/JournalEntryVouchers/SupplierInvoices/${encodeURIComponent(id)}`
    );
  }

  async submitJournalEntryVoucherForApproval(id: string, body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'submit journal entry voucher for approval',
      `/JournalEntryVouchers/${encodeURIComponent(id)}/submitForApproval`,
      body
    );
  }

  async uploadJournalEntryVoucherPage(params: {
    voucherId: string;
    filename: string;
    mimeType: string;
    contentBase64: string;
  }) {
    let buffer = Buffer.from(params.contentBase64, 'base64');
    if (buffer.byteLength === 0) {
      throw powerOfficeValidationError('Provide non-empty voucher page contentBase64.');
    }

    let form = buildMultipartFileBody({
      fieldName: 'file',
      filename: params.filename,
      mimeType: params.mimeType,
      content: buffer
    });

    await requestAxios(
      'upload journal entry voucher page',
      () =>
        this.http.post(
          `/JournalEntryVouchers/${encodeURIComponent(params.voucherId)}/VoucherPages`,
          form.body,
          {
            headers: {
              'Content-Type': form.contentType
            }
          }
        ),
      powerOfficeApiError
    );

    return {
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: buffer.byteLength
    };
  }

  async listVoucherApprovals(params: Record<string, unknown>) {
    return this.getArrayData<Record<string, unknown>>(
      'list voucher approvals',
      '/VoucherApproval',
      params
    );
  }

  async updateVoucherApproval(voucherId: string, body: Record<string, unknown>) {
    return this.postData<Record<string, unknown>>(
      'update voucher approval',
      `/VoucherApproval/${encodeURIComponent(voucherId)}`,
      body
    );
  }
}

export let paginationParams = (input: {
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
  orderBy?: string;
  useDatabaseValidation?: boolean;
}) =>
  compact({
    Fields: input.fields,
    OrderBy: input.orderBy,
    PageNumber: input.pageNumber ?? 1,
    PageSize: input.pageSize ?? 1000,
    UseDatabaseValidation: input.useDatabaseValidation
  });

export let addDateRange = (
  params: Record<string, unknown>,
  input: { fromDate?: string; toDate?: string }
) => {
  setIfDefined(params, 'fromDate', input.fromDate);
  setIfDefined(params, 'toDate', input.toDate);
  return params;
};
