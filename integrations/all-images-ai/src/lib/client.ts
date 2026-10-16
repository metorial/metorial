import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface SearchImagesParams {
  search?: string;
  filterFree?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface SearchImagesResponse {
  filteredResults?: number;
  resultCountMetadata?: unknown;
  images: ImageResult[];
}

export interface ImageResult {
  imageId: string;
  url: string;
  urlFull: string;
  validated?: boolean;
  free?: boolean;
  titles?: Record<string, string>;
}

export interface DownloadedImage {
  imageId: string;
  previewUrl: string;
  fullUrl: string;
  upscaleUrl?: string;
  upscaleUhdUrl: string;
  downloadedAt: string;
}

export interface DownloadedImagesParams {
  limit?: number;
  offset?: number;
  sort?: string;
  afterCreatedAt?: string;
  beforeCreatedAt?: string;
}

export interface DownloadedImagesResponse {
  filteredResults?: number;
  resultCountMetadata?: unknown;
  images: DownloadedImage[];
}

export interface CreateGenerationParams {
  name: string;
  mode: 'simple' | 'advanced';
  prompt: string;
  additionalPrompt?: string;
  optimizePrompt?: boolean;
  params?: GenerationParam[];
  processMode?: 'relax' | 'fast';
  tags?: string[];
  metaData?: Record<string, unknown>;
}

export interface GenerationParam {
  name: string;
  value: string;
}

export interface UpdateGenerationParams {
  name?: string;
  mode?: 'simple' | 'advanced';
  prompt?: string;
  additionalPrompt?: string;
  optimizePrompt?: boolean;
  params?: GenerationParam[];
  processMode?: 'relax' | 'fast';
  tags?: string[];
  metaData?: Record<string, unknown>;
}

export interface Generation {
  generationId?: string;
  name: string;
  prompt: string;
  status: number;
  statusLabel: string;
  params: GenerationParam[];
  processMode?: string;
  images?: ImageResult[];
  nbImages?: number;
  tags?: string[];
  metaData?: Record<string, unknown>;
  createdAt?: string;
}

export interface ListGenerationsParams {
  limit?: number;
  offset?: number;
  sort?: string;
  name?: string;
  tag?: string;
}

export interface ListGenerationsResponse {
  filteredResults?: number;
  resultCountMetadata?: unknown;
  generations: Generation[];
}

export interface CreditInfo {
  type?: string;
  credit: number;
  creditTotal?: number;
  unlimited?: boolean;
}

export interface WebhookSubscribeParams {
  url: string;
  events?: string[];
}

let statusLabels: Record<number, string> = {
  0: 'created',
  1: 'pending',
  2: 'processing',
  3: 'done',
  4: 'error'
};

interface ApiImage {
  id: string;
  url: string;
  urlFull: string;
  validate?: boolean;
  free?: boolean;
  titles?: Record<string, string>;
}

interface ApiDownloadedImage {
  id: string;
  url: string;
  urlFull: string;
  urlUpscale?: string;
  urlUpscaleUHD: string;
  downloadedAt: string;
}

interface ApiGeneration {
  id?: string;
  name: string;
  prompt: string;
  status: number;
  params: GenerationParam[];
  processMode?: string;
  images?: ApiImage[];
  nbImages?: number;
  tags?: string[];
  metaData?: Record<string, unknown>;
  createdAt?: string;
}

let mapImage = (img: ApiImage): ImageResult => ({
  imageId: img.id,
  url: img.url,
  urlFull: img.urlFull,
  validated: img.validate,
  free: img.free,
  titles: img.titles
});

let mapDownloadedImage = (img: ApiDownloadedImage): DownloadedImage => ({
  imageId: img.id,
  previewUrl: img.url,
  fullUrl: img.urlFull,
  upscaleUrl: img.urlUpscale,
  upscaleUhdUrl: img.urlUpscaleUHD,
  downloadedAt: img.downloadedAt
});

let mapGeneration = (gen: ApiGeneration): Generation => ({
  generationId: gen.id,
  name: gen.name,
  prompt: gen.prompt,
  status: gen.status,
  statusLabel: statusLabels[gen.status] ?? 'unknown',
  params: gen.params,
  processMode: gen.processMode,
  images: gen.images?.map(mapImage),
  nbImages: gen.nbImages,
  tags: gen.tags,
  metaData: gen.metaData,
  createdAt: gen.createdAt
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'An All-Images.ai API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.all-images.ai/v1',
      timeout: 60000,
      authHeader: { name: 'api-key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'All-Images.ai',
          reason: 'all_images_ai_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private validatePrompt(params: { prompt?: string; additionalPrompt?: string }) {
    if (params.prompt !== undefined && params.prompt.length > 4096) {
      throw createApiServiceError('The image prompt must contain at most 4096 characters.');
    }
    if (params.additionalPrompt !== undefined && params.additionalPrompt.length > 1024) {
      throw createApiServiceError(
        'The additional prompt must contain at most 1024 characters.'
      );
    }
  }

  async searchImages(params: SearchImagesParams): Promise<SearchImagesResponse> {
    let response = await this.axios.post<{ filteredResults?: unknown; images: ApiImage[] }>(
      '/images/search',
      pickDefined(params)
    );

    return {
      filteredResults:
        typeof response.data.filteredResults === 'number'
          ? response.data.filteredResults
          : undefined,
      resultCountMetadata: response.data.filteredResults,
      images: response.data.images.map(mapImage)
    };
  }

  async buyImage(imageId: string): Promise<DownloadedImage> {
    let response = await this.axios.post<ApiDownloadedImage>('/images/buy', { id: imageId });
    return mapDownloadedImage(response.data);
  }

  async getDownloadedImages(
    params: DownloadedImagesParams
  ): Promise<DownloadedImagesResponse> {
    let response = await this.axios.post<{
      filteredResults?: unknown;
      images: ApiDownloadedImage[];
    }>('/images/downladed', pickDefined(params));

    return {
      filteredResults:
        typeof response.data.filteredResults === 'number'
          ? response.data.filteredResults
          : undefined,
      resultCountMetadata: response.data.filteredResults,
      images: response.data.images.map(mapDownloadedImage)
    };
  }

  async createGeneration(params: CreateGenerationParams): Promise<Generation> {
    this.validatePrompt(params);
    let response = await this.axios.post<ApiGeneration>(
      '/image-generations',
      pickDefined(params)
    );

    return mapGeneration(response.data);
  }

  async updateGeneration(
    generationId: string,
    params: UpdateGenerationParams
  ): Promise<Generation> {
    this.validatePrompt(params);
    let response = await this.axios.put<ApiGeneration>(
      `/image-generations/${encodeURIComponent(generationId)}`,
      pickDefined(params)
    );

    return mapGeneration(response.data);
  }

  async retryGeneration(generationId: string): Promise<void> {
    await this.axios.post(`/image-generations/retry/${encodeURIComponent(generationId)}`);
  }

  async getGeneration(generationId: string): Promise<Generation> {
    let response = await this.axios.get<ApiGeneration>(
      `/image-generations/${encodeURIComponent(generationId)}`
    );
    return mapGeneration(response.data);
  }

  async listGenerations(params: ListGenerationsParams): Promise<ListGenerationsResponse> {
    let response = await this.axios.get<{
      filteredResults?: unknown;
      prints: ApiGeneration[];
    }>('/image-generations', {
      params: pickDefined(params)
    });

    return {
      filteredResults:
        typeof response.data.filteredResults === 'number'
          ? response.data.filteredResults
          : undefined,
      resultCountMetadata: response.data.filteredResults,
      generations: response.data.prints.map(mapGeneration)
    };
  }

  async deleteGenerations(generationIds: string[]): Promise<void> {
    await this.axios.delete('/image-generations', {
      data: { printIds: generationIds }
    });
  }

  async checkApiKey(): Promise<{ email: string; name?: string }> {
    let response = await this.axios.get<{ email: string; name?: string }>('/api-keys/check');
    return response.data;
  }

  async getCredits(): Promise<CreditInfo[]> {
    let response = await this.axios.get<{ credits: CreditInfo[] }>('/credit');
    return response.data.credits.map(c => ({
      type: c.type,
      credit: c.credit,
      creditTotal: c.creditTotal,
      unlimited: c.unlimited
    }));
  }

  async subscribeWebhook(params: WebhookSubscribeParams): Promise<string> {
    let response = await this.axios.post('/api-keys/webhook/subscribe', {
      url: params.url,
      events: params.events
    });
    return response.data.webhookId;
  }

  async unsubscribeWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/api-keys/webhook/unsubscribe/${encodeURIComponent(webhookId)}`);
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/api-keys/webhook/${encodeURIComponent(webhookId)}`);
    return response.data;
  }
}
