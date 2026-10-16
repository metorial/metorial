import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireArray, requireRecord } from '../lib/response';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('ID of the message'),
  channelId: z.string().describe('ID of the channel'),
  authorId: z.string().describe('ID of the message author'),
  content: z.string().optional().describe('Text content of the message'),
  editedAt: z.string().optional().describe('ISO 8601 timestamp when message was last edited'),
  pinned: z.boolean().optional().describe('Whether the message is pinned'),
  replies: z.array(z.string()).optional().describe('IDs of messages this replies to'),
  mentions: z.array(z.string()).optional().describe('User IDs mentioned in the message')
});

export let fetchMessages = SlateTool.create(spec, {
  name: 'Fetch Messages',
  key: 'fetch_messages',
  description: `Fetch messages from a Stoat channel. Supports pagination with before/after cursors, sorting, and fetching a specific message by ID. Use this to read channel history or retrieve specific messages.`,
  instructions: [
    'Use `before` and `after` parameters to paginate through messages.',
    'Set `includeUsers` to true to get user objects alongside messages.'
  ],
  constraints: ['Maximum of 100 messages per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to fetch messages from'),
      messageId: z
        .string()
        .optional()
        .describe('Fetch a specific message by ID instead of listing messages'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of messages to return (1-100)'),
      before: z.string().optional().describe('Fetch messages before this message ID'),
      after: z.string().optional().describe('Fetch messages after this message ID'),
      sort: z
        .enum(['Latest', 'Oldest', 'Relevance'])
        .optional()
        .describe('Sort order for messages'),
      nearby: z
        .string()
        .optional()
        .describe('Fetch messages around this ID; ignores before, after and sort'),
      includeUsers: z.boolean().optional().describe('Include user objects in the response')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages'),
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

    if (ctx.input.messageId) {
      let msg = await client.fetchMessage(ctx.input.channelId, ctx.input.messageId);
      let mapped = {
        messageId: msg._id,
        channelId: msg.channel,
        authorId: msg.author,
        content: msg.content ?? undefined,
        editedAt: msg.edited ?? undefined,
        pinned: msg.pinned ?? undefined,
        replies: msg.replies ?? undefined,
        mentions: msg.mentions ?? undefined
      };
      return {
        output: { messages: [mapped] },
        message: `Fetched message \`${ctx.input.messageId}\` from channel \`${ctx.input.channelId}\``
      };
    }

    let result = await client.fetchMessages(ctx.input.channelId, {
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      sort: ctx.input.sort,
      nearby: ctx.input.nearby,
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
      editedAt: msg.edited ?? undefined,
      pinned: msg.pinned ?? undefined,
      replies: msg.replies ?? undefined,
      mentions: msg.mentions ?? undefined
    }));

    return {
      output: {
        messages,
        users: !Array.isArray(result) ? (result.users ?? undefined) : undefined,
        members: !Array.isArray(result) ? (result.members ?? undefined) : undefined
      },
      message: `Fetched ${messages.length} message(s) from channel \`${ctx.input.channelId}\``
    };
  })
  .build();
