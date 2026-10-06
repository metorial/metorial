import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  conversationIdSchema,
  messageSchema,
  pageSchema,
  paginationSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve message history for a conversation discovered with list_conversations. Returns both user messages and AI-generated responses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: conversationIdSchema,
      includeSources: z
        .boolean()
        .optional()
        .describe('Include knowledge sources used for AI responses.'),
      includeUsage: z.boolean().optional().describe('Include token and credit usage.'),
      page: pageSchema
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessages({
      conversationId: ctx.input.conversationId,
      includeSources: ctx.input.includeSources,
      includeUsage: ctx.input.includeUsage,
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
  description: `Retrieve a message by an ID from list_messages or send_message, including content and metadata about whether it was AI-generated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().min(1).describe('Message ID from list_messages or send_message.'),
      includeSources: z
        .boolean()
        .optional()
        .describe('Include knowledge sources used for the response.'),
      includeUsage: z.boolean().optional().describe('Include token and credit usage.')
    })
  )
  .output(messageSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let message = await client.getMessage(ctx.input.messageId, {
      includeSources: ctx.input.includeSources,
      includeUsage: ctx.input.includeUsage
    });

    return {
      output: message,
      message: `Retrieved message \`${message.messageId}\` (${message.machine ? 'AI response' : 'user message'}).`
    };
  });
