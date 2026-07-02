import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessagesTool = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve the message history for a conversation. Returns all messages exchanged between users and the bot, including message type, text, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Conversation ID to list messages for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      take: z.number().optional().describe('Number of messages to return')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            type: z.string().optional().describe('Message type (user, bot, etc.)'),
            text: z.string().optional().describe('Message text'),
            createdAt: z.string().optional().describe('Message timestamp')
          })
        )
        .describe('List of messages'),
      cursor: z.string().optional().describe('Cursor for next page'),
      count: z.number().describe('Number of messages returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { conversationId, cursor, take } = ctx.input;
    let result = await client.listMessages(conversationId, { cursor, take });

    let messages = result.items.map((m: any) => ({
      messageId: m.id,
      type: m.type,
      text: m.text,
      createdAt: m.createdAt
    }));

    return {
      output: {
        messages,
        cursor: result.cursor,
        count: messages.length
      },
      message: `Retrieved **${messages.length}** messages from conversation **${conversationId}**.`
    };
  })
  .build();
