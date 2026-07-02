import { createAxios } from 'slates';

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
  masterCategory?: string;
}

export interface CampaignSettings {
  date?: {
    from?: string;
    to?: string;
  };
  merchantNames?: string[];
  productLineItems?: Array<{
    name?: string;
    quantity?: number;
    totalPrice?: number;
  }>;
  fraudDetection?: boolean;
  productCodes?: string[];
  balanceOwing?: {
    min?: number;
    max?: number;
  };
  smartValidate?: string;
  skip?: boolean;
  returnFromTheList?: boolean;
}

export interface ValidationOptions {
  campaignId: string;
  referenceId?: string;
  incognito?: boolean;
  ipAddress?: string;
  near?: string;
}

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      apikey: this.config.token
    };
  }

  // ── Receipt Extraction (Simple) ──────────────────────────────────

  async extractReceiptSimpleFromBase64(input: Base64Input, options: ExtractionOptions = {}) {
    let body: Record<string, unknown> = {
      image: input.image,
      filename: input.filename,
      contentType: input.contentType,
      ...this.extractionOptionsToBody(options)
    };

    let response = await axios.post('/api/receipt/v1/simple/encoded', body, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
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

    let response = await axios.post('/api/receipt/v1/simple/url', body, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
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

    let response = await axios.post('/api/receipt/v1/verbose/encoded', body, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
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

    let response = await axios.post('/api/receipt/v1/verbose/url', body, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    return response.data;
  }

  // ── Receipt Validation ───────────────────────────────────────────

  async validateReceiptFromUrl(url: string, options: ValidationOptions) {
    let body: Record<string, unknown> = {
      url,
      campaignId: options.campaignId
    };
    if (options.referenceId) body.referenceId = options.referenceId;
    if (options.incognito !== undefined) body.incognito = options.incognito;
    if (options.ipAddress) body.ipAddress = options.ipAddress;
    if (options.near) body.near = options.near;

    let response = await axios.post(
      '/api/validation/v1/campaign/receipt-validation/url',
      body,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  async validateReceiptFromBase64(input: Base64Input, options: ValidationOptions) {
    let body: Record<string, unknown> = {
      image: input.image,
      filename: input.filename,
      contentType: input.contentType,
      campaignId: options.campaignId
    };
    if (options.referenceId) body.referenceId = options.referenceId;
    if (options.incognito !== undefined) body.incognito = options.incognito;
    if (options.ipAddress) body.ipAddress = options.ipAddress;
    if (options.near) body.near = options.near;

    let response = await axios.post(
      '/api/validation/v1/campaign/receipt-validation/file',
      body,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  // ── Campaign Management ──────────────────────────────────────────

  async listCampaigns() {
    let response = await axios.get('/api/validation/v1/campaign/settings/list', {
      headers: { ...this.headers, Accept: 'application/json' }
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await axios.get(
      `/api/validation/v1/campaign/settings/${encodeURIComponent(campaignId)}`,
      {
        headers: { ...this.headers, Accept: 'application/json' }
      }
    );
    return response.data;
  }

  async createCampaign(campaignId: string, settings: CampaignSettings) {
    let response = await axios.post(
      `/api/validation/v1/campaign/settings/create/${encodeURIComponent(campaignId)}`,
      settings,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  async updateCampaign(campaignId: string, settings: CampaignSettings) {
    let response = await axios.put(
      `/api/validation/v1/campaign/settings/update/${encodeURIComponent(campaignId)}`,
      settings,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await axios.delete(
      `/api/validation/v1/campaign/settings/delete/${encodeURIComponent(campaignId)}`,
      {
        headers: { ...this.headers, Accept: 'application/json' }
      }
    );
    return response.data;
  }

  // ── Feedback & Training ──────────────────────────────────────────

  async submitFeedback(input: FeedbackInput) {
    let response = await axios.post('/api/account/v1/feedback', input, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    return response.data;
  }

  // ── Merchant Keywords ────────────────────────────────────────────

  async addMerchantKeyword(merchantName: string) {
    let response = await axios.post(
      '/api/account/v1/merchantname/add',
      { merchantName },
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
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
}
