import { createAxios } from 'slates';
import type {
  AnyToPdfParams,
  Api2PdfResponse,
  BarcodeParams,
  DataLoaderParams,
  ExtractPagesParams,
  HtmlToDocxParams,
  HtmlToImageParams,
  HtmlToPdfParams,
  HtmlToXlsxParams,
  MarkdownToImageParams,
  MarkdownToPdfParams,
  MarkitdownParams,
  MergePdfsParams,
  PasswordPdfParams,
  ThumbnailParams,
  UrlToImageParams,
  UrlToPdfParams,
  WatermarkPdfParams,
  WkhtmlHtmlToPdfParams,
  WkhtmlUrlToPdfParams,
  ZipParams
} from './types';

export class Api2PdfClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; useXlCluster?: boolean }) {
    let baseURL = config.useXlCluster ? 'https://v2-xl.api2pdf.com' : 'https://v2.api2pdf.com';

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Chrome PDF Endpoints ---

  async chromeHtmlToPdf(params: HtmlToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/pdf/html', params);
    return res.data;
  }

  async chromeUrlToPdf(params: UrlToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/pdf/url', params);
    return res.data;
  }

  async chromeMarkdownToPdf(params: MarkdownToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/pdf/markdown', params);
    return res.data;
  }

  // --- Chrome Image Endpoints ---

  async chromeHtmlToImage(params: HtmlToImageParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/image/html', params);
    return res.data;
  }

  async chromeUrlToImage(params: UrlToImageParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/image/url', params);
    return res.data;
  }

  async chromeMarkdownToImage(params: MarkdownToImageParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/chrome/image/markdown', params);
    return res.data;
  }

  // --- LibreOffice Endpoints ---

  async libreOfficeAnyToPdf(params: AnyToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/libreoffice/any-to-pdf', params);
    return res.data;
  }

  async libreOfficeThumbnail(params: ThumbnailParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/libreoffice/thumbnail', params);
    return res.data;
  }

  async libreOfficeHtmlToDocx(params: HtmlToDocxParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/libreoffice/html-to-docx', params);
    return res.data;
  }

  async libreOfficeHtmlToXlsx(params: HtmlToXlsxParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/libreoffice/html-to-xlsx', params);
    return res.data;
  }

  // --- PdfSharp Endpoints ---

  async pdfSharpMerge(params: MergePdfsParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/pdfsharp/merge', params);
    return res.data;
  }

  async pdfSharpPassword(params: PasswordPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/pdfsharp/password', params);
    return res.data;
  }

  async pdfSharpExtractPages(params: ExtractPagesParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/pdfsharp/extract-pages', params);
    return res.data;
  }

  async pdfSharpWatermark(params: WatermarkPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/pdfsharp/watermark', params);
    return res.data;
  }

  // --- Barcode Endpoint ---

  async generateBarcode(params: BarcodeParams): Promise<Api2PdfResponse> {
    let res = await this.axios.get<Api2PdfResponse>('/zebra', {
      params: {
        format: params.format,
        value: params.value,
        ...(params.width !== undefined && { width: params.width }),
        ...(params.height !== undefined && { height: params.height }),
        ...(params.showlabel !== undefined && { showlabel: params.showlabel }),
        outputBinary: false
      }
    });
    return res.data;
  }

  // --- Zip Endpoint ---

  async createZip(params: ZipParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/zip', params, {
      params: { outputBinary: false }
    });
    return res.data;
  }

  // --- Markitdown Endpoint ---

  async convertToMarkdown(params: MarkitdownParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/markitdown', params);
    return res.data;
  }

  // --- OpenDataLoader Endpoints ---

  async extractJsonFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/opendataloader/json', params);
    return res.data;
  }

  async extractMarkdownFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/opendataloader/markdown', params);
    return res.data;
  }

  async extractHtmlFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/opendataloader/html', params);
    return res.data;
  }

  // --- Wkhtml Endpoints ---

  async wkhtmlHtmlToPdf(params: WkhtmlHtmlToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/wkhtml/pdf/html', params);
    return res.data;
  }

  async wkhtmlUrlToPdf(params: WkhtmlUrlToPdfParams): Promise<Api2PdfResponse> {
    let res = await this.axios.post<Api2PdfResponse>('/wkhtml/pdf/url', params);
    return res.data;
  }

  // --- Utility Endpoints ---

  async deleteFile(responseId: string): Promise<void> {
    await this.axios.delete(`/file/${responseId}`);
  }

  async getBalance(): Promise<{ balance: number }> {
    let res = await this.axios.get<{ balance: number }>('/balance');
    return res.data;
  }

  async getStatus(): Promise<{ status: string }> {
    let res = await this.axios.get<{ status: string }>('/status');
    return res.data;
  }
}
