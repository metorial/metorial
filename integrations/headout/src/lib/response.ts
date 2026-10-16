import { createApiServiceError } from 'slates';

export let requireHeadoutText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Headout returned a missing or invalid ${field}.`, {
      reason: 'headout_invalid_response'
    });
  }
  return value;
};

export let requireHeadoutId = (value: unknown, field: string): string => {
  // Headout documents string IDs but also returns integer IDs in product examples.
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return requireHeadoutText(value, field);
};
