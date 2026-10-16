import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let api = createAuthenticatedAxios({
  baseURL: 'https://api.countdownapi.com',
  timeout: 120_000,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Countdown API',
      reason: 'countdown_request_failed',
      nestedKeys: ['request_info', 'errors'],
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    })
});

export class CountdownClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim())
      throw createApiServiceError('Provide your Countdown API key.');
    this.apiKey = config.token;
  }

  async search(params: {
    ebayDomain?: string;
    searchTerm?: string;
    categoryId?: string;
    url?: string;
    listingType?: string;
    sortBy?: string;
    condition?: string;
    page?: number;
    maxPage?: number;
    num?: number;
    soldItems?: boolean;
    completedItems?: boolean;
    authorizedSellers?: boolean;
    returnsAccepted?: boolean;
    freeReturns?: boolean;
    authenticityVerified?: boolean;
    dealsAndSavings?: boolean;
    saleItems?: boolean;
    facets?: string;
    allowRewrittenResults?: boolean;
  }): Promise<any> {
    validatePagination(params);
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'search'
    };

    if (params.ebayDomain) queryParams.ebay_domain = params.ebayDomain;
    if (params.searchTerm) queryParams.search_term = params.searchTerm;
    if (params.categoryId) queryParams.category_id = params.categoryId;
    if (params.url) queryParams.url = params.url;
    if (params.listingType) queryParams.listing_type = params.listingType;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.condition) queryParams.condition = params.condition;
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.maxPage !== undefined) queryParams.max_page = String(params.maxPage);
    if (params.num !== undefined) queryParams.num = String(params.num);
    if (params.soldItems !== undefined) queryParams.sold_items = String(params.soldItems);
    if (params.completedItems !== undefined)
      queryParams.completed_items = String(params.completedItems);
    if (params.authorizedSellers !== undefined)
      queryParams.authorized_sellers = String(params.authorizedSellers);
    if (params.returnsAccepted !== undefined)
      queryParams.returns_accepted = String(params.returnsAccepted);
    if (params.freeReturns !== undefined)
      queryParams.free_returns = String(params.freeReturns);
    if (params.authenticityVerified !== undefined)
      queryParams.authenticity_verified = String(params.authenticityVerified);
    if (params.dealsAndSavings !== undefined)
      queryParams.deals_and_savings = String(params.dealsAndSavings);
    if (params.saleItems !== undefined) queryParams.sale_items = String(params.saleItems);
    if (params.facets) queryParams.facets = params.facets;
    if (params.allowRewrittenResults !== undefined)
      queryParams.allow_rewritten_results = String(params.allowRewrittenResults);

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getProduct(params: {
    ebayDomain?: string;
    epid?: string;
    gtin?: string;
    url?: string;
    skipGtinCache?: boolean;
    includePartsCompatibility?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'product'
    };

    if (params.ebayDomain) queryParams.ebay_domain = params.ebayDomain;
    if (params.epid) queryParams.epid = params.epid;
    if (params.gtin) queryParams.gtin = params.gtin;
    if (params.url) queryParams.url = params.url;
    if (params.skipGtinCache !== undefined)
      queryParams.skip_gtin_cache = String(params.skipGtinCache);
    if (params.includePartsCompatibility !== undefined)
      queryParams.include_parts_compatibility = String(params.includePartsCompatibility);

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getReviews(params: {
    ebayDomain?: string;
    epid?: string;
    gtin?: string;
    url?: string;
    skipGtinCache?: boolean;
    condition?: string;
    sortBy?: string;
    searchTerm?: string;
    page?: number;
    maxPage?: number;
  }): Promise<any> {
    validatePagination(params ?? {});
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'reviews'
    };

    if (params.ebayDomain) queryParams.ebay_domain = params.ebayDomain;
    if (params.epid) queryParams.epid = params.epid;
    if (params.gtin) queryParams.gtin = params.gtin;
    if (params.url) queryParams.url = params.url;
    if (params.skipGtinCache !== undefined)
      queryParams.skip_gtin_cache = String(params.skipGtinCache);
    if (params.condition) queryParams.condition = params.condition;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.searchTerm) queryParams.search_term = params.searchTerm;
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.maxPage !== undefined) queryParams.max_page = String(params.maxPage);

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getSellerProfile(params: {
    ebayDomain?: string;
    sellerName?: string;
    url?: string;
    isStore?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'seller_profile'
    };

    if (params.ebayDomain) queryParams.ebay_domain = params.ebayDomain;
    if (params.sellerName) queryParams.seller_name = params.sellerName;
    if (params.url) queryParams.url = params.url;
    if (params.isStore !== undefined) queryParams.is_store = String(params.isStore);

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getSellerFeedback(params: {
    ebayDomain?: string;
    sellerName?: string;
    url?: string;
    feedbackType?: string;
    searchTerm?: string;
    timePeriod?: string;
    overallRating?: string;
    page?: number;
    maxPage?: number;
    num?: number;
  }): Promise<any> {
    validatePagination(params ?? {});
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'seller_feedback'
    };

    if (params.ebayDomain) queryParams.ebay_domain = params.ebayDomain;
    if (params.sellerName) queryParams.seller_name = params.sellerName;
    if (params.url) queryParams.url = params.url;
    if (params.feedbackType) queryParams.seller_feedback_type = params.feedbackType;
    if (params.searchTerm) queryParams.search_term = params.searchTerm;
    if (params.timePeriod) queryParams.seller_feedback_time_period = params.timePeriod;
    if (params.overallRating)
      queryParams.seller_feedback_overall_rating = params.overallRating;
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.maxPage !== undefined) queryParams.max_page = String(params.maxPage);
    if (params.num !== undefined) queryParams.num = String(params.num);

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getAutocomplete(params: { ebayDomain: string; searchTerm: string }): Promise<any> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'autocomplete',
      ebay_domain: params.ebayDomain,
      search_term: params.searchTerm
    };

    let response = await api.get('/request', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async getAccount(): Promise<any> {
    let response = await api.get('/account', {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  // Collections API

  async createCollection(params: {
    name: string;
    enabled?: boolean;
    scheduleType?: string;
    priority?: string;
    scheduleDaysOfMonth?: number[];
    scheduleDaysOfWeek?: number[];
    scheduleHours?: number[];
    scheduleMinutes?: string;
    destinationIds?: string[];
    notificationEmail?: string;
    notificationWebhook?: string;
    notificationAsJson?: boolean;
    notificationAsJsonlines?: boolean;
    notificationAsCsv?: boolean;
    notificationCsvFields?: string;
    requestsType?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.scheduleType) body.schedule_type = params.scheduleType;
    if (params.priority) body.priority = params.priority;
    if (params.scheduleDaysOfMonth) body.schedule_days_of_month = params.scheduleDaysOfMonth;
    if (params.scheduleDaysOfWeek) body.schedule_days_of_week = params.scheduleDaysOfWeek;
    if (params.scheduleHours) body.schedule_hours = params.scheduleHours;
    if (params.scheduleMinutes) body.schedule_minutes = params.scheduleMinutes;
    if (params.destinationIds) body.destination_ids = params.destinationIds;
    if (params.notificationEmail) body.notification_email = params.notificationEmail;
    if (params.notificationWebhook) body.notification_webhook = params.notificationWebhook;
    if (params.notificationAsJson !== undefined)
      body.notification_as_json = params.notificationAsJson;
    if (params.notificationAsJsonlines !== undefined)
      body.notification_as_jsonlines = params.notificationAsJsonlines;
    if (params.notificationAsCsv !== undefined)
      body.notification_as_csv = params.notificationAsCsv;
    if (params.notificationCsvFields)
      body.notification_csv_fields = params.notificationCsvFields;
    if (params.requestsType) body.requests_type = params.requestsType;

    let response = await api.post('/collections', body, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async updateCollection(
    collectionId: string,
    params: {
      name?: string;
      enabled?: boolean;
      scheduleType?: string;
      priority?: string;
      scheduleDaysOfMonth?: number[];
      scheduleDaysOfWeek?: number[];
      scheduleHours?: number[];
      scheduleMinutes?: string;
      destinationIds?: string[];
      notificationEmail?: string;
      notificationWebhook?: string;
      notificationAsJson?: boolean;
      notificationAsJsonlines?: boolean;
      notificationAsCsv?: boolean;
      notificationCsvFields?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};

    if (params.name) body.name = params.name;
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.scheduleType) body.schedule_type = params.scheduleType;
    if (params.priority) body.priority = params.priority;
    if (params.scheduleDaysOfMonth) body.schedule_days_of_month = params.scheduleDaysOfMonth;
    if (params.scheduleDaysOfWeek) body.schedule_days_of_week = params.scheduleDaysOfWeek;
    if (params.scheduleHours) body.schedule_hours = params.scheduleHours;
    if (params.scheduleMinutes) body.schedule_minutes = params.scheduleMinutes;
    if (params.destinationIds) body.destination_ids = params.destinationIds;
    if (params.notificationEmail) body.notification_email = params.notificationEmail;
    if (params.notificationWebhook) body.notification_webhook = params.notificationWebhook;
    if (params.notificationAsJson !== undefined)
      body.notification_as_json = params.notificationAsJson;
    if (params.notificationAsJsonlines !== undefined)
      body.notification_as_jsonlines = params.notificationAsJsonlines;
    if (params.notificationAsCsv !== undefined)
      body.notification_as_csv = params.notificationAsCsv;
    if (params.notificationCsvFields)
      body.notification_csv_fields = params.notificationCsvFields;

    let response = await api.put(`/collections/${encodeURIComponent(collectionId)}`, body, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${encodeURIComponent(collectionId)}`, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async listCollections(params?: {
    status?: string;
    searchTerm?: string;
    searchType?: string;
    onlyWithResults?: boolean;
    onlyWithoutResults?: boolean;
    createdBefore?: string;
    createdAfter?: string;
    lastRunBefore?: string;
    lastRunAfter?: string;
    destinationId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<any> {
    validatePagination(params ?? {});
    let queryParams: Record<string, string> = {
      api_key: this.apiKey
    };

    if (params?.status) queryParams.status = params.status;
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.searchType) queryParams.search_type = params.searchType;
    if (params?.onlyWithResults !== undefined)
      queryParams.only_with_results = String(params.onlyWithResults);
    if (params?.onlyWithoutResults !== undefined)
      queryParams.only_without_results = String(params.onlyWithoutResults);
    if (params?.createdBefore) queryParams.created_before = params.createdBefore;
    if (params?.createdAfter) queryParams.created_after = params.createdAfter;
    if (params?.lastRunBefore) queryParams.last_run_before = params.lastRunBefore;
    if (params?.lastRunAfter) queryParams.last_run_after = params.lastRunAfter;
    if (params?.destinationId) queryParams.destination_id = params.destinationId;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.pageSize !== undefined) queryParams.page_size = String(params.pageSize);
    if (params?.sortBy) queryParams.sort_by = params.sortBy;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;

    let response = await api.get('/collections', { params: queryParams });
    return this.parseResponse(response.data);
  }

  async startCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${encodeURIComponent(collectionId)}/start`, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async stopCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${encodeURIComponent(collectionId)}/stop`, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async deleteCollection(collectionId: string): Promise<any> {
    let response = await api.delete(`/collections/${encodeURIComponent(collectionId)}`, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async listResultSets(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${encodeURIComponent(collectionId)}/results`, {
      params: { api_key: this.apiKey }
    });
    return this.parseResponse(response.data);
  }

  async getResultSet(
    collectionId: string,
    resultSetId: number,
    format: 'json' | 'jsonlines' | 'csv' = 'json',
    csvFields?: string
  ): Promise<any> {
    requireInteger(resultSetId, 'resultSetId', 1);
    let response = await api.get(
      `/collections/${encodeURIComponent(collectionId)}/results/${resultSetId}${format === 'json' ? '' : `/${format}`}`,
      {
        params: { api_key: this.apiKey, csv_fields: csvFields }
      }
    );
    return this.parseResponse(response.data);
  }

  async resendWebhook(collectionId: string, resultSetId: number): Promise<any> {
    let response = await api.get(
      `/collections/${encodeURIComponent(collectionId)}/results/${resultSetId}/resend_webhook`,
      {
        params: { api_key: this.apiKey }
      }
    );
    return this.parseResponse(response.data);
  }
  private parseResponse(data: unknown): Record<string, any> {
    let result = requireRecord(data, 'response');
    let info = requireRecord(result.request_info, 'request_info');
    if (info.success !== true) {
      if (info.success === false) {
        throw buildApiServiceError(
          { response: { data: result } },
          {
            providerLabel: 'Countdown API',
            reason: 'countdown_request_failed',
            nestedKeys: ['request_info', 'errors']
          }
        );
      }
      throw createApiServiceError(
        'Countdown API returned a response without a success status.'
      );
    }
    return result;
  }

  async listCollectionRequests(collectionId: string, page: number) {
    requireInteger(page, 'page', 1);
    let response = await api.get(
      `/collections/${encodeURIComponent(collectionId)}/requests/${page}`,
      {
        params: { api_key: this.apiKey }
      }
    );
    return this.parseResponse(response.data);
  }

  async manageCollectionRequests(
    collectionId: string,
    action: 'add' | 'update' | 'delete' | 'clear',
    requests?: Record<string, unknown>[],
    requestId?: string,
    parameters?: Record<string, unknown>
  ) {
    let path = `/collections/${encodeURIComponent(collectionId)}`;
    let options = { params: { api_key: this.apiKey } };
    let response =
      action === 'add'
        ? await api.put(path, { requests }, options)
        : action === 'update'
          ? await api.put(`${path}/${encodeURIComponent(requestId!)}`, parameters, options)
          : await api.delete(
              action === 'clear'
                ? `${path}/clear`
                : `${path}/${encodeURIComponent(requestId!)}`,
              options
            );
    return this.parseResponse(response.data);
  }

  async listErrorLogs(params: {
    page?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
  }) {
    validatePagination(params);
    let response = await api.get('/errorlogs', {
      params: {
        api_key: this.apiKey,
        page: params.page,
        search_term: params.searchTerm,
        sort_by: params.sortBy,
        sort_direction: params.sortDirection
      }
    });
    return this.parseResponse(response.data);
  }

  async listDestinations(params: {
    page?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
  }) {
    validatePagination(params);
    let response = await api.get('/destinations', {
      params: {
        api_key: this.apiKey,
        page: params.page,
        search_term: params.searchTerm,
        sort_by: params.sortBy,
        sort_direction: params.sortDirection
      }
    });
    return this.parseResponse(response.data);
  }
}

export function requireRecord(value: unknown, field: string): Record<string, any> {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`Countdown API returned an invalid ${field}.`);
  return value;
}

export function requireArray(value: unknown, field: string): any[] {
  if (!Array.isArray(value))
    throw createApiServiceError(`Countdown API returned an invalid ${field}.`);
  return value;
}

export function requireInteger(
  value: number | undefined,
  field: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${field} must be an integer between ${min} and ${max}.`);
  }
}

function validatePagination(params: { page?: number; maxPage?: number; pageSize?: number }) {
  requireInteger(params.page, 'page', 1);
  requireInteger(params.maxPage, 'maxPage', 1, 5);
  requireInteger(params.pageSize, 'pageSize', 1, 1000);
  if (
    params.page !== undefined &&
    params.maxPage !== undefined &&
    params.maxPage < params.page
  ) {
    throw createApiServiceError('maxPage must be at least page.');
  }
}

export function requireLookup(params: {
  url?: string;
  epid?: string;
  gtin?: string;
  sellerName?: string;
}) {
  if (
    ![params.url, params.epid, params.gtin, params.sellerName].some(value => value?.trim())
  ) {
    throw createApiServiceError('Provide a product or seller identifier, or an eBay URL.');
  }
}
