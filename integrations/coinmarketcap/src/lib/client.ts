import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
  description: string | null;
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
      effectiveLiquidity: number | string | null;
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
  ethDominanceYesterday?: number;
  btcDominanceYesterday?: number;
  defiVolume24h?: number;
  defiVolume24hReported: number;
  defiMarketCap?: number;
  defi24hPercentageChange: number;
  stablecoinVolume24h?: number;
  stablecoinVolume24hReported: number;
  stablecoinMarketCap?: number;
  stablecoin24hPercentageChange: number;
  derivativesVolume24h?: number;
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
  isActive?: number;
  status?: string;
  firstHistoricalData?: string | null;
  lastHistoricalData?: string | null;
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
  description: string | null;
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

export interface KeyInfo {
  plan: {
    creditLimitMonthly: number;
    creditLimitMonthlyReset: string;
    creditLimitMonthlyResetTimestamp: string;
    rateLimitMinute: number;
  };
  usage: {
    currentMinute: { requestsMade: number; requestsLeft: number };
    currentDay: { creditsUsed: number; creditsLeft: number };
    currentMonth: { creditsUsed: number; creditsLeft: number };
  };
}

export let coinMarketCapError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'CoinMarketCap',
    reason: 'coinmarketcap_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['error_message'],
    nestedKeys: ['status'],
    extractUpstreamCode: (_error, response, helpers) => {
      let body = response?.data;
      let status =
        helpers.isRecord(body) && helpers.isRecord(body.status) ? body.status : undefined;
      let code = status?.error_code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

// CMC uses numeric word boundaries too: volume24hMin is volume_24h_min.
let toSnakeCase = (key: string) =>
  key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1_$2');

let toSnakeCaseParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(pickDefined(params)).map(([key, value]) => [toSnakeCase(key), value])
  );

let transformKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(transformKeys);
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()),
      transformKeys(item)
    ])
  );
};

