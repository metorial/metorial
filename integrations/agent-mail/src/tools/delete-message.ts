import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description:
    'Permanently delete a single email message from an inbox. This cannot be undone.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      inboxId: z
        .string()
        .describe('Inbox containing the message. Call list_inboxes to discover inbox IDs.'),
      messageId: z.string().describe('Message ID from list_messages or search_messages.')
    })
  )
  .output(z.object({ messageId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token, podId: ctx.config.podId }).deleteMessage(
      ctx.input.inboxId,
      ctx.input.messageId
    );
    return {
      output: { messageId: ctx.input.messageId, deleted: true },
      message: `Deleted message ${ctx.input.messageId}.`
    };
  })
  .build();
