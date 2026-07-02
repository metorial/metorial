import { createAxios } from 'slates';

let BASE_URLS = {
  production: 'https://pro-api.coinmarketcap.com',
  sandbox: 'https://sandbox-api.coinmarketcap.com'
};

export interface ClientConfig {
  token: string;
  environment: 'production' | 'sandbox';
}

export interface CmcStatus {
  timestamp: string;
  errorCode: number;
  errorMessage: string | null;
  elapsed: number;
  creditCount: number;
}

export interface CmcResponse<T> {
  data: T;
  status: CmcStatus;
}

// Cryptocurrency types
export interface CryptocurrencyMapEntry {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  isActive: number;
  firstHistoricalData: string | null;
  lastHistoricalData: string | null;
  platform: CryptocurrencyPlatform | null;
}

export interface CryptocurrencyPlatform {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  tokenAddress: string;
}

export interface Quote {
  price: number | null;
  volume24h: number | null;
  volumeChange24h: number | null;
  percentChange1h: number | null;
  percentChange24h: number | null;
  percentChange7d: number | null;
  percentChange30d: number | null;
  percentChange60d: number | null;
  percentChange90d: number | null;
  marketCap: number | null;
  marketCapDominance: number | null;
  fullyDilutedMarketCap: number | null;
  lastUpdated: string | null;
}

export interface CryptocurrencyListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number;
  numMarketPairs: number;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  infiniteSupply: boolean;
  lastUpdated: string;
  dateAdded: string;
  tags: string[];
  platform: CryptocurrencyPlatform | null;
  quote: Record<string, Quote>;
}

export interface CryptocurrencyQuote {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number;
  numMarketPairs: number;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  isActive: number;
  lastUpdated: string;
  dateAdded: string;
  tags: string[];
  platform: CryptocurrencyPlatform | null;
  quote: Record<string, Quote>;
}

export interface CryptocurrencyInfo {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  category: string;
  description: string;
  dateAdded: string;
  dateLaunched: string | null;
  logo: string;
  tags: string[];
  platform: CryptocurrencyPlatform | null;
  urls: {
    website: string[];
    twitter: string[];
    messageBoard: string[];
    chat: string[];
    facebook: string[];
    explorer: string[];
    reddit: string[];
    technicalDoc: string[];
    sourceCode: string[];
    announcement: string[];
  };
}

export interface MarketPair {
  exchange: {
    id: number;
    name: string;
    slug: string;
  };
  marketId: number;
  marketPair: string;
  category: string;
  feeType: string;
  marketUrl: string;
  quote: Record<
    string,
    {
      price: number | null;
      volume24h: number | null;
      lastUpdated: string | null;
      effectiveLiquidity: number | null;
    }
  >;
}

export interface MarketPairsResponse {
  id: number;
  name: string;
  symbol: string;
  numMarketPairs: number;
  marketPairs: MarketPair[];
}

export interface GlobalMetrics {
  activeCryptocurrencies: number;
  totalCryptocurrencies: number;
  activeMarketPairs: number;
  activeExchanges: number;
  totalExchanges: number;
  ethDominance: number;
  btcDominance: number;
  ethDominanceYesterday: number;
  btcDominanceYesterday: number;
  defiVolume24h: number;
  defiVolume24hReported: number;
  defiMarketCap: number;
  defi24hPercentageChange: number;
  stablecoinVolume24h: number;
  stablecoinVolume24hReported: number;
  stablecoinMarketCap: number;
  stablecoin24hPercentageChange: number;
  derivativesVolume24h: number;
  derivativesVolume24hReported: number;
  derivatives24hPercentageChange: number;
  lastUpdated: string;
  quote: Record<
    string,
    {
      totalMarketCap: number | null;
      totalVolume24h: number | null;
      totalVolume24hReported: number | null;
      altcoinVolume24h: number | null;
      altcoinMarketCap: number | null;
      defiVolume24h: number | null;
      defiMarketCap: number | null;
      stablecoinVolume24h: number | null;
      stablecoinMarketCap: number | null;
      derivativesVolume24h: number | null;
      lastUpdated: string | null;
    }
  >;
}

export interface PriceConversion {
  id: number;
  symbol: string;
  name: string;
  amount: number;
  lastUpdated: string;
  quote: Record<
    string,
    {
      price: number | null;
      lastUpdated: string | null;
    }
  >;
}

export interface FiatMapEntry {
  id: number;
  name: string;
  sign: string;
  symbol: string;
}

export interface ExchangeMapEntry {
  id: number;
  name: string;
  slug: string;
  isActive: number;
  firstHistoricalData: string | null;
  lastHistoricalData: string | null;
}

export interface ExchangeListing {
  id: number;
  name: string;
  slug: string;
  numMarketPairs: number;
  lastUpdated: string;
  quote: Record<
    string,
    {
      volume24h: number | null;
      volume24hAdjusted: number | null;
      volume7d: number | null;
      volume30d: number | null;
      percentChangeVolume24h: number | null;
      percentChangeVolume7d: number | null;
      percentChangeVolume30d: number | null;
      effectiveLiquidity24h: number | null;
      lastUpdated: string | null;
    }
  >;
}

export interface ExchangeInfo {
  id: number;
  name: string;
  slug: string;
  description: string;
  dateLaunched: string | null;
  logo: string;
  urls: {
    website: string[];
    twitter: string[];
    blog: string[];
    chat: string[];
    fee: string[];
  };
}

// Helper to transform camelCase keys to snake_case for API params
let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let toSnakeCaseParams = (params: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[toSnakeCase(key)] = value;
    }
  }
  return result;
};

// Helper to transform snake_case response keys to camelCase
let toCamelCase = (str: string): string => {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
};

