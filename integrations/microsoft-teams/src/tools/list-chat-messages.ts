import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let listChatMessages = SlateTool.create(spec, {
  name: 'List Chat Messages',
  key: 'list_chat_messages',
  description: `List recent messages in a specific chat. Returns message content, sender info, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('ID of the chat'),
      top: z.number().optional().describe('Maximum number of messages to return')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string().describe('Unique identifier of the message'),
          content: z.string().nullable().describe('Message body content'),
          contentType: z.string().optional().describe('Content type (text or html)'),
          createdDateTime: z.string().describe('When the message was created'),
          senderDisplayName: z.string().nullable().describe('Display name of the sender'),
          senderUserId: z.string().nullable().describe('User ID of the sender')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let messages = await client.listChatMessages(ctx.input.chatId, ctx.input.top);

    let mapped = messages.map((m: any) => ({
      messageId: m.id,
      content: m.body?.content || null,
      contentType: m.body?.contentType,
      createdDateTime: m.createdDateTime,
      senderDisplayName: m.from?.user?.displayName || null,
      senderUserId: m.from?.user?.id || null
    }));

    return {
      output: { messages: mapped },
      message: `Found **${mapped.length}** messages in the chat.`
    };
  })
  .build();
