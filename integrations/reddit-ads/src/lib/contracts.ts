import { ServiceError } from '@lowerdeck/error';
import {
  type AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type RedditAuth = {
  token: string;
  refreshToken?: string;
  pixelId?: string;
  authKind?: 'oauth' | 'conversion';
  conversionApiVersion?: 'v2' | 'v3';
  canSendConversions?: boolean;
};
export const ORIGIN = 'https://ads-api.reddit.com';
export const accountInput = z
  .string()
  .optional()
  .describe(
    'Ad account ID from list_ad_accounts. Required unless this connection already stores a legacy account ID.'
  );
export const pagingInput = {
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum records in one page (up to 1000).'),
  nextUrl: z
    .string()
    .optional()
    .describe('Exact nextUrl from the previous page; keep the same account and filters.')
};
export const pagingOutput = { nextUrl: z.string().optional(), hasMore: z.boolean() };
export const rawSchema = z.unknown().optional();
export const invalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'reddit_ads_validation' });
};
export const unexpected = (): never => {
  throw createApiServiceError(
    'Reddit returned unexpected response data. Read back a resource before retrying a write; completion may be unknown.',
    { reason: 'reddit_ads_response' }
  );
};
export const safeApiError = (error: unknown) => {
  const value =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Reddit Ads',
    reason: 'reddit_ads_api_error',
    parent: {},
    formatMessage: () =>
      `Reddit Ads request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check access and the selected API version. Write completion may be unknown; read back before retrying.`,
    extractMessage: () => 'Provider details omitted.'
  });
};
export const row = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : unexpected();
export const text = (value: unknown, label: string): string => {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    invalid(`${label} must be a nonempty string without control characters.`);
  return value as string;
};
export const id = (value: unknown, label = 'Resource ID') => {
  const result = text(value, label);
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(result))
    invalid(`${label} contains unsupported characters.`);
  return result;
};
export const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') unexpected();
  return value as string;
};
export const integer = (value: unknown, label: string, min = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min)
    invalid(`${label} must be a safe integer of at least ${min}.`);
  return value as number;
};
export const micro = (value: unknown, label: string) =>
  integer(integer(value, label) * 10000, `${label} converted to microcurrency`);
export const cents = (value: unknown) =>
  value === null || value === undefined
    ? undefined
    : integer(value, 'Provider microcurrency') / 10000;
export const timestamp = (value: unknown, label: string) => {
  const result = text(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    invalid(`${label} must be an ISO 8601 timestamp with a time zone.`);
  const calendar = result.slice(0, 10);
  if (new Date(`${calendar}T00:00:00Z`).toISOString().slice(0, 10) !== calendar)
    invalid(`${label} contains an invalid calendar date.`);
  return new Date(result).toISOString();
};
export const strings = (value: unknown, label: string, max = 1000): string[] => {
  if (!Array.isArray(value) || value.length > max)
    invalid(`${label} must be an array of at most ${max} strings.`);
  return (value as unknown[]).map(item => text(item, label));
};
export const enumValue = (
  value: unknown,
  choices: readonly string[],
  label: string
): string => {
  const result = text(value, label);
  if (!choices.includes(result))
    invalid(`${label} is unsupported. Choose ${choices.join(', ')}.`);
  return result;
};
export const required = (input: Row, fields: string[]) => {
  for (const field of fields) text(input[field], field);
};
export const resourceOutput = (
  kind: 'campaign' | 'adGroup' | 'ad' | 'audience',
  value: Row
) => {
  if (
    kind === 'campaign' &&
    value.is_campaign_budget_optimization != null &&
    typeof value.is_campaign_budget_optimization !== 'boolean'
  )
    unexpected();
  const status = optionalText(value.configured_status) ?? optionalText(value.status);
  const common = { name: optionalText(value.name), status, raw: value };
  if (kind === 'campaign')
    return pickDefined({
      ...common,
      campaignId: id(value.id),
      objective: optionalText(value.objective),
      budgetCents: cents(
        value.is_campaign_budget_optimization === true ? value.goal_value : value.spend_cap
      ),
      budgetType:
        value.goal_type === 'DAILY_SPEND'
          ? 'DAILY'
          : value.goal_type === 'LIFETIME_SPEND' ||
              (value.spend_cap !== undefined && value.spend_cap !== null)
            ? 'LIFETIME'
            : undefined,
      startDate: optionalText(value.start_time),
      endDate: optionalText(value.end_time),
      isProcessing: typeof value.is_processing === 'boolean' ? value.is_processing : undefined
    });
  if (kind === 'adGroup')
    return pickDefined({
      ...common,
      adGroupId: id(value.id),
      campaignId: optionalText(value.campaign_id),
      bidCents: cents(value.bid_value),
      bidStrategy: optionalText(value.bid_type),
      optimizationStrategy: optionalText(value.bid_strategy),
      startDate: optionalText(value.start_time),
      endDate: optionalText(value.end_time)
    });
  if (kind === 'ad')
    return pickDefined({
      ...common,
      adId: id(value.id),
      adGroupId: optionalText(value.ad_group_id),
      campaignId: optionalText(value.campaign_id),
      headline: optionalText(value.headline),
      clickUrl: optionalText(value.click_url),
      callToAction: optionalText(value.call_to_action),
      postId: optionalText(value.post_id)
    });
  return pickDefined({
    ...common,
    audienceId: id(value.id),
    audienceType: optionalText(value.type),
    approximateSize:
      typeof value.approximate_size === 'number'
        ? integer(value.approximate_size, 'Audience size')
        : undefined,
    sizeRangeLower:
      typeof value.size_range_lower === 'number'
        ? integer(value.size_range_lower, 'Audience lower size')
        : undefined,
    sizeRangeUpper:
      typeof value.size_range_upper === 'number'
        ? integer(value.size_range_upper, 'Audience upper size')
        : undefined
  });
};
const secretKeys =
  /^(?:authorization|access[_-]?token|refresh[_-]?token|token|client[_-]?secret|api[_-]?key|password|credentials|secret)$/i;
export const sanitize = (value: unknown, redactor: AuthConfigSecretRedactor): unknown => {
  if (typeof value === 'string' && redactor.redactEmbedded(value) !== value) unexpected();
  const serialized = JSON.stringify(value);
  if (serialized !== undefined && redactor.redactEmbedded(serialized) !== serialized)
    unexpected();
  if (Array.isArray(value)) return value.map(item => sanitize(item, redactor));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => {
          if (redactor.redactEmbedded(key) !== key) unexpected();
          return !secretKeys.test(key);
        })
        .map(([key, item]) => [key, sanitize(item, redactor)])
    );
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    unexpected();
  return value;
};
