import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://api.whoisfreaks.com';

export class WhoisFreaksClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A WhoisFreaks API key is required.');
    }
    this.apiKey = config.token.trim();
  }

  private createAxiosInstance() {
    return createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'WhoisFreaks',
          reason: 'whoisfreaks_api_error'
        })
    });
  }

  // ─── Domain WHOIS ───────────────────────────────────────────────

  async liveWhoisLookup(domainName: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v2.0/whois/live', {
      params: {
        apiKey: this.apiKey,
        domainName
      }
    });
    return response.data;
  }

  async bulkWhoisLookup(domainNames: string[]) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v2.0/bulkwhois/live',
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

  async historicalWhoisLookup(domainName: string, page?: number) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v2.0/whois/history', {
      params: {
        apiKey: this.apiKey,
        domainName,
        page
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
    exact?: boolean;
  }) {
    let http = this.createAxiosInstance();
    let queryParams: Record<string, string | number | boolean> = {
      apiKey: this.apiKey
    };

    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.email) queryParams.email = params.email;
    if (params.owner) queryParams.owner = params.owner;
    if (params.company) queryParams.company = params.company;
    if (params.mode) queryParams.mode = params.mode;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.exact !== undefined) queryParams.exact = params.exact;

    let response = await http.get('/v2.0/whois/reverse', { params: queryParams });
    return response.data;
  }

  // ─── IP & ASN WHOIS ─────────────────────────────────────────────

  async ipWhoisLookup(ip: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/ip-whois', {
      params: {
        apiKey: this.apiKey,
        ip
      }
    });
    return response.data;
  }

  async asnWhoisLookup(asn: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v2.0/asn-whois', {
      params: {
        apiKey: this.apiKey,
        asn
      }
    });
    return response.data;
  }

  // ─── DNS ────────────────────────────────────────────────────────

  async liveDnsLookup(domainName: string | undefined, type: string, ipAddress?: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v2.0/dns/live', {
      params: {
        apiKey: this.apiKey,
        domainName,
        ipAddress,
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

    let response = await http.get('/v2.0/dns/historical', { params });
    return response.data;
  }

  async reverseDnsLookup(
    type: string,
    value: string,
    page?: number,
    exact?: boolean,
    sort?: 'asc' | 'desc'
  ) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number | boolean> = {
      apiKey: this.apiKey,
      type,
      value
    };
    if (page !== undefined) params.page = page;
    if (exact !== undefined) params.exact = exact;
    if (sort !== undefined) params.sort = sort;

    let response = await http.get('/v2.1/dns/reverse', { params });
    return response.data;
  }

  async bulkDnsLookup(domainNames: string[], type: string) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v2.0/dns/bulk/live',
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

  async subdomainLookup(
    domainName: string,
    page?: number,
    filters?: { after?: string; before?: string; status?: 'active' | 'inactive' }
  ) {
    let http = this.createAxiosInstance();
    let params: Record<string, string | number> = {
      apiKey: this.apiKey,
      domain: domainName
    };
    if (page !== undefined) params.page = page;
    if (filters?.after) params.after = filters.after;
    if (filters?.before) params.before = filters.before;
    if (filters?.status) params.status = filters.status;

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
    if (options?.suggest !== undefined) params.sug = options.suggest;
    if (options?.count) params.count = options.count;

    let response = await http.get('/v2.0/domain/availability', { params });
    return response.data;
  }

  async bulkDomainAvailability(domainNames: string[]) {
    let http = this.createAxiosInstance();
    let response = await http.post(
      '/v2.0/domain/availability',
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
    if (options?.chain !== undefined) params.chain = options.chain;
    if (options?.sslRaw !== undefined) params.sslRaw = options.sslRaw;

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
      '/v1.0/geolocation',
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

  async accountUsage() {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1.0/whoisapi/usage', { params: { apiKey: this.apiKey } });
    return response.data;
  }

  async ipReputation(ip: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v2.0/security', { params: { apiKey: this.apiKey, ip } });
    return response.data;
  }

  async domainReputation(domainName: string) {
    let http = this.createAxiosInstance();
    let response = await http.get('/v1/domain/security', {
      params: { apiKey: this.apiKey, domainName }
    });
    return response.data;
  }
}
