import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Soft deletes a Freshdesk contact. Use this for cleanup or removing duplicate/test requester records; hard deletion is intentionally not exposed because it is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to soft delete')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the deleted contact'),
      deleted: z.boolean().describe('Whether the deletion request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        contactId: ctx.input.contactId,
        deleted: true
      },
      message: `Deleted contact **#${ctx.input.contactId}**`
    };
  })
  .build();
