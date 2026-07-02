import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from a brand. The contact is identified by ID or email address. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand the contact belongs to'),
      contactId: z.string().describe('Contact ID or email address to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteContact(ctx.input.brandId, ctx.input.contactId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted contact **${ctx.input.contactId}** from brand ${ctx.input.brandId}.`
    };
  })
  .build();
