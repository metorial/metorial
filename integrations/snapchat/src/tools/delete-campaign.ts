import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete a Snapchat campaign by ID. This action cannot be undone — all associated ad squads and ads under the campaign will also be removed.`,
  constraints: ['Deletion is permanent and cannot be undone.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the campaign was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: { deleted: true },
      message: `Campaign **${ctx.input.campaignId}** has been permanently deleted.`
    };
  })
  .build();
