import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteInbox = SlateTool.create(spec, {
  name: 'Delete Inbox',
  key: 'delete_inbox',
  description: `Permanently delete an email inbox and all its associated data (messages, threads, drafts). This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Unique identifier of the inbox to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the inbox was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    await client.deleteInbox(ctx.input.inboxId);

    return {
      output: { deleted: true },
      message: `Deleted inbox **${ctx.input.inboxId}**.`
    };
  })
  .build();
