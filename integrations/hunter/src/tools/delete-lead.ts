import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead from Hunter by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the deleted lead'),
      deleted: z.boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteLead(ctx.input.leadId);

    return {
      output: {
        leadId: ctx.input.leadId,
        deleted: true
      },
      message: `Lead **${ctx.input.leadId}** has been deleted.`
    };
  })
  .build();
