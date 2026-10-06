import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export const row = (value: unknown): value is Row =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export function invalid(message: string, reason = 'invalid_input'): never {
  throw createApiServiceError(message, { reason });
}
export function text(value: string | undefined, label: string, maximum = 5000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    invalid(`Provide a non-empty ${label} of at most ${maximum} characters.`);
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code === 0 || (character.length === 1 && code >= 0xd800 && code <= 0xdfff))
      invalid(`${label} must contain valid Unicode without null characters.`);
  }
  return value;
}
export function identifier(value: string | undefined, label: string, slug = false): string {
  const result = text(value, label, 200);
  if (!(slug ? /^[A-Za-z0-9_-]+$/ : /^\d+$/).test(result))
    invalid(
      `Provide a ${slug ? 'single ID or documented URL slug' : 'numeric ID'} for ${label}; use the corresponding list tool to discover it.`
    );
  return encodeURIComponent(result);
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;
  } catch {
    // An upstream object with throwing accessors is not a valid native JSON receipt.
  }
  return invalid(
    'Vimeo returned an incomplete or incompatible response. A write may already have taken effect; inspect the exact native resource before retrying.',
    'invalid_response'
  );
}
export function exact(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected)
    invalid(
      `Vimeo did not confirm the requested ${label}. Inspect the exact resource before retrying any write.`,
      'receipt_mismatch'
    );
}
export function uriId(
  uri: string,
  kind: 'videos' | 'users' | 'albums' | 'projects' | 'channels' | 'comments' | 'categories'
) {
  const expression =
    kind === 'albums' || kind === 'projects'
      ? new RegExp(`^/users/\\d+/${kind}/(\\d+)$`)
      : kind === 'comments'
        ? /^\/videos\/\d+\/comments\/(\d+)$/
        : new RegExp(`^/${kind}/(${kind === 'categories' ? '[A-Za-z0-9_-]+' : '\\d+'})$`);
  const match = expression.exec(uri);
  if (!match)
    invalid('Vimeo returned an incompatible native resource URI.', 'invalid_response');
  return match[1]!;
}
export function paging(input?: { page?: number; perPage?: number }) {
  for (const [label, value, maximum] of [
    ['page', input?.page, 1_000_000],
    ['perPage', input?.perPage, 100]
  ] as const)
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1 || value > maximum))
      invalid(`${label} must be an integer from 1 to ${maximum}.`);
  return { page: input?.page, per_page: input?.perPage };
}
export function apiFailure(error: unknown) {
  try {
    return buildApiServiceError(error, {
      providerLabel: 'Vimeo',
      reason: 'upstream_error',
      parent: {},
      extractMessage: () => 'Request failed',
      extractResponse: (upstream, helpers) => {
        const status = helpers.getStatus(upstream);
        return {
          status:
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
              ? status
              : undefined
        };
      },
      formatMessage: ({ status }) =>
        `Vimeo request failed${typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? ` (HTTP ${status})` : ''}. Check token scopes, membership and inputs. A write may have taken effect; inspect native state before retrying.`
    });
  } catch {
    return createApiServiceError(
      'Vimeo transport failed. Check the connection; inspect native state before retrying a write.',
      { reason: 'upstream_error' }
    );
  }
}
export function secretFree(value: unknown, secret: string): boolean {
  const variants = new Set([secret, Buffer.from(secret).toString('base64')]);
  let encoded = secret;
  for (let i = 0; i < 5; i++) {
    encoded = encodeURIComponent(encoded);
    variants.add(encoded);
  }
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries([...variants].map((item, i) => [`secret${i}`, item]))
  );
  const seen = new Set<object>();
  let count = 0;
  const visit = (entry: unknown, depth: number): boolean => {
    if (++count > 100_000 || depth > 30) return false;
    if (typeof entry === 'string') return redactor.redactEmbedded(entry) === entry;
    if (!entry || typeof entry !== 'object' || seen.has(entry)) return true;
    seen.add(entry);
    for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(entry)))
      if (
        !visit(key, depth + 1) ||
        !('value' in property) ||
        !visit(property.value, depth + 1)
      )
        return false;
    return true;
  };
  try {
    return visit(value, 0);
  } catch {
    return false;
  }
}
const nullable = z.string().nullish();
const pictures = z
  .object({ sizes: z.array(z.object({ link: z.string() }).passthrough()) })
  .nullish();
export const nativeUser = z
  .object({
    uri: z.string(),
    name: z.string(),
    link: z.string(),
    bio: nullable,
    location: nullable,
    email: nullable,
    account: z.string().optional(),
    created_time: z.string().optional(),
    pictures
  })
  .passthrough();
export const nativeVideo = z
  .object({
    uri: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    link: z.string(),
    duration: z.number().nonnegative(),
    created_time: z.string(),
    modified_time: z.string(),
    status: z.string(),
    width: z.number().nullish(),
    height: z.number().nullish(),
    privacy: z
      .object({
        view: z.string().optional(),
        embed: z.string().optional(),
        download: z.boolean().optional(),
        add: z.boolean().optional(),
        comments: z.string().optional()
      })
      .passthrough()
      .optional(),
    tags: z
      .array(
        z
          .object({
            name: z.string().optional(),
            tag: z.string().optional(),
            canonical: z.string().optional()
          })
          .passthrough()
      )
      .optional(),
    embed: z.object({ html: nullable }).passthrough().optional(),
    pictures,
    stats: z.object({ plays: z.number().nullish() }).passthrough().optional(),
    user: nativeUser.optional()
  })
  .passthrough();
const collectionMetadata = z
  .object({
    connections: z
      .object({
        videos: z.object({ total: z.number().int().nonnegative() }).passthrough().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()
  .optional();
export const nativeShowcase = z
  .object({
    uri: z.string(),
    name: z.string(),
    description: nullable,
    link: z.string(),
    privacy: z.object({ view: z.string() }).passthrough().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    metadata: collectionMetadata,
    user: nativeUser.optional()
  })
  .passthrough();
export const nativeFolder = z
  .object({
    uri: z.string(),
    name: z.string(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    metadata: collectionMetadata,
    user: nativeUser.optional()
  })
  .passthrough();
export const nativeChannel = nativeShowcase;
export const nativeComment = z
  .object({ uri: z.string(), text: z.string(), created_on: z.string(), user: nativeUser })
  .passthrough();
export const nativeCategory = z
  .object({
    uri: z.string(),
    name: z.string(),
    link: z.string(),
    top_level: z.boolean().optional(),
    pictures
  })
  .passthrough();
export const nativeTag = z
  .object({ name: z.string(), tag: z.string().optional(), uri: z.string() })
  .passthrough();
export const nativeDomain = z.object({ domain: z.string(), uri: z.string() }).passthrough();
export const pageSchema = <T>(item: z.ZodType<T>) =>
  z
    .object({
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      per_page: z.number().int().positive(),
      paging: z
        .object({ next: nullable, previous: nullable, first: nullable, last: nullable })
        .passthrough()
        .optional(),
      data: z.array(item).max(1000)
    })
    .passthrough();
