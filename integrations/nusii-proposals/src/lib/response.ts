import { createApiServiceError, isApiErrorRecord } from 'slates';

export let record = (value: unknown, field: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) throw invalid(field);
  return value;
};
export let invalid = (field: string) =>
  createApiServiceError(`Nusii returned an invalid or missing ${field}.`, {
    reason: 'nusii_invalid_response'
  });
export let text = (value: unknown, field: string, nonempty = false): string => {
  if (typeof value !== 'string' || (nonempty && !value.trim())) throw invalid(field);
  return value;
};
export let number = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid(field);
  return value;
};
export let boolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw invalid(field);
  return value;
};
export let id = (value: unknown): string => {
  if (
    (typeof value !== 'string' || !value.trim()) &&
    (typeof value !== 'number' || !Number.isFinite(value))
  )
    throw invalid('resource ID');
  return String(value);
};
export let array = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) throw invalid(field);
  return value;
};
export let optionalText = (value: unknown, field: string): string | undefined =>
  value == null ? undefined : text(value, field);
export let optionalNumber = (value: unknown, field: string): number | undefined =>
  value == null ? undefined : number(value, field);
export let optionalBoolean = (value: unknown, field: string): boolean | undefined =>
  value == null ? undefined : boolean(value, field);
export let nullableText = (value: unknown, field: string): string | null =>
  value == null ? null : text(value, field);
export let nullableNumber = (value: unknown, field: string): number | null =>
  value == null ? null : number(value, field);
export let relationshipIds = (
  item: Record<string, unknown>,
  key: string
): string[] | undefined => {
  if (item.relationships == null) return undefined;
  let relationship = record(item.relationships, 'relationships')[key];
  if (relationship == null) return undefined;
  return array(record(relationship, key).data, `${key} relationship`).map(value =>
    id(record(value, `${key} relationship`).id)
  );
};
