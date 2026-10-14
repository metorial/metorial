import { createApiServiceError, SlateTool } from 'slates';
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
    let result = await client.deleteContact(ctx.input.contactId);
    let deleted =
      Array.isArray(result.deletedIds) && result.deletedIds.includes(ctx.input.contactId);
    let notFound =
      Array.isArray(result.notFoundIds) && result.notFoundIds.includes(ctx.input.contactId);
    if (!deleted && !notFound) {
      throw createApiServiceError('Heyy did not confirm whether the contact was deleted.', {
        reason: 'heyy_unconfirmed_deletion'
      });
    }

    return {
      output: {
        contactId: ctx.input.contactId,
        deleted
      },
      message: deleted
        ? `Deleted contact **${ctx.input.contactId}**.`
        : `Contact **${ctx.input.contactId}** was not found and was not deleted.`
    };
  })
  .build();
