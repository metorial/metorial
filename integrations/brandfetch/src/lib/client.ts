import { createAxios } from 'slates';
import type {
  BrandResponse,
  SearchResult,
  TransactionRequest,
  TransactionResponse
} from './types';

export class BrandApiClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.brandfetch.io/v2',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async getBrand(identifier: string): Promise<BrandResponse> {
    let response = await this.axios.get(`/brands/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async getBrandByType(
    type: 'domain' | 'ticker' | 'isin' | 'crypto',
    identifier: string
  ): Promise<BrandResponse> {
    let response = await this.axios.get(`/brands/${type}/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  async enrichTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    let response = await this.axios.post('/brands/transaction', request);
    return response.data;
  }
}

export class SearchClient {
  private axios;

  constructor(private clientId: string) {
    this.axios = createAxios({
      baseURL: 'https://api.brandfetch.io/v2'
    });
  }

  async searchBrands(query: string): Promise<SearchResult[]> {
    let response = await this.axios.get(`/search/${encodeURIComponent(query)}`, {
      params: { c: this.clientId }
    });
    return response.data;
  }
}

export let buildLogoUrl = (params: {
  identifier: string;
  clientId: string;
  type?: 'icon' | 'logo' | 'symbol';
  theme?: 'light' | 'dark';
  height?: number;
  width?: number;
  fallback?: 'brandfetch' | 'transparent' | 'lettermark' | '404';
  format?: 'png' | 'jpg' | 'svg' | 'webp';
}): string => {
  let base = `https://cdn.brandfetch.io/${encodeURIComponent(params.identifier)}`;

  let pathSegments: string[] = [];

  if (params.width) {
    pathSegments.push(`w/${params.width}`);
  }
  if (params.height) {
    pathSegments.push(`h/${params.height}`);
  }
  if (params.theme) {
    pathSegments.push(`theme/${params.theme}`);
  }
  if (params.fallback) {
    pathSegments.push(`fallback/${params.fallback}`);
  }

  if (pathSegments.length > 0) {
    base += `/${pathSegments.join('/')}`;
  }

  let logoType = params.type || 'icon';
  let format = params.format ? `.${params.format}` : '';
  base += `/${logoType}${format}`;

  base += `?c=${encodeURIComponent(params.clientId)}`;

  return base;
};
