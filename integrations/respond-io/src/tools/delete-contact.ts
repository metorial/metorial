import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from the Respond.io workspace by their contact ID. This action cannot be undone.`,
  constraints: [
    'This action is irreversible. The contact and all associated data will be permanently removed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        success: true
      },
      message: `Deleted contact with ID **${ctx.input.contactId}**.`
    };
  })
  .build();
