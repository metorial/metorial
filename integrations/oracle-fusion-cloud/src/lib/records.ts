import { createApiServiceError, isApiErrorRecord } from 'slates';

export type OracleRecord = Record<string, unknown>;

export let requireRecord = (value: unknown, label = 'resource'): OracleRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Oracle Fusion returned an invalid ${label} object.`, {
      reason: 'oracle_fusion_invalid_response'
    });
  }
  return value;
};

export let recordArray = (value: unknown, label = 'items'): OracleRecord[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Oracle Fusion returned an invalid ${label} array.`, {
      reason: 'oracle_fusion_invalid_response'
    });
  }
  return value.map(item => requireRecord(item, label));
};

let invalidField = (key: string) =>
  createApiServiceError(`Oracle Fusion returned an invalid ${key} field.`, {
    reason: 'oracle_fusion_invalid_response'
  });

export let stringField = (record: OracleRecord, key: string): string | undefined => {
  let value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw invalidField(key);
  return value;
};

export let idField = (record: OracleRecord, key: string): string | undefined => {
  let value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  throw invalidField(key);
};

export let numberField = (record: OracleRecord, key: string): number | undefined => {
  let value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalidField(key);
  return value;
};

export let booleanField = (record: OracleRecord, key: string): boolean | undefined => {
  let value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw invalidField(key);
  return value;
};

export let changeIndicator = (record: OracleRecord): string | undefined => {
  let value = record.links;
  if (value === undefined && record['@context'] !== undefined) {
    let context = requireRecord(record['@context'], 'resource context');
    let headers =
      context.headers === undefined
        ? undefined
        : requireRecord(context.headers, 'resource headers');
    if (headers?.ETag !== undefined) return stringField(headers, 'ETag');
    value = context.links;
  }
  if (value === undefined) return undefined;
  let self = recordArray(value, 'resource links').find(
    link => stringField(link, 'rel') === 'self'
  );
  if (self?.properties === undefined) return undefined;
  return stringField(
    requireRecord(self.properties, 'self link properties'),
    'changeIndicator'
  );
};
