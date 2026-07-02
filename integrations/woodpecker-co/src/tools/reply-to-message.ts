import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replyToMessage = SlateTool.create(spec, {
  name: 'Reply to Message',
  key: 'reply_to_message',
  description: `Send a reply to a prospect's email directly through a connected Woodpecker mailbox. Use the message ID from the inbox to reply to a specific conversation.`
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the inbox message to reply to'),
      body: z.string().describe('Reply message body (HTML supported)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the reply was successfully sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    await client.replyToInboxMessage(ctx.input.messageId, {
      body: ctx.input.body
    });

    return {
      output: { sent: true },
      message: `Reply sent to message ${ctx.input.messageId}.`
    };
  })
  .build();
