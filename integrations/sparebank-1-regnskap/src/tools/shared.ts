import { pickDefined } from 'slates';
import { z } from 'zod';
import type { SpareBankRegnskapAuthOutput } from '../auth';
import type { SpareBankRegnskapConfig } from '../config';
import { SpareBankRegnskapClient, type UnimicroQueryParams } from '../lib/client';
import { spareBankRegnskapValidationError } from '../lib/errors';

export type ToolContext = {
  auth: SpareBankRegnskapAuthOutput;
  config: SpareBankRegnskapConfig;
};

export let rawRecordSchema = z
  .record(z.string(), z.any())
  .describe('Raw SpareBank 1 Regnskap / Unimicro record');

export let queryInputShape = {
  filter: z
    .string()
    .optional()
    .describe("Advanced Unimicro filter expression, such as contains(Name,'Acme')."),
  select: z
    .string()
    .optional()
    .describe('Comma-separated Unimicro select expression for fields to return.'),
  expand: z
    .string()
    .optional()
    .describe('Comma-separated Unimicro expand expression for related entities.'),
  top: z.number().int().min(1).max(1000).optional().describe('Maximum records to return.'),
  skip: z.number().int().min(0).optional().describe('Records to skip for pagination.'),
  companyKey: z.string().optional().describe('Override Unimicro CompanyKey for this call.')
};

export let listMetadataSchema = {
  returnedCount: z.number().describe('Number of records returned by this request.'),
  top: z.number().optional().describe('Requested top value.'),
  skip: z.number().optional().describe('Requested skip value.')
};

export let createClient = (ctx: ToolContext) => new SpareBankRegnskapClient(ctx.auth);

export let companyKeyFor = (ctx: ToolContext, inputCompanyKey?: string) =>
  inputCompanyKey?.trim() || ctx.config.companyKey?.trim() || undefined;

export let requireCompanyKey = (ctx: ToolContext, inputCompanyKey?: string) => {
  let companyKey = companyKeyFor(ctx, inputCompanyKey);
  if (!companyKey) {
    throw spareBankRegnskapValidationError(
      'companyKey is required. Provide it in tool input or integration config.'
    );
  }

  return companyKey;
};

export let asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export let asString = (value: unknown) =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;

export let asNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    let parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export let asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

export let valueByKeys = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }

  return undefined;
};

export let nestedRecord = (record: Record<string, unknown>, key: string) =>
  asRecord(record[key]);

export let stringByKeys = (record: Record<string, unknown>, keys: string[]) =>
  asString(valueByKeys(record, keys));

export let numberByKeys = (record: Record<string, unknown>, keys: string[]) =>
  asNumber(valueByKeys(record, keys));

export let booleanByKeys = (record: Record<string, unknown>, keys: string[]) =>
  asBoolean(valueByKeys(record, keys));

export let nameFrom = (record: Record<string, unknown>) =>
  stringByKeys(record, [
    'Name',
    'DisplayName',
    'CustomerName',
    'SupplierName',
    'InvoiceReceiverName'
  ]) ?? stringByKeys(nestedRecord(record, 'Info'), ['Name', 'DisplayName']);

export let idFrom = (record: Record<string, unknown>) =>
  numberByKeys(record, ['ID', 'Id', 'id']);

let escapeFilterString = (value: string) => value.replace(/'/g, "''");

export let stringEqualsFilter = (field: string, value: string | undefined) =>
  value?.trim() ? `${field} eq '${escapeFilterString(value.trim())}'` : undefined;

export let numberEqualsFilter = (field: string, value: number | undefined) =>
  value === undefined ? undefined : `${field} eq ${value}`;

export let booleanEqualsFilter = (field: string, value: boolean | undefined) =>
  value === undefined ? undefined : `${field} eq ${value}`;

export let containsFilter = (field: string, value: string | undefined) =>
  value?.trim() ? `contains(${field},'${escapeFilterString(value.trim())}')` : undefined;

export let dateFromFilter = (field: string, value: string | undefined) =>
  value?.trim() ? `${field} ge '${escapeFilterString(value.trim())}'` : undefined;

export let dateToFilter = (field: string, value: string | undefined) =>
  value?.trim() ? `${field} le '${escapeFilterString(value.trim())}'` : undefined;

export let combineFilters = (filters: Array<string | undefined>) =>
  filters.filter(Boolean).join(' and ') || undefined;

export let queryParams = (
  input: {
    filter?: string;
    select?: string;
    expand?: string;
    top?: number;
    skip?: number;
  },
  generatedFilter?: string
): UnimicroQueryParams =>
  pickDefined({
    filter: combineFilters([generatedFilter, input.filter]),
    select: input.select,
    expand: input.expand,
    top: input.top,
    skip: input.skip
  });

export let listMetadata = (items: unknown[], input: { top?: number; skip?: number }) => ({
  returnedCount: items.length,
  top: input.top,
  skip: input.skip
});
