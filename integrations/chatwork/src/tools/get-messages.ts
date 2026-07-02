import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieves messages from a chat room. By default returns new messages since the last fetch. Set force to true to fetch the latest 100 messages regardless.`,
  constraints: ['Returns up to 100 messages.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      force: z
        .boolean()
        .optional()
        .describe(
          'If true, force-fetches the latest messages. If false/omitted, returns only new messages since last fetch.'
        )
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string().describe('Message ID'),
          senderAccountId: z.number().describe('Sender account ID'),
          senderName: z.string().describe('Sender display name'),
          senderAvatarUrl: z.string().describe('Sender avatar image URL'),
          body: z.string().describe('Message body'),
          sendTime: z.number().describe('Send time as Unix timestamp'),
          updateTime: z.number().describe('Update time as Unix timestamp (0 if never updated)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let messages = await client.getMessages(ctx.input.roomId, ctx.input.force);

    return {
      output: {
        messages: messages.map(m => ({
          messageId: m.message_id,
          senderAccountId: m.account.account_id,
          senderName: m.account.name,
          senderAvatarUrl: m.account.avatar_image_url,
          body: m.body,
          sendTime: m.send_time,
          updateTime: m.update_time
        }))
      },
      message: `Retrieved **${messages.length}** messages from room ${ctx.input.roomId}.`
    };
  })
  .build();
