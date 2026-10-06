import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { identifier } from '../lib/data';
import { spec } from '../spec';

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Delete a campaign or clone an existing campaign to create a copy as a new draft.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      action: z
        .enum(['delete', 'clone'])
        .describe(
          'Action to perform: "delete" removes the campaign, "clone" creates a draft copy'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('The campaign ID (original for delete, new for clone)'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteCampaign(ctx.input.campaignId);
      return {
        output: {
          campaignId: ctx.input.campaignId,
          action: 'delete',
          success: true
        },
        message: `Deleted campaign **${ctx.input.campaignId}**.`
      };
    }

    let result = await client.cloneCampaign(ctx.input.campaignId);
    let newId = identifier(result.ID);

    return {
      output: {
        campaignId: newId,
        action: 'clone',
        success: true
      },
      message: `Cloned campaign **${ctx.input.campaignId}** → new draft **${newId}**.`
    };
  })
  .build();
