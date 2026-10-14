import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

type Prediction = { label: string; score: number };
type Predictions = { predictions: Prediction[] };
type Generation = { generatedText: string };
type CustomInference = Partial<Predictions & Generation>;

export type ProjectPredictions = {
  predictions: Record<string, unknown>[];
  metadata?: Record<string, unknown> | null;
};

export type ClassificationOptions = {
  threshold?: number;
  top_labels?: number;
  refresh?: boolean;
  version?: string;
};

export type ExtractionOptions = { refresh?: boolean };

export class Client {
  private http;

  constructor(token: string) {
    if (!token?.trim()) {
      throw createApiServiceError(
        'A Metatext AI API key is required. Reconnect with a valid API key.'
      );
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.metatext.ai',
      timeout: 60000,
      authHeader: { name: 'x-api-key', value: token.trim() },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Metatext AI',
          reason: 'metatextai_api_error'
        })
    });
  }

  private async infer<T>(path: string, text: string, fields: Record<string, unknown> = {}) {
    if (!text.trim()) {
      throw createApiServiceError('Provide non-empty text for inference.');
    }
    let response = await this.http.post<T>(path, { text, ...fields });
    return response.data;
  }

  private pathId(id: string, name: string) {
    if (!id.trim()) {
      throw createApiServiceError(`Provide a non-empty ${name}.`);
    }
    return encodeURIComponent(id);
  }

  analyzeSentiment(text: string) {
    return this.infer<Predictions>('/hub-inference/sentiment-analysis', text);
  }

  extractKeywords(text: string) {
    return this.infer<Predictions>('/hub-inference/keyword-extractor', text);
  }

  generateBlogPost(text: string) {
    return this.infer<Generation>('/hub-inference/blog-post-generation', text);
  }

  generateText(text: string) {
    return this.infer<Generation>('/hub-inference/text-generator', text);
  }

  generateHeadline(text: string) {
    return this.infer<Generation>('/hub-inference/headline', text);
  }

  detectSpam(text: string) {
    return this.infer<Predictions>('/hub-inference/spam-or-not', text);
  }

  runCustomModelInference(modelId: string, text: string) {
    return this.infer<CustomInference>(
      `/v1/inference/${this.pathId(modelId, 'model ID')}`,
      text
    );
  }

  classifyText(
    projectId: string,
    text: string,
    model?: string,
    options?: ClassificationOptions
  ) {
    return this.infer<ProjectPredictions>(
      `/v2/classify/${this.pathId(projectId, 'project ID')}`,
      text,
      {
        ...(model === undefined ? {} : { model }),
        ...(options === undefined ? {} : { options })
      }
    );
  }

  extractEntities(
    projectId: string,
    text: string,
    model?: string,
    options?: ExtractionOptions
  ) {
    return this.infer<ProjectPredictions>(
      `/v2/extract/${this.pathId(projectId, 'project ID')}`,
      text,
      {
        ...(model === undefined ? {} : { model }),
        ...(options === undefined ? {} : { options })
      }
    );
  }
}
