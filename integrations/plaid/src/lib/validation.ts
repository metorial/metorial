import { createApiServiceError } from 'slates';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'invalid_plaid_input', parent: {} });
}
export const text = (value: unknown, label: string, max?: number): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value !== value.trim() ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    (max !== undefined && value.length > max)
  )
    invalid(
      `Provide a nonempty valid ${label}${max === undefined ? '' : ` of at most ${max} characters`}.`
    );
  return value;
};
export const integer = (
  value: unknown,
  label: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(`Provide an integer ${label} between ${min} and ${max}.`);
  return value;
};
export const finite = (
  value: unknown,
  label: string,
  min = Number.NEGATIVE_INFINITY
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min)
    invalid(
      `Provide a finite ${label}${min === Number.NEGATIVE_INFINITY ? '' : ` of at least ${min}`}.`
    );
  return value;
};
export const strings = (
  values: unknown,
  label: string,
  max = Number.MAX_SAFE_INTEGER
): string[] => {
  if (!Array.isArray(values) || !values.length || values.length > max)
    invalid(`Provide between 1 and ${max} ${label}.`);
  const result = values.map(value => text(value, label));
  if (new Set(result).size !== result.length) invalid(`Provide distinct ${label}.`);
  return result;
};
export const date = (value: string, label: string): string => {
  text(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    invalid(`Provide a real ${label} in YYYY-MM-DD format.`);
  return value;
};
export const timestamp = (value: string, label: string): string => {
  text(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    invalid(`Provide ${label} in RFC3339 format with a timezone.`);
  date(value.slice(0, 10), label);
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    invalid(`Provide a valid ${label} with ordinary RFC3339 clock components.`);
  return value;
};
export const dateRange = (start: string, end: string) => {
  date(start, 'start date');
  date(end, 'end date');
  if (start > end) invalid('Start date must not be after end date.');
};
export const amount = (value: string): string => {
  text(value, 'transfer amount');
  if (
    !/^(?:0|[1-9]\d*)\.\d{2}$/.test(value) ||
    Number(value) <= 0 ||
    !Number.isFinite(Number(value))
  )
    invalid(
      'Provide a positive transfer amount as a decimal string with exactly two fractional digits.'
    );
  return value;
};
export const httpsUrl = (value: string, label: string) => {
  text(value, label);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(`Provide a valid HTTPS ${label}.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    invalid(`Provide a valid HTTPS ${label} without credentials or a fragment.`);
  return value;
};
