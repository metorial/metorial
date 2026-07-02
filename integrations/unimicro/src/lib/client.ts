import {
  createAuthenticatedAxios,
  createAxios,
  getApiErrorStatus,
  getBase64ByteLength,
  getResponseHeaderValue,
  pickDefined,
  requestAxios,
  requestAxiosData
} from 'slates';
import type { UnimicroConfig, UnimicroEnvironment } from '../config';
import { unimicroApiError, unimicroValidationError } from './errors';

export type UnimicroAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  grantedScopes?: string[];
  environment: UnimicroEnvironment;
  appFrameworkUrl?: string;
  identityUrl?: string;
  filesUrl?: string;
};

export type UnimicroEndpoints = {
  appFrameworkUrl?: string;
  identityUrl?: string;
  filesUrl?: string;
};

export let defaultEndpoints = {
  test: {
    appFrameworkUrl: 'https://test.unimicro.no/',
    identityUrl: 'https://test-login.unimicro.no/',
    filesUrl: 'https://test-files.unimicro.no/'
  },
  unimicro: {
    appFrameworkUrl: 'https://app.unimicro.no/',
    identityUrl: 'https://login.unimicro.no/',
    filesUrl: 'https://files.unimicro.no/'
  }
} satisfies Record<Exclude<UnimicroEnvironment, 'custom'>, Required<UnimicroEndpoints>>;

export let trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
let ensureTrailingSlash = (value: string) => `${trimTrailingSlash(value)}/`;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let endpointValue = (value: unknown) =>
  typeof value === 'string' && value.trim() ? ensureTrailingSlash(value.trim()) : undefined;

let baseEndpointDefaults = (config: Partial<UnimicroConfig>): UnimicroEndpoints => {
  if (config.environment === 'test' || config.environment === 'unimicro') {
    return defaultEndpoints[config.environment];
  }

  return {
    appFrameworkUrl: endpointValue(config.customAppFrameworkUrl),
    identityUrl: endpointValue(config.customIdentityUrl),
    filesUrl: endpointValue(config.customFilesUrl)
  };
};

let endpointHttp = createAxios({
  headers: {
    Accept: 'application/json'
  }
});

export let discoverUnimicroEndpoints = async (
  config: Partial<UnimicroConfig>
): Promise<UnimicroEndpoints> => {
  let defaults = baseEndpointDefaults(config);

  if (!defaults.appFrameworkUrl) {
    return defaults;
  }

  try {
    let response = await requestAxios<Record<string, unknown>>(
      'discover UniMicro endpoints',
      () => endpointHttp.get(`${trimTrailingSlash(defaults.appFrameworkUrl!)}/api/endpoints`),
      unimicroApiError
    );
    let data = isRecord(response.data) ? response.data : {};

    return {
      appFrameworkUrl: endpointValue(data.AppFramework) ?? defaults.appFrameworkUrl,
      identityUrl: endpointValue(data.Identity) ?? defaults.identityUrl,
      filesUrl: endpointValue(data.Files) ?? defaults.filesUrl
    };
  } catch (error) {
    if (defaults.identityUrl || defaults.filesUrl) return defaults;
    throw error;
  }
};

export let resolveAuthEndpoints = async (config: Partial<UnimicroConfig>) => {
  let endpoints = await discoverUnimicroEndpoints(config);

  if (!endpoints.identityUrl) {
    throw unimicroValidationError(
      'UniMicro identity URL is required. Set environment to test/unimicro or provide customIdentityUrl.'
    );
  }

  if (!endpoints.appFrameworkUrl) {
    throw unimicroValidationError(
      'UniMicro AppFramework URL is required. Set environment to test/unimicro or provide customAppFrameworkUrl.'
    );
  }

  return endpoints as Required<Pick<UnimicroEndpoints, 'appFrameworkUrl' | 'identityUrl'>> &
    UnimicroEndpoints;
};

export let resolveToolEndpoints = (
  config: Partial<UnimicroConfig>,
  auth: Partial<UnimicroAuthOutput>
) => {
  let defaults = baseEndpointDefaults(config);
  let appFrameworkUrl =
    endpointValue(config.customAppFrameworkUrl) ??
    endpointValue(auth.appFrameworkUrl) ??
    defaults.appFrameworkUrl;
  let filesUrl =
    endpointValue(config.customFilesUrl) ?? endpointValue(auth.filesUrl) ?? defaults.filesUrl;

  if (!appFrameworkUrl) {
    throw unimicroValidationError(
      'UniMicro AppFramework URL is required for API calls. Configure a standard environment or customAppFrameworkUrl.'
    );
  }

  return {
    appFrameworkUrl,
    filesUrl
  };
};