let requireIdentifier = (params: Record<string, unknown>, keys: string[], single = false) => {
  for (let key of keys) {
    if (
      params[key] !== undefined &&
      (typeof params[key] !== 'string' || !(params[key] as string).trim())
    ) {
      throw createApiServiceError(
        `${key} must be a non-empty currency or exchange identifier.`
      );
    }
  }
  let supplied = keys.filter(
    key => typeof params[key] === 'string' && (params[key] as string).trim()
  );
  if (supplied.length !== 1) {
    throw createApiServiceError(
      `Provide exactly one of ${keys.join(', ')} to identify the requested currency or exchange.`
    );
  }
  let value = params[supplied[0]!] as string;
  if (single && value.includes(',')) {
    throw createApiServiceError('Provide one currency or exchange per request.');
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  rawResponse: unknown;

  constructor(clientConfig: ClientConfig) {
    if (!clientConfig.token.trim() || /[\r\n]/.test(clientConfig.token)) {
      throw createApiServiceError('Provide a valid CoinMarketCap API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URLS[clientConfig.environment] || BASE_URLS.production,
      authHeader: { name: 'X-CMC_PRO_API_KEY', value: clientConfig.token.trim() },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      errorAdapter: coinMarketCapError
    });
  }

  private async get<T>(
    path: string,
    params: Record<string, unknown> = {},
    shape: 'array' | 'object' | 'either' = 'object'
  ): Promise<T> {
    for (let key of ['start', 'limit']) {
      let value = params[key];
      if (
        value !== undefined &&
        (typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < 1 ||
          (key === 'limit' && value > 5000))
      ) {
        throw createApiServiceError(
          `${key} must be a positive whole number${key === 'limit' ? ' no greater than 5000' : ''}.`
        );
      }
    }
    if (params.convert !== undefined && params.convertId !== undefined) {
      throw createApiServiceError('Use either convert or convertId, not both.');
    }
    if (params.matchedId !== undefined && params.matchedSymbol !== undefined) {
      throw createApiServiceError('Use either matchedId or matchedSymbol, not both.');
    }
    let response = await this.axios.get<unknown>(path, { params: toSnakeCaseParams(params) });
    let body = response.data;
    if (!isApiErrorRecord(body)) {
      throw createApiServiceError('CoinMarketCap returned an unexpected response object.');
    }
    let status = isApiErrorRecord(body.status) ? body.status : undefined;
    let errorCode = status?.error_code;
    if (
      errorCode !== undefined &&
      errorCode !== null &&
      errorCode !== 0 &&
      errorCode !== '0'
    ) {
      throw coinMarketCapError({ response: { status: response.status, data: body } });
    }
    if (body.data === undefined || body.data === null) {
      throw createApiServiceError('CoinMarketCap did not return data for this request.');
    }
    if (
      (shape === 'array' && !Array.isArray(body.data)) ||
      (shape === 'object' && !isApiErrorRecord(body.data)) ||
      (shape === 'either' && !Array.isArray(body.data) && !isApiErrorRecord(body.data))
    ) {
      throw createApiServiceError('CoinMarketCap returned an unexpected result shape.');
    }
    this.rawResponse = body;
    return transformKeys(body.data) as T;
  }

  // Cryptocurrency Map
  async getCryptocurrencyMap(params?: {
    listingStatus?: string;
    start?: number;
    limit?: number;
    sort?: string;
    symbol?: string;
  }): Promise<CryptocurrencyMapEntry[]> {
    return this.get<CryptocurrencyMapEntry[]>(
      '/v1/cryptocurrency/map',
      {
        ...params,
        aux: 'platform,first_historical_data,last_historical_data,is_active'
      },
      'array'
    );
  }

  // Cryptocurrency Info / Metadata
  async getCryptocurrencyInfo(params: {
    id?: string;
    slug?: string;
    symbol?: string;
  }): Promise<Record<string, CryptocurrencyInfo | CryptocurrencyInfo[]>> {
    requireIdentifier(params, ['id', 'slug', 'symbol']);
    return this.get<Record<string, CryptocurrencyInfo | CryptocurrencyInfo[]>>(
      '/v2/cryptocurrency/info',
      {
        ...params,
        aux: 'urls,logo,description,tags,platform,date_added'
      }
    );
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
    return this.get<CryptocurrencyListing[]>(
      '/v1/cryptocurrency/listings/latest',
      {
        ...params,
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply'
      },
      'array'
    );
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
    requireIdentifier(params, ['id', 'slug', 'symbol']);
    return this.get<Record<string, CryptocurrencyQuote | CryptocurrencyQuote[]>>(
      '/v2/cryptocurrency/quotes/latest',
      {
        ...params,
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,is_active'
      }
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
    requireIdentifier(params, ['id', 'slug', 'symbol'], true);
    return this.get<MarketPairsResponse>('/v2/cryptocurrency/market-pairs/latest', {
      ...params,
      aux: 'num_market_pairs,category,fee_type,market_url,effective_liquidity'
    });
  }

  // Cryptocurrency OHLCV Latest
  async getCryptocurrencyOhlcvLatest(params: {
    id?: string;
    symbol?: string;
    convert?: string;
    convertId?: string;
    skipInvalid?: boolean;
  }): Promise<unknown> {
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
    requireIdentifier(params, ['id', 'symbol'], true);
    if (!Number.isFinite(params.amount) || params.amount < 1e-8 || params.amount > 1e12) {
      throw createApiServiceError('amount must be between 0.00000001 and 1000000000000.');
    }
    return this.get<PriceConversion | PriceConversion[]>(
      '/v2/tools/price-conversion',
      params,
      'either'
    ).then(data => {
      if (!Array.isArray(data)) return data;
      if (data.length !== 1) {
        throw createApiServiceError(
          'The currency symbol is ambiguous or unavailable. Use a CoinMarketCap currency ID from search_cryptocurrencies or list_fiat_currencies.'
        );
      }
      return data[0]!;
    });
  }

  // Fiat Map
  async getFiatMap(params?: {
    start?: number;
    limit?: number;
    sort?: string;
    includeMetals?: boolean;
  }): Promise<FiatMapEntry[]> {
    return this.get<FiatMapEntry[]>('/v1/fiat/map', params, 'array');
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
    return this.get<ExchangeMapEntry[]>(
      '/v1/exchange/map',
      {
        ...params,
        aux: 'first_historical_data,last_historical_data,is_active,status'
      },
      'array'
    );
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
    if (params?.sort === 'volume_7d' || params?.sort === 'volume_30d') {
      throw createApiServiceError(
        'CoinMarketCap currently supports exchange sorting by volume_24h, volume_24h_adjusted, or exchange_score.'
      );
    }
    return this.get<ExchangeListing[]>(
      '/v1/exchange/listings/latest',
      {
        ...params,
        aux: 'num_market_pairs,effective_liquidity_24h'
      },
      'array'
    );
  }

  // Exchange Info
  async getExchangeInfo(params: {
    id?: string;
    slug?: string;
  }): Promise<Record<string, ExchangeInfo>> {
    requireIdentifier(params, ['id', 'slug']);
    return this.get<Record<string, ExchangeInfo>>('/v1/exchange/info', params);
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
  }): Promise<unknown> {
    return this.get('/v1/exchange/market-pairs/latest', params);
  }

  // Key Info (API usage)
  async getKeyInfo(): Promise<KeyInfo> {
    return this.get<KeyInfo>('/v1/key/info');
  }
}
