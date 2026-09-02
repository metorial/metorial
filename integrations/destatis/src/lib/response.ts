import { destatisStatusError, destatisValidationError } from './errors';
import type {
  GenesisCatalogCategory,
  GenesisCatalogItem,
  GenesisResponse,
  GenesisStatus
} from './types';

type RecordValue = Record<string, unknown>;

export interface NormalizeGenesisOptions<T> {
  operation: string;
  allowNoResult?: boolean;
  emptyValue?: T;
  select?: (payload: RecordValue) => unknown;
}

let isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export let coerceGenesisStatusCode = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  let normalized = value.trim();
  return normalized ? normalized : undefined;
};

let isWarningType = (value: unknown) => {
  let normalized = text(value)?.toLocaleLowerCase('de');
  return normalized === 'warning' || normalized === 'warnung';
};

let isErrorType = (value: unknown) => {
  let normalized = text(value)?.toLocaleLowerCase('de');
  return normalized === 'error' || normalized === 'fehler';
};

let sanitizeProviderValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeProviderValue);
  if (!isRecord(value)) return value;

  let sanitized: RecordValue = {};
  for (let [key, entry] of Object.entries(value)) {
    if (key.toLocaleLowerCase('en') === 'parameter') continue;
    sanitized[key] = sanitizeProviderValue(entry);
  }
  return sanitized;
};

let extractCopyright = (value: unknown): string | undefined => {
  if (typeof value === 'string') return text(value);
  if (!Array.isArray(value)) return undefined;
  let parts = value.flatMap(entry =>
    typeof entry === 'string' && text(entry) ? [text(entry)!] : []
  );
  return parts.length > 0 ? parts.join('\n') : undefined;
};

let sanitizedPayload = (value: RecordValue): RecordValue => {
  let payload: RecordValue = {};
  for (let [key, entry] of Object.entries(value)) {
    let normalized = key.toLocaleLowerCase('en');
    if (normalized === 'status' || normalized === 'parameter' || normalized === 'copyright') {
      continue;
    }
    payload[key] = sanitizeProviderValue(entry);
  }
  return payload;
};

let hasUsableValue = (value: unknown) => value !== undefined && value !== null;

export let normalizeGenesisResponse = <T = RecordValue>(
  value: unknown,
  options: NormalizeGenesisOptions<T>
): GenesisResponse<T> => {
  if (!isRecord(value) || !isRecord(value.Status)) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${options.operation} returned a malformed response.`
    );
  }

  let status = value.Status as RecordValue;
  let code = coerceGenesisStatusCode(status.Code);
  if (code === undefined) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${options.operation} returned a malformed status.`
    );
  }

  let normalizedStatus: GenesisStatus = {
    Code: code,
    Content: status.Content,
    Type: status.Type
  };
  let warning = text(status.Content);

  if (code === '104' && options.allowNoResult === true && options.emptyValue !== undefined) {
    return {
      data: options.emptyValue,
      ...(warning ? { warning } : {})
    };
  }

  let payload = sanitizedPayload(value);
  let selected = options.select ? options.select(payload) : payload;
  if (code !== '104' && isWarningType(status.Type) && hasUsableValue(selected)) {
    let copyright = extractCopyright(value.Copyright);
    return {
      data: selected as T,
      ...(warning ? { warning } : {}),
      ...(copyright ? { copyright } : {})
    };
  }

  if (code !== '0' || isErrorType(status.Type)) {
    throw destatisStatusError(normalizedStatus, options.operation);
  }

  if (!hasUsableValue(selected)) {
    throw destatisValidationError(
      `Destatis GENESIS-Online API ${options.operation} returned no usable payload.`
    );
  }

  let copyright = extractCopyright(value.Copyright);
  return {
    data: selected as T,
    ...(isWarningType(status.Type) && warning ? { warning } : {}),
    ...(copyright ? { copyright } : {})
  };
};

let catalogGroups: ReadonlyArray<readonly [string, GenesisCatalogCategory]> = [
  ['Cubes', 'cube'],
  ['Statistics', 'statistic'],
  ['Tables', 'table'],
  ['Timeseries', 'time_series'],
  ['Variables', 'variable']
];

export let flattenGenesisCatalog = (payload: RecordValue): GenesisCatalogItem[] => {
  let items: GenesisCatalogItem[] = [];

  for (let [providerKey, category] of catalogGroups) {
    let group = payload[providerKey];
    if (!Array.isArray(group)) continue;

    for (let entry of group) {
      let sanitized = sanitizeProviderValue(entry);
      if (isRecord(sanitized)) {
        items.push({ category, ...sanitized });
      } else {
        items.push({ category, value: sanitized });
      }
    }
  }

  return items;
};