export let extractJwtStringClaim = (token: string, claim: string) => {
  let [, payload] = token.split('.');
  if (!payload) return undefined;

  try {
    let normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    let parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
    let value = isRecord(parsed) ? parsed[claim] : undefined;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
};

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      let joined = value
        .filter(child => child !== undefined && child !== null && child !== '')
        .join(',');
      if (joined) search.append(key, joined);
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let retryDelay = (attempt: number) =>
  new Promise(resolve => setTimeout(resolve, attempt * 500));

let isRetryable = (error: unknown) => {
  let status = getApiErrorStatus(error);
  if (status === 408 || status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  if (isRecord(error) && typeof error.code === 'string') {
    return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code);
  }
  return false;
};

let toBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  return Buffer.from(JSON.stringify(value ?? null));
};

let contentDispositionFileName = (value: string | undefined) => {
  let match = value?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

export let compact = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== undefined)
  ) as Partial<T>;

export let escapeFilterString = (value: string) => value.replace(/'/g, "''");

export let combineFilters = (...filters: (string | undefined)[]) => {
  let active = filters.filter((filter): filter is string => Boolean(filter?.trim()));
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return active.map(filter => `(${filter})`).join(' and ');
};

let listFromResponse = <T>(value: unknown, operation: string) => {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value) && Array.isArray(value.Items)) return value.Items as T[];
  if (isRecord(value) && Array.isArray(value.Value)) return value.Value as T[];
  if (value === null || value === undefined) return [];

  throw unimicroValidationError(`UniMicro ${operation} did not return a list.`);
};

let companyListFromResponse = (value: unknown) => {
  if (isRecord(value) && (value.Key ?? value.CompanyKey ?? value.ID ?? value.Name)) {
    return [value];
  }

  return listFromResponse<Record<string, unknown>>(value, 'list companies');
};

export type ListQueryInput = {
  top?: number;
  skip?: number;
  filter?: string;
  select?: string;
  expand?: string;
};

export let listParams = (
  input: ListQueryInput,
  defaults: { top?: number; filter?: string } = {}
) =>
  pickDefined({
    top: input.top ?? defaults.top ?? 50,
    skip: input.skip,
    filter: combineFilters(input.filter, defaults.filter),
    select: input.select,
    expand: input.expand
  });

export let pageInfo = (input: ListQueryInput, count: number, defaultTop = 50) => {
  let top = input.top ?? defaultTop;
  let skip = input.skip ?? 0;

  return {
    top,
    skip,
    count,
    nextSkip: count >= top ? skip + count : undefined
  };
};

export class UnimicroClient {
  private appFrameworkUrl: string;
  private filesUrl?: string;
  private token: string;
  private companyKey?: string;
  private bizHttp;
  private platformHttp;
  private filesHttp;

  constructor(params: {
    auth: UnimicroAuthOutput;
    config: Partial<UnimicroConfig>;
    companyKey?: string;
  }) {
    let endpoints = resolveToolEndpoints(params.config, params.auth);
    this.appFrameworkUrl = endpoints.appFrameworkUrl;
    this.filesUrl = endpoints.filesUrl;
    this.token = params.auth.token;
    this.companyKey = params.companyKey ?? params.config.companyKey;

    this.bizHttp = createAuthenticatedAxios({
      baseURL: `${trimTrailingSlash(this.appFrameworkUrl)}/api/biz`,
      authHeader: { value: `Bearer ${this.token}` },
      headers: this.companyKey
        ? {
            Accept: 'application/json',
            CompanyKey: this.companyKey
          }
        : {
            Accept: 'application/json'
          },
      paramsSerializer: { serialize: serializeParams }
    });

    this.platformHttp = createAuthenticatedAxios({
      baseURL: trimTrailingSlash(this.appFrameworkUrl),
      authHeader: { value: `Bearer ${this.token}` },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams }
    });

