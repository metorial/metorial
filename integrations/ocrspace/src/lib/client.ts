import { createAxios } from 'slates';

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
  FileParseExitCode: number;
  ParsedText: string;
  ErrorMessage: string | null;
  ErrorDetails: string | null;
}

interface RawOcrResponse {
  ParsedResults: RawParsedResult[];
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string[] | string | null;
  ErrorDetails: string | null;
  SearchablePDFURL: string | null;
  ProcessingTimeInMilliseconds: number;
}

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
  fileParseExitCode: result.FileParseExitCode,
  parsedText: result.ParsedText,
  errorMessage: result.ErrorMessage,
  errorDetails: result.ErrorDetails
});

let normalizeResponse = (raw: RawOcrResponse): OcrResponse => {
  let errorMessage = raw.ErrorMessage;
  let errorMessageStr = Array.isArray(errorMessage) ? errorMessage.join('; ') : errorMessage;

  return {
    parsedResults: (raw.ParsedResults || []).map(normalizeParsedResult),
    ocrExitCode: raw.OCRExitCode,
    isErroredOnProcessing: raw.IsErroredOnProcessing,
    errorMessage: errorMessageStr,
    errorDetails: raw.ErrorDetails,
    searchablePdfUrl: raw.SearchablePDFURL || null,
    processingTimeInMilliseconds: raw.ProcessingTimeInMilliseconds
  };
};

export class Client {
  private axios;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.ocr.space',
      headers: {
        apikey: opts.token
      }
    });
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

    let response = await this.axios.post('/parse/image', formData);
    let raw = response.data as RawOcrResponse;

    if (raw.IsErroredOnProcessing || raw.OCRExitCode === 3 || raw.OCRExitCode === 4) {
      let errorMsg = raw.ErrorMessage
        ? Array.isArray(raw.ErrorMessage)
          ? raw.ErrorMessage.join('; ')
          : raw.ErrorMessage
        : 'OCR processing failed';
      throw new Error(errorMsg);
    }

    return normalizeResponse(raw);
  }
}
