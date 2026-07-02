import { createAxios } from 'slates';

export interface TextCortexOutput {
  text: string;
  index: number;
}

export interface TextCortexResponse {
  data: {
    outputs: TextCortexOutput[];
    remaining_credits: number;
  };
  status: string;
}

export interface GenerateTextParams {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface GenerateBlogParams {
  title: string;
  keywords?: string[];
  blogCategories?: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface GenerateProductDescriptionParams {
  productName: string;
  productCategory?: string;
  brand?: string;
  productFeatures?: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface GenerateAdParams {
  productName: string;
  targetAudience?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface GenerateEmailParams {
  subject: string;
  targetAudience?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface GenerateSocialMediaPostParams {
  context: string;
  keywords?: string[];
  platform?: string;
  targetAudience?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface RewriteTextParams {
  text: string;
  mode?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface SummarizeTextParams {
  text?: string;
  fileId?: string;
  mode?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
  sourceLang?: string;
  targetLang?: string;
}

export interface TranslateTextParams {
  text: string;
  sourceLang?: string;
  targetLang: string;
}

export interface GenerateCodeParams {
  prompt: string;
  programmingLanguage?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.textcortex.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async generateText(params: GenerateTextParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/generations', {
      prompt: params.prompt,
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async generateBlog(params: GenerateBlogParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/blogs', {
      title: params.title,
      keywords: params.keywords || [],
      blog_categories: params.blogCategories || [],
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 2048,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async generateProductDescription(
    params: GenerateProductDescriptionParams
  ): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/products-descriptions', {
      product_name: params.productName,
      product_category: params.productCategory || '',
      brand: params.brand || '',
      product_features: params.productFeatures || [],
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async generateAd(params: GenerateAdParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/ads', {
      prompt: params.productName,
      parameters: params.targetAudience || '',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async generateEmail(params: GenerateEmailParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/emails', {
      subject: params.subject,
      parameters: params.targetAudience || '',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async generateSocialMediaPost(
    params: GenerateSocialMediaPostParams
  ): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/social-media-posts', {
      context: params.context,
      keywords: params.keywords || [],
      mode: params.platform || 'twitter',
      parameters: params.targetAudience || '',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async rewriteText(params: RewriteTextParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/rewritings', {
      text: params.text,
      mode: params.mode || 'default',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    });
    return response.data;
  }

  async summarizeText(params: SummarizeTextParams): Promise<TextCortexResponse> {
    let body: Record<string, unknown> = {
      mode: params.mode || 'default',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 512,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang || 'auto'
    };

    if (params.fileId) {
      body.file_id = params.fileId;
    } else {
      body.text = params.text || '';
    }

    let response = await this.axios.post('/texts/summarizations', body);
    return response.data;
  }

  async translateText(params: TranslateTextParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/translations', {
      text: params.text,
      source_lang: params.sourceLang || 'auto',
      target_lang: params.targetLang
    });
    return response.data;
  }

  async generateCode(params: GenerateCodeParams): Promise<TextCortexResponse> {
    let response = await this.axios.post('/texts/codes', {
      prompt: params.prompt,
      programming_language: params.programmingLanguage || '',
      model: params.model || 'sophos-1',
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature ?? 0.7,
      n: params.n || 1
    });
    return response.data;
  }
}
