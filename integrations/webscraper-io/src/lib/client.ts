import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.webscraper.io/api/v1',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Web Scraper',
          reason: 'webscraper_io_api_error'
        })
    });
  }

  // ──── Account ────

  async getAccount() {
    let response = await this.axios.get('/account', {});
    return response.data.data;
  }

  // ──── Sitemaps ────

  async createSitemap(sitemap: { _id: string; startUrl: string[]; selectors: any[] }) {
    let response = await this.axios.post('/sitemap', sitemap, {});
    return response.data.data;
  }

  async getSitemap(sitemapId: number) {
    let response = await this.axios.get(`/sitemap/${sitemapId}`, {});
    return response.data.data;
  }

  async listSitemaps(options?: { page?: number; tag?: string }) {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.tag) params.tag = options.tag;

    let response = await this.axios.get('/sitemaps', { params });
    return {
      sitemaps: response.data.data,
      currentPage: response.data.current_page,
      lastPage: response.data.last_page,
      total: response.data.total,
      perPage: response.data.per_page
    };
  }

  async updateSitemap(
    sitemapId: number,
    sitemap: { _id: string; startUrl: string[]; selectors: any[] }
  ) {
    let response = await this.axios.put(`/sitemap/${sitemapId}`, sitemap, {});
    return response.data.data;
  }

  async deleteSitemap(sitemapId: number) {
    let response = await this.axios.delete(`/sitemap/${sitemapId}`, {});
    return response.data.data;
  }

  // ──── Scraping Jobs ────

  async createScrapingJob(options: {
    sitemapId: number;
    driver?: string;
    pageLoadDelay?: number;
    requestInterval?: number;
    proxy?: string;
    startUrls?: string[];
    customId?: string;
    priority?: number;
  }) {
    this.validateExecutionSettings(options, true);
    let body: Record<string, unknown> = { sitemap_id: options.sitemapId };
    if (options.driver) body.render_js = options.driver === 'fulljs';
    if (options.pageLoadDelay !== undefined) body.page_load_delay = options.pageLoadDelay;
    if (options.requestInterval !== undefined) body.request_interval = options.requestInterval;
    if (options.proxy) body.proxy = options.proxy;
    if (options.startUrls) body.start_urls = options.startUrls;
    if (options.customId) body.custom_id = options.customId;
    if (options.priority !== undefined) body.priority = options.priority;

    let response = await this.axios.post('/scraping-job', body, {});
    return response.data.data;
  }

  async getScrapingJob(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}`, {});
    return response.data.data;
  }

  async listScrapingJobs(options?: { page?: number; sitemapId?: number; tag?: string }) {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;
    if (options?.sitemapId) params.sitemap_id = options.sitemapId;
    if (options?.tag) params.tag = options.tag;

    let response = await this.axios.get('/scraping-jobs', { params });
    return {
      scrapingJobs: response.data.data,
      currentPage: response.data.current_page,
      lastPage: response.data.last_page,
      total: response.data.total,
      perPage: response.data.per_page
    };
  }

  async deleteScrapingJob(jobId: number) {
    let response = await this.axios.delete(`/scraping-job/${jobId}`, {});
    return response.data.data;
  }

  async stopScrapingJob(jobId: number) {
    let response = await this.axios.post(`/scraping-job/${jobId}/stop`, {}, {});
    return response.data.data;
  }

  async continueScrapingJob(
    jobId: number,
    options: {
      driver?: string;
      proxy?: string;
      requestInterval?: number;
      pageLoadDelay?: number;
      priority?: number;
    }
  ) {
    this.validateExecutionSettings(options, false);
    let body = pickDefined({
      render_js: options.driver === undefined ? undefined : options.driver === 'fulljs',
      proxy: options.proxy,
      request_interval: options.requestInterval,
      page_load_delay: options.pageLoadDelay,
      priority: options.priority
    });
    let response = await this.axios.post(`/scraping-job/${jobId}/continue`, body, {});
    return response.data.data;
  }

  private validateExecutionSettings(
    options: {
      proxy?: string;
      requestInterval?: number;
      pageLoadDelay?: number;
      priority?: number;
    },
    required: boolean
  ) {
    if (
      required &&
      (!options.proxy ||
        options.requestInterval === undefined ||
        options.pageLoadDelay === undefined)
    ) {
      throw createApiServiceError(
        'Provide proxy, requestInterval, and pageLoadDelay. Web Scraper requires all three execution settings.'
      );
    }
    for (let [name, value] of Object.entries({
      requestInterval: options.requestInterval,
      pageLoadDelay: options.pageLoadDelay
    })) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw createApiServiceError(
          `${name} must be a non-negative whole number of milliseconds.`
        );
      }
    }
    if (
      options.priority !== undefined &&
      (!Number.isInteger(options.priority) || options.priority < 1 || options.priority > 5)
    ) {
      throw createApiServiceError('priority must be a whole number from 1 to 5.');
    }
  }

  // ──── Data Download ────

  async downloadScrapedDataJson(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/json`, {
      responseType: 'text'
    });
    let text = response.data as string;
    let records = text
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw createApiServiceError(
            'Web Scraper returned invalid JSONL data. Request the export again.',
            { parent: error }
          );
        }
      });
    return records;
  }

  async downloadScrapedDataCsv(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/csv`, {
      responseType: 'text'
    });
    return response.data as string;
  }

  // ──── Data Quality ────

  async getDataQuality(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/data-quality`, {});
    return response.data.data;
  }

  // ──── Problematic URLs ────

  async getProblematicUrls(jobId: number, options?: { page?: number }) {
    let params: Record<string, any> = {};
    if (options?.page) params.page = options.page;

    let response = await this.axios.get(`/scraping-job/${jobId}/problematic-urls`, { params });
    return {
      urls: response.data.data,
      currentPage: response.data.current_page,
      lastPage: response.data.last_page,
      total: response.data.total,
      perPage: response.data.per_page
    };
  }

  // ──── Scheduler ────

  async getScheduler(sitemapId: number) {
    let response = await this.axios.get(`/sitemap/${sitemapId}/scheduler`, {});
    return response.data.data;
  }

  async enableScheduler(
    sitemapId: number,
    options: {
      cronMinute: string;
      cronHour: string;
      cronDay: string;
      cronMonth: string;
      cronWeekday: string;
      cronTimezone?: string;
      driver?: string;
      proxy?: string;
      requestInterval?: number;
      pageLoadDelay?: number;
      priority?: number;
    }
  ) {
    this.validateExecutionSettings(options, true);
    let body: Record<string, any> = {
      cron_minute: options.cronMinute,
      cron_hour: options.cronHour,
      cron_day: options.cronDay,
      cron_month: options.cronMonth,
      cron_weekday: options.cronWeekday
    };
    body.cron_timezone = options.cronTimezone ?? 'UTC';
    if (options.driver) body.render_js = options.driver === 'fulljs';
    if (options.proxy) body.proxy = options.proxy;
    if (options.requestInterval !== undefined) body.request_interval = options.requestInterval;
    if (options.pageLoadDelay !== undefined) body.page_load_delay = options.pageLoadDelay;
    if (options.priority !== undefined) body.priority = options.priority;

    let response = await this.axios.post(`/sitemap/${sitemapId}/enable-scheduler`, body, {});
    return response.data.data;
  }

  async disableScheduler(sitemapId: number) {
    let response = await this.axios.post(`/sitemap/${sitemapId}/disable-scheduler`, {}, {});
    return response.data.data;
  }
}
