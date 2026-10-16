import { createApiServiceError, isApiErrorRecord } from 'slates';

export let validateInteger = (value: number | undefined, name: string, min?: number) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || (min !== undefined && value < min))
  ) {
    throw createApiServiceError(
      `${name} must be a whole number${min === undefined ? '' : ` of at least ${min}`}.`,
      { reason: 'piggy_invalid_input' }
    );
  }
};

export let validatePagination = (
  limit: number | undefined,
  page: number | undefined,
  max: number,
  min = 1
) => {
  validateInteger(limit, 'limit', min);
  validateInteger(page, 'page', 1);
  if (limit !== undefined && limit > max)
    throw createApiServiceError(`limit cannot exceed ${max}.`, {
      reason: 'piggy_invalid_input'
    });
};

export let validateResponse = (
  value: unknown,
  kind: 'list' | 'object' | 'ack'
): Record<string, any> => {
  if (
    !isApiErrorRecord(value) ||
    !('data' in value) ||
    (kind === 'list' &&
      (!Array.isArray(value.data) || value.data.some(item => !isApiErrorRecord(item)))) ||
    (kind === 'object' &&
      (!isApiErrorRecord(value.data) || Object.keys(value.data).length === 0))
  ) {
    throw createApiServiceError(
      'Piggy returned an invalid response. Expected a data envelope with the requested resource.',
      { reason: 'piggy_invalid_response' }
    );
  }
  return value;
};

export let requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value)
    throw createApiServiceError(`Piggy did not return a valid ${field}.`, {
      reason: 'piggy_invalid_response'
    });
  return value;
};

export let requiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError(`Piggy did not return a valid ${field}.`, {
      reason: 'piggy_invalid_response'
    });
  return value;
};

// Typed aliases omit nulls; the original provider values remain available in raw.
export let mapEntity = <T extends Record<string, any>>(
  raw: Record<string, any>,
  aliases: T
) => ({
  ...raw,
  raw,
  ...aliases,
  ...Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => [key, value ?? undefined])
  )
});
