import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let readCollection = (
  data: unknown,
  field: string,
  alternate?: string
): Record<string, any>[] => {
  let records = Array.isArray(data)
    ? data
    : isApiErrorRecord(data)
      ? (data[field] ?? (alternate ? data[alternate] : undefined))
      : undefined;
  if (!Array.isArray(records) || records.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError(`Eventzilla returned an invalid ${field} response.`);
  }
  return records;
};

export let readItem = (
  data: unknown,
  field: string,
  alternate?: string
): Record<string, any> => {
  let item =
    Array.isArray(data) ||
    (isApiErrorRecord(data) &&
      (field in data || (alternate !== undefined && alternate in data)))
      ? readCollection(data, field, alternate)[0]
      : data;
  if (!isApiErrorRecord(item))
    throw createApiServiceError(`Eventzilla returned no ${field} record.`);
  return item;
};

export let asText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))
    return String(value);
  throw createApiServiceError('Eventzilla returned an invalid text or numeric value.');
};

export let asBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && /^(true|false)$/i.test(value))
    return value.toLowerCase() === 'true';
  throw createApiServiceError('Eventzilla returned an invalid boolean value.');
};

export let requireText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(
      `Eventzilla did not return ${field}. Check the resource before trying the operation again.`
    );
  return value;
};

export let paginationSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  total: z.number()
});

export let readPagination = (data: unknown) => {
  if (!isApiErrorRecord(data) || data.pagination === undefined) return undefined;
  let pagination = Array.isArray(data.pagination) ? data.pagination[0] : data.pagination;
  if (pagination === undefined) return undefined;
  if (
    !isApiErrorRecord(pagination) ||
    !['offset', 'limit', 'total'].every(
      field => typeof pagination[field] === 'number' && Number.isFinite(pagination[field])
    )
  )
    throw createApiServiceError('Eventzilla returned invalid pagination metadata.');
  return {
    offset: pagination.offset as number,
    limit: pagination.limit as number,
    total: pagination.total as number
  };
};
