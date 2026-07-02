import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from the loyalty system. Supports standard deletion or GDPR-compliant deletion which ensures full data removal. This is an asynchronous operation.`,
  tags: {
    destructive: true
  },
  constraints: ['Deletion is asynchronous and cannot be undone.']
})
  .input(
    z.object({
      contactUuid: z.string().describe('UUID of the contact to delete'),
      deletionType: z
        .enum(['DEFAULT', 'GDPR'])
        .default('DEFAULT')
        .describe('Deletion type: DEFAULT for standard, GDPR for full data removal')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('UUID of the deleted contact'),
      deletionType: z.string().describe('Type of deletion performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContact(ctx.input.contactUuid, ctx.input.deletionType);

    return {
      output: {
        contactUuid: ctx.input.contactUuid,
        deletionType: ctx.input.deletionType
      },
      message: `Contact **${ctx.input.contactUuid}** deletion initiated (${ctx.input.deletionType}).`
    };
  })
  .build();
