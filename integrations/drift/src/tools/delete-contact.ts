import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from Drift by their contact ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Drift contact ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    await client.deleteContact(ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
