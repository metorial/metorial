import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

export function fail(message: string): never {
  throw createApiServiceError(message, { reason: 'lexoffice_validation' });
}
export const required = (value: string | undefined, field: string): string => {
  if (
    !value?.trim() ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    fail(`${field} must be a nonblank value without control characters.`);
  return value;
};
export const pathId = (value: string) => encodeURIComponent(required(value, 'Resource ID'));
export const searchText = (value: string | undefined) =>
  value?.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const countryCode = (value: string | undefined, field: string) => {
  const code = required(value, field);
  if (!/^[A-Z]{2}(?:_[A-Z0-9]{2,3})?$/.test(code))
    fail(
      `${field} must use a provider country code; discover supported codes with list_reference_data.`
    );
  return code;
};
export const exact = (actual: string, expected: string) => {
  if (actual !== expected) fail('Lexoffice returned a different resource than requested.');
};
const moneyFields = new Set([
  'netPrice',
  'grossPrice',
  'netAmount',
  'grossAmount',
  'totalNetAmount',
  'totalGrossAmount',
  'totalTaxAmount',
  'taxAmount',
  'amount',
  'totalAmount',
  'openAmount',
  'lineItemAmount'
]);
const canonicalNumber = (token: string) => {
  const [mantissa = '', exponent = '0'] = token.toLowerCase().split('e');
  const [whole = '', fraction = ''] = mantissa.replace(/^-/, '').split('.');
  const digits = `${whole}${fraction}`.replace(/^0+/, '');
  if (!digits) return '0';
  const significant = digits.replace(/0+$/, '');
  const power = Number(exponent) - fraction.length + digits.length - significant.length;
  return `${mantissa.startsWith('-') ? '-' : ''}${significant}e${power}`;
};
// Check actual monetary numeric tokens before JSON parsing can discard a decimal digit.
// Exponent notation and trailing zeroes are compared by numeric value, not spelling.
export const parseJsonMoney = (data: unknown): unknown => {
  if (typeof data !== 'string') return data;
  let key: string | undefined;
  let moneyValue = false;
  try {
    const tokens = /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[:{}[\],]/g;
    for (const match of data.matchAll(tokens)) {
      const token = match[0];
      if (token.startsWith('"')) {
        key = JSON.parse(token);
        moneyValue = false;
      } else if (token === ':') {
        moneyValue = key !== undefined && moneyFields.has(key);
        key = undefined;
      } else {
        if (
          moneyValue &&
          /^[-\d]/.test(token) &&
          (!Number.isFinite(Number(token)) ||
            canonicalNumber(token) !== canonicalNumber(String(Number(token))))
        )
          fail(
            'Lexoffice returned a monetary number that would lose precision during JSON parsing.'
          );
        key = undefined;
        moneyValue = false;
      }
    }
    return JSON.parse(data);
  } catch {
    fail(
      'Lexoffice returned invalid JSON or a monetary number that cannot be parsed without precision loss.'
    );
  }
};
export const apiError = (error: unknown) => {
  const raw =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined);
  const status =
    typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
      ? raw
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Lexoffice',
      reason: 'lexoffice_api_error',
      parent: {},
      extractMessage: () =>
        'Check the connection, API permissions, account plan and current resource version. Do not automatically retry a write whose outcome is unconfirmed.'
    }
  );
};
// The API uses null for unpopulated fields; legacy outputs represent absence by omission.
const omitNullFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(omitNullFields);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== null)
        .map(([key, item]) => [key, omitNullFields(item)])
    );
  return value;
};
export const parse = <S extends z.ZodType>(schema: S, data: unknown): z.output<S> => {
  const result = schema.safeParse(omitNullFields(data));
  if (!result.success) fail('Lexoffice returned an unexpected or imprecise response shape.');
  return result.data;
};
export const safeDecimal = (value: number, places: number) => {
  if (!Number.isFinite(value)) return false;
  const [mantissa = '', exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole = '', fraction = ''] = mantissa.replace(/^-/, '').split('.');
  const precision = Math.max(0, fraction.length - Number(exponent));
  if (precision > places) return false;
  const digits = `${whole}${fraction}`.replace(/^0+/, '') || '0';
  const zeros = Number(exponent) + places - fraction.length;
  if (zeros < 0 || digits.length + zeros > 16) return false;
  return BigInt(digits) * 10n ** BigInt(zeros) <= BigInt(Number.MAX_SAFE_INTEGER);
};
export const decimal = (value: number | undefined, field: string, places = 2) => {
  if (value !== undefined && !safeDecimal(value, places))
    fail(
      `${field} must be finite, exactly representable with at most ${places} decimal places, and within the safe numeric range.`
    );
  return value;
};
export const integer = (value: number | undefined, field: string, minimum = 0) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum))
    fail(`${field} must be a safe integer of at least ${minimum}.`);
  return value;
};
export const pageParams = <T extends { page?: number; size?: number }>(value: T) => {
  integer(value.page, 'page');
  integer(value.size, 'size', 1);
  if (value.size !== undefined && value.size > 250) fail('size must not exceed 250.');
  if ((value.page ?? 0) * (value.size ?? 25) >= 10000)
    fail(
      'The search window is limited to 10,000 results; narrow the filters before requesting more pages.'
    );
  return value;
};
export const dateOnly = (value: string | undefined, field: string) => {
  if (
    value !== undefined &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    fail(`${field} must be a valid YYYY-MM-DD date.`);
  return value;
};
export const dateTime = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${dateOnly(value, field)}T00:00:00.000Z`;
  const parts =
    /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      value
    );
  if (!parts || !Number.isFinite(Date.parse(value)))
    fail(`${field} must be a valid ISO date or timestamp with a timezone.`);
  dateOnly(value.slice(0, 10), field);
  return `${parts[1]}.${(parts[2] ?? '').padEnd(3, '0')}${parts[3]}`;
};
export const paymentAmount = (value: string | number) => {
  const exactValue = String(value);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(exactValue))
    fail('Lexoffice returned an invalid payment amount.');
  const numeric = Number(exactValue);
  const safe =
    safeDecimal(numeric, 2) &&
    canonicalNumber(exactValue) === canonicalNumber(String(numeric));
  const [whole = '0', fraction = ''] = exactValue.replace(/^-/, '').split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return {
    exact: exactValue,
    numeric: safe && minor <= BigInt(Number.MAX_SAFE_INTEGER) ? numeric : undefined
  };
};
