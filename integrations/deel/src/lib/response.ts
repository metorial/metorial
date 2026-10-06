import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

// Known fields stay optional because record variants differ by token and contract type.
export let resourceSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullable().optional(),
    name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    contract_id: z.string().nullable().optional(),
    hris_profile_id: z.string().nullable().optional(),
    created: z.boolean().optional()
  })
  .passthrough();
export let pageSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    total_rows: z.number().optional(),
    offset: z.number().optional(),
    items_per_page: z.number().optional()
  })
  .passthrough();

export let objectResponse = (value: unknown, label: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`Deel returned an invalid ${label} response.`, {
      reason: 'deel_response'
    });
  return value;
};
export let dataObject = (value: unknown, label: string) =>
  objectResponse(objectResponse(value, label).data, label);
export let objectList = (value: unknown, label: string): Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item)))
    throw createApiServiceError(`Deel returned an invalid ${label} list.`, {
      reason: 'deel_response'
    });
  return value;
};
export let dataList = (value: unknown, label: string) =>
  objectList(objectResponse(value, label).data, label);
export let exactResourceId = (value: unknown): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (typeof value === 'string' && value.trim() && value === value.trim()) return value;
  throw createApiServiceError('Deel did not return an exact resource identifier.', {
    reason: 'deel_response'
  });
};
export let responsePage = (value: unknown) => {
  let page = objectResponse(value, 'pagination').page;
  if (page === undefined) return undefined;
  let parsed = pageSchema.safeParse(page);
  if (!parsed.success)
    throw createApiServiceError('Deel returned invalid pagination metadata.', {
      reason: 'deel_response'
    });
  return parsed.data;
};
export let requireText = (value: unknown, field: string): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(character => [0, 10, 13].includes(character.charCodeAt(0)))
  )
    throw createApiServiceError(`${field} is required and must be nonempty text.`, {
      reason: 'invalid_input'
    });
  return value;
};
export let requireDate = (value: unknown, field: string) => {
  let date = requireText(value, field);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw createApiServiceError(`${field} must be a real date in YYYY-MM-DD format.`, {
      reason: 'invalid_input'
    });
  return date;
};
export let requireNumber = (value: unknown, field: string, minimum = 0) => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > Number.MAX_SAFE_INTEGER ||
    value < minimum
  )
    throw createApiServiceError(
      `${field} must be a finite number between ${minimum} and ${Number.MAX_SAFE_INTEGER}.`,
      { reason: 'invalid_input' }
    );
  return value;
};
export let validateOffset = (offset: number | undefined) => {
  if (
    offset !== undefined &&
    (!Number.isSafeInteger(offset) || offset < 0 || offset > 999999999)
  )
    throw createApiServiceError('offset must be an integer between 0 and 999999999.');
};
export let validateLimit = (limit: number | undefined, maximum: number) => {
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum))
    throw createApiServiceError(`limit must be an integer between 1 and ${maximum}.`);
};

export let acknowledgedData = (
  value: unknown,
  label: string,
  flag: 'created' | 'deleted' = 'created'
) => {
  let data = dataObject(value, label);
  if (data[flag] !== true)
    throw createApiServiceError(
      `Deel did not acknowledge ${label}. Verify the resource before retrying.`,
      { reason: 'deel_response' }
    );
  return data;
};
