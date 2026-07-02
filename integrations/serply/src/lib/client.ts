import { createAxios } from 'slates';

export interface SerplyClientConfig {
  token: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface SearchParams {
  query: string;
  num?: number;
  start?: number;
  lr?: string;
  hl?: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface SerpRankingParams {
  query: string;
  domain: string;
  num?: number;
  proxyLocation?: string;
  deviceType?: string;
}

export interface JobSearchParams {
  query: string;
  proxyLocation?: string;
  deviceType?: string;
}

export interface ProductSearchParams {
  query: string;
  proxyLocation?: string;
  deviceType?: string;
}

export class Client {
  private token: string;
  private defaultProxyLocation?: string;
  private defaultDeviceType?: string;

  constructor(config: SerplyClientConfig) {
    this.token = config.token;
    this.defaultProxyLocation = config.proxyLocation;
    this.defaultDeviceType = config.deviceType;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.serply.io'
    });
  }

  private buildHeaders(proxyLocation?: string, deviceType?: string): Record<string, string> {
    let headers: Record<string, string> = {
      'X-Api-Key': this.token
    };

    let location = proxyLocation || this.defaultProxyLocation;
    if (location) {
      headers['X-Proxy-Location'] = location;
    }

    let device = deviceType || this.defaultDeviceType;
    if (device) {
      headers['X-User-Agent'] = device;
    }

    return headers;
  }

  private buildQueryString(params: SearchParams): string {
    let parts: string[] = [`q=${encodeURIComponent(params.query)}`];

    if (params.num !== undefined) {
      parts.push(`num=${params.num}`);
    }
    if (params.start !== undefined) {
      parts.push(`start=${params.start}`);
    }
    if (params.lr) {
      parts.push(`lr=${encodeURIComponent(params.lr)}`);
    }
    if (params.hl) {
      parts.push(`hl=${encodeURIComponent(params.hl)}`);
    }

    return parts.join('&');
  }

  async webSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/search/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async bingSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/b/search/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async newsSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/news/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async imageSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/image/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async videoSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/video/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async productSearch(params: ProductSearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = `q=${encodeURIComponent(params.query)}`;
    let response = await http.get(`/v1/product/search/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async jobSearch(params: JobSearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = `q=${encodeURIComponent(params.query)}`;
    let response = await http.get(`/v1/job/search/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async scholarSearch(params: SearchParams): Promise<any> {
    let http = this.getAxios();
    let queryString = this.buildQueryString(params);
    let response = await http.get(`/v1/scholar/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }

  async serpRanking(params: SerpRankingParams): Promise<any> {
    let http = this.getAxios();
    let parts: string[] = [
      `q=${encodeURIComponent(params.query)}`,
      `domain=${encodeURIComponent(params.domain)}`
    ];
    if (params.num !== undefined) {
      parts.push(`num=${params.num}`);
    }
    let queryString = parts.join('&');
    let response = await http.get(`/v1/serp/${queryString}`, {
      headers: this.buildHeaders(params.proxyLocation, params.deviceType)
    });
    return response.data;
  }
}
