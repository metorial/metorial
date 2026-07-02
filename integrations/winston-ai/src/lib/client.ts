import { createAxios } from 'slates';

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
  url: string;
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
    start_index: number;
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
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.gowinston.ai',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async detectText(params: DetectTextParams): Promise<DetectTextResponse> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.file !== undefined) body.file = params.file;
    if (params.website !== undefined) body.website = params.website;
    if (params.version !== undefined) body.version = params.version;
    if (params.sentences !== undefined) body.sentences = params.sentences;
    if (params.language !== undefined) body.language = params.language;

    let response = await this.axios.post('/v2/ai-content-detection', body);
    return response.data as DetectTextResponse;
  }

  async detectImage(params: DetectImageParams): Promise<DetectImageResponse> {
    let body: Record<string, unknown> = {
      url: params.url
    };
    if (params.version !== undefined) body.version = params.version;

    let response = await this.axios.post('/v2/image-detection', body);
    return response.data as DetectImageResponse;
  }

  async detectPlagiarism(params: DetectPlagiarismParams): Promise<DetectPlagiarismResponse> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.file !== undefined) body.file = params.file;
    if (params.website !== undefined) body.website = params.website;
    if (params.excludedSources !== undefined) body.excluded_sources = params.excludedSources;
    if (params.language !== undefined) body.language = params.language;
    if (params.country !== undefined) body.country = params.country;

    let response = await this.axios.post('/v2/plagiarism', body);
    return response.data as DetectPlagiarismResponse;
  }

  async factCheck(params: FactCheckParams): Promise<FactCheckResponse> {
    let body: Record<string, unknown> = {};
    if (params.text !== undefined) body.text = params.text;
    if (params.file !== undefined) body.file = params.file;
    if (params.website !== undefined) body.website = params.website;
    if (params.language !== undefined) body.language = params.language;

    let response = await this.axios.post('/v2/fact-checker', body);
    return response.data as FactCheckResponse;
  }

  async compareTexts(params: TextCompareParams): Promise<TextCompareResponse> {
    let body = {
      first_text: params.firstText,
      second_text: params.secondText
    };

    let response = await this.axios.post('/v2/text-compare', body);
    return response.data as TextCompareResponse;
  }
}
