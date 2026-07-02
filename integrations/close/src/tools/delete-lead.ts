import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Delete a lead from Close CRM by its ID.
Permanently removes the lead and all associated data including contacts, activities, opportunities, and tasks. This action cannot be undone.`,
  constraints: [
    'This action is permanent and cannot be undone.',
    'All contacts, activities, opportunities, and tasks associated with the lead will also be deleted.'
  ],
  tags: {
    destructive: true
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
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    await client.deleteLead(ctx.input.leadId);

    return {
      output: { success: true },
      message: `Deleted lead **${ctx.input.leadId}** and all associated data.`
    };
  })
  .build();
