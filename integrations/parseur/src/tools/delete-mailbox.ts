import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMailbox = SlateTool.create(spec, {
  name: 'Delete Mailbox',
  key: 'delete_mailbox',
  description: `Permanently delete a mailbox (parser) and all its documents, templates, and webhooks. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      mailboxId: z.number().describe('ID of the mailbox to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was initiated'),
      mailboxId: z.number().describe('ID of the deleted mailbox')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteMailbox(ctx.input.mailboxId);

    return {
      output: {
        deleted: true,
        mailboxId: ctx.input.mailboxId
      },
      message: `Mailbox **${ctx.input.mailboxId}** deletion initiated.`
    };
  })
  .build();
