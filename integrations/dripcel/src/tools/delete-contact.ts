import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact by their cell number. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      cell: z.string().describe('Cell number (MSISDN) of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.cell);
    return {
      output: { deleted: true },
      message: `Deleted contact **${ctx.input.cell}**.`
    };
  })
  .build();
