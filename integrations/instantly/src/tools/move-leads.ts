import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveLeads = SlateTool.create(spec, {
  name: 'Move Leads',
  key: 'move_leads',
  description: `Transfer leads between campaigns and/or lead lists. Move one or more leads from a source campaign/list to a destination campaign/list.`
})
  .input(
    z.object({
      leadIds: z.array(z.string()).describe('IDs of leads to move.'),
      fromCampaignId: z.string().optional().describe('Source campaign ID.'),
      toCampaignId: z.string().optional().describe('Destination campaign ID.'),
      fromListId: z.string().optional().describe('Source lead list ID.'),
      toListId: z.string().optional().describe('Destination lead list ID.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the move was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.moveLeads({
      leadIds: ctx.input.leadIds,
      fromCampaignId: ctx.input.fromCampaignId,
      toCampaignId: ctx.input.toCampaignId,
      fromListId: ctx.input.fromListId,
      toListId: ctx.input.toListId
    });

    return {
      output: { success: true },
      message: `Moved **${ctx.input.leadIds.length}** lead(s).`
    };
  })
  .build();
