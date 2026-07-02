import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from Altoviz by their ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('Altoviz contact ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.contactId);
    return {
      output: { deleted: true },
      message: `Deleted contact with ID **${ctx.input.contactId}**.`
    };
  })
  .build();
