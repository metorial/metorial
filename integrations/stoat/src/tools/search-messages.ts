import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireArray, requireRecord } from '../lib/response';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search for messages in a Stoat channel using a full-text search query. Supports filtering by date range and sorting results.`,
  constraints: ['Maximum of 100 results per search.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to search in'),
      query: z.string().describe('Full-text search query'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results (1-100)'),
      before: z.string().optional().describe('Search for messages before this message ID'),
      after: z.string().optional().describe('Search for messages after this message ID'),
      sort: z
        .enum(['Latest', 'Oldest', 'Relevance'])
        .optional()
        .describe('Sort order for results'),
      includeUsers: z.boolean().optional().describe('Include user objects in the response')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('ID of the message'),
            channelId: z.string().describe('ID of the channel'),
            authorId: z.string().describe('ID of the message author'),
            content: z.string().optional().describe('Text content of the message'),
            editedAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when message was last edited')
          })
        )
        .describe('Search results'),
      users: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('User objects returned when includeUsers is true'),
      members: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Server member objects returned when available')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.limit !== undefined && !Number.isInteger(ctx.input.limit)) {
      throw createApiServiceError('Message limit must be a whole number.');
    }
    let client = createClient(ctx);

    let result = await client.searchMessages(ctx.input.channelId, {
      query: ctx.input.query,
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      sort: ctx.input.sort,
      include_users: ctx.input.includeUsers
    });

    let messagesArray = requireArray(
      Array.isArray(result) ? result : requireRecord(result, 'messages').messages,
      'messages'
    );

    let messages = messagesArray.map((msg: any) => ({
      messageId: msg._id,
      channelId: msg.channel,
      authorId: msg.author,
      content: msg.content ?? undefined,
      editedAt: msg.edited ?? undefined
    }));

    return {
      output: {
        messages,
        users: !Array.isArray(result) ? (result.users ?? undefined) : undefined,
        members: !Array.isArray(result) ? (result.members ?? undefined) : undefined
      },
      message: `Found ${messages.length} message(s) matching "${ctx.input.query}" in channel \`${ctx.input.channelId}\``
    };
  })
  .build();
