import { createAxios } from 'slates';

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
    this.token = config.token;
    this.marketplace = config.marketplace;
    this.apiType = config.apiType;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: 'https://developer.junglescout.com',
      headers: {
        Authorization: this.token,
        'X-API-Type': this.apiType,
        Accept: 'application/vnd.junglescout.v1+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });
  }

  private buildPaginationParams(pagination?: PaginationOptions): Record<string, string> {
    let params: Record<string, string> = {};
    if (pagination?.pageSize) {
      params['page[size]'] = String(pagination.pageSize);
    }
    if (pagination?.pageCursor) {
      params['page[cursor]'] = pagination.pageCursor;
    }
    return params;
  }

  async keywordsByAsin(params: KeywordsByAsinParams): Promise<any> {
    let http = this.createAxiosInstance();

    let attributes: Record<string, any> = {
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

    return response.data;
  }

  async keywordsByKeyword(params: KeywordsByKeywordParams): Promise<any> {
    let http = this.createAxiosInstance();

    let attributes: Record<string, any> = {
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

    return response.data;
  }

  async historicalSearchVolume(params: HistoricalSearchVolumeParams): Promise<any> {
    let http = this.createAxiosInstance();

    let response = await http.get('/api/keywords/historical_search_volume', {
      params: {
        marketplace: this.marketplace,
        keyword: params.keyword,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });

    return response.data;
  }

  async productDatabase(params: ProductDatabaseParams): Promise<any> {
    let http = this.createAxiosInstance();

    let attributes: Record<string, any> = {};

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

    return response.data;
  }

  async salesEstimates(params: SalesEstimatesParams): Promise<any> {
    let http = this.createAxiosInstance();

    let response = await http.get('/api/sales_estimates_query', {
      params: {
        marketplace: this.marketplace,
        asin: params.asin,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });

    return response.data;
  }

  async shareOfVoice(params: ShareOfVoiceParams): Promise<any> {
    let http = this.createAxiosInstance();

    let response = await http.get('/api/share_of_voice', {
      params: {
        marketplace: this.marketplace,
        keyword: params.keyword
      }
    });

    return response.data;
  }
}
