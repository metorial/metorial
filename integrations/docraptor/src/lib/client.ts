import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface CreateDocumentParams {
  name?: string;
  documentType: 'pdf' | 'xls' | 'xlsx';
  documentContent?: string;
  documentUrl?: string;
  test?: boolean;
  javascript?: boolean;
  referrer?: string;
  pipeline?: string;
  tag?: string;
  strict?: 'none' | 'html';
  ignoreResourceErrors?: boolean;
  ignoreConsoleMessages?: boolean;
  princeOptions?: PrinceOptions;
}

export interface PrinceOptions {
  media?: 'print' | 'screen';
  baseurl?: string;
  input?: 'html' | 'xml' | 'auto';
  javascript?: boolean;
  maxPasses?: number;
  encrypt?: boolean;
  keyBits?: 40 | 128;
  userPassword?: string;
  ownerPassword?: string;
  disallowPrint?: boolean;
  disallowCopy?: boolean;
  disallowAnnotate?: boolean;
  disallowModify?: boolean;
  allowCopyForAccessibility?: boolean;
  allowAssembly?: boolean;
  noXinclude?: boolean;
  noNetwork?: boolean;
  noParallelDownloads?: boolean;
  httpUser?: string;
  httpPassword?: string;
  httpProxy?: string;
  httpTimeout?: number;
  insecure?: boolean;
  noAuthorStyle?: boolean;
  noDefaultStyle?: boolean;
  noEmbedFonts?: boolean;
  noSubsetFonts?: boolean;
  noCompress?: boolean;
  cssDpi?: number;
  profile?: string;
  pdfTitle?: string;
}

export interface AsyncDocumentParams extends CreateDocumentParams {
  callbackUrl?: string;
}

export interface HostedDocumentParams extends CreateDocumentParams {
  hostedDownloadLimit?: number;
  hostedExpiresAt?: string;
}

export interface AsyncStatusResponse {
  status: 'queued' | 'working' | 'completed' | 'failed' | 'killed';
  downloadUrl?: string;
  numberOfPages?: number;
  message?: string;
  validationErrors?: string;
  downloadId?: string;
}

export interface HostedDocumentResponse {
  downloadId: string;
  downloadUrl: string;
  numberOfPages?: number;
}

export type DocumentListItem = Record<string, unknown>;

