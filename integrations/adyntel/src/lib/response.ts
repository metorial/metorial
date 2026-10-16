import { isApiErrorRecord } from 'slates';
import type { z } from 'zod';

// Provider fields remain in rawResponse; summaries retain only values their public schema accepts.
export function mapSummary<S extends z.ZodObject>(
  schema: S,
  value: Record<string, unknown>,
  aliases?: Record<string, string>
): z.output<S>;
export function mapSummary<S extends z.ZodObject>(
  schema: S,
  value: unknown,
  aliases?: Record<string, string>
): z.output<S> | undefined;
export function mapSummary<S extends z.ZodObject>(
  schema: S,
  value: unknown,
  aliases: Record<string, string> = {}
): z.output<S> | undefined {
  if (!isApiErrorRecord(value)) return undefined;
  let output: Record<string, unknown> = { ...value };
  for (let [key, field] of Object.entries(schema.shape)) {
    let source = aliases[key];
    let candidate = source && value[source] !== undefined ? value[source] : value[key];
    let parsed = (field as z.ZodType).safeParse(candidate);
    if (parsed.success && parsed.data !== undefined) output[key] = parsed.data;
    else delete output[key];
  }
  return schema.parse(output);
}

export let flattenAds = (value: unknown): Record<string, unknown>[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.flat(Number.POSITIVE_INFINITY).filter(isApiErrorRecord);
};

export let adIdentifier = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return undefined;
};
