import { createAxios } from 'slates';

export interface SearchImagesParams {
  search?: string;
  filterFree?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface SearchImagesResponse {
  filteredResults: number;
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
  filteredResults: number;
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
  generationId: string;
  name: string;
  prompt: string;
  status: number;
  statusLabel: string;
  params: GenerationParam[];
  processMode?: string;
  images: ImageResult[];
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
  filteredResults: number;
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

let mapImage = (img: any): ImageResult => ({
  imageId: img.id,
  url: img.url,
  urlFull: img.urlFull,
  validated: img.validate,
  free: img.free,
  titles: img.titles
});

let mapDownloadedImage = (img: any): DownloadedImage => ({
  imageId: img.id,
  previewUrl: img.url,
  fullUrl: img.urlFull,
  upscaleUrl: img.urlUpscale,
  upscaleUhdUrl: img.urlUpscaleUHD,
  downloadedAt: img.downloadedAt
});

let mapGeneration = (gen: any): Generation => ({
  generationId: gen.id,
  name: gen.name,
  prompt: gen.prompt,
  status: gen.status,
  statusLabel: statusLabels[gen.status] ?? 'unknown',
  params: gen.params ?? [],
  processMode: gen.processMode,
  images: (gen.images ?? []).map(mapImage),
  nbImages: gen.nbImages,
  tags: gen.tags,
  metaData: gen.metaData,
  createdAt: gen.createdAt
});

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.all-images.ai/v1',
      headers: {
        'api-key': token
      }
    });
  }

  async searchImages(params: SearchImagesParams): Promise<SearchImagesResponse> {
    let response = await this.axios.post('/images/search', {
      search: params.search,
      filterFree: params.filterFree,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort
    });

    return {
      filteredResults: response.data.filteredResults ?? 0,
      images: (response.data.images ?? []).map(mapImage)
    };
  }

  async buyImage(imageId: string): Promise<DownloadedImage> {
    let response = await this.axios.post('/images/buy', { id: imageId });
    return mapDownloadedImage(response.data);
  }

  async getDownloadedImages(
    params: DownloadedImagesParams
  ): Promise<DownloadedImagesResponse> {
    let response = await this.axios.post('/images/downladed', {
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      afterCreatedAt: params.afterCreatedAt,
      beforeCreatedAt: params.beforeCreatedAt
    });

    return {
      filteredResults: response.data.filteredResults ?? 0,
      images: (response.data.images ?? []).map(mapDownloadedImage)
    };
  }

  async createGeneration(params: CreateGenerationParams): Promise<Generation> {
    let response = await this.axios.post('/image-generations', {
      name: params.name,
      mode: params.mode,
      prompt: params.prompt,
      additionalPrompt: params.additionalPrompt,
      optimizePrompt: params.optimizePrompt,
      params: params.params,
      processMode: params.processMode,
      tags: params.tags,
      metaData: params.metaData
    });

    return mapGeneration(response.data);
  }

  async updateGeneration(
    generationId: string,
    params: UpdateGenerationParams
  ): Promise<Generation> {
    let response = await this.axios.put(`/image-generations/${generationId}`, {
      name: params.name,
      mode: params.mode,
      prompt: params.prompt,
      additionalPrompt: params.additionalPrompt,
      optimizePrompt: params.optimizePrompt,
      params: params.params,
      processMode: params.processMode,
      tags: params.tags,
      metaData: params.metaData
    });

    return mapGeneration(response.data);
  }

  async retryGeneration(generationId: string): Promise<void> {
    await this.axios.post(`/image-generations/retry/${generationId}`);
  }

  async getGeneration(generationId: string): Promise<Generation> {
    let response = await this.axios.get(`/image-generations/${generationId}`);
    return mapGeneration(response.data);
  }

  async listGenerations(params: ListGenerationsParams): Promise<ListGenerationsResponse> {
    let response = await this.axios.get('/image-generations', {
      params: {
        limit: params.limit,
        offset: params.offset,
        sort: params.sort,
        name: params.name,
        tag: params.tag
      }
    });

    return {
      filteredResults: response.data.filteredResults ?? 0,
      generations: (response.data.prints ?? []).map(mapGeneration)
    };
  }

  async deleteGenerations(generationIds: string[]): Promise<void> {
    await this.axios.delete('/image-generations', {
      data: { printIds: generationIds }
    });
  }

  async checkApiKey(): Promise<{ email: string; name?: string }> {
    let response = await this.axios.get('/api-keys/check');
    return response.data;
  }

  async getCredits(): Promise<CreditInfo[]> {
    let response = await this.axios.get('/credit');
    return (response.data.credits ?? []).map((c: any) => ({
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
    await this.axios.delete(`/api-keys/webhook/unsubscribe/${webhookId}`);
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/api-keys/webhook/${webhookId}`);
    return response.data;
  }
}
