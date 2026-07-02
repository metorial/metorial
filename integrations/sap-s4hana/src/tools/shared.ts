import { z } from 'zod';
import { type SapAuthOutput, type SapConfig, SapS4HanaClient } from '../lib/client';
import { sapValidationError } from '../lib/errors';

export let rawRecordSchema = z
  .record(z.string(), z.unknown())
  .describe('Raw SAP OData record for fields not normalized by this tool.');

export let pageInputSchema = {
  top: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Maximum number of SAP records to return. Defaults to 25 and cannot exceed 100.'
    ),
  skipToken: z
    .string()
    .optional()
    .describe('SAP next-page token or next link returned by a previous list call.'),
  orderBy: z
    .string()
    .optional()
    .describe('SAP OData $orderby expression, for example "LastChangeDateTime desc".'),
  allowBroadQuery: z
    .boolean()
    .optional()
    .describe('Set true to allow an unfiltered query against a large SAP resource.')
};

export let pageOutputSchema = z.object({
  top: z.number().describe('SAP $top value requested.'),
  count: z.number().describe('Number of records returned in this page.'),
  nextPageToken: z
    .string()
    .optional()
    .describe('SAP server next link or token to pass as skipToken on the next call.')
});

export type PageInput = {
  top?: number;
  skipToken?: string;
  orderBy?: string;
  allowBroadQuery?: boolean;
};

export let createClient = (ctx: { auth: SapAuthOutput; config: SapConfig }) =>
  new SapS4HanaClient({
    auth: ctx.auth,
    config: ctx.config
  });

export let topValue = (input: PageInput) => input.top ?? 25;

export let pageSummary = (input: PageInput, count: number, nextPageToken?: string) => ({
  top: topValue(input),
  count,
  nextPageToken
});

export let ensureFilteredQuery = (
  input: PageInput,
  filters: Record<string, unknown>,
  resourceLabel: string
) => {
  if (input.skipToken || input.allowBroadQuery) return;

  let hasFilter = Object.values(filters).some(
    value => value !== undefined && value !== null && value !== ''
  );

  if (!hasFilter) {
    throw sapValidationError(
      `Provide at least one ${resourceLabel} filter or set allowBroadQuery=true.`
    );
  }
};

export let compactOutput = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(([, child]) => child !== undefined)
  ) as Partial<T>;

export let stringValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

export let numberValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    let parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export let booleanValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return typeof value === 'boolean' ? value : undefined;
};

export let recordValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
};

export let navigationArray = (record: Record<string, unknown>, key: string) => {
  let value = recordValue(record, key);
  let results = value?.results;
  return Array.isArray(results) ? (results as Record<string, unknown>[]) : [];
};

export let firstNavigationRecord = (record: Record<string, unknown>, key: string) => {
  let value = recordValue(record, key);
  if (!value) return undefined;
  let results = value.results;
  if (Array.isArray(results)) return results[0] as Record<string, unknown> | undefined;
  return value;
};

export let uniqueStrings = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value)))
];
