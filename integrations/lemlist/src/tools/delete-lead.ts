import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Remove Lead from Campaign',
  key: 'delete_lead',
  description: `Remove a lead from a campaign. By default, the lead is unsubscribed from the campaign. Use the permanent delete option to completely remove the lead record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign'),
      leadId: z.string().describe('The ID of the lead to remove'),
      permanentlyDelete: z
        .boolean()
        .optional()
        .describe('If true, permanently deletes the lead instead of unsubscribing')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      removed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let action = ctx.input.permanentlyDelete ? 'remove' : undefined;

    await client.deleteLead(ctx.input.campaignId, ctx.input.leadId, action);

    let verb = ctx.input.permanentlyDelete ? 'permanently deleted' : 'unsubscribed';

    return {
      output: {
        leadId: ctx.input.leadId,
        removed: true
      },
      message: `Lead \`${ctx.input.leadId}\` has been ${verb} from campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
