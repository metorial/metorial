import { createApiServiceError, isApiErrorRecord } from 'slates';

export let invalidResponse = (field: string): never => {
  throw createApiServiceError(`npm returned an invalid ${field}. Please try again.`, {
    reason: 'npm_invalid_response'
  });
};

export let record = (value: unknown, field: string): Record<string, unknown> =>
  isApiErrorRecord(value) ? value : invalidResponse(field);

export let array = (value: unknown, field: string): unknown[] =>
  Array.isArray(value) ? value : invalidResponse(field);

export let text = (value: unknown, field: string): string =>
  typeof value === 'string' ? value : invalidResponse(field);

export let number = (value: unknown, field: string): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : invalidResponse(field);

// Historical package.json metadata may contain null for optional text fields.
// Keep the normalized string contract; callers retain the unmodified source separately.
export let optionalText = (value: unknown, field: string): string | undefined =>
  value == null ? undefined : text(value, field);

export let optionalNumber = (value: unknown, field: string): number | undefined =>
  value == null ? undefined : number(value, field);

export let stringRecord = (value: unknown, field: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record(value, field)).map(([key, item]) => [key, text(item, field)])
  );

export let optionalStrings = (value: unknown, field: string): string[] | undefined =>
  value == null ? undefined : array(value, field).map(item => text(item, field));
