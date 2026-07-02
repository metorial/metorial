import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead from Callingly. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    await client.deleteLead(ctx.input.leadId);

    return {
      output: { success: true },
      message: `Lead **${ctx.input.leadId}** deleted successfully.`
    };
  })
  .build();
