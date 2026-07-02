import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a customer or vendor from Zoho Books. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let resp = await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true, message: resp.message },
      message: `Deleted contact **${ctx.input.contactId}**.`
    };
  })
  .build();
