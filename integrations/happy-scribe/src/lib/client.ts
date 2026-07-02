import { createAxios } from 'slates';

export interface CreateOrderParams {
  url: string;
  language: string;
  organizationId: string;
  service?: 'auto' | 'pro';
  confirm?: boolean;
  folderId?: string;
  folder?: string;
  name?: string;
  boost?: boolean;
  isSubtitle?: boolean;
  tags?: string[];
  webhookUrl?: string;
  glossaryIds?: string[];
  styleGuideId?: string;
}

export interface CreateTranslationOrderParams {
  sourceTranscriptionId: string;
  targetLanguages: string[];
  service?: 'auto' | 'pro';
  confirm?: boolean;
  boost?: boolean;
  webhookUrl?: string;
  tags?: string[];
}

export interface ListTranscriptionsParams {
  organizationId: string;
  folderId?: string;
  page?: number;
  tags?: string[];
}

export interface CreateExportParams {
  format: string;
  transcriptionIds: string[];
  showTimestamps?: boolean;
  timestampsFrequency?: number;
  showSpeakers?: boolean;
  showComments?: boolean;
  showHighlights?: boolean;
  showHighlightsOnly?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.happyscribe.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Uploads ----

  async getSignedUploadUrl(filename: string): Promise<{ signedUrl: string }> {
    let response = await this.axios.get('/uploads/new', {
      params: { filename }
    });
    return response.data;
  }

  // ---- Orders ----

  async createOrder(params: CreateOrderParams): Promise<any> {
    let body: Record<string, any> = {
      url: params.url,
      language: params.language,
      organization_id: params.organizationId
    };

    if (params.service !== undefined) body.service = params.service;
    if (params.confirm !== undefined) body.confirm = params.confirm;
    if (params.folderId !== undefined) body.folder_id = params.folderId;
    if (params.folder !== undefined) body.folder = params.folder;
    if (params.name !== undefined) body.name = params.name;
    if (params.boost !== undefined) body.boost = params.boost;
    if (params.isSubtitle !== undefined) body.is_subtitle = params.isSubtitle;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.glossaryIds !== undefined) body.glossary_ids = params.glossaryIds;
    if (params.styleGuideId !== undefined) body.style_guide_id = params.styleGuideId;

    let response = await this.axios.post('/orders', body);
    return response.data;
  }

  async createTranslationOrder(params: CreateTranslationOrderParams): Promise<any> {
    let body: Record<string, any> = {
      source_transcription_id: params.sourceTranscriptionId,
      target_languages: params.targetLanguages
    };

    if (params.service !== undefined) body.service = params.service;
    if (params.confirm !== undefined) body.confirm = params.confirm;
    if (params.boost !== undefined) body.boost = params.boost;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.tags !== undefined) body.tags = params.tags;

    let response = await this.axios.post('/orders/translation', body);
    return response.data;
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await this.axios.get(`/orders/${orderId}`);
    return response.data;
  }

  async confirmOrder(orderId: string): Promise<any> {
    let response = await this.axios.post(`/orders/${orderId}/confirm`);
    return response.data;
  }

  // ---- Transcriptions ----

  async listTranscriptions(params: ListTranscriptionsParams): Promise<any> {
    let queryParams: Record<string, any> = {
      organization_id: params.organizationId
    };

    if (params.folderId !== undefined) queryParams.folder_id = params.folderId;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.tags !== undefined) queryParams.tags = params.tags;

    let response = await this.axios.get('/transcriptions', {
      params: queryParams
    });
    return response.data;
  }

  async getTranscription(transcriptionId: string): Promise<any> {
    let response = await this.axios.get(`/transcriptions/${transcriptionId}`);
    return response.data;
  }

  async deleteTranscription(
    transcriptionId: string,
    permanent: boolean = false
  ): Promise<void> {
    await this.axios.delete(`/transcriptions/${transcriptionId}`, {
      params: permanent ? { permanent: true } : undefined
    });
  }

  // ---- Exports ----

  async createExport(params: CreateExportParams): Promise<any> {
    let body: Record<string, any> = {
      format: params.format,
      transcription_ids: params.transcriptionIds
    };

    if (params.showTimestamps !== undefined) body.show_timestamps = params.showTimestamps;
    if (params.timestampsFrequency !== undefined)
      body.timestamps_frequency = params.timestampsFrequency;
    if (params.showSpeakers !== undefined) body.show_speakers = params.showSpeakers;
    if (params.showComments !== undefined) body.show_comments = params.showComments;
    if (params.showHighlights !== undefined) body.show_highlights = params.showHighlights;
    if (params.showHighlightsOnly !== undefined)
      body.show_highlights_only = params.showHighlightsOnly;

    let response = await this.axios.post('/exports', body);
    return response.data;
  }

  async getExport(exportId: string): Promise<any> {
    let response = await this.axios.get(`/exports/${exportId}`);
    return response.data;
  }

  // ---- Glossaries ----

  async listGlossaries(organizationId: string): Promise<any> {
    let response = await this.axios.get('/glossaries', {
      params: { organization_id: organizationId }
    });
    return response.data;
  }

  // ---- Style Guides ----

  async listStyleGuides(organizationId: string): Promise<any> {
    let response = await this.axios.get('/style_guides', {
      params: { organization_id: organizationId }
    });
    return response.data;
  }
}
