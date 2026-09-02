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
// File delivery also creates a base64 representation, so bound the response before parsing
// or encoding it. GENESIS direct table downloads are already limited to 40,000 values.
export let GENESIS_MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;

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
  if (buffer.length > 1024 * 1024) return undefined;
  try {
    return JSON.parse(buffer.toString('utf8')) as unknown;
  } catch {
    return undefined;
  }
};

let MAX_ZIP_BYTES = GENESIS_MAX_DOWNLOAD_BYTES;
let MAX_ZIP_ENTRIES = 4096;
let MAX_ZIP_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
let MAX_XML_BYTES = 32 * 1024 * 1024;
let MAX_CSV_INSPECTION_BYTES = 1024 * 1024;
let MAX_HTML_INSPECTION_BYTES = 1024 * 1024;

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

let cp437Extended = [
  ...'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '
];

let decodeUtf8 = (value: Buffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(value);
  } catch {
    return undefined;
  }
};

let decodeCp437 = (value: Buffer) =>
  [...value]
    .map(byte => (byte < 128 ? String.fromCharCode(byte) : (cp437Extended[byte - 128] ?? '')))
    .join('');

let unicodeZipPath = (
  nameBytes: Buffer,
  extra: Buffer
): { found: boolean; value?: string } | undefined => {
  let cursor = 0;
  while (cursor < extra.length) {
    if (cursor + 4 > extra.length) return undefined;
    let fieldId = extra.readUInt16LE(cursor);
    let fieldLength = extra.readUInt16LE(cursor + 2);
    let dataOffset = cursor + 4;
    let nextCursor = dataOffset + fieldLength;
    if (nextCursor > extra.length) return undefined;
    if (fieldId === 0x7075) {
      if (
        fieldLength < 6 ||
        extra[dataOffset] !== 1 ||
        extra.readUInt32LE(dataOffset + 1) !== crc32(nameBytes)
      ) {
        return undefined;
      }
      let value = decodeUtf8(extra.subarray(dataOffset + 5, nextCursor));
      return value ? { found: true, value } : undefined;
    }
    cursor = nextCursor;
  }
  return { found: false };
};