    this.filesHttp = this.filesUrl
      ? createAuthenticatedAxios({
          baseURL: trimTrailingSlash(this.filesUrl),
          authHeader: { value: `Bearer ${this.token}` },
          paramsSerializer: { serialize: serializeParams }
        })
      : undefined;
  }

  private requireCompanyKey() {
    if (!this.companyKey) {
      throw unimicroValidationError(
        'UniMicro CompanyKey is required for this tool. Provide companyKey in the tool input or integration config.'
      );
    }

    return this.companyKey;
  }

  private async withRetries<T>(request: () => Promise<T>) {
    let attempt = 0;

    while (true) {
      try {
        return await request();
      } catch (error) {
        attempt += 1;
        if (attempt >= 3 || !isRetryable(error)) throw error;
        await retryDelay(attempt);
      }
    }
  }

  private requestData<T>(operation: string, request: () => Promise<any>) {
    return requestAxiosData<T>(operation, () => this.withRetries(request), unimicroApiError);
  }

  private requestResponse<T>(operation: string, request: () => Promise<any>) {
    return requestAxios<T>(operation, () => this.withRetries(request), unimicroApiError);
  }

  private async getArray<T>(
    operation: string,
    path: string,
    params?: Record<string, unknown>
  ) {
    this.requireCompanyKey();
    let data = await this.requestData<unknown>(operation, () =>
      this.bizHttp.get(path, { params })
    );

    return listFromResponse<T>(data, operation);
  }

  private getRecord<T extends Record<string, unknown>>(
    operation: string,
    path: string,
    params?: Record<string, unknown>
  ) {
    this.requireCompanyKey();
    return this.requestData<T>(operation, () => this.bizHttp.get(path, { params }));
  }

  async listCompanies() {
    let data = await this.requestData<unknown>('list companies', () =>
      this.platformHttp.get('/api/init/companies')
    );

    return companyListFromResponse(data);
  }

  listCustomers(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>('list customers', '/customers', params);
  }

  getCustomer(id: number, params?: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>('get customer', `/customers/${id}`, params);
  }

  listSuppliers(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>('list suppliers', '/suppliers', params);
  }

  listCustomerInvoices(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>(
      'list customer invoices',
      '/invoices',
      params
    );
  }

  getCustomerInvoice(id: number, params?: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>(
      'get customer invoice',
      `/invoices/${id}`,
      params
    );
  }

  listSupplierInvoices(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>(
      'list supplier invoices',
      '/supplierinvoices',
      params
    );
  }

  getSupplierInvoice(id: number, params?: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>(
      'get supplier invoice',
      `/supplierinvoices/${id}`,
      params
    );
  }

  listProducts(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>('list products', '/products', params);
  }

  listAccounts(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>('list accounts', '/accounts', params);
  }

  listJournalEntries(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>(
      'list journal entries',
      '/journalentries',
      params
    );
  }

  listProjects(params: Record<string, unknown>) {
    return this.getArray<Record<string, unknown>>('list projects', '/projects', params);
  }

  getProfitAndLoss(params: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>(
      'get profit and loss',
      '/accounts?action=profit-and-loss-periodical',
      params
    );
  }

  getBalanceSheet(params: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>(
      'get balance sheet',
      '/accounts?action=balance',
      params
    );
  }

  getTrialBalance(params: Record<string, unknown>) {
    return this.getRecord<Record<string, unknown>>(
      'get trial balance',
      '/accounts?action=trialbalance',
      params
    );
  }

  getFile(id: number) {
    return this.getRecord<Record<string, unknown>>('get file metadata', `/files/${id}`);
  }

  async downloadFile(params: {
    fileId?: number;
    storageReference?: string;
    fileName?: string;
    mimeType?: string;
  }) {
    let companyKey = this.requireCompanyKey();
    let file = params.fileId ? await this.getFile(params.fileId) : undefined;
    let storageReference =
      params.storageReference ??
      (file && typeof file.StorageReference === 'string' ? file.StorageReference : undefined);

    if (!storageReference) {
      throw unimicroValidationError(
        'Provide storageReference or a fileId with StorageReference.'
      );
    }

    if (!this.filesHttp) {
      throw unimicroValidationError(
        'UniMicro files URL is required to download files. Configure a standard environment or customFilesUrl.'
      );
    }

    let response = await this.requestResponse<ArrayBuffer>('download file', () =>
      this.filesHttp!.get('/api/download', {
        params: {
          id: storageReference,
          key: companyKey,
          token: this.token
        },
        responseType: 'arraybuffer'
      })
    );
    let buffer = toBuffer(response.data);
    let headerMimeType = getResponseHeaderValue(response.headers, 'content-type');
    let headerFileName = contentDispositionFileName(
      getResponseHeaderValue(response.headers, 'content-disposition')
    );
    let metadataName = file && typeof file.Name === 'string' ? file.Name : undefined;
    let metadataMimeType =
      file && typeof file.ContentType === 'string' ? file.ContentType : undefined;

    return {
      contentBase64: buffer.toString('base64'),
      byteLength: buffer.byteLength,
      attachmentByteLength: getBase64ByteLength(buffer.toString('base64')),
      mimeType:
        params.mimeType ?? metadataMimeType ?? headerMimeType ?? 'application/octet-stream',
      fileName: params.fileName ?? metadataName ?? headerFileName ?? storageReference,
      storageReference,
      file
    };
  }
}
