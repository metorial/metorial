import { createAxios } from 'slates';
import { api2PdfApiError, api2PdfServiceError } from './errors';
import type {
  AnyToPdfParams,
  Api2PdfFileAttachment,
  Api2PdfResponse,
  BarcodeParams,
  BaseRequestParams,
  ChromeImageOptions,
  ChromePdfOptions,
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

type Api2PdfRawResponse = Partial<Api2PdfResponse> & {
  ResponseId?: string;
  Success?: boolean;
  FileUrl?: string;
  MbOut?: number;
  Cost?: number;
  Seconds?: number;
  Error?: string;
};

let cleanObject = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;

let mapStorage = (storage: BaseRequestParams['storage']) => {
  if (!storage) return undefined;

  return cleanObject({
    Method: storage.method,
    Url: storage.url,
    ExtraHTTPHeaders: storage.extraHTTPHeaders
  });
};

let mapBaseRequest = (params: BaseRequestParams) =>
  cleanObject({
    FileName: params.fileName,
    Inline: params.inline,
    UseCustomStorage: params.useCustomStorage,
    Storage: mapStorage(params.storage)
  });

let mapChromePdfOptions = (options?: ChromePdfOptions) => {
  if (!options) return undefined;

  return cleanObject({
    Delay: options.delay,
    Scale: options.scale,
    DisplayHeaderFooter: options.displayHeaderFooter,
    HeaderTemplate: options.headerTemplate,
    FooterTemplate: options.footerTemplate,
    PrintBackground: options.printBackground,
    Landscape: options.landscape,
    PageRanges: options.pageRanges,
    Width: options.width,
    Height: options.height,
    MarginTop: options.marginTop,
    MarginBottom: options.marginBottom,
    MarginLeft: options.marginLeft,
    MarginRight: options.marginRight,
    PreferCSSPageSize: options.preferCSSPageSize,
    OmitBackground: options.omitBackground,
    Tagged: options.tagged,
    Outline: options.outline,
    UsePrintCss: options.usePrintCss,
    PuppeteerWaitForMethod: options.puppeteerWaitForMethod,
    PuppeteerWaitForValue: options.puppeteerWaitForValue
  });
};

let mapChromeImageOptions = (options?: ChromeImageOptions) => {
  if (!options) return undefined;

  return cleanObject({
    Delay: options.delay,
    FullPage: options.fullPage,
    ViewPortOptions: options.viewPortOptions
      ? cleanObject({
          Width: options.viewPortOptions.width,
          Height: options.viewPortOptions.height,
          IsMobile: options.viewPortOptions.isMobile,
          DeviceScaleFactor: options.viewPortOptions.deviceScaleFactor,
          IsLandscape: options.viewPortOptions.isLandscape,
          HasTouch: options.viewPortOptions.hasTouch
        })
      : undefined,
    PuppeteerWaitForMethod: options.puppeteerWaitForMethod,
    PuppeteerWaitForValue: options.puppeteerWaitForValue
  });
};

let stringValue = (value: unknown) =>
  typeof value === 'string'
    ? value
    : value === undefined || value === null
      ? ''
      : String(value);

let numberValue = (value: unknown) => {
  let parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

let normalizeApi2PdfResponse = (data: Api2PdfRawResponse): Api2PdfResponse => ({
  responseId: stringValue(data.responseId ?? data.ResponseId),
  success: data.success ?? data.Success ?? false,
  fileUrl: stringValue(data.fileUrl ?? data.FileUrl),
  mbOut: numberValue(data.mbOut ?? data.MbOut),
  cost: numberValue(data.cost ?? data.Cost),
  seconds: numberValue(data.seconds ?? data.Seconds),
  error: data.error ?? data.Error
});

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

  private async postFile(
    path: string,
    params: Record<string, unknown>,
    operation: string
  ): Promise<Api2PdfResponse> {
    try {
      let res = await this.axios.post<Api2PdfRawResponse>(path, cleanObject(params));
      return normalizeApi2PdfResponse(res.data);
    } catch (error) {
      throw api2PdfApiError(error, operation);
    }
  }

  private async getFile(
    path: string,
    params: Record<string, unknown>,
    operation: string
  ): Promise<Api2PdfResponse> {
    try {
      let res = await this.axios.get<Api2PdfRawResponse>(path, {
        params: cleanObject(params)
      });
      return normalizeApi2PdfResponse(res.data);
    } catch (error) {
      throw api2PdfApiError(error, operation);
    }
  }

  // --- Chrome PDF Endpoints ---

  async chromeHtmlToPdf(params: HtmlToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/pdf/html',
      {
        ...mapBaseRequest(params),
        Html: params.html,
        Options: mapChromePdfOptions(params.options)
      },
      'Chrome HTML to PDF'
    );
  }

  async chromeUrlToPdf(params: UrlToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/pdf/url',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        Options: mapChromePdfOptions(params.options),
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'Chrome URL to PDF'
    );
  }

  async chromeMarkdownToPdf(params: MarkdownToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/pdf/markdown',
      {
        ...mapBaseRequest(params),
        Markdown: params.markdown,
        Options: mapChromePdfOptions(params.options)
      },
      'Chrome Markdown to PDF'
    );
  }

  // --- Chrome Image Endpoints ---

  async chromeHtmlToImage(params: HtmlToImageParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/image/html',
      {
        ...mapBaseRequest(params),
        Html: params.html,
        Options: mapChromeImageOptions(params.options)
      },
      'Chrome HTML to image'
    );
  }

  async chromeUrlToImage(params: UrlToImageParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/image/url',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        Options: mapChromeImageOptions(params.options),
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'Chrome URL to image'
    );
  }

  async chromeMarkdownToImage(params: MarkdownToImageParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/chrome/image/markdown',
      {
        ...mapBaseRequest(params),
        Markdown: params.markdown,
        Options: mapChromeImageOptions(params.options)
      },
      'Chrome Markdown to image'
    );
  }

  // --- LibreOffice Endpoints ---

  async libreOfficeAnyToPdf(params: AnyToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/libreoffice/any-to-pdf',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'LibreOffice file to PDF'
    );
  }

  async libreOfficeThumbnail(params: ThumbnailParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/libreoffice/thumbnail',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'LibreOffice thumbnail'
    );
  }

  async libreOfficeHtmlToDocx(params: HtmlToDocxParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/libreoffice/html-to-docx',
      {
        ...mapBaseRequest(params),
        Html: params.html,
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'LibreOffice HTML to DOCX'
    );
  }

  async libreOfficeHtmlToXlsx(params: HtmlToXlsxParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/libreoffice/html-to-xlsx',
      {
        ...mapBaseRequest(params),
        Html: params.html,
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'LibreOffice HTML to XLSX'
    );
  }

  // --- PdfSharp Endpoints ---

  async pdfSharpMerge(params: MergePdfsParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/pdfsharp/merge',
      {
        ...mapBaseRequest(params),
        Urls: params.urls,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'PdfSharp merge'
    );
  }

  async pdfSharpPassword(params: PasswordPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/pdfsharp/password',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        UserPassword: params.userpassword,
        OwnerPassword: params.ownerpassword,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'PdfSharp password'
    );
  }

  async pdfSharpExtractPages(params: ExtractPagesParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/pdfsharp/extract-pages',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        Start: params.start,
        End: params.end,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'PdfSharp extract pages'
    );
  }

  async pdfSharpWatermark(params: WatermarkPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/pdfsharp/watermark',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        Text: params.text,
        FontSize: params.fontSize,
        Color: params.color,
        Opacity: params.opacity,
        Rotation: params.rotation,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'PdfSharp watermark'
    );
  }

  // --- Barcode Endpoint ---

  async generateBarcode(params: BarcodeParams): Promise<Api2PdfResponse> {
    return await this.getFile(
      '/zebra',
      {
        format: params.format,
        value: params.value,
        width: params.width,
        height: params.height,
        showlabel: params.showlabel,
        outputBinary: false
      },
      'barcode generation'
    );
  }

  // --- Zip Endpoint ---

  async createZip(params: ZipParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/zip',
      {
        ...mapBaseRequest(params),
        Files: params.files.map(file =>
          cleanObject({
            Url: file.url,
            FileName: file.fileName
          })
        ),
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'ZIP archive creation'
    );
  }

  // --- Markitdown Endpoint ---

  async convertToMarkdown(params: MarkitdownParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/markitdown',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'MarkItDown conversion'
    );
  }

  // --- OpenDataLoader Endpoints ---

  async extractJsonFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/opendataloader/json',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'OpenDataLoader JSON extraction'
    );
  }

  async extractMarkdownFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/opendataloader/markdown',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'OpenDataLoader Markdown extraction'
    );
  }

  async extractHtmlFromPdf(params: DataLoaderParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/opendataloader/html',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'OpenDataLoader HTML extraction'
    );
  }

  // --- Wkhtml Endpoints ---

  async wkhtmlHtmlToPdf(params: WkhtmlHtmlToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/wkhtml/pdf/html',
      {
        ...mapBaseRequest(params),
        Html: params.html,
        Options: params.options,
        EnableToc: params.enableToc,
        TocOptions: params.tocOptions
      },
      'wkhtml HTML to PDF'
    );
  }

  async wkhtmlUrlToPdf(params: WkhtmlUrlToPdfParams): Promise<Api2PdfResponse> {
    return await this.postFile(
      '/wkhtml/pdf/url',
      {
        ...mapBaseRequest(params),
        Url: params.url,
        Options: params.options,
        EnableToc: params.enableToc,
        TocOptions: params.tocOptions,
        ExtraHTTPHeaders: params.extraHTTPHeaders
      },
      'wkhtml URL to PDF'
    );
  }

  // --- Utility Endpoints ---

  async deleteFile(responseId: string): Promise<void> {
    try {
      await this.axios.delete(`/file/${responseId}`);
    } catch (error) {
      throw api2PdfApiError(error, 'file deletion');
    }
  }

  async getBalance(): Promise<{ balance: number }> {
    try {
      let res = await this.axios.get<{ balance?: number; Balance?: number }>('/balance');
      return {
        balance: numberValue(res.data.balance ?? res.data.Balance)
      };
    } catch (error) {
      throw api2PdfApiError(error, 'balance check');
    }
  }

  async getStatus(): Promise<{ status: string }> {
    try {
      let res = await this.axios.get<{ status?: string; Status?: string }>('/status');
      return {
        status: stringValue(res.data.status ?? res.data.Status) || 'unknown'
      };
    } catch (error) {
      throw api2PdfApiError(error, 'status check');
    }
  }

  async downloadFile(fileUrl: string): Promise<Api2PdfFileAttachment> {
    let response: globalThis.Response;

    try {
      response = await fetch(fileUrl);
    } catch (error) {
      throw api2PdfApiError(error, 'generated file download');
    }

    if (!response.ok) {
      throw api2PdfServiceError(
        `API2PDF generated file download failed: HTTP ${response.status} ${response.statusText}`
      );
    }

    let contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
    let bytes: Buffer;

    try {
      bytes = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw api2PdfApiError(error, 'generated file download');
    }

    return {
      contentBase64: bytes.toString('base64'),
      mimeType: contentType || 'application/octet-stream',
      byteLength: bytes.byteLength
    };
  }
}
