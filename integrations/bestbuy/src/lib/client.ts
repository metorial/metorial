import { createAxios } from 'slates';

export interface ProductsResponse {
  from: number;
  to: number;
  total: number;
  currentPage: number;
  totalPages: number;
  queryTime: string;
  totalTime: string;
  partial: boolean;
  canonicalUrl: string;
  products: Record<string, unknown>[];
}

export interface StoresResponse {
  from: number;
  to: number;
  total: number;
  currentPage: number;
  totalPages: number;
  queryTime: string;
  totalTime: string;
  stores: Record<string, unknown>[];
}

export interface CategoriesResponse {
  from: number;
  to: number;
  total: number;
  currentPage: number;
  totalPages: number;
  categories: Record<string, unknown>[];
}

export interface RecommendationProduct {
  sku: string;
  customerReviews: {
    averageScore: string;
    count: number;
  };
  descriptions: {
    short: string;
  };
  images: {
    standard: string;
  };
  names: {
    title: string;
  };
  prices: {
    current: number;
    regular: number;
  };
  links: {
    product: string;
    web: string;
    addToCart: string;
  };
  rank: number;
}

export interface RecommendationsResponse {
  metadata: {
    context: {
      canonicalUrl: string;
    };
    resultSet: {
      count: number;
    };
  };
  results: RecommendationProduct[];
}

export interface OpenBoxOffer {
  condition: string;
  prices: {
    current: number;
    regular: number;
  };
}

export interface OpenBoxProduct {
  customerReviews: {
    averageScore: number;
    count: number;
  };
  descriptions: {
    short: string;
  };
  images: {
    standard: string;
  };
  links: {
    product: string;
    web: string;
    addToCart: string;
  };
  names: {
    title: string;
  };
  offers: OpenBoxOffer[];
  prices: {
    current: number;
    regular: number;
  };
  sku: number;
}

export interface OpenBoxResponse {
  metadata: {
    resultSet: {
      count: number;
    };
  };
  results: OpenBoxProduct[];
}

export class BestBuyClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.bestbuy.com'
    });
  }

  // ---- Products API ----

  async searchProducts(params: {
    query?: string;
    keyword?: string;
    show?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ProductsResponse> {
    let searchPart = params.query ? `(${params.query})` : '';
    let queryParams: Record<string, string> = {
      apiKey: this.token,
      format: 'json'
    };

    if (params.keyword) {
      queryParams.search = params.keyword;
    }
    if (params.show) {
      queryParams.show = params.show;
    }
    if (params.sort) {
      queryParams.sort = params.sort;
    }
    if (params.page !== undefined) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize !== undefined) {
      queryParams.pageSize = String(params.pageSize);
    }

    let response = await this.axios.get(`/v1/products${searchPart}`, {
      params: queryParams
    });
    return response.data;
  }

  async getProduct(sku: string, show?: string): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {
      apiKey: this.token
    };
    if (show) {
      queryParams.show = show;
    }

    let response = await this.axios.get(`/v1/products/${sku}.json`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Categories API ----

  async searchCategories(params: {
    query?: string;
    show?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CategoriesResponse> {
    let searchPart = params.query ? `(${params.query})` : '';
    let queryParams: Record<string, string> = {
      apiKey: this.token,
      format: 'json'
    };

    if (params.show) {
      queryParams.show = params.show;
    }
    if (params.page !== undefined) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize !== undefined) {
      queryParams.pageSize = String(params.pageSize);
    }

    let response = await this.axios.get(`/v1/categories${searchPart}`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Stores API ----

  async searchStores(params: {
    query?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
    distance?: number;
    show?: string;
    page?: number;
    pageSize?: number;
  }): Promise<StoresResponse> {
    let filters: string[] = [];
    if (params.query) {
      filters.push(params.query);
    }
    if (params.postalCode && params.distance !== undefined) {
      filters.push(`area(${params.postalCode},${params.distance})`);
    } else if (params.postalCode) {
      filters.push(`area(${params.postalCode},25)`);
    }
    if (params.lat !== undefined && params.lng !== undefined) {
      let dist = params.distance !== undefined ? params.distance : 25;
      filters.push(`area(${params.lat},${params.lng},${dist})`);
    }

    let searchPart = filters.length > 0 ? `(${filters.join('&')})` : '';
    let queryParams: Record<string, string> = {
      apiKey: this.token,
      format: 'json'
    };

    if (params.show) {
      queryParams.show = params.show;
    }
    if (params.page !== undefined) {
      queryParams.page = String(params.page);
    }
    if (params.pageSize !== undefined) {
      queryParams.pageSize = String(params.pageSize);
    }

    let response = await this.axios.get(`/v1/stores${searchPart}`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- In-Store Availability ----

  async checkStoreAvailability(params: {
    sku: string;
    postalCode?: string;
    storeId?: string;
  }): Promise<ProductsResponse> {
    let filters: string[] = [];
    if (params.postalCode) {
      filters.push(`area(${params.postalCode},25)`);
    }
    if (params.storeId) {
      filters.push(`storeId=${params.storeId}`);
    }

    let storePart = filters.length > 0 ? `(${filters.join('&')})` : '';
    let queryParams: Record<string, string> = {
      apiKey: this.token,
      format: 'json'
    };

    let response = await this.axios.get(`/v1/products/${params.sku}/stores.json${storePart}`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Recommendations API ----

  async getTrendingProducts(categoryId?: string): Promise<RecommendationsResponse> {
    let path = categoryId
      ? `/v1/products/trendingViewed(categoryId=${categoryId})`
      : '/v1/products/trendingViewed';

    let response = await this.axios.get(path, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getMostViewedProducts(categoryId?: string): Promise<RecommendationsResponse> {
    let path = categoryId
      ? `/v1/products/mostViewed(categoryId=${categoryId})`
      : '/v1/products/mostViewed';

    let response = await this.axios.get(path, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getAlsoViewedProducts(sku: string): Promise<RecommendationsResponse> {
    let response = await this.axios.get(`/v1/products/${sku}/alsoViewed`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getAlsoBoughtProducts(sku: string): Promise<RecommendationsResponse> {
    let response = await this.axios.get(`/v1/products/${sku}/alsoBought`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getViewedUltimatelyBought(sku: string): Promise<RecommendationsResponse> {
    let response = await this.axios.get(`/v1/products/${sku}/viewedUltimatelyBought`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  // ---- Open Box / Buying Options API ----

  async getOpenBoxBySku(sku: string): Promise<OpenBoxResponse> {
    let response = await this.axios.get(`/beta/products/${sku}/openBox`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getOpenBoxBySkus(skus: string[]): Promise<OpenBoxResponse> {
    let skuList = skus.join(',');
    let response = await this.axios.get(`/beta/products/openBox(sku in(${skuList}))`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }

  async getOpenBoxByCategory(categoryId: string): Promise<OpenBoxResponse> {
    let response = await this.axios.get(`/beta/products/openBox(categoryId=${categoryId})`, {
      params: { apiKey: this.token }
    });
    return response.data;
  }
}
