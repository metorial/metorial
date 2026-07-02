import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'gmb',
  'instagram',
  'linkedin',
  'pinterest',
  'reddit',
  'snapchat',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let getSocialAnalytics = SlateTool.create(spec, {
  name: 'Get Social Analytics',
  key: 'get_social_analytics',
  description: `Retrieve account-level analytics for linked social media accounts. Returns metrics like follower counts, impressions, engagement rates, and demographic breakdowns. Supports daily time-series data and quarterly aggregation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platforms: z.array(platformEnum).min(1).describe('Social networks to get analytics for'),
      daily: z
        .boolean()
        .optional()
        .describe(
          'Return daily time-series data instead of aggregates (Facebook, Instagram, TikTok, YouTube)'
        ),
      quarters: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of quarters of historical data to retrieve (1-4)')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Response status'),
      analytics: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .describe(
          'Platform-keyed account analytics with follower counts, impressions, engagement, demographics'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getSocialAnalytics({
      platforms: ctx.input.platforms,
      daily: ctx.input.daily,
      quarters: ctx.input.quarters
    });

    let platformNames = [
      'bluesky',
      'facebook',
      'gmb',
      'instagram',
      'linkedin',
      'pinterest',
      'reddit',
      'snapchat',
      'threads',
      'tiktok',
      'twitter',
      'youtube'
    ];
    let analytics: Record<string, Record<string, unknown>> = {};

    for (let platform of platformNames) {
      if (result[platform]) {
        analytics[platform] = result[platform];
      }
    }

    return {
      output: {
        status: result.status,
        analytics
      },
      message: `Retrieved social analytics for **${Object.keys(analytics).length}** platform(s): ${Object.keys(analytics).join(', ')}.`
    };
  })
  .build();
