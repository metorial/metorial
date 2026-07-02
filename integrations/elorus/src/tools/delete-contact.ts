import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from your Elorus organization. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Contact **${ctx.input.contactId}** deleted successfully.`
    };
  })
  .build();
