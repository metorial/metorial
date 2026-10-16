import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  decodeApiErrorBody,
  getResponseHeaderValue
} from 'slates';
import type { z } from 'zod';
import { parseProviderResponse } from './response';
import * as responses from './responses';

export class NeutrinoClient {
  private api;
  private userId: string;
  private apiKey: string;

  constructor(config: { userId: string; token: string }) {
    this.api = createAuthenticatedAxios({
      baseURL: 'https://neutrinoapi.net',
      timeout: 360_000,
      maxRedirects: 0,
      errorMapping: {
        extractResponseData: response =>
          decodeApiErrorBody(response.data, { maxBytes: 65_536 })
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Neutrino',
          reason: 'neutrino_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['api-error-msg', 'apiErrorMsg', 'message'],
          extractUpstreamCode: (_input, response, helpers) => {
            if (!helpers.isRecord(response?.data)) return undefined;
            let code = response.data['api-error'] ?? response.data.apiError;
            return typeof code === 'number' || typeof code === 'string'
              ? String(code)
              : undefined;
          }
        })
    });
    this.userId = config.userId;
    this.apiKey = config.token;
  }

  private get headers() {
    return {
      'User-ID': this.userId,
      'API-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async emailValidate(params: { email: string; fixTypos?: boolean }) {
    let response = await this.api.post(
      '/email-validate',
      {
        email: params.email,
        'fix-typos': params.fixTypos ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return parseProviderResponse(responses.emailValidateResponse, response.data);
  }

  async emailVerify(params: { email: string; fixTypos?: boolean }) {
    let response = await this.api.post(
      '/email-verify',
      {
        email: params.email,
        'fix-typos': params.fixTypos ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return parseProviderResponse(responses.emailVerifyResponse, response.data);
  }

  async phoneValidate(params: { number: string; countryCode?: string; ip?: string }) {
    let body: Record<string, string> = {
      number: params.number,
      'output-case': 'camel'
    };
    if (params.countryCode) body['country-code'] = params.countryCode;
    if (params.ip) body.ip = params.ip;

    let response = await this.api.post('/phone-validate', body, { headers: this.headers });
    return parseProviderResponse(responses.phoneValidateResponse, response.data);
  }

  async ipInfo(params: { ip: string; reverseLookup?: boolean }) {
    let response = await this.api.post(
      '/ip-info',
      {
        ip: params.ip,
        'reverse-lookup': params.reverseLookup ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return parseProviderResponse(responses.ipInfoResponse, response.data);
  }

  async ipBlocklist(params: { ip: string; vpnLookup?: boolean }) {
    let response = await this.api.post(
      '/ip-blocklist',
      {
        ip: params.ip,
        'vpn-lookup': params.vpnLookup ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return parseProviderResponse(responses.ipBlocklistResponse, response.data);
  }

  async ipProbe(params: { ip: string }) {
    let response = await this.api.post(
      '/ip-probe',
      {
        ip: params.ip,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return parseProviderResponse(responses.ipProbeResponse, response.data);
  }

  async hostReputation(params: { host: string; listRating?: number; zones?: string }) {
    let body: Record<string, string | number> = {
      host: params.host,
      'output-case': 'camel'
    };
    if (params.listRating !== undefined) body['list-rating'] = params.listRating;
    if (params.zones) body.zones = params.zones;

    let response = await this.api.post('/host-reputation', body, { headers: this.headers });
    return parseProviderResponse(responses.hostReputationResponse, response.data);
  }

  async domainLookup(params: { host: string; live?: boolean }) {
    let response = await this.api.post(
      '/domain-lookup',
      {
        host: params.host,
        live: params.live ?? true,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async geocodeAddress(params: {
    address?: string;
    houseNumber?: string;
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
    languageCode?: string;
    fuzzySearch?: boolean;
    limit?: number;
  }) {
    let body: Record<string, string | number | boolean> = {
      'output-case': 'camel'
    };
    if (params.address) body.address = params.address;
    if (params.houseNumber) body['house-number'] = params.houseNumber;
    if (params.street) body.street = params.street;
    if (params.city) body.city = params.city;
    if (params.county) body.county = params.county;
    if (params.state) body.state = params.state;
    if (params.postalCode) body['postal-code'] = params.postalCode;
    if (params.countryCode) body['country-code'] = params.countryCode;
    if (params.languageCode) body['language-code'] = params.languageCode;
    if (params.fuzzySearch !== undefined) body['fuzzy-search'] = params.fuzzySearch;
    if (params.limit !== undefined) body.limit = params.limit;

    let response = await this.api.post('/geocode-address', body, { headers: this.headers });
    return parseProviderResponse(responses.geocodeAddressResponse, response.data);
  }

  async geocodeReverse(params: {
    latitude?: string;
    longitude?: string;
    geohash?: string;
    languageCode?: string;
    zoom?: string;
  }) {
    let body: Record<string, string> = {
      'output-case': 'camel'
    };
    if (params.latitude) body.latitude = params.latitude;
    if (params.longitude) body.longitude = params.longitude;
    if (params.geohash) body.geohash = params.geohash;
    if (params.languageCode) body['language-code'] = params.languageCode;
    if (params.zoom) body.zoom = params.zoom;

    let response = await this.api.post('/geocode-reverse', body, { headers: this.headers });
    return parseProviderResponse(responses.geocodeReverseResponse, response.data);
  }

  async binLookup(params: { binNumber: string; customerIp?: string }) {
    let body: Record<string, string> = {
      'bin-number': params.binNumber,
      'output-case': 'camel'
    };
    if (params.customerIp) body['customer-ip'] = params.customerIp;

    let response = await this.api.post('/bin-lookup', body, { headers: this.headers });
    return parseProviderResponse(responses.binLookupResponse, response.data);
  }

  async convert(params: {
    fromValue: string;
    fromType: string;
    toType: string;
    historicalDate?: string;
  }) {
    let body: Record<string, string> = {
      'from-value': params.fromValue,
      'from-type': params.fromType,
      'to-type': params.toType,
      'output-case': 'camel'
    };
    if (params.historicalDate) body['historical-date'] = params.historicalDate;

    let response = await this.api.post('/convert', body, { headers: this.headers });
    return parseProviderResponse(responses.convertResponse, response.data);
  }

  async badWordFilter(params: {
    content: string;
    censorCharacter?: string;
    catalog?: string;
  }) {
    let body: Record<string, string> = {
      content: params.content,
      'output-case': 'camel'
    };
    if (params.censorCharacter) body['censor-character'] = params.censorCharacter;
    if (params.catalog) body.catalog = params.catalog;

    let response = await this.api.post('/bad-word-filter', body, { headers: this.headers });
    return parseProviderResponse(responses.badWordFilterResponse, response.data);
  }

  async smsVerify(params: {
    number: string;
    codeLength?: number;
    securityCode?: number;
    brandName?: string;
    countryCode?: string;
    languageCode?: string;
    limit?: number;
    limitTtl?: number;
  }) {
    let body: Record<string, string | number> = {
      number: params.number,
      'output-case': 'camel'
    };
    if (params.codeLength !== undefined) body['code-length'] = params.codeLength;
    if (params.securityCode !== undefined) body['security-code'] = params.securityCode;
    if (params.brandName) body['brand-name'] = params.brandName;
    if (params.countryCode) body['country-code'] = params.countryCode;
    if (params.languageCode) body['language-code'] = params.languageCode;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.limitTtl !== undefined) body['limit-ttl'] = params.limitTtl;

    let response = await this.api.post('/sms-verify', body, { headers: this.headers });
    return parseProviderResponse(responses.smsVerifyResponse, response.data);
  }

  async verifySecurityCode(params: { securityCode: string; limitBy?: string }) {
    let body: Record<string, string> = {
      'security-code': params.securityCode,
      'output-case': 'camel'
    };
    if (params.limitBy) body['limit-by'] = params.limitBy;

    let response = await this.api.post('/verify-security-code', body, {
      headers: this.headers
    });
    return parseProviderResponse(responses.verifySecurityCodeResponse, response.data);
  }

  async urlInfo(params: {
    url: string;
    fetchContent?: boolean;
    ignoreCertificateErrors?: boolean;
    timeout?: number;
  }) {
    let body: Record<string, string | number | boolean> = {
      url: params.url,
      'output-case': 'camel'
    };
    if (params.fetchContent !== undefined) body['fetch-content'] = params.fetchContent;
    if (params.ignoreCertificateErrors !== undefined)
      body['ignore-certificate-errors'] = params.ignoreCertificateErrors;
    if (params.timeout !== undefined) body.timeout = params.timeout;

    let response = await this.api.post('/url-info', body, { headers: this.headers });
    return parseProviderResponse(responses.urlInfoResponse, response.data);
  }

  async structured<T extends z.ZodRawShape>(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
    schema: z.ZodObject<T>
  ) {
    let body = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined)
    );
    let response = await this.api.post(
      path,
      { ...body, 'output-case': 'camel' },
      { headers: this.headers }
    );
    return parseProviderResponse(schema, response.data);
  }

  async file(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
    expectedMimeType: string
  ) {
    let body = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined)
    );
    let response = await this.api.post<ArrayBuffer>(path, body, {
      headers: this.headers,
      responseType: 'arraybuffer'
    });
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    let bytes = Buffer.from(response.data);
    let validSignature =
      expectedMimeType === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : expectedMimeType === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : expectedMimeType === 'application/pdf'
            ? bytes.subarray(0, 5).toString('ascii') === '%PDF-'
            : false;
    if (
      (mimeType !== expectedMimeType && mimeType !== 'application/octet-stream') ||
      !validSignature ||
      bytes.length === 0
    ) {
      throw createApiServiceError(
        'Neutrino returned an unexpected or empty file. The request may have consumed API credit; check your account before retrying.',
        { reason: 'invalid_file_response' }
      );
    }
    return {
      content: new Response(new Uint8Array(bytes), {
        headers: { 'content-type': expectedMimeType }
      }),
      mimeType: expectedMimeType,
      size: bytes.length
    };
  }
}
