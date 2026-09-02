import { inflateRawSync } from 'node:zlib';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
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

let MAX_ZIP_BYTES = 256 * 1024 * 1024;
let MAX_ZIP_ENTRIES = 4096;
let MAX_ZIP_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;

let crc32Table = Array.from({ length: 256 }, (_, value) => {
  let checksum = value;
  for (let bit = 0; bit < 8; bit += 1) {
    checksum = (checksum & 1) === 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
  }
  return checksum >>> 0;
});

let crc32 = (buffer: Buffer) => {
  let checksum = 0xffffffff;
  for (let byte of buffer) {
    checksum = (crc32Table[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }
  return (checksum ^ 0xffffffff) >>> 0;
};

type InspectedZip = { fileNames: Set<string> };

let inspectZipArchive = (buffer: Buffer): InspectedZip | undefined => {
  try {
    if (buffer.length < 22 || buffer.length > MAX_ZIP_BYTES) return undefined;

    let earliestEocd = Math.max(0, buffer.length - 22 - 65_535);
    let eocdOffset = -1;
    for (let offset = buffer.length - 22; offset >= earliestEocd; offset -= 1) {
      if (buffer.readUInt32LE(offset) !== 0x06054b50) continue;
      let commentLength = buffer.readUInt16LE(offset + 20);
      if (offset + 22 + commentLength === buffer.length) {
        eocdOffset = offset;
        break;
      }
    }
    if (eocdOffset < 0) return undefined;

    let disk = buffer.readUInt16LE(eocdOffset + 4);
    let centralDisk = buffer.readUInt16LE(eocdOffset + 6);
    let diskEntries = buffer.readUInt16LE(eocdOffset + 8);
    let totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    let centralSize = buffer.readUInt32LE(eocdOffset + 12);
    let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
    if (
      disk !== 0 ||
      centralDisk !== 0 ||
      diskEntries !== totalEntries ||
      totalEntries < 1 ||
      totalEntries > MAX_ZIP_ENTRIES ||
      totalEntries === 0xffff ||
      centralSize === 0xffffffff ||
      centralOffset === 0xffffffff ||
      centralOffset + centralSize !== eocdOffset
    ) {
      return undefined;
    }

    let fileNames = new Set<string>();
    let cursor = centralOffset;
    let totalUncompressedBytes = 0;
    for (let index = 0; index < totalEntries; index += 1) {
      if (cursor + 46 > eocdOffset || buffer.readUInt32LE(cursor) !== 0x02014b50) {
        return undefined;
      }
      let flags = buffer.readUInt16LE(cursor + 8);
      let compressionMethod = buffer.readUInt16LE(cursor + 10);
      let expectedCrc = buffer.readUInt32LE(cursor + 16);
      let compressedSize = buffer.readUInt32LE(cursor + 20);
      let uncompressedSize = buffer.readUInt32LE(cursor + 24);
      let nameLength = buffer.readUInt16LE(cursor + 28);
      let extraLength = buffer.readUInt16LE(cursor + 30);
      let commentLength = buffer.readUInt16LE(cursor + 32);
      let startingDisk = buffer.readUInt16LE(cursor + 34);
      let localOffset = buffer.readUInt32LE(cursor + 42);
      let nextCursor = cursor + 46 + nameLength + extraLength + commentLength;
      if (
        nextCursor > eocdOffset ||
        startingDisk !== 0 ||
        (flags & 0x41) !== 0 ||
        (compressionMethod !== 0 && compressionMethod !== 8) ||
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff
      ) {
        return undefined;
      }

      let nameBytes = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
      let fileName = nameBytes.toString('utf8');
      if (
        !fileName ||
        fileName.includes('\uFFFD') ||
        fileName.includes('\\') ||
        fileName.startsWith('/') ||
        fileName.split('/').includes('..') ||
        fileNames.has(fileName)
      ) {
        return undefined;
      }

      if (
        localOffset + 30 > centralOffset ||
        buffer.readUInt32LE(localOffset) !== 0x04034b50
      ) {
        return undefined;
      }
      let localFlags = buffer.readUInt16LE(localOffset + 6);
      let localCompressionMethod = buffer.readUInt16LE(localOffset + 8);
      let localCrc = buffer.readUInt32LE(localOffset + 14);
      let localCompressedSize = buffer.readUInt32LE(localOffset + 18);
      let localUncompressedSize = buffer.readUInt32LE(localOffset + 22);
      let localNameLength = buffer.readUInt16LE(localOffset + 26);
      let localExtraLength = buffer.readUInt16LE(localOffset + 28);
      let dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      let dataEnd = dataOffset + compressedSize;
      if (
        localFlags !== flags ||
        localCompressionMethod !== compressionMethod ||
        ((flags & 0x08) === 0 &&
          (localCrc !== expectedCrc ||
            localCompressedSize !== compressedSize ||
            localUncompressedSize !== uncompressedSize)) ||
        dataEnd > centralOffset ||
        !buffer
          .subarray(localOffset + 30, localOffset + 30 + localNameLength)
          .equals(nameBytes)
      ) {
        return undefined;
      }

      totalUncompressedBytes += uncompressedSize;
      if (
        totalUncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES ||
        uncompressedSize > compressedSize * 1000 + 1024 * 1024
      ) {
        return undefined;
      }
      let compressed = buffer.subarray(dataOffset, dataEnd);
      let uncompressed =
        compressionMethod === 0
          ? compressed
          : inflateRawSync(compressed, {
              maxOutputLength: Math.min(uncompressedSize + 1, MAX_ZIP_UNCOMPRESSED_BYTES + 1)
            });
      if (uncompressed.length !== uncompressedSize || crc32(uncompressed) !== expectedCrc) {
        return undefined;
      }

      fileNames.add(fileName);
      cursor = nextCursor;
    }
    return cursor === centralOffset + centralSize ? { fileNames } : undefined;
  } catch {
    return undefined;
  }
};

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

let validateZipFile = (buffer: Buffer, operation: string, format: 'csv' | 'xlsx') => {
  let archive = inspectZipArchive(buffer);
  let hasExpectedEntries =
    format === 'xlsx'
      ? archive?.fileNames.has('[Content_Types].xml') === true &&
        archive.fileNames.has('xl/workbook.xml')
      : [...(archive?.fileNames ?? [])].some(name => name.toLowerCase().endsWith('.csv'));
  if (!archive || !hasExpectedEntries) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned a corrupt or unexpected ${format === 'xlsx' ? 'XLSX' : 'ZIP'} document.`
    );
  }
};

let parseDelimitedRows = (text: string, delimiter: string): string[][] | undefined => {
  let rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    let character = text[index] ?? '';
    if (quoted) {
      if (character !== '"') {
        field += character;
      } else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = false;
        afterQuote = true;
      }
      continue;
    }
    if (afterQuote && character !== delimiter && character !== '\r' && character !== '\n') {
      return undefined;
    }
    if (character === '"') {
      if (field.length !== 0) return undefined;
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = '';
      afterQuote = false;
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      afterQuote = false;
    } else {
      field += character;
    }
  }
  if (quoted) return undefined;
  row.push(field);
  rows.push(row);
  return rows;
};

let hasTabularCsvStructure = (text: string) => {
  // GENESIS cube exports use semicolon-separated K/D records; regular CSV headers and
  // comma/tab delimiters also occur across language and encoding variants. Requiring two
  // records with the same tabular width rejects gateway prose without assuming one layout.
  for (let delimiter of [',', ';', '\t']) {
    let rows = parseDelimitedRows(text, delimiter)?.filter(row =>
      row.some(field => field.trim().length > 0)
    );
    if (!rows) continue;
    let counts = new Map<number, number>();
    for (let row of rows) {
      if (row.length < 2) continue;
      counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
    }
    if ([...counts.values()].some(count => count >= 2)) return true;
  }
  return false;
};

let startsLikeGatewayError = (text: string) =>
  /^(?:error|fehler|gateway(?:\s+error)?|service\s+unavailable|temporarily\s+unavailable|access\s+(?:denied|forbidden)|forbidden|unauthori[sz]ed|temporary\s+redirect|oops)(?:\b|\s*[:;,])/i.test(
    text.trimStart()
  );

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
  if (
    text === undefined ||
    text.trim().length === 0 ||
    looksLikeStructuredError ||
    startsLikeGatewayError(start) ||
    (!explicitCsvMime && !genericTextMime) ||
    !hasTabularCsvStructure(text)
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
  let heading = text?.match(/<(?:title|h1)\b[^>]*>([^<]*)/i)?.[1] ?? '';
  if (
    !text ||
    !compatibleMime ||
    !startsLikeHtml(text) ||
    !/<table\b/i.test(text) ||
    startsLikeGatewayError(heading)
  ) {
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
  let parsed: unknown;
  let validDocument = text ? XMLValidator.validate(text) === true : false;
  if (validDocument && text) {
    try {
      parsed = new XMLParser({
        ignoreAttributes: false,
        processEntities: false
      }).parse(text) as unknown;
    } catch {
      parsed = undefined;
    }
  }
  let document = isRecord(parsed) ? parsed : undefined;
  let rootEntry = Object.entries(document ?? {}).find(([name]) => !name.startsWith('?'));
  let rootName = rootEntry?.[0].split(':').pop()?.toLowerCase() ?? '';
  let root = rootEntry?.[1];
  let hasGenesisRoot = new Set([
    'genml',
    'genesis',
    'genesis-online',
    'genesisexport',
    'genesis-export'
  ]).has(rootName);
  let hasDocumentElements =
    isRecord(root) &&
    Object.keys(root).some(name => !name.startsWith('@_') && name !== '#text');
  let containsErrorEnvelope = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(containsErrorEnvelope);
    if (!isRecord(value)) return false;
    return Object.entries(value).some(([name, child]) => {
      let localName = name.split(':').pop()?.toLowerCase();
      return localName === 'error' || localName === 'exception' || localName === 'fault'
        ? true
        : containsErrorEnvelope(child);
    });
  };
  if (
    !text ||
    !compatibleMime ||
    !startsLikeXml(text) ||
    !validDocument ||
    !hasGenesisRoot ||
    !hasDocumentElements ||
    containsErrorEnvelope(root)
  ) {
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
        if (zippedTableFormats.has(format)) {
          validateZipFile(buffer, 'download table', 'csv');
        } else if (format === 'xlsx') {
          validateZipFile(buffer, 'download table', 'xlsx');
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
