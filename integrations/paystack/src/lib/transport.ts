import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export type ProviderRecord = Record<string, unknown>;
const identifierKeys = new Set([
  'id',
  'transaction',
  'customer',
  'integration',
  'plan',
  'recipient',
  'bank_id'
]);
const integerFields = new Set([
  'amount',
  'transaction_charge',
  'refund_amount',
  'invoice_limit',
  'invoice_number',
  'quantity',
  'page',
  'perPage',
  'evidence'
]);
const textFields = new Set([
  'email',
  'customer',
  'plan',
  'authorization',
  'authorization_code',
  'account_number',
  'bank_code',
  'recipient',
  'name',
  'business_name',
  'code',
  'token',
  'reference',
  'transaction',
  'subaccount',
  'split_code',
  'preferred_bank',
  'uploaded_filename',
  'next',
  'previous',
  'settlement_bank'
]);
const dateFields = new Set(['from', 'to', 'due_date', 'start_date']);
const currencyPattern = /^[A-Z]{3}$/;
const hasControlCharacter = (value: string) =>
  Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

export const fail = (message: string) =>
  createApiServiceError(message, { reason: 'paystack.invalid_input' });

export const validateToken = (token: string) => {
  if (!/^sk_(?:test|live)_[A-Za-z0-9]+$/.test(token)) {
    throw fail(
      'Enter a Paystack secret key for test or live mode. Public keys cannot authorize these operations.'
    );
  }
};

export const pathValue = (value: string) => {
  if (!value.trim() || hasControlCharacter(value))
    throw fail('Provide a nonblank resource ID, code or reference.');
  return encodeURIComponent(value);
};

export const validateRequest = (url: string, value: unknown) => {
  if (!isApiErrorRecord(value)) throw fail('Request parameters must be an object.');
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    if (
      integerFields.has(key) &&
      (!Number.isSafeInteger(item) ||
        Number(item) < (['page', 'perPage', 'quantity', 'evidence'].includes(key) ? 1 : 0))
    ) {
      throw fail(
        `${key} must be a safe integer in the documented range; amounts use currency subunits.`
      );
    }
    if (key === 'perPage' && Number(item) > (url === '/bank' ? 100 : 1000))
      throw fail('Reduce perPage to the supported page size.');
    if (
      textFields.has(key) &&
      (typeof item !== 'string' || !item.trim() || hasControlCharacter(item))
    )
      throw fail(`Provide a nonblank ${key}.`);
    if (key === 'currency' && (typeof item !== 'string' || !currencyPattern.test(item)))
      throw fail('Use an uppercase three-letter currency code.');
    if (
      ['email', 'primary_contact_email'].includes(key) &&
      (typeof item !== 'string' || !z.email().safeParse(item).success)
    )
      throw fail('Provide a valid email address.');
    if (
      key === 'percentage_charge' &&
      (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > 100)
    )
      throw fail('percentageCharge must be between 0 and 100.');
    if (
      dateFields.has(key) &&
      (typeof item !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(item) ||
        !Number.isFinite(Date.parse(item)))
    )
      throw fail(`Provide a valid ISO date or timestamp for ${key}.`);
    if (dateFields.has(key) && typeof item === 'string') {
      const day = item.slice(0, 10);
      if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day)
        throw fail(`Provide a valid calendar date for ${key}.`);
    }
    if (['callback_url', 'redirect_url'].includes(key)) {
      try {
        const parsed = new URL(String(item));
        if (
          !['https:', 'http:'].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        )
          throw fail('Use an absolute HTTP or HTTPS redirect URL without credentials.');
      } catch {
        throw fail('Use an absolute HTTP or HTTPS redirect URL without credentials.');
      }
    }
    if (['line_items', 'tax'].includes(key)) {
      if (!Array.isArray(item) || !item.length)
        throw fail(`${key} must contain at least one item when supplied.`);
      for (const entry of item) validateRequest(url, entry);
    }
  }
  if (
    value.from !== undefined &&
    value.to !== undefined &&
    Date.parse(String(value.from)) > Date.parse(String(value.to))
  )
    throw fail('from must be no later than to.');
  if (value.next !== undefined && value.previous !== undefined)
    throw fail('Use next or previous, not both.');
  if ((value.next !== undefined || value.previous !== undefined) && value.page !== undefined)
    throw fail('Use cursor continuation or an offset page, not both.');
  if (value.use_cursor === true && value.page !== undefined)
    throw fail('Use cursor pagination or an offset page, not both.');
  if (value.use_cursor === false && (value.next !== undefined || value.previous !== undefined))
    throw fail('Cursor continuation requires useCursor=true or an omitted useCursor.');
  if (
    [
      '/transaction/initialize',
      '/transaction/charge_authorization',
      '/transfer',
      '/plan'
    ].includes(url) &&
    value.amount !== undefined &&
    Number(value.amount) <= 0
  )
    throw fail('Amount must be a positive integer in currency subunits.');
  if (
    url.startsWith('/transaction/') &&
    value.reference !== undefined &&
    !/^[A-Za-z0-9.=-]+$/.test(String(value.reference))
  )
    throw fail(
      'Transaction references allow alphanumeric characters, hyphens, dots and equals signs.'
    );
};

