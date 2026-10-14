import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import type {
  DocupilotContentBlock,
  DocupilotDocumentMergeLink,
  DocupilotEnvelope,
  DocupilotEnvelopeDetail,
  DocupilotFolder,
  DocupilotGenerateResponse,
  DocupilotMergeHistory,
  DocupilotPaginatedList,
  DocupilotTemplate,
  DocupilotTemplateDelivery,
  DocupilotTemplateSchema,
  DocupilotUser
} from './types';

let fileMetadataSchema = z.object({
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional()
});
let generateResponseSchema = fileMetadataSchema.extend({
  status: z.string().optional(),
  data: fileMetadataSchema.nullable().optional()
});
let userSchema = z.object({
  id: z.union([z.string(), z.number()]).nullable().optional(),
  email: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional()
});

let docupilotApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Docupilot',
    reason: 'docupilot_api_error',
    operation,
    extractStatus: (error, response, helpers) => {
      let data =
        helpers.isRecord(error) && helpers.isRecord(error.data) ? error.data : undefined;
      let status = response?.status ?? data?.upstreamStatus;
      return typeof status === 'number' || typeof status === 'string' ? status : undefined;
    }
  });

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(credentials: { token: string; workspaceId: string }) {
    if (!credentials.token || !credentials.workspaceId) {
      throw createApiServiceError(
        'Reconnect Docupilot with an API key, secret, and workspace ID.'
      );
    }
    this.token = credentials.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.docupilot.app',
      timeout: 60000,
      authHeader: { value: `Bearer ${credentials.token}` },
      headers: { 'X-Workspace': credentials.workspaceId },
      errorAdapter: error => docupilotApiError(error)
    });
  }

  // ──────────────────────────────
  // Templates
  // ──────────────────────────────

  async listTemplates(params?: {
    folder?: number;
    search?: string;
    status?: string;
    type?: string;
    outputType?: string;
    page?: number;
    ordering?: string;
  }): Promise<DocupilotPaginatedList<DocupilotTemplate>> {
    let response = await this.axios.get('/dashboard/api/v2/templates/', {
      params: {
        folder: params?.folder,
        search: params?.search,
        status: params?.status,
        type: params?.type,
        output_type: params?.outputType,
        page: params?.page,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async listAllTemplates(params?: {
    folder?: number;
    status?: string;
    type?: string;
    outputType?: string;
  }): Promise<DocupilotTemplate[]> {
    let response = await this.axios.get('/dashboard/api/v2/templates/all/', {
      params: {
        folder: params?.folder,
        status: params?.status,
        type: params?.type,
        output_type: params?.outputType
      }
    });
    return response.data;
  }

  async getTemplate(templateId: number): Promise<DocupilotTemplate> {
    let response = await this.axios.get(`/dashboard/api/v2/templates/${templateId}/`);
    return response.data;
  }

  async createTemplate(data: {
    title: string;
    outputType: string;
    description?: string | null;
    folder?: number | null;
  }): Promise<DocupilotTemplate> {
    let response = await this.axios.post('/dashboard/api/v2/templates/', {
      title: data.title,
      output_type: data.outputType,
      description: data.description,
      folder: data.folder
    });
    return response.data;
  }

  async updateTemplate(
    templateId: number,
    data: {
      title?: string;
      description?: string | null;
      documentStatus?: string;
      preferences?: Record<string, unknown>;
      folder?: number | null;
    }
  ): Promise<DocupilotTemplate> {
    let payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.documentStatus !== undefined) payload.document_status = data.documentStatus;
    if (data.preferences !== undefined) payload.preferences = data.preferences;
    if (data.folder !== undefined) payload.folder = data.folder;

    let response = await this.axios.patch(
      `/dashboard/api/v2/templates/${templateId}/`,
      payload
    );
    return response.data;
  }

  async deleteTemplate(templateId: number): Promise<void> {
    await this.axios.delete(`/dashboard/api/v2/templates/${templateId}/`);
  }

  async getTemplateSchema(templateId: number): Promise<DocupilotTemplateSchema[]> {
    let response = await this.axios.get(`/dashboard/api/v2/templates/${templateId}/schema/`);
    return response.data;
  }

  async copyTemplate(
    templateId: number,
    data?: {
      title?: string;
      folder?: number;
    }
  ): Promise<DocupilotTemplate> {
    let response = await this.axios.post(
      `/dashboard/api/v2/templates/${templateId}/copy/`,
      data ?? {}
    );
    return response.data;
  }

  async moveTemplates(templateIds: number[], folderId: number | null): Promise<unknown> {
    let response = await this.axios.post('/dashboard/api/v2/templates/move/', {
      templates: templateIds,
      folder: folderId
    });
    return response.data;
  }

  async restoreTemplate(templateId: number): Promise<unknown> {
    let response = await this.axios.put(`/dashboard/api/v2/templates/${templateId}/restore/`);
    return response.data;
  }

  // ──────────────────────────────
  // Document Generation
  // ──────────────────────────────

  async generateDocument(
    templateId: number,
    mergeData: Record<string, unknown>,
    options?: {
      download?: 'false' | 'file' | 'true';
      includeUrl?: boolean;
      outputType?: string;
    }
  ): Promise<DocupilotGenerateResponse> {
    let response = await this.axios.post<DocupilotGenerateResponse>(
      `/dashboard/api/v2/templates/${templateId}/generate/`,
      mergeData,
      {
        params: {
          download: options?.download,
          include_url: options?.includeUrl,
          output_type: options?.outputType
        }
      }
    );
    let result = generateResponseSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'Docupilot returned an invalid document generation response.'
      );
    }
    if (result.data.status !== undefined && result.data.status !== 'success') {
      throw createApiServiceError(
        'Docupilot did not successfully generate the document. Check the template and merge data.'
      );
    }
    // Document generation can return a success envelope around the file metadata.
    return result.data.data === undefined ? result.data : (result.data.data ?? {});
  }

  async downloadGeneratedDocument(url: string) {
    if (!URL.canParse(url) || new URL(url).protocol !== 'https:') {
      throw createApiServiceError('Docupilot returned an invalid document download URL.');
    }
    // Signed storage URLs authenticate themselves; never forward the API credential.
    let download = createAuthenticatedAxios({
      contentType: false,
      timeout: 60000,
      errorAdapter: error => docupilotApiError(error, 'document download')
    });
    return download.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  }

  async getCurrentUser(): Promise<DocupilotUser> {
    let account = createAuthenticatedAxios({
      baseURL: 'https://api-us1.docupilot.app',
      timeout: 60000,
      authHeader: { value: `Bearer ${this.token}` },
      errorAdapter: error => docupilotApiError(error, 'current user')
    });
    let response = await account.get<DocupilotUser>('/accounts/user/me/');
    let user = userSchema.safeParse(response.data);
    if (!user.success || (user.data.id == null && !user.data.email)) {
      throw createApiServiceError(
        'Docupilot did not return a user identity. Verify your API credentials.'
      );
    }
    return user.data;
  }

  async getTemplateTestData(templateId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/dashboard/api/v2/templates/${templateId}/test_data/`
    );
    return response.data;
  }

  async listMergeLinks(templateId: number): Promise<DocupilotDocumentMergeLink[]> {
    let response = await this.axios.get(
      `/dashboard/api/v2/templates/${templateId}/merge_links/`
    );
    return response.data;
  }

  // ──────────────────────────────
  // Folders
  // ──────────────────────────────

  async listFolders(params?: {
    ordering?: string;
    permission?: 'manage' | 'read' | 'write';
  }): Promise<DocupilotFolder[]> {
    let response = await this.axios.get('/dashboard/api/v2/folders/', {
      params
    });
    return response.data;
  }

  async createFolder(name: string): Promise<DocupilotFolder> {
    let response = await this.axios.post('/dashboard/api/v2/folders/', { name });
    return response.data;
  }

  async updateFolder(folderId: number, name: string): Promise<DocupilotFolder> {
    let response = await this.axios.put(`/dashboard/api/v2/folders/${folderId}/`, { name });
    return response.data;
  }

  async deleteFolder(folderId: number): Promise<void> {
    await this.axios.delete(`/dashboard/api/v2/folders/${folderId}/`);
  }

  // ──────────────────────────────
  // Deliveries
  // ──────────────────────────────

  async listDeliveries(
    templateId: number,
    params?: {
      ordering?: string;
      type?: string;
    }
  ): Promise<DocupilotTemplateDelivery[]> {
    let response = await this.axios.get(
      `/dashboard/api/v2/templates/${templateId}/deliveries/`,
      {
        params
      }
    );
    return response.data;
  }

  async getDelivery(
    templateId: number,
    deliveryId: number
  ): Promise<DocupilotTemplateDelivery> {
    let response = await this.axios.get(
      `/dashboard/api/v2/templates/${templateId}/deliveries/${deliveryId}/`
    );
    return response.data;
  }

  async createDelivery(
    templateId: number,
    data: Record<string, unknown>
  ): Promise<DocupilotTemplateDelivery> {
    let response = await this.axios.post(
      `/dashboard/api/v2/templates/${templateId}/deliveries/`,
      data
    );
    return response.data;
  }

  async updateDelivery(
    templateId: number,
    deliveryId: number,
    data: Record<string, unknown>
  ): Promise<DocupilotTemplateDelivery> {
    let response = await this.axios.put(
      `/dashboard/api/v2/templates/${templateId}/deliveries/${deliveryId}/`,
      data
    );
    return response.data;
  }

  async deleteDelivery(templateId: number, deliveryId: number): Promise<void> {
    await this.axios.delete(
      `/dashboard/api/v2/templates/${templateId}/deliveries/${deliveryId}/`
    );
  }

  // ──────────────────────────────
  // Merge History
  // ──────────────────────────────

  async listMergeHistory(params?: {
    page?: number;
    template?: number;
    status?: 'success' | 'error' | 'pending';
    startDate?: string;
    endDate?: string;
    ordering?: string;
  }): Promise<DocupilotPaginatedList<DocupilotMergeHistory>> {
    let response = await this.axios.get('/dashboard/api/v2/history/', {
      params: {
        page: params?.page,
        template: params?.template,
        status: params?.status,
        start_date: params?.startDate,
        end_date: params?.endDate,
        ordering: params?.ordering
      }
    });
    return response.data;
  }

  async retryDelivery(
    historyId: number,
    data: Record<string, unknown>
  ): Promise<DocupilotMergeHistory> {
    let response = await this.axios.post(
      `/dashboard/api/v2/history/${historyId}/retry_delivery/`,
      data
    );
    return response.data;
  }

  // ──────────────────────────────
  // Content Blocks
  // ──────────────────────────────

  async listContentBlocks(params?: {
    page?: number;
    search?: string;
    ordering?: string;
  }): Promise<DocupilotPaginatedList<DocupilotContentBlock>> {
    let response = await this.axios.get('/dashboard/api/v2/content_blocks/', {
      params
    });
    return response.data;
  }

  async getContentBlock(contentBlockId: number): Promise<DocupilotContentBlock> {
    let response = await this.axios.get(`/dashboard/api/v2/content_blocks/${contentBlockId}/`);
    return response.data;
  }

  async getContentBlockByKey(key: string): Promise<DocupilotContentBlock> {
    let response = await this.axios.get('/dashboard/api/v2/content_blocks/detail/by-key/', {
      params: { key }
    });
    return response.data;
  }

  async deleteContentBlock(contentBlockId: number): Promise<void> {
    await this.axios.delete(`/dashboard/api/v2/content_blocks/${contentBlockId}/`);
  }

  async getContentBlockSchema(contentBlockId: number): Promise<DocupilotTemplateSchema[]> {
    let response = await this.axios.get(
      `/dashboard/api/v2/content_blocks/${contentBlockId}/schema/`
    );
    return response.data;
  }

  // ──────────────────────────────
  // eSign Envelopes
  // ──────────────────────────────

  async listEnvelopes(params?: {
    page?: number;
    search?: string;
    status?: string;
    ordering?: string;
  }): Promise<DocupilotPaginatedList<DocupilotEnvelope>> {
    let response = await this.axios.get('/dashboard/esign/envelopes/', {
      params
    });
    return response.data;
  }

  async getEnvelopeDetails(envelopeId: number): Promise<DocupilotEnvelopeDetail> {
    let response = await this.axios.get(`/dashboard/esign/envelopes/${envelopeId}/details/`);
    return response.data;
  }

  async getEnvelopeHistory(envelopeId: number): Promise<unknown[]> {
    let response = await this.axios.get(`/dashboard/esign/envelopes/${envelopeId}/history/`);
    return response.data;
  }

  async cancelEnvelope(envelopeId: number, reason?: string): Promise<unknown> {
    let response = await this.axios.post(`/dashboard/esign/envelopes/${envelopeId}/cancel/`, {
      void_reason: reason
    });
    return response.data;
  }

  async sendEnvelopeReminder(envelopeId: number): Promise<unknown> {
    let response = await this.axios.post(
      `/dashboard/esign/envelopes/${envelopeId}/send_reminder/`
    );
    return response.data;
  }

  async deleteEnvelope(envelopeId: number): Promise<void> {
    await this.axios.delete(`/dashboard/esign/envelopes/${envelopeId}/`);
  }

  async getEnvelopeCountByStatus(): Promise<Record<string, number>> {
    let response = await this.axios.get('/dashboard/esign/envelopes/count/');
    return response.data;
  }

  // ──────────────────────────────
  // Workspaces
  // ──────────────────────────────

  async getCurrentWorkspace(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/dashboard/accounts/v2/workspaces/current/');
    return response.data;
  }
}
