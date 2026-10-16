import { isIP } from 'node:net';
import { createApiServiceError, createAxios, pickDefined, requestAxiosData } from 'slates';
import { dadataApiError, validateCoordinates, validateCount, validateRadius } from './errors';

let suggestionsAxios = createAxios({
  baseURL: 'https://suggestions.dadata.ru/suggestions/api/4_1/rs',
  timeout: 30_000
});

let cleanerAxios = createAxios({
  baseURL: 'https://cleaner.dadata.ru/api/v1',
  timeout: 30_000
});

let profileAxios = createAxios({
  baseURL: 'https://dadata.ru/api/v2',
  timeout: 30_000
});

export interface ClientConfig {
  token: string;
  secretKey?: string;
}

export class SuggestionsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.axios = suggestionsAxios;
  }

  private validate(params: { query?: string; count?: number }, maximum = 20) {
    validateCount(params.count, maximum);
    if (params.query !== undefined && params.query.length > 300) {
      throw createApiServiceError('query must not exceed 300 characters.', {
        reason: 'dadata_query_too_long'
      });
    }
  }

  private get headers() {
    if (!this.config.token.trim()) {
      throw createApiServiceError(
        'A DaData API key is required. Reconnect with your API key.',
        { reason: 'dadata_missing_api_key' }
      );
    }
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`
    };
  }

  private requireSecret() {
    if (!this.config.secretKey?.trim()) {
      throw createApiServiceError(
        'This DaData operation requires a secret key. Reconnect with your API key and secret key.',
        { reason: 'dadata_missing_secret_key' }
      );
    }
    return this.config.secretKey;
  }

  private get headersWithSecret() {
    return {
      ...this.headers,
      'X-Secret': this.requireSecret()
    };
  }

  async suggestAddress(params: {
    query: string;
    count?: number;
    language?: string;
    locations?: Record<string, unknown>[];
    locationsGeo?: { lat: number; lon: number; radiusMeters: number }[];
    locationsBoost?: Record<string, unknown>[];
    fromBound?: string;
    toBound?: string;
    restrictValue?: boolean;
    division?: string;
  }) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.language) body.language = params.language;
    if (params.locations) body.locations = params.locations;
    if (params.locationsGeo) {
      for (let location of params.locationsGeo) {
        validateCoordinates(location.lat, location.lon);
        validateRadius(location.radiusMeters);
      }
      body.locations_geo = params.locationsGeo.map(g => ({
        lat: g.lat,
        lon: g.lon,
        radius_meters: g.radiusMeters
      }));
    }
    if (params.locationsBoost) body.locations_boost = params.locationsBoost;
    if (params.fromBound) body.from_bound = { value: params.fromBound };
    if (params.toBound) body.to_bound = { value: params.toBound };
    if (params.restrictValue !== undefined) body.restrict_value = params.restrictValue;
    if (params.division) body.division = params.division;

    return requestAxiosData(
      '/suggest/address',
      () => this.axios.post('/suggest/address', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async suggestParty(params: {
    query: string;
    count?: number;
    type?: string;
    status?: string[];
    okved?: string[];
    branchType?: string[];
    locations?: Record<string, unknown>[];
    locationsBoost?: Record<string, unknown>[];
  }) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.type) body.type = params.type;
    if (params.status) body.status = params.status;
    if (params.okved) body.okved = params.okved;
    if (params.branchType) body.branch_type = params.branchType;
    if (params.locations) body.locations = params.locations;
    if (params.locationsBoost) body.locations_boost = params.locationsBoost;

    return requestAxiosData(
      '/suggest/party',
      () => this.axios.post('/suggest/party', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async suggestBank(params: {
    query: string;
    count?: number;
    status?: string[];
    type?: string[];
    locations?: Record<string, unknown>[];
    locationsBoost?: Record<string, unknown>[];
  }) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.status) body.status = params.status;
    if (params.type) body.type = params.type;
    if (params.locations) body.locations = params.locations;
    if (params.locationsBoost) body.locations_boost = params.locationsBoost;

    return requestAxiosData(
      '/suggest/bank',
      () => this.axios.post('/suggest/bank', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async suggestName(params: {
    query: string;
    count?: number;
    gender?: string;
    parts?: string[];
  }) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.gender) body.gender = params.gender;
    if (params.parts) body.parts = params.parts;

    return requestAxiosData(
      '/suggest/fio',
      () => this.axios.post('/suggest/fio', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async suggestEmail(params: { query: string; count?: number }) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;

    return requestAxiosData(
      '/suggest/email',
      () => this.axios.post('/suggest/email', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async suggestOutward(
    entity: string,
    params: {
      query: string;
      count?: number;
      filters?: Record<string, unknown>[];
    }
  ) {
    this.validate(params);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.filters) body.filters = params.filters;

    return requestAxiosData(
      `suggest/${entity}`,
      () =>
        this.axios.post(`/suggest/${entity}`, body, {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async findById(
    entity: string,
    params: {
      query: string;
      count?: number;
      kpp?: string;
      branchType?: string;
      type?: string;
      language?: string;
      status?: string[];
      division?: string;
    }
  ) {
    this.validate(params, entity === 'party' ? 300 : 20);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.kpp) body.kpp = params.kpp;
    if (params.status) body.status = params.status;
    if (params.division) body.division = params.division;
    if (params.branchType) body.branch_type = params.branchType;
    if (params.type) body.type = params.type;
    if (params.language) body.language = params.language;

    return requestAxiosData(
      `findById/${entity}`,
      () =>
        this.axios.post(`/findById/${entity}`, body, {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async findAffiliated(params: { query: string; count?: number; scope?: string[] }) {
    this.validate(params, 300);
    let body: Record<string, unknown> = { query: params.query };
    if (params.count !== undefined) body.count = params.count;
    if (params.scope) body.scope = params.scope;

    return requestAxiosData(
      '/findAffiliated/party',
      () =>
        this.axios.post('/findAffiliated/party', body, {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async geolocateAddress(params: {
    lat: number;
    lon: number;
    count?: number;
    radiusMeters?: number;
    language?: string;
    division?: string;
  }) {
    this.validate(params);
    validateCoordinates(params.lat, params.lon);
    validateRadius(params.radiusMeters, 1000);
    let body: Record<string, unknown> = { lat: params.lat, lon: params.lon };
    if (params.division) body.division = params.division;
    if (params.count !== undefined) body.count = params.count;
    if (params.radiusMeters !== undefined) body.radius_meters = params.radiusMeters;
    if (params.language) body.language = params.language;

    return requestAxiosData(
      '/geolocate/address',
      () =>
        this.axios.post('/geolocate/address', body, {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async iplocateAddress(params: { ip?: string; language?: string; division?: string }) {
    if (params.ip !== undefined && !isIP(params.ip)) {
      throw createApiServiceError('ipAddress must be a valid IPv4 or IPv6 address.', {
        reason: 'dadata_invalid_ip_address'
      });
    }
    let body: Record<string, unknown> = {};
    if (params.division) body.division = params.division;
    if (params.ip) body.ip = params.ip;
    if (params.language) body.language = params.language;

    return requestAxiosData(
      '/iplocate/address',
      () => this.axios.post('/iplocate/address', body, { headers: this.headers }),
      dadataApiError
    );
  }

  async geolocatePostalUnit(params: {
    lat: number;
    lon: number;
    radiusMeters?: number;
    count?: number;
  }) {
    validateCoordinates(params.lat, params.lon);
    validateCount(params.count);
    validateRadius(params.radiusMeters);
    return requestAxiosData(
      'find nearby postal offices',
      () =>
        this.axios.post(
          '/geolocate/postal_unit',
          pickDefined({
            lat: params.lat,
            lon: params.lon,
            radius_meters: params.radiusMeters,
            count: params.count
          }),
          { headers: this.headers }
        ),
      dadataApiError
    );
  }

  async findCompanyByEmail(params: { query: string }) {
    this.validate(params);
    return requestAxiosData(
      'findByEmail/company',
      () =>
        this.axios.post(
          '/findByEmail/company',
          { query: params.query },
          {
            headers: this.headersWithSecret
          }
        ),
      dadataApiError
    );
  }
}

export class CleanerClient {
  private requireSecret() {
    if (!this.config.secretKey?.trim()) {
      throw createApiServiceError(
        'This DaData operation requires a secret key. Reconnect with your API key and secret key.',
        { reason: 'dadata_missing_secret_key' }
      );
    }
    return this.config.secretKey;
  }

  private axios: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.axios = cleanerAxios;
  }

  private get headers() {
    if (!this.config.token.trim()) {
      throw createApiServiceError(
        'A DaData API key is required. Reconnect with your API key.',
        { reason: 'dadata_missing_api_key' }
      );
    }
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`,
      'X-Secret': this.requireSecret()
    };
  }

  async cleanAddress(value: string) {
    return requestAxiosData(
      '/clean/address',
      () => this.axios.post('/clean/address', [value], { headers: this.headers }),
      dadataApiError
    );
  }

  async cleanName(value: string) {
    return requestAxiosData(
      '/clean/name',
      () => this.axios.post('/clean/name', [value], { headers: this.headers }),
      dadataApiError
    );
  }

  async cleanPhone(value: string) {
    return requestAxiosData(
      '/clean/phone',
      () => this.axios.post('/clean/phone', [value], { headers: this.headers }),
      dadataApiError
    );
  }

  async cleanEmail(value: string) {
    return requestAxiosData(
      '/clean/email',
      () => this.axios.post('/clean/email', [value], { headers: this.headers }),
      dadataApiError
    );
  }

  async cleanPassport(value: string) {
    return requestAxiosData(
      '/clean/passport',
      () =>
        this.axios.post('/clean/passport', [value], {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async cleanBirthdate(value: string) {
    return requestAxiosData(
      '/clean/birthdate',
      () =>
        this.axios.post('/clean/birthdate', [value], {
          headers: this.headers
        }),
      dadataApiError
    );
  }

  async cleanVehicle(value: string) {
    return requestAxiosData(
      '/clean/vehicle',
      () => this.axios.post('/clean/vehicle', [value], { headers: this.headers }),
      dadataApiError
    );
  }
}

export class ProfileClient {
  private requireSecret() {
    if (!this.config.secretKey?.trim()) {
      throw createApiServiceError(
        'This DaData operation requires a secret key. Reconnect with your API key and secret key.',
        { reason: 'dadata_missing_secret_key' }
      );
    }
    return this.config.secretKey;
  }

  private axios: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.axios = profileAxios;
  }

  private get headers() {
    if (!this.config.token.trim()) {
      throw createApiServiceError(
        'A DaData API key is required. Reconnect with your API key.',
        { reason: 'dadata_missing_api_key' }
      );
    }
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`,
      'X-Secret': this.requireSecret()
    };
  }

  async getBalance() {
    return requestAxiosData(
      '/profile/balance',
      () => this.axios.get('/profile/balance', { headers: this.headers }),
      dadataApiError
    );
  }

  async getDailyStats() {
    return requestAxiosData(
      '/stat/daily',
      () => this.axios.get('/stat/daily', { headers: this.headers }),
      dadataApiError
    );
  }

  async getVersions() {
    return requestAxiosData(
      '/version',
      () => this.axios.get('/version', { headers: this.headers }),
      dadataApiError
    );
  }
}
