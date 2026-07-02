import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let listAds = SlateTool.create(spec, {
  name: 'List Ads',
  key: 'list_ads',
  description: `Retrieve ads for the configured Reddit Ads account. Optionally filter by ad group ID. Returns ad creative details, status, and call-to-action configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adGroupId: z.string().optional().describe('Filter ads by ad group ID')
    })
  )
  .output(
    z.object({
      ads: z.array(
        z.object({
          adId: z.string().optional(),
          adGroupId: z.string().optional(),
          campaignId: z.string().optional(),
          name: z.string().optional(),
          status: z.string().optional(),
          headline: z.string().optional(),
          clickUrl: z.string().optional(),
          callToAction: z.string().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let ads = await client.listAds({
      adGroupId: ctx.input.adGroupId
    });

    let mapped = (Array.isArray(ads) ? ads : []).map((ad: any) => ({
      adId: ad.id || ad.ad_id,
      adGroupId: ad.ad_group_id,
      campaignId: ad.campaign_id,
      name: ad.name,
      status: ad.status || ad.effective_status,
      headline: ad.headline,
      clickUrl: ad.click_url || ad.url,
      callToAction: ad.call_to_action || ad.cta,
      raw: ad
    }));

    return {
      output: { ads: mapped },
      message: `Found **${mapped.length}** ad(s).`
    };
  })
  .build();
