import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAnalyticsClient } from '../lib/analytics-client';
import { spec } from '../spec';
import { tags } from './project-analytics-schemas';

export const queryRevenueLtvTool = SlateTool.create(spec, {
  name: 'Query Revenue Lifetime Value',
  key: 'query_revenue_ltv',
  tags,
  description:
    'Query observed revenue lifetime value by new-user acquisition cohort: ARPU, ARPPU, total revenue, or paying users. Preserves cohort dates, rNd day-since-acquisition values, count, paid, total_amount, and nulls. Requires project API key and secret; no project ID or OAuth discovery is needed.',
  constraints: [
    'Results describe acquisition cohorts and elapsed lifetime, not calendar revenue or a forecast.'
  ]
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      start: z.string().describe('First acquisition date in YYYYMMDD format.'),
      end: z.string().describe('Last acquisition date in YYYYMMDD format.'),
      metric: z.enum(['arpu', 'arppu', 'total_revenue', 'paying_users']).default('arpu'),
      interval: z
        .union([z.literal(1), z.literal(7), z.literal(30)])
        .default(1)
        .describe('Daily (1), weekly (7), or monthly (30) acquisition cohorts.'),
      segment: z.string().optional().describe('JSON array of user segment filters.'),
      groupBy: z.string().optional().describe('One user property such as country or gp:plan.')
    })
  )
  .output(
    z.object({
      series: z.array(
        z.object({
          dates: z.array(z.string()),
          values: z.record(z.string(), z.record(z.string(), z.number().nullable()))
        })
      ),
      seriesLabels: z.array(z.unknown())
    })
  )
  .handleInvocation(async ctx => ({
    output: await createAnalyticsClient(ctx).queryRevenueLtv(ctx.input),
    message: 'Retrieved revenue lifetime value by acquisition cohort.'
  }))
  .build();
