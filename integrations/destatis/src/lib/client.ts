import { createAxios, getResponseHeaderValue } from 'slates';
import { destatisSecureApiError, destatisValidationError } from './errors';
import {
  flattenGenesisCatalog,
  type NormalizeGenesisOptions,
  normalizeGenesisResponse
} from './response';
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

let tableFallbackMime = (format: GenesisTableFormat | undefined) =>
  format === 'csv' || format === 'datencsv' || format === 'ffcsv'
    ? 'application/zip'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let tableFallbackName = (code: string, format: GenesisTableFormat | undefined) =>
  `${code}.${format === 'csv' || format === 'datencsv' || format === 'ffcsv' ? 'zip' : 'xlsx'}`;

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
      let mimeType = normalizedMimeType(response.headers, options.fallbackMimeType);
      let declaredJson = mimeType.includes('json');
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

      let disposition = getResponseHeaderValue(response.headers, 'content-disposition');
      return {
        contentBase64: buffer.toString('base64'),
        mimeType,
        byteLength: buffer.byteLength,
        fileName: safeFilename(disposition, options.fallbackFileName),
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
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.tableCode);
    append(form, 'format', params.format);
    this.appendDownloadOptions(form, params);
    append(form, 'job', false);
    let archiveFormat =
      params.format === 'csv' || params.format === 'datencsv' || params.format === 'ffcsv';
    return this.postFile('/data/tablefile', form, 'download table', {
      fallbackMimeType: tableFallbackMime(params.format),
      fallbackFileName: tableFallbackName(params.tableCode, params.format),
      isArchive: mimeType => archiveFormat || mimeType === 'application/zip'
    });
  }

  async downloadCube(params: GenesisCubeDownloadParams): Promise<GenesisFile> {
    let form = new URLSearchParams();
    append(form, 'language', params.language);
    append(form, 'name', params.cubeCode);
    append(form, 'format', 'csv');
    this.appendDownloadOptions(form, params);
    return this.postFile('/data/cubefile', form, 'download cube', {
      fallbackMimeType: 'text/csv',
      fallbackFileName: `${params.cubeCode}.csv`,
      isArchive: mimeType => mimeType === 'application/zip'
    });
  }

  private appendDownloadOptions(
    form: URLSearchParams,
    params:
      | Omit<GenesisTableDownloadParams, 'tableCode' | 'format'>
      | GenesisCubeDownloadParams
  ) {
    append(form, 'area', params.area);
    append(form, 'startyear', params.startYear);
    append(form, 'endyear', params.endYear);
    append(form, 'timeslices', params.timeSlices);
    append(form, 'stand', params.updatedAfter);
    append(form, 'transpose', params.transpose);
    append(form, 'compress', params.compress);
  }
}
