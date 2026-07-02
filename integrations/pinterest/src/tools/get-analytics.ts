import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve analytics data for the user account, a specific pin, or an ad account. Provides metrics like impressions, saves, clicks, and engagement over a date range.`,
  instructions: [
    'Set "scope" to "user_account" for organic account-level analytics.',
    'Set "scope" to "pin" and provide pinId for individual pin analytics.',
    'Set "scope" to "ad_account" and provide adAccountId for ad account analytics.',
    'Dates must be in YYYY-MM-DD format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['user_account', 'pin', 'ad_account'])
        .describe('Scope of analytics to retrieve'),
      startDate: z.string().describe('Start date for analytics (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for analytics (YYYY-MM-DD)'),
      pinId: z.string().optional().describe('Pin ID (required when scope is "pin")'),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID (required when scope is "ad_account")'),
      metricTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Metrics to retrieve for user/pin analytics (e.g., IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK, VIDEO_MRC_VIEW)'
        ),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns to retrieve for ad account analytics (e.g., SPEND_IN_MICRO_DOLLAR, TOTAL_CLICKTHROUGH, IMPRESSION)'
        ),
      granularity: z
        .enum(['TOTAL', 'DAY', 'HOUR', 'WEEK', 'MONTH'])
        .optional()
        .describe('Time granularity for ad account analytics'),
      appTypes: z
        .string()
        .optional()
        .describe('Filter by app type (e.g., ALL, MOBILE, TABLET, WEB)'),
      splitField: z
        .string()
        .optional()
        .describe('Split results by this field (e.g., NO_SPLIT, APP_TYPE)'),
      pinFormat: z
        .string()
        .optional()
        .describe('Filter by pin format (e.g., ALL, ORGANIC_IMAGE, ORGANIC_VIDEO)'),
      source: z
        .string()
        .optional()
        .describe('Filter by traffic source (e.g., ALL, YOUR_PINS, OTHER_PINS)')
    })
  )
  .output(
    z.object({
      analytics: z.any().describe('Analytics data returned from Pinterest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let analytics: any;

    if (ctx.input.scope === 'user_account') {
      analytics = await client.getUserAccountAnalytics({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        metricTypes: ctx.input.metricTypes || [
          'IMPRESSION',
          'SAVE',
          'PIN_CLICK',
          'OUTBOUND_CLICK'
        ],
        appTypes: ctx.input.appTypes,
        splitField: ctx.input.splitField,
        pinFormat: ctx.input.pinFormat,
        source: ctx.input.source
      });
    } else if (ctx.input.scope === 'pin') {
      if (!ctx.input.pinId) {
        throw pinterestServiceError('Pin ID is required when scope is "pin"');
      }
      analytics = await client.getPinAnalytics(ctx.input.pinId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        metricTypes: ctx.input.metricTypes || [
          'IMPRESSION',
          'SAVE',
          'PIN_CLICK',
          'OUTBOUND_CLICK'
        ],
        appTypes: ctx.input.appTypes,
        splitField: ctx.input.splitField
      });
    } else if (ctx.input.scope === 'ad_account') {
      if (!ctx.input.adAccountId) {
        throw pinterestServiceError('Ad account ID is required when scope is "ad_account"');
      }
      analytics = await client.getAdAccountAnalytics(ctx.input.adAccountId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        columns: ctx.input.columns || [
          'SPEND_IN_MICRO_DOLLAR',
          'TOTAL_CLICKTHROUGH',
          'IMPRESSION'
        ],
        granularity: ctx.input.granularity || 'DAY'
      });
    }

    return {
      output: {
        analytics
      },
      message: `Retrieved **${ctx.input.scope}** analytics from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
