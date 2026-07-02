import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.securitytrails.com/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      APIKEY: config.token,
      'Content-Type': 'application/json'
    };
  }

  // General
  async ping(): Promise<{ success: boolean }> {
    let response = await http.get('/ping', { headers: this.headers });
    return response.data;
  }

  // Domain endpoints
  async getDomain(hostname: string): Promise<any> {
    let response = await http.get(`/domain/${hostname}`, { headers: this.headers });
    return response.data;
  }

  async getSubdomains(
    hostname: string,
    params?: {
      childrenOnly?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<any> {
    let response = await http.get(`/domain/${hostname}/subdomains`, {
      headers: this.headers,
      params: {
        children_only: params?.childrenOnly,
        include_inactive: params?.includeInactive
      }
    });
    return response.data;
  }

  async getDomainTags(hostname: string): Promise<any> {
    let response = await http.get(`/domain/${hostname}/tags`, { headers: this.headers });
    return response.data;
  }

  async getDomainWhois(hostname: string): Promise<any> {
    let response = await http.get(`/domain/${hostname}/whois`, { headers: this.headers });
    return response.data;
  }

  async getAssociatedDomains(
    hostname: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await http.get(`/domain/${hostname}/associated`, {
      headers: this.headers,
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  async getDomainSsl(hostname: string): Promise<any> {
    let response = await http.get(`/domain/${hostname}/ssl`, { headers: this.headers });
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
    let response = await http.get(`/history/${hostname}/dns/${type}`, {
      headers: this.headers,
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  async getWhoisHistory(
    hostname: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await http.get(`/history/${hostname}/whois`, {
      headers: this.headers,
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
    let response = await http.post(
      '/domains/list',
      {
        query
      },
      {
        headers: this.headers,
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
    let response = await http.post(
      '/domains/list',
      {
        filter
      },
      {
        headers: this.headers,
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

    let response = await http.post('/domains/stats', body, {
      headers: this.headers
    });
    return response.data;
  }

  async scroll(scrollId: string): Promise<any> {
    let response = await http.get(`/scroll/${scrollId}`, { headers: this.headers });
    return response.data;
  }

  // IP endpoints
  async searchIps(
    query: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await http.post(
      '/ips/list',
      {
        query
      },
      {
        headers: this.headers,
        params: {
          page: params?.page
        }
      }
    );
    return response.data;
  }

  async getIpStats(query: string): Promise<any> {
    let response = await http.post(
      '/ips/stats',
      {
        query
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getIpNeighbors(ipAddress: string): Promise<any> {
    let response = await http.get(`/ips/nearby/${ipAddress}`, { headers: this.headers });
    return response.data;
  }

  async getIpWhois(ipAddress: string): Promise<any> {
    let response = await http.get(`/ips/${ipAddress}/whois`, { headers: this.headers });
    return response.data;
  }

  async getIpUserAgents(
    ipAddress: string,
    params?: {
      page?: number;
    }
  ): Promise<any> {
    let response = await http.get(`/ips/${ipAddress}/useragents`, {
      headers: this.headers,
      params: {
        page: params?.page
      }
    });
    return response.data;
  }

  // Account
  async getUsage(): Promise<any> {
    let response = await http.get('/account/usage', { headers: this.headers });
    return response.data;
  }
}
