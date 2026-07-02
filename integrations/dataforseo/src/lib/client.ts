import { createAxios } from 'slates';
import { dataForSEOApiError, dataForSEOServiceError } from './errors';

export interface DataForSEOResponse<T = any> {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: any;
    result: T[];
  }>;
}

export type SerpSearchEngine = 'google' | 'bing' | 'yahoo' | 'youtube';

export type DataForSEOTaskEndpoint =
  | 'google_shopping_products'
  | 'amazon_products'
  | 'amazon_asin'
  | 'google_play_app_searches'
  | 'google_play_app_info'
  | 'google_play_app_reviews'
  | 'google_reviews';

let taskResultPaths: Record<DataForSEOTaskEndpoint, string> = {
  google_shopping_products: 'merchant/google/products/task_get/advanced',
  amazon_products: 'merchant/amazon/products/task_get/advanced',
  amazon_asin: 'merchant/amazon/asin/task_get/advanced',
  google_play_app_searches: 'app_data/google/app_searches/task_get/advanced',
  google_play_app_info: 'app_data/google/app_info/task_get/advanced',
  google_play_app_reviews: 'app_data/google/app_reviews/task_get/advanced',
  google_reviews: 'business_data/google/reviews/task_get'
};

let removeUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

let assertDataForSEOTopLevelOk = (response: DataForSEOResponse, operation: string) => {
  if (response.status_code === 20000) {
    return;
  }

  throw dataForSEOServiceError(
    `DataForSEO API ${operation} failed: ${response.status_message} (code: ${response.status_code}).`
  );
};

