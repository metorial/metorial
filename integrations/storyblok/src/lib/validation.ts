import { buildApiServiceError, createApiServiceError, getResponseHeaderValue } from 'slates';
import { z } from 'zod';

export const spaceIdInput = z
  .string()
  .optional()
  .describe(
    'Numeric space ID from List Spaces; defaults to the authorized plugin space or saved legacy space setting. Use the matching regional credential.'
  );
export const pagingInput = {
  page: z.number().optional().describe('Positive page number; default 1.'),
  perPage: z
    .number()
    .optional()
    .describe('Items per page; default 25, maximum 1000 unless stated otherwise.')
};
export const pagingOutput = {
  page: z.number().optional(),
  perPage: z.number().optional(),
  total: z.number().optional(),
  nextPage: z.number().optional()
};
export const nativeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export function id(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw createApiServiceError(
      `Provide ${field} as a positive, exact numeric ID from a discovery or read tool.`,
      { reason: 'invalid_id' }
    );
  }
  return value;
}
export function integer(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw createApiServiceError(
      `Provide ${field} as an integer between ${minimum} and ${maximum}.`,
      { reason: 'invalid_integer' }
    );
  }
  return value;
}
export function text(value: unknown, field: string, allowEmpty = false): string {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    value.length > 65536 ||
    [...value].some(c => c.charCodeAt(0) === 0)
  ) {
    throw createApiServiceError(
      `Provide a valid ${field}${allowEmpty ? ' (an empty value is allowed)' : ''}.`,
      { reason: 'invalid_field' }
    );
  }
  return value;
}
export function token(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 8192 ||
    [...value].some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  ) {
    throw createApiServiceError('Reconnect with a valid Storyblok management credential.', {
      reason: 'invalid_auth'
    });
  }
  return value;
}
export function own(value: unknown, key: string): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}
export function errorData(error: unknown): unknown {
  // Installed ServiceError stores its safe ErrorRecord behind a prototype data getter.
  return own(error, 'data') ?? own(own(error, 'error'), 'data');
}
export function upstreamError(error: unknown, operation = 'request') {
  const response = own(error, 'response');
  const data = errorData(error);
  const rawStatus =
    own(response, 'status') ??
    own(own(data, 'upstream'), 'status') ??
    own(data, 'upstreamStatus') ??
    own(data, 'status');
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : undefined;
  const remedy =
    status === 401
      ? 'Reconnect the credential.'
      : status === 403
        ? 'Check space permissions, OAuth scopes and plan access.'
        : status === 429
          ? 'Wait before retrying reads; verify any write before retrying it.'
          : 'Read the exact resource before retrying a write; its outcome may be uncertain.';
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Storyblok',
      reason: 'storyblok_api_error',
      operation,
      parent: {},
      extractMessage: () => remedy
    }
  );
}
export function clean(value: unknown, secrets: readonly string[] = []): unknown {
  const needles = secrets
    .filter(Boolean)
    .flatMap(s => [
      s,
      encodeURIComponent(s),
      Buffer.from(s).toString('base64'),
      Buffer.from(s).toString('base64url')
    ]);
  function containsCredential(value: string): boolean {
    if (needles.some(s => value.includes(s))) return true;
    let decoded = value;
    for (let round = 0; round < 2; round++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
        if (needles.some(s => decoded.includes(s))) return true;
      } catch {
        break;
      }
    }
    // Credentials can be reflected inside an encoded sentence or JSON value.
    for (const candidate of decoded.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? []) {
      if (candidate.length > 131072) continue;
      const plain = Buffer.from(candidate, 'base64').toString('utf8');
      if (needles.some(s => plain.includes(s))) return true;
    }
    return false;
  }
  let count = 0;
  const seen = new WeakSet<object>();
  function visit(v: unknown, depth: number): unknown {
    if (++count > 100000 || depth > 40)
      throw createApiServiceError('Storyblok returned an oversized or malformed result.', {
        reason: 'invalid_response'
      });
    if (typeof v === 'string') {
      if (containsCredential(v))
        throw createApiServiceError(
          'Storyblok returned credential data in a result. Reconnect and retry a read.',
          { reason: 'unsafe_response' }
        );
      return v;
    }
    if (!v || typeof v !== 'object') return v;
    if (seen.has(v))
      throw createApiServiceError('Storyblok returned a cyclic result.', {
        reason: 'invalid_response'
      });
    seen.add(v);
    const output: Record<string, unknown> | unknown[] = Array.isArray(v)
      ? []
      : Object.create(null);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (!descriptor.enumerable) continue;
      if (containsCredential(key))
        throw createApiServiceError(
          'Storyblok returned credential data in a result property.',
          { reason: 'unsafe_response' }
        );
      if (!('value' in descriptor))
        throw createApiServiceError('Storyblok returned an invalid result property.', {
          reason: 'invalid_response'
        });
      if (['preview_token', 'access_token', 'refresh_token', 'client_secret'].includes(key))
        continue;
      if (Array.isArray(output)) output.push(visit(descriptor.value, depth + 1));
      else output[key] = visit(descriptor.value, depth + 1);
    }
    seen.delete(v);
    return output;
  }
  return visit(value, 0);
}
export function parse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  secrets: readonly string[] = []
): T {
  const result = schema.safeParse(clean(value, secrets));
  if (!result.success)
    throw createApiServiceError(
      'Storyblok returned an invalid resource or response envelope. Read the exact resource before retrying a write.',
      { reason: 'invalid_response' }
    );
  return result.data;
}
export function paging(params: { page?: number; perPage?: number } = {}, maximum = 1000) {
  return {
    page: integer(params.page ?? 1, 'page', 1),
    per_page: integer(params.perPage ?? 25, 'perPage', 1, maximum)
  };
}
export function pageInfo(
  headers: unknown,
  query: { page: number; per_page: number },
  count: number,
  requiredTotal = false
) {
  const rawPerPage = getResponseHeaderValue(headers, 'per_page');
  let perPage = query.per_page;
  if (rawPerPage !== undefined && rawPerPage !== '') {
    if (!/^[1-9]\d*$/.test(rawPerPage) || !Number.isSafeInteger(Number(rawPerPage)))
      throw createApiServiceError('Storyblok returned an invalid pagination page size.', {
        reason: 'invalid_response'
      });
    perPage = Number(rawPerPage);
  }
  const raw = getResponseHeaderValue(headers, 'total');
  let total: number | undefined;
  if (raw !== undefined && raw !== '') {
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))
      throw createApiServiceError('Storyblok returned an invalid pagination total.', {
        reason: 'invalid_response'
      });
    total = Number(raw);
  }
  if (requiredTotal && total === undefined)
    throw createApiServiceError(
      'Storyblok omitted the required total header; the result cannot report a verified total.',
      { reason: 'missing_pagination_total' }
    );
  if (
    count > perPage ||
    (total !== undefined &&
      count !== Math.min(perPage, Math.max(0, total - (query.page - 1) * perPage)))
  )
    throw createApiServiceError(
      'Storyblok returned an incomplete or inconsistent page. Read the collection again before using it to authorize a write.',
      { reason: 'incomplete_pagination' }
    );
  return {
    page: query.page,
    perPage,
    total,
    nextPage:
      total === undefined
        ? count === perPage
          ? query.page + 1
          : undefined
        : query.page * perPage < total
          ? query.page + 1
          : undefined
  };
}
export function branches(input: Record<string, unknown>, allowed: readonly string[]) {
  for (const [field, value] of Object.entries(input)) {
    if (
      value !== undefined &&
      field !== 'action' &&
      field !== 'spaceId' &&
      !allowed.includes(field)
    ) {
      throw createApiServiceError(
        `The selected action does not use ${field}; omit it or choose the appropriate action.`,
        { reason: 'incompatible_input' }
      );
    }
  }
}
export function resolveSpace(input: unknown, legacy: unknown, authorized: unknown): string {
  const selected = id(input ?? legacy ?? authorized, 'spaceId');
  if (authorized !== undefined && selected !== id(authorized, 'authorized spaceId'))
    throw createApiServiceError(
      'This plugin OAuth credential is bound to another space. Use its authorized space or reconnect for the requested space.',
      { reason: 'space_binding' }
    );
  return selected;
}
