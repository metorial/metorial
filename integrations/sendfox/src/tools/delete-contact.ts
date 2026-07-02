import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from SendFox by their ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        deleted: true
      },
      message: `Contact (ID: ${ctx.input.contactId}) deleted successfully.`
    };
  })
  .build();
