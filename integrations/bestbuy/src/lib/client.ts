import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import { createBestBuyResponseSanitizer } from './response';

let recordSchema = z.record(z.string(), z.unknown());
let collectionMetadata = z.object({
  total: z.number(),
  currentPage: z.number(),
  totalPages: z.number()
});
let productsSchema = collectionMetadata
  .extend({ products: z.array(recordSchema) })
  .passthrough();
let storesSchema = collectionMetadata.extend({ stores: z.array(recordSchema) }).passthrough();
let categoriesSchema = collectionMetadata
  .extend({ categories: z.array(recordSchema) })
  .passthrough();
let availabilitySchema = z
  .object({ stores: z.array(recordSchema), ispuEligible: z.boolean() })
  .passthrough();
let productSummarySchema = z.object({
  sku: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
  descriptions: z.object({ short: z.string() }),
  images: z.object({ standard: z.string() }),
  names: z.object({ title: z.string() }),
  prices: z.object({ current: z.number(), regular: z.number() }),
  links: z.object({ web: z.string(), addToCart: z.string() })
});
let recommendationSchema = productSummarySchema.extend({
  descriptions: z.object({ short: z.string().nullable() }),
  customerReviews: z.object({
    averageScore: z.union([z.string(), z.number()]),
    count: z.number()
  }),
  rank: z.number()
});
let openBoxProductSchema = productSummarySchema.extend({
  // Open Box does not require the unused cart URL to build its existing output.
  links: z.object({ web: z.string() }),
  offers: z.array(
    z.object({
      condition: z.string(),
      prices: z.object({ current: z.number(), regular: z.number() })
    })
  )
});
let recommendationsSchema = z.object({ results: z.array(recommendationSchema) });
let openBoxSchema = z.object({ results: z.array(openBoxProductSchema) });

export type RecommendationsResponse = z.infer<typeof recommendationsSchema>;
export type OpenBoxResponse = z.infer<typeof openBoxSchema>;
export type CatalogResource = 'products' | 'stores' | 'categories';

interface CollectionParams {
  query?: string;
  show?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

let parseResponse = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    let path = parsed.error.issues[0]?.path.join('.') || 'response';
    throw createApiServiceError(
      `Best Buy returned an invalid ${path} field. Try again later.`,
      {
        reason: 'bestbuy_invalid_response'
      }
    );
  }
  return parsed.data;
};

let validatePagination = (params: { page?: number; pageSize?: number }) => {
  if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
    throw createApiServiceError('page must be a whole number of at least 1.');
  }
  if (
    params.pageSize !== undefined &&
    (!Number.isInteger(params.pageSize) || params.pageSize < 1 || params.pageSize > 100)
  ) {
    throw createApiServiceError('pageSize must be a whole number from 1 to 100.');
  }
};

let requireDigits = (value: string, field: string) => {
  if (!/^\d+$/.test(value)) throw createApiServiceError(`${field} must contain only digits.`);
  return value;
};

let categoryFilter = (categoryId: string) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(categoryId)) {
    throw createApiServiceError(
      'categoryId must be a category identifier from browse_categories.'
    );
  }
  return `categoryId=${categoryId}`;
};

let requirePostalCode = (value: string) => {
  if (!/^\d{5}$/.test(value))
    throw createApiServiceError('postalCode must be a five-digit US postal code.');
  return value;
};

// The provider places its filter expression in the path, including AND/OR operators.
let filterPath = (query?: string) => {
  if (!query) return '';
  try {
    return `(${encodeURI(query).replace(/[?#/]/g, encodeURIComponent)})`;
  } catch {
    throw createApiServiceError('The filter query contains an invalid character.');
  }
};

