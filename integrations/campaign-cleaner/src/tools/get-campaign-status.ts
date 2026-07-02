import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatus = SlateTool.create(spec, {
  name: 'Get Campaign Status',
  key: 'get_campaign_status',
  description: `Check the processing status of a specific campaign. Returns whether the campaign is still processing, completed, or paused. Use this after submitting a campaign to determine when results are ready for retrieval.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to check status for')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique campaign identifier'),
      campaignName: z.string().describe('Name of the campaign'),
      status: z.string().describe('Processing status: "processing", "completed", or "paused"'),
      dateAdded: z.string().describe('Timestamp when the campaign was submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaignStatus(ctx.input.campaignId);

    return {
      output: {
        campaignId: result.id,
        campaignName: result.campaignName,
        status: result.status,
        dateAdded: result.dateAdded
      },
      message: `Campaign **"${result.campaignName}"** status: **${result.status}**. Submitted on ${result.dateAdded}.`
    };
  })
  .build();
