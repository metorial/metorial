import { createAxios } from 'slates';

let BASE_URL = 'https://api.whoisfreaks.com';

export class WhoisFreaksClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  private createAxiosInstance() {
    return createAxios({ baseURL: BASE_URL });
  }

  // ─── Domain WHOIS ───────────────────────────────────────────────

  async liveWhoisLookup(domainName: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/whois', {
      params: {
        apiKey: this.apiKey,
        whois: 'live',
        domainName
      }
    });
    return response.data;
  }

  async bulkWhoisLookup(domainNames: string[]) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v1.0/bulkwhois',
      {
        domainNames
      },
      {
        params: { apiKey: this.apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async historicalWhoisLookup(domainName: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/whois', {
      params: {
        apiKey: this.apiKey,
        whois: 'historical',
        domainName
      }
    });
    return response.data;
  }

  async reverseWhoisLookup(params: {
    keyword?: string;
    email?: string;
    owner?: string;
    company?: string;
    mode?: 'mini' | 'default';
    page?: number;
  }) {
    let http = this.createAxiosInstance();
    let queryParams: Record<string, string | number> = {
      apiKey: this.apiKey,
      whois: 'reverse'
    };

    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.email) queryParams.email = params.email;
    if (params.owner) queryParams.owner = params.owner;
    if (params.company) queryParams.company = params.company;
    if (params.mode) queryParams.mode = params.mode;
    if (params.page) queryParams.page = params.page;

    let response = await http.get('/v1.0/whois', { params: queryParams });
    return response.data;
  }

  // ─── IP & ASN WHOIS ─────────────────────────────────────────────

  async ipWhoisLookup(ip: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/whois/ip', {
      params: {
        apiKey: this.apiKey,
        ip
      }
    });
    return response.data;
  }

  async asnWhoisLookup(asn: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/whois/asn', {
      params: {
        apiKey: this.apiKey,
        asn
      }
    });
    return response.data;
  }

  // ─── DNS ────────────────────────────────────────────────────────

  async liveDnsLookup(domainName: string, type: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/dns/live', {
      params: {
        apiKey: this.apiKey,
        domainName,
        type
      }
    });
    return response.data;
  }

  async historicalDnsLookup(domainName: string, type: string, page?: number) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number> = {
      apiKey: this.apiKey,
      domainName,
      type
    };
    if (page) params.page = page;

    let response = await http.get('/v1.0/dns/historical', { params });
    return response.data;
  }

  async reverseDnsLookup(type: string, value: string, page?: number) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number> = {
      apiKey: this.apiKey,
      type,
      value
    };
    if (page) params.page = page;

    let response = await http.get('/v1.0/dns/reverse', { params });
    return response.data;
  }

  async bulkDnsLookup(domainNames: string[], type: string) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v1.0/bulkdns',
      {
        domainNames
      },
      {
        params: {
          apiKey: this.apiKey,
          type
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Subdomains ─────────────────────────────────────────────────

  async subdomainLookup(domainName: string, page?: number) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number> = {
      apiKey: this.apiKey,
      domainName
    };
    if (page) params.page = page;

    let response = await http.get('/v1.0/subdomains', { params });
    return response.data;
  }

  // ─── Domain Availability ────────────────────────────────────────

  async checkDomainAvailability(
    domain: string,
    options?: {
      suggest?: boolean;
      count?: number;
    }
  ) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number | boolean> = {
      apiKey: this.apiKey,
      domain
    };
    if (options?.suggest) params.sug = true;
    if (options?.count) params.count = options.count;

    let response = await http.get('/v1.0/domain/availability', { params });
    return response.data;
  }

  async bulkDomainAvailability(domainNames: string[]) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v1.0/bulk-domain-availability',
      {
        domainNames
      },
      {
        params: { apiKey: this.apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async domainDiscovery(keyword: string, page?: number) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number> = {
      apiKey: this.apiKey,
      keyword
    };
    if (page) params.page = page;

    let response = await http.get('/v1.0/domain-discovery', { params });
    return response.data;
  }

  // ─── SSL ────────────────────────────────────────────────────────

  async sslLookup(
    domainName: string,
    options?: {
      chain?: boolean;
      sslRaw?: boolean;
    }
  ) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | boolean> = {
      apiKey: this.apiKey,
      domainName
    };
    if (options?.chain) params.chain = true;
    if (options?.sslRaw) params.sslRaw = true;

    let response = await http.get('/v1.0/ssl/live', { params });
    return response.data;
  }

  // ─── IP Geolocation ─────────────────────────────────────────────

  async ipGeolocation(ip: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/geolocation', {
      params: {
        apiKey: this.apiKey,
        ip
      }
    });
    return response.data;
  }

  async bulkIpGeolocation(ips: string[]) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v1.0/bulk-geolocation',
      {
        ips
      },
      {
        params: { apiKey: this.apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }
}
