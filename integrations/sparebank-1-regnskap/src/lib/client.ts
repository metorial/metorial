import {
  createAuthenticatedAxios,
  createAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData
} from 'slates';
import type { SpareBankRegnskapAuthOutput } from '../auth';
import { joinUrl } from './environments';
import { spareBankRegnskapApiError, spareBankRegnskapValidationError } from './errors';

export type UnimicroQueryParams = {
  filter?: string;
  select?: string;
  expand?: string;
  top?: number;
  skip?: number;
  [key: string]: unknown;
};

export type SpareBankBinaryFile = {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
  fileName?: string;
};

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

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let decodeHeaderValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

let normalizeContentDispositionFileName = (value: string | undefined) => {
  if (!value) return undefined;

  let utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) return decodeHeaderValue(utf8Match[1].replace(/^"|"$/g, ''));

  let match = /filename="?([^";]+)"?/i.exec(value);
  return match?.[1] ? decodeHeaderValue(match[1]) : undefined;
};

let companyHeaders = (companyKey?: string) =>
  companyKey
    ? {
        CompanyKey: companyKey
      }
    : undefined;

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

let listFromResponse = (value: unknown, path: string) => {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.Items)) return value.Items;
  if (isRecord(value) && Array.isArray(value.Value)) return value.Value;
  if (value === null || value === undefined) return [];

  throw spareBankRegnskapValidationError(
    `SpareBank 1 Regnskap ${path} response was not a list.`
  );
};

let companyListFromResponse = (value: unknown) => {
  if (
    isRecord(value) &&
    ('Key' in value || 'CompanyKey' in value || 'ID' in value || 'Name' in value)
  ) {
    return [value];
  }

  return listFromResponse(value, 'companies');
};

export class SpareBankRegnskapClient {
  private bizHttp;
  private appFrameworkHttp;
  private filesHttp;

  constructor(private auth: SpareBankRegnskapAuthOutput) {
    this.bizHttp = createAuthenticatedAxios({
      baseURL: joinUrl(auth.appFrameworkUrl, '/api/biz/'),
      authHeader: {
        value: `Bearer ${auth.token}`
      },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams },
      errorAdapter: error => spareBankRegnskapApiError(error)
    });

    this.appFrameworkHttp = createAuthenticatedAxios({
      baseURL: auth.appFrameworkUrl,
      authHeader: {
        value: `Bearer ${auth.token}`
      },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams },
      errorAdapter: error => spareBankRegnskapApiError(error)
    });

    this.filesHttp = createAxios({
      baseURL: auth.filesUrl,
      paramsSerializer: { serialize: serializeParams }
    });
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
    return requestAxiosData<T>(
      operation,
      () => this.withRetries(request),
      spareBankRegnskapApiError
    );
  }

  private requestResponse<T>(operation: string, request: () => Promise<any>) {
    return requestAxios<T>(
      operation,
      () => this.withRetries(request),
      spareBankRegnskapApiError
    );
  }

  async listCompanies() {
    let value = await this.requestData<unknown>('list companies', () =>
      this.appFrameworkHttp.get('/api/init/companies')
    );

    return companyListFromResponse(value);
  }

  async list(path: string, params: UnimicroQueryParams = {}, companyKey?: string) {
    let value = await this.requestData<unknown>(`list ${path}`, () =>
      this.bizHttp.get(path, {
        params,
        headers: companyHeaders(companyKey)
      })
    );

    return listFromResponse(value, path);
  }

  async get(path: string, params: UnimicroQueryParams = {}, companyKey?: string) {
    return await this.requestData<unknown>(`get ${path}`, () =>
      this.bizHttp.get(path, {
        params,
        headers: companyHeaders(companyKey)
      })
    );
  }

  async report(path: string, params: UnimicroQueryParams = {}, companyKey?: string) {
    return await this.requestData<unknown>(`get report ${path}`, () =>
      this.bizHttp.get(path, {
        params,
        headers: companyHeaders(companyKey)
      })
    );
  }

  async downloadFile(input: {
    storageReference: string;
    companyKey: string;
    fileName?: string;
    mimeType?: string;
  }): Promise<SpareBankBinaryFile> {
    let response = await this.requestResponse<ArrayBuffer>('download file', () =>
      this.filesHttp.get('/api/download', {
        params: {
          id: input.storageReference,
          key: input.companyKey,
          token: this.auth.token
        },
        headers: {
          Accept: '*/*',
          Authorization: `Bearer ${this.auth.token}`
        },
        responseType: 'arraybuffer'
      })
    );

    let buffer = Buffer.from(response.data);
    return {
      contentBase64: buffer.toString('base64'),
      mimeType:
        input.mimeType ??
        getResponseHeaderValue(response.headers, 'content-type') ??
        'application/octet-stream',
      byteLength: buffer.byteLength,
      fileName:
        input.fileName ??
        normalizeContentDispositionFileName(
          getResponseHeaderValue(response.headers, 'content-disposition')
        )
    };
  }
}
