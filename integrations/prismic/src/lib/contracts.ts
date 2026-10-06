import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'prismic_validation' });
}
export function inconsistent(): never {
  throw createApiServiceError(
    'Prismic returned incomplete or inconsistent data. A write may have succeeded; inspect the exact resource before retrying.',
    { reason: 'prismic_response' }
  );
}
export const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  return result.success ? result.data : inconsistent();
};
const controls = (value: string) =>
  Array.from(value).some(
    character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
  );
export const validText = (value: unknown, label = 'value'): string => {
  if (typeof value !== 'string' || !value.length || controls(value))
    return invalid(`Provide a nonempty ${label} without control characters.`);
  try {
    encodeURIComponent(value);
  } catch {
    return invalid(`Provide a ${label} containing valid Unicode text.`);
  }
  return value;
};
export const exactId = (value: unknown): string => {
  const text = validText(value, 'resource ID');
  if (text !== text.trim() || text === '.' || text === '..' || /[/?#\\]/.test(text))
    return invalid('Provide an exact resource ID, without a URL or path.');
  return text;
};
export const repository = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) ||
    value.length > 63
  )
    return invalid(
      'Provide the repository subdomain from your Prismic URL, without a protocol or path.'
    );
  return value;
};
export const token = (value: unknown): string => {
  const text = validText(value, 'API token');
  if (/\s/.test(text)) return invalid('Provide an API token without whitespace.');
  return text;
};
export const upstream = (error: unknown) => {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? { response: { status } }
      : {},
    { providerLabel: 'Prismic', reason: 'prismic_api', parent: {} }
  );
};
export const protect = (value: unknown, credentials: readonly string[]) => {
  const secrets = credentials.filter(Boolean);
  if (!secrets.length) return;
  const variants = secrets.flatMap(secret => [
    secret,
    JSON.stringify(secret).slice(1, -1),
    encodeURIComponent(secret),
    Buffer.from(secret).toString('base64'),
    Buffer.from(secret).toString('base64url')
  ]);
  const visited = new Set<object>();
  let nodes = 0,
    inspectedBytes = 0;
  const inspect = (item: unknown, depth = 0): void => {
    if (++nodes > 100000 || depth > 64) inconsistent();
    if (typeof item === 'string') {
      let queue = [item];
      const queued = new Set(queue);
      for (let round = 0; round <= 4 && queue.length; round++) {
        const next: string[] = [];
        const enqueue = (text: string) => {
          if (queued.has(text)) return;
          queued.add(text);
          if (queued.size > 4096) inconsistent();
          next.push(text);
        };
        for (const text of queue) {
          inspectedBytes += Buffer.byteLength(text);
          if (inspectedBytes > 32 * 1024 * 1024) inconsistent();
          if (variants.some(secret => text.includes(secret))) inconsistent();
          if (round === 4) continue;
          const decoded = text
            .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16))
            )
            .replace(/(?:%[0-9a-f]{2})+/gi, bytes =>
              Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
            );
          if (decoded !== text) enqueue(decoded);
          for (const candidate of text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
            const bytes = Buffer.from(candidate[0], 'base64url');
            const decoded = bytes.toString('utf8');
            if (Buffer.from(decoded).equals(bytes)) enqueue(decoded);
          }
        }
        queue = next;
      }
    } else if (item && typeof item === 'object' && !visited.has(item)) {
      visited.add(item);
      let descriptors: Record<string, PropertyDescriptor>;
      try {
        descriptors = Object.getOwnPropertyDescriptors(item);
      } catch {
        inconsistent();
      }
      for (const [key, descriptor] of Object.entries(descriptors)) {
        inspect(key, depth + 1);
        if (!('value' in descriptor)) inconsistent();
        inspect(descriptor.value, depth + 1);
      }
    }
  };
  inspect(value);
};
export const integer = (
  value: number | undefined,
  min: number,
  max: number,
  label: string
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max))
    invalid(`${label} must be an integer from ${min} to ${max}.`);
};
export const assetSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().url(),
    filename: z.string(),
    extension: z.string(),
    size: z.number().int().nonnegative(),
    kind: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    notes: z.string().optional(),
    credits: z.string().optional(),
    alt: z.string().optional(),
    tags: z.array(z.object({ name: z.string() })).optional(),
    last_modified: z.number(),
    created_at: z.number()
  })
  .passthrough();
export const customTypeSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    repeatable: z.boolean(),
    status: z.boolean(),
    json: z.record(z.string(), z.unknown())
  })
  .passthrough();
export const sliceSchema = z
  .object({
    id: z.string().min(1),
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
    variations: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          docURL: z.string().optional(),
          version: z.string().optional(),
          primary: z.record(z.string(), z.unknown()).optional(),
          items: z.record(z.string(), z.unknown()).optional(),
          imageUrl: z.string().optional()
        })
        .passthrough()
    )
  })
  .passthrough();
