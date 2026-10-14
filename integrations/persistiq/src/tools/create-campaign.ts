import { createApiServiceError, SlateTool } from 'slates';
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
      name: z.string().min(1).describe('Name for the new campaign'),
      ownerId: z
        .string()
        .optional()
        .describe('Required campaign owner user ID. Call list_users to find user IDs.')
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
    if (!ctx.input.ownerId)
      throw createApiServiceError(
        'ownerId is required to create a campaign. Call list_users to find the owner user ID.'
      );
    let result = await client.createCampaign(ctx.input.name, ctx.input.ownerId);

    let campaign = result.campaign || result;
    if (!campaign.id)
      throw createApiServiceError(
        'PersistIQ did not return the created campaign ID. Call list_campaigns to check whether it was created before retrying.'
      );

    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name || ctx.input.name
      },
      message: `Created campaign **${ctx.input.name}** (${campaign.id}).`
    };
  })
  .build();
