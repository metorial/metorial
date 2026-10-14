import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStats = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_stats',
  description:
    'Retrieve detailed statistics for a La Growth Machine campaign: audience, replies, LinkedIn connections, channel metrics, lead statuses, and message performance. Use get_campaigns to find the campaign ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .describe('Campaign ID from get_campaigns (24 hexadecimal characters)')
    })
  )
  .output(
    z.object({
      stats: z.any().describe('Detailed campaign statistics, including engagementStats')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let stats = await client.getCampaignStats(ctx.input.campaignId);
    return { output: { stats }, message: 'Campaign statistics retrieved.' };
  })
  .build();
