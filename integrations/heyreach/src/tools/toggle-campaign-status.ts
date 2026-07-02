import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let toggleCampaignStatus = SlateTool.create(spec, {
  name: 'Toggle Campaign Status',
  key: 'toggle_campaign_status',
  description: `Pause or resume a HeyReach LinkedIn outreach campaign. Use this to control whether a campaign is actively running or paused. Campaigns cannot be created via the API — only their status can be toggled.`,
  constraints: [
    'Campaigns must be created in the HeyReach UI first before they can be managed via API.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to pause or resume'),
      action: z.enum(['pause', 'resume']).describe('Whether to pause or resume the campaign')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Updated campaign status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.action === 'pause') {
      result = await client.pauseCampaign(ctx.input.campaignId);
    } else {
      result = await client.resumeCampaign(ctx.input.campaignId);
    }

    return {
      output: { result: result?.data ?? result },
      message: `Campaign **${ctx.input.campaignId}** has been **${ctx.input.action}d**.`
    };
  })
  .build();
