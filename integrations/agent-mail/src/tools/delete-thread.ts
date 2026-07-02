import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteThread = SlateTool.create(spec, {
  name: 'Delete Thread',
  key: 'delete_thread',
  description: `Delete an email thread and all its messages from an inbox. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the thread'),
      threadId: z.string().describe('ID of the thread to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the thread was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    await client.deleteThread(ctx.input.inboxId, ctx.input.threadId);

    return {
      output: { deleted: true },
      message: `Deleted thread **${ctx.input.threadId}** from inbox ${ctx.input.inboxId}.`
    };
  })
  .build();