let assertDataForSEOTaskOk = (
  task: DataForSEOResponse['tasks'][number] | undefined,
  operation: string
) => {
  if (!task) {
    throw dataForSEOServiceError(`DataForSEO API ${operation} did not return a task.`);
  }

  if (task.status_code >= 40000) {
    throw dataForSEOServiceError(
      `DataForSEO API ${operation} task failed: ${task.status_message} (code: ${task.status_code}).`
    );
  }
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.dataforseo.com/v3',
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async post<T = any>(
    path: string,
    body: Record<string, unknown>[],
    operation: string
  ) {
    try {
      let response = await this.axios.post<DataForSEOResponse<T>>(path, body);
      assertDataForSEOTopLevelOk(response.data, operation);
      return response.data;
    } catch (error) {
      throw dataForSEOApiError(error, operation);
    }
  }

  private async get<T = any>(path: string, operation: string) {
    try {
      let response = await this.axios.get<DataForSEOResponse<T>>(path);
      assertDataForSEOTopLevelOk(response.data, operation);
      return response.data;
    } catch (error) {
      throw dataForSEOApiError(error, operation);
    }
  }

  // SERP

  async serpOrganicLive(params: {
    searchEngine: SerpSearchEngine;
    keyword: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    device?: string;
    os?: string;
    depth?: number;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      device: params.device,
      os: params.os,
      ...(params.searchEngine === 'youtube'
        ? { block_depth: params.depth }
        : { depth: params.depth })
    });

    return this.post(
      `/serp/${params.searchEngine}/organic/live/advanced`,
      [body],
      `${params.searchEngine} SERP organic live search`
    );
  }

  async serpGoogleOrganicLive(
    params: Omit<Parameters<Client['serpOrganicLive']>[0], 'searchEngine'>
  ) {
    return this.serpOrganicLive({ ...params, searchEngine: 'google' });
  }

  // Keywords Data

  async keywordsSearchVolumeLive(params: {
    keywords: string[];
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    searchPartners?: boolean;
  }) {
    let body = removeUndefined({
      keywords: params.keywords,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      search_partners: params.searchPartners
    });

    return this.post(
      '/keywords_data/google_ads/search_volume/live',
      [body],
      'keyword search volume'
    );
  }

  async keywordsForSiteLive(params: {
    target: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    includeSerpInfo?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let body = removeUndefined({
      target: params.target,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      include_serp_info: params.includeSerpInfo,
      limit: params.limit,
      offset: params.offset
    });

    return this.post(
      '/keywords_data/google_ads/keywords_for_site/live',
      [body],
      'keywords for site'
    );
  }

  // Backlinks

  async backlinksSummaryLive(params: {
    target: string;
    includeSubdomains?: boolean;
    includeIndirectLinks?: boolean;
    backlinksFilters?: unknown[];
    backlinksStatusType?: 'all' | 'live' | 'lost';
  }) {
    let body = removeUndefined({
      target: params.target,
      include_subdomains: params.includeSubdomains,
      include_indirect_links: params.includeIndirectLinks,
      backlinks_filters: params.backlinksFilters,
      backlinks_status_type: params.backlinksStatusType
    });

    return this.post('/backlinks/summary/live', [body], 'backlinks summary');
  }

  async backlinksLive(params: {
    target: string;
    mode?: string;
    filters?: unknown[];
    limit?: number;
    offset?: number;
    includeSubdomains?: boolean;
    includeIndirectLinks?: boolean;
    backlinksFilters?: unknown[];
    backlinksStatusType?: 'all' | 'live' | 'lost';
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target: params.target,
      mode: params.mode,
      filters: params.filters ?? params.backlinksFilters,
      limit: params.limit,
      offset: params.offset,
      include_subdomains: params.includeSubdomains,
      include_indirect_links: params.includeIndirectLinks,
      backlinks_status_type: params.backlinksStatusType,
      order_by: params.orderBy
    });

    return this.post('/backlinks/backlinks/live', [body], 'backlinks list');
  }

  async backlinksReferringDomainsLive(params: {
    target: string;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    backlinksFilters?: unknown[];
    includeSubdomains?: boolean;
    includeIndirectLinks?: boolean;
    backlinksStatusType?: 'all' | 'live' | 'lost';
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target: params.target,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      backlinks_filters: params.backlinksFilters,
      include_subdomains: params.includeSubdomains,
      include_indirect_links: params.includeIndirectLinks,
      backlinks_status_type: params.backlinksStatusType,
      order_by: params.orderBy
    });

    return this.post(
      '/backlinks/referring_domains/live',
      [body],
      'backlinks referring domains'
    );
  }

  // Domain Analytics

  async whoisOverviewLive(params: { target: string }) {
    return this.post(
      '/domain_analytics/whois/overview/live',
      [{ target: params.target }],
      'whois overview'
    );
  }

  async technologiesDomainTechnologiesLive(params: { target: string }) {
    return this.post(
      '/domain_analytics/technologies/domain_technologies/live',
      [{ target: params.target }],
      'domain technologies'
    );
  }

  // OnPage

  async onPageTaskPost(params: {
    target: string;
    maxCrawlPages?: number;
    startUrl?: string;
    enableJavascript?: boolean;
    enableBrowserRendering?: boolean;
    calculateKeywordDensity?: boolean;
    storeRawHtml?: boolean;
    customJs?: string;
    checkSpell?: boolean;
    loadResources?: boolean;
    disableCookiePopup?: boolean;
    checksThreshold?: Record<string, number>;
  }) {
    let body = removeUndefined({
      target: params.target,
      max_crawl_pages: params.maxCrawlPages,
      start_url: params.startUrl,
      enable_javascript: params.enableJavascript,
      enable_browser_rendering: params.enableBrowserRendering,
      calculate_keyword_density: params.calculateKeywordDensity,
      store_raw_html: params.storeRawHtml,
      custom_js: params.customJs,
      check_spell: params.checkSpell,
      load_resources: params.loadResources,
      disable_cookie_popup: params.disableCookiePopup,
      checks_threshold: params.checksThreshold
    });

    return this.post('/on_page/task_post', [body], 'on-page task creation');
  }

  async onPageSummary(taskId: string) {
    return this.get(`/on_page/summary/${taskId}`, 'on-page summary');
  }

  async onPagePages(params: {
    taskId: string;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      id: params.taskId,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post('/on_page/pages', [body], 'on-page pages');
  }

  // Content Analysis

  async contentAnalysisSearchLive(params: {
    keyword: string;
    keywordFields?: Record<string, string>;
    pageType?: string[];
    searchMode?: string;
    limit?: number;
    offset?: number;
    internalListLimit?: number;
    positiveConnotationThreshold?: number;
    sentimentConnotation?: string;
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      keyword_fields: params.keywordFields,
      page_type: params.pageType,
      search_mode: params.searchMode,
      limit: params.limit,
      offset: params.offset,
      internal_list_limit: params.internalListLimit,
      positive_connotation_threshold: params.positiveConnotationThreshold,
      sentiment_connotation: params.sentimentConnotation,
      order_by: params.orderBy
    });

    return this.post('/content_analysis/search/live', [body], 'content analysis search');
  }

  async contentAnalysisSummaryLive(params: {
    keyword: string;
    keywordFields?: Record<string, string>;
    pageType?: string[];
    internalListLimit?: number;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      keyword_fields: params.keywordFields,
      page_type: params.pageType,
      internal_list_limit: params.internalListLimit
    });

    return this.post('/content_analysis/summary/live', [body], 'content analysis summary');
  }

  // DataForSEO Labs

  async labsKeywordSuggestionsLive(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    includeSerpInfo?: boolean;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      include_serp_info: params.includeSerpInfo,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/dataforseo_labs/google/keyword_suggestions/live',
      [body],
      'Labs keyword suggestions'
    );
  }

  async labsRelatedKeywordsLive(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    includeSerpInfo?: boolean;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      include_serp_info: params.includeSerpInfo,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/dataforseo_labs/google/related_keywords/live',
      [body],
      'Labs related keywords'
    );
  }

  async labsRankedKeywordsLive(params: {
    target: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    ignoreSynonyms?: boolean;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target: params.target,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      ignore_synonyms: params.ignoreSynonyms,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/dataforseo_labs/google/ranked_keywords/live',
      [body],
      'Labs ranked keywords'
    );
  }

  async labsDomainRankOverviewLive(params: {
    target: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
  }) {
    let body = removeUndefined({
      target: params.target,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode
    });

    return this.post(
      '/dataforseo_labs/google/domain_rank_overview/live',
      [body],
      'Labs domain rank overview'
    );
  }

  async labsCompetitorsDomainLive(params: {
    target: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target: params.target,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/dataforseo_labs/google/competitors_domain/live',
      [body],
      'Labs domain competitors'
    );
  }

  async labsDomainIntersectionLive(params: {
    target1: string;
    target2: string;
    intersections?: boolean;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target1: params.target1,
      target2: params.target2,
      intersections: params.intersections,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/dataforseo_labs/google/domain_intersection/live',
      [body],
      'Labs domain intersection'
    );
  }

  // Merchant

  async merchantGoogleProductsTaskPost(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    device?: string;
    os?: string;
    limit?: number;
    offset?: number;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      device: params.device,
      os: params.os,
      limit: params.limit,
      offset: params.offset
    });

    return this.post(
      '/merchant/google/products/task_post',
      [body],
      'Google Shopping product task creation'
    );
  }

  async merchantGoogleProductsLive(
    params: Parameters<Client['merchantGoogleProductsTaskPost']>[0]
  ) {
    return this.merchantGoogleProductsTaskPost(params);
  }

  async merchantAmazonProductsTaskPost(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    locationCoordinate?: string;
    languageName?: string;
    languageCode?: string;
    seDomain?: string;
    depth?: number;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      location_coordinate: params.locationCoordinate,
      language_name: params.languageName,
      language_code: params.languageCode,
      se_domain: params.seDomain,
      depth: params.depth
    });

    return this.post(
      '/merchant/amazon/products/task_post',
      [body],
      'Amazon products task creation'
    );
  }

  async merchantAmazonAsinTaskPost(params: {
    asin: string;
    locationName?: string;
    locationCode?: number;
    locationCoordinate?: string;
    languageName?: string;
    languageCode?: string;
    seDomain?: string;
  }) {
    let body = removeUndefined({
      asin: params.asin,
      location_name: params.locationName,
      location_code: params.locationCode,
      location_coordinate: params.locationCoordinate,
      language_name: params.languageName,
      language_code: params.languageCode,
      se_domain: params.seDomain
    });

    return this.post('/merchant/amazon/asin/task_post', [body], 'Amazon ASIN task creation');
  }

  // App Data

  async appDataGooglePlaySearchTaskPost(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    depth?: number;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      depth: params.depth
    });

    return this.post(
      '/app_data/google/app_searches/task_post',
      [body],
      'Google Play app search task creation'
    );
  }

  async appDataGooglePlayInfoTaskPost(params: {
    appId: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
  }) {
    let body = removeUndefined({
      app_id: params.appId,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode
    });

    return this.post(
      '/app_data/google/app_info/task_post',
      [body],
      'Google Play app info task creation'
    );
  }

  async appDataGooglePlayReviewsTaskPost(params: {
    appId: string;
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    depth?: number;
    sortBy?: string;
  }) {
    let body = removeUndefined({
      app_id: params.appId,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      depth: params.depth,
      sort_by: params.sortBy
    });

    return this.post(
      '/app_data/google/app_reviews/task_post',
      [body],
      'Google Play app reviews task creation'
    );
  }

  // Business Data

  async businessListingsSearchLive(params: {
    categories?: string[];
    description?: string;
    title?: string;
    isClaimed?: boolean;
    locationName?: string;
    locationCode?: number;
    locationCoordinate?: string;
    limit?: number;
    offset?: number;
    offsetToken?: string;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      categories: params.categories,
      description: params.description,
      title: params.title,
      is_claimed: params.isClaimed,
      location_name: params.locationName,
      location_code: params.locationCode,
      location_coordinate: params.locationCoordinate,
      limit: params.limit,
      offset: params.offset,
      offset_token: params.offsetToken,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/business_data/business_listings/search/live',
      [body],
      'business listings search'
    );
  }

  async businessDataGoogleReviewsTaskPost(params: {
    keyword: string;
    locationName?: string;
    locationCode?: number;
    locationCoordinate?: string;
    languageName?: string;
    languageCode?: string;
    depth?: number;
    sortBy?: string;
  }) {
    let body = removeUndefined({
      keyword: params.keyword,
      location_name: params.locationName,
      location_code: params.locationCode,
      location_coordinate: params.locationCoordinate,
      language_name: params.languageName,
      language_code: params.languageCode,
      depth: params.depth,
      sort_by: params.sortBy
    });

    return this.post(
      '/business_data/google/reviews/task_post',
      [body],
      'Google reviews task creation'
    );
  }

  // AI Optimization

  async aiKeywordSearchVolumeLive(params: {
    keywords: string[];
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
  }) {
    let body = removeUndefined({
      keywords: params.keywords,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode
    });

    return this.post(
      '/ai_optimization/ai_keyword_data/keywords_search_volume/live',
      [body],
      'AI keyword search volume'
    );
  }

  async llmMentionsSearchLive(params: {
    target: Record<string, unknown>[];
    platform?: 'google' | 'chat_gpt';
    locationName?: string;
    locationCode?: number;
    languageName?: string;
    languageCode?: string;
    aiModelName?: string;
    limit?: number;
    offset?: number;
    filters?: unknown[];
    orderBy?: string[];
  }) {
    let body = removeUndefined({
      target: params.target,
      platform: params.platform,
      location_name: params.locationName,
      location_code: params.locationCode,
      language_name: params.languageName,
      language_code: params.languageCode,
      ai_model_name: params.aiModelName,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      order_by: params.orderBy
    });

    return this.post(
      '/ai_optimization/llm_mentions/search/live',
      [body],
      'LLM mentions search'
    );
  }

  async llmResponsesLive(params: {
    platform: 'chat_gpt' | 'claude' | 'gemini' | 'perplexity';
    userPrompt: string;
    modelName: string;
    systemMessage?: string;
    messageChain?: Array<{ role: string; message: string }>;
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    webSearch?: boolean;
    webSearchCountryIsoCode?: string;
    webSearchCity?: string;
    useReasoning?: boolean;
  }) {
    let body = removeUndefined({
      user_prompt: params.userPrompt,
      model_name: params.modelName,
      system_message: params.systemMessage,
      message_chain: params.messageChain,
      max_output_tokens: params.maxOutputTokens,
      temperature: params.temperature,
      top_p: params.topP,
      web_search: params.webSearch,
      web_search_country_iso_code: params.webSearchCountryIsoCode,
      web_search_city: params.webSearchCity,
      use_reasoning: params.useReasoning
    });

    return this.post(
      `/ai_optimization/${params.platform}/llm_responses/live`,
      [body],
      `${params.platform} LLM response`
    );
  }

  // Tasks

  async getTasksReady(endpoint: DataForSEOTaskEndpoint) {
    let path = taskResultPaths[endpoint].replace(/\/task_get(?:\/advanced)?$/, '');
    return this.get(`/${path}/tasks_ready`, `${endpoint} tasks ready`);
  }

  async getTaskResult(endpoint: DataForSEOTaskEndpoint, taskId: string) {
    let path = taskResultPaths[endpoint];
    return this.get(`/${path}/${taskId}`, `${endpoint} task result`);
  }

  // Utility: Extract results

  extractResults<T = any>(response: DataForSEOResponse<T>): T[] {
    if (!response.tasks || response.tasks.length === 0) {
      return [];
    }

    let task = response.tasks[0];
    assertDataForSEOTaskOk(task, 'result extraction');

    if (task?.status_code !== 20000) {
      throw dataForSEOServiceError(
        `DataForSEO task did not complete successfully: ${task?.status_message ?? 'Unknown'} (code: ${task?.status_code ?? 'N/A'}).`
      );
    }

    return task.result || [];
  }

  extractFirstResult<T = any>(response: DataForSEOResponse<T>): T | null {
    let results = this.extractResults(response);
    return results[0] ?? null;
  }

  extractTaskId(response: DataForSEOResponse): string {
    let task = response.tasks?.[0];
    assertDataForSEOTaskOk(task, 'task creation');

    if (!task?.id) {
      throw dataForSEOServiceError('DataForSEO task creation did not return a task ID.');
    }

    return task.id;
  }
}