let buildDocumentBody = (
  params: CreateDocumentParams & {
    async?: boolean;
    hosted?: boolean;
    hostedDownloadLimit?: number;
    hostedExpiresAt?: string;
    callbackUrl?: string;
  }
) => {
  let hasContent = Boolean(params.documentContent?.trim());
  let hasUrl = Boolean(params.documentUrl?.trim());
  if (hasContent === hasUrl) {
    throw createApiServiceError(
      'Provide either documentContent or documentUrl, but not both.'
    );
  }
  if (params.documentContent !== undefined && !hasContent) {
    throw createApiServiceError('documentContent must not be blank.');
  }
  if (params.documentUrl !== undefined) validateHttpUrl(params.documentUrl, 'documentUrl');
  if (params.callbackUrl !== undefined) validateHttpUrl(params.callbackUrl, 'callbackUrl');
  if (params.hostedExpiresAt !== undefined && !isIsoDateTime(params.hostedExpiresAt)) {
    throw createApiServiceError(
      'hostedExpiresAt must be an ISO 8601 datetime including seconds.'
    );
  }

  let body: Record<string, unknown> = {
    type: params.documentType,
    test: params.test ?? false
  };

  if (params.name) body.name = params.name;
  if (params.documentContent) body.document_content = params.documentContent;
  if (params.documentUrl) body.document_url = params.documentUrl;
  if (params.javascript !== undefined) body.javascript = params.javascript;
  if (params.referrer) body.referrer = params.referrer;
  if (params.pipeline) body.pipeline = params.pipeline;
  if (params.tag) body.tag = params.tag;
  if (params.strict) body.strict = params.strict;
  if (params.ignoreResourceErrors !== undefined)
    body.ignore_resource_errors = params.ignoreResourceErrors;
  if (params.ignoreConsoleMessages !== undefined)
    body.ignore_console_messages = params.ignoreConsoleMessages;

  if (params.async) body.async = true;
  if (params.callbackUrl) body.callback_url = params.callbackUrl;
  if (params.hosted) body.hosted = true;
  if (params.hostedDownloadLimit !== undefined)
    body.hosted_download_limit = params.hostedDownloadLimit;
  if (params.hostedExpiresAt) body.hosted_expires_at = params.hostedExpiresAt;

  if (params.princeOptions) {
    let po = params.princeOptions;
    body.prince_options = pickDefined({
      media: po.media,
      baseurl: po.baseurl,
      input: po.input,
      javascript: po.javascript,
      max_passes: po.maxPasses,
      encrypt: po.encrypt,
      key_bits: po.keyBits,
      user_password: po.userPassword,
      owner_password: po.ownerPassword,
      disallow_print: po.disallowPrint,
      disallow_copy: po.disallowCopy,
      disallow_annotate: po.disallowAnnotate,
      disallow_modify: po.disallowModify,
      allow_copy_for_accessibility: po.allowCopyForAccessibility,
      allow_assembly: po.allowAssembly,
      no_xinclude: po.noXinclude,
      no_network: po.noNetwork,
      no_parallel_downloads: po.noParallelDownloads,
      http_user: po.httpUser,
      http_password: po.httpPassword,
      http_proxy: po.httpProxy,
      http_timeout: po.httpTimeout,
      insecure: po.insecure,
      no_author_style: po.noAuthorStyle,
      no_default_style: po.noDefaultStyle,
      no_embed_fonts: po.noEmbedFonts,
      no_subset_fonts: po.noSubsetFonts,
      no_compress: po.noCompress,
      css_dpi: po.cssDpi,
      profile: po.profile,
      pdf_title: po.pdfTitle
    });
  }

  return body;
};

let validateHttpUrl = (value: string, field: string) => {
  try {
    let url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return;
  } catch {}
  throw createApiServiceError(`${field} must be a valid HTTP or HTTPS URL.`);
};

let isIsoDateTime = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    return false;
  }
  return Number.isFinite(
    Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
  );
};

let requiredString = (value: unknown, field: string): string => {
  if (
    (typeof value === 'string' && value.trim()) ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return String(value);
  }
  throw createApiServiceError(
    `DocRaptor returned an invalid ${field}. Please retry the request.`
  );
};

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
let optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

let requiredRecord = (value: unknown) => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(
      'DocRaptor returned an invalid response. Please retry the request.'
    );
  }
  return value;
};

