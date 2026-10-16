import { createApiServiceError } from 'slates';

export let prooflyId = (value: unknown, resource: string) => {
  if (
    (typeof value === 'string' && value.trim()) ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return String(value);
  }
  throw createApiServiceError(`Proofly returned a ${resource} without a valid ID.`, {
    reason: 'proofly_invalid_response'
  });
};

export let prooflyString = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === 'string');

export let prooflyNumber = (...values: unknown[]) =>
  values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));

export let prooflyBoolean = (...values: unknown[]) =>
  values.find((value): value is boolean => typeof value === 'boolean');
