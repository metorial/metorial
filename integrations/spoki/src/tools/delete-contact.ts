import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Deletes a contact from Spoki. The deleted contact is moved to a blacklist, preventing any future messages from being sent to that number.`,
  constraints: ['Deletion is permanent and the phone number will be blacklisted in Spoki.'],
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
      contactId: z.string().describe('ID of the deleted contact'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Deleting contact ${ctx.input.contactId}`);
    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        contactId: ctx.input.contactId,
        success: true
      },
      message: `Deleted contact **${ctx.input.contactId}**. The phone number has been blacklisted.`
    };
  })
  .build();
