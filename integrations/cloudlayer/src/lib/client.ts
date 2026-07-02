import { createAxios } from 'slates';

let BASE_URL = 'https://api.cloudlayer.io/v2';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- PDF Generation ----

  async generatePdfFromHtml(params: {
    html: string;
    filename?: string;
    landscape?: boolean;
    format?: string;
    width?: string;
    height?: string;
    margin?: { top?: string; bottom?: string; left?: string; right?: string };
    pageRanges?: string;
    printBackground?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    headerTemplate?: Record<string, unknown>;
    footerTemplate?: Record<string, unknown>;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    generatePreview?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    webhook?: string;
  }) {
    let response = await this.axios.post('/html/pdf', params);
    return response.data;
  }

  async generatePdfFromUrl(params: {
    url?: string;
    batch?: string[];
    filename?: string;
    landscape?: boolean;
    format?: string;
    width?: string;
    height?: string;
    margin?: { top?: string; bottom?: string; left?: string; right?: string };
    pageRanges?: string;
    printBackground?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    headerTemplate?: Record<string, unknown>;
    footerTemplate?: Record<string, unknown>;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    generatePreview?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    authentication?: { username: string; password: string };
    cookies?: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: string;
    }>;
    webhook?: string;
  }) {
    let response = await this.axios.post('/url/pdf', params);
    return response.data;
  }

  async generatePdfFromTemplate(params: {
    templateId?: string;
    template?: string;
    data?: Record<string, unknown>;
    filename?: string;
    landscape?: boolean;
    format?: string;
    width?: string;
    height?: string;
    margin?: { top?: string; bottom?: string; left?: string; right?: string };
    pageRanges?: string;
    printBackground?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    headerTemplate?: Record<string, unknown>;
    footerTemplate?: Record<string, unknown>;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    generatePreview?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    webhook?: string;
  }) {
    let response = await this.axios.post('/template/pdf', params);
    return response.data;
  }

  // ---- Image Generation ----

  async generateImageFromHtml(params: {
    html: string;
    imageType?: string;
    transparent?: boolean;
    trim?: boolean;
    filename?: string;
    width?: string;
    height?: string;
    landscape?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    webhook?: string;
  }) {
    let response = await this.axios.post('/html/image', params);
    return response.data;
  }

  async generateImageFromUrl(params: {
    url: string;
    imageType?: string;
    transparent?: boolean;
    trim?: boolean;
    filename?: string;
    width?: string;
    height?: string;
    landscape?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    authentication?: { username: string; password: string };
    cookies?: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: string;
    }>;
    webhook?: string;
  }) {
    let response = await this.axios.post('/url/image', params);
    return response.data;
  }

  async generateImageFromTemplate(params: {
    templateId?: string;
    template?: string;
    data?: Record<string, unknown>;
    imageType?: string;
    transparent?: boolean;
    trim?: boolean;
    filename?: string;
    width?: string;
    height?: string;
    landscape?: boolean;
    preferCSSPageSize?: boolean;
    scale?: number;
    delay?: number;
    timeout?: number;
    waitUntil?: string;
    waitForSelector?: Record<string, unknown>;
    autoScroll?: boolean;
    timeZone?: string;
    viewPort?: Record<string, unknown>;
    projectId?: string;
    inline?: boolean;
    webhook?: string;
  }) {
    let response = await this.axios.post('/template/image', params);
    return response.data;
  }

  // ---- Jobs ----

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}`);
    return response.data;
  }

  async listJobs(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/jobs', { params });
    return response.data;
  }

  // ---- Assets ----

  async getAsset(assetId: string) {
    let response = await this.axios.get(`/assets/${assetId}`);
    return response.data;
  }

  async listAssets(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/assets', { params });
    return response.data;
  }

  // ---- Account Status ----

  async getStatus() {
    let response = await this.axios.get('/getStatus');
    return response.data;
  }
}
