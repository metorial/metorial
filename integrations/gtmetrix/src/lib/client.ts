import { createHash } from 'node:crypto';
import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface StartTestParams {
  url: string;
  location?: string;
  browser?: string;
  report?: 'lighthouse' | 'legacy' | 'lighthouse,legacy' | 'none';
  retention?: number;
  adblock?: boolean;
  video?: boolean;
  stopOnload?: boolean;
  customDns?: string[];
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
  testId?: string;
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private connectionId: string;

  constructor(config: { token: string }) {
    this.connectionId = `api-key-${createHash('sha256').update(config.token).digest('hex')}`;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://gtmetrix.com/api/2.0',
      auth: {
        username: config.token,
        password: ''
      },
      contentType: 'application/vnd.api+json',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'GTmetrix',
          reason: 'gtmetrix_api_error',
          detailKeys: ['title', 'detail', 'code']
        })
    });
  }

  async startTest(params: StartTestParams): Promise<TestData> {
    if (params.retention !== undefined && ![1, 6, 12, 24].includes(params.retention)) {
      throw createApiServiceError('Report retention must be 1, 6, 12, or 24 months.');
    }
    if ((params.browserWidth === undefined) !== (params.browserHeight === undefined)) {
      throw createApiServiceError(
        'Provide both browserWidth and browserHeight to set the viewport.'
      );
    }
    for (let value of [params.browserWidth, params.browserHeight]) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw createApiServiceError('Viewport dimensions must be positive integers.');
      }
    }
    if (
      params.browserDppx !== undefined &&
      (params.browserDppx < 1 || params.browserDppx > 5)
    ) {
      throw createApiServiceError('browserDppx must be between 1 and 5.');
    }

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
    if (params.customDns?.length) attributes.dns = params.customDns;
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
      created: data.attributes.created ?? undefined,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getTest(testId: string): Promise<TestData> {
    let response = await this.axios.get(`/tests/${encodeURIComponent(testId)}`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status === 200 || status === 303
    });

    let data = response.data.data;

    return {
      testId: data.id,
      state: data.attributes.state,
      source: data.attributes.source,
      url: data.attributes.url ?? undefined,
      location: data.attributes.location,
      browser: data.attributes.browser,
      reportId: data.attributes.report ?? undefined,
      pageId: data.attributes.page ?? undefined,
      created: data.attributes.created ?? undefined,
      started: data.attributes.started ?? undefined,
      finished: data.attributes.finished ?? undefined,
      error: data.attributes.error
    };
  }

  async listTests(params: {
    pageSize?: number;
    pageNumber?: number;
    sort?: string;
    state?: string;
    source?: string;
  }): Promise<PaginatedResult<TestData>> {
    let response = await this.axios.get('/tests', {
      params: {
        'page[size]': params.pageSize,
        'page[number]': params.pageNumber,
        sort: params.sort,
        'filter[state]': params.state,
        'filter[source]': params.source
      }
    });
    return {
      items: (response.data.data ?? []).map((data: any) => ({
        testId: data.id,
        state: data.attributes.state,
        source: data.attributes.source,
        url: data.attributes.url ?? undefined,
        location: data.attributes.location,
        browser: data.attributes.browser,
        reportId: data.attributes.report ?? undefined,
        pageId: data.attributes.page ?? undefined,
        created: data.attributes.created ?? undefined,
        started: data.attributes.started ?? undefined,
        finished: data.attributes.finished ?? undefined,
        error: data.attributes.error ?? undefined
      })),
      currentPage: Number(response.data.meta?.curr_page ?? 1),
      nextPage: response.data.links?.next,
      prevPage: response.data.links?.prev
    };
  }

  async listSimulatedDevices(): Promise<
    {
      deviceId: string;
      name: string;
      manufacturer: string;
      category: string;
      width: number;
      height: number;
      dppx: number;
      userAgent: string;
    }[]
  > {
    let response = await this.axios.get('/simulated-devices');
    return (response.data.data ?? []).map((data: any) => ({
      deviceId: data.id,
      name: data.attributes.name,
      manufacturer: data.attributes.manufacturer,
      category: data.attributes.category,
      width: data.attributes.width,
      height: data.attributes.height,
      dppx: data.attributes.dppx,
      userAgent: data.attributes.user_agent
    }));
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

    throw createApiServiceError(
      `Test ${testId} did not complete within ${(maxAttempts * intervalMs) / 1000} seconds. Call get_test to check its current state before starting another test.`,
      { reason: 'gtmetrix_test_timeout' }
    );
  }

  async getReport(reportId: string): Promise<ReportData> {
    let response = await this.axios.get(`/reports/${encodeURIComponent(reportId)}`);
    return this.mapReportData(response.data.data);
  }

  async deleteReport(reportId: string): Promise<void> {
    await this.axios.delete(`/reports/${encodeURIComponent(reportId)}`);
  }

  async retestReport(reportId: string): Promise<TestData> {
    let response = await this.axios.post(
      `/reports/${encodeURIComponent(reportId)}/retest`,
      undefined,
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
      created: data.attributes.created ?? undefined,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getReportResourceUrl(reportId: string, resource: string): Promise<string> {
    return `https://gtmetrix.com/api/2.0/reports/${encodeURIComponent(reportId)}/resources/${resource}`;
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
      currentPage: Number(response.data.meta?.curr_page ?? 1),
      nextPage: response.data.links?.next,
      prevPage: response.data.links?.prev
    };
  }

  async getPage(pageId: string): Promise<PageData> {
    let response = await this.axios.get(`/pages/${encodeURIComponent(pageId)}`);
    return this.mapPageData(response.data.data);
  }

  async deletePage(pageId: string): Promise<void> {
    await this.axios.delete(`/pages/${encodeURIComponent(pageId)}`);
  }

  async retestPage(pageId: string): Promise<TestData> {
    let response = await this.axios.post(
      `/pages/${encodeURIComponent(pageId)}/retest`,
      undefined,
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
      created: data.attributes.created ?? undefined,
      creditsLeft: meta?.credits_left,
      creditsUsed: meta?.credits_used
    };
  }

  async getPageLatestReport(pageId: string): Promise<ReportData> {
    let response = await this.axios.get(`/pages/${encodeURIComponent(pageId)}/latest-report`);
    return this.mapReportData(response.data.data);
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

    let response = await this.axios.get(`/pages/${encodeURIComponent(pageId)}/reports`, {
      params: queryParams
    });

    let reports = (response.data.data || []).map((item: any) => this.mapReportData(item));

    return {
      items: reports,
      currentPage: Number(response.data.meta?.curr_page ?? 1),
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
      userId: this.connectionId,
      apiCredits: attrs.api_credits,
      apiRefill: attrs.api_refill,
      apiRefillAmount: attrs.api_refill_amount,
      accountType: attrs.account_type,
      proAnalysisOptionsAccess: attrs.account_pro_analysis_options_access,
      proLocationsAccess: attrs.account_pro_locations_access,
      whitelabelPdfAccess: attrs.account_whitelabel_pdf_access
    };
  }

  private mapPageData(resource: any): PageData {
    let item = resource.data ?? resource;
    return {
      pageId: item.id,
      url: item.attributes.url,
      created: item.attributes.created,
      browser: item.attributes.browser,
      location: item.attributes.location,
      latestReportTime: item.attributes.latest_report_time ?? undefined,
      latestReportId: item.attributes.latest_report ?? undefined,
      reportCount: item.attributes.report_count,
      monitored: item.attributes.monitored
    };
  }

  private mapResourceUrl(value: string): string {
    try {
      return new URL(value, 'https://gtmetrix.com').href;
    } catch {
      throw createApiServiceError('GTmetrix returned an invalid report resource URL.', {
        reason: 'gtmetrix_invalid_response'
      });
    }
  }

  private mapReportData(item: any): ReportData {
    let attrs = item.attributes;
    let links = item.links || {};

    return {
      reportId: item.id,
      url: attrs.url,
      pageId: attrs.page,
      testId: attrs.test ?? undefined,
      source: attrs.source,
      browser: attrs.browser,
      location: attrs.location,
      created: attrs.created,
      expires: attrs.expires,
      gtmetrixGrade: attrs.gtmetrix_grade ?? undefined,
      gtmetrixScore: attrs.gtmetrix_score ?? undefined,
      performanceScore: attrs.performance_score ?? undefined,
      structureScore: attrs.structure_score ?? undefined,
      pagespeedScore: attrs.pagespeed_score ?? undefined,
      yslowScore: attrs.yslow_score ?? undefined,
      htmlBytes: attrs.html_bytes ?? undefined,
      pageBytes: attrs.page_bytes ?? undefined,
      pageRequests: attrs.page_requests ?? undefined,
      redirectDuration: attrs.redirect_duration ?? undefined,
      connectDuration: attrs.connect_duration ?? undefined,
      backendDuration: attrs.backend_duration ?? undefined,
      timeToFirstByte: attrs.time_to_first_byte ?? undefined,
      firstPaintTime: attrs.first_paint_time ?? undefined,
      firstContentfulPaint: attrs.first_contentful_paint ?? undefined,
      domInteractiveTime: attrs.dom_interactive_time ?? undefined,
      domContentLoadedTime: attrs.dom_content_loaded_time ?? undefined,
      domContentLoadedDuration: attrs.dom_content_loaded_duration ?? undefined,
      onloadTime: attrs.onload_time ?? undefined,
      onloadDuration: attrs.onload_duration ?? undefined,
      fullyLoadedTime: attrs.fully_loaded_time ?? undefined,
      rumSpeedIndex: attrs.rum_speed_index ?? undefined,
      speedIndex: attrs.speed_index ?? undefined,
      largestContentfulPaint: attrs.largest_contentful_paint ?? undefined,
      timeToInteractive: attrs.time_to_interactive ?? undefined,
      totalBlockingTime: attrs.total_blocking_time ?? undefined,
      cumulativeLayoutShift: attrs.cumulative_layout_shift ?? undefined,
      resourceLinks: Object.fromEntries(
        Object.entries({
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
        })
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .map(([key, value]) => [key, this.mapResourceUrl(value)])
      ),
      reportUrl:
        typeof links.report_url === 'string'
          ? this.mapResourceUrl(links.report_url)
          : undefined
    };
  }
}
