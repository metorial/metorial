import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateCampaign = SlateTool.create(spec, {
  name: 'Duplicate Campaign',
  key: 'duplicate_campaign',
  description:
    'Copy an existing outreach campaign to reuse its sequence for another owner or prospect group. Call list_campaigns to find the source campaign and list_users to select the new owner.'
})
  .input(
    z.object({
      campaignId: z.string().min(1).describe('Source campaign ID from list_campaigns'),
      ownerId: z
        .string()
        .min(1)
        .describe('Owner user ID for the copied campaign from list_users'),
      name: z.string().optional().describe('Optional name for the copied campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the copied campaign'),
      name: z.string().optional().nullable().describe('Name of the copied campaign'),
      sourceCampaignId: z.string().describe('ID of the source campaign')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).duplicateCampaign(
      ctx.input.campaignId,
      ctx.input.ownerId,
      ctx.input.name
    );
    let campaign = result.campaign || result;
    if (!campaign.id)
      throw createApiServiceError(
        'PersistIQ did not return the copied campaign ID. Call list_campaigns to check whether it was created before retrying.'
      );
    return {
      output: {
        campaignId: campaign.id,
        name: campaign.name,
        sourceCampaignId: ctx.input.campaignId
      },
      message: `Copied campaign **${ctx.input.campaignId}** to **${campaign.id}**.`
    };
  })
  .build();
