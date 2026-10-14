import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export let normalizeCredentials = (config: { token: string; instanceUrl: string }) => {
  let token = config.token.trim();
  if (!token || /[\r\n]/.test(token)) {
    throw createApiServiceError('Provide a non-empty Docnify API token without line breaks.');
  }

  let instanceUrl = config.instanceUrl.trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(instanceUrl);
  } catch {
    throw createApiServiceError('Provide a valid HTTP or HTTPS Docnify instance URL.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Provide a Docnify instance URL without credentials, query parameters, or a fragment.'
    );
  }
  return { token, instanceUrl: url.toString().replace(/\/+$/, '') };
};

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
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; instanceUrl: string }) {
    let credentials = normalizeCredentials(config);
    this.http = createAuthenticatedAxios({
      baseURL: `${credentials.instanceUrl}/api/v1`,
      authHeader: { value: credentials.token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Docnify',
          reason: 'docnify_api_error'
        })
    });
  }

  async listDocuments(params?: ListDocumentsParams): Promise<DocnifyDocument[]> {
    let response = await this.http.get('/documents', { params });
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Docnify returned an unexpected document list response.');
    }
    return response.data;
  }

  async getDocument(documentId: string): Promise<DocnifyDocument> {
    if (!documentId.trim()) {
      throw createApiServiceError('Provide the ID of the Docnify document to retrieve.');
    }
    let response = await this.http.get(`/documents/${encodeURIComponent(documentId)}`);
    return response.data;
  }

  async createDocumentFromTemplate(
    params: CreateDocumentFromTemplateParams
  ): Promise<DocnifyDocument> {
    if (!params.templateId.trim()) {
      throw createApiServiceError('Provide the Docnify template ID to create a document.');
    }
    let response = await this.http.post('/documents', pickDefined(params));
    return response.data;
  }

  async addRecipient(
    documentId: string,
    recipient: AddRecipientParams
  ): Promise<DocnifyRecipient> {
    if (!documentId.trim() || !recipient.email.trim() || !recipient.name.trim()) {
      throw createApiServiceError(
        'Provide a Docnify document ID and a non-empty recipient email and name.'
      );
    }
    let response = await this.http.post(
      `/documents/${encodeURIComponent(documentId)}/recipients`,
      pickDefined(recipient)
    );
    return response.data;
  }

  async sendDocument(documentId: string): Promise<DocnifyDocument> {
    if (!documentId.trim()) {
      throw createApiServiceError('Provide the ID of the Docnify document to send.');
    }
    let response = await this.http.post(`/documents/${encodeURIComponent(documentId)}/send`);
    return response.data;
  }

  async listDocumentsSince(
    updatedSince: string | null,
    limit: number = 100
  ): Promise<DocnifyDocument[]> {
    let params: ListDocumentsParams & { updatedSince?: string } = {
      limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };
    if (updatedSince) {
      params.updatedSince = updatedSince;
    }
    return this.listDocuments(params);
  }
}
