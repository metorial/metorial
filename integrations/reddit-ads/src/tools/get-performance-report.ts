import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, pagingInput, pagingOutput } from '../lib/contracts';
import { reportPayload } from '../lib/mappers';
import { spec } from '../spec';

export let getPerformanceReport = SlateTool.create(spec, {
  name: 'Get Performance Report',
  key: 'get_performance_report',
  description:
    'Retrieve one page of campaign performance data with documented metrics and dimensions. YYYY-MM-DD dates become UTC midnight boundaries without extending endDate. Monetary metrics retain their provider units.',
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'UTC is the default. Data can change with attribution and provider refreshes; no fixed freshness guarantee is made.'
  ],
  constraints: ['Rate limit: 1 request per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      ...pagingInput,
      timeZoneId: z
        .string()
        .optional()
        .describe(
          'Optional provider time zone identifier; applies with date breakdowns. UTC is the default.'
        ),
      startDate: z.string().describe('Report start date in YYYY-MM-DD format'),
      endDate: z.string().describe('Report end date in YYYY-MM-DD format'),
      level: z.enum(['account', 'campaign', 'adGroup', 'ad']).describe('Reporting level'),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          'Metrics to include (e.g., impressions, clicks, spend, ctr, cpc, ecpm, KEY_CONVERSION_TOTAL_COUNT, video_viewable_impressions)'
        ),
      breakdowns: z
        .array(z.string())
        .optional()
        .describe('Breakdown dimensions (e.g., date, campaign_id, ad_group_id)'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('Filter report to specific campaign IDs'),
      adGroupIds: z
        .array(z.string())
        .optional()
        .describe('Filter report to specific ad group IDs'),
      adIds: z.array(z.string()).optional().describe('Filter report to specific ad IDs')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      report: z.any().describe('Report data containing the requested metrics and breakdowns')
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).report(ctx.input, reportPayload(ctx.input));
    return {
      output: result,
      message:
        'Retrieved one page of performance metrics in provider units. Multiple entity-ID filters use OR; follow nextUrl with identical report inputs.'
    };
  })
  .build();
