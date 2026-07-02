import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Delete a draft campaign by ID. Uses soft delete.`,
  constraints: ['Only draft campaigns (not yet sent) can be deleted.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the campaign was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: {
        deleted: true
      },
      message: `Campaign (ID: ${ctx.input.campaignId}) deleted successfully.`
    };
  })
  .build();
