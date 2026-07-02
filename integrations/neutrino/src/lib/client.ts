import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://neutrinoapi.net'
});

export class NeutrinoClient {
  private userId: string;
  private apiKey: string;

  constructor(config: { userId: string; token: string }) {
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
    let response = await api.post(
      '/email-validate',
      {
        email: params.email,
        'fix-typos': params.fixTypos ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async emailVerify(params: { email: string; fixTypos?: boolean }) {
    let response = await api.post(
      '/email-verify',
      {
        email: params.email,
        'fix-typos': params.fixTypos ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async phoneValidate(params: { number: string; countryCode?: string; ip?: string }) {
    let body: Record<string, string> = {
      number: params.number,
      'output-case': 'camel'
    };
    if (params.countryCode) body['country-code'] = params.countryCode;
    if (params.ip) body.ip = params.ip;

    let response = await api.post('/phone-validate', body, { headers: this.headers });
    return response.data;
  }

  async ipInfo(params: { ip: string; reverseLookup?: boolean }) {
    let response = await api.post(
      '/ip-info',
      {
        ip: params.ip,
        'reverse-lookup': params.reverseLookup ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async ipBlocklist(params: { ip: string; vpnLookup?: boolean }) {
    let response = await api.post(
      '/ip-blocklist',
      {
        ip: params.ip,
        'vpn-lookup': params.vpnLookup ?? false,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async ipProbe(params: { ip: string }) {
    let response = await api.post(
      '/ip-probe',
      {
        ip: params.ip,
        'output-case': 'camel'
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async hostReputation(params: { host: string; listRating?: number; zones?: string }) {
    let body: Record<string, string | number> = {
      host: params.host,
      'output-case': 'camel'
    };
    if (params.listRating !== undefined) body['list-rating'] = params.listRating;
    if (params.zones) body.zones = params.zones;

    let response = await api.post('/host-reputation', body, { headers: this.headers });
    return response.data;
  }

  async domainLookup(params: { host: string; live?: boolean }) {
    let response = await api.post(
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

    let response = await api.post('/geocode-address', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/geocode-reverse', body, { headers: this.headers });
    return response.data;
  }

  async binLookup(params: { binNumber: string; customerIp?: string }) {
    let body: Record<string, string> = {
      'bin-number': params.binNumber,
      'output-case': 'camel'
    };
    if (params.customerIp) body['customer-ip'] = params.customerIp;

    let response = await api.post('/bin-lookup', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/convert', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/bad-word-filter', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/sms-verify', body, { headers: this.headers });
    return response.data;
  }

  async verifySecurityCode(params: { securityCode: string; limitBy?: string }) {
    let body: Record<string, string> = {
      'security-code': params.securityCode,
      'output-case': 'camel'
    };
    if (params.limitBy) body['limit-by'] = params.limitBy;

    let response = await api.post('/verify-security-code', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/url-info', body, { headers: this.headers });
    return response.data;
  }
}
