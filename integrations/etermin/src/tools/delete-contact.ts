import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from eTermin by their contact ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID (cid) to delete')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('API response confirming deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.deleteContact(ctx.input.contactId);

    return {
      output: { result },
      message: `Contact **${ctx.input.contactId}** deleted.`
    };
  })
  .build();
