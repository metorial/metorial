import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete an email campaign. This action cannot be undone.`,
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
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteCampaign(ctx.input.campaignId);
    let success = result?.Status === 1;

    return {
      output: { success },
      message: success
        ? `Deleted campaign \`${ctx.input.campaignId}\`.`
        : `Failed to delete campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
