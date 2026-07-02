import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new outreach campaign in PersistIQ. After creation, you can add leads to the campaign using the **Manage Campaign Lead** tool.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the created campaign'),
      name: z.string().optional().nullable().describe('Name of the created campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCampaign(ctx.input.name);

    let campaign = result.campaign || result;

    return {
      output: {
        campaignId: campaign.id || '',
        name: campaign.name || ctx.input.name
      },
      message: `Created campaign **${ctx.input.name}** (${campaign.id}).`
    };
  })
  .build();
