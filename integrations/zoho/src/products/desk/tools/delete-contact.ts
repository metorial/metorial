import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let deleteContact = SlateTool.create(spec, {
  name: 'Desk Delete Contact',
  key: 'desk_delete_contact',
  description: `Permanently delete a customer contact by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact **${ctx.input.contactId}**`
    };
  })
  .build();
