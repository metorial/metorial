import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieves a message by its ID, including the sender, full body, and timestamps. Call list_rooms to discover room IDs.',
  constraints: ['Message history may be limited by the Chatwork account plan.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      roomId: z.number().describe('Room ID. Call list_rooms to discover authorized rooms.'),
      messageId: z.string().describe('Message ID returned by get_messages or send_message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      senderAccountId: z.number().describe('Sender account ID'),
      senderName: z.string().describe('Sender display name'),
      senderAvatarUrl: z.string().describe('Sender avatar image URL'),
      body: z.string().describe('Full message body'),
      sendTime: z.number().describe('Send time as Unix timestamp'),
      updateTime: z.number().describe('Update time as Unix timestamp, or 0 if never updated')
    })
  )
  .handleInvocation(async ctx => {
    let message = await createClient(ctx.auth).getMessage(
      ctx.input.roomId,
      ctx.input.messageId
    );
    return {
      output: {
        messageId: message.message_id,
        senderAccountId: message.account.account_id,
        senderName: message.account.name,
        senderAvatarUrl: message.account.avatar_image_url,
        body: message.body,
        sendTime: message.send_time,
        updateTime: message.update_time
      },
      message: `Retrieved message ${message.message_id} from room ${ctx.input.roomId}.`
    };
  })
  .build();
