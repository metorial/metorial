import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export const environments = ['production', 'sandbox'] as const;
export type Environment = (typeof environments)[number];
export const baseUrls: Record<Environment, string> = {
  production: 'https://api.taxjar.com/v2',
  sandbox: 'https://api.sandbox.taxjar.com/v2'
};
export function environment(value: unknown): Environment {
  if (value === undefined) return 'production';
  if (value === 'production' || value === 'sandbox') return value;
  throw createApiServiceError('Choose the production or sandbox TaxJar environment.', {
    reason: 'taxjar_validation'
  });
}
export function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw createApiServiceError(`${field} must be a nonblank string.`, {
      reason: 'taxjar_validation'
    });
  return value;
}
export function pathId(value: unknown, field: string): string {
  const input = required(value, field);
  if (/[/?#\\]/.test(input) || input === '.' || input === '..')
    throw createApiServiceError(`${field} must identify one resource.`, {
      reason: 'taxjar_validation'
    });
  return encodeURIComponent(input);
}
export function validateDate(value: string | undefined, field: string): number | undefined {
  if (value === undefined) return undefined;
  required(value, field);
  let normalized = value;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) normalized = value.replaceAll('/', '-');
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [month, day, year] = value.split('/');
    normalized = `${year}-${month}-${day}`;
  }
  const calendar = normalized.slice(0, 10);
  const parsed = Date.parse(
    normalized.includes('T') && !/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
      ? `${normalized}Z`
      : normalized
  );
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      normalized
    ) ||
    !Number.isFinite(parsed) ||
    new Date(`${calendar}T00:00:00Z`).toISOString().slice(0, 10) !== calendar
  )
    throw createApiServiceError(
      field +
        ' must be a valid calendar date or ISO 8601 date-time. Date-only slash formats are also supported.',
      { reason: 'taxjar_validation' }
    );
  return parsed;
}
export function validateListDates(input: {
  transaction_date?: string;
  from_transaction_date?: string;
  to_transaction_date?: string;
}): void {
  const exact = validateDate(input.transaction_date, 'transactionDate');
  const from = validateDate(input.from_transaction_date, 'fromTransactionDate');
  const to = validateDate(input.to_transaction_date, 'toTransactionDate');
  if (exact !== undefined && (from !== undefined || to !== undefined))
    throw createApiServiceError('Choose transactionDate or a date range, not both.', {
      reason: 'taxjar_validation'
    });
  if ((from === undefined) !== (to === undefined))
    throw createApiServiceError('Supply both ends of the transaction date range.', {
      reason: 'taxjar_validation'
    });
  if (from !== undefined && to !== undefined && from > to)
    throw createApiServiceError('The transaction start date must not follow the end date.', {
      reason: 'taxjar_validation'
    });
}
export function nonemptyUpdate(value: object, excluded: string[]): void {
  if (
    !Object.entries(value).some(
      ([key, entry]) => entry !== undefined && !excluded.includes(key)
    )
  )
    throw createApiServiceError('Provide at least one field to update.', {
      reason: 'taxjar_validation'
    });
}
export function apiFailure(error: unknown, operation: string): never {
  const raw =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const parsed = typeof raw === 'string' && /^[1-5]\d{2}$/.test(raw) ? Number(raw) : raw;
  const status =
    typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 100 && parsed <= 599
      ? parsed
      : undefined;
  throw buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'TaxJar',
    operation,
    reason: 'taxjar_api',
    parent: {},
    extractMessage: () =>
      status === 401 || status === 403
        ? 'Check the API token, selected environment and account feature access.'
        : status === 429
          ? 'The request limit was reached. Retry after TaxJar permits another request.'
          : status === 404
            ? 'The resource was not found in this account and provider scope.'
            : status === 422
              ? 'Check required fields and resource identifiers. An existing transaction may require readback before a deliberate update.'
              : 'The request could not be completed. Check its required fields and account settings.'
  });
}
