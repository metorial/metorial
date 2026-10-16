import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

// Provider variants and nulls stay intact in raw. Legacy summaries retain their
// exact types and omit only optional fields that cannot represent those values.
function normalizeValue(
  schema: z.core.$ZodType,
  value: unknown
): { success: boolean; data?: unknown } {
  let parsed = z.safeParse(schema, value);
  if (parsed.success) return parsed;
  if (schema instanceof z.ZodOptional) return normalizeValue(schema.unwrap(), value);
  if (schema instanceof z.ZodObject && isApiErrorRecord(value)) {
    let output: Record<string, unknown> = {};
    for (let [key, field] of Object.entries(schema.shape)) {
      let normalized = normalizeValue(field as z.core.$ZodType, value[key]);
      if (normalized.success) {
        if (normalized.data !== undefined) output[key] = normalized.data;
      } else if (!z.safeParse(field as z.core.$ZodType, undefined).success)
        return { success: false };
    }
    return { success: true, data: output };
  }
  if (schema instanceof z.ZodArray && Array.isArray(value)) {
    let entries = value.map(item => normalizeValue(schema.element, item));
    if (entries.every(item => item.success))
      return { success: true, data: entries.map(item => item.data) };
  }
  return { success: false };
}

export function normalizeOutput<T extends z.ZodObject>(
  schema: T,
  value: Record<string, unknown>
): z.output<T> {
  let parsed = normalizeValue(schema, value);
  if (!parsed.success)
    throw createApiServiceError(
      'Piloterr returned data that cannot represent the required response fields.'
    );
  return parsed.data as z.output<T>;
}

export function responseArray(value: unknown, name: string): any[] {
  if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError(`Piloterr returned an invalid ${name} list.`);
  }
  return value;
}

export function responseId(value: unknown): string | undefined {
  return typeof value === 'string'
    ? value
    : typeof value === 'number' && Number.isSafeInteger(value)
      ? String(value)
      : undefined;
}
