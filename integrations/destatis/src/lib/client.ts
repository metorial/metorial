import { createAxios, getResponseHeaderValue } from 'slates';
import { destatisSecureApiError, destatisValidationError } from './errors';
import {
  flattenGenesisCatalog,
  type NormalizeGenesisOptions,
  normalizeGenesisResponse
} from './response';
import { encodeContents, encodeSelections } from './selections';
import type {
  GenesisCatalogItem,
  GenesisCubeDownloadParams,
  GenesisFile,
  GenesisLanguage,
  GenesisLoginProfile,
  GenesisMetadataObjectType,
  GenesisMetadataParams,
  GenesisResponse,
  GenesisSearchParams,
  GenesisTableDownloadParams,
  GenesisTableFormat,
  GenesisVariableValuesParams
} from './types';

export let GENESIS_BASE_URL = 'https://genesis.destatis.de/genesisWS/rest/2020';

type RecordValue = Record<string, unknown>;

let isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let append = (
  form: URLSearchParams,
  name: string,
  value: string | number | boolean | undefined
) => {
  if (value !== undefined) form.set(name, String(value));
};

let categoryValues = {
  all: 'all',
  cube: 'cubes',
  statistic: 'statistics',
  table: 'tables',
  time_series: 'time series',
  variable: 'variables'
} as const;

let sortValues = {
  content: 'Inhalt',
  code: 'Code'
} as const;

let metadataPaths: Record<GenesisMetadataObjectType, string> = {
  table: 'table',
  cube: 'cube',
  statistic: 'statistic',
  time_series: 'timeseries',
  variable: 'variable',
  value: 'value'
};

let asBuffer = (value: unknown): Buffer => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value);
  throw destatisValidationError('Destatis GENESIS-Online returned an invalid file response.');
};

let normalizedMimeType = (headers: unknown, fallback: string) =>
  (
    getResponseHeaderValue(headers, 'content-type')?.split(';')[0]?.trim() || fallback
  ).toLowerCase();

let hasJsonPrefix = (buffer: Buffer) => {
  let prefix = buffer
    .subarray(0, 64)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  return prefix.startsWith('{') || prefix.startsWith('[');
};

let parseJsonBuffer = (buffer: Buffer): unknown | undefined => {
  try {
    return JSON.parse(buffer.toString('utf8')) as unknown;
  } catch {
    return undefined;
  }
};

let hasZipSignature = (buffer: Buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x50 &&
  buffer[1] === 0x4b &&
  ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
    (buffer[2] === 0x05 && buffer[3] === 0x06) ||
    (buffer[2] === 0x07 && buffer[3] === 0x08));

let decodeTextFile = (buffer: Buffer): string | undefined => {
  let text: string;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = buffer.subarray(2).toString('utf16le');
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    let body = buffer.subarray(2);
    if (body.length % 2 !== 0) return undefined;
    let littleEndian = Buffer.allocUnsafe(body.length);
    for (let index = 0; index < body.length; index += 2) {
      littleEndian[index] = body[index + 1] ?? 0;
      littleEndian[index + 1] = body[index] ?? 0;
    }
    text = littleEndian.toString('utf16le');
  } else {
    if (buffer.includes(0)) return undefined;
    text = buffer.toString('utf8');
    if (text.includes('\uFFFD')) {
      text = new TextDecoder('windows-1252').decode(buffer);
    }
  }

  let hasDisallowedControl = [...text].some(character => {
    let code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
  return hasDisallowedControl ? undefined : text.replace(/^\uFEFF/, '');
};

let startsLikeHtml = (text: string) =>
  /^(?:<\?xml[^>]*>\s*)?(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(text.trimStart());

let startsLikeXml = (text: string) => {
  let start = text.trimStart();
  return (
    !startsLikeHtml(start) &&
    /^(?:<\?xml[^>]*>\s*)?<[A-Za-z_][A-Za-z0-9_.:-]*(?:\s|>|\/)/.test(start)
  );
};

let validateZipFile = (buffer: Buffer, operation: string) => {
  if (!hasZipSignature(buffer)) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned a corrupt or unexpected file instead of a ZIP document.`
    );
  }
};

let validateCsvFile = (buffer: Buffer, mimeType: string, operation: string) => {
  let text = decodeTextFile(buffer);
  let explicitCsvMime = new Set([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel'
  ]).has(mimeType);
  let genericTextMime = mimeType === 'text/plain' || mimeType === 'application/octet-stream';
  let start = text?.trimStart() ?? '';
  let looksLikeStructuredError =
    startsLikeHtml(start) ||
    startsLikeXml(start) ||
    start.startsWith('{') ||
    start.startsWith('[');
  let hasCsvStructure = /[,;\t\r\n]/.test(text ?? '');
  if (
    text === undefined ||
    text.trim().length === 0 ||
    looksLikeStructuredError ||
    (!explicitCsvMime && (!genericTextMime || !hasCsvStructure))
  ) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned data that is not a valid CSV file.`
    );
  }
};

