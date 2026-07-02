import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let messageSchema = z.object({
  ts: z.string().describe('Message timestamp'),
  text: z.string().optional().describe('Message text content'),
  userId: z.string().optional().describe('User ID of the message author'),
  threadTs: z
    .string()
    .optional()
    .describe('Thread parent timestamp if this is a thread reply'),
  replyCount: z.number().optional().describe('Number of replies in this thread'),
  subtype: z.string().optional().describe('Message subtype (e.g. bot_message, channel_join)'),
  botId: z.string().optional().describe('Bot ID if posted by a bot')
});

export let getConversationHistory = SlateTool.create(spec, {
  name: 'Get Conversation History',
  key: 'get_conversation_history',
  description: `Retrieve message history from a Slack channel, DM, or group DM. Supports pagination, time range filtering, and fetching thread replies.`,
  instructions: [
    'To get thread replies, provide **threadTs** — the timestamp of the parent message.',
    'Use **oldest** and **latest** timestamps to filter messages within a time range.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.conversationHistory)
  .input(
    z.object({
      channelId: z.string().describe('Channel, DM, or group DM ID'),
      threadTs: z
        .string()
        .optional()
        .describe('If provided, fetches replies in this thread instead of channel messages'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of messages to return (default 20, max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page'),
      oldest: z.string().optional().describe('Only messages after this Unix timestamp'),
      latest: z.string().optional().describe('Only messages before this Unix timestamp')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages'),
      hasMore: z.boolean().describe('Whether there are more messages to fetch'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.threadTs) {
      let result = await client.getConversationReplies({
        channel: ctx.input.channelId,
        ts: ctx.input.threadTs,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        oldest: ctx.input.oldest,
        latest: ctx.input.latest
      });

      return {
        output: {
          messages: result.messages.map(m => ({
            ts: m.ts,
            text: m.text,
            userId: m.user,
            threadTs: m.thread_ts,
            replyCount: m.reply_count,
            subtype: m.subtype,
            botId: m.bot_id
          })),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        },
        message: `Retrieved ${result.messages.length} thread replies in channel \`${ctx.input.channelId}\`.`
      };
    }

    let result = await client.getConversationHistory({
      channel: ctx.input.channelId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      oldest: ctx.input.oldest,
      latest: ctx.input.latest
    });

    return {
      output: {
        messages: result.messages.map(m => ({
          ts: m.ts,
          text: m.text,
          userId: m.user,
          threadTs: m.thread_ts,
          replyCount: m.reply_count,
          subtype: m.subtype,
          botId: m.bot_id
        })),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message: `Retrieved ${result.messages.length} messages from channel \`${ctx.input.channelId}\`.`
    };
  })
  .build();
