import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Delete a lead from Close CRM by its ID.
Removes the lead and its contacts, activities, opportunities, and tasks from the active CRM. Audit history and provider recovery copies may remain.`,
  constraints: [
    'Deletion is destructive. Recovery, when available, requires an organization administrator; this tool does not restore records.',
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
      message: `Deleted lead **${ctx.input.leadId}** and its associated CRM records. Provider-retained history is not erased.`
    };
  })
  .build();