let decodeZipFileName = (nameBytes: Buffer, flags: number, extra: Buffer) => {
  let unicodePath = unicodeZipPath(nameBytes, extra);
  if (!unicodePath) return undefined;
  let decoded =
    (flags & 0x0800) !== 0
      ? decodeUtf8(nameBytes)
      : unicodePath.found
        ? unicodePath.value
        : decodeCp437(nameBytes);
  if (!decoded) return undefined;
  let normalized = decoded.normalize('NFC');
  let hasControl = [...normalized].some(character => {
    let code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (
    hasControl ||
    normalized.includes('\\') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    return undefined;
  }
  return normalized;
};

type InspectedZip = {
  fileNames: Set<string>;
  retainedContents: Map<string, Buffer>;
};

type ZipInspection =
  | { kind: 'valid'; archive: InspectedZip }
  | {
      kind: 'size-limit';
      reason: 'outer-size' | 'entry-count' | 'expanded-size' | 'compression-ratio';
    }
  | { kind: 'invalid' };

let invalidZipInspection: ZipInspection = { kind: 'invalid' };

let inspectZipArchive = (buffer: Buffer, retainContents: boolean): ZipInspection => {
  try {
    if (buffer.length > MAX_ZIP_BYTES) {
      return { kind: 'size-limit', reason: 'outer-size' };
    }
    if (buffer.length < 22) return invalidZipInspection;

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
    if (eocdOffset < 0) return invalidZipInspection;

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
      totalEntries === 0xffff ||
      centralSize === 0xffffffff ||
      centralOffset === 0xffffffff ||
      centralOffset + centralSize !== eocdOffset
    ) {
      return invalidZipInspection;
    }
    if (totalEntries > MAX_ZIP_ENTRIES) {
      return { kind: 'size-limit', reason: 'entry-count' };
    }

    let fileNames = new Set<string>();
    let retainedContents = new Map<string, Buffer>();
    let cursor = centralOffset;
    let totalUncompressedBytes = 0;
    for (let index = 0; index < totalEntries; index += 1) {
      if (cursor + 46 > eocdOffset || buffer.readUInt32LE(cursor) !== 0x02014b50) {
        return invalidZipInspection;
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
        return invalidZipInspection;
      }

      let nameOffset = cursor + 46;
      let nameBytes = buffer.subarray(nameOffset, nameOffset + nameLength);
      let extra = buffer.subarray(
        nameOffset + nameLength,
        nameOffset + nameLength + extraLength
      );
      let fileName = decodeZipFileName(nameBytes, flags, extra);
      if (!fileName || fileNames.has(fileName)) {
        return invalidZipInspection;
      }

      if (
        localOffset + 30 > centralOffset ||
        buffer.readUInt32LE(localOffset) !== 0x04034b50
      ) {
        return invalidZipInspection;
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
      let descriptorEnd = dataEnd;
      if ((flags & 0x08) !== 0) {
        let descriptorOffset = dataEnd;
        if (
          descriptorOffset + 4 <= centralOffset &&
          buffer.readUInt32LE(descriptorOffset) === 0x08074b50
        ) {
          descriptorOffset += 4;
        }
        descriptorEnd = descriptorOffset + 12;
        if (
          descriptorEnd > centralOffset ||
          buffer.readUInt32LE(descriptorOffset) !== expectedCrc ||
          buffer.readUInt32LE(descriptorOffset + 4) !== compressedSize ||
          buffer.readUInt32LE(descriptorOffset + 8) !== uncompressedSize
        ) {
          return invalidZipInspection;
        }
      }
      if (
        localFlags !== flags ||
        localCompressionMethod !== compressionMethod ||
        ((flags & 0x08) === 0 &&
          (localCrc !== expectedCrc ||
            localCompressedSize !== compressedSize ||
            localUncompressedSize !== uncompressedSize)) ||
        descriptorEnd > centralOffset ||
        !buffer
          .subarray(localOffset + 30, localOffset + 30 + localNameLength)
          .equals(nameBytes)
      ) {
        return invalidZipInspection;
      }

      totalUncompressedBytes += uncompressedSize;
      if (totalUncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
        return { kind: 'size-limit', reason: 'expanded-size' };
      }
      if (uncompressedSize > compressedSize * 200 + 1024 * 1024) {
        return { kind: 'size-limit', reason: 'compression-ratio' };
      }
      let compressed = buffer.subarray(dataOffset, dataEnd);
      let uncompressed =
        compressionMethod === 0
          ? compressed
          : inflateRawSync(compressed, {
              maxOutputLength: Math.min(uncompressedSize + 1, MAX_ZIP_UNCOMPRESSED_BYTES + 1)
            });
      if (uncompressed.length !== uncompressedSize || crc32(uncompressed) !== expectedCrc) {
        return invalidZipInspection;
      }

      fileNames.add(fileName);
      if (retainContents) retainedContents.set(fileName, uncompressed);
      cursor = nextCursor;
    }
    return cursor === centralOffset + centralSize
      ? { kind: 'valid', archive: { fileNames, retainedContents } }
      : invalidZipInspection;
  } catch {
    return invalidZipInspection;
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

  let hasDisallowedControl = false;
  for (let character of text) {
    let code = character.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      hasDisallowedControl = true;
      break;
    }
  }
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

let boundedTextPrefix = (buffer: Buffer, maximumBytes: number) => {
  let length = Math.min(buffer.length, maximumBytes);
  if (
    length < buffer.length &&
    ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
      (buffer[0] === 0xfe && buffer[1] === 0xff)) &&
    length % 2 !== 0
  ) {
    length -= 1;
  }
  return decodeTextFile(buffer.subarray(0, length));
};

let hasBoundedXmlShape = (text: string) => {
  if (/<!doctype\b/i.test(text)) return false;
  let depth = 0;
  let elements = 0;
  let cursor = 0;
  while (cursor < text.length) {
    let start = text.indexOf('<', cursor);
    if (start < 0) break;
    if (text.startsWith('<!--', start)) {
      let end = text.indexOf('-->', start + 4);
      if (end < 0) return false;
      cursor = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', start)) {
      let end = text.indexOf(']]>', start + 9);
      if (end < 0) return false;
      cursor = end + 3;
      continue;
    }
    if (text.startsWith('<?', start)) {
      let end = text.indexOf('?>', start + 2);
      if (end < 0) return false;
      cursor = end + 2;
      continue;
    }
    let quote: string | undefined;
    let end = start + 1;
    for (; end < text.length; end += 1) {
      let character = text[end];
      if (quote) {
        if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        break;
      }
    }
    if (end >= text.length || quote) return false;
    let tag = text.slice(start + 1, end).trim();
    if (tag.startsWith('/')) {
      depth -= 1;
      if (depth < 0) return false;
    } else if (!tag.startsWith('!')) {
      elements += 1;
      if (elements > 100_000) return false;
      if (!tag.endsWith('/')) {
        depth += 1;
        if (depth > 64) return false;
      }
    }
    cursor = end + 1;
  }
  return depth === 0 && elements > 0;
};

let parseBoundedXml = (buffer: Buffer, maximumBytes: number) => {
  if (buffer.length > maximumBytes) return undefined;
  let text = decodeTextFile(buffer);
  if (!text || !startsLikeXml(text) || !hasBoundedXmlShape(text)) return undefined;
  if (XMLValidator.validate(text) !== true) return undefined;
  try {
    let parsed = new XMLParser({
      ignoreAttributes: false,
      processEntities: false
    }).parse(text) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

let localXmlName = (name: string) => name.split(':').pop()?.toLowerCase() ?? '';

type XmlElement = {
  name: string;
  value: unknown;
  ancestors: RecordValue[];
};

let xmlRoot = (document: RecordValue | undefined) => {
  let entry = Object.entries(document ?? {}).find(([name]) => !name.startsWith('?'));
  return entry ? { name: entry[0], value: entry[1], ancestors: [] } : undefined;
};

let xmlNamespace = (element: XmlElement) => {
  let separator = element.name.indexOf(':');
  let declaration = separator < 0 ? '@_xmlns' : `@_xmlns:${element.name.slice(0, separator)}`;
  let scopes = isRecord(element.value)
    ? [element.value, ...element.ancestors]
    : element.ancestors;
  for (let scope of scopes) {
    if (Object.prototype.hasOwnProperty.call(scope, declaration)) {
      return typeof scope[declaration] === 'string' ? scope[declaration] : undefined;
    }
  }
  return undefined;
};

let xmlChildren = (
  parent: XmlElement,
  localName: string,
  namespace: string
): XmlElement[] | undefined => {
  if (!isRecord(parent.value)) return [];
  let children: XmlElement[] = [];
  let ancestors = [parent.value, ...parent.ancestors];
  for (let [name, rawValue] of Object.entries(parent.value)) {
    if (name.startsWith('@_') || localXmlName(name) !== localName) continue;
    for (let value of Array.isArray(rawValue) ? rawValue : [rawValue]) {
      children.push({ name, value, ancestors });
    }
  }
  return children.every(child => xmlNamespace(child) === namespace) ? children : undefined;
};

let packageRelationshipNamespace =
  'http://schemas.openxmlformats.org/package/2006/relationships';
let contentTypesNamespace = 'http://schemas.openxmlformats.org/package/2006/content-types';
let spreadsheetNamespaces = new Set([
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  'http://purl.oclc.org/ooxml/spreadsheetml/main'
]);
let officeRelationshipNamespaces = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'http://purl.oclc.org/ooxml/officeDocument/relationships'
]);
let officeDocumentRelationshipTypes = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument'
]);
let worksheetRelationshipTypes = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',
  'http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet'
]);
let workbookContentType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
let worksheetContentType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
let relationshipsContentType = 'application/vnd.openxmlformats-package.relationships+xml';