let validateHtmlFile = (buffer: Buffer, mimeType: string, operation: string) => {
  let text = decodeTextFile(buffer);
  let compatibleMime =
    mimeType === 'text/html' ||
    mimeType === 'application/xhtml+xml' ||
    mimeType === 'application/octet-stream';
  if (!text || !compatibleMime || !startsLikeHtml(text)) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned data that is not a valid HTML file.`
    );
  }
};

let validateGenmlFile = (buffer: Buffer, mimeType: string, operation: string) => {
  let text = decodeTextFile(buffer);
  let compatibleMime = new Set([
    'application/xml',
    'text/xml',
    'application/genml+xml',
    'application/octet-stream',
    'text/plain'
  ]).has(mimeType);
  if (!text || !compatibleMime || !startsLikeXml(text)) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned data that is not a valid GENML/XML file.`
    );
  }
};

let safeFilename = (disposition: string | undefined, fallback: string) => {
  let encoded = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  let quoted = disposition?.match(/filename\s*=\s*"([^"]+)"/i)?.[1];
  let bare = disposition?.match(/filename\s*=\s*([^;]+)/i)?.[1];
  let decoded: string | undefined;
  if (encoded) {
    try {
      decoded = decodeURIComponent(encoded.trim());
    } catch {
      decoded = undefined;
    }
  }
  let candidate = decoded ?? (quoted ?? bare)?.trim();
  let leaf = (candidate ?? fallback).replaceAll('\\', '/').split('/').pop() ?? fallback;
  let cleaned = [...leaf]
    .filter(character => {
      let code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .replace(/^\.+/, '')
    .trim();
  return cleaned || fallback;
};

let canonicalFilename = (
  disposition: string | undefined,
  fallback: string,
  canonicalExtension: string
) => {
  let candidate = safeFilename(disposition, fallback);
  let lastDot = candidate.lastIndexOf('.');
  let stem = (lastDot > 0 ? candidate.slice(0, lastDot) : candidate)
    .replace(/[.\s]+$/g, '')
    .trim();
  if (!stem) {
    let fallbackDot = fallback.lastIndexOf('.');
    stem = fallbackDot > 0 ? fallback.slice(0, fallbackDot) : fallback;
  }
  let maximumStemCharacters = Math.max(1, 120 - canonicalExtension.length - 1);
  let boundedStem = [...stem].slice(0, maximumStemCharacters).join('');
  return `${boundedStem}.${canonicalExtension}`;
};

let zippedTableFormats = new Set<GenesisTableFormat>(['csv', 'datencsv', 'ffcsv']);

let tableFallbackMime = (format: GenesisTableFormat | undefined) => {
  if (!format || zippedTableFormats.has(format)) return 'application/zip';
  if (format === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (format === 'html') return 'text/html';
  return 'application/xml';
};

let tableFallbackName = (code: string, format: GenesisTableFormat | undefined) => {
  if (!format || zippedTableFormats.has(format)) return `${code}.zip`;
  return `${code}.${format === 'genml' ? 'xml' : format}`;
};

let tableExtension = (format: GenesisTableFormat) => {
  if (zippedTableFormats.has(format)) return 'zip';
  return format === 'genml' ? 'xml' : format;
};

let canonicalTableMime = (format: GenesisTableFormat | undefined, responseMime: string) => {
  if (!format || zippedTableFormats.has(format)) return 'application/zip';
  if (format === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return responseMime;
};

export class GenesisClient {
  private readonly http: ReturnType<typeof createAxios>;
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
    this.http = createAxios({
      baseURL: GENESIS_BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        password: '',
        username: token
      }
    });
  }

  private async postJson(path: string, form: URLSearchParams, operation: string) {
    try {
      let response = await this.http.post(path, form);
      return response.data as unknown;
    } catch (error) {
      throw destatisSecureApiError(error, this.token, operation);
    }
  }

  private normalizeJson<T>(
    response: unknown,
    options: NormalizeGenesisOptions<T>
  ): GenesisResponse<T> {
    try {
      return normalizeGenesisResponse(response, options);
    } catch (error) {
      throw destatisSecureApiError(error, this.token, options.operation);
    }
  }

  private async postFile(
    path: string,
    form: URLSearchParams,
    operation: string,
    options: {
      fallbackMimeType: string;
      fallbackFileName: string;
      canonicalExtension: string;
      validate: (buffer: Buffer, responseMimeType: string) => void;
      resolveMimeType?: (responseMimeType: string) => string;
      isArchive: (mimeType: string) => boolean;
    }
  ): Promise<GenesisFile> {
    try {
      let response = await this.http.post(path, form, { responseType: 'arraybuffer' });
      let buffer = asBuffer(response.data);
      if (buffer.byteLength === 0) {
        throw destatisValidationError(
          `Destatis GENESIS-Online API ${operation} returned an empty file.`
        );
      }
      let responseMimeType = normalizedMimeType(response.headers, options.fallbackMimeType);
      let declaredJson = responseMimeType.includes('json');
      if (declaredJson || hasJsonPrefix(buffer)) {
        let parsed = parseJsonBuffer(buffer);
        if (parsed !== undefined) {
          normalizeGenesisResponse(parsed, { operation });
          throw destatisValidationError(
            `Destatis GENESIS-Online API ${operation} returned JSON instead of a file.`
          );
        }
        if (declaredJson) {
          throw destatisValidationError(
            `Destatis GENESIS-Online API ${operation} returned malformed JSON instead of a file.`
          );
        }
      }

      options.validate(buffer, responseMimeType);
      let disposition = getResponseHeaderValue(response.headers, 'content-disposition');
      let mimeType = options.resolveMimeType?.(responseMimeType) ?? responseMimeType;
      return {
        contentBase64: buffer.toString('base64'),
        mimeType,
        byteLength: buffer.byteLength,
        fileName: canonicalFilename(
          disposition,
          options.fallbackFileName,
          options.canonicalExtension
        ),
        isArchive: options.isArchive(mimeType)
      };
    } catch (error) {
      throw destatisSecureApiError(error, this.token, operation);
    }
  }

  async loginCheck(language: GenesisLanguage): Promise<GenesisLoginProfile> {
    let form = new URLSearchParams();
    append(form, 'language', language);
    let response = await this.postJson('/helloworld/logincheck', form, 'validate credentials');

    if (
      !isRecord(response) ||
      typeof response.Status !== 'string' ||
      typeof response.Username !== 'string' ||
      !response.Username.trim()
    ) {
      throw destatisValidationError(
        'Destatis GENESIS-Online returned an invalid login-check response.'
      );
    }

    return { username: response.Username.trim() };
  }

  async searchCatalog(
    params: GenesisSearchParams
  ): Promise<GenesisResponse<GenesisCatalogItem[]>> {
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'term', params.searchTerm);
    append(form, 'category', params.category ? categoryValues[params.category] : undefined);
    append(form, 'pagelength', params.pageLength);
    let response = await this.postJson('/find/find', form, 'find catalogue entries');
    return this.normalizeJson(response, {
      operation: 'find catalogue entries',
      allowNoResult: params.allowNoResult,
      emptyValue: [],
      select: flattenGenesisCatalog
    });
  }

  async getMetadata(params: GenesisMetadataParams): Promise<GenesisResponse<unknown>> {
    let metadataPath = Object.prototype.hasOwnProperty.call(metadataPaths, params.objectType)
      ? metadataPaths[params.objectType]
      : undefined;
    if (!metadataPath) {
      throw destatisValidationError('Select a supported metadata object type.');
    }
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.code);
    append(form, 'area', params.area);
    let response = await this.postJson(`/metadata/${metadataPath}`, form, 'get metadata');
    return this.normalizeJson(response, {
      operation: 'get metadata',
      select: payload => (isRecord(payload.Object) ? payload.Object : undefined)
    });
  }

  async listVariableValues(
    params: GenesisVariableValuesParams
  ): Promise<GenesisResponse<unknown[]>> {
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.variableCode);
    append(form, 'selection', params.selection);
    append(form, 'area', params.area);
    append(
      form,
      'searchcriterion',
      params.searchCriterion ? sortValues[params.searchCriterion] : undefined
    );
    append(
      form,
      'sortcriterion',
      params.sortCriterion ? sortValues[params.sortCriterion] : undefined
    );
    append(form, 'pagelength', params.pageLength);
    let response = await this.postJson(
      '/catalogue/values2variable',
      form,
      'list variable values'
    );
    return this.normalizeJson(response, {
      operation: 'list variable values',
      allowNoResult: params.allowNoResult,
      emptyValue: [],
      select: payload => (Array.isArray(payload.List) ? payload.List : undefined)
    });
  }

  async downloadTable(params: GenesisTableDownloadParams): Promise<GenesisFile> {
    let format = params.format ?? 'ffcsv';
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.tableCode);
    append(form, 'format', format);
    this.appendDownloadOptions(form, params, 5);
    append(form, 'job', false);
    let archiveFormat = zippedTableFormats.has(format);
    return this.postFile('/data/tablefile', form, 'download table', {
      fallbackMimeType: tableFallbackMime(format),
      fallbackFileName: tableFallbackName(params.tableCode, format),
      canonicalExtension: tableExtension(format),
      validate: (buffer, mimeType) => {
        if (zippedTableFormats.has(format) || format === 'xlsx') {
          validateZipFile(buffer, 'download table');
        } else if (format === 'html') {
          validateHtmlFile(buffer, mimeType, 'download table');
        } else {
          validateGenmlFile(buffer, mimeType, 'download table');
        }
      },
      resolveMimeType: mimeType => canonicalTableMime(format, mimeType),
      isArchive: () => archiveFormat
    });
  }

  async downloadCube(params: GenesisCubeDownloadParams): Promise<GenesisFile> {
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.cubeCode);
    append(form, 'format', 'csv');
    this.appendDownloadOptions(form, params, 3);
    append(form, 'values', params.includeValues);
    append(form, 'metadata', params.includeMetadata);
    append(form, 'additionals', params.includeAdditionalMetadata);
    return this.postFile('/data/cubefile', form, 'download cube', {
      fallbackMimeType: 'text/csv',
      fallbackFileName: `${params.cubeCode}.csv`,
      canonicalExtension: 'csv',
      validate: (buffer, mimeType) => validateCsvFile(buffer, mimeType, 'download cube'),
      resolveMimeType: () => 'text/csv',
      isArchive: () => false
    });
  }

  private appendDownloadOptions(
    form: URLSearchParams,
    params: GenesisTableDownloadParams | GenesisCubeDownloadParams,
    maximumClassifyingSelections: number
  ) {
    append(form, 'area', params.area);
    encodeContents(form, params.contents);
    append(form, 'startyear', params.startYear);
    append(form, 'endyear', params.endYear);
    append(form, 'timeslices', params.timeSlices);
    append(form, 'stand', params.updatedAfter);
    encodeSelections(
      form,
      params.regionalSelection,
      params.classifyingSelections,
      maximumClassifyingSelections
    );
    if ('transpose' in params) append(form, 'transpose', params.transpose);
    if ('compress' in params) append(form, 'compress', params.compress);
  }
}
