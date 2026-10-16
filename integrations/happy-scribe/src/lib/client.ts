import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import { validateDownloadedFile, validateDownloadUrl } from './download';
import {
  collection,
  exportSchema,
  glossarySchema,
  orderSchema,
  parseResponse,
  styleGuideSchema,
  transcriptionSchema
} from './responses';

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
  perPage?: number;
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private downloadAxios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://www.happyscribe.com/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Happy Scribe',
          reason: 'happy_scribe_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          extractUpstreamCode: (_input, response, helpers) => {
            let body = response?.data;
            return helpers.isRecord(body) && typeof body.code === 'string'
              ? body.code
              : undefined;
          }
        })
    });
    this.downloadAxios = createAuthenticatedAxios({
      contentType: false,
      headers: { Authorization: undefined, Cookie: undefined },
      withCredentials: false,
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 100 * 1024 * 1024,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Happy Scribe',
          reason: 'happy_scribe_download_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  // ---- Uploads ----

  async getSignedUploadUrl(filename: string): Promise<{ signedUrl: string }> {
    let response = await this.axios.get('/uploads/new', {
      params: { filename }
    });
    return parseResponse(z.object({ signedUrl: z.string() }), response.data);
  }

  // ---- Orders ----

  async createOrder(params: CreateOrderParams): Promise<z.output<typeof orderSchema>> {
    let body: Record<string, unknown> = {
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

    let response = await this.axios.post('/orders', { order: body });
    return parseResponse(orderSchema, response.data);
  }

  async createTranslationOrder(
    params: CreateTranslationOrderParams
  ): Promise<z.output<typeof orderSchema>> {
    let body: Record<string, unknown> = {
      source_transcription_id: params.sourceTranscriptionId,
      target_languages: params.targetLanguages
    };

    if (params.service !== undefined) body.service = params.service;
    if (params.confirm !== undefined) body.confirm = params.confirm;
    if (params.boost !== undefined) body.boost = params.boost;
    if (params.webhookUrl !== undefined) body.webhook_url = params.webhookUrl;
    if (params.tags !== undefined) body.tags = params.tags;

    let response = await this.axios.post('/orders/translation', { order: body });
    return parseResponse(orderSchema, response.data);
  }

  async getOrder(orderId: string): Promise<z.output<typeof orderSchema>> {
    let response = await this.axios.get(`/orders/${encodeURIComponent(orderId)}`);
    return parseResponse(orderSchema, response.data);
  }

  async confirmOrder(orderId: string): Promise<z.output<typeof orderSchema>> {
    let response = await this.axios.post(`/orders/${encodeURIComponent(orderId)}/confirm`);
    return parseResponse(orderSchema, response.data);
  }

  // ---- Transcriptions ----

  async listTranscriptions(params: ListTranscriptionsParams) {
    let queryParams: Record<string, unknown> = {
      organization_id: params.organizationId
    };

    if (params.folderId !== undefined) queryParams.folder_id = params.folderId;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.perPage !== undefined) queryParams.per_page = params.perPage;
    if (params.tags !== undefined) queryParams.tags = params.tags;

    let response = await this.axios.get('/transcriptions', {
      params: queryParams
    });
    return parseResponse(
      z.looseObject({
        results: z.array(transcriptionSchema),
        _links: z.looseObject({ next: z.looseObject({ url: z.string() }).nullish() }).nullish()
      }),
      response.data
    );
  }

  async getTranscription(transcriptionId: string) {
    let response = await this.axios.get(
      `/transcriptions/${encodeURIComponent(transcriptionId)}`
    );
    return parseResponse(transcriptionSchema, response.data);
  }

  async deleteTranscription(
    transcriptionId: string,
    permanent: boolean = false
  ): Promise<void> {
    await this.axios.delete(`/transcriptions/${encodeURIComponent(transcriptionId)}`, {
      params: permanent ? { permanent: true } : undefined
    });
  }

  // ---- Exports ----

  async createExport(params: CreateExportParams) {
    let body: Record<string, unknown> = {
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

    let response = await this.axios.post('/exports', { export: body });
    return parseResponse(exportSchema, response.data);
  }

  async getExport(exportId: string) {
    let response = await this.axios.get(`/exports/${encodeURIComponent(exportId)}`);
    return parseResponse(exportSchema, response.data);
  }

  // ---- Glossaries ----

  async listGlossaries(organizationId: string) {
    let response = await this.axios.get('/glossaries', {
      params: { organization_id: organizationId }
    });
    return collection(response.data, 'glossaries').map(value =>
      parseResponse(glossarySchema, value)
    );
  }

  // ---- Style Guides ----

  async listStyleGuides(organizationId: string) {
    let response = await this.axios.get('/style_guides', {
      params: { organization_id: organizationId }
    });
    return collection(response.data, 'style_guides').map(value =>
      parseResponse(styleGuideSchema, value)
    );
  }

  async listOrganizations() {
    let response = await this.axios.get('/organizations');
    return collection(response.data, 'organizations').map(value =>
      parseResponse(
        z.looseObject({
          id: z.union([z.string(), z.number().int()]),
          name: z.string(),
          role: z.string()
        }),
        value
      )
    );
  }

  async updateTranscription(
    transcriptionId: string,
    params: {
      organization_id: string;
      name?: string;
      sharing_enabled?: boolean;
      folder_id?: string;
    }
  ) {
    let response = await this.axios.patch(
      `/transcriptions/${encodeURIComponent(transcriptionId)}`,
      { transcription: params }
    );
    return parseResponse(transcriptionSchema, response.data);
  }

  async getMeetingSummary(transcriptionId: string) {
    let response = await this.axios.get(
      `/transcriptions/${encodeURIComponent(transcriptionId)}/summary`
    );
    return parseResponse(z.looseObject({ summary: z.string() }), response.data);
  }

  async downloadFile(url: string, format: string) {
    let response = await this.downloadAxios.get(validateDownloadUrl(url), {
      responseType: 'arraybuffer',
      headers: { Authorization: undefined, Cookie: undefined }
    });
    return validateDownloadedFile(response.data, format);
  }
}
