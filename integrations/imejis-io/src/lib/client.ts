import { createAxios } from 'slates';

let renderApi = createAxios({
  baseURL: 'https://render.imejis.io/v1'
});

let managementApi = createAxios({
  baseURL: 'https://api.imejis.io/api'
});

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

export interface GenerateImageParams {
  designId: string;
  overrides: Record<string, unknown>;
  responseFormat?: 'binary' | 'url';
}

export interface GenerateImageUrlResponse {
  url: string;
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

export class ImejisClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private renderHeaders() {
    return {
      'dma-api-key': this.token,
      'Content-Type': 'application/json'
    };
  }

  private managementHeaders() {
    return {
      'dma-api-key': this.token,
      'Content-Type': 'application/json'
    };
  }

  async generateImageBinary(
    designId: string,
    overrides: Record<string, unknown>
  ): Promise<{ imageBase64: string; contentType: string }> {
    let response = await renderApi.post(`/${designId}`, overrides, {
      headers: this.renderHeaders(),
      responseType: 'arraybuffer'
    });

    let buffer = Buffer.from(response.data);
    let contentType = (response.headers['content-type'] as string) || 'image/png';
    let imageBase64 = buffer.toString('base64');

    return { imageBase64, contentType };
  }

  async generateImageUrl(
    designId: string,
    overrides: Record<string, unknown>
  ): Promise<GenerateImageUrlResponse> {
    let response = await managementApi.post(`/designs/${designId}`, overrides, {
      headers: this.managementHeaders()
    });

    return response.data;
  }

  async listDesigns(params: ListDesignsParams = {}): Promise<ListDesignsResponse> {
    let queryParams: Record<string, string> = {};

    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }
    if (params.limit !== undefined) {
      queryParams.limit = String(params.limit);
    }
    if (params.isPublic !== undefined) {
      queryParams.public = String(params.isPublic);
    }

    let response = await managementApi.get('/designs', {
      headers: this.managementHeaders(),
      params: queryParams
    });

    let data = response.data;

    let designs: DesignSummary[] = (data.designs || data.data || []).map(
      (d: Record<string, unknown>) => ({
        designId: d.id || d.designId || d._id,
        name: d.name || '',
        description: d.description,
        thumbnailUrl: d.thumbnailUrl || d.thumbnail,
        isPublic: d.public || d.isPublic,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      })
    );

    return {
      designs,
      cursor: data.cursor || data.nextCursor,
      hasMore: !!(data.cursor || data.nextCursor || data.hasMore)
    };
  }

  async aiDesignAssistant(params: AiDesignParams): Promise<AiDesignResponse> {
    let body: Record<string, unknown> = {
      prompt: params.prompt
    };

    if (params.designId) {
      body.designId = params.designId;
    }

    let response = await managementApi.post('/ai/designs', body, {
      headers: this.managementHeaders()
    });

    let data = response.data;

    return {
      designId: data.id || data.designId || data._id,
      name: data.name,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl || data.thumbnail,
      url: data.url
    };
  }
}
