import { createAxios } from 'slates';

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
  ErrorMessage: string;
  AvailablePages: number;
  ProcessedPages: number;
  OCRText: string[][];
  OutputFileUrl: string;
  OutputFileUrl2?: string;
  TaskDescription: string;
  Reserved: unknown[];
}

export interface AccountInfoResponse {
  AvailablePages: number;
  MaxPages: number;
  LastProcessingTime: string;
  SubcriptionPlan: string;
  ExpirationDate: string;
  ErrorMessage: string;
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
        .join(';');
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
      query.newline = 'true';
    }

    if (params.description) {
      query.description = params.description;
    }

    return query;
  }

  async processDocument(
    fileContent: string,
    fileName: string,
    params: OcrRequestParams
  ): Promise<OcrResponse> {
    let query = this.buildQueryParams(params);

    let fileBuffer = Buffer.from(fileContent, 'base64');

    let boundary = `----SlatesBoundary${Date.now()}`;

    let bodyParts: Buffer[] = [];

    let header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;

    bodyParts.push(Buffer.from(header, 'utf-8'));
    bodyParts.push(fileBuffer);

    let footer = `\r\n--${boundary}--\r\n`;

    bodyParts.push(Buffer.from(footer, 'utf-8'));

    let body = Buffer.concat(bodyParts);

    let response = await this.api.post<OcrResponse>('/processDocument', body, {
      params: query,
      auth: {
        username: this.username,
        password: this.licenseCode
      },
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Accept: 'application/json'
      }
    });

    if (response.data.ErrorMessage) {
      throw new Error(`OCR Web Service error: ${response.data.ErrorMessage}`);
    }

    return response.data;
  }

  async processDocumentFromUrl(
    fileUrl: string,
    params: OcrRequestParams
  ): Promise<OcrResponse> {
    let query = this.buildQueryParams(params);

    let response = await this.api.post<OcrResponse>('/processDocument', fileUrl, {
      params: query,
      auth: {
        username: this.username,
        password: this.licenseCode
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });

    if (response.data.ErrorMessage) {
      throw new Error(`OCR Web Service error: ${response.data.ErrorMessage}`);
    }

    return response.data;
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    let response = await this.api.get<AccountInfoResponse>('/getAccountInformation', {
      auth: {
        username: this.username,
        password: this.licenseCode
      },
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.data.ErrorMessage) {
      throw new Error(`OCR Web Service error: ${response.data.ErrorMessage}`);
    }

    return response.data;
  }
}
