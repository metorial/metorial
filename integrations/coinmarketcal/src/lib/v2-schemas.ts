import { z } from 'zod';

export const paginationSchema = z.object({
  total: z.number().describe('Total matching records'),
  limit: z.number().describe('Page size applied by the provider'),
  cursor: z.string().nullable().describe('Pass to the next request; null marks the last page')
});

export const eventV2Schema = z.object({
  id: z.string().describe('Stable event ID'),
  slug: z.string(),
  title: z.string(),
  description: z
    .string()
    .nullable()
    .describe('Null on Free; available on Standard and higher plans'),
  date: z
    .string()
    .describe('Machine-readable event date; an estimated date is a deadline or window end'),
  dateEnd: z.string().describe('Range end; empty for single-day events'),
  dateType: z.enum(['date', 'month', 'quarter']),
  isEstimated: z.boolean(),
  displayedDate: z.string().describe('Provider-formatted date to display to users'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Editorial category labels; omitted on Free'),
  coins: z.array(z.object({ slug: z.string(), symbol: z.string(), name: z.string() })),
  impact: z
    .union([z.string(), z.number()])
    .nullable()
    .describe('Null on Free/Standard; band on Pro; numeric score on Elite and higher plans'),
  impactSummary: z.string().nullable(),
  sourceUrl: z
    .string()
    .nullable()
    .describe('Original announcement URL on Pro and higher plans'),
  snapshotUrl: z.string().nullable().describe('Source proof URL on Pro and higher plans'),
  lastVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable()
});

export const coinV2Schema = z.object({
  slug: z.string().describe('Canonical coin slug for list_events and get_coin'),
  symbol: z.string(),
  name: z.string(),
  rank: z.number().nullable().describe('Market-cap rank; null when unranked'),
  tracked: z.boolean().describe('Whether editors actively monitor the coin'),
  iconUrl: z.string(),
  upcomingCount: z.number(),
  majorCount: z
    .number()
    .nullable()
    .describe('Events with impact at least 7.5; null below Pro'),
  peakImpact: z.number().nullable().describe('Highest precise impact; null below Elite')
});

export const categoryV2Schema = z.object({
  id: z.string().describe('Canonical category slug to pass to list_events'),
  name: z.string(),
  count: z.number().describe('Upcoming events within the current plan date window')
});

export const usageSchema = z.object({
  tier: z.string().describe('Active plan for the authenticated API key'),
  periodYm: z.string().describe('UTC quota month, YYYY-MM'),
  requestCount: z.number(),
  monthlyQuota: z.number().nullable().describe('Null when unlimited'),
  remaining: z.number().nullable().describe('Null when unlimited'),
  quotaResetAt: z.string()
});

export const eventPageSchema = z.object({
  data: z.array(eventV2Schema),
  meta: paginationSchema
});
export const coinPageSchema = z.object({
  data: z.array(coinV2Schema),
  meta: paginationSchema
});
export const categoryListSchema = z.object({ data: z.array(categoryV2Schema) });
export const cancellationPageSchema = z.object({
  data: z.array(z.object({ id: z.string(), cancelledAt: z.string() })),
  meta: paginationSchema
});

export const eventListInput = z.object({
  coins: z
    .string()
    .optional()
    .describe('Comma-separated coin slugs. Call search_coins to discover slugs.'),
  categories: z
    .string()
    .optional()
    .describe(
      'Comma-separated category IDs from list_event_categories. Standard and higher plans only.'
    ),
  from: z
    .string()
    .optional()
    .describe(
      'Inclusive lower event-date bound, ISO-8601. Provider clamps history to the plan window; defaults to today.'
    ),
  to: z
    .string()
    .optional()
    .describe(
      'Inclusive upper event-date bound, ISO-8601. Defaults to the plan upcoming window.'
    ),
  keyword: z
    .string()
    .optional()
    .describe('Substring search across event title and description'),
  impactMin: z
    .number()
    .optional()
    .describe('Minimum precise impact from 0 to 10; Elite and higher plans only'),
  sortBy: z
    .enum([
      'date_asc',
      'date_desc',
      'created_desc',
      'created_desc_and_updated_desc',
      'impact_desc'
    ])
    .optional()
    .describe('Provider defaults to date_asc. impact_desc requires Elite or higher.'),
  limit: z
    .number()
    .optional()
    .describe('Whole-number page size from 1 to 100; provider defaults to 20'),
  cursor: z
    .string()
    .optional()
    .describe('Opaque meta.cursor from the previous response; omit for the first page')
});

export const coinListInput = z.object({
  q: z.string().optional().describe('Substring search across coin name and symbol'),
  tracked: z
    .boolean()
    .optional()
    .describe('True for actively monitored coins; false for unmonitored coins; omit for both'),
  limit: z
    .number()
    .optional()
    .describe('Whole-number page size from 1 to 200; provider defaults to 50'),
  cursor: z.string().optional().describe('Opaque meta.cursor from the previous response')
});

export const cancellationListInput = z.object({
  since: z
    .string()
    .optional()
    .describe(
      'Inclusive cancellation timestamp, RFC3339 or YYYY-MM-DD; provider defaults to 90 days ago'
    ),
  limit: z
    .number()
    .optional()
    .describe('Whole-number page size from 1 to 100; provider defaults to 100'),
  cursor: z.string().optional().describe('Opaque meta.cursor from the previous response')
});
