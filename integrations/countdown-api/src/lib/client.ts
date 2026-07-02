import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.countdownapi.com'
});

export class CountdownClient {
  private apiKey: string;

  constructor(config: { token: string }) {
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  }

  async getAutocomplete(params: { ebayDomain: string; searchTerm: string }): Promise<any> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      type: 'autocomplete',
      ebay_domain: params.ebayDomain,
      search_term: params.searchTerm
    };

    let response = await api.get('/request', { params: queryParams });
    return response.data;
  }

  async getAccount(): Promise<any> {
    let response = await api.get('/account', {
      params: { api_key: this.apiKey }
    });
    return response.data;
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
    return response.data;
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

    let response = await api.put(`/collections/${collectionId}`, body, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${collectionId}`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
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
    return response.data;
  }

  async startCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${collectionId}/start`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async stopCollection(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${collectionId}/stop`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<any> {
    let response = await api.delete(`/collections/${collectionId}`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async listResultSets(collectionId: string): Promise<any> {
    let response = await api.get(`/collections/${collectionId}/results`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async getResultSet(collectionId: string, resultSetId: number): Promise<any> {
    let response = await api.get(`/collections/${collectionId}/results/${resultSetId}`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async resendWebhook(collectionId: string, resultSetId: number): Promise<any> {
    let response = await api.get(
      `/collections/${collectionId}/results/${resultSetId}/resend_webhook`,
      {
        params: { api_key: this.apiKey }
      }
    );
    return response.data;
  }
}
