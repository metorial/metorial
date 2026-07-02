import { createAxios } from 'slates';

export interface CreateImageParams {
  imageUrl?: string;
  imageRaw?: string;
  assetId?: string;
  lang?: string;
  keywords?: string[];
  negativeKeywords?: string[];
  keywordSource?: string;
  ecommerce?: {
    product?: string;
    brand?: string;
    description?: string;
  };
  webhookUrl?: string;
  maxCharacters?: number;
  aiWritingStyle?: string;
  chatgptPrompt?: string;
}

export interface ImageResult {
  asset_id: string;
  url: string;
  alt_text: string;
  lang: string;
  keywords: string[] | null;
  negative_keywords: string[] | null;
  keyword_source: string | null;
  ecommerce: {
    product: string | null;
    brand: string | null;
    description: string | null;
  } | null;
  status: string;
  errors: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AccountInfo {
  display_name: string;
  email: string;
  plan: string;
  credits_used: number;
  credits_remaining: number;
  credits_limit: number;
  billing_period_start: string;
  billing_period_end: string;
}

export interface ImageListParams {
  page?: number;
  perPage?: number;
}

export interface ImageSearchParams {
  query: string;
  page?: number;
  perPage?: number;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://alttext.ai/api/v1',
      headers: {
        'X-API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async createImage(params: CreateImageParams): Promise<ImageResult> {
    let body: Record<string, any> = {
      image: {}
    };

    if (params.imageUrl) {
      body.image.url = params.imageUrl;
    }
    if (params.imageRaw) {
      body.image.raw = params.imageRaw;
    }
    if (params.assetId) {
      body.image.asset_id = params.assetId;
    }

    if (params.lang) {
      body.lang = params.lang;
    }
    if (params.keywords && params.keywords.length > 0) {
      body.keywords = params.keywords;
    }
    if (params.negativeKeywords && params.negativeKeywords.length > 0) {
      body.negative_keywords = params.negativeKeywords;
    }
    if (params.keywordSource) {
      body.keyword_source = params.keywordSource;
    }
    if (params.ecommerce) {
      body.ecommerce = {};
      if (params.ecommerce.product) body.ecommerce.product = params.ecommerce.product;
      if (params.ecommerce.brand) body.ecommerce.brand = params.ecommerce.brand;
      if (params.ecommerce.description)
        body.ecommerce.description = params.ecommerce.description;
    }
    if (params.webhookUrl) {
      body.webhook_url = params.webhookUrl;
    }
    if (params.maxCharacters) {
      body.max_chars = params.maxCharacters;
    }
    if (params.aiWritingStyle) {
      body.ai_writing_style = params.aiWritingStyle;
    }
    if (params.chatgptPrompt) {
      body.chatgpt_prompt = params.chatgptPrompt;
    }

    let response = await this.axios.post('/images', body);
    return response.data;
  }

  async getImage(assetId: string): Promise<ImageResult> {
    let response = await this.axios.get(`/images/${encodeURIComponent(assetId)}`);
    return response.data;
  }

  async getImages(
    params?: ImageListParams
  ): Promise<{ images: ImageResult[]; page: number; per_page: number; total: number }> {
    let queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/images', { params: queryParams });
    return response.data;
  }

  async searchImages(
    params: ImageSearchParams
  ): Promise<{ images: ImageResult[]; page: number; per_page: number; total: number }> {
    let queryParams: Record<string, any> = {
      q: params.query
    };
    if (params.page) queryParams.page = params.page;
    if (params.perPage) queryParams.per_page = params.perPage;

    let response = await this.axios.get('/images/search', { params: queryParams });
    return response.data;
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get('/account');
    return response.data;
  }
}
