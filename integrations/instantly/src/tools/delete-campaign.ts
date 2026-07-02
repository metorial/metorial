import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete a campaign. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to delete.')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the deleted campaign'),
      name: z.string().optional().describe('Name of the deleted campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: result.id ?? ctx.input.campaignId,
        name: result.name
      },
      message: `Deleted campaign${result.name ? ` **${result.name}**` : ` ${ctx.input.campaignId}`}.`
    };
  })
  .build();
