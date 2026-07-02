import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.ipinfo.io',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
  }

  async getIpDetails(ip?: string): Promise<IpDetails> {
    let path = `/${ip || 'me'}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async getLiteIpDetails(ip?: string): Promise<LiteIpDetails> {
    let path = `/lite/${ip || 'me'}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async getAsnDetails(asn: string): Promise<AsnDetails> {
    let normalizedAsn = asn.toUpperCase().startsWith('AS') ? asn : `AS${asn}`;
    let response = await this.axios.get(`/${normalizedAsn}/json`);
    return response.data;
  }

  async getAbuseContact(ip: string): Promise<AbuseContact> {
    let response = await this.axios.get(`/${ip}/abuse`);
    return response.data;
  }

  async getIpRanges(domain: string): Promise<IpRangesResponse> {
    let response = await this.axios.get(`/ranges/${domain}`);
    return response.data;
  }

  async getHostedDomains(
    ip: string,
    options?: { page?: number; limit?: number }
  ): Promise<HostedDomainsResponse> {
    let params: Record<string, string> = {};
    if (options?.page !== undefined) params.page = String(options.page);
    if (options?.limit !== undefined) params.limit = String(options.limit);

    let response = await this.axios.get(`/domains/${ip}`, { params });
    return response.data;
  }

  async batchLookup(queries: string[]): Promise<Record<string, any>> {
    let response = await this.axios.post('/batch', queries, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
}

export interface LiteIpDetails {
  ip: string;
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country_code?: string;
  country?: string;
  continent_code?: string;
  continent?: string;
}

export interface IpGeo {
  city?: string;
  region?: string;
  region_code?: string;
  country?: string;
  country_code?: string;
  continent?: string;
  continent_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  postal_code?: string;
  geoname_id?: string;
  radius?: number;
  last_changed?: string;
}

export interface IpAs {
  asn?: string;
  name?: string;
  domain?: string;
  route?: string;
  type?: string;
}

export interface IpAbuse {
  address?: string;
  country?: string;
  email?: string;
  name?: string;
  network?: string;
  phone?: string;
}

export interface IpPrivacy {
  vpn?: boolean;
  proxy?: boolean;
  tor?: boolean;
  relay?: boolean;
  hosting?: boolean;
  service?: string;
}

export interface IpCompany {
  name?: string;
  domain?: string;
  type?: string;
}

export interface IpCarrier {
  name?: string;
  mcc?: string;
  mnc?: string;
}

export interface IpDetails {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  geo?: IpGeo;
  as?: IpAs;
  asn?: IpAs;
  company?: IpCompany;
  carrier?: IpCarrier;
  privacy?: IpPrivacy;
  abuse?: IpAbuse;
  domains?: { total?: number; domains?: string[] };
  is_anonymous?: boolean;
  is_anycast?: boolean;
  is_hosting?: boolean;
  is_mobile?: boolean;
  is_satellite?: boolean;
}

export interface AbuseContact {
  address?: string;
  country?: string;
  email?: string;
  name?: string;
  network?: string;
  phone?: string;
}

export interface AsnPrefix {
  netblock: string;
  id: string;
  name: string;
  country: string;
}

export interface AsnDetails {
  asn: string;
  name: string;
  country: string;
  allocated?: string;
  registry?: string;
  domain?: string;
  num_ips?: number;
  type?: string;
  prefixes?: AsnPrefix[];
  prefixes6?: AsnPrefix[];
}

export interface IpRangesResponse {
  domain: string;
  redirects_to?: string | null;
  num_ranges: number;
  ranges: string[];
}

export interface HostedDomainsResponse {
  ip: string;
  total: number;
  page?: number;
  domains: string[];
}
