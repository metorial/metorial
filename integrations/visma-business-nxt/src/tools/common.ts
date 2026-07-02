import { z } from 'zod';
import { BusinessNxtClient } from '../lib/client';
import { vismaBusinessNxtServiceError } from '../lib/errors';

export let sortDirectionSchema = z
  .enum(['ASC', 'DESC'])
  .optional()
  .describe('Optional sort direction for the primary display field.');

export let firstSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Number of rows to return from the start of the result set.');

export let lastSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Number of rows to return from the end of the result set.');

export let afterSchema = z
  .string()
  .optional()
  .describe('Opaque cursor returned as nextCursor by a previous paginated response.');

export let companyNoSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe(
    'Visma.net company ID used with useCompany(no:). Defaults to selectedCompanyNo in integration config.'
  );

export let paginationSchema = z.object({
  totalCount: z.number().optional(),
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
  startCursor: z.string().optional(),
  endCursor: z.string().optional(),
  nextCursor: z.string().optional()
});

export let providerSchema = z.object({
  tableName: z.string(),
  primaryKeys: z.record(z.string(), z.number())
});

export let getDefaultFirst = (
  inputFirst: number | undefined,
  inputLast: number | undefined,
  defaultPageSize?: number
) => {
  if (inputFirst !== undefined || inputLast !== undefined) return inputFirst;
  return defaultPageSize ?? 50;
};

export let resolveCompanyNo = (
  companyNo: number | undefined,
  selectedCompanyNo: number | undefined
) => {
  let resolved = companyNo ?? selectedCompanyNo;

  if (resolved === undefined) {
    throw vismaBusinessNxtServiceError(
      'A Visma.net company ID is required. Provide companyNo or set selectedCompanyNo in the integration config.',
      { reason: 'company_no_required' }
    );
  }

  return resolved;
};

export let createBusinessNxtClient = (auth: { token: string }) =>
  new BusinessNxtClient({ token: auth.token });
