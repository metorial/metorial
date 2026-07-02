import { createAxios } from 'slates';
import { pdfCoUpstreamError, toPdfCoServiceError } from './errors';
import type {
  PdfCoBarcodeReadResponse,
  PdfCoClassifierResponse,
  PdfCoDocumentParserResponse,
  PdfCoDownloadedFile,
  PdfCoFileResponse,
  PdfCoFindTextResponse,
  PdfCoInfoResponse,
  PdfCoInlineResponse,
  PdfCoJobCheckResponse,
  PdfCoSplitResponse,
  PdfCoUploadResponse
} from './types';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.pdf.co/v1',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private async post<T>(endpoint: string, params: unknown): Promise<T> {
    try {
      let response = await this.http.post(endpoint, params);
      return response.data;
    } catch (error) {
      throw toPdfCoServiceError(error, `PDF.co request failed for ${endpoint}`);
    }
  }

  private async get<T>(endpoint: string, config?: any): Promise<T> {
    try {
      let response = await this.http.get(endpoint, config);
      return response.data;
    } catch (error) {
      throw toPdfCoServiceError(error, `PDF.co request failed for ${endpoint}`);
    }
  }

  async downloadFileUrl(
    url: string,
    fallbackMimeType = 'application/octet-stream'
  ): Promise<PdfCoDownloadedFile> {
    try {
      let response = await fetch(url);
      if (!response.ok) {
        throw pdfCoUpstreamError(
          `PDF.co output download failed with HTTP ${response.status}.`,
          {
            status: response.status
          }
        );
      }

      let content = Buffer.from(await response.arrayBuffer());
      let mimeType =
        response.headers.get('content-type')?.split(';')[0]?.trim() || fallbackMimeType;

      return {
        contentBase64: content.toString('base64'),
        mimeType,
        byteLength: content.byteLength
      };
    } catch (error) {
      throw toPdfCoServiceError(error, 'PDF.co output download failed');
    }
  }

  // ── PDF Conversion (From PDF) ──────────────────────────────────

  async convertPdfTo(
    format:
      | 'csv'
      | 'json'
      | 'text'
      | 'xls'
      | 'xlsx'
      | 'xml'
      | 'html'
      | 'jpg'
      | 'png'
      | 'webp'
      | 'tiff',
    params: {
      url: string;
      pages?: string;
      lang?: string;
      inline?: boolean;
      password?: string;
      name?: string;
      rect?: string;
      unwrap?: boolean;
      lineGrouping?: string;
      profiles?: string;
    }
  ): Promise<PdfCoFileResponse | PdfCoInlineResponse> {
    let formatMap: Record<string, string> = {
      csv: 'csv',
      json: 'json',
      text: 'text',
      xls: 'xls',
      xlsx: 'xlsx',
      xml: 'xml',
      html: 'html',
      jpg: 'jpg',
      png: 'png',
      webp: 'webp',
      tiff: 'tiff'
    };

    let endpoint = `/pdf/convert/to/${formatMap[format]}`;
    return this.post(endpoint, params);
  }

  // ── PDF Generation (To PDF) ────────────────────────────────────

  async convertHtmlToPdf(params: {
    html: string;
    name?: string;
    margins?: string;
    paperSize?: string;
    orientation?: string;
    printBackground?: boolean;
    header?: string;
    footer?: string;
    mediaType?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/convert/from/html', params);
  }

  async convertUrlToPdf(params: {
    url: string;
    name?: string;
    margins?: string;
    paperSize?: string;
    orientation?: string;
    printBackground?: boolean;
    header?: string;
    footer?: string;
    mediaType?: string;
    renderTimeout?: number;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/convert/from/url', params);
  }

  async convertDocumentToPdf(params: {
    url: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/convert/from/doc', params);
  }

  async convertImageToPdf(params: { url: string; name?: string }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/convert/from/image', params);
  }

  // ── PDF Merge & Split ──────────────────────────────────────────

  async mergePdfs(params: { url: string; name?: string }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/merge', params);
  }

  async splitPdfByPages(params: {
    url: string;
    pages: string;
    name?: string;
    password?: string;
  }): Promise<PdfCoSplitResponse> {
    return this.post('/pdf/split', params);
  }

  async splitPdfByTextOrBarcode(params: {
    url: string;
    searchString: string;
    excludeKeyPages?: boolean;
    regexSearch?: boolean;
    caseSensitive?: boolean;
    name?: string;
    password?: string;
  }): Promise<PdfCoSplitResponse> {
    return this.post('/pdf/split2', params);
  }

  // ── PDF Editing ────────────────────────────────────────────────

  async addToPdf(params: {
    url: string;
    annotations?: Array<{
      x: number;
      y: number;
      text?: string;
      size?: number;
      color?: string;
      fontName?: string;
      pages?: string;
      [key: string]: any;
    }>;
    images?: Array<{
      x: number;
      y: number;
      url: string;
      width?: number;
      height?: number;
      pages?: string;
      [key: string]: any;
    }>;
    fields?: Array<{
      fieldName: string;
      text?: string;
      pages?: string;
      [key: string]: any;
    }>;
    name?: string;
    password?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/edit/add', params);
  }

  async searchAndReplaceText(params: {
    url: string;
    searchStrings: string[];
    replaceStrings: string[];
    caseSensitive?: boolean;
    regex?: boolean;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/edit/replace-text', params);
  }

  async searchAndDeleteText(params: {
    url: string;
    searchStrings: string[];
    caseSensitive?: boolean;
    regex?: boolean;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/edit/delete-text', params);
  }

  async deletePages(params: {
    url: string;
    pages: string;
    name?: string;
    password?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/edit/delete-pages', params);
  }

  // ── PDF Security ───────────────────────────────────────────────

  async addPassword(params: {
    url: string;
    ownerPassword?: string;
    userPassword?: string;
    encryptionAlgorithm?: string;
    allowPrintDocument?: boolean;
    allowModifyDocument?: boolean;
    allowContentExtraction?: boolean;
    allowFillForms?: boolean;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/security/add', params);
  }

  async removePassword(params: {
    url: string;
    password: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/security/remove', params);
  }

  // ── PDF Search & Info ──────────────────────────────────────────

  async findText(params: {
    url: string;
    searchString: string;
    pages?: string;
    password?: string;
    regexSearch?: boolean;
    wordMatchingMode?: string;
  }): Promise<PdfCoFindTextResponse> {
    return this.post('/pdf/find', params);
  }

  async getPdfInfo(params: { url: string; password?: string }): Promise<PdfCoInfoResponse> {
    return this.post('/pdf/info', params);
  }

  // ── Barcode Operations ─────────────────────────────────────────

  async generateBarcode(params: {
    type?: string;
    value: string;
    name?: string;
    inline?: boolean;
    decorationImage?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/barcode/generate', params);
  }

  async readBarcode(params: {
    url: string;
    type?: string;
    types?: string;
    pages?: string;
    password?: string;
  }): Promise<PdfCoBarcodeReadResponse> {
    return this.post('/barcode/read/from/url', params);
  }

  // ── Data Extraction ────────────────────────────────────────────

  async parseInvoice(params: { url: string; inline?: boolean }): Promise<PdfCoInlineResponse> {
    return this.post('/pdf/ai-invoice-parser', {
      ...params,
      inline: true
    });
  }

  async parseDocument(params: {
    url: string;
    templateId: string;
    inline?: boolean;
    password?: string;
  }): Promise<PdfCoDocumentParserResponse> {
    return this.post('/pdf/documentparser', {
      ...params,
      inline: true
    });
  }

  async classifyDocument(params: {
    url: string;
    rulescsv?: string;
    rulescsvurl?: string;
    caseSensitive?: boolean;
    password?: string;
  }): Promise<PdfCoClassifierResponse> {
    return this.post('/pdf/classifier', {
      ...params,
      inline: true
    });
  }

  // ── File Management ────────────────────────────────────────────

  async uploadFileFromUrl(params: {
    url: string;
    name?: string;
  }): Promise<PdfCoUploadResponse> {
    return this.post('/file/upload/url', params);
  }

  async getPresignedUploadUrl(params: {
    name: string;
    contentType?: string;
  }): Promise<PdfCoUploadResponse> {
    return this.get('/file/upload/get-presigned-url', {
      params
    });
  }

  // ── Job Management ─────────────────────────────────────────────

  async checkJob(jobId: string): Promise<PdfCoJobCheckResponse> {
    return this.post('/job/check', { jobid: jobId });
  }

  // ── Make Searchable / Unsearchable ─────────────────────────────

  async makePdfSearchable(params: {
    url: string;
    lang?: string;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/makesearchable', params);
  }

  async makePdfUnsearchable(params: {
    url: string;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    return this.post('/pdf/makeunsearchable', params);
  }

  async compressPdf(params: {
    url: string;
    pages?: string;
    password?: string;
    name?: string;
    config?: Record<string, unknown>;
    expiration?: number;
    profiles?: Record<string, unknown>;
  }): Promise<PdfCoFileResponse> {
    return this.post('https://api.pdf.co/v2/pdf/compress', params);
  }
}
