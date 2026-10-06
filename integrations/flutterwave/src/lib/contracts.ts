import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const positiveId = (value: number, label = 'ID') => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw createApiServiceError(`${label} must be a positive, safely representable integer.`);
  return value;
};
export const nonblank = (value: string, label: string) => {
  if (!value.trim() || /[\r\n]/.test(value))
    throw createApiServiceError(`${label} must be nonblank and contain no line breaks.`);
  return value;
};
export const positiveAmount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0)
    throw createApiServiceError('Amount must be a finite positive number.');
  return value;
};
export const validateDates = (from?: string, to?: string) => {
  for (const value of [from, to])
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    )
      throw createApiServiceError('Dates must be valid calendar dates in YYYY-MM-DD format.');
  if (from && to && from > to) throw createApiServiceError('from must not be later than to.');
};
export const pageFields = {
  currentPage: z.number().optional().describe('Provider current page, when returned'),
  totalPages: z.number().optional().describe('Provider total pages, when returned'),
  totalCount: z.number().optional().describe('Provider total records, when returned')
};
export const pageOutput = (result: {
  meta?: { page_info?: { current_page?: number; total_pages?: number; total?: number } };
}) => ({
  currentPage: result.meta?.page_info?.current_page,
  totalPages: result.meta?.page_info?.total_pages,
  totalCount: result.meta?.page_info?.total
});

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const record = z.object({}).passthrough();
export const responseSchemas = {
  transaction: z
    .object({
      id,
      tx_ref: z.string(),
      flw_ref: z.string(),
      amount: z.number(),
      currency: z.string(),
      charged_amount: z.number(),
      status: z.string(),
      payment_type: z.string(),
      created_at: z.string()
    })
    .passthrough(),
  transfer: z
    .object({
      id,
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
      account_number: z.string()
    })
    .passthrough(),
  refund: z
    .object({ id, tx_id: id, amount_refunded: z.number(), status: z.string() })
    .passthrough(),
  plan: z
    .object({
      id,
      name: z.string(),
      amount: z.number(),
      interval: z.string(),
      status: z.string()
    })
    .passthrough(),
  subscription: z.object({ id, status: z.string() }).passthrough(),
  settlement: z.object({ id, status: z.string() }).passthrough(),
  beneficiary: z.object({ id }).passthrough(),
  virtual: z.object({ account_number: z.string(), bank_name: z.string() }).passthrough(),
  fee: z.object({ fee: z.number() }).passthrough(),
  bank: z.object({ code: z.string(), name: z.string() }).passthrough(),
  branch: z
    .object({ branch_code: z.string(), branch_name: z.string().optional(), id: id.optional() })
    .passthrough(),
  resolve: z.object({ account_name: z.string(), account_number: z.string() }).passthrough(),
  rate: z.object({
    rate: z.number(),
    source: z.object({ amount: z.number(), currency: z.string() }),
    destination: z.object({ amount: z.number(), currency: z.string() })
  }),
  record
};

const numericFields = new Set([
  'id',
  'tx_id',
  'account_id',
  'wallet_id',
  'plan',
  'amount',
  'amount_refunded',
  'charged_amount',
  'charge_amount',
  'app_fee',
  'merchant_fee',
  'flutterwave_fee',
  'stamp_duty_fee',
  'gross_amount',
  'net_amount',
  'chargeback',
  'refund',
  'fee',
  'rate',
  'duration',
  'transaction_count',
  'total',
  'current_page',
  'total_pages',
  'requires_approval'
]);
const secretFields = new Set([
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'secret_key',
  'secretkey',
  'api_key',
  'apikey',
  'client_secret',
  'clientsecret',
  'authorization',
  'encryption_key',
  'encryptionkey',
  'bvn',
  'nin',
  'card_token',
  'cardtoken'
]);
// Provider numeric strings and null optional fields occur in v3 responses. Never convert account numbers or references.
export const normalizeResponse = (value: unknown, secret: string, key = ''): unknown => {
  if (secretFields.has(key.toLowerCase()) || value === null) return undefined;
  if (typeof value === 'number' && numericFields.has(key)) {
    if (
      !Number.isFinite(value) ||
      (['id', 'tx_id', 'account_id', 'wallet_id', 'plan'].includes(key) &&
        !Number.isSafeInteger(value))
    )
      throw createApiServiceError(
        'Flutterwave returned a number that cannot be represented safely.'
      );
  }
  if (typeof value === 'string') {
    if (value.includes(secret) || /FLWSECK(?:_TEST)?-|\$\$MT\$secret\$/i.test(value))
      return '[redacted]';
    if (numericFields.has(key) && /^-?\d+(?:\.\d+)?$/.test(value)) {
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        (['id', 'tx_id', 'account_id', 'wallet_id', 'plan'].includes(key) &&
          !Number.isSafeInteger(number))
      )
        throw createApiServiceError(
          'Flutterwave returned a number that cannot be represented safely.'
        );
      return number;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(item => normalizeResponse(item, secret));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).flatMap(([field, child]) => {
        if (field.includes(secret) || /FLWSECK(?:_TEST)?-|\$\$MT\$secret\$/i.test(field))
          return [];
        const normalized = normalizeResponse(child, secret, field);
        return normalized === undefined ? [] : [[field, normalized]];
      })
    );
  return value;
};
