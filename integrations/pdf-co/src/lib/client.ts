import { createAxios } from 'slates';
import type {
  PdfCoBarcodeReadResponse,
  PdfCoClassifierResponse,
  PdfCoDocumentParserResponse,
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
    let response = await this.http.post(endpoint, params);
    return response.data;
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
    let response = await this.http.post('/pdf/convert/from/html', params);
    return response.data;
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
    let response = await this.http.post('/pdf/convert/from/url', params);
    return response.data;
  }

  async convertDocumentToPdf(params: {
    url: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/convert/from/doc', params);
    return response.data;
  }

  async convertImageToPdf(params: { url: string; name?: string }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/convert/from/image', params);
    return response.data;
  }

  // ── PDF Merge & Split ──────────────────────────────────────────

  async mergePdfs(params: { url: string; name?: string }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/merge', params);
    return response.data;
  }

  async splitPdfByPages(params: {
    url: string;
    pages: string;
    name?: string;
    password?: string;
  }): Promise<PdfCoSplitResponse> {
    let response = await this.http.post('/pdf/split', params);
    return response.data;
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
    let response = await this.http.post('/pdf/split2', params);
    return response.data;
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
    let response = await this.http.post('/pdf/edit/add', params);
    return response.data;
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
    let response = await this.http.post('/pdf/edit/replace-text', params);
    return response.data;
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
    let response = await this.http.post('/pdf/edit/delete-text', params);
    return response.data;
  }

  async deletePages(params: {
    url: string;
    pages: string;
    name?: string;
    password?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/edit/delete-pages', params);
    return response.data;
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
    let response = await this.http.post('/pdf/security/add', params);
    return response.data;
  }

  async removePassword(params: {
    url: string;
    password: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/security/remove', params);
    return response.data;
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
    let response = await this.http.post('/pdf/find', params);
    return response.data;
  }

  async getPdfInfo(params: { url: string; password?: string }): Promise<PdfCoInfoResponse> {
    let response = await this.http.post('/pdf/info', params);
    return response.data;
  }

  // ── Barcode Operations ─────────────────────────────────────────

  async generateBarcode(params: {
    type?: string;
    value: string;
    name?: string;
    inline?: boolean;
    decorationImage?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/barcode/generate', params);
    return response.data;
  }

  async readBarcode(params: {
    url: string;
    type?: string;
    types?: string;
    pages?: string;
    password?: string;
  }): Promise<PdfCoBarcodeReadResponse> {
    let response = await this.http.post('/barcode/read/from/url', params);
    return response.data;
  }

  // ── Data Extraction ────────────────────────────────────────────

  async parseInvoice(params: { url: string; inline?: boolean }): Promise<PdfCoInlineResponse> {
    let response = await this.http.post('/pdf/ai-invoice-parser', {
      ...params,
      inline: true
    });
    return response.data;
  }

  async parseDocument(params: {
    url: string;
    templateId: string;
    inline?: boolean;
    password?: string;
  }): Promise<PdfCoDocumentParserResponse> {
    let response = await this.http.post('/pdf/documentparser', {
      ...params,
      inline: true
    });
    return response.data;
  }

  async classifyDocument(params: {
    url: string;
    rulescsv?: string;
    rulescsvurl?: string;
    caseSensitive?: boolean;
    password?: string;
  }): Promise<PdfCoClassifierResponse> {
    let response = await this.http.post('/pdf/classifier', {
      ...params,
      inline: true
    });
    return response.data;
  }

  // ── File Management ────────────────────────────────────────────

  async uploadFileFromUrl(params: {
    url: string;
    name?: string;
  }): Promise<PdfCoUploadResponse> {
    let response = await this.http.post('/file/upload/url', params);
    return response.data;
  }

  async getPresignedUploadUrl(params: {
    name: string;
    contentType?: string;
  }): Promise<PdfCoUploadResponse> {
    let response = await this.http.get('/file/upload/get-presigned-url', {
      params
    });
    return response.data;
  }

  // ── Job Management ─────────────────────────────────────────────

  async checkJob(jobId: string): Promise<PdfCoJobCheckResponse> {
    let response = await this.http.post('/job/check', { jobid: jobId });
    return response.data;
  }

  // ── Make Searchable / Unsearchable ─────────────────────────────

  async makePdfSearchable(params: {
    url: string;
    lang?: string;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/makesearchable', params);
    return response.data;
  }

  async makePdfUnsearchable(params: {
    url: string;
    pages?: string;
    password?: string;
    name?: string;
  }): Promise<PdfCoFileResponse> {
    let response = await this.http.post('/pdf/makeunsearchable', params);
    return response.data;
  }
}
