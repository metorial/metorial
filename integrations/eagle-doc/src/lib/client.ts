import { createAxios } from 'slates';

export class EagleDocClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'api-key': config.token
      }
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // ─── Document Splitting ────────────────────────────────────────

  async splitDocument(params: { fileBase64: string; fileName: string }) {
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/doc/v1/split', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // ─── Signature Extraction ─────────────────────────────────────

  async extractSignatures(params: { fileBase64: string; fileName: string }) {
    let formData = this.buildFormData(params.fileBase64, params.fileName);

    let response = await this.axios.post('/api/signature/v1/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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
    let formData = new FormData();

    let fileBuffer = Buffer.from(params.fileBase64, 'base64');
    let fileBlob = new Blob([fileBuffer], { type: this.getMimeType(params.fileName) });
    formData.append('file', fileBlob, params.fileName);

    let originalBlob = new Blob([params.originalJson], { type: 'application/json' });
    formData.append('original', originalBlob, 'original.json');

    let correctedBlob = new Blob([params.correctedJson], { type: 'application/json' });
    formData.append('corrected', correctedBlob, 'corrected.json');

    let response = await this.axios.post('/api/docu/learning', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async submitFeedbackWithInstructions(params: {
    correctedJson: string;
    instructions: string;
    overwrite?: boolean;
  }) {
    let formData = new FormData();

    let correctedBlob = new Blob([params.correctedJson], { type: 'application/json' });
    formData.append('corrected', correctedBlob, 'corrected.json');

    let queryParams: Record<string, string> = {
      instructions: params.instructions
    };
    if (params.overwrite !== undefined) queryParams.overwrite = String(params.overwrite);

    let response = await this.axios.post('/api/docu/learning/instructions', formData, {
      params: queryParams,
      headers: { 'Content-Type': 'multipart/form-data' }
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

  private buildFormData(fileBase64: string, fileName: string): FormData {
    let formData = new FormData();
    let fileBuffer = Buffer.from(fileBase64, 'base64');
    let fileBlob = new Blob([fileBuffer], { type: this.getMimeType(fileName) });
    formData.append('file', fileBlob, fileName);
    return formData;
  }

  private buildMultiFileFormData(
    files: Array<{ base64: string; fileName: string }>
  ): FormData {
    let formData = new FormData();
    for (let file of files) {
      let fileBuffer = Buffer.from(file.base64, 'base64');
      let fileBlob = new Blob([fileBuffer], { type: this.getMimeType(file.fileName) });
      formData.append('file', fileBlob, file.fileName);
    }
    return formData;
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
