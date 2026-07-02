import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { taggunApiError, taggunServiceError } from './errors';

let axios = createAxios({
  baseURL: 'https://api.taggun.io'
});

export interface ExtractionOptions {
  refresh?: boolean;
  incognito?: boolean;
  extractTime?: boolean;
  extractLineItems?: boolean;
  ipAddress?: string;
  near?: string;
  language?: string;
  ignoreMerchantName?: string;
  subAccountId?: string;
  referenceId?: string;
}

export interface Base64Input {
  image: string;
  filename: string;
  contentType: string;
}

export interface UrlInput {
  url: string;
  customHeaderKey?: string;
}

export interface FeedbackInput {
  referenceId: string;
  totalAmount?: number;
  taxAmount?: number;
  merchantName?: string;
  currencyCode?: string;
  date?: string;
}

export interface CampaignSettings {
  date?: {
    start?: string;
    end?: string;
  };
  merchantNames?: {
    skip?: boolean;
    returnFromTheList?: boolean;
    allowList?: string[];
    blockList?: string[];
    list?: string[];
  };
  productLineItems?: {
    skip?: boolean;
    names?: string[];
    totalPrice?: {
      min?: number;
      max?: number;
    };
    quantity?: {
      min?: number;
      max?: number;
    };
    shouldMatchAbbreviations?: boolean;
  };
  fraudDetection?: {
    skip?: boolean;
    allowSimilarityCheck?: boolean;
    allowTamperDetection?: boolean;
    allowDigitalDetection?: boolean;
    allowHandwritingDetection?: boolean;
  };
  productCodes?: {
    skip?: boolean;
    description?: string | null;
    list?: string[];
  };
  balanceOwing?: {
    skip?: boolean;
    min?: number;
    max?: number;
  };
  smartValidate?: {
    prompts?: Array<{
      question?: string;
      example?: Record<string, boolean>;
      skip?: boolean;
    }>;
  };
}

export interface ValidationOptions {
  campaignId: string;
  referenceId?: string;
  userId?: string;
  subAccountId?: string;
  incognito?: boolean;
  ipAddress?: string;
  near?: string;
  language?: string;
  customHeaderKey?: string;
}

export interface ProductCategoriesFileInput {
  contentBase64: string;
  filename: string;
  contentType?: string;
}

