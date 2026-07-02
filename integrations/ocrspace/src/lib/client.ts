import { Buffer } from 'node:buffer';
import { createAxios, getResponseHeaderValue } from 'slates';
import { ocrspaceApiError, ocrspaceUpstreamError } from './errors';

export interface OcrParseOptions {
  url?: string;
  base64Image?: string;
  language?: string;
  ocrEngine?: 1 | 2 | 3;
  isOverlayRequired?: boolean;
  detectOrientation?: boolean;
  scale?: boolean;
  isTable?: boolean;
  filetype?: string;
  isCreateSearchablePdf?: boolean;
  isSearchablePdfHideTextLayer?: boolean;
}

export interface TextOverlayWord {
  wordText: string;
  left: number;
  top: number;
  height: number;
  width: number;
}

export interface TextOverlayLine {
  words: TextOverlayWord[];
  maxHeight: number;
  minTop: number;
}

export interface TextOverlay {
  lines: TextOverlayLine[];
  hasOverlay: boolean;
  message: string | null;
}

export interface ParsedResult {
  textOverlay: TextOverlay | null;
  fileParseExitCode: number;
  parsedText: string;
  errorMessage: string | null;
  errorDetails: string | null;
}

export interface OcrResponse {
  parsedResults: ParsedResult[];
  ocrExitCode: number;
  isErroredOnProcessing: boolean;
  errorMessage: string | null;
  errorDetails: string | null;
  searchablePdfUrl: string | null;
  processingTimeInMilliseconds: number;
}

export interface DownloadedFile {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
}

interface RawTextOverlayWord {
  WordText: string;
  Left: number;
  Top: number;
  Height: number;
  Width: number;
}

interface RawTextOverlayLine {
  Words: RawTextOverlayWord[];
  MaxHeight: number;
  MinTop: number;
}

interface RawTextOverlay {
  Lines: RawTextOverlayLine[];
  HasOverlay: boolean;
  Message: string | null;
}

interface RawParsedResult {
  TextOverlay: RawTextOverlay | null;
  FileParseExitCode: number | string;
  ParsedText: string | null;
  ErrorMessage: string[] | string | null;
  ErrorDetails: string | null;
}

interface RawOcrResponse {
  ParsedResults: RawParsedResult[];
  OCRExitCode: number | string;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string[] | string | null;
  ErrorDetails: string | null;
  SearchablePDFURL: string | null;
  ProcessingTimeInMilliseconds: number | string;
}

let toNumber = (value: number | string | null | undefined, fallback = 0) => {
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

let normalizeErrorMessage = (value: string[] | string | null | undefined) => {
  if (Array.isArray(value)) {
    let joined = value.filter(Boolean).join('; ');
    return joined || null;
  }

  return value || null;
};

let toBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value);
  return Buffer.alloc(0);
};

let normalizeOverlayWord = (word: RawTextOverlayWord): TextOverlayWord => ({
  wordText: word.WordText,
  left: word.Left,
  top: word.Top,
  height: word.Height,
  width: word.Width
});

let normalizeOverlayLine = (line: RawTextOverlayLine): TextOverlayLine => ({
  words: (line.Words || []).map(normalizeOverlayWord),
  maxHeight: line.MaxHeight,
  minTop: line.MinTop
});

let normalizeOverlay = (overlay: RawTextOverlay | null): TextOverlay | null => {
  if (!overlay) return null;
  return {
    lines: (overlay.Lines || []).map(normalizeOverlayLine),
    hasOverlay: overlay.HasOverlay,
    message: overlay.Message
  };
};

let normalizeParsedResult = (result: RawParsedResult): ParsedResult => ({
  textOverlay: normalizeOverlay(result.TextOverlay),
  fileParseExitCode: toNumber(result.FileParseExitCode),
  parsedText: result.ParsedText || '',
  errorMessage: normalizeErrorMessage(result.ErrorMessage),
  errorDetails: result.ErrorDetails
});

let normalizeResponse = (raw: RawOcrResponse): OcrResponse => {
  return {
    parsedResults: (raw.ParsedResults || []).map(normalizeParsedResult),
    ocrExitCode: toNumber(raw.OCRExitCode),
    isErroredOnProcessing: raw.IsErroredOnProcessing,
    errorMessage: normalizeErrorMessage(raw.ErrorMessage),
    errorDetails: raw.ErrorDetails,
    searchablePdfUrl: raw.SearchablePDFURL || null,
    processingTimeInMilliseconds: toNumber(raw.ProcessingTimeInMilliseconds)
  };
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private downloadAxios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.ocr.space',
      headers: {
        apikey: opts.token
      }
    });
    this.downloadAxios = createAxios({});
  }

  async parseImage(options: OcrParseOptions): Promise<OcrResponse> {
    let formData = new FormData();

    if (options.url) {
      formData.append('url', options.url);
    }
    if (options.base64Image) {
      formData.append('base64Image', options.base64Image);
    }
    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.ocrEngine !== undefined) {
      formData.append('OCREngine', String(options.ocrEngine));
    }
    if (options.isOverlayRequired !== undefined) {
      formData.append('isOverlayRequired', String(options.isOverlayRequired));
    }
    if (options.detectOrientation !== undefined) {
      formData.append('detectOrientation', String(options.detectOrientation));
    }
    if (options.scale !== undefined) {
      formData.append('scale', String(options.scale));
    }
    if (options.isTable !== undefined) {
      formData.append('isTable', String(options.isTable));
    }
    if (options.filetype) {
      formData.append('filetype', options.filetype);
    }
    if (options.isCreateSearchablePdf !== undefined) {
      formData.append('isCreateSearchablePdf', String(options.isCreateSearchablePdf));
    }
    if (options.isSearchablePdfHideTextLayer !== undefined) {
      formData.append(
        'isSearchablePdfHideTextLayer',
        String(options.isSearchablePdfHideTextLayer)
      );
    }

    let raw: RawOcrResponse;
    try {
      let response = await this.axios.post('/parse/image', formData);
      raw = response.data as RawOcrResponse;
    } catch (error) {
      throw ocrspaceApiError(error, 'parse image');
    }

    let ocrExitCode = toNumber(raw.OCRExitCode);
    if (raw.IsErroredOnProcessing || ocrExitCode === 3 || ocrExitCode === 4) {
      let errorMsg = normalizeErrorMessage(raw.ErrorMessage) || 'OCR processing failed';
      throw ocrspaceUpstreamError(errorMsg, {
        reason: 'ocrspace_processing_error'
      });
    }

    return normalizeResponse(raw);
  }

  async downloadFile(url: string, fallbackMimeType = 'application/octet-stream') {
    try {
      let response = await this.downloadAxios.get(url, {
        responseType: 'arraybuffer'
      });
      let content = toBuffer(response.data);
      let mimeType =
        getResponseHeaderValue(response.headers, 'content-type') || fallbackMimeType;

      return {
        contentBase64: content.toString('base64'),
        mimeType,
        byteLength: content.byteLength
      };
    } catch (error) {
      throw ocrspaceApiError(error, 'download file');
    }
  }
}
