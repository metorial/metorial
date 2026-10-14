import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface DetectTextParams {
  text?: string;
  file?: string;
  website?: string;
  version?: string;
  sentences?: boolean;
  language?: string;
}

export interface DetectTextResponse {
  status: number;
  score: number;
  sentences: Array<{ text: string; score: number }>;
  input: string;
  attack_detected: {
    zero_width_space: boolean;
    homoglyph_attack: boolean;
  };
  readability_score: number;
  credits_used: number;
  credits_remaining: number;
  version: string;
  language: string;
}

export interface DetectImageParams {
  url?: string;
  image?: string;
  version?: string;
}

export interface DetectImageResponse {
  score: number;
  human_probability: number;
  ai_probability: number;
  version: string;
  mime_type: string;
  c2pa: Record<string, unknown> | null;
  exif: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ai_watermark_detected: boolean;
  ai_watermark_issuers: Record<string, unknown> | null;
  credits_used: number;
  credits_remaining: number;
}

export interface AdvancedImageResponse {
  status: number;
  cost: number;
  language: string;
  title: string;
  tags: string[];
  tool_used: string[];
  label: string;
  confidence: string;
  authenticity: string;
  conclusion: string;
  analysis: string;
  tools_used_analysis: Array<{ id: string; analysis: string; result: unknown }>;
  balance: number;
}

export interface DetectPlagiarismParams {
  text?: string;
  file?: string;
  website?: string;
  excludedSources?: string[];
  language?: string;
  country?: string;
}

export interface PlagiarismSource {
  score: number;
  canAccess: boolean;
  url: string;
  title: string;
  plagiarismWords: number;
  identicalWordCounts: number;
  similarWordCounts: number;
  author: string;
  publishedDate: number | null;
  citation: boolean;
  plagiarismFound: Array<{
    startIndex: number;
    endIndex: number;
    sequence: string;
  }>;
}

export interface DetectPlagiarismResponse {
  status: number;
  scanInformation: {
    service: string;
    scanTime: string;
    inputType: string;
    language: string;
  };
  result: {
    score: number;
    sourceCounts: number;
    textWordCounts: number;
    totalPlagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
  };
  sources: PlagiarismSource[];
  attackDetected: {
    zero_width_space: boolean;
    homoglyph_attack: boolean;
  };
  text: string;
  similarWords: unknown[];
  citations: string[];
  indexes: unknown[];
  credits_used: number;
  credits_remaining: number;
}

export interface FactCheckParams {
  text?: string;
  file?: string;
  website?: string;
  language?: string;
}

export interface FactCheckClaim {
  id: number;
  sentence: string;
  claim: string;
  verdict: string;
  score: number;
  explanation: string;
  links: Array<{ url: string; title: string }>;
}

export interface FactCheckResponse {
  status: number;
  claims: FactCheckClaim[];
  score: number;
  claimsCount: number;
  text: string;
  sentences: Array<{ id: number; text: string }>;
  input: string;
  language: string;
  creditsUsed: number;
  creditsRemaining: number;
  wordCount: number;
}

export interface TextCompareParams {
  firstText: string;
  secondText: string;
}

export interface TextCompareTextResult {
  total_word_count: number;
  matching_word_count: number;
  similarity_percentage: number;
  items: Array<{
    type: string;
    word_count: number;
    index_start: number;
    start_index?: number;
    length: number;
  }>;
}

export interface TextCompareResponse {
  status: number;
  similarity_score: number;
  first_text: TextCompareTextResult;
  second_text: TextCompareTextResult;
  credits_used: number;
  credits_remaining: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError(
        'A Winston AI API token is required. Reconnect with your token.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.gowinston.ai',
      authHeader: { value: `Bearer ${token}` }
    });
  }

  private request<T>(operation: string, path: string, body: Record<string, unknown>) {
    return requestAxiosData<T>(
      operation,
      () => this.axios.post<T>(path, body),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Winston AI',
          operation,
          reason: 'winston_ai_api_error',
          detailKeys: ['description', 'error', 'message', 'code']
        })
    );
  }

  private validateUrl(value: string, label: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw createApiServiceError(`${label} must be a valid public HTTP or HTTPS URL.`);
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw createApiServiceError(
        `${label} must be a public HTTP or HTTPS URL without credentials.`
      );
    }
  }

  private validateScanInput(params: FactCheckParams, minimum: number, maximum: number) {
    if (params.website !== undefined) {
      this.validateUrl(params.website, 'websiteUrl');
    } else if (params.file !== undefined) {
      this.validateUrl(params.file, 'fileUrl');
    } else if (params.text === undefined) {
      throw createApiServiceError('Provide text, fileUrl, or websiteUrl to scan.');
    } else if (params.text.length < minimum || params.text.length > maximum) {
      throw createApiServiceError(
        `Text must contain between ${minimum} and ${maximum} characters.`
      );
    }
  }

  async detectText(params: DetectTextParams): Promise<DetectTextResponse> {
    this.validateScanInput(params, 300, 150000);
    return this.request('detect AI text', '/v2/ai-content-detection', pickDefined(params));
  }

  async detectImage(params: DetectImageParams): Promise<DetectImageResponse> {
    if ((params.url !== undefined) === (params.image !== undefined)) {
      throw createApiServiceError('Provide exactly one of imageUrl or image.');
    }
    if (params.url !== undefined) this.validateUrl(params.url, 'imageUrl');
    if (params.image !== undefined && !params.image.trim()) {
      throw createApiServiceError(
        'image must contain a base64-encoded image or image data URL.'
      );
    }
    return this.request('detect AI image', '/v2/image-detection', pickDefined(params));
  }

  async detectAdvancedImage(imageUrl: string): Promise<AdvancedImageResponse> {
    this.validateUrl(imageUrl, 'imageUrl');
    return this.request('analyze image forensics', '/v2/advanced-image-detection', {
      image_url: imageUrl
    });
  }

  async detectPlagiarism(params: DetectPlagiarismParams): Promise<DetectPlagiarismResponse> {
    this.validateScanInput(params, 100, 120000);
    return this.request(
      'detect plagiarism',
      '/v2/plagiarism',
      pickDefined({
        text: params.text,
        file: params.file,
        website: params.website,
        excluded_sources: params.excludedSources,
        language: params.language,
        country: params.country
      })
    );
  }

  async factCheck(params: FactCheckParams): Promise<FactCheckResponse> {
    this.validateScanInput(params, 300, 10000);
    return this.request('fact check', '/v2/fact-checker', pickDefined(params));
  }

  async compareTexts(params: TextCompareParams): Promise<TextCompareResponse> {
    if (params.firstText.length > 120000 || params.secondText.length > 120000) {
      throw createApiServiceError('Each text must contain no more than 120000 characters.');
    }
    let body = {
      first_text: params.firstText,
      second_text: params.secondText
    };

    return this.request('compare texts', '/v2/text-compare', body);
  }
}
