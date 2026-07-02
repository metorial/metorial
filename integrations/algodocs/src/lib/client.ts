import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private credentials: { token: string; email?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.algodocs.com/v1'
    });
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.credentials.email) {
      let encoded = Buffer.from(
        `${this.credentials.email}:${this.credentials.token}`
      ).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    return { 'x-api-key': this.credentials.token };
  }

  async getMe(): Promise<{ FullName: string; EmailAddress: string }> {
    let response = await this.axios.get('/me', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getExtractors(): Promise<Array<{ id: string; name: string }>> {
    let response = await this.axios.get('/extractors', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getFolders(): Promise<Array<{ id: string; parentId: string | null; name: string }>> {
    let response = await this.axios.get('/folders', {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async uploadDocumentUrl(
    extractorId: string,
    folderId: string,
    url: string
  ): Promise<UploadResponse> {
    let response = await this.axios.post(
      `/document/upload_url/${extractorId}/${folderId}`,
      { url },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async uploadDocumentBase64(
    extractorId: string,
    folderId: string,
    fileBase64: string,
    filename: string
  ): Promise<UploadResponse> {
    let response = await this.axios.post(
      `/document/upload_base64/${extractorId}/${folderId}`,
      { file_base64: fileBase64, filename },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getExtractedDataByDocument(documentId: string): Promise<ExtractedRecord[]> {
    let response = await this.axios.get(`/extracted_data/${documentId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getExtractedDataByExtractor(
    extractorId: string,
    options?: { folderId?: string; limit?: number; date?: string }
  ): Promise<ExtractedRecord[]> {
    let params: Record<string, string | number> = {};
    if (options?.folderId) params.folder_id = options.folderId;
    if (options?.limit) params.limit = options.limit;
    if (options?.date) params.date = options.date;

    let response = await this.axios.get(`/extracted_data/${extractorId}`, {
      headers: this.getAuthHeaders(),
      params
    });
    return response.data;
  }
}

export interface UploadResponse {
  id: string;
  fileSize: number;
  fileMD5CheckSum: string;
  uploadedAt: string;
}

export interface ExtractedRecord {
  id: string;
  documentId: string;
  extractorId: string;
  folderId: string;
  uploadedAt: string;
  fileName: string;
  pageNumber: number;
  [key: string]: unknown;
}
