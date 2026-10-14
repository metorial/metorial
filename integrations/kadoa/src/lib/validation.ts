import { createApiServiceError } from 'slates';

export let validateKadoaInteger = (
  value: number | undefined | null,
  field: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (value === undefined || value === null) return;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw createApiServiceError(
      `${field} must be a whole number between ${minimum} and ${maximum}.`
    );
  }
};
