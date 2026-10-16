import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface BrowserCommand {
  action: string;
  selector?: string;
  value?: string | number;
}

export interface AccountDetails {
  id?: string;
  workspaceId?: string;
  name?: string;
  workspaceName?: string;
  maxRequestCount?: number;
  createdAt?: number;
  dateCreated?: number;
  userId?: string;
  jwt?: { email?: string };
  email?: string;
}

export interface HostedPage {
  pageId: string;
  name: string;
  htmlFileUrl: string;
  [key: string]: unknown;
}

// These APIs use different documented hosts; keep that distinction in one place.
export let createClient = (token: string, baseURL: string) => {
  if (!token.trim()) throw createApiServiceError('A CustomJS API key is required.');
  return createAuthenticatedAxios({
    baseURL,
    authHeader: { name: 'x-api-key', value: token },
    timeout: 70000,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'CustomJS',
        reason: 'customjs_api_error',
        extractResponse: (upstream, helpers) => helpers.getResponseWithBody(upstream)
      })
  });
};

export let getAccount = async (token: string): Promise<AccountDetails> => {
  let response = await createClient(token, 'https://api.app.customjs.space').get(
    `/core/api-key/${encodeURIComponent(token)}`
  );
  // The provider response also contains credentials and JWT claims. Never expose them.
  let data: unknown = response.data;
  if (!isApiErrorRecord(data))
    throw createApiServiceError('CustomJS returned an invalid account response.');
  let account = data as AccountDetails;
  return {
    id: account.id,
    workspaceId: account.workspaceId,
    name: account.name,
    workspaceName: account.workspaceName,
    maxRequestCount: account.maxRequestCount,
    createdAt: account.createdAt,
    dateCreated: account.dateCreated,
    userId: account.userId,
    email: account.jwt?.email ?? account.email
  };
};

export class ExecutionClient {
  private client;

  constructor(private config: { token: string }) {
    this.client = createClient(config.token, 'https://e.customjs.io');
  }

  async executeCode(params: {
    code: string;
    input?: string;
    returnBinary?: boolean;
    origin?: string;
  }): Promise<any> {
    let response = await this.client.post(
      `/__js1-${encodeURIComponent(this.config.token)}`,
      {
        code: params.code,
        input: params.input ?? '',
        returnBinary: params.returnBinary ? 'true' : 'false'
      },
      {
        headers: { 'customjs-origin': params.origin ?? 'api/execute' },
        ...(params.returnBinary ? { responseType: 'arraybuffer' as const } : {})
      }
    );
    return response.data;
  }

  async executeStoredFunction(params: {
    scriptId: string;
    data: Record<string, unknown>;
    returnBinary?: boolean;
  }): Promise<any> {
    let response = await this.client.post(
      `/${encodeURIComponent(params.scriptId)}`,
      params.data,
      params.returnBinary ? { responseType: 'arraybuffer' } : undefined
    );
    return response.data;
  }

  private async executeUtility(code: string, input: string, binary = false): Promise<any> {
    let result = await this.executeCode({ code, input, returnBinary: binary });
    return binary ? Buffer.from(result).toString('base64') : result;
  }

  private async render(endpoint: string, input: Record<string, unknown>): Promise<string> {
    let response = await this.client.post(
      endpoint,
      { input },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data).toString('base64');
  }

  async htmlToPdf(params: {
    html: string;
    templateData?: Record<string, any>;
    widthMm?: number;
    heightMm?: number;
  }): Promise<string> {
    for (let dimension of [params.widthMm, params.heightMm]) {
      if (dimension !== undefined && (!Number.isFinite(dimension) || dimension <= 0)) {
        throw createApiServiceError('PDF page dimensions must be positive numbers.');
      }
    }
    return this.render('/html2pdf', {
      html: params.html,
      ...(params.templateData !== undefined ? { data: params.templateData } : {}),
      ...(params.widthMm !== undefined || params.heightMm !== undefined
        ? {
            config: {
              ...(params.widthMm !== undefined ? { pdfWidthMm: params.widthMm } : {}),
              ...(params.heightMm !== undefined ? { pdfHeightMm: params.heightMm } : {})
            }
          }
        : {})
    });
  }

  async markdownToPdf(params: { markdown: string }): Promise<string> {
    return this.render('/markdown2pdf', params);
  }

  async screenshot(params: {
    url: string;
    commands?: BrowserCommand[];
    box?: { x: number; y: number; width: number; height: number };
  }): Promise<string> {
    if (params.box && (params.box.width <= 0 || params.box.height <= 0)) {
      throw createApiServiceError('Screenshot crop width and height must be positive.');
    }
    return this.render('/screenshot', params);
  }

  async scrape(params: { url: string; commands?: BrowserCommand[] }): Promise<string> {
    let response = await this.client.post('/scraper', params);
    return response.data;
  }

  async extractWebData(params: {
    goal: string;
    url?: string;
    maxSteps?: number;
    output?: 'ai_extract' | 'text' | 'html' | 'markdown';
  }): Promise<any> {
    let response = await this.client.post('/ai-scraper', { input: params });
    let data = response.data;
    if (
      isApiErrorRecord(data) &&
      (data.error || data.status === 'error' || data.status === 'failed')
    ) {
      throw buildApiServiceError(
        { response },
        { providerLabel: 'CustomJS', reason: 'customjs_scraper_error' }
      );
    }
    return data;
  }

  async mergePdfs(params: { urls: string[] }): Promise<string> {
    return this.executeUtility(
      `const { PDF_MERGE } = require('./utils'); return PDF_MERGE(JSON.parse(input));`,
      JSON.stringify(params.urls),
      true
    );
  }

