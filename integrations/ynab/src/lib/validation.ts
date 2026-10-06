import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'ynab_input' });
export const milliunits = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export const knowledge = milliunits.nonnegative();
export const idInput = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const budgetInput = idInput
  .optional()
  .describe(
    'Budget ID from list_budgets. Defaults to the configured budget; last-used and default remain supported.'
  );
export const deltaInput = knowledge
  .optional()
  .describe(
    'Knowledge returned by the same budget and endpoint/filter. Merge changed records and deletion tombstones into your prior snapshot.'
  );
export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('UTC calendar date (YYYY-MM-DD).');
export function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw invalid(`${label} is required.`);
  return value.trim();
}
export function routeId(value: string): string {
  if (!idInput.safeParse(value).success)
    throw invalid('Use a valid resource ID returned by a discovery tool.');
  return encodeURIComponent(value.trim());
}
export const today = () => new Date().toISOString().slice(0, 10);
export function date(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw invalid('Use a real UTC calendar date in YYYY-MM-DD format.');
  return value;
}
export function month(value: string): string {
  if (value === 'current') return `${today().slice(0, 7)}-01`;
  if (date(value).slice(8) !== '01')
    throw invalid('Month must be the first day of the month (YYYY-MM-01).');
  return value;
}
export function transactionDate(value: string): string {
  if (date(value) > today())
    throw invalid(
      'Transaction dates cannot be in the future; use a scheduled transaction instead.'
    );
  return value;
}
export function scheduledDate(value: string): string {
  const limit = new Date(`${today()}T00:00:00Z`);
  limit.setUTCFullYear(limit.getUTCFullYear() + 5);
  if (date(value) <= today() || value > limit.toISOString().slice(0, 10))
    throw invalid(
      'Scheduled dates must be after today in UTC and no more than five years ahead.'
    );
  return value;
}
export function nonempty(data: Record<string, unknown>) {
  if (!Object.values(data).some(value => value !== undefined))
    throw invalid('Provide at least one field to update.');
}
export function rejectFields(
  data: Record<string, unknown>,
  fields: readonly string[],
  action: string
) {
  const supplied = fields.filter(field => data[field] !== undefined);
  if (supplied.length)
    throw invalid(`${supplied.join(', ')} cannot be used for action ${action}.`);
}
export function splitSum(parts: readonly { amount: number }[] | undefined, amount: number) {
  if (parts === undefined) return;
  if (parts.length < 1) throw invalid('Provide at least one split part.');
  if (parts.reduce((sum, part) => sum + BigInt(part.amount), 0n) !== BigInt(amount))
    throw invalid('Split amounts must sum exactly to the parent amount in milliunits.');
}
export function apiFailure(error: unknown, mutation = false): never {
  const rawStatus = getApiErrorStatus(error);
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : undefined;
  const message =
    status === 401
      ? 'YNAB authentication failed. Reconnect or replace the token.'
      : status === 403
        ? 'YNAB denied access. Check the account subscription and connection permissions; read-only OAuth cannot write.'
        : status === 404
          ? 'YNAB could not find this resource in the selected budget.'
          : status === 409
            ? 'YNAB reported a conflict. Read the affected resource before retrying; retain the same import IDs for transaction retries.'
            : status === 429
              ? 'YNAB rate limit reached. Wait before trying again.'
              : mutation && (status === undefined || status >= 500)
                ? 'YNAB did not confirm the change. Read the resource before retrying; reuse the same import IDs when creating transactions.'
                : 'YNAB rejected the request. Check the resource IDs and supported fields.';
  throw buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'YNAB',
    extractMessage: () => message,
    reason: 'ynab_api',
    parent: {}
  });
}
const integerFields = new Set([
  'amount',
  'balance',
  'cleared_balance',
  'uncleared_balance',
  'budgeted',
  'activity',
  'income',
  'to_be_budgeted',
  'goal_target',
  'goal_under_funded',
  'goal_overall_funded',
  'goal_overall_left',
  'debt_original_balance',
  'server_knowledge'
]);
export function safeResponse(value: unknown, secrets: readonly string[], field = ''): unknown {
  if (integerFields.has(field) && value !== null && !Number.isSafeInteger(value))
    throw createApiServiceError(
      'YNAB returned an amount or sync value outside the supported integer range.',
      { reason: 'ynab_response' }
    );
  if (
    ['debt_minimum_payments', 'debt_escrow_amounts', 'debt_interest_rates'].includes(field) &&
    value &&
    typeof value === 'object' &&
    Object.values(value).some(item => !Number.isSafeInteger(item))
  )
    throw createApiServiceError('YNAB returned an invalid periodic account amount.', {
      reason: 'ynab_response'
    });
  if (typeof value === 'string')
    return secrets
      .filter(Boolean)
      .reduce((out, secret) => out.split(secret).join('[redacted]'), value);
  if (Array.isArray(value)) return value.map(item => safeResponse(item, secrets, field));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (
        /token|authorization|client_secret|password|credential/i.test(key) ||
        ['__proto__', 'prototype', 'constructor'].includes(key)
      )
        continue;
      const safeKey = secrets
        .filter(Boolean)
        .reduce((out, secret) => out.split(secret).join('[redacted]'), key);
      result[safeKey] = safeResponse(item, secrets, key);
    }
    return result;
  }
  return value;
}
export function parseResponse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError('YNAB returned an incomplete or invalid response.', {
      reason: 'ynab_response'
    });
  return parsed.data;
}
