import { createAxios } from 'slates';

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
    if (po.media) body['prince_options[media]'] = po.media;
    if (po.baseurl) body['prince_options[baseurl]'] = po.baseurl;
    if (po.input) body['prince_options[input]'] = po.input;
    if (po.javascript !== undefined) body['prince_options[javascript]'] = po.javascript;
    if (po.maxPasses !== undefined) body['prince_options[max_passes]'] = po.maxPasses;
    if (po.encrypt !== undefined) body['prince_options[encrypt]'] = po.encrypt;
    if (po.keyBits !== undefined) body['prince_options[key_bits]'] = po.keyBits;
    if (po.userPassword) body['prince_options[user_password]'] = po.userPassword;
    if (po.ownerPassword) body['prince_options[owner_password]'] = po.ownerPassword;
    if (po.disallowPrint !== undefined)
      body['prince_options[disallow_print]'] = po.disallowPrint;
    if (po.disallowCopy !== undefined) body['prince_options[disallow_copy]'] = po.disallowCopy;
    if (po.disallowAnnotate !== undefined)
      body['prince_options[disallow_annotate]'] = po.disallowAnnotate;
    if (po.disallowModify !== undefined)
      body['prince_options[disallow_modify]'] = po.disallowModify;
    if (po.allowCopyForAccessibility !== undefined)
      body['prince_options[allow_copy_for_accessibility]'] = po.allowCopyForAccessibility;
    if (po.allowAssembly !== undefined)
      body['prince_options[allow_assembly]'] = po.allowAssembly;
    if (po.noXinclude !== undefined) body['prince_options[no_xinclude]'] = po.noXinclude;
    if (po.noNetwork !== undefined) body['prince_options[no_network]'] = po.noNetwork;
    if (po.noParallelDownloads !== undefined)
      body['prince_options[no_parallel_downloads]'] = po.noParallelDownloads;
    if (po.httpUser) body['prince_options[http_user]'] = po.httpUser;
    if (po.httpPassword) body['prince_options[http_password]'] = po.httpPassword;
    if (po.httpProxy) body['prince_options[http_proxy]'] = po.httpProxy;
    if (po.httpTimeout !== undefined) body['prince_options[http_timeout]'] = po.httpTimeout;
    if (po.insecure !== undefined) body['prince_options[insecure]'] = po.insecure;
    if (po.noAuthorStyle !== undefined)
      body['prince_options[no_author_style]'] = po.noAuthorStyle;
    if (po.noDefaultStyle !== undefined)
      body['prince_options[no_default_style]'] = po.noDefaultStyle;
    if (po.noEmbedFonts !== undefined)
      body['prince_options[no_embed_fonts]'] = po.noEmbedFonts;
    if (po.noSubsetFonts !== undefined)
      body['prince_options[no_subset_fonts]'] = po.noSubsetFonts;
    if (po.noCompress !== undefined) body['prince_options[no_compress]'] = po.noCompress;
    if (po.cssDpi !== undefined) body['prince_options[css_dpi]'] = po.cssDpi;
    if (po.profile) body['prince_options[profile]'] = po.profile;
    if (po.pdfTitle) body['prince_options[pdf_title]'] = po.pdfTitle;
  }

  return body;
};

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  private getAxios() {
    let encoded = Buffer.from(`${this.apiKey}:`).toString('base64');
    return createAxios({
      baseURL: 'https://api.docraptor.com',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createDocument(
    params: CreateDocumentParams
  ): Promise<{ content: string; contentLength: number }> {
    let http = this.getAxios();
    let body = buildDocumentBody(params);

    let response = await http.post('/docs', body, {
      responseType: 'arraybuffer'
    });

    let buffer = Buffer.from(response.data as ArrayBuffer);
    let base64Content = buffer.toString('base64');

    return {
      content: base64Content,
      contentLength: buffer.length
    };
  }

  async createAsyncDocument(params: AsyncDocumentParams): Promise<{ statusId: string }> {
    let http = this.getAxios();
    let body = buildDocumentBody({ ...params, async: true });

    let response = await http.post<{ status_id: string }>('/docs', body);

    return {
      statusId: String(response.data.status_id)
    };
  }

  async getAsyncStatus(statusId: string): Promise<AsyncStatusResponse> {
    let http = this.getAxios();
    let response = await http.get<Record<string, unknown>>(`/status/${statusId}.json`);

    let data = response.data;
    return {
      status: data.status as AsyncStatusResponse['status'],
      downloadUrl: data.download_url as string | undefined,
      numberOfPages: data.number_of_pages as number | undefined,
      message: data.message as string | undefined,
      validationErrors: data.validation_errors as string | undefined
    };
  }

  async createHostedDocument(params: HostedDocumentParams): Promise<HostedDocumentResponse> {
    let http = this.getAxios();
    let body = buildDocumentBody({
      ...params,
      hosted: true,
      hostedDownloadLimit: params.hostedDownloadLimit,
      hostedExpiresAt: params.hostedExpiresAt
    });

    let response = await http.post<Record<string, unknown>>('/docs', body);

    let data = response.data;
    return {
      downloadId: data.download_id as string,
      downloadUrl: data.download_url as string,
      numberOfPages: data.number_of_pages as number | undefined
    };
  }

  async expireHostedDocument(downloadId: string): Promise<void> {
    let http = this.getAxios();
    await http.patch(`/expire/${downloadId}.json`);
  }

  async listDocuments(page?: number, perPage?: number): Promise<DocumentListItem[]> {
    let http = this.getAxios();
    let params: Record<string, unknown> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;

    let response = await http.get<DocumentListItem[]>('/docs.json', { params });
    return response.data;
  }

  async listIps(): Promise<string[]> {
    let http = this.getAxios();
    let response = await http.get<string[]>('https://docraptor.com/ips.json');
    return response.data;
  }
}