export interface ProductCategoriesExportResult {
  result?: unknown;
  contentBase64?: string;
  contentType: string;
  sizeBytes: number;
}

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      apikey: this.config.token
    };
  }

  private async request<T>(operation: string, run: () => Promise<T>) {
    try {
      return await run();
    } catch (error) {
      throw taggunApiError(error, operation);
    }
  }

  // ── Receipt Extraction (Simple) ──────────────────────────────────

  async extractReceiptSimpleFromBase64(input: Base64Input, options: ExtractionOptions = {}) {
    let body: Record<string, unknown> = {
      image: input.image,
      filename: input.filename,
      contentType: input.contentType,
      ...this.extractionOptionsToBody(options)
    };

    let response = await this.request('extract simple encoded receipt', () =>
      axios.post('/api/receipt/v1/simple/encoded', body, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  async extractReceiptSimpleFromUrl(input: UrlInput, options: ExtractionOptions = {}) {
    let body: Record<string, unknown> = {
      url: input.url,
      ...this.extractionOptionsToBody(options)
    };
    if (input.customHeaderKey) {
      body.headers = { 'x-custom-key': input.customHeaderKey };
    }

    let response = await this.request('extract simple receipt from URL', () =>
      axios.post('/api/receipt/v1/simple/url', body, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  // ── Receipt Extraction (Verbose) ─────────────────────────────────

  async extractReceiptVerboseFromBase64(input: Base64Input, options: ExtractionOptions = {}) {
    let body: Record<string, unknown> = {
      image: input.image,
      filename: input.filename,
      contentType: input.contentType,
      ...this.extractionOptionsToBody(options)
    };

    let response = await this.request('extract verbose encoded receipt', () =>
      axios.post('/api/receipt/v1/verbose/encoded', body, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  async extractReceiptVerboseFromUrl(input: UrlInput, options: ExtractionOptions = {}) {
    let body: Record<string, unknown> = {
      url: input.url,
      ...this.extractionOptionsToBody(options)
    };
    if (input.customHeaderKey) {
      body.headers = { 'x-custom-key': input.customHeaderKey };
    }

    let response = await this.request('extract verbose receipt from URL', () =>
      axios.post('/api/receipt/v1/verbose/url', body, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  // ── Receipt Validation ───────────────────────────────────────────

  async validateReceiptFromUrl(url: string, options: ValidationOptions) {
    let body: Record<string, unknown> = {
      url,
      campaignId: options.campaignId
    };
    if (options.customHeaderKey) body.headers = { 'x-custom-key': options.customHeaderKey };
    if (options.referenceId) body.referenceId = options.referenceId;
    if (options.userId) body.userId = options.userId;
    if (options.subAccountId) body.subAccountId = options.subAccountId;
    if (options.incognito !== undefined) body.incognito = options.incognito;
    if (options.ipAddress) body.ipAddress = options.ipAddress;
    if (options.near) body.near = options.near;
    if (options.language) body.language = options.language;

    let response = await this.request('validate receipt from URL', () =>
      axios.post('/api/validation/v1/campaign/receipt-validation/url', body, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  async validateReceiptFromBase64(input: Base64Input, options: ValidationOptions) {
    let form = this.base64InputToForm(input);
    this.appendFormField(form, 'campaignId', options.campaignId);
    this.appendFormField(form, 'referenceId', options.referenceId);
    this.appendFormField(form, 'userId', options.userId);
    this.appendFormField(form, 'subAccountId', options.subAccountId);
    this.appendFormField(form, 'incognito', options.incognito);
    this.appendFormField(form, 'ipAddress', options.ipAddress);
    this.appendFormField(form, 'near', options.near);
    this.appendFormField(form, 'language', options.language);

    let response = await this.request('validate receipt file', () =>
      axios.post('/api/validation/v1/campaign/receipt-validation/file', form, {
        headers: {
          ...this.headers,
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  // ── Campaign Management ──────────────────────────────────────────

  async listCampaigns() {
    let response = await this.request('list campaigns', () =>
      axios.get('/api/validation/v1/campaign/settings/list', {
        headers: { ...this.headers, Accept: 'application/json' }
      })
    );
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.request('get campaign', () =>
      axios.get(`/api/validation/v1/campaign/settings/${encodeURIComponent(campaignId)}`, {
        headers: { ...this.headers, Accept: 'application/json' }
      })
    );
    return response.data;
  }

  async createCampaign(campaignId: string, settings: CampaignSettings) {
    let response = await this.request('create campaign', () =>
      axios.post(
        `/api/validation/v1/campaign/settings/create/${encodeURIComponent(campaignId)}`,
        settings,
        {
          headers: {
            ...this.headers,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      )
    );
    return response.data;
  }

  async updateCampaign(campaignId: string, settings: CampaignSettings) {
    let response = await this.request('update campaign', () =>
      axios.put(
        `/api/validation/v1/campaign/settings/update/${encodeURIComponent(campaignId)}`,
        settings,
        {
          headers: {
            ...this.headers,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      )
    );
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.request('delete campaign', () =>
      axios.delete(
        `/api/validation/v1/campaign/settings/delete/${encodeURIComponent(campaignId)}`,
        {
          headers: { ...this.headers, Accept: 'application/json' }
        }
      )
    );
    return response.data;
  }

  // ── Feedback & Training ──────────────────────────────────────────

  async submitFeedback(input: FeedbackInput) {
    let response = await this.request('submit feedback', () =>
      axios.post('/api/account/v1/feedback', input, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  // ── Product Categories ───────────────────────────────────────────

  async exportProductCategories(): Promise<ProductCategoriesExportResult> {
    let response = await this.request('export product categories', () =>
      axios.get('/api/account/v1/product-categories/export', {
        responseType: 'arraybuffer',
        headers: { ...this.headers, Accept: '*/*' }
      })
    );
    let contentType =
      this.responseHeader(response.headers, 'content-type') ?? 'application/octet-stream';
    let buffer = this.responseDataToBuffer(response.data);

    if (this.isJsonContentType(contentType)) {
      let text = buffer.toString('utf8').trim();
      try {
        return {
          result: text ? JSON.parse(text) : null,
          contentType,
          sizeBytes: buffer.byteLength
        };
      } catch (error) {
        let serviceError = taggunServiceError(
          'Taggun product categories export returned invalid JSON.'
        );
        if (error instanceof Error) serviceError.setParent(error);
        throw serviceError;
      }
    }

    return {
      contentBase64: buffer.toString('base64'),
      contentType,
      sizeBytes: buffer.byteLength
    };
  }

  async uploadProductCategories(input: ProductCategoriesFileInput) {
    let form = new FormData();
    form.append(
      'file',
      this.base64ToBlob(
        input.contentBase64,
        input.contentType ?? 'text/csv',
        'product categories file'
      ),
      input.filename
    );

    let response = await this.request('upload product categories', () =>
      axios.post('/api/account/v1/product-categories/import', form, {
        headers: {
          ...this.headers,
          Accept: 'application/json'
        }
      })
    );
    return response.data;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private extractionOptionsToBody(options: ExtractionOptions): Record<string, unknown> {
    let body: Record<string, unknown> = {};
    if (options.refresh !== undefined) body.refresh = options.refresh;
    if (options.incognito !== undefined) body.incognito = options.incognito;
    if (options.extractTime !== undefined) body.extractTime = options.extractTime;
    if (options.extractLineItems !== undefined)
      body.extractLineItems = options.extractLineItems;
    if (options.ipAddress) body.ipAddress = options.ipAddress;
    if (options.near) body.near = options.near;
    if (options.language) body.language = options.language;
    if (options.ignoreMerchantName) body.ignoreMerchantName = options.ignoreMerchantName;
    if (options.subAccountId) body.subAccountId = options.subAccountId;
    if (options.referenceId) body.referenceId = options.referenceId;
    return body;
  }

  private base64InputToForm(input: Base64Input) {
    let form = new FormData();
    form.append(
      'file',
      this.base64ToBlob(input.image, input.contentType, 'receipt file'),
      input.filename
    );
    return form;
  }

  private base64ToBlob(contentBase64: string, contentType: string, label: string) {
    let normalized = contentBase64.replace(/\s+/g, '');
    let buffer = Buffer.from(normalized, 'base64');
    let encoded = buffer.toString('base64').replace(/=+$/u, '');
    let input = normalized.replace(/=+$/u, '');

    if (!normalized || encoded !== input) {
      throw taggunServiceError(`${label} must be valid non-empty base64 data.`);
    }

    return new Blob([buffer], { type: contentType });
  }

  private appendFormField(form: FormData, name: string, value: unknown) {
    if (value === undefined || value === null) return;
    form.append(name, String(value));
  }

  private responseDataToBuffer(data: unknown) {
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    if (typeof data === 'string') return Buffer.from(data, 'binary');

    throw taggunServiceError('Taggun returned file content in an unsupported format.');
  }

  private responseHeader(headers: unknown, name: string) {
    if (!headers || typeof headers !== 'object') return undefined;

    let record = headers as Record<string, unknown> & {
      get?: (key: string) => unknown;
    };
    let value = record[name] ?? record[name.toLowerCase()] ?? record.get?.(name);

    return typeof value === 'string' ? value : undefined;
  }

  private isJsonContentType(contentType: string) {
    return /\bjson\b/iu.test(contentType);
  }
}
