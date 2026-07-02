import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Sends a message to a chat room. Supports Chatwork's special markup syntax for mentions, quotes, and formatting.`,
  instructions: [
    'Use `[To:ACCOUNT_ID]` to mention a user.',
    'Use `[info]...[/info]` for info blocks and `[code]...[/code]` for code blocks.',
    'Use `[hr]` for horizontal rules.'
  ],
  constraints: [
    'Message body must be between 1 and 65,535 characters.',
    'Rate limited to 10 messages per 10 seconds per room.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room to send the message to'),
      body: z
        .string()
        .min(1)
        .max(65535)
        .describe('Message content (supports Chatwork markup syntax)'),
      selfUnread: z
        .boolean()
        .optional()
        .describe('If true, the message is marked as unread for the sender')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.sendMessage(
      ctx.input.roomId,
      ctx.input.body,
      ctx.input.selfUnread
    );

    return {
      output: { messageId: result.message_id },
      message: `Sent message (ID: ${result.message_id}) to room ${ctx.input.roomId}.`
    };
  })
  .build();