export const assertPrecisionRuntime = () => {
  let source: unknown;
  JSON.parse('{"id":18446744073709551615}', ((
    key: string,
    value: unknown,
    context?: { source?: string }
  ) => {
    if (key === 'id') source = context?.source;
    return value;
  }) as Parameters<typeof JSON.parse>[1]);
  if (source !== '18446744073709551615') {
    throw fail(
      'This runtime cannot preserve Paystack 64-bit IDs. Upgrade to a runtime supporting JSON.parse reviver source before retrying; no request was sent.'
    );
  }
};

export const parseProviderJson = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw, ((key: string, value: unknown, context?: { source?: string }) => {
      if (
        identifierKeys.has(key) &&
        typeof value === 'number' &&
        !Number.isSafeInteger(value)
      ) {
        if (!context?.source || !/^(?:0|[1-9]\d*)$/.test(context.source))
          throw fail(
            'Paystack returned an identifier that cannot be represented exactly. Reconcile any attempted mutation before retrying.'
          );
        return context.source;
      }
      return value;
    }) as Parameters<typeof JSON.parse>[1]);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw createApiServiceError(
      'Paystack returned invalid JSON. Reconcile any attempted mutation before retrying.',
      { reason: 'paystack.invalid_response' }
    );
  }
};

const metadataSchema = z.object({
  total: z.number().int().nonnegative().safe().optional(),
  page: z.number().int().positive().safe().optional(),
  pageCount: z.number().int().nonnegative().safe().optional(),
  perPage: z.number().int().nonnegative().safe().optional(),
  next: z.string().nullable().optional(),
  previous: z.string().nullable().optional()
});
const envelopeSchema = z.object({
  status: z.boolean(),
  data: z.unknown().optional(),
  meta: metadataSchema.optional()
});

export const parseEnvelope = (raw: unknown, status: number) => {
  if (status !== 200) throw safePaystackError({ response: { status } }, 'request');
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success)
    throw createApiServiceError(
      'Paystack returned an invalid response envelope. Reconcile any attempted mutation before retrying.',
      { reason: 'paystack.invalid_response' }
    );
  if (!parsed.data.status)
    throw createApiServiceError(
      'Paystack rejected the operation. Check the requested parameters and account capability; reconcile financial operations before retrying.',
      { reason: 'paystack.provider_rejection', upstreamStatus: status }
    );
  return parsed.data;
};

