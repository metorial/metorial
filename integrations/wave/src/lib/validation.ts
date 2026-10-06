import { createApiServiceError } from 'slates';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'invalid_wave_input' });
}
export const text = (value: unknown, label: string, max = 10_000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    invalid(`Provide a nonempty ${label} of at most ${max} characters.`);
  return value;
};
export const integer = (value: number, label: string, min = 1, max = 2_147_483_647) => {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    invalid(`Provide an integer ${label} from ${min} to ${max}.`);
  return value;
};
export const date = (value: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    invalid('Provide a valid YYYY-MM-DD date.');
  return value;
};
// Expand scientific notation before comparing exact decimal values or shifting percentage units.
export const canonicalDecimal = (value: string, shift = 0) => {
  if (value.length > 200 || !/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value))
    invalid('Wave returned an invalid decimal value.');
  const [coefficient = '', exponent = '0'] = value.toLowerCase().split('e');
  const negative = coefficient.startsWith('-');
  const [whole = '', fraction = ''] = coefficient.replace(/^-/, '').split('.');
  const scale = fraction.length - Number(exponent) - shift;
  if (!Number.isSafeInteger(scale) || Math.abs(scale) > 400)
    invalid('Decimal value exceeds the supported numeric range.');
  let digits = (whole + fraction).replace(/^0+/, '') || '0';
  let result =
    scale <= 0
      ? digits + '0'.repeat(-scale)
      : digits.padStart(scale + 1, '0').slice(0, -scale) +
        '.' +
        digits.padStart(scale + 1, '0').slice(-scale);
  result = result
    .replace(/\.?(0+)$/, match => (result.includes('.') ? '' : match))
    .replace(/^0+(?=\d)/, '');
  if (/^0(?:\.0*)?$/.test(result)) return '0';
  return (negative ? '-' : '') + result;
};
export const decimalNumber = (value: string | undefined, shift = 0): number | undefined => {
  if (value === undefined) return undefined;
  const exact = canonicalDecimal(value, shift),
    number = Number(exact);
  if (!Number.isFinite(number) || canonicalDecimal(String(number)) !== exact)
    invalid(
      'Wave returned a decimal that cannot be represented safely in the legacy numeric output. Use get_resource for the exact decimal string.'
    );
  return number;
};
export const numericDecimal = (
  value: number,
  label: string,
  places?: number,
  positive = false
) => {
  if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0))
    invalid(`Provide a ${positive ? 'positive' : 'nonnegative'} finite ${label}.`);
  const decimal = canonicalDecimal(String(value));
  if (places !== undefined && (decimal.split('.')[1]?.length ?? 0) > places)
    invalid(`Provide ${label} with at most ${places} decimal places.`);
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER)
    invalid(`Provide ${label} within the safe numeric range.`);
  return decimal;
};
export const pdfUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid('Wave did not provide a valid invoice PDF URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !(url.hostname === 'waveapps.com' || url.hostname.endsWith('.waveapps.com'))
  )
    invalid('Wave did not provide a supported secure invoice PDF URL.');
  return url.toString();
};
