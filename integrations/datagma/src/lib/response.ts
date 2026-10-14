import { createApiServiceError } from 'slates';

export let parseDatagmaNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  let parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || (typeof value === 'string' && !value.trim())) {
    throw createApiServiceError(`Datagma returned an invalid numeric value for ${field}.`, {
      reason: 'datagma_invalid_response'
    });
  }
  return parsed;
};
