import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete a saved campaign from your Campaign Cleaner account. This removes the campaign and its analysis results. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Result status of the delete operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: {
        status: result.status
      },
      message: `Campaign \`${ctx.input.campaignId}\` deleted successfully.`
    };
  })
  .build();
