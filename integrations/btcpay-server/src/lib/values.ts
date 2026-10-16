import { createApiServiceError } from 'slates';

// Keep public numeric aliases while retaining exact provider decimals in raw/exact fields.
export let providerAmount = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
  ) {
    throw createApiServiceError(`BTCPay Server returned an invalid decimal for ${field}.`);
  }
  let amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw createApiServiceError(
      `BTCPay Server returned an unrepresentable decimal for ${field}.`
    );
  }
  return amount;
};

export let providerTimestamp = (value: string): string | number => {
  if (/^-?\d+$/.test(value)) return Number(value);
  let millis = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(millis) ? Math.floor(millis / 1000) : value;
};

export let optionalTimestamp = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

export let nullableTimestamp = (value: unknown): string | null | undefined =>
  value === null ? null : optionalTimestamp(value);

export let requireFields = (
  values: Record<string, unknown>,
  fields: string[],
  action: string
) => {
  for (let field of fields) {
    if (values[field] === undefined) {
      throw createApiServiceError(`${field} is required for ${action}.`);
    }
  }
};
