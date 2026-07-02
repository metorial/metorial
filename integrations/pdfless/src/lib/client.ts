import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.pdfless.com'
});

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
  workspaceId: string;
  name: string;
}

export class PdflessClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      apikey: this.token,
      'Content-Type': 'application/json'
    };
  }

  async generatePdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      payload: params.payload
    };

    if (params.referenceId) {
      body.reference_id = params.referenceId;
    }

    if (params.encryption) {
      let enc = params.encryption;
      if (enc.userPassword !== undefined) body.encryption_user_password = enc.userPassword;
      if (enc.ownerPassword !== undefined) body.encryption_owner_password = enc.ownerPassword;
      if (enc.allowPrinting !== undefined) body.encryption_allow_printing = enc.allowPrinting;
      if (enc.allowModifying !== undefined)
        body.encryption_allow_modifying = enc.allowModifying;
      if (enc.allowContentCopying !== undefined)
        body.encryption_allow_content_copying = enc.allowContentCopying;
      if (enc.allowModifyAnnotations !== undefined)
        body.encryption_allow_modify_annotations = enc.allowModifyAnnotations;
      if (enc.allowFormFilling !== undefined)
        body.encryption_allow_form_filling = enc.allowFormFilling;
      if (enc.allowScreenReaders !== undefined)
        body.encryption_allow_screenreaders = enc.allowScreenReaders;
      if (enc.allowDocumentAssembly !== undefined)
        body.encryption_allow_document_assembly = enc.allowDocumentAssembly;
    }

    let response = await http.post('/v1/pdfs', body, {
      headers: this.headers
    });

    let data = response.data.data;

    return {
      templateId: data.template_id,
      referenceId: data.reference_id,
      downloadUrl: data.download_url,
      expires: data.expires,
      createdAt: data.created_at
    };
  }

  async listTemplates(params?: ListTemplatesParams): Promise<ListTemplatesResult> {
    let page = params?.page ?? 1;
    let pageSize = params?.pageSize ?? 25;

    let response = await http.get('/v1/templates', {
      headers: this.headers,
      params: {
        page,
        pageSize
      }
    });

    let data = response.data.data;
    let templates = Array.isArray(data)
      ? data.map((t: any) => ({
          templateId: t.template_id ?? t.id,
          title: t.title ?? t.name
        }))
      : [];

    return {
      templates,
      page,
      pageSize
    };
  }

  async getWorkspace(): Promise<WorkspaceInfo> {
    let response = await http.get('/v1/workspaces', {
      headers: this.headers
    });

    let data = response.data.data;

    return {
      workspaceId: data.workspace_id ?? data.id,
      name: data.name
    };
  }
}
