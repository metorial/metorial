import { createApiServiceError } from 'slates';

export let validateWholeNumber = (
  value: number | undefined,
  name: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be a whole number between ${min} and ${max}.`);
  }
};

export let validateText = (value: string, name: string) => {
  if (!value.trim()) throw createApiServiceError(`${name} cannot be empty.`);
};

export let readNumber = (value: unknown, name: string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  throw createApiServiceError(`ClassMarker returned an invalid ${name}.`);
};

export let optionalNumber = (value: unknown, name: string) =>
  value === undefined || value === null ? undefined : readNumber(value, name);
