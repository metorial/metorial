import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContactTool = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from your Heyy business account. This removes the contact and all associated data.`,
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
      contactId: z.string().describe('ID of the deleted contact'),
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        contactId: ctx.input.contactId,
        deleted: true
      },
      message: `Deleted contact **${ctx.input.contactId}**.`
    };
  })
  .build();
