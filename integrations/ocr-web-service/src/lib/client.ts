import { createAxios } from 'slates';
import { ocrWebServiceApiError, ocrWebServiceServiceError } from './errors';

export interface OcrRequestParams {
  language?: string | string[];
  pageRange?: string;
  convertToBlackWhite?: boolean;
  zones?: { top: number; left: number; height: number; width: number }[];
  outputFormats?: string[];
  getText?: boolean;
  getWords?: boolean;
  newline?: boolean;
  description?: string;
}

export interface OcrResponse {
  ErrorMessage?: string;
  OCRErrorMessage?: string;
  AvailablePages: number;
  ProcessedPages: number;
  OCRText: string[][];
  OutputFileUrl?: string;
  OutputFileUrl2?: string;
  TaskDescription: string;
  Reserved?: unknown[];
  OCRWords?: unknown[];
  OCRWSWords?: unknown[];
}

export interface AccountInfoResponse {
  AvailablePages: number;
  MaxPages: number;
  LastProcessingTime: string;
  SubcriptionPlan: string;
  ExpirationDate: string;
  ErrorMessage?: string;
  OCRErrorMessage?: string;
}

export interface DownloadedFile {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
}

export class Client {
  private username: string;
  private licenseCode: string;
  private api: ReturnType<typeof createAxios>;

  constructor(config: { username: string; licenseCode: string }) {
    this.username = config.username;
    this.licenseCode = config.licenseCode;
    this.api = createAxios({
      baseURL: 'https://www.ocrwebservice.com/restservices'
    });
  }

  private buildQueryParams(params: OcrRequestParams): Record<string, string> {
    let query: Record<string, string> = {};

    if (params.language) {
      let langs = Array.isArray(params.language) ? params.language : [params.language];
      query.language = langs.join(',');
    }

    if (params.pageRange) {
      query.pagerange = params.pageRange;
    }

    if (params.convertToBlackWhite) {
      query.tobw = 'true';
    }

    if (params.zones && params.zones.length > 0) {
      query.zone = params.zones
        .map(z => `${z.top}:${z.left}:${z.height}:${z.width}`)
        .join(',');
    }

    if (params.outputFormats && params.outputFormats.length > 0) {
      query.outputformat = params.outputFormats.join(',');
    }

    if (params.getText) {
      query.gettext = 'true';
    }

    if (params.getWords) {
      query.getwords = 'true';
    }

    if (params.newline) {
      query.newline = '1';
    }

    if (params.description) {
      query.description = params.description;
    }

    return query;
  }

  private assertSuccess<T extends OcrResponse | AccountInfoResponse>(
    data: T,
    operation: string
  ): T {
    let message = (data.ErrorMessage || data.OCRErrorMessage || '').trim();

    if (message) {
      let error = ocrWebServiceServiceError(
        `OCR Web Service API ${operation} failed: ${message}`
      );
      error.data.reason = 'ocr_web_service_api_error';
      throw error;
    }

    return data;
  }

  private decodeBase64File(fileContent: string) {
    let normalized = fileContent.replace(/\s+/g, '');

    if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw ocrWebServiceServiceError(
        'fileContent must be valid non-empty base64-encoded file content.'
      );
    }

    return Buffer.from(normalized, 'base64');
  }

  private async downloadUrl(
    url: string,
    operation: string
  ): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw ocrWebServiceApiError(error, operation);
    }

    if (!response.ok) {
      throw ocrWebServiceServiceError(
        `OCR Web Service ${operation} failed: HTTP ${response.status} ${response.statusText}`
      );
    }

    let buffer: Buffer;

    try {
      buffer = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw ocrWebServiceApiError(error, operation);
    }

    return {
      buffer,
      mimeType:
        response.headers.get('content-type')?.split(';')[0]?.trim() ||
        'application/octet-stream'
    };
  }

  private inferFileNameFromUrl(fileUrl: string) {
    try {
      let url = new URL(fileUrl);
      let fileName = url.pathname.split('/').filter(Boolean).pop();
      return fileName || 'document';
    } catch {
      return 'document';
    }
  }

  private async processDocumentBytes(
    fileBuffer: Buffer,
    params: OcrRequestParams
  ): Promise<OcrResponse> {
    let query = this.buildQueryParams(params);

    try {
      let response = await this.api.post<OcrResponse>('/processDocument', fileBuffer, {
        params: query,
        auth: {
          username: this.username,
          password: this.licenseCode
        },
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        }
      });

      return this.assertSuccess(response.data, 'process document');
    } catch (error) {
      throw ocrWebServiceApiError(error, 'process document');
    }
  }

  async processDocument(
    fileContent: string,
    fileName: string,
    params: OcrRequestParams
  ): Promise<OcrResponse> {
    if (!fileName.trim()) {
      throw ocrWebServiceServiceError('fileName is required when providing fileContent.');
    }

    return this.processDocumentBytes(this.decodeBase64File(fileContent), params);
  }

  async processDocumentFromUrl(
    fileUrl: string,
    fileName: string | undefined,
    params: OcrRequestParams
  ): Promise<OcrResponse> {
    let source = await this.downloadUrl(fileUrl, 'source file download');
    let resolvedFileName = fileName?.trim() || this.inferFileNameFromUrl(fileUrl);

    if (!resolvedFileName) {
      throw ocrWebServiceServiceError(
        'fileName could not be inferred from fileUrl. Provide fileName explicitly.'
      );
    }

    return this.processDocumentBytes(source.buffer, params);
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    try {
      let response = await this.api.get<AccountInfoResponse>('/getAccountInformation', {
        auth: {
          username: this.username,
          password: this.licenseCode
        },
        headers: {
          Accept: 'application/json'
        }
      });

      return this.assertSuccess(response.data, 'get account information');
    } catch (error) {
      throw ocrWebServiceApiError(error, 'get account information');
    }
  }

  async downloadOutputFile(
    outputFileUrl: string | undefined,
    fallbackMimeType = 'application/octet-stream'
  ): Promise<DownloadedFile> {
    if (!outputFileUrl) {
      throw ocrWebServiceServiceError(
        'OCR Web Service did not return an output file URL for the converted document.'
      );
    }

    let result = await this.downloadUrl(outputFileUrl, 'output file download');

    return {
      contentBase64: result.buffer.toString('base64'),
      mimeType:
        result.mimeType === 'application/octet-stream' ? fallbackMimeType : result.mimeType,
      byteLength: result.buffer.byteLength
    };
  }
}
