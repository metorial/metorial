import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://developers.typless.com/api/'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Token ${config.token}`
    };
  }

  async extractData(params: {
    documentTypeName: string;
    file: string;
    fileName: string;
  }): Promise<{
    objectId: string;
    extractedFields: Array<{
      name: string;
      dataType: string;
      values: Array<{
        confidenceScore: number;
        value: string;
        pageNumber: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    }>;
    lineItems: any[];
    fileName: string;
  }> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = '';

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document_type_name"\r\n\r\n`;
    body += `${params.documentTypeName}\r\n`;

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${params.fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${params.file}\r\n`;

    body += `--${boundary}--\r\n`;

    let response = await axios.post('/document-types/extract-data/', body, {
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    let data = response.data;

    return {
      objectId: data.object_id,
      extractedFields: (data.extracted_fields || []).map((field: any) => ({
        name: field.name,
        dataType: field.data_type || '',
        values: (field.values || []).map((v: any) => ({
          confidenceScore: v.confidence_score,
          value: v.value,
          pageNumber: v.page_number,
          x: v.x,
          y: v.y,
          width: v.width,
          height: v.height
        }))
      })),
      lineItems: data.line_items || [],
      fileName: data.file_name || params.fileName
    };
  }

  async addDocumentFeedback(params: {
    documentTypeName: string;
    documentObjectId: string;
    learningFields: Array<{ name: string; value: string }>;
  }): Promise<void> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = '';

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document_type_name"\r\n\r\n`;
    body += `${params.documentTypeName}\r\n`;

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document_object_id"\r\n\r\n`;
    body += `${params.documentObjectId}\r\n`;

    for (let field of params.learningFields) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="learning_fields"\r\n\r\n`;
      body += `${JSON.stringify({ name: field.name, value: field.value })}\r\n`;
    }

    body += `--${boundary}--\r\n`;

    await axios.post('/document-types/learn/', body, {
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
  }

  async startTraining(params: { documentTypeName: string }): Promise<void> {
    await axios.post('/start-training/', null, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      params: {
        document_type_name: params.documentTypeName
      }
    });
  }

  async getDocumentTypes(): Promise<
    Array<{
      slug: string;
      name: string;
      fieldsCount: number;
      lineItemFieldsCount: number;
      documentsCount: number;
      modelsCount: number;
    }>
  > {
    let response = await axios.get('/document-types/', {
      headers: this.headers
    });

    let data = response.data;
    let types = Array.isArray(data) ? data : data.results || data.document_types || [];

    return types.map((dt: any) => ({
      slug: dt.slug || dt.document_type_name || '',
      name: dt.name || dt.document_type_name || '',
      fieldsCount: dt.fields_count ?? dt.metadata_fields_count ?? 0,
      lineItemFieldsCount: dt.line_item_fields_count ?? 0,
      documentsCount: dt.documents_count ?? 0,
      modelsCount: dt.models_count ?? 0
    }));
  }

  async getUserProfile(): Promise<{
    email: string;
    firstName: string;
    lastName: string;
  }> {
    let response = await axios.get('/user-profile/', {
      headers: this.headers
    });

    let data = response.data;

    return {
      email: data.email || '',
      firstName: data.first_name || '',
      lastName: data.last_name || ''
    };
  }

  async updateUserProfile(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{
    email: string;
    firstName: string;
    lastName: string;
  }> {
    let payload: Record<string, string> = {};
    if (params.firstName !== undefined) payload.first_name = params.firstName;
    if (params.lastName !== undefined) payload.last_name = params.lastName;
    if (params.email !== undefined) payload.email = params.email;

    let response = await axios.patch('/user-profile/', payload, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;

    return {
      email: data.email || '',
      firstName: data.first_name || '',
      lastName: data.last_name || ''
    };
  }

  async extractDataAsync(params: {
    documentTypeName: string;
    file: string;
    fileName: string;
  }): Promise<{
    extractionId: string;
  }> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = '';

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document_type_name"\r\n\r\n`;
    body += `${params.documentTypeName}\r\n`;

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${params.fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${params.file}\r\n`;

    body += `--${boundary}--\r\n`;

    let response = await axios.post('/document-types/extract-data-async/', body, {
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    return {
      extractionId: response.data.extraction_id
    };
  }

  async getExtractionResult(params: { extractionId: string }): Promise<{
    status: string;
    error: any;
    result: {
      objectId: string;
      extractedFields: Array<{
        name: string;
        dataType: string;
        values: Array<{
          confidenceScore: number;
          value: string;
          pageNumber: number;
          x: number;
          y: number;
          width: number;
          height: number;
        }>;
      }>;
      lineItems: any[];
      fileName: string;
    } | null;
  }> {
    let response = await axios.get(`/receive-result/${params.extractionId}/`, {
      headers: this.headers
    });

    let data = response.data;

    let result: any = null;
    if (data.result && Object.keys(data.result).length > 0) {
      result = {
        objectId: data.result.object_id || '',
        extractedFields: (data.result.extracted_fields || []).map((field: any) => ({
          name: field.name,
          dataType: field.data_type || '',
          values: (field.values || []).map((v: any) => ({
            confidenceScore: v.confidence_score,
            value: v.value,
            pageNumber: v.page_number,
            x: v.x,
            y: v.y,
            width: v.width,
            height: v.height
          }))
        })),
        lineItems: data.result.line_items || [],
        fileName: data.result.file_name || ''
      };
    }

    return {
      status: data.status || '',
      error: data.error || null,
      result
    };
  }
}
