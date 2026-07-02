import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let listAdGroups = SlateTool.create(spec, {
  name: 'List Ad Groups',
  key: 'list_ad_groups',
  description: `Retrieve ad groups for the configured Reddit Ads account. Optionally filter by campaign ID to see ad groups within a specific campaign. Returns targeting, bidding, and placement details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().optional().describe('Filter ad groups by campaign ID')
    })
  )
  .output(
    z.object({
      adGroups: z.array(
        z.object({
          adGroupId: z.string().optional(),
          campaignId: z.string().optional(),
          name: z.string().optional(),
          status: z.string().optional(),
          bidCents: z.number().optional(),
          bidStrategy: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
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

    let adGroups = await client.listAdGroups({
      campaignId: ctx.input.campaignId
    });

    let mapped = (Array.isArray(adGroups) ? adGroups : []).map((ag: any) => ({
      adGroupId: ag.id || ag.ad_group_id,
      campaignId: ag.campaign_id,
      name: ag.name,
      status: ag.status || ag.effective_status,
      bidCents: ag.bid_cents || ag.bid,
      bidStrategy: ag.bid_strategy,
      startDate: ag.start_date,
      endDate: ag.end_date,
      raw: ag
    }));

    return {
      output: { adGroups: mapped },
      message: `Found **${mapped.length}** ad group(s).`
    };
  })
  .build();
