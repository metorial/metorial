import { createAxios } from 'slates';

export interface IpdataClientConfig {
  token: string;
  useEuEndpoint: boolean;
}

export interface IpLookupResult {
  ip: string;
  isEu: boolean;
  city: string;
  region: string;
  regionCode: string;
  regionType: string;
  countryName: string;
  countryCode: string;
  continentName: string;
  continentCode: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  callingCode: string;
  flag: string;
  emojiFlag: string;
  emojiUnicode: string;
  asn: AsnInfo;
  languages: LanguageInfo[];
  currency: CurrencyInfo;
  timezone: TimezoneInfo;
  threat: ThreatInfo;
  carrier: CarrierInfo;
  company: CompanyInfo;
  [key: string]: unknown;
}

export interface AsnInfo {
  asn: string;
  name: string;
  domain: string;
  route: string;
  type: string;
}

export interface AsnDetailResult {
  asn: string;
  name: string;
  domain: string;
  route: string;
  type: string;
  prefixes: AsnPrefix[];
  prefixes6: AsnPrefix[];
  countryCode: string;
  [key: string]: unknown;
}

export interface AsnPrefix {
  prefix: string;
  ip: string;
  cidr: number;
  asn: string;
  name: string;
  countryCode: string;
  [key: string]: unknown;
}

export interface LanguageInfo {
  name: string;
  native: string;
  code: string;
}

export interface CurrencyInfo {
  name: string;
  code: string;
  symbol: string;
  native: string;
  plural: string;
}

export interface TimezoneInfo {
  name: string;
  abbr: string;
  offset: string;
  isDst: boolean;
  currentTime: string;
}

export interface ThreatInfo {
  isTor: boolean;
  isIcloudRelay: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  isAnonymous: boolean;
  isKnownAttacker: boolean;
  isKnownAbuser: boolean;
  isThreat: boolean;
  isBogon: boolean;
}

export interface CarrierInfo {
  name: string;
  mcc: string;
  mnc: string;
}

export interface CompanyInfo {
  name: string;
  domain: string;
  type: string;
}

let normalizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      let camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = normalizeKeys(value);
    }
    return result;
  }
  return obj;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: IpdataClientConfig) {
    this.token = config.token;
    let baseURL = config.useEuEndpoint ? 'https://eu-api.ipdata.co' : 'https://api.ipdata.co';

    this.axios = createAxios({
      baseURL
    });
  }

  private buildParams(fields?: string[]): Record<string, string> {
    let params: Record<string, string> = {
      'api-key': this.token
    };
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    return params;
  }

  async lookupIp(ip?: string, fields?: string[]): Promise<IpLookupResult> {
    let path = ip ? `/${ip}` : '/';
    let response = await this.axios.get(path, {
      params: this.buildParams(fields)
    });
    return normalizeKeys(response.data) as IpLookupResult;
  }

  async lookupIpField(ip: string, field: string): Promise<unknown> {
    let response = await this.axios.get(`/${ip}/${field}`, {
      params: { 'api-key': this.token }
    });
    return normalizeKeys(response.data);
  }

  async bulkLookup(ips: string[], fields?: string[]): Promise<IpLookupResult[]> {
    let response = await this.axios.post('/bulk', ips, {
      params: this.buildParams(fields),
      headers: { 'Content-Type': 'application/json' }
    });
    return normalizeKeys(response.data) as IpLookupResult[];
  }

  async lookupAsn(asn: string): Promise<AsnDetailResult> {
    let response = await this.axios.get(`/${asn}`, {
      params: { 'api-key': this.token }
    });
    return normalizeKeys(response.data) as AsnDetailResult;
  }
}
