import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let markMessages = SlateTool.create(spec, {
  name: 'Mark Messages Read/Unread',
  key: 'mark_messages',
  description: `Marks messages as read or unread in a chat room. When marking as read, all messages up to the specified message ID are marked. When marking as unread, messages from the specified ID onward become unread.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      messageId: z.string().describe('Reference message ID for the read/unread boundary'),
      action: z
        .enum(['read', 'unread'])
        .describe(
          '"read" marks messages up to this ID as read; "unread" marks messages from this ID onward as unread'
        )
    })
  )
  .output(
    z.object({
      unreadCount: z.number().describe('Remaining unread message count'),
      mentionCount: z.number().describe('Remaining unread mention count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    let result =
      ctx.input.action === 'read'
        ? await client.markMessagesRead(ctx.input.roomId, ctx.input.messageId)
        : await client.markMessagesUnread(ctx.input.roomId, ctx.input.messageId);

    return {
      output: {
        unreadCount: result.unread_num,
        mentionCount: result.mention_num
      },
      message: `Marked messages as ${ctx.input.action} in room ${ctx.input.roomId}. ${result.unread_num} unread, ${result.mention_num} mentions remaining.`
    };
  })
  .build();
