import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.ip2proxy.com'
});

export interface ProxyLookupParams {
  ip?: string;
  package?: string;
  format?: string;
}

export interface ProxyLookupResponse {
  response: string;
  countryCode: string;
  countryName: string;
  regionName: string;
  cityName: string;
  isp: string;
  domain: string;
  usageType: string;
  asn: string;
  as: string;
  lastSeen: string;
  threat: string;
  proxyType: string;
  isProxy: string;
  provider: string;
}

export interface CreditBalanceResponse {
  response: string;
  credits: string;
}

export class Client {
  constructor(private config: { token: string }) {}

  async lookupProxy(params: ProxyLookupParams): Promise<ProxyLookupResponse> {
    let queryParams: Record<string, string> = {
      key: this.config.token,
      format: params.format || 'json'
    };

    if (params.ip) {
      queryParams.ip = params.ip;
    }

    if (params.package) {
      queryParams.package = params.package;
    }

    let response = await http.get('/', { params: queryParams });
    return response.data;
  }

  async checkCredits(): Promise<CreditBalanceResponse> {
    let response = await http.get('/', {
      params: {
        key: this.config.token,
        check: '1'
      }
    });
    return response.data;
  }
}
