import { createAxios } from 'slates';

export interface PlacidTemplate {
  uuid: string;
  title: string;
  thumbnail: string | null;
  tags: string[];
  custom_data: string | null;
  layers: Array<{
    name: string;
    type: string;
  }>;
}

export interface PlacidCollection {
  id: number;
  title: string;
  custom_data: string | null;
  template_uuids: string[];
}

export interface PlacidImage {
  id: number;
  status: string;
  image_url: string | null;
  polling_url: string;
}

export interface PlacidPdf {
  id: number;
  status: string;
  pdf_url: string | null;
  polling_url: string;
}

export interface PlacidVideo {
  id: number;
  status: string;
  video_url: string | null;
  polling_url: string;
}

export interface PlacidTransfer {
  to: 's3';
  key: string;
  secret: string;
  region: string;
  bucket: string;
  visibility?: 'public' | 'private';
  path?: string;
  endpoint?: string;
  token?: string;
}

export interface PlacidPaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    path: string;
    per_page: number;
  };
}

export class PlacidClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.placid.app/api/rest',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ========== Templates ==========

  async listTemplates(params?: {
    collectionId?: string;
    titleFilter?: string;
    orderBy?: string;
    page?: number;
  }): Promise<PlacidPaginatedResponse<PlacidTemplate>> {
    let queryParams: Record<string, string | number> = {};
    if (params?.collectionId) queryParams.collection_id = params.collectionId;
    if (params?.titleFilter) queryParams.title_filter = params.titleFilter;
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.page) queryParams.page = params.page;

    let response = await this.api.get('/templates', { params: queryParams });
    return response.data;
  }

  async getTemplate(templateUuid: string): Promise<PlacidTemplate> {
    let response = await this.api.get(`/templates/${templateUuid}`);
    return response.data;
  }

  async createTemplate(params: {
    title: string;
    width?: number;
    height?: number;
    tags?: string[];
    customData?: string | null;
    fromTemplate?: string;
    addToCollections?: string[];
  }): Promise<PlacidTemplate> {
    let body: Record<string, unknown> = {
      title: params.title
    };
    if (params.width !== undefined) body.width = params.width;
    if (params.height !== undefined) body.height = params.height;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.customData !== undefined) body.custom_data = params.customData;
    if (params.fromTemplate) body.from_template = params.fromTemplate;
    if (params.addToCollections) body.add_to_collections = params.addToCollections;

    let response = await this.api.post('/templates', body);
    return response.data;
  }

  async updateTemplate(
    templateUuid: string,
    params: {
      title?: string;
      tags?: string[];
      customData?: string | null;
    }
  ): Promise<PlacidTemplate> {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.customData !== undefined) body.custom_data = params.customData;

    let response = await this.api.patch(`/templates/${templateUuid}`, body);
    return response.data;
  }

  async deleteTemplate(templateUuid: string): Promise<void> {
    await this.api.delete(`/templates/${templateUuid}`);
  }

  // ========== Collections ==========

  async listCollections(params?: {
    perPage?: number;
  }): Promise<PlacidPaginatedResponse<PlacidCollection>> {
    let queryParams: Record<string, number> = {};
    if (params?.perPage) queryParams.per_page = params.perPage;

    let response = await this.api.get('/collections', { params: queryParams });
    return response.data;
  }

  async getCollection(collectionId: number): Promise<PlacidCollection> {
    let response = await this.api.get(`/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(params: {
    title: string;
    templateUuids?: string[];
    customData?: string | null;
  }): Promise<PlacidCollection> {
    let body: Record<string, unknown> = {
      title: params.title
    };
    if (params.templateUuids) body.template_uuids = params.templateUuids;
    if (params.customData !== undefined) body.custom_data = params.customData;

    let response = await this.api.post('/collections', body);
    return response.data;
  }

  async updateCollection(
    collectionId: number,
    params: {
      title?: string;
      customData?: string | null;
      addTemplateUuids?: string[];
      removeTemplateUuids?: string[];
    }
  ): Promise<PlacidCollection> {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.customData !== undefined) body.custom_data = params.customData;
    if (params.addTemplateUuids) body.add_template_uuids = params.addTemplateUuids;
    if (params.removeTemplateUuids) body.remove_template_uuids = params.removeTemplateUuids;

    let response = await this.api.patch(`/collections/${collectionId}`, body);
    return response.data;
  }

  async deleteCollection(collectionId: number): Promise<void> {
    await this.api.delete(`/collections/${collectionId}`);
  }

  // ========== Image Generation ==========

  async createImage(params: {
    templateUuid: string;
    layers?: Record<string, Record<string, unknown>>;
    modifications?: Record<string, unknown>;
    transfer?: PlacidTransfer;
    webhookSuccess?: string;
    passthrough?: string;
    createNow?: boolean;
  }): Promise<PlacidImage> {
    let body: Record<string, unknown> = {
      template_uuid: params.templateUuid
    };
    if (params.layers) body.layers = params.layers;
    if (params.modifications) body.modifications = params.modifications;
    if (params.transfer) body.transfer = params.transfer;
    if (params.webhookSuccess) body.webhook_success = params.webhookSuccess;
    if (params.passthrough) body.passthrough = params.passthrough;
    if (params.createNow !== undefined) body.create_now = params.createNow;

    let response = await this.api.post('/images', body);
    return response.data;
  }

  async getImage(imageId: number): Promise<PlacidImage> {
    let response = await this.api.get(`/images/${imageId}`);
    return response.data;
  }

  async deleteImage(imageId: number): Promise<void> {
    await this.api.delete(`/images/${imageId}`);
  }

  // ========== PDF Generation ==========

  async createPdf(params: {
    pages: Array<{
      templateUuid: string;
      layers?: Record<string, Record<string, unknown>>;
    }>;
    modifications?: Record<string, unknown>;
    transfer?: PlacidTransfer;
    webhookSuccess?: string;
    passthrough?: string;
  }): Promise<PlacidPdf> {
    let body: Record<string, unknown> = {
      pages: params.pages.map(page => ({
        template_uuid: page.templateUuid,
        ...(page.layers ? { layers: page.layers } : {})
      }))
    };
    if (params.modifications) body.modifications = params.modifications;
    if (params.transfer) body.transfer = params.transfer;
    if (params.webhookSuccess) body.webhook_success = params.webhookSuccess;
    if (params.passthrough) body.passthrough = params.passthrough;

    let response = await this.api.post('/pdfs', body);
    return response.data;
  }

  async mergePdfs(params: {
    urls: string[];
    webhookSuccess?: string;
    passthrough?: string;
    transfer?: PlacidTransfer;
  }): Promise<PlacidPdf> {
    let body: Record<string, unknown> = {
      urls: params.urls
    };
    if (params.webhookSuccess) body.webhook_success = params.webhookSuccess;
    if (params.passthrough) body.passthrough = params.passthrough;
    if (params.transfer) body.transfer = params.transfer;

    let response = await this.api.post('/pdfs/merge', body);
    return response.data;
  }

  async getPdf(pdfId: number): Promise<PlacidPdf> {
    let response = await this.api.get(`/pdfs/${pdfId}`);
    return response.data;
  }

  async deletePdf(pdfId: number): Promise<void> {
    await this.api.delete(`/pdfs/${pdfId}`);
  }

  // ========== Video Generation ==========

  async createVideo(params: {
    clips: Array<{
      templateUuid: string;
      layers?: Record<string, Record<string, unknown>>;
      audio?: string;
      audioDuration?: string;
      audioTrimStart?: string;
      audioTrimEnd?: string;
    }>;
    modifications?: Record<string, unknown>;
    transfer?: PlacidTransfer;
    webhookSuccess?: string;
    passthrough?: string;
  }): Promise<PlacidVideo> {
    let body: Record<string, unknown> = {
      clips: params.clips.map(clip => {
        let clipBody: Record<string, unknown> = {
          template_uuid: clip.templateUuid
        };
        if (clip.layers) clipBody.layers = clip.layers;
        if (clip.audio) clipBody.audio = clip.audio;
        if (clip.audioDuration) clipBody.audio_duration = clip.audioDuration;
        if (clip.audioTrimStart) clipBody.audio_trim_start = clip.audioTrimStart;
        if (clip.audioTrimEnd) clipBody.audio_trim_end = clip.audioTrimEnd;
        return clipBody;
      })
    };
    if (params.modifications) body.modifications = params.modifications;
    if (params.transfer) body.transfer = params.transfer;
    if (params.webhookSuccess) body.webhook_success = params.webhookSuccess;
    if (params.passthrough) body.passthrough = params.passthrough;

    let response = await this.api.post('/videos', body);
    return response.data;
  }

  async getVideo(videoId: number): Promise<PlacidVideo> {
    let response = await this.api.get(`/videos/${videoId}`);
    return response.data;
  }

  async deleteVideo(videoId: number): Promise<void> {
    await this.api.delete(`/videos/${videoId}`);
  }

  // ========== Media Upload ==========

  async uploadMedia(files: Array<{ key: string; url: string }>): Promise<{
    media: Array<{ file_key: string; file_id: string }>;
  }> {
    // Placid expects multipart/form-data for file uploads
    // Since we receive URLs, we need to fetch files and upload them
    // For simplicity, using the URL-based approach that Placid supports
    let formData = new FormData();
    for (let file of files) {
      formData.append(file.key, file.url);
    }

    let response = await this.api.post('/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}
