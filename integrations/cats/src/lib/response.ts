import { createApiServiceError, isApiErrorRecord } from 'slates';

export let requiredId = (value: unknown, label: string): string => {
  if (
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === 'string' &&
      /^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value)))
  ) {
    return String(value);
  }
  throw createApiServiceError(`CATS returned an invalid or missing ${label} ID.`);
};

export let collection = (data: unknown, key: string): Record<string, any>[] => {
  if (!isApiErrorRecord(data) || !isApiErrorRecord(data._embedded)) {
    throw createApiServiceError(`CATS returned a malformed ${key} collection.`);
  }
  let items = data._embedded[key];
  if (!Array.isArray(items) || !items.every(isApiErrorRecord)) {
    throw createApiServiceError(`CATS returned a malformed ${key} collection.`);
  }
  return items;
};

export let validateNumber = (value: unknown, label: string, min = 1, max?: number) => {
  if (
    value !== undefined &&
    (typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value < min ||
      (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${label} must be a whole number from ${min}${max === undefined ? '' : ` to ${max}`}.`
    );
  }
};
