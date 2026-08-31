import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { isSlackApiErrorCode, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let messageResultSchema = z.record(z.string(), z.unknown());

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description:
    'Search messages across a Slack workspace with Real-time Search using keywords or a natural-language question. Public-channel search is the default. Widening channelTypes to private channels, DMs, or group DMs requires explicit user consent and the matching granular search scopes, and it never expands access beyond conversations the connected user can already read. Use search_public_and_private when message results should be combined with file, channel, or user results.',
  instructions: [
    'Obtain explicit user consent before widening channelTypes beyond public_channel because results may contain private-channel or direct-message content.',
    'Use the structured channelTypes, before, after, and contextChannelId parameters to narrow results rather than embedding search modifiers in the query.',
    'Follow important message results with read_thread or get_message for full context.'
  ],
  constraints: [
    'Requires a user token with search:read.public.',
    'Searching private channels, DMs, or group DMs requires search:read.private, search:read.im, or search:read.mpim for those conversation types and returns only content accessible to the connected user.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.searchPublic)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'Keywords or a natural-language question. Use the structured channelTypes, before, and after parameters to narrow results rather than embedding search modifiers in the query.'
        ),
      channelTypes: z
        .array(z.enum(['public_channel', 'private_channel', 'im', 'mpim']))
        .min(1)
        .optional()
        .describe(
          'Conversation types to search (default: public_channel). Private types require consent and the matching granular search scopes.'
        ),
      before: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return messages at or before this Unix timestamp.'),
      after: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return messages at or after this Unix timestamp.'),
      includeBots: z
        .boolean()
        .optional()
        .describe('Include messages authored by bots (default: false).'),
      includeContextMessages: z
        .boolean()
        .optional()
        .describe('Include surrounding messages when Slack provides them.'),
      contextChannelId: z
        .string()
        .optional()
        .describe('Accessible conversation ID to use as a relevance-ranking hint.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous search.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum results to return (default: 20, max: 20).'),
      sort: z
        .enum(['score', 'timestamp'])
        .optional()
        .describe('Sort by relevance or timestamp (default: score).'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc).')
    })
  )
  .output(
    z.object({
      messages: z.array(messageResultSchema).describe('Matching messages.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let channelTypes = ctx.input.channelTypes ?? ['public_channel'];

    try {
      let result = await client.searchContext({
        query: ctx.input.query,
        contentTypes: ['messages'],
        channelTypes,
        before: ctx.input.before,
        after: ctx.input.after,
        includeBots: ctx.input.includeBots ?? false,
        includeContextMessages: ctx.input.includeContextMessages,
        contextChannelId: ctx.input.contextChannelId,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit ?? 20,
        sort: ctx.input.sort ?? 'score',
        sortDir: ctx.input.sortDir ?? 'desc'
      });

      let messages = result.messages ?? [];

      return {
        output: {
          messages,
          nextCursor: result.nextCursor
        },
        message: `Found ${messages.length} Slack message(s) matching "${ctx.input.query}".`
      };
    } catch (error) {
      if (isSlackApiErrorCode(error, 'missing_scope')) {
        let widened = channelTypes.some(type => type !== 'public_channel');

        throw slackServiceError(
          widened
            ? 'Searching private channels, DMs, or group DMs requires search:read.private, search:read.im, or search:read.mpim. Reconnect with those scopes or request only public_channel results.'
            : 'Slack Real-time Search requires the search:read.public scope. Reconnect with that scope.'
        );
      }

      throw error;
    }
  })
  .build();
