import { z } from 'zod';
import type { UnimicroConfig } from '../config';
import { compact, type UnimicroAuthOutput, UnimicroClient } from '../lib/client';
import { unimicroValidationError } from '../lib/errors';

export type ToolContext = {
  auth: UnimicroAuthOutput;
  config: UnimicroConfig;
  input: Record<string, any>;
};

export let rawRecordSchema = z
  .record(z.string(), z.unknown())
  .describe('Raw UniMicro record for fields not normalized by this tool.');

export let pageInfoSchema = z.object({
  top: z.number().describe('Number of records requested.'),
  skip: z.number().describe('Number of records skipped.'),
  count: z.number().describe('Number of records returned.'),
  nextSkip: z.number().optional().describe('Next skip value when another page may exist.')
});

export let companyKeyInputSchema = z
  .string()
  .optional()
  .describe('Override UniMicro CompanyKey for this request. Defaults to integration config.');

export let topInputSchema = z
  .number()
  .int()
  .min(1)
  .max(50)
  .optional()
  .describe('Maximum records to return. Defaults to config.defaultTop or 50.');

export let skipInputSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe('Number of records to skip for UniMicro pagination.');

export let filterInputSchema = z
  .string()
  .optional()
  .describe(
    'Advanced UniMicro filter expression, for example "StatusCode eq 41004" or "contains(CustomerName,\'Acme\')".'
  );

export let selectInputSchema = z
  .string()
  .optional()
  .describe('Comma-separated UniMicro select fields to return.');

export let expandInputSchema = z
  .string()
  .optional()
  .describe('Comma-separated UniMicro expand expression, for example "Items.Product".');

export let includeDeletedInputSchema = z
  .boolean()
  .optional()
  .describe(
    'Set true to include deleted records. By default list tools filter records with Deleted eq false when the resource has a Deleted field.'
  );

export let updatedSinceInputSchema = z
  .string()
  .optional()
  .describe('Filter records with UpdatedAt greater than or equal to this ISO date/time.');

export let idInputSchema = z.number().int().min(1).describe('UniMicro numeric record id.');

export let createClient = (ctx: ToolContext) =>
  new UnimicroClient({
    auth: ctx.auth,
    config: ctx.config,
    companyKey: ctx.input.companyKey
  });

let value = (record: Record<string, unknown>, key: string) => record[key];

export let recordValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'object' && child !== null && !Array.isArray(child)
    ? (child as Record<string, unknown>)
    : undefined;
};

export let stringValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'string' ? child : undefined;
};

export let numberValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'number' ? child : undefined;
};

export let booleanValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'boolean' ? child : undefined;
};

export let arrayValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return Array.isArray(child) ? child : undefined;
};

export let unknownString = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

export let stringFromKeys = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    let child = unknownString(record[key]);
    if (child) return child;
  }
  return undefined;
};

export let numberFromKeys = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    let child = record[key];
    if (typeof child === 'number') return child;
  }
  return undefined;
};

export let requireAtLeastOne = (values: Record<string, unknown>, message: string) => {
  if (
    Object.values(values).some(child => child !== undefined && child !== null && child !== '')
  ) {
    return;
  }

  throw unimicroValidationError(message);
};

export let compactOutput = compact;
