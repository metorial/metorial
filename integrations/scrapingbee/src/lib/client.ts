import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://app.scrapingbee.com';

let amazonMarketplaceCountries: Record<string, string> = {
  com: 'us',
  ae: 'ae',
  ca: 'ca',
  cn: 'cn',
  'co.jp': 'jp',
  'co.uk': 'gb',
  'com.au': 'au',
  'com.be': 'be',
  'com.br': 'br',
  'com.mx': 'mx',
  'com.tr': 'tr',
  de: 'de',
  eg: 'eg',
  es: 'es',
  fr: 'fr',
  in: 'in',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  sa: 'sa',
  se: 'se',
  sg: 'sg'
};

let getAmazonLocationParams = (params: { domain?: string; countryCode?: string }) => {
  let domain = params.domain
    ?.trim()
    .toLowerCase()
    .replace(/^(?:www\.)?amazon\./, '');
  let country = params.countryCode?.trim().toLowerCase();
  let marketplace = domain || 'com';
  if (country && amazonMarketplaceCountries[marketplace] === country) {
    throw createApiServiceError(
      `countryCode "${country}" matches the amazon.${marketplace} marketplace. Omit countryCode to use that marketplace's own country.`
    );
  }
  let queryParams: Record<string, string> = {};
  if (domain) queryParams.domain = domain;
  if (country) queryParams.country = country;
  return queryParams;
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      contentType: false,
      timeout: 145000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ScrapingBee',
          reason: 'scrapingbee_api_error'
        })
    });
  }

  async scrapeWebpage(params: {
    url: string;
    renderJs?: boolean;
    premiumProxy?: boolean;
    countryCode?: string;
    blockAds?: boolean;
    blockResources?: boolean;
    device?: 'desktop' | 'mobile';
    wait?: number;
    waitFor?: string;
    customHeaders?: Record<string, string>;
    cookies?: string;
    forwardHeaders?: boolean;
    returnPageSource?: boolean;
    timeout?: number;
    ownProxy?: string;
    jsonResponse?: boolean;
    returnPageText?: boolean;
    returnPageMarkdown?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      url: params.url
    };

    if (params.renderJs !== undefined) queryParams.render_js = params.renderJs;
    if (params.premiumProxy !== undefined) queryParams.premium_proxy = params.premiumProxy;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.blockAds !== undefined) queryParams.block_ads = params.blockAds;
    if (params.blockResources !== undefined)
      queryParams.block_resources = params.blockResources;
    if (params.device) queryParams.device = params.device;
    if (params.wait !== undefined) queryParams.wait = params.wait;
    if (params.waitFor) queryParams.wait_for = params.waitFor;
    if (params.returnPageSource !== undefined)
      queryParams.return_page_source = params.returnPageSource;
    if (params.timeout !== undefined) {
      if (params.timeout < 1 || params.timeout > 140) {
        throw createApiServiceError('Timeout must be between 1 and 140 seconds.');
      }
      queryParams.timeout = Math.round(params.timeout * 1000);
    }
    if (params.ownProxy) queryParams.own_proxy = params.ownProxy;
    if (params.jsonResponse !== undefined) queryParams.json_response = params.jsonResponse;
    if (params.returnPageText !== undefined)
      queryParams.return_page_text = params.returnPageText;
    if (params.returnPageMarkdown !== undefined) {
      queryParams.return_page_markdown = params.returnPageMarkdown;
    }
    if (params.forwardHeaders !== undefined)
      queryParams.forward_headers = params.forwardHeaders;
    if (params.cookies) queryParams.cookies = params.cookies;

    let headers: Record<string, string> = {};
    if (params.customHeaders && Object.keys(params.customHeaders).length > 0) {
      queryParams.forward_headers = params.forwardHeaders ?? true;
      for (let [key, value] of Object.entries(params.customHeaders)) {
        headers[`Spb-${key}`] = value;
      }
    }

    let response = await this.axios.get('/api/v1/', {
      params: queryParams,
      headers,
      responseType: params.jsonResponse ? 'json' : 'text',
      timeout: (params.timeout ?? 140) * 1000 + 1000
    });

    return response.data;
  }

  async extractData(params: {
    url: string;
    extractionRules: Record<string, any>;
    renderJs?: boolean;
    premiumProxy?: boolean;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    wait?: number;
    waitFor?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      url: params.url
    };

    if (params.renderJs !== undefined) queryParams.render_js = params.renderJs;
    if (params.premiumProxy !== undefined) queryParams.premium_proxy = params.premiumProxy;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.device) queryParams.device = params.device;
    if (params.wait !== undefined) queryParams.wait = params.wait;
    if (params.waitFor) queryParams.wait_for = params.waitFor;

    queryParams.extract_rules = JSON.stringify(params.extractionRules);

    let response = await this.axios.get('/api/v1/', {
      params: queryParams
    });

    return response.data;
  }

  async aiExtract(params: {
    url: string;
    aiQuery?: string;
    aiExtractRules?: Record<string, any>;
    aiSelector?: string;
    renderJs?: boolean;
    premiumProxy?: boolean;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    wait?: number;
    waitFor?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      url: params.url
    };

    if (params.aiQuery) queryParams.ai_query = params.aiQuery;
    if (params.aiExtractRules)
      queryParams.ai_extract_rules = JSON.stringify(params.aiExtractRules);
    if (params.aiSelector) queryParams.ai_selector = params.aiSelector;
    if (params.renderJs !== undefined) queryParams.render_js = params.renderJs;
    if (params.premiumProxy !== undefined) queryParams.premium_proxy = params.premiumProxy;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.device) queryParams.device = params.device;
    if (params.wait !== undefined) queryParams.wait = params.wait;
    if (params.waitFor) queryParams.wait_for = params.waitFor;

    let response = await this.axios.get('/api/v1/', {
      params: queryParams
    });

    return response.data;
  }

  async captureScreenshot(params: {
    url: string;
    fullPage?: boolean;
    windowWidth?: number;
    windowHeight?: number;
    screenshotSelector?: string;
    renderJs?: boolean;
    premiumProxy?: boolean;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    wait?: number;
    waitFor?: string;
  }): Promise<string> {
    let queryParams: Record<string, any> = {
      url: params.url,
      screenshot: true
    };

    if (params.fullPage !== undefined) queryParams.screenshot_full_page = params.fullPage;
    if (params.windowWidth !== undefined) queryParams.window_width = params.windowWidth;
    if (params.windowHeight !== undefined) queryParams.window_height = params.windowHeight;
    if (params.screenshotSelector) queryParams.screenshot_selector = params.screenshotSelector;
    if (params.renderJs !== undefined) queryParams.render_js = params.renderJs;
    if (params.premiumProxy !== undefined) queryParams.premium_proxy = params.premiumProxy;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.device) queryParams.device = params.device;
    if (params.wait !== undefined) queryParams.wait = params.wait;
    if (params.waitFor) queryParams.wait_for = params.waitFor;

    let response = await this.axios.get('/api/v1/', {
      params: queryParams,
      responseType: 'arraybuffer'
    });

    let base64 = Buffer.from(response.data, 'binary').toString('base64');
    return base64;
  }

  async runJsScenario(params: {
    url: string;
    jsScenario: {
      instructions: Record<string, any>[];
      strict?: boolean;
    };
    renderJs?: boolean;
    premiumProxy?: boolean;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    wait?: number;
    waitFor?: string;
    jsonResponse?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      url: params.url,
      js_scenario: JSON.stringify(params.jsScenario)
    };

    if (params.renderJs !== undefined) queryParams.render_js = params.renderJs;
    else queryParams.render_js = true;
    if (params.premiumProxy !== undefined) queryParams.premium_proxy = params.premiumProxy;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.device) queryParams.device = params.device;
    if (params.wait !== undefined) queryParams.wait = params.wait;
    if (params.waitFor) queryParams.wait_for = params.waitFor;
    if (params.jsonResponse !== undefined) queryParams.json_response = params.jsonResponse;

    let response = await this.axios.get('/api/v1/', {
      params: queryParams
    });

    return response.data;
  }

  async googleSearch(params: {
    search: string;
    searchType?: string;
    language?: string;
    countryCode?: string;
    location?: string;
    nbResults?: number;
    page?: number;
    device?: 'desktop' | 'mobile';
    additionalParams?: Record<string, string>;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      search: params.search
    };

    if (params.searchType) {
      queryParams.search_type = params.searchType === 'search' ? 'classic' : params.searchType;
    }
    if (params.language) queryParams.language = params.language;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.location) queryParams.location = params.location;
    if (params.nbResults !== undefined) queryParams.nb_results = params.nbResults;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.device) queryParams.device = params.device;

    if (params.additionalParams && Object.keys(params.additionalParams).length > 0) {
      queryParams.extra_params = new URLSearchParams(params.additionalParams).toString();
    }

    let response = await this.axios.get('/api/v1/google', {
      params: queryParams
    });

    return response.data;
  }

  async amazonSearch(params: {
    query: string;
    domain?: string;
    language?: string;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    sortBy?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      query: params.query,
      ...getAmazonLocationParams(params)
    };

    if (params.language) queryParams.language = params.language;
    if (params.device) queryParams.device = params.device;
    if (params.sortBy) {
      let legacySort: Record<string, string> = {
        'price-asc-rank': 'price_low_to_high',
        'price-desc-rank': 'price_high_to_low',
        'review-rank': 'average_review',
        'date-desc-rank': 'most_recent'
      };
      queryParams.sort_by = legacySort[params.sortBy] ?? params.sortBy;
    }
    if (params.minPrice !== undefined) queryParams.min_price = params.minPrice;
    if (params.maxPrice !== undefined) queryParams.max_price = params.maxPrice;
    if (params.page !== undefined) queryParams.page = params.page;

    let response = await this.axios.get('/api/v1/amazon/search', {
      params: queryParams
    });

    return response.data;
  }

  async amazonProduct(params: {
    asin: string;
    domain?: string;
    language?: string;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      query: params.asin,
      ...getAmazonLocationParams(params)
    };

    if (params.language) queryParams.language = params.language;
    if (params.device) queryParams.device = params.device;

    let response = await this.axios.get('/api/v1/amazon/product', {
      params: queryParams
    });

    return response.data;
  }

  async amazonPricing(params: {
    asin: string;
    domain?: string;
    language?: string;
    countryCode?: string;
    currency?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {
      asin: params.asin,
      ...getAmazonLocationParams(params)
    };
    if (params.language) queryParams.language = params.language;
    if (params.currency) queryParams.currency = params.currency;

    let response = await this.axios.get('/api/v1/amazon/pricing/', { params: queryParams });
    return response.data;
  }

  async youtubeSearch(params: {
    query: string;
    uploadDate?: string;
    page?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      search: params.query
    };

    if (params.uploadDate) {
      let uploadDates: Record<string, string> = {
        hour: 'last_hour',
        today: 'today',
        week: 'this_week',
        month: 'this_month',
        year: 'this_year'
      };
      queryParams.upload_date = uploadDates[params.uploadDate] ?? params.uploadDate;
    }
    if (params.page !== undefined) queryParams.page = params.page;

    let response = await this.axios.get('/api/v1/youtube/search', {
      params: queryParams
    });

    return response.data;
  }

  async youtubeMetadata(params: { videoId: string }): Promise<any> {
    let queryParams: Record<string, any> = {
      video_id: params.videoId
    };

    let response = await this.axios.get('/api/v1/youtube/metadata', {
      params: queryParams
    });

    return response.data;
  }

  async youtubeTranscript(params: { videoId: string; language?: string }): Promise<any> {
    let queryParams: Record<string, any> = {
      video_id: params.videoId
    };

    if (params.language) queryParams.language = params.language;

    let response = await this.axios.get('/api/v1/youtube/subtitles', {
      params: queryParams
    });

    return response.data;
  }

  async youtubeTrainability(params: { videoId: string }): Promise<any> {
    let queryParams: Record<string, any> = {
      video_id: params.videoId
    };

    let response = await this.axios.get('/api/v1/store/youtube/trainability', {
      params: queryParams
    });

    return response.data;
  }

  async walmartSearch(params: {
    query: string;
    sortBy?: string;
    minPrice?: number;
    maxPrice?: number;
    fulfillmentType?: string;
    fulfillmentSpeed?: string;
    domain?: string;
    page?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      query: params.query
    };

    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.minPrice !== undefined) queryParams.min_price = params.minPrice;
    if (params.maxPrice !== undefined) queryParams.max_price = params.maxPrice;
    if (params.fulfillmentType) queryParams.fulfillment_type = params.fulfillmentType;
    if (params.fulfillmentSpeed) queryParams.fulfillment_speed = params.fulfillmentSpeed;
    if (params.domain) queryParams.domain = params.domain.replace(/^(?:www\.)?walmart\./i, '');
    if (params.page !== undefined) queryParams.page = params.page;

    let response = await this.axios.get('/api/v1/walmart/search', {
      params: queryParams
    });

    return response.data;
  }

  async walmartProduct(params: {
    productId: string;
    deliveryZip?: string;
    storeId?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      product_id: params.productId
    };

    if (params.deliveryZip) queryParams.delivery_zip = params.deliveryZip;
    if (params.storeId) queryParams.store_id = params.storeId;

    let response = await this.axios.get('/api/v1/walmart/product', {
      params: queryParams
    });

    return response.data;
  }

  async getUsage(): Promise<any> {
    let response = await this.axios.get('/api/v1/usage');

    return response.data;
  }
}
