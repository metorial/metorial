import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let baseIdSchema = z
  .string()
  .describe('Base ID. Call list_bases to discover accessible bases.');
export let tableIdSchema = z
  .string()
  .describe('Table ID. Call list_tables to discover tables in a base.');
export let pageInfoSchema = z.object({
  totalRows: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  isFirstPage: z.boolean().optional(),
  isLastPage: z.boolean().optional()
});

export let requireRecord = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`NocoDB returned an invalid ${label} response.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(`NocoDB did not return ${label}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let responseList = (value: unknown, label: string): Record<string, any>[] => {
  let list = isApiErrorRecord(value) ? value.list : value;
  if (!Array.isArray(list)) {
    throw createApiServiceError(`NocoDB returned an invalid ${label} list.`, {
      reason: 'invalid_response'
    });
  }
  return list.map(item => requireRecord(item, label));
};

export let optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export let optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return value === 1;
  return undefined;
};

// v2 data endpoints document integer pagination; preserve the public number schemas.
export let validatePagination = (limit?: number, offset?: number) => {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw createApiServiceError('limit must be a positive integer.');
  }
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    throw createApiServiceError('offset must be a non-negative integer.');
  }
};
