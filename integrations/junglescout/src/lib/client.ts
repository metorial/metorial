import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { type ApiRecord, responseRecord } from './response';

export interface ClientConfig {
  token: string;
  marketplace: string;
  apiType: string;
}

export interface PaginationOptions {
  pageSize?: number;
  pageCursor?: string;
}

export interface KeywordsByAsinParams {
  asins: string[];
  includeVariants?: boolean;
  minMonthlySearchVolumeExact?: number;
  maxMonthlySearchVolumeExact?: number;
  minMonthlySearchVolumeBroad?: number;
  maxMonthlySearchVolumeBroad?: number;
  minWordCount?: number;
  maxWordCount?: number;
  minOrganicProductCount?: number;
  maxOrganicProductCount?: number;
  sort?: string;
  pagination?: PaginationOptions;
}

export interface KeywordsByKeywordParams {
  searchTerms: string[];
  categories?: string[];
  minMonthlySearchVolumeExact?: number;
  maxMonthlySearchVolumeExact?: number;
  minMonthlySearchVolumeBroad?: number;
  maxMonthlySearchVolumeBroad?: number;
  minWordCount?: number;
  maxWordCount?: number;
  minOrganicProductCount?: number;
  maxOrganicProductCount?: number;
  sort?: string;
  pagination?: PaginationOptions;
}

export interface HistoricalSearchVolumeParams {
  keyword: string;
  startDate: string;
  endDate: string;
}

export interface ProductDatabaseParams {
  includeKeywords?: string[];
  excludeKeywords?: string[];
  categories?: string[];
  productTiers?: string[];
  sellerTypes?: string[];
  excludeTopBrands?: boolean;
  excludeUnavailableProducts?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minNet?: number;
  maxNet?: number;
  minRank?: number;
  maxRank?: number;
  minSales?: number;
  maxSales?: number;
  minRevenue?: number;
  maxRevenue?: number;
  minReviews?: number;
  maxReviews?: number;
  minRating?: number;
  maxRating?: number;
  minWeight?: number;
  maxWeight?: number;
  minSellers?: number;
  maxSellers?: number;
  minUpdatedAt?: string;
  maxUpdatedAt?: string;
  minLqs?: number;
  maxLqs?: number;
  sort?: string;
  pagination?: PaginationOptions;
}

export interface SalesEstimatesParams {
  asin: string;
  startDate: string;
  endDate: string;
}

export interface ShareOfVoiceParams {
  keyword: string;
}

export class Client {
  private token: string;
  private marketplace: string;
  private apiType: string;

  constructor(config: ClientConfig) {
    if (!config.token?.trim() || /[\r\n]/.test(config.token)) {
      throw createApiServiceError(
        'Connect a Jungle Scout API key before querying marketplace data.',
        {
          reason: 'junglescout_missing_token'
        }
      );
    }
    this.token = config.token;
    this.marketplace = config.marketplace;
    this.apiType = config.apiType;
  }

