import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import type {
  BrandContextResponse,
  BrandLookupOptions,
  BrandResponse,
  SearchResult,
  TransactionRequest,
  TransactionResponse,
  ViewerResponse
} from './types';

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Brandfetch',
    reason: 'brandfetch_api_error',
    operation,
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'detail', 'error', 'code', 'reason'],
    nestedKeys: ['errors', 'message'],
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let code = response.data.error ?? response.data.code ?? response.data.reason;
      return typeof code === 'string' ? code : undefined;
    }
  });

export class BrandApiClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('Configure a Brandfetch API key before using this tool.');
    }
    this.axios = createAxios({
      baseURL: 'https://api.brandfetch.io/v2',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
  }

  private async getBrandAt(path: string, options: BrandLookupOptions): Promise<BrandResponse> {
    try {
      let response = await this.axios.get<BrandResponse>(path, { params: options });
      if (response.status === 204) {
        throw createApiServiceError(
          'This brand is not indexed yet. Retry with cachedOnly omitted or false to request live indexing.'
        );
      }
      return response.data;
    } catch (error) {
      throw apiError(error, 'get brand');
    }
  }

  async getBrand(
    identifier: string,
    options: BrandLookupOptions = {}
  ): Promise<BrandResponse> {
    return this.getBrandAt(`/brands/${encodeURIComponent(identifier)}`, options);
  }

  async getBrandByType(
    type: 'domain' | 'ticker' | 'isin' | 'crypto',
    identifier: string,
    options: BrandLookupOptions = {}
  ): Promise<BrandResponse> {
    return this.getBrandAt(`/brands/${type}/${encodeURIComponent(identifier)}`, options);
  }

  async enrichTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      let response = await this.axios.post<TransactionResponse>(
        '/brands/transaction',
        request
      );
      return response.data;
    } catch (error) {
      throw apiError(error, 'enrich transaction');
    }
  }

  async getViewer(): Promise<ViewerResponse> {
    try {
      let response = await this.axios.get<ViewerResponse>('/viewer');
      return response.data;
    } catch (error) {
      throw apiError(error, 'get authenticated viewer');
    }
  }

  async getBrandContext(
    domain: string,
    cachedOnly?: boolean
  ): Promise<BrandContextResponse | undefined> {
    try {
      let response = await this.axios.get<BrandContextResponse>(
        `/context/${encodeURIComponent(domain)}`,
        {
          params: { cachedOnly }
        }
      );
      return response.status === 204 ? undefined : response.data;
    } catch (error) {
      throw apiError(error, 'get brand context');
    }
  }
}

export class SearchClient {
  private axios;

  constructor(private clientId: string) {
    this.axios = createAxios({ baseURL: 'https://api.brandfetch.io/v2' });
  }

  async searchBrands(query: string): Promise<SearchResult[]> {
    try {
      let response = await this.axios.get<SearchResult[]>(
        `/search/${encodeURIComponent(query)}`,
        {
          params: { c: this.clientId }
        }
      );
      return response.data;
    } catch (error) {
      throw apiError(error, 'search brands');
    }
  }
}

export let buildLogoUrl = (params: {
  identifier: string;
  clientId: string;
  identifierType?: 'domain' | 'ticker' | 'isin' | 'crypto';
  type?: 'icon' | 'logo' | 'symbol';
  theme?: 'light' | 'dark';
  height?: number;
  width?: number;
  fallback?: 'brandfetch' | 'transparent' | 'lettermark' | '404';
  format?: 'png' | 'jpg' | 'svg' | 'webp';
}): string => {
  let prefix = params.identifierType ? `${params.identifierType}/` : '';
  let base = `https://cdn.brandfetch.io/${prefix}${encodeURIComponent(params.identifier)}`;
  let pathSegments: string[] = [];
  if (params.width !== undefined) pathSegments.push(`w/${params.width}`);
  if (params.height !== undefined) pathSegments.push(`h/${params.height}`);
  if (params.theme) pathSegments.push(`theme/${params.theme}`);
  if (params.fallback) pathSegments.push(`fallback/${params.fallback}`);
  if (pathSegments.length > 0) base += `/${pathSegments.join('/')}`;
  let logoType = params.type || 'icon';
  let format = params.format ? `.${params.format}` : '';
  base += `/${logoType}${format}`;
  return `${base}?c=${encodeURIComponent(params.clientId)}`;
};
