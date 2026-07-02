import { createAxios } from 'slates';

export interface StartTestParams {
  url: string;
  location?: string;
  browser?: string;
  report?: 'lighthouse' | 'legacy' | 'lighthouse,legacy' | 'none';
  retention?: number;
  adblock?: boolean;
  video?: boolean;
  stopOnload?: boolean;
  throttle?: string;
  cookies?: string[];
  httpAuthUsername?: string;
  httpAuthPassword?: string;
  allowUrl?: string[];
  blockUrl?: string[];
  simulateDevice?: string;
  userAgent?: string;
  browserWidth?: number;
  browserHeight?: number;
  browserDppx?: number;
  browserRotate?: boolean;
}

export interface TestData {
  testId: string;
  state: string;
  source: string;
  url?: string;
  location: string;
  browser: string;
  reportId?: string;
  pageId?: string;
  created?: number;
  started?: number;
  finished?: number;
  creditsLeft?: number;
  creditsUsed?: number;
  error?: string;
}

export interface ReportData {
  reportId: string;
  url: string;
  pageId: string;
  testId: string;
  source: string;
  browser: string;
  location: string;
  created: number;
  expires: number;
  gtmetrixGrade?: string;
  gtmetrixScore?: number;
  performanceScore?: number;
  structureScore?: number;
  pagespeedScore?: number;
  yslowScore?: number;
  htmlBytes?: number;
  pageBytes?: number;
  pageRequests?: number;
  redirectDuration?: number;
  connectDuration?: number;
  backendDuration?: number;
  timeToFirstByte?: number;
  firstPaintTime?: number;
  firstContentfulPaint?: number;
  domInteractiveTime?: number;
  domContentLoadedTime?: number;
  domContentLoadedDuration?: number;
  onloadTime?: number;
  onloadDuration?: number;
  fullyLoadedTime?: number;
  rumSpeedIndex?: number;
  speedIndex?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  resourceLinks: Record<string, string>;
  reportUrl?: string;
}

export interface PageData {
  pageId: string;
  url: string;
  created: number;
  browser: string;
  location: string;
  latestReportTime?: number;
  latestReportId?: string;
  reportCount: number;
  monitored: string;
}

export interface LocationData {
  locationId: string;
  name: string;
  region: string;
  isDefault: boolean;
  accountHasAccess: boolean;
  browsers: string[];
  ips: string[];
}

export interface BrowserData {
  browserId: string;
  name: string;
  isDefault: boolean;
  platform: string;
  device: string;
  features: {
    adblock: boolean;
    cookies: boolean;
    dns: boolean;
    filtering: boolean;
    httpAuth: boolean;
    resolution: boolean;
    throttle: boolean;
    userAgent: boolean;
    video: boolean;
    lighthouse: boolean;
  };
}

