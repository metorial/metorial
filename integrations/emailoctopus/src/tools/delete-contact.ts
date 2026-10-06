import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently remove a contact from a list. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema,
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.listId, ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact \`${client.safeText(ctx.input.contactId)}\` from list \`${client.safeText(ctx.input.listId)}\`.`
    };
  })
  .build();
