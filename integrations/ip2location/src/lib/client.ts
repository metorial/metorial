import { createAxios } from 'slates';

let geolocationApi = createAxios({
  baseURL: 'https://api.ip2location.io'
});

let bulkApi = createAxios({
  baseURL: 'https://bulk.ip2location.io'
});

let whoisApi = createAxios({
  baseURL: 'https://api.ip2whois.com/v2'
});

let hostedDomainsApi = createAxios({
  baseURL: 'https://domains.ip2whois.com'
});

export interface GeolocationResult {
  ip: string;
  country_code: string;
  country_name: string;
  region_name: string;
  city_name: string;
  latitude: number;
  longitude: number;
  zip_code: string;
  time_zone: string;
  asn: string;
  as: string;
  isp: string;
  domain: string;
  net_speed: string;
  idd_code: string;
  area_code: string;
  weather_station_code: string;
  weather_station_name: string;
  mcc: string;
  mnc: string;
  mobile_brand: string;
  elevation: number;
  usage_type: string;
  address_type: string;
  district: string;
  ads_category: string;
  ads_category_name: string;
  is_proxy: boolean;
  continent?: {
    name: string;
    code: string;
    hemisphere: string[];
    translation: { lang: string; value: string };
  };
  country?: {
    name: string;
    alpha3_code: string;
    numeric_code: number;
    demonym: string;
    flag: string;
    capital: string;
    total_area: number;
    population: number;
    currency: { code: string; name: string; symbol: string };
    language: { code: string; name: string };
    tld: string;
    translation: { lang: string; value: string };
  };
  region?: {
    name: string;
    code: string;
    translation: { lang: string; value: string };
  };
  city?: {
    name: string;
    translation: { lang: string; value: string };
  };
  time_zone_info?: {
    olson: string;
    current_time: string;
    gmt_offset: number;
    is_dst: boolean;
    sunrise: string;
    sunset: string;
  };
  geotarget?: {
    metro: string;
  };
  proxy?: {
    last_seen: number;
    proxy_type: string;
    threat: string;
    provider: string;
    is_vpn: boolean;
    is_tor: boolean;
    is_data_center: boolean;
    is_public_proxy: boolean;
    is_web_proxy: boolean;
    is_web_crawler: boolean;
    is_residential_proxy: boolean;
    is_consumer_privacy_network: boolean;
    is_enterprise_private_network: boolean;
    is_spammer: boolean;
    is_scanner: boolean;
    is_botnet: boolean;
    fraud_score: number;
  };
  [key: string]: unknown;
}

export interface WhoisResult {
  domain: string;
  domain_id: string;
  status: string;
  create_date: string;
  update_date: string;
  expire_date: string;
  domain_age: number;
  whois_server: string;
  registrar: {
    iana_id: string;
    name: string;
    url: string;
  };
  registrant: WhoisContact;
  admin: WhoisContact;
  tech: WhoisContact;
  billing: WhoisContact;
  nameservers: string[];
}

export interface WhoisContact {
  name: string;
  organization: string;
  street_address: string;
  city: string;
  region: string;
  zip_code: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
}

export interface HostedDomainsResult {
  ip: string;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  domains: string[];
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getHeaders() {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  async getGeolocation(ip: string, language?: string): Promise<GeolocationResult> {
    let params: Record<string, string> = { ip, format: 'json' };
    if (language && language !== 'en') {
      params.lang = language;
    }
    let response = await geolocationApi.get('/', {
      headers: this.getHeaders(),
      params
    });
    if (response.data?.error) {
      throw new Error(
        `IP2Location API error: ${response.data.error.error_message} (code: ${response.data.error.error_code})`
      );
    }
    return response.data;
  }

  async getBulkGeolocation(
    ips: string[],
    language?: string
  ): Promise<Record<string, GeolocationResult>> {
    let params: Record<string, string> = { format: 'json' };
    if (language && language !== 'en') {
      params.lang = language;
    }
    let response = await bulkApi.post('/', ips.join('\n'), {
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'text/plain'
      },
      params
    });
    if (response.data?.error) {
      throw new Error(
        `IP2Location Bulk API error: ${response.data.error.error_message} (code: ${response.data.error.error_code})`
      );
    }
    return response.data;
  }

  async getWhois(domain: string): Promise<WhoisResult> {
    let response = await whoisApi.get('/', {
      headers: this.getHeaders(),
      params: { domain, format: 'json' }
    });
    if (response.data?.error) {
      throw new Error(
        `IP2WHOIS API error: ${response.data.error.error_message} (code: ${response.data.error.error_code})`
      );
    }
    return response.data;
  }

  async getHostedDomains(ip: string, page?: number): Promise<HostedDomainsResult> {
    let params: Record<string, string | number> = { ip, format: 'json' };
    if (page && page > 1) {
      params.page = page;
    }
    let response = await hostedDomainsApi.get('/domains', {
      headers: this.getHeaders(),
      params
    });
    if (response.data?.error) {
      throw new Error(
        `Hosted Domains API error: ${response.data.error.error_message} (code: ${response.data.error.error_code})`
      );
    }
    return response.data;
  }
}
