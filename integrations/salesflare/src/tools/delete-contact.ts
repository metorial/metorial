import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from Salesflare's active CRM. Contact history may remain and the contact may be restored; this does not permanently erase its history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Deleted contact **${ctx.input.contactId}** from the active CRM. Contact history may remain.`
    };
  })
  .build();