export interface AccountStatus {
  userId: string;
  apiCredits: number;
  apiRefill: number;
  apiRefillAmount: number;
  accountType: string;
  proAnalysisOptionsAccess: boolean;
  proLocationsAccess: boolean;
  whitelabelPdfAccess: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  nextPage?: string;
  prevPage?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://gtmetrix.com/api/2.0',
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  async startTest(params: StartTestParams): Promise<TestData> {
    let attributes: Record<string, unknown> = {
      url: params.url
    };

    if (params.location) attributes.location = params.location;
    if (params.browser) attributes.browser = params.browser;
    if (params.report) attributes.report = params.report;
    if (params.retention !== undefined) attributes.retention = params.retention;
    if (params.adblock !== undefined) attributes.adblock = params.adblock ? 1 : 0;
    if (params.video !== undefined) attributes.video = params.video ? 1 : 0;
    if (params.stopOnload !== undefined) attributes.stop_onload = params.stopOnload ? 1 : 0;
    if (params.throttle) attributes.throttle = params.throttle;
    if (params.cookies && params.cookies.length > 0) attributes.cookies = params.cookies;
    if (params.httpAuthUsername) attributes.httpauth_username = params.httpAuthUsername;
    if (params.httpAuthPassword) attributes.httpauth_password = params.httpAuthPassword;
    if (params.allowUrl && params.allowUrl.length > 0) attributes.allow_url = params.allowUrl;
    if (params.blockUrl && params.blockUrl.length > 0) attributes.block_url = params.blockUrl;
    if (params.simulateDevice) attributes.simulate_device = params.simulateDevice;
    if (params.userAgent) attributes.user_agent = params.userAgent;
    if (params.browserWidth !== undefined) attributes.browser_width = params.browserWidth;
    if (params.browserHeight !== undefined) attributes.browser_height = params.browserHeight;
    if (params.browserDppx !== undefined) attributes.browser_dppx = params.browserDppx;
    if (params.browserRotate !== undefined)
      attributes.browser_rotate = params.browserRotate ? 1 : 0;

    let response = await this.axios.post(
      '/tests',
      {
        data: {
          type: 'test',
          attributes
        }
      },
      {
        headers: {
          'Content-Type': 'application/vnd.api+json'
        }
      }
    );

    let data = response.data.data;
    let meta = response.data.meta;

    return {
      testId: data.id,
      state: data.attributes.state,
      source: data.attributes.source,
      location: data.attributes.location,
      browser: data.attributes.browser,
      created: data.attributes.created,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getTest(testId: string): Promise<TestData> {
    let response = await this.axios.get(`/tests/${testId}`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status === 200 || status === 303
    });

    let data = response.data.data;

    return {
      testId: data.id,
      state: data.attributes.state,
      source: data.attributes.source,
      url: data.attributes.url,
      location: data.attributes.location,
      browser: data.attributes.browser,
      reportId: data.attributes.report,
      pageId: data.attributes.page,
      created: data.attributes.created,
      started: data.attributes.started,
      finished: data.attributes.finished,
      error: data.attributes.error
    };
  }

  async pollTestUntilComplete(
    testId: string,
    maxAttempts: number = 60,
    intervalMs: number = 3000
  ): Promise<TestData> {
    for (let i = 0; i < maxAttempts; i++) {
      let test = await this.getTest(testId);

      if (test.state === 'completed' || test.state === 'error') {
        return test;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Test ${testId} did not complete within ${(maxAttempts * intervalMs) / 1000} seconds`
    );
  }

  async getReport(reportId: string): Promise<ReportData> {
    let response = await this.axios.get(`/reports/${reportId}`);
    let data = response.data.data;
    let attrs = data.attributes;
    let links = data.links || {};

    return {
      reportId: data.id,
      url: attrs.url,
      pageId: attrs.page,
      testId: attrs.test,
      source: attrs.source,
      browser: attrs.browser,
      location: attrs.location,
      created: attrs.created,
      expires: attrs.expires,
      gtmetrixGrade: attrs.gtmetrix_grade,
      gtmetrixScore: attrs.gtmetrix_score,
      performanceScore: attrs.performance_score,
      structureScore: attrs.structure_score,
      pagespeedScore: attrs.pagespeed_score,
      yslowScore: attrs.yslow_score,
      htmlBytes: attrs.html_bytes,
      pageBytes: attrs.page_bytes,
      pageRequests: attrs.page_requests,
      redirectDuration: attrs.redirect_duration,
      connectDuration: attrs.connect_duration,
      backendDuration: attrs.backend_duration,
      timeToFirstByte: attrs.time_to_first_byte,
      firstPaintTime: attrs.first_paint_time,
      firstContentfulPaint: attrs.first_contentful_paint,
      domInteractiveTime: attrs.dom_interactive_time,
      domContentLoadedTime: attrs.dom_content_loaded_time,
      domContentLoadedDuration: attrs.dom_content_loaded_duration,
      onloadTime: attrs.onload_time,
      onloadDuration: attrs.onload_duration,
      fullyLoadedTime: attrs.fully_loaded_time,
      rumSpeedIndex: attrs.rum_speed_index,
      speedIndex: attrs.speed_index,
      largestContentfulPaint: attrs.largest_contentful_paint,
      timeToInteractive: attrs.time_to_interactive,
      totalBlockingTime: attrs.total_blocking_time,
      cumulativeLayoutShift: attrs.cumulative_layout_shift,
      resourceLinks: {
        har: links.har,
        video: links.video,
        screenshot: links.screenshot,
        filmstrip: links.filmstrip,
        reportPdf: links.report_pdf,
        reportPdfFull: links.report_pdf_full,
        lighthouse: links.lighthouse,
        pagespeed: links.pagespeed,
        yslow: links.yslow,
        optimizedImages: links.optimized_images
      },
      reportUrl: links.report_url
    };
  }

  async deleteReport(reportId: string): Promise<void> {
    await this.axios.delete(`/reports/${reportId}`);
  }

  async retestReport(reportId: string): Promise<TestData> {
    let response = await this.axios.post(`/reports/${reportId}/retest`, undefined, {
      headers: {
        'Content-Type': 'application/vnd.api+json'
      }
    });

    let data = response.data.data;
    let meta = response.data.meta;

    return {
      testId: data.id,
      state: data.attributes.state,
      source: data.attributes.source,
      location: data.attributes.location,
      browser: data.attributes.browser,
      created: data.attributes.created,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getReportResourceUrl(reportId: string, resource: string): Promise<string> {
    return `https://gtmetrix.com/api/2.0/reports/${reportId}/resources/${resource}`;
  }

  async listPages(params?: {
    pageSize?: number;
    pageNumber?: number;
    sort?: string;
    filterUrl?: string;
    filterMonitored?: string;
  }): Promise<PaginatedResult<PageData>> {
    let queryParams: Record<string, string | number> = {};

    if (params?.pageSize) queryParams['page[size]'] = params.pageSize;
    if (params?.pageNumber) queryParams['page[number]'] = params.pageNumber;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.filterUrl) queryParams['filter[url]'] = params.filterUrl;
    if (params?.filterMonitored) queryParams['filter[monitored]'] = params.filterMonitored;

    let response = await this.axios.get('/pages', { params: queryParams });

    let pages = (response.data.data || []).map(this.mapPageData);

    return {
      items: pages,
      currentPage: response.data.meta?.curr_page || 1,
      nextPage: response.data.links?.next,
      prevPage: response.data.links?.prev
    };
  }

  async getPage(pageId: string): Promise<PageData> {
    let response = await this.axios.get(`/pages/${pageId}`);
    return this.mapPageData(response.data.data);
  }

  async deletePage(pageId: string): Promise<void> {
    await this.axios.delete(`/pages/${pageId}`);
  }

  async retestPage(pageId: string): Promise<TestData> {
    let response = await this.axios.post(`/pages/${pageId}/retest`, undefined, {
      headers: {
        'Content-Type': 'application/vnd.api+json'
      }
    });

    let data = response.data.data;
    let meta = response.data.meta;

    return {
      testId: data.id,
      state: data.attributes.state,
      source: data.attributes.source,
      location: data.attributes.location,
      browser: data.attributes.browser,
      created: data.attributes.created,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getPageLatestReport(pageId: string): Promise<ReportData> {
    let response = await this.axios.get(`/pages/${pageId}/latest-report`);
    let data = response.data.data;
    let attrs = data.attributes;
    let links = data.links || {};

    return {
      reportId: data.id,
      url: attrs.url,
      pageId: attrs.page,
      testId: attrs.test,
      source: attrs.source,
      browser: attrs.browser,
      location: attrs.location,
      created: attrs.created,
      expires: attrs.expires,
      gtmetrixGrade: attrs.gtmetrix_grade,
      gtmetrixScore: attrs.gtmetrix_score,
      performanceScore: attrs.performance_score,
      structureScore: attrs.structure_score,
      pagespeedScore: attrs.pagespeed_score,
      yslowScore: attrs.yslow_score,
      htmlBytes: attrs.html_bytes,
      pageBytes: attrs.page_bytes,
      pageRequests: attrs.page_requests,
      redirectDuration: attrs.redirect_duration,
      connectDuration: attrs.connect_duration,
      backendDuration: attrs.backend_duration,
      timeToFirstByte: attrs.time_to_first_byte,
      firstPaintTime: attrs.first_paint_time,
      firstContentfulPaint: attrs.first_contentful_paint,
      domInteractiveTime: attrs.dom_interactive_time,
      domContentLoadedTime: attrs.dom_content_loaded_time,
      domContentLoadedDuration: attrs.dom_content_loaded_duration,
      onloadTime: attrs.onload_time,
      onloadDuration: attrs.onload_duration,
      fullyLoadedTime: attrs.fully_loaded_time,
      rumSpeedIndex: attrs.rum_speed_index,
      speedIndex: attrs.speed_index,
      largestContentfulPaint: attrs.largest_contentful_paint,
      timeToInteractive: attrs.time_to_interactive,
      totalBlockingTime: attrs.total_blocking_time,
      cumulativeLayoutShift: attrs.cumulative_layout_shift,
      resourceLinks: {
        har: links.har,
        video: links.video,
        screenshot: links.screenshot,
        filmstrip: links.filmstrip,
        reportPdf: links.report_pdf,
        reportPdfFull: links.report_pdf_full,
        lighthouse: links.lighthouse,
        pagespeed: links.pagespeed,
        yslow: links.yslow,
        optimizedImages: links.optimized_images
      },
      reportUrl: links.report_url
    };
  }

  async listPageReports(
    pageId: string,
    params?: {
      pageSize?: number;
      pageNumber?: number;
      sort?: string;
    }
  ): Promise<PaginatedResult<ReportData>> {
    let queryParams: Record<string, string | number> = {};

    if (params?.pageSize) queryParams['page[size]'] = params.pageSize;
    if (params?.pageNumber) queryParams['page[number]'] = params.pageNumber;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get(`/pages/${pageId}/reports`, { params: queryParams });

    let reports = (response.data.data || []).map((item: any) => this.mapReportData(item));

    return {
      items: reports,
      currentPage: response.data.meta?.curr_page || 1,
      nextPage: response.data.links?.next,
      prevPage: response.data.links?.prev
    };
  }

  async listLocations(): Promise<LocationData[]> {
    let response = await this.axios.get('/locations');

    return (response.data.data || []).map((item: any) => ({
      locationId: item.id,
      name: item.attributes.name,
      region: item.attributes.region,
      isDefault: item.attributes.default,
      accountHasAccess: item.attributes.account_has_access,
      browsers: item.attributes.browsers || [],
      ips: item.attributes.ips || []
    }));
  }

  async listBrowsers(): Promise<BrowserData[]> {
    let response = await this.axios.get('/browsers');

    return (response.data.data || []).map((item: any) => ({
      browserId: item.id,
      name: item.attributes.name,
      isDefault: item.attributes.default,
      platform: item.attributes.platform,
      device: item.attributes.device || '',
      features: {
        adblock: item.attributes.adblock,
        cookies: item.attributes.cookies,
        dns: item.attributes.dns,
        filtering: item.attributes.filtering,
        httpAuth: item.attributes.http_auth,
        resolution: item.attributes.resolution,
        throttle: item.attributes.throttle,
        userAgent: item.attributes.user_agent,
        video: item.attributes.video,
        lighthouse: item.attributes.lighthouse
      }
    }));
  }

  async getAccountStatus(): Promise<AccountStatus> {
    let response = await this.axios.get('/status');
    let data = response.data.data;
    let attrs = data.attributes;

    return {
      userId: data.id,
      apiCredits: attrs.api_credits,
      apiRefill: attrs.api_refill,
      apiRefillAmount: attrs.api_refill_amount,
      accountType: attrs.account_type,
      proAnalysisOptionsAccess: attrs.account_pro_analysis_options_access,
      proLocationsAccess: attrs.account_pro_locations_access,
      whitelabelPdfAccess: attrs.account_whitelabel_pdf_access
    };
  }

  private mapPageData(item: any): PageData {
    return {
      pageId: item.id,
      url: item.attributes.url,
      created: item.attributes.created,
      browser: item.attributes.browser,
      location: item.attributes.location,
      latestReportTime: item.attributes.latest_report_time,
      latestReportId: item.attributes.latest_report,
      reportCount: item.attributes.report_count,
      monitored: item.attributes.monitored
    };
  }

  private mapReportData(item: any): ReportData {
    let attrs = item.attributes;
    let links = item.links || {};

    return {
      reportId: item.id,
      url: attrs.url,
      pageId: attrs.page,
      testId: attrs.test,
      source: attrs.source,
      browser: attrs.browser,
      location: attrs.location,
      created: attrs.created,
      expires: attrs.expires,
      gtmetrixGrade: attrs.gtmetrix_grade,
      gtmetrixScore: attrs.gtmetrix_score,
      performanceScore: attrs.performance_score,
      structureScore: attrs.structure_score,
      pagespeedScore: attrs.pagespeed_score,
      yslowScore: attrs.yslow_score,
      htmlBytes: attrs.html_bytes,
      pageBytes: attrs.page_bytes,
      pageRequests: attrs.page_requests,
      redirectDuration: attrs.redirect_duration,
      connectDuration: attrs.connect_duration,
      backendDuration: attrs.backend_duration,
      timeToFirstByte: attrs.time_to_first_byte,
      firstPaintTime: attrs.first_paint_time,
      firstContentfulPaint: attrs.first_contentful_paint,
      domInteractiveTime: attrs.dom_interactive_time,
      domContentLoadedTime: attrs.dom_content_loaded_time,
      domContentLoadedDuration: attrs.dom_content_loaded_duration,
      onloadTime: attrs.onload_time,
      onloadDuration: attrs.onload_duration,
      fullyLoadedTime: attrs.fully_loaded_time,
      rumSpeedIndex: attrs.rum_speed_index,
      speedIndex: attrs.speed_index,
      largestContentfulPaint: attrs.largest_contentful_paint,
      timeToInteractive: attrs.time_to_interactive,
      totalBlockingTime: attrs.total_blocking_time,
      cumulativeLayoutShift: attrs.cumulative_layout_shift,
      resourceLinks: {
        har: links.har,
        video: links.video,
        screenshot: links.screenshot,
        filmstrip: links.filmstrip,
        reportPdf: links.report_pdf,
        reportPdfFull: links.report_pdf_full,
        lighthouse: links.lighthouse,
        pagespeed: links.pagespeed,
        yslow: links.yslow,
        optimizedImages: links.optimized_images
      },
      reportUrl: links.report_url
    };
  }
}
