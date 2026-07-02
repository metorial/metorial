import {
  createAuthenticatedAxios,
  createAxios,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData
} from 'slates';
import type { TripletexAuthOutput } from '../auth';
import { tripletexApiError, tripletexValidationError } from './errors';

export const TRIPLETEX_BASE_URLS = {
  production: 'https://tripletex.no/v2',
  test: 'https://api-test.tripletex.tech/v2'
} as const;

export type TripletexEnvironment = keyof typeof TRIPLETEX_BASE_URLS;

export type TripletexListResponse<T = Record<string, unknown>> = {
  values?: T[];
  from?: number;
  count?: number;
  fullResultSize?: number;
  versionDigest?: string | null;
};

export type TripletexValueResponse<T = Record<string, unknown>> = {
  value?: T;
};

export type TripletexPdf = {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
};

export type TripletexBinary = TripletexPdf;

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

let normalizeCompanyId = (companyId?: string) => {
  let trimmed = companyId?.trim();
  return trimmed ? trimmed : '0';
};

let tomorrowDate = () => {
  let date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

export class TripletexClient {
  private sessionHttp;
  private sessionToken:
    | {
        token: string;
        expiresAtMs: number;
      }
    | undefined;

  constructor(private auth: TripletexAuthOutput) {
    this.sessionHttp = createAxios({
      baseURL: auth.baseUrl,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      paramsSerializer: { serialize: serializeParams }
    });
  }

  private async createSessionToken() {
    if (this.sessionToken && this.sessionToken.expiresAtMs > Date.now() + 60_000) {
      return this.sessionToken.token;
    }

    if (this.auth.authMethod === 'jwt_refresh_token') {
      let response = await requestAxiosData<TripletexValueResponse<{ token?: string }>>(
        'create session token from refresh token',
        () =>
          this.sessionHttp.post('/token/session/:createFromRefreshToken', {
            refreshToken: this.auth.refreshToken,
            ttlSeconds: this.auth.sessionTtlSeconds
          }),
        tripletexApiError
      );

      if (!response.value?.token) {
        throw tripletexValidationError('Tripletex did not return a session token.');
      }

      this.sessionToken = {
        token: response.value.token,
        expiresAtMs: Date.now() + (this.auth.sessionTtlSeconds ?? 3600) * 1000
      };

      return response.value.token;
    }

    let response = await requestAxiosData<TripletexValueResponse<{ token?: string }>>(
      'create session token from consumer and employee tokens',
      () =>
        this.sessionHttp.post('/token/session/:create', {
          consumerToken: this.auth.consumerToken,
          employeeToken: this.auth.employeeToken,
          expirationDate: this.auth.sessionExpirationDate ?? tomorrowDate()
        }),
      tripletexApiError
    );

    if (!response.value?.token) {
      throw tripletexValidationError('Tripletex did not return a session token.');
    }

    this.sessionToken = {
      token: response.value.token,
      expiresAtMs: Date.now() + 5 * 60 * 1000
    };

    return response.value.token;
  }

  private async createAuthenticatedHttp(companyId?: string) {
    let sessionToken = await this.createSessionToken();
    let username = normalizeCompanyId(companyId ?? this.auth.companyId);
    let credentials = Buffer.from(`${username}:${sessionToken}`).toString('base64');

    return createAuthenticatedAxios({
      baseURL: this.auth.baseUrl,
      authHeader: {
        value: `Basic ${credentials}`
      },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams },
      errorAdapter: error => tripletexApiError(error)
    });
  }

  async list<T = Record<string, unknown>>(
    path: string,
    params: Record<string, unknown> = {},
    companyId?: string
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    return await requestAxiosData<TripletexListResponse<T>>(
      `list ${path}`,
      () => http.get(path, { params }),
      tripletexApiError
    );
  }

  async getValue<T = Record<string, unknown>>(
    path: string,
    params: Record<string, unknown> = {},
    companyId?: string
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    let response = await requestAxiosData<TripletexValueResponse<T>>(
      `get ${path}`,
      () => http.get(path, { params }),
      tripletexApiError
    );
    return response.value;
  }

  async createValue<T = Record<string, unknown>>(
    path: string,
    body: Record<string, unknown>,
    params: Record<string, unknown> = {},
    companyId?: string
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    let response = await requestAxiosData<TripletexValueResponse<T>>(
      `create ${path}`,
      () => http.post(path, body, { params }),
      tripletexApiError
    );
    return response.value;
  }

  async updateValue<T = Record<string, unknown>>(
    path: string,
    body: Record<string, unknown>,
    params: Record<string, unknown> = {},
    companyId?: string
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    let response = await requestAxiosData<TripletexValueResponse<T>>(
      `update ${path}`,
      () => http.put(path, body, { params }),
      tripletexApiError
    );
    return response.value;
  }

  async update(
    path: string,
    body: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
    companyId?: string
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    await requestAxios(
      `update ${path}`,
      () => http.put(path, body, { params }),
      tripletexApiError
    );
  }

  async delete(path: string, companyId?: string) {
    let http = await this.createAuthenticatedHttp(companyId);
    await requestAxios(`delete ${path}`, () => http.delete(path), tripletexApiError);
  }

  async downloadBinary(
    path: string,
    companyId?: string,
    params: Record<string, unknown> = {}
  ) {
    let http = await this.createAuthenticatedHttp(companyId);
    let response = await requestAxios<ArrayBuffer>(
      `download ${path}`,
      () =>
        http.get(path, {
          params,
          headers: {
            Accept: '*/*'
          },
          responseType: 'arraybuffer'
        }),
      tripletexApiError
    );

    let buffer = Buffer.from(response.data);
    return {
      contentBase64: buffer.toString('base64'),
      mimeType: getResponseHeaderValue(response.headers, 'content-type') ?? 'application/pdf',
      byteLength: buffer.byteLength
    };
  }

  async downloadPdf(path: string, companyId?: string, params: Record<string, unknown> = {}) {
    return await this.downloadBinary(path, companyId, params);
  }

  async whoAmI(params: Record<string, unknown> = {}, companyId?: string) {
    return await this.getValue('/token/session/>whoAmI', params, companyId);
  }

  async listAccessibleCompanies(params: Record<string, unknown> = {}, companyId?: string) {
    return await this.list('/company/>withLoginAccess', params, companyId);
  }
}
