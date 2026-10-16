import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  decodeApiErrorBody,
  getResponseHeaderValue,
  readApiErrorText,
  requestAxios,
  truncateApiErrorMessage
} from 'slates';

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
  prompt?: string;
  sourceImage?: string;
  referenceImages?: { name: string; url: string }[];
  value?: number;
  maxValue?: number;
  activeColor?: string;
  inactiveColor?: string;
  circleColor?: string;
  progressColor?: string;
  textColor?: string;
  remainingColor?: string;
  label?: string;
  labelAlign?: string;
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

export interface GeneratedPage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  retinaThumbnailUrl?: string;
  metadata?: string;
  width: number;
  height: number;
  pageIndex?: number;
  [key: string]: unknown;
}

export interface GeneratedImage {
  id?: string;
  templateId: string;
  templateName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  retinaThumbnailUrl?: string;
  pdfUrl?: string;
  metadata?: string;
  width?: number;
  height?: number;
  pages?: GeneratedPage[];
  [key: string]: unknown;
}

export interface AiGenerationRequest {
  modelId: string;
  prompt: string;
  ratio?: string;
  sourceImage?: string;
  referenceImages?: { name: string; url: string }[];
}

export interface AiGenerationJob {
  jobUid: string;
  status: string;
  resultUrl?: string;
  creditsCharged?: number;
  creditsRemaining?: number;
  error?: string;
  [key: string]: unknown;
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

export let requireText = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be empty.`);
};

let resourceId = (value: string, label: string) => {
  requireText(value, label);
  return encodeURIComponent(value);
};

export let validateLayers = (layers: LayerParams[]) => {
  for (let layer of layers) {
    requireText(layer.name, 'Layer name');
    if (
      layer.opacity !== undefined &&
      (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)
    ) {
      throw createApiServiceError('Layer opacity must be between 0 and 1.');
    }
    if ((layer.referenceImages?.length ?? 0) + (layer.sourceImage ? 1 : 0) > 6) {
      throw createApiServiceError(
        'An AI image layer accepts at most 6 source and reference images combined; individual models may support fewer.'
      );
    }
  }
};

export let getFileAuthHeaders = (url: string, token: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError('DynaPictures returned an invalid file URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createApiServiceError('DynaPictures returned an unsupported file URL.');
  }
  return parsed.origin === BASE_URL ? { Authorization: `Bearer ${token}` } : undefined;
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a DynaPictures API key.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      errorMapping: {
        extractResponseData: response => decodeApiErrorBody(response.data, { maxBytes: 8192 })
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DynaPictures',
          reason: 'dynapictures_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'detail', 'error', 'code'],
          nestedKeys: ['errors', 'message', 'error']
        })
    });
  }

  // ---- Image Generation ----

  async generateImage(
    templateId: string,
    request: GenerateImageRequest
  ): Promise<GeneratedImage> {
    let response = await this.axios.post(
      `/designs/${resourceId(templateId, 'Template ID')}`,
      request
    );
    return response.data;
  }

  async deleteImage(imagePath: string): Promise<void> {
    let segments = imagePath.split('/');
    if (
      segments.some(segment => !segment || segment === '.' || segment === '..') ||
      /[?#\\]/.test(imagePath) ||
      imagePath.includes('://')
    ) {
      throw createApiServiceError(
        'Provide the generated image subpath, such as workspace/image.png, without a host, query, or fragment.'
      );
    }
    await this.axios.delete(`/images/${segments.map(encodeURIComponent).join('/')}`);
  }

  // ---- Batch API ----

  async generateBatchPdf(request: BatchRequest): Promise<Uint8Array> {
    let response = await this.axios.post<ArrayBuffer>('/batch', request, {
      responseType: 'arraybuffer',
      headers: { Accept: 'application/pdf' }
    });
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    let content = new Uint8Array(response.data);
    if (
      mimeType !== 'application/pdf' ||
      new TextDecoder().decode(content.subarray(0, 5)) !== '%PDF-'
    ) {
      throw buildApiServiceError(
        {
          response: {
            status: response.status,
            data: decodeApiErrorBody(content, { maxBytes: 8192 })
          }
        },
        {
          providerLabel: 'DynaPictures',
          operation: 'PDF generation',
          reason: 'dynapictures_invalid_pdf_response',
          extractMessage: (error, helpers) => {
            let body = helpers.getResponse(error)?.data;
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              nestedKeys: ['errors', 'message', 'error']
            });
            return truncateApiErrorMessage(
              details
                .map(value => readApiErrorText(value))
                .filter(Boolean)
                .join(' - ') ||
                'The response was not a PDF document. Check the template and page settings.'
            );
          }
        }
      );
    }
    return content;
  }

  // ---- Templates ----

  async listTemplates(): Promise<Template[]> {
    let response = await this.axios.get('/templates');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<Template> {
    let response = await this.axios.get(`/templates/${resourceId(templateId, 'Template ID')}`);
    return response.data;
  }

  // ---- Workspaces ----

  async listWorkspaces(): Promise<Workspace[]> {
    let response = await this.axios.get('/workspaces');
    return response.data;
  }

  async createWorkspace(name: string): Promise<Workspace> {
    requireText(name, 'Workspace name');
    let response = await this.axios.post('/workspaces', { name });
    return response.data;
  }

  async updateWorkspace(workspaceId: string, name: string): Promise<Workspace> {
    requireText(name, 'Workspace name');
    let response = await this.axios.put(
      `/workspaces/${resourceId(workspaceId, 'Workspace ID')}`,
      { name }
    );
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<Workspace> {
    let response = await this.axios.delete(
      `/workspaces/${resourceId(workspaceId, 'Workspace ID')}`
    );
    return response.data;
  }

  // ---- Media Library ----

  async listMediaAssets(workspaceId: string, page?: number): Promise<MediaAssetListResponse> {
    let params: Record<string, string> = {};
    if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
      throw createApiServiceError('Page must be a whole number starting at 1.');
    }
    if (page !== undefined) {
      params.p = String(page);
    }
    let response = await this.axios.get(
      `/media/${resourceId(workspaceId, 'Workspace ID')}/assets`,
      { params }
    );
    return response.data;
  }

  async getMediaAsset(workspaceId: string, assetId: string): Promise<MediaAsset> {
    let response = await this.axios.get(
      `/media/${resourceId(workspaceId, 'Workspace ID')}/assets/${resourceId(assetId, 'Asset ID')}`
    );
    return response.data;
  }

  async deleteMediaAsset(workspaceId: string, assetId: string): Promise<MediaAsset> {
    let response = await this.axios.delete(
      `/media/${resourceId(workspaceId, 'Workspace ID')}/assets/${resourceId(assetId, 'Asset ID')}`
    );
    return response.data;
  }

  async uploadMediaAsset(
    workspaceId: string,
    fileUrl: string,
    filename: string
  ): Promise<MediaAsset> {
    requireText(filename, 'Filename');
    let source = await requestAxios(
      'download for media upload',
      () => createAxios().get<ArrayBuffer>(fileUrl, { responseType: 'arraybuffer' }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Image source',
          operation,
          reason: 'dynapictures_source_download_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    );
    let mimeType = getResponseHeaderValue(source.headers, 'content-type')
      ?.split(';')[0]
      ?.trim();
    if (!mimeType?.startsWith('image/')) {
      throw createApiServiceError(
        'The image URL must return an image with an image Content-Type.'
      );
    }
    let form = new FormData();
    form.append('file', new Blob([new Uint8Array(source.data)], { type: mimeType }), filename);
    let response = await this.axios.post(
      `/media/${resourceId(workspaceId, 'Workspace ID')}/assets`,
      form,
      {
        headers: { 'Content-Type': undefined }
      }
    );
    return response.data;
  }

  async startAiGeneration(request: AiGenerationRequest): Promise<AiGenerationJob> {
    let response = await this.axios.post('/ai/generate', request);
    return response.data;
  }

  async getAiGeneration(jobUid: string): Promise<AiGenerationJob> {
    let response = await this.axios.get(`/ai/generate/${resourceId(jobUid, 'Job ID')}`);
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