export const safePaystackError = (error: unknown, _operation: string) => {
  const convertedStatus =
    isApiErrorRecord(error) && error.name === 'SlateError'
      ? optionalRecord(optionalRecord(optionalRecord(error.data).baggage).serviceErrorData)
          .upstreamStatus
      : undefined;
  const extracted =
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined) ??
    convertedStatus ??
    getApiErrorStatus(error);
  const status =
    typeof extracted === 'number'
      ? extracted
      : typeof extracted === 'string' && /^\d{3}$/.test(extracted)
        ? Number(extracted)
        : undefined;
  const safeStatus =
    status !== undefined && status >= 100 && status <= 599 ? status : undefined;
  return buildApiServiceError(
    { response: { status: safeStatus } },
    {
      providerLabel: 'Paystack',
      reason: 'paystack.upstream_error',
      parent: {},
      extractMessage: () =>
        'The request could not be confirmed. Check authorization, parameters or service availability; reconcile any financial mutation before retrying.'
    }
  );
};

export const record = (value: unknown): ProviderRecord => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Paystack returned an invalid resource response.', {
      reason: 'paystack.invalid_response'
    });
  return value;
};
export const records = (value: unknown): ProviderRecord[] => {
  if (!Array.isArray(value))
    throw createApiServiceError('Paystack returned an invalid list response.', {
      reason: 'paystack.invalid_response'
    });
  return value.map(record);
};
export const optionalRecord = (value: unknown): ProviderRecord =>
  isApiErrorRecord(value) ? value : {};
export const exactId = (value: unknown): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  if (
    typeof value === 'string' &&
    /^[1-9]\d*$/.test(value) &&
    BigInt(value) <= 18446744073709551615n
  )
    return value;
  throw createApiServiceError('Paystack returned an invalid or rounded resource ID.', {
    reason: 'paystack.invalid_response'
  });
};
export const optionalNumericId = (value: unknown): number | undefined => {
  const id = Number(exactId(value));
  return Number.isSafeInteger(id) ? id : undefined;
};
export const observedFlag = (value: unknown): unknown =>
  value === 1 ? true : value === 0 ? false : value;
export const pagination = (meta: z.infer<typeof metadataSchema> | undefined) => ({
  totalCount: meta?.total,
  currentPage: meta?.page,
  totalPages: meta?.pageCount,
  nextCursor: meta?.next === 'null' ? null : meta?.next,
  previousCursor: meta?.previous === 'null' ? null : meta?.previous,
  perPage: meta?.perPage
});

export const sanitizeMetadata = (value: unknown, token: string): unknown => {
  if (typeof value === 'string')
    return value
      .replaceAll(token, '[redacted]')
      .replace(/\b[sp]k_(?:live|test)_[A-Za-z0-9]+\b/g, '[redacted]');
  if (Array.isArray(value)) return value.map(item => sanitizeMetadata(item, token));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !/^(?:secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|authorization|authorization[_-]?code)$/i.test(
            key
          )
      )
      .map(([key, item]) => [
        key
          .replaceAll(token, '[redacted]')
          .replace(/\b[sp]k_(?:live|test)_[A-Za-z0-9]+\b/g, '[redacted]'),
        sanitizeMetadata(item, token)
      ])
  );
};
export const validateOutput = <S extends z.ZodType>(
  schema: S,
  value: unknown
): z.output<S> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Paystack returned incomplete or inconsistent resource data. Reconcile any attempted mutation before retrying.',
      { reason: 'paystack.invalid_response' }
    );
  const inspectAmounts = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const entry of item) inspectAmounts(entry);
    } else if (isApiErrorRecord(item)) {
      for (const [key, entry] of Object.entries(item)) {
        if (
          ['amount', 'totalAmount', 'balance'].includes(key) &&
          entry !== null &&
          !Number.isSafeInteger(entry)
        )
          throw createApiServiceError(
            'Paystack returned an amount that cannot be represented exactly in currency subunits. Reconcile any attempted mutation before retrying.',
            { reason: 'paystack.invalid_response' }
          );
        if (key !== 'metadata') inspectAmounts(entry);
      }
    }
  };
  inspectAmounts(parsed.data);
  return parsed.data;
};
