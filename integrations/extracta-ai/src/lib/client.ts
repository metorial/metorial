import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';

let BASE_URL = 'https://api.extracta.ai/api/v1';

export interface ExtractionField {
  key: string;
  description: string;
  example?: string;
  type?: 'string' | 'object' | 'array';
  children?: ExtractionField[];
  properties?: Record<string, unknown>[];
  items?: Record<string, unknown>;
}

export interface ExtractionOptions {
  hasTable?: boolean;
  hasVisuals?: boolean;
  handwrittenTextRecognition?: boolean;
  checkboxRecognition?: boolean;
  longDocument?: boolean;
  splitPdfPages?: boolean;
  specificPageProcessing?: boolean;
  from?: number;
  to?: number;
}

export interface DocumentType {
  name: string;
  description: string;
  uniqueWords: string[];
  extractionId?: string;
}

export interface FileResult {
  fileId: string;
  fileName: string;
  status: string;
  result?: Record<string, unknown>;
  url?: string;
}

export interface ClassificationFileResult {
  fileId: string;
  fileName: string;
  status: string;
  result?: {
    confidence: number;
    documentType: string;
  };
  url?: string;
  extraction?: {
    extractionId: string;
    batchId: string;
    fileId: string;
  };
}

export class Client {
  private axios;