let productQuery = (query?: string, keyword?: string) => {
  let filters: string[] = [];
  if (query) filters.push(`(${query})`);
  if (keyword !== undefined) {
    let words = keyword.trim().split(/\s+/).filter(Boolean);
    if (!words.length) throw createApiServiceError('keyword must contain a search term.');
    // Quoted terms keep punctuation inside the value rather than the filter expression.
    filters.push(
      ...words.map(word => `search="${word.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    );
  }
  return filters.join('&');
};

export class BestBuyClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private sanitizer: ReturnType<typeof createBestBuyResponseSanitizer>;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Best Buy Developer API key is required.');
    this.sanitizer = createBestBuyResponseSanitizer(config.token.trim());
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.bestbuy.com',
      params: { apiKey: config.token.trim() },
      contentType: false,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Best Buy',
          reason: 'bestbuy_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  redactMessage(message: string) {
    return this.sanitizer.text(message);
  }

  private async collection(
    resource: CatalogResource,
    params: CollectionParams & { keyword?: string; cursorMark?: string }
  ) {
    validatePagination(params);
    let query =
      resource === 'products' ? productQuery(params.query, params.keyword) : params.query;
    let response = await this.axios.get<unknown>(`/v1/${resource}${filterPath(query)}`, {
      params: pickDefined({
        format: 'json',
        show: params.show,
        sort: params.sort,
        page: params.page,
        pageSize: params.pageSize,
        cursorMark: params.cursorMark
      })
    });
    return this.sanitizer.response(response.data);
  }

  async searchProducts(params: CollectionParams & { keyword?: string }) {
    return parseResponse(productsSchema, await this.collection('products', params));
  }

  async getProduct(sku: string, show?: string) {
    let response = await this.axios.get<unknown>(
      `/v1/products/${requireDigits(sku, 'sku')}.json`,
      { params: pickDefined({ show }) }
    );
    return parseResponse(recordSchema, this.sanitizer.response(response.data));
  }

  async searchCategories(params: CollectionParams) {
    return parseResponse(categoriesSchema, await this.collection('categories', params));
  }

  async searchStores(
    params: CollectionParams & {
      postalCode?: string;
      lat?: number;
      lng?: number;
      distance?: number;
    }
  ) {
    let filters: string[] = [];
    if (params.query) filters.push(`(${params.query})`);
    if ((params.lat === undefined) !== (params.lng === undefined)) {
      throw createApiServiceError('Provide both lat and lng for a coordinate search.');
    }
    if (params.postalCode !== undefined && params.lat !== undefined) {
      throw createApiServiceError(
        'Use either postalCode or lat/lng to choose the search location.'
      );
    }
    if (
      params.distance !== undefined &&
      (!Number.isFinite(params.distance) || params.distance <= 0)
    ) {
      throw createApiServiceError('distance must be a positive number of miles.');
    }
    if (
      params.distance !== undefined &&
      params.postalCode === undefined &&
      params.lat === undefined
    ) {
      throw createApiServiceError('Provide postalCode or lat/lng when using distance.');
    }
    if (params.postalCode !== undefined)
      filters.push(`area(${requirePostalCode(params.postalCode)},${params.distance ?? 25})`);
    if (params.lat !== undefined && params.lng !== undefined) {
      if (
        !Number.isFinite(params.lat) ||
        Math.abs(params.lat) > 90 ||
        !Number.isFinite(params.lng) ||
        Math.abs(params.lng) > 180
      ) {
        throw createApiServiceError(
          'lat must be between -90 and 90 and lng between -180 and 180.'
        );
      }
      filters.push(`area(${params.lat},${params.lng},${params.distance ?? 25})`);
    }
    return parseResponse(
      storesSchema,
      await this.collection('stores', { ...params, query: filters.join('&') })
    );
  }

  async browseCatalog(
    params: CollectionParams & {
      resource: CatalogResource;
      keyword?: string;
      cursorMark?: string;
    }
  ) {
    if (params.keyword !== undefined && params.resource !== 'products') {
      throw createApiServiceError('keyword is supported only for the products catalog.');
    }
    if (params.cursorMark !== undefined && !params.cursorMark.trim()) {
      throw createApiServiceError('cursorMark must be "*" or the previous nextCursorMark.');
    }
    let result = parseResponse(
      recordSchema,
      await this.collection(params.resource, {
        ...params,
        cursorMark: params.cursorMark ?? '*'
      })
    );
    parseResponse(
      z.object({ total: z.number(), totalPages: z.number(), nextCursorMark: z.string() }),
      result
    );
    parseResponse(z.array(recordSchema), result[params.resource]);
    return result;
  }

  async checkStoreAvailability(params: {
    sku: string;
    postalCode?: string;
    storeId?: string;
  }) {
    if ((params.postalCode === undefined) === (params.storeId === undefined)) {
      throw createApiServiceError(
        'Provide exactly one of postalCode or storeId. Use search_stores to discover store IDs.'
      );
    }
    let response = await this.axios.get<unknown>(
      `/v1/products/${requireDigits(params.sku, 'sku')}/stores.json`,
      {
        params: pickDefined({
          postalCode:
            params.postalCode === undefined ? undefined : requirePostalCode(params.postalCode),
          storeId:
            params.storeId === undefined ? undefined : requireDigits(params.storeId, 'storeId')
        })
      }
    );
    return parseResponse(availabilitySchema, this.sanitizer.response(response.data));
  }

  private async recommendations(path: string) {
    let response = await this.axios.get<unknown>(path);
    let data = this.sanitizer.response(response.data);
    let result = parseResponse(recommendationsSchema, data);
    return { ...result, rawResponse: parseResponse(recordSchema, data) };
  }

  async getTrendingProducts(categoryId?: string) {
    return this.recommendations(
      `/v1/products/trendingViewed${categoryId === undefined ? '' : filterPath(categoryFilter(categoryId))}`
    );
  }

  async getMostViewedProducts(categoryId?: string) {
    return this.recommendations(
      `/v1/products/mostViewed${categoryId === undefined ? '' : filterPath(categoryFilter(categoryId))}`
    );
  }

  async getAlsoViewedProducts(sku: string) {
    return this.recommendations(`/v1/products/${requireDigits(sku, 'sku')}/alsoViewed`);
  }

  async getAlsoBoughtProducts(sku: string) {
    return this.recommendations(`/v1/products/${requireDigits(sku, 'sku')}/alsoBought`);
  }

  async getViewedUltimatelyBought(sku: string) {
    return this.recommendations(
      `/v1/products/${requireDigits(sku, 'sku')}/viewedUltimatelyBought`
    );
  }

  private async openBox(path: string, pagination: { page?: number; pageSize?: number } = {}) {
    validatePagination(pagination);
    let response = await this.axios.get<unknown>(path, { params: pickDefined(pagination) });
    let data = this.sanitizer.response(response.data);
    let result = parseResponse(openBoxSchema, data);
    for (let item of result.results) {
      if (!Number.isSafeInteger(Number(item.sku))) {
        throw createApiServiceError('Best Buy returned an invalid Open Box sku.', {
          reason: 'bestbuy_invalid_response'
        });
      }
    }
    return { ...result, rawResponse: parseResponse(recordSchema, data) };
  }

  async getOpenBoxBySku(sku: string) {
    return this.openBox(`/beta/products/${requireDigits(sku, 'sku')}/openBox`);
  }

  async getOpenBoxBySkus(skus: string[]) {
    if (skus.length < 1 || skus.length > 100)
      throw createApiServiceError('skus must contain from 1 to 100 product SKUs.');
    let skuList = skus.map(sku => requireDigits(sku, 'Each sku')).join(',');
    return this.openBox(`/beta/products/openBox${filterPath(`sku in(${skuList})`)}`);
  }

  async getOpenBoxByCategory(
    categoryId: string,
    pagination: { page?: number; pageSize?: number } = {}
  ) {
    return this.openBox(
      `/beta/products/openBox${filterPath(categoryFilter(categoryId))}`,
      pagination
    );
  }
}