let hasUnsafePackageTargetCharacters = (value: string) => {
  if (value.includes('\\') || value.includes('?') || value.includes('#')) return true;
  for (let character of value) {
    let code = character.charCodeAt(0);
    if (code < 32 || code === 127) return true;
  }
  return false;
};

let safePackageTarget = (sourcePart: string, target: unknown) => {
  if (
    typeof target !== 'string' ||
    !target ||
    hasUnsafePackageTargetCharacters(target) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)
  ) {
    return undefined;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return undefined;
  }
  if (hasUnsafePackageTargetCharacters(decoded) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)) {
    return undefined;
  }
  let parts = decoded.startsWith('/')
    ? []
    : sourcePart.split('/').slice(0, -1).filter(Boolean);
  for (let part of decoded.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
};

let relationshipRecords = (document: RecordValue | undefined) => {
  let root = xmlRoot(document);
  if (
    !root ||
    localXmlName(root.name) !== 'relationships' ||
    xmlNamespace(root) !== packageRelationshipNamespace
  ) {
    return undefined;
  }
  let relationships = xmlChildren(root, 'relationship', packageRelationshipNamespace);
  if (!relationships) return undefined;
  let records = relationships.map(relationship => relationship.value);
  return records.every(isRecord) ? records : undefined;
};