  private fileAxios = createAxios({ timeout: 60000 });

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'An Extracta.ai API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 60000,
      contentType: false,
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Extracta.ai',
          reason: 'extracta_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.status === 'error') {
        throw createApiServiceError(
          typeof response.data.message === 'string'
            ? `Extracta.ai: ${response.data.message}`
            : 'Extracta.ai rejected the request.'
        );
      }
      return response;
    });
  }

  private normalizeOptions(options?: ExtractionOptions) {
    if (!options) return undefined;
    let { from, to, ...rest } = options;
    for (let page of [from, to]) {
      if (page !== undefined && (!Number.isSafeInteger(page) || page < 1)) {
        throw createApiServiceError('Page numbers must be positive whole numbers.');
      }
    }
    if (from !== undefined && to !== undefined && from > to) {
      throw createApiServiceError('The start page must not exceed the end page.');
    }
    if (options.specificPageProcessing === true && (from === undefined || to === undefined)) {
      throw createApiServiceError(
        'Provide both from and to when specificPageProcessing is enabled.'
      );
    }
    return {
      ...rest,
      ...(from !== undefined || to !== undefined
        ? { specificPageProcessingOptions: pickDefined({ from, to }) }
        : {})
    };
  }

  private async upload(
    endpoint: string,
    ids: Record<string, string | undefined>,
    fileUrls: string[]
  ) {
    if (fileUrls.length === 0) {
      throw createApiServiceError('Provide at least one publicly accessible file URL.');
    }
    let urls = fileUrls.map(url => {
      try {
        let parsed = new URL(url);
        if (
          !['https:', 'http:'].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        ) {
          throw createApiServiceError(
            'File URLs must use HTTP or HTTPS without embedded credentials.'
          );
        }
        return parsed;
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Extracta.ai',
          reason: 'invalid_file_url',
          operation: 'validate file URL'
        });
      }
    });
    let formData = new FormData();
    for (let [key, value] of Object.entries(ids)) {
      if (value !== undefined) formData.append(key, value);
    }
    for (let url of urls) {
      let response = await requestAxios(
        'download source file',
        () => this.fileAxios.get<ArrayBuffer>(url.href, { responseType: 'arraybuffer' }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Source file',
            reason: 'source_file_download_failed',
            operation
          })
      );
      let fileName = url.pathname.split('/').pop() || 'file';
      let contentType = getResponseHeaderValue(response.headers, 'content-type');
      let blob = new Blob([response.data], {
        type: contentType ?? 'application/octet-stream'
      });
      formData.append('files', blob, fileName);
    }
    let response = await this.axios.post(endpoint, formData);
    return response.data;
  }

  // ─── Extraction Endpoints ─────────────────────────────────────────

  async createExtraction(params: {
    name: string;
    language: string;
    description?: string;
    fields: ExtractionField[];
    options?: ExtractionOptions;
  }) {
    let response = await this.axios.post('/createExtraction', {
      extractionDetails: {
        name: params.name,
        description: params.description,
        language: params.language,
        fields: params.fields,
        options: this.normalizeOptions(params.options)
      }
    });
    return response.data;
  }

  async viewExtraction(extractionId: string) {
    let response = await this.axios.post('/viewExtraction', {
      extractionId
    });
    return response.data;
  }

  async updateExtraction(params: {
    extractionId: string;
    name?: string;
    description?: string;
    language?: string;
    fields?: ExtractionField[];
    options?: ExtractionOptions;
  }) {
    let { extractionId, ...details } = params;
    let extractionDetails = pickDefined({
      ...details,
      options: this.normalizeOptions(details.options)
    });
    if (Object.keys(extractionDetails).length === 0) {
      throw createApiServiceError('Provide at least one extraction detail to update.');
    }

    let response = await this.axios.patch('/updateExtraction', {
      extractionId,
      extractionDetails
    });
    return response.data;
  }

  async deleteExtraction(params: { extractionId: string; batchId?: string; fileId?: string }) {
    if (params.fileId !== undefined && params.batchId === undefined) {
      throw createApiServiceError(
        'Provide batchId when deleting an individual extraction file.'
      );
    }
    let response = await this.axios.delete('/deleteExtraction', {
      data: params
    });
    return response.data;
  }

  // ─── File Upload & Results ────────────────────────────────────────

  async uploadFiles(params: { extractionId: string; batchId?: string; fileUrls: string[] }) {
    return this.upload(
      '/uploadFiles',
      { extractionId: params.extractionId, batchId: params.batchId },
      params.fileUrls
    );
  }

  async getBatchResults(params: { extractionId: string; batchId: string; fileId?: string }) {
    let response = await this.axios.post('/getBatchResults', params);
    return response.data;
  }

  // ─── Classification Endpoints ─────────────────────────────────────

  async createClassification(params: {
    name: string;
    description?: string;
    documentTypes: DocumentType[];
  }) {
    let response = await this.axios.post('/documentClassification/createClassification', {
      classificationDetails: {
        name: params.name,
        description: params.description,
        documentTypes: params.documentTypes
      }
    });
    return response.data;
  }

  async viewClassification(classificationId: string) {
    let response = await this.axios.post('/documentClassification/viewClassification', {
      classificationId
    });
    return response.data;
  }

  async updateClassification(params: {
    classificationId: string;
    name?: string;
    description?: string;
    documentTypes?: DocumentType[];
  }) {
    let { classificationId, ...details } = params;
    let classificationDetails = pickDefined(details);
    if (Object.keys(classificationDetails).length === 0) {
      throw createApiServiceError('Provide at least one classification detail to update.');
    }

    let response = await this.axios.patch('/documentClassification/updateClassification', {
      classificationId,
      classificationDetails
    });
    return response.data;
  }

  async deleteClassification(classificationId: string) {
    let response = await this.axios.delete('/documentClassification/deleteClassification', {
      data: { classificationId }
    });
    return response.data;
  }

  async uploadClassificationFiles(params: {
    classificationId: string;
    batchId?: string;
    fileUrls: string[];
  }) {
    return this.upload(
      '/documentClassification/uploadFiles',
      { classificationId: params.classificationId, batchId: params.batchId },
      params.fileUrls
    );
  }

  async deleteClassificationBatch(params: { classificationId: string; batchId: string }) {
    let response = await this.axios.delete('/documentClassification/deleteBatch', {
      data: params
    });
    return response.data;
  }

  async deleteClassificationFiles(params: {
    classificationId: string;
    batchId: string;
    fileIds: string[];
  }) {
    if (params.fileIds.length === 0) {
      throw createApiServiceError('Provide at least one file ID to delete.');
    }
    let response = await this.axios.delete('/documentClassification/deleteFiles', {
      data: params
    });
    return response.data;
  }

  async getClassificationResults(params: {
    classificationId: string;
    batchId: string;
    fileId?: string;
  }) {
    let response = await this.axios.post('/documentClassification/getResults', params);
    return response.data;
  }

  // ─── Credits ──────────────────────────────────────────────────────

  async getCredits() {
    let response = await this.axios.post('/credits', {});
    return response.data;
  }
}