export let getDocumentMimeType = (type: CreateDocumentParams['documentType']) =>
  type === 'pdf'
    ? 'application/pdf'
    : type === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A DocRaptor API key is required. Reconnect with a valid API key.'
      );
    }
    this.apiKey = config.token;
  }

  private getAxios(authenticated = true) {
    return createAuthenticatedAxios({
      baseURL: 'https://api.docraptor.com',
      ...(authenticated ? { auth: { username: this.apiKey, password: '' } } : {}),
      timeout: 70000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DocRaptor',
          reason: 'docraptor_api_error'
        })
    });
  }

  async createDocument(
    params: CreateDocumentParams
  ): Promise<{ content: Response; contentLength: number }> {
    let http = this.getAxios();
    let response = await http.post<ArrayBuffer>('/docs', buildDocumentBody(params), {
      responseType: 'arraybuffer'
    });
    let buffer = new Uint8Array(response.data);
    if (!buffer.byteLength) {
      throw createApiServiceError(
        'DocRaptor returned an empty document. Please retry the request.'
      );
    }
    return {
      content: new Response(buffer, {
        headers: { 'Content-Type': getDocumentMimeType(params.documentType) }
      }),
      contentLength: buffer.byteLength
    };
  }

  async createAsyncDocument(params: AsyncDocumentParams): Promise<{ statusId: string }> {
    let http = this.getAxios();
    let response = await http.post<unknown>(
      '/docs',
      buildDocumentBody({ ...params, async: true })
    );
    let data = requiredRecord(response.data);
    return { statusId: requiredString(data.status_id, 'status ID') };
  }

  async createHostedAsyncDocument(
    params: AsyncDocumentParams & HostedDocumentParams
  ): Promise<{ statusId: string }> {
    let http = this.getAxios();
    let response = await http.post<unknown>(
      '/docs',
      buildDocumentBody({ ...params, async: true, hosted: true })
    );
    let data = requiredRecord(response.data);
    return { statusId: requiredString(data.status_id, 'status ID') };
  }

  async getAsyncStatus(statusId: string): Promise<AsyncStatusResponse> {
    if (!statusId.trim()) throw createApiServiceError('statusId must not be blank.');
    let http = this.getAxios();
    let response = await http.get<unknown>(`/status/${encodeURIComponent(statusId)}.json`);
    let data = requiredRecord(response.data);
    let status = data.status;
    if (
      status !== 'queued' &&
      status !== 'working' &&
      status !== 'completed' &&
      status !== 'failed' &&
      status !== 'killed'
    ) {
      throw createApiServiceError(
        'DocRaptor returned an unknown document status. Please retry the request.'
      );
    }
    let downloadUrl = optionalString(data.download_url);
    if (downloadUrl !== undefined) validateHttpUrl(downloadUrl, 'download URL');
    if (status === 'completed' && !downloadUrl) {
      throw createApiServiceError(
        'DocRaptor marked the document completed without a download URL. Please retry the status check.'
      );
    }
    return {
      status,
      downloadUrl,
      downloadId:
        data.download_id === null || data.download_id === undefined
          ? undefined
          : requiredString(data.download_id, 'download ID'),
      numberOfPages: optionalNumber(data.number_of_pages),
      message: optionalString(data.message),
      validationErrors: optionalString(data.validation_errors)
    };
  }

  async createHostedDocument(params: HostedDocumentParams): Promise<HostedDocumentResponse> {
    let http = this.getAxios();
    let response = await http.post<unknown>(
      '/docs',
      buildDocumentBody({ ...params, hosted: true })
    );
    let data = requiredRecord(response.data);
    let downloadUrl = requiredString(data.download_url, 'download URL');
    validateHttpUrl(downloadUrl, 'download URL');
    return {
      downloadId: requiredString(data.download_id, 'download ID'),
      downloadUrl,
      numberOfPages: optionalNumber(data.number_of_pages)
    };
  }

  async expireHostedDocument(downloadId: string): Promise<void> {
    if (!downloadId.trim()) throw createApiServiceError('downloadId must not be blank.');
    let http = this.getAxios();
    await http.patch(`/expire/${encodeURIComponent(downloadId)}.json`);
  }

  async listDocuments(page?: number, perPage?: number): Promise<DocumentListItem[]> {
    let http = this.getAxios();
    let response = await http.get<unknown>('/docs.json', {
      params: pickDefined({ page, per_page: perPage })
    });
    if (!Array.isArray(response.data) || !response.data.every(isApiErrorRecord)) {
      throw createApiServiceError(
        'DocRaptor returned an invalid document list. Please retry the request.'
      );
    }
    return response.data;
  }

  async listIps(): Promise<string[]> {
    let http = this.getAxios(false);
    let response = await http.get<unknown>('https://docraptor.com/ips.json');
    if (!Array.isArray(response.data) || !response.data.every(ip => typeof ip === 'string')) {
      throw createApiServiceError(
        'DocRaptor returned an invalid IP address list. Please retry the request.'
      );
    }
    return response.data;
  }
}
