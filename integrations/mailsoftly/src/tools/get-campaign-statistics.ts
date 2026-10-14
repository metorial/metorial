import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatistics = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_statistics',
  description:
    'Retrieves delivery and engagement counts and rates for a campaign, including opens, clicks, bounces, unsubscribes, and complaints. Unsent campaigns return a summary and a note instead of statistics.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('Campaign ID. Call get_email_campaigns to discover campaign IDs.')
    })
  )
  .output(
    z.object({
      statistics: z
        .any()
        .describe(
          'Campaign identifiers, send dates, audience size, engagement statistics, and any note for an unsent draft.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });
    let statistics = await client.getCampaignStatistics(ctx.input.campaignId);
    return {
      output: { statistics },
      message: `Retrieved statistics for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