  async extractPdfPages(params: { pdfUrl: string; pageRange: string }): Promise<string> {
    return this.executeUtility(
      `const { EXTRACT_PAGES_FROM_PDF } = require('./utils'); const data = JSON.parse(input); return EXTRACT_PAGES_FROM_PDF(data.pdfUrl, data.pageRange);`,
      JSON.stringify(params),
      true
    );
  }

  async compressPdf(params: { pdfUrl: string }): Promise<string> {
    return this.executeUtility(
      `const { PDF_COMPRESS } = require('./utils'); return PDF_COMPRESS(input);`,
      params.pdfUrl,
      true
    );
  }

  async pdfToText(params: { pdfUrl: string }): Promise<string> {
    return this.executeUtility(
      `const { PDFTOTEXT } = require('./utils'); return PDFTOTEXT(input);`,
      params.pdfUrl
    );
  }

  async pdfToPng(params: { pdfUrl: string }): Promise<string> {
    return this.executeUtility(
      `const { PDF2PNG } = require('./utils'); return PDF2PNG(input);`,
      params.pdfUrl,
      true
    );
  }

  async readPdfFormFields(params: { pdfUrl: string }): Promise<any> {
    return this.executeUtility(
      `const { PDF_GET_FORM_FIELD_NAMES } = require('./utils'); const axios = require('axios'); const response = await axios.get(input, { responseType: 'arraybuffer' }); return PDF_GET_FORM_FIELD_NAMES(response.data);`,
      params.pdfUrl
    );
  }

  async fillPdfForm(params: {
    pdfUrl: string;
    fields: Record<string, string>;
  }): Promise<string> {
    return this.executeUtility(
      `const { PDF_FILL_FORM } = require('./utils'); const axios = require('axios'); const data = JSON.parse(input); const response = await axios.get(data.pdfUrl, { responseType: 'arraybuffer' }); return PDF_FILL_FORM(response.data, data.fields);`,
      JSON.stringify(params),
      true
    );
  }

  async htmlToPng(params: { html: string }): Promise<string> {
    return this.executeUtility(
      `const { HTML2PNG } = require('./utils'); return HTML2PNG(input);`,
      params.html,
      true
    );
  }

  async htmlToDocx(params: { html: string }): Promise<string> {
    return this.executeUtility(
      `const { HTML2DOCX } = require('./utils'); return HTML2DOCX(input);`,
      params.html,
      true
    );
  }

  async markdownToHtml(params: { markdown: string }): Promise<string> {
    return this.executeUtility(
      `const { MD2HTML } = require('./utils'); return MD2HTML(input);`,
      params.markdown
    );
  }

  async sslCheck(params: { domain: string }): Promise<any> {
    return this.executeUtility(
      `const checkCertExpiration = require('check-cert-expiration'); return checkCertExpiration(input);`,
      params.domain
    );
  }

  async jsonPathQuery(params: { json: string; path: string }): Promise<any> {
    try {
      JSON.parse(params.json);
    } catch {
      throw createApiServiceError('jsonData must be valid JSON.');
    }
    return this.executeUtility(
      `const { JSONPath } = require('jsonpath-plus'); const data = JSON.parse(input); return JSONPath({ path: data.path, json: JSON.parse(data.json) });`,
      JSON.stringify(params)
    );
  }

  async regexOperation(params: {
    text: string;
    pattern: string;
    flags?: string;
    operation: 'Extract' | 'Replace' | 'Test' | 'Split';
    replacement?: string;
  }): Promise<any> {
    try {
      new RegExp(params.pattern, params.flags ?? '');
    } catch {
      throw createApiServiceError('Provide a valid regular expression and supported flags.');
    }
    return this.executeUtility(
      `const data = JSON.parse(input);
const regex = new RegExp(data.pattern, data.flags || '');
switch (data.operation) {
  case 'Extract': {
    if (regex.global) return Array.from(data.text.matchAll(regex), match => match[0]);
    const match = regex.exec(data.text);
    return match ? [match[0]] : [];
  }
  case 'Replace': return data.text.replace(regex, data.replacement || '');
  case 'Test': return regex.test(data.text);
  case 'Split': return data.text.split(regex);
}`,
      JSON.stringify(params)
    );
  }
}

export class PagesClient {
  private client;

  constructor(config: { token: string }) {
    this.client = createClient(config.token, 'https://api.app.customjs.io');
  }

  async upsertPage(params: {
    name: string;
    htmlContent: string;
    slug?: string;
  }): Promise<HostedPage & { created: boolean }> {
    let pages = await this.listPages();
    let existing = pages.find(page => page.name === params.name);
    if (existing) {
      let page = await this.updatePage(existing.pageId, params);
      return { ...existing, ...page, created: false };
    }
    let response = await this.client.post('/pages/page/upload-html', params);
    return { ...response.data, created: true };
  }

  async updatePage(
    pageId: string,
    params: { name?: string; htmlContent: string; slug?: string }
  ): Promise<HostedPage> {
    let response = await this.client.put(
      `/pages/api/page/id/${encodeURIComponent(pageId)}/update-html`,
      {
        htmlContent: params.htmlContent,
        ...(params.name !== undefined ? { name: params.name } : {}),
        ...(params.slug !== undefined ? { slug: params.slug } : {})
      }
    );
    return response.data;
  }

  async listPages(): Promise<HostedPage[]> {
    let response = await this.client.get('/pages/api/page');
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('CustomJS returned an invalid page list.');
    }
    return response.data;
  }

  async getPage(pageId: string): Promise<any> {
    let response = await this.client.get(`/pages/api/page/id/${encodeURIComponent(pageId)}`);
    return response.data;
  }

  async deletePage(pageId: string): Promise<void> {
    await this.client.delete(`/pages/api/page/id/${encodeURIComponent(pageId)}`);
  }
}
