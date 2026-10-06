import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export function fail(message: string): never {
  throw createApiServiceError(message, { reason: 'breathehr_validation', parent: {} });
}
export const requireText = (value: unknown, field: string): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value !== value.trim() ||
    /[\r\n\0]/.test(value)
  )
    fail(`Provide a nonempty ${field} without surrounding whitespace.`);
  return value;
};
export const requireId = (value: unknown, field = 'resource ID'): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  const text = requireText(value, field);
  if (text === '.' || text === '..') fail(`Provide an exact ${field}, not a path segment.`);
  return text;
};
export const requireDate = (value: unknown, field: string): string => {
  const date = requireText(value, field).replaceAll('/', '-');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    fail(`Provide a real ${field} in YYYY-MM-DD or YYYY/MM/DD format.`);
  return date;
};
export const dateRange = (start: string, end?: string) => {
  if (end !== undefined && end < start) fail('The end date must not precede the start date.');
};
export const decimal = (value: unknown, field: string): string => {
  const amount = requireText(value, field);
  if (!/^\d+(?:\.\d+)?$/.test(amount))
    fail(
      `Provide ${field} as a nonnegative decimal string without an exponent or currency symbol.`
    );
  return amount;
};
export const pageParams = (value: { page?: number; perPage?: number }, paged = true) => {
  if (!paged && (value.page !== undefined || value.perPage !== undefined))
    fail('This Breathe HR resource is unpaged; omit page and perPage.');
  if (value.page !== undefined && (!Number.isSafeInteger(value.page) || value.page < 1))
    fail('page must be a positive safe integer.');
  if (
    value.perPage !== undefined &&
    (!Number.isInteger(value.perPage) || value.perPage < 1 || value.perPage > 100)
  )
    fail('perPage must be an integer from 1 to 100.');
  return { page: value.page, per_page: value.perPage };
};
export const paginationSchema = z.object({
  page: z.number().int(),
  perPage: z.number().int(),
  total: z.number().int().optional(),
  nextPage: z.number().int().optional(),
  previousPage: z.number().int().optional(),
  lastPage: z.number().int().optional()
});
export type Pagination = z.infer<typeof paginationSchema>;
export type ApiResult = { body: unknown; pagination?: Pagination; status: number };
export const readRows = (result: ApiResult, key: string): Row[] => {
  if (!isApiErrorRecord(result.body) || !Array.isArray(result.body[key]))
    fail(
      `Breathe HR did not return the expected ${key} collection. Check the request and connection.`
    );
  return result.body[key].map((value: unknown) => {
    if (!isApiErrorRecord(value)) fail(`Breathe HR returned an invalid ${key} record.`);
    requireId(value.id);
    return value;
  });
};
export const readOne = (result: ApiResult, key: string, expectedId?: string): Row => {
  const records = readRows(result, key);
  if (records.length !== 1)
    fail(
      `Breathe HR did not return exactly one ${key} record. A requested write may have completed; inspect the account before retrying.`
    );
  const item = records[0];
  if (!item || (expectedId !== undefined && requireId(item.id) !== expectedId))
    fail(
      'Breathe HR returned a different resource identifier. Review the exact record before retrying.'
    );
  requireId(item.id);
  return item;
};
export const readAccount = (result: ApiResult): Row => {
  // The old account object envelope remains accepted only when its exact identity is present.
  if (isApiErrorRecord(result.body) && isApiErrorRecord(result.body.account)) {
    const account = result.body.account;
    requireId(account.id ?? account.uuid);
    requireText(account.name, 'account name');
    return account;
  }
  const account = readOne(result, 'accounts');
  requireText(account.name, 'account name');
  return account;
};
export const paginationFrom = (
  headers: unknown,
  params: { page?: number; per_page?: number },
  origin: string,
  path: string
): Pagination => {
  const result: Pagination = { page: params.page ?? 1, perPage: params.per_page ?? 25 };
  const total = getResponseHeaderValue(headers, 'Total');
  if (total !== undefined) {
    if (!/^\d+$/.test(total) || !Number.isSafeInteger(Number(total)))
      fail('Breathe HR returned an invalid Total paging header.');
    result.total = Number(total);
  }
  const link = getResponseHeaderValue(headers, 'Link');
  if (link !== undefined)
    for (const match of link.matchAll(/<([^>]+)>\s*;\s*rel="?(next|prev|last|first)"?/g)) {
      let url: URL;
      try {
        url = new URL(match[1] ?? '', origin);
      } catch {
        fail('Breathe HR returned an invalid paging link.');
      }
      if (
        url.origin !== new URL(origin).origin ||
        url.pathname !== `/v1${path}` ||
        url.username ||
        url.password ||
        url.hash
      )
        fail('Breathe HR returned a paging link for a different resource or host.');
      const page = url.searchParams.get('page');
      if (
        !page ||
        !/^\d+$/.test(page) ||
        !Number.isSafeInteger(Number(page)) ||
        Number(page) < 1
      )
        fail('Breathe HR returned an invalid page number.');
      if (match[2] === 'next') result.nextPage = Number(page);
      if (match[2] === 'prev') result.previousPage = Number(page);
      if (match[2] === 'last') result.lastPage = Number(page);
    }
  return result;
};
export const apiError = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Breathe HR',
      operation,
      reason: 'breathehr_api',
      parent: {},
      formatMessage: () =>
        `Breathe HR could not complete ${operation}${status ? ` (HTTP ${status})` : ''}. ${status === 401 || status === 403 ? 'Check the API key, selected environment and account API access.' : status === 429 ? 'Wait for the request limit to reset before retrying.' : 'Check the required fields and retry when appropriate.'}`
    }
  );
};
const normalizedDecimal = (input: string): string => {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(input);
  if (!match) return input;
  let digits = `${match[2]}${match[3] ?? ''}`.replace(/^0+/, '');
  let exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
  if (!digits) return '0';
  while (digits.endsWith('0')) {
    digits = digits.slice(0, -1);
    exponent++;
  }
  return `${match[1]}${digits}e${exponent}`;
};
export const equalDecimal = (value: unknown, expected: string): boolean =>
  (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) &&
  normalizedDecimal(String(value)) === normalizedDecimal(expected);
export const parseResponse = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  if (!raw.trim()) return undefined;
  let previous: { value: string; end: number } | undefined;
  for (const match of raw.matchAll(
    /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  )) {
    const value = match[0];
    if (value.startsWith('"')) {
      previous = { value, end: (match.index ?? 0) + value.length };
      continue;
    }
    if (previous && raw.slice(previous.end, match.index).trim() === ':') {
      let key: unknown;
      try {
        key = JSON.parse(previous.value);
      } catch {
        fail('Breathe HR returned malformed JSON.');
      }
      const number = Number(value);
      if (
        typeof key === 'string' &&
        (key === 'id' || key.endsWith('_id')) &&
        !Number.isSafeInteger(number)
      )
        fail('Breathe HR returned an identifier that cannot be represented exactly.');
      if (
        typeof key === 'string' &&
        ['amount', 'vat', 'miles', 'cost'].includes(key) &&
        (!Number.isFinite(number) ||
          normalizedDecimal(value) !== normalizedDecimal(String(number)))
      )
        fail(
          'Breathe HR returned a numeric amount that would lose precision; exact decimal-string amounts are required.'
        );
    }
    previous = undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail('Breathe HR returned malformed JSON.');
  }
};
