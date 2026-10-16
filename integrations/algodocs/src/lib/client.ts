import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

const identifier = z.union([z.string(), z.number()]);
const extractorSchema = z.looseObject({ id: z.string(), name: z.string() });
const folderSchema = z.looseObject({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string()
});
const uploadSchema = z.looseObject({
  id: identifier,
  fileSize: z.number(),
  fileMD5CheckSum: z.string(),
  uploadedAt: z.string()
});
const recordSchema = z.looseObject({
  id: identifier,
  documentId: identifier,
  folderId: z.string(),
  uploadedAt: z.string(),
  fileName: z.string(),
  extractorId: z.string().optional(),
  pageNumber: z.number().optional()
});
const profileSchema = z.looseObject({
  fullName: z.string().optional(),
  email: z.string().optional(),
  FullName: z.string().optional(),
  EmailAddress: z.string().optional()
});

export type UploadResponse = z.infer<typeof uploadSchema>;
export type ExtractedRecord = z.infer<typeof recordSchema>;

export class Client {
  private axios;

  constructor(private credentials: { token: string; email?: string }) {
    if (!credentials.token.trim()) {
      throw createApiServiceError('An AlgoDocs API key is required. Reconnect your account.');
    }
    this.axios = createAxios({ baseURL: 'https://api.algodocs.com/v1' });
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

  private async request(
    path: string,
    form?: FormData,
    params?: Record<string, string | number>
  ) {
    try {
      let response = await this.axios.request<unknown>({
        method: form ? 'POST' : 'GET',
        url: path,
        data: form,
        params,
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'AlgoDocs',
        reason: 'algodocs_api_error',
        operation: form ? 'upload document' : 'retrieve data',
        extractResponse: (upstream, helpers) => helpers.getResponseWithBody(upstream),
        detailKeys: ['message', 'detail', 'error', 'error_description', 'Message'],
        nestedKeys: ['errors', 'error', 'message']
      });
    }
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown): T {
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        'AlgoDocs returned an unexpected response. Try again later.',
        {
          reason: 'algodocs_invalid_response'
        }
      );
    }
    return result.data;
  }

  async getMe() {
    let raw = this.parse(profileSchema, await this.request('/me'));
    // Keep profiles from older API responses usable as well as the current field names.
    let fullName = raw.fullName ?? raw.FullName;
    let email = raw.email ?? raw.EmailAddress;
    if (fullName === undefined || email === undefined) {
      throw createApiServiceError('AlgoDocs did not return the account name and email.', {
        reason: 'algodocs_invalid_profile'
      });
    }
    return { fullName, email, raw };
  }

  async getExtractors() {
    return this.parse(z.array(extractorSchema), await this.request('/extractors'));
  }

  async getFolders() {
    return this.parse(z.array(folderSchema), await this.request('/folders'));
  }

  private uploadPath(
    method: 'upload_url' | 'upload_base64',
    extractorId: string,
    folderId: string
  ) {
    if (!extractorId.trim() || !folderId.trim()) {
      throw createApiServiceError(
        'Provide extractorId and folderId from list_extractors and list_folders.'
      );
    }
    return `/document/${method}/${encodeURIComponent(extractorId)}/${encodeURIComponent(folderId)}`;
  }

  async uploadDocumentUrl(
    extractorId: string,
    folderId: string,
    url: string
  ): Promise<UploadResponse> {
    let form = new FormData();
    form.set('url', url);
    return this.parse(
      uploadSchema,
      await this.request(this.uploadPath('upload_url', extractorId, folderId), form)
    );
  }

  async uploadDocumentBase64(
    extractorId: string,
    folderId: string,
    fileBase64: string,
    filename: string
  ): Promise<UploadResponse> {
    let form = new FormData();
    form.set('file_base64', fileBase64);
    form.set('filename', filename);
    return this.parse(
      uploadSchema,
      await this.request(this.uploadPath('upload_base64', extractorId, folderId), form)
    );
  }

  async getExtractedDataByDocument(documentId: string): Promise<ExtractedRecord[]> {
    if (!documentId.trim()) throw createApiServiceError('Provide a non-empty documentId.');
    return this.parse(
      z.array(recordSchema),
      await this.request(`/extracted_data/${encodeURIComponent(documentId)}`)
    );
  }

  async getExtractedDataByExtractor(
    extractorId: string,
    options?: { folderId?: string; limit?: number; date?: string }
  ): Promise<ExtractedRecord[]> {
    if (!extractorId.trim())
      throw createApiServiceError('Provide an extractorId from list_extractors.');
    if (
      options?.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit <= 0)
    ) {
      throw createApiServiceError('limit must be a positive whole number.');
    }
    let params: Record<string, string | number> = {};
    if (options?.folderId !== undefined) params.folderId = options.folderId;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.date !== undefined) params.date = options.date;
    return this.parse(
      z.array(recordSchema),
      await this.request(
        `/extracted_data/${encodeURIComponent(extractorId)}`,
        undefined,
        params
      )
    );
  }
}
