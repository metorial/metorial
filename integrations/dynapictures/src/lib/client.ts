import { createAxios } from 'slates';

let BASE_URL = 'https://api.dynapictures.com';

export interface LayerParams {
  name: string;
  text?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  imageUrl?: string;
  imagePosition?: string;
  imageAlignH?: string;
  imageAlignV?: string;
  imageEffect?: string;
  opacity?: number;
  chartColor?: string;
  chartLabelColor?: string;
  chartDataLabels?: string[];
  chartDataValues?: number[];
}

export interface PageParams {
  index?: number;
  templateId?: string;
  metadata?: string;
  layers: LayerParams[];
}

export interface GenerateImageRequest {
  format?: string;
  metadata?: string;
  params?: LayerParams[];
  pages?: PageParams[];
}

export interface GeneratedImage {
  id: string;
  templateId: string;
  imageUrl: string;
  thumbnailUrl: string;
  retinaThumbnailUrl?: string;
  pdfUrl?: string;
  metadata: string;
  width: number;
  height: number;
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  dateCreated: string;
  dateUpdated: string;
  layers: TemplateLayer[];
}

export interface TemplateLayer {
  type: string;
  name: string;
  width: string;
  height: string;
  text?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface MediaAsset {
  id: string;
  folder: boolean;
  mimeType: string;
  filename: string;
  size: number;
  url: string;
  thumbnailUrl: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface MediaAssetListResponse {
  page: number;
  totalPages: number;
  results: MediaAsset[];
}

export interface WebhookSubscription {
  uid: string;
  eventType: string;
  targetUrl: string;
  designUid: string;
  dateCreated: string;
}

export interface WebhookUnsubscribeResponse {
  error: boolean;
  message: string;
}

export interface BatchPageParams {
  templateId?: string;
  metadata?: string;
  layers: LayerParams[];
}

export interface BatchRequest {
  templateId: string;
  format: string;
  metadata?: string;
  pages: BatchPageParams[];
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Image Generation ----

  async generateImage(
    templateId: string,
    request: GenerateImageRequest
  ): Promise<GeneratedImage> {
    let response = await this.axios.post(`/designs/${templateId}`, request);
    return response.data;
  }

  async deleteImage(imagePath: string): Promise<void> {
    await this.axios.delete(`/images/${imagePath}`);
  }

  // ---- Batch API ----

  async generateBatchPdf(request: BatchRequest): Promise<GeneratedImage> {
    let response = await this.axios.post('/batch', request);
    return response.data;
  }

  // ---- Templates ----

  async listTemplates(): Promise<Template[]> {
    let response = await this.axios.get('/templates');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<Template> {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(): Promise<Workspace[]> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }

  async createWorkspace(name: string): Promise<Workspace> {
    let response = await this.axios.post('/workspaces', { name });
    return response.data;
  }

  async updateWorkspace(workspaceId: string, name: string): Promise<Workspace> {
    let response = await this.axios.put(`/workspaces/${workspaceId}`, { name });
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<Workspace> {
    let response = await this.axios.delete(`/workspaces/${workspaceId}`);
    return response.data;
  }

  // ---- Media Library ----

  async listMediaAssets(workspaceId: string, page?: number): Promise<MediaAssetListResponse> {
    let params: Record<string, string> = {};
    if (page !== undefined) {
      params.p = String(page);
    }
    let response = await this.axios.get(`/media/${workspaceId}/assets`, { params });
    return response.data;
  }

  async getMediaAsset(workspaceId: string, assetId: string): Promise<MediaAsset> {
    let response = await this.axios.get(`/media/${workspaceId}/assets/${assetId}`);
    return response.data;
  }

  async deleteMediaAsset(workspaceId: string, assetId: string): Promise<MediaAsset> {
    let response = await this.axios.delete(`/media/${workspaceId}/assets/${assetId}`);
    return response.data;
  }

  // ---- Webhooks ----

  async subscribeWebhook(
    targetUrl: string,
    eventType: string,
    templateId: string
  ): Promise<WebhookSubscription> {
    let response = await this.axios.post('/hooks', {
      targetUrl,
      eventType,
      templateId
    });
    return response.data;
  }

  async unsubscribeWebhook(
    targetUrl: string,
    eventType: string,
    templateId: string
  ): Promise<WebhookUnsubscribeResponse> {
    let response = await this.axios.delete('/hooks', {
      data: {
        targetUrl,
        eventType,
        templateId
      }
    });
    return response.data;
  }
}
