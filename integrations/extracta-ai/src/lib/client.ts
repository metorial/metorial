import { createAxios } from 'slates';

let BASE_URL = 'https://api.extracta.ai/api/v1';

export interface ExtractionField {
  key: string;
  description: string;
  example?: string;
  type?: 'string' | 'object' | 'array';
  children?: ExtractionField[];
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

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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
        options: params.options
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
    let extractionDetails: Record<string, unknown> = {};

    if (details.name !== undefined) extractionDetails.name = details.name;
    if (details.description !== undefined) extractionDetails.description = details.description;
    if (details.language !== undefined) extractionDetails.language = details.language;
    if (details.fields !== undefined) extractionDetails.fields = details.fields;
    if (details.options !== undefined) extractionDetails.options = details.options;

    let response = await this.axios.patch('/updateExtraction', {
      extractionId,
      extractionDetails
    });
    return response.data;
  }

  async deleteExtraction(params: { extractionId: string; batchId?: string; fileId?: string }) {
    let response = await this.axios.delete('/deleteExtraction', {
      data: params
    });
    return response.data;
  }

  // ─── File Upload & Results ────────────────────────────────────────

  async uploadFiles(params: { extractionId: string; batchId?: string; fileUrls: string[] }) {
    let formData = new FormData();
    formData.append('extractionId', params.extractionId);
    if (params.batchId) {
      formData.append('batchId', params.batchId);
    }

    for (let url of params.fileUrls) {
      let fileResponse = await this.axios.get(url, { responseType: 'arraybuffer' });
      let fileName = url.split('/').pop() || 'file';
      let blob = new Blob([fileResponse.data]);
      formData.append('files', blob, fileName);
    }

    let response = await this.axios.post('/uploadFiles', formData, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    return response.data;
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
    let classificationDetails: Record<string, unknown> = {};

    if (details.name !== undefined) classificationDetails.name = details.name;
    if (details.description !== undefined)
      classificationDetails.description = details.description;
    if (details.documentTypes !== undefined)
      classificationDetails.documentTypes = details.documentTypes;

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
    let formData = new FormData();
    formData.append('classificationId', params.classificationId);
    if (params.batchId) {
      formData.append('batchId', params.batchId);
    }

    for (let url of params.fileUrls) {
      let fileResponse = await this.axios.get(url, { responseType: 'arraybuffer' });
      let fileName = url.split('/').pop() || 'file';
      let blob = new Blob([fileResponse.data]);
      formData.append('files', blob, fileName);
    }

    let response = await this.axios.post('/documentClassification/uploadFiles', formData, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
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
    let response = await this.axios.get('/credits');
    return response.data;
  }
}
