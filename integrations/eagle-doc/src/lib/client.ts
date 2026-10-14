import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class EagleDocClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An Eagle Doc API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      contentType: false,
      timeout: 300000,
      authHeader: { name: 'api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Eagle Doc',
          reason: 'eagle_doc_api_error',
          detailKeys: ['message', 'messageCode', 'messageDetails'],
          nestedKeys: ['messageDetails']
        })
    });
  }

  // ─── Invoice OCR ────────────────────────────────────────────────

  async processInvoice(params: {
    fileBase64: string;
    fileName: string;
    privacy?: boolean;
    polygon?: boolean;
    fullText?: boolean;
    signature?: boolean;
  }) {
    let queryParams = this.buildFinanceQueryParams(params);
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/invoice/v1/processing', formData, {
      params: queryParams
    });
    return response.data;
  }

  // ─── Receipt OCR ────────────────────────────────────────────────

  async processReceipt(params: {
    fileBase64: string;
    fileName: string;
    privacy?: boolean;
    polygon?: boolean;
    fullText?: boolean;
    speed?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.privacy !== undefined) queryParams.privacy = String(params.privacy);
    if (params.polygon !== undefined) queryParams.polygon = String(params.polygon);
    if (params.fullText !== undefined) queryParams.fullText = String(params.fullText);
    if (params.speed !== undefined) queryParams.speed = String(params.speed);

    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/receipt/v3/processing', formData, {
      params: queryParams
    });
    return response.data;
  }

  // ─── Finance OCR (Unified Receipt/Invoice) ─────────────────────

  async processFinance(params: {
    fileBase64: string;
    fileName: string;
    privacy?: boolean;
    polygon?: boolean;
    fullText?: boolean;
    signature?: boolean;
  }) {
    let queryParams = this.buildFinanceQueryParams(params);
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/finance/v1/processing', formData, {
      params: queryParams
    });
    return response.data;
  }

  // ─── Any Document OCR ──────────────────────────────────────────

  async processAnyDocument(params: {
    fileBase64: string;
    fileName: string;
    privacy?: boolean;
    docType?: string;
    configId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.privacy !== undefined) queryParams.privacy = String(params.privacy);
    if (params.docType) queryParams.docType = params.docType;
    if (params.configId) queryParams.configId = params.configId;

    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/anydoc/v1/processing', formData, {
      params: queryParams
    });
    return response.data;
  }

  async classifyDocument(params: { fileBase64: string; fileName: string; privacy?: boolean }) {
    let formData = this.buildFormData(params.fileBase64, params.fileName);
    let response = await this.axios.post('/api/anydoc/v1/classify', formData, {
      params: { privacy: params.privacy }
    });
    return response.data;
  }

  // ─── Document Splitting ────────────────────────────────────────

  async splitDocument(params: { fileBase64: string; fileName: string }) {
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/doc/v1/split', formData);
    return response.data;
  }

  // ─── Signature Extraction ─────────────────────────────────────

  async extractSignatures(params: { fileBase64: string; fileName: string }) {
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/signature/v1/extract', formData);
    return response.data;
  }

  // ─── Batch Processing ─────────────────────────────────────────

  async submitFinanceBatch(params: {
    filesBase64: Array<{ base64: string; fileName: string }>;
    privacy?: boolean;
    docType?: string;
    polygon?: boolean;
    fullText?: boolean;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.privacy !== undefined) queryParams.privacy = String(params.privacy);
    if (params.docType) queryParams.docType = params.docType;
    if (params.polygon !== undefined) queryParams.polygon = String(params.polygon);
    if (params.fullText !== undefined) queryParams.fullText = String(params.fullText);

    let formData = this.buildMultiFileFormData(params.filesBase64);

    let response = await this.axios.post('/api/finance/extract/batch/task/v1', formData, {
      params: queryParams
    });
    return response.data;
  }

  async submitAnyDocBatch(params: {
    filesBase64: Array<{ base64: string; fileName: string }>;
    privacy?: boolean;
    docType?: string;
    configId?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params.privacy !== undefined) queryParams.privacy = String(params.privacy);
    if (params.docType) queryParams.docType = params.docType;
    if (params.configId) queryParams.configId = params.configId;

    let formData = this.buildMultiFileFormData(params.filesBase64);

    let response = await this.axios.post('/api/anydoc/extract/batch/task/v1', formData, {
      params: queryParams
    });
    return response.data;
  }

  async getBatchTaskStatus(taskId: string) {
    let response = await this.axios.get('/api/doc/task/v1', {
      params: { taskId }
    });
    return response.data;
  }

  async deleteBatchTask(taskId: string) {
    let response = await this.axios.delete('/api/doc/task/v1', {
      params: { taskId }
    });
    return response.data;
  }

  // ─── Human Feedback ───────────────────────────────────────────

  async submitFeedback(params: {
    fileBase64: string;
    fileName: string;
    originalJson: string;
    correctedJson: string;
  }) {
    this.validateJson(params.originalJson, 'originalJson');
    this.validateJson(params.correctedJson, 'correctedJson');
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let originalBlob = new Blob([params.originalJson], { type: 'application/json' });
    formData.append('original', originalBlob, 'original.json');

    let correctedBlob = new Blob([params.correctedJson], { type: 'application/json' });
    formData.append('corrected', correctedBlob, 'corrected.json');

    let response = await this.axios.post('/api/docu/learning', formData);
    return response.data;
  }

  async submitFeedbackWithInstructions(params: {
    correctedJson: string;
    instructions: string;
    overwrite?: boolean;
  }) {
    this.validateJson(params.correctedJson, 'correctedJson');
    let formData = new FormData();

    let correctedBlob = new Blob([params.correctedJson], { type: 'application/json' });
    formData.append('corrected', correctedBlob, 'corrected.json');

    let queryParams: Record<string, string> = {
      instructions: params.instructions
    };
    if (params.overwrite !== undefined) queryParams.overwrite = String(params.overwrite);

    let response = await this.axios.post('/api/docu/learning/instructions', formData, {
      params: queryParams
    });
    return response.data;
  }

  // ─── Usage Monitoring ─────────────────────────────────────────

  async getCurrentUsage() {
    let response = await this.axios.get('/api/usage/v1/current');
    return response.data;
  }

  async getMonthlyUsage() {
    let response = await this.axios.get('/api/usage/v1/monthly');
    return response.data;
  }

  async getRequestLogs() {
    let response = await this.axios.get('/api/usage/v1/logs');
    return response.data;
  }

  async getManagementQuota() {
    let response = await this.axios.get('/api/management/v1/quota');
    return response.data;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private buildFinanceQueryParams(params: {
    privacy?: boolean;
    polygon?: boolean;
    fullText?: boolean;
    signature?: boolean;
  }): Record<string, string> {
    let queryParams: Record<string, string> = {};
    if (params.privacy !== undefined) queryParams.privacy = String(params.privacy);
    if (params.polygon !== undefined) queryParams.polygon = String(params.polygon);
    if (params.fullText !== undefined) queryParams.fullText = String(params.fullText);
    if (params.signature !== undefined) queryParams.signature = String(params.signature);
    return queryParams;
  }

  private validateJson(value: string, field: string): void {
    try {
      JSON.parse(value);
    } catch {
      throw createApiServiceError(`${field} must contain valid JSON.`);
    }
  }

  private buildFormData(fileBase64: string, fileName: string): FormData {
    if (!fileName.trim() || !fileBase64.trim()) {
      throw createApiServiceError(
        'Provide a nonempty document file and its original file name.'
      );
    }
    let formData = new FormData();
    formData.append('file', this.documentBlob(fileBase64, fileName), fileName);
    return formData;
  }

  private buildMultiFileFormData(
    files: Array<{ base64: string; fileName: string }>
  ): FormData {
    let formData = new FormData();
    for (let file of files) {
      formData.append('file', this.documentBlob(file.base64, file.fileName), file.fileName);
    }
    return formData;
  }

  private documentBlob(fileBase64: string, fileName: string): Blob {
    if (!fileName.trim() || !fileBase64.trim()) {
      throw createApiServiceError(
        'Provide a nonempty document file and its original file name.'
      );
    }
    let bytes = Buffer.from(fileBase64, 'base64');
    if (!bytes.length) {
      throw createApiServiceError('The document file must contain base64-encoded content.');
    }
    return new Blob([bytes], { type: this.getMimeType(fileName) });
  }

  private getMimeType(fileName: string): string {
    let ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'tif':
      case 'tiff':
        return 'image/tiff';
      default:
        return 'application/octet-stream';
    }
  }
}
