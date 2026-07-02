import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getCampaignStats = SlateTool.create(spec, {
  name: 'Get Campaign Stats',
  key: 'get_campaign_stats',
  description: `Pull performance statistics for a Snapchat campaign, ad squad, ad, or ad account. Retrieve metrics such as impressions, swipe-ups, spend, conversions, and more with configurable granularity and time range.`,
  instructions: [
    'For DAY or HOUR granularity, startTime and endTime are required (ISO 8601 format).',
    'Maximum time range is 31 days per request.',
    'Use breakdown parameter only with ad account level stats.',
    'Spend values are returned in micro-currency.'
  ],
  constraints: [
    'Stats data is updated approximately every 15 minutes.',
    'Maximum 31-day time range per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['campaigns', 'adsquads', 'ads', 'adaccounts'])
        .describe('Type of entity to get stats for'),
      entityId: z.string().describe('ID of the entity'),
      granularity: z
        .enum(['TOTAL', 'DAY', 'HOUR', 'LIFETIME'])
        .describe('Time granularity for stats'),
      fields: z
        .array(z.string())
        .describe(
          'Metric fields to retrieve (e.g., impressions, swipes, spend, conversion_purchases, conversion_sign_ups)'
        ),
      startTime: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 format (required for DAY/HOUR granularity)'),
      endTime: z
        .string()
        .optional()
        .describe('End time in ISO 8601 format (required for DAY/HOUR granularity)'),
      breakdown: z
        .enum(['campaign', 'ad_squad', 'ad'])
        .optional()
        .describe('Breakdown dimension (only for ad account level stats)'),
      swipeUpAttributionWindow: z
        .enum(['1_DAY', '7_DAY', '28_DAY'])
        .optional()
        .describe('Swipe-up attribution window'),
      viewAttributionWindow: z
        .enum(['none', '1_HOUR', '3_HOUR', '6_HOUR', '1_DAY', '7_DAY', '28_DAY'])
        .optional()
        .describe('View attribution window')
    })
  )
  .output(
    z.object({
      stats: z
        .any()
        .describe('Stats data with time series or totals depending on granularity'),
      requestId: z.string().optional().describe('Snapchat request ID for debugging')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);

    if (
      (ctx.input.granularity === 'DAY' || ctx.input.granularity === 'HOUR') &&
      (!ctx.input.startTime || !ctx.input.endTime)
    ) {
      throw snapchatServiceError('startTime and endTime are required for DAY and HOUR stats.');
    }

    if (ctx.input.fields.length === 0) {
      throw snapchatServiceError('At least one stats field is required.');
    }

    let params: Record<string, string> = {
      granularity: ctx.input.granularity,
      fields: ctx.input.fields.join(',')
    };

    if (ctx.input.startTime) params.start_time = ctx.input.startTime;
    if (ctx.input.endTime) params.end_time = ctx.input.endTime;
    if (ctx.input.breakdown) params.breakdown = ctx.input.breakdown;
    if (ctx.input.swipeUpAttributionWindow)
      params.swipe_up_attribution_window = ctx.input.swipeUpAttributionWindow;
    if (ctx.input.viewAttributionWindow)
      params.view_attribution_window = ctx.input.viewAttributionWindow;

    let result = await client.getStats(ctx.input.entityType, ctx.input.entityId, params);

    return {
      output: {
        stats: result,
        requestId: result.request_id
      },
      message: `Retrieved **${ctx.input.granularity}** stats for ${ctx.input.entityType} **${ctx.input.entityId}** with fields: ${ctx.input.fields.join(', ')}.`
    };
  })
  .build();
