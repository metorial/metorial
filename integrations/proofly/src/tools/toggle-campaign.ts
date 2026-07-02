import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let toggleCampaign = SlateTool.create(spec, {
  name: 'Toggle Campaign',
  key: 'toggle_campaign',
  description: `Toggle a campaign's active/inactive status. If the campaign is currently enabled it will be disabled, and vice versa. Use **List Campaigns** first to obtain the campaign ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to toggle')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('The campaign ID that was toggled'),
      enabled: z.boolean().optional().describe('The new enabled status after toggling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.toggleCampaign(ctx.input.campaignId);

    let enabled = result.enabled ?? result.active ?? result.is_enabled;

    return {
      output: {
        campaignId: ctx.input.campaignId,
        enabled
      },
      message: `Campaign \`${ctx.input.campaignId}\` has been **${enabled === true ? 'enabled' : enabled === false ? 'disabled' : 'toggled'}**.`
    };
  })
  .build();
