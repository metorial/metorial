import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let insightStatsSchema = z.object({
  amountSpent: z.number().optional().describe('Total amount spent'),
  reach: z.number().optional().describe('Number of people reached'),
  clicks: z.number().optional().describe('Total clicks'),
  purchases: z.number().optional().describe('Total purchases'),
  conversions: z.number().optional().describe('Total conversions'),
  conversionRate: z.number().optional().describe('Conversion rate'),
  conversionValue: z.number().optional().describe('Total conversion value'),
  costPerConversion: z.number().optional().describe('Cost per conversion'),
  cpc: z.number().optional().describe('Cost per click'),
  ctr: z.number().optional().describe('Click-through rate'),
  followers: z.number().optional().describe('Current follower count'),
  initialFollowers: z.number().optional().describe('Follower count at campaign start')
});

export let campaignInsights = SlateTool.create(spec, {
  name: 'Campaign Insights',
  key: 'campaign_insights',
  description: `Retrieve performance insights for an ad campaign. Returns total, today, and yesterday stats including spend, reach, clicks, conversions, CTR, and CPC. Optionally includes creative-level (per-ad) analytics for A/B testing analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to get insights for'),
      includeCreativeInsights: z
        .boolean()
        .optional()
        .describe('Also retrieve per-creative/per-ad insights for A/B test analysis')
    })
  )
  .output(
    z.object({
      total: insightStatsSchema.describe('All-time campaign performance'),
      today: insightStatsSchema.describe("Today's campaign performance"),
      yesterday: insightStatsSchema.describe("Yesterday's campaign performance"),
      creativeInsights: z
        .array(
          z.object({
            adId: z.string().optional().describe('Ad ID'),
            adName: z.string().optional().describe('Ad name'),
            adsetId: z.string().optional().describe('Ad set ID'),
            adsetName: z.string().optional().describe('Ad set name'),
            effectiveStatus: z.string().optional().describe('Current ad status'),
            amountSpent: z.number().optional().describe('Spend for this creative'),
            reach: z.number().optional().describe('Reach for this creative'),
            clicks: z.number().optional().describe('Clicks for this creative'),
            conversions: z.number().optional().describe('Conversions for this creative'),
            cpc: z.number().optional().describe('Cost per click'),
            ctr: z.number().optional().describe('Click-through rate')
          })
        )
        .optional()
        .describe('Per-creative performance breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let insights = await client.getCampaignInsights(ctx.input.campaignId);

    let mapStats = (s: any) => ({
      amountSpent: s?.amount_spent,
      reach: s?.reach,
      clicks: s?.clicks,
      purchases: s?.purchases,
      conversions: s?.conversions,
      conversionRate: s?.conversion_rate,
      conversionValue: s?.conversion_value,
      costPerConversion: s?.cost_per_conversion,
      cpc: s?.cpc,
      ctr: s?.ctr,
      followers: s?.followers,
      initialFollowers: s?.initial_followers
    });

    let output: any = {
      total: mapStats(insights?.total),
      today: mapStats(insights?.today),
      yesterday: mapStats(insights?.yesterday)
    };

    if (ctx.input.includeCreativeInsights) {
      let ads = await client.getCampaignCreativeInsights(ctx.input.campaignId);
      output.creativeInsights = (ads || []).map((ad: any) => ({
        adId: ad.id,
        adName: ad.name,
        adsetId: ad.adset_id,
        adsetName: ad.adset_name,
        effectiveStatus: ad.effective_status,
        amountSpent: ad.insights?.amount_spent,
        reach: ad.insights?.reach,
        clicks: ad.insights?.clicks,
        conversions: ad.insights?.conversions,
        cpc: ad.insights?.cpc,
        ctr: ad.insights?.ctr
      }));
    }

    return {
      output,
      message: `Retrieved insights for campaign **${ctx.input.campaignId}**. Total spend: ${insights?.total?.amount_spent ?? 'N/A'}, reach: ${insights?.total?.reach ?? 'N/A'}, clicks: ${insights?.total?.clicks ?? 'N/A'}.`
    };
  })
  .build();
