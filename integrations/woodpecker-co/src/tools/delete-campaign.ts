import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete a campaign from the Woodpecker account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the campaign was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: { deleted: true },
      message: `Campaign ${ctx.input.campaignId} has been **deleted**.`
    };
  })
  .build();
