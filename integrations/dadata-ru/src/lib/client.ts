import { createAxios } from 'slates';

let suggestionsAxios = createAxios({
  baseURL: 'https://suggestions.dadata.ru/suggestions/api/4_1/rs'
});

let cleanerAxios = createAxios({
  baseURL: 'https://cleaner.dadata.ru/api/v1'
});

let profileAxios = createAxios({
  baseURL: 'https://dadata.ru/api/v2'
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

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`
    };
  }

  private get headersWithSecret() {
    return {
      ...this.headers,
      'X-Secret': this.config.secretKey || ''
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
  }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.language) body.language = params.language;
    if (params.locations) body.locations = params.locations;
    if (params.locationsGeo) {
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

    let response = await this.axios.post('/suggest/address', body, { headers: this.headers });
    return response.data;
  }

  async suggestParty(params: {
    query: string;
    count?: number;
    type?: string;
    status?: string[];
    okved?: string[];
    locations?: Record<string, unknown>[];
    locationsBoost?: Record<string, unknown>[];
  }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.type) body.type = params.type;
    if (params.status) body.status = params.status;
    if (params.okved) body.okved = params.okved;
    if (params.locations) body.locations = params.locations;
    if (params.locationsBoost) body.locations_boost = params.locationsBoost;

    let response = await this.axios.post('/suggest/party', body, { headers: this.headers });
    return response.data;
  }

  async suggestBank(params: {
    query: string;
    count?: number;
    status?: string[];
    type?: string[];
    locations?: Record<string, unknown>[];
    locationsBoost?: Record<string, unknown>[];
  }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.status) body.status = params.status;
    if (params.type) body.type = params.type;
    if (params.locations) body.locations = params.locations;
    if (params.locationsBoost) body.locations_boost = params.locationsBoost;

    let response = await this.axios.post('/suggest/bank', body, { headers: this.headers });
    return response.data;
  }

  async suggestName(params: {
    query: string;
    count?: number;
    gender?: string;
    parts?: string[];
  }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.gender) body.gender = params.gender;
    if (params.parts) body.parts = params.parts;

    let response = await this.axios.post('/suggest/fio', body, { headers: this.headers });
    return response.data;
  }

  async suggestEmail(params: { query: string; count?: number }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;

    let response = await this.axios.post('/suggest/email', body, { headers: this.headers });
    return response.data;
  }

  async suggestOutward(
    entity: string,
    params: {
      query: string;
      count?: number;
      filters?: Record<string, unknown>[];
    }
  ) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.filters) body.filters = params.filters;

    let response = await this.axios.post(`/suggest/${entity}`, body, {
      headers: this.headers
    });
    return response.data;
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
    }
  ) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.kpp) body.kpp = params.kpp;
    if (params.branchType) body.branch_type = params.branchType;
    if (params.type) body.type = params.type;
    if (params.language) body.language = params.language;

    let response = await this.axios.post(`/findById/${entity}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async findAffiliated(params: { query: string; count?: number; scope?: string[] }) {
    let body: Record<string, unknown> = { query: params.query };
    if (params.count) body.count = params.count;
    if (params.scope) body.scope = params.scope;

    let response = await this.axios.post('/findAffiliated/party', body, {
      headers: this.headers
    });
    return response.data;
  }

  async geolocateAddress(params: {
    lat: number;
    lon: number;
    count?: number;
    radiusMeters?: number;
    language?: string;
  }) {
    let body: Record<string, unknown> = { lat: params.lat, lon: params.lon };
    if (params.count) body.count = params.count;
    if (params.radiusMeters) body.radius_meters = params.radiusMeters;
    if (params.language) body.language = params.language;

    let response = await this.axios.post('/geolocate/address', body, {
      headers: this.headers
    });
    return response.data;
  }

  async iplocateAddress(params: { ip?: string; language?: string }) {
    let body: Record<string, unknown> = {};
    if (params.ip) body.ip = params.ip;
    if (params.language) body.language = params.language;

    let response = await this.axios.post('/iplocate/address', body, { headers: this.headers });
    return response.data;
  }

  async findCompanyByEmail(params: { query: string }) {
    let response = await this.axios.post(
      '/findByEmail/company',
      { query: params.query },
      {
        headers: this.headersWithSecret
      }
    );
    return response.data;
  }
}

export class CleanerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.axios = cleanerAxios;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`,
      'X-Secret': this.config.secretKey || ''
    };
  }

  async cleanAddress(value: string) {
    let response = await this.axios.post('/clean/address', [value], { headers: this.headers });
    return response.data;
  }

  async cleanName(value: string) {
    let response = await this.axios.post('/clean/name', [value], { headers: this.headers });
    return response.data;
  }

  async cleanPhone(value: string) {
    let response = await this.axios.post('/clean/phone', [value], { headers: this.headers });
    return response.data;
  }

  async cleanEmail(value: string) {
    let response = await this.axios.post('/clean/email', [value], { headers: this.headers });
    return response.data;
  }

  async cleanPassport(value: string) {
    let response = await this.axios.post('/clean/passport', [value], {
      headers: this.headers
    });
    return response.data;
  }

  async cleanBirthdate(value: string) {
    let response = await this.axios.post('/clean/birthdate', [value], {
      headers: this.headers
    });
    return response.data;
  }

  async cleanVehicle(value: string) {
    let response = await this.axios.post('/clean/vehicle', [value], { headers: this.headers });
    return response.data;
  }
}

export class ProfileClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(private config: ClientConfig) {
    this.axios = profileAxios;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${this.config.token}`,
      'X-Secret': this.config.secretKey || ''
    };
  }

  async getBalance() {
    let response = await this.axios.get('/profile/balance', { headers: this.headers });
    return response.data;
  }

  async getDailyStats() {
    let response = await this.axios.get('/stat/daily', { headers: this.headers });
    return response.data;
  }

  async getVersions() {
    let response = await this.axios.get('/version', { headers: this.headers });
    return response.data;
  }
}
