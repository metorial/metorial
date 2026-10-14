import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.securitytrails.com/v1',
      authHeader: { name: 'APIKEY', value: config.token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SecurityTrails',
          reason: 'securitytrails_api_error'
        })
    });
  }

  // General
  async ping(): Promise<{ success: boolean }> {
    let response = await this.http.get('/ping');
    return response.data;
  }

  // Domain endpoints
  async getDomain(hostname: string): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}`);
    return response.data;
  }

  async getSubdomains(
    hostname: string,
    params?: {
      childrenOnly?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}/subdomains`, {
      params: {
        children_only: params?.childrenOnly,
        include_inactive: params?.includeInactive
      }
    });
    return response.data;
  }

  async getDomainTags(hostname: string): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}/tags`);
    return response.data;
  }

  async getDomainWhois(hostname: string): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}/whois`);
    return response.data;
  }

  async getAssociatedDomains(
    hostname: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}/associated`, {
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  async getDomainSsl(hostname: string): Promise<any> {
    let response = await this.http.get(`/domain/${encodeURIComponent(hostname)}/ssl`);
    return response.data;
  }

  // History endpoints
  async getDnsHistory(
    hostname: string,
    type: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.get(
      `/history/${encodeURIComponent(hostname)}/dns/${encodeURIComponent(type)}`,
      {
        params: {
          page: params?.page
        }
      }
    );
    return response.data;
  }

  async getWhoisHistory(
    hostname: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.get(`/history/${encodeURIComponent(hostname)}/whois`, {
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  // Search endpoints
  async searchDomainsDsl(
    query: string,
    params?: {
      includeIps?: boolean;
      page?: number;
      scroll?: boolean;
    }
  ): Promise<any> {
    let response = await this.http.post(
      '/domains/list',
      {
        query
      },
      {
        params: {
          include_ips: params?.includeIps,
          page: params?.page,
          scroll: params?.scroll
        }
      }
    );
    return response.data;
  }

  async searchDomainsFilter(
    filter: Record<string, any>,
    params?: {
      includeIps?: boolean;
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.post(
      '/domains/list',
      {
        filter
      },
      {
        params: {
          include_ips: params?.includeIps,
          page: params?.page
        }
      }
    );
    return response.data;
  }

  async searchDomainsStats(query?: string, filter?: Record<string, any>): Promise<any> {
    let body: any = {};
    if (query) body.query = query;
    if (filter) body.filter = filter;

    let response = await this.http.post('/domains/stats', body);
    return response.data;
  }

  async scroll(scrollId: string): Promise<any> {
    let response = await this.http.get(`/scroll/${encodeURIComponent(scrollId)}`);
    return response.data;
  }

  // IP endpoints
  async searchIps(
    query: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.post(
      '/ips/list',
      {
        query
      },
      {
        params: {
          page: params?.page
        }
      }
    );
    return response.data;
  }

  async getIpStats(query: string): Promise<any> {
    let response = await this.http.post('/ips/stats', { query });
    return response.data;
  }

  async getIpNeighbors(ipAddress: string): Promise<any> {
    let response = await this.http.get(`/ips/nearby/${encodeURIComponent(ipAddress)}`);
    return response.data;
  }

  async getIpWhois(ipAddress: string): Promise<any> {
    let response = await this.http.get(`/ips/${encodeURIComponent(ipAddress)}/whois`);
    return response.data;
  }

  async getIpUserAgents(
    ipAddress: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await this.http.get(`/ips/${encodeURIComponent(ipAddress)}/useragents`, {
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  // Account
  async getUsage(): Promise<any> {
    let response = await this.http.get('/account/usage');
    return response.data;
  }
}
