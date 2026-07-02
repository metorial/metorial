export interface Api2PdfResponse {
  responseId: string;
  success: boolean;
  fileUrl: string;
  mbOut: number;
  cost: number;
  seconds: number;
  error?: string;
}

export interface ChromePdfOptions {
  delay?: number;
  scale?: number;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  landscape?: boolean;
  pageRanges?: string;
  width?: string;
  height?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  preferCSSPageSize?: boolean;
  omitBackground?: boolean;
  tagged?: boolean;
  outline?: boolean;
  usePrintCss?: boolean;
  puppeteerWaitForMethod?: string;
  puppeteerWaitForValue?: string;
}

export interface ChromeImageOptions {
  delay?: number;
  fullPage?: boolean;
  viewPortOptions?: {
    width?: number;
    height?: number;
    isMobile?: boolean;
    deviceScaleFactor?: number;
    isLandscape?: boolean;
    hasTouch?: boolean;
  };
}

export interface StorageOptions {
  method?: string;
  url: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface BaseRequestParams {
  inline?: boolean;
  fileName?: string;
  useCustomStorage?: boolean;
  storage?: StorageOptions;
}

export interface HtmlToPdfParams extends BaseRequestParams {
  html: string;
  options?: ChromePdfOptions;
}

export interface UrlToPdfParams extends BaseRequestParams {
  url: string;
  options?: ChromePdfOptions;
  extraHTTPHeaders?: Record<string, string>;
}

export interface MarkdownToPdfParams extends BaseRequestParams {
  markdown: string;
  options?: ChromePdfOptions;
}

export interface HtmlToImageParams extends BaseRequestParams {
  html: string;
  options?: ChromeImageOptions;
}

export interface UrlToImageParams extends BaseRequestParams {
  url: string;
  options?: ChromeImageOptions;
  extraHTTPHeaders?: Record<string, string>;
}

export interface MarkdownToImageParams extends BaseRequestParams {
  markdown: string;
  options?: ChromeImageOptions;
}

export interface AnyToPdfParams extends BaseRequestParams {
  url: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface ThumbnailParams extends BaseRequestParams {
  url: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface HtmlToDocxParams extends BaseRequestParams {
  html?: string;
  url?: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface HtmlToXlsxParams extends BaseRequestParams {
  html?: string;
  url?: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface MergePdfsParams extends BaseRequestParams {
  urls: string[];
  extraHTTPHeaders?: Record<string, string>;
}

export interface PasswordPdfParams extends BaseRequestParams {
  url: string;
  userpassword: string;
  ownerpassword?: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface ExtractPagesParams extends BaseRequestParams {
  url: string;
  start?: number;
  end?: number;
  extraHTTPHeaders?: Record<string, string>;
}

export interface WatermarkPdfParams extends BaseRequestParams {
  url: string;
  text?: string;
  fontSize?: number;
  color?: string;
  opacity?: number;
  rotation?: number;
  extraHTTPHeaders?: Record<string, string>;
}

export interface BarcodeParams {
  format: string;
  value: string;
  width?: number;
  height?: number;
  showlabel?: boolean;
}

export interface ZipFileEntry {
  url: string;
  fileName?: string;
}

export interface ZipParams extends BaseRequestParams {
  files: ZipFileEntry[];
  extraHTTPHeaders?: Record<string, string>;
}

export interface MarkitdownParams extends BaseRequestParams {
  url: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface DataLoaderParams extends BaseRequestParams {
  url: string;
  extraHTTPHeaders?: Record<string, string>;
}

export interface WkhtmlToPdfOptions {
  [key: string]: unknown;
}

export interface WkhtmlHtmlToPdfParams extends BaseRequestParams {
  html: string;
  options?: WkhtmlToPdfOptions;
  enableToc?: boolean;
  tocOptions?: Record<string, unknown>;
}

export interface WkhtmlUrlToPdfParams extends BaseRequestParams {
  url: string;
  options?: WkhtmlToPdfOptions;
  enableToc?: boolean;
  tocOptions?: Record<string, unknown>;
  extraHTTPHeaders?: Record<string, string>;
}