let transformKeys = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === 'object') {
    let result: Record<string, any> = {};
    for (let [key, value] of Object.entries(obj)) {
      result[toCamelCase(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(clientConfig: ClientConfig) {
    let baseURL = BASE_URLS[clientConfig.environment] || BASE_URLS.production;
    this.axios = createAxios({
      baseURL,
      headers: {
        'X-CMC_PRO_API_KEY': clientConfig.token,
        Accept: 'application/json'
      }
    });
  }

  private async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    let cleanParams = params ? toSnakeCaseParams(params) : undefined;
    let response = await this.axios.get(path, { params: cleanParams });
    let transformed = transformKeys(response.data);
    return transformed.data;
  }

  // Cryptocurrency Map
  async getCryptocurrencyMap(params?: {
    listingStatus?: string;
    start?: number;
    limit?: number;
    sort?: string;
    symbol?: string;
  }): Promise<CryptocurrencyMapEntry[]> {
    return this.get<CryptocurrencyMapEntry[]>('/v1/cryptocurrency/map', params);
  }

  // Cryptocurrency Info / Metadata
  async getCryptocurrencyInfo(params: {
    id?: string;
    slug?: string;
    symbol?: string;
  }): Promise<Record<string, CryptocurrencyInfo>> {
    return this.get<Record<string, CryptocurrencyInfo>>('/v2/cryptocurrency/info', params);
  }

  // Cryptocurrency Listings Latest
  async getCryptocurrencyListingsLatest(params?: {
    start?: number;
    limit?: number;
    priceMin?: number;
    priceMax?: number;
    marketCapMin?: number;
    marketCapMax?: number;
    volume24hMin?: number;
    volume24hMax?: number;
    circulatingSupplyMin?: number;
    circulatingSupplyMax?: number;
    percentChange24hMin?: number;
    percentChange24hMax?: number;
    convert?: string;
    convertId?: string;
    sort?: string;
    sortDir?: string;
    cryptocurrencyType?: string;
    tag?: string;
    aux?: string;
  }): Promise<CryptocurrencyListing[]> {
    return this.get<CryptocurrencyListing[]>('/v1/cryptocurrency/listings/latest', params);
  }

  // Cryptocurrency Quotes Latest
  async getCryptocurrencyQuotesLatest(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    convert?: string;
    convertId?: string;
    aux?: string;
  }): Promise<Record<string, CryptocurrencyQuote | CryptocurrencyQuote[]>> {
    return this.get<Record<string, CryptocurrencyQuote | CryptocurrencyQuote[]>>(
      '/v2/cryptocurrency/quotes/latest',
      params
    );
  }

  // Cryptocurrency Market Pairs Latest
  async getCryptocurrencyMarketPairs(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    start?: number;
    limit?: number;
    sortDir?: string;
    sort?: string;
    aux?: string;
    matchedId?: string;
    matchedSymbol?: string;
    category?: string;
    convert?: string;
    convertId?: string;
  }): Promise<MarketPairsResponse> {
    return this.get<MarketPairsResponse>('/v2/cryptocurrency/market-pairs/latest', params);
  }

  // Cryptocurrency OHLCV Latest
  async getCryptocurrencyOhlcvLatest(params: {
    id?: string;
    symbol?: string;
    convert?: string;
    convertId?: string;
    skipInvalid?: boolean;
  }): Promise<any> {
    return this.get('/v2/cryptocurrency/ohlcv/latest', params);
  }

  // Global Metrics Latest
  async getGlobalMetricsLatest(params?: {
    convert?: string;
    convertId?: string;
  }): Promise<GlobalMetrics> {
    return this.get<GlobalMetrics>('/v1/global-metrics/quotes/latest', params);
  }

  // Price Conversion
  async priceConversion(params: {
    amount: number;
    id?: string;
    symbol?: string;
    time?: string;
    convert?: string;
    convertId?: string;
  }): Promise<PriceConversion> {
    return this.get<PriceConversion>('/v2/tools/price-conversion', params);
  }

  // Fiat Map
  async getFiatMap(params?: {
    start?: number;
    limit?: number;
    sort?: string;
    includeMetals?: boolean;
  }): Promise<FiatMapEntry[]> {
    return this.get<FiatMapEntry[]>('/v1/fiat/map', params);
  }

  // Exchange Map
  async getExchangeMap(params?: {
    listingStatus?: string;
    slug?: string;
    start?: number;
    limit?: number;
    sort?: string;
    cryptoId?: string;
  }): Promise<ExchangeMapEntry[]> {
    return this.get<ExchangeMapEntry[]>('/v1/exchange/map', params);
  }

  // Exchange Listings Latest
  async getExchangeListingsLatest(params?: {
    start?: number;
    limit?: number;
    sort?: string;
    sortDir?: string;
    marketType?: string;
    convert?: string;
    convertId?: string;
    aux?: string;
  }): Promise<ExchangeListing[]> {
    return this.get<ExchangeListing[]>('/v1/exchange/listings/latest', params);
  }

  // Exchange Info
  async getExchangeInfo(params: {
    id?: string;
    slug?: string;
  }): Promise<Record<string, ExchangeInfo>> {
    return this.get<Record<string, ExchangeInfo>>('/v2/exchange/info', params);
  }

  // Exchange Market Pairs Latest
  async getExchangeMarketPairs(params: {
    id?: string;
    slug?: string;
    start?: number;
    limit?: number;
    convert?: string;
    convertId?: string;
    aux?: string;
    matchedId?: string;
    matchedSymbol?: string;
    category?: string;
  }): Promise<any> {
    return this.get('/v1/exchange/market-pairs/latest', params);
  }

  // Key Info (API usage)
  async getKeyInfo(): Promise<any> {
    return this.get('/v1/key/info');
  }
}
