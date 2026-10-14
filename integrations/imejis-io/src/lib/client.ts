import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  requestAxios,
  requestAxiosData
} from 'slates';

export interface ListDesignsParams {
  search?: string;
  cursor?: string;
  limit?: number;
  isPublic?: boolean;
}

export interface ListDesignsResponse {
  designs: DesignSummary[];
  cursor?: string;
  hasMore: boolean;
}

export interface DesignSummary {
  designId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'pdf';

export interface RenderOptions {
  format?: ImageFormat;
  quality?: number;
}

export interface GenerateImageUrlResponse {
  url: string;
}

export interface SignedImageParams extends RenderOptions {
  designId: string;
  overrides: Record<string, unknown>;
  expiresIn?: number;
}

export interface SignedImageResponse extends GenerateImageUrlResponse {
  expiresAt: string;
}

export interface AiDesignParams {
  prompt: string;
  designId?: string;
}

export interface AiDesignResponse {
  designId: string;
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  url?: string;
}

export let imageMimeTypes: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf'
};

export class ImejisClient {
  private renderApi;
  private managementApi;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An Imejis.io API key is required. Reconnect with a valid key.'
      );
    }

    let defaults = {
      authHeader: { name: 'dma-api-key', value: config.token },
      timeout: 60_000
    };
    this.renderApi = createAuthenticatedAxios({
      ...defaults,
      baseURL: 'https://render.imejis.io/v1'
    });
    this.managementApi = createAuthenticatedAxios({
      ...defaults,
      baseURL: 'https://api.imejis.io/api'
    });
  }

  private apiError(error: unknown, operation: string) {
    return buildApiServiceError(error, {
      providerLabel: 'Imejis.io',
      reason: 'imejis_api_error',
      operation
    });
  }

  private renderPath(designId: string, options: RenderOptions) {
    if (!designId.trim()) {
      throw createApiServiceError('Provide a design ID from your Imejis.io template.');
    }
    if (
      options.quality !== undefined &&
      (!Number.isInteger(options.quality) || options.quality < 1 || options.quality > 100)
    ) {
      throw createApiServiceError('JPEG quality must be a whole number from 1 to 100.');
    }
    return `/${encodeURIComponent(designId)}`;
  }

  async generateImageBinary(
    designId: string,
    overrides: Record<string, unknown>,
    options: RenderOptions = {}
  ): Promise<{ imageBase64: string; contentType: string; content: Response }> {
    let path = this.renderPath(designId, options);
    let response = await requestAxios(
      'generate image',
      () =>
        this.renderApi.post<ArrayBuffer>(path, overrides, {
          responseType: 'arraybuffer',
          params: options
        }),
      (error, operation) => this.apiError(error, operation)
    );

    let buffer = Buffer.from(response.data);
    let contentType =
      getResponseHeaderValue(response.headers, 'content-type') ||
      imageMimeTypes[options.format ?? 'jpeg'];
    let mimeType = contentType.split(';')[0]?.trim().toLowerCase();
    if (
      !buffer.length ||
      (!mimeType?.startsWith('image/') && mimeType !== 'application/pdf')
    ) {
      throw createApiServiceError(
        'Imejis.io did not return an image or PDF. Check the design and try again.'
      );
    }

    return {
      imageBase64: buffer.toString('base64'),
      contentType,
      content: new Response(new Uint8Array(buffer), {
        headers: { 'content-type': contentType }
      })
    };
  }

  async generateImageUrl(
    designId: string,
    overrides: Record<string, unknown>,
    options: RenderOptions & { delivery?: 'hosted' | 'signed'; expiresIn?: number } = {}
  ): Promise<GenerateImageUrlResponse> {
    let path = this.renderPath(designId, options);
    let data = await requestAxiosData<unknown>(
      'generate image URL',
      () =>
        this.renderApi.post(path, overrides, {
          params: { ...options, delivery: options.delivery ?? 'hosted' }
        }),
      (error, operation) => this.apiError(error, operation)
    );

    if (isApiErrorRecord(data) && data.success === false) {
      throw this.apiError({ response: { status: 200, data } }, 'generate image URL');
    }
    if (!isApiErrorRecord(data) || typeof data.url !== 'string' || !data.url.trim()) {
      throw createApiServiceError(
        'Imejis.io did not return a generated image URL. Try rendering the design again.'
      );
    }
    try {
      let url = new URL(data.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw createApiServiceError(
          'Imejis.io returned an unsupported image URL. Try rendering the design again.'
        );
      }
    } catch (error) {
      throw this.apiError(error, 'validate generated image URL');
    }
    return { url: data.url };
  }

  async generateSignedImage(params: SignedImageParams): Promise<SignedImageResponse> {
    let expiresIn = params.expiresIn ?? 60;
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 10_080) {
      throw createApiServiceError(
        'Signed URL lifetime must be a whole number of minutes from 1 to 10080 (7 days).'
      );
    }
    // Starting before the request gives a conservative deadline for the documented lifetime.
    let requestedAt = Date.now();
    let result = await this.generateImageUrl(params.designId, params.overrides, {
      delivery: 'signed',
      expiresIn,
      format: params.format,
      quality: params.quality
    });
    let lifetime = expiresIn * 60_000;
    let expiresAt = requestedAt + lifetime;
    return {
      ...result,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  async listDesigns(params: ListDesignsParams = {}): Promise<ListDesignsResponse> {
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      throw createApiServiceError('The design limit must be a positive whole number.');
    }
    let data = await requestAxiosData<unknown>(
      'list designs',
      () =>
        this.managementApi.get('/designs', {
          params: {
            search: params.search || undefined,
            cursor: params.cursor || undefined,
            limit: params.limit,
            public: params.isPublic
          }
        }),
      (error, operation) => this.apiError(error, operation)
    );
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError(
        'Imejis.io returned an invalid design list. Try listing designs again.'
      );
    }
    let designs = data.designs ?? data.data;
    if (!Array.isArray(designs)) {
      throw createApiServiceError(
        'Imejis.io returned an invalid design list. Try listing designs again.'
      );
    }

    let cursor = data.cursor || data.nextCursor;
    return {
      designs: designs.map(design => this.designSummary(design)),
      cursor: typeof cursor === 'string' ? cursor : undefined,
      hasMore: typeof data.hasMore === 'boolean' ? data.hasMore : !!cursor
    };
  }

  private designSummary(value: unknown): DesignSummary {
    if (!isApiErrorRecord(value)) {
      throw createApiServiceError('Imejis.io returned invalid design details. Try again.');
    }
    let designId = value.id || value.designId || value._id;
    if (typeof designId !== 'string' || !designId) {
      throw createApiServiceError('Imejis.io returned a design without an ID. Try again.');
    }
    let thumbnailUrl = value.thumbnailUrl || value.thumbnail;
    let isPublic = value.public ?? value.isPublic;
    return {
      designId,
      name: typeof value.name === 'string' ? value.name : '',
      description: typeof value.description === 'string' ? value.description : undefined,
      thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined,
      isPublic: typeof isPublic === 'boolean' ? isPublic : undefined,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined
    };
  }

  async aiDesignAssistant(params: AiDesignParams): Promise<AiDesignResponse> {
    if (!params.prompt.trim()) {
      throw createApiServiceError(
        'Provide a prompt describing the design you want to create or update.'
      );
    }
    let data = await requestAxiosData<unknown>(
      'create or update AI design',
      () =>
        this.managementApi.post('/ai/designs', {
          prompt: params.prompt,
          ...(params.designId ? { designId: params.designId } : {})
        }),
      (error, operation) => this.apiError(error, operation)
    );
    let design = this.designSummary(data);
    return {
      designId: design.designId,
      name: isApiErrorRecord(data) && typeof data.name === 'string' ? data.name : undefined,
      description: design.description,
      thumbnailUrl: design.thumbnailUrl,
      url: isApiErrorRecord(data) && typeof data.url === 'string' ? data.url : undefined
    };
  }
}
