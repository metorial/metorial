import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMailbox = SlateTool.create(spec, {
  name: 'Delete Mailbox',
  key: 'delete_mailbox',
  description: `Permanently delete a mailbox and all its associated documents, templates, and webhooks. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMailbox(ctx.input.mailboxId);

    return {
      output: { success: true },
      message: `Deleted mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
