import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatistics = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_statistics',
  description:
    'Retrieve campaign delivery and engagement counts and rates. Optionally include the most-clicked links.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().int().positive().describe('Campaign ID from list_campaigns'),
      includeLinkStats: z
        .boolean()
        .optional()
        .describe('Include a ranked breakdown of link clicks (default: false)'),
      linkLimit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of links to return when includeLinkStats is true (default: 50)')
    })
  )
  .output(
    z.object({
      campaignId: z.number(),
      sentCount: z.number(),
      uniqueOpenCount: z.number(),
      uniqueClickCount: z.number(),
      unsubscribeCount: z.number(),
      bounceCount: z.number(),
      spamCount: z.number(),
      openRate: z.number(),
      clickRate: z.number(),
      unsubscribeRate: z.number(),
      bounceRate: z.number(),
      spamRate: z.number(),
      linkStats: z
        .array(z.object({ url: z.string(), clicks: z.number() }))
        .optional()
        .describe('Link click breakdown, returned when requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let stats = await client.getCampaignStats(ctx.input.campaignId, {
      includeLinkStats: ctx.input.includeLinkStats,
      linkLimit: ctx.input.linkLimit
    });

    return {
      output: {
        campaignId: ctx.input.campaignId,
        sentCount: stats.sent_count,
        uniqueOpenCount: stats.unique_open_count,
        uniqueClickCount: stats.unique_click_count,
        unsubscribeCount: stats.unsubscribe_count,
        bounceCount: stats.bounce_count,
        spamCount: stats.spam_count,
        openRate: stats.open_rate,
        clickRate: stats.click_rate,
        unsubscribeRate: stats.unsubscribe_rate,
        bounceRate: stats.bounce_rate,
        spamRate: stats.spam_rate,
        linkStats: stats.link_stats
      },
      message: `Retrieved statistics for campaign ${ctx.input.campaignId}.`
    };
  })
  .build();
