import { createAxios } from 'slates';

export interface DocnifyDocument {
  id: string;
  name: string;
  status: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  recipients?: DocnifyRecipient[];
  [key: string]: unknown;
}

export interface DocnifyRecipient {
  recipientId: string;
  email: string;
  name: string;
  signedAt?: string;
  [key: string]: unknown;
}

export interface ListDocumentsParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateDocumentFromTemplateParams {
  templateId: string;
  name?: string;
  [key: string]: unknown;
}

export interface AddRecipientParams {
  email: string;
  name: string;
  [key: string]: unknown;
}

export class Client {
  private instanceUrl: string;
  private token: string;

  constructor(config: { token: string; instanceUrl: string }) {
    this.token = config.token;
    this.instanceUrl = config.instanceUrl.replace(/\/+$/, '');
  }

  private getAxios() {
    return createAxios({
      baseURL: `${this.instanceUrl}/api/v1`,
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listDocuments(params?: ListDocumentsParams): Promise<DocnifyDocument[]> {
    let http = this.getAxios();
    let response = await http.get('/documents', { params });
    return response.data;
  }

  async getDocument(documentId: string): Promise<DocnifyDocument> {
    let http = this.getAxios();
    let response = await http.get(`/documents/${documentId}`);
    return response.data;
  }

  async createDocumentFromTemplate(
    params: CreateDocumentFromTemplateParams
  ): Promise<DocnifyDocument> {
    let http = this.getAxios();
    let response = await http.post('/documents', params);
    return response.data;
  }

  async addRecipient(
    documentId: string,
    recipient: AddRecipientParams
  ): Promise<DocnifyRecipient> {
    let http = this.getAxios();
    let response = await http.post(`/documents/${documentId}/recipients`, recipient);
    return response.data;
  }

  async sendDocument(documentId: string): Promise<DocnifyDocument> {
    let http = this.getAxios();
    let response = await http.post(`/documents/${documentId}/send`);
    return response.data;
  }

  async listDocumentsSince(
    updatedSince: string | null,
    limit: number = 100
  ): Promise<DocnifyDocument[]> {
    let http = this.getAxios();
    let params: Record<string, string | number> = {
      limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };
    if (updatedSince) {
      params.updatedSince = updatedSince;
    }
    let response = await http.get('/documents', { params });
    return response.data;
  }
}
