import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'ghost_input', parent: {} });
export const malformed = () =>
  createApiServiceError(
    'Ghost returned an unexpected response. A write may already have succeeded; inspect its exact resource before retrying.',
    { reason: 'ghost_response', parent: {} }
  );
export const resourceId = z
  .string()
  .min(1)
  .max(256)
  .refine(
    v =>
      v !== '.' &&
      v !== '..' &&
      !/[\\/%?#]/.test(v) &&
      !Array.from(v).some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127),
    'Use an exact native ID or slug, without path or query components.'
  );
export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  next: z.number().int().positive().nullable(),
  prev: z.number().int().positive().nullable()
});
export function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformed();
  return value as Record<string, any>;
}
export function rows(value: unknown, key: string): Record<string, any>[] {
  const result = object(value)[key];
  if (!Array.isArray(result)) throw malformed();
  return result.map(row => {
    const r = object(row);
    if (!resourceId.safeParse(r.id).success) throw malformed();
    return r;
  });
}
export function one(value: unknown, key: string, expected?: { id?: string; slug?: string }) {
  const items = rows(value, key);
  if (
    items.length !== 1 ||
    (expected?.id && items[0]!.id !== expected.id) ||
    (expected?.slug && items[0]!.slug !== expected.slug)
  )
    throw malformed();
  return items[0]!;
}
export function pagination(value: unknown, count: number) {
  const native = object(object(object(value).meta).pagination);
  const parsed = paginationSchema.safeParse({
    ...native,
    limit: native.limit === 'all' ? count : native.limit
  });
  if (
    !parsed.success ||
    !Object.values(parsed.data).every(v => v === null || Number.isSafeInteger(v)) ||
    count > parsed.data.total ||
    (parsed.data.next !== null && parsed.data.next <= parsed.data.page)
  )
    throw malformed();
  return parsed.data;
}
export function validateContentWrite(input: Record<string, unknown>) {
  if (input.action === 'create' && (typeof input.title !== 'string' || !input.title.trim()))
    throw invalid('title is required for creating content.');
  if (input.html !== undefined && input.lexical !== undefined)
    throw invalid('Provide either HTML or Lexical content.');
  if (input.html !== undefined && input.source !== 'html')
    throw invalid(
      'Set source to html when providing HTML content; Ghost converts HTML to Lexical and may change its formatting.'
    );
  if (input.source === 'html' && input.html === undefined)
    throw invalid('source html requires HTML content.');
  if (input.lexical !== undefined) {
    try {
      if (!object(JSON.parse(String(input.lexical))).root) throw malformed();
    } catch {
      throw invalid('lexical must be a JSON document with a root node.');
    }
  }
  if (
    input.updatedAt !== undefined &&
    (typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt)))
  )
    throw invalid('updatedAt must be the last known native timestamp.');
  if (
    input.status === 'scheduled' &&
    (typeof input.publishedAt !== 'string' ||
      !Number.isFinite(Date.parse(input.publishedAt)) ||
      Date.parse(input.publishedAt) <= Date.now())
  )
    throw invalid('Scheduled content requires publishedAt in the future.');
}
