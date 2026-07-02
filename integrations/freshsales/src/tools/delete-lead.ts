import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Delete a lead from Freshsales by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteLead(ctx.input.leadId);

    return {
      output: { deleted: true },
      message: `Lead **${ctx.input.leadId}** deleted successfully.`
    };
  })
  .build();
