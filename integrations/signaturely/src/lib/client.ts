import { createAxios } from 'slates';

let BASE_URL = 'https://api.signaturely.com';
let VERSION_PATH = '/api/v1';

export type DocumentStatus = 'draft' | 'awaiting' | 'completed';

export type SearchType = 'documents' | 'signers';

export type OrderingDirection = 'ASC' | 'DESC';

export interface Signer {
  name: string;
  email: string;
  role: string;
  order?: number;
  fields?: Record<string, string>;
}

export interface CreateSignatureRequestParams {
  templateId: string;
  signers: Signer[];
  title?: string;
  message?: string;
  isOrdered?: boolean;
  testMode?: boolean;
}

export interface ListDocumentsParams {
  orderingKey?: string;
  orderingDirection?: OrderingDirection;
  searchType?: SearchType;
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL
    });
  }

  private getHeaders() {
    return {
      Authorization: `Api-Key ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getUser() {
    let axios = this.getAxios();
    let response = await axios.get(`${VERSION_PATH}/user/by-api`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async listDocuments(params: ListDocumentsParams = {}) {
    let axios = this.getAxios();
    let response = await axios.get(`${VERSION_PATH}/documents`, {
      headers: this.getHeaders(),
      params: {
        orderingKey: params.orderingKey || 'createdAt',
        orderingDirection: params.orderingDirection || 'DESC',
        searchType: params.searchType || 'documents',
        ...(params.status ? { status: params.status } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
        ...(params.offset ? { offset: params.offset } : {})
      }
    });
    return response.data;
  }

  async listTemplates() {
    let axios = this.getAxios();
    let response = await axios.get(`${VERSION_PATH}/documents/api/templates`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getDocumentSigners(documentId: string) {
    let axios = this.getAxios();
    let response = await axios.get(`${VERSION_PATH}/documents/${documentId}/signers`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createSignatureRequest(params: CreateSignatureRequestParams) {
    let axios = this.getAxios();
    let response = await axios.post(
      '/document_sign/api/request_by_template',
      {
        templateId: params.templateId,
        signers: params.signers,
        ...(params.title ? { title: params.title } : {}),
        ...(params.message ? { message: params.message } : {}),
        ...(params.isOrdered !== undefined ? { isOrdered: params.isOrdered } : {}),
        ...(params.testMode !== undefined ? { testMode: params.testMode } : {})
      },
      {
        headers: this.getHeaders()
      }
    );
    return response.data;
  }
}
