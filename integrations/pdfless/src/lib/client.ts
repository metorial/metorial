import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

let pdfResponseSchema = z.object({
  data: z.object({
    template_id: z.string(),
    reference_id: z.string().nullish(),
    download_url: z.string().url(),
    expires: z.string(),
    created_at: z.string()
  })
});

let templateSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  created: z.string().optional(),
  modified: z.string().nullish()
});

let workspaceSchema = z.object({
  name: z.string().nullable(),
  active: z.boolean(),
  created: z.string(),
  modified: z.string().nullish()
});

let downloadHttp = createAxios({ timeout: 30000 });

export interface GeneratePdfParams {
  templateId: string;
  payload: Record<string, unknown>;
  referenceId?: string;
  encryption?: {
    userPassword?: string;
    ownerPassword?: string;
    allowPrinting?: boolean;
    allowModifying?: boolean;
    allowContentCopying?: boolean;
    allowModifyAnnotations?: boolean;
    allowFormFilling?: boolean;
    allowScreenReaders?: boolean;
    allowDocumentAssembly?: boolean;
  };
}

export interface GeneratePdfResult {
  templateId: string;
  referenceId?: string;
  downloadUrl: string;
  expires: string;
  createdAt: string;
}

export interface Template {
  templateId: string;
  title: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface ListTemplatesParams {
  page?: number;
  pageSize?: number;
}

export interface ListTemplatesResult {
  templates: Template[];
  page: number;
  pageSize: number;
}

export interface WorkspaceInfo {
  name: string | null;
  active: boolean;
  createdAt: string;
  modifiedAt?: string;
}

export class PdflessClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token?.trim();
    if (!token || /[\r\n]/.test(token)) {
      throw createApiServiceError(
        'A valid Pdfless API key is required. Reconnect with your workspace API key.'
      );
    }

    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.pdfless.com',
      timeout: 60000,
      authHeader: { name: 'apikey', value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Pdfless',
          reason: 'pdfless_api_error',
          detailKeys: ['message', 'error_code', 'correlation_id'],
          extractUpstreamCode: (error, response, helpers) => {
            if (
              helpers.isRecord(response?.data) &&
              typeof response.data.error_code === 'string'
            ) {
              return response.data.error_code;
            }
            let data =
              helpers.isRecord(error) && helpers.isRecord(error.data) ? error.data : undefined;
            let upstream = helpers.isRecord(data?.upstream) ? data.upstream : undefined;
            return typeof upstream?.code === 'string' ? upstream.code : undefined;
          }
        })
    });
  }

  async generatePdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
    if (!params.templateId.trim()) {
      throw createApiServiceError(
        'A template ID is required. Call list_templates to find a template.'
      );
    }
    let enc = params.encryption;
    if (enc && Object.values(enc).some(value => value !== undefined) && !enc.userPassword) {
      throw createApiServiceError(
        'Set encryption.userPassword to enable PDF protection and permission controls.'
      );
    }
    let body = pickDefined({
      template_id: params.templateId,
      payload: params.payload,
      reference_id: params.referenceId,
      encryption_user_password: enc?.userPassword,
      encryption_owner_password: enc?.ownerPassword,
      encryption_allow_printing: enc?.allowPrinting,
      encryption_allow_modifying: enc?.allowModifying,
      encryption_allow_content_copying: enc?.allowContentCopying,
      encryption_allow_modify_annotations: enc?.allowModifyAnnotations,
      encryption_allow_form_filling: enc?.allowFormFilling,
      encryption_allow_screenreaders: enc?.allowScreenReaders,
      encryption_allow_document_assembly: enc?.allowDocumentAssembly
    });

    let response = await this.http.post('/v1/pdfs', body);
    let parsed = pdfResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError('Pdfless returned incomplete PDF download details.', {
        reason: 'pdfless_invalid_response'
      });
    }
    let data = parsed.data.data;
    if (new URL(data.download_url).protocol !== 'https:') {
      throw createApiServiceError('Pdfless returned an insecure PDF download URL.', {
        reason: 'pdfless_invalid_response'
      });
    }

    return {
      templateId: data.template_id,
      ...(data.reference_id != null ? { referenceId: data.reference_id } : {}),
      downloadUrl: data.download_url,
      expires: data.expires,
      createdAt: data.created_at
    };
  }

  async downloadPdf(url: string): Promise<Buffer> {
    try {
      let response = await downloadHttp.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        headers: { Accept: 'application/pdf' }
      });
      let content = Buffer.from(response.data);
      if (!content.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
        throw createApiServiceError(
          'The generated PDF could not be downloaded. Use the returned URL before it expires.',
          {
            reason: 'pdfless_invalid_pdf'
          }
        );
      }
      return content;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Pdfless',
        reason: 'pdfless_download_error',
        operation: 'PDF download'
      });
    }
  }

  async listTemplates(params?: ListTemplatesParams): Promise<ListTemplatesResult> {
    let page = params?.page ?? 1;
    let pageSize = params?.pageSize ?? 25;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1
    ) {
      throw createApiServiceError('page and pageSize must be positive whole numbers.');
    }

    let response = await this.http.get('/v1/document-templates', {
      params: { page, pageSize }
    });
    let parsed = z.array(templateSchema).safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError('Pdfless returned an invalid template list.', {
        reason: 'pdfless_invalid_response'
      });
    }

    return {
      templates: parsed.data.map(template => ({
        templateId: template.id,
        title: template.name ?? '',
        ...(template.created !== undefined ? { createdAt: template.created } : {}),
        ...(template.modified != null ? { modifiedAt: template.modified } : {})
      })),
      page,
      pageSize
    };
  }

  async getWorkspace(): Promise<WorkspaceInfo> {
    let response = await this.http.get('/v1/workspaces');
    let parsed = workspaceSchema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError('Pdfless returned invalid workspace details.', {
        reason: 'pdfless_invalid_response'
      });
    }
    return {
      name: parsed.data.name,
      active: parsed.data.active,
      createdAt: parsed.data.created,
      ...(parsed.data.modified != null ? { modifiedAt: parsed.data.modified } : {})
    };
  }
}
