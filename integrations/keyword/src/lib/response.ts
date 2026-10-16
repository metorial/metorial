import { createApiServiceError, isApiErrorRecord } from 'slates';

export let requireText = (value: unknown, field: string, maxLength?: number) => {
  if (typeof value !== 'string' || !value.trim() || (maxLength && value.length > maxLength)) {
    throw createApiServiceError(
      `${field} is required and must be a nonempty string${maxLength ? ` of at most ${maxLength} characters` : ''}.`
    );
  }
};

export let requireInteger = (
  value: number | undefined,
  field: string,
  min: number,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${field} must be an integer from ${min}${max === undefined ? ' or greater' : ` to ${max}`}.`
    );
  }
};

export let requireDate = (value: string | undefined, field: string) => {
  if (value === undefined) return;
  let date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createApiServiceError(`${field} must be a valid date in YYYY-MM-DD format.`);
  }
};

export let requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Keyword.com returned an invalid ${label} response.`);
  }
  return value;
};

export let getCollection = (response: unknown, legacyKey: string): any[] => {
  let values = Array.isArray(response)
    ? response
    : isApiErrorRecord(response)
      ? (response.data ?? response[legacyKey])
      : undefined;
  if (!Array.isArray(values)) {
    throw createApiServiceError(`Keyword.com returned an invalid ${legacyKey} collection.`);
  }
  return values;
};

export let getResource = (response: unknown, legacyKey?: string) => {
  let body = requireRecord(response, 'resource');
  let resource = body.data ?? (legacyKey ? body[legacyKey] : undefined) ?? body;
  let record = requireRecord(resource, 'resource');
  if (
    (typeof record.id !== 'string' && typeof record.id !== 'number') ||
    String(record.id).trim() === ''
  ) {
    throw createApiServiceError('Keyword.com returned a resource without an identifier.');
  }
  return record;
};

export let getAttributes = (resource: unknown) => {
  let record = requireRecord(resource, 'resource');
  return record.attributes === undefined
    ? record
    : requireRecord(record.attributes, 'attributes');
};

export let nullableNumber = (value: unknown, field: string): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Keyword.com returned an invalid ${field} value.`);
  }
  return value;
};

export let keywordRank = (value: unknown) =>
  value === 'OTR' ? null : nullableNumber(value, 'keyword rank');

export let requireOperationResponse = (value: unknown, label: string) => {
  let body = requireRecord(value, label);
  let meta = requireRecord(body.meta, `${label} metadata`);
  requireText(meta.title, `Confirmation returned by Keyword.com for ${label}`);
};
