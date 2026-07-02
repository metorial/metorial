import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  environment: 'production' | 'sandbox';
  languageCode?: string;
  currencyCode?: string;
}

export class Client {
  private axios;

  constructor(private clientConfig: ClientConfig) {
    let baseURL =
      clientConfig.environment === 'sandbox'
        ? 'https://sandbox.api.test-headout.com'
        : 'https://www.headout.com';

    this.axios = createAxios({
      baseURL,
      headers: {
        'Headout-Auth': clientConfig.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Cities ───────────────────────────────────────────────────────

  async listCities(params?: { offset?: number; limit?: number }) {
    let response = await this.axios.get('/api/public/v1/city', { params });
    return response.data;
  }

  // ── Products (v1) ────────────────────────────────────────────────

  async getProduct(
    productId: string,
    params?: {
      currencyCode?: string;
      fetchVariants?: boolean;
      language?: string;
    }
  ) {
    let queryParams: Record<string, string | boolean | undefined> = {};
    if (params?.currencyCode || this.clientConfig.currencyCode) {
      queryParams.currencyCode = params?.currencyCode ?? this.clientConfig.currencyCode;
    }
    if (params?.fetchVariants !== undefined) {
      queryParams['fetch-variants'] = params.fetchVariants;
    }
    if (params?.language || this.clientConfig.languageCode) {
      queryParams.language = params?.language ?? this.clientConfig.languageCode;
    }

    let response = await this.axios.get(`/api/public/v1/product/get/${productId}`, {
      params: queryParams
    });
    return response.data;
  }

  async listProductsByCity(
    cityCode: string,
    params?: {
      currencyCode?: string;
      language?: string;
      offset?: number;
      limit?: number;
    }
  ) {
    let queryParams: Record<string, string | number | undefined> = {
      cityCode,
      currencyCode: params?.currencyCode ?? this.clientConfig.currencyCode,
      language: params?.language ?? this.clientConfig.languageCode,
      offset: params?.offset,
      limit: params?.limit
    };

    let response = await this.axios.get('/api/public/v1/product/listing/list-by/city', {
      params: queryParams
    });
    return response.data;
  }

  async listProductsByCategory(
    categoryId: string,
    params?: {
      currencyCode?: string;
      language?: string;
      offset?: number;
      limit?: number;
    }
  ) {
    let queryParams: Record<string, string | number | undefined> = {
      categoryId,
      currencyCode: params?.currencyCode ?? this.clientConfig.currencyCode,
      language: params?.language ?? this.clientConfig.languageCode,
      offset: params?.offset,
      limit: params?.limit
    };

    let response = await this.axios.get('/api/public/v1/product/listing/list-by/category', {
      params: queryParams
    });
    return response.data;
  }

  // ── Products (v2) ────────────────────────────────────────────────

  async searchProducts(params: {
    cityCode: string;
    collectionId?: string;
    categoryId?: string;
    subCategoryId?: string;
    languageCode?: string;
    currencyCode?: string;
    campaignName?: string;
    offset?: number;
    limit?: number;
  }) {
    let queryParams = {
      ...params,
      languageCode: params.languageCode ?? this.clientConfig.languageCode,
      currencyCode: params.currencyCode ?? this.clientConfig.currencyCode
    };

    let response = await this.axios.get('/api/public/v2/products', { params: queryParams });
    return response.data;
  }

  // ── Categories ───────────────────────────────────────────────────

  async listCategories(cityCode: string, params?: { languageCode?: string }) {
    let queryParams = {
      cityCode,
      languageCode: params?.languageCode ?? this.clientConfig.languageCode
    };

    let response = await this.axios.get('/api/public/v2/categories', { params: queryParams });
    return response.data;
  }

  // ── Subcategories ────────────────────────────────────────────────

  async listSubcategories(cityCode: string, params?: { languageCode?: string }) {
    let queryParams = {
      cityCode,
      languageCode: params?.languageCode ?? this.clientConfig.languageCode
    };

    let response = await this.axios.get('/api/public/v2/subcategories', {
      params: queryParams
    });
    return response.data;
  }

  // ── Collections ──────────────────────────────────────────────────

  async listCollections(
    cityCode: string,
    params?: {
      languageCode?: string;
      offset?: number;
      limit?: number;
    }
  ) {
    let queryParams = {
      cityCode,
      languageCode: params?.languageCode ?? this.clientConfig.languageCode,
      offset: params?.offset,
      limit: params?.limit
    };

    let response = await this.axios.get('/api/public/v2/collections', { params: queryParams });
    return response.data;
  }

  // ── Inventory & Pricing ──────────────────────────────────────────

  async getInventory(
    variantId: string,
    params?: {
      startDateTime?: string;
      endDateTime?: string;
      offset?: number;
      limit?: number;
      currencyCode?: string;
    }
  ) {
    let queryParams: Record<string, string | number | undefined> = {
      variantId,
      startDateTime: params?.startDateTime,
      endDateTime: params?.endDateTime,
      offset: params?.offset,
      limit: params?.limit,
      currencyCode: params?.currencyCode ?? this.clientConfig.currencyCode
    };

    let response = await this.axios.get('/api/public/v1/inventory/list-by/variant', {
      params: queryParams
    });
    return response.data;
  }

  // ── Bookings ─────────────────────────────────────────────────────

  async createBooking(body: {
    variantId: string;
    inventoryId: string;
    customersDetails: {
      count: number;
      customers: Array<{
        personType?: string;
        isPrimary?: boolean;
        inputFields: Array<{
          id: string;
          value: string;
        }>;
      }>;
    };
    variantInputFields?: Array<{
      id: string;
      value: string;
    }>;
    price?: {
      amount: number;
      currencyCode: string;
    };
  }) {
    let response = await this.axios.post('/api/public/v1/booking', body);
    return response.data;
  }

  async captureBooking(
    bookingId: string,
    body?: {
      status?: string;
      partnerReferenceId?: string;
    }
  ) {
    let response = await this.axios.put(`/api/public/v1/booking/${bookingId}`, {
      status: 'PENDING',
      ...body
    });
    return response.data;
  }

  async getBooking(bookingId: string) {
    let response = await this.axios.get(`/api/public/v1/booking/${bookingId}`);
    return response.data;
  }

  async listBookings(params?: { offset?: number; limit?: number }) {
    let response = await this.axios.get('/api/public/v1/booking', { params });
    return response.data;
  }
}
