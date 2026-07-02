import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.webscraper.io/api/v1'
    });
  }

  private get params() {
    return { api_token: this.token };
  }

  // ──── Account ────

  async getAccount() {
    let response = await this.axios.get('/account', { params: this.params });
    return response.data.data;
  }

  // ──── Sitemaps ────

  async createSitemap(sitemap: { _id: string; startUrl: string[]; selectors: any[] }) {
    let response = await this.axios.post('/sitemap', sitemap, { params: this.params });
    return response.data.data;
  }

  async getSitemap(sitemapId: number) {
    let response = await this.axios.get(`/sitemap/${sitemapId}`, { params: this.params });
    return response.data.data;
  }

  async listSitemaps(options?: { page?: number; tag?: string }) {
    let params: Record<string, any> = { ...this.params };
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
    let response = await this.axios.put(`/sitemap/${sitemapId}`, sitemap, {
      params: this.params
    });
    return response.data.data;
  }

  async deleteSitemap(sitemapId: number) {
    let response = await this.axios.delete(`/sitemap/${sitemapId}`, { params: this.params });
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
  }) {
    let body: Record<string, any> = { sitemap_id: options.sitemapId };
    if (options.driver) body.driver = options.driver;
    if (options.pageLoadDelay !== undefined) body.page_load_delay = options.pageLoadDelay;
    if (options.requestInterval !== undefined) body.request_interval = options.requestInterval;
    if (options.proxy) body.proxy = options.proxy;
    if (options.startUrls) body.start_urls = options.startUrls;
    if (options.customId) body.custom_id = options.customId;

    let response = await this.axios.post('/scraping-job', body, { params: this.params });
    return response.data.data;
  }

  async getScrapingJob(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}`, { params: this.params });
    return response.data.data;
  }

  async listScrapingJobs(options?: { page?: number; sitemapId?: number; tag?: string }) {
    let params: Record<string, any> = { ...this.params };
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
    let response = await this.axios.delete(`/scraping-job/${jobId}`, { params: this.params });
    return response.data.data;
  }

  // ──── Data Download ────

  async downloadScrapedDataJson(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/json`, {
      params: this.params,
      responseType: 'text'
    });
    let text = response.data as string;
    let records = text
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => JSON.parse(line));
    return records;
  }

  async downloadScrapedDataCsv(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/csv`, {
      params: this.params,
      responseType: 'text'
    });
    return response.data as string;
  }

  // ──── Data Quality ────

  async getDataQuality(jobId: number) {
    let response = await this.axios.get(`/scraping-job/${jobId}/data-quality`, {
      params: this.params
    });
    return response.data.data;
  }

  // ──── Problematic URLs ────

  async getProblematicUrls(jobId: number, options?: { page?: number }) {
    let params: Record<string, any> = { ...this.params };
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
    let response = await this.axios.get(`/sitemap/${sitemapId}/scheduler`, {
      params: this.params
    });
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
    }
  ) {
    let body: Record<string, any> = {
      cron_minute: options.cronMinute,
      cron_hour: options.cronHour,
      cron_day: options.cronDay,
      cron_month: options.cronMonth,
      cron_weekday: options.cronWeekday
    };
    if (options.cronTimezone) body.cron_timezone = options.cronTimezone;
    if (options.driver) body.driver = options.driver;
    if (options.proxy) body.proxy = options.proxy;
    if (options.requestInterval !== undefined) body.request_interval = options.requestInterval;
    if (options.pageLoadDelay !== undefined) body.page_load_delay = options.pageLoadDelay;

    let response = await this.axios.post(`/sitemap/${sitemapId}/enable-scheduler`, body, {
      params: this.params
    });
    return response.data.data;
  }

  async disableScheduler(sitemapId: number) {
    let response = await this.axios.post(
      `/sitemap/${sitemapId}/disable-scheduler`,
      {},
      { params: this.params }
    );
    return response.data.data;
  }
}