  private createAxiosInstance() {
    return createAuthenticatedAxios({
      baseURL: 'https://developer.junglescout.com',
      timeout: 30000,
      authHeader: { value: this.token },
      contentType: 'application/vnd.api+json',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Jungle Scout',
          reason: 'junglescout_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['detail', 'title', 'message', 'code'],
          nestedKeys: ['errors']
        }),
      headers: {
        'X-API-Type': this.apiType,
        Accept: 'application/vnd.junglescout.v1+json'
      }
    });
  }

  private validateRanges(params: object) {
    let values = params as Record<string, unknown>;
    for (let [key, value] of Object.entries(values)) {
      if (typeof value !== 'number') continue;
      if (!Number.isFinite(value) || (value < 0 && !key.endsWith('Net'))) {
        throw createApiServiceError(`${key} must be a finite number in the supported range.`, {
          reason: 'invalid_input'
        });
      }
      if (
        /^(min|max)(MonthlySearchVolume|WordCount|OrganicProductCount|Rank|Sales|Reviews|Sellers)/.test(
          key
        ) &&
        !Number.isInteger(value)
      ) {
        throw createApiServiceError(`${key} must be a whole number.`, {
          reason: 'invalid_input'
        });
      }
      if (key.startsWith('min')) {
        let maximum = values[`max${key.slice(3)}`];
        if (typeof maximum === 'number' && value > maximum) {
          throw createApiServiceError(`${key} must not exceed max${key.slice(3)}.`, {
            reason: 'invalid_input'
          });
        }
      }
    }
  }

  private validateDate(value: string, label: string) {
    let timestamp = Date.parse(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== value
    ) {
      throw createApiServiceError(`${label} must be a valid date in YYYY-MM-DD format.`, {
        reason: 'invalid_input'
      });
    }
    return timestamp;
  }

  private validateDateRange(startDate: string, endDate: string, historicalSales = false) {
    let start = this.validateDate(startDate, 'startDate');
    let end = this.validateDate(endDate, 'endDate');
    if (start >= end || end - start > 366 * 86400000) {
      throw createApiServiceError('startDate must precede endDate by no more than 366 days.', {
        reason: 'invalid_input'
      });
    }
    if (historicalSales && endDate >= new Date().toISOString().slice(0, 10)) {
      throw createApiServiceError(
        'endDate must be before the current date for sales estimates.',
        { reason: 'invalid_input' }
      );
    }
  }

  private buildPaginationParams(pagination?: PaginationOptions): Record<string, string> {
    let params: Record<string, string> = {};
    if (pagination?.pageSize !== undefined) {
      if (
        !Number.isInteger(pagination.pageSize) ||
        pagination.pageSize < 1 ||
        pagination.pageSize > 100
      ) {
        throw createApiServiceError('pageSize must be a whole number between 1 and 100.', {
          reason: 'invalid_input'
        });
      }
      params['page[size]'] = String(pagination.pageSize);
    }
    if (pagination?.pageCursor) {
      params['page[cursor]'] = pagination.pageCursor;
    }
    return params;
  }

  async keywordsByAsin(params: KeywordsByAsinParams): Promise<ApiRecord> {
    this.validateRanges(params);
    let http = this.createAxiosInstance();

    let attributes: Record<string, unknown> = {
      asins: params.asins
    };

    if (params.includeVariants !== undefined)
      attributes.include_variants = params.includeVariants;
    if (params.minMonthlySearchVolumeExact !== undefined)
      attributes.min_monthly_search_volume_exact = params.minMonthlySearchVolumeExact;
    if (params.maxMonthlySearchVolumeExact !== undefined)
      attributes.max_monthly_search_volume_exact = params.maxMonthlySearchVolumeExact;
    if (params.minMonthlySearchVolumeBroad !== undefined)
      attributes.min_monthly_search_volume_broad = params.minMonthlySearchVolumeBroad;
    if (params.maxMonthlySearchVolumeBroad !== undefined)
      attributes.max_monthly_search_volume_broad = params.maxMonthlySearchVolumeBroad;
    if (params.minWordCount !== undefined) attributes.min_word_count = params.minWordCount;
    if (params.maxWordCount !== undefined) attributes.max_word_count = params.maxWordCount;
    if (params.minOrganicProductCount !== undefined)
      attributes.min_organic_product_count = params.minOrganicProductCount;
    if (params.maxOrganicProductCount !== undefined)
      attributes.max_organic_product_count = params.maxOrganicProductCount;

    let queryParams: Record<string, string> = {
      marketplace: this.marketplace,
      ...this.buildPaginationParams(params.pagination)
    };
    if (params.sort) queryParams.sort = params.sort;

    let response = await http.post(
      '/api/keywords/keywords_by_asin_query',
      {
        data: {
          type: 'keywords_by_asin_query',
          attributes
        }
      },
      { params: queryParams }
    );

    return responseRecord(response.data, 'API response');
  }

  async keywordsByKeyword(params: KeywordsByKeywordParams): Promise<ApiRecord> {
    this.validateRanges(params);
    let http = this.createAxiosInstance();

    let attributes: Record<string, unknown> = {
      search_terms: params.searchTerms
    };

    if (params.categories?.length) attributes.categories = params.categories;
    if (params.minMonthlySearchVolumeExact !== undefined)
      attributes.min_monthly_search_volume_exact = params.minMonthlySearchVolumeExact;
    if (params.maxMonthlySearchVolumeExact !== undefined)
      attributes.max_monthly_search_volume_exact = params.maxMonthlySearchVolumeExact;
    if (params.minMonthlySearchVolumeBroad !== undefined)
      attributes.min_monthly_search_volume_broad = params.minMonthlySearchVolumeBroad;
    if (params.maxMonthlySearchVolumeBroad !== undefined)
      attributes.max_monthly_search_volume_broad = params.maxMonthlySearchVolumeBroad;
    if (params.minWordCount !== undefined) attributes.min_word_count = params.minWordCount;
    if (params.maxWordCount !== undefined) attributes.max_word_count = params.maxWordCount;
    if (params.minOrganicProductCount !== undefined)
      attributes.min_organic_product_count = params.minOrganicProductCount;
    if (params.maxOrganicProductCount !== undefined)
      attributes.max_organic_product_count = params.maxOrganicProductCount;

    let queryParams: Record<string, string> = {
      marketplace: this.marketplace,
      ...this.buildPaginationParams(params.pagination)
    };
    if (params.sort) queryParams.sort = params.sort;

    let response = await http.post(
      '/api/keywords/keywords_by_keyword_query',
      {
        data: {
          type: 'keywords_by_keyword_query',
          attributes
        }
      },
      { params: queryParams }
    );

    return responseRecord(response.data, 'API response');
  }

  async historicalSearchVolume(params: HistoricalSearchVolumeParams): Promise<ApiRecord> {
    this.validateDateRange(params.startDate, params.endDate);
    let http = this.createAxiosInstance();

    let response = await http.get('/api/keywords/historical_search_volume', {
      params: {
        marketplace: this.marketplace,
        keyword: params.keyword,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });

    return responseRecord(response.data, 'API response');
  }

  async productDatabase(params: ProductDatabaseParams): Promise<ApiRecord> {
    this.validateRanges(params);
    let http = this.createAxiosInstance();

    let attributes: Record<string, unknown> = {};

    if (params.includeKeywords?.length) attributes.include_keywords = params.includeKeywords;
    if (params.excludeKeywords?.length) attributes.exclude_keywords = params.excludeKeywords;
    if (params.categories?.length) attributes.categories = params.categories;
    if (params.productTiers?.length) attributes.product_tiers = params.productTiers;
    if (params.sellerTypes?.length) attributes.seller_types = params.sellerTypes;
    if (params.excludeTopBrands !== undefined)
      attributes.exclude_top_brands = params.excludeTopBrands;
    if (params.excludeUnavailableProducts !== undefined)
      attributes.exclude_unavailable_products = params.excludeUnavailableProducts;
    if (params.minPrice !== undefined) attributes.min_price = params.minPrice;
    if (params.maxPrice !== undefined) attributes.max_price = params.maxPrice;
    if (params.minNet !== undefined) attributes.min_net = params.minNet;
    if (params.maxNet !== undefined) attributes.max_net = params.maxNet;
    if (params.minRank !== undefined) attributes.min_rank = params.minRank;
    if (params.maxRank !== undefined) attributes.max_rank = params.maxRank;
    if (params.minSales !== undefined) attributes.min_sales = params.minSales;
    if (params.maxSales !== undefined) attributes.max_sales = params.maxSales;
    if (params.minRevenue !== undefined) attributes.min_revenue = params.minRevenue;
    if (params.maxRevenue !== undefined) attributes.max_revenue = params.maxRevenue;
    if (params.minReviews !== undefined) attributes.min_reviews = params.minReviews;
    if (params.maxReviews !== undefined) attributes.max_reviews = params.maxReviews;
    if (params.minRating !== undefined) attributes.min_rating = params.minRating;
    if (params.maxRating !== undefined) attributes.max_rating = params.maxRating;
    if (params.minWeight !== undefined) attributes.min_weight = params.minWeight;
    if (params.maxWeight !== undefined) attributes.max_weight = params.maxWeight;
    if (params.minSellers !== undefined) attributes.min_sellers = params.minSellers;
    if (params.maxSellers !== undefined) attributes.max_sellers = params.maxSellers;
    if (params.minUpdatedAt !== undefined) {
      this.validateDate(params.minUpdatedAt, 'minUpdatedAt');
      attributes.min_updated_at = params.minUpdatedAt;
    }
    if (params.maxUpdatedAt !== undefined) {
      this.validateDate(params.maxUpdatedAt, 'maxUpdatedAt');
      attributes.max_updated_at = params.maxUpdatedAt;
    }
    if (
      params.minUpdatedAt &&
      params.maxUpdatedAt &&
      params.minUpdatedAt > params.maxUpdatedAt
    ) {
      throw createApiServiceError('minUpdatedAt must not be after maxUpdatedAt.', {
        reason: 'invalid_input'
      });
    }
    if (params.minLqs !== undefined) attributes.min_lqs = params.minLqs;
    if (params.maxLqs !== undefined) attributes.max_lqs = params.maxLqs;

    let queryParams: Record<string, string> = {
      marketplace: this.marketplace,
      ...this.buildPaginationParams(params.pagination)
    };
    if (params.sort) queryParams.sort = params.sort;

    let response = await http.post(
      '/api/product_database_query',
      {
        data: {
          type: 'product_database_query',
          attributes
        }
      },
      { params: queryParams }
    );

    return responseRecord(response.data, 'API response');
  }

  async salesEstimates(params: SalesEstimatesParams): Promise<ApiRecord> {
    this.validateDateRange(params.startDate, params.endDate, true);
    let http = this.createAxiosInstance();

    let response = await http.get('/api/sales_estimates_query', {
      params: {
        marketplace: this.marketplace,
        asin: params.asin,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });

    return responseRecord(response.data, 'API response');
  }

  async shareOfVoice(params: ShareOfVoiceParams): Promise<ApiRecord> {
    let http = this.createAxiosInstance();

    let response = await http.get('/api/share_of_voice', {
      params: {
        marketplace: this.marketplace,
        keyword: params.keyword
      }
    });

    return responseRecord(response.data, 'API response');
  }
}
