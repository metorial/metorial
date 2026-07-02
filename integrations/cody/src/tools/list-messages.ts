import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('Unique message identifier'),
  content: z.string().describe('Message text content'),
  conversationId: z.string().describe('Conversation the message belongs to'),
  machine: z.boolean().describe('Whether this is an AI-generated message'),
  failedResponding: z.boolean().describe('Whether response generation failed'),
  flagged: z.boolean().describe('Whether the message violates usage policy'),
  createdAt: z.number().describe('Unix timestamp of creation in seconds')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve message history for a conversation. Returns both user messages and AI-generated responses in chronological order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to list messages for'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema),
      pagination: z.object({
        count: z.number(),
        total: z.number(),
        perPage: z.number(),
        totalPages: z.number(),
        nextPage: z.number().nullable(),
        previousPage: z.number().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessages({
      conversationId: ctx.input.conversationId,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.messages.length}** message(s)${result.pagination.total > result.messages.length ? ` (${result.pagination.total} total)` : ''}.`
    };
  });

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve details of a specific message by its ID, including content and metadata about whether it was AI-generated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to retrieve')
    })
  )
  .output(messageSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let message = await client.getMessage(ctx.input.messageId);

    return {
      output: message,
      message: `Retrieved message \`${message.messageId}\` (${message.machine ? 'AI response' : 'user message'}).`
    };
  });