let inheritedXmlNamespace = (prefix: string, values: RecordValue[]) => {
  for (let value of values) {
    let namespace = value[`@_xmlns:${prefix}`];
    if (typeof namespace === 'string') return namespace;
  }
  return undefined;
};

let isValidRelationshipId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[\p{L}\p{Nl}_][\p{L}\p{Nl}\p{N}\p{M}_.\-\u00B7\u203F\u2040]*$/u.test(value);

let normalizedSheetId = (value: unknown) => {
  if (typeof value !== 'string' || !/^\+?\d+$/.test(value)) return undefined;
  try {
    let parsed = BigInt(value);
    return parsed > 0n && parsed <= 4_294_967_295n ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

let validateOoxmlWorkbook = (archive: InspectedZip) => {
  let contentTypes = parseBoundedXml(
    archive.retainedContents.get('[Content_Types].xml') ?? Buffer.alloc(0),
    MAX_XML_BYTES
  );
  let rootRelationships = relationshipRecords(
    parseBoundedXml(
      archive.retainedContents.get('_rels/.rels') ?? Buffer.alloc(0),
      MAX_XML_BYTES
    )
  );
  let workbook = parseBoundedXml(
    archive.retainedContents.get('xl/workbook.xml') ?? Buffer.alloc(0),
    MAX_XML_BYTES
  );
  let workbookRelationships = relationshipRecords(
    parseBoundedXml(
      archive.retainedContents.get('xl/_rels/workbook.xml.rels') ?? Buffer.alloc(0),
      MAX_XML_BYTES
    )
  );
  let typesRoot = xmlRoot(contentTypes);
  let workbookRoot = xmlRoot(workbook);
  let workbookRootValue = workbookRoot?.value;
  if (
    !typesRoot ||
    localXmlName(typesRoot.name) !== 'types' ||
    xmlNamespace(typesRoot) !== contentTypesNamespace ||
    !rootRelationships ||
    !workbookRoot ||
    localXmlName(workbookRoot.name) !== 'workbook' ||
    !isRecord(workbookRootValue) ||
    !spreadsheetNamespaces.has(String(xmlNamespace(workbookRoot))) ||
    !workbookRelationships
  ) {
    return false;
  }

  let overrideElements = xmlChildren(typesRoot, 'override', contentTypesNamespace);
  let defaultElements = xmlChildren(typesRoot, 'default', contentTypesNamespace);
  if (!overrideElements || !defaultElements) return false;
  let overrides = overrideElements.map(element => element.value).filter(isRecord);
  let defaults = defaultElements.map(element => element.value).filter(isRecord);
  if (
    overrides.length !== overrideElements.length ||
    defaults.length !== defaultElements.length
  ) {
    return false;
  }
  let overrideTypes = new Map<string, string>();
  for (let override of overrides) {
    let partName = override['@_PartName'];
    let contentType = override['@_ContentType'];
    if (
      typeof partName !== 'string' ||
      !partName.startsWith('/') ||
      typeof contentType !== 'string' ||
      !contentType ||
      overrideTypes.has(partName)
    ) {
      return false;
    }
    overrideTypes.set(partName, contentType);
  }
  let defaultTypes = new Map<string, string>();
  for (let entry of defaults) {
    let extension = entry['@_Extension'];
    let contentType = entry['@_ContentType'];
    if (
      typeof extension !== 'string' ||
      !extension ||
      typeof contentType !== 'string' ||
      !contentType ||
      defaultTypes.has(extension.toLowerCase())
    ) {
      return false;
    }
    defaultTypes.set(extension.toLowerCase(), contentType);
  }
  let contentTypeFor = (partName: string) => {
    let override = overrideTypes.get(`/${partName}`);
    if (override) return override;
    let leaf = partName.split('/').pop() ?? '';
    let dot = leaf.lastIndexOf('.');
    return dot >= 0 ? defaultTypes.get(leaf.slice(dot + 1).toLowerCase()) : undefined;
  };
  if (
    contentTypeFor('xl/workbook.xml') !== workbookContentType ||
    contentTypeFor('_rels/.rels') !== relationshipsContentType ||
    contentTypeFor('xl/_rels/workbook.xml.rels') !== relationshipsContentType
  ) {
    return false;
  }

  let officeRelationships = rootRelationships.filter(
    relationship =>
      officeDocumentRelationshipTypes.has(String(relationship['@_Type'])) &&
      relationship['@_TargetMode'] !== 'External'
  );
  if (
    officeRelationships.length !== 1 ||
    !isValidRelationshipId(officeRelationships[0]?.['@_Id']) ||
    safePackageTarget('', officeRelationships[0]?.['@_Target']) !== 'xl/workbook.xml'
  ) {
    return false;
  }

  let workbookRelationshipMap = new Map<string, RecordValue>();
  for (let relationship of workbookRelationships) {
    let id = relationship['@_Id'];
    if (!isValidRelationshipId(id) || workbookRelationshipMap.has(id)) return false;
    workbookRelationshipMap.set(id, relationship);
  }
  let workbookNamespace = xmlNamespace(workbookRoot);
  if (!workbookNamespace) return false;
  let sheetsContainers = xmlChildren(workbookRoot, 'sheets', workbookNamespace);
  if (!sheetsContainers) return false;
  let sheets: Array<{ sheet: RecordValue; ancestors: RecordValue[] }> = [];
  for (let container of sheetsContainers) {
    if (!isRecord(container.value)) return false;
    let sheetElements = xmlChildren(container, 'sheet', workbookNamespace);
    if (!sheetElements) return false;
    for (let sheet of sheetElements) {
      if (!isRecord(sheet.value)) return false;
      sheets.push({
        sheet: sheet.value,
        ancestors: [sheet.value, ...sheet.ancestors]
      });
    }
  }
  if (sheets.length < 1) return false;
  let usedSheetIds = new Set<string>();
  let usedRelationshipIds = new Set<string>();
  let usedWorksheetTargets = new Set<string>();
  for (let { sheet, ancestors } of sheets) {
    let relationshipIdEntries = Object.entries(sheet).filter(([name]) => {
      let match = /^@_([^:]+):id$/.exec(name);
      return (
        match?.[1] !== undefined &&
        officeRelationshipNamespaces.has(String(inheritedXmlNamespace(match[1], ancestors)))
      );
    });
    let sheetId = normalizedSheetId(sheet['@_sheetId']);
    let relationshipId = relationshipIdEntries[0]?.[1];
    if (
      !sheetId ||
      usedSheetIds.has(sheetId) ||
      relationshipIdEntries.length !== 1 ||
      !isValidRelationshipId(relationshipId) ||
      usedRelationshipIds.has(relationshipId)
    ) {
      return false;
    }
    let relationship =
      typeof relationshipId === 'string'
        ? workbookRelationshipMap.get(relationshipId)
        : undefined;
    let target = relationship
      ? safePackageTarget('xl/workbook.xml', relationship['@_Target'])
      : undefined;
    let worksheetDocument = target
      ? parseBoundedXml(archive.retainedContents.get(target) ?? Buffer.alloc(0), MAX_XML_BYTES)
      : undefined;
    let worksheetRoot = xmlRoot(worksheetDocument);
    let worksheetNamespace = worksheetRoot ? xmlNamespace(worksheetRoot) : undefined;
    let sheetDataElements =
      worksheetRoot && worksheetNamespace
        ? xmlChildren(worksheetRoot, 'sheetdata', worksheetNamespace)
        : undefined;
    if (
      typeof sheet['@_name'] !== 'string' ||
      !sheet['@_name'].trim() ||
      !relationship ||
      relationship['@_TargetMode'] === 'External' ||
      !worksheetRelationshipTypes.has(String(relationship['@_Type'])) ||
      !target ||
      usedWorksheetTargets.has(target) ||
      !archive.fileNames.has(target) ||
      contentTypeFor(target) !== worksheetContentType ||
      !worksheetRoot ||
      localXmlName(worksheetRoot.name) !== 'worksheet' ||
      !spreadsheetNamespaces.has(String(worksheetNamespace)) ||
      !sheetDataElements ||
      sheetDataElements.length !== 1
    ) {
      return false;
    }
    usedSheetIds.add(sheetId);
    usedRelationshipIds.add(relationshipId);
    usedWorksheetTargets.add(target);
  }
  return true;
};

let validateZipFile = (buffer: Buffer, operation: string, format: 'csv' | 'xlsx') => {
  let inspection = inspectZipArchive(buffer, format === 'xlsx');
  if (inspection.kind === 'size-limit') {
    let guidance = {
      'outer-size': 'the 64 MiB download limit',
      'entry-count': 'the 4,096-entry ZIP limit',
      'expanded-size': 'the 32 MiB expanded ZIP limit',
      'compression-ratio': 'the ZIP expansion safety limit'
    }[inspection.reason];
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned a file exceeding ${guidance}. Narrow the requested table and try again.`
    );
  }
  let archive = inspection.kind === 'valid' ? inspection.archive : undefined;
  let hasExpectedEntries =
    format === 'xlsx'
      ? archive !== undefined && validateOoxmlWorkbook(archive)
      : [...(archive?.fileNames ?? [])].some(name => name.toLowerCase().endsWith('.csv'));
  if (!archive || !hasExpectedEntries) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned a corrupt or unexpected ${format === 'xlsx' ? 'XLSX' : 'ZIP'} document.`
    );
  }
};

let scanDelimitedRows = (text: string, delimiter: string, complete: boolean) => {
  let counts = new Map<number, number>();
  let fields = 1;
  let fieldHasCharacters = false;
  let rowHasContent = false;
  let quoted = false;
  let afterQuote = false;
  let finishRow = () => {
    if (rowHasContent && fields >= 2) counts.set(fields, (counts.get(fields) ?? 0) + 1);
    fields = 1;
    fieldHasCharacters = false;
    rowHasContent = false;
    afterQuote = false;
  };
  for (let index = 0; index < text.length; index += 1) {
    let character = text[index] ?? '';
    if (quoted) {
      if (character !== '"') {
        if (!/\s/.test(character)) rowHasContent = true;
      } else if (text[index + 1] === '"') {
        rowHasContent = true;
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
      if (fieldHasCharacters) return false;
      quoted = true;
    } else if (character === delimiter) {
      fields += 1;
      fieldHasCharacters = false;
      afterQuote = false;
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      fieldHasCharacters = true;
      if (!/\s/.test(character)) rowHasContent = true;
    }
  }
  if (complete) {
    if (quoted) return false;
    finishRow();
  }
  return [...counts.values()].some(count => count >= 2);
};

let hasTabularCsvStructure = (text: string, complete: boolean) => {
  // GENESIS cube exports use semicolon-separated K/D records; regular CSV headers and
  // comma/tab delimiters also occur across language and encoding variants. Requiring two
  // records with the same tabular width rejects gateway prose without assuming one layout.
  for (let delimiter of [',', ';', '\t']) {
    if (scanDelimitedRows(text, delimiter, complete)) return true;
  }
  return false;
};

let startsLikeGatewayError = (text: string) =>
  /^(?:error|fehler|gateway(?:\s+error)?|service\s+unavailable|temporarily\s+unavailable|access\s+(?:denied|forbidden)|forbidden|unauthori[sz]ed|temporary\s+redirect|oops)(?:\b|\s*[:;,])/i.test(
    text.trimStart()
  );

let validateCsvFile = (buffer: Buffer, mimeType: string, operation: string) => {
  let text = boundedTextPrefix(buffer, MAX_CSV_INSPECTION_BYTES);
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
    !hasTabularCsvStructure(text, buffer.length <= MAX_CSV_INSPECTION_BYTES)
  ) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned data that is not a valid CSV file.`
    );
  }
};

let validateHtmlFile = (buffer: Buffer, mimeType: string, operation: string) => {
  let text = boundedTextPrefix(buffer, MAX_HTML_INSPECTION_BYTES);
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
  if (buffer.length > MAX_XML_BYTES) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${operation} returned a file exceeding the 32 MiB GENML/XML limit. Narrow the requested table and try again.`
    );
  }
  let compatibleMime = new Set([
    'application/xml',
    'text/xml',
    'application/genml+xml',
    'application/octet-stream',
    'text/plain'
  ]).has(mimeType);
  let document = parseBoundedXml(buffer, MAX_XML_BYTES);
  let rootEntry = xmlRoot(document);
  let rootName = rootEntry ? localXmlName(rootEntry.name) : '';
  let root = rootEntry?.value;
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
  let containsErrorEnvelope = () => {
    let stack = [root];
    let visited = 0;
    while (stack.length > 0) {
      let value = stack.pop();
      visited += 1;
      if (visited > 100_000) return true;
      if (Array.isArray(value)) {
        for (let child of value) stack.push(child);
      } else if (isRecord(value)) {
        for (let [name, child] of Object.entries(value)) {
          let localName = localXmlName(name);
          if (localName === 'error' || localName === 'exception' || localName === 'fault') {
            return true;
          }
          stack.push(child);
        }
      }
    }
    return false;
  };
  if (
    !compatibleMime ||
    !document ||
    !hasGenesisRoot ||
    !hasDocumentElements ||
    containsErrorEnvelope()
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

let isAxiosSizeLimitError = (error: unknown) => {
  if (!isRecord(error)) return false;
  let message = typeof error.message === 'string' ? error.message : '';
  return (
    error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' ||
    (error.code === 'ERR_BAD_RESPONSE' &&
      /maxContentLength|larger than maxBodyLength/i.test(message))
  );
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
      let response = await this.http.post(path, form, {
        responseType: 'arraybuffer',
        maxContentLength: GENESIS_MAX_DOWNLOAD_BYTES,
        maxBodyLength: GENESIS_MAX_DOWNLOAD_BYTES
      });
      let buffer = asBuffer(response.data);
      if (buffer.byteLength > GENESIS_MAX_DOWNLOAD_BYTES) {
        throw destatisValidationError(
          `Destatis GENESIS-Online API ${operation} returned a file larger than the 64 MiB download limit.`
        );
      }
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
      if (isAxiosSizeLimitError(error)) {
        throw destatisValidationError(
          `Destatis GENESIS-Online API ${operation} exceeded the 64 MiB download limit.`
        );
      }
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
