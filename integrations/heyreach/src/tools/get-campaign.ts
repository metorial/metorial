import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific HeyReach campaign by its ID. Returns campaign settings, status, and performance data including response rates and connection rates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaign: z.any().describe('Campaign details including settings and performance data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaignById(ctx.input.campaignId);
    let campaign = result?.data ?? result;

    return {
      output: { campaign },
      message: `Retrieved campaign **${campaign?.name ?? ctx.input.campaignId}**.`
    };
  })
  .build();
