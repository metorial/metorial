import { createAxios } from 'slates';

export interface LogoImageOptions {
  format?: 'jpg' | 'png' | 'webp';
  size?: number;
  theme?: 'dark' | 'light';
  greyscale?: boolean;
  retina?: boolean;
  fallback?: 'monogram' | '404';
}

export interface SearchResult {
  name: string;
  domain: string;
}

export interface BrandColor {
  hex?: string;
  rgb?: { r: number; g: number; b: number };
  [key: string]: any;
}

export interface BrandDescription {
  name: string;
  domain: string;
  description: string;
  indexedAt: string;
  socials: Record<string, string | null>;
  logo: string;
  blurhash: string;
  colors: BrandColor[];
}

export class LogoDevClient {
  private axios;

  constructor(secretKey: string) {
    this.axios = createAxios({
      baseURL: 'https://api.logo.dev',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
  }

  async searchBrands(
    query: string,
    strategy?: 'typeahead' | 'match'
  ): Promise<SearchResult[]> {
    let params: Record<string, string> = { q: query };
    if (strategy) {
      params.strategy = strategy;
    }
    let response = await this.axios.get('/search', { params });
    return response.data;
  }

  async describeBrand(domain: string): Promise<BrandDescription> {
    let response = await this.axios.get(`/describe/${encodeURIComponent(domain)}`);
    let data = response.data;
    return {
      name: data.name,
      domain: data.domain,
      description: data.description,
      indexedAt: data.indexed_at,
      socials: data.socials ?? {},
      logo: data.logo,
      blurhash: data.blurhash,
      colors: data.colors ?? []
    };
  }
}

export let buildLogoUrl = (
  identifier: string,
  lookupType: 'domain' | 'ticker' | 'crypto' | 'isin' | 'name',
  publishableToken?: string,
  options?: LogoImageOptions
): string => {
  let basePath: string;
  switch (lookupType) {
    case 'domain':
      basePath = `/${encodeURIComponent(identifier)}`;
      break;
    case 'ticker':
      basePath = `/ticker/${encodeURIComponent(identifier)}`;
      break;
    case 'crypto':
      basePath = `/crypto/${encodeURIComponent(identifier)}`;
      break;
    case 'isin':
      basePath = `/isin/${encodeURIComponent(identifier)}`;
      break;
    case 'name':
      basePath = `/name/${encodeURIComponent(identifier)}`;
      break;
  }

  let params = new URLSearchParams();
  if (publishableToken) {
    params.set('token', publishableToken);
  }
  if (options?.format && options.format !== 'jpg') {
    params.set('format', options.format);
  }
  if (options?.size && options.size !== 128) {
    params.set('size', String(options.size));
  }
  if (options?.theme) {
    params.set('theme', options.theme);
  }
  if (options?.greyscale) {
    params.set('greyscale', 'true');
  }
  if (options?.retina) {
    params.set('retina', 'true');
  }
  if (options?.fallback === '404') {
    params.set('fallback', '404');
  }

  let queryString = params.toString();
  return `https://img.logo.dev${basePath}${queryString ? `?${queryString}` : ''}`;
};
